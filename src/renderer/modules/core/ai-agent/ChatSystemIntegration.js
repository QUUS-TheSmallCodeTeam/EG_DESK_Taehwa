/**
 * ChatSystemIntegration - Complete Chat History System Integration
 * 
 * Integrates all chat system components together and provides a unified
 * interface for chat history management, session tracking, and analytics.
 */

import ConversationManager from './ConversationManager.js';
import ClaudeIntegration from './ClaudeIntegration.js';
import ChatHistoryManager from './ChatHistoryManager.js';
import SessionAnalytics from './SessionAnalytics.js';
import { EventEmitter } from '../../../utils/EventEmitter.js';

class ChatSystemIntegration extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      enableConversationManager: options.enableConversationManager !== false,
      enableClaudeIntegration: options.enableClaudeIntegration !== false,
      enableHistoryManager: options.enableHistoryManager !== false,
      enableSessionAnalytics: options.enableSessionAnalytics !== false,
      autoInitialize: options.autoInitialize !== false,
      ...options
    };
    
    this.isInitialized = false;
    this.components = {};
    
    // External dependencies
    this.globalStateManager = null;
    this.eventBus = null;
    this.chatComponents = new Set();
  }

  /**
   * Initialize the complete chat system
   */
  async initialize(globalStateManager, eventBus) {
    try {
      console.log('[ChatSystemIntegration] Initializing complete chat system...');
      
      this.globalStateManager = globalStateManager;
      this.eventBus = eventBus;
      
      // Initialize core components
      await this.initializeComponents();
      
      // Set up inter-component communication
      this.setupComponentIntegration();
      
      // Register with event bus
      this.registerEventHandlers();
      
      this.isInitialized = true;
      console.log('[ChatSystemIntegration] Chat system fully initialized');
      this.emit('initialized');
      
      return true;
    } catch (error) {
      console.error('[ChatSystemIntegration] Initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Initialize individual components
   */
  async initializeComponents() {
    // Initialize ConversationManager
    if (this.options.enableConversationManager) {
      this.components.conversationManager = new ConversationManager({
        maxHistorySize: 100,
        contextWindow: 20,
        autoSave: true,
        saveInterval: 30000,
        maxSessions: 200,
        enableSessionCompaction: true,
        compactionThreshold: 25
      });
      
      await this.components.conversationManager.initialize();
      console.log('[ChatSystemIntegration] ConversationManager initialized');
    }
    
    // Initialize ClaudeIntegration
    if (this.options.enableClaudeIntegration) {
      this.components.claudeIntegration = new ClaudeIntegration({
        timeout: 60000,
        maxRetries: 3,
        model: 'claude-3-sonnet-20240229'
      });
      
      await this.components.claudeIntegration.initialize();
      console.log('[ChatSystemIntegration] ClaudeIntegration initialized');
    }
    
    // Initialize ChatHistoryManager
    if (this.options.enableHistoryManager) {
      this.components.historyManager = new ChatHistoryManager({
        maxSessions: 500,
        maxSessionAge: 90 * 24 * 60 * 60 * 1000, // 90 days
        enableAutoCleanup: true,
        enableBackup: true,
        searchIndexing: true
      });
      
      await this.components.historyManager.initialize(
        this.components.conversationManager,
        this.globalStateManager
      );
      console.log('[ChatSystemIntegration] ChatHistoryManager initialized');
    }
    
    // Initialize SessionAnalytics
    if (this.options.enableSessionAnalytics) {
      this.components.sessionAnalytics = new SessionAnalytics({
        enableTracking: true,
        trackUserBehavior: true,
        trackPerformance: true,
        retentionPeriod: 90 * 24 * 60 * 60 * 1000 // 90 days
      });
      
      await this.components.sessionAnalytics.initialize(
        this.components.conversationManager,
        this.globalStateManager
      );
      console.log('[ChatSystemIntegration] SessionAnalytics initialized');
    }
  }

  /**
   * Set up integration between components
   */
  setupComponentIntegration() {
    const { conversationManager, claudeIntegration, historyManager, sessionAnalytics } = this.components;
    
    // ConversationManager <-> ClaudeIntegration
    if (conversationManager && claudeIntegration) {
      conversationManager.on('message-added', async (data) => {
        if (data.message.role === 'user') {
          // Enhance Claude requests with conversation context
          const context = conversationManager.getConversationContext(data.conversationId);
          claudeIntegration.currentConversationContext = context;
        }
      });
    }
    
    // HistoryManager <-> ConversationManager (already set up in HistoryManager.initialize)
    
    // SessionAnalytics <-> ConversationManager (already set up in SessionAnalytics.initialize)
    
    // Cross-component event routing
    this.setupEventRouting();
  }

  /**
   * Set up event routing between components
   */
  setupEventRouting() {
    const events = [
      'conversation-created',
      'conversation-switched',
      'conversation-deleted',
      'message-added',
      'session-started',
      'session-ended',
      'search-completed',
      'export-completed',
      'import-completed'
    ];
    
    events.forEach(eventName => {
      Object.values(this.components).forEach(component => {
        if (component && typeof component.on === 'function') {
          component.on(eventName, (data) => {
            this.emit(eventName, data);
            
            // Route to event bus if available
            if (this.eventBus) {
              this.eventBus.publish(`chat-system:${eventName}`, data);
            }
          });
        }
      });
    });
  }

  /**
   * Register global event handlers
   */
  registerEventHandlers() {
    if (!this.eventBus) return;
    
    // Handle workspace changes
    this.eventBus.subscribe('workspace:changed', (data) => {
      this.handleWorkspaceChange(data);
    }, 'ChatSystemIntegration');
    
    // Handle system shutdown
    this.eventBus.subscribe('system:shutdown', (data) => {
      this.handleSystemShutdown(data);
    }, 'ChatSystemIntegration');
    
    // Handle configuration changes
    this.eventBus.subscribe('config:changed', (data) => {
      this.handleConfigChange(data);
    }, 'ChatSystemIntegration');
  }

  /**
   * Register a chat component
   */
  registerChatComponent(chatComponent) {
    if (!chatComponent) return;
    
    this.chatComponents.add(chatComponent);
    
    // Connect chat component to conversation manager
    if (this.components.conversationManager) {
      chatComponent.setConversationManager(this.components.conversationManager);
    }
    
    // Set up component-specific event handling
    chatComponent.on('message-sent', (data) => {
      this.handleChatMessage(chatComponent, data);
    });
    
    console.log(`[ChatSystemIntegration] Registered chat component: ${chatComponent.containerId}`);
  }

  /**
   * Unregister a chat component
   */
  unregisterChatComponent(chatComponent) {
    this.chatComponents.delete(chatComponent);
    console.log(`[ChatSystemIntegration] Unregistered chat component: ${chatComponent.containerId}`);
  }

  /**
   * Handle chat message from component
   */
  async handleChatMessage(chatComponent, data) {
    try {
      // Add message to conversation manager
      if (this.components.conversationManager) {
        await this.components.conversationManager.addMessage(data.message, data.sessionId);
      }
      
      // Process with Claude if needed
      if (this.components.claudeIntegration && data.requiresAI) {
        const response = await this.components.claudeIntegration.sendMessage(data.message.content, {
          context: data.context,
          sessionId: data.sessionId
        });
        
        // Add AI response to conversation
        if (response.success && this.components.conversationManager) {
          await this.components.conversationManager.addMessage({
            role: 'assistant',
            content: response.data.content,
            tokens: response.data.tokens,
            model: response.data.model
          }, data.sessionId);
        }
        
        return response;
      }
    } catch (error) {
      console.error('[ChatSystemIntegration] Error handling chat message:', error);
      this.emit('message-error', { chatComponent, data, error });
      throw error;
    }
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    const status = {
      isInitialized: this.isInitialized,
      components: {},
      registeredChatComponents: this.chatComponents.size,
      timestamp: Date.now()
    };
    
    // Get component statuses
    Object.entries(this.components).forEach(([name, component]) => {
      status.components[name] = {
        initialized: component?.isInitialized || false,
        status: component?.getSystemStatus ? component.getSystemStatus() : 'unknown'
      };
    });
    
    return status;
  }

  /**
   * Get comprehensive analytics
   */
  async getAnalytics(options = {}) {
    const analytics = {
      timestamp: Date.now(),
      overview: {},
      conversations: {},
      performance: {},
      quality: {}
    };
    
    // Get conversation statistics
    if (this.components.conversationManager) {
      analytics.conversations = {
        total: this.components.conversationManager.conversations.size,
        active: Array.from(this.components.conversationManager.conversations.values())
          .filter(conv => conv.metadata.isActive).length,
        recent: this.components.conversationManager.getSessionList({ limit: 10 })
      };
    }
    
    // Get session analytics
    if (this.components.sessionAnalytics) {
      const dashboardData = this.components.sessionAnalytics.getDashboardData(options.timeRange || '7d');
      analytics.overview = dashboardData.overview;
      analytics.performance = dashboardData.performance;
      analytics.quality = dashboardData.quality;
      analytics.insights = dashboardData.insights;
    }
    
    // Get history statistics
    if (this.components.historyManager) {
      analytics.history = this.components.historyManager.getStatistics({ 
        includeTrends: true,
        includeBreakdown: true
      });
    }
    
    return analytics;
  }

  /**
   * Search across all conversations
   */
  async searchConversations(query, filters = {}) {
    if (!this.components.historyManager) {
      throw new Error('History manager not available');
    }
    
    return this.components.historyManager.searchConversations(query, filters);
  }

  /**
   * Export system data
   */
  async exportSystemData(options = {}) {
    const exportData = {
      metadata: {
        exportedAt: Date.now(),
        version: '1.0',
        system: 'eg-desk-taehwa-chat-system'
      },
      conversations: null,
      analytics: null,
      configuration: {}
    };
    
    // Export conversations
    if (this.components.historyManager && options.includeConversations !== false) {
      exportData.conversations = await this.components.historyManager.exportHistory(options);
    }
    
    // Export analytics
    if (this.components.sessionAnalytics && options.includeAnalytics) {
      exportData.analytics = await this.getAnalytics({ timeRange: options.analyticsTimeRange || '30d' });
    }
    
    // Export configuration
    if (options.includeConfiguration) {
      exportData.configuration = {
        conversationManager: this.components.conversationManager?.options,
        claudeIntegration: this.components.claudeIntegration?.options,
        historyManager: this.components.historyManager?.options,
        sessionAnalytics: this.components.sessionAnalytics?.options
      };
    }
    
    return exportData;
  }

  /**
   * Import system data
   */
  async importSystemData(data, options = {}) {
    const results = {
      conversations: null,
      analytics: null,
      configuration: null,
      success: false
    };
    
    try {
      // Import conversations
      if (data.conversations && this.components.historyManager) {
        results.conversations = await this.components.historyManager.importHistory(
          data.conversations, 
          options.conversationOptions || {}
        );
      }
      
      // Import analytics (if supported)
      if (data.analytics && options.includeAnalytics) {
        // Analytics import would be complex - skip for now
        results.analytics = { message: 'Analytics import not yet supported' };
      }
      
      // Apply configuration changes
      if (data.configuration && options.includeConfiguration) {
        results.configuration = await this.applyConfigurationChanges(data.configuration);
      }
      
      results.success = true;
      this.emit('import-completed', results);
      
      return results;
    } catch (error) {
      console.error('[ChatSystemIntegration] Import failed:', error);
      results.error = error.message;
      throw error;
    }
  }

  /**
   * Event Handlers
   */
  
  handleWorkspaceChange(data) {
    // Update all chat components with new workspace context
    this.chatComponents.forEach(component => {
      if (component.updateWorkspaceContext) {
        component.updateWorkspaceContext(data.workspace);
      }
    });
  }
  
  handleSystemShutdown(data) {
    // Gracefully shut down all components
    this.destroy();
  }
  
  handleConfigChange(data) {
    // Apply configuration changes to relevant components
    if (data.key.startsWith('chat.')) {
      this.applyConfigurationChanges({ [data.key]: data.value });
    }
  }
  
  async applyConfigurationChanges(config) {
    const results = {};
    
    // Apply to each component
    Object.entries(config).forEach(([key, value]) => {
      const [component, setting] = key.split('.');
      
      if (this.components[component] && this.components[component].updateConfiguration) {
        try {
          this.components[component].updateConfiguration(setting, value);
          results[key] = 'success';
        } catch (error) {
          results[key] = `error: ${error.message}`;
        }
      }
    });
    
    return results;
  }

  /**
   * Destroy the chat system
   */
  async destroy() {
    console.log('[ChatSystemIntegration] Shutting down chat system...');
    
    // Destroy all registered chat components
    this.chatComponents.forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });
    this.chatComponents.clear();
    
    // Destroy all system components
    for (const [name, component] of Object.entries(this.components)) {
      if (component && component.destroy) {
        try {
          await component.destroy();
          console.log(`[ChatSystemIntegration] Destroyed ${name}`);
        } catch (error) {
          console.error(`[ChatSystemIntegration] Error destroying ${name}:`, error);
        }
      }
    }
    
    // Unregister event handlers
    if (this.eventBus) {
      this.eventBus.unsubscribeModule('ChatSystemIntegration');
    }
    
    // Clear references
    this.components = {};
    this.globalStateManager = null;
    this.eventBus = null;
    
    // Remove all listeners
    this.removeAllListeners();
    
    this.isInitialized = false;
    console.log('[ChatSystemIntegration] Chat system shutdown complete');
  }
}

export default ChatSystemIntegration;