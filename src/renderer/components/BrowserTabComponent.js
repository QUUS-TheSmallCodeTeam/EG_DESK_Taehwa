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
    // CSS 클래스 적용 디버깅
    console.log('[CSS-DEBUG] BrowserTabComponent render() - Starting render process');
    console.log('[CSS-DEBUG] Container classes before render:', this.container.className);
    console.log('[CSS-DEBUG] Container computed styles:', {
      display: window.getComputedStyle(this.container).display,
      background: window.getComputedStyle(this.container).backgroundColor,
      border: window.getComputedStyle(this.container).border
    });
    
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

    // CSS 디버깅 - 렌더링 후 스타일 확인
    setTimeout(() => {
      const browserComponent = this.container.querySelector('.browser-tab-component');
      const browserControls = this.container.querySelector('.browser-controls');
      const componentContainer = document.querySelector('.component-container');
      
      // 메인 프로세스로 CSS 디버깅 정보 전송
      if (window.electronAPI?.log?.info) {
        window.electronAPI.log.info('[CSS-DEBUG] After render - Component structure:', {
          browserComponentExists: !!browserComponent,
          browserControlsExists: !!browserControls,
          componentContainerExists: !!componentContainer
        });
      }
      
      if (browserComponent) {
        const browserStyles = {
          background: window.getComputedStyle(browserComponent).backgroundColor,
          border: window.getComputedStyle(browserComponent).border,
          borderRadius: window.getComputedStyle(browserComponent).borderRadius,
          boxShadow: window.getComputedStyle(browserComponent).boxShadow
        };
        
        if (window.electronAPI?.log?.info) {
          window.electronAPI.log.info('[CSS-DEBUG] browser-tab-component styles:', browserStyles);
        }
        
        // CSS가 적용되지 않은 것으로 보이면 경고
        if (browserStyles.background === 'rgba(0, 0, 0, 0)' || browserStyles.background === 'transparent') {
          if (window.electronAPI?.log?.warn) {
            window.electronAPI.log.warn('[CSS-DEBUG] WARNING: No background color applied to browser-tab-component!');
          }
        }
      }
      
      if (browserControls) {
        const controlStyles = {
          background: window.getComputedStyle(browserControls).backgroundColor,
          padding: window.getComputedStyle(browserControls).padding,
          borderBottom: window.getComputedStyle(browserControls).borderBottom
        };
        
        if (window.electronAPI?.log?.info) {
          window.electronAPI.log.info('[CSS-DEBUG] browser-controls styles:', controlStyles);
        }
      }
      
      // component-container 스타일 확인
      if (componentContainer) {
        const containerStyles = {
          background: window.getComputedStyle(componentContainer).backgroundColor,
          border: window.getComputedStyle(componentContainer).border,
          borderRadius: window.getComputedStyle(componentContainer).borderRadius,
          boxShadow: window.getComputedStyle(componentContainer).boxShadow
        };
        
        if (window.electronAPI?.log?.info) {
          window.electronAPI.log.info('[CSS-DEBUG] component-container styles:', containerStyles);
        }
        
        // CSS가 적용되지 않은 것으로 보이면 경고
        if (containerStyles.background === 'rgba(0, 0, 0, 0)' || containerStyles.background === 'transparent') {
          if (window.electronAPI?.log?.warn) {
            window.electronAPI.log.warn('[CSS-DEBUG] WARNING: No background color applied to component-container!');
            window.electronAPI.log.warn('[CSS-DEBUG] Check if CSS is loaded correctly in index.html');
          }
        }
      }
      
      // 모든 스타일시트 확인
      if (window.electronAPI?.log?.info) {
        window.electronAPI.log.info('[CSS-DEBUG] Document stylesheets count:', document.styleSheets.length);
        
        // 스타일시트 내용에서 component-container 찾기
        let foundComponentContainerStyle = false;
        Array.from(document.styleSheets).forEach((sheet, index) => {
          try {
            if (sheet.cssRules) {
              for (let rule of sheet.cssRules) {
                if (rule.selectorText && rule.selectorText.includes('.component-container')) {
                  foundComponentContainerStyle = true;
                  window.electronAPI.log.info('[CSS-DEBUG] Found .component-container rule in stylesheet:', {
                    selector: rule.selectorText,
                    styles: rule.style.cssText.substring(0, 100) + '...'
                  });
                }
              }
            }
          } catch (e) {
            // CORS 에러 무시
          }
        });
        
        if (!foundComponentContainerStyle) {
          window.electronAPI.log.error('[CSS-DEBUG] ERROR: .component-container styles not found in any stylesheet!');
        }
      }
    }, 100);

    // Styles are now handled by index.html CSS instead of injection
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
      if (retryCount < 5) { // Increase retries
        console.warn(`[BrowserTabComponent] Could not calculate bounds, retrying in 200ms (attempt ${retryCount + 1}/5)`);
        setTimeout(() => {
          this.updateWebContentsViewBounds(retryCount + 1);
        }, 200); // Increase delay to allow more time for DOM readiness
        return;
      } else {
        console.warn('[BrowserTabComponent] Failed to calculate bounds after 5 attempts, using fallback');
        this.webContentsManager.updateWebContentsViewBounds();
        return;
      }
    }

    // Check if DOM is ready before updating bounds
    if (document.readyState !== 'complete') {
      console.warn('[BrowserTabComponent] Document not fully ready, delaying bounds update');
      setTimeout(() => {
        this.updateWebContentsViewBounds(retryCount);
      }, 100);
      return;
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

    // Dynamic style modification removed - loading state should be handled by CSS classes
    // if (this.elements.addressBar) {
    //   this.elements.addressBar.style.opacity = isLoading ? '0.7' : '1';
    // }
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
