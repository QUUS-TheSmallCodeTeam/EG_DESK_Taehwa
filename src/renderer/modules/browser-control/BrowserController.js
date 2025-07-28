/**
 * BrowserController - Browser Automation Module
 * As specified in PRD: Browser-Control/TabController + browser automation
 * 
 * Handles browser UI synchronization, URL validation, and automation features
 * for the EG-Desk:태화 platform
 */

class BrowserController {
  constructor(webContentsManager) {
    this.webContentsManager = webContentsManager;
    this.elements = {};
    this.isInitialized = false;
  }

  /**
   * Initialize browser controller with UI elements
   */
  initialize() {
    // Get UI elements
    this.elements = {
      addressBar: document.getElementById('address-bar'),
      goButton: document.getElementById('go-btn'),
      backButton: document.getElementById('back-btn'),
      forwardButton: document.getElementById('forward-btn'),
      reloadButton: document.getElementById('reload-btn'),
      browserContainer: document.getElementById('browser-container'),
      browserPlaceholder: document.getElementById('browser-placeholder'),
      browserView: document.getElementById('browser-view')
    };

    // Validate elements
    const missingElements = Object.entries(this.elements)
      .filter(([key, element]) => !element)
      .map(([key]) => key);

    if (missingElements.length > 0) {
      console.warn('[BrowserController] Missing UI elements:', missingElements);
    }

    this.setupEventListeners();
    this.setupWebContentsManagerEvents();
    this.updateNavigationButtons();
    
    this.isInitialized = true;
    console.log('[BrowserController] Initialized with UI elements');
  }

  /**
   * Set up UI event listeners
   */
  setupEventListeners() {
    // Address bar events
    if (this.elements.addressBar) {
      this.elements.addressBar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.navigateToURL(this.elements.addressBar.value);
        }
      });
    }

    // Navigation buttons
    if (this.elements.goButton) {
      this.elements.goButton.addEventListener('click', () => {
        this.navigateToURL(this.elements.addressBar.value);
      });
    }

    if (this.elements.backButton) {
      this.elements.backButton.addEventListener('click', () => {
        this.goBack();
      });
    }

    if (this.elements.forwardButton) {
      this.elements.forwardButton.addEventListener('click', () => {
        this.goForward();
      });
    }

    if (this.elements.reloadButton) {
      this.elements.reloadButton.addEventListener('click', () => {
        this.reload();
      });
    }
  }

  /**
   * Set up WebContentsManager event listeners for UI sync
   */
  setupWebContentsManagerEvents() {
    // Listen for navigation events to update UI
    this.webContentsManager.on('navigation', (data) => {
      this.updateAddressBar(data.url);
      this.updateNavigationButtons();
    });

    this.webContentsManager.on('loading-started', () => {
      this.setLoadingState(true);
    });

    this.webContentsManager.on('loading-finished', (data) => {
      this.setLoadingState(false);
      this.updateNavigationButtons();
      this.updatePageTitle(data.title);
    });

    this.webContentsManager.on('loading-failed', (data) => {
      this.setLoadingState(false);
      this.showError(`페이지 로드 실패: ${data.errorDescription}`);
    });

    this.webContentsManager.on('tab-switched', (data) => {
      this.updateAddressBar(data.tab.url);
      this.updateNavigationButtons();
      this.showWebContentsView();
    });
  }

  /**
   * Navigate to a URL with validation
   * @param {string} url - URL to navigate to
   */
  async navigateToURL(url) {
    try {
      const validatedUrl = this.validateURL(url);
      console.log('[BrowserController] Navigating to:', validatedUrl);
      
      await this.webContentsManager.loadURL(validatedUrl);
      this.showWebContentsView();
      
    } catch (error) {
      console.error('[BrowserController] Navigation failed:', error);
      this.showError(`탐색 실패: ${error.message}`);
    }
  }

  /**
   * Validate and normalize URL
   * @param {string} url - URL to validate
   * @returns {string} Validated URL
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
    try {
      const success = await this.webContentsManager.goBack();
      if (success) {
        this.updateNavigationButtons();
      }
      return success;
    } catch (error) {
      console.error('[BrowserController] Go back failed:', error);
      return false;
    }
  }

  async goForward() {
    try {
      const success = await this.webContentsManager.goForward();
      if (success) {
        this.updateNavigationButtons();
      }
      return success;
    } catch (error) {
      console.error('[BrowserController] Go forward failed:', error);
      return false;
    }
  }

  async reload() {
    try {
      const success = await this.webContentsManager.reload();
      return success;
    } catch (error) {
      console.error('[BrowserController] Reload failed:', error);
      return false;
    }
  }

  /**
   * UI update methods
   */
  updateAddressBar(url) {
    if (this.elements.addressBar && url) {
      this.elements.addressBar.value = url;
    }
  }

  updateNavigationButtons() {
    const state = this.webContentsManager.getNavigationState();
    
    if (this.elements.backButton) {
      this.elements.backButton.disabled = !state.canGoBack;
    }
    
    if (this.elements.forwardButton) {
      this.elements.forwardButton.disabled = !state.canGoForward;
    }

    if (this.elements.reloadButton) {
      this.elements.reloadButton.disabled = !this.webContentsManager.currentTabId;
    }
  }

  updatePageTitle(title) {
    if (title) {
      document.title = `${title} - EG-Desk:태화`;
    }
  }

  setLoadingState(isLoading) {
    if (this.elements.reloadButton) {
      this.elements.reloadButton.innerHTML = isLoading ? '⏸' : '↻';
      this.elements.reloadButton.title = isLoading ? '로딩 중지' : '새로고침';
    }

    if (this.elements.addressBar) {
      this.elements.addressBar.style.opacity = isLoading ? '0.7' : '1';
    }
  }

  showWebContentsView() {
    if (this.elements.browserPlaceholder) {
      this.elements.browserPlaceholder.classList.add('hidden');
    }
    if (this.elements.browserView) {
      this.elements.browserView.classList.add('active');
    }
  }

  hideWebContentsView() {
    if (this.elements.browserPlaceholder) {
      this.elements.browserPlaceholder.classList.remove('hidden');
    }
    if (this.elements.browserView) {
      this.elements.browserView.classList.remove('active');
    }
  }

  showError(message) {
    // For now, just log to console. Could show in terminal or notification
    console.error('[BrowserController]', message);
    
    // Add to terminal if available
    if (window.terminalController) {
      window.terminalController.addLine(message, 'error');
    }
  }

  /**
   * Browser automation features
   */
  async executeScript(script) {
    try {
      return await this.webContentsManager.executeScript(script);
    } catch (error) {
      console.error('[BrowserController] Script execution failed:', error);
      this.showError(`스크립트 실행 실패: ${error.message}`);
      throw error;
    }
  }

  async injectCSS(css) {
    const script = `
      (function() {
        const style = document.createElement('style');
        style.textContent = \`${css}\`;
        document.head.appendChild(style);
        return 'CSS injected successfully';
      })();
    `;
    
    return await this.executeScript(script);
  }

  async getPageInfo() {
    const script = `
      (function() {
        return {
          title: document.title,
          url: window.location.href,
          readyState: document.readyState,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          scrollPosition: {
            x: window.pageXOffset,
            y: window.pageYOffset
          },
          forms: document.forms.length,
          images: document.images.length,
          links: document.links.length
        };
      })();
    `;
    
    return await this.executeScript(script);
  }

  async waitForElement(selector, timeout = 5000) {
    const script = `
      new Promise((resolve, reject) => {
        const element = document.querySelector('${selector}');
        if (element) {
          resolve(element.tagName);
          return;
        }
        
        const observer = new MutationObserver(() => {
          const element = document.querySelector('${selector}');
          if (element) {
            observer.disconnect();
            resolve(element.tagName);
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        setTimeout(() => {
          observer.disconnect();
          reject(new Error('Element not found within timeout'));
        }, ${timeout});
      });
    `;
    
    return await this.executeScript(script);
  }

  /**
   * WordPress specific automation
   */
  async detectWordPress() {
    const script = `
      (function() {
        // Check for WordPress indicators
        const wpIndicators = [
          document.querySelector('meta[name="generator"][content*="WordPress"]'),
          document.querySelector('link[href*="wp-content"]'),
          document.querySelector('script[src*="wp-content"]'),
          window.wp !== undefined,
          document.body.className.includes('wordpress')
        ];
        
        return {
          isWordPress: wpIndicators.some(indicator => !!indicator),
          hasEditor: !!(window.wp && window.wp.data),
          adminUrl: document.querySelector('link[rel="EditURI"]')?.href,
          version: document.querySelector('meta[name="generator"]')?.content
        };
      })();
    `;
    
    return await this.executeScript(script);
  }

  async fillWordPressEditor(title, content) {
    const script = `
      (function() {
        // Try Gutenberg editor first
        if (window.wp && window.wp.data) {
          try {
            wp.data.dispatch('core/editor').editPost({
              title: '${title.replace(/'/g, "\\'")}',
              content: '${content.replace(/'/g, "\\'")}'
            });
            return 'Gutenberg editor updated';
          } catch (e) {
            console.error('Gutenberg update failed:', e);
          }
        }
        
        // Try classic editor
        const titleField = document.querySelector('#title, input[name="post_title"]');
        const contentField = document.querySelector('#content, textarea[name="content"]');
        
        if (titleField) {
          titleField.value = '${title.replace(/'/g, "\\'")}';
          titleField.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        if (contentField) {
          contentField.value = '${content.replace(/'/g, "\\'")}';
          contentField.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        return titleField && contentField ? 'Classic editor updated' : 'Editor fields not found';
      })();
    `;
    
    return await this.executeScript(script);
  }

  /**
   * Cleanup
   */
  destroy() {
    // Remove event listeners if needed
    this.elements = {};
    this.isInitialized = false;
    console.log('[BrowserController] Destroyed');
  }
}

export default BrowserController;
