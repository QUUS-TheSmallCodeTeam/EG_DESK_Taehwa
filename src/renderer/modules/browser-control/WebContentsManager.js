/**
 * WebContentsManager - Browser Control Module
 * As specified in PRD: Browser-Control/WebContentsManager
 * 
 * Manages webContents instances, browser navigation, and tab control
 * for the EG-Desk:태화 platform
 * 
 * Updated to use WebContentsView (BrowserView is deprecated since Electron 29.0.0)
 * WebContentsView is the new recommended way to embed web content
 */

class WebContentsManager {
  constructor() {
    this.activeTabs = new Map();
    this.currentTabId = null;
    this.eventHandlers = new Map();
    
    // Renderer-side WebContentsManager acts as an IPC proxy to the main process
    console.log('[WebContentsManager] Initialized as IPC proxy to main process');
  }

  /**
   * Initialize the renderer-side manager (IPC proxy)
   */
  initialize() {
    console.log('[WebContentsManager] Initialized renderer-side IPC proxy');
    
    // Set up event forwarding from main process
    this.setupMainProcessEventListeners();
  }

  /**
   * Set up event listeners for main process events
   */
  setupMainProcessEventListeners() {
    if (window.electronAPI && window.electronAPI.on) {
      // Listen for browser events from main process
      window.electronAPI.on('browser-navigated', (data) => {
        this.emit('navigation', data);
      });

      window.electronAPI.on('browser-load-started', (data) => {
        this.emit('loading-started', data);
      });

      window.electronAPI.on('browser-load-finished', (data) => {
        this.emit('loading-finished', data);
      });

      window.electronAPI.on('browser-load-failed', (data) => {
        this.emit('loading-failed', data);
      });

      window.electronAPI.on('browser-load-stopped', (data) => {
        this.emit('loading-stopped', data);
      });

      console.log('[WebContentsManager] Main process event listeners setup complete');
    } else {
      console.warn('[WebContentsManager] electronAPI not available for event listening');
    }
  }

  /**
   * Create a new browser tab/view (delegates to main process)
   * @param {string} url - Initial URL to load
   * @param {Object} options - WebContentsView options
   * @returns {string} tabId - Unique tab identifier
   */
  async createTab(url = 'about:blank', options = {}) {
    console.log(`[WebContentsManager] Creating tab via IPC: ${url}`);
    
    try {
      // Delegate to main process through IPC
      const result = await window.electronAPI.invoke('browser-create-tab', { url, options });
      
      if (result && result.tabId) {
        // Update local state to match main process
        this.activeTabs.set(result.tabId, {
          id: result.tabId,
          url: url,
          title: 'Loading...',
          isLoading: true,
          canGoBack: false,
          canGoForward: false,
          created: Date.now()
        });
        
        console.log(`[WebContentsManager] Tab created successfully: ${result.tabId}`);
        return result.tabId;
      } else {
        throw new Error('Failed to create tab: no tabId returned');
      }
    } catch (error) {
      console.error(`[WebContentsManager] Failed to create tab:`, error);
      throw error;
    }
  }

  /**
   * Switch to a specific tab (delegates to main process)
   * @param {string} tabId - Tab to switch to
   */
  async switchTab(tabId) {
    console.log(`[WebContentsManager] Switching to tab via IPC: ${tabId}`);
    
    try {
      // Delegate to main process through IPC
      const result = await window.electronAPI.invoke('browser-switch-tab', { tabId });
      
      if (result && result.id === tabId) {
        this.currentTabId = tabId;
        
        // Notify listeners
        this.emit('tab-switched', { tabId, tab: this.activeTabs.get(tabId) });
        
        console.log(`[WebContentsManager] Switched to tab successfully: ${tabId}`);
        return this.activeTabs.get(tabId);
      } else {
        throw new Error(`Failed to switch to tab ${tabId}`);
      }
    } catch (error) {
      console.error(`[WebContentsManager] Failed to switch tab:`, error);
      throw error;
    }
  }

  /**
   * Close a tab (delegates to main process)
   * @param {string} tabId - Tab to close
   */
  async closeTab(tabId) {
    console.log(`[WebContentsManager] Closing tab via IPC: ${tabId}`);
    
    try {
      const result = await window.electronAPI.invoke('browser-close-tab', { tabId });
      
      if (result && result.success) {
        // Update local state
        this.activeTabs.delete(tabId);
        if (this.currentTabId === tabId) {
          this.currentTabId = null;
        }
        
        // Notify listeners
        this.emit('tab-closed', { tabId });
        
        console.log(`[WebContentsManager] Tab closed successfully: ${tabId}`);
      } else {
        throw new Error(`Failed to close tab: ${tabId}`);
      }
    } catch (error) {
      console.error(`[WebContentsManager] Failed to close tab:`, error);
      throw error;
    }
  }

  /**
   * Execute JavaScript in the current tab (delegates to main process)
   * @param {string} script - JavaScript code to execute
   * @param {string} tabId - Optional specific tab ID
   * @returns {Promise} Result of script execution
   */
  async executeScript(script, tabId = null) {
    console.log(`[WebContentsManager] Executing script via IPC in tab: ${tabId || 'current'}`);
    
    try {
      return await window.electronAPI.invoke('browser-execute-script', { script, tabId });
    } catch (error) {
      console.error(`[WebContentsManager] Script execution failed:`, error);
      throw error;
    }
  }

  /**
   * Navigate to URL in current or specific tab (delegates to main process)
   * @param {string} url - URL to navigate to
   * @param {string} tabId - Optional specific tab ID
   */
  async loadURL(url, tabId = null) {
    console.log(`[WebContentsManager] Loading URL via IPC: ${url}`);
    
    try {
      // Delegate to main process through IPC
      const result = await window.electronAPI.invoke('browser-load-url', { url, tabId });
      
      if (result && result.success) {
        const targetTabId = result.tabId || this.currentTabId;
        const tab = this.activeTabs.get(targetTabId);
        
        if (tab) {
          tab.url = url;
          tab.isLoading = false;
        }
        
        // Notify listeners
        this.emit('url-loaded', { tabId: targetTabId, url, tab });
        
        console.log(`[WebContentsManager] URL loaded successfully: ${url}`);
        return result;
      } else {
        throw new Error(`Failed to load URL: ${url}`);
      }
    } catch (error) {
      console.error(`[WebContentsManager] Failed to load URL:`, error);
      throw error;
    }
  }

  /**
   * Browser navigation controls (delegate to main process)
   */
  async goBack(tabId = null) {
    console.log(`[WebContentsManager] Going back via IPC: ${tabId || 'current'}`);
    
    try {
      return await window.electronAPI.invoke('browser-go-back', { tabId });
    } catch (error) {
      console.error(`[WebContentsManager] Failed to go back:`, error);
      return false;
    }
  }

  async goForward(tabId = null) {
    console.log(`[WebContentsManager] Going forward via IPC: ${tabId || 'current'}`);
    
    try {
      return await window.electronAPI.invoke('browser-go-forward', { tabId });
    } catch (error) {
      console.error(`[WebContentsManager] Failed to go forward:`, error);
      return false;
    }
  }

  async reload(tabId = null) {
    console.log(`[WebContentsManager] Reloading via IPC: ${tabId || 'current'}`);
    
    try {
      return await window.electronAPI.invoke('browser-reload', { tabId });
    } catch (error) {
      console.error(`[WebContentsManager] Failed to reload:`, error);
      return false;
    }
  }

  /**
   * Get current tab information
   */
  getCurrentTab() {
    if (!this.currentTabId) return null;
    return this.activeTabs.get(this.currentTabId);
  }

  /**
   * Get all tabs
   */
  getAllTabs() {
    return Array.from(this.activeTabs.values());
  }

  /**
   * Get navigation state for current tab (delegates to main process)
   */
  getNavigationState(tabId = null) {
    // Try to get state via IPC, but provide fallback for sync calls
    try {
      if (window.electronAPI && window.electronAPI.invoke) {
        // Use async version when possible
        return window.electronAPI.invoke('browser-get-navigation-state', { tabId })
          .catch(error => {
            console.error(`[WebContentsManager] Failed to get navigation state:`, error);
            return this.getLocalNavigationState(tabId);
          });
      }
    } catch (error) {
      console.warn(`[WebContentsManager] IPC not available, using local state:`, error);
    }
    
    return this.getLocalNavigationState(tabId);
  }
  
  /**
   * Get local navigation state fallback
   */
  getLocalNavigationState(tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    const tab = this.activeTabs.get(targetTabId);
    
    if (!tab) {
      return {
        canGoBack: false,
        canGoForward: false,
        isLoading: false,
        url: 'about:blank',
        title: 'No Tab'
      };
    }

    return {
      canGoBack: tab.canGoBack || false,
      canGoForward: tab.canGoForward || false,
      isLoading: tab.isLoading || false,
      url: tab.url || 'about:blank',
      title: tab.title || 'No Tab'
    };
  }

  /**
   * Update WebContentsView bounds (delegates to main process)
   */
  updateWebContentsViewBounds(preciseBounds = null) {
    console.log(`[WebContentsManager] Updating bounds via IPC:`, preciseBounds);
    
    try {
      // Delegate to main process through IPC
      if (window.electronAPI && window.electronAPI.invoke) {
        window.electronAPI.invoke('browser-update-bounds', preciseBounds)
          .then(() => {
            console.log(`[WebContentsManager] Bounds updated successfully`);
          })
          .catch((error) => {
            console.error(`[WebContentsManager] Failed to update bounds:`, error);
          });
      }
    } catch (error) {
      console.error(`[WebContentsManager] Failed to update bounds:`, error);
    }
  }

  // WebContentsView event handling is now managed in the main process
  // Events are forwarded to renderer via IPC in setupMainProcessEventListeners()

  /**
   * Event emitter functionality
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).delete(handler);
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[WebContentsManager] Event handler error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    console.log('[WebContentsManager] Starting cleanup...');
    
    // Close all tabs with proper cleanup
    for (const tabId of this.activeTabs.keys()) {
      try {
        this.closeTab(tabId);
      } catch (error) {
        console.error(`[WebContentsManager] Error closing tab ${tabId}:`, error);
      }
    }
    
    this.activeTabs.clear();
    this.webContentsViews.clear(); // Updated from browserViews
    this.eventHandlers.clear();
    this.currentTabId = null;
    this.mainWindow = null;
    this.baseWindow = null;
    
    console.log('[WebContentsManager] Destroyed and cleaned up');
  }
}

// ES6 export
export default WebContentsManager;