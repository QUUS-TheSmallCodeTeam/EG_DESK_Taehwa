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
  }

  /**
   * Initialize the browser tab component
   */
  async initialize() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      throw new Error(`Container with ID "${this.containerId}" not found`);
    }

    try {
      this.render();
      
      this.setupEventListeners();
      
      this.setupWebContentsEvents();
      
      // Force initial bounds calculation after DOM is ready
      setTimeout(() => {
        try {
          this.updateWebContentsViewBounds();
        } catch (boundsError) {
        }
      }, 200);
      
      this.isInitialized = true;
    } catch (error) {
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
      return null;
    }

    // Wait for layout to be stable
    if (viewport.offsetWidth === 0 || viewport.offsetHeight === 0) {
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

    
    // Validate bounds make sense
    if (bounds.width <= 0 || bounds.height <= 0) {
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
        setTimeout(() => {
          this.updateWebContentsViewBounds(retryCount + 1);
        }, 200); // Increase delay to allow more time for DOM readiness
        return;
      } else {
        this.webContentsManager.updateWebContentsViewBounds();
        return;
      }
    }

    // Check if DOM is ready before updating bounds
    if (document.readyState !== 'complete') {
      setTimeout(() => {
        this.updateWebContentsViewBounds(retryCount);
      }, 100);
      return;
    }

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
      
      return tabId;
    } catch (error) {
      this.showError(`탭 생성 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * Navigate to a URL
   */
  async navigateToURL(url) {
    if (!url || !url.trim()) {
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
      
    } catch (error) {
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
      return false;
    }
  }

  async reload() {
    if (!this.currentTabId) return false;
    
    try {
      return await this.webContentsManager.reload(this.currentTabId);
    } catch (error) {
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
    const initialUrl = this.elements.addressBar?.value || 'https://m8chaa.mycafe24.com/';
    
    try {
      await this.navigateToURL(initialUrl);
    } catch (error) {
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
    
  }
}

// ES6 export
export default BrowserTabComponent;
