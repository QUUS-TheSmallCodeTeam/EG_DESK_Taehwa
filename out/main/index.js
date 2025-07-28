"use strict";
const electron = require("electron");
const child_process = require("child_process");
const path = require("path");
const url = require("url");
const Store = require("electron-store");
const events = require("events");
class WebContentsManager extends events.EventEmitter {
  constructor() {
    super();
    this.mainWindow = null;
    this.webContentsViews = /* @__PURE__ */ new Map();
    this.currentTabId = null;
    this.isInitialized = false;
  }
  /**
   * Initialize WebContentsManager with main window
   */
  initialize(mainWindow) {
    console.log("[WebContentsManager] Initialized with main window");
    this.mainWindow = mainWindow;
    this.isInitialized = true;
  }
  /**
   * Create a new tab with WebContentsView
   */
  async createTab(url2 = "about:blank") {
    if (!this.isInitialized) {
      throw new Error("WebContentsManager not initialized");
    }
    const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    console.log(`[WebContentsManager] Creating tab: ${tabId} with URL: ${url2}`);
    try {
      const webContentsView = new electron.WebContentsView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false,
          // Disable web security for development
          sandbox: false,
          // Disable sandbox for better compatibility
          // Handle certificate errors and improve SSL handling
          allowRunningInsecureContent: true,
          // Allow insecure content
          experimentalFeatures: false,
          // Improve rendering performance
          enableRemoteModule: false,
          // Better resource management
          backgroundThrottling: false,
          // Additional settings for better web content loading
          webgl: true,
          plugins: true,
          javascript: true
        }
      });
      console.log(`[WebContentsManager] Created WebContentsView for tab: ${tabId}`);
      this.setupWebContentsEvents(webContentsView, tabId);
      this.webContentsViews.set(tabId, webContentsView);
      await webContentsView.webContents.loadURL(url2);
      console.log(`[WebContentsManager] Tab created successfully: ${tabId}`);
      this.emit("tab-created", { tabId, url: url2 });
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
      try {
        if (this.mainWindow.contentView) {
          this.mainWindow.contentView.addChildView(newView);
          console.log(`[WebContentsManager] Added WebContentsView: ${tabId}`);
          setTimeout(() => {
            if (this.lastRequestedBounds) {
              console.log(`[WebContentsManager] Applying delayed bounds:`, this.lastRequestedBounds);
              this.setWebContentsViewBounds(newView, this.lastRequestedBounds);
            } else {
              this.setWebContentsViewBounds(newView);
            }
          }, 100);
        } else {
          console.error(`[WebContentsManager] mainWindow.contentView not available`);
          throw new Error("MainWindow contentView API not available");
        }
      } catch (addError) {
        console.error(`[WebContentsManager] Failed to add view to window:`, addError);
        throw addError;
      }
      this.currentTabId = tabId;
      console.log(`[WebContentsManager] Switched to tab: ${tabId}`);
      this.emit("tab-switched", { tabId });
      return { id: tabId };
    } catch (error) {
      console.error(`[WebContentsManager] Failed to switch tab:`, error);
      throw error;
    }
  }
  /**
   * Load URL in current or specified tab
   */
  async loadURL(url2, tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    if (!targetTabId || !this.webContentsViews.has(targetTabId)) {
      throw new Error("No active tab to load URL");
    }
    console.log(`[WebContentsManager] Loading URL: ${url2} in tab: ${targetTabId}`);
    try {
      const webContentsView = this.webContentsViews.get(targetTabId);
      await webContentsView.webContents.loadURL(url2);
      console.log(`[WebContentsManager] URL loaded successfully: ${url2}`);
      this.emit("url-loaded", { tabId: targetTabId, url: url2 });
      return { success: true, url: url2, tabId: targetTabId };
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
      throw new Error("No active tab for navigation");
    }
    const webContentsView = this.webContentsViews.get(targetTabId);
    if (webContentsView.webContents.canGoBack()) {
      webContentsView.webContents.goBack();
      console.log(`[WebContentsManager] Navigated back in tab: ${targetTabId}`);
      return { success: true };
    } else {
      console.log(`[WebContentsManager] Cannot go back in tab: ${targetTabId}`);
      return { success: false, reason: "Cannot go back" };
    }
  }
  /**
   * Navigate forward
   */
  async goForward(tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    if (!targetTabId || !this.webContentsViews.has(targetTabId)) {
      throw new Error("No active tab for navigation");
    }
    const webContentsView = this.webContentsViews.get(targetTabId);
    if (webContentsView.webContents.canGoForward()) {
      webContentsView.webContents.goForward();
      console.log(`[WebContentsManager] Navigated forward in tab: ${targetTabId}`);
      return { success: true };
    } else {
      console.log(`[WebContentsManager] Cannot go forward in tab: ${targetTabId}`);
      return { success: false, reason: "Cannot go forward" };
    }
  }
  /**
   * Reload current tab
   */
  async reload(tabId = null) {
    const targetTabId = tabId || this.currentTabId;
    if (!targetTabId || !this.webContentsViews.has(targetTabId)) {
      throw new Error("No active tab to reload");
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
      throw new Error("No active tab to execute script");
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
        url: "about:blank",
        title: "No Tab"
      };
    }
    const webContentsView = this.webContentsViews.get(targetTabId);
    const webContents = webContentsView.webContents;
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
      console.log("[WebContentsManager] Using precise bounds for view:", targetBounds);
    } else {
      const windowBounds = this.mainWindow.getBounds();
      targetBounds = {
        x: 0,
        y: 0,
        width: windowBounds.width,
        height: windowBounds.height
      };
      console.log("[WebContentsManager] Using full window bounds for view:", targetBounds);
    }
    try {
      if (typeof webContentsView.setBounds === "function") {
        webContentsView.setBounds(targetBounds);
        console.log("[WebContentsManager] Explicit bounds set for WebContentsView:", targetBounds);
      } else {
        console.log("[WebContentsManager] WebContentsView bounds managed automatically, target bounds:", targetBounds);
        this.lastRequestedBounds = targetBounds;
      }
    } catch (error) {
      console.warn("[WebContentsManager] Failed to set explicit bounds:", error.message);
    }
  }
  /**
   * Update WebContentsView bounds to match browser viewport area
   * Note: WebContentsView in Electron 37+ uses automatic positioning within contentView
   */
  updateWebContentsViewBounds(preciseBounds = null) {
    if (!this.currentTabId || !this.webContentsViews.has(this.currentTabId)) {
      console.log("[WebContentsManager] No active tab to update bounds");
      return;
    }
    const webContentsView = this.webContentsViews.get(this.currentTabId);
    if (preciseBounds) {
      console.log("[WebContentsManager] Precise bounds received from component:", preciseBounds);
      this.lastRequestedBounds = preciseBounds;
    } else {
      const windowBounds = this.mainWindow.getBounds();
      const estimatedBounds = {
        x: 20,
        // Left margin + border
        y: 140,
        // Title bar + header + browser controls
        width: Math.max(windowBounds.width - 320, 400),
        // Leave space for chat
        height: Math.max(windowBounds.height - 200, 300)
        // Leave space for controls
      };
      console.log("[WebContentsManager] Estimated default bounds:", estimatedBounds);
      this.lastRequestedBounds = estimatedBounds;
    }
    this.setWebContentsViewBounds(webContentsView, this.lastRequestedBounds);
  }
  /**
   * Set up WebContents event handlers
   */
  setupWebContentsEvents(webContentsView, tabId) {
    const webContents = webContentsView.webContents;
    webContents.on("did-navigate", (event, url2) => {
      console.log(`[WebContentsManager] Tab ${tabId} navigated to: ${url2}`);
      this.emit("navigation", { tabId, url: url2, type: "navigate" });
    });
    webContents.on("did-navigate-in-page", (event, url2) => {
      console.log(`[WebContentsManager] Tab ${tabId} navigated in page to: ${url2}`);
      this.emit("navigation", { tabId, url: url2, type: "navigate-in-page" });
    });
    webContents.on("did-finish-load", () => {
      const title = webContents.getTitle();
      const url2 = webContents.getURL();
      console.log(`[WebContentsManager] Tab ${tabId} finished loading: ${title}`);
      this.emit("loading-finished", { tabId, title, url: url2 });
    });
    webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
      console.error(`[WebContentsManager] Tab ${tabId} failed to load: ${errorDescription}`);
      this.emit("loading-failed", { tabId, errorCode, errorDescription, url: validatedURL });
    });
    webContents.on("page-title-updated", (event, title) => {
      console.log(`[WebContentsManager] Tab ${tabId} title updated: ${title}`);
      this.emit("title-updated", { tabId, title });
    });
    webContents.on("certificate-error", (event, url2, error, certificate, callback) => {
      console.warn(`[WebContentsManager] Certificate error for ${url2}: ${error}`);
      event.preventDefault();
      callback(true);
      console.log(`[WebContentsManager] Certificate error bypassed for: ${url2}`);
    });
    webContents.on("did-start-loading", () => {
      console.log(`[WebContentsManager] Tab ${tabId} started loading`);
      this.emit("loading-started", { tabId });
    });
    webContents.on("did-stop-loading", () => {
      console.log(`[WebContentsManager] Tab ${tabId} stopped loading`);
      this.emit("loading-stopped", { tabId });
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
    if (this.currentTabId === tabId) {
      try {
        if (this.mainWindow.contentView && this.mainWindow.contentView.children.includes(webContentsView)) {
          this.mainWindow.contentView.removeChildView(webContentsView);
          console.log(`[WebContentsManager] Removed view from window with contentView: ${tabId}`);
        } else if (typeof this.mainWindow.setBrowserView === "function") {
          this.mainWindow.setBrowserView(null);
          console.log(`[WebContentsManager] Removed view from window with setBrowserView: ${tabId}`);
        }
      } catch (e) {
        console.warn(`[WebContentsManager] Could not remove view from window:`, e.message);
      }
      this.currentTabId = null;
    }
    webContentsView.webContents.close();
    this.webContentsViews.delete(tabId);
    console.log(`[WebContentsManager] Tab closed: ${tabId}`);
    this.emit("tab-closed", { tabId });
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
    console.log("[WebContentsManager] Starting cleanup...");
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
    this.removeAllListeners();
    console.log("[WebContentsManager] Destroyed and cleaned up");
  }
}
const __dirname$1 = path.dirname(url.fileURLToPath(require("url").pathToFileURL(__filename).href));
const store = new Store();
process.on("uncaughtException", (error) => {
  console.error("💥 [FATAL] Uncaught Exception:", error);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 [FATAL] Unhandled Rejection at:", promise, "reason:", reason);
});
electron.app.on("render-process-gone", (event, webContents, details) => {
  console.error("💥 [FATAL] Render process gone:", details);
});
class EGDeskTaehwa {
  constructor() {
    this.mainWindow = null;
    this.webContentsManager = new WebContentsManager();
    this.currentWorkspace = "start";
    this.currentTabId = null;
    this.setupApp();
  }
  setupApp() {
    electron.app.whenReady().then(() => {
      console.log("🚀 Electron 앱 시작됨");
      this.createMainWindow();
      this.setupMenu();
      this.setupIPC();
    });
    electron.app.on("window-all-closed", () => {
      console.log("🔴 모든 창이 닫힘");
      if (process.platform !== "darwin") {
        electron.app.quit();
      }
    });
    electron.app.on("activate", () => {
      console.log("🔵 앱 활성화됨");
      if (electron.BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }
  createMainWindow() {
    console.log("📱 Main Window 생성 시작");
    this.mainWindow = new electron.BrowserWindow({
      width: 1600,
      height: 1e3,
      minWidth: 1280,
      minHeight: 800,
      titleBarStyle: "hiddenInset",
      title: "",
      icon: path.join(__dirname$1, "assets/icon.png"),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname$1, "../preload/index.js"),
        webSecurity: true,
        sandbox: false
        // Allow JavaScript execution in renderer
      },
      show: false
    });
    if (process.env.VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      const rendererPath = path.join(__dirname$1, "../renderer/index.html");
      console.log(`🔍 Loading renderer from: ${rendererPath}`);
      this.mainWindow.loadFile(rendererPath);
    }
    this.initializeWebContentsManager();
    this.mainWindow.once("ready-to-show", () => {
      console.log("🎉 Main Window 표시 준비 완료");
      this.mainWindow.show();
    });
    this.mainWindow.webContents.once("did-finish-load", () => {
      console.log("✅ 페이지 로딩 완료");
    });
    this.mainWindow.on("closed", () => {
      console.log("❌ Main Window 닫힘");
      this.webContentsManager.destroy();
      this.mainWindow = null;
    });
    this.mainWindow.webContents.on("render-process-gone", (event, details) => {
      console.error("💥 [CRASH] Render process gone:", details);
      console.error("💥 [CRASH] Reason:", details.reason);
      console.error("💥 [CRASH] Exit code:", details.exitCode);
    });
    this.mainWindow.on("unresponsive", () => {
      console.error("💥 [CRASH] Window became unresponsive!");
    });
    console.log("📱 Main Window 생성 완료");
  }
  initializeWebContentsManager() {
    console.log("🌐 WebContentsManager 초기화");
    this.webContentsManager.initialize(this.mainWindow);
  }
  async setupBlogWorkspace() {
    console.log("🚀 블로그 워크스페이스 설정");
    try {
      const tabId = await this.webContentsManager.createTab("https://m8chaa.mycafe24.com/");
      await this.webContentsManager.switchTab(tabId);
      this.currentTabId = tabId;
      console.log(`[EGDeskTaehwa] Blog workspace ready with tab ${tabId} - bounds will be updated by BrowserTabComponent`);
    } catch (error) {
      console.error("[EGDeskTaehwa] Failed to setup blog workspace:", error);
    }
  }
  hideWebContentsView() {
    console.log("🙈 WebContents View 숨김");
    if (this.currentTabId && this.webContentsManager) {
      try {
        const currentView = this.webContentsManager.webContentsViews.get(this.currentTabId);
        if (currentView) {
          if (this.mainWindow.contentView && this.mainWindow.contentView.children.includes(currentView)) {
            this.mainWindow.contentView.removeChildView(currentView);
            console.log("🙈 Successfully removed WebContentsView with contentView");
          } else if (typeof this.mainWindow.setBrowserView === "function") {
            this.mainWindow.setBrowserView(null);
            console.log("🙈 Successfully removed WebContentsView with setBrowserView");
          }
        }
      } catch (error) {
        console.error("🙈 Failed to remove WebContentsView:", error);
      }
    }
    this.currentTabId = null;
  }
  setupWebContentsEvents() {
    this.webContentsManager.on("navigation", (data) => {
      console.log("🧭 Browser 네비게이션:", data.url);
      this.mainWindow.webContents.send("browser-navigated", data);
    });
    this.webContentsManager.on("loading-failed", (data) => {
      console.error("❌ Browser 로드 실패:", data.errorDescription);
      this.mainWindow.webContents.send("browser-load-failed", data);
    });
    this.webContentsManager.on("loading-finished", (data) => {
      console.log("✅ Browser 로드 완료");
      this.mainWindow.webContents.send("browser-load-finished", data);
    });
    this.webContentsManager.on("loading-started", (data) => {
      console.log("🔄 Browser 로드 시작");
      this.mainWindow.webContents.send("browser-load-started", data);
    });
    this.webContentsManager.on("loading-stopped", (data) => {
      console.log("⏹️ Browser 로드 중지");
      this.mainWindow.webContents.send("browser-load-stopped", data);
    });
  }
  setupMenu() {
    const template = [
      {
        label: "파일",
        submenu: [
          {
            label: "새 워크플로우",
            accelerator: "CmdOrCtrl+N",
            click: () => {
              this.mainWindow.webContents.send("menu-new-workflow", { type: "menu-new-workflow" });
            }
          },
          { type: "separator" },
          {
            label: "설정",
            accelerator: "CmdOrCtrl+,",
            click: () => {
              this.mainWindow.webContents.send("menu-settings", { type: "menu-settings" });
            }
          },
          { type: "separator" },
          {
            label: "종료",
            accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
            click: () => {
              electron.app.quit();
            }
          }
        ]
      },
      {
        label: "편집",
        submenu: [
          { label: "실행 취소", accelerator: "CmdOrCtrl+Z", role: "undo" },
          { label: "다시 실행", accelerator: "Shift+CmdOrCtrl+Z", role: "redo" },
          { type: "separator" },
          { label: "잘라내기", accelerator: "CmdOrCtrl+X", role: "cut" },
          { label: "복사", accelerator: "CmdOrCtrl+C", role: "copy" },
          { label: "붙여넣기", accelerator: "CmdOrCtrl+V", role: "paste" }
        ]
      },
      {
        label: "보기",
        submenu: [
          { label: "새로고침", accelerator: "CmdOrCtrl+R", role: "reload" },
          { label: "강제 새로고침", accelerator: "CmdOrCtrl+Shift+R", role: "forceReload" },
          { label: "개발자 도구", accelerator: "F12", role: "toggleDevTools" },
          { type: "separator" },
          { label: "실제 크기", accelerator: "CmdOrCtrl+0", role: "resetZoom" },
          { label: "확대", accelerator: "CmdOrCtrl+Plus", role: "zoomIn" },
          { label: "축소", accelerator: "CmdOrCtrl+-", role: "zoomOut" },
          { type: "separator" },
          { label: "전체화면", accelerator: "F11", role: "togglefullscreen" }
        ]
      },
      {
        label: "워크플로우",
        submenu: [
          {
            label: "블로그 자동화",
            accelerator: "CmdOrCtrl+B",
            click: () => {
              this.mainWindow.webContents.send("switch-to-blog-workflow", { type: "switch-to-blog-workflow" });
            }
          },
          {
            label: "메인 워크스페이스",
            accelerator: "CmdOrCtrl+M",
            click: () => {
              this.mainWindow.webContents.send("switch-to-main-workspace", { type: "switch-to-main-workspace" });
            }
          }
        ]
      }
    ];
    const menu = electron.Menu.buildFromTemplate(template);
    electron.Menu.setApplicationMenu(menu);
  }
  setupIPC() {
    console.log("[MAIN] Setting up IPC handlers");
    electron.ipcMain.handle("store-get", (event, key) => {
      console.log(`[MAIN] IPC store-get: ${key}`);
      return store.get(key);
    });
    electron.ipcMain.handle("store-set", (event, key, value) => {
      console.log(`[MAIN] IPC store-set: ${key}`);
      store.set(key, value);
      return true;
    });
    electron.ipcMain.handle("terminal-log", (event, message, level = "log") => {
      const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
      const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "📝";
      console[level](`${prefix} [${timestamp}] ${message}`);
    });
    electron.ipcMain.handle("switch-workspace", async (event, workspace) => {
      console.log(`[MAIN] IPC switch-workspace received: ${workspace}`);
      this.currentWorkspace = workspace;
      if (workspace === "blog") {
        console.log("[MAIN] Setting up blog workspace");
        await this.setupBlogWorkspace();
      } else {
        console.log("[MAIN] Hiding web contents view");
        this.hideWebContentsView();
      }
      console.log(`[MAIN] Workspace switched to ${workspace}`);
      return { success: true, workspace };
    });
    electron.ipcMain.handle("browser-create-tab", async (event, { url: url2, options }) => {
      console.log(`[MAIN] IPC browser-create-tab: ${url2}`);
      try {
        const tabId = await this.webContentsManager.createTab(url2, options);
        console.log(`[MAIN] Browser tab created: ${tabId}`);
        return { success: true, tabId, url: url2 };
      } catch (error) {
        console.error(`[MAIN] Browser tab creation failed: ${error}`);
        throw error;
      }
    });
    electron.ipcMain.handle("browser-switch-tab", async (event, { tabId }) => {
      console.log(`[MAIN] IPC browser-switch-tab: ${tabId}`);
      try {
        const result = await this.webContentsManager.switchTab(tabId);
        console.log(`[MAIN] Browser tab switched: ${tabId}`);
        return result;
      } catch (error) {
        console.error(`[MAIN] Browser tab switch failed: ${error}`);
        throw error;
      }
    });
    electron.ipcMain.handle("browser-load-url", async (event, { url: url2, tabId }) => {
      console.log(`[MAIN] IPC browser-load-url: ${url2} in tab: ${tabId || "current"}`);
      try {
        const result = await this.webContentsManager.loadURL(url2, tabId);
        console.log(`[MAIN] Browser URL loaded: ${url2}`);
        return result;
      } catch (error) {
        console.error(`[MAIN] Browser URL load failed: ${error}`);
        throw error;
      }
    });
    electron.ipcMain.handle("browser-go-back", async (event, { tabId } = {}) => {
      console.log(`[MAIN] IPC browser-go-back for tab: ${tabId || "current"}`);
      return await this.webContentsManager.goBack(tabId);
    });
    electron.ipcMain.handle("browser-go-forward", async (event, { tabId } = {}) => {
      console.log(`[MAIN] IPC browser-go-forward for tab: ${tabId || "current"}`);
      return await this.webContentsManager.goForward(tabId);
    });
    electron.ipcMain.handle("browser-reload", async (event, { tabId } = {}) => {
      console.log(`[MAIN] IPC browser-reload for tab: ${tabId || "current"}`);
      return await this.webContentsManager.reload(tabId);
    });
    electron.ipcMain.handle("browser-can-go-back", (event) => {
      const state = this.webContentsManager.getNavigationState();
      return state.canGoBack;
    });
    electron.ipcMain.handle("browser-can-go-forward", (event) => {
      const state = this.webContentsManager.getNavigationState();
      return state.canGoForward;
    });
    electron.ipcMain.handle("browser-get-url", (event) => {
      const state = this.webContentsManager.getNavigationState();
      return state.url;
    });
    electron.ipcMain.handle("browser-execute-script", async (event, { script, tabId }) => {
      console.log(`[MAIN] IPC browser-execute-script in tab: ${tabId || "current"}`);
      try {
        return await this.webContentsManager.executeScript(script, tabId);
      } catch (error) {
        console.error("[MAIN] Script execution failed:", error);
        throw error;
      }
    });
    electron.ipcMain.handle("browser-get-navigation-state", (event, { tabId } = {}) => {
      console.log(`[MAIN] IPC browser-get-navigation-state for tab: ${tabId || "current"}`);
      return this.webContentsManager.getNavigationState(tabId);
    });
    electron.ipcMain.handle("browser-close-tab", async (event, { tabId }) => {
      console.log(`[MAIN] IPC browser-close-tab: ${tabId}`);
      try {
        this.webContentsManager.closeTab(tabId);
        console.log(`[MAIN] Browser tab closed: ${tabId}`);
        return { success: true, tabId };
      } catch (error) {
        console.error(`[MAIN] Browser tab close failed: ${error}`);
        throw error;
      }
    });
    electron.ipcMain.handle("browser-update-bounds", (event, bounds) => {
      console.log(`[MAIN] IPC browser-update-bounds:`, bounds);
      try {
        this.webContentsManager.updateWebContentsViewBounds(bounds);
        return { success: true };
      } catch (error) {
        console.error(`[MAIN] Failed to update browser bounds:`, error);
        throw error;
      }
    });
    electron.ipcMain.handle("execute-command", async (event, command) => {
      console.log(`[MAIN] IPC execute-command: ${command}`);
      return new Promise((resolve) => {
        if (command.startsWith("claude ")) {
          child_process.exec(`./${command}`, { cwd: __dirname$1 }, (error, stdout, stderr) => {
            if (error) {
              console.error(`[MAIN] Execution error: ${error}`);
              resolve({ success: false, error: stderr || error.message });
              return;
            }
            console.log(`[MAIN] Command output: ${stdout}`);
            resolve({ success: true, data: stdout });
          });
        } else {
          console.warn(`[MAIN] Disallowed command: ${command}`);
          resolve({ success: false, error: "This command is not allowed." });
        }
      });
    });
    electron.ipcMain.on("window-minimize", () => {
      console.log("[MAIN] Minimizing window");
      this.mainWindow.minimize();
    });
    electron.ipcMain.on("window-maximize", () => {
      console.log("[MAIN] Maximizing/unmaximizing window");
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    });
    electron.ipcMain.on("window-close", () => {
      console.log("[MAIN] Closing window");
      this.mainWindow.close();
    });
    this.setupWebContentsEvents();
  }
}
new EGDeskTaehwa();
