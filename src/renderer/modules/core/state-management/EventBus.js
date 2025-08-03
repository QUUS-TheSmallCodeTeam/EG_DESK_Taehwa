/**
 * EventBus - Inter-Module Communication System
 * 
 * Provides centralized event-based communication between modules.
 * As specified in PRD: State-Management/EventBus.js
 */

import { EventEmitter } from '../../../utils/EventEmitter.js';

class EventBus extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxListeners: options.maxListeners || 100,
      enableLogging: options.enableLogging !== false,
      ...options
    };
    
    this.isInitialized = false;
    this.eventHistory = [];
    this.moduleSubscriptions = new Map();
    
    // Chat history event coordination
    this.chatHistoryEventTypes = new Set([
      'chat-history-initialized',
      'chat-history-state-initialized',
      'conversation-created',
      'conversation-loaded',
      'conversation-deleted',
      'conversation-updated',
      'message-added',
      'message-updated', 
      'message-deleted',
      'active-conversation-changed',
      'chat-history-searched',
      'history-search-updated',
      'session-created',
      'session-continued',
      'session-resumed',
      'session-switched',
      'chat-history-cleanup-completed',
      'chat-history-preferences-updated',
      'chat-history-imported',
      'chat-history-exported',
      'chat-history-persisted',
      // State management events
      'state-active-conversation-changed',
      'state-conversation-cached',
      'state-conversation-removed',
      'state-search-updated',
      'state-filter-updated',
      'state-sort-updated',
      'state-connection-changed',
      // Synchronization events
      'chat-history-sync-started',
      'chat-history-sync-completed',
      'chat-history-sync-failed',
      'chat-history-offline-mode',
      'chat-history-online-mode'
    ]);
    
    // AI Provider event coordination
    this.providerEventTypes = new Set([
      // Provider lifecycle events
      'ai-providers-initialized',
      'provider-status-changed',
      'provider-activated',
      'provider-deactivated',
      'provider-connected',
      'provider-disconnected',
      'provider-error',
      'provider-recovered',
      // Provider switching events
      'active-provider-changed',
      'provider-switch-requested',
      'provider-switch-completed',
      'provider-switch-failed',
      'provider-switch-warning',
      'provider-auto-switched',
      'provider-auto-switch-failed',
      'provider-auto-switch-error',
      // Model management events
      'provider-model-changed',
      'provider-config-updated',
      'provider-key-status-changed',
      // Cost and usage tracking events
      'provider-usage-tracked',
      'provider-cost-updated',
      'cost-limit-warning',
      'session-cost-reset',
      'cost-efficiency-analysis',
      'cost-recommendation-generated',
      'cost-budget-exceeded',
      'cost-trend-detected',
      // Health and monitoring events
      'provider-health-check-started',
      'provider-health-check-completed',
      'provider-health-analysis',
      'provider-monitoring-started',
      'provider-monitoring-stopped',
      'provider-monitoring-error',
      'provider-error-tracked',
      'provider-reliability-updated',
      'provider-performance-analysis',
      // Configuration events
      'provider-preferences-updated',
      'provider-configuration-changed',
      'provider-api-key-updated',
      'provider-security-check',
      // Conversation-specific provider events
      'conversation-provider-updated',
      'conversation-provider-switched',
      'conversation-provider-metadata-updated',
      // Persistence events
      'provider-state-restored',
      'provider-state-persisted',
      // Workspace integration events
      'workspace-provider-preference-updated',
      'workspace-provider-status-changed',
      'workspace-provider-cost-alert',
      // Analytics events
      'provider-analytics-generated',
      'provider-usage-pattern-detected',
      'provider-recommendation-accepted',
      'provider-recommendation-dismissed',
      // Multi-provider coordination events
      'multi-provider-request-started',
      'multi-provider-request-completed',
      'provider-load-balancing-triggered',
      'provider-failover-executed',
      // System events
      'global-state-manager-shutdown',
      'provider-system-maintenance',
      'provider-system-upgrade'
    ]);
    
    // Set max listeners to prevent warnings
    this.setMaxListeners(this.options.maxListeners);
  }

  /**
   * Initialize event bus
   */
  async initialize() {
    try {
      console.log('[EventBus] Initializing...');
      
      this.isInitialized = true;
      // Set up event coordination
      this.setupChatHistoryEventHandlers();
      this.setupProviderEventHandlers();
      this.setupEnhancedProviderCoordination();
      
      console.log('[EventBus] Successfully initialized');
      this.emit('initialized');
      
      return true;
    } catch (error) {
      console.error('[EventBus] Initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Publish event to all subscribers
   */
  publish(eventName, data = {}) {
    if (!this.isInitialized) {
      console.warn('[EventBus] Cannot publish before initialization');
      return;
    }

    const eventData = {
      name: eventName,
      data,
      timestamp: Date.now(),
      id: this.generateEventId()
    };

    // Add to history
    this.eventHistory.push(eventData);
    
    // Keep history limited
    if (this.eventHistory.length > 1000) {
      this.eventHistory.shift();
    }

    if (this.options.enableLogging) {
      console.log(`[EventBus] Publishing event: ${eventName}`, data);
    }

    // Emit the event
    this.emit(eventName, eventData);
    this.emit('event-published', eventData);
  }

  /**
   * Subscribe to events
   */
  subscribe(eventName, callback, moduleName = null) {
    if (!this.isInitialized) {
      console.warn('[EventBus] Cannot subscribe before initialization');
      return null;
    }

    // Track module subscriptions
    if (moduleName) {
      if (!this.moduleSubscriptions.has(moduleName)) {
        this.moduleSubscriptions.set(moduleName, new Set());
      }
      this.moduleSubscriptions.get(moduleName).add(eventName);
    }

    this.on(eventName, callback);

    if (this.options.enableLogging) {
      console.log(`[EventBus] Subscribed to event: ${eventName}${moduleName ? ` (module: ${moduleName})` : ''}`);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(eventName, callback);
      
      if (moduleName) {
        const moduleEvents = this.moduleSubscriptions.get(moduleName);
        if (moduleEvents) {
          moduleEvents.delete(eventName);
          if (moduleEvents.size === 0) {
            this.moduleSubscriptions.delete(moduleName);
          }
        }
      }
    };
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(eventName, callback) {
    this.off(eventName, callback);
    
    if (this.options.enableLogging) {
      console.log(`[EventBus] Unsubscribed from event: ${eventName}`);
    }
  }

  /**
   * Subscribe to multiple events at once
   */
  subscribeMultiple(eventNames, callback, moduleName = null) {
    const unsubscribeFunctions = [];
    
    eventNames.forEach(eventName => {
      const unsubscribe = this.subscribe(eventName, callback, moduleName);
      unsubscribeFunctions.push(unsubscribe);
    });

    // Return function to unsubscribe from all events
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe && unsubscribe());
    };
  }

  /**
   * Subscribe once to an event
   */
  subscribeOnce(eventName, callback, moduleName = null) {
    const wrappedCallback = (eventData) => {
      callback(eventData);
      this.unsubscribe(eventName, wrappedCallback);
    };

    return this.subscribe(eventName, wrappedCallback, moduleName);
  }

  /**
   * Get event history
   */
  getEventHistory(eventName = null, limit = 50) {
    let history = this.eventHistory;
    
    if (eventName) {
      history = history.filter(event => event.name === eventName);
    }
    
    return history.slice(-limit);
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats() {
    const stats = {
      totalEvents: this.eventNames().length,
      totalListeners: 0,
      moduleSubscriptions: {},
      eventListenerCounts: {}
    };

    // Count listeners per event
    this.eventNames().forEach(eventName => {
      const listenerCount = this.listenerCount(eventName);
      stats.totalListeners += listenerCount;
      stats.eventListenerCounts[eventName] = listenerCount;
    });

    // Module subscription stats
    for (const [moduleName, events] of this.moduleSubscriptions) {
      stats.moduleSubscriptions[moduleName] = Array.from(events);
    }

    return stats;
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
    console.log('[EventBus] Event history cleared');
    this.emit('history-cleared');
  }

  /**
   * Remove all listeners for a module
   */
  unsubscribeModule(moduleName) {
    const moduleEvents = this.moduleSubscriptions.get(moduleName);
    
    if (moduleEvents) {
      moduleEvents.forEach(eventName => {
        this.removeAllListeners(eventName);
      });
      
      this.moduleSubscriptions.delete(moduleName);
      console.log(`[EventBus] Unsubscribed all events for module: ${moduleName}`);
    }
  }

  /**
   * Create a promise that resolves when an event is published
   */
  waitForEvent(eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.unsubscribe(eventName, handler);
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);

      const handler = (eventData) => {
        clearTimeout(timer);
        this.unsubscribe(eventName, handler);
        resolve(eventData);
      };

      this.subscribe(eventName, handler);
    });
  }

  /**
   * Publish event and wait for response
   */
  async publishAndWaitForResponse(eventName, data = {}, responseEventName = null, timeout = 5000) {
    const responseEvent = responseEventName || `${eventName}-response`;
    
    // Set up response listener
    const responsePromise = this.waitForEvent(responseEvent, timeout);
    
    // Publish the event
    this.publish(eventName, data);
    
    // Wait for response
    return await responsePromise;
  }

  /**
   * Create namespaced event names
   */
  createNamespace(namespace) {
    return {
      publish: (eventName, data) => {
        this.publish(`${namespace}:${eventName}`, data);
      },
      subscribe: (eventName, callback, moduleName) => {
        return this.subscribe(`${namespace}:${eventName}`, callback, moduleName);
      },
      unsubscribe: (eventName, callback) => {
        this.unsubscribe(`${namespace}:${eventName}`, callback);
      }
    };
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      eventHistory: this.eventHistory.length,
      activeEvents: this.eventNames(),
      subscriptionStats: this.getSubscriptionStats(),
      moduleSubscriptions: Object.fromEntries(this.moduleSubscriptions)
    };
  }

  /**
   * Set up chat history event handlers for coordination
   */
  setupChatHistoryEventHandlers() {
    // Track chat history events for debugging and coordination
    this.chatHistoryEventTypes.forEach(eventType => {
      this.subscribe(eventType, (eventData) => {
        this.handleChatHistoryEvent(eventType, eventData);
      }, 'EventBus-ChatHistoryCoordinator');
    });
    
    console.log('[EventBus] Chat history event coordination set up');
  }
  
  /**
   * Set up provider event handlers for coordination
   */
  setupProviderEventHandlers() {
    // Track provider events for debugging and cross-module coordination
    this.providerEventTypes.forEach(eventType => {
      this.subscribe(eventType, (eventData) => {
        this.handleProviderEvent(eventType, eventData);
      }, 'EventBus-ProviderCoordinator');
    });
    
    console.log('[EventBus] Provider event coordination set up');
  }
  
  /**
   * Handle chat history events for cross-module coordination
   */
  handleChatHistoryEvent(eventType, eventData) {
    if (this.options.enableLogging) {
      console.log(`[EventBus] Chat history event: ${eventType}`, eventData.data);
    }
    
    // Coordinate with other modules based on event type
    switch (eventType) {
      case 'conversation-created':
        // Notify UI components, workspace manager, etc.
        this.publish('ui-update-required', {
          type: 'conversation-list',
          action: 'add',
          conversationId: eventData.data.conversationId
        });
        break;
        
      case 'conversation-deleted':
        // Coordinate cleanup across modules
        this.publish('ui-update-required', {
          type: 'conversation-list',
          action: 'remove',
          conversationId: eventData.data.conversationId
        });
        this.publish('workspace-conversation-removed', {
          conversationId: eventData.data.conversationId
        });
        break;
        
      case 'active-conversation-changed':
        // Coordinate UI updates and module synchronization
        this.publish('ui-conversation-switched', {
          conversationId: eventData.data.conversationId,
          previousId: eventData.data.previousId
        });
        this.publish('workspace-active-conversation-changed', {
          conversationId: eventData.data.conversationId
        });
        break;
        
      case 'message-added':
        // Real-time message coordination
        this.publish('ui-message-received', {
          conversationId: eventData.data.conversationId,
          messageId: eventData.data.messageId,
          message: eventData.data.message
        });
        this.publish('workspace-conversation-updated', {
          conversationId: eventData.data.conversationId
        });
        break;
        
      case 'chat-history-searched':
        // Coordinate search result display
        this.publish('ui-search-results-ready', {
          query: eventData.data.query,
          results: eventData.data.results
        });
        break;
        
      case 'chat-history-cleanup-completed':
        // Notify about cleanup completion
        this.publish('ui-notification', {
          type: 'info',
          message: `Cleaned up ${eventData.data.cleanupCount} old conversations`,
          duration: 3000
        });
        break;
        
      case 'state-connection-changed':
        // Handle connection status changes
        this.publish('ui-connection-status', {
          isOnline: eventData.data.isOnline,
          timestamp: eventData.timestamp
        });
        break;
        
      case 'session-created':
      case 'session-continued':
      case 'session-resumed':
        // Coordinate session management with workspace
        this.publish('workspace-session-changed', {
          sessionId: eventData.data.sessionId,
          conversationId: eventData.data.conversationId,
          action: eventType.replace('session-', '')
        });
        break;
        
      case 'chat-history-sync-started':
        // Show sync indicator
        this.publish('ui-sync-indicator', {
          show: true,
          message: 'Syncing chat history...'
        });
        break;
        
      case 'chat-history-sync-completed':
        // Hide sync indicator
        this.publish('ui-sync-indicator', {
          show: false,
          message: 'Chat history synced'
        });
        break;
        
      case 'chat-history-sync-failed':
        // Show sync error
        this.publish('ui-notification', {
          type: 'warning',
          message: `Chat history sync failed: ${eventData.data.error}`,
          duration: 5000
        });
        break;
    }
  }
  
  /**
   * Handle provider events for cross-module coordination
   */
  handleProviderEvent(eventType, eventData) {
    if (this.options.enableLogging) {
      console.log(`[EventBus] Provider event: ${eventType}`, eventData.data);
    }
    
    // Coordinate with other modules based on event type
    switch (eventType) {
      case 'active-provider-changed':
        // Notify UI components and conversation manager
        this.publish('ui-provider-switched', {
          providerId: eventData.data.providerId,
          previousProvider: eventData.data.previousProvider,
          providerInfo: eventData.data.providerInfo
        });
        this.publish('conversation-provider-sync-required', {
          providerId: eventData.data.providerId,
          conversationId: eventData.data.conversationId
        });
        break;
        
      case 'provider-status-changed':
        // Update UI status indicators
        this.publish('ui-provider-status-update', {
          providerId: eventData.data.providerId,
          status: eventData.data.status,
          error: eventData.data.error,
          healthMetrics: eventData.data.healthMetrics
        });
        
        // Notify workspace about provider availability
        this.publish('workspace-provider-status-changed', {
          providerId: eventData.data.providerId,
          status: eventData.data.status,
          available: eventData.data.status === 'connected',
          healthMetrics: eventData.data.healthMetrics
        });
        
        // Handle critical status changes
        if (eventData.data.status === 'error') {
          this.publish('ui-notification', {
            type: 'error',
            message: `Provider ${eventData.data.providerId} encountered an error: ${eventData.data.error}`,
            duration: 5000
          });
        }
        break;
        
      case 'provider-switch-failed':
        // Show error notification
        this.publish('ui-notification', {
          type: 'error',
          message: `Failed to switch to provider: ${eventData.data.reason}`,
          duration: 5000
        });
        break;
        
      case 'provider-auto-switched':
        // Show success notification for auto-switch
        this.publish('ui-notification', {
          type: 'info',
          message: `Automatically switched to ${eventData.data.to} due to ${eventData.data.reason}`,
          duration: 3000
        });
        break;
        
      case 'cost-limit-warning':
        // Show cost warning
        this.publish('ui-notification', {
          type: eventData.data.severity === 'critical' ? 'error' : 'warning',
          message: `${eventData.data.type === 'cost' ? 'Cost' : 'Token'} usage at ${eventData.data.percentage.toFixed(1)}% of limit`,
          recommendation: eventData.data.recommendation,
          duration: eventData.data.severity === 'critical' ? 8000 : 4000
        });
        
        // Update workspace cost indicators
        this.publish('workspace-cost-limit-warning', {
          type: eventData.data.type,
          percentage: eventData.data.percentage,
          severity: eventData.data.severity
        });
        break;
        
      case 'provider-health-check-completed':
        // Update health status in UI
        this.publish('ui-provider-health-update', {
          results: eventData.data.results,
          healthyCount: eventData.data.healthyProviders,
          total: eventData.data.totalProviders
        });
        
        // Notify workspace of health status
        this.publish('workspace-provider-health-update', {
          healthyCount: eventData.data.healthyProviders,
          totalCount: eventData.data.totalProviders,
          healthyPercentage: (eventData.data.healthyProviders / eventData.data.totalProviders) * 100
        });
        break;
        
      case 'provider-model-changed':
        // Coordinate model updates across modules
        this.publish('conversation-model-sync-required', {
          providerId: eventData.data.providerId,
          model: eventData.data.model,
          previousModel: eventData.data.previousModel
        });
        break;
        
      case 'provider-usage-tracked':
        // Update cost displays
        this.publish('ui-cost-update', {
          providerId: eventData.data.providerId,
          cost: eventData.data.cost,
          tokens: eventData.data.tokens,
          sessionCost: eventData.data.sessionCost,
          efficiency: eventData.data.efficiency,
          limits: eventData.data.limits
        });
        
        // Check for cost warnings
        if (eventData.data.limits && eventData.data.limits.sessionPercentage > 80) {
          this.publish('ui-cost-warning', {
            providerId: eventData.data.providerId,
            percentage: eventData.data.limits.sessionPercentage,
            severity: eventData.data.limits.sessionPercentage > 95 ? 'critical' : 'warning'
          });
        }
        break;
        
      case 'conversation-provider-updated':
        // Sync conversation-specific provider changes
        this.publish('ui-conversation-provider-update', {
          conversationId: eventData.data.conversationId,
          providerId: eventData.data.providerId,
          model: eventData.data.model
        });
        break;
        
      case 'provider-error-tracked':
        // Log provider errors for debugging
        this.publish('debug-provider-error', {
          providerId: eventData.data.providerId,
          error: eventData.data.error,
          retryCount: eventData.data.retryCount
        });
        
        // Show error notification if retry count is high
        if (eventData.data.retryCount > 3) {
          this.publish('ui-notification', {
            type: 'warning',
            message: `Provider ${eventData.data.providerId} has failed ${eventData.data.retryCount} times`,
            duration: 5000
          });
        }
        break;
        
      // New comprehensive event handlers
      case 'session-cost-reset':
        // Notify UI of cost reset
        this.publish('ui-cost-reset', {
          previousSessionCost: eventData.data.previousSessionCost,
          previousSessionTokens: eventData.data.previousSessionTokens
        });
        
        // Update workspace cost displays
        this.publish('workspace-cost-reset', {
          timestamp: eventData.data.timestamp
        });
        break;
        
      case 'provider-key-status-changed':
        // Update UI configuration status
        this.publish('ui-provider-config-status', {
          providerId: eventData.data.providerId,
          hasKey: eventData.data.hasKey,
          requiresSetup: eventData.data.requiresSetup
        });
        break;
        
      case 'cost-efficiency-analysis':
        // Show efficiency recommendations
        this.publish('ui-efficiency-recommendation', {
          analysis: eventData.data.analysis,
          recommendations: eventData.data.recommendations
        });
        break;
        
      case 'provider-analytics-generated':
        // Update analytics dashboard
        this.publish('ui-analytics-update', {
          analytics: eventData.data.analytics,
          timestamp: eventData.data.timestamp
        });
        break;
        
      case 'workspace-provider-preference-updated':
        // Coordinate workspace-specific provider settings
        this.publish('ui-workspace-provider-update', {
          workspaceId: eventData.data.workspaceId,
          preferences: eventData.data.preferences
        });
        break;
        
      case 'provider-recommendation-generated':
        // Show provider recommendations to user
        this.publish('ui-provider-recommendation', {
          recommendations: eventData.data.recommendations,
          context: eventData.data.context
        });
        break;
        
      case 'global-state-manager-shutdown':
        // Handle system shutdown
        this.publish('ui-system-shutdown', {
          finalStats: eventData.data.finalStats
        });
        break;
    }
  }
  
  /**
   * Publish chat history event with standardized format
   */
  publishChatHistoryEvent(eventType, data = {}) {
    if (!this.chatHistoryEventTypes.has(eventType)) {
      console.warn(`[EventBus] Unknown chat history event type: ${eventType}`);
      return;
    }
    
    const eventData = {
      ...data,
      timestamp: Date.now(),
      source: 'chat-history-system'
    };
    
    this.publish(eventType, eventData);
  }
  
  /**
   * Publish provider event with standardized format
   */
  publishProviderEvent(eventType, data = {}) {
    if (!this.providerEventTypes.has(eventType)) {
      console.warn(`[EventBus] Unknown provider event type: ${eventType}`);
      return;
    }
    
    const eventData = {
      ...data,
      timestamp: Date.now(),
      source: 'provider-system'
    };
    
    this.publish(eventType, eventData);
  }
  
  /**
   * Subscribe to multiple chat history events with a single handler
   */
  subscribeToChatHistoryEvents(eventTypes, callback, moduleName = null) {
    const validEventTypes = eventTypes.filter(type => this.chatHistoryEventTypes.has(type));
    
    if (validEventTypes.length !== eventTypes.length) {
      const invalidTypes = eventTypes.filter(type => !this.chatHistoryEventTypes.has(type));
      console.warn(`[EventBus] Invalid chat history event types: ${invalidTypes.join(', ')}`);
    }
    
    return this.subscribeMultiple(validEventTypes, callback, moduleName);
  }
  
  /**
   * Subscribe to multiple provider events with a single handler
   */
  subscribeToProviderEvents(eventTypes, callback, moduleName = null) {
    const validEventTypes = eventTypes.filter(type => this.providerEventTypes.has(type));
    
    if (validEventTypes.length !== eventTypes.length) {
      const invalidTypes = eventTypes.filter(type => !this.providerEventTypes.has(type));
      console.warn(`[EventBus] Invalid provider event types: ${invalidTypes.join(', ')}`);
    }
    
    return this.subscribeMultiple(validEventTypes, callback, moduleName);
  }
  
  /**
   * Get chat history event statistics
   */
  getChatHistoryEventStats() {
    const chatHistoryEvents = this.eventHistory.filter(event => 
      this.chatHistoryEventTypes.has(event.name)
    );
    
    const eventTypeCounts = {};
    this.chatHistoryEventTypes.forEach(type => {
      eventTypeCounts[type] = chatHistoryEvents.filter(event => event.name === type).length;
    });
    
    return {
      totalChatHistoryEvents: chatHistoryEvents.length,
      eventTypeCounts,
      recentEvents: chatHistoryEvents.slice(-10),
      registeredEventTypes: Array.from(this.chatHistoryEventTypes)
    };
  }
  
  /**
   * Get provider event statistics
   */
  getProviderEventStats() {
    const providerEvents = this.eventHistory.filter(event => 
      this.providerEventTypes.has(event.name)
    );
    
    const eventTypeCounts = {};
    this.providerEventTypes.forEach(type => {
      eventTypeCounts[type] = providerEvents.filter(event => event.name === type).length;
    });
    
    return {
      totalProviderEvents: providerEvents.length,
      eventTypeCounts,
      recentEvents: providerEvents.slice(-10),
      registeredEventTypes: Array.from(this.providerEventTypes)
    };
  }
  
  /**
   * Create a chat history namespace for module-specific events
   */
  createChatHistoryNamespace(moduleName) {
    const namespace = this.createNamespace(`chat-history:${moduleName}`);
    
    return {
      ...namespace,
      publishConversationEvent: (eventType, conversationId, data = {}) => {
        namespace.publish(eventType, {
          conversationId,
          ...data,
          moduleName
        });
      },
      subscribeToConversationEvents: (conversationId, callback) => {
        return namespace.subscribe(`conversation:${conversationId}`, callback, moduleName);
      }
    };
  }
  
  /**
   * Create a provider namespace for module-specific events
   */
  createProviderNamespace(moduleName) {
    const namespace = this.createNamespace(`provider:${moduleName}`);
    
    return {
      ...namespace,
      publishProviderEvent: (eventType, providerId, data = {}) => {
        namespace.publish(eventType, {
          providerId,
          ...data,
          moduleName
        });
      },
      subscribeToProviderEvents: (providerId, callback) => {
        return namespace.subscribe(`provider:${providerId}`, callback, moduleName);
      },
      publishCostEvent: (eventType, data = {}) => {
        namespace.publish(`cost:${eventType}`, {
          ...data,
          moduleName
        });
      },
      subscribeToHealthEvents: (callback) => {
        return namespace.subscribe('health', callback, moduleName);
      }
    };
  }
  
  /**
   * Coordinate state synchronization across modules
   */
  coordinateStateSync(syncType, data = {}) {
    const syncEventName = `state-sync:${syncType}`;
    
    this.publish(syncEventName, {
      ...data,
      timestamp: Date.now(),
      syncId: this.generateEventId()
    });
    
    // Return promise that resolves when sync is acknowledged
    return this.waitForEvent(`${syncEventName}-complete`, 5000);
  }
  
  /**
   * Handle real-time chat history updates
   */
  handleRealtimeUpdate(updateType, data) {
    const realtimeEvent = `realtime:${updateType}`;
    
    this.publish(realtimeEvent, {
      ...data,
      timestamp: Date.now(),
      isRealtime: true
    });
    
    // Coordinate UI updates
    this.publish('ui-realtime-update', {
      type: updateType,
      data
    });
  }
  
  /**
   * Set up conflict resolution for concurrent updates
   */
  setupConflictResolution() {
    this.subscribe('state-conflict-detected', (eventData) => {
      console.warn('[EventBus] State conflict detected:', eventData.data);
      
      // Implement conflict resolution strategy
      const resolutionStrategy = this.determineResolutionStrategy(eventData.data);
      
      this.publish('state-conflict-resolution', {
        conflictId: eventData.data.conflictId,
        strategy: resolutionStrategy,
        timestamp: Date.now()
      });
    }, 'EventBus-ConflictResolver');
  }
  
  /**
   * Determine conflict resolution strategy
   */
  determineResolutionStrategy(conflictData) {
    // Simple last-write-wins strategy for now
    // Can be enhanced with more sophisticated conflict resolution
    return {
      type: 'last-write-wins',
      winningTimestamp: Math.max(...conflictData.timestamps),
      reason: 'Most recent update takes precedence'
    };
  }
  
  /**
   * Coordinate real-time provider switching across all UI components
   */
  coordinateProviderSwitch(switchData) {
    const switchId = this.generateEventId();
    
    // Publish coordinated switch events
    this.publish('provider-switch-coordination-started', {
      switchId,
      ...switchData,
      timestamp: Date.now()
    });
    
    // Update all UI components
    this.publish('ui-provider-switch-update', {
      switchId,
      providerId: switchData.providerId,
      model: switchData.model,
      status: 'switching'
    });
    
    // Update workspace components
    this.publish('workspace-provider-switch', {
      switchId,
      ...switchData
    });
    
    return switchId;
  }
  
  /**
   * Handle real-time cost tracking updates
   */
  coordinateCostUpdate(costData) {
    // Publish to all relevant components
    this.publish('ui-realtime-cost-update', costData);
    this.publish('workspace-cost-update', costData);
    this.publish('chat-history-cost-update', costData);
    
    // Check for threshold breaches
    if (costData.thresholdBreach) {
      this.publish('cost-threshold-breach', {
        ...costData.thresholdBreach,
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Coordinate provider health status across components
   */
  coordinateProviderHealth(healthData) {
    // Update all health-aware components
    this.publish('ui-provider-health-coordination', healthData);
    this.publish('workspace-provider-health', healthData);
    
    // Handle critical health issues
    if (healthData.criticalIssues && healthData.criticalIssues.length > 0) {
      this.publish('provider-critical-health-alert', {
        issues: healthData.criticalIssues,
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Set up enhanced provider event coordination
   */
  setupEnhancedProviderCoordination() {
    // Provider switching coordination
    this.subscribe('active-provider-changed', (eventData) => {
      this.coordinateProviderSwitch(eventData.data);
    }, 'EventBus-ProviderSwitchCoordinator');
    
    // Cost tracking coordination
    this.subscribe('provider-usage-tracked', (eventData) => {
      this.coordinateCostUpdate(eventData.data);
    }, 'EventBus-CostCoordinator');
    
    // Health monitoring coordination
    this.subscribe('provider-health-check-completed', (eventData) => {
      this.coordinateProviderHealth(eventData.data);
    }, 'EventBus-HealthCoordinator');
    
    console.log('[EventBus] Enhanced provider coordination set up');
  }
  
  /**
   * Create provider-specific event channels
   */
  createProviderChannel(providerId) {
    const channelName = `provider-channel:${providerId}`;
    
    return {
      publish: (eventType, data) => {
        this.publish(`${channelName}:${eventType}`, {
          providerId,
          ...data,
          timestamp: Date.now()
        });
      },
      subscribe: (eventType, callback) => {
        return this.subscribe(`${channelName}:${eventType}`, callback, `${providerId}-channel`);
      },
      // Specialized methods for common provider events
      publishStatusChange: (status, error = null) => {
        this.publish(`${channelName}:status-changed`, {
          providerId,
          status,
          error,
          timestamp: Date.now()
        });
      },
      publishCostUpdate: (costData) => {
        this.publish(`${channelName}:cost-updated`, {
          providerId,
          ...costData,
          timestamp: Date.now()
        });
      },
      publishModelChange: (model, previousModel) => {
        this.publish(`${channelName}:model-changed`, {
          providerId,
          model,
          previousModel,
          timestamp: Date.now()
        });
      }
    };
  }
  
  /**
   * Monitor event bus health and performance
   */
  getHealthMetrics() {
    const now = Date.now();
    const recentEvents = this.eventHistory.filter(event => 
      now - event.timestamp < 60000 // Last minute
    );
    
    return {
      ...this.getDebugInfo(),
      healthStatus: 'healthy',
      eventsPerMinute: recentEvents.length,
      chatHistoryEventStats: this.getChatHistoryEventStats(),
      providerEventStats: this.getProviderEventStats(),
      memoryUsage: {
        eventHistory: this.eventHistory.length,
        subscriptions: this.moduleSubscriptions.size,
        activeListeners: this.eventNames().reduce((sum, name) => 
          sum + this.listenerCount(name), 0
        ),
        registeredEventTypes: this.chatHistoryEventTypes.size + this.providerEventTypes.size
      },
      providerCoordination: {
        activeChannels: this.getActiveProviderChannels(),
        coordinationEvents: this.getCoordinationEventStats(),
        switchCoordinations: this.getSwitchCoordinationStats()
      }
    };
  }
  
  /**
   * Get active provider channels
   */
  getActiveProviderChannels() {
    return this.eventNames()
      .filter(name => name.startsWith('provider-channel:'))
      .map(name => name.split(':')[1])
      .filter((value, index, self) => self.indexOf(value) === index);
  }
  
  /**
   * Get coordination event statistics
   */
  getCoordinationEventStats() {
    const coordinationEvents = this.eventHistory.filter(event => 
      event.name.includes('coordination') || 
      event.name.includes('realtime') ||
      event.name.includes('switch')
    );
    
    return {
      total: coordinationEvents.length,
      recent: coordinationEvents.filter(event => 
        Date.now() - event.timestamp < 300000 // Last 5 minutes
      ).length
    };
  }
  
  /**
   * Get switch coordination statistics
   */
  getSwitchCoordinationStats() {
    const switchEvents = this.eventHistory.filter(event => 
      event.name.includes('provider-switch') ||
      event.name.includes('active-provider-changed')
    );
    
    return {
      totalSwitches: switchEvents.length,
      recentSwitches: switchEvents.filter(event => 
        Date.now() - event.timestamp < 3600000 // Last hour
      ).length,
      averageSwitchTime: this.calculateAverageSwitchTime(switchEvents)
    };
  }
  
  /**
   * Calculate average provider switch time
   */
  calculateAverageSwitchTime(switchEvents) {
    if (switchEvents.length < 2) return 0;
    
    const switchTimes = [];
    for (let i = 1; i < switchEvents.length; i++) {
      switchTimes.push(switchEvents[i].timestamp - switchEvents[i-1].timestamp);
    }
    
    return switchTimes.reduce((sum, time) => sum + time, 0) / switchTimes.length;
  }
  
  /**
   * Enhanced destroy with provider coordination cleanup
   */
  destroy() {
    // Publish shutdown coordination event
    this.publish('eventbus-shutdown-initiated', {
      timestamp: Date.now(),
      activeChannels: this.getActiveProviderChannels(),
      totalEvents: this.eventHistory.length
    });
    
    // Remove all listeners
    this.removeAllListeners();
    
    // Clear data structures
    this.eventHistory = [];
    this.moduleSubscriptions.clear();
    this.chatHistoryEventTypes.clear();
    this.providerEventTypes.clear();
    
    this.isInitialized = false;
    console.log('[EventBus] Enhanced destruction completed');
  }
}

// Create singleton instance
const eventBus = new EventBus();

export default eventBus;
export { EventBus };
