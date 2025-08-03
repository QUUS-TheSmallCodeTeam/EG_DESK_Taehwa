/**
 * ChatHistoryManager - Renderer Process Chat History Management
 * 
 * Manages conversation lifecycle, persistence, and retrieval in the renderer process.
 * Communicates with main process ChatHistoryStore via IPC for persistent storage.
 * Provides Claude Code CLI-compatible session management and conversation threading.
 */

import { EventEmitter } from '../../../utils/EventEmitter.js';
import eventBus from '../state-management/EventBus.js';

class ChatHistoryManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxCachedConversations: options.maxCachedConversations || 50,
      autoSave: options.autoSave !== false,
      syncInterval: options.syncInterval || 5000, // 5 seconds
      retentionDays: options.retentionDays || 30,
      maxConversations: options.maxConversations || 1000,
      enableSearch: options.enableSearch !== false,
      compressionThreshold: options.compressionThreshold || 1000, // messages
      ...options
    };

    this.isInitialized = false;
    this.conversationCache = new Map(); // Local cache for fast access
    this.activeConversationId = null;
    this.sessionCache = new Map(); // Claude CLI session cache
    this.searchIndex = new Map(); // Local search index
    this.pendingUpdates = new Map(); // Updates pending sync to main process
    this.syncTimer = null;
    this.isOnline = true; // Track connection to main process
  }

  /**
   * Initialize chat history manager
   */
  async initialize() {
    try {
      console.log('[ChatHistoryManager] Initializing...');

      // Check IPC connectivity
      await this.checkIPCConnectivity();

      // Load metadata and recent conversations
      await this.loadInitialData();

      // Set up auto-sync
      if (this.options.autoSave) {
        this.startAutoSync();
      }

      // Set up event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      console.log('[ChatHistoryManager] Successfully initialized');
      this.emit('initialized');

      // Notify event bus
      eventBus.publish('chat-history-initialized', {
        cachedConversations: this.conversationCache.size,
        activeConversation: this.activeConversationId
      });

      return true;
    } catch (error) {
      console.error('[ChatHistoryManager] Initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Check IPC connectivity to main process
   */
  async checkIPCConnectivity() {
    try {
      if (!window.electronAPI?.chatHistory) {
        throw new Error('Chat history IPC not available');
      }

      // Test connection with metadata request
      const result = await window.electronAPI.chatHistory.getMetadata();
      if (!result.success) {
        throw new Error(`IPC test failed: ${result.error}`);
      }

      this.isOnline = true;
      console.log('[ChatHistoryManager] IPC connectivity verified');
      return true;
    } catch (error) {
      this.isOnline = false;
      console.error('[ChatHistoryManager] IPC connectivity failed:', error);
      throw error;
    }
  }

  /**
   * Load initial data from main process
   */
  async loadInitialData() {
    try {
      // Get recent conversations for cache
      const result = await window.electronAPI.chatHistory.listConversations({
        limit: this.options.maxCachedConversations,
        includeMessages: false
      });

      if (result.success) {
        // Cache conversation metadata
        result.conversations.forEach(conv => {
          this.conversationCache.set(conv.id, {
            ...conv,
            messages: [], // Messages loaded on demand
            isFullyLoaded: false
          });
        });

        console.log(`[ChatHistoryManager] Cached ${result.conversations.length} conversations`);
      }

      // Load sessions
      const sessionResult = await window.electronAPI.chatHistory.listSessions({
        activeOnly: true,
        limit: 20
      });

      if (sessionResult.success) {
        sessionResult.sessions.forEach(session => {
          this.sessionCache.set(session.id, session);
        });

        console.log(`[ChatHistoryManager] Cached ${sessionResult.sessions.length} sessions`);
      }

    } catch (error) {
      console.warn('[ChatHistoryManager] Failed to load initial data:', error);
      // Continue initialization even if this fails
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(conversationData = {}) {
    try {
      const conversationId = conversationData.id || this.generateConversationId();
      const timestamp = Date.now();

      const conversation = {
        id: conversationId,
        title: conversationData.title || 'New Conversation',
        messages: [],
        createdAt: timestamp,
        updatedAt: timestamp,
        metadata: {
          messageCount: 0,
          lastMessageAt: null,
          participants: ['user', 'assistant'],
          cwd: conversationData.cwd || process.cwd?.() || '/',
          gitBranch: conversationData.gitBranch || 'main',
          version: '1.0.0',
          userType: 'external',
          ...conversationData.metadata
        },
        tags: conversationData.tags || [],
        isFullyLoaded: true
      };

      // Add to local cache
      this.conversationCache.set(conversationId, conversation);

      // Save to main process
      const saveResult = await this.saveConversation(conversation);
      if (!saveResult.success) {
        throw new Error(`Failed to save conversation: ${saveResult.error}`);
      }

      // Set as active conversation
      await this.setActiveConversation(conversationId);

      console.log(`[ChatHistoryManager] Created conversation: ${conversationId}`);
      this.emit('conversation-created', { conversationId, conversation });

      // Notify event bus
      eventBus.publish('conversation-created', {
        conversationId,
        conversation: this.sanitizeConversationForEvent(conversation)
      });

      return conversationId;
    } catch (error) {
      console.error('[ChatHistoryManager] Create conversation failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Load conversation with full message history
   */
  async loadConversation(conversationId) {
    try {
      // Check cache first
      let conversation = this.conversationCache.get(conversationId);
      
      if (conversation && !conversation.isFullyLoaded) {
        // Load full conversation from main process
        const result = await window.electronAPI.chatHistory.loadConversation(conversationId);
        
        if (result.success) {
          conversation = {
            ...result.conversation,
            isFullyLoaded: true
          };
          
          // Update cache
          this.conversationCache.set(conversationId, conversation);
        } else {
          throw new Error(`Failed to load conversation: ${result.error}`);
        }
      } else if (!conversation) {
        // Load from main process
        const result = await window.electronAPI.chatHistory.loadConversation(conversationId);
        
        if (result.success) {
          conversation = {
            ...result.conversation,
            isFullyLoaded: true
          };
          
          // Add to cache
          this.conversationCache.set(conversationId, conversation);
        } else {
          throw new Error(`Conversation not found: ${conversationId}`);
        }
      }

      console.log(`[ChatHistoryManager] Loaded conversation: ${conversationId}`);
      this.emit('conversation-loaded', { conversationId, conversation });

      // Notify event bus
      eventBus.publish('conversation-loaded', {
        conversationId,
        messageCount: conversation.messages.length
      });

      return conversation;
    } catch (error) {
      console.error('[ChatHistoryManager] Load conversation failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Add message to conversation
   */
  async addMessage(conversationId, message) {
    try {
      if (!conversationId) {
        conversationId = this.activeConversationId;
      }

      if (!conversationId) {
        throw new Error('No active conversation');
      }

      // Ensure conversation is loaded
      const conversation = await this.loadConversation(conversationId);

      // Validate and format message
      const messageData = this.validateAndFormatMessage(message, conversationId);

      // Add to local cache
      conversation.messages.push(messageData);
      conversation.updatedAt = Date.now();
      conversation.metadata.messageCount = conversation.messages.length;
      conversation.metadata.lastMessageAt = messageData.timestamp;

      // Update cache
      this.conversationCache.set(conversationId, conversation);

      // Save to main process (async)
      if (this.isOnline) {
        try {
          const result = await window.electronAPI.chatHistory.addMessage({
            conversationId,
            message: messageData
          });

          if (!result.success) {
            console.warn(`[ChatHistoryManager] Failed to save message: ${result.error}`);
            this.addToPendingUpdates(conversationId, 'add-message', messageData);
          }
        } catch (error) {
          console.warn('[ChatHistoryManager] Message save failed, adding to pending:', error);
          this.addToPendingUpdates(conversationId, 'add-message', messageData);
        }
      } else {
        this.addToPendingUpdates(conversationId, 'add-message', messageData);
      }

      // Update search index
      this.updateSearchIndex(conversationId, messageData);

      console.log(`[ChatHistoryManager] Added message to conversation: ${conversationId}`);
      this.emit('message-added', { conversationId, messageId: messageData.id, message: messageData });

      // Notify event bus
      eventBus.publish('message-added', {
        conversationId,
        messageId: messageData.id,
        message: this.sanitizeMessageForEvent(messageData)
      });

      return messageData.id;
    } catch (error) {
      console.error('[ChatHistoryManager] Add message failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Set active conversation
   */
  async setActiveConversation(conversationId) {
    try {
      if (conversationId && !this.conversationCache.has(conversationId)) {
        // Load conversation if not in cache
        await this.loadConversation(conversationId);
      }

      const previousId = this.activeConversationId;
      this.activeConversationId = conversationId;

      console.log(`[ChatHistoryManager] Active conversation changed: ${conversationId}`);
      this.emit('active-conversation-changed', { conversationId, previousId });

      // Notify event bus
      eventBus.publish('active-conversation-changed', {
        conversationId,
        previousId
      });

      return conversationId;
    } catch (error) {
      console.error('[ChatHistoryManager] Set active conversation failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get active conversation
   */
  getActiveConversation() {
    if (!this.activeConversationId) {
      return null;
    }

    return this.conversationCache.get(this.activeConversationId) || null;
  }

  /**
   * List conversations with pagination and filtering
   */
  async listConversations(options = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        includeMessages = false,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
        useCache = true
      } = options;

      if (useCache && this.conversationCache.size > 0) {
        // Return cached data
        let conversations = Array.from(this.conversationCache.values());

        // Sort conversations
        conversations.sort((a, b) => {
          const aValue = a[sortBy] || 0;
          const bValue = b[sortBy] || 0;
          return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
        });

        // Apply pagination
        const total = conversations.length;
        const paginatedList = conversations.slice(offset, offset + limit);

        // Optionally exclude messages
        if (!includeMessages) {
          paginatedList.forEach(conv => {
            if (!conv.isFullyLoaded) {
              conv.messageCount = conv.metadata?.messageCount || 0;
            } else {
              conv.messageCount = conv.messages.length;
            }
            delete conv.messages;
          });
        }

        return {
          success: true,
          conversations: paginatedList,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total
          },
          source: 'cache'
        };
      } else {
        // Fetch from main process
        const result = await window.electronAPI.chatHistory.listConversations(options);
        
        if (result.success) {
          // Update cache with results
          result.conversations.forEach(conv => {
            this.conversationCache.set(conv.id, {
              ...conv,
              isFullyLoaded: includeMessages
            });
          });
        }

        return result;
      }
    } catch (error) {
      console.error('[ChatHistoryManager] List conversations failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Search conversations and messages
   */
  async searchConversations(query, options = {}) {
    try {
      const {
        searchType = 'all',
        limit = 20,
        includeMessages = true,
        useCache = false
      } = options;

      if (useCache && this.searchIndex.size > 0) {
        // Use local search index for faster results
        const results = this.performLocalSearch(query, { searchType, limit, includeMessages });
        
        // Notify event bus
        eventBus.publish('chat-history-searched', {
          query,
          results: {
            conversationCount: results.conversations.length,
            messageCount: results.messages.length
          },
          source: 'cache'
        });

        return {
          success: true,
          query,
          results,
          source: 'cache'
        };
      } else {
        // Search via main process
        const result = await window.electronAPI.chatHistory.searchConversations({
          query,
          searchType,
          limit,
          includeMessages
        });

        if (result.success) {
          // Update cache with search results
          result.results.conversations.forEach(conv => {
            this.conversationCache.set(conv.id, {
              ...conv,
              isFullyLoaded: includeMessages
            });
          });

          // Notify event bus
          eventBus.publish('chat-history-searched', {
            query,
            results: {
              conversationCount: result.results.conversations.length,
              messageCount: result.results.messages.length
            },
            source: 'storage'
          });
        }

        return result;
      }
    } catch (error) {
      console.error('[ChatHistoryManager] Search failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId) {
    try {
      // Get conversation info before deletion
      const conversation = this.conversationCache.get(conversationId);

      // Remove from cache
      this.conversationCache.delete(conversationId);
      this.searchIndex.delete(conversationId);

      // Clear active conversation if needed
      if (this.activeConversationId === conversationId) {
        this.activeConversationId = null;
      }

      // Delete from main process
      const result = await window.electronAPI.chatHistory.deleteConversation(conversationId);
      
      if (!result.success) {
        throw new Error(`Failed to delete conversation: ${result.error}`);
      }

      console.log(`[ChatHistoryManager] Deleted conversation: ${conversationId}`);
      this.emit('conversation-deleted', { conversationId, conversation });

      // Notify event bus
      eventBus.publish('conversation-deleted', {
        conversationId,
        conversation: conversation ? this.sanitizeConversationForEvent(conversation) : null
      });

      return result;
    } catch (error) {
      console.error('[ChatHistoryManager] Delete conversation failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Create Claude CLI session
   */
  async createSession(options = {}) {
    try {
      const sessionData = {
        id: options.id || this.generateSessionId(),
        conversationId: options.conversationId || this.activeConversationId,
        workingDirectory: options.workingDirectory || process.cwd?.() || '/',
        gitBranch: options.gitBranch || 'main',
        metadata: options.metadata || {}
      };

      const result = await window.electronAPI.chatHistory.createSession(sessionData);
      
      if (result.success) {
        // Add to session cache
        this.sessionCache.set(result.sessionId, result.session);

        console.log(`[ChatHistoryManager] Created session: ${result.sessionId}`);
        this.emit('session-created', { sessionId: result.sessionId, session: result.session });

        // Notify event bus
        eventBus.publish('session-created', {
          sessionId: result.sessionId,
          conversationId: result.session.conversationId
        });
      }

      return result;
    } catch (error) {
      console.error('[ChatHistoryManager] Create session failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Continue last session (Claude --continue)
   */
  async continueLastSession() {
    try {
      // Get most recent active session
      const sessions = Array.from(this.sessionCache.values())
        .filter(session => session.isActive)
        .sort((a, b) => b.lastActiveAt - a.lastActiveAt);

      if (sessions.length === 0) {
        throw new Error('No recent session to continue');
      }

      const lastSession = sessions[0];
      
      // Set as active conversation
      if (lastSession.conversationId) {
        await this.setActiveConversation(lastSession.conversationId);
      }

      // Update session
      const updateResult = await window.electronAPI.chatHistory.updateSession({
        sessionId: lastSession.id,
        updates: {
          lastActiveAt: Date.now(),
          isActive: true
        }
      });

      if (updateResult.success) {
        this.sessionCache.set(lastSession.id, updateResult.session);
      }

      console.log(`[ChatHistoryManager] Continuing session: ${lastSession.id}`);
      this.emit('session-continued', { sessionId: lastSession.id, session: lastSession });

      // Notify event bus
      eventBus.publish('session-continued', {
        sessionId: lastSession.id,
        conversationId: lastSession.conversationId
      });

      return {
        success: true,
        sessionId: lastSession.id,
        conversationId: lastSession.conversationId
      };
    } catch (error) {
      console.error('[ChatHistoryManager] Continue session failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Resume specific session (Claude --resume)
   */
  async resumeSession(sessionId) {
    try {
      let session = this.sessionCache.get(sessionId);
      
      if (!session) {
        // Load from main process
        const sessions = await window.electronAPI.chatHistory.listSessions({ limit: 100 });
        if (sessions.success) {
          session = sessions.sessions.find(s => s.id === sessionId);
          if (session) {
            this.sessionCache.set(sessionId, session);
          }
        }
      }

      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Set as active conversation
      if (session.conversationId) {
        await this.setActiveConversation(session.conversationId);
      }

      // Update session
      const updateResult = await window.electronAPI.chatHistory.updateSession({
        sessionId,
        updates: {
          lastActiveAt: Date.now(),
          isActive: true
        }
      });

      if (updateResult.success) {
        this.sessionCache.set(sessionId, updateResult.session);
        session = updateResult.session;
      }

      console.log(`[ChatHistoryManager] Resumed session: ${sessionId}`);
      this.emit('session-resumed', { sessionId, session });

      // Notify event bus
      eventBus.publish('session-resumed', {
        sessionId,
        conversationId: session.conversationId
      });

      return {
        success: true,
        sessionId,
        conversationId: session.conversationId
      };
    } catch (error) {
      console.error('[ChatHistoryManager] Resume session failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Validate and format message for Claude Code CLI compatibility
   */
  validateAndFormatMessage(message, conversationId) {
    const messageId = message.id || this.generateMessageId();
    const timestamp = message.timestamp || Date.now();

    return {
      id: messageId,
      sessionId: conversationId, // Use conversation ID as session ID for compatibility
      parentUuid: message.parentUuid || null,
      role: message.role || 'user',
      content: message.content || '',
      timestamp,
      metadata: {
        cwd: message.metadata?.cwd || process.cwd?.() || '/',
        gitBranch: message.metadata?.gitBranch || 'main',
        version: message.metadata?.version || '1.0.0',
        userType: message.metadata?.userType || 'external',
        ...message.metadata
      }
    };
  }

  /**
   * Save conversation to main process
   */
  async saveConversation(conversation) {
    try {
      return await window.electronAPI.chatHistory.saveConversation(conversation);
    } catch (error) {
      console.error('[ChatHistoryManager] Save conversation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add update to pending queue for offline sync
   */
  addToPendingUpdates(conversationId, operation, data) {
    if (!this.pendingUpdates.has(conversationId)) {
      this.pendingUpdates.set(conversationId, []);
    }

    this.pendingUpdates.get(conversationId).push({
      operation,
      data,
      timestamp: Date.now()
    });

    console.log(`[ChatHistoryManager] Added pending update: ${operation} for ${conversationId}`);
  }

  /**
   * Update local search index
   */
  updateSearchIndex(conversationId, message) {
    if (!this.searchIndex.has(conversationId)) {
      const conversation = this.conversationCache.get(conversationId);
      this.searchIndex.set(conversationId, {
        title: conversation?.title || '',
        messages: []
      });
    }

    const index = this.searchIndex.get(conversationId);
    index.messages.push({
      id: message.id,
      content: message.content.substring(0, 200),
      timestamp: message.timestamp
    });
  }

  /**
   * Perform local search on cached data
   */
  performLocalSearch(query, options) {
    const { searchType = 'all', limit = 20, includeMessages = true } = options;
    const searchTerm = query.toLowerCase();
    const results = {
      conversations: [],
      messages: []
    };

    for (const [conversationId, conversation] of this.conversationCache) {
      let conversationScore = 0;
      const matchingMessages = [];

      // Search conversation title
      if ((searchType === 'title' || searchType === 'all') &&
          conversation.title.toLowerCase().includes(searchTerm)) {
        conversationScore += 10;
      }

      // Search message content
      if ((searchType === 'content' || searchType === 'all') && includeMessages) {
        const indexData = this.searchIndex.get(conversationId);
        if (indexData) {
          indexData.messages.forEach(msg => {
            if (msg.content.toLowerCase().includes(searchTerm)) {
              matchingMessages.push({
                ...msg,
                conversationId,
                conversationTitle: conversation.title
              });
              conversationScore += 1;
            }
          });
        }
      }

      if (conversationScore > 0) {
        results.conversations.push({
          ...conversation,
          score: conversationScore,
          matchingMessageCount: matchingMessages.length
        });
        results.messages.push(...matchingMessages);
      }
    }

    // Sort and limit results
    results.conversations.sort((a, b) => b.score - a.score);
    results.messages.sort((a, b) => b.timestamp - a.timestamp);

    results.conversations = results.conversations.slice(0, limit);
    results.messages = results.messages.slice(0, limit * 2);

    return results;
  }

  /**
   * Set up event handlers for cross-module communication
   */
  setupEventHandlers() {
    // Listen to global state changes
    eventBus.subscribe('state-sync:chat-history', (eventData) => {
      this.handleStateSyncEvent(eventData.data);
    }, 'ChatHistoryManager');

    // Handle network state changes
    eventBus.subscribe('network-status-changed', (eventData) => {
      this.handleNetworkStatusChange(eventData.data.isOnline);
    }, 'ChatHistoryManager');

    // Handle cleanup triggers
    eventBus.subscribe('chat-history-cleanup-trigger', (eventData) => {
      this.cleanup(eventData.data.options);
    }, 'ChatHistoryManager');
  }

  /**
   * Handle state synchronization events
   */
  handleStateSyncEvent(syncData) {
    console.log('[ChatHistoryManager] Handling state sync event:', syncData);
    
    // Implement synchronization logic based on sync type
    if (syncData.type === 'conversation-updated') {
      this.handleConversationUpdated(syncData.conversationId, syncData.updates);
    } else if (syncData.type === 'conversation-deleted') {
      this.handleConversationDeleted(syncData.conversationId);
    }
  }

  /**
   * Handle network status changes
   */
  handleNetworkStatusChange(isOnline) {
    console.log(`[ChatHistoryManager] Network status changed: ${isOnline ? 'online' : 'offline'}`);
    
    const wasOffline = !this.isOnline;
    this.isOnline = isOnline;

    if (isOnline && wasOffline) {
      // Sync pending updates when coming back online
      this.syncPendingUpdates();
    }
  }

  /**
   * Sync pending updates to main process
   */
  async syncPendingUpdates() {
    if (this.pendingUpdates.size === 0) {
      return;
    }

    console.log(`[ChatHistoryManager] Syncing ${this.pendingUpdates.size} pending updates`);

    for (const [conversationId, updates] of this.pendingUpdates) {
      try {
        for (const update of updates) {
          switch (update.operation) {
            case 'add-message':
              await window.electronAPI.chatHistory.addMessage({
                conversationId,
                message: update.data
              });
              break;
          }
        }

        // Clear processed updates
        this.pendingUpdates.delete(conversationId);
      } catch (error) {
        console.error(`[ChatHistoryManager] Failed to sync updates for ${conversationId}:`, error);
      }
    }
  }

  /**
   * Start auto-sync timer
   */
  startAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.isOnline && this.pendingUpdates.size > 0) {
        this.syncPendingUpdates();
      }
    }, this.options.syncInterval);

    console.log('[ChatHistoryManager] Auto-sync started');
  }

  /**
   * Stop auto-sync timer
   */
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('[ChatHistoryManager] Auto-sync stopped');
    }
  }

  /**
   * Sanitize conversation data for event broadcasting
   */
  sanitizeConversationForEvent(conversation) {
    return {
      id: conversation.id,
      title: conversation.title,
      messageCount: conversation.messages?.length || conversation.metadata?.messageCount || 0,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      tags: conversation.tags
    };
  }

  /**
   * Sanitize message data for event broadcasting
   */
  sanitizeMessageForEvent(message) {
    return {
      id: message.id,
      role: message.role,
      timestamp: message.timestamp,
      contentPreview: message.content.substring(0, 100)
    };
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
   * Get debug information
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      isOnline: this.isOnline,
      cacheSize: this.conversationCache.size,
      sessionCacheSize: this.sessionCache.size,
      activeConversationId: this.activeConversationId,
      pendingUpdates: this.pendingUpdates.size,
      searchIndexSize: this.searchIndex.size,
      options: this.options
    };
  }

  /**
   * Destroy chat history manager
   */
  async destroy() {
    // Stop auto-sync
    this.stopAutoSync();

    // Sync pending updates before destroying
    if (this.isOnline && this.pendingUpdates.size > 0) {
      try {
        await this.syncPendingUpdates();
      } catch (error) {
        console.warn('[ChatHistoryManager] Failed to sync pending updates during destroy:', error);
      }
    }

    // Clear caches and data
    this.conversationCache.clear();
    this.sessionCache.clear();
    this.searchIndex.clear();
    this.pendingUpdates.clear();

    // Unsubscribe from events
    eventBus.unsubscribeModule('ChatHistoryManager');

    this.isInitialized = false;
    this.activeConversationId = null;
    this.removeAllListeners();

    console.log('[ChatHistoryManager] Destroyed');
  }
}

export default ChatHistoryManager;