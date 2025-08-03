/**
 * Browser-compatible EventEmitter
 * Replacement for Node.js EventEmitter for renderer process
 */

class EventEmitter {
  constructor() {
    this._events = new Map();
    this._maxListeners = 10;
  }

  /**
   * Add event listener
   */
  on(eventName, listener) {
    if (!this._events.has(eventName)) {
      this._events.set(eventName, []);
    }

    const listeners = this._events.get(eventName);
    listeners.push(listener);

    // Warn if too many listeners
    if (listeners.length > this._maxListeners) {
    }

    return this;
  }

  /**
   * Add event listener (alias for on)
   */
  addEventListener(eventName, listener) {
    return this.on(eventName, listener);
  }

  /**
   * Add one-time event listener
   */
  once(eventName, listener) {
    const onceWrapper = (...args) => {
      this.off(eventName, onceWrapper);
      listener.apply(this, args);
    };

    return this.on(eventName, onceWrapper);
  }

  /**
   * Remove event listener
   */
  off(eventName, listener) {
    if (!this._events.has(eventName)) {
      return this;
    }

    const listeners = this._events.get(eventName);
    const index = listeners.indexOf(listener);

    if (index !== -1) {
      listeners.splice(index, 1);

      if (listeners.length === 0) {
        this._events.delete(eventName);
      }
    }

    return this;
  }

  /**
   * Remove event listener (alias for off)
   */
  removeListener(eventName, listener) {
    return this.off(eventName, listener);
  }

  /**
   * Remove event listener (alias for off)
   */
  removeEventListener(eventName, listener) {
    return this.off(eventName, listener);
  }

  /**
   * Remove all listeners for event
   */
  removeAllListeners(eventName) {
    if (eventName) {
      this._events.delete(eventName);
    } else {
      this._events.clear();
    }

    return this;
  }

  /**
   * Emit event
   */
  emit(eventName, ...args) {
    if (!this._events.has(eventName)) {
      return false;
    }

    const listeners = this._events.get(eventName).slice(); // Copy array to avoid issues if listeners are removed during emit

    for (const listener of listeners) {
      try {
        listener.apply(this, args);
      } catch (error) {
      }
    }

    return true;
  }

  /**
   * Get listener count for event
   */
  listenerCount(eventName) {
    if (!this._events.has(eventName)) {
      return 0;
    }
    return this._events.get(eventName).length;
  }

  /**
   * Get all event names
   */
  eventNames() {
    return Array.from(this._events.keys());
  }

  /**
   * Get listeners for event
   */
  listeners(eventName) {
    if (!this._events.has(eventName)) {
      return [];
    }
    return this._events.get(eventName).slice();
  }

  /**
   * Get raw listeners for event
   */
  rawListeners(eventName) {
    return this.listeners(eventName);
  }

  /**
   * Set max listeners
   */
  setMaxListeners(maxListeners) {
    this._maxListeners = maxListeners;
    return this;
  }

  /**
   * Get max listeners
   */
  getMaxListeners() {
    return this._maxListeners;
  }
}

export { EventEmitter };
export default EventEmitter;
