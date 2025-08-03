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

      // Set up event handlers
      this.setupWebContentsEvents(webContentsView, tabId);

      // Store the view
      this.webContentsViews.set(tabId, webContentsView);

      // Load URL
      await webContentsView.webContents.loadURL(url);

      this.emit('tab-created', { tabId, url });

      return tabId;
    } catch (error) {
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


    try {
      const newView = this.webContentsViews.get(tabId);
      
      // Remove previous view if exists (Electron 37+ WebContentsView API)
      if (this.currentTabId && this.webContentsViews.has(this.currentTabId)) {
        const oldView = this.webContentsViews.get(this.currentTabId);
        try {
          if (this.mainWindow.contentView && this.mainWindow.contentView.children.includes(oldView)) {
            this.mainWindow.contentView.removeChildView(oldView);
          }
        } catch (e) {
        }
      }
      
      // Add new view (Electron 37+ WebContentsView API)
      try {
        if (this.mainWindow.contentView) {
          this.mainWindow.contentView.addChildView(newView);
          
          // Don't set bounds immediately - wait for precise bounds from BrowserTabComponent
          
          // Hide the view initially to prevent flicker
          if (typeof newView.setVisible === 'function') {
            newView.setVisible(false);
          }
        } else {
          throw new Error('MainWindow contentView API not available');
        }
      } catch (addError) {
        throw addError;
      }

      this.currentTabId = tabId;
      
      this.emit('tab-switched', { tabId });

      return { id: tabId };
    } catch (error) {
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


    try {
      const webContentsView = this.webContentsViews.get(targetTabId);
      await webContentsView.webContents.loadURL(url);
      
      this.emit('url-loaded', { tabId: targetTabId, url });
      
      return { success: true, url, tabId: targetTabId };
    } catch (error) {
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
      return { success: true };
    } else {
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
      return { success: true };
    } else {
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
      
      return result;
    } catch (error) {
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
    } else {
      // Calculate default bounds that fill most of the window
      const windowBounds = this.mainWindow.getBounds();
      
      targetBounds = {
        x: 0,
        y: 0,
        width: windowBounds.width,
        height: windowBounds.height
      };
      
    }
    
    try {
      // In Electron 37+, WebContentsView should automatically size to its parent
      // But we can try to set bounds if the method exists
      if (typeof webContentsView.setBounds === 'function') {
        webContentsView.setBounds(targetBounds);
      } else {
        // Store the bounds for later use if needed
        this.lastRequestedBounds = targetBounds;
      }
    } catch (error) {
    }
  }

  /**
   * Update WebContentsView bounds to match browser viewport area (Debounced)
   * Note: WebContentsView in Electron 37+ uses automatic positioning within contentView
   */
  updateWebContentsViewBounds(preciseBounds = null) {
    if (!this.currentTabId || !this.webContentsViews.has(this.currentTabId)) {
      return;
    }

    // Clear any pending bounds update to debounce rapid calls
    if (this.boundsUpdateTimeout) {
      clearTimeout(this.boundsUpdateTimeout);
    }

    const webContentsView = this.webContentsViews.get(this.currentTabId);
    
    if (preciseBounds) {
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
      }
    } catch (error) {
    }
  }

  /**
   * Set up WebContents event handlers
   */
  setupWebContentsEvents(webContentsView, tabId) {
    const webContents = webContentsView.webContents;

    webContents.on('did-navigate', (event, url) => {
      this.emit('navigation', { tabId, url, type: 'navigate' });
    });

    webContents.on('did-navigate-in-page', (event, url) => {
      this.emit('navigation', { tabId, url, type: 'navigate-in-page' });
    });

    webContents.on('did-finish-load', () => {
      const title = webContents.getTitle();
      const url = webContents.getURL();
      this.emit('loading-finished', { tabId, title, url });
    });

    webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      this.emit('loading-failed', { tabId, errorCode, errorDescription, url: validatedURL });
    });

    webContents.on('page-title-updated', (event, title) => {
      this.emit('title-updated', { tabId, title });
    });

    // Handle certificate errors - more permissive for development
    webContents.on('certificate-error', (event, url, error, certificate, callback) => {
      
      // For development, allow most certificate errors
      // In production, this should be more restrictive
      event.preventDefault();
      callback(true); // Accept the certificate
      
    });

    // Handle loading states
    webContents.on('did-start-loading', () => {
      this.emit('loading-started', { tabId });
    });

    webContents.on('did-stop-loading', () => {
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


    const webContentsView = this.webContentsViews.get(tabId);
    
    // Remove from main window if it's the current tab
    if (this.currentTabId === tabId) {
      try {
        // Try new contentView API first (Electron 30+)
        if (this.mainWindow.contentView && this.mainWindow.contentView.children.includes(webContentsView)) {
          this.mainWindow.contentView.removeChildView(webContentsView);
        }
      } catch (e) {
      }
      this.currentTabId = null;
    }

    // Clean up the WebContentsView
    webContentsView.webContents.close();
    this.webContentsViews.delete(tabId);

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
    
    // Close all tabs
    for (const tabId of this.webContentsViews.keys()) {
      try {
        this.closeTab(tabId);
      } catch (error) {
      }
    }

    this.webContentsViews.clear();
    this.currentTabId = null;
    this.mainWindow = null;
    this.isInitialized = false;
    
    // Remove all event listeners
    this.removeAllListeners();
    
  }
}

export default WebContentsManager;
