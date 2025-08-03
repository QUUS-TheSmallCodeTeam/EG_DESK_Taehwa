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
    console.log(`[BrowserTabComponent] Searching for container: ${this.containerId}`);
    console.log(`[BrowserTabComponent] Document ready state:`, document.readyState);
    console.log(
      `[BrowserTabComponent] All elements with 'container' in ID:`,
      Array.from(document.querySelectorAll('[id*="container"]')).map((el) => ({ id: el.id, className: el.className }))
    );
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`[BrowserTabComponent] ❌ FATAL: Container with ID "${this.containerId}" not found`);
      console.log(
        `[BrowserTabComponent] All elements by querySelector:`,
        Array.from(document.querySelectorAll("*")).filter((el) => el.id).map((el) => el.id)
      );
      console.log(`[BrowserTabComponent] Body innerHTML length:`, document.body.innerHTML.length);
      console.log(
        `[BrowserTabComponent] Available IDs:`,
        Array.from(document.querySelectorAll("[id]")).map((el) => el.id)
      );
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
    console.log("[CSS-DEBUG] BrowserTabComponent render() - Starting render process");
    console.log("[CSS-DEBUG] Container classes before render:", this.container.className);
    console.log("[CSS-DEBUG] Container computed styles:", {
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
    this.elements = {
      backBtn: document.getElementById(`${this.containerId}-back-btn`),
      forwardBtn: document.getElementById(`${this.containerId}-forward-btn`),
      reloadBtn: document.getElementById(`${this.containerId}-reload-btn`),
      addressBar: document.getElementById(`${this.containerId}-address-bar`),
      goBtn: document.getElementById(`${this.containerId}-go-btn`),
      placeholder: document.getElementById(`${this.containerId}-browser-placeholder`)
    };
    setTimeout(() => {
      const browserComponent = this.container.querySelector(".browser-tab-component");
      const browserControls = this.container.querySelector(".browser-controls");
      const componentContainer = document.querySelector(".component-container");
      if (window.electronAPI?.log?.info) {
        window.electronAPI.log.info("[CSS-DEBUG] After render - Component structure:", {
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
          window.electronAPI.log.info("[CSS-DEBUG] browser-tab-component styles:", browserStyles);
        }
        if (browserStyles.background === "rgba(0, 0, 0, 0)" || browserStyles.background === "transparent") {
          if (window.electronAPI?.log?.warn) {
            window.electronAPI.log.warn("[CSS-DEBUG] WARNING: No background color applied to browser-tab-component!");
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
          window.electronAPI.log.info("[CSS-DEBUG] browser-controls styles:", controlStyles);
        }
      }
      if (componentContainer) {
        const containerStyles = {
          background: window.getComputedStyle(componentContainer).backgroundColor,
          border: window.getComputedStyle(componentContainer).border,
          borderRadius: window.getComputedStyle(componentContainer).borderRadius,
          boxShadow: window.getComputedStyle(componentContainer).boxShadow
        };
        if (window.electronAPI?.log?.info) {
          window.electronAPI.log.info("[CSS-DEBUG] component-container styles:", containerStyles);
        }
        if (containerStyles.background === "rgba(0, 0, 0, 0)" || containerStyles.background === "transparent") {
          if (window.electronAPI?.log?.warn) {
            window.electronAPI.log.warn("[CSS-DEBUG] WARNING: No background color applied to component-container!");
            window.electronAPI.log.warn("[CSS-DEBUG] Check if CSS is loaded correctly in index.html");
          }
        }
      }
      if (window.electronAPI?.log?.info) {
        window.electronAPI.log.info("[CSS-DEBUG] Document stylesheets count:", document.styleSheets.length);
        let foundComponentContainerStyle = false;
        Array.from(document.styleSheets).forEach((sheet, index) => {
          try {
            if (sheet.cssRules) {
              for (let rule of sheet.cssRules) {
                if (rule.selectorText && rule.selectorText.includes(".component-container")) {
                  foundComponentContainerStyle = true;
                  window.electronAPI.log.info("[CSS-DEBUG] Found .component-container rule in stylesheet:", {
                    selector: rule.selectorText,
                    styles: rule.style.cssText.substring(0, 100) + "..."
                  });
                }
              }
            }
          } catch (e) {
          }
        });
        if (!foundComponentContainerStyle) {
          window.electronAPI.log.error("[CSS-DEBUG] ERROR: .component-container styles not found in any stylesheet!");
        }
      }
    }, 100);
  }
  /**
   * Set up event listeners for browser controls
   */
  setupEventListeners() {
    this.elements.addressBar?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.navigateToURL(this.elements.addressBar.value);
      }
    });
    this.elements.goBtn?.addEventListener("click", () => {
      this.navigateToURL(this.elements.addressBar.value);
    });
    this.elements.backBtn?.addEventListener("click", () => {
      this.goBack();
    });
    this.elements.forwardBtn?.addEventListener("click", () => {
      this.goForward();
    });
    this.elements.reloadBtn?.addEventListener("click", () => {
      this.reload();
    });
  }
  /**
   * Set up WebContentsManager event listeners
   */
  setupWebContentsEvents() {
    this.webContentsManager.on("navigation", (data) => {
      if (data.tabId === this.currentTabId) {
        this.updateAddressBar(data.url);
        this.updateNavigationButtons();
        this.hidePlaceholder();
      }
    });
    this.webContentsManager.on("loading-started", (data) => {
      if (data.tabId === this.currentTabId) {
        this.setLoadingState(true);
      }
    });
    this.webContentsManager.on("loading-finished", (data) => {
      if (data.tabId === this.currentTabId) {
        this.setLoadingState(false);
        this.updateNavigationButtons();
      }
    });
    this.webContentsManager.on("loading-failed", (data) => {
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
    const viewport = this.container.querySelector(".browser-viewport");
    if (!viewport) {
      console.warn(`[BrowserTabComponent] .browser-viewport not found in container ${this.containerId}`);
      return null;
    }
    if (viewport.offsetWidth === 0 || viewport.offsetHeight === 0) {
      console.warn(`[BrowserTabComponent] Viewport has zero dimensions, waiting...`);
      return null;
    }
    const viewportRect = viewport.getBoundingClientRect();
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
      if (retryCount < 5) {
        console.warn(`[BrowserTabComponent] Could not calculate bounds, retrying in 200ms (attempt ${retryCount + 1}/5)`);
        setTimeout(() => {
          this.updateWebContentsViewBounds(retryCount + 1);
        }, 200);
        return;
      } else {
        console.warn("[BrowserTabComponent] Failed to calculate bounds after 5 attempts, using fallback");
        this.webContentsManager.updateWebContentsViewBounds();
        return;
      }
    }
    if (document.readyState !== "complete") {
      console.warn("[BrowserTabComponent] Document not fully ready, delaying bounds update");
      setTimeout(() => {
        this.updateWebContentsViewBounds(retryCount);
      }, 100);
      return;
    }
    console.log(`[BrowserTabComponent] Sending precise bounds to WebContentsManager:`, bounds);
    this.webContentsManager.updateWebContentsViewBounds(bounds);
  }
  /**
   * Create and activate a new browser tab
   */
  async createTab(url = "about:blank") {
    try {
      const tabId = await this.webContentsManager.createTab(url);
      await this.webContentsManager.switchTab(tabId);
      this.currentTabId = tabId;
      this.updateAddressBar(url);
      this.hidePlaceholder();
      this.updateNavigationButtons();
      setTimeout(() => {
        this.updateWebContentsViewBounds();
      }, 200);
      if (typeof window !== "undefined") {
        window.addEventListener("resize", () => {
          setTimeout(() => {
            this.updateWebContentsViewBounds();
          }, 100);
        });
      }
      console.log(`[BrowserTabComponent] Created and activated tab: ${tabId}`);
      return tabId;
    } catch (error) {
      console.error("[BrowserTabComponent] Failed to create tab:", error);
      this.showError(`탭 생성 실패: ${error.message}`);
      throw error;
    }
  }
  /**
   * Navigate to a URL
   */
  async navigateToURL(url) {
    if (!url || !url.trim()) {
      console.warn("[BrowserTabComponent] Empty URL provided");
      return;
    }
    try {
      const validatedUrl = this.validateURL(url);
      if (!this.currentTabId) {
        await this.createTab(validatedUrl);
      } else {
        await this.webContentsManager.loadURL(validatedUrl, this.currentTabId);
      }
      console.log(`[BrowserTabComponent] Navigated to: ${validatedUrl}`);
    } catch (error) {
      console.error("[BrowserTabComponent] Navigation failed:", error);
      this.showError(`탐색 실패: ${error.message}`);
    }
  }
  /**
   * Validate and normalize URL
   */
  validateURL(url) {
    if (!url || typeof url !== "string") {
      throw new Error("유효하지 않은 URL입니다");
    }
    url = url.trim();
    if (!url.match(/^https?:\/\//)) {
      if (url.includes(".") && !url.includes(" ")) {
        url = "https://" + url;
      } else {
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
    }
    try {
      new URL(url);
      return url;
    } catch (error) {
      throw new Error("올바른 URL 형식이 아닙니다");
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
      console.error("[BrowserTabComponent] Go back failed:", error);
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
      console.error("[BrowserTabComponent] Go forward failed:", error);
      return false;
    }
  }
  async reload() {
    if (!this.currentTabId) return false;
    try {
      return await this.webContentsManager.reload(this.currentTabId);
    } catch (error) {
      console.error("[BrowserTabComponent] Reload failed:", error);
      return false;
    }
  }
  /**
   * UI update methods
   */
  updateAddressBar(url) {
    if (this.elements.addressBar && url && url !== "about:blank") {
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
      this.elements.reloadBtn.innerHTML = isLoading ? "⏸" : "↻";
      this.elements.reloadBtn.title = isLoading ? "로딩 중지" : "새로고침";
    }
  }
  hidePlaceholder() {
    if (this.elements.placeholder) {
      this.elements.placeholder.classList.add("hidden");
    }
  }
  showPlaceholder() {
    if (this.elements.placeholder) {
      this.elements.placeholder.classList.remove("hidden");
    }
  }
  showError(message) {
    console.error("[BrowserTabComponent]", message);
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
      throw new Error("No active tab for script execution");
    }
    return await this.webContentsManager.executeScript(script, this.currentTabId);
  }
  /**
   * Load initial URL (call after initialization)
   */
  async loadInitialURL() {
    console.log(`[BrowserTabComponent] 🚀 loadInitialURL called`);
    const initialUrl = this.elements.addressBar?.value || "https://m8chaa.mycafe24.com/";
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
      this.container.innerHTML = "";
    }
    this.currentTabId = null;
    this.isInitialized = false;
    console.log(`[BrowserTabComponent] Destroyed: ${this.containerId}`);
  }
}
class ChatComponent {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = null;
    this.elements = {};
    this.isInitialized = false;
    this.messageId = 0;
    this.options = {
      title: options.title || "AI Chat",
      placeholder: options.placeholder || "Type your message...",
      enableProviderSelection: options.enableProviderSelection !== false,
      enableCostTracking: false,
      enableStreaming: options.enableStreaming !== false,
      maxMessages: options.maxMessages || 100,
      ...options
    };
    this.currentProvider = null;
    this.currentModel = null;
    this.providerStatus = "disconnected";
    this.availableProviders = [];
    this.conversationHistory = [];
    this.costTracker = {
      session: { input: 0, output: 0, total: 0 },
      total: { input: 0, output: 0, total: 0 }
    };
    this.isStreaming = false;
    this.currentStreamingMessageElement = null;
    this.globalStateManager = null;
    this.eventBus = null;
    this.currentSessionId = null;
  }
  /**
   * Initialize the chat component
   */
  async initialize() {
    console.log(`[ChatComponent] Initializing messenger-style chat: ${this.containerId}`);
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      throw new Error(`Container with ID "${this.containerId}" not found`);
    }
    try {
      this.render();
      this.setupEventListeners();
      await this.initializeProviders();
      this.displayWelcomeMessage();
      this.isInitialized = true;
      console.log(`[ChatComponent] Messenger-style chat initialized: ${this.containerId}`);
      return true;
    } catch (error) {
      console.error(`[ChatComponent] Initialization failed:`, error);
      throw error;
    }
  }
  /**
   * Render the messenger-style chat interface
   */
  render() {
    this.container.innerHTML = `
      <div class="messenger-chat">
        <!-- Header -->
        <div class="chat-header">
          <div class="header-left">
            <div class="chat-avatar">
              <div class="avatar-icon">🤖</div>
            </div>
            <div class="chat-info">
              <h3 class="chat-title">${this.options.title}</h3>
              <div class="chat-status">
                <span id="${this.containerId}-status-text" class="status-text">Ready</span>
                <div id="${this.containerId}-status-dot" class="status-dot"></div>
              </div>
            </div>
          </div>
          
          <div class="header-right">
            ${this.options.enableProviderSelection ? `
            <div class="provider-controls">
              <select id="${this.containerId}-provider-select" class="provider-selector">
                <option value="">Select Provider...</option>
              </select>
              <select id="${this.containerId}-model-select" class="model-selector" disabled>
                <option value="">Select Model...</option>
              </select>
            </div>` : ""}
            
            ${this.options.enableCostTracking ? `
            <div class="cost-tracker">
              <div class="cost-session">
                <span class="cost-label">Session:</span>
                <span id="${this.containerId}-session-cost" class="cost-value">$0.00</span>
              </div>
              <div class="cost-total">
                <span class="cost-label">Total:</span>
                <span id="${this.containerId}-total-cost" class="cost-value">$0.00</span>
              </div>
              <button id="${this.containerId}-reset-costs" class="reset-costs-btn" title="Reset Session Costs">🔄</button>
            </div>` : ""}
            
            <div class="header-actions">
              <button id="${this.containerId}-settings-btn" class="action-btn" title="Settings">⚙️</button>
            </div>
          </div>
        </div>

        <!-- Messages Container -->
        <div id="${this.containerId}-messages" class="messages-container">
          <div class="messages-scroll">
            <div id="${this.containerId}-messages-list" class="messages-list">
              <!-- Messages will be added here -->
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="chat-input-area">
          <div class="input-container">
            <div class="input-wrapper">
              <textarea 
                id="${this.containerId}-input" 
                class="message-input" 
                placeholder="${this.options.placeholder}"
                rows="1"
                maxlength="10000"
              ></textarea>
              <div class="input-actions">
                <button id="${this.containerId}-send-btn" class="send-btn" disabled>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22,2 15,22 11,13 2,9"></polygon>
                  </svg>
                </button>
              </div>
            </div>
            <div class="input-footer">
              <div class="typing-indicator">
                <span id="${this.containerId}-typing" class="typing-text"></span>
              </div>
              <div class="char-counter">
                <span id="${this.containerId}-char-count" class="char-count">0/10000</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    this.elements = {
      statusText: document.getElementById(`${this.containerId}-status-text`),
      statusDot: document.getElementById(`${this.containerId}-status-dot`),
      providerSelect: document.getElementById(`${this.containerId}-provider-select`),
      modelSelect: document.getElementById(`${this.containerId}-model-select`),
      sessionCost: document.getElementById(`${this.containerId}-session-cost`),
      totalCost: document.getElementById(`${this.containerId}-total-cost`),
      resetCostsBtn: document.getElementById(`${this.containerId}-reset-costs`),
      messagesContainer: document.getElementById(`${this.containerId}-messages`),
      messagesList: document.getElementById(`${this.containerId}-messages-list`),
      messageInput: document.getElementById(`${this.containerId}-input`),
      sendBtn: document.getElementById(`${this.containerId}-send-btn`),
      typingIndicator: document.getElementById(`${this.containerId}-typing`),
      charCount: document.getElementById(`${this.containerId}-char-count`),
      settingsBtn: document.getElementById(`${this.containerId}-settings-btn`)
    };
    this.addStyles();
  }
  /**
   * Add modern messenger-style CSS
   * NOTE: CSS injection disabled - styles are defined in index.html
   */
  addStyles() {
    const requiredClasses = [
      "messenger-chat",
      "chat-header",
      "messages-container",
      "messages-scroll",
      "messages-list",
      "message",
      "message-avatar",
      "message-bubble",
      "message-content",
      "send-btn",
      "provider-selector",
      "status-dot"
    ];
    const missingClasses = requiredClasses.filter((className) => {
      const elements = document.getElementsByClassName(className);
      const hasInCSS = Array.from(document.styleSheets).some((sheet) => {
        try {
          return Array.from(sheet.cssRules || []).some(
            (rule) => rule.selectorText && rule.selectorText.includes(`.${className}`)
          );
        } catch (e) {
          return false;
        }
      });
      return elements.length === 0 && !hasInCSS;
    });
    if (missingClasses.length > 0) {
      console.warn(`[ChatComponent] Missing CSS classes in index.html:`, missingClasses);
      console.warn(`[ChatComponent] Component may not display correctly without these styles`);
    } else {
      console.log(`[ChatComponent] All required CSS classes found in index.html`);
    }
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (this.elements.providerSelect) {
      this.elements.providerSelect.addEventListener("change", (e) => {
        this.handleProviderChange(e.target.value);
      });
    }
    if (this.elements.modelSelect) {
      this.elements.modelSelect.addEventListener("change", (e) => {
        this.handleModelChange(e.target.value);
      });
    }
    if (this.elements.resetCostsBtn) {
      this.elements.resetCostsBtn.addEventListener("click", () => {
        this.resetSessionCosts();
      });
    }
    this.elements.messageInput.addEventListener("input", (e) => {
      this.handleInputChange(e);
    });
    this.elements.messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    this.elements.sendBtn.addEventListener("click", () => {
      this.sendMessage();
    });
    this.elements.messageInput.addEventListener("input", () => {
      this.autoResizeTextarea();
    });
    if (this.elements.settingsBtn) {
      this.elements.settingsBtn.addEventListener("click", () => {
        this.showSettings();
      });
    }
    if (window.electronAPI) {
      window.electronAPI.onLangChainStreamChunk((data) => {
        this.handleStreamChunk(data.chunk);
      });
    }
  }
  /**
   * Wait for backend services to be ready
   */
  async waitForServicesReady(maxAttempts = 10, delay = 500) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (window.electronAPI?.claude?.checkConfiguration) {
          await window.electronAPI.claude.checkConfiguration();
        }
        if (window.electronAPI?.invoke) {
          await window.electronAPI.invoke("langchain-get-current-status");
        }
        if (window.electronAPI?.chatHistory?.getMetadata) {
          await window.electronAPI.chatHistory.getMetadata();
        }
        console.log(`[ChatComponent] Backend services ready after ${attempt} attempts`);
        return true;
      } catch (error) {
        console.warn(`[ChatComponent] Services not ready, attempt ${attempt}/${maxAttempts}:`, error.message);
        if (attempt === maxAttempts) {
          console.error(`[ChatComponent] Services failed to initialize after ${maxAttempts} attempts`);
          throw new Error("Backend services not available");
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  /**
   * Initialize available providers
   */
  async initializeProviders() {
    try {
      if (!window.electronAPI) {
        throw new Error("Electron API not available");
      }
      await this.waitForServicesReady();
      this.availableProviders = await window.electronAPI.invoke("langchain-get-providers");
      if (this.availableProviders.length === 0) {
        throw new Error("No AI providers configured");
      }
      if (this.elements.providerSelect) {
        this.elements.providerSelect.innerHTML = '<option value="">Select Provider...</option>';
        this.availableProviders.forEach((provider) => {
          const option = document.createElement("option");
          option.value = provider.id;
          option.textContent = `${this.getProviderIcon(provider.id)} ${provider.name}`;
          if (provider.isCurrent) {
            option.selected = true;
            this.currentProvider = provider.id;
          }
          this.elements.providerSelect.appendChild(option);
        });
      }
      const status = await window.electronAPI.invoke("langchain-get-current-status");
      this.updateProviderStatus(status);
      this.updateStatus("Ready", "ready");
    } catch (error) {
      console.error("[ChatComponent] Provider initialization failed:", error);
      this.updateStatus(`Error: ${error.message}`, "error");
    }
  }
  /**
   * Handle provider change
   */
  async handleProviderChange(providerId) {
    if (!providerId) return;
    try {
      this.updateStatus("Switching provider...", "connecting");
      const result = await window.electronAPI.invoke("langchain-switch-provider", { providerId });
      this.currentProvider = result.provider;
      this.currentModel = result.model;
      this.updateModelDropdown(providerId);
      const status = await window.electronAPI.invoke("langchain-get-current-status");
      this.updateProviderStatus(status);
      this.updateStatus("Connected", "connected");
      this.addSystemMessage(`Switched to ${result.config.name} (${result.model})`);
    } catch (error) {
      console.error("[ChatComponent] Provider switch failed:", error);
      this.updateStatus(`Error: ${error.message}`, "error");
    }
  }
  /**
   * Handle model change
   */
  async handleModelChange(modelId) {
    if (!modelId || !this.currentProvider) return;
    try {
      this.updateStatus("Updating model...", "connecting");
      await window.electronAPI.invoke("langchain-update-provider-model", {
        providerId: this.currentProvider,
        modelId
      });
      this.currentModel = modelId;
      const status = await window.electronAPI.invoke("langchain-get-current-status");
      this.updateProviderStatus(status);
      this.updateStatus("Connected", "connected");
      this.addSystemMessage(`Model updated to ${modelId}`);
    } catch (error) {
      console.error("[ChatComponent] Model update failed:", error);
      this.updateStatus(`Error: ${error.message}`, "error");
    }
  }
  /**
   * Update model dropdown based on selected provider
   */
  async updateModelDropdown(providerId) {
    if (!this.elements.modelSelect) return;
    try {
      const models = await window.electronAPI.invoke("langchain-get-provider-models", { providerId });
      this.elements.modelSelect.innerHTML = '<option value="">Select Model...</option>';
      this.elements.modelSelect.disabled = false;
      models.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = `${model.name} (${model.context.toLocaleString()} tokens)`;
        if (model.id === this.currentModel) {
          option.selected = true;
        }
        this.elements.modelSelect.appendChild(option);
      });
    } catch (error) {
      console.error("[ChatComponent] Failed to load models:", error);
      this.elements.modelSelect.disabled = true;
    }
  }
  /**
   * Send a message
   */
  async sendMessage() {
    const message = this.elements.messageInput.value.trim();
    if (!message || this.isStreaming) return;
    if (!this.currentProvider) {
      this.showError("Please select a provider first");
      return;
    }
    try {
      this.addUserMessage(message);
      this.elements.messageInput.value = "";
      this.updateCharCount();
      this.autoResizeTextarea();
      this.elements.sendBtn.disabled = true;
      this.conversationHistory.push({
        role: "user",
        content: message,
        timestamp: Date.now()
      });
      const apiHistory = this.conversationHistory.slice(-20);
      if (this.options.enableStreaming) {
        await this.sendStreamingMessage(message, apiHistory);
      } else {
        await this.sendRegularMessage(message, apiHistory);
      }
    } catch (error) {
      console.error("[ChatComponent] Send message failed:", error);
      this.showError(`Failed to send message: ${error.message}`);
    } finally {
      this.isStreaming = false;
      this.elements.sendBtn.disabled = false;
      this.elements.typingIndicator.textContent = "";
    }
  }
  /**
   * Send streaming message
   */
  async sendStreamingMessage(message, conversationHistory) {
    this.isStreaming = true;
    this.elements.typingIndicator.textContent = "AI is typing...";
    this.currentStreamingMessageElement = this.addAssistantMessage("", true);
    try {
      const result = await window.electronAPI.invoke("langchain-stream-message", {
        message,
        conversationHistory,
        systemPrompt: null
      });
      if (result.success) {
        this.conversationHistory.push({
          role: "assistant",
          content: result.message,
          timestamp: result.metadata.timestamp,
          provider: result.provider,
          model: result.model,
          cost: result.metadata.cost
        });
        this.updateCostDisplay(result.metadata);
        this.finalizeStreamingMessage(result);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      if (this.currentStreamingMessageElement) {
        this.currentStreamingMessageElement.remove();
      }
      throw error;
    }
  }
  /**
   * Send regular message
   */
  async sendRegularMessage(message, conversationHistory) {
    this.elements.typingIndicator.textContent = "AI is thinking...";
    const result = await window.electronAPI.invoke("langchain-send-message", {
      message,
      conversationHistory,
      systemPrompt: null
    });
    if (result.success) {
      this.addAssistantMessage(result.message, false, result);
      this.conversationHistory.push({
        role: "assistant",
        content: result.message,
        timestamp: result.metadata.timestamp,
        provider: result.provider,
        model: result.model,
        cost: result.metadata.cost
      });
      this.updateCostDisplay(result.metadata);
    } else {
      throw new Error(result.error);
    }
  }
  /**
   * Handle streaming chunk
   */
  handleStreamChunk(chunk) {
    if (this.currentStreamingMessageElement && chunk) {
      const messageContent = this.currentStreamingMessageElement.querySelector(".message-content");
      if (messageContent) {
        messageContent.textContent += chunk;
        this.scrollToBottom();
      }
    }
  }
  /**
   * Finalize streaming message
   */
  finalizeStreamingMessage(result) {
    if (this.currentStreamingMessageElement) {
      const streamingIndicator = this.currentStreamingMessageElement.querySelector(".streaming-indicator");
      if (streamingIndicator) {
        streamingIndicator.remove();
      }
      this.addMessageMetadata(this.currentStreamingMessageElement, result);
      this.currentStreamingMessageElement = null;
    }
  }
  /**
   * Add user message to UI
   */
  addUserMessage(content) {
    const messageElement = this.createMessageElement("user", content, {
      timestamp: Date.now()
    });
    this.elements.messagesList.appendChild(messageElement);
    this.scrollToBottom();
    return messageElement;
  }
  /**
   * Add assistant message to UI
   */
  addAssistantMessage(content, isStreaming = false, result = null) {
    const messageElement = this.createMessageElement("assistant", content, result, isStreaming);
    this.elements.messagesList.appendChild(messageElement);
    this.scrollToBottom();
    return messageElement;
  }
  /**
   * Add system message to UI
   */
  addSystemMessage(content) {
    const messageElement = this.createMessageElement("system", content, {
      timestamp: Date.now()
    });
    this.elements.messagesList.appendChild(messageElement);
    this.scrollToBottom();
    return messageElement;
  }
  /**
   * Create message element
   */
  createMessageElement(type, content, result = null, isStreaming = false) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    messageDiv.id = `message-${++this.messageId}`;
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = this.getMessageAvatar(type);
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    const messageContent = document.createElement("div");
    messageContent.className = "message-content";
    messageContent.textContent = content;
    bubble.appendChild(messageContent);
    if (isStreaming) {
      const streamingIndicator = document.createElement("div");
      streamingIndicator.className = "streaming-indicator";
      streamingIndicator.innerHTML = `
        <div class="streaming-dot"></div>
        <div class="streaming-dot"></div>
        <div class="streaming-dot"></div>
      `;
      bubble.appendChild(streamingIndicator);
    }
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);
    if (result && !isStreaming) {
      this.addMessageMetadata(messageDiv, result);
    }
    return messageDiv;
  }
  /**
   * Add message metadata
   */
  addMessageMetadata(messageElement, result) {
    const bubble = messageElement.querySelector(".message-bubble");
    const metadata = document.createElement("div");
    metadata.className = "message-metadata";
    const time = new Date(result.metadata?.timestamp || Date.now()).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
    let metadataHTML = `<span class="message-time">${time}</span>`;
    if (result.provider) {
      const providerIcon = this.getProviderIcon(result.provider);
      metadataHTML += `<span class="message-provider">${providerIcon} ${result.provider}</span>`;
    }
    if (result.metadata?.cost && this.options.enableCostTracking) {
      metadataHTML += `<span class="message-cost">$${result.metadata.cost.toFixed(4)}</span>`;
    }
    metadata.innerHTML = metadataHTML;
    bubble.appendChild(metadata);
  }
  /**
   * Get message avatar
   */
  getMessageAvatar(type) {
    switch (type) {
      case "user":
        return "👤";
      case "assistant":
        return "🤖";
      case "system":
        return "ℹ️";
      default:
        return "💬";
    }
  }
  /**
   * Get provider icon
   */
  getProviderIcon(providerId) {
    switch (providerId) {
      case "claude":
        return "🤖";
      case "openai":
        return "🧠";
      case "gemini":
        return "💎";
      default:
        return "🔮";
    }
  }
  /**
   * Handle input change
   */
  handleInputChange(e) {
    const value = e.target.value;
    this.updateCharCount();
    this.elements.sendBtn.disabled = !value.trim() || this.isStreaming;
  }
  /**
   * Update character count
   */
  updateCharCount() {
    const length = this.elements.messageInput.value.length;
    const maxLength = 1e4;
    this.elements.charCount.textContent = `${length}/${maxLength}`;
    this.elements.charCount.className = "char-count";
    if (length > maxLength * 0.9) {
      this.elements.charCount.classList.add("danger");
    } else if (length > maxLength * 0.8) {
      this.elements.charCount.classList.add("warning");
    }
  }
  /**
   * Auto-resize textarea
   */
  autoResizeTextarea() {
    const textarea = this.elements.messageInput;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  }
  /**
   * Update status
   */
  updateStatus(text, status) {
    if (this.elements.statusText) {
      this.elements.statusText.textContent = text;
    }
    if (this.elements.statusDot) {
      this.elements.statusDot.className = `status-dot ${status}`;
    }
    this.providerStatus = status;
  }
  /**
   * Update provider status
   */
  updateProviderStatus(status) {
    if (status.provider) {
      this.currentProvider = status.provider.id;
      this.currentModel = status.provider.currentModel;
      if (this.elements.providerSelect) {
        this.elements.providerSelect.value = this.currentProvider;
      }
      this.updateModelDropdown(this.currentProvider);
    }
    if (status.costTracker) {
      this.costTracker = status.costTracker;
      this.updateCostDisplayFromTracker();
    }
  }
  /**
   * Update cost display
   */
  updateCostDisplay(metadata) {
    if (!this.options.enableCostTracking || !metadata.cost) return;
    this.costTracker.session.total += metadata.cost;
    this.costTracker.total.total += metadata.cost;
    this.updateCostDisplayFromTracker();
  }
  /**
   * Update cost display from tracker
   */
  updateCostDisplayFromTracker() {
    if (this.elements.sessionCost) {
      this.elements.sessionCost.textContent = `$${this.costTracker.session.total.toFixed(4)}`;
    }
    if (this.elements.totalCost) {
      this.elements.totalCost.textContent = `$${this.costTracker.total.total.toFixed(4)}`;
    }
  }
  /**
   * Reset session costs
   */
  async resetSessionCosts() {
    try {
      await window.electronAPI.invoke("langchain-reset-session-costs");
      this.costTracker.session = { input: 0, output: 0, total: 0 };
      this.updateCostDisplayFromTracker();
      this.addSystemMessage("Session costs reset");
    } catch (error) {
      console.error("[ChatComponent] Failed to reset session costs:", error);
    }
  }
  /**
   * Scroll to bottom
   */
  scrollToBottom() {
    const scrollContainer = this.elements.messagesContainer.querySelector(".messages-scroll");
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }
  /**
   * Display welcome message
   */
  displayWelcomeMessage() {
    const welcomeDiv = document.createElement("div");
    welcomeDiv.className = "welcome-message";
    welcomeDiv.innerHTML = `
      <h3>Welcome to AI Chat</h3>
      <p>Select a provider and start chatting with AI assistants. Your conversations are powered by multiple AI providers for the best experience.</p>
    `;
    this.elements.messagesList.appendChild(welcomeDiv);
  }
  /**
   * Show error message
   */
  showError(message) {
    this.addSystemMessage(`Error: ${message}`);
  }
  /**
   * Show settings
   */
  showSettings() {
    this.addSystemMessage("Settings panel coming soon...");
  }
  /**
   * Get component state for persistence
   */
  getState() {
    return {
      currentProvider: this.currentProvider,
      currentModel: this.currentModel,
      currentSessionId: this.currentSessionId,
      conversationHistory: this.conversationHistory,
      costTracker: this.costTracker,
      providerStatus: this.providerStatus,
      isInitialized: this.isInitialized,
      messageId: this.messageId
    };
  }
  /**
   * Set component state for restoration
   */
  async setState(state) {
    try {
      console.log(`[ChatComponent] Restoring state for: ${this.containerId}`);
      if (state.currentProvider !== void 0) {
        this.currentProvider = state.currentProvider;
        if (this.elements.providerSelect) {
          this.elements.providerSelect.value = state.currentProvider;
        }
      }
      if (state.currentModel !== void 0) {
        this.currentModel = state.currentModel;
        if (this.elements.modelSelect) {
          this.elements.modelSelect.value = state.currentModel;
        }
      }
      if (state.currentSessionId !== void 0) {
        this.currentSessionId = state.currentSessionId;
      }
      if (state.conversationHistory && Array.isArray(state.conversationHistory)) {
        this.conversationHistory = state.conversationHistory;
        this.clearMessages();
        for (const message of this.conversationHistory) {
          if (message.role === "user") {
            this.addUserMessage(message.content);
          } else if (message.role === "assistant") {
            this.addAssistantMessage(message.content, false, {
              provider: message.provider,
              model: message.model,
              metadata: {
                timestamp: message.timestamp,
                cost: message.cost
              }
            });
          } else if (message.role === "system") {
            this.addSystemMessage(message.content);
          }
        }
      }
      if (state.costTracker) {
        this.costTracker = state.costTracker;
        this.updateCostDisplayFromTracker();
      }
      if (state.providerStatus !== void 0) {
        this.providerStatus = state.providerStatus;
        this.updateStatus("Restored from previous session", state.providerStatus);
      }
      if (state.messageId !== void 0) {
        this.messageId = state.messageId;
      }
      if (this.globalStateManager && this.currentSessionId) {
        await this.globalStateManager.saveCurrentChatSession("blog", {
          sessionId: this.currentSessionId,
          conversationHistory: this.conversationHistory,
          provider: this.currentProvider,
          model: this.currentModel,
          costTracker: this.costTracker
        });
      }
      console.log(`[ChatComponent] State restored successfully`);
      if (this.eventBus) {
        this.eventBus.publish("chat-component-state-restored", {
          containerId: this.containerId,
          sessionId: this.currentSessionId,
          provider: this.currentProvider,
          messagesCount: this.conversationHistory.length
        });
      }
    } catch (error) {
      console.error(`[ChatComponent] Failed to restore state:`, error);
    }
  }
  /**
   * Clear all messages from the UI
   */
  clearMessages() {
    if (this.elements.messagesList) {
      this.elements.messagesList.innerHTML = "";
      this.messageId = 0;
    }
  }
  /**
   * Start new session
   */
  async startNewSession() {
    try {
      this.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      this.conversationHistory = [];
      this.costTracker.session = { input: 0, output: 0, total: 0 };
      this.clearMessages();
      this.updateCostDisplayFromTracker();
      if (this.globalStateManager) {
        await this.globalStateManager.saveCurrentChatSession("blog", {
          sessionId: this.currentSessionId,
          conversationHistory: this.conversationHistory,
          provider: this.currentProvider,
          model: this.currentModel,
          costTracker: this.costTracker
        });
      }
      if (this.eventBus) {
        this.eventBus.publish("chat-session-started", {
          sessionId: this.currentSessionId,
          provider: this.currentProvider,
          model: this.currentModel
        });
      }
      this.addSystemMessage("New chat session started");
      console.log(`[ChatComponent] Started new session: ${this.currentSessionId}`);
    } catch (error) {
      console.error(`[ChatComponent] Failed to start new session:`, error);
    }
  }
  /**
   * Load session from conversation data
   */
  async loadSession(conversation) {
    try {
      console.log(`[ChatComponent] Loading session: ${conversation.id}`);
      await this.setState({
        currentSessionId: conversation.id,
        conversationHistory: conversation.messages || [],
        currentProvider: conversation.provider || this.currentProvider,
        currentModel: conversation.model || this.currentModel,
        costTracker: conversation.costTracker || this.costTracker
      });
      this.addSystemMessage(`Loaded conversation: ${conversation.title || "Untitled"}`);
    } catch (error) {
      console.error(`[ChatComponent] Failed to load session:`, error);
      this.showError(`Failed to load session: ${error.message}`);
    }
  }
  /**
   * Save current session
   */
  async saveCurrentSession() {
    if (!this.currentSessionId || !this.globalStateManager) return;
    try {
      const sessionData = {
        sessionId: this.currentSessionId,
        conversationHistory: this.conversationHistory,
        provider: this.currentProvider,
        model: this.currentModel,
        costTracker: this.costTracker,
        lastModified: Date.now()
      };
      await this.globalStateManager.saveCurrentChatSession("blog", sessionData);
      if (this.eventBus) {
        this.eventBus.publish("chat-session-saved", {
          sessionId: this.currentSessionId,
          messagesCount: this.conversationHistory.length
        });
      }
    } catch (error) {
      console.error(`[ChatComponent] Failed to save session:`, error);
    }
  }
  /**
   * Cleanup and destroy
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.isInitialized = false;
    console.log(`[ChatComponent] Destroyed: ${this.containerId}`);
  }
}
class ChatHistoryPanel {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = null;
    this.elements = {};
    this.isInitialized = false;
    this.isCollapsed = false;
    this.searchQuery = "";
    this.conversations = [];
    this.currentSessionId = null;
    this.filteredConversations = [];
    this.providerMetadataEnabled = false;
    this.providerFilter = "all";
    this.currentProvider = null;
    this.globalStateManager = null;
    this.eventBus = null;
    this.options = {
      title: options.title || "Chat History",
      icon: options.icon || "📝",
      searchPlaceholder: options.searchPlaceholder || "Search conversations...",
      maxDisplayed: options.maxDisplayed || 50,
      showPreview: options.showPreview !== false,
      collapsible: options.collapsible !== false,
      defaultCollapsed: options.defaultCollapsed === true,
      enableProviderMetadata: options.enableProviderMetadata !== false,
      showProviderFilter: options.showProviderFilter !== false,
      showCostInfo: options.showCostInfo !== false,
      ...options
    };
    this.onSessionSelect = options.onSessionSelect || (() => {
    });
    this.onSessionDelete = options.onSessionDelete || (() => {
    });
    this.onToggleCollapse = options.onToggleCollapse || (() => {
    });
  }
  /**
   * Initialize the chat history panel
   */
  async initialize() {
    console.log(`[ChatHistoryPanel] Starting initialization for: ${this.containerId}`);
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`[ChatHistoryPanel] Container with ID "${this.containerId}" not found`);
      throw new Error(`Container with ID "${this.containerId}" not found`);
    }
    try {
      this.render();
      console.log(`[ChatHistoryPanel] Render completed`);
      this.setupEventListeners();
      console.log(`[ChatHistoryPanel] Event listeners setup`);
      this.setupWorkspaceIntegration();
      console.log(`[ChatHistoryPanel] Workspace integration setup`);
      await this.loadPanelPreferences();
      console.log(`[ChatHistoryPanel] Panel preferences loaded`);
      await this.loadConversations();
      console.log(`[ChatHistoryPanel] Initial conversations loaded`);
      if (this.options.defaultCollapsed && !this.preferencesLoaded) {
        this.toggleCollapse(true);
      }
      this.setupRealTimeSync();
      console.log(`[ChatHistoryPanel] Real-time sync setup`);
      this.isInitialized = true;
      console.log(`[ChatHistoryPanel] Initialized successfully in container: ${this.containerId}`);
      this.dispatchEvent("chat-history-panel-initialized", {
        containerId: this.containerId,
        conversationsCount: this.conversations.length,
        isCollapsed: this.isCollapsed
      });
    } catch (error) {
      console.error(`[ChatHistoryPanel] Initialization failed:`, error);
      throw error;
    }
  }
  /**
   * Render the chat history panel HTML
   */
  render() {
    this.container.innerHTML = `
      <div class="chat-history-panel ${this.options.defaultCollapsed ? "collapsed" : ""}">
        <!-- History Header -->
        <div class="history-header">
          <div class="header-content">
            <div class="history-icon">${this.options.icon}</div>
            <span class="history-title">${this.options.title}</span>
            <div class="history-actions">
              <button class="action-btn new-chat-btn" title="New Chat">
                <span>💬</span>
              </button>
              ${this.options.collapsible ? `
                <button class="action-btn collapse-btn" title="Toggle Panel">
                  <span class="collapse-icon">◀</span>
                </button>
              ` : ""}
            </div>
          </div>
        </div>
        
        <!-- Search Section -->
        <div class="history-search">
          <div class="search-container">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              id="${this.containerId}-search" 
              class="search-input" 
              placeholder="${this.options.searchPlaceholder}"
              autocomplete="off"
            />
            <button class="clear-search-btn" title="Clear Search" style="display: none;">
              <span>✕</span>
            </button>
          </div>
          <div class="search-filters">
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="today">Today</button>
            <button class="filter-btn" data-filter="week">Week</button>
            ${this.options.showProviderFilter ? `
            <div class="provider-filters">
              <button class="provider-filter-btn active" data-provider="all" title="All Providers">🔗</button>
              <button class="provider-filter-btn" data-provider="claude" title="Claude">🤖</button>
              <button class="provider-filter-btn" data-provider="openai" title="OpenAI">🧠</button>
              <button class="provider-filter-btn" data-provider="gemini" title="Gemini">💎</button>
            </div>` : ""}
          </div>
        </div>
        
        <!-- Conversations List -->
        <div class="conversations-container">
          <div id="${this.containerId}-list" class="conversations-list">
            <!-- Conversations will be dynamically added here -->
          </div>
          <div class="loading-indicator" style="display: none;">
            <div class="loading-spinner"></div>
            <span>Loading conversations...</span>
          </div>
          <div class="empty-state" style="display: none;">
            <div class="empty-icon">💬</div>
            <div class="empty-title">No conversations yet</div>
            <div class="empty-description">Start a new chat to see your conversation history</div>
            <button class="empty-action-btn">Start New Chat</button>
          </div>
        </div>
        
        <!-- History Stats (collapsed view) -->
        <div class="history-stats">
          <div class="stats-item">
            <span class="stats-value">0</span>
            <span class="stats-label">Total</span>
          </div>
          <div class="stats-item">
            <span class="stats-value">0</span>
            <span class="stats-label">Today</span>
          </div>
        </div>
      </div>
    `;
    this.elements = {
      panel: this.container.querySelector(".chat-history-panel"),
      header: this.container.querySelector(".history-header"),
      searchInput: document.getElementById(`${this.containerId}-search`),
      searchContainer: this.container.querySelector(".search-container"),
      clearSearchButton: this.container.querySelector(".clear-search-btn"),
      filterButtons: this.container.querySelectorAll(".filter-btn"),
      conversationsList: document.getElementById(`${this.containerId}-list`),
      loadingIndicator: this.container.querySelector(".loading-indicator"),
      emptyState: this.container.querySelector(".empty-state"),
      collapseBtn: this.container.querySelector(".collapse-btn"),
      newChatBtn: this.container.querySelector(".new-chat-btn"),
      emptyActionBtn: this.container.querySelector(".empty-action-btn"),
      statsItems: this.container.querySelectorAll(".stats-value")
    };
  }
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    let searchTimeout;
    this.elements.searchInput?.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.handleSearch(e.target.value);
      }, 300);
    });
    this.elements.clearSearchButton?.addEventListener("click", () => {
      this.clearSearch();
    });
    this.elements.filterButtons?.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.handleFilterChange(e.target.dataset.filter);
      });
    });
    this.elements.providerFilterButtons = this.container.querySelectorAll(".provider-filter-btn");
    this.elements.providerFilterButtons?.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.handleProviderFilterChange(e.target.dataset.provider);
      });
    });
    this.elements.collapseBtn?.addEventListener("click", () => {
      this.toggleCollapse();
    });
    this.elements.newChatBtn?.addEventListener("click", () => {
      this.createNewChat();
    });
    this.elements.emptyActionBtn?.addEventListener("click", () => {
      this.createNewChat();
    });
    this.boundKeydownHandler = (e) => this.handleKeyboardShortcuts(e);
    document.addEventListener("keydown", this.boundKeydownHandler);
    this.setupContextMenu();
  }
  /**
   * Load conversations from storage or API
   */
  async loadConversations() {
    this.showLoading(true);
    try {
      let conversations = [];
      if (this.globalStateManager) {
        try {
          conversations = await this.globalStateManager.loadChatHistory("blog") || [];
          console.log("[ChatHistoryPanel] Conversations loaded via GlobalStateManager");
        } catch (error) {
          console.warn("[ChatHistoryPanel] GlobalStateManager failed, trying alternatives:", error);
        }
      }
      if (conversations.length === 0 && window.electronAPI?.state?.loadChatHistory) {
        const result = await window.electronAPI.state.loadChatHistory();
        if (result.success && result.data) {
          conversations = result.data;
          console.log("[ChatHistoryPanel] Conversations loaded via state-manager");
        }
      }
      if (conversations.length === 0 && window.electronAPI?.chatHistory) {
        const result = await window.electronAPI.chatHistory.getConversations();
        if (result.success) {
          conversations = result.data || [];
          console.log("[ChatHistoryPanel] Conversations loaded via chatHistory API");
        }
      }
      if (conversations.length === 0) {
        const stored = localStorage.getItem("chatHistory");
        if (stored) {
          conversations = JSON.parse(stored);
          console.log("[ChatHistoryPanel] Conversations loaded from localStorage");
        }
      }
      this.conversations = conversations;
      this.updateFilteredConversations();
      this.renderConversations();
      this.updateStats();
    } catch (error) {
      console.error("[ChatHistoryPanel] Failed to load conversations:", error);
      this.showError("Failed to load conversation history");
    } finally {
      this.showLoading(false);
    }
  }
  /**
   * Handle search input
   */
  handleSearch(query) {
    this.searchQuery = query.trim().toLowerCase();
    if (this.elements.clearSearchButton) {
      this.elements.clearSearchButton.style.display = query ? "block" : "none";
    }
    this.updateFilteredConversations();
    this.renderConversations();
  }
  /**
   * Clear search
   */
  clearSearch() {
    if (this.elements.searchInput) {
      this.elements.searchInput.value = "";
    }
    this.handleSearch("");
  }
  /**
   * Handle filter change
   */
  handleFilterChange(filter) {
    this.elements.filterButtons?.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === filter);
    });
    this.currentFilter = filter;
    this.updateFilteredConversations();
    this.renderConversations();
    this.debouncedSavePreferences();
  }
  /**
   * Update filtered conversations based on search and filters
   */
  updateFilteredConversations() {
    let filtered = [...this.conversations];
    if (this.searchQuery) {
      filtered = filtered.filter(
        (conv) => conv.title?.toLowerCase().includes(this.searchQuery) || conv.preview?.toLowerCase().includes(this.searchQuery) || conv.messages?.some(
          (msg) => msg.content?.toLowerCase().includes(this.searchQuery)
        )
      );
    }
    if (this.providerFilter && this.providerFilter !== "all") {
      filtered = filtered.filter((conv) => {
        const providerInfo = this.getConversationProviderInfo(conv);
        return providerInfo.provider === this.providerFilter;
      });
    }
    const now = /* @__PURE__ */ new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1e3);
    switch (this.currentFilter) {
      case "today":
        filtered = filtered.filter(
          (conv) => new Date(conv.lastModified || conv.createdAt) >= today
        );
        break;
      case "week":
        filtered = filtered.filter(
          (conv) => new Date(conv.lastModified || conv.createdAt) >= weekAgo
        );
        break;
    }
    filtered.sort(
      (a, b) => new Date(b.lastModified || b.createdAt) - new Date(a.lastModified || a.createdAt)
    );
    this.filteredConversations = filtered.slice(0, this.options.maxDisplayed);
  }
  /**
   * Render conversations list
   */
  renderConversations() {
    if (!this.elements.conversationsList) return;
    if (this.filteredConversations.length === 0) {
      this.showEmptyState();
      return;
    }
    this.hideEmptyState();
    const listHTML = this.filteredConversations.map(
      (conv) => this.renderConversationItem(conv)
    ).join("");
    this.elements.conversationsList.innerHTML = listHTML;
    this.setupConversationListeners();
  }
  /**
   * Render a single conversation item
   */
  renderConversationItem(conversation) {
    const isActive = conversation.id === this.currentSessionId;
    const timeAgo = this.formatTimeAgo(new Date(conversation.lastModified || conversation.createdAt));
    const messageCount = conversation.messages?.length || 0;
    const preview = this.options.showPreview ? conversation.preview || "No preview available" : "";
    const providerInfo = this.getConversationProviderInfo(conversation);
    const costInfo = this.getConversationCostInfo(conversation);
    return `
      <div class="conversation-item ${isActive ? "active" : ""}" data-session-id="${conversation.id}">
        <div class="conversation-header">
          <div class="conversation-title-group">
            ${providerInfo.provider && this.options.enableProviderMetadata ? `
              <span class="provider-badge ${providerInfo.provider}" title="${providerInfo.displayName}">
                ${providerInfo.icon}
              </span>
            ` : ""}
            <div class="conversation-title">${this.highlightSearch(conversation.title || "Unnamed Conversation")}</div>
          </div>
          <div class="conversation-time">${timeAgo}</div>
        </div>
        ${this.options.showPreview ? `
          <div class="conversation-preview">${this.highlightSearch(preview)}</div>
        ` : ""}
        <div class="conversation-meta">
          <div class="conversation-stats">
            <div class="message-count">
              <span>💬</span>
              <span>${messageCount}</span>
            </div>
            ${providerInfo.model && this.options.enableProviderMetadata ? `
              <div class="model-info" title="AI Model">
                <span>🔧</span>
                <span>${providerInfo.model}</span>
              </div>
            ` : ""}
            ${costInfo.totalCost > 0 && this.options.showCostInfo ? `
              <div class="cost-info" title="Total Cost">
                <span>💰</span>
                <span>$${costInfo.totalCost.toFixed(4)}</span>
              </div>
            ` : ""}
          </div>
          <div class="conversation-actions">
            <button class="conversation-action-btn pin" title="Pin Conversation">
              <span>📌</span>
            </button>
            <button class="conversation-action-btn delete" title="Delete Conversation">
              <span>🗑️</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }
  /**
   * Setup event listeners for conversation items
   */
  setupConversationListeners() {
    const conversationItems = this.elements.conversationsList.querySelectorAll(".conversation-item");
    conversationItems.forEach((item) => {
      const sessionId = item.dataset.sessionId;
      item.addEventListener("click", (e) => {
        if (!e.target.closest(".conversation-actions")) {
          this.selectConversation(sessionId);
        }
      });
      const deleteBtn = item.querySelector(".conversation-action-btn.delete");
      deleteBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteConversation(sessionId);
      });
      const pinBtn = item.querySelector(".conversation-action-btn.pin");
      pinBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.togglePinConversation(sessionId);
      });
    });
  }
  /**
   * Select a conversation
   */
  selectConversation(sessionId) {
    const conversation = this.conversations.find((conv) => conv.id === sessionId);
    if (!conversation) return;
    this.currentSessionId = sessionId;
    this.renderConversations();
    this.onSessionSelect(conversation);
    console.log(`[ChatHistoryPanel] Selected conversation: ${sessionId}`);
  }
  /**
   * Create new chat session
   */
  createNewChat() {
    const newSession = {
      id: `session_${Date.now()}`,
      title: "New Conversation",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastModified: (/* @__PURE__ */ new Date()).toISOString(),
      messages: [],
      preview: ""
    };
    this.conversations.unshift(newSession);
    this.selectConversation(newSession.id);
    this.saveConversations();
    console.log(`[ChatHistoryPanel] Created new chat session: ${newSession.id}`);
  }
  /**
   * Delete a conversation
   */
  deleteConversation(sessionId) {
    if (confirm("Are you sure you want to delete this conversation?")) {
      this.conversations = this.conversations.filter((conv) => conv.id !== sessionId);
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }
      this.updateFilteredConversations();
      this.renderConversations();
      this.updateStats();
      this.saveConversations();
      this.onSessionDelete(sessionId);
      console.log(`[ChatHistoryPanel] Deleted conversation: ${sessionId}`);
    }
  }
  /**
   * Toggle pin status of a conversation
   */
  togglePinConversation(sessionId) {
    const conversation = this.conversations.find((conv) => conv.id === sessionId);
    if (conversation) {
      conversation.pinned = !conversation.pinned;
      this.updateFilteredConversations();
      this.renderConversations();
      this.saveConversations();
      console.log(`[ChatHistoryPanel] Toggled pin for conversation: ${sessionId}`);
    }
  }
  /**
   * Toggle collapse state
   */
  toggleCollapse(force = null) {
    const shouldCollapse = force !== null ? force : !this.isCollapsed;
    this.isCollapsed = shouldCollapse;
    this.elements.panel?.classList.toggle("collapsed", shouldCollapse);
    this.debouncedSavePreferences();
    this.onToggleCollapse(shouldCollapse);
    console.log(`[ChatHistoryPanel] Panel ${shouldCollapse ? "collapsed" : "expanded"}`);
  }
  /**
   * Focus search input
   */
  focusSearch() {
    this.elements.searchInput?.focus();
  }
  /**
   * Show/hide loading indicator
   */
  showLoading(show = true) {
    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.style.display = show ? "flex" : "none";
    }
    if (this.elements.conversationsList) {
      this.elements.conversationsList.style.display = show ? "none" : "block";
    }
  }
  /**
   * Show/hide empty state
   */
  showEmptyState() {
    if (this.elements.emptyState) {
      this.elements.emptyState.style.display = "flex";
    }
    if (this.elements.conversationsList) {
      this.elements.conversationsList.style.display = "none";
    }
  }
  /**
   * Hide empty state
   */
  hideEmptyState() {
    if (this.elements.emptyState) {
      this.elements.emptyState.style.display = "none";
    }
    if (this.elements.conversationsList) {
      this.elements.conversationsList.style.display = "block";
    }
  }
  /**
   * Show error message
   */
  showError(message) {
    console.error(`[ChatHistoryPanel] Error: ${message}`);
  }
  /**
   * Update statistics
   */
  updateStats() {
    if (!this.elements.statsItems) return;
    const total = this.conversations.length;
    const today = this.conversations.filter((conv) => {
      const convDate = new Date(conv.lastModified || conv.createdAt);
      const todayDate = /* @__PURE__ */ new Date();
      return convDate.toDateString() === todayDate.toDateString();
    }).length;
    const statsValues = Array.from(this.elements.statsItems);
    if (statsValues[0]) statsValues[0].textContent = total.toString();
    if (statsValues[1]) statsValues[1].textContent = today.toString();
  }
  /**
   * Highlight search terms in text
   */
  highlightSearch(text) {
    if (!this.searchQuery || !text) return text;
    const regex = new RegExp(`(${this.searchQuery})`, "gi");
    return text.replace(regex, '<span class="search-highlight">$1</span>');
  }
  /**
   * Format time ago string
   */
  formatTimeAgo(date) {
    const now = /* @__PURE__ */ new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 6e4);
    const hours = Math.floor(diff / 36e5);
    const days = Math.floor(diff / 864e5);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }
  /**
   * Save conversations to storage
   */
  async saveConversations() {
    try {
      if (this.globalStateManager) {
        try {
          await this.globalStateManager.saveChatHistory("blog", this.conversations);
          console.log("[ChatHistoryPanel] Conversations saved via GlobalStateManager");
          if (this.eventBus) {
            this.eventBus.publish("chat-history-updated", {
              workspaceId: "blog",
              conversations: this.conversations.length,
              source: "ChatHistoryPanel"
            });
          }
          return;
        } catch (error) {
          console.warn("[ChatHistoryPanel] GlobalStateManager save failed, trying alternatives:", error);
        }
      }
      if (window.electronAPI?.state?.saveChatHistory) {
        const result = await window.electronAPI.state.saveChatHistory(this.conversations);
        if (result.success) {
          console.log("[ChatHistoryPanel] Conversations saved via state-manager");
          return;
        }
      }
      if (window.electronAPI?.chatHistory) {
        await window.electronAPI.chatHistory.saveConversations(this.conversations);
        console.log("[ChatHistoryPanel] Conversations saved via chatHistory API");
        return;
      }
      localStorage.setItem("chatHistory", JSON.stringify(this.conversations));
      console.log("[ChatHistoryPanel] Conversations saved to localStorage");
    } catch (error) {
      console.error("[ChatHistoryPanel] Failed to save conversations:", error);
    }
  }
  /**
   * Add or update a conversation
   */
  updateConversation(conversation) {
    const existingIndex = this.conversations.findIndex((conv) => conv.id === conversation.id);
    if (existingIndex >= 0) {
      this.conversations[existingIndex] = { ...conversation, lastModified: (/* @__PURE__ */ new Date()).toISOString() };
    } else {
      this.conversations.unshift({ ...conversation, createdAt: (/* @__PURE__ */ new Date()).toISOString(), lastModified: (/* @__PURE__ */ new Date()).toISOString() });
    }
    this.updateFilteredConversations();
    this.renderConversations();
    this.updateStats();
    this.saveConversations();
  }
  /**
   * Get current conversation
   */
  getCurrentConversation() {
    return this.conversations.find((conv) => conv.id === this.currentSessionId) || null;
  }
  /**
   * Get component state
   */
  getState() {
    return {
      isCollapsed: this.isCollapsed,
      currentSessionId: this.currentSessionId,
      searchQuery: this.searchQuery,
      currentFilter: this.currentFilter || "all",
      providerFilter: this.providerFilter || "all",
      conversations: this.conversations,
      conversationsCount: this.conversations.length,
      isInitialized: this.isInitialized
    };
  }
  /**
   * Set component state for restoration
   */
  async setState(state) {
    try {
      console.log(`[ChatHistoryPanel] Restoring state for: ${this.containerId}`);
      if (state.conversations && Array.isArray(state.conversations)) {
        this.conversations = state.conversations;
      }
      if (state.currentSessionId !== void 0) {
        this.currentSessionId = state.currentSessionId;
      }
      if (state.searchQuery !== void 0) {
        this.searchQuery = state.searchQuery;
        if (this.elements.searchInput) {
          this.elements.searchInput.value = state.searchQuery;
        }
      }
      if (state.currentFilter !== void 0) {
        this.currentFilter = state.currentFilter;
        this.elements.filterButtons?.forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.filter === state.currentFilter);
        });
      }
      if (state.providerFilter !== void 0) {
        this.providerFilter = state.providerFilter;
        this.elements.providerFilterButtons?.forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.provider === state.providerFilter);
        });
      }
      if (state.isCollapsed !== void 0) {
        this.toggleCollapse(state.isCollapsed);
      }
      this.updateFilteredConversations();
      this.renderConversations();
      this.updateStats();
      console.log(`[ChatHistoryPanel] State restored successfully`);
      this.dispatchEvent("chat-history-panel-state-restored", {
        containerId: this.containerId,
        state
      });
    } catch (error) {
      console.error(`[ChatHistoryPanel] Failed to restore state:`, error);
    }
  }
  /**
   * Save panel preferences
   */
  async savePanelPreferences() {
    const preferences = {
      isCollapsed: this.isCollapsed,
      currentFilter: this.currentFilter || "all",
      searchQuery: this.searchQuery
    };
    try {
      if (window.electronAPI?.state?.saveHistoryPanelPreferences) {
        await window.electronAPI.state.saveHistoryPanelPreferences(preferences);
      } else {
        localStorage.setItem("historyPanelPreferences", JSON.stringify(preferences));
      }
    } catch (error) {
      console.warn("[ChatHistoryPanel] Failed to save panel preferences:", error);
    }
  }
  /**
   * Load panel preferences
   */
  async loadPanelPreferences() {
    try {
      let preferences = null;
      if (window.electronAPI?.state?.loadHistoryPanelPreferences) {
        const result = await window.electronAPI.state.loadHistoryPanelPreferences();
        preferences = result.success ? result.data : null;
      } else {
        const stored = localStorage.getItem("historyPanelPreferences");
        preferences = stored ? JSON.parse(stored) : null;
      }
      if (preferences) {
        if (preferences.isCollapsed !== void 0) {
          this.toggleCollapse(preferences.isCollapsed);
        }
        if (preferences.currentFilter) {
          this.handleFilterChange(preferences.currentFilter);
        }
        if (preferences.searchQuery) {
          this.elements.searchInput.value = preferences.searchQuery;
          this.handleSearch(preferences.searchQuery);
        }
      }
    } catch (error) {
      console.warn("[ChatHistoryPanel] Failed to load panel preferences:", error);
    }
  }
  /**
   * Debounced save preferences to avoid excessive saves
   */
  debouncedSavePreferences() {
    clearTimeout(this.savePreferencesTimeout);
    this.savePreferencesTimeout = setTimeout(() => {
      this.savePanelPreferences();
    }, 1e3);
  }
  /**
   * Setup workspace integration
   */
  setupWorkspaceIntegration() {
    this.workspaceEventHandlers = {
      "workspace-switched": (event) => this.handleWorkspaceSwitch(event.detail),
      "chat-message-added": (event) => this.handleChatMessageAdded(event.detail),
      "chat-session-created": (event) => this.handleChatSessionCreated(event.detail),
      "ui-theme-changed": (event) => this.handleThemeChange(event.detail)
    };
    Object.entries(this.workspaceEventHandlers).forEach(([eventType, handler]) => {
      window.addEventListener(eventType, handler);
    });
    if (window.globalStateManager) {
      window.globalStateManager.subscribe("chat-history", (data) => {
        this.handleGlobalStateUpdate(data);
      });
    }
  }
  /**
   * Setup real-time synchronization
   */
  setupRealTimeSync() {
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncWithStorage();
      } catch (error) {
        console.warn("[ChatHistoryPanel] Sync failed:", error);
      }
    }, 1e4);
    window.addEventListener("storage", (e) => {
      if (e.key === "chatHistory") {
        this.handleStorageChange(e);
      }
    });
  }
  /**
   * Enhanced keyboard shortcuts handler
   */
  handleKeyboardShortcuts(e) {
    const isInputFocused = e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA";
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      switch (e.key) {
        case "K":
          e.preventDefault();
          this.focusSearch();
          break;
        case "N":
          e.preventDefault();
          this.createNewChat();
          break;
        case "H":
          e.preventDefault();
          this.toggleCollapse();
          break;
        case "E":
          e.preventDefault();
          this.exportConversations();
          break;
      }
    }
    if (!isInputFocused) {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          this.navigateConversations("up");
          break;
        case "ArrowDown":
          e.preventDefault();
          this.navigateConversations("down");
          break;
        case "Enter":
          e.preventDefault();
          this.activateSelectedConversation();
          break;
        case "Delete":
        case "Backspace":
          if (e.shiftKey) {
            e.preventDefault();
            this.deleteSelectedConversation();
          }
          break;
        case "Escape":
          this.clearSearch();
          break;
      }
    }
  }
  /**
   * Setup context menu for conversations
   */
  setupContextMenu() {
    this.elements.conversationsList?.addEventListener("contextmenu", (e) => {
      const conversationItem = e.target.closest(".conversation-item");
      if (conversationItem) {
        e.preventDefault();
        this.showContextMenu(e, conversationItem.dataset.sessionId);
      }
    });
  }
  /**
   * Show context menu for conversation
   */
  showContextMenu(event, sessionId) {
    const conversation = this.conversations.find((conv) => conv.id === sessionId);
    if (!conversation) return;
    const contextMenu = document.createElement("div");
    contextMenu.className = "conversation-context-menu";
    contextMenu.innerHTML = `
      <div class="context-menu-item" data-action="open">
        <span>📖</span> Open Conversation
      </div>
      <div class="context-menu-item" data-action="rename">
        <span>✏️</span> Rename
      </div>
      <div class="context-menu-item" data-action="duplicate">
        <span>📋</span> Duplicate
      </div>
      <div class="context-menu-item" data-action="export">
        <span>💾</span> Export
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item danger" data-action="delete">
        <span>🗑️</span> Delete
      </div>
    `;
    contextMenu.style.position = "fixed";
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.style.top = `${event.clientY}px`;
    contextMenu.style.zIndex = "10000";
    document.body.appendChild(contextMenu);
    contextMenu.addEventListener("click", (e) => {
      const action = e.target.closest(".context-menu-item")?.dataset.action;
      if (action) {
        this.handleContextMenuAction(action, sessionId);
      }
      document.body.removeChild(contextMenu);
    });
    const removeMenu = (e) => {
      if (!contextMenu.contains(e.target)) {
        document.body.removeChild(contextMenu);
        document.removeEventListener("click", removeMenu);
      }
    };
    setTimeout(() => document.addEventListener("click", removeMenu), 0);
  }
  /**
   * Handle context menu actions
   */
  handleContextMenuAction(action, sessionId) {
    const conversation = this.conversations.find((conv) => conv.id === sessionId);
    if (!conversation) return;
    switch (action) {
      case "open":
        this.selectConversation(sessionId);
        break;
      case "rename":
        this.renameConversation(sessionId);
        break;
      case "duplicate":
        this.duplicateConversation(sessionId);
        break;
      case "export":
        this.exportSingleConversation(sessionId);
        break;
      case "delete":
        this.deleteConversation(sessionId);
        break;
    }
  }
  /**
   * Navigate conversations with keyboard
   */
  navigateConversations(direction) {
    const items = Array.from(this.elements.conversationsList.querySelectorAll(".conversation-item"));
    if (items.length === 0) return;
    let currentIndex = items.findIndex((item) => item.classList.contains("keyboard-selected"));
    if (currentIndex === -1) {
      currentIndex = items.findIndex((item) => item.classList.contains("active"));
    }
    if (direction === "up") {
      currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
    } else {
      currentIndex = currentIndex >= items.length - 1 ? 0 : currentIndex + 1;
    }
    items.forEach((item) => item.classList.remove("keyboard-selected"));
    items[currentIndex].classList.add("keyboard-selected");
    items[currentIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  /**
   * Activate selected conversation
   */
  activateSelectedConversation() {
    const selectedItem = this.elements.conversationsList.querySelector(".keyboard-selected");
    if (selectedItem) {
      this.selectConversation(selectedItem.dataset.sessionId);
    }
  }
  /**
   * Delete selected conversation
   */
  deleteSelectedConversation() {
    const selectedItem = this.elements.conversationsList.querySelector(".keyboard-selected");
    if (selectedItem) {
      this.deleteConversation(selectedItem.dataset.sessionId);
    }
  }
  /**
   * Rename conversation
   */
  renameConversation(sessionId) {
    const conversation = this.conversations.find((conv) => conv.id === sessionId);
    if (!conversation) return;
    const newTitle = prompt("Enter new conversation title:", conversation.title);
    if (newTitle && newTitle.trim() && newTitle.trim() !== conversation.title) {
      conversation.title = newTitle.trim();
      conversation.lastModified = (/* @__PURE__ */ new Date()).toISOString();
      this.updateFilteredConversations();
      this.renderConversations();
      this.saveConversations();
      console.log(`[ChatHistoryPanel] Renamed conversation: ${sessionId}`);
    }
  }
  /**
   * Duplicate conversation
   */
  duplicateConversation(sessionId) {
    const conversation = this.conversations.find((conv) => conv.id === sessionId);
    if (!conversation) return;
    const duplicated = {
      ...conversation,
      id: `session_${Date.now()}`,
      title: `${conversation.title} (Copy)`,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastModified: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.conversations.unshift(duplicated);
    this.updateFilteredConversations();
    this.renderConversations();
    this.updateStats();
    this.saveConversations();
    console.log(`[ChatHistoryPanel] Duplicated conversation: ${sessionId} -> ${duplicated.id}`);
  }
  /**
   * Export single conversation
   */
  exportSingleConversation(sessionId) {
    const conversation = this.conversations.find((conv) => conv.id === sessionId);
    if (!conversation) return;
    const exportData = JSON.stringify([conversation], null, 2);
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation_${conversation.title.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  /**
   * Export all conversations
   */
  exportConversations() {
    if (this.conversations.length === 0) {
      alert("No conversations to export");
      return;
    }
    const exportData = JSON.stringify(this.conversations, null, 2);
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat_history_export_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  /**
   * Handle workspace switch
   */
  handleWorkspaceSwitch(detail) {
    const { workspace } = detail;
    if (workspace === "blog") {
      this.setWorkspaceMode("blog");
    } else {
      this.setWorkspaceMode("default");
    }
  }
  /**
   * Set workspace mode
   */
  setWorkspaceMode(mode) {
    this.workspaceMode = mode;
    if (this.elements.panel) {
      this.elements.panel.classList.toggle("blog-mode", mode === "blog");
    }
    console.log(`[ChatHistoryPanel] Workspace mode set to: ${mode}`);
  }
  /**
   * Handle chat message added
   */
  handleChatMessageAdded(detail) {
    const { conversationId, message } = detail;
    const conversation = this.conversations.find((conv) => conv.id === conversationId);
    if (conversation) {
      if (!conversation.messages) conversation.messages = [];
      conversation.messages.push(message);
      conversation.lastModified = (/* @__PURE__ */ new Date()).toISOString();
      conversation.preview = message.content?.substring(0, 100) || "";
      this.updateFilteredConversations();
      this.renderConversations();
      this.updateStats();
      this.debouncedSaveConversations();
    }
  }
  /**
   * Handle chat session created
   */
  handleChatSessionCreated(detail) {
    const { sessionId, conversation } = detail;
    this.conversations.unshift(conversation);
    this.selectConversation(sessionId);
    this.updateFilteredConversations();
    this.renderConversations();
    this.updateStats();
    this.saveConversations();
  }
  /**
   * Handle theme change
   */
  handleThemeChange(detail) {
    const { theme } = detail;
    if (this.elements.panel) {
      this.elements.panel.classList.remove("theme-light", "theme-dark");
      this.elements.panel.classList.add(`theme-${theme}`);
    }
  }
  /**
   * Handle global state update
   */
  handleGlobalStateUpdate(data) {
    if (data.conversations && Array.isArray(data.conversations)) {
      this.conversations = data.conversations;
      this.updateFilteredConversations();
      this.renderConversations();
      this.updateStats();
    }
  }
  /**
   * Sync with storage
   */
  async syncWithStorage() {
    try {
      const stored = localStorage.getItem("chatHistory");
      if (stored) {
        const storedConversations = JSON.parse(stored);
        const lastLocalUpdate = Math.max(...this.conversations.map((c) => new Date(c.lastModified || c.createdAt).getTime()));
        const lastStoredUpdate = Math.max(...storedConversations.map((c) => new Date(c.lastModified || c.createdAt).getTime()));
        if (lastStoredUpdate > lastLocalUpdate) {
          console.log("[ChatHistoryPanel] Syncing with newer storage data");
          this.conversations = storedConversations;
          this.updateFilteredConversations();
          this.renderConversations();
          this.updateStats();
        }
      }
    } catch (error) {
      console.warn("[ChatHistoryPanel] Storage sync failed:", error);
    }
  }
  /**
   * Handle storage change
   */
  handleStorageChange(event) {
    if (event.key === "chatHistory" && event.newValue) {
      try {
        const newConversations = JSON.parse(event.newValue);
        console.log("[ChatHistoryPanel] Detected storage change, updating conversations");
        this.conversations = newConversations;
        this.updateFilteredConversations();
        this.renderConversations();
        this.updateStats();
      } catch (error) {
        console.warn("[ChatHistoryPanel] Failed to handle storage change:", error);
      }
    }
  }
  /**
   * Debounced save conversations
   */
  debouncedSaveConversations() {
    clearTimeout(this.saveConversationsTimeout);
    this.saveConversationsTimeout = setTimeout(() => {
      this.saveConversations();
    }, 2e3);
  }
  /**
   * Cleanup workspace integration
   */
  cleanupWorkspaceIntegration() {
    if (this.workspaceEventHandlers) {
      Object.entries(this.workspaceEventHandlers).forEach(([eventType, handler]) => {
        window.removeEventListener(eventType, handler);
      });
    }
    if (window.globalStateManager) {
      window.globalStateManager.unsubscribe("chat-history");
    }
  }
  /**
   * Handle provider filter change
   */
  handleProviderFilterChange(provider) {
    this.elements.providerFilterButtons?.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.provider === provider);
    });
    this.providerFilter = provider;
    this.updateFilteredConversations();
    this.renderConversations();
    this.debouncedSavePreferences();
    console.log(`[ChatHistoryPanel] Provider filter changed to: ${provider}`);
  }
  /**
   * Get conversation provider info
   */
  getConversationProviderInfo(conversation) {
    const metadata = conversation.providerMetadata || {};
    const provider = metadata.lastProvider || this.inferProviderFromMessages(conversation);
    const providerInfo = {
      claude: { icon: "🤖", displayName: "Claude" },
      openai: { icon: "🧠", displayName: "OpenAI" },
      gemini: { icon: "💎", displayName: "Gemini" }
    };
    return {
      provider,
      model: metadata.lastModel,
      icon: providerInfo[provider]?.icon || "❓",
      displayName: providerInfo[provider]?.displayName || "Unknown"
    };
  }
  /**
   * Get conversation cost info
   */
  getConversationCostInfo(conversation) {
    const metadata = conversation.providerMetadata || {};
    return {
      totalCost: metadata.totalCost || 0,
      totalTokens: metadata.totalTokens || 0
    };
  }
  /**
   * Infer provider from conversation messages
   */
  inferProviderFromMessages(conversation) {
    if (!conversation.messages || conversation.messages.length === 0) {
      return null;
    }
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      const message = conversation.messages[i];
      if (message.metadata && message.metadata.provider) {
        return message.metadata.provider;
      }
    }
    return null;
  }
  /**
   * Handle provider change from workspace
   */
  handleProviderChange(detail) {
    const { workspaceId, newProvider, previousProvider } = detail;
    this.currentProvider = newProvider;
    if (this.elements.panel) {
      this.elements.panel.setAttribute("data-current-provider", newProvider);
    }
    if (this.providerFilter === previousProvider) {
      this.handleProviderFilterChange(newProvider);
    }
    console.log(`[ChatHistoryPanel] Provider changed: ${previousProvider} → ${newProvider}`);
  }
  /**
   * Enable provider metadata display
   */
  enableProviderMetadata(enabled = true) {
    this.providerMetadataEnabled = enabled;
    this.options.enableProviderMetadata = enabled;
    if (enabled) {
      this.renderConversations();
    }
    console.log(`[ChatHistoryPanel] Provider metadata ${enabled ? "enabled" : "disabled"}`);
  }
  /**
   * Get provider statistics
   */
  getProviderStatistics() {
    const stats = {
      totalConversations: this.conversations.length,
      providerBreakdown: {},
      totalCost: 0,
      totalTokens: 0
    };
    this.conversations.forEach((conv) => {
      const providerInfo = this.getConversationProviderInfo(conv);
      const costInfo = this.getConversationCostInfo(conv);
      if (providerInfo.provider) {
        stats.providerBreakdown[providerInfo.provider] = {
          count: (stats.providerBreakdown[providerInfo.provider]?.count || 0) + 1,
          cost: (stats.providerBreakdown[providerInfo.provider]?.cost || 0) + costInfo.totalCost,
          tokens: (stats.providerBreakdown[providerInfo.provider]?.tokens || 0) + costInfo.totalTokens
        };
      }
      stats.totalCost += costInfo.totalCost;
      stats.totalTokens += costInfo.totalTokens;
    });
    return stats;
  }
  /**
   * Dispatch custom event
   */
  dispatchEvent(eventType, detail) {
    const event = new CustomEvent(eventType, { detail });
    window.dispatchEvent(event);
  }
  /**
   * Destroy the component
   */
  destroy() {
    this.savePanelPreferences();
    clearTimeout(this.savePreferencesTimeout);
    clearInterval(this.syncInterval);
    if (this.boundKeydownHandler) {
      document.removeEventListener("keydown", this.boundKeydownHandler);
    }
    this.cleanupWorkspaceIntegration();
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.conversations = [];
    this.filteredConversations = [];
    this.currentSessionId = null;
    this.isInitialized = false;
    this.dispatchEvent("chat-history-panel-destroyed", {
      containerId: this.containerId
    });
    console.log(`[ChatHistoryPanel] Destroyed: ${this.containerId}`);
  }
}
class EventEmitter {
  constructor() {
    this._events = /* @__PURE__ */ new Map();
    this._maxListeners = 10;
  }
  /**
   * Add event listener
   */
  on(eventName, listener) {
    if (!this._events.has(eventName)) {
      this._events.set(eventName, []);
    }
    const listeners = this._events.get(eventName);
    listeners.push(listener);
    if (listeners.length > this._maxListeners) {
      console.warn(`MaxListenersExceededWarning: Possible EventEmitter memory leak detected. ${listeners.length} ${eventName} listeners added.`);
    }
    return this;
  }
  /**
   * Add event listener (alias for on)
   */
  addEventListener(eventName, listener) {
    return this.on(eventName, listener);
  }
  /**
   * Add one-time event listener
   */
  once(eventName, listener) {
    const onceWrapper = (...args) => {
      this.off(eventName, onceWrapper);
      listener.apply(this, args);
    };
    return this.on(eventName, onceWrapper);
  }
  /**
   * Remove event listener
   */
  off(eventName, listener) {
    if (!this._events.has(eventName)) {
      return this;
    }
    const listeners = this._events.get(eventName);
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
      if (listeners.length === 0) {
        this._events.delete(eventName);
      }
    }
    return this;
  }
  /**
   * Remove event listener (alias for off)
   */
  removeListener(eventName, listener) {
    return this.off(eventName, listener);
  }
  /**
   * Remove event listener (alias for off)
   */
  removeEventListener(eventName, listener) {
    return this.off(eventName, listener);
  }
  /**
   * Remove all listeners for event
   */
  removeAllListeners(eventName) {
    if (eventName) {
      this._events.delete(eventName);
    } else {
      this._events.clear();
    }
    return this;
  }
  /**
   * Emit event
   */
  emit(eventName, ...args) {
    if (!this._events.has(eventName)) {
      return false;
    }
    const listeners = this._events.get(eventName).slice();
    for (const listener of listeners) {
      try {
        listener.apply(this, args);
      } catch (error) {
        console.error("EventEmitter error:", error);
      }
    }
    return true;
  }
  /**
   * Get listener count for event
   */
  listenerCount(eventName) {
    if (!this._events.has(eventName)) {
      return 0;
    }
    return this._events.get(eventName).length;
  }
  /**
   * Get all event names
   */
  eventNames() {
    return Array.from(this._events.keys());
  }
  /**
   * Get listeners for event
   */
  listeners(eventName) {
    if (!this._events.has(eventName)) {
      return [];
    }
    return this._events.get(eventName).slice();
  }
  /**
   * Get raw listeners for event
   */
  rawListeners(eventName) {
    return this.listeners(eventName);
  }
  /**
   * Set max listeners
   */
  setMaxListeners(maxListeners) {
    this._maxListeners = maxListeners;
    return this;
  }
  /**
   * Get max listeners
   */
  getMaxListeners() {
    return this._maxListeners;
  }
}
class EventBus extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      maxListeners: options.maxListeners || 100,
      enableLogging: options.enableLogging !== false,
      ...options
    };
    this.isInitialized = false;
    this.eventHistory = [];
    this.moduleSubscriptions = /* @__PURE__ */ new Map();
    this.chatHistoryEventTypes = /* @__PURE__ */ new Set([
      "chat-history-initialized",
      "chat-history-state-initialized",
      "conversation-created",
      "conversation-loaded",
      "conversation-deleted",
      "conversation-updated",
      "message-added",
      "message-updated",
      "message-deleted",
      "active-conversation-changed",
      "chat-history-searched",
      "history-search-updated",
      "session-created",
      "session-continued",
      "session-resumed",
      "session-switched",
      "chat-history-cleanup-completed",
      "chat-history-preferences-updated",
      "chat-history-imported",
      "chat-history-exported",
      "chat-history-persisted",
      // State management events
      "state-active-conversation-changed",
      "state-conversation-cached",
      "state-conversation-removed",
      "state-search-updated",
      "state-filter-updated",
      "state-sort-updated",
      "state-connection-changed",
      // Synchronization events
      "chat-history-sync-started",
      "chat-history-sync-completed",
      "chat-history-sync-failed",
      "chat-history-offline-mode",
      "chat-history-online-mode"
    ]);
    this.providerEventTypes = /* @__PURE__ */ new Set([
      // Provider lifecycle events
      "ai-providers-initialized",
      "provider-status-changed",
      "provider-activated",
      "provider-deactivated",
      "provider-connected",
      "provider-disconnected",
      "provider-error",
      "provider-recovered",
      // Provider switching events
      "active-provider-changed",
      "provider-switch-requested",
      "provider-switch-completed",
      "provider-switch-failed",
      "provider-switch-warning",
      "provider-auto-switched",
      "provider-auto-switch-failed",
      "provider-auto-switch-error",
      // Model management events
      "provider-model-changed",
      "provider-config-updated",
      "provider-key-status-changed",
      // Cost and usage tracking events
      "provider-usage-tracked",
      "provider-cost-updated",
      "cost-limit-warning",
      "session-cost-reset",
      "cost-efficiency-analysis",
      "cost-recommendation-generated",
      "cost-budget-exceeded",
      "cost-trend-detected",
      // Health and monitoring events
      "provider-health-check-started",
      "provider-health-check-completed",
      "provider-health-analysis",
      "provider-monitoring-started",
      "provider-monitoring-stopped",
      "provider-monitoring-error",
      "provider-error-tracked",
      "provider-reliability-updated",
      "provider-performance-analysis",
      // Configuration events
      "provider-preferences-updated",
      "provider-configuration-changed",
      "provider-api-key-updated",
      "provider-security-check",
      // Conversation-specific provider events
      "conversation-provider-updated",
      "conversation-provider-switched",
      "conversation-provider-metadata-updated",
      // Persistence events
      "provider-state-restored",
      "provider-state-persisted",
      // Workspace integration events
      "workspace-provider-preference-updated",
      "workspace-provider-status-changed",
      "workspace-provider-cost-alert",
      // Analytics events
      "provider-analytics-generated",
      "provider-usage-pattern-detected",
      "provider-recommendation-accepted",
      "provider-recommendation-dismissed",
      // Multi-provider coordination events
      "multi-provider-request-started",
      "multi-provider-request-completed",
      "provider-load-balancing-triggered",
      "provider-failover-executed",
      // System events
      "global-state-manager-shutdown",
      "provider-system-maintenance",
      "provider-system-upgrade"
    ]);
    this.setMaxListeners(this.options.maxListeners);
  }
  /**
   * Initialize event bus
   */
  async initialize() {
    try {
      console.log("[EventBus] Initializing...");
      this.isInitialized = true;
      this.setupChatHistoryEventHandlers();
      this.setupProviderEventHandlers();
      this.setupEnhancedProviderCoordination();
      console.log("[EventBus] Successfully initialized");
      this.emit("initialized");
      return true;
    } catch (error) {
      console.error("[EventBus] Initialization failed:", error);
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Publish event to all subscribers
   */
  publish(eventName, data = {}) {
    if (!this.isInitialized) {
      console.warn("[EventBus] Cannot publish before initialization");
      return;
    }
    const eventData = {
      name: eventName,
      data,
      timestamp: Date.now(),
      id: this.generateEventId()
    };
    this.eventHistory.push(eventData);
    if (this.eventHistory.length > 1e3) {
      this.eventHistory.shift();
    }
    if (this.options.enableLogging) {
      console.log(`[EventBus] Publishing event: ${eventName}`, data);
    }
    this.emit(eventName, eventData);
    this.emit("event-published", eventData);
  }
  /**
   * Subscribe to events
   */
  subscribe(eventName, callback, moduleName = null) {
    if (!this.isInitialized) {
      console.warn("[EventBus] Cannot subscribe before initialization");
      return null;
    }
    if (moduleName) {
      if (!this.moduleSubscriptions.has(moduleName)) {
        this.moduleSubscriptions.set(moduleName, /* @__PURE__ */ new Set());
      }
      this.moduleSubscriptions.get(moduleName).add(eventName);
    }
    this.on(eventName, callback);
    if (this.options.enableLogging) {
      console.log(`[EventBus] Subscribed to event: ${eventName}${moduleName ? ` (module: ${moduleName})` : ""}`);
    }
    return () => {
      this.unsubscribe(eventName, callback);
      if (moduleName) {
        const moduleEvents = this.moduleSubscriptions.get(moduleName);
        if (moduleEvents) {
          moduleEvents.delete(eventName);
          if (moduleEvents.size === 0) {
            this.moduleSubscriptions.delete(moduleName);
          }
        }
      }
    };
  }
  /**
   * Unsubscribe from events
   */
  unsubscribe(eventName, callback) {
    this.off(eventName, callback);
    if (this.options.enableLogging) {
      console.log(`[EventBus] Unsubscribed from event: ${eventName}`);
    }
  }
  /**
   * Subscribe to multiple events at once
   */
  subscribeMultiple(eventNames, callback, moduleName = null) {
    const unsubscribeFunctions = [];
    eventNames.forEach((eventName) => {
      const unsubscribe = this.subscribe(eventName, callback, moduleName);
      unsubscribeFunctions.push(unsubscribe);
    });
    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe && unsubscribe());
    };
  }
  /**
   * Subscribe once to an event
   */
  subscribeOnce(eventName, callback, moduleName = null) {
    const wrappedCallback = (eventData) => {
      callback(eventData);
      this.unsubscribe(eventName, wrappedCallback);
    };
    return this.subscribe(eventName, wrappedCallback, moduleName);
  }
  /**
   * Get event history
   */
  getEventHistory(eventName = null, limit = 50) {
    let history = this.eventHistory;
    if (eventName) {
      history = history.filter((event) => event.name === eventName);
    }
    return history.slice(-limit);
  }
  /**
   * Get subscription statistics
   */
  getSubscriptionStats() {
    const stats = {
      totalEvents: this.eventNames().length,
      totalListeners: 0,
      moduleSubscriptions: {},
      eventListenerCounts: {}
    };
    this.eventNames().forEach((eventName) => {
      const listenerCount = this.listenerCount(eventName);
      stats.totalListeners += listenerCount;
      stats.eventListenerCounts[eventName] = listenerCount;
    });
    for (const [moduleName, events] of this.moduleSubscriptions) {
      stats.moduleSubscriptions[moduleName] = Array.from(events);
    }
    return stats;
  }
  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
    console.log("[EventBus] Event history cleared");
    this.emit("history-cleared");
  }
  /**
   * Remove all listeners for a module
   */
  unsubscribeModule(moduleName) {
    const moduleEvents = this.moduleSubscriptions.get(moduleName);
    if (moduleEvents) {
      moduleEvents.forEach((eventName) => {
        this.removeAllListeners(eventName);
      });
      this.moduleSubscriptions.delete(moduleName);
      console.log(`[EventBus] Unsubscribed all events for module: ${moduleName}`);
    }
  }
  /**
   * Create a promise that resolves when an event is published
   */
  waitForEvent(eventName, timeout = 5e3) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.unsubscribe(eventName, handler);
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);
      const handler = (eventData) => {
        clearTimeout(timer);
        this.unsubscribe(eventName, handler);
        resolve(eventData);
      };
      this.subscribe(eventName, handler);
    });
  }
  /**
   * Publish event and wait for response
   */
  async publishAndWaitForResponse(eventName, data = {}, responseEventName = null, timeout = 5e3) {
    const responseEvent = responseEventName || `${eventName}-response`;
    const responsePromise = this.waitForEvent(responseEvent, timeout);
    this.publish(eventName, data);
    return await responsePromise;
  }
  /**
   * Create namespaced event names
   */
  createNamespace(namespace) {
    return {
      publish: (eventName, data) => {
        this.publish(`${namespace}:${eventName}`, data);
      },
      subscribe: (eventName, callback, moduleName) => {
        return this.subscribe(`${namespace}:${eventName}`, callback, moduleName);
      },
      unsubscribe: (eventName, callback) => {
        this.unsubscribe(`${namespace}:${eventName}`, callback);
      }
    };
  }
  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      eventHistory: this.eventHistory.length,
      activeEvents: this.eventNames(),
      subscriptionStats: this.getSubscriptionStats(),
      moduleSubscriptions: Object.fromEntries(this.moduleSubscriptions)
    };
  }
  /**
   * Set up chat history event handlers for coordination
   */
  setupChatHistoryEventHandlers() {
    this.chatHistoryEventTypes.forEach((eventType) => {
      this.subscribe(eventType, (eventData) => {
        this.handleChatHistoryEvent(eventType, eventData);
      }, "EventBus-ChatHistoryCoordinator");
    });
    console.log("[EventBus] Chat history event coordination set up");
  }
  /**
   * Set up provider event handlers for coordination
   */
  setupProviderEventHandlers() {
    this.providerEventTypes.forEach((eventType) => {
      this.subscribe(eventType, (eventData) => {
        this.handleProviderEvent(eventType, eventData);
      }, "EventBus-ProviderCoordinator");
    });
    console.log("[EventBus] Provider event coordination set up");
  }
  /**
   * Handle chat history events for cross-module coordination
   */
  handleChatHistoryEvent(eventType, eventData) {
    if (this.options.enableLogging) {
      console.log(`[EventBus] Chat history event: ${eventType}`, eventData.data);
    }
    switch (eventType) {
      case "conversation-created":
        this.publish("ui-update-required", {
          type: "conversation-list",
          action: "add",
          conversationId: eventData.data.conversationId
        });
        break;
      case "conversation-deleted":
        this.publish("ui-update-required", {
          type: "conversation-list",
          action: "remove",
          conversationId: eventData.data.conversationId
        });
        this.publish("workspace-conversation-removed", {
          conversationId: eventData.data.conversationId
        });
        break;
      case "active-conversation-changed":
        this.publish("ui-conversation-switched", {
          conversationId: eventData.data.conversationId,
          previousId: eventData.data.previousId
        });
        this.publish("workspace-active-conversation-changed", {
          conversationId: eventData.data.conversationId
        });
        break;
      case "message-added":
        this.publish("ui-message-received", {
          conversationId: eventData.data.conversationId,
          messageId: eventData.data.messageId,
          message: eventData.data.message
        });
        this.publish("workspace-conversation-updated", {
          conversationId: eventData.data.conversationId
        });
        break;
      case "chat-history-searched":
        this.publish("ui-search-results-ready", {
          query: eventData.data.query,
          results: eventData.data.results
        });
        break;
      case "chat-history-cleanup-completed":
        this.publish("ui-notification", {
          type: "info",
          message: `Cleaned up ${eventData.data.cleanupCount} old conversations`,
          duration: 3e3
        });
        break;
      case "state-connection-changed":
        this.publish("ui-connection-status", {
          isOnline: eventData.data.isOnline,
          timestamp: eventData.timestamp
        });
        break;
      case "session-created":
      case "session-continued":
      case "session-resumed":
        this.publish("workspace-session-changed", {
          sessionId: eventData.data.sessionId,
          conversationId: eventData.data.conversationId,
          action: eventType.replace("session-", "")
        });
        break;
      case "chat-history-sync-started":
        this.publish("ui-sync-indicator", {
          show: true,
          message: "Syncing chat history..."
        });
        break;
      case "chat-history-sync-completed":
        this.publish("ui-sync-indicator", {
          show: false,
          message: "Chat history synced"
        });
        break;
      case "chat-history-sync-failed":
        this.publish("ui-notification", {
          type: "warning",
          message: `Chat history sync failed: ${eventData.data.error}`,
          duration: 5e3
        });
        break;
    }
  }
  /**
   * Handle provider events for cross-module coordination
   */
  handleProviderEvent(eventType, eventData) {
    if (this.options.enableLogging) {
      console.log(`[EventBus] Provider event: ${eventType}`, eventData.data);
    }
    switch (eventType) {
      case "active-provider-changed":
        this.publish("ui-provider-switched", {
          providerId: eventData.data.providerId,
          previousProvider: eventData.data.previousProvider,
          providerInfo: eventData.data.providerInfo
        });
        this.publish("conversation-provider-sync-required", {
          providerId: eventData.data.providerId,
          conversationId: eventData.data.conversationId
        });
        break;
      case "provider-status-changed":
        this.publish("ui-provider-status-update", {
          providerId: eventData.data.providerId,
          status: eventData.data.status,
          error: eventData.data.error,
          healthMetrics: eventData.data.healthMetrics
        });
        this.publish("workspace-provider-status-changed", {
          providerId: eventData.data.providerId,
          status: eventData.data.status,
          available: eventData.data.status === "connected",
          healthMetrics: eventData.data.healthMetrics
        });
        if (eventData.data.status === "error") {
          this.publish("ui-notification", {
            type: "error",
            message: `Provider ${eventData.data.providerId} encountered an error: ${eventData.data.error}`,
            duration: 5e3
          });
        }
        break;
      case "provider-switch-failed":
        this.publish("ui-notification", {
          type: "error",
          message: `Failed to switch to provider: ${eventData.data.reason}`,
          duration: 5e3
        });
        break;
      case "provider-auto-switched":
        this.publish("ui-notification", {
          type: "info",
          message: `Automatically switched to ${eventData.data.to} due to ${eventData.data.reason}`,
          duration: 3e3
        });
        break;
      case "cost-limit-warning":
        this.publish("ui-notification", {
          type: eventData.data.severity === "critical" ? "error" : "warning",
          message: `${eventData.data.type === "cost" ? "Cost" : "Token"} usage at ${eventData.data.percentage.toFixed(1)}% of limit`,
          recommendation: eventData.data.recommendation,
          duration: eventData.data.severity === "critical" ? 8e3 : 4e3
        });
        this.publish("workspace-cost-limit-warning", {
          type: eventData.data.type,
          percentage: eventData.data.percentage,
          severity: eventData.data.severity
        });
        break;
      case "provider-health-check-completed":
        this.publish("ui-provider-health-update", {
          results: eventData.data.results,
          healthyCount: eventData.data.healthyProviders,
          total: eventData.data.totalProviders
        });
        this.publish("workspace-provider-health-update", {
          healthyCount: eventData.data.healthyProviders,
          totalCount: eventData.data.totalProviders,
          healthyPercentage: eventData.data.healthyProviders / eventData.data.totalProviders * 100
        });
        break;
      case "provider-model-changed":
        this.publish("conversation-model-sync-required", {
          providerId: eventData.data.providerId,
          model: eventData.data.model,
          previousModel: eventData.data.previousModel
        });
        break;
      case "provider-usage-tracked":
        this.publish("ui-cost-update", {
          providerId: eventData.data.providerId,
          cost: eventData.data.cost,
          tokens: eventData.data.tokens,
          sessionCost: eventData.data.sessionCost,
          efficiency: eventData.data.efficiency,
          limits: eventData.data.limits
        });
        if (eventData.data.limits && eventData.data.limits.sessionPercentage > 80) {
          this.publish("ui-cost-warning", {
            providerId: eventData.data.providerId,
            percentage: eventData.data.limits.sessionPercentage,
            severity: eventData.data.limits.sessionPercentage > 95 ? "critical" : "warning"
          });
        }
        break;
      case "conversation-provider-updated":
        this.publish("ui-conversation-provider-update", {
          conversationId: eventData.data.conversationId,
          providerId: eventData.data.providerId,
          model: eventData.data.model
        });
        break;
      case "provider-error-tracked":
        this.publish("debug-provider-error", {
          providerId: eventData.data.providerId,
          error: eventData.data.error,
          retryCount: eventData.data.retryCount
        });
        if (eventData.data.retryCount > 3) {
          this.publish("ui-notification", {
            type: "warning",
            message: `Provider ${eventData.data.providerId} has failed ${eventData.data.retryCount} times`,
            duration: 5e3
          });
        }
        break;
      // New comprehensive event handlers
      case "session-cost-reset":
        this.publish("ui-cost-reset", {
          previousSessionCost: eventData.data.previousSessionCost,
          previousSessionTokens: eventData.data.previousSessionTokens
        });
        this.publish("workspace-cost-reset", {
          timestamp: eventData.data.timestamp
        });
        break;
      case "provider-key-status-changed":
        this.publish("ui-provider-config-status", {
          providerId: eventData.data.providerId,
          hasKey: eventData.data.hasKey,
          requiresSetup: eventData.data.requiresSetup
        });
        break;
      case "cost-efficiency-analysis":
        this.publish("ui-efficiency-recommendation", {
          analysis: eventData.data.analysis,
          recommendations: eventData.data.recommendations
        });
        break;
      case "provider-analytics-generated":
        this.publish("ui-analytics-update", {
          analytics: eventData.data.analytics,
          timestamp: eventData.data.timestamp
        });
        break;
      case "workspace-provider-preference-updated":
        this.publish("ui-workspace-provider-update", {
          workspaceId: eventData.data.workspaceId,
          preferences: eventData.data.preferences
        });
        break;
      case "provider-recommendation-generated":
        this.publish("ui-provider-recommendation", {
          recommendations: eventData.data.recommendations,
          context: eventData.data.context
        });
        break;
      case "global-state-manager-shutdown":
        this.publish("ui-system-shutdown", {
          finalStats: eventData.data.finalStats
        });
        break;
    }
  }
  /**
   * Publish chat history event with standardized format
   */
  publishChatHistoryEvent(eventType, data = {}) {
    if (!this.chatHistoryEventTypes.has(eventType)) {
      console.warn(`[EventBus] Unknown chat history event type: ${eventType}`);
      return;
    }
    const eventData = {
      ...data,
      timestamp: Date.now(),
      source: "chat-history-system"
    };
    this.publish(eventType, eventData);
  }
  /**
   * Publish provider event with standardized format
   */
  publishProviderEvent(eventType, data = {}) {
    if (!this.providerEventTypes.has(eventType)) {
      console.warn(`[EventBus] Unknown provider event type: ${eventType}`);
      return;
    }
    const eventData = {
      ...data,
      timestamp: Date.now(),
      source: "provider-system"
    };
    this.publish(eventType, eventData);
  }
  /**
   * Subscribe to multiple chat history events with a single handler
   */
  subscribeToChatHistoryEvents(eventTypes, callback, moduleName = null) {
    const validEventTypes = eventTypes.filter((type) => this.chatHistoryEventTypes.has(type));
    if (validEventTypes.length !== eventTypes.length) {
      const invalidTypes = eventTypes.filter((type) => !this.chatHistoryEventTypes.has(type));
      console.warn(`[EventBus] Invalid chat history event types: ${invalidTypes.join(", ")}`);
    }
    return this.subscribeMultiple(validEventTypes, callback, moduleName);
  }
  /**
   * Subscribe to multiple provider events with a single handler
   */
  subscribeToProviderEvents(eventTypes, callback, moduleName = null) {
    const validEventTypes = eventTypes.filter((type) => this.providerEventTypes.has(type));
    if (validEventTypes.length !== eventTypes.length) {
      const invalidTypes = eventTypes.filter((type) => !this.providerEventTypes.has(type));
      console.warn(`[EventBus] Invalid provider event types: ${invalidTypes.join(", ")}`);
    }
    return this.subscribeMultiple(validEventTypes, callback, moduleName);
  }
  /**
   * Get chat history event statistics
   */
  getChatHistoryEventStats() {
    const chatHistoryEvents = this.eventHistory.filter(
      (event) => this.chatHistoryEventTypes.has(event.name)
    );
    const eventTypeCounts = {};
    this.chatHistoryEventTypes.forEach((type) => {
      eventTypeCounts[type] = chatHistoryEvents.filter((event) => event.name === type).length;
    });
    return {
      totalChatHistoryEvents: chatHistoryEvents.length,
      eventTypeCounts,
      recentEvents: chatHistoryEvents.slice(-10),
      registeredEventTypes: Array.from(this.chatHistoryEventTypes)
    };
  }
  /**
   * Get provider event statistics
   */
  getProviderEventStats() {
    const providerEvents = this.eventHistory.filter(
      (event) => this.providerEventTypes.has(event.name)
    );
    const eventTypeCounts = {};
    this.providerEventTypes.forEach((type) => {
      eventTypeCounts[type] = providerEvents.filter((event) => event.name === type).length;
    });
    return {
      totalProviderEvents: providerEvents.length,
      eventTypeCounts,
      recentEvents: providerEvents.slice(-10),
      registeredEventTypes: Array.from(this.providerEventTypes)
    };
  }
  /**
   * Create a chat history namespace for module-specific events
   */
  createChatHistoryNamespace(moduleName) {
    const namespace = this.createNamespace(`chat-history:${moduleName}`);
    return {
      ...namespace,
      publishConversationEvent: (eventType, conversationId, data = {}) => {
        namespace.publish(eventType, {
          conversationId,
          ...data,
          moduleName
        });
      },
      subscribeToConversationEvents: (conversationId, callback) => {
        return namespace.subscribe(`conversation:${conversationId}`, callback, moduleName);
      }
    };
  }
  /**
   * Create a provider namespace for module-specific events
   */
  createProviderNamespace(moduleName) {
    const namespace = this.createNamespace(`provider:${moduleName}`);
    return {
      ...namespace,
      publishProviderEvent: (eventType, providerId, data = {}) => {
        namespace.publish(eventType, {
          providerId,
          ...data,
          moduleName
        });
      },
      subscribeToProviderEvents: (providerId, callback) => {
        return namespace.subscribe(`provider:${providerId}`, callback, moduleName);
      },
      publishCostEvent: (eventType, data = {}) => {
        namespace.publish(`cost:${eventType}`, {
          ...data,
          moduleName
        });
      },
      subscribeToHealthEvents: (callback) => {
        return namespace.subscribe("health", callback, moduleName);
      }
    };
  }
  /**
   * Coordinate state synchronization across modules
   */
  coordinateStateSync(syncType, data = {}) {
    const syncEventName = `state-sync:${syncType}`;
    this.publish(syncEventName, {
      ...data,
      timestamp: Date.now(),
      syncId: this.generateEventId()
    });
    return this.waitForEvent(`${syncEventName}-complete`, 5e3);
  }
  /**
   * Handle real-time chat history updates
   */
  handleRealtimeUpdate(updateType, data) {
    const realtimeEvent = `realtime:${updateType}`;
    this.publish(realtimeEvent, {
      ...data,
      timestamp: Date.now(),
      isRealtime: true
    });
    this.publish("ui-realtime-update", {
      type: updateType,
      data
    });
  }
  /**
   * Set up conflict resolution for concurrent updates
   */
  setupConflictResolution() {
    this.subscribe("state-conflict-detected", (eventData) => {
      console.warn("[EventBus] State conflict detected:", eventData.data);
      const resolutionStrategy = this.determineResolutionStrategy(eventData.data);
      this.publish("state-conflict-resolution", {
        conflictId: eventData.data.conflictId,
        strategy: resolutionStrategy,
        timestamp: Date.now()
      });
    }, "EventBus-ConflictResolver");
  }
  /**
   * Determine conflict resolution strategy
   */
  determineResolutionStrategy(conflictData) {
    return {
      type: "last-write-wins",
      winningTimestamp: Math.max(...conflictData.timestamps),
      reason: "Most recent update takes precedence"
    };
  }
  /**
   * Coordinate real-time provider switching across all UI components
   */
  coordinateProviderSwitch(switchData) {
    const switchId = this.generateEventId();
    this.publish("provider-switch-coordination-started", {
      switchId,
      ...switchData,
      timestamp: Date.now()
    });
    this.publish("ui-provider-switch-update", {
      switchId,
      providerId: switchData.providerId,
      model: switchData.model,
      status: "switching"
    });
    this.publish("workspace-provider-switch", {
      switchId,
      ...switchData
    });
    return switchId;
  }
  /**
   * Handle real-time cost tracking updates
   */
  coordinateCostUpdate(costData) {
    this.publish("ui-realtime-cost-update", costData);
    this.publish("workspace-cost-update", costData);
    this.publish("chat-history-cost-update", costData);
    if (costData.thresholdBreach) {
      this.publish("cost-threshold-breach", {
        ...costData.thresholdBreach,
        timestamp: Date.now()
      });
    }
  }
  /**
   * Coordinate provider health status across components
   */
  coordinateProviderHealth(healthData) {
    this.publish("ui-provider-health-coordination", healthData);
    this.publish("workspace-provider-health", healthData);
    if (healthData.criticalIssues && healthData.criticalIssues.length > 0) {
      this.publish("provider-critical-health-alert", {
        issues: healthData.criticalIssues,
        timestamp: Date.now()
      });
    }
  }
  /**
   * Set up enhanced provider event coordination
   */
  setupEnhancedProviderCoordination() {
    this.subscribe("active-provider-changed", (eventData) => {
      this.coordinateProviderSwitch(eventData.data);
    }, "EventBus-ProviderSwitchCoordinator");
    this.subscribe("provider-usage-tracked", (eventData) => {
      this.coordinateCostUpdate(eventData.data);
    }, "EventBus-CostCoordinator");
    this.subscribe("provider-health-check-completed", (eventData) => {
      this.coordinateProviderHealth(eventData.data);
    }, "EventBus-HealthCoordinator");
    console.log("[EventBus] Enhanced provider coordination set up");
  }
  /**
   * Create provider-specific event channels
   */
  createProviderChannel(providerId) {
    const channelName = `provider-channel:${providerId}`;
    return {
      publish: (eventType, data) => {
        this.publish(`${channelName}:${eventType}`, {
          providerId,
          ...data,
          timestamp: Date.now()
        });
      },
      subscribe: (eventType, callback) => {
        return this.subscribe(`${channelName}:${eventType}`, callback, `${providerId}-channel`);
      },
      // Specialized methods for common provider events
      publishStatusChange: (status, error = null) => {
        this.publish(`${channelName}:status-changed`, {
          providerId,
          status,
          error,
          timestamp: Date.now()
        });
      },
      publishCostUpdate: (costData) => {
        this.publish(`${channelName}:cost-updated`, {
          providerId,
          ...costData,
          timestamp: Date.now()
        });
      },
      publishModelChange: (model, previousModel) => {
        this.publish(`${channelName}:model-changed`, {
          providerId,
          model,
          previousModel,
          timestamp: Date.now()
        });
      }
    };
  }
  /**
   * Monitor event bus health and performance
   */
  getHealthMetrics() {
    const now = Date.now();
    const recentEvents = this.eventHistory.filter(
      (event) => now - event.timestamp < 6e4
      // Last minute
    );
    return {
      ...this.getDebugInfo(),
      healthStatus: "healthy",
      eventsPerMinute: recentEvents.length,
      chatHistoryEventStats: this.getChatHistoryEventStats(),
      providerEventStats: this.getProviderEventStats(),
      memoryUsage: {
        eventHistory: this.eventHistory.length,
        subscriptions: this.moduleSubscriptions.size,
        activeListeners: this.eventNames().reduce(
          (sum, name) => sum + this.listenerCount(name),
          0
        ),
        registeredEventTypes: this.chatHistoryEventTypes.size + this.providerEventTypes.size
      },
      providerCoordination: {
        activeChannels: this.getActiveProviderChannels(),
        coordinationEvents: this.getCoordinationEventStats(),
        switchCoordinations: this.getSwitchCoordinationStats()
      }
    };
  }
  /**
   * Get active provider channels
   */
  getActiveProviderChannels() {
    return this.eventNames().filter((name) => name.startsWith("provider-channel:")).map((name) => name.split(":")[1]).filter((value, index, self) => self.indexOf(value) === index);
  }
  /**
   * Get coordination event statistics
   */
  getCoordinationEventStats() {
    const coordinationEvents = this.eventHistory.filter(
      (event) => event.name.includes("coordination") || event.name.includes("realtime") || event.name.includes("switch")
    );
    return {
      total: coordinationEvents.length,
      recent: coordinationEvents.filter(
        (event) => Date.now() - event.timestamp < 3e5
        // Last 5 minutes
      ).length
    };
  }
  /**
   * Get switch coordination statistics
   */
  getSwitchCoordinationStats() {
    const switchEvents = this.eventHistory.filter(
      (event) => event.name.includes("provider-switch") || event.name.includes("active-provider-changed")
    );
    return {
      totalSwitches: switchEvents.length,
      recentSwitches: switchEvents.filter(
        (event) => Date.now() - event.timestamp < 36e5
        // Last hour
      ).length,
      averageSwitchTime: this.calculateAverageSwitchTime(switchEvents)
    };
  }
  /**
   * Calculate average provider switch time
   */
  calculateAverageSwitchTime(switchEvents) {
    if (switchEvents.length < 2) return 0;
    const switchTimes = [];
    for (let i = 1; i < switchEvents.length; i++) {
      switchTimes.push(switchEvents[i].timestamp - switchEvents[i - 1].timestamp);
    }
    return switchTimes.reduce((sum, time) => sum + time, 0) / switchTimes.length;
  }
  /**
   * Enhanced destroy with provider coordination cleanup
   */
  destroy() {
    this.publish("eventbus-shutdown-initiated", {
      timestamp: Date.now(),
      activeChannels: this.getActiveProviderChannels(),
      totalEvents: this.eventHistory.length
    });
    this.removeAllListeners();
    this.eventHistory = [];
    this.moduleSubscriptions.clear();
    this.chatHistoryEventTypes.clear();
    this.providerEventTypes.clear();
    this.isInitialized = false;
    console.log("[EventBus] Enhanced destruction completed");
  }
}
const eventBus = new EventBus();
class WorkspaceManager {
  constructor(webContentsManager) {
    this.webContentsManager = webContentsManager;
    this.workspaces = /* @__PURE__ */ new Map();
    this.currentWorkspace = null;
    this.components = /* @__PURE__ */ new Map();
    this.globalStateManager = null;
    this.eventBus = null;
    this.providerStates = /* @__PURE__ */ new Map();
    this.globalProviderState = {
      activeProvider: "claude",
      providers: /* @__PURE__ */ new Map(),
      costTracking: {
        sessionCost: 0,
        totalCost: 0,
        sessionTokens: 0,
        totalTokens: 0
      },
      switching: false,
      healthStatus: /* @__PURE__ */ new Map(),
      analytics: {
        switchCount: 0,
        lastSwitchTime: null,
        averageResponseTime: /* @__PURE__ */ new Map(),
        providerReliability: /* @__PURE__ */ new Map()
      }
    };
    this.eventSubscriptions = [];
    this.providerChannels = /* @__PURE__ */ new Map();
    this.boundProviderHandlers = {
      providerChanged: (event) => this.handleProviderChanged(event.detail),
      providerStatusChanged: (event) => this.handleProviderStatusChanged(event.detail),
      costUpdated: (event) => this.handleCostUpdated(event.detail)
    };
  }
  /**
   * Initialize workspace manager
   */
  initialize() {
    this.registerWorkspaces();
    this.setupProviderIntegration();
    this.setupEventBusIntegration();
    console.log("[WorkspaceManager] Initialized with workspaces:", Array.from(this.workspaces.keys()));
  }
  /**
   * Register available workspaces
   */
  registerWorkspaces() {
    this.workspaces.set("blog", {
      name: "Blog Automation",
      description: "AI-powered blog automation workspace",
      components: [
        {
          type: "browser",
          containerId: "browser-component-container",
          config: {}
        },
        {
          type: "chat",
          containerId: "chat-component-container",
          config: {
            title: "AI Blog Assistant",
            icon: "🤖",
            enableProviderSelection: true,
            enableCostTracking: false,
            // Disabled as requested
            enableStreaming: true,
            defaultProvider: "claude",
            enableRealTimeUpdates: true,
            enableProviderRecommendations: true,
            welcomeMessages: [
              { text: "EG-Desk:태화 블로그 다중 AI 시스템", type: "welcome" },
              { text: "WordPress 연동 준비 완료", type: "success" },
              { text: "Claude, OpenAI, Gemini 지원 활성화", type: "success" },
              { text: "", type: "output" },
              { text: "💡 다중 AI 블로그 자동화 명령어:", type: "system" },
              { text: '  claude "현재 페이지 SEO 분석해줘"', type: "output" },
              { text: '  openai "블로그 글 최적화해줘"', type: "output" },
              { text: '  gemini "콘텐츠 번역해줘"', type: "output" },
              { text: "  /provider claude - AI 제공자 변경", type: "output" },
              { text: "  /cost - 현재 사용 비용 확인", type: "output" },
              { text: "", type: "output" }
            ]
          }
        }
      ],
      onActivate: () => this.activateBlogWorkspace(),
      onDeactivate: () => this.deactivateBlogWorkspace()
    });
    this.workspaces.set("future", {
      name: "Advanced Workspace",
      description: "Future advanced features workspace",
      components: [],
      onActivate: () => console.log("[WorkspaceManager] Future workspace activated"),
      onDeactivate: () => console.log("[WorkspaceManager] Future workspace deactivated")
    });
  }
  /**
   * Switch to a workspace with animation coordination
   */
  async switchToWorkspace(workspaceId) {
    if (!this.workspaces.has(workspaceId)) {
      throw new Error(`Workspace "${workspaceId}" not found`);
    }
    console.log(`[WorkspaceManager] Switching to workspace: ${workspaceId}`);
    try {
      this.pauseComponentAnimations();
      if (this.currentWorkspace) {
        await this.deactivateWorkspace(this.currentWorkspace);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      await this.activateWorkspace(workspaceId);
      this.currentWorkspace = workspaceId;
      setTimeout(() => {
        this.resumeComponentAnimations();
      }, 100);
      console.log(`[WorkspaceManager] Successfully switched to: ${workspaceId}`);
      return { success: true, workspace: workspaceId };
    } catch (error) {
      this.resumeComponentAnimations();
      throw error;
    }
  }
  /**
   * Activate a workspace
   */
  async activateWorkspace(workspaceId) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return;
    try {
      await this.initializeWorkspaceComponents(workspaceId);
      if (workspace.onActivate) {
        await workspace.onActivate();
      }
      console.log(`[WorkspaceManager] Activated workspace: ${workspaceId}`);
    } catch (error) {
      console.error(`[WorkspaceManager] Failed to activate workspace ${workspaceId}:`, error);
      throw error;
    }
  }
  /**
   * Deactivate a workspace
   */
  async deactivateWorkspace(workspaceId) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return;
    try {
      await this.saveWorkspaceState(workspaceId);
      if (workspace.onDeactivate) {
        await workspace.onDeactivate();
      }
      this.destroyWorkspaceComponents(workspaceId);
      console.log(`[WorkspaceManager] Deactivated workspace: ${workspaceId}`);
    } catch (error) {
      console.error(`[WorkspaceManager] Failed to deactivate workspace ${workspaceId}:`, error);
    }
  }
  /**
   * Initialize components for a workspace
   */
  async initializeWorkspaceComponents(workspaceId) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace || !workspace.components) return;
    const workspaceKey = `workspace_${workspaceId}`;
    const workspaceComponents = /* @__PURE__ */ new Map();
    for (const componentConfig of workspace.components) {
      try {
        const component = await this.createComponent(componentConfig);
        if (component) {
          workspaceComponents.set(componentConfig.containerId, component);
          console.log(`[WorkspaceManager] Initialized ${componentConfig.type} component for ${workspaceId}`);
        }
      } catch (error) {
        console.error(`[WorkspaceManager] Failed to create ${componentConfig.type} component:`, error);
      }
    }
    this.components.set(workspaceKey, workspaceComponents);
    await this.restoreWorkspaceState(workspaceId);
  }
  /**
   * Save workspace state including chat history and UI state
   */
  async saveWorkspaceState(workspaceId) {
    try {
      console.log(`[WorkspaceManager] Saving state for workspace: ${workspaceId}`);
      const workspaceKey = `workspace_${workspaceId}`;
      const workspaceComponents = this.components.get(workspaceKey);
      const workspaceState = {
        workspaceId,
        timestamp: Date.now(),
        componentStates: {}
      };
      if (workspaceComponents) {
        const chatComponent = this.getChatComponent(workspaceId);
        if (chatComponent && typeof chatComponent.getState === "function") {
          workspaceState.componentStates.chat = chatComponent.getState();
        }
        const historyPanel = this.getChatHistoryPanel(workspaceId);
        if (historyPanel && typeof historyPanel.getState === "function") {
          workspaceState.componentStates.chatHistory = historyPanel.getState();
        }
        const browserComponent = this.getBrowserComponent(workspaceId);
        if (browserComponent && typeof browserComponent.getState === "function") {
          workspaceState.componentStates.browser = browserComponent.getState();
        }
      }
      if (this.globalStateManager) {
        await this.globalStateManager.setState(`workspace_${workspaceId}`, workspaceState);
        console.log(`[WorkspaceManager] Saved state for workspace: ${workspaceId}`);
      }
      if (this.eventBus) {
        this.eventBus.publish("workspace-state-saved", {
          workspaceId,
          state: workspaceState
        });
      }
    } catch (error) {
      console.error(`[WorkspaceManager] Failed to save workspace state for ${workspaceId}:`, error);
    }
  }
  /**
   * Restore workspace state including chat history and UI state
   */
  async restoreWorkspaceState(workspaceId) {
    try {
      console.log(`[WorkspaceManager] Restoring state for workspace: ${workspaceId}`);
      if (!this.globalStateManager) {
        console.warn(`[WorkspaceManager] GlobalStateManager not available for state restoration`);
        return;
      }
      const workspaceState = await this.globalStateManager.getState(`workspace_${workspaceId}`);
      if (!workspaceState || !workspaceState.componentStates) {
        console.log(`[WorkspaceManager] No saved state found for workspace: ${workspaceId}`);
        return;
      }
      const workspaceKey = `workspace_${workspaceId}`;
      const workspaceComponents = this.components.get(workspaceKey);
      if (workspaceComponents) {
        if (workspaceState.componentStates.chat) {
          const chatComponent = this.getChatComponent(workspaceId);
          if (chatComponent && typeof chatComponent.setState === "function") {
            await chatComponent.setState(workspaceState.componentStates.chat);
            console.log(`[WorkspaceManager] Restored chat component state for: ${workspaceId}`);
          }
        }
        if (workspaceState.componentStates.chatHistory) {
          const historyPanel = this.getChatHistoryPanel(workspaceId);
          if (historyPanel && typeof historyPanel.setState === "function") {
            await historyPanel.setState(workspaceState.componentStates.chatHistory);
            console.log(`[WorkspaceManager] Restored chat history panel state for: ${workspaceId}`);
          }
        }
        if (workspaceState.componentStates.browser) {
          const browserComponent = this.getBrowserComponent(workspaceId);
          if (browserComponent && typeof browserComponent.setState === "function") {
            await browserComponent.setState(workspaceState.componentStates.browser);
            console.log(`[WorkspaceManager] Restored browser component state for: ${workspaceId}`);
          }
        }
      }
      if (this.eventBus) {
        this.eventBus.publish("workspace-state-restored", {
          workspaceId,
          state: workspaceState
        });
      }
      console.log(`[WorkspaceManager] Successfully restored state for workspace: ${workspaceId}`);
    } catch (error) {
      console.error(`[WorkspaceManager] Failed to restore workspace state for ${workspaceId}:`, error);
    }
  }
  /**
   * Create a component based on configuration
   */
  async createComponent(config) {
    const { type, containerId, config: componentConfig } = config;
    try {
      switch (type) {
        case "browser":
          console.log(`[WorkspaceManager] 🌐 Attempting to create browser component...`);
          console.log(`[WorkspaceManager] BrowserTabComponent available:`, typeof BrowserTabComponent);
          console.log(`[WorkspaceManager] webContentsManager available:`, !!this.webContentsManager);
          if (typeof BrowserTabComponent === "undefined") {
            console.error("[WorkspaceManager] ❌ FATAL: BrowserTabComponent not available - check if import is loaded");
            if (window.uiManager) window.uiManager.markComponentFailed(containerId, "BrowserTabComponent not available");
            return null;
          }
          console.log(`[WorkspaceManager] 🏗️ Creating BrowserTabComponent for container: ${containerId}`);
          const browserComponent = new BrowserTabComponent(containerId, this.webContentsManager);
          console.log(`[WorkspaceManager] ✅ BrowserTabComponent instance created`);
          console.log(`[WorkspaceManager] 🚀 Initializing BrowserTabComponent...`);
          await browserComponent.initialize();
          console.log(`[WorkspaceManager] ✅ BrowserTabComponent initialization completed`);
          if (window.uiManager) window.uiManager.markComponentInitialized(containerId);
          console.log(`[WorkspaceManager] 🌐 Scheduling initial URL load...`);
          setTimeout(() => {
            console.log(`[WorkspaceManager] 🔄 Triggering loadInitialURL...`);
            browserComponent.loadInitialURL().catch((error) => {
              console.error(`[WorkspaceManager] ❌ loadInitialURL failed:`, error);
            });
          }, 100);
          console.log(`[WorkspaceManager] 🎉 Browser component setup complete`);
          return browserComponent;
        case "chat":
          if (typeof ChatComponent === "undefined") {
            console.error("[WorkspaceManager] ChatComponent not available");
            if (window.uiManager) window.uiManager.markComponentFailed(containerId, "ChatComponent not available");
            return null;
          }
          console.log(`[WorkspaceManager] 🤖 Creating ChatComponent for container: ${containerId}`);
          const chatComponent = new ChatComponent(containerId, componentConfig);
          if (this.globalStateManager) {
            chatComponent.globalStateManager = this.globalStateManager;
            console.log(`[WorkspaceManager] ChatComponent integrated with GlobalStateManager`);
          }
          if (this.eventBus) {
            chatComponent.eventBus = this.eventBus;
            console.log(`[WorkspaceManager] ChatComponent integrated with EventBus`);
          }
          await chatComponent.initialize();
          if (window.uiManager) window.uiManager.markComponentInitialized(containerId);
          this.integrateChatComponentWithProviderState(chatComponent);
          console.log(`[WorkspaceManager] ✅ ChatComponent initialization completed`);
          return chatComponent;
        case "chat-history":
          if (typeof ChatHistoryPanel === "undefined") {
            console.error("[WorkspaceManager] ChatHistoryPanel not available");
            if (window.uiManager) window.uiManager.markComponentFailed(containerId, "ChatHistoryPanel not available");
            return null;
          }
          console.log(`[WorkspaceManager] 📝 Creating ChatHistoryPanel for container: ${containerId}`);
          const historyPanel = new ChatHistoryPanel(containerId, {
            ...componentConfig,
            onSessionSelect: (conversation) => this.handleHistorySessionSelect(conversation),
            onSessionDelete: (sessionId) => this.handleHistorySessionDelete(sessionId),
            onToggleCollapse: (collapsed) => this.handleHistoryPanelToggle(collapsed)
          });
          if (this.globalStateManager) {
            historyPanel.globalStateManager = this.globalStateManager;
            console.log(`[WorkspaceManager] ChatHistoryPanel integrated with GlobalStateManager`);
          }
          if (this.eventBus) {
            historyPanel.eventBus = this.eventBus;
            console.log(`[WorkspaceManager] ChatHistoryPanel integrated with EventBus`);
          }
          await historyPanel.initialize();
          if (window.uiManager) window.uiManager.markComponentInitialized(containerId);
          console.log(`[WorkspaceManager] ✅ ChatHistoryPanel initialization completed`);
          return historyPanel;
        default:
          console.warn(`[WorkspaceManager] Unknown component type: ${type}`);
          if (window.uiManager) window.uiManager.markComponentFailed(containerId, `Unknown component type: ${type}`);
          return null;
      }
    } catch (error) {
      console.error(`[WorkspaceManager] ❌ Component creation failed for ${type}:`, error);
      if (window.uiManager) window.uiManager.markComponentFailed(containerId, error);
      throw error;
    }
  }
  /**
   * Destroy components for a workspace
   */
  destroyWorkspaceComponents(workspaceId) {
    const workspaceKey = `workspace_${workspaceId}`;
    const workspaceComponents = this.components.get(workspaceKey);
    if (workspaceComponents) {
      workspaceComponents.forEach((component, containerId) => {
        try {
          if (component.destroy) {
            component.destroy();
          }
          console.log(`[WorkspaceManager] Destroyed component in ${containerId}`);
        } catch (error) {
          console.error(`[WorkspaceManager] Error destroying component in ${containerId}:`, error);
        }
      });
      this.components.delete(workspaceKey);
    }
  }
  /**
   * Get component from current workspace
   */
  getComponent(containerId) {
    if (!this.currentWorkspace) return null;
    const workspaceKey = `workspace_${this.currentWorkspace}`;
    const workspaceComponents = this.components.get(workspaceKey);
    return workspaceComponents ? workspaceComponents.get(containerId) : null;
  }
  /**
   * Get browser component from specific or current workspace
   */
  getBrowserComponent(workspaceId = null) {
    const targetWorkspace = workspaceId || this.currentWorkspace;
    if (!targetWorkspace) return null;
    const workspaceKey = `workspace_${targetWorkspace}`;
    const workspaceComponents = this.components.get(workspaceKey);
    return workspaceComponents?.get("browser-component-container") || null;
  }
  /**
   * Get chat component from specific or current workspace
   */
  getChatComponent(workspaceId = null) {
    const targetWorkspace = workspaceId || this.currentWorkspace;
    if (!targetWorkspace) return null;
    const workspaceKey = `workspace_${targetWorkspace}`;
    const workspaceComponents = this.components.get(workspaceKey);
    return workspaceComponents?.get("chat-component-container") || null;
  }
  /**
   * Get chat history panel from specific or current workspace
   */
  getChatHistoryPanel(workspaceId = null) {
    const targetWorkspace = workspaceId || this.currentWorkspace;
    if (!targetWorkspace) return null;
    const workspaceKey = `workspace_${targetWorkspace}`;
    const workspaceComponents = this.components.get(workspaceKey);
    return workspaceComponents?.get("chat-history-container") || null;
  }
  /**
   * Blog workspace specific activation
   */
  async activateBlogWorkspace() {
    console.log("[WorkspaceManager] Blog workspace specific setup...");
    const historyPanel = this.getChatHistoryPanel();
    const chatComponent = this.getChatComponent();
    if (historyPanel && chatComponent) {
      console.log("[WorkspaceManager] Setting up chat history integration");
      const currentSession = historyPanel.getCurrentConversation();
      if (currentSession && chatComponent.loadSession) {
        chatComponent.loadSession(currentSession);
      }
      this.syncProviderStateWithComponents(chatComponent, historyPanel);
    }
    this.initializeWorkspaceProviderMonitoring("blog");
  }
  /**
   * Blog workspace specific deactivation
   */
  async deactivateBlogWorkspace() {
    console.log("[WorkspaceManager] Blog workspace specific cleanup...");
  }
  /**
   * Get available workspaces
   */
  getAvailableWorkspaces() {
    const workspaceList = [];
    this.workspaces.forEach((workspace, id) => {
      workspaceList.push({
        id,
        name: workspace.name,
        description: workspace.description,
        isActive: this.currentWorkspace === id
      });
    });
    return workspaceList;
  }
  /**
   * Get current workspace info
   */
  getCurrentWorkspace() {
    if (!this.currentWorkspace) return null;
    const workspace = this.workspaces.get(this.currentWorkspace);
    return {
      id: this.currentWorkspace,
      name: workspace.name,
      description: workspace.description,
      components: Array.from(this.components.get(`workspace_${this.currentWorkspace}`)?.keys() || [])
    };
  }
  /**
   * Execute command in current workspace's chat component
   */
  async executeCommand(command) {
    const chatComponent = this.getChatComponent();
    if (chatComponent && chatComponent.processCommand) {
      return await chatComponent.processCommand(command);
    }
    throw new Error("No active chat component found");
  }
  /**
   * Navigate browser in current workspace
   */
  async navigateToURL(url) {
    const browserComponent = this.getBrowserComponent();
    if (browserComponent && browserComponent.navigateToURL) {
      return await browserComponent.navigateToURL(url);
    }
    throw new Error("No active browser component found");
  }
  /**
   * Pause component-level animations during workspace transitions
   */
  pauseComponentAnimations() {
    console.log("[WorkspaceManager] 🚫 Pausing component animations during workspace transition");
    this.components.forEach((workspaceComponents, workspaceKey) => {
      workspaceComponents.forEach((component, containerId) => {
        if (component.pauseAnimations && typeof component.pauseAnimations === "function") {
          try {
            component.pauseAnimations();
            console.log(`[WorkspaceManager] Paused animations for component: ${containerId}`);
          } catch (error) {
            console.warn(`[WorkspaceManager] Failed to pause animations for ${containerId}:`, error);
          }
        }
      });
    });
  }
  /**
   * Resume component-level animations after workspace transitions
   */
  resumeComponentAnimations() {
    console.log("[WorkspaceManager] ▶️ Resuming component animations after workspace transition");
    this.components.forEach((workspaceComponents, workspaceKey) => {
      workspaceComponents.forEach((component, containerId) => {
        if (component.resumeAnimations && typeof component.resumeAnimations === "function") {
          try {
            component.resumeAnimations();
            console.log(`[WorkspaceManager] Resumed animations for component: ${containerId}`);
          } catch (error) {
            console.warn(`[WorkspaceManager] Failed to resume animations for ${containerId}:`, error);
          }
        }
      });
    });
  }
  /**
   * Clear all component animations to prevent conflicts
   */
  clearComponentAnimations() {
    console.log("[WorkspaceManager] 🧹 Clearing all component animations");
    this.components.forEach((workspaceComponents, workspaceKey) => {
      workspaceComponents.forEach((component, containerId) => {
        if (component.clearAnimations && typeof component.clearAnimations === "function") {
          try {
            component.clearAnimations();
            console.log(`[WorkspaceManager] Cleared animations for component: ${containerId}`);
          } catch (error) {
            console.warn(`[WorkspaceManager] Failed to clear animations for ${containerId}:`, error);
          }
        }
      });
    });
  }
  /**
   * Destroy workspace manager
   */
  destroy() {
    this.clearComponentAnimations();
    this.cleanupProviderIntegration();
    eventBus.publish("workspace-manager-shutdown", {
      workspaceId: this.currentWorkspace,
      timestamp: Date.now(),
      providerState: this.getGlobalProviderState()
    });
    if (this.currentWorkspace) {
      this.deactivateWorkspace(this.currentWorkspace);
    }
    this.components.forEach((workspaceComponents, workspaceKey) => {
      workspaceComponents.forEach((component) => {
        if (component.destroy) {
          component.destroy();
        }
      });
    });
    this.components.clear();
    this.workspaces.clear();
    this.providerStates.clear();
    this.currentWorkspace = null;
    console.log("[WorkspaceManager] Destroyed");
  }
  /**
   * Clean up provider integration and EventBus subscriptions
   */
  cleanupProviderIntegration() {
    Object.entries(this.boundProviderHandlers).forEach(([eventType, handler]) => {
      window.removeEventListener(`chat-${eventType}`, handler);
    });
    this.eventSubscriptions.forEach((unsubscribe) => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    });
    this.eventSubscriptions = [];
    this.providerChannels.clear();
    this.providerStates.forEach((state, workspaceId) => {
      if (state.statusCheckInterval) {
        clearInterval(state.statusCheckInterval);
      }
    });
    console.log("[WorkspaceManager] Enhanced provider integration cleanup complete");
  }
  /**
   * Handle chat history session selection
   */
  handleHistorySessionSelect(conversation) {
    console.log(`[WorkspaceManager] History session selected: ${conversation.id}`);
    const chatComponent = this.getChatComponent();
    if (chatComponent && chatComponent.loadSession) {
      chatComponent.loadSession(conversation);
    }
    this.dispatchEvent?.("history-session-selected", { conversation });
  }
  /**
   * Handle chat history session deletion
   */
  handleHistorySessionDelete(sessionId) {
    console.log(`[WorkspaceManager] History session deleted: ${sessionId}`);
    const chatComponent = this.getChatComponent();
    if (chatComponent && chatComponent.clearSession) {
      chatComponent.clearSession(sessionId);
    }
    this.dispatchEvent?.("history-session-deleted", { sessionId });
  }
  /**
   * Handle chat history panel toggle
   */
  handleHistoryPanelToggle(collapsed) {
    console.log(`[WorkspaceManager] History panel toggled: ${collapsed ? "collapsed" : "expanded"}`);
    if (window.uiManager && window.uiManager.handleHistoryPanelToggle) {
      window.uiManager.handleHistoryPanelToggle(collapsed);
    }
    this.dispatchEvent?.("history-panel-toggled", { collapsed });
  }
  /**
   * Update chat history with new conversation data
   */
  updateChatHistory(conversation) {
    const historyPanel = this.getChatHistoryPanel();
    if (historyPanel && historyPanel.updateConversation) {
      historyPanel.updateConversation(conversation);
    }
  }
  /**
   * Get current chat session from history
   */
  getCurrentChatSession() {
    const historyPanel = this.getChatHistoryPanel();
    return historyPanel?.getCurrentConversation() || null;
  }
  /**
   * Create new chat session
   */
  createNewChatSession() {
    const historyPanel = this.getChatHistoryPanel();
    if (historyPanel && historyPanel.createNewChat) {
      historyPanel.createNewChat();
    }
  }
  /**
   * Set up EventBus integration for real-time updates
   */
  setupEventBusIntegration() {
    this.eventSubscriptions.push(
      eventBus.subscribe("active-provider-changed", (event) => {
        this.handleProviderSwitchEvent(event.data);
      }, "WorkspaceManager-ProviderSwitch")
    );
    this.eventSubscriptions.push(
      eventBus.subscribe("provider-status-changed", (event) => {
        this.handleProviderStatusEvent(event.data);
      }, "WorkspaceManager-ProviderStatus")
    );
    this.eventSubscriptions.push(
      eventBus.subscribe("provider-usage-tracked", (event) => {
        this.handleProviderUsageEvent(event.data);
      }, "WorkspaceManager-ProviderUsage")
    );
    this.eventSubscriptions.push(
      eventBus.subscribe("cost-limit-warning", (event) => {
        this.handleCostLimitWarning(event.data);
      }, "WorkspaceManager-CostWarning")
    );
    this.eventSubscriptions.push(
      eventBus.subscribe("provider-health-check-completed", (event) => {
        this.handleProviderHealthUpdate(event.data);
      }, "WorkspaceManager-ProviderHealth")
    );
    this.eventSubscriptions.push(
      eventBus.subscribe("ui-provider-switch-update", (event) => {
        this.coordinateProviderSwitchUI(event.data);
      }, "WorkspaceManager-UISwitchCoordination")
    );
    this.eventSubscriptions.push(
      eventBus.subscribe("ui-realtime-cost-update", (event) => {
        this.coordinateCostUpdateUI(event.data);
      }, "WorkspaceManager-UICostCoordination")
    );
    console.log("[WorkspaceManager] EventBus integration setup complete");
  }
  /**
   * Handle provider switch events from EventBus
   */
  handleProviderSwitchEvent(eventData) {
    const { providerId, previousProvider, reason, conversationId } = eventData;
    console.log(`[WorkspaceManager] Handling provider switch: ${previousProvider} -> ${providerId}`);
    this.globalProviderState.activeProvider = providerId;
    this.globalProviderState.switching = true;
    this.globalProviderState.analytics.switchCount++;
    this.globalProviderState.analytics.lastSwitchTime = Date.now();
    const workspaceState = this.providerStates.get(this.currentWorkspace);
    if (workspaceState) {
      workspaceState.activeProvider = providerId;
    }
    this.updateAllComponentsForProviderSwitch(providerId, previousProvider);
    this.updateWorkspaceHeader(this.currentWorkspace, {
      activeProvider: providerId,
      switching: true
    });
    setTimeout(() => {
      this.globalProviderState.switching = false;
      this.updateWorkspaceHeader(this.currentWorkspace, { switching: false });
    }, 500);
  }
  /**
   * Handle provider status events
   */
  handleProviderStatusEvent(eventData) {
    const { providerId, status, error, healthMetrics } = eventData;
    console.log(`[WorkspaceManager] Provider ${providerId} status: ${status}`);
    this.globalProviderState.providers.set(providerId, { status, error });
    if (healthMetrics) {
      this.globalProviderState.healthStatus.set(providerId, healthMetrics);
    }
    this.updateProviderStatusDisplay(providerId, status, error);
  }
  /**
   * Handle provider usage tracking events
   */
  handleProviderUsageEvent(eventData) {
    const { providerId, cost, tokens, sessionCost, efficiency } = eventData;
    this.globalProviderState.costTracking.sessionCost = sessionCost;
    this.globalProviderState.costTracking.totalCost += cost;
    this.globalProviderState.costTracking.sessionTokens += tokens;
    this.globalProviderState.costTracking.totalTokens += tokens;
    this.updateWorkspaceCostDisplay(this.currentWorkspace, providerId, {
      sessionCost,
      cost,
      tokens,
      efficiency
    });
  }
  /**
   * Handle cost limit warnings
   */
  handleCostLimitWarning(eventData) {
    const { type, percentage, severity, recommendation } = eventData;
    console.warn(`[WorkspaceManager] Cost limit warning: ${type} at ${percentage}%`);
    this.showWorkspaceCostWarning({
      type,
      percentage,
      severity,
      recommendation
    });
  }
  /**
   * Handle provider health updates
   */
  handleProviderHealthUpdate(eventData) {
    const { results, healthyCount, totalCount } = eventData;
    console.log(`[WorkspaceManager] Provider health update: ${healthyCount}/${totalCount} healthy`);
    this.updateWorkspaceHealthDisplay({
      healthyCount,
      totalCount,
      healthyPercentage: healthyCount / totalCount * 100
    });
  }
  /**
   * Coordinate provider switch across UI components
   */
  coordinateProviderSwitchUI(eventData) {
    const { switchId, providerId, status } = eventData;
    const chatComponent = this.getChatComponent();
    if (chatComponent && chatComponent.handleProviderSwitchCoordination) {
      chatComponent.handleProviderSwitchCoordination(eventData);
    }
    const historyPanel = this.getChatHistoryPanel();
    if (historyPanel && historyPanel.handleProviderSwitchCoordination) {
      historyPanel.handleProviderSwitchCoordination(eventData);
    }
  }
  /**
   * Coordinate cost updates across UI components
   */
  coordinateCostUpdateUI(eventData) {
    const chatComponent = this.getChatComponent();
    if (chatComponent && chatComponent.handleCostUpdateCoordination) {
      chatComponent.handleCostUpdateCoordination(eventData);
    }
    this.updateWorkspaceCostIndicators(eventData);
  }
  /**
   * Integrate chat component with provider state
   */
  integrateChatComponentWithProviderState(chatComponent) {
    const chatProviderId = this.globalProviderState.activeProvider;
    const providerChannel = eventBus.createProviderChannel(chatProviderId);
    this.providerChannels.set(`chat-${chatComponent.containerId}`, providerChannel);
    if (chatComponent.onProviderChange) {
      chatComponent.onProviderChange((newProvider) => {
        eventBus.publish("active-provider-changed", {
          providerId: newProvider,
          previousProvider: this.globalProviderState.activeProvider,
          reason: "user-selection",
          source: "chat-component"
        });
      });
    }
    if (chatComponent.onCostUpdate) {
      chatComponent.onCostUpdate((costData) => {
        eventBus.publish("provider-usage-tracked", {
          ...costData,
          source: "chat-component"
        });
      });
    }
  }
  /**
   * Update all components for provider switch
   */
  updateAllComponentsForProviderSwitch(newProvider, previousProvider) {
    const chatComponent = this.getChatComponent();
    if (chatComponent && chatComponent.updateProviderState) {
      chatComponent.updateProviderState(newProvider);
    }
    const historyPanel = this.getChatHistoryPanel();
    if (historyPanel && historyPanel.updateProviderContext) {
      historyPanel.updateProviderContext(newProvider, previousProvider);
    }
    const browserComponent = this.getBrowserComponent();
    if (browserComponent && browserComponent.updateProviderContext) {
      browserComponent.updateProviderContext(newProvider);
    }
  }
  /**
   * Update provider status display
   */
  updateProviderStatusDisplay(providerId, status, error) {
    const statusIndicator = document.querySelector(`[data-provider="${providerId}"] .status-indicator`);
    if (statusIndicator) {
      statusIndicator.className = `status-indicator ${status}`;
      statusIndicator.setAttribute("title", error || `${providerId} - ${status}`);
    }
    if (providerId === this.globalProviderState.activeProvider) {
      this.updateWorkspaceHeader(this.currentWorkspace, {
        provider: providerId,
        status,
        error
      });
    }
  }
  /**
   * Update workspace cost indicators
   */
  updateWorkspaceCostIndicators(costData) {
    const { sessionCost, efficiency, limits } = costData;
    this.updateWorkspaceHeader(this.currentWorkspace, {
      costInfo: {
        sessionCost,
        efficiency: efficiency?.costPerToken,
        warningLevel: limits?.sessionPercentage > 80 ? "warning" : "normal"
      }
    });
  }
  /**
   * Show workspace-level cost warning
   */
  showWorkspaceCostWarning(warningData) {
    const { type, percentage, severity, recommendation } = warningData;
    const workspaceElement = document.querySelector(`[data-workspace="${this.currentWorkspace}"]`);
    if (workspaceElement) {
      let warningIndicator = workspaceElement.querySelector(".cost-warning-indicator");
      if (!warningIndicator) {
        warningIndicator = document.createElement("div");
        warningIndicator.className = "cost-warning-indicator";
        workspaceElement.appendChild(warningIndicator);
      }
      warningIndicator.className = `cost-warning-indicator ${severity}`;
      warningIndicator.textContent = `${type.toUpperCase()}: ${percentage.toFixed(1)}%`;
      warningIndicator.setAttribute("title", recommendation);
      if (severity !== "critical") {
        setTimeout(() => {
          warningIndicator.style.display = "none";
        }, 1e4);
      }
    }
  }
  /**
   * Update workspace health display
   */
  updateWorkspaceHealthDisplay(healthData) {
    const { healthyCount, totalCount, healthyPercentage } = healthData;
    const healthIndicator = document.querySelector(`[data-workspace="${this.currentWorkspace}"] .health-indicator`);
    if (healthIndicator) {
      healthIndicator.textContent = `${healthyCount}/${totalCount}`;
      healthIndicator.className = `health-indicator ${healthyPercentage >= 80 ? "healthy" : healthyPercentage >= 50 ? "warning" : "critical"}`;
      healthIndicator.setAttribute("title", `${healthyPercentage.toFixed(1)}% providers healthy`);
    }
  }
  /**
   * Set up provider integration
   */
  setupProviderIntegration() {
    Object.entries(this.boundProviderHandlers).forEach(([eventType, handler]) => {
      window.addEventListener(`chat-${eventType}`, handler);
    });
    this.workspaces.forEach((workspace, workspaceId) => {
      this.providerStates.set(workspaceId, {
        activeProvider: "claude",
        providerStatus: /* @__PURE__ */ new Map([
          ["claude", { status: "disconnected", model: null, cost: 0 }],
          ["openai", { status: "disconnected", model: null, cost: 0 }],
          ["gemini", { status: "disconnected", model: null, cost: 0 }]
        ]),
        costTracking: {
          sessionCost: 0,
          sessionTokens: 0
        }
      });
    });
    console.log("[WorkspaceManager] Provider integration setup complete");
  }
  /**
   * Handle provider changed event
   */
  handleProviderChanged(detail) {
    const { provider, workspaceId = this.currentWorkspace, componentId } = detail;
    if (!workspaceId || !this.providerStates.has(workspaceId)) return;
    const workspaceProviderState = this.providerStates.get(workspaceId);
    const previousProvider = workspaceProviderState.activeProvider;
    workspaceProviderState.activeProvider = provider;
    this.globalProviderState.activeProvider = provider;
    this.globalProviderState.switching = true;
    console.log(`[WorkspaceManager] Provider changed: ${previousProvider} → ${provider} in workspace ${workspaceId}`);
    this.updateWorkspaceProviderUI(workspaceId, provider);
    this.notifyProviderChange(workspaceId, provider, previousProvider);
    setTimeout(() => {
      this.globalProviderState.switching = false;
    }, 300);
  }
  /**
   * Handle provider status changed event
   */
  handleProviderStatusChanged(detail) {
    const { provider, status, model, workspaceId = this.currentWorkspace } = detail;
    if (!workspaceId || !this.providerStates.has(workspaceId)) return;
    const workspaceProviderState = this.providerStates.get(workspaceId);
    const providerInfo = workspaceProviderState.providerStatus.get(provider);
    if (providerInfo) {
      providerInfo.status = status;
      if (model) providerInfo.model = model;
      this.globalProviderState.providers.set(provider, { status, model });
      console.log(`[WorkspaceManager] Provider ${provider} status: ${status}${model ? ` (${model})` : ""}`);
      this.updateWorkspaceProviderStatus(workspaceId, provider, status, model);
    }
  }
  /**
   * Handle cost updated event
   */
  handleCostUpdated(detail) {
    const { provider, sessionCost, sessionTokens, totalCost, totalTokens, workspaceId = this.currentWorkspace } = detail;
    if (!workspaceId || !this.providerStates.has(workspaceId)) return;
    const workspaceProviderState = this.providerStates.get(workspaceId);
    const providerInfo = workspaceProviderState.providerStatus.get(provider);
    if (providerInfo) {
      providerInfo.cost = sessionCost || 0;
      workspaceProviderState.costTracking.sessionCost = sessionCost || 0;
      workspaceProviderState.costTracking.sessionTokens = sessionTokens || 0;
      this.globalProviderState.costTracking.sessionCost = sessionCost || 0;
      this.globalProviderState.costTracking.totalCost = totalCost || 0;
      this.globalProviderState.costTracking.sessionTokens = sessionTokens || 0;
      this.globalProviderState.costTracking.totalTokens = totalTokens || 0;
      console.log(`[WorkspaceManager] Cost updated for ${provider}: $${sessionCost?.toFixed(4) || "0.0000"}`);
      this.updateWorkspaceCostDisplay(workspaceId, provider);
    }
  }
  /**
   * Update workspace provider UI
   */
  updateWorkspaceProviderUI(workspaceId, provider) {
    if (window.uiManager && window.uiManager.updateProviderState) {
      window.uiManager.updateProviderState(workspaceId, {
        activeProvider: provider,
        switching: this.globalProviderState.switching
      });
    }
    this.updateWorkspaceHeader(workspaceId, { activeProvider: provider });
  }
  /**
   * Update workspace provider status
   */
  updateWorkspaceProviderStatus(workspaceId, provider, status, model) {
    this.updateWorkspaceHeader(workspaceId, {
      provider,
      status,
      model
    });
    if (window.uiManager && window.uiManager.updateProviderStatus) {
      window.uiManager.updateProviderStatus(workspaceId, provider, status, model);
    }
  }
  /**
   * Update workspace cost display
   */
  updateWorkspaceCostDisplay(workspaceId, provider) {
    const workspaceProviderState = this.providerStates.get(workspaceId);
    if (!workspaceProviderState) return;
    const costInfo = {
      sessionCost: workspaceProviderState.costTracking.sessionCost,
      sessionTokens: workspaceProviderState.costTracking.sessionTokens,
      provider
    };
    this.updateWorkspaceHeader(workspaceId, { costInfo });
    if (window.uiManager && window.uiManager.updateCostDisplay) {
      window.uiManager.updateCostDisplay(workspaceId, costInfo);
    }
  }
  /**
   * Update workspace header with enhanced provider information
   */
  updateWorkspaceHeader(workspaceId, updateInfo) {
    const headerElement = document.querySelector(`[data-workspace="${workspaceId}"] .workspace-header`);
    if (!headerElement) {
      console.warn(`[WorkspaceManager] Workspace header not found for: ${workspaceId}`);
      return;
    }
    if (updateInfo.activeProvider) {
      const providerIndicator = headerElement.querySelector(".provider-indicator");
      if (providerIndicator) {
        providerIndicator.textContent = this.getProviderIcon(updateInfo.activeProvider);
        providerIndicator.setAttribute("data-provider", updateInfo.activeProvider);
        if (updateInfo.switching) {
          providerIndicator.classList.add("switching");
          setTimeout(() => {
            providerIndicator.classList.remove("switching");
          }, 500);
        }
      } else {
        const newProviderIndicator = document.createElement("div");
        newProviderIndicator.className = "provider-indicator";
        newProviderIndicator.textContent = this.getProviderIcon(updateInfo.activeProvider);
        newProviderIndicator.setAttribute("data-provider", updateInfo.activeProvider);
        headerElement.appendChild(newProviderIndicator);
      }
    }
    if (updateInfo.status) {
      const statusIndicator = headerElement.querySelector(".status-indicator");
      if (statusIndicator) {
        statusIndicator.className = `status-indicator ${updateInfo.status}`;
        if (updateInfo.model) {
          statusIndicator.setAttribute("title", `${updateInfo.provider} - ${updateInfo.model}`);
        }
        if (updateInfo.error) {
          statusIndicator.setAttribute("title", `${updateInfo.provider} - Error: ${updateInfo.error}`);
        }
      } else {
        const newStatusIndicator = document.createElement("div");
        newStatusIndicator.className = `status-indicator ${updateInfo.status}`;
        newStatusIndicator.setAttribute("title", updateInfo.error || `${updateInfo.provider} - ${updateInfo.status}`);
        headerElement.appendChild(newStatusIndicator);
      }
    }
    if (updateInfo.costInfo) {
      const costDisplay = headerElement.querySelector(".cost-display");
      if (costDisplay) {
        const { sessionCost, efficiency, warningLevel, sessionTokens } = updateInfo.costInfo;
        costDisplay.textContent = `$${sessionCost?.toFixed(4) || "0.0000"}`;
        costDisplay.className = `cost-display ${warningLevel || "normal"}`;
        let tooltipText = `${sessionTokens || 0} tokens`;
        if (efficiency) {
          tooltipText += ` • $${efficiency.toFixed(6)}/token`;
        }
        costDisplay.setAttribute("title", tooltipText);
      } else {
        const newCostDisplay = document.createElement("div");
        newCostDisplay.className = `cost-display ${updateInfo.costInfo.warningLevel || "normal"}`;
        newCostDisplay.textContent = `$${updateInfo.costInfo.sessionCost?.toFixed(4) || "0.0000"}`;
        headerElement.appendChild(newCostDisplay);
      }
    }
    if (updateInfo.healthStatus) {
      let healthIndicator = headerElement.querySelector(".health-indicator");
      if (!healthIndicator) {
        healthIndicator = document.createElement("div");
        healthIndicator.className = "health-indicator";
        headerElement.appendChild(healthIndicator);
      }
      const { healthyCount, totalCount, healthyPercentage } = updateInfo.healthStatus;
      healthIndicator.textContent = `${healthyCount}/${totalCount}`;
      healthIndicator.className = `health-indicator ${healthyPercentage >= 80 ? "healthy" : healthyPercentage >= 50 ? "warning" : "critical"}`;
      healthIndicator.setAttribute("title", `${healthyPercentage.toFixed(1)}% providers healthy`);
    }
    if (updateInfo.switching !== void 0) {
      const switchingIndicator = headerElement.querySelector(".switching-indicator");
      if (updateInfo.switching) {
        if (!switchingIndicator) {
          const newSwitchingIndicator = document.createElement("div");
          newSwitchingIndicator.className = "switching-indicator active";
          newSwitchingIndicator.textContent = "⚡";
          newSwitchingIndicator.setAttribute("title", "Switching provider...");
          headerElement.appendChild(newSwitchingIndicator);
        }
      } else if (switchingIndicator) {
        switchingIndicator.remove();
      }
    }
  }
  /**
   * Get provider icon
   */
  getProviderIcon(provider) {
    const icons = {
      claude: "🤖",
      openai: "🧠",
      gemini: "💎"
    };
    return icons[provider] || "❓";
  }
  /**
   * Notify other components of provider change
   */
  notifyProviderChange(workspaceId, newProvider, previousProvider) {
    const historyPanel = this.getChatHistoryPanel();
    if (historyPanel && historyPanel.handleProviderChange) {
      historyPanel.handleProviderChange({
        workspaceId,
        newProvider,
        previousProvider
      });
    }
    this.dispatchEvent("provider-changed", {
      workspaceId,
      newProvider,
      previousProvider
    });
  }
  /**
   * Sync provider state with components
   */
  syncProviderStateWithComponents(chatComponent, historyPanel) {
    if (chatComponent) {
      const workspaceState = this.providerStates.get(this.currentWorkspace);
      if (workspaceState && chatComponent.setProviderState) {
        chatComponent.setProviderState(workspaceState.activeProvider);
      }
      if (chatComponent.onProviderChange) {
        chatComponent.onProviderChange((provider) => {
          this.handleProviderChanged({ provider, componentId: chatComponent.containerId });
        });
      }
    }
    if (historyPanel) {
      if (historyPanel.enableProviderMetadata) {
        historyPanel.enableProviderMetadata(true);
      }
    }
  }
  /**
   * Initialize workspace provider monitoring
   */
  initializeWorkspaceProviderMonitoring(workspaceId) {
    const workspaceState = this.providerStates.get(workspaceId);
    if (!workspaceState) return;
    const checkInterval = setInterval(() => {
      this.checkProviderStatuses(workspaceId);
    }, 3e4);
    workspaceState.statusCheckInterval = checkInterval;
    console.log(`[WorkspaceManager] Provider monitoring initialized for workspace: ${workspaceId}`);
  }
  /**
   * Check provider statuses for workspace
   */
  async checkProviderStatuses(workspaceId) {
    const workspaceState = this.providerStates.get(workspaceId);
    if (!workspaceState) return;
    for (const [provider, info] of workspaceState.providerStatus) {
      if (info.status === "connected" || info.status === "connecting") {
        try {
          if (window.electronAPI?.ai?.pingProvider) {
            const pingResult = await window.electronAPI.ai.pingProvider(provider);
            if (!pingResult.success) {
              this.handleProviderStatusChanged({
                provider,
                status: "disconnected",
                workspaceId
              });
            }
          }
        } catch (error) {
          console.warn(`[WorkspaceManager] Provider ${provider} ping failed:`, error);
          this.handleProviderStatusChanged({
            provider,
            status: "error",
            workspaceId
          });
        }
      }
    }
  }
  /**
   * Get provider state for workspace
   */
  getProviderState(workspaceId = this.currentWorkspace) {
    return this.providerStates.get(workspaceId) || null;
  }
  /**
   * Get global provider state with enhanced analytics
   */
  getGlobalProviderState() {
    return {
      ...this.globalProviderState,
      analytics: {
        ...this.globalProviderState.analytics,
        providerHealth: Object.fromEntries(this.globalProviderState.healthStatus),
        activeChannels: this.providerChannels.size,
        lastUpdated: Date.now()
      }
    };
  }
  /**
   * Get workspace provider analytics
   */
  getWorkspaceProviderAnalytics(workspaceId = this.currentWorkspace) {
    const workspaceState = this.providerStates.get(workspaceId);
    if (!workspaceState) return null;
    return {
      workspaceId,
      activeProvider: workspaceState.activeProvider,
      providerStatus: Object.fromEntries(workspaceState.providerStatus),
      costTracking: workspaceState.costTracking,
      healthMetrics: this.globalProviderState.healthStatus.get(workspaceState.activeProvider),
      analytics: {
        switchCount: this.globalProviderState.analytics.switchCount,
        lastSwitchTime: this.globalProviderState.analytics.lastSwitchTime
      }
    };
  }
  /**
   * Export workspace provider configuration
   */
  exportWorkspaceProviderConfig(workspaceId = this.currentWorkspace) {
    const analytics = this.getWorkspaceProviderAnalytics(workspaceId);
    const workspace = this.workspaces.get(workspaceId);
    return {
      version: "1.0",
      exportedAt: Date.now(),
      workspaceId,
      workspaceName: workspace?.name,
      providerConfiguration: analytics,
      eventBusIntegration: {
        activeSubscriptions: this.eventSubscriptions.length,
        providerChannels: this.providerChannels.size
      }
    };
  }
  /**
   * Switch provider for current workspace
   */
  async switchProvider(provider, workspaceId = this.currentWorkspace) {
    const chatComponent = this.getChatComponent();
    if (chatComponent && chatComponent.switchProvider) {
      return await chatComponent.switchProvider(provider);
    }
    return false;
  }
  /**
   * Dispatch custom events (if event system is available)
   */
  dispatchEvent(eventType, detail) {
    if (typeof CustomEvent !== "undefined" && window.dispatchEvent) {
      const event = new CustomEvent(`workspace-${eventType}`, { detail });
      window.dispatchEvent(event);
    }
  }
}
class UIManager {
  constructor(options = {}) {
    this.eventTarget = new EventTarget();
    this.options = {
      theme: options.theme || "light-grey",
      animations: options.animations !== false,
      responsiveBreakpoints: options.responsiveBreakpoints || {
        mobile: 768,
        tablet: 1024,
        desktop: 1200
      },
      ...options
    };
    this.isInitialized = false;
    this.currentTheme = this.options.theme;
    this.uiComponents = /* @__PURE__ */ new Map();
    this.currentWorkspace = "start";
    this.screenSize = "desktop";
    this.isTransitioning = false;
    this.animationQueue = [];
    this.activeAnimations = /* @__PURE__ */ new Set();
    this.historyPanelCollapsed = false;
    this.historyPanelWidth = 280;
    this.collapsedHistoryPanelWidth = 60;
    this.providerUIState = {
      currentProvider: "claude",
      providerStatus: /* @__PURE__ */ new Map(),
      costDisplays: /* @__PURE__ */ new Map(),
      switching: false,
      transitionTimeout: null
    };
  }
  /**
   * Add event listener (EventTarget compatibility)
   */
  addEventListener(type, listener, options) {
    console.log(`[UIManager] 🎧 Adding event listener for: ${type}`);
    this.eventTarget.addEventListener(type, listener, options);
  }
  /**
   * Remove event listener (EventTarget compatibility)
   */
  removeEventListener(type, listener, options) {
    this.eventTarget.removeEventListener(type, listener, options);
  }
  /**
   * Dispatch custom event (EventTarget compatibility)
   */
  dispatchEvent(event) {
    console.log(`[UIManager] 📢 Dispatching event: ${event.type}`, event.detail);
    return this.eventTarget.dispatchEvent(event);
  }
  /**
   * Initialize UI Manager
   */
  async initialize() {
    try {
      console.log("[UIManager] 🎨 Initializing UI management system...");
      this.applyTheme(this.currentTheme);
      this.setupResponsiveDesign();
      this.setupKeyboardShortcuts();
      if (this.options.animations) {
        this.setupAnimationSystem();
      }
      this.cacheDOMElements();
      await this.loadUIPreferences();
      this.setupEnhancedKeyboardShortcuts();
      this.setupProviderUIIntegration();
      this.startAutoSave();
      this.isInitialized = true;
      console.log("[UIManager] ✅ UI Manager initialized successfully");
      this.dispatchEvent(new CustomEvent("initialized"));
      return true;
    } catch (error) {
      console.error("[UIManager] ❌ Initialization failed:", error);
      this.dispatchEvent(new CustomEvent("error", { detail: error }));
      throw error;
    }
  }
  /**
   * Cache essential DOM elements for performance
   */
  cacheDOMElements() {
    this.elements = {
      appHeader: document.getElementById("app-header"),
      startScreen: document.getElementById("start-screen"),
      mainContent: document.getElementById("main-content"),
      workspaceTabs: document.querySelector(".workspace-tabs"),
      workspaceLayout: document.getElementById("workspace-layout"),
      browserContainer: document.getElementById("browser-component-container"),
      chatContainer: document.getElementById("chat-component-container"),
      historyContainer: document.getElementById("chat-history-container"),
      providerIndicators: document.querySelectorAll(".provider-indicator"),
      statusIndicators: document.querySelectorAll(".status-indicator"),
      costDisplays: document.querySelectorAll(".cost-display")
    };
    this.setComponentLoadingState();
    console.log("[UIManager] Cached DOM elements:", Object.keys(this.elements));
    console.log("[UIManager] Critical elements status:", {
      startScreen: !!this.elements.startScreen,
      mainContent: !!this.elements.mainContent,
      workspaceLayout: !!this.elements.workspaceLayout,
      workspaceTabs: !!this.elements.workspaceTabs
    });
  }
  /**
   * Refresh DOM element cache to ensure current elements
   */
  refreshDOMElementCache() {
    this.elements.startScreen = document.getElementById("start-screen");
    this.elements.mainContent = document.getElementById("main-content");
    this.elements.workspaceLayout = document.getElementById("workspace-layout");
    this.elements.workspaceTabs = document.querySelector(".workspace-tabs");
    console.log("[UIManager] DOM element cache refreshed");
  }
  /**
   * Set loading states for component containers
   */
  setComponentLoadingState() {
    const containers = [this.elements.browserContainer, this.elements.chatContainer, this.elements.historyContainer];
    containers.forEach((container) => {
      if (container && !container.querySelector(".component-initialized")) {
        container.classList.add("loading");
      }
    });
  }
  /**
   * Mark component as initialized
   */
  markComponentInitialized(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.classList.remove("loading", "error");
      container.classList.add("component-initialized");
      console.log(`[UIManager] Component marked as initialized: ${containerId}`);
    }
  }
  /**
   * Mark component as failed
   */
  markComponentFailed(containerId, error) {
    const container = document.getElementById(containerId);
    if (container) {
      container.classList.remove("loading");
      container.classList.add("error");
      console.error(`[UIManager] Component marked as failed: ${containerId}`, error);
    }
  }
  /**
   * Apply theme to the application
   */
  applyTheme(themeName) {
    console.log(`[UIManager] 🎨 Applying theme: ${themeName}`);
    const themes = {
      "light-grey": {
        "--primary-bg": "#f8f9fa",
        "--secondary-bg": "#e9ecef",
        "--tertiary-bg": "#dee2e6",
        "--accent-bg": "#ced4da",
        "--accent-hover": "#adb5bd",
        "--success": "#28a745",
        "--warning": "#ffc107",
        "--error": "#dc3545",
        "--text-primary": "#212529",
        "--text-secondary": "#495057",
        "--text-muted": "#6c757d",
        "--border": "#dee2e6",
        "--border-light": "#e9ecef",
        "--shadow": "0 1px 3px rgba(0, 0, 0, 0.1)",
        "--shadow-lg": "0 4px 12px rgba(0, 0, 0, 0.15)",
        "--gradient-primary": "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
        "--gradient-secondary": "linear-gradient(135deg, #dee2e6 0%, #ced4da 100%)"
      },
      "dark": {
        "--primary-bg": "#1a1a1a",
        "--secondary-bg": "#2d2d2d",
        "--tertiary-bg": "#404040",
        "--accent-bg": "#525252",
        "--accent-hover": "#666666",
        "--success": "#4ade80",
        "--warning": "#fbbf24",
        "--error": "#f87171",
        "--text-primary": "#ffffff",
        "--text-secondary": "#d1d5db",
        "--text-muted": "#9ca3af",
        "--border": "#404040",
        "--border-light": "#525252",
        "--shadow": "0 1px 3px rgba(0, 0, 0, 0.3)",
        "--shadow-lg": "0 4px 12px rgba(0, 0, 0, 0.4)",
        "--gradient-primary": "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
        "--gradient-secondary": "linear-gradient(135deg, #2d2d2d 0%, #404040 100%)"
      }
    };
    const theme = themes[themeName];
    if (theme) {
      const root = document.documentElement;
      Object.entries(theme).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
      this.currentTheme = themeName;
      document.body.setAttribute("data-theme", themeName);
      console.log(`[UIManager] ✅ Theme applied: ${themeName}`);
      this.dispatchEvent(new CustomEvent("theme-changed", { detail: { theme: themeName } }));
    } else {
      console.warn(`[UIManager] Theme not found: ${themeName}`);
    }
  }
  /**
   * Set up responsive design handling
   */
  setupResponsiveDesign() {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      let newSize = "desktop";
      if (width <= this.options.responsiveBreakpoints.mobile) {
        newSize = "mobile";
      } else if (width <= this.options.responsiveBreakpoints.tablet) {
        newSize = "tablet";
      }
      if (newSize !== this.screenSize) {
        const previousSize = this.screenSize;
        this.screenSize = newSize;
        document.body.className = document.body.className.replace(/screen-\w+/g, "").trim() + ` screen-${newSize}`;
        console.log(`[UIManager] 📱 Screen size changed: ${previousSize} → ${newSize}`);
        this.dispatchEvent(new CustomEvent("screen-size-changed", {
          detail: {
            previous: previousSize,
            current: newSize,
            width
          }
        }));
        this.adjustUIForScreenSize(newSize);
      }
    };
    updateScreenSize();
    window.addEventListener("resize", updateScreenSize);
    console.log("[UIManager] 📱 Responsive design system activated");
  }
  /**
   * Adjust UI for different screen sizes
   */
  adjustUIForScreenSize(screenSize) {
    switch (screenSize) {
      case "mobile":
        this.applyMobileLayout();
        break;
      case "tablet":
        this.applyTabletLayout();
        break;
      case "desktop":
        this.applyDesktopLayout();
        break;
    }
  }
  /**
   * Apply mobile-specific layout adjustments
   */
  applyMobileLayout() {
    if (this.elements.workspaceLayout) {
      this.elements.workspaceLayout.style.removeProperty("flexDirection");
      this.elements.workspaceLayout.style.removeProperty("gap");
    }
    if (this.elements.browserContainer) {
      this.elements.browserContainer.style.removeProperty("minHeight");
    }
    if (this.elements.chatContainer) {
      this.elements.chatContainer.style.removeProperty("minHeight");
    }
    if (!this.historyPanelCollapsed) {
      this.toggleHistoryPanel(true);
    }
    this.applyChatLayoutForScreenSize("mobile");
    console.log("[UIManager] 📱 Mobile layout applied");
  }
  /**
   * Apply tablet-specific layout adjustments
   */
  applyTabletLayout() {
    if (this.elements.workspaceLayout) {
      this.elements.workspaceLayout.style.removeProperty("flexDirection");
      this.elements.workspaceLayout.style.removeProperty("gap");
    }
    this.applyChatLayoutForScreenSize("tablet");
    console.log("[UIManager] 📱 Tablet layout applied");
  }
  /**
   * Apply desktop-specific layout adjustments
   */
  applyDesktopLayout() {
    if (this.elements.workspaceLayout) {
      this.elements.workspaceLayout.style.removeProperty("flexDirection");
      this.elements.workspaceLayout.style.removeProperty("gap");
    }
    this.applyChatLayoutForScreenSize("desktop");
    console.log("[UIManager] 🖥️ Desktop layout applied");
  }
  /**
   * Apply chat layout adjustments for different screen sizes
   */
  applyChatLayoutForScreenSize(screenSize) {
    if (this.currentWorkspace !== "blog") return;
    const historyContainer = this.elements.historyContainer;
    const chatContainer = this.elements.chatContainer;
    const browserContainer = this.elements.browserContainer;
    if (!historyContainer || !chatContainer || !browserContainer) return;
    if (this.historyPanelCollapsed) {
      historyContainer.classList.add("collapsed");
    } else {
      historyContainer.classList.remove("collapsed");
    }
    historyContainer.style.removeProperty("flex");
    historyContainer.style.removeProperty("order");
    historyContainer.style.removeProperty("minWidth");
    chatContainer.style.removeProperty("flex");
    chatContainer.style.removeProperty("order");
    chatContainer.style.removeProperty("minWidth");
    browserContainer.style.removeProperty("flex");
    browserContainer.style.removeProperty("order");
    browserContainer.style.removeProperty("minWidth");
    this.dispatchEvent(new CustomEvent("chat-layout-updated", {
      detail: {
        screenSize,
        historyCollapsed: this.historyPanelCollapsed,
        workspace: this.currentWorkspace
      }
    }));
    console.log(`[UIManager] 💬 Chat layout applied for ${screenSize} (history ${this.historyPanelCollapsed ? "collapsed" : "expanded"})`);
  }
  /**
   * Set up keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    const shortcuts = {
      "Escape": () => this.switchWorkspace("start"),
      "F11": () => this.toggleFullscreen(),
      "F1": () => this.showHelp(),
      "Alt+1": () => this.switchWorkspace("start"),
      "Alt+2": () => this.switchWorkspace("blog"),
      "Alt+3": () => this.switchWorkspace("future"),
      "Ctrl+Shift+h": () => this.toggleHistoryPanel(),
      "Ctrl+Shift+k": () => this.focusHistorySearch(),
      "Ctrl+Shift+n": () => this.createNewChatSession(),
      "ArrowUp": (e) => this.handleHistoryNavigation(e, "up"),
      "ArrowDown": (e) => this.handleHistoryNavigation(e, "down")
    };
    document.addEventListener("keydown", (event) => {
      const key = event.key;
      const modifiers = [];
      if (event.ctrlKey) modifiers.push("Ctrl");
      if (event.altKey) modifiers.push("Alt");
      if (event.shiftKey) modifiers.push("Shift");
      if (event.metaKey) modifiers.push("Meta");
      const shortcut = modifiers.length > 0 ? `${modifiers.join("+")}+${key}` : key;
      if (shortcuts[shortcut]) {
        event.preventDefault();
        shortcuts[shortcut]();
      }
    });
    console.log("[UIManager] ⌨️ Keyboard shortcuts activated");
  }
  /**
   * Set up animation system
   */
  setupAnimationSystem() {
    console.log("[UIManager] ✨ Animation system initialized");
  }
  /**
   * Pause all animations temporarily
   */
  pauseAnimations() {
    console.log("[UIManager] 🚫 Pausing animations during workspace transition");
    const animationStyle = document.getElementById("ui-animations");
    if (animationStyle) {
      animationStyle.disabled = true;
    }
    this.clearActiveAnimations();
    this.animationsPaused = true;
  }
  /**
   * Resume animations after workspace transition
   */
  resumeAnimations() {
    console.log("[UIManager] ▶️ Resuming animations after workspace transition");
    const animationStyle = document.getElementById("ui-animations");
    if (animationStyle) {
      animationStyle.disabled = false;
    }
    this.animationsPaused = false;
  }
  /**
   * Clear all active animations
   */
  clearActiveAnimations() {
    document.querySelectorAll(".ui-fade-in, .ui-fade-out, .ui-slide-up, .ui-slide-down").forEach((el) => {
      el.classList.remove("ui-fade-in", "ui-fade-out", "ui-slide-up", "ui-slide-down");
    });
    this.activeAnimations.clear();
    console.log("[UIManager] 🧹 Cleared all active animations");
  }
  /**
   * Queue animation to prevent conflicts
   */
  queueAnimation(animationFn) {
    return new Promise((resolve, reject) => {
      this.animationQueue.push({ fn: animationFn, resolve, reject });
      this.processAnimationQueue();
    });
  }
  /**
   * Process animation queue to prevent conflicts
   */
  async processAnimationQueue() {
    if (this.isTransitioning || this.animationQueue.length === 0) {
      return;
    }
    this.isTransitioning = true;
    const { fn, resolve, reject } = this.animationQueue.shift();
    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.isTransitioning = false;
      if (this.animationQueue.length > 0) {
        setTimeout(() => this.processAnimationQueue(), 50);
      }
    }
  }
  /**
   * Switch workspace with enhanced animation control
   */
  async switchWorkspace(workspace) {
    if (this.currentWorkspace === workspace) {
      console.log(`[UIManager] Already in workspace: ${workspace}`);
      return;
    }
    console.log(`[UIManager] 🔄 Switching workspace: ${this.currentWorkspace} → ${workspace}`);
    if (this.isTransitioning) {
      console.log(`[UIManager] ⏳ Queueing workspace switch (already transitioning)`);
      return this.queueAnimation(() => this.switchWorkspace(workspace));
    }
    try {
      this.isTransitioning = true;
      this.dispatchEvent(new CustomEvent("workspace-switching", {
        detail: {
          from: this.currentWorkspace,
          to: workspace
        }
      }));
      this.pauseAnimations();
      if (this.options.animations && !this.animationsPaused) {
        await this.animateWorkspaceTransition(this.currentWorkspace, workspace);
      } else {
        this.updateWorkspaceUIWithHistory(workspace);
      }
      this.currentWorkspace = workspace;
      this.updateWorkspaceTabs(workspace);
      this.resumeAnimations();
      this.dispatchEvent(new CustomEvent("workspace-switched", {
        detail: {
          workspace,
          screenSize: this.screenSize
        }
      }));
      console.log(`[UIManager] ✅ Workspace switched to: ${workspace}`);
    } catch (error) {
      console.error(`[UIManager] ❌ Workspace switch failed:`, error);
      this.resumeAnimations();
      this.dispatchEvent(new CustomEvent("workspace-switch-failed", {
        detail: { workspace, error }
      }));
      throw error;
    } finally {
      this.isTransitioning = false;
    }
  }
  /**
   * Animate workspace transition
   */
  async animateWorkspaceTransition(fromWorkspace, toWorkspace) {
    const duration = 400;
    if (fromWorkspace === "start" && this.elements.startScreen) {
      this.elements.startScreen.classList.add("ui-fade-out");
    } else if (this.elements.mainContent) {
      this.elements.mainContent.classList.add("ui-fade-out");
    }
    await new Promise((resolve) => setTimeout(resolve, duration / 2));
    this.updateWorkspaceUIWithHistory(toWorkspace);
    if (toWorkspace === "start" && this.elements.startScreen) {
      this.elements.startScreen.classList.remove("ui-fade-out");
      this.elements.startScreen.classList.add("ui-fade-in");
    } else if (this.elements.mainContent) {
      this.elements.mainContent.classList.remove("ui-fade-out");
      this.elements.mainContent.classList.add("ui-fade-in");
    }
    setTimeout(() => {
      document.querySelectorAll(".ui-fade-in, .ui-fade-out").forEach((el) => {
        el.classList.remove("ui-fade-in", "ui-fade-out");
      });
    }, duration);
  }
  /**
   * Update workspace UI without animations
   */
  updateWorkspaceUI(workspace) {
    console.log(`[UIManager] 🎯 updateWorkspaceUI called for workspace: ${workspace}`);
    this.refreshDOMElementCache();
    console.log("[UIManager] DOM element status:");
    console.log("  startScreen:", {
      exists: !!this.elements.startScreen,
      currentDisplay: this.elements.startScreen?.style.display,
      computedDisplay: this.elements.startScreen ? window.getComputedStyle(this.elements.startScreen).display : "N/A"
    });
    console.log("  mainContent:", {
      exists: !!this.elements.mainContent,
      hasActiveClass: this.elements.mainContent?.classList.contains("active"),
      currentDisplay: this.elements.mainContent?.style.display,
      computedDisplay: this.elements.mainContent ? window.getComputedStyle(this.elements.mainContent).display : "N/A"
    });
    console.log("  workspaceTabs:", {
      exists: !!this.elements.workspaceTabs,
      hasShowClass: this.elements.workspaceTabs?.classList.contains("show")
    });
    console.log("  workspaceLayout:", {
      exists: !!this.elements.workspaceLayout,
      currentDisplay: this.elements.workspaceLayout?.style.display,
      computedDisplay: this.elements.workspaceLayout ? window.getComputedStyle(this.elements.workspaceLayout).display : "N/A"
    });
    if (workspace === "start") {
      console.log("[UIManager] 📋 Switching to start workspace");
      if (this.elements.startScreen) {
        this.elements.startScreen.style.display = "flex";
        this.elements.startScreen.style.visibility = "visible";
        this.elements.startScreen.style.opacity = "1";
        console.log("[UIManager] ✅ startScreen shown");
      }
      if (this.elements.mainContent) {
        this.elements.mainContent.classList.remove("active");
        console.log("[UIManager] ✅ mainContent active class removed");
      }
      if (this.elements.workspaceTabs) {
        this.elements.workspaceTabs.classList.remove("show");
        console.log("[UIManager] ✅ workspaceTabs show class removed");
      }
    } else {
      console.log(`[UIManager] 📋 Switching to ${workspace} workspace`);
      if (this.elements.startScreen) {
        this.elements.startScreen.style.display = "none";
        console.log("[UIManager] ✅ startScreen hidden");
      }
      if (this.elements.mainContent) {
        this.elements.mainContent.classList.add("active");
        console.log("[UIManager] ✅ mainContent active class added");
        if (workspace === "blog") {
          this.elements.mainContent.style.opacity = "1";
          this.elements.mainContent.style.visibility = "visible";
          this.elements.mainContent.style.pointerEvents = "auto";
          console.log("[UIManager] 🔧 Forced blog workspace visibility");
        }
      }
      if (this.elements.workspaceTabs) {
        this.elements.workspaceTabs.classList.add("show");
        console.log("[UIManager] ✅ workspaceTabs show class added");
      }
      if (this.elements.workspaceLayout && workspace === "blog") {
        this.elements.workspaceLayout.style.display = "flex";
        console.log("[UIManager] ✅ workspaceLayout display set to flex for blog");
      }
    }
    console.log("[UIManager] DOM element status after changes:");
    console.log("  startScreen:", {
      currentDisplay: this.elements.startScreen?.style.display,
      computedDisplay: this.elements.startScreen ? window.getComputedStyle(this.elements.startScreen).display : "N/A"
    });
    console.log("  mainContent:", {
      hasActiveClass: this.elements.mainContent?.classList.contains("active"),
      currentDisplay: this.elements.mainContent?.style.display,
      computedDisplay: this.elements.mainContent ? window.getComputedStyle(this.elements.mainContent).display : "N/A",
      opacity: this.elements.mainContent ? window.getComputedStyle(this.elements.mainContent).opacity : "N/A",
      visibility: this.elements.mainContent ? window.getComputedStyle(this.elements.mainContent).visibility : "N/A"
    });
    console.log("  workspaceLayout:", {
      currentDisplay: this.elements.workspaceLayout?.style.display,
      computedDisplay: this.elements.workspaceLayout ? window.getComputedStyle(this.elements.workspaceLayout).display : "N/A"
    });
    const oldClassName = document.body.className;
    document.body.className = document.body.className.replace(/workspace-\w+/g, "").trim() + ` workspace-${workspace}`;
    console.log(`[UIManager] Body class updated: '${oldClassName}' → '${document.body.className}'`);
    this.dispatchEvent(new CustomEvent("ui-updated", {
      detail: { workspace }
    }));
    console.log(`[UIManager] ✅ updateWorkspaceUI completed for workspace: ${workspace}`);
  }
  /**
   * Update workspace tabs active state
   */
  updateWorkspaceTabs(workspace) {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.workspace === workspace);
    });
  }
  /**
   * Show notification
   */
  showNotification(message, type = "info", duration = 3e3) {
    const notification = document.createElement("div");
    notification.className = `ui-notification ui-notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.animation = "uiFadeOut 0.3s ease-out";
      setTimeout(() => notification.remove(), 300);
    }, duration);
    console.log(`[UIManager] 📢 Notification: ${type} - ${message}`);
  }
  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      console.log("[UIManager] 📺 Exited fullscreen");
    } else {
      document.documentElement.requestFullscreen();
      console.log("[UIManager] 📺 Entered fullscreen");
    }
  }
  /**
   * Show help modal
   */
  showHelp() {
    this.showNotification("도움말 기능은 개발 중입니다", "info");
    console.log("[UIManager] ❓ Help requested");
  }
  /**
   * Get current UI state
   */
  getUIState() {
    return {
      currentWorkspace: this.currentWorkspace,
      currentTheme: this.currentTheme,
      screenSize: this.screenSize,
      isFullscreen: !!document.fullscreenElement,
      animationsEnabled: this.options.animations,
      historyPanelCollapsed: this.historyPanelCollapsed,
      historyPanelWidth: this.historyPanelWidth,
      providerUIState: this.getProviderUIState()
    };
  }
  /**
   * Register UI component
   */
  registerComponent(name, component) {
    this.uiComponents.set(name, component);
    console.log(`[UIManager] 📦 Registered UI component: ${name}`);
    this.dispatchEvent(new CustomEvent("component-registered", {
      detail: { name, component }
    }));
  }
  /**
   * Get registered component
   */
  getComponent(name) {
    return this.uiComponents.get(name);
  }
  /**
   * Destroy UI Manager
   */
  destroy() {
    this.saveUIPreferences();
    this.stopAutoSave();
    window.removeEventListener("resize", this.handleResize);
    this.uiComponents.clear();
    if (this.providerUIState.transitionTimeout) {
      clearTimeout(this.providerUIState.transitionTimeout);
    }
    this.isInitialized = false;
    this.eventTarget = null;
    console.log("[UIManager] 🗑️ UI Manager destroyed");
  }
  /**
   * Toggle chat history panel collapse state
   */
  toggleHistoryPanel(forceCollapsed = null) {
    const shouldCollapse = forceCollapsed !== null ? forceCollapsed : !this.historyPanelCollapsed;
    this.historyPanelCollapsed = shouldCollapse;
    this.applyChatLayoutForScreenSize(this.screenSize);
    this.dispatchEvent(new CustomEvent("history-panel-toggled", {
      detail: {
        collapsed: shouldCollapse,
        screenSize: this.screenSize
      }
    }));
    console.log(`[UIManager] 📝 History panel ${shouldCollapse ? "collapsed" : "expanded"}`);
  }
  /**
   * Handle history panel toggle from WorkspaceManager
   */
  handleHistoryPanelToggle(collapsed) {
    this.historyPanelCollapsed = collapsed;
    this.applyChatLayoutForScreenSize(this.screenSize);
    console.log(`[UIManager] 📝 History panel state updated: ${collapsed ? "collapsed" : "expanded"}`);
  }
  /**
   * Focus history search input
   */
  focusHistorySearch() {
    if (window.workspaceManager) {
      const historyPanel = window.workspaceManager.getChatHistoryPanel();
      if (historyPanel && historyPanel.focusSearch) {
        historyPanel.focusSearch();
      }
    }
  }
  /**
   * Create new chat session
   */
  createNewChatSession() {
    if (window.workspaceManager) {
      const historyPanel = window.workspaceManager.getChatHistoryPanel();
      if (historyPanel && historyPanel.createNewChat) {
        historyPanel.createNewChat();
      }
    }
  }
  /**
   * Update workspace UI to include history panel considerations
   */
  updateWorkspaceUIWithHistory(workspace) {
    this.updateWorkspaceUI(workspace);
    if (workspace === "blog") {
      setTimeout(() => {
        this.applyChatLayoutForScreenSize(this.screenSize);
      }, 100);
    }
  }
  /**
   * Save UI preferences (for state persistence)
   */
  saveUIPreferences() {
    const preferences = {
      theme: this.currentTheme,
      historyPanelCollapsed: this.historyPanelCollapsed,
      historyPanelWidth: this.historyPanelWidth,
      screenSize: this.screenSize
    };
    try {
      if (window.electronAPI?.state?.saveUIPreferences) {
        window.electronAPI.state.saveUIPreferences(preferences);
      } else {
        localStorage.setItem("uiPreferences", JSON.stringify(preferences));
      }
    } catch (error) {
      console.warn("[UIManager] Failed to save UI preferences:", error);
    }
  }
  /**
   * Load UI preferences (for state persistence)
   */
  async loadUIPreferences() {
    try {
      let preferences = null;
      if (window.electronAPI?.state?.loadUIPreferences) {
        const result = await window.electronAPI.state.loadUIPreferences();
        preferences = result.success ? result.data : null;
      } else {
        const stored = localStorage.getItem("uiPreferences");
        preferences = stored ? JSON.parse(stored) : null;
      }
      if (preferences) {
        this.currentTheme = preferences.theme || this.currentTheme;
        this.historyPanelCollapsed = preferences.historyPanelCollapsed || false;
        this.historyPanelWidth = preferences.historyPanelWidth || 280;
        this.applyTheme(this.currentTheme);
        console.log("[UIManager] 💾 UI preferences loaded");
      }
    } catch (error) {
      console.warn("[UIManager] Failed to load UI preferences:", error);
    }
  }
  /**
   * Enhanced keyboard shortcut handler with history panel support
   */
  setupEnhancedKeyboardShortcuts() {
    window.addEventListener("workspace-switched", (event) => {
      const { workspace } = event.detail;
      if (workspace === "blog") {
        this.enableChatHistoryShortcuts();
      } else {
        this.disableChatHistoryShortcuts();
      }
    });
  }
  /**
   * Enable chat history specific shortcuts
   */
  enableChatHistoryShortcuts() {
    console.log("[UIManager] ⌨️ Chat history shortcuts enabled");
  }
  /**
   * Disable chat history specific shortcuts
   */
  disableChatHistoryShortcuts() {
    console.log("[UIManager] ⌨️ Chat history shortcuts disabled");
  }
  /**
   * Handle history navigation with arrow keys
   */
  handleHistoryNavigation(event, direction) {
    if (this.currentWorkspace !== "blog") return;
    if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") return;
    const historyPanel = window.workspaceManager?.getChatHistoryPanel();
    if (!historyPanel) return;
    event.preventDefault();
    const conversations = historyPanel.filteredConversations || [];
    if (conversations.length === 0) return;
    const currentIndex = conversations.findIndex((conv) => conv.id === historyPanel.currentSessionId);
    let newIndex;
    if (direction === "up") {
      newIndex = currentIndex <= 0 ? conversations.length - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex >= conversations.length - 1 ? 0 : currentIndex + 1;
    }
    const targetConversation = conversations[newIndex];
    if (targetConversation && historyPanel.selectConversation) {
      historyPanel.selectConversation(targetConversation.id);
    }
  }
  /**
   * Handle workspace-specific shortcuts
   */
  handleWorkspaceShortcuts(event) {
    if (this.currentWorkspace === "blog") {
      if (event.ctrlKey && event.shiftKey) {
        switch (event.key) {
          case "H":
            event.preventDefault();
            this.toggleHistoryPanel();
            break;
          case "K":
            event.preventDefault();
            this.focusHistorySearch();
            break;
          case "N":
            event.preventDefault();
            this.createNewChatSession();
            break;
        }
      }
    }
  }
  /**
   * Save UI state periodically
   */
  startAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      this.saveUIPreferences();
    }, 3e4);
  }
  /**
   * Set up provider UI integration
   */
  setupProviderUIIntegration() {
    const providerEvents = [
      "workspace-provider-changed",
      "workspace-provider-status-changed",
      "workspace-cost-updated",
      "chat-providerChanged",
      "chat-providerStatusChanged",
      "chat-costUpdated"
    ];
    providerEvents.forEach((eventType) => {
      window.addEventListener(eventType, (event) => {
        this.handleProviderUIEvent(eventType, event.detail);
      });
    });
    this.initializeProviderIndicators();
    console.log("[UIManager] Provider UI integration setup complete");
  }
  /**
   * Initialize provider status indicators
   */
  initializeProviderIndicators() {
    const workspaceHeaders = document.querySelectorAll(".workspace-header, .chat-header");
    workspaceHeaders.forEach((header) => {
      this.ensureProviderIndicators(header);
    });
  }
  /**
   * Ensure provider indicators exist in header
   */
  ensureProviderIndicators(header) {
    if (!header.querySelector(".provider-section")) {
      const providerSection = document.createElement("div");
      providerSection.className = "provider-section";
      providerSection.innerHTML = `
        <div class="provider-info">
          <span class="provider-indicator claude" title="Claude">🤖</span>
          <span class="status-indicator disconnected" title="Status"></span>
          <span class="provider-model-info"></span>
          <span class="cost-display" title="Session Cost">$0.00</span>
        </div>
      `;
      const controls = header.querySelector(".chat-controls, .workspace-controls");
      if (controls) {
        header.insertBefore(providerSection, controls);
      } else {
        header.appendChild(providerSection);
      }
    }
  }
  /**
   * Handle provider UI events
   */
  handleProviderUIEvent(eventType, detail) {
    switch (eventType) {
      case "workspace-provider-changed":
      case "chat-providerChanged":
        this.updateProviderState(detail.workspaceId || "current", {
          activeProvider: detail.provider || detail.newProvider
        });
        break;
      case "workspace-provider-status-changed":
      case "chat-providerStatusChanged":
        this.updateProviderStatus(
          detail.workspaceId || "current",
          detail.provider,
          detail.status,
          detail.model
        );
        break;
      case "workspace-cost-updated":
      case "chat-costUpdated":
        this.updateCostDisplay(detail.workspaceId || "current", {
          sessionCost: detail.sessionCost,
          sessionTokens: detail.sessionTokens,
          provider: detail.provider
        });
        break;
    }
  }
  /**
   * Update provider state
   */
  updateProviderState(workspaceId, state) {
    const { activeProvider, switching } = state;
    if (activeProvider) {
      this.providerUIState.currentProvider = activeProvider;
    }
    if (switching !== void 0) {
      this.providerUIState.switching = switching;
    }
    const indicators = this.getProviderIndicators(workspaceId);
    indicators.forEach((indicator) => {
      if (activeProvider) {
        indicator.classList.remove("claude", "openai", "gemini");
        indicator.classList.add(activeProvider);
        const providerIcons = {
          claude: "🤖",
          openai: "🧠",
          gemini: "💎"
        };
        const providerNames = {
          claude: "Claude",
          openai: "OpenAI",
          gemini: "Gemini"
        };
        indicator.textContent = providerIcons[activeProvider] || "❓";
        indicator.setAttribute("title", providerNames[activeProvider] || "Unknown");
      }
      if (switching) {
        indicator.classList.add("switching");
        if (this.providerUIState.transitionTimeout) {
          clearTimeout(this.providerUIState.transitionTimeout);
        }
        this.providerUIState.transitionTimeout = setTimeout(() => {
          indicator.classList.remove("switching");
          this.providerUIState.switching = false;
        }, 800);
      }
    });
    console.log(`[UIManager] Provider state updated: ${activeProvider}${switching ? " (switching)" : ""}`);
  }
  /**
   * Update provider status
   */
  updateProviderStatus(workspaceId, provider, status, model) {
    this.providerUIState.providerStatus.set(provider, { status, model });
    const statusIndicators = this.getStatusIndicators(workspaceId);
    statusIndicators.forEach((indicator) => {
      indicator.classList.remove("connected", "connecting", "disconnected", "error");
      indicator.classList.add(status);
      const statusTexts = {
        connected: "Connected",
        connecting: "Connecting...",
        disconnected: "Disconnected",
        error: "Error"
      };
      const title = `${statusTexts[status] || "Unknown"}${model ? ` - ${model}` : ""}`;
      indicator.setAttribute("title", title);
    });
    const modelInfos = this.getModelInfoDisplays(workspaceId);
    modelInfos.forEach((modelInfo) => {
      modelInfo.textContent = model || "";
    });
    console.log(`[UIManager] Provider status updated: ${provider} - ${status}${model ? ` (${model})` : ""}`);
  }
  /**
   * Update cost display
   */
  updateCostDisplay(workspaceId, costInfo) {
    const { sessionCost, sessionTokens, provider } = costInfo;
    this.providerUIState.costDisplays.set(workspaceId, costInfo);
    const costDisplays = this.getCostDisplays(workspaceId);
    costDisplays.forEach((display) => {
      const cost = sessionCost || 0;
      display.textContent = `$${cost.toFixed(4)}`;
      display.setAttribute("title", `${sessionTokens || 0} tokens - ${provider || "unknown"}`);
      display.classList.add("updating");
      setTimeout(() => display.classList.remove("updating"), 500);
      display.classList.remove("high-cost", "warning-cost");
      if (cost > 0.5) {
        display.classList.add("warning-cost");
      } else if (cost > 0.1) {
        display.classList.add("high-cost");
      }
    });
    console.log(`[UIManager] Cost display updated: $${sessionCost?.toFixed(4) || "0.0000"}`);
  }
  /**
   * Get provider indicators for workspace
   */
  getProviderIndicators(workspaceId) {
    if (workspaceId === "current" || !workspaceId) {
      return document.querySelectorAll(".provider-indicator");
    }
    return document.querySelectorAll(`[data-workspace="${workspaceId}"] .provider-indicator`);
  }
  /**
   * Get status indicators for workspace
   */
  getStatusIndicators(workspaceId) {
    if (workspaceId === "current" || !workspaceId) {
      return document.querySelectorAll(".status-indicator");
    }
    return document.querySelectorAll(`[data-workspace="${workspaceId}"] .status-indicator`);
  }
  /**
   * Get cost displays for workspace
   */
  getCostDisplays(workspaceId) {
    if (workspaceId === "current" || !workspaceId) {
      return document.querySelectorAll(".cost-display");
    }
    return document.querySelectorAll(`[data-workspace="${workspaceId}"] .cost-display`);
  }
  /**
   * Get model info displays for workspace
   */
  getModelInfoDisplays(workspaceId) {
    if (workspaceId === "current" || !workspaceId) {
      return document.querySelectorAll(".provider-model-info");
    }
    return document.querySelectorAll(`[data-workspace="${workspaceId}"] .provider-model-info`);
  }
  /**
   * Get provider UI state
   */
  getProviderUIState() {
    return {
      ...this.providerUIState,
      providerStatus: new Map(this.providerUIState.providerStatus),
      costDisplays: new Map(this.providerUIState.costDisplays)
    };
  }
  /**
   * Stop auto-save
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }
}
class SimpleEventEmitter {
  constructor() {
    this.events = {};
  }
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }
  emit(event, ...args) {
    if (!this.events[event]) {
      return false;
    }
    this.events[event].forEach((listener) => {
      try {
        listener(...args);
      } catch (error) {
        console.error("EventEmitter listener error:", error);
      }
    });
    return true;
  }
  removeListener(event, listener) {
    if (!this.events[event]) {
      return this;
    }
    this.events[event] = this.events[event].filter((l) => l !== listener);
    return this;
  }
  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
    return this;
  }
}
class ClaudeIntegration extends SimpleEventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      timeout: options.timeout || 3e4,
      maxRetries: options.maxRetries || 3,
      defaultProvider: options.defaultProvider || "openai",
      ...options
    };
    this.isInitialized = false;
    this.currentSession = null;
    this.requestQueue = [];
    this.isProcessing = false;
    this.providerStatus = null;
  }
  /**
   * Initialize AI integration with LangChain
   */
  async initialize() {
    try {
      console.log("[AIIntegration] Initializing LangChain AI integration...");
      if (!window.electronAPI?.langchainGetProviders) {
        throw new Error("LangChain integration not available in main process");
      }
      await this.checkSystemRequirements();
      try {
        await this.testConnection();
        console.log("[AIIntegration] Connection test passed");
      } catch (testError) {
        console.warn("[AIIntegration] Connection test failed, but continuing:", testError.message);
      }
      this.isInitialized = true;
      console.log("[AIIntegration] Successfully initialized");
      this.emit("initialized");
      return true;
    } catch (error) {
      console.error("[AIIntegration] Initialization failed:", error);
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Check system requirements and available providers
   */
  async checkSystemRequirements() {
    try {
      console.log("[AIIntegration] Checking available AI providers...");
      const providers = await window.electronAPI.langchainGetProviders();
      const status = await window.electronAPI.langchainGetCurrentStatus();
      this.systemInfo = {
        availableProviders: providers,
        currentProvider: status.provider,
        currentModel: status.model,
        status: status.status,
        isConfigured: status.status === "connected",
        lastChecked: Date.now()
      };
      console.log("[AIIntegration] System requirements check:", this.systemInfo);
      this.emit("system-status", this.systemInfo);
      if (!this.systemInfo.isConfigured) {
        console.warn("[AIIntegration] No AI provider is currently configured");
        this.emit("configuration-warning", {
          message: "No AI provider configured. Please set up API keys in settings.",
          suggestions: [
            "Configure OpenAI API key",
            "Configure Anthropic API key",
            "Configure other supported providers"
          ]
        });
      }
      return this.systemInfo;
    } catch (error) {
      console.error("[AIIntegration] System requirements check failed:", error);
      this.systemInfo = {
        availableProviders: [],
        currentProvider: null,
        isConfigured: false,
        error: error.message,
        lastChecked: Date.now()
      };
      this.emit("system-status", this.systemInfo);
      return this.systemInfo;
    }
  }
  /**
   * Test AI connection
   */
  async testConnection() {
    const testPrompt = "안녕하세요! 연결 테스트입니다. '연결됨'이라고 간단히 답해주세요.";
    try {
      const response = await this.sendMessage(testPrompt, {
        timeout: 1e4,
        skipQueue: true
      });
      console.log("[AIIntegration] Connection test successful:", response);
      return true;
    } catch (error) {
      console.error("[AIIntegration] Connection test failed:", error);
      throw new Error(`AI connection failed: ${error.message}`);
    }
  }
  /**
   * Send message to AI through LangChain
   */
  async sendMessage(prompt2, options = {}) {
    if (!this.isInitialized && !options.skipQueue) {
      throw new Error("AI integration not initialized");
    }
    const request = {
      id: Date.now() + Math.random(),
      prompt: prompt2,
      options: {
        systemPrompt: options.systemPrompt || null,
        context: options.context || null,
        timeout: options.timeout || this.options.timeout,
        ...options
      },
      timestamp: Date.now()
    };
    if (!options.skipQueue) {
      return this.addToQueue(request);
    }
    return this.executeRequest(request);
  }
  /**
   * Stream message to AI through LangChain
   */
  async streamMessage(prompt2, options = {}, onChunk = null) {
    if (!this.isInitialized) {
      throw new Error("AI integration not initialized");
    }
    try {
      const request = {
        message: prompt2,
        conversationHistory: options.conversationHistory || [],
        systemPrompt: options.systemPrompt || null
      };
      if (onChunk) {
        const streamHandler = (event, data) => {
          if (data.chunk) {
            onChunk(data.chunk);
          }
        };
        window.electronAPI.onLangChainStreamChunk(streamHandler);
      }
      const response = await window.electronAPI.langchainStreamMessage(request);
      if (!response.success) {
        throw new Error(response.error || "AI stream request failed");
      }
      return {
        id: Date.now(),
        content: response.content || "",
        provider: response.provider,
        model: response.model,
        timestamp: Date.now(),
        streamed: true
      };
    } catch (error) {
      console.error("[AIIntegration] Stream request failed:", error);
      throw error;
    }
  }
  /**
   * Add request to processing queue
   */
  async addToQueue(request) {
    return new Promise((resolve, reject) => {
      request.resolve = resolve;
      request.reject = reject;
      this.requestQueue.push(request);
      this.processQueue();
    });
  }
  /**
   * Process request queue
   */
  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }
    this.isProcessing = true;
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      try {
        console.log(`[AIIntegration] Processing request: ${request.id}`);
        const result = await this.executeRequest(request);
        request.resolve(result);
      } catch (error) {
        console.error(`[AIIntegration] Request failed: ${request.id}`, error);
        request.reject(error);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    this.isProcessing = false;
  }
  /**
   * Execute individual request through LangChain
   */
  async executeRequest(request) {
    const { prompt: prompt2, options } = request;
    try {
      this.emit("request-started", { id: request.id, prompt: prompt2.substring(0, 100) + "..." });
      if (!this.systemInfo?.isConfigured) {
        await this.checkSystemRequirements();
        if (!this.systemInfo?.isConfigured) {
          throw new Error("No AI provider is configured. Please configure API keys in settings.");
        }
      }
      const response = await window.electronAPI.langchainSendMessage({
        message: prompt2,
        conversationHistory: options.conversationHistory || [],
        systemPrompt: options.systemPrompt
      });
      if (!response.success) {
        throw new Error(response.error || "AI request failed");
      }
      const result = {
        id: request.id,
        content: response.content || response.message || "",
        provider: response.provider,
        model: response.model,
        tokens: response.metadata?.tokens || null,
        timestamp: Date.now(),
        cost: response.metadata?.cost || null
      };
      console.log(`[AIIntegration] Request completed: ${request.id}`);
      this.emit("response-received", result);
      return result;
    } catch (error) {
      console.error(`[AIIntegration] Request execution failed:`, error);
      this.emit("request-failed", { id: request.id, error: error.message });
      throw error;
    }
  }
  /**
   * Switch AI provider
   */
  async switchProvider(providerId, modelId = null) {
    try {
      console.log(`[AIIntegration] Switching to provider: ${providerId}, model: ${modelId}`);
      const response = await window.electronAPI.langchainSwitchProvider({
        providerId,
        modelId
      });
      if (!response.success) {
        throw new Error(response.error || "Failed to switch provider");
      }
      await this.checkSystemRequirements();
      console.log("[AIIntegration] Provider switched successfully");
      this.emit("provider-switched", { providerId, modelId });
      return response;
    } catch (error) {
      console.error("[AIIntegration] Failed to switch provider:", error);
      throw error;
    }
  }
  /**
   * Get available providers
   */
  async getAvailableProviders() {
    try {
      return await window.electronAPI.langchainGetProviders();
    } catch (error) {
      console.error("[AIIntegration] Failed to get providers:", error);
      return [];
    }
  }
  /**
   * Get current status
   */
  async getCurrentStatus() {
    try {
      return await window.electronAPI.langchainGetCurrentStatus();
    } catch (error) {
      console.error("[AIIntegration] Failed to get current status:", error);
      return {
        provider: null,
        model: null,
        status: "disconnected"
      };
    }
  }
  /**
   * Generate blog content with industry-specific knowledge
   */
  async generateBlogContent(topic, options = {}) {
    const industryContext = options.industryContext || "전기센서 및 로고스키 코일 기술";
    const targetKeywords = options.targetKeywords || [];
    const tone = options.tone || "professional";
    const wordCount = options.wordCount || 800;
    const prompt2 = `
다음 주제로 ${industryContext} 분야의 전문적인 블로그 글을 작성해 주세요:

주제: ${topic}

요구사항:
- 글 길이: 약 ${wordCount}자
- 어투: ${tone === "professional" ? "전문적이고 신뢰감 있는" : tone}
- SEO 키워드: ${targetKeywords.join(", ")}
- 한국어로 작성
- 기술적 정확성 중시
- 실용적 정보 포함

구조:
1. 흥미로운 도입부
2. 주요 내용 (기술적 설명, 장점, 적용 분야)
3. 실제 사례나 예시
4. 결론 및 향후 전망

HTML 형식으로 작성하되, <article> 태그로 감싸주세요.
`;
    try {
      const response = await this.sendMessage(prompt2, {
        systemPrompt: "당신은 전문적인 기술 블로그 작성자입니다. 정확하고 유용한 정보를 제공하며, SEO에 최적화된 콘텐츠를 작성합니다.",
        context: "blog-generation"
      });
      return {
        title: this.extractTitleFromContent(response.content),
        content: response.content,
        keywords: targetKeywords,
        wordCount: this.countWords(response.content),
        metadata: {
          generatedAt: Date.now(),
          topic,
          industryContext,
          tone,
          provider: response.provider,
          model: response.model
        }
      };
    } catch (error) {
      console.error("[AIIntegration] Blog content generation failed:", error);
      throw error;
    }
  }
  /**
   * Optimize content for SEO
   */
  async optimizeForSEO(content, targetKeywords = [], options = {}) {
    const prompt2 = `
다음 블로그 콘텐츠를 한국어 SEO에 최적화해 주세요:

원본 콘텐츠:
${content}

타겟 키워드: ${targetKeywords.join(", ")}

SEO 최적화 요구사항:
- 메타 설명 (150자 이내)
- 제목 최적화 (60자 이내)
- 키워드 밀도 최적화 (자연스럽게)
- H1, H2, H3 태그 구조 개선
- 내부 링크 제안
- 이미지 alt 텍스트 제안

최적화된 HTML과 SEO 메타데이터를 JSON 형식으로 제공해 주세요.
`;
    try {
      const response = await this.sendMessage(prompt2, {
        systemPrompt: "당신은 SEO 전문가입니다. 한국어 검색 최적화에 특화된 조언을 제공합니다.",
        context: "seo-optimization"
      });
      return {
        optimizedContent: response.content,
        seoData: {
          metaTitle: "",
          // Will be extracted from response
          metaDescription: "",
          // Will be extracted from response
          keywords: targetKeywords,
          optimizedAt: Date.now()
        }
      };
    } catch (error) {
      console.error("[AIIntegration] SEO optimization failed:", error);
      throw error;
    }
  }
  /**
   * Analyze website content
   */
  async analyzeWebsiteContent(htmlContent, url, options = {}) {
    const prompt2 = `
다음 웹사이트 콘텐츠를 분석해 주세요:

URL: ${url}
HTML 콘텐츠: ${htmlContent.substring(0, 1e4)}...

분석 요청:
1. SEO 상태 평가
2. 콘텐츠 품질 평가
3. 개선 제안사항
4. 키워드 분석
5. 구조적 문제점

JSON 형식으로 상세한 분석 결과를 제공해 주세요.
`;
    try {
      const response = await this.sendMessage(prompt2, {
        systemPrompt: "당신은 웹 콘텐츠 분석 전문가입니다. SEO, 사용성, 콘텐츠 품질을 종합적으로 평가합니다.",
        context: "content-analysis"
      });
      return {
        analysis: response.content,
        url,
        analyzedAt: Date.now(),
        suggestions: []
        // Will be extracted from response
      };
    } catch (error) {
      console.error("[AIIntegration] Website analysis failed:", error);
      throw error;
    }
  }
  /**
   * Generate WordPress post data
   */
  async generateWordPressPost(content, options = {}) {
    const prompt2 = `
다음 콘텐츠를 WordPress 게시물 형태로 변환해 주세요:

콘텐츠: ${content}

WordPress 형식 요구사항:
- 제목 최적화
- 카테고리 제안
- 태그 제안
- 발췌문 생성
- 공개 상태 결정
- SEO 친화적 슬러그 생성

JSON 형식으로 WordPress REST API에 적합한 형태로 제공해 주세요.
`;
    try {
      const response = await this.sendMessage(prompt2, {
        systemPrompt: "당신은 WordPress 콘텐츠 관리 전문가입니다. SEO와 사용자 경험을 고려한 게시물을 생성합니다.",
        context: "wordpress-generation"
      });
      return {
        postData: response.content,
        // Should be parsed as JSON
        generatedAt: Date.now()
      };
    } catch (error) {
      console.error("[AIIntegration] WordPress post generation failed:", error);
      throw error;
    }
  }
  /**
   * Extract title from generated content
   */
  extractTitleFromContent(content) {
    const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i) || content.match(/<title[^>]*>(.*?)<\/title>/i) || content.match(/^#\s*(.+)/m);
    return titleMatch ? titleMatch[1].trim() : "생성된 블로그 글";
  }
  /**
   * Count words in content
   */
  countWords(content) {
    const textOnly = content.replace(/<[^>]*>/g, "");
    return textOnly.trim().length;
  }
  /**
   * Get current session info
   */
  getSessionInfo() {
    return {
      isInitialized: this.isInitialized,
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing,
      currentProvider: this.systemInfo?.currentProvider || null,
      currentModel: this.systemInfo?.currentModel || null
    };
  }
  /**
   * Clear request queue
   */
  clearQueue() {
    this.requestQueue.forEach((request) => {
      request.reject(new Error("Queue cleared"));
    });
    this.requestQueue = [];
    console.log("[AIIntegration] Request queue cleared");
  }
  /**
   * Destroy AI integration
   */
  destroy() {
    this.clearQueue();
    this.isInitialized = false;
    this.currentSession = null;
    this.removeAllListeners();
    console.log("[AIIntegration] Destroyed");
  }
}
class ConversationManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      maxHistorySize: options.maxHistorySize || 50,
      contextWindow: options.contextWindow || 10,
      autoSave: options.autoSave !== false,
      saveInterval: options.saveInterval || 3e4,
      // 30 seconds
      maxSessions: options.maxSessions || 100,
      enableSessionCompaction: options.enableSessionCompaction !== false,
      compactionThreshold: options.compactionThreshold || 20,
      // messages
      ...options
    };
    this.conversations = /* @__PURE__ */ new Map();
    this.sessionHistory = /* @__PURE__ */ new Map();
    this.currentConversationId = null;
    this.globalContext = /* @__PURE__ */ new Map();
    this.isInitialized = false;
    this.saveTimer = null;
    this.sessionCache = /* @__PURE__ */ new Map();
    this.lastSessionId = null;
  }
  /**
   * Initialize conversation manager with ChatHistoryManager integration
   */
  async initialize(chatHistoryManager = null) {
    try {
      console.log("[ConversationManager] Initializing...");
      this.chatHistoryManager = chatHistoryManager;
      if (this.chatHistoryManager) {
        console.log("[ConversationManager] ChatHistoryManager integration enabled");
        this.setupChatHistoryIntegration();
      } else {
        console.log("[ConversationManager] Running in standalone mode");
        await this.loadConversations();
      }
      if (this.options.autoSave) {
        this.startAutoSave();
      }
      this.isInitialized = true;
      console.log("[ConversationManager] Successfully initialized");
      this.emit("initialized");
      return true;
    } catch (error) {
      console.error("[ConversationManager] Initialization failed:", error);
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Set up ChatHistoryManager integration
   */
  setupChatHistoryIntegration() {
    if (!this.chatHistoryManager) return;
    this.chatHistoryManager.on("conversation-created", (data) => {
      this.handleHistoryConversationCreated(data);
    });
    this.chatHistoryManager.on("message-added", (data) => {
      this.handleHistoryMessageAdded(data);
    });
    this.chatHistoryManager.on("active-conversation-changed", (data) => {
      this.handleHistoryActiveConversationChanged(data);
    });
    console.log("[ConversationManager] ChatHistoryManager event listeners set up");
  }
  /**
   * Create a new conversation (Claude Code style session)
   */
  async createConversation(options = {}) {
    const conversationId = options.id || this.generateConversationId();
    const conversation = {
      id: conversationId,
      title: options.title || this.generateSessionTitle(options),
      type: options.type || "general",
      messages: [],
      context: /* @__PURE__ */ new Map(),
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0,
        tokenUsage: { input: 0, output: 0, total: 0 },
        costTracking: {
          session: { input: 0, output: 0, total: 0 },
          total: { input: 0, output: 0, total: 0 },
          byProvider: {}
        },
        providerStats: {},
        tags: options.tags || [],
        workspace: options.workspace || "default",
        projectPath: options.projectPath || null,
        isActive: true,
        lastCommand: null,
        compactionCount: 0
      },
      settings: {
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 4e3,
        systemPrompt: options.systemPrompt || null,
        model: options.model || "claude-3-5-sonnet-20241022",
        provider: options.provider || "claude",
        enableStreaming: options.enableStreaming !== false,
        enableCostTracking: options.enableCostTracking !== false,
        ...options.settings
      },
      sessionState: {
        hasMemoryFile: false,
        memoryContent: null,
        isInteractive: options.interactive !== false,
        continuationMode: false,
        contextSummary: null,
        currentProvider: options.provider || "claude",
        currentModel: options.model || "claude-3-5-sonnet-20241022",
        providerHistory: []
      }
    };
    if (this.chatHistoryManager) {
      try {
        const historyConversationId = await this.chatHistoryManager.createConversation({
          id: conversationId,
          title: conversation.title,
          tags: conversation.metadata.tags,
          metadata: {
            type: conversation.type,
            workspace: conversation.metadata.workspace,
            projectPath: conversation.metadata.projectPath,
            settings: conversation.settings
          }
        });
        conversation._historyIntegrated = true;
        this.conversations.set(conversationId, conversation);
        console.log(`[ConversationManager] Created session via ChatHistoryManager: ${conversationId}`);
      } catch (error) {
        console.error("[ConversationManager] Failed to create via ChatHistoryManager, falling back to local:", error);
        this.conversations.set(conversationId, conversation);
      }
    } else {
      this.conversations.set(conversationId, conversation);
    }
    this.sessionHistory.set(conversationId, {
      id: conversationId,
      title: conversation.title,
      createdAt: conversation.metadata.createdAt,
      lastAccessed: Date.now(),
      messageCount: 0,
      isActive: true
    });
    this.lastSessionId = conversationId;
    this.enforceSessionLimits();
    console.log(`[ConversationManager] Created session: ${conversationId}`);
    this.emit("conversation-created", { conversationId, conversation });
    return conversationId;
  }
  /**
   * Switch to a conversation
   */
  switchToConversation(conversationId) {
    if (!this.conversations.has(conversationId)) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    const previousId = this.currentConversationId;
    this.currentConversationId = conversationId;
    console.log(`[ConversationManager] Switched to conversation: ${conversationId}`);
    this.emit("conversation-switched", {
      conversationId,
      previousId,
      conversation: this.conversations.get(conversationId)
    });
    return this.conversations.get(conversationId);
  }
  /**
   * Add message to current conversation (with Claude Code session tracking)
   */
  async addMessage(message, conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    if (!targetId) {
      throw new Error("No active conversation");
    }
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      throw new Error(`Conversation ${targetId} not found`);
    }
    const messageObj = {
      id: this.generateMessageId(),
      role: message.role || "user",
      content: message.content,
      timestamp: Date.now(),
      metadata: {
        tokens: message.tokens || null,
        model: message.model || null,
        provider: message.provider || conversation.sessionState.currentProvider,
        providerModel: message.providerModel || null,
        context: message.context || null,
        command: message.command || null,
        cost: message.cost || null,
        processingTime: message.processingTime || null,
        ...message.metadata
      }
    };
    if (this.chatHistoryManager && conversation._historyIntegrated) {
      try {
        await this.chatHistoryManager.addMessage(targetId, messageObj);
        console.log(`[ConversationManager] Added message via ChatHistoryManager: ${targetId}`);
      } catch (error) {
        console.error("[ConversationManager] Failed to add message via ChatHistoryManager:", error);
      }
    }
    conversation.messages.push(messageObj);
    conversation.metadata.updatedAt = Date.now();
    conversation.metadata.messageCount++;
    if (message.tokens) {
      conversation.metadata.tokenUsage.input += message.tokens.input || 0;
      conversation.metadata.tokenUsage.output += message.tokens.output || 0;
      conversation.metadata.tokenUsage.total = conversation.metadata.tokenUsage.input + conversation.metadata.tokenUsage.output;
    }
    const provider = message.provider || conversation.sessionState.currentProvider || "unknown";
    if (message.cost) {
      conversation.metadata.costTracking.session.total += message.cost;
      conversation.metadata.costTracking.total.total += message.cost;
      if (!conversation.metadata.costTracking.byProvider[provider]) {
        conversation.metadata.costTracking.byProvider[provider] = {
          session: { cost: 0, tokens: 0, messages: 0 },
          total: { cost: 0, tokens: 0, messages: 0 }
        };
      }
      const providerCosts = conversation.metadata.costTracking.byProvider[provider];
      providerCosts.session.cost += message.cost;
      providerCosts.total.cost += message.cost;
      providerCosts.session.messages += 1;
      providerCosts.total.messages += 1;
      if (message.tokens) {
        const totalTokens = message.tokens.total || message.tokens.input + message.tokens.output || 0;
        providerCosts.session.tokens += totalTokens;
        providerCosts.total.tokens += totalTokens;
      }
    }
    if (!conversation.metadata.providerStats[provider]) {
      conversation.metadata.providerStats[provider] = {
        messageCount: 0,
        lastUsed: null,
        totalCost: 0,
        totalTokens: 0,
        models: {}
      };
    }
    const providerStats = conversation.metadata.providerStats[provider];
    providerStats.messageCount += 1;
    providerStats.lastUsed = Date.now();
    if (message.cost) {
      providerStats.totalCost += message.cost;
    }
    if (message.tokens) {
      const totalTokens = message.tokens.total || message.tokens.input + message.tokens.output || 0;
      providerStats.totalTokens += totalTokens;
    }
    const model = message.model || conversation.sessionState.currentModel || "unknown";
    if (!providerStats.models[model]) {
      providerStats.models[model] = { count: 0, lastUsed: null };
    }
    providerStats.models[model].count += 1;
    providerStats.models[model].lastUsed = Date.now();
    const sessionInfo = this.sessionHistory.get(targetId);
    if (sessionInfo) {
      sessionInfo.lastAccessed = Date.now();
      sessionInfo.messageCount = conversation.metadata.messageCount;
    }
    this.lastSessionId = targetId;
    if (this.shouldCompactConversation(conversation)) {
      this.compactConversation(targetId);
    } else {
      this.trimConversation(conversation);
    }
    console.log(`[ConversationManager] Added message to session ${targetId}`);
    this.emit("message-added", { conversationId: targetId, message: messageObj });
    return messageObj;
  }
  /**
   * Switch provider for a conversation
   */
  switchProvider(providerId, modelId = null, conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    if (!targetId) {
      throw new Error("No active conversation");
    }
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      throw new Error(`Conversation ${targetId} not found`);
    }
    const previousProvider = conversation.sessionState.currentProvider;
    const previousModel = conversation.sessionState.currentModel;
    conversation.sessionState.currentProvider = providerId;
    if (modelId) {
      conversation.sessionState.currentModel = modelId;
    }
    conversation.sessionState.providerHistory.push({
      provider: previousProvider,
      model: previousModel,
      switchedAt: Date.now(),
      messageCount: conversation.metadata.messageCount
    });
    conversation.settings.provider = providerId;
    if (modelId) {
      conversation.settings.model = modelId;
    }
    conversation.metadata.updatedAt = Date.now();
    console.log(`[ConversationManager] Switched provider from ${previousProvider} to ${providerId} for conversation ${targetId}`);
    this.emit("provider-switched", {
      conversationId: targetId,
      previousProvider,
      newProvider: providerId,
      previousModel,
      newModel: modelId || conversation.sessionState.currentModel
    });
    return {
      conversation,
      previousProvider,
      newProvider: providerId,
      previousModel,
      newModel: conversation.sessionState.currentModel
    };
  }
  /**
   * Get cost summary for a conversation
   */
  getCostSummary(conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    if (!targetId) {
      throw new Error("No active conversation");
    }
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      throw new Error(`Conversation ${targetId} not found`);
    }
    return {
      conversationId: targetId,
      title: conversation.title,
      session: conversation.metadata.costTracking.session,
      total: conversation.metadata.costTracking.total,
      byProvider: conversation.metadata.costTracking.byProvider,
      providerStats: conversation.metadata.providerStats,
      messageCount: conversation.metadata.messageCount,
      tokenUsage: conversation.metadata.tokenUsage
    };
  }
  /**
   * Reset session costs for a conversation
   */
  resetSessionCosts(conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    if (!targetId) {
      throw new Error("No active conversation");
    }
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      throw new Error(`Conversation ${targetId} not found`);
    }
    conversation.metadata.costTracking.session = { input: 0, output: 0, total: 0 };
    for (const providerId in conversation.metadata.costTracking.byProvider) {
      conversation.metadata.costTracking.byProvider[providerId].session = {
        cost: 0,
        tokens: 0,
        messages: 0
      };
    }
    conversation.metadata.updatedAt = Date.now();
    console.log(`[ConversationManager] Reset session costs for conversation ${targetId}`);
    this.emit("session-costs-reset", { conversationId: targetId });
    return conversation.metadata.costTracking;
  }
  /**
   * Get provider statistics across all conversations
   */
  getGlobalProviderStats() {
    const globalStats = {
      totalConversations: this.conversations.size,
      totalCost: 0,
      totalTokens: 0,
      totalMessages: 0,
      byProvider: {},
      mostUsedProvider: null,
      costiest: null
    };
    for (const [conversationId, conversation] of this.conversations) {
      globalStats.totalCost += conversation.metadata.costTracking.total.total;
      globalStats.totalTokens += conversation.metadata.tokenUsage.total;
      globalStats.totalMessages += conversation.metadata.messageCount;
      for (const [providerId, stats] of Object.entries(conversation.metadata.providerStats)) {
        if (!globalStats.byProvider[providerId]) {
          globalStats.byProvider[providerId] = {
            conversations: 0,
            totalMessages: 0,
            totalCost: 0,
            totalTokens: 0,
            models: {}
          };
        }
        const providerGlobal = globalStats.byProvider[providerId];
        providerGlobal.conversations += 1;
        providerGlobal.totalMessages += stats.messageCount;
        providerGlobal.totalCost += stats.totalCost;
        providerGlobal.totalTokens += stats.totalTokens;
        for (const [modelId, modelStats] of Object.entries(stats.models)) {
          if (!providerGlobal.models[modelId]) {
            providerGlobal.models[modelId] = { count: 0, conversations: 0 };
          }
          providerGlobal.models[modelId].count += modelStats.count;
          providerGlobal.models[modelId].conversations += 1;
        }
      }
    }
    let maxMessages = 0;
    let maxCost = 0;
    for (const [providerId, stats] of Object.entries(globalStats.byProvider)) {
      if (stats.totalMessages > maxMessages) {
        maxMessages = stats.totalMessages;
        globalStats.mostUsedProvider = providerId;
      }
      if (stats.totalCost > maxCost) {
        maxCost = stats.totalCost;
        globalStats.costiest = providerId;
      }
    }
    return globalStats;
  }
  /**
   * Get conversation context for AI requests
   */
  getConversationContext(conversationId = null, includeMessages = true) {
    const targetId = conversationId || this.currentConversationId;
    if (!targetId) {
      return { messages: [], context: /* @__PURE__ */ new Map() };
    }
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      return { messages: [], context: /* @__PURE__ */ new Map() };
    }
    const context = {
      conversationId: targetId,
      title: conversation.title,
      type: conversation.type,
      settings: conversation.settings,
      context: new Map([...this.globalContext, ...conversation.context])
    };
    if (includeMessages) {
      const recentMessages = conversation.messages.slice(-this.options.contextWindow);
      context.messages = recentMessages;
    }
    return context;
  }
  /**
   * Update conversation context
   */
  updateContext(key, value, conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    if (targetId) {
      const conversation = this.conversations.get(targetId);
      if (conversation) {
        conversation.context.set(key, value);
        conversation.metadata.updatedAt = Date.now();
        console.log(`[ConversationManager] Updated context for conversation ${targetId}: ${key}`);
        this.emit("context-updated", { conversationId: targetId, key, value });
      }
    } else {
      this.globalContext.set(key, value);
      console.log(`[ConversationManager] Updated global context: ${key}`);
      this.emit("global-context-updated", { key, value });
    }
  }
  /**
   * Set global context that applies to all conversations
   */
  setGlobalContext(key, value) {
    this.globalContext.set(key, value);
    console.log(`[ConversationManager] Set global context: ${key}`);
    this.emit("global-context-updated", { key, value });
  }
  /**
   * Get message history formatted for Claude
   */
  getFormattedHistory(conversationId = null, messageCount = null) {
    const targetId = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      return [];
    }
    const count = messageCount || this.options.contextWindow;
    const recentMessages = conversation.messages.slice(-count);
    return recentMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));
  }
  /**
   * Search conversations by content or metadata
   */
  searchConversations(query, options = {}) {
    const searchResults = [];
    const searchTerm = query.toLowerCase();
    const searchType = options.type || "all";
    for (const [id, conversation] of this.conversations) {
      let matches = false;
      if ((searchType === "title" || searchType === "all") && conversation.title.toLowerCase().includes(searchTerm)) {
        matches = true;
      }
      if ((searchType === "content" || searchType === "all") && !matches) {
        for (const message of conversation.messages) {
          if (message.content.toLowerCase().includes(searchTerm)) {
            matches = true;
            break;
          }
        }
      }
      if (searchType === "all" && !matches) {
        for (const tag of conversation.metadata.tags) {
          if (tag.toLowerCase().includes(searchTerm)) {
            matches = true;
            break;
          }
        }
      }
      if (matches) {
        searchResults.push({
          id,
          title: conversation.title,
          type: conversation.type,
          messageCount: conversation.metadata.messageCount,
          updatedAt: conversation.metadata.updatedAt,
          tags: conversation.metadata.tags
        });
      }
    }
    searchResults.sort((a, b) => b.updatedAt - a.updatedAt);
    console.log(`[ConversationManager] Search for "${query}" found ${searchResults.length} results`);
    return searchResults;
  }
  /**
   * Get conversation statistics
   */
  getConversationStats(conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      return null;
    }
    const stats = {
      id: targetId,
      title: conversation.title,
      messageCount: conversation.messages.length,
      createdAt: conversation.metadata.createdAt,
      updatedAt: conversation.metadata.updatedAt,
      userMessages: conversation.messages.filter((m) => m.role === "user").length,
      assistantMessages: conversation.messages.filter((m) => m.role === "assistant").length,
      totalTokens: conversation.messages.reduce((sum, m) => sum + (m.metadata.tokens || 0), 0),
      averageMessageLength: 0,
      tags: conversation.metadata.tags,
      type: conversation.type
    };
    if (stats.messageCount > 0) {
      const totalLength = conversation.messages.reduce((sum, m) => sum + m.content.length, 0);
      stats.averageMessageLength = Math.round(totalLength / stats.messageCount);
    }
    return stats;
  }
  /**
   * Export conversation data
   */
  exportConversation(conversationId, format = "json") {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    const exportData = {
      ...conversation,
      context: Object.fromEntries(conversation.context),
      exportedAt: Date.now(),
      version: "1.0"
    };
    switch (format) {
      case "json":
        return JSON.stringify(exportData, null, 2);
      case "markdown":
        return this.convertToMarkdown(exportData);
      case "plain":
        return this.convertToPlainText(exportData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
  /**
   * Import conversation data
   */
  importConversation(data, format = "json") {
    let conversationData;
    try {
      switch (format) {
        case "json":
          conversationData = typeof data === "string" ? JSON.parse(data) : data;
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }
      if (!conversationData.id || !conversationData.messages) {
        throw new Error("Invalid conversation data format");
      }
      let importId = conversationData.id;
      if (this.conversations.has(importId)) {
        importId = this.generateConversationId();
      }
      const conversation = {
        ...conversationData,
        id: importId,
        context: new Map(Object.entries(conversationData.context || {}))
      };
      this.conversations.set(importId, conversation);
      console.log(`[ConversationManager] Imported conversation: ${importId}`);
      this.emit("conversation-imported", { conversationId: importId, conversation });
      return importId;
    } catch (error) {
      console.error("[ConversationManager] Import failed:", error);
      throw error;
    }
  }
  /**
   * Delete conversation
   */
  deleteConversation(conversationId) {
    if (!this.conversations.has(conversationId)) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    this.conversations.delete(conversationId);
    if (this.currentConversationId === conversationId) {
      const remaining = Array.from(this.conversations.keys());
      this.currentConversationId = remaining.length > 0 ? remaining[0] : null;
    }
    console.log(`[ConversationManager] Deleted conversation: ${conversationId}`);
    this.emit("conversation-deleted", { conversationId });
  }
  /**
   * Get all conversations summary
   */
  getAllConversations() {
    const summaries = [];
    for (const [id, conversation] of this.conversations) {
      summaries.push({
        id,
        title: conversation.title,
        type: conversation.type,
        messageCount: conversation.messages.length,
        createdAt: conversation.metadata.createdAt,
        updatedAt: conversation.metadata.updatedAt,
        tags: conversation.metadata.tags,
        isActive: id === this.currentConversationId
      });
    }
    summaries.sort((a, b) => b.updatedAt - a.updatedAt);
    return summaries;
  }
  /**
   * Claude Code style session methods
   */
  /**
   * Continue the most recent session (claude --continue)
   */
  continueLastSession() {
    if (!this.lastSessionId || !this.conversations.has(this.lastSessionId)) {
      throw new Error("No recent session to continue");
    }
    const conversation = this.conversations.get(this.lastSessionId);
    conversation.sessionState.continuationMode = true;
    conversation.metadata.updatedAt = Date.now();
    this.switchToConversation(this.lastSessionId);
    console.log(`[ConversationManager] Continuing session: ${this.lastSessionId}`);
    this.emit("session-continued", { conversationId: this.lastSessionId, conversation });
    return conversation;
  }
  /**
   * Resume a specific session by ID (claude --resume)
   */
  resumeSession(sessionId) {
    if (!this.conversations.has(sessionId)) {
      throw new Error(`Session ${sessionId} not found`);
    }
    const conversation = this.conversations.get(sessionId);
    conversation.sessionState.continuationMode = true;
    conversation.metadata.updatedAt = Date.now();
    const sessionInfo = this.sessionHistory.get(sessionId);
    if (sessionInfo) {
      sessionInfo.lastAccessed = Date.now();
    }
    this.switchToConversation(sessionId);
    this.lastSessionId = sessionId;
    console.log(`[ConversationManager] Resumed session: ${sessionId}`);
    this.emit("session-resumed", { conversationId: sessionId, conversation });
    return conversation;
  }
  /**
   * Clear conversation history (/clear)
   */
  clearConversation(conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    if (!targetId) {
      throw new Error("No active conversation");
    }
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      throw new Error(`Conversation ${targetId} not found`);
    }
    conversation.messages = [];
    conversation.metadata.messageCount = 0;
    conversation.metadata.updatedAt = Date.now();
    conversation.metadata.tokenUsage = { input: 0, output: 0, total: 0 };
    conversation.sessionState.contextSummary = null;
    console.log(`[ConversationManager] Cleared conversation: ${targetId}`);
    this.emit("conversation-cleared", { conversationId: targetId });
    return conversation;
  }
  /**
   * Compact conversation (/compact)
   */
  compactConversation(conversationId = null, instructions = null) {
    const targetId = conversationId || this.currentConversationId;
    if (!targetId) {
      throw new Error("No active conversation");
    }
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      throw new Error(`Conversation ${targetId} not found`);
    }
    if (conversation.messages.length < 5) {
      console.log(`[ConversationManager] Conversation too short to compact: ${targetId}`);
      return conversation;
    }
    const messagesToSummarize = conversation.messages.slice(0, -this.options.contextWindow);
    const recentMessages = conversation.messages.slice(-this.options.contextWindow);
    if (messagesToSummarize.length === 0) {
      return conversation;
    }
    const summary = this.generateConversationSummary(messagesToSummarize, instructions);
    conversation.messages = [
      {
        id: this.generateMessageId(),
        role: "system",
        content: `[Conversation Summary]: ${summary}`,
        timestamp: Date.now(),
        metadata: { type: "summary", originalMessageCount: messagesToSummarize.length }
      },
      ...recentMessages
    ];
    conversation.metadata.compactionCount++;
    conversation.metadata.updatedAt = Date.now();
    conversation.sessionState.contextSummary = summary;
    console.log(`[ConversationManager] Compacted conversation: ${targetId}`);
    this.emit("conversation-compacted", { conversationId: targetId, summary });
    return conversation;
  }
  /**
   * Get session list for picker UI
   */
  getSessionList(options = {}) {
    const limit = options.limit || 20;
    const includeInactive = options.includeInactive || false;
    const sessions = Array.from(this.sessionHistory.values()).filter((session) => includeInactive || session.isActive).sort((a, b) => b.lastAccessed - a.lastAccessed).slice(0, limit).map((session) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      lastAccessed: session.lastAccessed,
      messageCount: session.messageCount,
      isActive: session.isActive,
      timeAgo: this.formatTimeAgo(session.lastAccessed)
    }));
    return sessions;
  }
  /**
   * Get conversation cost statistics (/cost)
   */
  getConversationCost(conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      return null;
    }
    const tokenUsage = conversation.metadata.tokenUsage;
    const inputCostPer1k = 3e-3;
    const outputCostPer1k = 0.015;
    const inputCost = tokenUsage.input / 1e3 * inputCostPer1k;
    const outputCost = tokenUsage.output / 1e3 * outputCostPer1k;
    return {
      conversationId: targetId,
      tokens: tokenUsage,
      cost: {
        input: inputCost,
        output: outputCost,
        total: inputCost + outputCost
      },
      messageCount: conversation.metadata.messageCount,
      model: conversation.settings.model
    };
  }
  /**
   * Helper Methods
   */
  generateConversationId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  generateSessionTitle(options = {}) {
    if (options.title) return options.title;
    const timestamp = (/* @__PURE__ */ new Date()).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    const projectName = options.projectPath ? options.projectPath.split("/").pop() : "EG-Desk";
    return `${projectName} - ${timestamp}`;
  }
  shouldCompactConversation(conversation) {
    return this.options.enableSessionCompaction && conversation.messages.length > this.options.compactionThreshold;
  }
  generateConversationSummary(messages, instructions = null) {
    const messageCount = messages.length;
    const userMessages = messages.filter((m) => m.role === "user").length;
    const assistantMessages = messages.filter((m) => m.role === "assistant").length;
    let summary = `대화 요약: ${messageCount}개 메시지 (사용자: ${userMessages}, AI: ${assistantMessages})`;
    if (instructions) {
      summary += ` - 특별 지시사항: ${instructions}`;
    }
    const recentUserMessages = messages.filter((m) => m.role === "user").slice(-3).map((m) => m.content.substring(0, 50)).join(", ");
    if (recentUserMessages) {
      summary += ` - 주요 주제: ${recentUserMessages}...`;
    }
    return summary;
  }
  enforceSessionLimits() {
    if (this.conversations.size <= this.options.maxSessions) {
      return;
    }
    const sessions = Array.from(this.sessionHistory.entries()).filter(([id, session]) => !session.isActive || id !== this.currentConversationId).sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    const toRemove = this.conversations.size - this.options.maxSessions;
    for (let i = 0; i < toRemove && i < sessions.length; i++) {
      const [sessionId] = sessions[i];
      this.conversations.delete(sessionId);
      this.sessionHistory.delete(sessionId);
      console.log(`[ConversationManager] Removed old session: ${sessionId}`);
    }
  }
  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 6e4);
    const hours = Math.floor(diff / 36e5);
    const days = Math.floor(diff / 864e5);
    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return new Date(timestamp).toLocaleDateString("ko-KR");
  }
  trimConversation(conversation) {
    if (conversation.messages.length > this.options.maxHistorySize) {
      const removed = conversation.messages.splice(0, conversation.messages.length - this.options.maxHistorySize);
      console.log(`[ConversationManager] Trimmed ${removed.length} old messages from conversation ${conversation.id}`);
    }
  }
  convertToMarkdown(conversationData) {
    let markdown = `# ${conversationData.title}

`;
    markdown += `**Type:** ${conversationData.type}
`;
    markdown += `**Created:** ${new Date(conversationData.metadata.createdAt).toLocaleString()}
`;
    markdown += `**Messages:** ${conversationData.messages.length}

`;
    conversationData.messages.forEach((msg) => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      markdown += `## ${msg.role === "user" ? "사용자" : "AI"} (${timestamp})

`;
      markdown += `${msg.content}

`;
    });
    return markdown;
  }
  convertToPlainText(conversationData) {
    let text = `${conversationData.title}
${"=".repeat(conversationData.title.length)}

`;
    conversationData.messages.forEach((msg) => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      text += `[${timestamp}] ${msg.role === "user" ? "사용자" : "AI"}:
${msg.content}

`;
    });
    return text;
  }
  /**
   * Load conversations from storage (with session history)
   */
  async loadConversations() {
    try {
      if (window.electronAPI?.storage?.get) {
        const savedConversations = await window.electronAPI.storage.get("conversations");
        const savedSessionHistory = await window.electronAPI.storage.get("sessionHistory");
        const savedGlobalContext = await window.electronAPI.storage.get("globalContext");
        const savedLastSession = await window.electronAPI.storage.get("lastSessionId");
        if (savedConversations) {
          for (const [id, data] of Object.entries(savedConversations)) {
            const conversation = {
              ...data,
              context: new Map(Object.entries(data.context || {})),
              // Ensure all new session properties exist
              sessionState: data.sessionState || {
                hasMemoryFile: false,
                memoryContent: null,
                isInteractive: true,
                continuationMode: false,
                contextSummary: null
              },
              metadata: {
                ...data.metadata,
                tokenUsage: data.metadata.tokenUsage || { input: 0, output: 0, total: 0 },
                compactionCount: data.metadata.compactionCount || 0
              }
            };
            this.conversations.set(id, conversation);
          }
          console.log(`[ConversationManager] Loaded ${this.conversations.size} conversations`);
        }
        if (savedSessionHistory) {
          this.sessionHistory = new Map(Object.entries(savedSessionHistory));
          console.log(`[ConversationManager] Loaded ${this.sessionHistory.size} session records`);
        }
        if (savedGlobalContext) {
          this.globalContext = new Map(Object.entries(savedGlobalContext));
          console.log(`[ConversationManager] Loaded global context`);
        }
        if (savedLastSession && this.conversations.has(savedLastSession)) {
          this.lastSessionId = savedLastSession;
          console.log(`[ConversationManager] Restored last session: ${savedLastSession}`);
        }
      }
    } catch (error) {
      console.warn("[ConversationManager] Failed to load conversations:", error);
    }
  }
  /**
   * Save conversations to storage (with session history)
   */
  async saveConversations() {
    try {
      if (window.electronAPI?.storage?.set) {
        const serializable = {};
        for (const [id, conversation] of this.conversations) {
          serializable[id] = {
            ...conversation,
            context: Object.fromEntries(conversation.context)
          };
        }
        await window.electronAPI.storage.set("conversations", serializable);
        await window.electronAPI.storage.set("sessionHistory", Object.fromEntries(this.sessionHistory));
        await window.electronAPI.storage.set("globalContext", Object.fromEntries(this.globalContext));
        if (this.lastSessionId) {
          await window.electronAPI.storage.set("lastSessionId", this.lastSessionId);
        }
        console.log(`[ConversationManager] Saved ${this.conversations.size} conversations and ${this.sessionHistory.size} session records`);
      }
    } catch (error) {
      console.error("[ConversationManager] Failed to save conversations:", error);
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
      this.saveConversations();
    }, this.options.saveInterval);
    console.log("[ConversationManager] Auto-save started");
  }
  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
      console.log("[ConversationManager] Auto-save stopped");
    }
  }
  /**
   * Handle ChatHistoryManager conversation created event
   */
  handleHistoryConversationCreated(data) {
    const { conversationId, conversation } = data;
    if (!this.conversations.has(conversationId)) {
      const localConversation = {
        id: conversationId,
        title: conversation.title,
        type: "general",
        messages: conversation.messages || [],
        context: /* @__PURE__ */ new Map(),
        metadata: {
          ...conversation.metadata,
          tokenUsage: { input: 0, output: 0, total: 0 }
        },
        settings: conversation.settings || {},
        sessionState: {
          hasMemoryFile: false,
          memoryContent: null,
          isInteractive: true,
          continuationMode: false,
          contextSummary: null
        },
        _historyIntegrated: true
      };
      this.conversations.set(conversationId, localConversation);
      console.log(`[ConversationManager] Synced conversation from ChatHistoryManager: ${conversationId}`);
    }
  }
  /**
   * Handle ChatHistoryManager message added event
   */
  handleHistoryMessageAdded(data) {
    const { conversationId, message } = data;
    const conversation = this.conversations.get(conversationId);
    if (conversation && conversation._historyIntegrated) {
      conversation.metadata.messageCount = conversation.messages.length;
      conversation.metadata.updatedAt = Date.now();
      console.log(`[ConversationManager] Synced message addition from ChatHistoryManager: ${conversationId}`);
    }
  }
  /**
   * Handle ChatHistoryManager active conversation changed event
   */
  handleHistoryActiveConversationChanged(data) {
    const { conversationId, previousId } = data;
    this.currentConversationId = conversationId;
    this.lastSessionId = conversationId;
    console.log(`[ConversationManager] Synced active conversation change from ChatHistoryManager: ${conversationId}`);
    this.emit("conversation-switched", { conversationId, previousId });
  }
  /**
   * Load conversation from ChatHistoryManager if integrated
   */
  async loadFromHistory(conversationId) {
    if (!this.chatHistoryManager) {
      return null;
    }
    try {
      const conversation = await this.chatHistoryManager.loadConversation(conversationId);
      if (conversation) {
        const localConversation = {
          id: conversationId,
          title: conversation.title,
          type: "general",
          messages: conversation.messages || [],
          context: /* @__PURE__ */ new Map(),
          metadata: {
            ...conversation.metadata,
            tokenUsage: { input: 0, output: 0, total: 0 }
          },
          settings: conversation.settings || {},
          sessionState: {
            hasMemoryFile: false,
            memoryContent: null,
            isInteractive: true,
            continuationMode: false,
            contextSummary: null
          },
          _historyIntegrated: true
        };
        this.conversations.set(conversationId, localConversation);
        console.log(`[ConversationManager] Loaded conversation from ChatHistoryManager: ${conversationId}`);
        return localConversation;
      }
    } catch (error) {
      console.error(`[ConversationManager] Failed to load from ChatHistoryManager: ${conversationId}`, error);
    }
    return null;
  }
  /**
   * Provider Management Methods
   */
  /**
   * Switch provider for a conversation
   */
  switchProvider(conversationId, newProvider, providerConfig = {}) {
    const targetId = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      throw new Error(`Conversation ${targetId} not found`);
    }
    const oldProvider = conversation.sessionState.currentProvider;
    conversation.sessionState.currentProvider = newProvider;
    conversation.settings.provider = newProvider;
    conversation.settings.providerConfig = { ...conversation.settings.providerConfig, ...providerConfig };
    conversation.sessionState.providerSwitchHistory.push({
      timestamp: Date.now(),
      from: oldProvider,
      to: newProvider,
      reason: "manual-switch"
    });
    conversation.metadata.updatedAt = Date.now();
    console.log(`[ConversationManager] Switched provider from ${oldProvider} to ${newProvider} for conversation ${targetId}`);
    this.emit("provider-switched", { conversationId: targetId, oldProvider, newProvider });
    return conversation;
  }
  /**
   * Get provider statistics for a conversation
   */
  getProviderStats(conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      return null;
    }
    const stats = {
      currentProvider: conversation.sessionState.currentProvider,
      totalCost: conversation.sessionState.totalCost,
      providerCosts: { ...conversation.sessionState.providerCosts },
      providerSwitches: conversation.sessionState.providerSwitchHistory.length,
      providerHistory: [...conversation.sessionState.providerSwitchHistory]
    };
    const providerMessageCounts = {};
    conversation.messages.forEach((msg) => {
      const provider = msg.metadata.provider || "unknown";
      providerMessageCounts[provider] = (providerMessageCounts[provider] || 0) + 1;
    });
    stats.messagesByProvider = providerMessageCounts;
    return stats;
  }
  /**
   * Get cost breakdown for conversation
   */
  getDetailedCostInfo(conversationId = null) {
    const targetId = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      return null;
    }
    const costInfo = {
      conversationId: targetId,
      totalCost: conversation.sessionState.totalCost,
      totalTokens: conversation.metadata.tokenUsage.total,
      providerBreakdown: {},
      messageCount: conversation.metadata.messageCount,
      averageCostPerMessage: 0
    };
    Object.entries(conversation.sessionState.providerCosts).forEach(([provider, data]) => {
      costInfo.providerBreakdown[provider] = {
        cost: data.cost,
        tokens: data.tokens,
        costPerToken: data.tokens > 0 ? data.cost / data.tokens : 0,
        percentage: conversation.sessionState.totalCost > 0 ? data.cost / conversation.sessionState.totalCost * 100 : 0
      };
    });
    if (conversation.metadata.messageCount > 0) {
      costInfo.averageCostPerMessage = conversation.sessionState.totalCost / conversation.metadata.messageCount;
    }
    return costInfo;
  }
  /**
   * Update provider model for conversation
   */
  updateProviderModel(conversationId, provider, model) {
    const targetId = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      throw new Error(`Conversation ${targetId} not found`);
    }
    if (conversation.sessionState.currentProvider === provider) {
      conversation.settings.providerModel = model;
      conversation.metadata.updatedAt = Date.now();
      console.log(`[ConversationManager] Updated model to ${model} for provider ${provider} in conversation ${targetId}`);
      this.emit("model-updated", { conversationId: targetId, provider, model });
    }
    return conversation;
  }
  /**
   * Get conversation context with provider information
   */
  getProviderAwareContext(conversationId = null, includeMessages = true) {
    const baseContext = this.getConversationContext(conversationId, includeMessages);
    const targetId = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(targetId);
    if (conversation) {
      baseContext.provider = {
        current: conversation.sessionState.currentProvider,
        config: conversation.settings.providerConfig,
        model: conversation.settings.providerModel,
        switchHistory: conversation.sessionState.providerSwitchHistory,
        costs: conversation.sessionState.providerCosts
      };
    }
    return baseContext;
  }
  /**
   * Get integration status
   */
  getIntegrationInfo() {
    return {
      hasHistoryManager: !!this.chatHistoryManager,
      integratedConversations: Array.from(this.conversations.values()).filter((conv) => conv._historyIntegrated).length,
      localConversations: Array.from(this.conversations.values()).filter((conv) => !conv._historyIntegrated).length,
      totalConversations: this.conversations.size
    };
  }
  /**
   * Destroy conversation manager
   */
  async destroy() {
    this.stopAutoSave();
    if (this.chatHistoryManager) {
      this.chatHistoryManager.removeAllListeners();
    }
    if (this.options.autoSave) {
      await this.saveConversations();
    }
    this.conversations.clear();
    this.globalContext.clear();
    this.currentConversationId = null;
    this.chatHistoryManager = null;
    this.isInitialized = false;
    this.removeAllListeners();
    console.log("[ConversationManager] Destroyed");
  }
}
class TaskExecutor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      maxConcurrentTasks: options.maxConcurrentTasks || 5,
      retryLimit: options.retryLimit || 3,
      ...options
    };
    this.tasks = /* @__PURE__ */ new Map();
    this.isInitialized = false;
  }
  /**
   * Initialize task executor
   */
  async initialize() {
    try {
      console.log("[TaskExecutor] Initializing...");
      this.isInitialized = true;
      console.log("[TaskExecutor] Successfully initialized");
      this.emit("initialized");
      return true;
    } catch (error) {
      console.error("[TaskExecutor] Initialization failed:", error);
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Add new task
   */
  async addTask(task) {
    const taskId = this.generateTaskId();
    const taskObj = {
      id: taskId,
      ...task,
      status: "pending",
      retries: 0
    };
    this.tasks.set(taskId, taskObj);
    console.log(`[TaskExecutor] Added new task: ${taskId}`);
    this.emit("task-added", taskObj);
    this.executeTask(taskId);
    return taskId;
  }
  /**
   * Execute a task
   */
  async executeTask(taskId) {
    if (!this.tasks.has(taskId)) {
      throw new Error(`Task ${taskId} not found`);
    }
    const task = this.tasks.get(taskId);
    try {
      task.status = "running";
      console.log(`[TaskExecutor] Executing task: ${taskId}`);
      this.emit("task-started", task);
      await task.executionLogic();
      task.status = "completed";
      console.log(`[TaskExecutor] Task completed: ${taskId}`);
      this.emit("task-completed", task);
      this.tasks.delete(taskId);
    } catch (error) {
      console.error(`[TaskExecutor] Task execution failed: ${taskId}`, error);
      task.status = "failed";
      task.retries++;
      if (task.retries <= this.options.retryLimit) {
        console.log(`[TaskExecutor] Retrying task: ${taskId} (${task.retries}/${this.options.retryLimit})`);
        this.executeTask(taskId);
      } else {
        this.emit("task-failed", task);
        this.tasks.delete(taskId);
      }
    }
  }
  /**
   * Cancel a task
   */
  cancelTask(taskId) {
    if (this.tasks.has(taskId)) {
      const task = this.tasks.get(taskId);
      task.status = "cancelled";
      console.log(`[TaskExecutor] Task cancelled: ${taskId}`);
      this.emit("task-cancelled", task);
      this.tasks.delete(taskId);
    } else {
      throw new Error(`Task ${taskId} not found for cancellation`);
    }
  }
  /**
   * Get task status
   */
  getTaskStatus(taskId) {
    if (this.tasks.has(taskId)) {
      const task = this.tasks.get(taskId);
      return {
        id: taskId,
        status: task.status,
        retries: task.retries,
        ...task.metadata
      };
    }
    return null;
  }
  /**
   * Generate unique task ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  /**
   * Destroy task executor
   */
  destroy() {
    this.tasks.clear();
    this.isInitialized = false;
    this.removeAllListeners();
    console.log("[TaskExecutor] Destroyed");
  }
}
class ContentGenerator extends EventEmitter {
  constructor(claudeIntegration, templateManager, options = {}) {
    super();
    this.claudeIntegration = claudeIntegration;
    this.templateManager = templateManager;
    this.options = {
      defaultWordCount: options.defaultWordCount || 800,
      defaultTone: options.defaultTone || "professional",
      industryContext: options.industryContext || "전기센서 및 로고스키 코일 기술",
      ...options
    };
    this.isInitialized = false;
    this.generationHistory = [];
  }
  /**
   * Initialize content generator
   */
  async initialize() {
    try {
      console.log("[ContentGenerator] Initializing...");
      if (!this.claudeIntegration?.isInitialized) {
        throw new Error("Claude integration not initialized");
      }
      this.isInitialized = true;
      console.log("[ContentGenerator] Successfully initialized");
      this.emit("initialized");
      return true;
    } catch (error) {
      console.error("[ContentGenerator] Initialization failed:", error);
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Generate blog content
   */
  async generateBlogContent(request) {
    if (!this.isInitialized) {
      throw new Error("ContentGenerator not initialized");
    }
    const generationId = this.generateId();
    console.log(`[ContentGenerator] Starting blog generation: ${generationId}`);
    try {
      this.emit("generation-started", { id: generationId, type: "blog", request });
      const options = {
        industryContext: request.industryContext || this.options.industryContext,
        targetKeywords: request.keywords || [],
        tone: request.tone || this.options.defaultTone,
        wordCount: request.wordCount || this.options.defaultWordCount,
        template: request.template || "default"
      };
      let prompt2;
      if (options.template && this.templateManager) {
        prompt2 = await this.templateManager.generatePrompt(options.template, {
          topic: request.topic,
          ...options
        });
      } else {
        prompt2 = this.createBlogPrompt(request.topic, options);
      }
      const response = await this.claudeIntegration.sendMessage(prompt2, {
        temperature: 0.7,
        maxTokens: Math.max(options.wordCount * 2, 4e3),
        context: "content-generation"
      });
      const result = {
        id: generationId,
        type: "blog",
        title: this.extractTitle(response.content),
        content: response.content,
        metadata: {
          topic: request.topic,
          wordCount: this.countWords(response.content),
          keywords: options.targetKeywords,
          tone: options.tone,
          generatedAt: Date.now(),
          model: response.model
        }
      };
      this.generationHistory.push(result);
      console.log(`[ContentGenerator] Blog generation completed: ${generationId}`);
      this.emit("generation-completed", result);
      return result;
    } catch (error) {
      console.error(`[ContentGenerator] Blog generation failed: ${generationId}`, error);
      this.emit("generation-failed", { id: generationId, error: error.message });
      throw error;
    }
  }
  /**
   * Generate SEO-optimized content
   */
  async generateSEOContent(request) {
    if (!this.isInitialized) {
      throw new Error("ContentGenerator not initialized");
    }
    const generationId = this.generateId();
    console.log(`[ContentGenerator] Starting SEO content generation: ${generationId}`);
    try {
      this.emit("generation-started", { id: generationId, type: "seo", request });
      const prompt2 = this.createSEOPrompt(request.topic, {
        primaryKeyword: request.primaryKeyword,
        secondaryKeywords: request.secondaryKeywords || [],
        targetAudience: request.targetAudience || "전기 엔지니어 및 기술자",
        contentType: request.contentType || "blog",
        wordCount: request.wordCount || this.options.defaultWordCount
      });
      const response = await this.claudeIntegration.sendMessage(prompt2, {
        temperature: 0.6,
        maxTokens: Math.max(request.wordCount * 2, 6e3),
        context: "seo-content-generation"
      });
      const result = {
        id: generationId,
        type: "seo-content",
        title: this.extractTitle(response.content),
        content: response.content,
        metadata: {
          topic: request.topic,
          primaryKeyword: request.primaryKeyword,
          secondaryKeywords: request.secondaryKeywords || [],
          wordCount: this.countWords(response.content),
          generatedAt: Date.now(),
          model: response.model
        }
      };
      this.generationHistory.push(result);
      console.log(`[ContentGenerator] SEO content generation completed: ${generationId}`);
      this.emit("generation-completed", result);
      return result;
    } catch (error) {
      console.error(`[ContentGenerator] SEO content generation failed: ${generationId}`, error);
      this.emit("generation-failed", { id: generationId, error: error.message });
      throw error;
    }
  }
  /**
   * Generate product description
   */
  async generateProductDescription(product) {
    if (!this.isInitialized) {
      throw new Error("ContentGenerator not initialized");
    }
    const generationId = this.generateId();
    console.log(`[ContentGenerator] Starting product description generation: ${generationId}`);
    try {
      this.emit("generation-started", { id: generationId, type: "product-description", product });
      const prompt2 = `
다음 제품에 대한 전문적이고 매력적인 제품 설명을 작성해 주세요:

제품명: ${product.name}
카테고리: ${product.category || "전기센서"}
주요 특징: ${(product.features || []).join(", ")}
기술 사양: ${product.specifications || ""}
적용 분야: ${product.applications || ""}

요구사항:
- 기술적 정확성 중시
- 고객의 관심을 끄는 매력적인 표현
- 경쟁사와의 차별점 강조
- SEO 친화적 구조
- HTML 형식으로 작성

구조:
1. 제품 개요 (2-3줄)
2. 주요 특징 및 장점
3. 기술 사양
4. 적용 분야 및 사례
5. 구매 포인트
`;
      const response = await this.claudeIntegration.sendMessage(prompt2, {
        temperature: 0.6,
        maxTokens: 3e3,
        context: "product-description"
      });
      const result = {
        id: generationId,
        type: "product-description",
        productName: product.name,
        content: response.content,
        metadata: {
          product,
          wordCount: this.countWords(response.content),
          generatedAt: Date.now(),
          model: response.model
        }
      };
      this.generationHistory.push(result);
      console.log(`[ContentGenerator] Product description generation completed: ${generationId}`);
      this.emit("generation-completed", result);
      return result;
    } catch (error) {
      console.error(`[ContentGenerator] Product description generation failed: ${generationId}`, error);
      this.emit("generation-failed", { id: generationId, error: error.message });
      throw error;
    }
  }
  /**
   * Generate technical documentation
   */
  async generateTechnicalDoc(request) {
    if (!this.isInitialized) {
      throw new Error("ContentGenerator not initialized");
    }
    const generationId = this.generateId();
    console.log(`[ContentGenerator] Starting technical documentation generation: ${generationId}`);
    try {
      this.emit("generation-started", { id: generationId, type: "technical-doc", request });
      const prompt2 = `
다음 주제에 대한 기술 문서를 작성해 주세요:

제목: ${request.title}
문서 유형: ${request.docType || "기술 가이드"}
대상 독자: ${request.audience || "기술자 및 엔지니어"}
세부 내용: ${request.details || ""}

요구사항:
- 정확하고 상세한 기술적 설명
- 단계별 절차 포함
- 주의사항 및 안전 지침
- 도표나 그림 설명 포함
- 참고 자료 및 관련 표준

구조:
1. 개요 및 목적
2. 필요 장비/도구
3. 단계별 절차
4. 주의사항
5. 문제 해결
6. 관련 자료
`;
      const response = await this.claudeIntegration.sendMessage(prompt2, {
        temperature: 0.4,
        maxTokens: 8e3,
        context: "technical-documentation"
      });
      const result = {
        id: generationId,
        type: "technical-doc",
        title: request.title,
        content: response.content,
        metadata: {
          docType: request.docType,
          audience: request.audience,
          wordCount: this.countWords(response.content),
          generatedAt: Date.now(),
          model: response.model
        }
      };
      this.generationHistory.push(result);
      console.log(`[ContentGenerator] Technical documentation generation completed: ${generationId}`);
      this.emit("generation-completed", result);
      return result;
    } catch (error) {
      console.error(`[ContentGenerator] Technical documentation generation failed: ${generationId}`, error);
      this.emit("generation-failed", { id: generationId, error: error.message });
      throw error;
    }
  }
  /**
   * Create blog content prompt
   */
  createBlogPrompt(topic, options) {
    return `
다음 주제로 ${options.industryContext} 분야의 전문적인 블로그 글을 작성해 주세요:

주제: ${topic}

요구사항:
- 글 길이: 약 ${options.wordCount}자
- 어투: ${options.tone === "professional" ? "전문적이고 신뢰감 있는" : options.tone}
- SEO 키워드: ${options.targetKeywords.join(", ")}
- 한국어로 작성
- 기술적 정확성 중시
- 실용적 정보 포함

구조:
1. 흥미로운 도입부
2. 주요 내용 (기술적 설명, 장점, 적용 분야)
3. 실제 사례나 예시
4. 결론 및 향후 전망

HTML 형식으로 작성하되, <article> 태그로 감싸주세요.
메타 정보도 함께 제공해 주세요.
`;
  }
  /**
   * Create SEO-optimized content prompt
   */
  createSEOPrompt(topic, options) {
    return `
다음 주제로 SEO에 최적화된 콘텐츠를 작성해 주세요:

주제: ${topic}
주요 키워드: ${options.primaryKeyword}
보조 키워드: ${options.secondaryKeywords.join(", ")}
대상 독자: ${options.targetAudience}
콘텐츠 유형: ${options.contentType}
목표 글 길이: ${options.wordCount}자

SEO 최적화 요구사항:
- 제목에 주요 키워드 포함 (60자 이내)
- 메타 설명 생성 (150자 이내)
- H1, H2, H3 태그 구조화
- 키워드 밀도 2-3% 유지 (자연스럽게)
- 내부 링크 제안
- 이미지 alt 텍스트 제안
- FAQ 섹션 포함

구조:
1. SEO 친화적 제목
2. 매력적인 도입부
3. 주요 콘텐츠 (키워드 포함)
4. FAQ 섹션
5. 결론 및 CTA

HTML 형식으로 작성하고, SEO 메타데이터를 별도로 제공해 주세요.
`;
  }
  /**
   * Extract title from content
   */
  extractTitle(content) {
    const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i) || content.match(/<title[^>]*>(.*?)<\/title>/i) || content.match(/^#\s*(.+)/m);
    return titleMatch ? titleMatch[1].trim() : "생성된 콘텐츠";
  }
  /**
   * Count words in content
   */
  countWords(content) {
    const textOnly = content.replace(/<[^>]*>/g, "");
    return textOnly.trim().length;
  }
  /**
   * Get generation history
   */
  getGenerationHistory(limit = 20) {
    return this.generationHistory.slice(-limit).sort((a, b) => b.metadata.generatedAt - a.metadata.generatedAt);
  }
  /**
   * Get generation statistics
   */
  getGenerationStats() {
    const stats = {
      totalGenerations: this.generationHistory.length,
      byType: {},
      averageWordCount: 0,
      totalWords: 0,
      recentGenerations: this.generationHistory.slice(-10).length
    };
    this.generationHistory.forEach((item) => {
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
      stats.totalWords += item.metadata.wordCount || 0;
    });
    if (stats.totalGenerations > 0) {
      stats.averageWordCount = Math.round(stats.totalWords / stats.totalGenerations);
    }
    return stats;
  }
  /**
   * Clear generation history
   */
  clearHistory() {
    this.generationHistory = [];
    console.log("[ContentGenerator] Generation history cleared");
    this.emit("history-cleared");
  }
  /**
   * Generate unique ID
   */
  generateId() {
    return `gen_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  /**
   * Destroy content generator
   */
  destroy() {
    this.generationHistory = [];
    this.isInitialized = false;
    this.removeAllListeners();
    console.log("[ContentGenerator] Destroyed");
  }
}
class TemplateManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      templatesPath: options.templatesPath || "./templates",
      autoReload: options.autoReload !== false,
      ...options
    };
    this.templates = /* @__PURE__ */ new Map();
    this.isInitialized = false;
  }
  /**
   * Initialize template manager
   */
  async initialize() {
    try {
      console.log("[TemplateManager] Initializing...");
      await this.reloadTemplates();
      if (this.options.autoReload) {
        this.setupFileWatchers();
      }
      this.isInitialized = true;
      console.log("[TemplateManager] Successfully initialized");
      this.emit("initialized");
      return true;
    } catch (error) {
      console.error("[TemplateManager] Initialization failed:", error);
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Load or reload templates
   */
  async reloadTemplates() {
    try {
      this.templates.clear();
      const exampleTemplate = {
        id: "default",
        prompt: `다음 주제로 기본 템플릿을 사용하여 블로그 글을 작성해 주세요:

주제: {{topic}}
어투: {{tone}}
키워드: {{keywords}}
`
      };
      this.templates.set(exampleTemplate.id, exampleTemplate);
      console.log(`[TemplateManager] Loaded templates from ${this.options.templatesPath}`);
      this.emit("templates-reloaded", { count: this.templates.size });
    } catch (error) {
      console.error("[TemplateManager] Failed to load templates:", error);
      throw error;
    }
  }
  /**
   * Get available templates
   */
  getAvailableTemplates() {
    return Array.from(this.templates.values());
  }
  /**
   * Generate prompt using a template
   */
  async generatePrompt(templateId, variables = {}) {
    if (!this.templates.has(templateId)) {
      throw new Error(`Template ${templateId} not found`);
    }
    const template = this.templates.get(templateId);
    const prompt2 = this.fillTemplate(template.prompt, variables);
    console.log(`[TemplateManager] Generated prompt using template: ${templateId}`);
    return prompt2;
  }
  /**
   * Fill template with variables
   */
  fillTemplate(templateString, variables) {
    return templateString.replace(/{{(\w+)}}/g, (match, key) => {
      return variables[key] || match;
    });
  }
  /**
   * Add or update a template
   */
  addOrUpdateTemplate(template) {
    if (!template.id || !template.prompt) {
      throw new Error("Invalid template format");
    }
    this.templates.set(template.id, template);
    console.log(`[TemplateManager] Added/Updated template: ${template.id}`);
    this.emit("template-updated", { id: template.id });
  }
  /**
   * Delete a template
   */
  deleteTemplate(templateId) {
    if (!this.templates.has(templateId)) {
      throw new Error(`Template ${templateId} not found`);
    }
    this.templates.delete(templateId);
    console.log(`[TemplateManager] Deleted template: ${templateId}`);
    this.emit("template-deleted", { templateId });
  }
  /**
   * Watch template files for changes
   */
  setupFileWatchers() {
    console.log("[TemplateManager] File watchers not implemented yet. Placeholder for future enhancement.");
  }
  /**
   * Destroy template manager
   */
  destroy() {
    this.templates.clear();
    this.isInitialized = false;
    this.removeAllListeners();
    console.log("[TemplateManager] Destroyed");
  }
}
class SEOOptimizer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      targetKeywordDensity: options.targetKeywordDensity || 0.025,
      // 2.5%
      maxKeywordDensity: options.maxKeywordDensity || 0.035,
      // 3.5%
      titleMaxLength: options.titleMaxLength || 60,
      descriptionMaxLength: options.descriptionMaxLength || 150,
      ...options
    };
    this.isInitialized = false;
    this.koreanStopWords = /* @__PURE__ */ new Set([
      "그리고",
      "그러나",
      "또한",
      "하지만",
      "따라서",
      "그래서",
      "이것은",
      "그것은",
      "이런",
      "그런",
      "어떤",
      "무엇",
      "어떻게",
      "왜",
      "언제",
      "어디서",
      "누가",
      "것이다",
      "것입니다",
      "입니다",
      "있다",
      "없다",
      "한다",
      "합니다"
    ]);
  }
  /**
   * Initialize SEO optimizer
   */
  async initialize() {
    try {
      console.log("[SEOOptimizer] Initializing...");
      this.isInitialized = true;
      console.log("[SEOOptimizer] Successfully initialized");
      this.emit("initialized");
      return true;
    } catch (error) {
      console.error("[SEOOptimizer] Initialization failed:", error);
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Optimize content for SEO
   */
  async optimizeContent(content, options = {}) {
    if (!this.isInitialized) {
      throw new Error("SEOOptimizer not initialized");
    }
    const optimizationId = this.generateId();
    console.log(`[SEOOptimizer] Starting content optimization: ${optimizationId}`);
    try {
      this.emit("optimization-started", { id: optimizationId, content: content.substring(0, 100) + "..." });
      const analysis = this.analyzeContent(content, options);
      const recommendations = this.generateRecommendations(analysis, options);
      const optimizedContent = await this.applyOptimizations(content, recommendations, options);
      const result = {
        id: optimizationId,
        originalContent: content,
        optimizedContent,
        analysis,
        recommendations,
        seoScore: this.calculateSEOScore(analysis, options),
        optimizedAt: Date.now()
      };
      console.log(`[SEOOptimizer] Content optimization completed: ${optimizationId}`);
      this.emit("optimization-completed", result);
      return result;
    } catch (error) {
      console.error(`[SEOOptimizer] Content optimization failed: ${optimizationId}`, error);
      this.emit("optimization-failed", { id: optimizationId, error: error.message });
      throw error;
    }
  }
  /**
   * Analyze content for SEO factors
   */
  analyzeContent(content, options = {}) {
    const textContent = this.stripHTML(content);
    const targetKeywords = options.targetKeywords || [];
    const analysis = {
      wordCount: this.countWords(textContent),
      characterCount: textContent.length,
      title: this.extractTitle(content),
      headings: this.extractHeadings(content),
      keywords: this.analyzeKeywords(textContent, targetKeywords),
      readability: this.analyzeReadability(textContent),
      structure: this.analyzeStructure(content),
      meta: this.analyzeMeta(content),
      internalLinks: this.analyzeInternalLinks(content),
      images: this.analyzeImages(content)
    };
    return analysis;
  }
  /**
   * Generate SEO recommendations
   */
  generateRecommendations(analysis, options = {}) {
    const recommendations = [];
    const targetKeywords = options.targetKeywords || [];
    if (!analysis.title) {
      recommendations.push({
        type: "title",
        priority: "high",
        message: "H1 태그가 없습니다. SEO를 위해 명확한 제목을 추가하세요.",
        fix: "add_h1_tag"
      });
    } else if (analysis.title.length > this.options.titleMaxLength) {
      recommendations.push({
        type: "title",
        priority: "medium",
        message: `제목이 ${this.options.titleMaxLength}자를 초과합니다. (현재: ${analysis.title.length}자)`,
        fix: "shorten_title"
      });
    }
    targetKeywords.forEach((keyword) => {
      const keywordData = analysis.keywords.find((k) => k.word === keyword);
      if (!keywordData) {
        recommendations.push({
          type: "keyword",
          priority: "high",
          message: `타겟 키워드 "${keyword}"가 콘텐츠에 포함되지 않았습니다.`,
          fix: "add_keyword",
          keyword
        });
      } else if (keywordData.density < this.options.targetKeywordDensity) {
        recommendations.push({
          type: "keyword",
          priority: "medium",
          message: `키워드 "${keyword}"의 밀도가 낮습니다. (현재: ${(keywordData.density * 100).toFixed(1)}%)`,
          fix: "increase_keyword_density",
          keyword
        });
      } else if (keywordData.density > this.options.maxKeywordDensity) {
        recommendations.push({
          type: "keyword",
          priority: "medium",
          message: `키워드 "${keyword}"의 밀도가 너무 높습니다. (현재: ${(keywordData.density * 100).toFixed(1)}%)`,
          fix: "decrease_keyword_density",
          keyword
        });
      }
    });
    if (analysis.headings.h2.length === 0) {
      recommendations.push({
        type: "structure",
        priority: "medium",
        message: "H2 태그가 없습니다. 콘텐츠 구조를 개선하기 위해 부제목을 추가하세요.",
        fix: "add_h2_tags"
      });
    }
    if (analysis.wordCount < 300) {
      recommendations.push({
        type: "content",
        priority: "high",
        message: `콘텐츠가 너무 짧습니다. (현재: ${analysis.wordCount}자) SEO를 위해 최소 300자 이상 작성하세요.`,
        fix: "expand_content"
      });
    }
    if (!analysis.meta.description) {
      recommendations.push({
        type: "meta",
        priority: "high",
        message: "메타 설명이 없습니다. 검색 결과에 표시될 설명을 추가하세요.",
        fix: "add_meta_description"
      });
    }
    if (analysis.images.withoutAlt > 0) {
      recommendations.push({
        type: "accessibility",
        priority: "medium",
        message: `${analysis.images.withoutAlt}개의 이미지에 alt 텍스트가 없습니다.`,
        fix: "add_alt_text"
      });
    }
    return recommendations;
  }
  /**
   * Apply SEO optimizations to content
   */
  async applyOptimizations(content, recommendations, options = {}) {
    let optimizedContent = content;
    options.targetKeywords || [];
    for (const recommendation of recommendations) {
      switch (recommendation.fix) {
        case "add_h1_tag":
          if (!this.extractTitle(optimizedContent)) {
            const title = options.suggestedTitle || "제목을 입력하세요";
            optimizedContent = `<h1>${title}</h1>

${optimizedContent}`;
          }
          break;
        case "add_h2_tags":
          optimizedContent = this.addH2Tags(optimizedContent);
          break;
        case "add_meta_description":
          if (options.suggestedDescription) {
            const metaTag = `<meta name="description" content="${options.suggestedDescription}">`;
            optimizedContent = `${metaTag}
${optimizedContent}`;
          }
          break;
        case "add_keyword":
          if (recommendation.keyword) {
            optimizedContent = this.addKeywordNaturally(optimizedContent, recommendation.keyword);
          }
          break;
      }
    }
    return optimizedContent;
  }
  /**
   * Calculate SEO score based on analysis
   */
  calculateSEOScore(analysis, options = {}) {
    let score = 0;
    let maxScore = 0;
    maxScore += 20;
    if (analysis.title) {
      if (analysis.title.length <= this.options.titleMaxLength) {
        score += 20;
      } else {
        score += 10;
      }
    }
    maxScore += 15;
    if (analysis.wordCount >= 800) {
      score += 15;
    } else if (analysis.wordCount >= 500) {
      score += 10;
    } else if (analysis.wordCount >= 300) {
      score += 5;
    }
    maxScore += 15;
    if (analysis.headings.h2.length >= 2) {
      score += 10;
    } else if (analysis.headings.h2.length >= 1) {
      score += 5;
    }
    if (analysis.headings.h3.length >= 1) {
      score += 5;
    }
    maxScore += 25;
    const targetKeywords = options.targetKeywords || [];
    if (targetKeywords.length > 0) {
      let keywordScore = 0;
      targetKeywords.forEach((keyword) => {
        const keywordData = analysis.keywords.find((k) => k.word === keyword);
        if (keywordData && keywordData.density >= this.options.targetKeywordDensity && keywordData.density <= this.options.maxKeywordDensity) {
          keywordScore += 25 / targetKeywords.length;
        }
      });
      score += keywordScore;
    }
    maxScore += 10;
    if (analysis.meta.description && analysis.meta.description.length <= this.options.descriptionMaxLength) {
      score += 10;
    }
    maxScore += 10;
    if (analysis.images.total > 0) {
      const altTextRatio = (analysis.images.total - analysis.images.withoutAlt) / analysis.images.total;
      score += altTextRatio * 10;
    } else {
      score += 5;
    }
    maxScore += 5;
    if (analysis.internalLinks > 0) {
      score += 5;
    }
    return {
      score: Math.round(score),
      maxScore,
      percentage: Math.round(score / maxScore * 100),
      grade: this.getScoreGrade(score / maxScore)
    };
  }
  /**
   * Helper methods
   */
  stripHTML(content) {
    return content.replace(/<[^>]*>/g, "");
  }
  countWords(text) {
    return text.trim().length;
  }
  extractTitle(content) {
    const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    return titleMatch ? titleMatch[1].trim() : null;
  }
  extractHeadings(content) {
    return {
      h1: (content.match(/<h1[^>]*>.*?<\/h1>/gi) || []).length,
      h2: (content.match(/<h2[^>]*>.*?<\/h2>/gi) || []).length,
      h3: (content.match(/<h3[^>]*>.*?<\/h3>/gi) || []).length
    };
  }
  analyzeKeywords(text, targetKeywords = []) {
    const words = text.toLowerCase().replace(/[^\w\s가-힣]/g, " ").split(/\s+/).filter((word) => word.length > 1 && !this.koreanStopWords.has(word));
    const wordCount = {};
    words.forEach((word) => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    const totalWords = words.length;
    const keywords = [];
    targetKeywords.forEach((keyword) => {
      const count = wordCount[keyword.toLowerCase()] || 0;
      keywords.push({
        word: keyword,
        count,
        density: count / totalWords,
        isTarget: true
      });
    });
    const sortedWords = Object.entries(wordCount).sort(([, a], [, b]) => b - a).slice(0, 10);
    sortedWords.forEach(([word, count]) => {
      if (!keywords.find((k) => k.word === word)) {
        keywords.push({
          word,
          count,
          density: count / totalWords,
          isTarget: false
        });
      }
    });
    return keywords;
  }
  analyzeReadability(text) {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    return {
      sentenceCount: sentences.length,
      averageWordsPerSentence: sentences.length > 0 ? words.length / sentences.length : 0,
      averageCharactersPerWord: words.length > 0 ? text.length / words.length : 0
    };
  }
  analyzeStructure(content) {
    return {
      hasList: /<[uo]l>/i.test(content),
      hasTable: /<table>/i.test(content),
      hasBlockquote: /<blockquote>/i.test(content),
      paragraphCount: (content.match(/<p[^>]*>/gi) || []).length
    };
  }
  analyzeMeta(content) {
    const descriptionMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const keywordsMatch = content.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i);
    return {
      description: descriptionMatch ? descriptionMatch[1] : null,
      keywords: keywordsMatch ? keywordsMatch[1] : null
    };
  }
  analyzeInternalLinks(content) {
    const internalLinks = content.match(/<a[^>]*href=["'][^"']*["'][^>]*>/gi) || [];
    return internalLinks.filter((link) => !link.includes("http")).length;
  }
  analyzeImages(content) {
    const images = content.match(/<img[^>]*>/gi) || [];
    const withoutAlt = images.filter((img) => !img.includes("alt=")).length;
    return {
      total: images.length,
      withoutAlt,
      withAlt: images.length - withoutAlt
    };
  }
  addH2Tags(content) {
    const paragraphs = content.split("<p>");
    if (paragraphs.length > 3) {
      const midpoint = Math.floor(paragraphs.length / 2);
      paragraphs[midpoint] = "<h2>주요 내용</h2>\n<p>" + paragraphs[midpoint];
    }
    return paragraphs.join("<p>");
  }
  addKeywordNaturally(content, keyword) {
    const textContent = this.stripHTML(content);
    if (textContent.length > 100 && !textContent.toLowerCase().includes(keyword.toLowerCase())) {
      const sentences = textContent.split(".").filter((s) => s.trim().length > 0);
      if (sentences.length > 1) {
        sentences[1] += ` ${keyword}는 중요한 요소입니다.`;
        return content.replace(textContent, sentences.join("."));
      }
    }
    return content;
  }
  getScoreGrade(percentage) {
    if (percentage >= 0.9) return "A+";
    if (percentage >= 0.8) return "A";
    if (percentage >= 0.7) return "B+";
    if (percentage >= 0.6) return "B";
    if (percentage >= 0.5) return "C+";
    if (percentage >= 0.4) return "C";
    return "D";
  }
  generateId() {
    return `seo_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  /**
   * Destroy SEO optimizer
   */
  destroy() {
    this.isInitialized = false;
    this.removeAllListeners();
    console.log("[SEOOptimizer] Destroyed");
  }
}
class QualityChecker extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      spellCheck: options.spellCheck !== false,
      grammarCheck: options.grammarCheck !== false,
      styleGuidelines: options.styleGuidelines || {},
      ...options
    };
    this.isInitialized = false;
  }
  /**
   * Initialize quality checker
   */
  async initialize() {
    try {
      console.log("[QualityChecker] Initializing...");
      this.isInitialized = true;
      console.log("[QualityChecker] Successfully initialized");
      this.emit("initialized");
      return true;
    } catch (error) {
      console.error("[QualityChecker] Initialization failed:", error);
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Check content quality
   */
  async checkContentQuality(content) {
    if (!this.isInitialized) {
      throw new Error("QualityChecker not initialized");
    }
    try {
      const errors = [];
      if (this.options.spellCheck) {
        errors.push(...this.checkSpelling(content));
      }
      if (this.options.grammarCheck) {
        errors.push(...this.checkGrammar(content));
      }
      errors.push(...this.checkStyle(content));
      const qualityReport = {
        content,
        errors,
        qualityScore: this.calculateQualityScore(errors.length)
      };
      this.emit("quality-check-completed", qualityReport);
      return qualityReport;
    } catch (error) {
      console.error("[QualityChecker] Quality check failed:", error);
      this.emit("quality-check-failed", { error: error.message });
      throw error;
    }
  }
  /**
   * Check spelling
   */
  checkSpelling(content) {
    const errors = [];
    if (content.includes("speling")) {
      errors.push({ type: "spelling", message: "'speling' should be 'spelling'", position: content.indexOf("speling") });
    }
    return errors;
  }
  /**
   * Check grammar
   */
  checkGrammar(content) {
    const errors = [];
    if (content.includes("is no")) {
      errors.push({ type: "grammar", message: "Replace 'is no' with 'is not'", position: content.indexOf("is no") });
    }
    return errors;
  }
  /**
   * Check style
   */
  checkStyle(content) {
    const errors = [];
    for (const [rule, recommendation] of Object.entries(this.options.styleGuidelines)) {
      if (!new RegExp(rule).test(content)) {
        errors.push({ type: "style", message: recommendation });
      }
    }
    return errors;
  }
  /**
   * Calculate content quality score
   */
  calculateQualityScore(errorCount) {
    const baseScore = 100;
    const deductionPerError = 10;
    const score = Math.max(baseScore - errorCount * deductionPerError, 0);
    return score;
  }
  /**
   * Destroy quality checker
   */
  destroy() {
    this.isInitialized = false;
    this.removeAllListeners();
    console.log("[QualityChecker] Destroyed");
  }
}
class GlobalStateManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      persistState: options.persistState !== false,
      autoSave: options.autoSave !== false,
      saveInterval: options.saveInterval || 1e4,
      // 10 seconds
      ...options
    };
    this.state = /* @__PURE__ */ new Map();
    this.isInitialized = false;
    this.saveTimer = null;
    this.chatHistoryIndex = /* @__PURE__ */ new Map();
    this.conversationMetadata = /* @__PURE__ */ new Map();
    this.activeConversationId = null;
    this.historyCleanupTimer = null;
    this.providerStates = /* @__PURE__ */ new Map();
    this.activeProvider = null;
    this.providerSwitchHistory = [];
    this.providerCostTracking = /* @__PURE__ */ new Map();
    this.providerHealthTimer = null;
    this.lastProviderError = null;
    this.providerRetryAttempts = /* @__PURE__ */ new Map();
  }
  /**
   * Initialize global state manager
   */
  async initialize() {
    try {
      console.log("[GlobalStateManager] Initializing...");
      if (this.options.persistState) {
        await this.loadState();
      }
      await this.initializeChatHistory();
      await this.initializeAIProviders();
      if (this.options.autoSave) {
        this.startAutoSave();
      }
      this.startHistoryCleanup();
      this.startProviderMonitoring();
      this.isInitialized = true;
      console.log("[GlobalStateManager] Successfully initialized");
      this.emit("initialized");
      return true;
    } catch (error) {
      console.error("[GlobalStateManager] Initialization failed:", error);
      this.emit("error", error);
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
    this.emit("state-changed", { key, value, previousValue });
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
    this.emit("state-removed", { key, value });
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
    console.log("[GlobalStateManager] State cleared");
    this.emit("state-cleared");
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
        const savedState = await window.electronAPI.storage.get("globalState");
        if (savedState) {
          this.state = new Map(Object.entries(savedState));
          console.log(`[GlobalStateManager] Loaded state with ${this.state.size} entries`);
          this.emit("state-loaded", { size: this.state.size });
        }
        const savedChatHistory = await window.electronAPI.storage.get("chatHistory");
        if (savedChatHistory) {
          this.state.set("chatHistory", savedChatHistory);
          console.log(`[GlobalStateManager] Loaded chat history with ${Object.keys(savedChatHistory.conversations || {}).length} conversations`);
        }
        const savedAIProviders = await window.electronAPI.storage.get("aiProviders");
        if (savedAIProviders) {
          this.state.set("aiProviders", savedAIProviders);
          console.log(`[GlobalStateManager] Loaded AI provider state with ${Object.keys(savedAIProviders.availableProviders || {}).length} providers`);
          this.activeProvider = savedAIProviders.activeProvider;
          if (savedAIProviders.retryAttempts) {
            this.providerRetryAttempts = new Map(Object.entries(savedAIProviders.retryAttempts));
          }
          if (savedAIProviders.healthStatus) {
            Object.entries(savedAIProviders.healthStatus).forEach(([providerId, status]) => {
              this.providerStates.set(providerId, {
                ...this.providerStates.get(providerId),
                ...status,
                lastRestored: Date.now()
              });
            });
          }
          eventBus.publish("provider-state-restored", {
            activeProvider: this.activeProvider,
            providerCount: Object.keys(savedAIProviders.availableProviders || {}).length,
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.warn("[GlobalStateManager] Failed to load state:", error);
    }
  }
  /**
   * Save state to storage
   */
  async saveState() {
    try {
      if (this.options.persistState && window.electronAPI?.storage?.set) {
        const stateObject = Object.fromEntries(this.state);
        const chatHistory = stateObject.chatHistory;
        const aiProviders = stateObject.aiProviders;
        delete stateObject.chatHistory;
        delete stateObject.aiProviders;
        await window.electronAPI.storage.set("globalState", stateObject);
        if (chatHistory) {
          await this.saveChatHistoryIncremental(chatHistory);
        }
        if (aiProviders) {
          await this.saveAIProviderState(aiProviders);
        }
        console.log(`[GlobalStateManager] Saved state with ${this.state.size} entries`);
        this.emit("state-saved", { size: this.state.size });
      }
    } catch (error) {
      console.error("[GlobalStateManager] Failed to save state:", error);
    }
  }
  /**
   * Save chat history with incremental updates for better performance
   */
  async saveChatHistoryIncremental(chatHistory) {
    try {
      await window.electronAPI.storage.set("chatHistory", chatHistory);
      const conversationCount = Object.keys(chatHistory.conversations || {}).length;
      console.log(`[GlobalStateManager] Saved chat history with ${conversationCount} conversations`);
      eventBus.publish("chat-history-persisted", {
        conversationCount,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("[GlobalStateManager] Failed to save chat history:", error);
      throw error;
    }
  }
  /**
   * Save AI provider state with enhanced persistence
   */
  async saveAIProviderState(aiProviders) {
    try {
      const enhancedProviderState = {
        ...aiProviders,
        // Include retry attempts for proper state restoration
        retryAttempts: Object.fromEntries(this.providerRetryAttempts),
        // Add persistence metadata
        lastSaved: Date.now(),
        sessionId: this.generateEventId(),
        // Include current error state
        lastError: this.lastProviderError,
        // Include provider health status for restoration
        healthStatus: Object.fromEntries(
          Array.from(this.providerStates.entries()).map(([id, state]) => [
            id,
            {
              status: state.status,
              lastHealthCheck: state.lastHealthCheck,
              consecutiveFailures: state.consecutiveFailures,
              healthCheckCount: state.healthCheckCount
            }
          ])
        ),
        // Include workspace-specific provider preferences
        workspacePreferences: this.getWorkspaceProviderPreferences()
      };
      await window.electronAPI.storage.set("aiProviders", enhancedProviderState);
      const providerCount = Object.keys(aiProviders.availableProviders || {}).length;
      console.log(`[GlobalStateManager] Saved AI provider state with ${providerCount} providers`);
      eventBus.publish("provider-state-persisted", {
        providerCount,
        activeProvider: aiProviders.activeProvider,
        switchHistoryLength: aiProviders.switchHistory?.length || 0,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("[GlobalStateManager] Failed to save AI provider state:", error);
      throw error;
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
    console.log("[GlobalStateManager] Auto-save started");
  }
  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
      console.log("[GlobalStateManager] Auto-save stopped");
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
   * Initialize chat history state and structures
   */
  async initializeChatHistory() {
    try {
      const chatHistory = this.getState("chatHistory", {
        activeConversationId: null,
        cachedConversations: {},
        searchCache: {},
        userPreferences: {
          retentionDays: 30,
          maxConversations: 1e3,
          enableSearch: true,
          autoSave: true,
          cacheSize: 50
        },
        metadata: {
          totalConversations: 0,
          lastSync: Date.now(),
          lastCleanup: Date.now(),
          isOnline: true
        },
        uiState: {
          selectedConversation: null,
          searchQuery: "",
          filterState: {
            type: "all",
            dateRange: null,
            tags: []
          },
          sortBy: "updatedAt",
          sortOrder: "desc"
        }
      });
      this.setState("chatHistory", chatHistory);
      console.log("[GlobalStateManager] Chat history state initialized for coordination");
      eventBus.publish("chat-history-state-initialized", {
        preferences: chatHistory.userPreferences
      });
    } catch (error) {
      console.error("[GlobalStateManager] Failed to initialize chat history state:", error);
      throw error;
    }
  }
  /**
   * Set active conversation (coordinated with ChatHistoryManager)
   */
  setActiveConversation(conversationId) {
    const chatHistory = this.getState("chatHistory");
    const previousId = chatHistory.activeConversationId;
    chatHistory.activeConversationId = conversationId;
    chatHistory.uiState.selectedConversation = conversationId;
    this.setState("chatHistory", chatHistory);
    console.log(`[GlobalStateManager] Active conversation state updated: ${conversationId}`);
    eventBus.publish("state-active-conversation-changed", {
      conversationId,
      previousId
    });
    if (conversationId) {
      this.syncConversationProviderState(conversationId);
    }
    return conversationId;
  }
  /**
   * Update cached conversation data from ChatHistoryManager
   */
  updateCachedConversation(conversationId, conversationData) {
    const chatHistory = this.getState("chatHistory");
    chatHistory.cachedConversations[conversationId] = {
      id: conversationData.id,
      title: conversationData.title,
      messageCount: conversationData.messages?.length || conversationData.metadata?.messageCount || 0,
      createdAt: conversationData.createdAt,
      updatedAt: conversationData.updatedAt,
      tags: conversationData.tags || [],
      lastCached: Date.now()
    };
    chatHistory.metadata.totalConversations = Object.keys(chatHistory.cachedConversations).length;
    chatHistory.metadata.lastSync = Date.now();
    this.setState("chatHistory", chatHistory);
    console.log(`[GlobalStateManager] Updated cached conversation: ${conversationId}`);
    eventBus.publish("state-conversation-cached", { conversationId });
  }
  /**
   * Get cached conversation by ID
   */
  getCachedConversation(conversationId) {
    const chatHistory = this.getState("chatHistory");
    return chatHistory.cachedConversations[conversationId] || null;
  }
  /**
   * Remove conversation from cache
   */
  removeCachedConversation(conversationId) {
    const chatHistory = this.getState("chatHistory");
    if (chatHistory.cachedConversations[conversationId]) {
      delete chatHistory.cachedConversations[conversationId];
      chatHistory.metadata.totalConversations = Object.keys(chatHistory.cachedConversations).length;
      if (chatHistory.activeConversationId === conversationId) {
        chatHistory.activeConversationId = null;
        chatHistory.uiState.selectedConversation = null;
      }
      this.setState("chatHistory", chatHistory);
      console.log(`[GlobalStateManager] Removed cached conversation: ${conversationId}`);
      eventBus.publish("state-conversation-removed", { conversationId });
    }
  }
  /**
   * Get cached conversations with filtering and sorting
   */
  getCachedConversations(options = {}) {
    const { limit = 50, offset = 0, sortBy = "updatedAt", sortOrder = "desc" } = options;
    const chatHistory = this.getState("chatHistory");
    let conversations = Object.values(chatHistory.cachedConversations);
    conversations.sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;
      return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
    });
    return conversations.slice(offset, offset + limit);
  }
  /**
   * Update search state
   */
  updateSearchState(query, results = null) {
    const chatHistory = this.getState("chatHistory");
    chatHistory.uiState.searchQuery = query;
    if (results) {
      chatHistory.searchCache[query] = {
        results,
        timestamp: Date.now(),
        count: results.conversations?.length || 0
      };
    }
    this.setState("chatHistory", chatHistory);
    console.log(`[GlobalStateManager] Updated search state: "${query}"`);
    eventBus.publish("state-search-updated", { query, hasResults: !!results });
  }
  /**
   * Update filter state
   */
  updateFilterState(filterUpdates) {
    const chatHistory = this.getState("chatHistory");
    chatHistory.uiState.filterState = {
      ...chatHistory.uiState.filterState,
      ...filterUpdates
    };
    this.setState("chatHistory", chatHistory);
    console.log("[GlobalStateManager] Updated filter state");
    eventBus.publish("state-filter-updated", { filterState: chatHistory.uiState.filterState });
  }
  /**
   * Update sort preferences
   */
  updateSortState(sortBy, sortOrder = "desc") {
    const chatHistory = this.getState("chatHistory");
    chatHistory.uiState.sortBy = sortBy;
    chatHistory.uiState.sortOrder = sortOrder;
    this.setState("chatHistory", chatHistory);
    console.log(`[GlobalStateManager] Updated sort state: ${sortBy} ${sortOrder}`);
    eventBus.publish("state-sort-updated", { sortBy, sortOrder });
  }
  /**
   * Set active conversation
   */
  setActiveConversation(conversationId) {
    const chatHistory = this.getState("chatHistory");
    if (conversationId && !chatHistory.conversations[conversationId]) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    const previousId = chatHistory.activeConversationId;
    chatHistory.activeConversationId = conversationId;
    this.activeConversationId = conversationId;
    this.setState("chatHistory", chatHistory);
    console.log(`[GlobalStateManager] Active conversation changed: ${conversationId}`);
    eventBus.publish("active-conversation-changed", {
      conversationId,
      previousId
    });
  }
  /**
   * Delete conversation
   */
  async deleteConversation(conversationId) {
    const chatHistory = this.getState("chatHistory");
    const conversation = chatHistory.conversations[conversationId];
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    delete chatHistory.conversations[conversationId];
    chatHistory.metadata.totalConversations--;
    this.removeFromSearchIndex(conversationId);
    this.conversationMetadata.delete(conversationId);
    if (chatHistory.activeConversationId === conversationId) {
      chatHistory.activeConversationId = null;
      this.activeConversationId = null;
    }
    this.setState("chatHistory", chatHistory);
    console.log(`[GlobalStateManager] Deleted conversation: ${conversationId}`);
    eventBus.publish("conversation-deleted", { conversationId, conversation });
  }
  /**
   * Search conversations and messages
   */
  searchChatHistory(query, options = {}) {
    const { limit = 20, includeMessages = true } = options;
    const chatHistory = this.getState("chatHistory");
    if (!chatHistory.userPreferences.enableSearch) {
      return { conversations: [], messages: [] };
    }
    const searchTerms = query.toLowerCase().split(" ").filter((term) => term.length > 2);
    const results = {
      conversations: [],
      messages: []
    };
    for (const conversation of Object.values(chatHistory.conversations)) {
      let conversationScore = 0;
      const matchingMessages = [];
      if (conversation.title.toLowerCase().includes(query.toLowerCase())) {
        conversationScore += 10;
      }
      if (includeMessages) {
        for (const message of conversation.messages) {
          const content = message.content.toLowerCase();
          let messageScore = 0;
          for (const term of searchTerms) {
            if (content.includes(term)) {
              messageScore += 1;
            }
          }
          if (messageScore > 0) {
            matchingMessages.push({
              ...message,
              conversationId: conversation.id,
              conversationTitle: conversation.title,
              score: messageScore
            });
            conversationScore += messageScore;
          }
        }
      }
      if (conversationScore > 0) {
        results.conversations.push({
          ...conversation,
          score: conversationScore,
          matchingMessageCount: matchingMessages.length
        });
      }
      results.messages.push(...matchingMessages);
    }
    results.conversations.sort((a, b) => b.score - a.score);
    results.messages.sort((a, b) => b.score - a.score);
    results.conversations = results.conversations.slice(0, limit);
    results.messages = results.messages.slice(0, limit * 2);
    console.log(`[GlobalStateManager] Search completed: ${query}`, {
      conversationResults: results.conversations.length,
      messageResults: results.messages.length
    });
    eventBus.publish("chat-history-searched", {
      query,
      results: {
        conversationCount: results.conversations.length,
        messageCount: results.messages.length
      }
    });
    return results;
  }
  /**
   * Update search index for a message
   */
  updateSearchIndex(conversationId, message) {
    const chatHistory = this.getState("chatHistory");
    if (!chatHistory.searchIndex[conversationId]) {
      chatHistory.searchIndex[conversationId] = {
        title: this.getConversation(conversationId)?.title || "",
        messages: []
      };
    }
    chatHistory.searchIndex[conversationId].messages.push({
      id: message.id,
      content: message.content.substring(0, 200),
      // Store first 200 chars for search
      timestamp: message.timestamp
    });
    this.setState("chatHistory", chatHistory);
  }
  /**
   * Remove conversation from search index
   */
  removeFromSearchIndex(conversationId) {
    const chatHistory = this.getState("chatHistory");
    delete chatHistory.searchIndex[conversationId];
    this.setState("chatHistory", chatHistory);
  }
  /**
   * Rebuild search index from existing conversations
   */
  async rebuildSearchIndex() {
    const chatHistory = this.getState("chatHistory");
    chatHistory.searchIndex = {};
    for (const [conversationId, conversation] of Object.entries(chatHistory.conversations)) {
      chatHistory.searchIndex[conversationId] = {
        title: conversation.title,
        messages: conversation.messages.map((msg) => ({
          id: msg.id,
          content: msg.content.substring(0, 200),
          timestamp: msg.timestamp
        }))
      };
    }
    this.setState("chatHistory", chatHistory);
    console.log("[GlobalStateManager] Search index rebuilt");
  }
  /**
   * Load conversation metadata cache
   */
  async loadConversationMetadata() {
    const chatHistory = this.getState("chatHistory");
    this.conversationMetadata.clear();
    for (const [conversationId, conversation] of Object.entries(chatHistory.conversations)) {
      this.conversationMetadata.set(conversationId, {
        id: conversationId,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messageCount: conversation.messages.length
      });
    }
    console.log(`[GlobalStateManager] Loaded metadata for ${this.conversationMetadata.size} conversations`);
  }
  /**
   * Start history cleanup timer
   */
  startHistoryCleanup() {
    if (this.historyCleanupTimer) {
      clearInterval(this.historyCleanupTimer);
    }
    this.historyCleanupTimer = setInterval(() => {
      this.performHistoryCleanup();
    }, 6 * 60 * 60 * 1e3);
    console.log("[GlobalStateManager] History cleanup timer started");
  }
  /**
   * Perform history cleanup based on user preferences
   */
  async performHistoryCleanup() {
    const chatHistory = this.getState("chatHistory");
    const { retentionDays, maxConversations } = chatHistory.userPreferences;
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1e3;
    const conversations = Object.values(chatHistory.conversations);
    let cleanupCount = 0;
    for (const conversation of conversations) {
      if (conversation.updatedAt < cutoffTime) {
        await this.deleteConversation(conversation.id);
        cleanupCount++;
      }
    }
    if (conversations.length > maxConversations) {
      const sortedConversations = conversations.sort((a, b) => a.updatedAt - b.updatedAt).slice(0, conversations.length - maxConversations);
      for (const conversation of sortedConversations) {
        await this.deleteConversation(conversation.id);
        cleanupCount++;
      }
    }
    if (cleanupCount > 0) {
      console.log(`[GlobalStateManager] Cleaned up ${cleanupCount} old conversations`);
      eventBus.publish("chat-history-cleanup-completed", { cleanupCount });
    }
    chatHistory.metadata.lastCleanup = Date.now();
    this.setState("chatHistory", chatHistory);
  }
  /**
   * Generate unique conversation ID
   */
  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  /**
   * Generate unique message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  /**
   * Get chat history statistics
   */
  getChatHistoryStats() {
    const chatHistory = this.getState("chatHistory");
    const conversations = Object.values(chatHistory.conversations);
    const stats = {
      totalConversations: conversations.length,
      totalMessages: conversations.reduce((sum, conv) => sum + conv.messages.length, 0),
      activeConversationId: chatHistory.activeConversationId,
      oldestConversation: null,
      newestConversation: null,
      averageMessagesPerConversation: 0
    };
    if (conversations.length > 0) {
      const sorted = conversations.sort((a, b) => a.createdAt - b.createdAt);
      stats.oldestConversation = sorted[0].id;
      stats.newestConversation = sorted[sorted.length - 1].id;
      stats.averageMessagesPerConversation = Math.round(stats.totalMessages / stats.totalConversations);
    }
    return stats;
  }
  /**
   * Update chat history user preferences
   */
  updateChatHistoryPreferences(preferences) {
    const chatHistory = this.getState("chatHistory");
    chatHistory.userPreferences = {
      ...chatHistory.userPreferences,
      ...preferences
    };
    this.setState("chatHistory", chatHistory);
    console.log("[GlobalStateManager] Chat history preferences updated");
    eventBus.publish("chat-history-preferences-updated", { preferences });
  }
  /**
   * Update connection status with ChatHistoryManager
   */
  updateConnectionStatus(isOnline) {
    const chatHistory = this.getState("chatHistory");
    chatHistory.metadata.isOnline = isOnline;
    chatHistory.metadata.lastSync = Date.now();
    this.setState("chatHistory", chatHistory);
    console.log(`[GlobalStateManager] Connection status updated: ${isOnline ? "online" : "offline"}`);
    eventBus.publish("state-connection-changed", { isOnline });
  }
  /**
   * Get current chat history state for UI components
   */
  getChatHistoryState() {
    return this.getState("chatHistory");
  }
  /**
   * Get UI state for chat history components
   */
  getChatHistoryUIState() {
    const chatHistory = this.getState("chatHistory");
    return {
      activeConversationId: chatHistory.activeConversationId,
      selectedConversation: chatHistory.uiState.selectedConversation,
      searchQuery: chatHistory.uiState.searchQuery,
      filterState: chatHistory.uiState.filterState,
      sortBy: chatHistory.uiState.sortBy,
      sortOrder: chatHistory.uiState.sortOrder,
      totalConversations: chatHistory.metadata.totalConversations,
      isOnline: chatHistory.metadata.isOnline
    };
  }
  /**
   * Export chat history data
   */
  exportChatHistory(conversationIds = null) {
    const chatHistory = this.getState("chatHistory");
    if (conversationIds) {
      const exportData = {
        conversations: {},
        exportedAt: Date.now(),
        version: "1.0"
      };
      for (const conversationId of conversationIds) {
        if (chatHistory.conversations[conversationId]) {
          exportData.conversations[conversationId] = chatHistory.conversations[conversationId];
        }
      }
      return exportData;
    }
    return {
      ...chatHistory,
      exportedAt: Date.now(),
      version: "1.0"
    };
  }
  /**
   * Import chat history data
   */
  async importChatHistory(importData, options = { merge: true }) {
    const { merge } = options;
    const chatHistory = this.getState("chatHistory");
    if (!merge) {
      chatHistory.conversations = importData.conversations || {};
    } else {
      for (const [conversationId, conversation] of Object.entries(importData.conversations || {})) {
        chatHistory.conversations[conversationId] = conversation;
      }
    }
    await this.rebuildSearchIndex();
    await this.loadConversationMetadata();
    chatHistory.metadata.totalConversations = Object.keys(chatHistory.conversations).length;
    this.setState("chatHistory", chatHistory);
    console.log(`[GlobalStateManager] Imported chat history with ${Object.keys(importData.conversations || {}).length} conversations`);
    eventBus.publish("chat-history-imported", {
      conversationCount: Object.keys(importData.conversations || {}).length,
      merged: merge
    });
  }
  /**
   * AI Provider State Management Methods
   */
  /**
   * Initialize AI providers state
   */
  async initializeAIProviders() {
    try {
      const providerState = this.getState("aiProviders", {
        activeProvider: "claude",
        availableProviders: {
          claude: {
            name: "Claude (Anthropic)",
            status: "disconnected",
            model: "claude-3-sonnet-20240229",
            availableModels: ["claude-3-sonnet-20240229", "claude-3-haiku-20240307", "claude-3-opus-20240229"],
            config: {},
            lastUsed: null,
            costTracking: { totalCost: 0, totalTokens: 0, sessionCost: 0, sessionTokens: 0 },
            hasApiKey: false,
            lastError: null
          },
          openai: {
            name: "OpenAI",
            status: "disconnected",
            model: "gpt-4",
            availableModels: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
            config: {},
            lastUsed: null,
            costTracking: { totalCost: 0, totalTokens: 0, sessionCost: 0, sessionTokens: 0 },
            hasApiKey: false,
            lastError: null
          },
          gemini: {
            name: "Google Gemini",
            status: "disconnected",
            model: "gemini-pro",
            availableModels: ["gemini-pro", "gemini-pro-vision"],
            config: {},
            lastUsed: null,
            costTracking: { totalCost: 0, totalTokens: 0, sessionCost: 0, sessionTokens: 0 },
            hasApiKey: false,
            lastError: null
          }
        },
        switchHistory: [],
        globalCostTracking: {
          totalCost: 0,
          totalTokens: 0,
          sessionCost: 0,
          sessionTokens: 0,
          costByProvider: {}
        },
        preferences: {
          defaultProvider: "claude",
          enableCostTracking: true,
          autoSwitchOnError: false,
          maxCostPerSession: 1,
          // $1.00
          maxTokensPerSession: 1e5
        },
        lastSync: Date.now()
      });
      this.setState("aiProviders", providerState);
      this.activeProvider = providerState.activeProvider;
      console.log("[GlobalStateManager] AI providers state initialized");
      eventBus.publish("ai-providers-initialized", {
        activeProvider: providerState.activeProvider,
        availableProviders: Object.keys(providerState.availableProviders),
        enabledFeatures: {
          costTracking: providerState.preferences.enableCostTracking,
          autoSwitch: providerState.preferences.autoSwitchOnError,
          healthMonitoring: true
        }
      });
    } catch (error) {
      console.error("[GlobalStateManager] Failed to initialize AI providers state:", error);
      throw error;
    }
  }
  /**
   * Update provider status
   */
  updateProviderStatus(providerId, status, error = null) {
    const providerState = this.getState("aiProviders");
    if (!providerState.availableProviders[providerId]) {
      console.warn(`[GlobalStateManager] Unknown provider: ${providerId}`);
      return;
    }
    const provider = providerState.availableProviders[providerId];
    const previousStatus = provider.status;
    provider.status = status;
    provider.lastError = error;
    provider.lastStatusChange = Date.now();
    if (status === "connected") {
      provider.lastUsed = Date.now();
      provider.lastError = null;
    }
    this.setState("aiProviders", providerState);
    console.log(`[GlobalStateManager] Provider status updated: ${providerId} -> ${status}`);
    eventBus.publish("provider-status-changed", {
      providerId,
      status,
      previousStatus,
      error
    });
  }
  /**
   * Switch active provider with enhanced error handling and state synchronization
   */
  switchActiveProvider(newProviderId, reason = "manual", conversationId = null) {
    const providerState = this.getState("aiProviders");
    if (!providerState.availableProviders[newProviderId]) {
      const error = new Error(`Unknown provider: ${newProviderId}`);
      console.error("[GlobalStateManager] Provider switch failed:", error);
      eventBus.publish("provider-switch-failed", {
        providerId: newProviderId,
        reason: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
    const provider = providerState.availableProviders[newProviderId];
    if (provider.status !== "connected" && provider.status !== "ready") {
      const warning = `Provider ${newProviderId} is not ready (status: ${provider.status})`;
      console.warn("[GlobalStateManager]", warning);
      eventBus.publish("provider-switch-warning", {
        providerId: newProviderId,
        status: provider.status,
        message: warning,
        timestamp: Date.now()
      });
    }
    const previousProvider = providerState.activeProvider;
    const targetConversationId = conversationId || this.getState("chatHistory")?.activeConversationId;
    const switchRecord = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      from: previousProvider,
      to: newProviderId,
      reason,
      conversationId: targetConversationId,
      context: {
        fromModel: providerState.availableProviders[previousProvider]?.model,
        toModel: provider.model,
        switchInitiator: reason,
        sessionActive: !!targetConversationId
      }
    };
    providerState.switchHistory.push(switchRecord);
    providerState.activeProvider = newProviderId;
    provider.lastUsed = Date.now();
    provider.switchCount = (provider.switchCount || 0) + 1;
    if (targetConversationId) {
      this.updateConversationProvider(targetConversationId, newProviderId, {
        model: provider.model,
        switchReason: reason,
        switchId: switchRecord.id
      });
    }
    if (providerState.switchHistory.length > 100) {
      providerState.switchHistory = providerState.switchHistory.slice(-100);
    }
    this.setState("aiProviders", providerState);
    this.activeProvider = newProviderId;
    console.log(`[GlobalStateManager] Active provider switched: ${previousProvider} -> ${newProviderId} (reason: ${reason})`);
    eventBus.publish("active-provider-changed", {
      providerId: newProviderId,
      previousProvider,
      reason,
      conversationId: targetConversationId,
      switchRecord,
      providerInfo: {
        name: provider.name,
        model: provider.model,
        status: provider.status
      }
    });
    eventBus.publish("provider-activated", {
      providerId: newProviderId,
      provider: {
        name: provider.name,
        model: provider.model,
        status: provider.status
      },
      timestamp: Date.now()
    });
    if (previousProvider && previousProvider !== newProviderId) {
      eventBus.publish("provider-deactivated", {
        providerId: previousProvider,
        timestamp: Date.now()
      });
    }
    return switchRecord;
  }
  /**
   * Update provider model
   */
  updateProviderModel(providerId, model) {
    const providerState = this.getState("aiProviders");
    if (!providerState.availableProviders[providerId]) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    const provider = providerState.availableProviders[providerId];
    if (!provider.availableModels.includes(model)) {
      throw new Error(`Model ${model} not available for provider ${providerId}`);
    }
    const previousModel = provider.model;
    provider.model = model;
    provider.lastModelChange = Date.now();
    this.setState("aiProviders", providerState);
    console.log(`[GlobalStateManager] Provider model updated: ${providerId} -> ${model}`);
    eventBus.publish("provider-model-changed", {
      providerId,
      model,
      previousModel
    });
  }
  /**
   * Update provider configuration
   */
  updateProviderConfig(providerId, config) {
    const providerState = this.getState("aiProviders");
    if (!providerState.availableProviders[providerId]) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    const provider = providerState.availableProviders[providerId];
    provider.config = { ...provider.config, ...config };
    provider.lastConfigChange = Date.now();
    this.setState("aiProviders", providerState);
    console.log(`[GlobalStateManager] Provider configuration updated: ${providerId}`);
    eventBus.publish("provider-config-changed", {
      providerId,
      config: provider.config
    });
  }
  /**
   * Track provider usage and cost
   */
  trackProviderUsage(providerId, usage) {
    const { tokens = 0, cost = 0, messageId = null } = usage;
    const providerState = this.getState("aiProviders");
    if (!providerState.availableProviders[providerId]) {
      console.warn(`[GlobalStateManager] Unknown provider for usage tracking: ${providerId}`);
      return;
    }
    const provider = providerState.availableProviders[providerId];
    const globalTracking = providerState.globalCostTracking;
    provider.costTracking.totalTokens += tokens;
    provider.costTracking.totalCost += cost;
    provider.costTracking.sessionTokens += tokens;
    provider.costTracking.sessionCost += cost;
    globalTracking.totalTokens += tokens;
    globalTracking.totalCost += cost;
    globalTracking.sessionTokens += tokens;
    globalTracking.sessionCost += cost;
    if (!globalTracking.costByProvider[providerId]) {
      globalTracking.costByProvider[providerId] = { cost: 0, tokens: 0 };
    }
    globalTracking.costByProvider[providerId].cost += cost;
    globalTracking.costByProvider[providerId].tokens += tokens;
    this.setState("aiProviders", providerState);
    console.log(`[GlobalStateManager] Usage tracked for ${providerId}: ${tokens} tokens, $${cost.toFixed(4)}`);
    eventBus.publish("provider-usage-tracked", {
      providerId,
      tokens,
      cost,
      messageId,
      totalCost: provider.costTracking.totalCost,
      sessionCost: provider.costTracking.sessionCost
    });
    this.checkCostLimits(providerState);
  }
  /**
   * Reset session cost tracking
   */
  resetSessionCostTracking() {
    const providerState = this.getState("aiProviders");
    Object.values(providerState.availableProviders).forEach((provider) => {
      provider.costTracking.sessionCost = 0;
      provider.costTracking.sessionTokens = 0;
    });
    providerState.globalCostTracking.sessionCost = 0;
    providerState.globalCostTracking.sessionTokens = 0;
    this.setState("aiProviders", providerState);
    console.log("[GlobalStateManager] Session cost tracking reset");
    eventBus.publish("session-cost-reset");
  }
  /**
   * Check cost limits and emit warnings
   */
  checkCostLimits(providerState) {
    const { maxCostPerSession, maxTokensPerSession } = providerState.preferences;
    const { sessionCost, sessionTokens } = providerState.globalCostTracking;
    if (sessionCost >= maxCostPerSession * 0.8) {
      eventBus.publish("cost-limit-warning", {
        type: "cost",
        current: sessionCost,
        limit: maxCostPerSession,
        percentage: sessionCost / maxCostPerSession * 100
      });
    }
    if (sessionTokens >= maxTokensPerSession * 0.8) {
      eventBus.publish("cost-limit-warning", {
        type: "tokens",
        current: sessionTokens,
        limit: maxTokensPerSession,
        percentage: sessionTokens / maxTokensPerSession * 100
      });
    }
  }
  /**
   * Update provider API key status
   */
  updateProviderKeyStatus(providerId, hasKey) {
    const providerState = this.getState("aiProviders");
    if (!providerState.availableProviders[providerId]) {
      console.warn(`[GlobalStateManager] Unknown provider: ${providerId}`);
      return;
    }
    const provider = providerState.availableProviders[providerId];
    provider.hasApiKey = hasKey;
    provider.lastKeyCheck = Date.now();
    if (!hasKey && provider.status === "connected") {
      provider.status = "disconnected";
      provider.lastError = "API key not available";
    }
    this.setState("aiProviders", providerState);
    console.log(`[GlobalStateManager] Provider key status updated: ${providerId} -> ${hasKey ? "available" : "missing"}`);
    eventBus.publish("provider-key-status-changed", {
      providerId,
      hasKey,
      status: provider.status
    });
  }
  /**
   * Get current provider state
   */
  getProviderState(providerId = null) {
    const providerState = this.getState("aiProviders");
    if (providerId) {
      return providerState.availableProviders[providerId] || null;
    }
    return providerState;
  }
  /**
   * Get active provider information
   */
  getActiveProvider() {
    const providerState = this.getState("aiProviders");
    const activeProviderId = providerState.activeProvider;
    return {
      id: activeProviderId,
      ...providerState.availableProviders[activeProviderId]
    };
  }
  /**
   * Get provider statistics
   */
  getProviderStats() {
    const providerState = this.getState("aiProviders");
    const stats = {
      activeProvider: providerState.activeProvider,
      totalProviders: Object.keys(providerState.availableProviders).length,
      connectedProviders: 0,
      totalSwitches: providerState.switchHistory.length,
      globalCost: providerState.globalCostTracking,
      providerBreakdown: {}
    };
    Object.entries(providerState.availableProviders).forEach(([id, provider]) => {
      if (provider.status === "connected") {
        stats.connectedProviders++;
      }
      stats.providerBreakdown[id] = {
        name: provider.name,
        status: provider.status,
        model: provider.model,
        hasApiKey: provider.hasApiKey,
        lastUsed: provider.lastUsed,
        costTracking: provider.costTracking,
        usagePercentage: providerState.globalCostTracking.totalCost > 0 ? provider.costTracking.totalCost / providerState.globalCostTracking.totalCost * 100 : 0
      };
    });
    return stats;
  }
  /**
   * Update provider preferences
   */
  updateProviderPreferences(preferences) {
    const providerState = this.getState("aiProviders");
    providerState.preferences = {
      ...providerState.preferences,
      ...preferences
    };
    this.setState("aiProviders", providerState);
    console.log("[GlobalStateManager] Provider preferences updated");
    eventBus.publish("provider-preferences-updated", { preferences });
  }
  /**
   * Start enhanced provider status monitoring with health checks
   */
  startProviderMonitoring() {
    if (this.providerMonitoringTimer) {
      clearInterval(this.providerMonitoringTimer);
    }
    this.providerMonitoringTimer = setInterval(async () => {
      try {
        await this.checkProviderHealth();
      } catch (error) {
        console.error("[GlobalStateManager] Provider monitoring error:", error);
        eventBus.publish("provider-monitoring-error", {
          error: error.message,
          timestamp: Date.now()
        });
      }
    }, 3e4);
    if (this.providerHealthTimer) {
      clearInterval(this.providerHealthTimer);
    }
    this.providerHealthTimer = setInterval(() => {
      this.performProviderHealthAnalysis();
    }, 6e4);
    console.log("[GlobalStateManager] Enhanced provider monitoring started");
    eventBus.publish("provider-monitoring-started", { timestamp: Date.now() });
  }
  /**
   * Enhanced provider health check with detailed status tracking
   */
  async checkProviderHealth() {
    const providerState = this.getState("aiProviders");
    const healthResults = [];
    for (const [providerId, provider] of Object.entries(providerState.availableProviders)) {
      const healthCheck = {
        providerId,
        timestamp: Date.now(),
        previousStatus: provider.status,
        currentStatus: provider.status,
        hasApiKey: provider.hasApiKey,
        error: null,
        responseTime: null
      };
      if (provider.hasApiKey) {
        try {
          const startTime = Date.now();
          const isHealthy = await this.performProviderHealthCheck(providerId, provider);
          healthCheck.responseTime = Date.now() - startTime;
          healthCheck.currentStatus = isHealthy ? "connected" : "degraded";
          provider.lastHealthCheck = Date.now();
          provider.healthCheckCount = (provider.healthCheckCount || 0) + 1;
          if (isHealthy) {
            provider.consecutiveFailures = 0;
            this.providerRetryAttempts.delete(providerId);
          } else {
            provider.consecutiveFailures = (provider.consecutiveFailures || 0) + 1;
            healthCheck.currentStatus = provider.consecutiveFailures > 3 ? "error" : "degraded";
          }
        } catch (error) {
          console.warn(`[GlobalStateManager] Provider health check failed for ${providerId}:`, error);
          healthCheck.error = error.message;
          healthCheck.currentStatus = "error";
          provider.consecutiveFailures = (provider.consecutiveFailures || 0) + 1;
          provider.lastError = error.message;
          this.trackProviderError(providerId, error);
        }
      } else {
        healthCheck.currentStatus = "disconnected";
        healthCheck.error = "API key not available";
      }
      if (healthCheck.previousStatus !== healthCheck.currentStatus) {
        this.updateProviderStatus(providerId, healthCheck.currentStatus, healthCheck.error);
      }
      healthResults.push(healthCheck);
    }
    this.setState("aiProviders", providerState);
    eventBus.publish("provider-health-check-completed", {
      results: healthResults,
      timestamp: Date.now(),
      healthyProviders: healthResults.filter((r) => r.currentStatus === "connected").length,
      totalProviders: healthResults.length
    });
    return healthResults;
  }
  /**
   * Export provider configuration (without sensitive data)
   */
  exportProviderConfig() {
    const providerState = this.getState("aiProviders");
    const exportData = {
      version: "1.0",
      exportedAt: Date.now(),
      activeProvider: providerState.activeProvider,
      preferences: providerState.preferences,
      switchHistory: providerState.switchHistory.slice(-50),
      // Last 50 switches
      globalCostTracking: providerState.globalCostTracking,
      providers: {}
    };
    Object.entries(providerState.availableProviders).forEach(([id, provider]) => {
      exportData.providers[id] = {
        name: provider.name,
        model: provider.model,
        availableModels: provider.availableModels,
        hasApiKey: provider.hasApiKey,
        status: provider.status,
        costTracking: provider.costTracking,
        lastUsed: provider.lastUsed,
        switchCount: provider.switchCount || 0,
        healthCheckCount: provider.healthCheckCount || 0,
        consecutiveFailures: provider.consecutiveFailures || 0
      };
    });
    return exportData;
  }
  /**
   * Perform provider-specific health check
   */
  async performProviderHealthCheck(providerId, provider) {
    try {
      const retryAttempts = this.providerRetryAttempts.get(providerId) || 0;
      if (retryAttempts > 5) {
        return false;
      }
      if (provider.lastError && Date.now() - provider.lastStatusChange < 6e4) {
        return false;
      }
      return provider.hasApiKey && provider.status !== "error";
    } catch (error) {
      console.error(`[GlobalStateManager] Health check implementation error for ${providerId}:`, error);
      return false;
    }
  }
  /**
   * Track provider errors for analysis
   */
  trackProviderError(providerId, error) {
    const retryCount = this.providerRetryAttempts.get(providerId) || 0;
    this.providerRetryAttempts.set(providerId, retryCount + 1);
    this.lastProviderError = {
      providerId,
      error: error.message,
      timestamp: Date.now(),
      retryCount: retryCount + 1
    };
    eventBus.publish("provider-error-tracked", {
      providerId,
      error: error.message,
      retryCount: retryCount + 1,
      timestamp: Date.now()
    });
    const providerState = this.getState("aiProviders");
    if (providerState.preferences.autoSwitchOnError && retryCount >= 3) {
      this.attemptProviderAutoSwitch(providerId, "error-recovery");
    }
  }
  /**
   * Attempt automatic provider switching on error
   */
  attemptProviderAutoSwitch(failedProviderId, reason) {
    try {
      const providerState = this.getState("aiProviders");
      const alternatives = Object.entries(providerState.availableProviders).filter(
        ([id, provider]) => id !== failedProviderId && provider.hasApiKey && provider.status === "connected" && (provider.consecutiveFailures || 0) < 2
      ).sort((a, b) => b[1].lastUsed - a[1].lastUsed);
      if (alternatives.length > 0) {
        const [alternativeId] = alternatives[0];
        console.log(`[GlobalStateManager] Auto-switching from ${failedProviderId} to ${alternativeId} due to ${reason}`);
        this.switchActiveProvider(alternativeId, `auto-switch-${reason}`);
        eventBus.publish("provider-auto-switched", {
          from: failedProviderId,
          to: alternativeId,
          reason,
          timestamp: Date.now()
        });
        return alternativeId;
      } else {
        console.warn("[GlobalStateManager] No healthy alternative providers available for auto-switch");
        eventBus.publish("provider-auto-switch-failed", {
          failedProvider: failedProviderId,
          reason: "no-alternatives",
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error("[GlobalStateManager] Auto-switch attempt failed:", error);
      eventBus.publish("provider-auto-switch-error", {
        failedProvider: failedProviderId,
        error: error.message,
        timestamp: Date.now()
      });
    }
    return null;
  }
  /**
   * Perform comprehensive provider health analysis
   */
  performProviderHealthAnalysis() {
    const providerState = this.getState("aiProviders");
    const analysis = {
      timestamp: Date.now(),
      totalProviders: Object.keys(providerState.availableProviders).length,
      healthyProviders: 0,
      degradedProviders: 0,
      errorProviders: 0,
      recommendations: []
    };
    Object.entries(providerState.availableProviders).forEach(([id, provider]) => {
      switch (provider.status) {
        case "connected":
          analysis.healthyProviders++;
          break;
        case "degraded":
          analysis.degradedProviders++;
          analysis.recommendations.push(`Provider ${id} is experiencing issues`);
          break;
        case "error":
        case "disconnected":
          analysis.errorProviders++;
          analysis.recommendations.push(`Provider ${id} needs attention: ${provider.lastError || "disconnected"}`);
          break;
      }
      if (provider.lastUsed && Date.now() - provider.lastUsed > 7 * 24 * 60 * 60 * 1e3) {
        analysis.recommendations.push(`Provider ${id} hasn't been used in over a week`);
      }
    });
    const costAnalysis = this.analyzeProviderCosts();
    analysis.costRecommendations = costAnalysis.recommendations;
    eventBus.publish("provider-health-analysis", analysis);
    return analysis;
  }
  /**
   * Analyze provider costs and generate recommendations
   */
  analyzeProviderCosts() {
    const providerState = this.getState("aiProviders");
    const analysis = {
      totalCost: providerState.globalCostTracking.totalCost,
      sessionCost: providerState.globalCostTracking.sessionCost,
      recommendations: []
    };
    const { maxCostPerSession } = providerState.preferences;
    if (analysis.sessionCost > maxCostPerSession * 0.9) {
      analysis.recommendations.push(`Session cost approaching limit ($${analysis.sessionCost.toFixed(4)} / $${maxCostPerSession})`);
    }
    const providerCosts = Object.entries(providerState.globalCostTracking.costByProvider || {}).sort((a, b) => b[1].cost - a[1].cost);
    if (providerCosts.length > 1) {
      const [mostExpensive, leastExpensive] = [providerCosts[0], providerCosts[providerCosts.length - 1]];
      const costRatio = mostExpensive[1].cost / leastExpensive[1].cost;
      if (costRatio > 3) {
        analysis.recommendations.push(`Provider ${mostExpensive[0]} costs ${costRatio.toFixed(1)}x more than ${leastExpensive[0]}`);
      }
    }
    return analysis;
  }
  /**
   * Update conversation-specific provider state
   */
  updateConversationProvider(conversationId, providerId, providerInfo = {}) {
    const chatHistory = this.getState("chatHistory");
    if (!chatHistory.cachedConversations[conversationId]) {
      console.warn(`[GlobalStateManager] Conversation ${conversationId} not found in cache`);
      return;
    }
    const conversation = chatHistory.cachedConversations[conversationId];
    if (!conversation.providers) {
      conversation.providers = {
        current: null,
        history: [],
        models: {}
      };
    }
    const previousProvider = conversation.providers.current;
    conversation.providers.current = providerId;
    conversation.providers.models[providerId] = providerInfo.model || null;
    conversation.providers.history.push({
      timestamp: Date.now(),
      providerId,
      model: providerInfo.model,
      reason: providerInfo.switchReason || "unknown",
      switchId: providerInfo.switchId || null
    });
    if (conversation.providers.history.length > 50) {
      conversation.providers.history = conversation.providers.history.slice(-50);
    }
    conversation.lastCached = Date.now();
    this.setState("chatHistory", chatHistory);
    console.log(`[GlobalStateManager] Updated provider for conversation ${conversationId}: ${previousProvider} -> ${providerId}`);
    eventBus.publish("conversation-provider-updated", {
      conversationId,
      providerId,
      previousProvider,
      model: providerInfo.model,
      timestamp: Date.now()
    });
  }
  /**
   * Sync conversation provider state with global active provider
   */
  syncConversationProviderState(conversationId) {
    const providerState = this.getState("aiProviders");
    const activeProvider = providerState.activeProvider;
    if (activeProvider) {
      const providerInfo = providerState.availableProviders[activeProvider];
      this.updateConversationProvider(conversationId, activeProvider, {
        model: providerInfo?.model,
        switchReason: "conversation-sync"
      });
    }
  }
  /**
   * Get conversation provider information
   */
  getConversationProvider(conversationId) {
    const chatHistory = this.getState("chatHistory");
    const conversation = chatHistory.cachedConversations[conversationId];
    if (!conversation || !conversation.providers) {
      return null;
    }
    const providerState = this.getState("aiProviders");
    const currentProviderId = conversation.providers.current;
    if (!currentProviderId) {
      return null;
    }
    return {
      id: currentProviderId,
      name: providerState.availableProviders[currentProviderId]?.name,
      model: conversation.providers.models[currentProviderId],
      status: providerState.availableProviders[currentProviderId]?.status,
      switchHistory: conversation.providers.history,
      lastSwitch: conversation.providers.history[conversation.providers.history.length - 1] || null
    };
  }
  /**
   * Get workspace-specific provider preferences
   */
  getWorkspaceProviderPreferences() {
    const workspaceState = this.getState("workspace", {});
    const providerPreferences = {};
    Object.entries(workspaceState).forEach(([workspaceId, config]) => {
      if (config.preferredProvider || config.providerSettings) {
        providerPreferences[workspaceId] = {
          preferredProvider: config.preferredProvider,
          providerSettings: config.providerSettings,
          costLimits: config.costLimits
        };
      }
    });
    return providerPreferences;
  }
  /**
   * Set workspace-specific provider preference
   */
  setWorkspaceProviderPreference(workspaceId, preferences) {
    const workspaceState = this.getState("workspace", {});
    if (!workspaceState[workspaceId]) {
      workspaceState[workspaceId] = {};
    }
    workspaceState[workspaceId] = {
      ...workspaceState[workspaceId],
      ...preferences,
      lastUpdated: Date.now()
    };
    this.setState("workspace", workspaceState);
    eventBus.publish("workspace-provider-preference-updated", {
      workspaceId,
      preferences,
      timestamp: Date.now()
    });
  }
  /**
   * Get provider recommendations based on usage patterns
   */
  getProviderRecommendations() {
    const providerState = this.getState("aiProviders");
    if (!providerState) return [];
    const recommendations = [];
    const costEfficiency = {};
    Object.entries(providerState.availableProviders).forEach(([id, provider]) => {
      const totalCost = provider.costTracking.totalCost;
      const totalTokens = provider.costTracking.totalTokens;
      if (totalTokens > 0) {
        costEfficiency[id] = {
          costPerToken: totalCost / totalTokens,
          reliability: 1 - (provider.consecutiveFailures || 0) / 10,
          availability: provider.status === "connected" ? 1 : 0
        };
      }
    });
    const currentProvider = providerState.activeProvider;
    const currentCost = providerState.globalCostTracking.sessionCost;
    const maxCost = providerState.preferences.maxCostPerSession;
    if (currentCost > maxCost * 0.8) {
      const cheaperProviders = Object.entries(costEfficiency).filter(
        ([id, metrics]) => id !== currentProvider && metrics.costPerToken < costEfficiency[currentProvider]?.costPerToken
      ).sort((a, b) => a[1].costPerToken - b[1].costPerToken);
      if (cheaperProviders.length > 0) {
        recommendations.push({
          type: "cost-optimization",
          message: `Consider switching to ${cheaperProviders[0][0]} for better cost efficiency`,
          provider: cheaperProviders[0][0],
          savings: ((costEfficiency[currentProvider]?.costPerToken || 0) - cheaperProviders[0][1].costPerToken) * 1e3,
          priority: "high"
        });
      }
    }
    return recommendations;
  }
  /**
   * Export comprehensive provider analytics
   */
  exportProviderAnalytics() {
    const providerState = this.getState("aiProviders");
    if (!providerState) return null;
    const analytics = {
      exportedAt: Date.now(),
      version: "1.0",
      summary: {
        totalProviders: Object.keys(providerState.availableProviders).length,
        activeProvider: providerState.activeProvider,
        totalCost: providerState.globalCostTracking.totalCost,
        totalTokens: providerState.globalCostTracking.totalTokens,
        sessionCount: providerState.switchHistory.length
      },
      providerMetrics: {},
      costAnalysis: {
        byProvider: providerState.globalCostTracking.costByProvider,
        trends: this.calculateCostTrends(),
        efficiency: this.calculateProviderEfficiency()
      },
      usagePatterns: {
        switchHistory: providerState.switchHistory.slice(-100),
        mostUsedProvider: this.getMostUsedProvider(),
        preferredTimeOfDay: this.getUsageTimePatterns()
      },
      recommendations: this.getProviderRecommendations()
    };
    Object.entries(providerState.availableProviders).forEach(([id, provider]) => {
      analytics.providerMetrics[id] = {
        status: provider.status,
        model: provider.model,
        totalCost: provider.costTracking.totalCost,
        totalTokens: provider.costTracking.totalTokens,
        averageCostPerMessage: this.calculateAverageMessageCost(id),
        reliability: this.calculateProviderReliability(id),
        usage: {
          lastUsed: provider.lastUsed,
          switchCount: provider.switchCount || 0,
          totalSessions: this.getProviderSessionCount(id)
        }
      };
    });
    return analytics;
  }
  /**
   * Calculate cost trends over time
   */
  calculateCostTrends() {
    return {
      daily: [],
      weekly: [],
      monthly: []
    };
  }
  /**
   * Calculate provider efficiency metrics
   */
  calculateProviderEfficiency() {
    const providerState = this.getState("aiProviders");
    const efficiency = {};
    Object.entries(providerState.availableProviders).forEach(([id, provider]) => {
      const cost = provider.costTracking.totalCost;
      const tokens = provider.costTracking.totalTokens;
      efficiency[id] = {
        costPerToken: tokens > 0 ? cost / tokens : 0,
        tokensPerDollar: cost > 0 ? tokens / cost : 0,
        utilizationRate: this.calculateUtilizationRate(id)
      };
    });
    return efficiency;
  }
  /**
   * Get most used provider
   */
  getMostUsedProvider() {
    const providerState = this.getState("aiProviders");
    let mostUsed = null;
    let maxCost = 0;
    Object.entries(providerState.availableProviders).forEach(([id, provider]) => {
      if (provider.costTracking.totalCost > maxCost) {
        maxCost = provider.costTracking.totalCost;
        mostUsed = id;
      }
    });
    return mostUsed;
  }
  /**
   * Get usage time patterns
   */
  getUsageTimePatterns() {
    const providerState = this.getState("aiProviders");
    const patterns = {
      hourly: new Array(24).fill(0),
      daily: new Array(7).fill(0)
    };
    providerState.switchHistory.forEach((switchRecord) => {
      const date = new Date(switchRecord.timestamp);
      patterns.hourly[date.getHours()]++;
      patterns.daily[date.getDay()]++;
    });
    return patterns;
  }
  /**
   * Calculate average message cost for provider
   */
  calculateAverageMessageCost(providerId) {
    const chatHistory = this.getState("chatHistory");
    if (!chatHistory || !chatHistory.conversations) return 0;
    let totalCost = 0;
    let messageCount = 0;
    Object.values(chatHistory.conversations).forEach((conversation) => {
      conversation.messages?.forEach((message) => {
        if (message.metadata?.provider === providerId && message.metadata?.cost) {
          totalCost += message.metadata.cost;
          messageCount++;
        }
      });
    });
    return messageCount > 0 ? totalCost / messageCount : 0;
  }
  /**
   * Calculate provider reliability score
   */
  calculateProviderReliability(providerId) {
    const providerState = this.getState("aiProviders");
    const provider = providerState.availableProviders[providerId];
    if (!provider) return 0;
    const totalChecks = provider.healthCheckCount || 1;
    const failures = provider.consecutiveFailures || 0;
    const currentStatus = provider.status === "connected" ? 1 : 0;
    return Math.max(0, (totalChecks - failures) / totalChecks * currentStatus);
  }
  /**
   * Calculate utilization rate
   */
  calculateUtilizationRate(providerId) {
    const providerState = this.getState("aiProviders");
    const provider = providerState.availableProviders[providerId];
    if (!provider) return 0;
    const totalSwitches = providerState.switchHistory.length;
    const providerSwitches = providerState.switchHistory.filter((s) => s.to === providerId).length;
    return totalSwitches > 0 ? providerSwitches / totalSwitches : 0;
  }
  /**
   * Get provider session count
   */
  getProviderSessionCount(providerId) {
    const chatHistory = this.getState("chatHistory");
    if (!chatHistory || !chatHistory.conversations) return 0;
    let sessionCount = 0;
    Object.values(chatHistory.conversations).forEach((conversation) => {
      if (conversation.providers?.current === providerId) {
        sessionCount++;
      }
    });
    return sessionCount;
  }
  /**
   * Destroy global state manager
   */
  async destroy() {
    this.stopAutoSave();
    if (this.historyCleanupTimer) {
      clearInterval(this.historyCleanupTimer);
      this.historyCleanupTimer = null;
    }
    if (this.providerMonitoringTimer) {
      clearInterval(this.providerMonitoringTimer);
      this.providerMonitoringTimer = null;
    }
    if (this.providerHealthTimer) {
      clearInterval(this.providerHealthTimer);
      this.providerHealthTimer = null;
    }
    if (this.options.persistState) {
      await this.saveState();
    }
    this.state.clear();
    this.chatHistoryIndex.clear();
    this.conversationMetadata.clear();
    this.providerStates.clear();
    this.providerCostTracking.clear();
    this.providerRetryAttempts.clear();
    this.lastProviderError = null;
    this.isInitialized = false;
    this.removeAllListeners();
    eventBus.publish("global-state-manager-shutdown", {
      timestamp: Date.now(),
      finalStats: {
        totalStateKeys: this.state.size,
        activeProviders: this.providerStates.size,
        lastSaveTime: Date.now()
      }
    });
    console.log("[GlobalStateManager] Destroyed");
  }
}
class WPApiClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      timeout: options.timeout || 3e4,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1e3,
      ...options
    };
    this.siteUrl = null;
    this.credentials = null;
    this.isInitialized = false;
    this.rateLimitDelay = 1e3;
    this.lastRequestTime = 0;
  }
  /**
   * Initialize WordPress API client
   */
  async initialize(siteUrl, credentials) {
    try {
      console.log("[WPApiClient] 🔍 Initializing...");
      console.log("[WPApiClient] 📝 Received siteUrl:", siteUrl, "type:", typeof siteUrl);
      console.log("[WPApiClient] 📝 Received credentials:", credentials ? "provided" : "missing");
      if (!siteUrl) {
        throw new Error("Site URL is required");
      }
      if (typeof siteUrl !== "string") {
        throw new Error(`Site URL must be a string, received: ${typeof siteUrl} - ${siteUrl}`);
      }
      console.log("[WPApiClient] 🔧 Processing siteUrl.replace()...");
      this.siteUrl = siteUrl.replace(/\/$/, "");
      console.log("[WPApiClient] ✅ Processed siteUrl:", this.siteUrl);
      this.credentials = credentials;
      await this.testConnection();
      this.isInitialized = true;
      console.log("[WPApiClient] Successfully initialized");
      this.emit("initialized");
      return true;
    } catch (error) {
      console.error("[WPApiClient] Initialization failed:", error);
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Test WordPress API connection
   */
  async testConnection() {
    try {
      const response = await this.makeRequest("GET", "/wp-json/wp/v2/users/me");
      if (response.id) {
        console.log(`[WPApiClient] Connected as user: ${response.name} (ID: ${response.id})`);
        return { success: true, user: response };
      } else {
        throw new Error("Invalid API response");
      }
    } catch (error) {
      console.error("[WPApiClient] Connection test failed:", error);
      throw new Error(`WordPress connection failed: ${error.message}`);
    }
  }
  /**
   * Create a new post
   */
  async createPost(postData) {
    if (!this.isInitialized) {
      throw new Error("WPApiClient not initialized");
    }
    try {
      console.log("[WPApiClient] Creating new post:", postData.title);
      const payload = {
        title: postData.title,
        content: postData.content,
        status: postData.status || "draft",
        excerpt: postData.excerpt || "",
        categories: postData.categories || [],
        tags: postData.tags || [],
        featured_media: postData.featuredMedia || 0,
        meta: postData.meta || {},
        ...postData.customFields
      };
      const response = await this.makeRequest("POST", "/wp-json/wp/v2/posts", payload);
      console.log(`[WPApiClient] Post created successfully: ${response.id}`);
      this.emit("post-created", { id: response.id, post: response });
      return response;
    } catch (error) {
      console.error("[WPApiClient] Failed to create post:", error);
      this.emit("post-creation-failed", { error: error.message, postData });
      throw error;
    }
  }
  /**
   * Update existing post
   */
  async updatePost(postId, postData) {
    if (!this.isInitialized) {
      throw new Error("WPApiClient not initialized");
    }
    try {
      console.log(`[WPApiClient] Updating post: ${postId}`);
      const payload = {
        title: postData.title,
        content: postData.content,
        status: postData.status,
        excerpt: postData.excerpt,
        categories: postData.categories,
        tags: postData.tags,
        featured_media: postData.featuredMedia,
        meta: postData.meta,
        ...postData.customFields
      };
      Object.keys(payload).forEach((key) => {
        if (payload[key] === void 0) {
          delete payload[key];
        }
      });
      const response = await this.makeRequest("POST", `/wp-json/wp/v2/posts/${postId}`, payload);
      console.log(`[WPApiClient] Post updated successfully: ${postId}`);
      this.emit("post-updated", { id: postId, post: response });
      return response;
    } catch (error) {
      console.error(`[WPApiClient] Failed to update post ${postId}:`, error);
      this.emit("post-update-failed", { id: postId, error: error.message });
      throw error;
    }
  }
  /**
   * Get post by ID
   */
  async getPost(postId) {
    if (!this.isInitialized) {
      throw new Error("WPApiClient not initialized");
    }
    try {
      const response = await this.makeRequest("GET", `/wp-json/wp/v2/posts/${postId}`);
      return response;
    } catch (error) {
      console.error(`[WPApiClient] Failed to get post ${postId}:`, error);
      throw error;
    }
  }
  /**
   * Get posts with filters
   */
  async getPosts(filters = {}) {
    if (!this.isInitialized) {
      throw new Error("WPApiClient not initialized");
    }
    try {
      const params = new URLSearchParams();
      if (filters.per_page) params.append("per_page", filters.per_page);
      if (filters.page) params.append("page", filters.page);
      if (filters.status) params.append("status", filters.status);
      if (filters.categories) params.append("categories", filters.categories);
      if (filters.tags) params.append("tags", filters.tags);
      if (filters.search) params.append("search", filters.search);
      if (filters.author) params.append("author", filters.author);
      if (filters.before) params.append("before", filters.before);
      if (filters.after) params.append("after", filters.after);
      const queryString = params.toString();
      const endpoint = `/wp-json/wp/v2/posts${queryString ? "?" + queryString : ""}`;
      const response = await this.makeRequest("GET", endpoint);
      return response;
    } catch (error) {
      console.error("[WPApiClient] Failed to get posts:", error);
      throw error;
    }
  }
  /**
   * Delete post
   */
  async deletePost(postId, force = false) {
    if (!this.isInitialized) {
      throw new Error("WPApiClient not initialized");
    }
    try {
      console.log(`[WPApiClient] Deleting post: ${postId}`);
      const params = force ? "?force=true" : "";
      const response = await this.makeRequest("DELETE", `/wp-json/wp/v2/posts/${postId}${params}`);
      console.log(`[WPApiClient] Post deleted successfully: ${postId}`);
      this.emit("post-deleted", { id: postId, forced: force });
      return response;
    } catch (error) {
      console.error(`[WPApiClient] Failed to delete post ${postId}:`, error);
      throw error;
    }
  }
  /**
   * Upload media file
   */
  async uploadMedia(file, metadata = {}) {
    if (!this.isInitialized) {
      throw new Error("WPApiClient not initialized");
    }
    try {
      console.log("[WPApiClient] Uploading media file:", file.name);
      const formData = new FormData();
      formData.append("file", file);
      if (metadata.title) formData.append("title", metadata.title);
      if (metadata.caption) formData.append("caption", metadata.caption);
      if (metadata.alt_text) formData.append("alt_text", metadata.alt_text);
      if (metadata.description) formData.append("description", metadata.description);
      const response = await this.makeRequest("POST", "/wp-json/wp/v2/media", formData, {
        "Content-Type": void 0
        // Let browser set multipart boundary
      });
      console.log(`[WPApiClient] Media uploaded successfully: ${response.id}`);
      this.emit("media-uploaded", { id: response.id, media: response });
      return response;
    } catch (error) {
      console.error("[WPApiClient] Failed to upload media:", error);
      this.emit("media-upload-failed", { error: error.message });
      throw error;
    }
  }
  /**
   * Get categories
   */
  async getCategories(params = {}) {
    if (!this.isInitialized) {
      throw new Error("WPApiClient not initialized");
    }
    try {
      const queryParams = new URLSearchParams(params);
      const queryString = queryParams.toString();
      const endpoint = `/wp-json/wp/v2/categories${queryString ? "?" + queryString : ""}`;
      const response = await this.makeRequest("GET", endpoint);
      return response;
    } catch (error) {
      console.error("[WPApiClient] Failed to get categories:", error);
      throw error;
    }
  }
  /**
   * Create category
   */
  async createCategory(categoryData) {
    if (!this.isInitialized) {
      throw new Error("WPApiClient not initialized");
    }
    try {
      const response = await this.makeRequest("POST", "/wp-json/wp/v2/categories", categoryData);
      console.log(`[WPApiClient] Category created: ${response.name} (ID: ${response.id})`);
      return response;
    } catch (error) {
      console.error("[WPApiClient] Failed to create category:", error);
      throw error;
    }
  }
  /**
   * Get tags
   */
  async getTags(params = {}) {
    if (!this.isInitialized) {
      throw new Error("WPApiClient not initialized");
    }
    try {
      const queryParams = new URLSearchParams(params);
      const queryString = queryParams.toString();
      const endpoint = `/wp-json/wp/v2/tags${queryString ? "?" + queryString : ""}`;
      const response = await this.makeRequest("GET", endpoint);
      return response;
    } catch (error) {
      console.error("[WPApiClient] Failed to get tags:", error);
      throw error;
    }
  }
  /**
   * Create tag
   */
  async createTag(tagData) {
    if (!this.isInitialized) {
      throw new Error("WPApiClient not initialized");
    }
    try {
      const response = await this.makeRequest("POST", "/wp-json/wp/v2/tags", tagData);
      console.log(`[WPApiClient] Tag created: ${response.name} (ID: ${response.id})`);
      return response;
    } catch (error) {
      console.error("[WPApiClient] Failed to create tag:", error);
      throw error;
    }
  }
  /**
   * Get site information
   */
  async getSiteInfo() {
    if (!this.isInitialized) {
      throw new Error("WPApiClient not initialized");
    }
    try {
      const response = await this.makeRequest("GET", "/wp-json");
      return response;
    } catch (error) {
      console.error("[WPApiClient] Failed to get site info:", error);
      throw error;
    }
  }
  /**
   * Make HTTP request with authentication and error handling
   */
  async makeRequest(method, endpoint, data = null, customHeaders = {}) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise((resolve) => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
    const url = `${this.siteUrl}${endpoint}`;
    let attempt = 0;
    while (attempt < this.options.retryAttempts) {
      try {
        const headers = {
          "Authorization": `Basic ${btoa(this.credentials.username + ":" + this.credentials.password)}`,
          ...customHeaders
        };
        if (data && !(data instanceof FormData)) {
          headers["Content-Type"] = "application/json";
        }
        const config = {
          method,
          headers,
          signal: AbortSignal.timeout(this.options.timeout)
        };
        if (data) {
          config.body = data instanceof FormData ? data : JSON.stringify(data);
        }
        const response = await fetch(url, config);
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
        const responseData = await response.json();
        return responseData;
      } catch (error) {
        attempt++;
        console.warn(`[WPApiClient] Request attempt ${attempt} failed:`, error.message);
        if (attempt >= this.options.retryAttempts) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, this.options.retryDelay * attempt));
      }
    }
  }
  /**
   * Get client statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      siteUrl: this.siteUrl,
      rateLimitDelay: this.rateLimitDelay,
      timeout: this.options.timeout,
      retryAttempts: this.options.retryAttempts
    };
  }
  /**
   * Update credentials
   */
  updateCredentials(credentials) {
    this.credentials = credentials;
    console.log("[WPApiClient] Credentials updated");
    this.emit("credentials-updated");
  }
  /**
   * Update site URL
   */
  updateSiteUrl(siteUrl) {
    if (!siteUrl) {
      console.warn("[WPApiClient] Cannot update with empty site URL");
      return;
    }
    this.siteUrl = siteUrl.replace(/\/$/, "");
    console.log(`[WPApiClient] Site URL updated: ${this.siteUrl}`);
    this.emit("site-url-updated", { siteUrl: this.siteUrl });
  }
  /**
   * Destroy WordPress API client
   */
  destroy() {
    this.siteUrl = null;
    this.credentials = null;
    this.isInitialized = false;
    this.removeAllListeners();
    console.log("[WPApiClient] Destroyed");
  }
}
class EGDeskCore extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      enableLogging: options.enableLogging !== false,
      autoInitialize: options.autoInitialize !== false,
      ...options
    };
    this.isInitialized = false;
    this.modules = /* @__PURE__ */ new Map();
    this.initializationOrder = [
      "eventBus",
      "globalStateManager",
      "claudeIntegration",
      "conversationManager",
      "taskExecutor",
      "templateManager",
      "contentGenerator",
      "seoOptimizer",
      "qualityChecker"
      // wpApiClient will be initialized when WordPress settings are provided
      // workspaceManager will be initialized separately after proxy setup
    ];
  }
  /**
   * Initialize all EG-Desk modules
   */
  async initialize() {
    try {
      console.log("[EGDeskCore] 🚀 Starting EG-Desk:태화 module initialization...");
      if (this.isInitialized) {
        console.warn("[EGDeskCore] Already initialized");
        return;
      }
      await this.createModuleInstances();
      await this.initializeModules();
      this.setupInterModuleCommunication();
      this.isInitialized = true;
      console.log("[EGDeskCore] ✅ All modules initialized successfully");
      this.emit("initialized");
      return true;
    } catch (error) {
      console.error("[EGDeskCore] ❌ Initialization failed:", error);
      this.emit("initialization-failed", error);
      throw error;
    }
  }
  /**
   * Create instances of all modules
   */
  async createModuleInstances() {
    console.log("[EGDeskCore] 🏗️  Creating module instances...");
    try {
      console.log("[EGDeskCore] 📦 Creating eventBus...");
      this.modules.set("eventBus", eventBus);
      console.log("[EGDeskCore] 📦 Creating globalStateManager...");
      this.modules.set("globalStateManager", new GlobalStateManager());
      console.log("[EGDeskCore] 📦 Creating claudeIntegration...");
      this.modules.set("claudeIntegration", new ClaudeIntegration());
      console.log("[EGDeskCore] 📦 Creating conversationManager...");
      this.modules.set("conversationManager", new ConversationManager());
      console.log("[EGDeskCore] 📦 Creating taskExecutor...");
      this.modules.set("taskExecutor", new TaskExecutor());
      console.log("[EGDeskCore] 📦 Creating templateManager...");
      this.modules.set("templateManager", new TemplateManager());
      console.log("[EGDeskCore] 📦 Creating contentGenerator...");
      const contentGenerator = new ContentGenerator(
        this.modules.get("claudeIntegration"),
        this.modules.get("templateManager")
      );
      this.modules.set("contentGenerator", contentGenerator);
      console.log("[EGDeskCore] 📦 Creating seoOptimizer...");
      this.modules.set("seoOptimizer", new SEOOptimizer());
      console.log("[EGDeskCore] 📦 Creating qualityChecker...");
      this.modules.set("qualityChecker", new QualityChecker());
      console.log("[EGDeskCore] ⚠️  WPApiClient NOT created - will be created only when WordPress settings provided");
      this.modules.set("workspaceManager", null);
      console.log(`[EGDeskCore] ✅ Created ${this.modules.size} module instances successfully`);
    } catch (error) {
      console.error("[EGDeskCore] ❌ Error during module instance creation:", error);
      console.error("[EGDeskCore] 📊 Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
  /**
   * Initialize modules in dependency order
   */
  async initializeModules() {
    console.log("[EGDeskCore] Initializing modules in dependency order...");
    for (const moduleName of this.initializationOrder) {
      const module = this.modules.get(moduleName);
      if (!module) {
        console.warn(`[EGDeskCore] Module ${moduleName} not found, skipping...`);
        continue;
      }
      try {
        console.log(`[EGDeskCore] Initializing ${moduleName}...`);
        if (typeof module.initialize === "function") {
          await module.initialize();
        }
        console.log(`[EGDeskCore] ✅ ${moduleName} initialized`);
      } catch (error) {
        console.error(`[EGDeskCore] ❌ Failed to initialize ${moduleName}:`, error);
        throw new Error(`Module initialization failed: ${moduleName} - ${error.message}`);
      }
    }
  }
  /**
   * Set up inter-module communication via EventBus
   */
  setupInterModuleCommunication() {
    console.log("[EGDeskCore] Setting up inter-module communication...");
    const eventBus2 = this.modules.get("eventBus");
    eventBus2.subscribe("content:generate-request", async (eventData) => {
      const contentGenerator = this.modules.get("contentGenerator");
      const result = await contentGenerator.generateBlogContent(eventData.data);
      eventBus2.publish("content:generated", result);
    }, "EGDeskCore");
    eventBus2.subscribe("content:optimize-request", async (eventData) => {
      const seoOptimizer = this.modules.get("seoOptimizer");
      const result = await seoOptimizer.optimizeContent(eventData.data.content, eventData.data.options);
      eventBus2.publish("content:optimized", result);
    }, "EGDeskCore");
    eventBus2.subscribe("wordpress:publish-request", async (eventData) => {
      console.log("[EGDeskCore] 🔍 WordPress publish request received, checking wpApiClient...");
      const wpApiClient = this.modules.get("wpApiClient");
      if (!wpApiClient) {
        console.error("[EGDeskCore] ❌ wpApiClient not available for publish request");
        eventBus2.publish("wordpress:publish-failed", { error: "WordPress API client not initialized" });
        return;
      }
      try {
        console.log("[EGDeskCore] 📤 Creating WordPress post via wpApiClient...");
        const result = await wpApiClient.createPost(eventData.data);
        eventBus2.publish("wordpress:published", result);
      } catch (error) {
        console.error("[EGDeskCore] ❌ WordPress publish failed:", error);
        eventBus2.publish("wordpress:publish-failed", { error: error.message });
      }
    }, "EGDeskCore");
    eventBus2.subscribe("content:quality-check-request", async (eventData) => {
      const qualityChecker = this.modules.get("qualityChecker");
      const result = await qualityChecker.checkContentQuality(eventData.data.content);
      eventBus2.publish("content:quality-checked", result);
    }, "EGDeskCore");
    eventBus2.subscribe("ai:message-request", async (eventData) => {
      const claudeIntegration = this.modules.get("claudeIntegration");
      const result = await claudeIntegration.sendMessage(eventData.data.prompt, eventData.data.options);
      eventBus2.publish("ai:message-response", result);
    }, "EGDeskCore");
    console.log("[EGDeskCore] Inter-module communication established");
  }
  /**
   * Get module instance by name
   */
  getModule(moduleName) {
    return this.modules.get(moduleName);
  }
  /**
   * Set WorkspaceManager after proxy creation
   */
  setWorkspaceManager(workspaceManager) {
    this.modules.set("workspaceManager", workspaceManager);
    const globalStateManager = this.modules.get("globalStateManager");
    const eventBus2 = this.modules.get("eventBus");
    if (workspaceManager && globalStateManager) {
      workspaceManager.globalStateManager = globalStateManager;
      workspaceManager.eventBus = eventBus2;
      window.globalStateManager = globalStateManager;
      window.eventBus = eventBus2;
      console.log("[EGDeskCore] WorkspaceManager integrated with state management");
    }
  }
  /**
   * Get all modules
   */
  getAllModules() {
    return Object.fromEntries(this.modules);
  }
  /**
   * Check if all modules are initialized
   */
  isFullyInitialized() {
    return this.isInitialized;
  }
  /**
   * Initialize WordPress API client with credentials
   */
  async initializeWordPressClient(siteUrl, credentials) {
    try {
      console.log("[EGDeskCore] 🔍 Initializing WordPress API client...");
      console.log("[EGDeskCore] 📝 Received siteUrl:", siteUrl, "type:", typeof siteUrl);
      console.log("[EGDeskCore] 📝 Received credentials:", credentials ? "provided" : "missing");
      let wpApiClient = this.modules.get("wpApiClient");
      if (!wpApiClient) {
        console.log("[EGDeskCore] 🏗️  Creating new WPApiClient instance...");
        wpApiClient = new WPApiClient();
        this.modules.set("wpApiClient", wpApiClient);
      }
      console.log("[EGDeskCore] 🚀 Calling wpApiClient.initialize...");
      await wpApiClient.initialize(siteUrl, credentials);
      console.log("[EGDeskCore] ✅ WordPress API client initialized successfully");
      return true;
    } catch (error) {
      console.error("[EGDeskCore] ❌ WordPress API initialization failed:", error);
      console.error("[EGDeskCore] 📊 Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
  /**
   * Get system status
   */
  getSystemStatus() {
    const moduleStatus = {};
    for (const [name, module] of this.modules) {
      moduleStatus[name] = {
        isInitialized: module.isInitialized !== void 0 ? module.isInitialized : true,
        hasError: false
      };
    }
    return {
      isInitialized: this.isInitialized,
      totalModules: this.modules.size,
      moduleStatus,
      timestamp: Date.now()
    };
  }
  /**
   * Execute a complete blog automation workflow
   */
  async executeBlogWorkflow(request) {
    if (!this.isInitialized) {
      throw new Error("EGDeskCore not initialized");
    }
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    console.log(`[EGDeskCore] 📝 Starting blog workflow: ${workflowId}`);
    try {
      const eventBus2 = this.modules.get("eventBus");
      console.log(`[EGDeskCore] Step 1: Generating content for topic: ${request.topic}`);
      eventBus2.publish("content:generate-request", request);
      const contentResult = await eventBus2.waitForEvent("content:generated", 6e4);
      console.log(`[EGDeskCore] Step 2: Optimizing content for SEO`);
      eventBus2.publish("content:optimize-request", {
        content: contentResult.data.content,
        options: { targetKeywords: request.keywords || [] }
      });
      const seoResult = await eventBus2.waitForEvent("content:optimized", 3e4);
      console.log(`[EGDeskCore] Step 3: Checking content quality`);
      eventBus2.publish("content:quality-check-request", {
        content: seoResult.data.optimizedContent
      });
      const qualityResult = await eventBus2.waitForEvent("content:quality-checked", 15e3);
      let publishResult = null;
      if (request.autoPublish) {
        console.log(`[EGDeskCore] Step 4: Publishing to WordPress`);
        eventBus2.publish("wordpress:publish-request", {
          title: contentResult.data.title,
          content: seoResult.data.optimizedContent,
          status: request.publishStatus || "draft",
          categories: request.categories || [],
          tags: request.tags || []
        });
        publishResult = await eventBus2.waitForEvent("wordpress:published", 3e4);
      }
      const workflowResult = {
        workflowId,
        status: "completed",
        steps: {
          contentGeneration: contentResult.data,
          seoOptimization: seoResult.data,
          qualityCheck: qualityResult.data,
          publishing: publishResult?.data || null
        },
        completedAt: Date.now()
      };
      console.log(`[EGDeskCore] ✅ Blog workflow completed: ${workflowId}`);
      this.emit("workflow-completed", workflowResult);
      return workflowResult;
    } catch (error) {
      console.error(`[EGDeskCore] ❌ Blog workflow failed: ${workflowId}`, error);
      const errorResult = {
        workflowId,
        status: "failed",
        error: error.message,
        failedAt: Date.now()
      };
      this.emit("workflow-failed", errorResult);
      throw error;
    }
  }
  /**
   * Destroy all modules
   */
  async destroy() {
    console.log("[EGDeskCore] 🔄 Destroying all modules...");
    const destroyOrder = [...this.initializationOrder].reverse();
    for (const moduleName of destroyOrder) {
      const module = this.modules.get(moduleName);
      if (module && typeof module.destroy === "function") {
        try {
          await module.destroy();
          console.log(`[EGDeskCore] ✅ ${moduleName} destroyed`);
        } catch (error) {
          console.error(`[EGDeskCore] ❌ Failed to destroy ${moduleName}:`, error);
        }
      }
    }
    this.modules.clear();
    this.isInitialized = false;
    this.removeAllListeners();
    console.log("[EGDeskCore] 🔄 All modules destroyed");
  }
}
window.addEventListener("error", (event) => {
  console.error("💥 [RENDERER CRASH] Global error:", event.error);
});
window.addEventListener("unhandledrejection", (event) => {
  console.error("💥 [RENDERER CRASH] Unhandled promise rejection:", event.reason);
});
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[RENDERER] DOMContentLoaded: Initializing EG-Desk");
  console.log("[RENDERER] CSS imported via ES modules");
  try {
    let updateUIForWorkspace2 = function(workspace) {
      console.log(`[RENDERER] Updating UI for workspace: ${workspace}`);
      document.querySelectorAll(".tab").forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.workspace === workspace);
      });
      const startScreen = document.getElementById("start-screen");
      const mainContent = document.getElementById("main-content");
      const workspaceTabs = document.querySelector(".workspace-tabs");
      if (!startScreen || !mainContent) {
        console.error("[RENDERER] Could not find essential DOM elements");
        return;
      }
      if (workspace === "start") {
        startScreen.style.display = "flex";
        mainContent.classList.remove("active");
        if (workspaceTabs) workspaceTabs.classList.remove("show");
      } else {
        startScreen.style.display = "none";
        mainContent.classList.add("active");
        if (workspaceTabs) workspaceTabs.classList.add("show");
        if (workspace === "blog") {
          setTimeout(() => {
            initializeBlogWorkspace();
          }, 100);
        }
      }
    };
    var updateUIForWorkspace = updateUIForWorkspace2;
    if (!window.electronAPI) {
      console.error("[RENDERER] FATAL: electronAPI is not available on window object!");
      return;
    }
    console.log("[RENDERER] electronAPI loaded successfully:", Object.keys(window.electronAPI));
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log("[RENDERER] Initializing EGDeskCore...");
    window.egDeskCore = new EGDeskCore({
      enableLogging: true,
      autoInitialize: true
    });
    await window.egDeskCore.initialize();
    console.log("[RENDERER] EGDeskCore initialized successfully");
    console.log("[RENDERER] Initializing UI Manager...");
    window.uiManager = new UIManager({
      theme: "light-grey",
      animations: true
    });
    await window.uiManager.initialize();
    window.uiManager.addEventListener("workspace-switched", (event) => {
      const data = event.detail;
      console.log("[RENDERER] UIManager workspace switched:", data.workspace);
      if (data.workspace === "blog") {
        setTimeout(() => {
          initializeBlogWorkspace();
        }, 100);
      }
    });
    console.log("[RENDERER] UI Manager initialized successfully");
    console.log("[RENDERER] Component availability check:");
    console.log("  BrowserTabComponent:", typeof BrowserTabComponent);
    console.log("  ChatComponent:", typeof ChatComponent);
    console.log("  WorkspaceManager:", typeof WorkspaceManager);
    console.log("  UIManager:", typeof UIManager);
    if (WorkspaceManager) {
      console.log("[RENDERER] Creating WebContentsManager proxy instance...");
      const webContentsManager = createWebContentsManagerProxy();
      console.log("[RENDERER] Creating WorkspaceManager instance...");
      window.workspaceManager = new WorkspaceManager(webContentsManager);
      window.egDeskCore.setWorkspaceManager(window.workspaceManager);
      console.log("[RENDERER] Initializing WorkspaceManager...");
      await window.workspaceManager.initialize();
      console.log("[RENDERER] WorkspaceManager initialized successfully");
    } else {
      console.warn("[RENDERER] WorkspaceManager not available, using fallback mode");
      console.log("[RENDERER] Available classes:", Object.keys(window).filter((k) => k.includes("Manager") || k.includes("Component")));
    }
    window.switchWorkspace = async function(workspace) {
      const switchId = `switch-${Date.now()}`;
      console.log(`[WORKSPACE-SWITCH:${switchId}] 🚀 Starting workspace switch to: ${workspace}`);
      try {
        await executeWorkspaceSwitch(workspace, switchId);
        console.log(`[WORKSPACE-SWITCH:${switchId}] ✅ Successfully switched to workspace: ${workspace}`);
      } catch (error) {
        console.error(`[WORKSPACE-SWITCH:${switchId}] ❌ Failed to switch to workspace '${workspace}':`, error);
        await handleWorkspaceSwitchError(workspace, error, switchId);
      }
    };
    async function executeWorkspaceSwitch(workspace, switchId) {
      console.log(`[WORKSPACE-SWITCH:${switchId}] 📋 Executing switch sequence for: ${workspace}`);
      await updateUIForWorkspaceSwitch(workspace, switchId);
      await notifyMainProcessWorkspaceSwitch(workspace, switchId);
      await handleWorkspaceSpecificLogic(workspace, switchId);
      console.log(`[WORKSPACE-SWITCH:${switchId}] 🎯 All switch steps completed for: ${workspace}`);
    }
    async function updateUIForWorkspaceSwitch(workspace, switchId) {
      console.log(`[WORKSPACE-SWITCH:${switchId}] 🎨 Updating UI for workspace: ${workspace}`);
      if (window.uiManager) {
        console.log(`[WORKSPACE-SWITCH:${switchId}] Using UIManager for animated transition`);
        console.log(`[WORKSPACE-SWITCH:${switchId}] UIManager status:`, {
          isInitialized: window.uiManager.isInitialized,
          currentWorkspace: window.uiManager.currentWorkspace,
          methodExists: typeof window.uiManager.switchWorkspace === "function"
        });
        try {
          await window.uiManager.switchWorkspace(workspace);
          console.log(`[WORKSPACE-SWITCH:${switchId}] UIManager transition completed successfully`);
          if (workspace === "blog") {
            const mainContent = document.getElementById("main-content");
            console.log(`[WORKSPACE-SWITCH:${switchId}] Blog workspace verification:`, {
              mainContentExists: !!mainContent,
              hasActiveClass: mainContent?.classList.contains("active"),
              opacity: mainContent ? window.getComputedStyle(mainContent).opacity : "N/A",
              visibility: mainContent ? window.getComputedStyle(mainContent).visibility : "N/A"
            });
          }
        } catch (error) {
          console.error(`[WORKSPACE-SWITCH:${switchId}] UIManager transition failed:`, error);
          console.log(`[WORKSPACE-SWITCH:${switchId}] Falling back to direct UI update`);
          updateUIForWorkspace2(workspace);
        }
      } else {
        console.log(`[WORKSPACE-SWITCH:${switchId}] Using fallback UI update (no UIManager)`);
        updateUIForWorkspace2(workspace);
        console.log(`[WORKSPACE-SWITCH:${switchId}] Fallback UI update completed`);
      }
    }
    async function notifyMainProcessWorkspaceSwitch(workspace, switchId) {
      console.log(`[WORKSPACE-SWITCH:${switchId}] 📡 Notifying main process of workspace switch`);
      if (window.electronAPI?.switchWorkspace) {
        const result = await window.electronAPI.switchWorkspace(workspace);
        console.log(`[WORKSPACE-SWITCH:${switchId}] Main process response:`, result);
      } else {
        console.warn(`[WORKSPACE-SWITCH:${switchId}] electronAPI.switchWorkspace not available`);
      }
    }
    async function handleWorkspaceSpecificLogic(workspace, switchId) {
      console.log(`[WORKSPACE-SWITCH:${switchId}] 🔧 Handling workspace-specific logic for: ${workspace}`);
      if (workspace === "start") {
        console.log(`[WORKSPACE-SWITCH:${switchId}] Start workspace selected, no WorkspaceManager needed`);
        return;
      }
      if (!window.workspaceManager) {
        console.warn(`[WORKSPACE-SWITCH:${switchId}] WorkspaceManager not available for workspace: ${workspace}`);
        return;
      }
      console.log(`[WORKSPACE-SWITCH:${switchId}] Activating WorkspaceManager for: ${workspace}`);
      await window.workspaceManager.switchToWorkspace(workspace);
      console.log(`[WORKSPACE-SWITCH:${switchId}] WorkspaceManager activation completed`);
      await logWorkspaceComponentStatus(workspace, switchId);
    }
    async function logWorkspaceComponentStatus(workspace, switchId) {
      if (workspace === "blog" && window.workspaceManager) {
        const browserComponent = window.workspaceManager.getBrowserComponent();
        const chatComponent = window.workspaceManager.getChatComponent();
        const componentStatus = {
          browserComponent: {
            exists: !!browserComponent,
            type: browserComponent?.constructor?.name || "unknown"
          },
          chatComponent: {
            exists: !!chatComponent,
            type: chatComponent?.constructor?.name || "unknown"
          }
        };
        console.log(`[WORKSPACE-SWITCH:${switchId}] 🔍 Blog workspace component status:`, componentStatus);
      }
    }
    async function handleWorkspaceSwitchError(workspace, error, switchId) {
      console.error(`[WORKSPACE-SWITCH:${switchId}] 💥 Error details:`, {
        workspace,
        errorMessage: error.message,
        errorStack: error.stack,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (window.uiManager?.showNotification) {
        const errorMessage = `워크스페이스 전환 실패: ${error.message}`;
        console.log(`[WORKSPACE-SWITCH:${switchId}] 📢 Showing error notification to user`);
        window.uiManager.showNotification(errorMessage, "error");
      } else {
        console.warn(`[WORKSPACE-SWITCH:${switchId}] Unable to show error notification (no UIManager)`);
      }
      if (workspace !== "start") {
        console.log(`[WORKSPACE-SWITCH:${switchId}] 🔄 Attempting recovery by switching to start workspace`);
        try {
          await executeWorkspaceSwitch("start", `${switchId}-recovery`);
          console.log(`[WORKSPACE-SWITCH:${switchId}] ✅ Recovery successful`);
        } catch (recoveryError) {
          console.error(`[WORKSPACE-SWITCH:${switchId}] 💀 Recovery failed:`, recoveryError);
        }
      }
    }
    ;
    document.addEventListener("click", (event) => {
      const target = event.target;
      console.log(`[CLICK-DEBUG] Click detected on:`, {
        tagName: target.tagName,
        className: target.className,
        id: target.id,
        dataset: target.dataset
      });
      if (target.matches(".tab, .tab *")) {
        event.preventDefault();
        event.stopPropagation();
        const tab = target.closest(".tab");
        const workspace = tab.dataset.workspace;
        console.log(`[RENDERER] Tab clicked: ${workspace}`);
        switchWorkspace(workspace);
        return;
      }
      if (target.matches(".workspace-btn, .workspace-btn *")) {
        event.preventDefault();
        const button = target.closest(".workspace-btn");
        const workspace = button.dataset.workspace;
        console.log(`[CLICK-DEBUG] Button found:`, {
          button,
          workspace,
          dataset: button.dataset
        });
        if (workspace) {
          console.log(`[RENDERER] Workspace button clicked: ${workspace}`);
          switchWorkspace(workspace);
        } else {
          console.error(`[CLICK-DEBUG] No workspace found on button:`, button);
        }
        return;
      }
      console.log(`[CLICK-DEBUG] Click not handled, target:`, target);
    });
    console.log("[RENDERER] Initializing with start workspace.");
    updateUIForWorkspace2("start");
    setTimeout(() => {
      if (window.uiManager) {
        window.uiManager.showNotification("EG-Desk:태화 시스템 준비 완료", "success", 2e3);
      }
    }, 500);
    console.log("[RENDERER] EG-Desk initialization complete.");
  } catch (error) {
    console.error("💥 [RENDERER CRASH] Initialization failed:", error);
    if (window.electronAPI?.log?.error) {
      window.electronAPI.log.error(`Renderer crash: ${error.message}`);
    }
  }
  function createWebContentsManagerProxy() {
    return {
      // Proxy methods to electronAPI
      async createTab(url) {
        return "proxy-tab-" + Date.now();
      },
      async switchTab(tabId) {
        return { id: tabId };
      },
      async loadURL(url, tabId) {
        return await window.electronAPI.browser.loadURL(url);
      },
      async goBack(tabId) {
        return await window.electronAPI.browser.goBack();
      },
      async goForward(tabId) {
        return await window.electronAPI.browser.goForward();
      },
      async reload(tabId) {
        return await window.electronAPI.browser.reload();
      },
      async getNavigationState(tabId) {
        try {
          return await window.electronAPI.browser.getNavigationState();
        } catch (error) {
          console.warn("[RENDERER] getNavigationState failed:", error);
          return {
            canGoBack: false,
            canGoForward: false,
            isLoading: false,
            url: "about:blank",
            title: "No Tab"
          };
        }
      },
      async executeScript(script, tabId) {
        return await window.electronAPI.browser.executeScript(script);
      },
      // Event system proxy
      on(event, handler) {
        switch (event) {
          case "navigation":
            window.electronAPI.onBrowserNavigated((evt, data) => {
              handler({ tabId: "proxy-tab", url: data.url || data, type: "navigate" });
            });
            break;
          case "loading-finished":
            window.electronAPI.onBrowserLoadFinished((evt, data) => {
              handler({ tabId: "proxy-tab", title: data?.title });
            });
            break;
          case "loading-failed":
            window.electronAPI.onBrowserLoadFailed((evt, error) => {
              handler({ tabId: "proxy-tab", errorDescription: error });
            });
            break;
        }
      },
      getCurrentTab() {
        return { id: "proxy-tab" };
      },
      // Add missing updateWebContentsViewBounds method
      updateWebContentsViewBounds(preciseBounds) {
        console.log(`[WebContentsManagerProxy] updateWebContentsViewBounds called with:`, preciseBounds);
        if (window.electronAPI?.browser?.updateBounds) {
          return window.electronAPI.browser.updateBounds(preciseBounds);
        } else {
          console.warn(`[WebContentsManagerProxy] updateBounds not available in electronAPI.browser`);
          return Promise.resolve();
        }
      }
    };
  }
  async function initializeBlogWorkspace() {
    console.log("[RENDERER] Initializing Blog Workspace with components...");
    if (window.electronAPI?.log?.info) {
      window.electronAPI.log.info("[CSS-DEBUG] Blog workspace initializing...");
      window.electronAPI.log.info("[CSS-DEBUG] Document ready state:", document.readyState);
      window.electronAPI.log.info("[CSS-DEBUG] HTML element has styles:", {
        styleElement: !!document.querySelector("style"),
        linkElements: document.querySelectorAll('link[rel="stylesheet"]').length,
        inlineStyles: document.documentElement.innerHTML.includes("<style>")
      });
    }
    const styleElements = document.querySelectorAll("style");
    if (window.electronAPI?.log?.info) {
      window.electronAPI.log.info("[CSS-DEBUG] Found style elements:", styleElements.length);
      let foundComponentContainer = false;
      let foundBrowserTabComponent = false;
      styleElements.forEach((style, index) => {
        const contentLength = style.textContent.length;
        window.electronAPI.log.info(`[CSS-DEBUG] Style element ${index} content length:`, contentLength);
        if (style.textContent.includes(".component-container")) {
          foundComponentContainer = true;
          window.electronAPI.log.info("[CSS-DEBUG] Found .component-container styles in style element", index);
        }
        if (style.textContent.includes(".browser-tab-component")) {
          foundBrowserTabComponent = true;
          window.electronAPI.log.info("[CSS-DEBUG] Found .browser-tab-component styles in style element", index);
        }
      });
      if (!foundComponentContainer) {
        window.electronAPI.log.error("[CSS-DEBUG] ERROR: .component-container styles NOT FOUND in any style element!");
      }
      if (!foundBrowserTabComponent) {
        window.electronAPI.log.error("[CSS-DEBUG] ERROR: .browser-tab-component styles NOT FOUND in any style element!");
      }
    }
    setTimeout(() => {
      const containers = {
        chatHistory: document.getElementById("chat-history-container"),
        browser: document.getElementById("browser-component-container"),
        chat: document.getElementById("chat-component-container")
      };
      if (window.electronAPI?.log?.info) {
        window.electronAPI.log.info("[CSS-DEBUG] Component container classes:");
        let allContainersHaveClass = true;
        Object.entries(containers).forEach(([name, elem]) => {
          if (elem) {
            const hasComponentContainerClass = elem.classList.contains("component-container");
            const computedStyles = {
              background: window.getComputedStyle(elem).backgroundColor,
              border: window.getComputedStyle(elem).border,
              borderRadius: window.getComputedStyle(elem).borderRadius
            };
            window.electronAPI.log.info(`[CSS-DEBUG] ${name}:`, {
              className: elem.className,
              hasComponentContainer: hasComponentContainerClass,
              computedStyles
            });
            if (!hasComponentContainerClass) {
              allContainersHaveClass = false;
              window.electronAPI.log.error(`[CSS-DEBUG] ERROR: ${name} does NOT have component-container class!`);
            }
            if (computedStyles.background === "rgba(0, 0, 0, 0)" || computedStyles.background === "transparent") {
              window.electronAPI.log.warn(`[CSS-DEBUG] WARNING: ${name} has transparent background - CSS may not be applied!`);
            }
          } else {
            window.electronAPI.log.error(`[CSS-DEBUG] ERROR: ${name} container element not found!`);
          }
        });
        if (allContainersHaveClass) {
          window.electronAPI.log.info("[CSS-DEBUG] SUCCESS: All containers have component-container class");
        } else {
          window.electronAPI.log.error("[CSS-DEBUG] FAILURE: Some containers missing component-container class");
        }
        const browserTabComponent = document.querySelector(".browser-tab-component");
        if (browserTabComponent) {
          window.electronAPI.log.info("[CSS-DEBUG] Found .browser-tab-component element");
        } else {
          window.electronAPI.log.error("[CSS-DEBUG] ERROR: .browser-tab-component element NOT FOUND!");
        }
      }
    }, 200);
    initializeTerminalFromIndex();
    console.log("[RENDERER] Blog Workspace initialization complete - components handled by WorkspaceManager.");
  }
  function initializeTerminalFromIndex() {
    console.log("[RENDERER] Terminal initialization delegated to ChatComponent via WorkspaceManager");
  }
});
