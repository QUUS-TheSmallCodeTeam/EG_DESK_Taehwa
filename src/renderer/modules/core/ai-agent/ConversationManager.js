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
      maxSessions: options.maxSessions || 100,
      enableSessionCompaction: options.enableSessionCompaction !== false,
      compactionThreshold: options.compactionThreshold || 20, // messages
      ...options
    };
    
    this.conversations = new Map();
    this.sessionHistory = new Map(); // Track session metadata
    this.currentConversationId = null;
    this.globalContext = new Map();
    this.isInitialized = false;
    this.saveTimer = null;
    this.sessionCache = new Map(); // LRU cache for recent sessions
    this.lastSessionId = null; // Track most recent session for --continue
  }

  /**
   * Initialize conversation manager with ChatHistoryManager integration
   */
  async initialize(chatHistoryManager = null) {
    try {
      
      // Set up ChatHistoryManager integration
      this.chatHistoryManager = chatHistoryManager;
      
      if (this.chatHistoryManager) {
        this.setupChatHistoryIntegration();
      } else {
        // Load existing conversations from storage (legacy mode)
        await this.loadConversations();
      }
      
      // Start auto-save timer
      if (this.options.autoSave) {
        this.startAutoSave();
      }
      
      this.isInitialized = true;
      this.emit('initialized');
      
      return true;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Set up ChatHistoryManager integration
   */
  setupChatHistoryIntegration() {
    if (!this.chatHistoryManager) return;
    
    // Listen to ChatHistoryManager events
    this.chatHistoryManager.on('conversation-created', (data) => {
      this.handleHistoryConversationCreated(data);
    });
    
    this.chatHistoryManager.on('message-added', (data) => {
      this.handleHistoryMessageAdded(data);
    });
    
    this.chatHistoryManager.on('active-conversation-changed', (data) => {
      this.handleHistoryActiveConversationChanged(data);
    });
    
  }
  
  /**
   * Create a new conversation (Claude Code style session)
   */
  async createConversation(options = {}) {
    const conversationId = options.id || this.generateConversationId();
    
    const conversation = {
      id: conversationId,
      title: options.title || this.generateSessionTitle(options),
      type: options.type || 'general',
      messages: [],
      context: new Map(),
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0,
        tokenUsage: { input: 0, output: 0, total: 0 },
        costTracking: { 
          session: { input: 0, output: 0, total: 0 },
          total: { input: 0, output: 0, total: 0 },
          byProvider: {}
        },
        providerStats: {},
        tags: options.tags || [],
        workspace: options.workspace || 'default',
        projectPath: options.projectPath || null,
        isActive: true,
        lastCommand: null,
        compactionCount: 0
      },
      settings: {
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 4000,
        systemPrompt: options.systemPrompt || null,
        model: options.model || 'claude-3-5-sonnet-20241022',
        provider: options.provider || 'claude',
        enableStreaming: options.enableStreaming !== false,
        enableCostTracking: options.enableCostTracking !== false,
        ...options.settings
      },
      sessionState: {
        hasMemoryFile: false,
        memoryContent: null,
        isInteractive: options.interactive !== false,
        continuationMode: false,
        contextSummary: null,
        currentProvider: options.provider || 'claude',
        currentModel: options.model || 'claude-3-5-sonnet-20241022',
        providerHistory: []
      }
    };

    // Create via ChatHistoryManager if available
    if (this.chatHistoryManager) {
      try {
        const historyConversationId = await this.chatHistoryManager.createConversation({
          id: conversationId,
          title: conversation.title,
          tags: conversation.metadata.tags,
          metadata: {
            type: conversation.type,
            workspace: conversation.metadata.workspace,
            projectPath: conversation.metadata.projectPath,
            settings: conversation.settings
          }
        });
        
        // Store in local cache with history integration flag
        conversation._historyIntegrated = true;
        this.conversations.set(conversationId, conversation);
        
      } catch (error) {
        // Fall back to local storage
        this.conversations.set(conversationId, conversation);
      }
    } else {
      // Legacy mode - store locally
      this.conversations.set(conversationId, conversation);
    }

    this.sessionHistory.set(conversationId, {
      id: conversationId,
      title: conversation.title,
      createdAt: conversation.metadata.createdAt,
      lastAccessed: Date.now(),
      messageCount: 0,
      isActive: true
    });
    
    // Update last session tracking
    this.lastSessionId = conversationId;
    
    // Manage session limits
    this.enforceSessionLimits();
    
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
    
    this.emit('conversation-switched', { 
      conversationId, 
      previousId,
      conversation: this.conversations.get(conversationId)
    });
    
    return this.conversations.get(conversationId);
  }

  /**
   * Add message to current conversation (with Claude Code session tracking)
   */
  async addMessage(message, conversationId = null) {
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
        provider: message.provider || conversation.sessionState.currentProvider,
        providerModel: message.providerModel || null,
        context: message.context || null,
        command: message.command || null,
        cost: message.cost || null,
        processingTime: message.processingTime || null,
        ...message.metadata
      }
    };

    // Add to ChatHistoryManager if integrated
    if (this.chatHistoryManager && conversation._historyIntegrated) {
      try {
        await this.chatHistoryManager.addMessage(targetId, messageObj);
      } catch (error) {
        // Continue with local storage as fallback
      }
    }

    conversation.messages.push(messageObj);
    conversation.metadata.updatedAt = Date.now();
    conversation.metadata.messageCount++;
    
    // Update token usage and cost tracking
    if (message.tokens) {
      conversation.metadata.tokenUsage.input += message.tokens.input || 0;
      conversation.metadata.tokenUsage.output += message.tokens.output || 0;
      conversation.metadata.tokenUsage.total = conversation.metadata.tokenUsage.input + conversation.metadata.tokenUsage.output;
    }
    
    // Enhanced cost tracking with provider-specific metrics
    const provider = message.provider || conversation.sessionState.currentProvider || 'unknown';
    
    if (message.cost) {
      // Update conversation-level cost tracking
      conversation.metadata.costTracking.session.total += message.cost;
      conversation.metadata.costTracking.total.total += message.cost;
      
      // Track cost by provider
      if (!conversation.metadata.costTracking.byProvider[provider]) {
        conversation.metadata.costTracking.byProvider[provider] = {
          session: { cost: 0, tokens: 0, messages: 0 },
          total: { cost: 0, tokens: 0, messages: 0 }
        };
      }
      
      const providerCosts = conversation.metadata.costTracking.byProvider[provider];
      providerCosts.session.cost += message.cost;
      providerCosts.total.cost += message.cost;
      providerCosts.session.messages += 1;
      providerCosts.total.messages += 1;
      
      if (message.tokens) {
        const totalTokens = message.tokens.total || (message.tokens.input + message.tokens.output) || 0;
        providerCosts.session.tokens += totalTokens;
        providerCosts.total.tokens += totalTokens;
      }
    }
    
    // Update provider statistics
    if (!conversation.metadata.providerStats[provider]) {
      conversation.metadata.providerStats[provider] = {
        messageCount: 0,
        lastUsed: null,
        totalCost: 0,
        totalTokens: 0,
        models: {}
      };
    }
    
    const providerStats = conversation.metadata.providerStats[provider];
    providerStats.messageCount += 1;
    providerStats.lastUsed = Date.now();
    
    if (message.cost) {
      providerStats.totalCost += message.cost;
    }
    
    if (message.tokens) {
      const totalTokens = message.tokens.total || (message.tokens.input + message.tokens.output) || 0;
      providerStats.totalTokens += totalTokens;
    }
    
    // Track model usage within provider
    const model = message.model || conversation.sessionState.currentModel || 'unknown';
    if (!providerStats.models[model]) {
      providerStats.models[model] = { count: 0, lastUsed: null };
    }
    providerStats.models[model].count += 1;
    providerStats.models[model].lastUsed = Date.now();
    
    // Update session history
    const sessionInfo = this.sessionHistory.get(targetId);
    if (sessionInfo) {
      sessionInfo.lastAccessed = Date.now();
      sessionInfo.messageCount = conversation.metadata.messageCount;
    }
    
    // Update last session tracking
    this.lastSessionId = targetId;

    // Check if compaction is needed
    if (this.shouldCompactConversation(conversation)) {
      this.compactConversation(targetId);
    } else {
      // Trim conversation if it exceeds max size
      this.trimConversation(conversation);
    }

    this.emit('message-added', { conversationId: targetId, message: messageObj });

    return messageObj;
  }

  /**
   * Switch provider for a conversation
   */
  switchProvider(providerId, modelId = null, conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    
    if (!targetId) {
      throw new Error('No active conversation');
    }
    
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      throw new Error(`Conversation ${targetId} not found`);
    }
    
    const previousProvider = conversation.sessionState.currentProvider;
    const previousModel = conversation.sessionState.currentModel;
    
    // Update conversation state
    conversation.sessionState.currentProvider = providerId;
    if (modelId) {
      conversation.sessionState.currentModel = modelId;
    }
    
    // Track provider history
    conversation.sessionState.providerHistory.push({
      provider: previousProvider,
      model: previousModel,
      switchedAt: Date.now(),
      messageCount: conversation.metadata.messageCount
    });
    
    // Update settings
    conversation.settings.provider = providerId;
    if (modelId) {
      conversation.settings.model = modelId;
    }
    
    conversation.metadata.updatedAt = Date.now();
    
    this.emit('provider-switched', { 
      conversationId: targetId, 
      previousProvider, 
      newProvider: providerId,
      previousModel,
      newModel: modelId || conversation.sessionState.currentModel
    });
    
    return {
      conversation,
      previousProvider,
      newProvider: providerId,
      previousModel,
      newModel: conversation.sessionState.currentModel
    };
  }

  /**
   * Get cost summary for a conversation
   */
  getCostSummary(conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    
    if (!targetId) {
      throw new Error('No active conversation');
    }
    
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      throw new Error(`Conversation ${targetId} not found`);
    }
    
    return {
      conversationId: targetId,
      title: conversation.title,
      session: conversation.metadata.costTracking.session,
      total: conversation.metadata.costTracking.total,
      byProvider: conversation.metadata.costTracking.byProvider,
      providerStats: conversation.metadata.providerStats,
      messageCount: conversation.metadata.messageCount,
      tokenUsage: conversation.metadata.tokenUsage
    };
  }

  /**
   * Reset session costs for a conversation
   */
  resetSessionCosts(conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    
    if (!targetId) {
      throw new Error('No active conversation');
    }
    
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      throw new Error(`Conversation ${targetId} not found`);
    }
    
    // Reset session costs while preserving total costs
    conversation.metadata.costTracking.session = { input: 0, output: 0, total: 0 };
    
    // Reset session costs for each provider
    for (const providerId in conversation.metadata.costTracking.byProvider) {
      conversation.metadata.costTracking.byProvider[providerId].session = {
        cost: 0, tokens: 0, messages: 0
      };
    }
    
    conversation.metadata.updatedAt = Date.now();
    
    this.emit('session-costs-reset', { conversationId: targetId });
    
    return conversation.metadata.costTracking;
  }

  /**
   * Get provider statistics across all conversations
   */
  getGlobalProviderStats() {
    const globalStats = {
      totalConversations: this.conversations.size,
      totalCost: 0,
      totalTokens: 0,
      totalMessages: 0,
      byProvider: {},
      mostUsedProvider: null,
      costiest: null
    };
    
    for (const [conversationId, conversation] of this.conversations) {
      globalStats.totalCost += conversation.metadata.costTracking.total.total;
      globalStats.totalTokens += conversation.metadata.tokenUsage.total;
      globalStats.totalMessages += conversation.metadata.messageCount;
      
      // Aggregate provider stats
      for (const [providerId, stats] of Object.entries(conversation.metadata.providerStats)) {
        if (!globalStats.byProvider[providerId]) {
          globalStats.byProvider[providerId] = {
            conversations: 0,
            totalMessages: 0,
            totalCost: 0,
            totalTokens: 0,
            models: {}
          };
        }
        
        const providerGlobal = globalStats.byProvider[providerId];
        providerGlobal.conversations += 1;
        providerGlobal.totalMessages += stats.messageCount;
        providerGlobal.totalCost += stats.totalCost;
        providerGlobal.totalTokens += stats.totalTokens;
        
        // Aggregate model stats
        for (const [modelId, modelStats] of Object.entries(stats.models)) {
          if (!providerGlobal.models[modelId]) {
            providerGlobal.models[modelId] = { count: 0, conversations: 0 };
          }
          providerGlobal.models[modelId].count += modelStats.count;
          providerGlobal.models[modelId].conversations += 1;
        }
      }
    }
    
    // Find most used provider
    let maxMessages = 0;
    let maxCost = 0;
    
    for (const [providerId, stats] of Object.entries(globalStats.byProvider)) {
      if (stats.totalMessages > maxMessages) {
        maxMessages = stats.totalMessages;
        globalStats.mostUsedProvider = providerId;
      }
      
      if (stats.totalCost > maxCost) {
        maxCost = stats.totalCost;
        globalStats.costiest = providerId;
      }
    }
    
    return globalStats;
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
        
        this.emit('context-updated', { conversationId: targetId, key, value });
      }
    } else {
      // Update global context
      this.globalContext.set(key, value);
      this.emit('global-context-updated', { key, value });
    }
  }

  /**
   * Set global context that applies to all conversations
   */
  setGlobalContext(key, value) {
    this.globalContext.set(key, value);
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
      
      this.emit('conversation-imported', { conversationId: importId, conversation });
      
      return importId;
      
    } catch (error) {
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
   * Claude Code style session methods
   */
  
  /**
   * Continue the most recent session (claude --continue)
   */
  continueLastSession() {
    if (!this.lastSessionId || !this.conversations.has(this.lastSessionId)) {
      throw new Error('No recent session to continue');
    }
    
    const conversation = this.conversations.get(this.lastSessionId);
    conversation.sessionState.continuationMode = true;
    conversation.metadata.updatedAt = Date.now();
    
    this.switchToConversation(this.lastSessionId);
    
    this.emit('session-continued', { conversationId: this.lastSessionId, conversation });
    
    return conversation;
  }
  
  /**
   * Resume a specific session by ID (claude --resume)
   */
  resumeSession(sessionId) {
    if (!this.conversations.has(sessionId)) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const conversation = this.conversations.get(sessionId);
    conversation.sessionState.continuationMode = true;
    conversation.metadata.updatedAt = Date.now();
    
    // Update session history
    const sessionInfo = this.sessionHistory.get(sessionId);
    if (sessionInfo) {
      sessionInfo.lastAccessed = Date.now();
    }
    
    this.switchToConversation(sessionId);
    this.lastSessionId = sessionId;
    
    this.emit('session-resumed', { conversationId: sessionId, conversation });
    
    return conversation;
  }
  
  /**
   * Clear conversation history (/clear)
   */
  clearConversation(conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    
    if (!targetId) {
      throw new Error('No active conversation');
    }

    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      throw new Error(`Conversation ${targetId} not found`);
    }

    conversation.messages = [];
    conversation.metadata.messageCount = 0;
    conversation.metadata.updatedAt = Date.now();
    conversation.metadata.tokenUsage = { input: 0, output: 0, total: 0 };
    conversation.sessionState.contextSummary = null;
    
    this.emit('conversation-cleared', { conversationId: targetId });
    
    return conversation;
  }
  
  /**
   * Compact conversation (/compact)
   */
  compactConversation(conversationId = null, instructions = null) {
    const targetId = conversationId || this.currentConversationId;
    
    if (!targetId) {
      throw new Error('No active conversation');
    }

    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      throw new Error(`Conversation ${targetId} not found`);
    }

    if (conversation.messages.length < 5) {
      return conversation;
    }

    // Create summary of older messages
    const messagesToSummarize = conversation.messages.slice(0, -this.options.contextWindow);
    const recentMessages = conversation.messages.slice(-this.options.contextWindow);
    
    if (messagesToSummarize.length === 0) {
      return conversation;
    }
    
    // Generate summary (this would typically use Claude)
    const summary = this.generateConversationSummary(messagesToSummarize, instructions);
    
    // Keep only recent messages plus summary
    conversation.messages = [
      {
        id: this.generateMessageId(),
        role: 'system',
        content: `[Conversation Summary]: ${summary}`,
        timestamp: Date.now(),
        metadata: { type: 'summary', originalMessageCount: messagesToSummarize.length }
      },
      ...recentMessages
    ];
    
    conversation.metadata.compactionCount++;
    conversation.metadata.updatedAt = Date.now();
    conversation.sessionState.contextSummary = summary;
    
    this.emit('conversation-compacted', { conversationId: targetId, summary });
    
    return conversation;
  }
  
  /**
   * Get session list for picker UI
   */
  getSessionList(options = {}) {
    const limit = options.limit || 20;
    const includeInactive = options.includeInactive || false;
    
    const sessions = Array.from(this.sessionHistory.values())
      .filter(session => includeInactive || session.isActive)
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, limit)
      .map(session => ({
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        lastAccessed: session.lastAccessed,
        messageCount: session.messageCount,
        isActive: session.isActive,
        timeAgo: this.formatTimeAgo(session.lastAccessed)
      }));
    
    return sessions;
  }
  
  /**
   * Get conversation cost statistics (/cost)
   */
  getConversationCost(conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(targetId);
    
    if (!conversation) {
      return null;
    }
    
    const tokenUsage = conversation.metadata.tokenUsage;
    
    // Estimate costs (these would be actual rates)
    const inputCostPer1k = 0.003;  // $3 per 1K input tokens
    const outputCostPer1k = 0.015; // $15 per 1K output tokens
    
    const inputCost = (tokenUsage.input / 1000) * inputCostPer1k;
    const outputCost = (tokenUsage.output / 1000) * outputCostPer1k;
    
    return {
      conversationId: targetId,
      tokens: tokenUsage,
      cost: {
        input: inputCost,
        output: outputCost,
        total: inputCost + outputCost
      },
      messageCount: conversation.metadata.messageCount,
      model: conversation.settings.model
    };
  }
  
  /**
   * Helper Methods
   */
  generateConversationId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  
  generateSessionTitle(options = {}) {
    if (options.title) return options.title;
    
    const timestamp = new Date().toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const projectName = options.projectPath ? 
      options.projectPath.split('/').pop() : 'EG-Desk';
    
    return `${projectName} - ${timestamp}`;
  }
  
  shouldCompactConversation(conversation) {
    return this.options.enableSessionCompaction && 
           conversation.messages.length > this.options.compactionThreshold;
  }
  
  generateConversationSummary(messages, instructions = null) {
    // This would typically use Claude to generate a summary
    // For now, return a simple summary
    const messageCount = messages.length;
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    
    let summary = `대화 요약: ${messageCount}개 메시지 (사용자: ${userMessages}, AI: ${assistantMessages})`;
    
    if (instructions) {
      summary += ` - 특별 지시사항: ${instructions}`;
    }
    
    // Add key topics if available
    const recentUserMessages = messages
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content.substring(0, 50))
      .join(', ');
    
    if (recentUserMessages) {
      summary += ` - 주요 주제: ${recentUserMessages}...`;
    }
    
    return summary;
  }
  
  enforceSessionLimits() {
    if (this.conversations.size <= this.options.maxSessions) {
      return;
    }
    
    // Remove oldest inactive sessions
    const sessions = Array.from(this.sessionHistory.entries())
      .filter(([id, session]) => !session.isActive || id !== this.currentConversationId)
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    const toRemove = this.conversations.size - this.options.maxSessions;
    
    for (let i = 0; i < toRemove && i < sessions.length; i++) {
      const [sessionId] = sessions[i];
      this.conversations.delete(sessionId);
      this.sessionHistory.delete(sessionId);
    }
  }
  
  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    
    return new Date(timestamp).toLocaleDateString('ko-KR');
  }

  trimConversation(conversation) {
    if (conversation.messages.length > this.options.maxHistorySize) {
      const removed = conversation.messages.splice(0, conversation.messages.length - this.options.maxHistorySize);
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
   * Load conversations from storage (with session history)
   */
  async loadConversations() {
    try {
      if (window.electronAPI?.storage?.get) {
        const savedConversations = await window.electronAPI.storage.get('conversations');
        const savedSessionHistory = await window.electronAPI.storage.get('sessionHistory');
        const savedGlobalContext = await window.electronAPI.storage.get('globalContext');
        const savedLastSession = await window.electronAPI.storage.get('lastSessionId');
        
        if (savedConversations) {
          for (const [id, data] of Object.entries(savedConversations)) {
            const conversation = {
              ...data,
              context: new Map(Object.entries(data.context || {})),
              // Ensure all new session properties exist
              sessionState: data.sessionState || {
                hasMemoryFile: false,
                memoryContent: null,
                isInteractive: true,
                continuationMode: false,
                contextSummary: null
              },
              metadata: {
                ...data.metadata,
                tokenUsage: data.metadata.tokenUsage || { input: 0, output: 0, total: 0 },
                compactionCount: data.metadata.compactionCount || 0
              }
            };
            this.conversations.set(id, conversation);
          }
        }
        
        if (savedSessionHistory) {
          this.sessionHistory = new Map(Object.entries(savedSessionHistory));
        }
        
        if (savedGlobalContext) {
          this.globalContext = new Map(Object.entries(savedGlobalContext));
        }
        
        if (savedLastSession && this.conversations.has(savedLastSession)) {
          this.lastSessionId = savedLastSession;
        }
      }
    } catch (error) {
    }
  }

  /**
   * Save conversations to storage (with session history)
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
        await window.electronAPI.storage.set('sessionHistory', Object.fromEntries(this.sessionHistory));
        await window.electronAPI.storage.set('globalContext', Object.fromEntries(this.globalContext));
        
        if (this.lastSessionId) {
          await window.electronAPI.storage.set('lastSessionId', this.lastSessionId);
        }
        
      }
    } catch (error) {
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
    
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  /**
   * Handle ChatHistoryManager conversation created event
   */
  handleHistoryConversationCreated(data) {
    const { conversationId, conversation } = data;
    
    // Sync with local cache if not already present
    if (!this.conversations.has(conversationId)) {
      const localConversation = {
        id: conversationId,
        title: conversation.title,
        type: 'general',
        messages: conversation.messages || [],
        context: new Map(),
        metadata: {
          ...conversation.metadata,
          tokenUsage: { input: 0, output: 0, total: 0 }
        },
        settings: conversation.settings || {},
        sessionState: {
          hasMemoryFile: false,
          memoryContent: null,
          isInteractive: true,
          continuationMode: false,
          contextSummary: null
        },
        _historyIntegrated: true
      };
      
      this.conversations.set(conversationId, localConversation);
    }
  }
  
  /**
   * Handle ChatHistoryManager message added event
   */
  handleHistoryMessageAdded(data) {
    const { conversationId, message } = data;
    
    const conversation = this.conversations.get(conversationId);
    if (conversation && conversation._historyIntegrated) {
      // Update local message count and metadata
      conversation.metadata.messageCount = conversation.messages.length;
      conversation.metadata.updatedAt = Date.now();
      
    }
  }
  
  /**
   * Handle ChatHistoryManager active conversation changed event
   */
  handleHistoryActiveConversationChanged(data) {
    const { conversationId, previousId } = data;
    
    // Update current conversation ID to stay in sync
    this.currentConversationId = conversationId;
    this.lastSessionId = conversationId;
    
    this.emit('conversation-switched', { conversationId, previousId });
  }
  
  /**
   * Load conversation from ChatHistoryManager if integrated
   */
  async loadFromHistory(conversationId) {
    if (!this.chatHistoryManager) {
      return null;
    }
    
    try {
      const conversation = await this.chatHistoryManager.loadConversation(conversationId);
      
      if (conversation) {
        // Convert to ConversationManager format
        const localConversation = {
          id: conversationId,
          title: conversation.title,
          type: 'general',
          messages: conversation.messages || [],
          context: new Map(),
          metadata: {
            ...conversation.metadata,
            tokenUsage: { input: 0, output: 0, total: 0 }
          },
          settings: conversation.settings || {},
          sessionState: {
            hasMemoryFile: false,
            memoryContent: null,
            isInteractive: true,
            continuationMode: false,
            contextSummary: null
          },
          _historyIntegrated: true
        };
        
        this.conversations.set(conversationId, localConversation);
        return localConversation;
      }
    } catch (error) {
    }
    
    return null;
  }
  
  /**
   * Provider Management Methods
   */
  
  /**
   * Switch provider for a conversation
   */
  switchProvider(conversationId, newProvider, providerConfig = {}) {
    const targetId = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(targetId);
    
    if (!conversation) {
      throw new Error(`Conversation ${targetId} not found`);
    }
    
    const oldProvider = conversation.sessionState.currentProvider;
    
    // Update conversation settings
    conversation.sessionState.currentProvider = newProvider;
    conversation.settings.provider = newProvider;
    conversation.settings.providerConfig = { ...conversation.settings.providerConfig, ...providerConfig };
    
    // Track provider switch
    conversation.sessionState.providerSwitchHistory.push({
      timestamp: Date.now(),
      from: oldProvider,
      to: newProvider,
      reason: 'manual-switch'
    });
    
    conversation.metadata.updatedAt = Date.now();
    
    this.emit('provider-switched', { conversationId: targetId, oldProvider, newProvider });
    
    return conversation;
  }
  
  /**
   * Get provider statistics for a conversation
   */
  getProviderStats(conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(targetId);
    
    if (!conversation) {
      return null;
    }
    
    const stats = {
      currentProvider: conversation.sessionState.currentProvider,
      totalCost: conversation.sessionState.totalCost,
      providerCosts: { ...conversation.sessionState.providerCosts },
      providerSwitches: conversation.sessionState.providerSwitchHistory.length,
      providerHistory: [...conversation.sessionState.providerSwitchHistory]
    };
    
    // Calculate message distribution by provider
    const providerMessageCounts = {};
    conversation.messages.forEach(msg => {
      const provider = msg.metadata.provider || 'unknown';
      providerMessageCounts[provider] = (providerMessageCounts[provider] || 0) + 1;
    });
    
    stats.messagesByProvider = providerMessageCounts;
    
    return stats;
  }
  
  /**
   * Get cost breakdown for conversation
   */
  getDetailedCostInfo(conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(targetId);
    
    if (!conversation) {
      return null;
    }
    
    const costInfo = {
      conversationId: targetId,
      totalCost: conversation.sessionState.totalCost,
      totalTokens: conversation.metadata.tokenUsage.total,
      providerBreakdown: {},
      messageCount: conversation.metadata.messageCount,
      averageCostPerMessage: 0
    };
    
    // Calculate detailed breakdown
    Object.entries(conversation.sessionState.providerCosts).forEach(([provider, data]) => {
      costInfo.providerBreakdown[provider] = {
        cost: data.cost,
        tokens: data.tokens,
        costPerToken: data.tokens > 0 ? data.cost / data.tokens : 0,
        percentage: conversation.sessionState.totalCost > 0 ? (data.cost / conversation.sessionState.totalCost) * 100 : 0
      };
    });
    
    if (conversation.metadata.messageCount > 0) {
      costInfo.averageCostPerMessage = conversation.sessionState.totalCost / conversation.metadata.messageCount;
    }
    
    return costInfo;
  }
  
  /**
   * Update provider model for conversation
   */
  updateProviderModel(conversationId, provider, model) {
    const targetId = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(targetId);
    
    if (!conversation) {
      throw new Error(`Conversation ${targetId} not found`);
    }
    
    if (conversation.sessionState.currentProvider === provider) {
      conversation.settings.providerModel = model;
      conversation.metadata.updatedAt = Date.now();
      
      this.emit('model-updated', { conversationId: targetId, provider, model });
    }
    
    return conversation;
  }
  
  /**
   * Get conversation context with provider information
   */
  getProviderAwareContext(conversationId = null, includeMessages = true) {
    const baseContext = this.getConversationContext(conversationId, includeMessages);
    const targetId = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(targetId);
    
    if (conversation) {
      baseContext.provider = {
        current: conversation.sessionState.currentProvider,
        config: conversation.settings.providerConfig,
        model: conversation.settings.providerModel,
        switchHistory: conversation.sessionState.providerSwitchHistory,
        costs: conversation.sessionState.providerCosts
      };
    }
    
    return baseContext;
  }
  
  /**
   * Get integration status
   */
  getIntegrationInfo() {
    return {
      hasHistoryManager: !!this.chatHistoryManager,
      integratedConversations: Array.from(this.conversations.values())
        .filter(conv => conv._historyIntegrated).length,
      localConversations: Array.from(this.conversations.values())
        .filter(conv => !conv._historyIntegrated).length,
      totalConversations: this.conversations.size
    };
  }

  /**
   * Destroy conversation manager
   */
  async destroy() {
    this.stopAutoSave();
    
    // Clean up ChatHistoryManager event listeners
    if (this.chatHistoryManager) {
      this.chatHistoryManager.removeAllListeners();
    }
    
    // Save before destroying
    if (this.options.autoSave) {
      await this.saveConversations();
    }
    
    this.conversations.clear();
    this.globalContext.clear();
    this.currentConversationId = null;
    this.chatHistoryManager = null;
    this.isInitialized = false;
    this.removeAllListeners();
    
  }
}

export default ConversationManager;
