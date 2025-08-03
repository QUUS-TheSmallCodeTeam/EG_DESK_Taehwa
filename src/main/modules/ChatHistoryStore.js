/**
 * ChatHistoryStore - Main Process Storage Layer for Chat History
 * 
 * Provides persistent storage for chat conversations with Claude Code CLI compatibility.
 * Implements electron-store for reliable data persistence and IPC communication.
 */

import { ipcMain } from 'electron';
import Store from 'electron-store';
import fs from 'fs/promises';
import path from 'path';

class ChatHistoryStore {
  constructor(options = {}) {
    this.options = {
      name: options.name || 'chat-history',
      fileExtension: options.fileExtension || 'json',
      clearInvalidConfig: options.clearInvalidConfig !== false,
      migrations: {
        '1.0.0': store => {
          // Initial migration - ensure required schema
          if (!store.has('conversations')) {
            store.set('conversations', {});
          }
          if (!store.has('metadata')) {
            store.set('metadata', {
              version: '1.0.0',
              createdAt: Date.now(),
              totalConversations: 0,
              lastBackup: null
            });
          }
        }
      },
      schema: {
        conversations: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              messages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    sessionId: { type: 'string' },
                    parentUuid: { type: 'string' },
                    role: {
                      type: 'string',
                      enum: ['user', 'assistant', 'system']
                    },
                    content: { type: 'string' },
                    timestamp: { type: 'number' },
                    metadata: { type: 'object' }
                  },
                  required: ['id', 'role', 'content', 'timestamp']
                }
              },
              createdAt: { type: 'number' },
              updatedAt: { type: 'number' },
              metadata: { type: 'object' }
            },
            required: ['id', 'title', 'messages', 'createdAt', 'updatedAt']
          }
        },
        metadata: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            createdAt: { type: 'number' },
            totalConversations: { type: 'number' },
            lastBackup: { type: ['number', 'null'] }
          }
        },
        sessions: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              conversationId: { type: 'string' },
              startedAt: { type: 'number' },
              lastActiveAt: { type: 'number' },
              commandHistory: { type: 'array' },
              workingDirectory: { type: 'string' },
              gitBranch: { type: 'string' },
              isActive: { type: 'boolean' }
            }
          }
        }
      },
      ...options
    };

    this.isInitialized = false;
    this.store = null;
    this.backupInterval = null;
    this.ipcHandlers = new Map();
  }

  /**
   * Initialize the chat history store
   */
  async initialize() {
    try {
      console.log('[ChatHistoryStore] Initializing...');

      // Initialize electron-store
      this.store = new Store(this.options);

      // Set up IPC handlers
      this.setupIPCHandlers();

      // Start backup timer
      this.startBackupTimer();

      // Validate and repair data if needed
      await this.validateAndRepairData();

      this.isInitialized = true;
      console.log('[ChatHistoryStore] Successfully initialized');

      return true;
    } catch (error) {
      console.error('[ChatHistoryStore] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Set up IPC handlers for renderer process communication
   */
  setupIPCHandlers() {
    const handlers = {
      'chat-history:save-conversation': this.handleSaveConversation.bind(this),
      'chat-history:load-conversation': this.handleLoadConversation.bind(this),
      'chat-history:list-conversations': this.handleListConversations.bind(this),
      'chat-history:delete-conversation': this.handleDeleteConversation.bind(this),
      'chat-history:search-conversations': this.handleSearchConversations.bind(this),
      'chat-history:add-message': this.handleAddMessage.bind(this),
      'chat-history:update-message': this.handleUpdateMessage.bind(this),
      'chat-history:delete-message': this.handleDeleteMessage.bind(this),
      'chat-history:create-session': this.handleCreateSession.bind(this),
      'chat-history:update-session': this.handleUpdateSession.bind(this),
      'chat-history:list-sessions': this.handleListSessions.bind(this),
      'chat-history:export-data': this.handleExportData.bind(this),
      'chat-history:import-data': this.handleImportData.bind(this),
      'chat-history:backup': this.handleBackup.bind(this),
      'chat-history:restore': this.handleRestore.bind(this),
      'chat-history:get-metadata': this.handleGetMetadata.bind(this),
      'chat-history:cleanup': this.handleCleanup.bind(this)
    };

    // Register all handlers
    Object.entries(handlers).forEach(([channel, handler]) => {
      ipcMain.handle(channel, handler);
      this.ipcHandlers.set(channel, handler);
    });

    console.log(`[ChatHistoryStore] Registered ${Object.keys(handlers).length} IPC handlers`);
  }

  /**
   * Save conversation to storage
   */
  async handleSaveConversation(event, conversationData) {
    try {
      if (!this.isInitialized) {
        throw new Error('ChatHistoryStore not initialized');
      }

      const conversationId = conversationData.id;
      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }

      // Get existing conversations
      const conversations = this.store.get('conversations', {});
      const isNew = !conversations[conversationId];

      // Validate conversation data
      const validatedConversation = this.validateConversationData(conversationData);

      // Save conversation
      conversations[conversationId] = validatedConversation;
      this.store.set('conversations', conversations);

      // Update metadata
      if (isNew) {
        const metadata = this.store.get('metadata', {});
        metadata.totalConversations = Object.keys(conversations).length;
        metadata.lastModified = Date.now();
        this.store.set('metadata', metadata);
      }

      console.log(`[ChatHistoryStore] Saved conversation: ${conversationId}`);

      return {
        success: true,
        conversationId,
        isNew,
        messageCount: validatedConversation.messages.length
      };

    } catch (error) {
      console.error('[ChatHistoryStore] Save conversation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Load conversation from storage
   */
  async handleLoadConversation(event, conversationId) {
    try {
      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }

      const conversations = this.store.get('conversations', {});
      const conversation = conversations[conversationId];

      if (!conversation) {
        return {
          success: false,
          error: 'Conversation not found'
        };
      }

      console.log(`[ChatHistoryStore] Loaded conversation: ${conversationId}`);

      return {
        success: true,
        conversation
      };

    } catch (error) {
      console.error('[ChatHistoryStore] Load conversation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List all conversations with pagination and sorting
   */
  async handleListConversations(event, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
        includeMessages = false
      } = options;

      const conversations = this.store.get('conversations', {});
      let conversationList = Object.values(conversations);

      // Sort conversations
      conversationList.sort((a, b) => {
        const aValue = a[sortBy] || 0;
        const bValue = b[sortBy] || 0;
        return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      });

      // Apply pagination
      const total = conversationList.length;
      const paginatedList = conversationList.slice(offset, offset + limit);

      // Optionally exclude messages for lighter payload
      if (!includeMessages) {
        paginatedList.forEach(conv => {
          conv.messageCount = conv.messages.length;
          delete conv.messages;
        });
      }

      console.log(`[ChatHistoryStore] Listed ${paginatedList.length} of ${total} conversations`);

      return {
        success: true,
        conversations: paginatedList,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };

    } catch (error) {
      console.error('[ChatHistoryStore] List conversations failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete conversation from storage
   */
  async handleDeleteConversation(event, conversationId) {
    try {
      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }

      const conversations = this.store.get('conversations', {});
      
      if (!conversations[conversationId]) {
        return {
          success: false,
          error: 'Conversation not found'
        };
      }

      // Store backup before deletion
      const deletedConversation = conversations[conversationId];
      delete conversations[conversationId];
      
      this.store.set('conversations', conversations);

      // Update metadata
      const metadata = this.store.get('metadata', {});
      metadata.totalConversations = Object.keys(conversations).length;
      metadata.lastModified = Date.now();
      this.store.set('metadata', metadata);

      console.log(`[ChatHistoryStore] Deleted conversation: ${conversationId}`);

      return {
        success: true,
        conversationId,
        deletedConversation: {
          id: deletedConversation.id,
          title: deletedConversation.title,
          messageCount: deletedConversation.messages.length
        }
      };

    } catch (error) {
      console.error('[ChatHistoryStore] Delete conversation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search conversations and messages
   */
  async handleSearchConversations(event, searchOptions) {
    try {
      const {
        query,
        searchType = 'all', // 'title', 'content', 'all'
        limit = 20,
        includeMessages = true
      } = searchOptions;

      if (!query || query.trim().length < 2) {
        throw new Error('Search query must be at least 2 characters');
      }

      const conversations = this.store.get('conversations', {});
      const searchTerm = query.toLowerCase();
      const results = {
        conversations: [],
        messages: [],
        totalFound: 0
      };

      Object.values(conversations).forEach(conversation => {
        let conversationScore = 0;
        const matchingMessages = [];

        // Search conversation title
        if ((searchType === 'title' || searchType === 'all') && 
            conversation.title.toLowerCase().includes(searchTerm)) {
          conversationScore += 10;
        }

        // Search message content
        if ((searchType === 'content' || searchType === 'all') && includeMessages) {
          conversation.messages.forEach(message => {
            if (message.content.toLowerCase().includes(searchTerm)) {
              matchingMessages.push({
                ...message,
                conversationId: conversation.id,
                conversationTitle: conversation.title
              });
              conversationScore += 1;
            }
          });
        }

        if (conversationScore > 0) {
          results.conversations.push({
            ...conversation,
            score: conversationScore,
            matchingMessageCount: matchingMessages.length,
            messages: includeMessages ? matchingMessages : undefined
          });
          results.messages.push(...matchingMessages);
        }
      });

      // Sort by relevance
      results.conversations.sort((a, b) => b.score - a.score);
      results.messages.sort((a, b) => b.timestamp - a.timestamp);

      // Apply limits
      results.conversations = results.conversations.slice(0, limit);
      results.messages = results.messages.slice(0, limit * 2);
      results.totalFound = results.conversations.length;

      console.log(`[ChatHistoryStore] Search completed: "${query}" found ${results.totalFound} results`);

      return {
        success: true,
        query,
        results
      };

    } catch (error) {
      console.error('[ChatHistoryStore] Search failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add message to conversation
   */
  async handleAddMessage(event, messageData) {
    try {
      const { conversationId, message } = messageData;

      if (!conversationId || !message) {
        throw new Error('Conversation ID and message are required');
      }

      const conversations = this.store.get('conversations', {});
      const conversation = conversations[conversationId];

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Validate and format message
      const validatedMessage = this.validateMessageData(message);

      // Add message to conversation
      conversation.messages.push(validatedMessage);
      conversation.updatedAt = Date.now();
      conversation.metadata.messageCount = conversation.messages.length;

      // Update conversation in store
      conversations[conversationId] = conversation;
      this.store.set('conversations', conversations);

      console.log(`[ChatHistoryStore] Added message to conversation: ${conversationId}`);

      return {
        success: true,
        conversationId,
        messageId: validatedMessage.id,
        messageCount: conversation.messages.length
      };

    } catch (error) {
      console.error('[ChatHistoryStore] Add message failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update existing message
   */
  async handleUpdateMessage(event, updateData) {
    try {
      const { conversationId, messageId, updates } = updateData;

      if (!conversationId || !messageId || !updates) {
        throw new Error('Conversation ID, message ID, and updates are required');
      }

      const conversations = this.store.get('conversations', {});
      const conversation = conversations[conversationId];

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const messageIndex = conversation.messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) {
        throw new Error('Message not found');
      }

      // Update message
      conversation.messages[messageIndex] = {
        ...conversation.messages[messageIndex],
        ...updates,
        updatedAt: Date.now()
      };

      conversation.updatedAt = Date.now();

      // Update conversation in store
      conversations[conversationId] = conversation;
      this.store.set('conversations', conversations);

      console.log(`[ChatHistoryStore] Updated message: ${messageId} in conversation: ${conversationId}`);

      return {
        success: true,
        conversationId,
        messageId,
        updatedMessage: conversation.messages[messageIndex]
      };

    } catch (error) {
      console.error('[ChatHistoryStore] Update message failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete message from conversation
   */
  async handleDeleteMessage(event, deleteData) {
    try {
      const { conversationId, messageId } = deleteData;

      if (!conversationId || !messageId) {
        throw new Error('Conversation ID and message ID are required');
      }

      const conversations = this.store.get('conversations', {});
      const conversation = conversations[conversationId];

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const messageIndex = conversation.messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) {
        throw new Error('Message not found');
      }

      // Remove message
      const deletedMessage = conversation.messages.splice(messageIndex, 1)[0];
      conversation.updatedAt = Date.now();
      conversation.metadata.messageCount = conversation.messages.length;

      // Update conversation in store
      conversations[conversationId] = conversation;
      this.store.set('conversations', conversations);

      console.log(`[ChatHistoryStore] Deleted message: ${messageId} from conversation: ${conversationId}`);

      return {
        success: true,
        conversationId,
        messageId,
        deletedMessage,
        remainingMessages: conversation.messages.length
      };

    } catch (error) {
      console.error('[ChatHistoryStore] Delete message failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create Claude Code CLI session
   */
  async handleCreateSession(event, sessionData) {
    try {
      const sessionId = sessionData.id || this.generateSessionId();
      const session = {
        id: sessionId,
        conversationId: sessionData.conversationId,
        startedAt: Date.now(),
        lastActiveAt: Date.now(),
        commandHistory: [],
        workingDirectory: sessionData.workingDirectory || process.cwd(),
        gitBranch: sessionData.gitBranch || 'main',
        isActive: true,
        metadata: sessionData.metadata || {}
      };

      const sessions = this.store.get('sessions', {});
      sessions[sessionId] = session;
      this.store.set('sessions', sessions);

      console.log(`[ChatHistoryStore] Created session: ${sessionId}`);

      return {
        success: true,
        sessionId,
        session
      };

    } catch (error) {
      console.error('[ChatHistoryStore] Create session failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update session data
   */
  async handleUpdateSession(event, updateData) {
    try {
      const { sessionId, updates } = updateData;

      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      const sessions = this.store.get('sessions', {});
      const session = sessions[sessionId];

      if (!session) {
        throw new Error('Session not found');
      }

      // Update session
      sessions[sessionId] = {
        ...session,
        ...updates,
        lastActiveAt: Date.now()
      };

      this.store.set('sessions', sessions);

      console.log(`[ChatHistoryStore] Updated session: ${sessionId}`);

      return {
        success: true,
        sessionId,
        session: sessions[sessionId]
      };

    } catch (error) {
      console.error('[ChatHistoryStore] Update session failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List all sessions
   */
  async handleListSessions(event, options = {}) {
    try {
      const { activeOnly = false, limit = 20 } = options;

      const sessions = this.store.get('sessions', {});
      let sessionList = Object.values(sessions);

      if (activeOnly) {
        sessionList = sessionList.filter(session => session.isActive);
      }

      // Sort by last active time
      sessionList.sort((a, b) => b.lastActiveAt - a.lastActiveAt);

      if (limit) {
        sessionList = sessionList.slice(0, limit);
      }

      console.log(`[ChatHistoryStore] Listed ${sessionList.length} sessions`);

      return {
        success: true,
        sessions: sessionList,
        total: Object.keys(sessions).length
      };

    } catch (error) {
      console.error('[ChatHistoryStore] List sessions failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export chat history data
   */
  async handleExportData(event, exportOptions = {}) {
    try {
      const { format = 'json', conversationIds = null } = exportOptions;

      const conversations = this.store.get('conversations', {});
      const sessions = this.store.get('sessions', {});
      const metadata = this.store.get('metadata', {});

      let exportData = {
        metadata: {
          ...metadata,
          exportedAt: Date.now(),
          exportFormat: format,
          version: '1.0.0'
        },
        conversations: conversationIds ? 
          Object.fromEntries(
            Object.entries(conversations).filter(([id]) => conversationIds.includes(id))
          ) : conversations,
        sessions
      };

      // Format data based on requested format
      if (format === 'jsonl') {
        // Convert to JSONL format for Claude Code compatibility
        exportData = this.convertToJSONL(exportData);
      }

      console.log(`[ChatHistoryStore] Exported data in ${format} format`);

      return {
        success: true,
        data: exportData,
        format,
        conversationCount: Object.keys(exportData.conversations || {}).length
      };

    } catch (error) {
      console.error('[ChatHistoryStore] Export data failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Import chat history data
   */
  async handleImportData(event, importOptions) {
    try {
      const { data, format = 'json', merge = true } = importOptions;

      if (!data) {
        throw new Error('Import data is required');
      }

      let importData = data;

      // Parse data based on format
      if (format === 'jsonl') {
        importData = this.parseJSONL(data);
      }

      const currentConversations = merge ? this.store.get('conversations', {}) : {};
      const currentSessions = merge ? this.store.get('sessions', {}) : {};

      // Merge or replace conversations
      const newConversations = {
        ...currentConversations,
        ...(importData.conversations || {})
      };

      const newSessions = {
        ...currentSessions,
        ...(importData.sessions || {})
      };

      // Update store
      this.store.set('conversations', newConversations);
      this.store.set('sessions', newSessions);

      // Update metadata
      const metadata = this.store.get('metadata', {});
      metadata.totalConversations = Object.keys(newConversations).length;
      metadata.lastImport = Date.now();
      this.store.set('metadata', metadata);

      const importedCount = Object.keys(importData.conversations || {}).length;

      console.log(`[ChatHistoryStore] Imported ${importedCount} conversations`);

      return {
        success: true,
        importedConversations: importedCount,
        totalConversations: Object.keys(newConversations).length,
        merged: merge
      };

    } catch (error) {
      console.error('[ChatHistoryStore] Import data failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create backup of chat history
   */
  async handleBackup(event, backupOptions = {}) {
    try {
      const { includeMetadata = true } = backupOptions;

      const timestamp = Date.now();
      const backupData = {
        conversations: this.store.get('conversations', {}),
        sessions: this.store.get('sessions', {}),
        metadata: includeMetadata ? {
          ...this.store.get('metadata', {}),
          backupCreatedAt: timestamp
        } : undefined
      };

      // Update metadata with backup info
      const metadata = this.store.get('metadata', {});
      metadata.lastBackup = timestamp;
      this.store.set('metadata', metadata);

      console.log('[ChatHistoryStore] Created backup');

      return {
        success: true,
        backupData,
        timestamp,
        conversationCount: Object.keys(backupData.conversations).length
      };

    } catch (error) {
      console.error('[ChatHistoryStore] Backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Restore from backup
   */
  async handleRestore(event, restoreOptions) {
    try {
      const { backupData, merge = false } = restoreOptions;

      if (!backupData) {
        throw new Error('Backup data is required');
      }

      if (!merge) {
        // Full restore - replace all data
        this.store.set('conversations', backupData.conversations || {});
        this.store.set('sessions', backupData.sessions || {});
        if (backupData.metadata) {
          this.store.set('metadata', {
            ...backupData.metadata,
            restoredAt: Date.now()
          });
        }
      } else {
        // Merge restore - combine with existing data
        const currentConversations = this.store.get('conversations', {});
        const currentSessions = this.store.get('sessions', {});

        this.store.set('conversations', {
          ...currentConversations,
          ...(backupData.conversations || {})
        });

        this.store.set('sessions', {
          ...currentSessions,
          ...(backupData.sessions || {})
        });
      }

      const conversationCount = Object.keys(this.store.get('conversations', {})).length;

      console.log(`[ChatHistoryStore] Restored backup with ${conversationCount} conversations`);

      return {
        success: true,
        restoredConversations: Object.keys(backupData.conversations || {}).length,
        totalConversations: conversationCount,
        merged: merge
      };

    } catch (error) {
      console.error('[ChatHistoryStore] Restore failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get metadata and statistics
   */
  async handleGetMetadata(event) {
    try {
      const conversations = this.store.get('conversations', {});
      const sessions = this.store.get('sessions', {});
      const metadata = this.store.get('metadata', {});

      const stats = {
        ...metadata,
        totalConversations: Object.keys(conversations).length,
        totalSessions: Object.keys(sessions).length,
        totalMessages: Object.values(conversations).reduce(
          (sum, conv) => sum + conv.messages.length, 0
        ),
        activeSessions: Object.values(sessions).filter(s => s.isActive).length,
        storageSize: this.store.size,
        lastAccessed: Date.now()
      };

      return {
        success: true,
        metadata: stats
      };

    } catch (error) {
      console.error('[ChatHistoryStore] Get metadata failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up old data based on retention policies
   */
  async handleCleanup(event, cleanupOptions = {}) {
    try {
      const {
        retentionDays = 30,
        maxConversations = 1000,
        deleteEmpty = true
      } = cleanupOptions;

      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
      const conversations = this.store.get('conversations', {});
      const sessions = this.store.get('sessions', {});

      let deletedConversations = 0;
      let deletedSessions = 0;

      // Clean up old conversations
      Object.entries(conversations).forEach(([id, conversation]) => {
        const shouldDelete = conversation.updatedAt < cutoffTime ||
                           (deleteEmpty && conversation.messages.length === 0);
        
        if (shouldDelete) {
          delete conversations[id];
          deletedConversations++;
        }
      });

      // Clean up old sessions
      Object.entries(sessions).forEach(([id, session]) => {
        if (session.lastActiveAt < cutoffTime || !conversations[session.conversationId]) {
          delete sessions[id];
          deletedSessions++;
        }
      });

      // Limit total conversations if needed
      const conversationList = Object.entries(conversations);
      if (conversationList.length > maxConversations) {
        conversationList
          .sort(([,a], [,b]) => a.updatedAt - b.updatedAt)
          .slice(0, conversationList.length - maxConversations)
          .forEach(([id]) => {
            delete conversations[id];
            deletedConversations++;
          });
      }

      // Update store
      this.store.set('conversations', conversations);
      this.store.set('sessions', sessions);

      // Update metadata
      const metadata = this.store.get('metadata', {});
      metadata.totalConversations = Object.keys(conversations).length;
      metadata.lastCleanup = Date.now();
      this.store.set('metadata', metadata);

      console.log(`[ChatHistoryStore] Cleanup completed: ${deletedConversations} conversations, ${deletedSessions} sessions deleted`);

      return {
        success: true,
        deletedConversations,
        deletedSessions,
        remainingConversations: Object.keys(conversations).length,
        remainingSessions: Object.keys(sessions).length
      };

    } catch (error) {
      console.error('[ChatHistoryStore] Cleanup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate conversation data structure
   */
  validateConversationData(conversationData) {
    const required = ['id', 'title', 'messages', 'createdAt', 'updatedAt'];
    
    for (const field of required) {
      if (!conversationData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return {
      id: conversationData.id,
      title: conversationData.title,
      messages: conversationData.messages.map(msg => this.validateMessageData(msg)),
      createdAt: conversationData.createdAt,
      updatedAt: conversationData.updatedAt,
      metadata: conversationData.metadata || {}
    };
  }

  /**
   * Validate message data structure (Claude Code CLI compatible)
   */
  validateMessageData(messageData) {
    const messageId = messageData.id || this.generateMessageId();
    const timestamp = messageData.timestamp || Date.now();

    return {
      id: messageId,
      sessionId: messageData.sessionId || messageData.conversationId,
      parentUuid: messageData.parentUuid || null,
      role: messageData.role || 'user',
      content: messageData.content || '',
      timestamp,
      metadata: {
        cwd: messageData.metadata?.cwd || process.cwd(),
        gitBranch: messageData.metadata?.gitBranch || 'main',
        version: messageData.metadata?.version || '1.0.0',
        userType: messageData.metadata?.userType || 'external',
        ...messageData.metadata
      }
    };
  }

  /**
   * Convert data to JSONL format for Claude Code compatibility
   */
  convertToJSONL(data) {
    const jsonlLines = [];

    // Add metadata line
    jsonlLines.push(JSON.stringify({
      type: 'metadata',
      ...data.metadata
    }));

    // Add conversation lines
    Object.values(data.conversations || {}).forEach(conversation => {
      jsonlLines.push(JSON.stringify({
        type: 'conversation',
        ...conversation
      }));
    });

    return jsonlLines.join('\n');
  }

  /**
   * Parse JSONL format data
   */
  parseJSONL(jsonlData) {
    const lines = jsonlData.split('\n').filter(line => line.trim());
    const result = {
      conversations: {},
      sessions: {},
      metadata: {}
    };

    lines.forEach(line => {
      try {
        const data = JSON.parse(line);
        
        if (data.type === 'metadata') {
          result.metadata = data;
        } else if (data.type === 'conversation') {
          result.conversations[data.id] = data;
        } else if (data.type === 'session') {
          result.sessions[data.id] = data;
        }
      } catch (error) {
        console.warn('[ChatHistoryStore] Failed to parse JSONL line:', line);
      }
    });

    return result;
  }

  /**
   * Validate and repair data integrity
   */
  async validateAndRepairData() {
    try {
      const conversations = this.store.get('conversations', {});
      const sessions = this.store.get('sessions', {});
      let repaired = false;

      // Validate conversations
      Object.entries(conversations).forEach(([id, conversation]) => {
        if (!conversation.id || conversation.id !== id) {
          conversation.id = id;
          repaired = true;
        }

        if (!conversation.messages) {
          conversation.messages = [];
          repaired = true;
        }

        if (!conversation.metadata) {
          conversation.metadata = {
            messageCount: conversation.messages.length
          };
          repaired = true;
        }
      });

      // Validate sessions
      Object.entries(sessions).forEach(([id, session]) => {
        if (!session.id || session.id !== id) {
          session.id = id;
          repaired = true;
        }

        // Remove orphaned sessions
        if (session.conversationId && !conversations[session.conversationId]) {
          delete sessions[id];
          repaired = true;
        }
      });

      if (repaired) {
        this.store.set('conversations', conversations);
        this.store.set('sessions', sessions);
        console.log('[ChatHistoryStore] Data validation and repair completed');
      }

    } catch (error) {
      console.error('[ChatHistoryStore] Data validation failed:', error);
    }
  }

  /**
   * Start automatic backup timer
   */
  startBackupTimer() {
    // Create backup every 6 hours
    this.backupInterval = setInterval(async () => {
      try {
        await this.handleBackup(null, { includeMetadata: true });
      } catch (error) {
        console.error('[ChatHistoryStore] Auto-backup failed:', error);
      }
    }, 6 * 60 * 60 * 1000);

    console.log('[ChatHistoryStore] Auto-backup timer started');
  }

  /**
   * Generate unique conversation ID following Claude Code format
   */
  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Generate unique message ID following Claude Code format
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Generate unique session ID following Claude Code format
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Get store file path for debugging
   */
  getStorePath() {
    return this.store ? this.store.path : null;
  }

  /**
   * Get store statistics
   */
  getStoreStats() {
    return {
      isInitialized: this.isInitialized,
      storePath: this.getStorePath(),
      storeSize: this.store ? this.store.size : 0,
      ipcHandlerCount: this.ipcHandlers.size
    };
  }

  /**
   * Destroy the store and clean up resources
   */
  async destroy() {
    // Stop backup timer
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }

    // Remove IPC handlers
    this.ipcHandlers.forEach((handler, channel) => {
      ipcMain.removeHandler(channel);
    });
    this.ipcHandlers.clear();

    this.isInitialized = false;
    this.store = null;

    console.log('[ChatHistoryStore] Destroyed');
  }
}

export default ChatHistoryStore;