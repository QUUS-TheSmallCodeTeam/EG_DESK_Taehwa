/**
 * BrowserTabComponent - Reusable Browser Tab Component
 * 
 * A self-contained browser component with integrated URL bar and navigation
 * that can be used in any workspace. Follows the modular architecture
 * specified in the PRD for maximum reusability.
 */

class BrowserTabComponent {
  constructor(containerId, webContentsManager) {
    this.containerId = containerId;
    this.webContentsManager = webContentsManager;
    this.container = null;
    this.elements = {};
    this.isInitialized = false;
    this.currentTabId = null;
    
    console.log(`[BrowserTabComponent] Constructor called with:`, {
      containerId,
      webContentsManager: !!webContentsManager,
      webContentsManagerType: typeof webContentsManager
    });
  }

  /**
   * Initialize the browser tab component
   */
  async initialize() {
    console.log(`[BrowserTabComponent] ⚡ Starting initialization for: ${this.containerId}`);
    
    // Extensive container debugging
    console.log(`[BrowserTabComponent] Searching for container: ${this.containerId}`);
    console.log(`[BrowserTabComponent] Document ready state:`, document.readyState);
    console.log(`[BrowserTabComponent] All elements with 'container' in ID:`, 
      Array.from(document.querySelectorAll('[id*="container"]')).map(el => ({ id: el.id, className: el.className })));
    
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`[BrowserTabComponent] ❌ FATAL: Container with ID "${this.containerId}" not found`);
      
      // More comprehensive debugging
      console.log(`[BrowserTabComponent] All elements by querySelector:`, 
        Array.from(document.querySelectorAll('*')).filter(el => el.id).map(el => el.id));
      console.log(`[BrowserTabComponent] Body innerHTML length:`, document.body.innerHTML.length);
      console.log(`[BrowserTabComponent] Available IDs:`, 
        Array.from(document.querySelectorAll('[id]')).map(el => el.id));
      
      throw new Error(`Container with ID "${this.containerId}" not found`);
    }

    console.log(`[BrowserTabComponent] Found container:`, {
      id: this.container.id,
      offsetWidth: this.container.offsetWidth,
      offsetHeight: this.container.offsetHeight,
      clientWidth: this.container.clientWidth,
      clientHeight: this.container.clientHeight
    });

    try {
      console.log(`[BrowserTabComponent] 🎨 Starting render...`);
      this.render();
      console.log(`[BrowserTabComponent] ✅ Render completed successfully`);
      
      console.log(`[BrowserTabComponent] 🎯 Setting up event listeners...`);
      this.setupEventListeners();
      console.log(`[BrowserTabComponent] ✅ Event listeners setup completed`);
      
      console.log(`[BrowserTabComponent] 🌐 Setting up WebContents events...`);
      this.setupWebContentsEvents();
      console.log(`[BrowserTabComponent] ✅ WebContents events setup completed`);
      
      // Force initial bounds calculation after DOM is ready
      console.log(`[BrowserTabComponent] 📐 Calculating initial bounds...`);
      setTimeout(() => {
        try {
          console.log(`[BrowserTabComponent] 📐 Attempting bounds calculation...`);
          this.updateWebContentsViewBounds();
          console.log(`[BrowserTabComponent] ✅ Initial bounds update completed`);
        } catch (boundsError) {
          console.error(`[BrowserTabComponent] ❌ Initial bounds calculation failed:`, boundsError);
        }
      }, 200);
      
      this.isInitialized = true;
      console.log(`[BrowserTabComponent] 🎉 Initialization completed successfully for: ${this.containerId}`);
    } catch (error) {
      console.error(`[BrowserTabComponent] ❌ FATAL: Initialization failed:`, error);
      console.error(`[BrowserTabComponent] Error details:`, {
        message: error.message,
        stack: error.stack,
        containerId: this.containerId,
        containerExists: !!this.container,
        webContentsManager: !!this.webContentsManager
      });
      throw error;
    }
  }

  /**
   * Render the browser tab component HTML
   */
  render() {
    this.container.innerHTML = `
      <div class="browser-tab-component">
        <!-- Browser Controls Bar -->
        <div class="browser-controls">
          <div class="control-group">
            <button id="${this.containerId}-back-btn" class="nav-btn" title="뒤로가기" disabled>←</button>
            <button id="${this.containerId}-forward-btn" class="nav-btn" title="앞으로가기" disabled>→</button>
            <button id="${this.containerId}-reload-btn" class="nav-btn" title="새로고침">↻</button>
          </div>
          <div class="address-group">
            <input 
              type="text" 
              id="${this.containerId}-address-bar" 
              class="address-bar" 
              placeholder="URL을 입력하세요..." 
              value="https://m8chaa.mycafe24.com/"
            />
            <button id="${this.containerId}-go-btn" class="go-btn">이동</button>
          </div>
        </div>
        
        <!-- Browser Viewport -->
        <div class="browser-viewport">
          <div id="${this.containerId}-browser-placeholder" class="browser-placeholder">
            <div class="placeholder-content">
              <h3>🌐 브라우저 탭</h3>
              <p>웹사이트가 이 영역에 표시됩니다</p>
              <p>URL을 입력하거나 이동 버튼을 클릭하세요</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Cache DOM elements
    this.elements = {
      backBtn: document.getElementById(`${this.containerId}-back-btn`),
      forwardBtn: document.getElementById(`${this.containerId}-forward-btn`),
      reloadBtn: document.getElementById(`${this.containerId}-reload-btn`),
      addressBar: document.getElementById(`${this.containerId}-address-bar`),
      goBtn: document.getElementById(`${this.containerId}-go-btn`),
      placeholder: document.getElementById(`${this.containerId}-browser-placeholder`)
    };

    // Add component-specific styles
    this.addStyles();
  }

  /**
   * Add CSS styles for the browser tab component
   */
  addStyles() {
    const styleId = `browser-tab-component-styles`;
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .browser-tab-component {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: white;
        border-radius: 0.5rem; /* 8px */
        box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.1); /* 0 2px 8px */
        border: 2px solid #007bff; /* Blue border for differentiation */
        overflow: hidden;
      }

      .browser-controls {
        display: flex;
        align-items: center;
        padding: 0.75rem 1rem; /* 12px 16px */
        background: #f8f9fa;
        border-bottom: 1px solid #e9ecef;
        gap: 0.75rem; /* 12px */
        flex-shrink: 0;
        flex-wrap: wrap; /* Allow wrapping on smaller screens */
      }

      .control-group {
        display: flex;
        gap: 0.25rem; /* 4px */
        background: #e9ecef;
        border-radius: 0.375rem; /* 6px */
        padding: 0.25rem; /* 4px */
      }

      .nav-btn {
        width: 2rem; /* 32px */
        height: 2rem; /* 32px */
        border: none;
        background: transparent;
        border-radius: 0.25rem; /* 4px */
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.875rem; /* 14px */
        font-weight: 600;
        color: #495057;
        transition: all 0.2s ease;
      }

      .nav-btn:hover:not(:disabled) {
        background: #ced4da;
        color: #212529;
      }

      .nav-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .address-group {
        display: flex;
        flex: 1;
        gap: 0.5rem; /* 8px */
        align-items: center;
      }

      .address-bar {
        flex: 1;
        height: 2.25rem; /* 36px */
        border: 1px solid #ced4da;
        border-radius: 0.375rem; /* 6px */
        padding: 0 0.75rem; /* 0 12px */
        font-size: 0.8125rem; /* 13px */
        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        background: white;
      }

      .address-bar:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 0.125rem rgba(0, 123, 255, 0.25); /* 0 0 0 2px */
      }

      .go-btn {
        height: 2.25rem; /* 36px */
        padding: 0 1rem; /* 0 16px */
        border: none;
        background: #007bff;
        color: white;
        border-radius: 0.375rem; /* 6px */
        cursor: pointer;
        font-size: 0.8125rem; /* 13px */
        font-weight: 600;
        transition: background-color 0.2s ease;
      }

      .go-btn:hover {
        background: #0056b3;
      }

      .browser-viewport {
        flex: 1;
        position: relative;
        background: #f8f9fa;
        /* Remove padding so WebContentsView can fill the entire area */
        padding: 0;
        box-sizing: border-box;
      }

      .browser-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: #6c757d;
      }

      .browser-placeholder.hidden {
        display: none;
      }

      .placeholder-content h3 {
        font-size: 1.2rem;
        margin-bottom: 0.5rem; /* 8px */
        color: #495057;
      }

      .placeholder-content p {
        margin: 0.25rem 0; /* 4px 0 */
        font-size: 0.875rem; /* 14px */
        line-height: 1.5;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .browser-controls {
          flex-direction: column;
          align-items: stretch;
          gap: 0.5rem; /* Adjust gap for vertical layout */
        }

        .control-group {
          justify-content: center; /* Center buttons when stacked */
          width: 100%; /* Take full width */
        }

        .address-group {
          width: 100%; /* Take full width */
          min-width: unset; /* Remove min-width constraint */
        }

        .address-bar {
          min-width: unset; /* Remove min-width constraint */
        }

        .go-btn {
          width: 100%; /* Make go button full width */
        }
      }

      @media (max-width: 480px) {
        .browser-controls {
          padding: 0.5rem 0.75rem; /* Smaller padding on very small screens */
        }

        .nav-btn {
          width: 1.75rem; /* Slightly smaller buttons */
          height: 1.75rem;
          font-size: 0.75rem;
        }

        .address-bar, .go-btn {
          height: 2rem; /* Slightly smaller height for input/button */
          font-size: 0.75rem;
        }

        .address-bar {
          padding: 0 0.5rem;
        }

        .go-btn {
          padding: 0 0.75rem;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Set up event listeners for browser controls
   */
  setupEventListeners() {
    // Address bar navigation
    this.elements.addressBar?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.navigateToURL(this.elements.addressBar.value);
      }
    });

    // Go button
    this.elements.goBtn?.addEventListener('click', () => {
      this.navigateToURL(this.elements.addressBar.value);
    });

    // Navigation buttons
    this.elements.backBtn?.addEventListener('click', () => {
      this.goBack();
    });

    this.elements.forwardBtn?.addEventListener('click', () => {
      this.goForward();
    });

    this.elements.reloadBtn?.addEventListener('click', () => {
      this.reload();
    });
  }

  /**
   * Set up WebContentsManager event listeners
   */
  setupWebContentsEvents() {
    this.webContentsManager.on('navigation', (data) => {
      if (data.tabId === this.currentTabId) {
        this.updateAddressBar(data.url);
        this.updateNavigationButtons();
        this.hidePlaceholder();
      }
    });

    this.webContentsManager.on('loading-started', (data) => {
      if (data.tabId === this.currentTabId) {
        this.setLoadingState(true);
      }
    });

    this.webContentsManager.on('loading-finished', (data) => {
      if (data.tabId === this.currentTabId) {
        this.setLoadingState(false);
        this.updateNavigationButtons();
      }
    });

    this.webContentsManager.on('loading-failed', (data) => {
      if (data.tabId === this.currentTabId) {
        this.setLoadingState(false);
        this.showError(`페이지 로드 실패: ${data.errorDescription}`);
      }
    });
  }

  /**
   * Calculate precise bounds for WebContentsView based on actual DOM elements
   */
  calculateWebContentsViewBounds() {
    const viewport = this.container.querySelector('.browser-viewport');
    if (!viewport) {
      console.warn(`[BrowserTabComponent] .browser-viewport not found in container ${this.containerId}`);
      return null;
    }

    // Wait for layout to be stable
    if (viewport.offsetWidth === 0 || viewport.offsetHeight === 0) {
      console.warn(`[BrowserTabComponent] Viewport has zero dimensions, waiting...`);
      return null;
    }

    const viewportRect = viewport.getBoundingClientRect();
    
    // WebContentsView should fill the entire .browser-viewport area exactly
    const bounds = {
      x: Math.round(viewportRect.left),
      y: Math.round(viewportRect.top),
      width: Math.round(viewportRect.width),
      height: Math.round(viewportRect.height)
    };

    console.log(`[BrowserTabComponent] Calculated precise bounds:`, bounds);
    console.log(`[BrowserTabComponent] Container:`, this.container.getBoundingClientRect());
    console.log(`[BrowserTabComponent] Viewport rect:`, viewportRect);
    console.log(`[BrowserTabComponent] Viewport offsetWidth/Height:`, viewport.offsetWidth, viewport.offsetHeight);
    
    // Validate bounds make sense
    if (bounds.width <= 0 || bounds.height <= 0) {
      console.warn(`[BrowserTabComponent] Invalid bounds calculated:`, bounds);
      return null;
    }
    
    return bounds;
  }

  /**
   * Update WebContentsView bounds to match the viewport area
   */
  updateWebContentsViewBounds(retryCount = 0) {
    if (!this.currentTabId) return;

    const bounds = this.calculateWebContentsViewBounds();
    if (!bounds) {
      if (retryCount < 3) {
        console.warn(`[BrowserTabComponent] Could not calculate bounds, retrying in 100ms (attempt ${retryCount + 1}/3)`);
        setTimeout(() => {
          this.updateWebContentsViewBounds(retryCount + 1);
        }, 100);
        return;
      } else {
        console.warn('[BrowserTabComponent] Failed to calculate bounds after 3 attempts, using fallback');
        this.webContentsManager.updateWebContentsViewBounds();
        return;
      }
    }

    console.log(`[BrowserTabComponent] Sending precise bounds to WebContentsManager:`, bounds);
    // Request WebContentsManager to update bounds with our calculated values
    this.webContentsManager.updateWebContentsViewBounds(bounds);
  }

  /**
   * Create and activate a new browser tab
   */
  async createTab(url = 'about:blank') {
    try {
      const tabId = await this.webContentsManager.createTab(url);
      await this.webContentsManager.switchTab(tabId);
      this.currentTabId = tabId;
      
      this.updateAddressBar(url);
      this.hidePlaceholder();
      this.updateNavigationButtons();
      
      // Update WebContentsView bounds after DOM is fully ready
      setTimeout(() => {
        this.updateWebContentsViewBounds();
      }, 200);
      
      // Also update bounds on window resize
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', () => {
          setTimeout(() => {
            this.updateWebContentsViewBounds();
          }, 100);
        });
      }
      
      console.log(`[BrowserTabComponent] Created and activated tab: ${tabId}`);
      return tabId;
    } catch (error) {
      console.error('[BrowserTabComponent] Failed to create tab:', error);
      this.showError(`탭 생성 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * Navigate to a URL
   */
  async navigateToURL(url) {
    if (!url || !url.trim()) {
      console.warn('[BrowserTabComponent] Empty URL provided');
      return;
    }

    try {
      const validatedUrl = this.validateURL(url);
      
      if (!this.currentTabId) {
        // Create new tab if none exists
        await this.createTab(validatedUrl);
      } else {
        // Navigate existing tab
        await this.webContentsManager.loadURL(validatedUrl, this.currentTabId);
      }
      
      console.log(`[BrowserTabComponent] Navigated to: ${validatedUrl}`);
    } catch (error) {
      console.error('[BrowserTabComponent] Navigation failed:', error);
      this.showError(`탐색 실패: ${error.message}`);
    }
  }

  /**
   * Validate and normalize URL
   */
  validateURL(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('유효하지 않은 URL입니다');
    }

    url = url.trim();
    
    // Add protocol if missing
    if (!url.match(/^https?:\/\//)) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url;
      } else {
        // Treat as search query
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
    }

    // Basic URL validation
    try {
      new URL(url);
      return url;
    } catch (error) {
      throw new Error('올바른 URL 형식이 아닙니다');
    }
  }

  /**
   * Browser navigation methods
   */
  async goBack() {
    if (!this.currentTabId) return false;
    
    try {
      const success = await this.webContentsManager.goBack(this.currentTabId);
      if (success) {
        this.updateNavigationButtons();
      }
      return success;
    } catch (error) {
      console.error('[BrowserTabComponent] Go back failed:', error);
      return false;
    }
  }

  async goForward() {
    if (!this.currentTabId) return false;
    
    try {
      const success = await this.webContentsManager.goForward(this.currentTabId);
      if (success) {
        this.updateNavigationButtons();
      }
      return success;
    } catch (error) {
      console.error('[BrowserTabComponent] Go forward failed:', error);
      return false;
    }
  }

  async reload() {
    if (!this.currentTabId) return false;
    
    try {
      return await this.webContentsManager.reload(this.currentTabId);
    } catch (error) {
      console.error('[BrowserTabComponent] Reload failed:', error);
      return false;
    }
  }

  /**
   * UI update methods
   */
  updateAddressBar(url) {
    if (this.elements.addressBar && url && url !== 'about:blank') {
      this.elements.addressBar.value = url;
    }
  }

  updateNavigationButtons() {
    if (!this.currentTabId) return;
    
    const state = this.webContentsManager.getNavigationState(this.currentTabId);
    
    if (this.elements.backBtn) {
      this.elements.backBtn.disabled = !state.canGoBack;
    }
    
    if (this.elements.forwardBtn) {
      this.elements.forwardBtn.disabled = !state.canGoForward;
    }
  }

  setLoadingState(isLoading) {
    if (this.elements.reloadBtn) {
      this.elements.reloadBtn.innerHTML = isLoading ? '⏸' : '↻';
      this.elements.reloadBtn.title = isLoading ? '로딩 중지' : '새로고침';
    }

    if (this.elements.addressBar) {
      this.elements.addressBar.style.opacity = isLoading ? '0.7' : '1';
    }
  }

  hidePlaceholder() {
    if (this.elements.placeholder) {
      this.elements.placeholder.classList.add('hidden');
    }
  }

  showPlaceholder() {
    if (this.elements.placeholder) {
      this.elements.placeholder.classList.remove('hidden');
    }
  }

  showError(message) {
    console.error('[BrowserTabComponent]', message);
    // Could implement a toast notification or status bar here
  }

  /**
   * Get current tab information
   */
  getCurrentTab() {
    if (!this.currentTabId) return null;
    return this.webContentsManager.getCurrentTab();
  }

  /**
   * Execute script in current tab
   */
  async executeScript(script) {
    if (!this.currentTabId) {
      throw new Error('No active tab for script execution');
    }
    
    return await this.webContentsManager.executeScript(script, this.currentTabId);
  }

  /**
   * Load initial URL (call after initialization)
   */
  async loadInitialURL() {
    console.log(`[BrowserTabComponent] 🚀 loadInitialURL called`);
    const initialUrl = this.elements.addressBar?.value || 'https://m8chaa.mycafe24.com/';
    console.log(`[BrowserTabComponent] 🌐 Loading initial URL: ${initialUrl}`);
    
    try {
      await this.navigateToURL(initialUrl);
      console.log(`[BrowserTabComponent] ✅ Initial URL loaded successfully: ${initialUrl}`);
    } catch (error) {
      console.error(`[BrowserTabComponent] ❌ Failed to load initial URL:`, error);
      throw error;
    }
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.currentTabId) {
      this.webContentsManager.closeTab(this.currentTabId);
    }
    
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    this.currentTabId = null;
    this.isInitialized = false;
    
    console.log(`[BrowserTabComponent] Destroyed: ${this.containerId}`);
  }
}

// ES6 export
export default BrowserTabComponent;
