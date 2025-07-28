/**
 * GlobalStateManager - Global Application State Management
 * 
 * Manages global state across the application with persistence and change notification.
 * As specified in PRD: State-Management/GlobalStateManager.js
 */

import { EventEmitter } from '../../../utils/EventEmitter.js';

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
  }

  /**
   * Initialize global state manager
   */
  async initialize() {
    try {
      console.log('[GlobalStateManager] Initializing...');
      
      // Load persisted state
      if (this.options.persistState) {
        await this.loadState();
      }
      
      // Start auto-save timer
      if (this.options.autoSave) {
        this.startAutoSave();
      }
      
      this.isInitialized = true;
      console.log('[GlobalStateManager] Successfully initialized');
      this.emit('initialized');
      
      return true;
    } catch (error) {
      console.error('[GlobalStateManager] Initialization failed:', error);
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
    
    console.log(`[GlobalStateManager] State updated: ${key}`);
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
    
    console.log(`[GlobalStateManager] State removed: ${key}`);
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
    console.log('[GlobalStateManager] State cleared');
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
        const savedState = await window.electronAPI.storage.get('globalState');
        
        if (savedState) {
          this.state = new Map(Object.entries(savedState));
          console.log(`[GlobalStateManager] Loaded state with ${this.state.size} entries`);
          this.emit('state-loaded', { size: this.state.size });
        }
      }
    } catch (error) {
      console.warn('[GlobalStateManager] Failed to load state:', error);
    }
  }

  /**
   * Save state to storage
   */
  async saveState() {
    try {
      if (this.options.persistState && window.electronAPI?.storage?.set) {
        const stateObject = Object.fromEntries(this.state);
        await window.electronAPI.storage.set('globalState', stateObject);
        
        console.log(`[GlobalStateManager] Saved state with ${this.state.size} entries`);
        this.emit('state-saved', { size: this.state.size });
      }
    } catch (error) {
      console.error('[GlobalStateManager] Failed to save state:', error);
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
    
    console.log('[GlobalStateManager] Auto-save started');
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
      console.log('[GlobalStateManager] Auto-save stopped');
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
   * Destroy global state manager
   */
  async destroy() {
    this.stopAutoSave();
    
    // Save state before destroying
    if (this.options.persistState) {
      await this.saveState();
    }
    
    this.state.clear();
    this.isInitialized = false;
    this.removeAllListeners();
    
    console.log('[GlobalStateManager] Destroyed');
  }
}

export default GlobalStateManager;
