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
    this.addStyles();
  }
  /**
   * Add CSS styles for the browser tab component
   */
  addStyles() {
    const styleId = `browser-tab-component-styles`;
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
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
    if (this.elements.addressBar) {
      this.elements.addressBar.style.opacity = isLoading ? "0.7" : "1";
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
    this.commandHistory = [];
    this.historyIndex = -1;
    this.options = {
      title: options.title || "AI Agent Terminal",
      icon: options.icon || "🤖",
      placeholder: options.placeholder || "AI 에이전트와 대화하기...",
      prompt: options.prompt || "AI-Agent $",
      welcomeMessages: options.welcomeMessages || this.getDefaultWelcomeMessages(),
      maxHistorySize: options.maxHistorySize || 100,
      ...options
    };
  }
  /**
   * Initialize the chat component
   */
  async initialize() {
    console.log(`[ChatComponent] Starting initialization for: ${this.containerId}`);
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`[ChatComponent] Container with ID "${this.containerId}" not found`);
      throw new Error(`Container with ID "${this.containerId}" not found`);
    }
    try {
      this.render();
      console.log(`[ChatComponent] Render completed`);
      this.setupEventListeners();
      console.log(`[ChatComponent] Event listeners setup`);
      this.displayWelcomeMessages();
      console.log(`[ChatComponent] Welcome messages displayed`);
      this.isInitialized = true;
      console.log(`[ChatComponent] Initialized successfully in container: ${this.containerId}`);
    } catch (error) {
      console.error(`[ChatComponent] Initialization failed:`, error);
      throw error;
    }
  }
  /**
   * Render the chat component HTML
   */
  render() {
    this.container.innerHTML = `
      <div class="chat-component">
        <!-- Chat Header -->
        <div class="chat-header">
          <div class="chat-icon">${this.options.icon}</div>
          <span class="chat-title">${this.options.title}</span>
          <div class="chat-status">
            <div class="status-dot online"></div>
          </div>
        </div>
        
        <!-- Chat Output -->
        <div id="${this.containerId}-output" class="chat-output">
          <!-- Messages will be dynamically added here -->
        </div>
        
        <!-- Chat Input -->
        <div class="chat-input-container">
          <span class="chat-prompt">${this.options.prompt}</span>
          <input 
            type="text" 
            id="${this.containerId}-input" 
            class="chat-input" 
            placeholder="${this.options.placeholder}"
            autocomplete="off"
          />
        </div>
      </div>
    `;
    this.elements = {
      output: document.getElementById(`${this.containerId}-output`),
      input: document.getElementById(`${this.containerId}-input`),
      header: this.container.querySelector(".chat-header"),
      statusDot: this.container.querySelector(".status-dot")
    };
    this.addStyles();
  }
  /**
   * Add CSS styles for the chat component
   */
  addStyles() {
    const styleId = `chat-component-styles`;
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .chat-component {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border: 2px solid #7c3aed; /* Purple border for differentiation */
        overflow: hidden;
      }

      .chat-header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-weight: 600;
        font-size: 14px;
        gap: 10px;
        flex-shrink: 0;
      }

      .chat-icon {
        font-size: 16px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .chat-title {
        flex: 1;
      }

      .chat-status {
        display: flex;
        align-items: center;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-left: 8px;
      }

      .status-dot.online {
        background: #10b981;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
      }

      .status-dot.busy {
        background: #f59e0b;
        box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
      }

      .status-dot.offline {
        background: #ef4444;
        box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
      }

      .chat-output {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        font-size: 13px;
        line-height: 1.6;
        background: #fafafa;
        color: #374151;
      }

      .chat-output::-webkit-scrollbar {
        width: 6px;
      }

      .chat-output::-webkit-scrollbar-track {
        background: transparent;
      }

      .chat-output::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 3px;
      }

      .chat-output::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }

      .chat-input-container {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: #f9fafb;
        border-top: 1px solid #e5e7eb;
        gap: 8px;
      }

      .chat-prompt {
        color: #10b981;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        font-size: 13px;
        font-weight: 600;
        flex-shrink: 0;
      }

      .chat-input {
        flex: 1;
        border: none;
        background: transparent;
        color: #374151;
        font-size: 13px;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        outline: none;
        padding: 8px 0;
      }

      .chat-input::placeholder {
        color: #9ca3af;
      }

      /* Message Types */
      .message {
        margin-bottom: 8px;
        word-wrap: break-word;
      }

      .message.command {
        color: #10b981;
        font-weight: 600;
      }

      .message.output {
        color: #374151;
        margin-left: 16px;
      }

      .message.error {
        color: #ef4444;
        margin-left: 16px;
        font-weight: 500;
      }

      .message.success {
        color: #10b981;
        margin-left: 16px;
        font-weight: 500;
      }

      .message.warning {
        color: #f59e0b;
        margin-left: 16px;
        font-weight: 500;
      }

      .message.system {
        color: #6b7280;
        font-style: italic;
        margin-left: 16px;
      }

      .message.welcome {
        color: #3b82f6;
        margin-bottom: 4px;
      }

      .message.ai-response {
        color: #7c3aed;
        margin-left: 16px;
        white-space: pre-wrap;
      }

      /* Status indicators */
      .status-indicator {
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        margin-right: 8px;
        vertical-align: middle;
      }

      .status-indicator.success { background: #10b981; }
      .status-indicator.error { background: #ef4444; }
      .status-indicator.warning { background: #f59e0b; }
      .status-indicator.info { background: #3b82f6; }

      /* Animations */
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .message {
        animation: fadeInUp 0.2s ease-out;
      }

      /* Typing indicator */
      .typing-indicator {
        display: none;
        margin-left: 16px;
        color: #9ca3af;
        font-style: italic;
      }

      .typing-indicator.active {
        display: block;
      }

      .typing-dots {
        display: inline-block;
        animation: typing 1.4s infinite;
      }

      @keyframes typing {
        0%, 60%, 100% { opacity: 0; }
        30% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    this.elements.input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.navigateHistory(-1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        this.navigateHistory(1);
      }
    });
    this.elements.output?.addEventListener("click", () => {
      this.elements.input?.focus();
    });
    setTimeout(() => {
      this.elements.input?.focus();
    }, 100);
  }
  /**
   * Send a message
   */
  async sendMessage() {
    const input = this.elements.input;
    if (!input || !input.value.trim()) return;
    const message = input.value.trim();
    this.addToHistory(message);
    this.addMessage(`${this.options.prompt} ${message}`, "command");
    input.value = "";
    this.historyIndex = -1;
    this.showTypingIndicator();
    try {
      await this.processCommand(message);
    } catch (error) {
      this.addMessage(`실행 오류: ${error.message}`, "error");
    } finally {
      this.hideTypingIndicator();
    }
  }
  /**
   * Process a command (can be overridden or extended)
   */
  async processCommand(command) {
    if (this.handleBuiltInCommands(command)) {
      return;
    }
    if (window.electronAPI?.command?.execute) {
      try {
        const result = await window.electronAPI.command.execute(command);
        if (result.success) {
          if (result.data) {
            const lines = result.data.split("\n");
            lines.forEach((line) => {
              if (line.trim()) {
                this.addMessage(line, "output");
              }
            });
          } else {
            this.addMessage("명령이 성공적으로 실행되었습니다.", "success");
          }
        } else {
          this.addMessage(`오류: ${result.error}`, "error");
        }
      } catch (error) {
        this.addMessage(`실행 실패: ${error.message}`, "error");
      }
    } else {
      this.addMessage("AI 에이전트가 현재 사용할 수 없습니다.", "error");
    }
  }
  /**
   * Handle built-in commands
   */
  handleBuiltInCommands(command) {
    const cmd = command.toLowerCase().trim();
    switch (cmd) {
      case "clear":
      case "cls":
        this.clearOutput();
        return true;
      case "help":
        this.showHelp();
        return true;
      case "history":
        this.showHistory();
        return true;
      default:
        return false;
    }
  }
  /**
   * Add a message to the chat output
   */
  addMessage(text, type = "output") {
    if (!this.elements.output) return;
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    if (["success", "error", "warning", "info"].includes(type)) {
      const indicator = document.createElement("span");
      indicator.className = `status-indicator ${type}`;
      messageDiv.appendChild(indicator);
    }
    messageDiv.appendChild(document.createTextNode(text));
    this.elements.output.appendChild(messageDiv);
    this.scrollToBottom();
  }
  /**
   * Add multiple messages at once
   */
  addMessages(messages) {
    messages.forEach(({ text, type }) => {
      this.addMessage(text, type);
    });
  }
  /**
   * Show typing indicator
   */
  showTypingIndicator() {
    if (!this.elements.output) return;
    const indicator = document.createElement("div");
    indicator.className = "typing-indicator active";
    indicator.innerHTML = 'AI 에이전트가 생각 중<span class="typing-dots">...</span>';
    indicator.id = `${this.containerId}-typing`;
    this.elements.output.appendChild(indicator);
    this.scrollToBottom();
  }
  /**
   * Hide typing indicator
   */
  hideTypingIndicator() {
    const indicator = document.getElementById(`${this.containerId}-typing`);
    if (indicator) {
      indicator.remove();
    }
  }
  /**
   * Clear chat output
   */
  clearOutput() {
    if (this.elements.output) {
      this.elements.output.innerHTML = "";
    }
  }
  /**
   * Show help message
   */
  showHelp() {
    const helpMessages = [
      { text: "사용 가능한 명령어:", type: "system" },
      { text: '  • claude "질문이나 요청"  - Claude AI와 대화', type: "output" },
      { text: "  • clear, cls           - 화면 지우기", type: "output" },
      { text: "  • help                 - 도움말 표시", type: "output" },
      { text: "  • history              - 명령어 기록 보기", type: "output" },
      { text: "", type: "output" },
      { text: "팁: 위/아래 화살표로 명령어 기록을 탐색할 수 있습니다.", type: "system" }
    ];
    this.addMessages(helpMessages);
  }
  /**
   * Show command history
   */
  showHistory() {
    if (this.commandHistory.length === 0) {
      this.addMessage("명령어 기록이 없습니다.", "system");
      return;
    }
    this.addMessage("최근 명령어 기록:", "system");
    this.commandHistory.slice(-10).forEach((cmd, index) => {
      this.addMessage(`  ${index + 1}. ${cmd}`, "output");
    });
  }
  /**
   * Navigate command history
   */
  navigateHistory(direction) {
    if (this.commandHistory.length === 0) return;
    if (direction === -1) {
      if (this.historyIndex === -1) {
        this.historyIndex = this.commandHistory.length - 1;
      } else if (this.historyIndex > 0) {
        this.historyIndex--;
      }
    } else if (direction === 1) {
      if (this.historyIndex < this.commandHistory.length - 1) {
        this.historyIndex++;
      } else {
        this.historyIndex = -1;
        this.elements.input.value = "";
        return;
      }
    }
    if (this.historyIndex >= 0 && this.historyIndex < this.commandHistory.length) {
      this.elements.input.value = this.commandHistory[this.historyIndex];
    }
  }
  /**
   * Add command to history
   */
  addToHistory(command) {
    if (this.commandHistory[this.commandHistory.length - 1] !== command) {
      this.commandHistory.push(command);
      if (this.commandHistory.length > this.options.maxHistorySize) {
        this.commandHistory.shift();
      }
    }
  }
  /**
   * Display welcome messages
   */
  displayWelcomeMessages() {
    this.options.welcomeMessages.forEach(({ text, type }) => {
      this.addMessage(text, type);
    });
  }
  /**
   * Get default welcome messages
   */
  getDefaultWelcomeMessages() {
    return [
      { text: "EG-Desk:태화 AI Agent 시스템 온라인", type: "welcome" },
      { text: "Claude AI 연동 활성화됨", type: "success" },
      { text: "WordPress API 연결 대기중", type: "system" },
      { text: "", type: "output" },
      { text: "💡 예시 명령어:", type: "system" },
      { text: '  claude "현재 페이지 SEO 분석해줘"', type: "output" },
      { text: '  claude "블로그 글 작성: 로고스키 코일 기술"', type: "output" },
      { text: "  help (도움말)", type: "output" },
      { text: "", type: "output" }
    ];
  }
  /**
   * Scroll to bottom of chat
   */
  scrollToBottom() {
    if (this.elements.output) {
      this.elements.output.scrollTop = this.elements.output.scrollHeight;
    }
  }
  /**
   * Set status (online, busy, offline)
   */
  setStatus(status) {
    if (this.elements.statusDot) {
      this.elements.statusDot.className = `status-dot ${status}`;
    }
  }
  /**
   * Focus input
   */
  focus() {
    this.elements.input?.focus();
  }
  /**
   * Get component statistics
   */
  getStats() {
    return {
      messageCount: this.elements.output?.children.length || 0,
      historySize: this.commandHistory.length,
      isInitialized: this.isInitialized
    };
  }
  /**
   * Destroy the component
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.commandHistory = [];
    this.historyIndex = -1;
    this.isInitialized = false;
    console.log(`[ChatComponent] Destroyed: ${this.containerId}`);
  }
}
class WorkspaceManager {
  constructor(webContentsManager) {
    this.webContentsManager = webContentsManager;
    this.workspaces = /* @__PURE__ */ new Map();
    this.currentWorkspace = null;
    this.components = /* @__PURE__ */ new Map();
  }
  /**
   * Initialize workspace manager
   */
  initialize() {
    this.registerWorkspaces();
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
            welcomeMessages: [
              { text: "EG-Desk:태화 블로그 자동화 시스템", type: "welcome" },
              { text: "WordPress 연동 준비 완료", type: "success" },
              { text: "Claude AI 기반 콘텐츠 생성 활성화", type: "success" },
              { text: "", type: "output" },
              { text: "💡 블로그 자동화 명령어:", type: "system" },
              { text: '  claude "현재 페이지 SEO 분석해줘"', type: "output" },
              { text: '  claude "로고스키 코일 기술 블로그 글 써줘"', type: "output" },
              { text: '  claude "이 콘텐츠를 WordPress에 게시해줘"', type: "output" },
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
  }
  /**
   * Create a component based on configuration
   */
  async createComponent(config) {
    const { type, containerId, config: componentConfig } = config;
    switch (type) {
      case "browser":
        console.log(`[WorkspaceManager] 🌐 Attempting to create browser component...`);
        console.log(`[WorkspaceManager] BrowserTabComponent available:`, typeof BrowserTabComponent);
        console.log(`[WorkspaceManager] webContentsManager available:`, !!this.webContentsManager);
        if (typeof BrowserTabComponent === "undefined") {
          console.error("[WorkspaceManager] ❌ FATAL: BrowserTabComponent not available - check if import is loaded");
          return null;
        }
        console.log(`[WorkspaceManager] 🏗️ Creating BrowserTabComponent for container: ${containerId}`);
        const browserComponent = new BrowserTabComponent(containerId, this.webContentsManager);
        console.log(`[WorkspaceManager] ✅ BrowserTabComponent instance created`);
        try {
          console.log(`[WorkspaceManager] 🚀 Initializing BrowserTabComponent...`);
          await browserComponent.initialize();
          console.log(`[WorkspaceManager] ✅ BrowserTabComponent initialization completed`);
          console.log(`[WorkspaceManager] 🌐 Scheduling initial URL load...`);
          setTimeout(() => {
            console.log(`[WorkspaceManager] 🔄 Triggering loadInitialURL...`);
            browserComponent.loadInitialURL().catch((error) => {
              console.error(`[WorkspaceManager] ❌ loadInitialURL failed:`, error);
            });
          }, 100);
          console.log(`[WorkspaceManager] 🎉 Browser component setup complete`);
          return browserComponent;
        } catch (initError) {
          console.error("[WorkspaceManager] ❌ BrowserTabComponent initialization failed:", initError);
          throw initError;
        }
      case "chat":
        if (typeof ChatComponent === "undefined") {
          console.error("[WorkspaceManager] ChatComponent not available");
          return null;
        }
        const chatComponent = new ChatComponent(containerId, componentConfig);
        await chatComponent.initialize();
        return chatComponent;
      default:
        console.warn(`[WorkspaceManager] Unknown component type: ${type}`);
        return null;
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
   * Get browser component from current workspace
   */
  getBrowserComponent() {
    return this.getComponent("browser-component-container");
  }
  /**
   * Get chat component from current workspace
   */
  getChatComponent() {
    return this.getComponent("chat-component-container");
  }
  /**
   * Blog workspace specific activation
   */
  async activateBlogWorkspace() {
    console.log("[WorkspaceManager] Blog workspace specific setup...");
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
    this.currentWorkspace = null;
    console.log("[WorkspaceManager] Destroyed");
  }
}
class WebContentsManager {
  constructor() {
    this.activeTabs = /* @__PURE__ */ new Map();
    this.currentTabId = null;
    this.eventHandlers = /* @__PURE__ */ new Map();
    console.log("[WebContentsManager] Initialized as IPC proxy to main process");
  }
  /**
   * Initialize the renderer-side manager (IPC proxy)
   */
  initialize() {
    console.log("[WebContentsManager] Initialized renderer-side IPC proxy");
    this.setupMainProcessEventListeners();
  }
  /**
   * Set up event listeners for main process events
   */
  setupMainProcessEventListeners() {
    if (window.electronAPI && window.electronAPI.on) {
      window.electronAPI.on("browser-navigated", (data) => {
        this.emit("navigation", data);
      });
      window.electronAPI.on("browser-load-started", (data) => {
        this.emit("loading-started", data);
      });
      window.electronAPI.on("browser-load-finished", (data) => {
        this.emit("loading-finished", data);
      });
      window.electronAPI.on("browser-load-failed", (data) => {
        this.emit("loading-failed", data);
      });
      window.electronAPI.on("browser-load-stopped", (data) => {
        this.emit("loading-stopped", data);
      });
      console.log("[WebContentsManager] Main process event listeners setup complete");
    } else {
      console.warn("[WebContentsManager] electronAPI not available for event listening");
    }
  }
  /**
   * Create a new browser tab/view (delegates to main process)
   * @param {string} url - Initial URL to load
   * @param {Object} options - WebContentsView options
   * @returns {string} tabId - Unique tab identifier
   */
  async createTab(url = "about:blank", options = {}) {
    console.log(`[WebContentsManager] Creating tab via IPC: ${url}`);
    try {
      const result = await window.electronAPI.invoke("browser-create-tab", { url, options });
      if (result && result.tabId) {
        this.activeTabs.set(result.tabId, {
          id: result.tabId,
          url,
          title: "Loading...",
          isLoading: true,
          canGoBack: false,
          canGoForward: false,
          created: Date.now()
        });
        console.log(`[WebContentsManager] Tab created successfully: ${result.tabId}`);
        return result.tabId;
      } else {
        throw new Error("Failed to create tab: no tabId returned");
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
      const result = await window.electronAPI.invoke("browser-switch-tab", { tabId });
      if (result && result.id === tabId) {
        this.currentTabId = tabId;
        this.emit("tab-switched", { tabId, tab: this.activeTabs.get(tabId) });
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
      const result = await window.electronAPI.invoke("browser-close-tab", { tabId });
      if (result && result.success) {
        this.activeTabs.delete(tabId);
        if (this.currentTabId === tabId) {
          this.currentTabId = null;
        }
        this.emit("tab-closed", { tabId });
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
    console.log(`[WebContentsManager] Executing script via IPC in tab: ${tabId || "current"}`);
    try {
      return await window.electronAPI.invoke("browser-execute-script", { script, tabId });
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
      const result = await window.electronAPI.invoke("browser-load-url", { url, tabId });
      if (result && result.success) {
        const targetTabId = result.tabId || this.currentTabId;
        const tab = this.activeTabs.get(targetTabId);
        if (tab) {
          tab.url = url;
          tab.isLoading = false;
        }
        this.emit("url-loaded", { tabId: targetTabId, url, tab });
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
    console.log(`[WebContentsManager] Going back via IPC: ${tabId || "current"}`);
    try {
      return await window.electronAPI.invoke("browser-go-back", { tabId });
    } catch (error) {
      console.error(`[WebContentsManager] Failed to go back:`, error);
      return false;
    }
  }
  async goForward(tabId = null) {
    console.log(`[WebContentsManager] Going forward via IPC: ${tabId || "current"}`);
    try {
      return await window.electronAPI.invoke("browser-go-forward", { tabId });
    } catch (error) {
      console.error(`[WebContentsManager] Failed to go forward:`, error);
      return false;
    }
  }
  async reload(tabId = null) {
    console.log(`[WebContentsManager] Reloading via IPC: ${tabId || "current"}`);
    try {
      return await window.electronAPI.invoke("browser-reload", { tabId });
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
    try {
      if (window.electronAPI && window.electronAPI.invoke) {
        return window.electronAPI.invoke("browser-get-navigation-state", { tabId }).catch((error) => {
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
        url: "about:blank",
        title: "No Tab"
      };
    }
    return {
      canGoBack: tab.canGoBack || false,
      canGoForward: tab.canGoForward || false,
      isLoading: tab.isLoading || false,
      url: tab.url || "about:blank",
      title: tab.title || "No Tab"
    };
  }
  /**
   * Update WebContentsView bounds (delegates to main process)
   */
  updateWebContentsViewBounds(preciseBounds = null) {
    console.log(`[WebContentsManager] Updating bounds via IPC:`, preciseBounds);
    try {
      if (window.electronAPI && window.electronAPI.invoke) {
        window.electronAPI.invoke("browser-update-bounds", preciseBounds).then(() => {
          console.log(`[WebContentsManager] Bounds updated successfully`);
        }).catch((error) => {
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
      this.eventHandlers.set(event, /* @__PURE__ */ new Set());
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
      this.eventHandlers.get(event).forEach((handler) => {
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
    console.log("[WebContentsManager] Starting cleanup...");
    for (const tabId of this.activeTabs.keys()) {
      try {
        this.closeTab(tabId);
      } catch (error) {
        console.error(`[WebContentsManager] Error closing tab ${tabId}:`, error);
      }
    }
    this.activeTabs.clear();
    this.webContentsViews.clear();
    this.eventHandlers.clear();
    this.currentTabId = null;
    this.mainWindow = null;
    this.baseWindow = null;
    console.log("[WebContentsManager] Destroyed and cleaned up");
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
      chatContainer: document.getElementById("chat-component-container")
    };
    console.log("[UIManager] Cached DOM elements:", Object.keys(this.elements));
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
      this.elements.workspaceLayout.style.flexDirection = "column";
      this.elements.workspaceLayout.style.gap = "8px";
    }
    if (this.elements.browserContainer) {
      this.elements.browserContainer.style.minHeight = "300px";
    }
    if (this.elements.chatContainer) {
      this.elements.chatContainer.style.minHeight = "200px";
    }
    console.log("[UIManager] 📱 Mobile layout applied");
  }
  /**
   * Apply tablet-specific layout adjustments
   */
  applyTabletLayout() {
    if (this.elements.workspaceLayout) {
      this.elements.workspaceLayout.style.flexDirection = "column";
      this.elements.workspaceLayout.style.gap = "12px";
    }
    console.log("[UIManager] 📱 Tablet layout applied");
  }
  /**
   * Apply desktop-specific layout adjustments
   */
  applyDesktopLayout() {
    if (this.elements.workspaceLayout) {
      this.elements.workspaceLayout.style.flexDirection = "row";
      this.elements.workspaceLayout.style.gap = "16px";
    }
    console.log("[UIManager] 🖥️ Desktop layout applied");
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
      "Alt+3": () => this.switchWorkspace("future")
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
    if (!document.getElementById("ui-animations")) {
      const style = document.createElement("style");
      style.id = "ui-animations";
      style.textContent = `
        .ui-transition {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .ui-smooth-transition {
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .ui-fade-in {
          animation: uiFadeIn 0.4s ease-out;
        }
        
        .ui-fade-out {
          animation: uiFadeOut 0.4s ease-out;
        }
        
        .ui-slide-up {
          animation: uiSlideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .ui-slide-down {
          animation: uiSlideDown 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes uiFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes uiFadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-20px); }
        }
        
        @keyframes uiSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes uiSlideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
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
        this.updateWorkspaceUI(workspace);
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
    this.updateWorkspaceUI(toWorkspace);
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
      }
      if (this.elements.workspaceTabs) {
        this.elements.workspaceTabs.classList.add("show");
        console.log("[UIManager] ✅ workspaceTabs show class added");
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
      opacity: this.elements.mainContent ? window.getComputedStyle(this.elements.mainContent).opacity : "N/A"
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
    if (!document.getElementById("notification-styles")) {
      const style = document.createElement("style");
      style.id = "notification-styles";
      style.textContent = `
        .ui-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 20px;
          border-radius: 6px;
          color: white;
          font-weight: 500;
          z-index: 10000;
          animation: uiSlideDown 0.3s ease-out;
        }
        .ui-notification-info { background: #3b82f6; }
        .ui-notification-success { background: #10b981; }
        .ui-notification-warning { background: #f59e0b; }
        .ui-notification-error { background: #ef4444; }
      `;
      document.head.appendChild(style);
    }
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
      animationsEnabled: this.options.animations
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
    window.removeEventListener("resize", this.handleResize);
    this.uiComponents.clear();
    const animationStyles = document.getElementById("ui-animations");
    if (animationStyles) animationStyles.remove();
    const notificationStyles = document.getElementById("notification-styles");
    if (notificationStyles) notificationStyles.remove();
    this.isInitialized = false;
    this.eventTarget = null;
    console.log("[UIManager] 🗑️ UI Manager destroyed");
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
    this.setMaxListeners(this.options.maxListeners);
  }
  /**
   * Initialize event bus
   */
  async initialize() {
    try {
      console.log("[EventBus] Initializing...");
      this.isInitialized = true;
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
   * Destroy event bus
   */
  destroy() {
    this.removeAllListeners();
    this.eventHistory = [];
    this.moduleSubscriptions.clear();
    this.isInitialized = false;
    console.log("[EventBus] Destroyed");
  }
}
new EventBus();
window.addEventListener("error", (event) => {
  console.error("💥 [RENDERER CRASH] Global error:", event.error);
});
window.addEventListener("unhandledrejection", (event) => {
  console.error("💥 [RENDERER CRASH] Unhandled promise rejection:", event.reason);
});
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[RENDERER] DOMContentLoaded: Initializing EG-Desk");
  try {
    let updateUIForWorkspace2 = function(workspace) {
      console.log(`[RENDERER] Updating UI for workspace: ${workspace}`);
      document.querySelectorAll(".tab").forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.workspace === workspace);
      });
      const startScreen = document.getElementById("start-screen");
      const mainContent = document.getElementById("main-content");
      const workspaceTabs = document.querySelector(".workspace-tabs");
      if (!startScreen || !mainContent || !workspaceTabs) {
        console.error("[RENDERER] Could not find essential DOM elements for UI update.");
        return;
      }
      if (workspace === "start") {
        startScreen.style.display = "flex";
        mainContent.classList.remove("active");
        workspaceTabs.classList.remove("show");
        console.log("[RENDERER] Start screen displayed, main content and tabs hidden.");
      } else {
        startScreen.style.display = "none";
        mainContent.classList.add("active");
        workspaceTabs.classList.add("show");
        console.log(`[RENDERER] Main content and tabs shown for workspace: ${workspace}`);
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
      console.log("[RENDERER] Creating WebContentsManager instance...");
      const webContentsManager = new WebContentsManager();
      await webContentsManager.initialize();
      console.log("[RENDERER] Creating WorkspaceManager instance...");
      window.workspaceManager = new WorkspaceManager(webContentsManager);
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
        await window.uiManager.switchWorkspace(workspace);
        console.log(`[WORKSPACE-SWITCH:${switchId}] UIManager transition completed`);
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
    console.log("[RENDERER] EG-Desk initialization complete.");
  } catch (error) {
    console.error("💥 [RENDERER CRASH] Initialization failed:", error);
    if (window.electronAPI?.log?.error) {
      window.electronAPI.log.error(`Renderer crash: ${error.message}`);
    }
  }
  async function initializeBlogWorkspace() {
    console.log("[RENDERER] Initializing Blog Workspace with components...");
    initializeTerminalFromIndex();
    console.log("[RENDERER] Blog Workspace initialization complete - components handled by WorkspaceManager.");
  }
  function initializeTerminalFromIndex() {
    console.log("[RENDERER] Terminal initialization delegated to ChatComponent via WorkspaceManager");
  }
});
