/**
 * WebContentsManager - Main Process Browser Management
 * 
 * Manages WebContentsView instances for embedded web content in the main process.
 * Uses WebContentsView API (BrowserView is deprecated since Electron 30.0.0).
 * Updated for Electron 37+ with proper WebContentsView support.
 */

import { WebContentsView } from 'electron';
import { EventEmitter } from 'events';

class WebContentsManager extends EventEmitter {
  constructor() {
    super();
    this.mainWindow = null;
    this.webContentsViews = new Map();
    this.currentTabId = null;
    this.isInitialized = false;
    
    // Performance optimization: Bounds debouncing
    this.boundsUpdateTimeout = null;
    this.lastRequestedBounds = null;
    
    // Performance optimization: Preloaded sessions for faster loading
    this.preloadedSession = null;
  }

  /**
   * Initialize WebContentsManager with main window
   */
  initialize(mainWindow) {
    console.log('[WebContentsManager] Initialized with main window');
    this.mainWindow = mainWindow;
    this.isInitialized = true;
  }

  /**
   * Create a new tab with WebContentsView
   */
  async createTab(url = 'about:blank') {
    if (!this.isInitialized) {
      throw new Error('WebContentsManager not initialized');
    }

    const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    console.log(`[WebContentsManager] Creating tab: ${tabId} with URL: ${url}`);

    try {
      // Create WebContentsView (Electron 37+) with performance optimizations
      const webContentsView = new WebContentsView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false, // Disable web security for development
          sandbox: false, // Disable sandbox for better compatibility
          // Handle certificate errors and improve SSL handling
          allowRunningInsecureContent: true, // Allow insecure content
          experimentalFeatures: false,
          // Improve rendering performance
          enableRemoteModule: false,
          // Better resource management
          backgroundThrottling: false,
          // Additional settings for better web content loading
          webgl: true,
          plugins: true,
          javascript: true,
          // Performance optimizations
          spellcheck: false, // Disable spellcheck for faster loading
          defaultEncoding: 'utf-8',
          // Preload optimizations
          preload: null, // No preload script needed for web content
          // Network optimizations
          enableWebSQL: false,
          // Faster startup
          nodeIntegrationInWorker: false,
          nodeIntegrationInSubFrames: false
        }
      });
      console.log(`[WebContentsManager] Created WebContentsView for tab: ${tabId}`);

      // Set up event handlers
      this.setupWebContentsEvents(webContentsView, tabId);

      // Store the view
      this.webContentsViews.set(tabId, webContentsView);

      // Load URL
      await webContentsView.webContents.loadURL(url);

      console.log(`[WebContentsManager] Tab created successfully: ${tabId}`);
      this.emit('tab-created', { tabId, url });

      return tabId;
    } catch (error) {
      console.error(`[WebContentsManager] Failed to create tab:`, error);
      throw error;
    }
  }

  /**
   * Switch to a tab
   */
  async switchTab(tabId) {
    if (!this.webContentsViews.has(tabId)) {
      throw new Error(`Tab ${tabId} not found`);
    }

    console.log(`[WebContentsManager] Switching to tab: ${tabId}`);

    try {
      const newView = this.webContentsViews.get(tabId);
      
      // Remove previous view if exists (Electron 37+ WebContentsView API)
      if (this.currentTabId && this.webContentsViews.has(this.currentTabId)) {
        const oldView = this.webContentsViews.get(this.currentTabId);
        try {
          if (this.mainWindow.contentView && this.mainWindow.contentView.children.includes(oldView)) {
            this.mainWindow.contentView.removeChildView(oldView);
            console.log(`[WebContentsManager] Removed old view: ${this.currentTabId}`);
          }
        } catch (e) {
          console.warn(`[WebContentsManager] Could not remove old view:`, e.message);
        }
      }
      
      // Add new view (Electron 37+ WebContentsView API)
      try {
        if (this.mainWindow.contentView) {
          this.mainWindow.contentView.addChildView(newView);
          console.log(`[WebContentsManager] Added WebContentsView: ${tabId}`);
          
          // Don't set bounds immediately - wait for precise bounds from BrowserTabComponent
          console.log(`[WebContentsManager] Waiting for precise bounds from BrowserTabComponent...`);
          
          // Hide the view initially to prevent flicker
          if (typeof newView.setVisible === 'function') {
            newView.setVisible(false);
            console.log(`[WebContentsManager] WebContentsView initially hidden to prevent flicker`);
          }
        } else {
          console.error(`[WebContentsManager] mainWindow.contentView not available`);
          throw new Error('MainWindow contentView API not available');
        }
      } catch (addError) {
        console.error(`[WebContentsManager] Failed to add view to window:`, addError);
        throw addError;
      }

      this.currentTabId = tabId;
      
      console.log(`[WebContentsManager] Switched to tab: ${tabId}`);
      this.emit('tab-switched', { tabId });

      return { id: tabId };
    } catch (error) {
      console.error(`[WebContentsManager] Failed to switch tab:`, error);
      throw error;
    }
  }

  /**
   * Load URL in current or specified tab
   */
  async loadURL(url, tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    
    if (!targetTabId || !this.webContentsViews.has(targetTabId)) {
      throw new Error('No active tab to load URL');
    }

    console.log(`[WebContentsManager] Loading URL: ${url} in tab: ${targetTabId}`);

    try {
      const webContentsView = this.webContentsViews.get(targetTabId);
      await webContentsView.webContents.loadURL(url);
      
      console.log(`[WebContentsManager] URL loaded successfully: ${url}`);
      this.emit('url-loaded', { tabId: targetTabId, url });
      
      return { success: true, url, tabId: targetTabId };
    } catch (error) {
      console.error(`[WebContentsManager] Failed to load URL:`, error);
      throw error;
    }
  }

  /**
   * Navigate back
   */
  async goBack(tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    
    if (!targetTabId || !this.webContentsViews.has(targetTabId)) {
      throw new Error('No active tab for navigation');
    }

    const webContentsView = this.webContentsViews.get(targetTabId);
    
    if (webContentsView.webContents.canGoBack()) {
      webContentsView.webContents.goBack();
      console.log(`[WebContentsManager] Navigated back in tab: ${targetTabId}`);
      return { success: true };
    } else {
      console.log(`[WebContentsManager] Cannot go back in tab: ${targetTabId}`);
      return { success: false, reason: 'Cannot go back' };
    }
  }

  /**
   * Navigate forward
   */
  async goForward(tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    
    if (!targetTabId || !this.webContentsViews.has(targetTabId)) {
      throw new Error('No active tab for navigation');
    }

    const webContentsView = this.webContentsViews.get(targetTabId);
    
    if (webContentsView.webContents.canGoForward()) {
      webContentsView.webContents.goForward();
      console.log(`[WebContentsManager] Navigated forward in tab: ${targetTabId}`);
      return { success: true };
    } else {
      console.log(`[WebContentsManager] Cannot go forward in tab: ${targetTabId}`);
      return { success: false, reason: 'Cannot go forward' };
    }
  }

  /**
   * Reload current tab
   */
  async reload(tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    
    if (!targetTabId || !this.webContentsViews.has(targetTabId)) {
      throw new Error('No active tab to reload');
    }

    const webContentsView = this.webContentsViews.get(targetTabId);
    webContentsView.webContents.reload();
    
    console.log(`[WebContentsManager] Reloaded tab: ${targetTabId}`);
    return { success: true, tabId: targetTabId };
  }

  /**
   * Execute JavaScript in the current tab
   */
  async executeScript(script, tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    
    if (!targetTabId || !this.webContentsViews.has(targetTabId)) {
      throw new Error('No active tab to execute script');
    }

    try {
      const webContentsView = this.webContentsViews.get(targetTabId);
      const result = await webContentsView.webContents.executeJavaScript(script);
      
      console.log(`[WebContentsManager] Script executed in tab: ${targetTabId}`);
      return result;
    } catch (error) {
      console.error(`[WebContentsManager] Script execution failed:`, error);
      throw error;
    }
  }

  /**
   * Get navigation state
   */
  getNavigationState(tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    
    if (!targetTabId || !this.webContentsViews.has(targetTabId)) {
      return {
        canGoBack: false,
        canGoForward: false,
        isLoading: false,
        url: 'about:blank',
        title: 'No Tab'
      };
    }

    const webContentsView = this.webContentsViews.get(targetTabId);
    const webContents = webContentsView.webContents;
    
    // Use new navigation API for Electron 37+
    const canGoBack = webContents.navigationHistory ? webContents.navigationHistory.canGoBack() : webContents.canGoBack();
    const canGoForward = webContents.navigationHistory ? webContents.navigationHistory.canGoForward() : webContents.canGoForward();
    
    return {
      canGoBack,
      canGoForward,
      isLoading: webContents.isLoading(),
      url: webContents.getURL(),
      title: webContents.getTitle()
    };
  }

  /**
   * Set explicit bounds for WebContentsView (Electron 37+)
   */
  setWebContentsViewBounds(webContentsView, preciseBounds = null) {
    let targetBounds;
    
    if (preciseBounds) {
      targetBounds = preciseBounds;
      console.log('[WebContentsManager] Using precise bounds for view:', targetBounds);
    } else {
      // Calculate default bounds that fill most of the window
      const windowBounds = this.mainWindow.getBounds();
      
      targetBounds = {
        x: 0,
        y: 0,
        width: windowBounds.width,
        height: windowBounds.height
      };
      
      console.log('[WebContentsManager] Using full window bounds for view:', targetBounds);
    }
    
    try {
      // In Electron 37+, WebContentsView should automatically size to its parent
      // But we can try to set bounds if the method exists
      if (typeof webContentsView.setBounds === 'function') {
        webContentsView.setBounds(targetBounds);
        console.log('[WebContentsManager] Explicit bounds set for WebContentsView:', targetBounds);
      } else {
        console.log('[WebContentsManager] WebContentsView bounds managed automatically, target bounds:', targetBounds);
        // Store the bounds for later use if needed
        this.lastRequestedBounds = targetBounds;
      }
    } catch (error) {
      console.warn('[WebContentsManager] Failed to set explicit bounds:', error.message);
    }
  }

  /**
   * Update WebContentsView bounds to match browser viewport area (Debounced)
   * Note: WebContentsView in Electron 37+ uses automatic positioning within contentView
   */
  updateWebContentsViewBounds(preciseBounds = null) {
    if (!this.currentTabId || !this.webContentsViews.has(this.currentTabId)) {
      console.log('[WebContentsManager] No active tab to update bounds');
      return;
    }

    // Clear any pending bounds update to debounce rapid calls
    if (this.boundsUpdateTimeout) {
      clearTimeout(this.boundsUpdateTimeout);
    }

    const webContentsView = this.webContentsViews.get(this.currentTabId);
    
    if (preciseBounds) {
      console.log('[WebContentsManager] Precise bounds received from component:', preciseBounds);
      // Use precise bounds from BrowserTabComponent
      this.lastRequestedBounds = preciseBounds;
    } else {
      // Calculate bounds for reference
      const windowBounds = this.mainWindow.getBounds();
      const estimatedBounds = {
        x: 20, // Left margin + border
        y: 140, // Title bar + header + browser controls
        width: Math.max(windowBounds.width - 320, 400), // Leave space for chat
        height: Math.max(windowBounds.height - 200, 300) // Leave space for controls
      };
      
      console.log('[WebContentsManager] Estimated default bounds:', estimatedBounds);
      this.lastRequestedBounds = estimatedBounds;
    }

    // Debounce bounds updates to improve performance
    this.boundsUpdateTimeout = setTimeout(() => {
      this.applyBoundsToView(webContentsView, this.lastRequestedBounds);
    }, 16); // ~60fps debounce
  }

  /**
   * Apply bounds to WebContentsView with optimizations
   */
  applyBoundsToView(webContentsView, bounds) {
    try {
      // Set the bounds on the view
      this.setWebContentsViewBounds(webContentsView, bounds);
      
      // Show the view after bounds are applied
      if (typeof webContentsView.setVisible === 'function') {
        webContentsView.setVisible(true);
        console.log('[WebContentsManager] WebContentsView made visible after bounds applied');
      }
    } catch (error) {
      console.error('[WebContentsManager] Failed to apply bounds to view:', error);
    }
  }

  /**
   * Set up WebContents event handlers
   */
  setupWebContentsEvents(webContentsView, tabId) {
    const webContents = webContentsView.webContents;

    webContents.on('did-navigate', (event, url) => {
      console.log(`[WebContentsManager] Tab ${tabId} navigated to: ${url}`);
      this.emit('navigation', { tabId, url, type: 'navigate' });
    });

    webContents.on('did-navigate-in-page', (event, url) => {
      console.log(`[WebContentsManager] Tab ${tabId} navigated in page to: ${url}`);
      this.emit('navigation', { tabId, url, type: 'navigate-in-page' });
    });

    webContents.on('did-finish-load', () => {
      const title = webContents.getTitle();
      const url = webContents.getURL();
      console.log(`[WebContentsManager] Tab ${tabId} finished loading: ${title}`);
      this.emit('loading-finished', { tabId, title, url });
    });

    webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error(`[WebContentsManager] Tab ${tabId} failed to load: ${errorDescription}`);
      this.emit('loading-failed', { tabId, errorCode, errorDescription, url: validatedURL });
    });

    webContents.on('page-title-updated', (event, title) => {
      console.log(`[WebContentsManager] Tab ${tabId} title updated: ${title}`);
      this.emit('title-updated', { tabId, title });
    });

    // Handle certificate errors - more permissive for development
    webContents.on('certificate-error', (event, url, error, certificate, callback) => {
      console.warn(`[WebContentsManager] Certificate error for ${url}: ${error}`);
      
      // For development, allow most certificate errors
      // In production, this should be more restrictive
      event.preventDefault();
      callback(true); // Accept the certificate
      
      console.log(`[WebContentsManager] Certificate error bypassed for: ${url}`);
    });

    // Handle loading states
    webContents.on('did-start-loading', () => {
      console.log(`[WebContentsManager] Tab ${tabId} started loading`);
      this.emit('loading-started', { tabId });
    });

    webContents.on('did-stop-loading', () => {
      console.log(`[WebContentsManager] Tab ${tabId} stopped loading`);
      this.emit('loading-stopped', { tabId });
    });
  }

  /**
   * Close tab
   */
  closeTab(tabId) {
    if (!this.webContentsViews.has(tabId)) {
      throw new Error(`Tab ${tabId} not found`);
    }

    console.log(`[WebContentsManager] Closing tab: ${tabId}`);

    const webContentsView = this.webContentsViews.get(tabId);
    
    // Remove from main window if it's the current tab
    if (this.currentTabId === tabId) {
      try {
        // Try new contentView API first (Electron 30+)
        if (this.mainWindow.contentView && this.mainWindow.contentView.children.includes(webContentsView)) {
          this.mainWindow.contentView.removeChildView(webContentsView);
          console.log(`[WebContentsManager] Removed view from window with contentView: ${tabId}`);
        }
      } catch (e) {
        console.warn(`[WebContentsManager] Could not remove view from window:`, e.message);
      }
      this.currentTabId = null;
    }

    // Clean up the WebContentsView
    webContentsView.webContents.close();
    this.webContentsViews.delete(tabId);

    console.log(`[WebContentsManager] Tab closed: ${tabId}`);
    this.emit('tab-closed', { tabId });
  }

  /**
   * Get current tab
   */
  getCurrentTab() {
    if (this.currentTabId && this.webContentsViews.has(this.currentTabId)) {
      return { id: this.currentTabId };
    }
    return null;
  }

  /**
   * Get all tabs
   */
  getAllTabs() {
    const tabs = [];
    for (const [tabId, webContentsView] of this.webContentsViews) {
      const webContents = webContentsView.webContents;
      tabs.push({
        id: tabId,
        title: webContents.getTitle(),
        url: webContents.getURL(),
        isActive: tabId === this.currentTabId
      });
    }
    return tabs;
  }

  /**
   * Destroy WebContentsManager
   */
  destroy() {
    console.log('[WebContentsManager] Starting cleanup...');
    
    // Close all tabs
    for (const tabId of this.webContentsViews.keys()) {
      try {
        this.closeTab(tabId);
      } catch (error) {
        console.error(`[WebContentsManager] Error closing tab ${tabId}:`, error);
      }
    }

    this.webContentsViews.clear();
    this.currentTabId = null;
    this.mainWindow = null;
    this.isInitialized = false;
    
    // Remove all event listeners
    this.removeAllListeners();
    
    console.log('[WebContentsManager] Destroyed and cleaned up');
  }
}

export default WebContentsManager;
