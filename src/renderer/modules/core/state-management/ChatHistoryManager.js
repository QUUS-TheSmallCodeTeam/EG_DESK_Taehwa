/**
 * ChatHistoryManager - Specialized Chat History Interface
 * 
 * Provides a high-level interface for chat history operations
 * while leveraging the enhanced GlobalStateManager and EventBus.
 * This demonstrates the integration between state management and chat functionality.
 */

import eventBus from './EventBus.js';

class ChatHistoryManager {
  constructor(globalStateManager) {
    this.stateManager = globalStateManager;
    this.eventNamespace = eventBus.createChatHistoryNamespace('chat-history-manager');
    this.isInitialized = false;
    
    // Bind methods
    this.handleStateChanges = this.handleStateChanges.bind(this);
  }

  /**
   * Initialize chat history manager
   */
  async initialize() {
    try {
      console.log('[ChatHistoryManager] Initializing...');
      
      // Subscribe to state changes
      this.stateManager.subscribe('chatHistory', this.handleStateChanges);
      
      // Subscribe to relevant events
      this.setupEventSubscriptions();
      
      this.isInitialized = true;
      console.log('[ChatHistoryManager] Successfully initialized');
      
      return true;
    } catch (error) {
      console.error('[ChatHistoryManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Set up event subscriptions for chat history coordination
   */
  setupEventSubscriptions() {
    // Subscribe to chat history events
    eventBus.subscribeToChatHistoryEvents([
      'conversation-created',
      'message-added',
      'active-conversation-changed',
      'chat-history-searched'
    ], (eventData) => {
      this.handleChatHistoryEvent(eventData.name, eventData.data);
    }, 'ChatHistoryManager');

    // Subscribe to UI events that affect chat history
    eventBus.subscribe('ui-conversation-request', (eventData) => {
      this.handleUIConversationRequest(eventData.data);
    }, 'ChatHistoryManager');

    // Subscribe to workspace events
    eventBus.subscribe('workspace-chat-history-sync', (eventData) => {
      this.handleWorkspaceSync(eventData.data);
    }, 'ChatHistoryManager');
  }

  /**
   * Create a new conversation with enhanced features
   */
  async createConversation(options = {}) {
    try {
      const conversationId = await this.stateManager.createConversation({
        title: options.title || 'New Conversation',
        tags: options.tags || [],
        metadata: {
          source: 'chat-history-manager',
          createdBy: 'user',
          ...options.metadata
        }
      });

      // Emit specialized event
      this.eventNamespace.publish('conversation-created-with-features', {
        conversationId,
        features: options.features || []
      });

      return conversationId;
    } catch (error) {
      console.error('[ChatHistoryManager] Failed to create conversation:', error);
      throw error;
    }
  }

  /**
   * Add message with enhanced metadata and processing
   */
  async addMessage(conversationId, content, options = {}) {
    try {
      const messageData = {
        content,
        role: options.role || 'user',
        type: options.type || 'text',
        metadata: {
          timestamp: Date.now(),
          source: 'chat-history-manager',
          processing: {
            tokens: content.length, // Simple token approximation
            sentiment: this.analyzeSentiment(content),
            topics: this.extractTopics(content)
          },
          ...options.metadata
        }
      };

      const messageId = await this.stateManager.addMessageToConversation(
        conversationId, 
        messageData
      );

      // Perform post-processing
      await this.processMessagePostAdd(conversationId, messageId, messageData);

      return messageId;
    } catch (error) {
      console.error('[ChatHistoryManager] Failed to add message:', error);
      throw error;
    }
  }

  /**
   * Search conversations with enhanced filtering and ranking
   */
  async searchConversations(query, options = {}) {
    try {
      const results = this.stateManager.searchChatHistory(query, {
        limit: options.limit || 20,
        includeMessages: options.includeMessages !== false
      });

      // Apply additional filtering
      if (options.tags) {
        results.conversations = results.conversations.filter(conv => 
          options.tags.some(tag => conv.tags?.includes(tag))
        );
      }

      if (options.dateRange) {
        const { startDate, endDate } = options.dateRange;
        results.conversations = results.conversations.filter(conv => 
          conv.createdAt >= startDate && conv.createdAt <= endDate
        );
      }

      // Emit search event with enhanced data
      this.eventNamespace.publish('enhanced-search-completed', {
        query,
        results,
        filters: options,
        timestamp: Date.now()
      });

      return results;
    } catch (error) {
      console.error('[ChatHistoryManager] Search failed:', error);
      throw error;
    }
  }

  /**
   * Get conversation insights and analytics
   */
  getConversationInsights(conversationId) {
    const conversation = this.stateManager.getConversation(conversationId);
    
    if (!conversation) {
      return null;
    }

    const insights = {
      messageCount: conversation.messages.length,
      participantCount: new Set(conversation.messages.map(m => m.role)).size,
      duration: conversation.updatedAt - conversation.createdAt,
      topics: this.extractConversationTopics(conversation),
      sentiment: this.analyzeConversationSentiment(conversation),
      wordCount: conversation.messages.reduce((sum, msg) => 
        sum + msg.content.split(' ').length, 0
      ),
      lastActivity: conversation.updatedAt,
      tags: conversation.tags || []
    };

    return insights;
  }

  /**
   * Handle state changes from GlobalStateManager
   */
  handleStateChanges({ value, previousValue }) {
    if (!this.isInitialized) return;

    const currentStats = this.stateManager.getChatHistoryStats();
    
    // Emit state change summary
    this.eventNamespace.publish('state-synchronized', {
      stats: currentStats,
      timestamp: Date.now()
    });
  }

  /**
   * Handle chat history events
   */
  handleChatHistoryEvent(eventType, eventData) {
    switch (eventType) {
      case 'conversation-created':
        this.onConversationCreated(eventData);
        break;
      case 'message-added':
        this.onMessageAdded(eventData);
        break;
      case 'active-conversation-changed':
        this.onActiveConversationChanged(eventData);
        break;
      case 'chat-history-searched':
        this.onHistorySearched(eventData);
        break;
    }
  }

  /**
   * Handle conversation creation
   */
  onConversationCreated(eventData) {
    console.log(`[ChatHistoryManager] New conversation created: ${eventData.conversationId}`);
    
    // Notify other components
    eventBus.publish('ui-conversation-list-update', {
      action: 'add',
      conversationId: eventData.conversationId
    });
  }

  /**
   * Handle message addition
   */
  onMessageAdded(eventData) {
    console.log(`[ChatHistoryManager] Message added to conversation: ${eventData.conversationId}`);
    
    // Update conversation insights
    const insights = this.getConversationInsights(eventData.conversationId);
    
    this.eventNamespace.publish('conversation-insights-updated', {
      conversationId: eventData.conversationId,
      insights
    });
  }

  /**
   * Handle active conversation changes
   */
  onActiveConversationChanged(eventData) {
    console.log(`[ChatHistoryManager] Active conversation changed: ${eventData.conversationId}`);
    
    if (eventData.conversationId) {
      const insights = this.getConversationInsights(eventData.conversationId);
      
      this.eventNamespace.publish('active-conversation-insights', {
        conversationId: eventData.conversationId,
        insights
      });
    }
  }

  /**
   * Handle history searches
   */
  onHistorySearched(eventData) {
    console.log(`[ChatHistoryManager] History searched: "${eventData.query}"`);
    
    // Track search analytics
    this.eventNamespace.publish('search-analytics', {
      query: eventData.query,
      resultCount: eventData.results.conversationCount + eventData.results.messageCount,
      timestamp: Date.now()
    });
  }

  /**
   * Handle UI conversation requests
   */
  handleUIConversationRequest(requestData) {
    const { action, conversationId, data } = requestData;
    
    switch (action) {
      case 'load':
        this.loadConversationForUI(conversationId);
        break;
      case 'delete':
        this.deleteConversationFromUI(conversationId);
        break;
      case 'archive':
        this.archiveConversation(conversationId);
        break;
    }
  }

  /**
   * Handle workspace synchronization
   */
  handleWorkspaceSync(syncData) {
    console.log('[ChatHistoryManager] Synchronizing with workspace');
    
    // Coordinate with workspace manager for chat history sync
    eventBus.publish('workspace-sync-response', {
      component: 'chat-history',
      status: 'synchronized',
      timestamp: Date.now()
    });
  }

  /**
   * Post-process message after addition
   */
  async processMessagePostAdd(conversationId, messageId, messageData) {
    // Update conversation title if needed
    if (messageData.role === 'user' && messageData.content.length > 10) {
      const conversation = this.stateManager.getConversation(conversationId);
      if (conversation.title === 'New Conversation') {
        const title = this.generateConversationTitle(messageData.content);
        // Update conversation title (would need to implement in GlobalStateManager)
        this.eventNamespace.publish('conversation-title-suggestion', {
          conversationId,
          suggestedTitle: title
        });
      }
    }

    // Extract and update topics
    const topics = this.extractTopics(messageData.content);
    if (topics.length > 0) {
      this.eventNamespace.publish('conversation-topics-detected', {
        conversationId,
        messageId,
        topics
      });
    }
  }

  /**
   * Simple sentiment analysis
   */
  analyzeSentiment(content) {
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'horrible', 'sad'];
    
    const words = content.toLowerCase().split(/\W+/);
    const positive = words.filter(word => positiveWords.includes(word)).length;
    const negative = words.filter(word => negativeWords.includes(word)).length;
    
    if (positive > negative) return 'positive';
    if (negative > positive) return 'negative';
    return 'neutral';
  }

  /**
   * Extract topics from content
   */
  extractTopics(content) {
    // Simple topic extraction - can be enhanced with NLP
    const topicKeywords = {
      'technology': ['code', 'programming', 'software', 'computer', 'tech'],
      'business': ['meeting', 'project', 'deadline', 'client', 'revenue'],
      'personal': ['family', 'friend', 'personal', 'life', 'feel']
    };

    const words = content.toLowerCase().split(/\W+/);
    const topics = [];

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => words.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Extract topics from entire conversation
   */
  extractConversationTopics(conversation) {
    const allTopics = [];
    
    for (const message of conversation.messages) {
      allTopics.push(...this.extractTopics(message.content));
    }

    // Count topic frequency
    const topicCounts = {};
    allTopics.forEach(topic => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });

    // Return topics sorted by frequency
    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([topic]) => topic);
  }

  /**
   * Analyze conversation sentiment
   */
  analyzeConversationSentiment(conversation) {
    const sentiments = conversation.messages.map(msg => 
      this.analyzeSentiment(msg.content)
    );

    const counts = { positive: 0, negative: 0, neutral: 0 };
    sentiments.forEach(sentiment => counts[sentiment]++);

    const total = sentiments.length;
    return {
      overall: Object.entries(counts).reduce((a, b) => counts[a] > counts[b] ? a : b),
      distribution: {
        positive: (counts.positive / total * 100).toFixed(1),
        negative: (counts.negative / total * 100).toFixed(1),
        neutral: (counts.neutral / total * 100).toFixed(1)
      }
    };
  }

  /**
   * Generate conversation title from first message
   */
  generateConversationTitle(content) {
    // Extract first meaningful sentence
    const sentences = content.split(/[.!?]+/);
    const firstSentence = sentences[0]?.trim();
    
    if (firstSentence && firstSentence.length > 5) {
      return firstSentence.length > 50 ? 
        firstSentence.substring(0, 47) + '...' : 
        firstSentence;
    }
    
    return 'New Conversation';
  }

  /**
   * Load conversation for UI display
   */
  loadConversationForUI(conversationId) {
    const conversation = this.stateManager.getConversation(conversationId);
    const insights = this.getConversationInsights(conversationId);
    
    eventBus.publish('ui-conversation-loaded', {
      conversation,
      insights,
      timestamp: Date.now()
    });
  }

  /**
   * Delete conversation from UI request
   */
  async deleteConversationFromUI(conversationId) {
    try {
      await this.stateManager.deleteConversation(conversationId);
      
      eventBus.publish('ui-conversation-deleted', {
        conversationId,
        timestamp: Date.now()
      });
    } catch (error) {
      eventBus.publish('ui-error', {
        message: 'Failed to delete conversation',
        error: error.message
      });
    }
  }

  /**
   * Archive conversation (mark as archived, don't delete)
   */
  archiveConversation(conversationId) {
    // This would need implementation in GlobalStateManager
    this.eventNamespace.publish('conversation-archive-requested', {
      conversationId,
      timestamp: Date.now()
    });
  }

  /**
   * Get manager statistics
   */
  getManagerStats() {
    const chatHistoryStats = this.stateManager.getChatHistoryStats();
    
    return {
      ...chatHistoryStats,
      isInitialized: this.isInitialized,
      eventSubscriptions: eventBus.getSubscriptionStats().moduleSubscriptions['ChatHistoryManager'] || []
    };
  }

  /**
   * Destroy chat history manager
   */
  destroy() {
    // Unsubscribe from all events
    eventBus.unsubscribeModule('ChatHistoryManager');
    
    this.isInitialized = false;
    console.log('[ChatHistoryManager] Destroyed');
  }
}

export default ChatHistoryManager;