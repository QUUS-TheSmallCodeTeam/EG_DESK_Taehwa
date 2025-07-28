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
   * Destroy event bus
   */
  destroy() {
    // Remove all listeners
    this.removeAllListeners();
    
    // Clear data structures
    this.eventHistory = [];
    this.moduleSubscriptions.clear();
    
    this.isInitialized = false;
    console.log('[EventBus] Destroyed');
  }
}

// Create singleton instance
const eventBus = new EventBus();

export default eventBus;
export { EventBus };
