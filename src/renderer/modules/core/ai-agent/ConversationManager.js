/**
 * ConversationManager - Dialog Context Management Module
 * 
 * Manages conversation context, history, and state for AI interactions.
 * As specified in PRD: AI-Agent-System/ConversationManager.js
 */

import { EventEmitter } from '../../../utils/EventEmitter.js';

class ConversationManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxHistorySize: options.maxHistorySize || 50,
      contextWindow: options.contextWindow || 10,
      autoSave: options.autoSave !== false,
      saveInterval: options.saveInterval || 30000, // 30 seconds
      ...options
    };
    
    this.conversations = new Map();
    this.currentConversationId = null;
    this.globalContext = new Map();
    this.isInitialized = false;
    this.saveTimer = null;
  }

  /**
   * Initialize conversation manager
   */
  async initialize() {
    try {
      console.log('[ConversationManager] Initializing...');
      
      // Load existing conversations from storage
      await this.loadConversations();
      
      // Start auto-save timer
      if (this.options.autoSave) {
        this.startAutoSave();
      }
      
      this.isInitialized = true;
      console.log('[ConversationManager] Successfully initialized');
      this.emit('initialized');
      
      return true;
    } catch (error) {
      console.error('[ConversationManager] Initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Create a new conversation
   */
  createConversation(options = {}) {
    const conversationId = options.id || this.generateConversationId();
    
    const conversation = {
      id: conversationId,
      title: options.title || `대화 ${conversationId}`,
      type: options.type || 'general',
      messages: [],
      context: new Map(),
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0,
        tags: options.tags || [],
        workspace: options.workspace || 'default'
      },
      settings: {
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 4000,
        systemPrompt: options.systemPrompt || null,
        ...options.settings
      }
    };

    this.conversations.set(conversationId, conversation);
    console.log(`[ConversationManager] Created conversation: ${conversationId}`);
    
    this.emit('conversation-created', { conversationId, conversation });
    return conversationId;
  }

  /**
   * Switch to a conversation
   */
  switchToConversation(conversationId) {
    if (!this.conversations.has(conversationId)) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const previousId = this.currentConversationId;
    this.currentConversationId = conversationId;
    
    console.log(`[ConversationManager] Switched to conversation: ${conversationId}`);
    this.emit('conversation-switched', { 
      conversationId, 
      previousId,
      conversation: this.conversations.get(conversationId)
    });
    
    return this.conversations.get(conversationId);
  }

  /**
   * Add message to current conversation
   */
  addMessage(message, conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    
    if (!targetId) {
      throw new Error('No active conversation');
    }

    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      throw new Error(`Conversation ${targetId} not found`);
    }

    const messageObj = {
      id: this.generateMessageId(),
      role: message.role || 'user',
      content: message.content,
      timestamp: Date.now(),
      metadata: {
        tokens: message.tokens || null,
        model: message.model || null,
        context: message.context || null,
        ...message.metadata
      }
    };

    conversation.messages.push(messageObj);
    conversation.metadata.updatedAt = Date.now();
    conversation.metadata.messageCount++;

    // Trim conversation if it exceeds max size
    this.trimConversation(conversation);

    console.log(`[ConversationManager] Added message to conversation ${targetId}`);
    this.emit('message-added', { conversationId: targetId, message: messageObj });

    return messageObj;
  }

  /**
   * Get conversation context for AI requests
   */
  getConversationContext(conversationId = null, includeMessages = true) {
    const targetId = conversationId || this.currentConversationId;
    
    if (!targetId) {
      return { messages: [], context: new Map() };
    }

    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      return { messages: [], context: new Map() };
    }

    const context = {
      conversationId: targetId,
      title: conversation.title,
      type: conversation.type,
      settings: conversation.settings,
      context: new Map([...this.globalContext, ...conversation.context])
    };

    if (includeMessages) {
      // Get recent messages within context window
      const recentMessages = conversation.messages.slice(-this.options.contextWindow);
      context.messages = recentMessages;
    }

    return context;
  }

  /**
   * Update conversation context
   */
  updateContext(key, value, conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    
    if (targetId) {
      const conversation = this.conversations.get(targetId);
      if (conversation) {
        conversation.context.set(key, value);
        conversation.metadata.updatedAt = Date.now();
        
        console.log(`[ConversationManager] Updated context for conversation ${targetId}: ${key}`);
        this.emit('context-updated', { conversationId: targetId, key, value });
      }
    } else {
      // Update global context
      this.globalContext.set(key, value);
      console.log(`[ConversationManager] Updated global context: ${key}`);
      this.emit('global-context-updated', { key, value });
    }
  }

  /**
   * Set global context that applies to all conversations
   */
  setGlobalContext(key, value) {
    this.globalContext.set(key, value);
    console.log(`[ConversationManager] Set global context: ${key}`);
    this.emit('global-context-updated', { key, value });
  }

  /**
   * Get message history formatted for Claude
   */
  getFormattedHistory(conversationId = null, messageCount = null) {
    const targetId = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(targetId);
    
    if (!conversation) {
      return [];
    }

    const count = messageCount || this.options.contextWindow;
    const recentMessages = conversation.messages.slice(-count);
    
    return recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));
  }

  /**
   * Search conversations by content or metadata
   */
  searchConversations(query, options = {}) {
    const searchResults = [];
    const searchTerm = query.toLowerCase();
    const searchType = options.type || 'all'; // 'title', 'content', 'all'
    
    for (const [id, conversation] of this.conversations) {
      let matches = false;
      
      // Search title
      if ((searchType === 'title' || searchType === 'all') && 
          conversation.title.toLowerCase().includes(searchTerm)) {
        matches = true;
      }
      
      // Search message content
      if ((searchType === 'content' || searchType === 'all') && !matches) {
        for (const message of conversation.messages) {
          if (message.content.toLowerCase().includes(searchTerm)) {
            matches = true;
            break;
          }
        }
      }
      
      // Search tags
      if (searchType === 'all' && !matches) {
        for (const tag of conversation.metadata.tags) {
          if (tag.toLowerCase().includes(searchTerm)) {
            matches = true;
            break;
          }
        }
      }
      
      if (matches) {
        searchResults.push({
          id,
          title: conversation.title,
          type: conversation.type,
          messageCount: conversation.metadata.messageCount,
          updatedAt: conversation.metadata.updatedAt,
          tags: conversation.metadata.tags
        });
      }
    }
    
    // Sort by relevance (most recently updated first)
    searchResults.sort((a, b) => b.updatedAt - a.updatedAt);
    
    console.log(`[ConversationManager] Search for "${query}" found ${searchResults.length} results`);
    return searchResults;
  }

  /**
   * Get conversation statistics
   */
  getConversationStats(conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(targetId);
    
    if (!conversation) {
      return null;
    }

    const stats = {
      id: targetId,
      title: conversation.title,
      messageCount: conversation.messages.length,
      createdAt: conversation.metadata.createdAt,
      updatedAt: conversation.metadata.updatedAt,
      userMessages: conversation.messages.filter(m => m.role === 'user').length,
      assistantMessages: conversation.messages.filter(m => m.role === 'assistant').length,
      totalTokens: conversation.messages.reduce((sum, m) => sum + (m.metadata.tokens || 0), 0),
      averageMessageLength: 0,
      tags: conversation.metadata.tags,
      type: conversation.type
    };

    if (stats.messageCount > 0) {
      const totalLength = conversation.messages.reduce((sum, m) => sum + m.content.length, 0);
      stats.averageMessageLength = Math.round(totalLength / stats.messageCount);
    }

    return stats;
  }

  /**
   * Export conversation data
   */
  exportConversation(conversationId, format = 'json') {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const exportData = {
      ...conversation,
      context: Object.fromEntries(conversation.context),
      exportedAt: Date.now(),
      version: '1.0'
    };

    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      
      case 'markdown':
        return this.convertToMarkdown(exportData);
      
      case 'plain':
        return this.convertToPlainText(exportData);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Import conversation data
   */
  importConversation(data, format = 'json') {
    let conversationData;
    
    try {
      switch (format) {
        case 'json':
          conversationData = typeof data === 'string' ? JSON.parse(data) : data;
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }
      
      // Validate conversation data
      if (!conversationData.id || !conversationData.messages) {
        throw new Error('Invalid conversation data format');
      }
      
      // Ensure unique ID
      let importId = conversationData.id;
      if (this.conversations.has(importId)) {
        importId = this.generateConversationId();
      }
      
      // Reconstruct conversation
      const conversation = {
        ...conversationData,
        id: importId,
        context: new Map(Object.entries(conversationData.context || {}))
      };
      
      this.conversations.set(importId, conversation);
      
      console.log(`[ConversationManager] Imported conversation: ${importId}`);
      this.emit('conversation-imported', { conversationId: importId, conversation });
      
      return importId;
      
    } catch (error) {
      console.error('[ConversationManager] Import failed:', error);
      throw error;
    }
  }

  /**
   * Delete conversation
   */
  deleteConversation(conversationId) {
    if (!this.conversations.has(conversationId)) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    this.conversations.delete(conversationId);
    
    // Switch to another conversation if this was current
    if (this.currentConversationId === conversationId) {
      const remaining = Array.from(this.conversations.keys());
      this.currentConversationId = remaining.length > 0 ? remaining[0] : null;
    }

    console.log(`[ConversationManager] Deleted conversation: ${conversationId}`);
    this.emit('conversation-deleted', { conversationId });
  }

  /**
   * Get all conversations summary
   */
  getAllConversations() {
    const summaries = [];
    
    for (const [id, conversation] of this.conversations) {
      summaries.push({
        id,
        title: conversation.title,
        type: conversation.type,
        messageCount: conversation.messages.length,
        createdAt: conversation.metadata.createdAt,
        updatedAt: conversation.metadata.updatedAt,
        tags: conversation.metadata.tags,
        isActive: id === this.currentConversationId
      });
    }
    
    // Sort by most recently updated
    summaries.sort((a, b) => b.updatedAt - a.updatedAt);
    
    return summaries;
  }

  /**
   * Helper Methods
   */
  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  trimConversation(conversation) {
    if (conversation.messages.length > this.options.maxHistorySize) {
      const removed = conversation.messages.splice(0, conversation.messages.length - this.options.maxHistorySize);
      console.log(`[ConversationManager] Trimmed ${removed.length} old messages from conversation ${conversation.id}`);
    }
  }

  convertToMarkdown(conversationData) {
    let markdown = `# ${conversationData.title}\n\n`;
    markdown += `**Type:** ${conversationData.type}\n`;
    markdown += `**Created:** ${new Date(conversationData.metadata.createdAt).toLocaleString()}\n`;
    markdown += `**Messages:** ${conversationData.messages.length}\n\n`;
    
    conversationData.messages.forEach(msg => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      markdown += `## ${msg.role === 'user' ? '사용자' : 'AI'} (${timestamp})\n\n`;
      markdown += `${msg.content}\n\n`;
    });
    
    return markdown;
  }

  convertToPlainText(conversationData) {
    let text = `${conversationData.title}\n${'='.repeat(conversationData.title.length)}\n\n`;
    
    conversationData.messages.forEach(msg => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      text += `[${timestamp}] ${msg.role === 'user' ? '사용자' : 'AI'}:\n${msg.content}\n\n`;
    });
    
    return text;
  }

  /**
   * Load conversations from storage
   */
  async loadConversations() {
    try {
      if (window.electronAPI?.storage?.get) {
        const savedConversations = await window.electronAPI.storage.get('conversations');
        const savedGlobalContext = await window.electronAPI.storage.get('globalContext');
        
        if (savedConversations) {
          for (const [id, data] of Object.entries(savedConversations)) {
            const conversation = {
              ...data,
              context: new Map(Object.entries(data.context || {}))
            };
            this.conversations.set(id, conversation);
          }
          console.log(`[ConversationManager] Loaded ${this.conversations.size} conversations`);
        }
        
        if (savedGlobalContext) {
          this.globalContext = new Map(Object.entries(savedGlobalContext));
          console.log(`[ConversationManager] Loaded global context`);
        }
      }
    } catch (error) {
      console.warn('[ConversationManager] Failed to load conversations:', error);
    }
  }

  /**
   * Save conversations to storage
   */
  async saveConversations() {
    try {
      if (window.electronAPI?.storage?.set) {
        // Convert conversations to serializable format
        const serializable = {};
        for (const [id, conversation] of this.conversations) {
          serializable[id] = {
            ...conversation,
            context: Object.fromEntries(conversation.context)
          };
        }
        
        await window.electronAPI.storage.set('conversations', serializable);
        await window.electronAPI.storage.set('globalContext', Object.fromEntries(this.globalContext));
        
        console.log(`[ConversationManager] Saved ${this.conversations.size} conversations`);
      }
    } catch (error) {
      console.error('[ConversationManager] Failed to save conversations:', error);
    }
  }

  /**
   * Start auto-save timer
   */
  startAutoSave() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }
    
    this.saveTimer = setInterval(() => {
      this.saveConversations();
    }, this.options.saveInterval);
    
    console.log('[ConversationManager] Auto-save started');
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
      console.log('[ConversationManager] Auto-save stopped');
    }
  }

  /**
   * Destroy conversation manager
   */
  async destroy() {
    this.stopAutoSave();
    
    // Save before destroying
    if (this.options.autoSave) {
      await this.saveConversations();
    }
    
    this.conversations.clear();
    this.globalContext.clear();
    this.currentConversationId = null;
    this.isInitialized = false;
    this.removeAllListeners();
    
    console.log('[ConversationManager] Destroyed');
  }
}

export default ConversationManager;
