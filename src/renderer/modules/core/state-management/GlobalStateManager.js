/**
 * GlobalStateManager - Global Application State Management
 * 
 * Manages global state across the application with persistence and change notification.
 * As specified in PRD: State-Management/GlobalStateManager.js
 */

import { EventEmitter } from '../../../utils/EventEmitter.js';
import eventBus from './EventBus.js';

class GlobalStateManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      persistState: options.persistState !== false,
      autoSave: options.autoSave !== false,
      saveInterval: options.saveInterval || 10000, // 10 seconds
      ...options
    };
    
    this.state = new Map();
    this.isInitialized = false;
    this.saveTimer = null;
    
    // Chat history specific state
    this.chatHistoryIndex = new Map(); // For fast search and retrieval
    this.conversationMetadata = new Map(); // Lightweight metadata cache
    this.activeConversationId = null;
    this.historyCleanupTimer = null;
    
    // AI Provider specific state
    this.providerStates = new Map(); // Track provider status and configuration
    this.activeProvider = null;
    this.providerSwitchHistory = [];
    this.providerCostTracking = new Map();
    this.providerHealthTimer = null;
    this.lastProviderError = null;
    this.providerRetryAttempts = new Map();
  }

  /**
   * Initialize global state manager
   */
  async initialize() {
    try {
      
      // Load persisted state
      if (this.options.persistState) {
        await this.loadState();
      }
      
      // Initialize chat history state
      await this.initializeChatHistory();
      
      // Initialize AI provider state
      await this.initializeAIProviders();
      
      // Start auto-save timer
      if (this.options.autoSave) {
        this.startAutoSave();
      }
      
      // Start history cleanup timer
      this.startHistoryCleanup();
      
      // Start provider status monitoring
      this.startProviderMonitoring();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      return true;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Set state value
   */
  setState(key, value) {
    const previousValue = this.state.get(key);
    this.state.set(key, value);
    
    this.emit('state-changed', { key, value, previousValue });
    this.emit(`state-changed:${key}`, { value, previousValue });
  }

  /**
   * Get state value
   */
  getState(key, defaultValue = null) {
    return this.state.get(key) ?? defaultValue;
  }

  /**
   * Update nested state value
   */
  updateState(key, updates) {
    const currentValue = this.getState(key, {});
    const newValue = { ...currentValue, ...updates };
    this.setState(key, newValue);
  }

  /**
   * Remove state value
   */
  removeState(key) {
    const value = this.state.get(key);
    this.state.delete(key);
    
    this.emit('state-removed', { key, value });
  }

  /**
   * Get all state
   */
  getAllState() {
    return Object.fromEntries(this.state);
  }

  /**
   * Clear all state
   */
  clearState() {
    this.state.clear();
    this.emit('state-cleared');
  }

  /**
   * Check if state key exists
   */
  hasState(key) {
    return this.state.has(key);
  }

  /**
   * Subscribe to state changes
   */
  subscribe(key, callback) {
    this.on(`state-changed:${key}`, callback);
    
    return () => {
      this.off(`state-changed:${key}`, callback);
    };
  }

  /**
   * Load state from storage
   */
  async loadState() {
    try {
      if (window.electronAPI?.storage?.get) {
        // Load general state
        const savedState = await window.electronAPI.storage.get('globalState');
        
        if (savedState) {
          this.state = new Map(Object.entries(savedState));
          this.emit('state-loaded', { size: this.state.size });
        }
        
        // Load chat history separately for better performance
        const savedChatHistory = await window.electronAPI.storage.get('chatHistory');
        if (savedChatHistory) {
          this.state.set('chatHistory', savedChatHistory);
        }
        
        // Load AI provider state separately for better performance
        const savedAIProviders = await window.electronAPI.storage.get('aiProviders');
        if (savedAIProviders) {
          this.state.set('aiProviders', savedAIProviders);
          
          // Restore active provider reference
          this.activeProvider = savedAIProviders.activeProvider;
          
          // Restore retry attempts map
          if (savedAIProviders.retryAttempts) {
            this.providerRetryAttempts = new Map(Object.entries(savedAIProviders.retryAttempts));
          }
          
          // Restore provider health status
          if (savedAIProviders.healthStatus) {
            Object.entries(savedAIProviders.healthStatus).forEach(([providerId, status]) => {
              this.providerStates.set(providerId, {
                ...this.providerStates.get(providerId),
                ...status,
                lastRestored: Date.now()
              });
            });
          }
          
          // Publish provider state restored event
          eventBus.publish('provider-state-restored', {
            activeProvider: this.activeProvider,
            providerCount: Object.keys(savedAIProviders.availableProviders || {}).length,
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
    }
  }

  /**
   * Save state to storage
   */
  async saveState() {
    try {
      if (this.options.persistState && window.electronAPI?.storage?.set) {
        const stateObject = Object.fromEntries(this.state);
        
        // Save chat history and AI provider state separately for better performance
        const chatHistory = stateObject.chatHistory;
        const aiProviders = stateObject.aiProviders;
        delete stateObject.chatHistory;
        delete stateObject.aiProviders;
        
        // Save general state
        await window.electronAPI.storage.set('globalState', stateObject);
        
        // Save chat history with incremental updates
        if (chatHistory) {
          await this.saveChatHistoryIncremental(chatHistory);
        }
        
        // Save AI provider state with retry attempts
        if (aiProviders) {
          await this.saveAIProviderState(aiProviders);
        }
        
        this.emit('state-saved', { size: this.state.size });
      }
    } catch (error) {
    }
  }
  
  /**
   * Save chat history with incremental updates for better performance
   */
  async saveChatHistoryIncremental(chatHistory) {
    try {
      // For now, save the entire chat history - can be optimized later for incremental updates
      await window.electronAPI.storage.set('chatHistory', chatHistory);
      
      // TODO: Implement incremental updates by tracking changed conversations
      // This would involve maintaining a changeSet and only persisting modified conversations
      
      const conversationCount = Object.keys(chatHistory.conversations || {}).length;
      
      eventBus.publish('chat-history-persisted', { 
        conversationCount,
        timestamp: Date.now()
      });
      
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Save AI provider state with enhanced persistence
   */
  async saveAIProviderState(aiProviders) {
    try {
      // Create enhanced provider state for persistence
      const enhancedProviderState = {
        ...aiProviders,
        // Include retry attempts for proper state restoration
        retryAttempts: Object.fromEntries(this.providerRetryAttempts),
        // Add persistence metadata
        lastSaved: Date.now(),
        sessionId: this.generateEventId(),
        // Include current error state
        lastError: this.lastProviderError,
        // Include provider health status for restoration
        healthStatus: Object.fromEntries(
          Array.from(this.providerStates.entries()).map(([id, state]) => [
            id,
            {
              status: state.status,
              lastHealthCheck: state.lastHealthCheck,
              consecutiveFailures: state.consecutiveFailures,
              healthCheckCount: state.healthCheckCount
            }
          ])
        ),
        // Include workspace-specific provider preferences
        workspacePreferences: this.getWorkspaceProviderPreferences()
      };
      
      await window.electronAPI.storage.set('aiProviders', enhancedProviderState);
      
      const providerCount = Object.keys(aiProviders.availableProviders || {}).length;
      
      eventBus.publish('provider-state-persisted', {
        providerCount,
        activeProvider: aiProviders.activeProvider,
        switchHistoryLength: aiProviders.switchHistory?.length || 0,
        timestamp: Date.now()
      });
      
    } catch (error) {
      throw error;
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
      this.saveState();
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
   * Get state statistics
   */
  getStateStats() {
    return {
      totalKeys: this.state.size,
      persistEnabled: this.options.persistState,
      autoSaveEnabled: this.options.autoSave,
      saveInterval: this.options.saveInterval
    };
  }

  /**
   * Initialize chat history state and structures
   */
  async initializeChatHistory() {
    try {
      // Initialize chat history state structure for coordination with ChatHistoryManager
      const chatHistory = this.getState('chatHistory', {
        activeConversationId: null,
        cachedConversations: {},
        searchCache: {},
        userPreferences: {
          retentionDays: 30,
          maxConversations: 1000,
          enableSearch: true,
          autoSave: true,
          cacheSize: 50
        },
        metadata: {
          totalConversations: 0,
          lastSync: Date.now(),
          lastCleanup: Date.now(),
          isOnline: true
        },
        uiState: {
          selectedConversation: null,
          searchQuery: '',
          filterState: {
            type: 'all',
            dateRange: null,
            tags: []
          },
          sortBy: 'updatedAt',
          sortOrder: 'desc'
        }
      });
      
      this.setState('chatHistory', chatHistory);
      
      eventBus.publish('chat-history-state-initialized', { 
        preferences: chatHistory.userPreferences 
      });
      
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Set active conversation (coordinated with ChatHistoryManager)
   */
  setActiveConversation(conversationId) {
    const chatHistory = this.getState('chatHistory');
    const previousId = chatHistory.activeConversationId;
    
    chatHistory.activeConversationId = conversationId;
    chatHistory.uiState.selectedConversation = conversationId;
    
    this.setState('chatHistory', chatHistory);
    
    eventBus.publish('state-active-conversation-changed', {
      conversationId,
      previousId
    });
    
    // Update conversation-specific provider state if available
    if (conversationId) {
      this.syncConversationProviderState(conversationId);
    }
    
    return conversationId;
  }
  
  /**
   * Update cached conversation data from ChatHistoryManager
   */
  updateCachedConversation(conversationId, conversationData) {
    const chatHistory = this.getState('chatHistory');
    
    chatHistory.cachedConversations[conversationId] = {
      id: conversationData.id,
      title: conversationData.title,
      messageCount: conversationData.messages?.length || conversationData.metadata?.messageCount || 0,
      createdAt: conversationData.createdAt,
      updatedAt: conversationData.updatedAt,
      tags: conversationData.tags || [],
      lastCached: Date.now()
    };
    
    chatHistory.metadata.totalConversations = Object.keys(chatHistory.cachedConversations).length;
    chatHistory.metadata.lastSync = Date.now();
    
    this.setState('chatHistory', chatHistory);
    
    eventBus.publish('state-conversation-cached', { conversationId });
  }
  
  /**
   * Get cached conversation by ID
   */
  getCachedConversation(conversationId) {
    const chatHistory = this.getState('chatHistory');
    return chatHistory.cachedConversations[conversationId] || null;
  }
  
  /**
   * Remove conversation from cache
   */
  removeCachedConversation(conversationId) {
    const chatHistory = this.getState('chatHistory');
    
    if (chatHistory.cachedConversations[conversationId]) {
      delete chatHistory.cachedConversations[conversationId];
      chatHistory.metadata.totalConversations = Object.keys(chatHistory.cachedConversations).length;
      
      // Clear active conversation if it's the one being removed
      if (chatHistory.activeConversationId === conversationId) {
        chatHistory.activeConversationId = null;
        chatHistory.uiState.selectedConversation = null;
      }
      
      this.setState('chatHistory', chatHistory);
      
      eventBus.publish('state-conversation-removed', { conversationId });
    }
  }
  
  /**
   * Get cached conversations with filtering and sorting
   */
  getCachedConversations(options = {}) {
    const { limit = 50, offset = 0, sortBy = 'updatedAt', sortOrder = 'desc' } = options;
    const chatHistory = this.getState('chatHistory');
    
    let conversations = Object.values(chatHistory.cachedConversations);
    
    // Apply sorting
    conversations.sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
    
    // Apply pagination
    return conversations.slice(offset, offset + limit);
  }
  
  /**
   * Update search state
   */
  updateSearchState(query, results = null) {
    const chatHistory = this.getState('chatHistory');
    
    chatHistory.uiState.searchQuery = query;
    
    if (results) {
      chatHistory.searchCache[query] = {
        results,
        timestamp: Date.now(),
        count: results.conversations?.length || 0
      };
    }
    
    this.setState('chatHistory', chatHistory);
    
    eventBus.publish('state-search-updated', { query, hasResults: !!results });
  }
  
  /**
   * Update filter state
   */
  updateFilterState(filterUpdates) {
    const chatHistory = this.getState('chatHistory');
    
    chatHistory.uiState.filterState = {
      ...chatHistory.uiState.filterState,
      ...filterUpdates
    };
    
    this.setState('chatHistory', chatHistory);
    
    eventBus.publish('state-filter-updated', { filterState: chatHistory.uiState.filterState });
  }
  
  /**
   * Update sort preferences
   */
  updateSortState(sortBy, sortOrder = 'desc') {
    const chatHistory = this.getState('chatHistory');
    
    chatHistory.uiState.sortBy = sortBy;
    chatHistory.uiState.sortOrder = sortOrder;
    
    this.setState('chatHistory', chatHistory);
    
    eventBus.publish('state-sort-updated', { sortBy, sortOrder });
  }
  
  /**
   * Set active conversation
   */
  setActiveConversation(conversationId) {
    const chatHistory = this.getState('chatHistory');
    
    if (conversationId && !chatHistory.conversations[conversationId]) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    const previousId = chatHistory.activeConversationId;
    chatHistory.activeConversationId = conversationId;
    this.activeConversationId = conversationId;
    
    this.setState('chatHistory', chatHistory);
    
    eventBus.publish('active-conversation-changed', { 
      conversationId, 
      previousId 
    });
  }
  
  /**
   * Delete conversation
   */
  async deleteConversation(conversationId) {
    const chatHistory = this.getState('chatHistory');
    const conversation = chatHistory.conversations[conversationId];
    
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    // Remove from conversations
    delete chatHistory.conversations[conversationId];
    chatHistory.metadata.totalConversations--;
    
    // Remove from search index
    this.removeFromSearchIndex(conversationId);
    
    // Remove from metadata cache
    this.conversationMetadata.delete(conversationId);
    
    // Update active conversation if needed
    if (chatHistory.activeConversationId === conversationId) {
      chatHistory.activeConversationId = null;
      this.activeConversationId = null;
    }
    
    this.setState('chatHistory', chatHistory);
    
    eventBus.publish('conversation-deleted', { conversationId, conversation });
  }
  
  /**
   * Search conversations and messages
   */
  searchChatHistory(query, options = {}) {
    const { limit = 20, includeMessages = true } = options;
    const chatHistory = this.getState('chatHistory');
    
    if (!chatHistory.userPreferences.enableSearch) {
      return { conversations: [], messages: [] };
    }
    
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    const results = {
      conversations: [],
      messages: []
    };
    
    // Search through conversations
    for (const conversation of Object.values(chatHistory.conversations)) {
      let conversationScore = 0;
      const matchingMessages = [];
      
      // Check conversation title
      if (conversation.title.toLowerCase().includes(query.toLowerCase())) {
        conversationScore += 10;
      }
      
      // Search messages if enabled
      if (includeMessages) {
        for (const message of conversation.messages) {
          const content = message.content.toLowerCase();
          let messageScore = 0;
          
          for (const term of searchTerms) {
            if (content.includes(term)) {
              messageScore += 1;
            }
          }
          
          if (messageScore > 0) {
            matchingMessages.push({
              ...message,
              conversationId: conversation.id,
              conversationTitle: conversation.title,
              score: messageScore
            });
            conversationScore += messageScore;
          }
        }
      }
      
      if (conversationScore > 0) {
        results.conversations.push({
          ...conversation,
          score: conversationScore,
          matchingMessageCount: matchingMessages.length
        });
      }
      
      results.messages.push(...matchingMessages);
    }
    
    // Sort by relevance
    results.conversations.sort((a, b) => b.score - a.score);
    results.messages.sort((a, b) => b.score - a.score);
    
    // Apply limits
    results.conversations = results.conversations.slice(0, limit);
    results.messages = results.messages.slice(0, limit * 2);
    
    eventBus.publish('chat-history-searched', { 
      query, 
      results: {
        conversationCount: results.conversations.length,
        messageCount: results.messages.length
      }
    });
    
    return results;
  }
  
  /**
   * Update search index for a message
   */
  updateSearchIndex(conversationId, message) {
    const chatHistory = this.getState('chatHistory');
    
    if (!chatHistory.searchIndex[conversationId]) {
      chatHistory.searchIndex[conversationId] = {
        title: this.getConversation(conversationId)?.title || '',
        messages: []
      };
    }
    
    chatHistory.searchIndex[conversationId].messages.push({
      id: message.id,
      content: message.content.substring(0, 200), // Store first 200 chars for search
      timestamp: message.timestamp
    });
    
    this.setState('chatHistory', chatHistory);
  }
  
  /**
   * Remove conversation from search index
   */
  removeFromSearchIndex(conversationId) {
    const chatHistory = this.getState('chatHistory');
    delete chatHistory.searchIndex[conversationId];
    this.setState('chatHistory', chatHistory);
  }
  
  /**
   * Rebuild search index from existing conversations
   */
  async rebuildSearchIndex() {
    const chatHistory = this.getState('chatHistory');
    chatHistory.searchIndex = {};
    
    for (const [conversationId, conversation] of Object.entries(chatHistory.conversations)) {
      chatHistory.searchIndex[conversationId] = {
        title: conversation.title,
        messages: conversation.messages.map(msg => ({
          id: msg.id,
          content: msg.content.substring(0, 200),
          timestamp: msg.timestamp
        }))
      };
    }
    
    this.setState('chatHistory', chatHistory);
  }
  
  /**
   * Load conversation metadata cache
   */
  async loadConversationMetadata() {
    const chatHistory = this.getState('chatHistory');
    this.conversationMetadata.clear();
    
    for (const [conversationId, conversation] of Object.entries(chatHistory.conversations)) {
      this.conversationMetadata.set(conversationId, {
        id: conversationId,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messageCount: conversation.messages.length
      });
    }
    
  }
  
  /**
   * Start history cleanup timer
   */
  startHistoryCleanup() {
    if (this.historyCleanupTimer) {
      clearInterval(this.historyCleanupTimer);
    }
    
    // Run cleanup every 6 hours
    this.historyCleanupTimer = setInterval(() => {
      this.performHistoryCleanup();
    }, 6 * 60 * 60 * 1000);
    
  }
  
  /**
   * Perform history cleanup based on user preferences
   */
  async performHistoryCleanup() {
    const chatHistory = this.getState('chatHistory');
    const { retentionDays, maxConversations } = chatHistory.userPreferences;
    
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const conversations = Object.values(chatHistory.conversations);
    
    let cleanupCount = 0;
    
    // Remove old conversations based on retention policy
    for (const conversation of conversations) {
      if (conversation.updatedAt < cutoffTime) {
        await this.deleteConversation(conversation.id);
        cleanupCount++;
      }
    }
    
    // Limit total conversation count
    if (conversations.length > maxConversations) {
      const sortedConversations = conversations
        .sort((a, b) => a.updatedAt - b.updatedAt)
        .slice(0, conversations.length - maxConversations);
      
      for (const conversation of sortedConversations) {
        await this.deleteConversation(conversation.id);
        cleanupCount++;
      }
    }
    
    if (cleanupCount > 0) {
      eventBus.publish('chat-history-cleanup-completed', { cleanupCount });
    }
    
    // Update last cleanup time
    chatHistory.metadata.lastCleanup = Date.now();
    this.setState('chatHistory', chatHistory);
  }
  
  /**
   * Generate unique conversation ID
   */
  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  
  /**
   * Generate unique message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  
  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  
  /**
   * Get chat history statistics
   */
  getChatHistoryStats() {
    const chatHistory = this.getState('chatHistory');
    const conversations = Object.values(chatHistory.conversations);
    
    const stats = {
      totalConversations: conversations.length,
      totalMessages: conversations.reduce((sum, conv) => sum + conv.messages.length, 0),
      activeConversationId: chatHistory.activeConversationId,
      oldestConversation: null,
      newestConversation: null,
      averageMessagesPerConversation: 0
    };
    
    if (conversations.length > 0) {
      const sorted = conversations.sort((a, b) => a.createdAt - b.createdAt);
      stats.oldestConversation = sorted[0].id;
      stats.newestConversation = sorted[sorted.length - 1].id;
      stats.averageMessagesPerConversation = Math.round(stats.totalMessages / stats.totalConversations);
    }
    
    return stats;
  }
  
  /**
   * Update chat history user preferences
   */
  updateChatHistoryPreferences(preferences) {
    const chatHistory = this.getState('chatHistory');
    chatHistory.userPreferences = {
      ...chatHistory.userPreferences,
      ...preferences
    };
    
    this.setState('chatHistory', chatHistory);
    
    eventBus.publish('chat-history-preferences-updated', { preferences });
  }
  
  /**
   * Update connection status with ChatHistoryManager
   */
  updateConnectionStatus(isOnline) {
    const chatHistory = this.getState('chatHistory');
    chatHistory.metadata.isOnline = isOnline;
    chatHistory.metadata.lastSync = Date.now();
    
    this.setState('chatHistory', chatHistory);
    
    eventBus.publish('state-connection-changed', { isOnline });
  }
  
  /**
   * Get current chat history state for UI components
   */
  getChatHistoryState() {
    return this.getState('chatHistory');
  }
  
  /**
   * Get UI state for chat history components
   */
  getChatHistoryUIState() {
    const chatHistory = this.getState('chatHistory');
    return {
      activeConversationId: chatHistory.activeConversationId,
      selectedConversation: chatHistory.uiState.selectedConversation,
      searchQuery: chatHistory.uiState.searchQuery,
      filterState: chatHistory.uiState.filterState,
      sortBy: chatHistory.uiState.sortBy,
      sortOrder: chatHistory.uiState.sortOrder,
      totalConversations: chatHistory.metadata.totalConversations,
      isOnline: chatHistory.metadata.isOnline
    };
  }
  
  /**
   * Export chat history data
   */
  exportChatHistory(conversationIds = null) {
    const chatHistory = this.getState('chatHistory');
    
    if (conversationIds) {
      const exportData = {
        conversations: {},
        exportedAt: Date.now(),
        version: '1.0'
      };
      
      for (const conversationId of conversationIds) {
        if (chatHistory.conversations[conversationId]) {
          exportData.conversations[conversationId] = chatHistory.conversations[conversationId];
        }
      }
      
      return exportData;
    }
    
    return {
      ...chatHistory,
      exportedAt: Date.now(),
      version: '1.0'
    };
  }
  
  /**
   * Import chat history data
   */
  async importChatHistory(importData, options = { merge: true }) {
    const { merge } = options;
    const chatHistory = this.getState('chatHistory');
    
    if (!merge) {
      // Replace existing history
      chatHistory.conversations = importData.conversations || {};
    } else {
      // Merge with existing history
      for (const [conversationId, conversation] of Object.entries(importData.conversations || {})) {
        chatHistory.conversations[conversationId] = conversation;
      }
    }
    
    // Rebuild derived data
    await this.rebuildSearchIndex();
    await this.loadConversationMetadata();
    
    // Update metadata
    chatHistory.metadata.totalConversations = Object.keys(chatHistory.conversations).length;
    
    this.setState('chatHistory', chatHistory);
    
    eventBus.publish('chat-history-imported', { 
      conversationCount: Object.keys(importData.conversations || {}).length,
      merged: merge 
    });
  }
  
  /**
   * AI Provider State Management Methods
   */
  
  /**
   * Initialize AI providers state
   */
  async initializeAIProviders() {
    try {
      // Initialize provider state structure
      const providerState = this.getState('aiProviders', {
        activeProvider: 'claude',
        availableProviders: {
          claude: {
            name: 'Claude (Anthropic)',
            status: 'disconnected',
            model: 'claude-3-sonnet-20240229',
            availableModels: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
            config: {},
            lastUsed: null,
            costTracking: { totalCost: 0, totalTokens: 0, sessionCost: 0, sessionTokens: 0 },
            hasApiKey: false,
            lastError: null
          },
          openai: {
            name: 'OpenAI',
            status: 'disconnected',
            model: 'gpt-4',
            availableModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
            config: {},
            lastUsed: null,
            costTracking: { totalCost: 0, totalTokens: 0, sessionCost: 0, sessionTokens: 0 },
            hasApiKey: false,
            lastError: null
          },
          gemini: {
            name: 'Google Gemini',
            status: 'disconnected',
            model: 'gemini-pro',
            availableModels: ['gemini-pro', 'gemini-pro-vision'],
            config: {},
            lastUsed: null,
            costTracking: { totalCost: 0, totalTokens: 0, sessionCost: 0, sessionTokens: 0 },
            hasApiKey: false,
            lastError: null
          }
        },
        switchHistory: [],
        globalCostTracking: {
          totalCost: 0,
          totalTokens: 0,
          sessionCost: 0,
          sessionTokens: 0,
          costByProvider: {}
        },
        preferences: {
          defaultProvider: 'claude',
          enableCostTracking: true,
          autoSwitchOnError: false,
          maxCostPerSession: 1.0, // $1.00
          maxTokensPerSession: 100000
        },
        lastSync: Date.now()
      });
      
      this.setState('aiProviders', providerState);
      this.activeProvider = providerState.activeProvider;
      
      eventBus.publish('ai-providers-initialized', { 
        activeProvider: providerState.activeProvider,
        availableProviders: Object.keys(providerState.availableProviders),
        enabledFeatures: {
          costTracking: providerState.preferences.enableCostTracking,
          autoSwitch: providerState.preferences.autoSwitchOnError,
          healthMonitoring: true
        }
      });
      
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update provider status
   */
  updateProviderStatus(providerId, status, error = null) {
    const providerState = this.getState('aiProviders');
    
    if (!providerState.availableProviders[providerId]) {
      return;
    }
    
    const provider = providerState.availableProviders[providerId];
    const previousStatus = provider.status;
    
    provider.status = status;
    provider.lastError = error;
    provider.lastStatusChange = Date.now();
    
    if (status === 'connected') {
      provider.lastUsed = Date.now();
      provider.lastError = null;
    }
    
    this.setState('aiProviders', providerState);
    
    eventBus.publish('provider-status-changed', {
      providerId,
      status,
      previousStatus,
      error
    });
  }
  
  /**
   * Switch active provider with enhanced error handling and state synchronization
   */
  switchActiveProvider(newProviderId, reason = 'manual', conversationId = null) {
    const providerState = this.getState('aiProviders');
    
    if (!providerState.availableProviders[newProviderId]) {
      const error = new Error(`Unknown provider: ${newProviderId}`);
      eventBus.publish('provider-switch-failed', {
        providerId: newProviderId,
        reason: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
    
    const provider = providerState.availableProviders[newProviderId];
    
    // Check if provider is available and configured
    if (provider.status !== 'connected' && provider.status !== 'ready') {
      const warning = `Provider ${newProviderId} is not ready (status: ${provider.status})`;
      eventBus.publish('provider-switch-warning', {
        providerId: newProviderId,
        status: provider.status,
        message: warning,
        timestamp: Date.now()
      });
    }
    
    const previousProvider = providerState.activeProvider;
    const targetConversationId = conversationId || this.getState('chatHistory')?.activeConversationId;
    
    // Record the switch with enhanced metadata
    const switchRecord = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      from: previousProvider,
      to: newProviderId,
      reason,
      conversationId: targetConversationId,
      context: {
        fromModel: providerState.availableProviders[previousProvider]?.model,
        toModel: provider.model,
        switchInitiator: reason,
        sessionActive: !!targetConversationId
      }
    };
    
    // Update provider state
    providerState.switchHistory.push(switchRecord);
    providerState.activeProvider = newProviderId;
    provider.lastUsed = Date.now();
    provider.switchCount = (provider.switchCount || 0) + 1;
    
    // Update conversation-specific provider state if conversation is active
    if (targetConversationId) {
      this.updateConversationProvider(targetConversationId, newProviderId, {
        model: provider.model,
        switchReason: reason,
        switchId: switchRecord.id
      });
    }
    
    // Keep only last 100 switch records
    if (providerState.switchHistory.length > 100) {
      providerState.switchHistory = providerState.switchHistory.slice(-100);
    }
    
    this.setState('aiProviders', providerState);
    this.activeProvider = newProviderId;
    
    
    // Publish enhanced switch event
    eventBus.publish('active-provider-changed', {
      providerId: newProviderId,
      previousProvider,
      reason,
      conversationId: targetConversationId,
      switchRecord,
      providerInfo: {
        name: provider.name,
        model: provider.model,
        status: provider.status
      }
    });
    
    // Publish provider-specific events for better module coordination
    eventBus.publish('provider-activated', {
      providerId: newProviderId,
      provider: {
        name: provider.name,
        model: provider.model,
        status: provider.status
      },
      timestamp: Date.now()
    });
    
    if (previousProvider && previousProvider !== newProviderId) {
      eventBus.publish('provider-deactivated', {
        providerId: previousProvider,
        timestamp: Date.now()
      });
    }
    
    return switchRecord;
  }
  
  /**
   * Update provider model
   */
  updateProviderModel(providerId, model) {
    const providerState = this.getState('aiProviders');
    
    if (!providerState.availableProviders[providerId]) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    
    const provider = providerState.availableProviders[providerId];
    
    if (!provider.availableModels.includes(model)) {
      throw new Error(`Model ${model} not available for provider ${providerId}`);
    }
    
    const previousModel = provider.model;
    provider.model = model;
    provider.lastModelChange = Date.now();
    
    this.setState('aiProviders', providerState);
    
    eventBus.publish('provider-model-changed', {
      providerId,
      model,
      previousModel
    });
  }
  
  /**
   * Update provider configuration
   */
  updateProviderConfig(providerId, config) {
    const providerState = this.getState('aiProviders');
    
    if (!providerState.availableProviders[providerId]) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    
    const provider = providerState.availableProviders[providerId];
    provider.config = { ...provider.config, ...config };
    provider.lastConfigChange = Date.now();
    
    this.setState('aiProviders', providerState);
    
    eventBus.publish('provider-config-changed', {
      providerId,
      config: provider.config
    });
  }
  
  /**
   * Track provider usage and cost
   */
  trackProviderUsage(providerId, usage) {
    const { tokens = 0, cost = 0, messageId = null } = usage;
    const providerState = this.getState('aiProviders');
    
    if (!providerState.availableProviders[providerId]) {
      return;
    }
    
    const provider = providerState.availableProviders[providerId];
    const globalTracking = providerState.globalCostTracking;
    
    // Update provider-specific tracking
    provider.costTracking.totalTokens += tokens;
    provider.costTracking.totalCost += cost;
    provider.costTracking.sessionTokens += tokens;
    provider.costTracking.sessionCost += cost;
    
    // Update global tracking
    globalTracking.totalTokens += tokens;
    globalTracking.totalCost += cost;
    globalTracking.sessionTokens += tokens;
    globalTracking.sessionCost += cost;
    
    if (!globalTracking.costByProvider[providerId]) {
      globalTracking.costByProvider[providerId] = { cost: 0, tokens: 0 };
    }
    globalTracking.costByProvider[providerId].cost += cost;
    globalTracking.costByProvider[providerId].tokens += tokens;
    
    this.setState('aiProviders', providerState);
    
    eventBus.publish('provider-usage-tracked', {
      providerId,
      tokens,
      cost,
      messageId,
      totalCost: provider.costTracking.totalCost,
      sessionCost: provider.costTracking.sessionCost
    });
    
    // Check cost limits
    this.checkCostLimits(providerState);
  }
  
  /**
   * Reset session cost tracking
   */
  resetSessionCostTracking() {
    const providerState = this.getState('aiProviders');
    
    // Reset session tracking for all providers
    Object.values(providerState.availableProviders).forEach(provider => {
      provider.costTracking.sessionCost = 0;
      provider.costTracking.sessionTokens = 0;
    });
    
    // Reset global session tracking
    providerState.globalCostTracking.sessionCost = 0;
    providerState.globalCostTracking.sessionTokens = 0;
    
    this.setState('aiProviders', providerState);
    
    eventBus.publish('session-cost-reset');
  }
  
  /**
   * Check cost limits and emit warnings
   */
  checkCostLimits(providerState) {
    const { maxCostPerSession, maxTokensPerSession } = providerState.preferences;
    const { sessionCost, sessionTokens } = providerState.globalCostTracking;
    
    if (sessionCost >= maxCostPerSession * 0.8) {
      eventBus.publish('cost-limit-warning', {
        type: 'cost',
        current: sessionCost,
        limit: maxCostPerSession,
        percentage: (sessionCost / maxCostPerSession) * 100
      });
    }
    
    if (sessionTokens >= maxTokensPerSession * 0.8) {
      eventBus.publish('cost-limit-warning', {
        type: 'tokens',
        current: sessionTokens,
        limit: maxTokensPerSession,
        percentage: (sessionTokens / maxTokensPerSession) * 100
      });
    }
  }
  
  /**
   * Update provider API key status
   */
  updateProviderKeyStatus(providerId, hasKey) {
    const providerState = this.getState('aiProviders');
    
    if (!providerState.availableProviders[providerId]) {
      return;
    }
    
    const provider = providerState.availableProviders[providerId];
    provider.hasApiKey = hasKey;
    provider.lastKeyCheck = Date.now();
    
    // Update status based on key availability
    if (!hasKey && provider.status === 'connected') {
      provider.status = 'disconnected';
      provider.lastError = 'API key not available';
    }
    
    this.setState('aiProviders', providerState);
    
    eventBus.publish('provider-key-status-changed', {
      providerId,
      hasKey,
      status: provider.status
    });
  }
  
  /**
   * Get current provider state
   */
  getProviderState(providerId = null) {
    const providerState = this.getState('aiProviders');
    
    if (providerId) {
      return providerState.availableProviders[providerId] || null;
    }
    
    return providerState;
  }
  
  /**
   * Get active provider information
   */
  getActiveProvider() {
    const providerState = this.getState('aiProviders');
    const activeProviderId = providerState.activeProvider;
    
    return {
      id: activeProviderId,
      ...providerState.availableProviders[activeProviderId]
    };
  }
  
  /**
   * Get provider statistics
   */
  getProviderStats() {
    const providerState = this.getState('aiProviders');
    
    const stats = {
      activeProvider: providerState.activeProvider,
      totalProviders: Object.keys(providerState.availableProviders).length,
      connectedProviders: 0,
      totalSwitches: providerState.switchHistory.length,
      globalCost: providerState.globalCostTracking,
      providerBreakdown: {}
    };
    
    // Calculate provider breakdown
    Object.entries(providerState.availableProviders).forEach(([id, provider]) => {
      if (provider.status === 'connected') {
        stats.connectedProviders++;
      }
      
      stats.providerBreakdown[id] = {
        name: provider.name,
        status: provider.status,
        model: provider.model,
        hasApiKey: provider.hasApiKey,
        lastUsed: provider.lastUsed,
        costTracking: provider.costTracking,
        usagePercentage: providerState.globalCostTracking.totalCost > 0
          ? (provider.costTracking.totalCost / providerState.globalCostTracking.totalCost) * 100
          : 0
      };
    });
    
    return stats;
  }
  
  /**
   * Update provider preferences
   */
  updateProviderPreferences(preferences) {
    const providerState = this.getState('aiProviders');
    
    providerState.preferences = {
      ...providerState.preferences,
      ...preferences
    };
    
    this.setState('aiProviders', providerState);
    
    eventBus.publish('provider-preferences-updated', { preferences });
  }
  
  /**
   * Start enhanced provider status monitoring with health checks
   */
  startProviderMonitoring() {
    // Stop existing timer if any
    if (this.providerMonitoringTimer) {
      clearInterval(this.providerMonitoringTimer);
    }
    
    // Monitor provider status every 30 seconds with error handling
    this.providerMonitoringTimer = setInterval(async () => {
      try {
        await this.checkProviderHealth();
      } catch (error) {
        eventBus.publish('provider-monitoring-error', {
          error: error.message,
          timestamp: Date.now()
        });
      }
    }, 30000);
    
    // Also set up health check timer
    if (this.providerHealthTimer) {
      clearInterval(this.providerHealthTimer);
    }
    
    this.providerHealthTimer = setInterval(() => {
      this.performProviderHealthAnalysis();
    }, 60000); // Every minute
    
    eventBus.publish('provider-monitoring-started', { timestamp: Date.now() });
  }
  
  /**
   * Enhanced provider health check with detailed status tracking
   */
  async checkProviderHealth() {
    const providerState = this.getState('aiProviders');
    const healthResults = [];
    
    for (const [providerId, provider] of Object.entries(providerState.availableProviders)) {
      const healthCheck = {
        providerId,
        timestamp: Date.now(),
        previousStatus: provider.status,
        currentStatus: provider.status,
        hasApiKey: provider.hasApiKey,
        error: null,
        responseTime: null
      };
      
      if (provider.hasApiKey) {
        try {
          const startTime = Date.now();
          
          // Perform actual health check based on provider type
          const isHealthy = await this.performProviderHealthCheck(providerId, provider);
          
          healthCheck.responseTime = Date.now() - startTime;
          healthCheck.currentStatus = isHealthy ? 'connected' : 'degraded';
          
          provider.lastHealthCheck = Date.now();
          provider.healthCheckCount = (provider.healthCheckCount || 0) + 1;
          
          if (isHealthy) {
            provider.consecutiveFailures = 0;
            this.providerRetryAttempts.delete(providerId);
          } else {
            provider.consecutiveFailures = (provider.consecutiveFailures || 0) + 1;
            healthCheck.currentStatus = provider.consecutiveFailures > 3 ? 'error' : 'degraded';
          }
          
        } catch (error) {
          
          healthCheck.error = error.message;
          healthCheck.currentStatus = 'error';
          
          provider.consecutiveFailures = (provider.consecutiveFailures || 0) + 1;
          provider.lastError = error.message;
          
          this.trackProviderError(providerId, error);
        }
      } else {
        healthCheck.currentStatus = 'disconnected';
        healthCheck.error = 'API key not available';
      }
      
      // Update status if it changed
      if (healthCheck.previousStatus !== healthCheck.currentStatus) {
        this.updateProviderStatus(providerId, healthCheck.currentStatus, healthCheck.error);
      }
      
      healthResults.push(healthCheck);
    }
    
    this.setState('aiProviders', providerState);
    
    // Publish health check results
    eventBus.publish('provider-health-check-completed', {
      results: healthResults,
      timestamp: Date.now(),
      healthyProviders: healthResults.filter(r => r.currentStatus === 'connected').length,
      totalProviders: healthResults.length
    });
    
    return healthResults;
  }
  
  /**
   * Export provider configuration (without sensitive data)
   */
  exportProviderConfig() {
    const providerState = this.getState('aiProviders');
    
    const exportData = {
      version: '1.0',
      exportedAt: Date.now(),
      activeProvider: providerState.activeProvider,
      preferences: providerState.preferences,
      switchHistory: providerState.switchHistory.slice(-50), // Last 50 switches
      globalCostTracking: providerState.globalCostTracking,
      providers: {}
    };
    
    // Export provider data without sensitive config
    Object.entries(providerState.availableProviders).forEach(([id, provider]) => {
      exportData.providers[id] = {
        name: provider.name,
        model: provider.model,
        availableModels: provider.availableModels,
        hasApiKey: provider.hasApiKey,
        status: provider.status,
        costTracking: provider.costTracking,
        lastUsed: provider.lastUsed,
        switchCount: provider.switchCount || 0,
        healthCheckCount: provider.healthCheckCount || 0,
        consecutiveFailures: provider.consecutiveFailures || 0
      };
    });
    
    return exportData;
  }
  
  /**
   * Perform provider-specific health check
   */
  async performProviderHealthCheck(providerId, provider) {
    try {
      // This would be implemented with actual provider health check APIs
      // For now, we simulate health checks based on recent error patterns
      
      const retryAttempts = this.providerRetryAttempts.get(providerId) || 0;
      if (retryAttempts > 5) {
        return false; // Too many recent failures
      }
      
      // Check if provider has had recent errors
      if (provider.lastError && Date.now() - provider.lastStatusChange < 60000) {
        return false; // Recent error within last minute
      }
      
      // Simulate health check - in real implementation, this would ping the provider
      return provider.hasApiKey && provider.status !== 'error';
      
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Track provider errors for analysis
   */
  trackProviderError(providerId, error) {
    const retryCount = this.providerRetryAttempts.get(providerId) || 0;
    this.providerRetryAttempts.set(providerId, retryCount + 1);
    
    this.lastProviderError = {
      providerId,
      error: error.message,
      timestamp: Date.now(),
      retryCount: retryCount + 1
    };
    
    // Publish error event for monitoring
    eventBus.publish('provider-error-tracked', {
      providerId,
      error: error.message,
      retryCount: retryCount + 1,
      timestamp: Date.now()
    });
    
    // Auto-switch if enabled and error is critical
    const providerState = this.getState('aiProviders');
    if (providerState.preferences.autoSwitchOnError && retryCount >= 3) {
      this.attemptProviderAutoSwitch(providerId, 'error-recovery');
    }
  }
  
  /**
   * Attempt automatic provider switching on error
   */
  attemptProviderAutoSwitch(failedProviderId, reason) {
    try {
      const providerState = this.getState('aiProviders');
      
      // Find alternative healthy provider
      const alternatives = Object.entries(providerState.availableProviders)
        .filter(([id, provider]) => 
          id !== failedProviderId && 
          provider.hasApiKey && 
          provider.status === 'connected' &&
          (provider.consecutiveFailures || 0) < 2
        )
        .sort((a, b) => b[1].lastUsed - a[1].lastUsed); // Sort by most recently used
      
      if (alternatives.length > 0) {
        const [alternativeId] = alternatives[0];
        
        
        this.switchActiveProvider(alternativeId, `auto-switch-${reason}`);
        
        eventBus.publish('provider-auto-switched', {
          from: failedProviderId,
          to: alternativeId,
          reason,
          timestamp: Date.now()
        });
        
        return alternativeId;
      } else {
        eventBus.publish('provider-auto-switch-failed', {
          failedProvider: failedProviderId,
          reason: 'no-alternatives',
          timestamp: Date.now()
        });
      }
    } catch (error) {
      eventBus.publish('provider-auto-switch-error', {
        failedProvider: failedProviderId,
        error: error.message,
        timestamp: Date.now()
      });
    }
    
    return null;
  }
  
  /**
   * Perform comprehensive provider health analysis
   */
  performProviderHealthAnalysis() {
    const providerState = this.getState('aiProviders');
    const analysis = {
      timestamp: Date.now(),
      totalProviders: Object.keys(providerState.availableProviders).length,
      healthyProviders: 0,
      degradedProviders: 0,
      errorProviders: 0,
      recommendations: []
    };
    
    Object.entries(providerState.availableProviders).forEach(([id, provider]) => {
      switch (provider.status) {
        case 'connected':
          analysis.healthyProviders++;
          break;
        case 'degraded':
          analysis.degradedProviders++;
          analysis.recommendations.push(`Provider ${id} is experiencing issues`);
          break;
        case 'error':
        case 'disconnected':
          analysis.errorProviders++;
          analysis.recommendations.push(`Provider ${id} needs attention: ${provider.lastError || 'disconnected'}`);
          break;
      }
      
      // Check for providers that haven't been used recently
      if (provider.lastUsed && Date.now() - provider.lastUsed > 7 * 24 * 60 * 60 * 1000) {
        analysis.recommendations.push(`Provider ${id} hasn't been used in over a week`);
      }
    });
    
    // Generate cost analysis recommendations
    const costAnalysis = this.analyzeProviderCosts();
    analysis.costRecommendations = costAnalysis.recommendations;
    
    eventBus.publish('provider-health-analysis', analysis);
    
    return analysis;
  }
  
  /**
   * Analyze provider costs and generate recommendations
   */
  analyzeProviderCosts() {
    const providerState = this.getState('aiProviders');
    const analysis = {
      totalCost: providerState.globalCostTracking.totalCost,
      sessionCost: providerState.globalCostTracking.sessionCost,
      recommendations: []
    };
    
    // Check session cost limits
    const { maxCostPerSession } = providerState.preferences;
    if (analysis.sessionCost > maxCostPerSession * 0.9) {
      analysis.recommendations.push(`Session cost approaching limit ($${analysis.sessionCost.toFixed(4)} / $${maxCostPerSession})`);
    }
    
    // Analyze cost efficiency by provider
    const providerCosts = Object.entries(providerState.globalCostTracking.costByProvider || {})
      .sort((a, b) => b[1].cost - a[1].cost);
    
    if (providerCosts.length > 1) {
      const [mostExpensive, leastExpensive] = [providerCosts[0], providerCosts[providerCosts.length - 1]];
      const costRatio = mostExpensive[1].cost / leastExpensive[1].cost;
      
      if (costRatio > 3) {
        analysis.recommendations.push(`Provider ${mostExpensive[0]} costs ${costRatio.toFixed(1)}x more than ${leastExpensive[0]}`);
      }
    }
    
    return analysis;
  }
  
  /**
   * Update conversation-specific provider state
   */
  updateConversationProvider(conversationId, providerId, providerInfo = {}) {
    const chatHistory = this.getState('chatHistory');
    
    if (!chatHistory.cachedConversations[conversationId]) {
      return;
    }
    
    const conversation = chatHistory.cachedConversations[conversationId];
    
    // Initialize provider tracking if not exists
    if (!conversation.providers) {
      conversation.providers = {
        current: null,
        history: [],
        models: {}
      };
    }
    
    const previousProvider = conversation.providers.current;
    
    // Update current provider
    conversation.providers.current = providerId;
    conversation.providers.models[providerId] = providerInfo.model || null;
    
    // Add to history
    conversation.providers.history.push({
      timestamp: Date.now(),
      providerId,
      model: providerInfo.model,
      reason: providerInfo.switchReason || 'unknown',
      switchId: providerInfo.switchId || null
    });
    
    // Keep only last 50 provider switches per conversation
    if (conversation.providers.history.length > 50) {
      conversation.providers.history = conversation.providers.history.slice(-50);
    }
    
    conversation.lastCached = Date.now();
    
    this.setState('chatHistory', chatHistory);
    
    
    eventBus.publish('conversation-provider-updated', {
      conversationId,
      providerId,
      previousProvider,
      model: providerInfo.model,
      timestamp: Date.now()
    });
  }
  
  /**
   * Sync conversation provider state with global active provider
   */
  syncConversationProviderState(conversationId) {
    const providerState = this.getState('aiProviders');
    const activeProvider = providerState.activeProvider;
    
    if (activeProvider) {
      const providerInfo = providerState.availableProviders[activeProvider];
      
      this.updateConversationProvider(conversationId, activeProvider, {
        model: providerInfo?.model,
        switchReason: 'conversation-sync'
      });
    }
  }
  
  /**
   * Get conversation provider information
   */
  getConversationProvider(conversationId) {
    const chatHistory = this.getState('chatHistory');
    const conversation = chatHistory.cachedConversations[conversationId];
    
    if (!conversation || !conversation.providers) {
      return null;
    }
    
    const providerState = this.getState('aiProviders');
    const currentProviderId = conversation.providers.current;
    
    if (!currentProviderId) {
      return null;
    }
    
    return {
      id: currentProviderId,
      name: providerState.availableProviders[currentProviderId]?.name,
      model: conversation.providers.models[currentProviderId],
      status: providerState.availableProviders[currentProviderId]?.status,
      switchHistory: conversation.providers.history,
      lastSwitch: conversation.providers.history[conversation.providers.history.length - 1] || null
    };
  }
  
  /**
   * Get workspace-specific provider preferences
   */
  getWorkspaceProviderPreferences() {
    const workspaceState = this.getState('workspace', {});
    const providerPreferences = {};
    
    // Extract provider preferences from workspace configurations
    Object.entries(workspaceState).forEach(([workspaceId, config]) => {
      if (config.preferredProvider || config.providerSettings) {
        providerPreferences[workspaceId] = {
          preferredProvider: config.preferredProvider,
          providerSettings: config.providerSettings,
          costLimits: config.costLimits
        };
      }
    });
    
    return providerPreferences;
  }
  
  /**
   * Set workspace-specific provider preference
   */
  setWorkspaceProviderPreference(workspaceId, preferences) {
    const workspaceState = this.getState('workspace', {});
    
    if (!workspaceState[workspaceId]) {
      workspaceState[workspaceId] = {};
    }
    
    workspaceState[workspaceId] = {
      ...workspaceState[workspaceId],
      ...preferences,
      lastUpdated: Date.now()
    };
    
    this.setState('workspace', workspaceState);
    
    eventBus.publish('workspace-provider-preference-updated', {
      workspaceId,
      preferences,
      timestamp: Date.now()
    });
  }
  
  /**
   * Get provider recommendations based on usage patterns
   */
  getProviderRecommendations() {
    const providerState = this.getState('aiProviders');
    if (!providerState) return [];
    
    const recommendations = [];
    const costEfficiency = {};
    
    // Calculate cost efficiency for each provider
    Object.entries(providerState.availableProviders).forEach(([id, provider]) => {
      const totalCost = provider.costTracking.totalCost;
      const totalTokens = provider.costTracking.totalTokens;
      
      if (totalTokens > 0) {
        costEfficiency[id] = {
          costPerToken: totalCost / totalTokens,
          reliability: 1 - ((provider.consecutiveFailures || 0) / 10),
          availability: provider.status === 'connected' ? 1 : 0
        };
      }
    });
    
    // Generate recommendations based on current usage
    const currentProvider = providerState.activeProvider;
    const currentCost = providerState.globalCostTracking.sessionCost;
    const maxCost = providerState.preferences.maxCostPerSession;
    
    if (currentCost > maxCost * 0.8) {
      const cheaperProviders = Object.entries(costEfficiency)
        .filter(([id, metrics]) => 
          id !== currentProvider && 
          metrics.costPerToken < costEfficiency[currentProvider]?.costPerToken
        )
        .sort((a, b) => a[1].costPerToken - b[1].costPerToken);
      
      if (cheaperProviders.length > 0) {
        recommendations.push({
          type: 'cost-optimization',
          message: `Consider switching to ${cheaperProviders[0][0]} for better cost efficiency`,
          provider: cheaperProviders[0][0],
          savings: ((costEfficiency[currentProvider]?.costPerToken || 0) - cheaperProviders[0][1].costPerToken) * 1000,
          priority: 'high'
        });
      }
    }
    
    return recommendations;
  }
  
  /**
   * Export comprehensive provider analytics
   */
  exportProviderAnalytics() {
    const providerState = this.getState('aiProviders');
    if (!providerState) return null;
    
    const analytics = {
      exportedAt: Date.now(),
      version: '1.0',
      summary: {
        totalProviders: Object.keys(providerState.availableProviders).length,
        activeProvider: providerState.activeProvider,
        totalCost: providerState.globalCostTracking.totalCost,
        totalTokens: providerState.globalCostTracking.totalTokens,
        sessionCount: providerState.switchHistory.length
      },
      providerMetrics: {},
      costAnalysis: {
        byProvider: providerState.globalCostTracking.costByProvider,
        trends: this.calculateCostTrends(),
        efficiency: this.calculateProviderEfficiency()
      },
      usagePatterns: {
        switchHistory: providerState.switchHistory.slice(-100),
        mostUsedProvider: this.getMostUsedProvider(),
        preferredTimeOfDay: this.getUsageTimePatterns()
      },
      recommendations: this.getProviderRecommendations()
    };
    
    // Add detailed metrics for each provider
    Object.entries(providerState.availableProviders).forEach(([id, provider]) => {
      analytics.providerMetrics[id] = {
        status: provider.status,
        model: provider.model,
        totalCost: provider.costTracking.totalCost,
        totalTokens: provider.costTracking.totalTokens,
        averageCostPerMessage: this.calculateAverageMessageCost(id),
        reliability: this.calculateProviderReliability(id),
        usage: {
          lastUsed: provider.lastUsed,
          switchCount: provider.switchCount || 0,
          totalSessions: this.getProviderSessionCount(id)
        }
      };
    });
    
    return analytics;
  }
  
  /**
   * Calculate cost trends over time
   */
  calculateCostTrends() {
    // Implementation for cost trend analysis
    return {
      daily: [],
      weekly: [],
      monthly: []
    };
  }
  
  /**
   * Calculate provider efficiency metrics
   */
  calculateProviderEfficiency() {
    const providerState = this.getState('aiProviders');
    const efficiency = {};
    
    Object.entries(providerState.availableProviders).forEach(([id, provider]) => {
      const cost = provider.costTracking.totalCost;
      const tokens = provider.costTracking.totalTokens;
      
      efficiency[id] = {
        costPerToken: tokens > 0 ? cost / tokens : 0,
        tokensPerDollar: cost > 0 ? tokens / cost : 0,
        utilizationRate: this.calculateUtilizationRate(id)
      };
    });
    
    return efficiency;
  }
  
  /**
   * Get most used provider
   */
  getMostUsedProvider() {
    const providerState = this.getState('aiProviders');
    let mostUsed = null;
    let maxCost = 0;
    
    Object.entries(providerState.availableProviders).forEach(([id, provider]) => {
      if (provider.costTracking.totalCost > maxCost) {
        maxCost = provider.costTracking.totalCost;
        mostUsed = id;
      }
    });
    
    return mostUsed;
  }
  
  /**
   * Get usage time patterns
   */
  getUsageTimePatterns() {
    const providerState = this.getState('aiProviders');
    const patterns = {
      hourly: new Array(24).fill(0),
      daily: new Array(7).fill(0)
    };
    
    // Analyze switch history for time patterns
    providerState.switchHistory.forEach(switchRecord => {
      const date = new Date(switchRecord.timestamp);
      patterns.hourly[date.getHours()]++;
      patterns.daily[date.getDay()]++;
    });
    
    return patterns;
  }
  
  /**
   * Calculate average message cost for provider
   */
  calculateAverageMessageCost(providerId) {
    // This would integrate with chat history to calculate average cost per message
    const chatHistory = this.getState('chatHistory');
    if (!chatHistory || !chatHistory.conversations) return 0;
    
    let totalCost = 0;
    let messageCount = 0;
    
    Object.values(chatHistory.conversations).forEach(conversation => {
      conversation.messages?.forEach(message => {
        if (message.metadata?.provider === providerId && message.metadata?.cost) {
          totalCost += message.metadata.cost;
          messageCount++;
        }
      });
    });
    
    return messageCount > 0 ? totalCost / messageCount : 0;
  }
  
  /**
   * Calculate provider reliability score
   */
  calculateProviderReliability(providerId) {
    const providerState = this.getState('aiProviders');
    const provider = providerState.availableProviders[providerId];
    
    if (!provider) return 0;
    
    const totalChecks = provider.healthCheckCount || 1;
    const failures = provider.consecutiveFailures || 0;
    const currentStatus = provider.status === 'connected' ? 1 : 0;
    
    // Calculate reliability as a score from 0 to 1
    return Math.max(0, (totalChecks - failures) / totalChecks * currentStatus);
  }
  
  /**
   * Calculate utilization rate
   */
  calculateUtilizationRate(providerId) {
    const providerState = this.getState('aiProviders');
    const provider = providerState.availableProviders[providerId];
    
    if (!provider) return 0;
    
    const totalSwitches = providerState.switchHistory.length;
    const providerSwitches = providerState.switchHistory.filter(s => s.to === providerId).length;
    
    return totalSwitches > 0 ? providerSwitches / totalSwitches : 0;
  }
  
  /**
   * Get provider session count
   */
  getProviderSessionCount(providerId) {
    const chatHistory = this.getState('chatHistory');
    if (!chatHistory || !chatHistory.conversations) return 0;
    
    let sessionCount = 0;
    Object.values(chatHistory.conversations).forEach(conversation => {
      if (conversation.providers?.current === providerId) {
        sessionCount++;
      }
    });
    
    return sessionCount;
  }
  
  /**
   * Destroy global state manager
   */
  async destroy() {
    this.stopAutoSave();
    
    // Stop history cleanup timer
    if (this.historyCleanupTimer) {
      clearInterval(this.historyCleanupTimer);
      this.historyCleanupTimer = null;
    }
    
    // Stop provider monitoring
    if (this.providerMonitoringTimer) {
      clearInterval(this.providerMonitoringTimer);
      this.providerMonitoringTimer = null;
    }
    
    // Stop health monitoring
    if (this.providerHealthTimer) {
      clearInterval(this.providerHealthTimer);
      this.providerHealthTimer = null;
    }
    
    // Save state before destroying
    if (this.options.persistState) {
      await this.saveState();
    }
    
    this.state.clear();
    this.chatHistoryIndex.clear();
    this.conversationMetadata.clear();
    this.providerStates.clear();
    this.providerCostTracking.clear();
    this.providerRetryAttempts.clear();
    this.lastProviderError = null;
    this.isInitialized = false;
    this.removeAllListeners();
    
    // Publish shutdown event
    eventBus.publish('global-state-manager-shutdown', {
      timestamp: Date.now(),
      finalStats: {
        totalStateKeys: this.state.size,
        activeProviders: this.providerStates.size,
        lastSaveTime: Date.now()
      }
    });
    
  }
}

export default GlobalStateManager;
