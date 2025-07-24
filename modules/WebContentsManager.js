/**
 * WebContentsManager - Browser Control Module
 * As specified in PRD: Browser-Control/WebContentsManager
 * 
 * Manages webContents instances, browser navigation, and tab control
 * for the EG-Desk:태화 platform
 * 
 * Updated to use WebContentsView (BrowserView is deprecated)
 */

class WebContentsManager {
  constructor() {
    this.activeTabs = new Map();
    this.webContentsViews = new Map(); // Changed from browserViews
    this.currentTabId = null;
    this.mainWindow = null;
    this.baseWindow = null; // For WebContentsView
    this.eventHandlers = new Map();
  }

  /**
   * Initialize the manager with the main window
   * @param {BrowserWindow} mainWindow - Electron main window
   */
  initialize(mainWindow) {
    this.mainWindow = mainWindow;
    this.baseWindow = mainWindow; // WebContentsView uses BaseWindow
    console.log('[WebContentsManager] Initialized with main window');
    
    // Set up window cleanup for memory management
    this.mainWindow.on('closed', () => {
      this.destroy();
    });
  }

  /**
   * Create a new browser tab/view
   * @param {string} url - Initial URL to load
   * @param {Object} options - BrowserView options (temporary compatibility)
   * @returns {string} tabId - Unique tab identifier
   */
  async createTab(url = 'about:blank', options = {}) {
    // This method should only be called in the main process
    if (typeof require === 'undefined') {
      console.error('[WebContentsManager] createTab called in renderer process - this should be proxied');
      return null;
    }
    
    const { BrowserView } = require('electron');
    
    const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const browserView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        ...options.webPreferences
      }
    });

    this.webContentsViews.set(tabId, browserView);
    this.activeTabs.set(tabId, {
      id: tabId,
      url: url,
      title: 'Loading...',
      isLoading: true,
      canGoBack: false,
      canGoForward: false,
      created: Date.now()
    });

    // Set up event handlers for this BrowserView
    this.setupWebContentsViewEvents(tabId, browserView);

    // Load the initial URL if provided
    if (url && url !== 'about:blank') {
      try {
        await browserView.webContents.loadURL(url);
        console.log(`[WebContentsManager] Loading initial URL: ${url} in tab ${tabId}`);
      } catch (error) {
        console.error(`[WebContentsManager] Failed to load initial URL ${url}:`, error);
      }
    }

    console.log(`[WebContentsManager] Created tab ${tabId} for URL: ${url}`);
    return tabId;
  }

  /**
   * Switch to a specific tab
   * @param {string} tabId - Tab to switch to
   */
  async switchTab(tabId) {
    if (!this.activeTabs.has(tabId) || !this.webContentsViews.has(tabId)) {
      throw new Error(`Tab ${tabId} not found`);
    }

    const browserView = this.webContentsViews.get(tabId);
    
    // Hide current tab if any
    if (this.currentTabId && this.currentTabId !== tabId) {
      this.mainWindow.setBrowserView(null);
    }

    // Show the requested tab
    this.mainWindow.setBrowserView(browserView);
    this.currentTabId = tabId;

    // Bounds will be updated by BrowserTabComponent when it's ready
    // setTimeout(() => {
    //   this.updateWebContentsViewBounds();
    // }, 50);

    console.log(`[WebContentsManager] Switched to tab ${tabId}`);
    
    // Notify listeners
    this.emit('tab-switched', { tabId, tab: this.activeTabs.get(tabId) });
    
    return this.activeTabs.get(tabId);
  }

  /**
   * Close a tab
   * @param {string} tabId - Tab to close
   */
  async closeTab(tabId) {
    if (!this.activeTabs.has(tabId)) {
      throw new Error(`Tab ${tabId} not found`);
    }

    const browserView = this.webContentsViews.get(tabId);
    
    // If this is the current tab, hide it
    if (this.currentTabId === tabId) {
      this.mainWindow.setBrowserView(null);
      this.currentTabId = null;
    }

    // Critical: Proper cleanup to prevent memory leaks
    if (browserView) {
      // First close the webContents explicitly
      browserView.webContents.close();
      // Then destroy it
      browserView.webContents.destroy();
    }
    
    this.webContentsViews.delete(tabId);
    this.activeTabs.delete(tabId);

    console.log(`[WebContentsManager] Closed tab ${tabId}`);
    
    // Notify listeners
    this.emit('tab-closed', { tabId });
  }

  /**
   * Execute JavaScript in the current tab
   * @param {string} script - JavaScript code to execute
   * @param {string} tabId - Optional specific tab ID
   * @returns {Promise} Result of script execution
   */
  async executeScript(script, tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    
    if (!targetTabId || !this.webContentsViews.has(targetTabId)) {
      throw new Error('No active tab found for script execution');
    }

    const browserView = this.webContentsViews.get(targetTabId);
    
    try {
      const result = await browserView.webContents.executeJavaScript(script);
      console.log(`[WebContentsManager] Script executed in tab ${targetTabId}`);
      return result;
    } catch (error) {
      console.error(`[WebContentsManager] Script execution failed in tab ${targetTabId}:`, error);
      throw error;
    }
  }

  /**
   * Navigate to URL in current or specific tab
   * @param {string} url - URL to navigate to
   * @param {string} tabId - Optional specific tab ID
   */
  async loadURL(url, tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    
    if (!targetTabId || !this.webContentsViews.has(targetTabId)) {
      // Create a new tab if none exists
      const newTabId = await this.createTab(url);
      await this.switchTab(newTabId);
      return;
    }

    const browserView = this.webContentsViews.get(targetTabId);
    const tab = this.activeTabs.get(targetTabId);

    try {
      tab.isLoading = true;
      await browserView.webContents.loadURL(url);
      tab.url = url;
      console.log(`[WebContentsManager] Loaded URL ${url} in tab ${targetTabId}`);
      
      // Notify listeners
      this.emit('url-loaded', { tabId: targetTabId, url, tab });
    } catch (error) {
      tab.isLoading = false;
      console.error(`[WebContentsManager] Failed to load URL ${url} in tab ${targetTabId}:`, error);
      throw error;
    }
  }

  /**
   * Browser navigation controls
   */
  async goBack(tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    const browserView = this.webContentsViews.get(targetTabId);
    
    if (browserView && browserView.webContents.canGoBack()) {
      browserView.webContents.goBack();
      return true;
    }
    return false;
  }

  async goForward(tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    const browserView = this.webContentsViews.get(targetTabId);
    
    if (browserView && browserView.webContents.canGoForward()) {
      browserView.webContents.goForward();
      return true;
    }
    return false;
  }

  async reload(tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    const browserView = this.webContentsViews.get(targetTabId);
    
    if (browserView) {
      browserView.webContents.reload();
      return true;
    }
    return false;
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
   * Get navigation state for current tab
   */
  getNavigationState(tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    const browserView = this.webContentsViews.get(targetTabId);
    const tab = this.activeTabs.get(targetTabId);
    
    if (!browserView || !tab) {
      return {
        canGoBack: false,
        canGoForward: false,
        isLoading: false,
        url: 'about:blank',
        title: 'No Tab'
      };
    }

    return {
      canGoBack: browserView.webContents.canGoBack(),
      canGoForward: browserView.webContents.canGoForward(),
      isLoading: tab.isLoading,
      url: browserView.webContents.getURL(),
      title: browserView.webContents.getTitle()
    };
  }

  /**
   * Update WebContentsView bounds based on the browser-component-container position
   */
  updateWebContentsViewBounds(preciseBounds = null) {
    if (!this.currentTabId || !this.mainWindow) return;

    const browserView = this.webContentsViews.get(this.currentTabId);
    if (!browserView) return;

    let newBounds;

    if (preciseBounds) {
      // Use precise bounds calculated by BrowserTabComponent
      newBounds = preciseBounds;
      console.log(`[WebContentsManager] Using precise bounds from component:`, newBounds);
    } else {
      // Calculate bounds based on the actual DOM layout
      const bounds = this.mainWindow.getContentBounds();
      
      // Calculate based on index.html layout:
      // - App header: 28px
      // - Workspace layout padding: 16px
      // - BrowserTabComponent controls: ~60px (with padding)
      const headerHeight = 28;
      const workspaceLayoutPadding = 16;
      const browserControlsHeight = 60; // BrowserTabComponent의 .browser-controls 영역
      
      // Container starts after header + padding
      const containerStartY = headerHeight + workspaceLayoutPadding;
      const containerStartX = workspaceLayoutPadding;
      
      // 70% width for browser container (from index.html #browser-component-container flex: 7)
      const totalWorkspaceWidth = bounds.width - (workspaceLayoutPadding * 2); // Subtract left and right padding
      const browserContainerWidth = Math.floor(totalWorkspaceWidth * 0.7);
      
      // BrowserView should fill the .browser-viewport area inside BrowserTabComponent
      newBounds = {
        x: containerStartX,
        y: containerStartY + browserControlsHeight,
        width: browserContainerWidth,
        height: bounds.height - containerStartY - browserControlsHeight - workspaceLayoutPadding
      };
      
      console.log(`[WebContentsManager] Calculated bounds for container layout:`, {
        windowBounds: bounds,
        containerStartX,
        containerStartY,
        browserContainerWidth,
        newBounds
      });
    }

    browserView.setBounds(newBounds);
    console.log(`[WebContentsManager] Updated BrowserView bounds: ${JSON.stringify(newBounds)}`);
  }

  /**
   * Set up event handlers for a BrowserView
   */
  setupWebContentsViewEvents(tabId, browserView) {
    const webContents = browserView.webContents;
    const tab = this.activeTabs.get(tabId);

    webContents.on('did-navigate', (event, url) => {
      tab.url = url;
      tab.isLoading = false;
      console.log(`[WebContentsManager] Tab ${tabId} navigated to: ${url}`);
      this.emit('navigation', { tabId, url, type: 'navigate' });
    });

    webContents.on('did-start-loading', () => {
      tab.isLoading = true;
      this.emit('loading-started', { tabId });
    });

    webContents.on('did-finish-load', () => {
      tab.isLoading = false;
      tab.title = webContents.getTitle();
      this.emit('loading-finished', { tabId, title: tab.title });
    });

    webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      tab.isLoading = false;
      console.error(`[WebContentsManager] Tab ${tabId} failed to load: ${errorDescription}`);
      this.emit('loading-failed', { tabId, errorCode, errorDescription, url: validatedURL });
    });

    webContents.on('page-title-updated', (event, title) => {
      tab.title = title;
      this.emit('title-updated', { tabId, title });
    });

    // Updated crash handling - use render-process-gone instead of crashed
    webContents.on('render-process-gone', (event, details) => {
      console.error(`[WebContentsManager] Tab ${tabId} render process gone:`, details);
      this.emit('tab-crashed', { tabId, details });
    });
  }

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

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebContentsManager;
} else {
  window.WebContentsManager = WebContentsManager;
}