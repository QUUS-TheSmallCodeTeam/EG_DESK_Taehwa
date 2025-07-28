/**
 * WebContentsManager - Main Process Browser Management
 * 
 * Manages BrowserView instances for embedded web content in the main process.
 * Uses BrowserView API for better compatibility.
 */

import { BrowserView } from 'electron';
import { EventEmitter } from 'events';

class WebContentsManager extends EventEmitter {
  constructor() {
    super();
    this.mainWindow = null;
    this.webContentsViews = new Map();
    this.currentTabId = null;
    this.isInitialized = false;
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
   * Create a new tab with BrowserView
   */
  async createTab(url = 'about:blank') {
    if (!this.isInitialized) {
      throw new Error('WebContentsManager not initialized');
    }

    const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    console.log(`[WebContentsManager] Creating tab: ${tabId} with URL: ${url}`);

    try {
      // Create BrowserView
      const browserView = new BrowserView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true,
          sandbox: true
        }
      });

      // Set up event handlers
      this.setupWebContentsEvents(browserView, tabId);

      // Store the view
      this.webContentsViews.set(tabId, browserView);

      // Load URL
      await browserView.webContents.loadURL(url);

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
      
      // Remove previous view if exists
      if (this.currentTabId && this.webContentsViews.has(this.currentTabId)) {
        const oldView = this.webContentsViews.get(this.currentTabId);
        try {
          // Try different methods to remove the old view
          if (this.mainWindow.removeBrowserView) {
            this.mainWindow.removeBrowserView(oldView);
            console.log(`[WebContentsManager] Removed old view with removeBrowserView: ${this.currentTabId}`);
          } else if (this.mainWindow.contentView && this.mainWindow.contentView.removeChildView) {
            this.mainWindow.contentView.removeChildView(oldView);
            console.log(`[WebContentsManager] Removed old view with removeChildView: ${this.currentTabId}`);
          } else {
            console.log(`[WebContentsManager] No method available to remove old view`);
          }
        } catch (e) {
          console.warn(`[WebContentsManager] Could not remove old view:`, e.message);
        }
      }
      
      // Add new view using available methods
      try {
        if (this.mainWindow.addBrowserView) {
          this.mainWindow.addBrowserView(newView);
          console.log(`[WebContentsManager] Added view with addBrowserView: ${tabId}`);
        } else if (this.mainWindow.contentView && this.mainWindow.contentView.addChildView) {
          this.mainWindow.contentView.addChildView(newView);
          console.log(`[WebContentsManager] Added view with addChildView: ${tabId}`);
        } else if (this.mainWindow.setContentView) {
          this.mainWindow.setContentView(newView);
          console.log(`[WebContentsManager] Set view as contentView: ${tabId}`);
        } else {
          throw new Error('No method available to add WebContentsView to window');
        }
      } catch (addError) {
        console.error(`[WebContentsManager] Failed to add view to window:`, addError);
        throw addError;
      }

      // Update bounds to fit the browser viewport area
      this.updateWebContentsViewBounds();

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
    
    return {
      canGoBack: webContents.canGoBack(),
      canGoForward: webContents.canGoForward(),
      isLoading: webContents.isLoading(),
      url: webContents.getURL(),
      title: webContents.getTitle()
    };
  }

  /**
   * Update WebContentsView bounds to match browser viewport area
   */
  updateWebContentsViewBounds(preciseBounds = null) {
    if (!this.currentTabId || !this.webContentsViews.has(this.currentTabId)) {
      console.log('[WebContentsManager] No active tab to update bounds');
      return;
    }

    const webContentsView = this.webContentsViews.get(this.currentTabId);
    
    let targetBounds;
    
    if (preciseBounds) {
      // Use precise bounds from BrowserTabComponent
      targetBounds = preciseBounds;
      console.log('[WebContentsManager] Using precise bounds from component:', targetBounds);
    } else {
      // Calculate bounds for browser viewport area
      // The browser-viewport-area should be positioned within the browser component
      const windowBounds = this.mainWindow.getBounds();
      
      // Rough estimate: browser viewport is in the browser component area
      // This will be overridden by precise bounds from the renderer
      targetBounds = {
        x: 20, // Left margin + border
        y: 140, // Title bar + header + browser controls
        width: Math.max(windowBounds.width - 320, 400), // Leave space for chat
        height: Math.max(windowBounds.height - 200, 300) // Leave space for controls
      };
      
      console.log('[WebContentsManager] Using calculated default bounds:', targetBounds);
    }
    
    // Check if WebContentsView has setBounds method
    if (typeof webContentsView.setBounds === 'function') {
      try {
        webContentsView.setBounds(targetBounds);
        console.log('[WebContentsManager] ✅ WebContentsView bounds set successfully');
      } catch (error) {
        console.error('[WebContentsManager] ❌ Failed to set WebContentsView bounds:', error);
      }
    } else {
      console.log('[WebContentsManager] ⚠️ WebContentsView.setBounds not available');
      console.log('[WebContentsManager] Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(webContentsView)));
      
      // Try alternative method if available
      if (webContentsView.webContents && typeof webContentsView.webContents.setSize === 'function') {
        try {
          webContentsView.webContents.setSize(targetBounds.width, targetBounds.height);
          console.log('[WebContentsManager] Used webContents.setSize as fallback');
        } catch (error) {
          console.error('[WebContentsManager] Fallback setSize also failed:', error);
        }
      }
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
      // For Electron v30+, we need to set contentView to null or another view
      // Since we don't have another view, we'll just clear the current tab reference
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
