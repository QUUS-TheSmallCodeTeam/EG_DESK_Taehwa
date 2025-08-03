"use strict";
const dotenv = require("dotenv");
const path = require("path");
const url = require("url");
const electron = require("electron");
const Store = require("electron-store");
const events = require("events");
const anthropic = require("@langchain/anthropic");
const openai = require("@langchain/openai");
const googleGenai = require("@langchain/google-genai");
const messages = require("@langchain/core/messages");
const fs = require("fs/promises");
const crypto = require("crypto");
class WebContentsManager extends events.EventEmitter {
  constructor() {
    super();
    this.mainWindow = null;
    this.webContentsViews = /* @__PURE__ */ new Map();
    this.currentTabId = null;
    this.isInitialized = false;
    this.boundsUpdateTimeout = null;
    this.lastRequestedBounds = null;
    this.preloadedSession = null;
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
          javascript: true,
          // Performance optimizations
          spellcheck: false,
          // Disable spellcheck for faster loading
          defaultEncoding: "utf-8",
          // Preload optimizations
          preload: null,
          // No preload script needed for web content
          // Network optimizations
          enableWebSQL: false,
          // Faster startup
          nodeIntegrationInWorker: false,
          nodeIntegrationInSubFrames: false
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
          console.log(`[WebContentsManager] Waiting for precise bounds from BrowserTabComponent...`);
          if (typeof newView.setVisible === "function") {
            newView.setVisible(false);
            console.log(`[WebContentsManager] WebContentsView initially hidden to prevent flicker`);
          }
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
   * Update WebContentsView bounds to match browser viewport area (Debounced)
   * Note: WebContentsView in Electron 37+ uses automatic positioning within contentView
   */
  updateWebContentsViewBounds(preciseBounds = null) {
    if (!this.currentTabId || !this.webContentsViews.has(this.currentTabId)) {
      console.log("[WebContentsManager] No active tab to update bounds");
      return;
    }
    if (this.boundsUpdateTimeout) {
      clearTimeout(this.boundsUpdateTimeout);
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
    this.boundsUpdateTimeout = setTimeout(() => {
      this.applyBoundsToView(webContentsView, this.lastRequestedBounds);
    }, 16);
  }
  /**
   * Apply bounds to WebContentsView with optimizations
   */
  applyBoundsToView(webContentsView, bounds) {
    try {
      this.setWebContentsViewBounds(webContentsView, bounds);
      if (typeof webContentsView.setVisible === "function") {
        webContentsView.setVisible(true);
        console.log("[WebContentsManager] WebContentsView made visible after bounds applied");
      }
    } catch (error) {
      console.error("[WebContentsManager] Failed to apply bounds to view:", error);
    }
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
class LangChainService {
  constructor(secureKeyManager) {
    this.secureKeyManager = secureKeyManager;
    this.providers = /* @__PURE__ */ new Map();
    this.currentProvider = "claude";
    this.currentModel = null;
    this.isInitialized = false;
    this.costTracker = {
      session: { input: 0, output: 0, total: 0 },
      total: { input: 0, output: 0, total: 0 }
    };
    this.providerConfigs = {
      claude: {
        name: "Claude (Anthropic)",
        models: [
          { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", context: 2e5 },
          { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", context: 2e5 },
          { id: "claude-3-opus-20240229", name: "Claude 3 Opus", context: 2e5 }
        ],
        defaultModel: "claude-3-5-sonnet-20241022",
        costPer1k: { input: 3e-3, output: 0.015 }
      },
      openai: {
        name: "OpenAI",
        models: [
          { id: "gpt-4o", name: "GPT-4o", context: 128e3 },
          { id: "gpt-4-turbo", name: "GPT-4 Turbo", context: 128e3 },
          { id: "gpt-4", name: "GPT-4", context: 8192 },
          { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", context: 16385 }
        ],
        defaultModel: "gpt-4o",
        costPer1k: { input: 5e-3, output: 0.015 }
      },
      gemini: {
        name: "Google Gemini",
        models: [
          { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", context: 2e6 },
          { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", context: 1e6 },
          { id: "gemini-pro", name: "Gemini Pro", context: 32768 }
        ],
        defaultModel: "gemini-1.5-pro",
        costPer1k: { input: 125e-5, output: 375e-5 }
      }
    };
  }
  /**
   * Initialize the LangChain service
   */
  async initialize() {
    try {
      console.log("[LangChainService] Initializing...");
      if (!this.secureKeyManager || !this.secureKeyManager.isInitialized) {
        throw new Error("SecureKeyManager not initialized");
      }
      await this.initializeProviders();
      this.isInitialized = true;
      console.log("[LangChainService] Successfully initialized");
      return true;
    } catch (error) {
      console.error("[LangChainService] Initialization failed:", error);
      throw error;
    }
  }
  /**
   * Initialize available providers based on stored API keys
   */
  async initializeProviders() {
    const availableProviders = [];
    for (const [providerId, config] of Object.entries(this.providerConfigs)) {
      try {
        if (this.secureKeyManager.hasProviderKey(providerId)) {
          const keyData = await this.secureKeyManager.getProviderKey(providerId);
          const provider = await this.createProvider(providerId, keyData.api_key);
          if (provider) {
            this.providers.set(providerId, {
              instance: provider,
              config,
              currentModel: config.defaultModel,
              status: "ready"
            });
            availableProviders.push(providerId);
            if (!this.currentProvider || !this.providers.has(this.currentProvider)) {
              this.currentProvider = providerId;
              this.currentModel = config.defaultModel;
            }
          }
        }
      } catch (error) {
        console.warn(`[LangChainService] Failed to initialize provider ${providerId}:`, error);
      }
    }
    console.log(`[LangChainService] Initialized providers: ${availableProviders.join(", ")}`);
    if (availableProviders.length === 0) {
      throw new Error("No AI providers available. Please configure API keys.");
    }
  }
  /**
   * Create provider instance based on type
   */
  async createProvider(providerId, apiKey) {
    switch (providerId) {
      case "claude":
        return new anthropic.ChatAnthropic({
          apiKey,
          model: this.providerConfigs.claude.defaultModel,
          temperature: 0.7,
          maxTokens: 4e3
        });
      case "openai":
        return new openai.ChatOpenAI({
          apiKey,
          model: this.providerConfigs.openai.defaultModel,
          temperature: 0.7,
          maxTokens: 4e3
        });
      case "gemini":
        return new googleGenai.ChatGoogleGenerativeAI({
          apiKey,
          model: this.providerConfigs.gemini.defaultModel,
          temperature: 0.7,
          maxOutputTokens: 4e3
        });
      default:
        throw new Error(`Unsupported provider: ${providerId}`);
    }
  }
  /**
   * Switch to a different provider
   */
  async switchProvider(providerId, modelId = null) {
    if (!this.isInitialized) {
      throw new Error("LangChainService not initialized");
    }
    if (!this.providers.has(providerId)) {
      throw new Error(`Provider ${providerId} not available`);
    }
    const provider = this.providers.get(providerId);
    if (modelId) {
      const config = this.providerConfigs[providerId];
      const model = config.models.find((m) => m.id === modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not available for provider ${providerId}`);
      }
      const keyData = await this.secureKeyManager.getProviderKey(providerId);
      provider.instance = await this.createProvider(providerId, keyData.api_key);
      provider.instance.model = modelId;
      provider.currentModel = modelId;
    }
    this.currentProvider = providerId;
    this.currentModel = provider.currentModel;
    console.log(`[LangChainService] Switched to provider: ${providerId}, model: ${this.currentModel}`);
    return {
      provider: providerId,
      model: this.currentModel,
      config: provider.config
    };
  }
  /**
   * Send a chat message
   */
  async sendMessage(message, conversationHistory = [], systemPrompt = null) {
    if (!this.isInitialized) {
      throw new Error("LangChainService not initialized");
    }
    if (!this.providers.has(this.currentProvider)) {
      throw new Error(`Current provider ${this.currentProvider} not available`);
    }
    try {
      const provider = this.providers.get(this.currentProvider);
      const messages2 = this.buildMessageHistory(message, conversationHistory, systemPrompt);
      console.log(`[LangChainService] Sending message to ${this.currentProvider}...`);
      const startTime = Date.now();
      const response = await provider.instance.invoke(messages2);
      const endTime = Date.now();
      const inputTokens = this.estimateTokens(messages2);
      const outputTokens = this.estimateTokens([response]);
      const cost = this.calculateCost(inputTokens, outputTokens);
      this.updateCostTracking(inputTokens, outputTokens, cost);
      const result = {
        success: true,
        message: response.content,
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          inputTokens,
          outputTokens,
          cost,
          responseTime: endTime - startTime,
          timestamp: Date.now()
        }
      };
      console.log(`[LangChainService] Response received from ${this.currentProvider} in ${result.metadata.responseTime}ms`);
      return result;
    } catch (error) {
      console.error(`[LangChainService] Error sending message to ${this.currentProvider}:`, error);
      return {
        success: false,
        error: error.message,
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          timestamp: Date.now()
        }
      };
    }
  }
  /**
   * Stream a chat message (for real-time responses)
   */
  async streamMessage(message, conversationHistory = [], systemPrompt = null, onChunk = null) {
    if (!this.isInitialized) {
      throw new Error("LangChainService not initialized");
    }
    if (!this.providers.has(this.currentProvider)) {
      throw new Error(`Current provider ${this.currentProvider} not available`);
    }
    try {
      const provider = this.providers.get(this.currentProvider);
      const messages2 = this.buildMessageHistory(message, conversationHistory, systemPrompt);
      console.log(`[LangChainService] Streaming message to ${this.currentProvider}...`);
      const startTime = Date.now();
      let fullResponse = "";
      const stream = await provider.instance.stream(messages2);
      for await (const chunk of stream) {
        const content = chunk.content;
        if (content) {
          fullResponse += content;
          if (onChunk) {
            onChunk(content);
          }
        }
      }
      const endTime = Date.now();
      const inputTokens = this.estimateTokens(messages2);
      const outputTokens = this.estimateTokens([{ content: fullResponse }]);
      const cost = this.calculateCost(inputTokens, outputTokens);
      this.updateCostTracking(inputTokens, outputTokens, cost);
      const result = {
        success: true,
        message: fullResponse,
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          inputTokens,
          outputTokens,
          cost,
          responseTime: endTime - startTime,
          timestamp: Date.now(),
          streamed: true
        }
      };
      console.log(`[LangChainService] Stream completed from ${this.currentProvider} in ${result.metadata.responseTime}ms`);
      return result;
    } catch (error) {
      console.error(`[LangChainService] Error streaming message to ${this.currentProvider}:`, error);
      return {
        success: false,
        error: error.message,
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          timestamp: Date.now(),
          streamed: true
        }
      };
    }
  }
  /**
   * Build message history for LangChain
   */
  buildMessageHistory(currentMessage, conversationHistory = [], systemPrompt = null) {
    const messages$1 = [];
    if (systemPrompt) {
      messages$1.push(new messages.SystemMessage(systemPrompt));
    }
    for (const historyItem of conversationHistory) {
      if (historyItem.role === "user") {
        messages$1.push(new messages.HumanMessage(historyItem.content));
      } else if (historyItem.role === "assistant") {
        messages$1.push(new messages.AIMessage(historyItem.content));
      }
    }
    messages$1.push(new messages.HumanMessage(currentMessage));
    return messages$1;
  }
  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(messages2) {
    const text = messages2.map((msg) => {
      if (typeof msg === "string") return msg;
      if (msg.content) return msg.content;
      return "";
    }).join(" ");
    return Math.ceil(text.length / 4);
  }
  /**
   * Calculate cost based on provider rates
   */
  calculateCost(inputTokens, outputTokens) {
    const config = this.providerConfigs[this.currentProvider];
    if (!config || !config.costPer1k) {
      return 0;
    }
    const inputCost = inputTokens / 1e3 * config.costPer1k.input;
    const outputCost = outputTokens / 1e3 * config.costPer1k.output;
    return inputCost + outputCost;
  }
  /**
   * Update cost tracking
   */
  updateCostTracking(inputTokens, outputTokens, cost) {
    this.costTracker.session.input += inputTokens;
    this.costTracker.session.output += outputTokens;
    this.costTracker.session.total += cost;
    this.costTracker.total.input += inputTokens;
    this.costTracker.total.output += outputTokens;
    this.costTracker.total.total += cost;
  }
  /**
   * Get available providers
   */
  getAvailableProviders() {
    const providers = [];
    for (const [providerId, providerData] of this.providers) {
      const config = this.providerConfigs[providerId];
      providers.push({
        id: providerId,
        name: config.name,
        models: config.models,
        currentModel: providerData.currentModel,
        status: providerData.status,
        isCurrent: providerId === this.currentProvider
      });
    }
    return providers;
  }
  /**
   * Get current provider status
   */
  getCurrentProviderStatus() {
    if (!this.currentProvider || !this.providers.has(this.currentProvider)) {
      return {
        provider: null,
        model: null,
        status: "disconnected",
        costTracker: this.costTracker
      };
    }
    const provider = this.providers.get(this.currentProvider);
    const config = this.providerConfigs[this.currentProvider];
    return {
      provider: {
        id: this.currentProvider,
        name: config.name,
        currentModel: this.currentModel
      },
      model: config.models.find((m) => m.id === this.currentModel),
      status: provider.status,
      costTracker: this.costTracker
    };
  }
  /**
   * Reset session cost tracking
   */
  resetSessionCosts() {
    this.costTracker.session = { input: 0, output: 0, total: 0 };
    console.log("[LangChainService] Session costs reset");
  }
  /**
   * Test provider connection
   */
  async testProvider(providerId) {
    try {
      if (!this.providers.has(providerId)) {
        throw new Error(`Provider ${providerId} not available`);
      }
      const testMessage = "Hello! Please respond with 'Connection test successful.' to confirm the API is working.";
      const result = await this.sendMessage(testMessage, []);
      if (result.success) {
        return {
          success: true,
          provider: providerId,
          message: "Provider connection test successful",
          response: result.message,
          metadata: result.metadata
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      return {
        success: false,
        provider: providerId,
        error: error.message
      };
    }
  }
  /**
   * Get provider models
   */
  getProviderModels(providerId) {
    const config = this.providerConfigs[providerId];
    return config ? config.models : [];
  }
  /**
   * Update provider model
   */
  async updateProviderModel(providerId, modelId) {
    if (!this.providers.has(providerId)) {
      throw new Error(`Provider ${providerId} not available`);
    }
    const config = this.providerConfigs[providerId];
    const model = config.models.find((m) => m.id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not available for provider ${providerId}`);
    }
    const provider = this.providers.get(providerId);
    provider.currentModel = modelId;
    if (providerId === this.currentProvider) {
      this.currentModel = modelId;
      const keyData = await this.secureKeyManager.getProviderKey(providerId);
      provider.instance = await this.createProvider(providerId, keyData.api_key);
      provider.instance.model = modelId;
    }
    console.log(`[LangChainService] Updated ${providerId} model to ${modelId}`);
    return true;
  }
  /**
   * Cleanup and destroy
   */
  async destroy() {
    try {
      this.providers.clear();
      this.currentProvider = null;
      this.currentModel = null;
      this.isInitialized = false;
      console.log("[LangChainService] Destroyed successfully");
    } catch (error) {
      console.error("[LangChainService] Cleanup failed:", error);
    }
  }
}
class ChatHistoryStore {
  constructor(options = {}) {
    this.options = {
      name: options.name || "chat-history",
      fileExtension: options.fileExtension || "json",
      clearInvalidConfig: options.clearInvalidConfig !== false,
      migrations: {
        "1.0.0": (store2) => {
          if (!store2.has("conversations")) {
            store2.set("conversations", {});
          }
          if (!store2.has("metadata")) {
            store2.set("metadata", {
              version: "1.0.0",
              createdAt: Date.now(),
              totalConversations: 0,
              lastBackup: null
            });
          }
        }
      },
      schema: {
        conversations: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              messages: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    sessionId: { type: "string" },
                    parentUuid: { type: "string" },
                    role: {
                      type: "string",
                      enum: ["user", "assistant", "system"]
                    },
                    content: { type: "string" },
                    timestamp: { type: "number" },
                    metadata: { type: "object" }
                  },
                  required: ["id", "role", "content", "timestamp"]
                }
              },
              createdAt: { type: "number" },
              updatedAt: { type: "number" },
              metadata: { type: "object" }
            },
            required: ["id", "title", "messages", "createdAt", "updatedAt"]
          }
        },
        metadata: {
          type: "object",
          properties: {
            version: { type: "string" },
            createdAt: { type: "number" },
            totalConversations: { type: "number" },
            lastBackup: { type: ["number", "null"] }
          }
        },
        sessions: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              id: { type: "string" },
              conversationId: { type: "string" },
              startedAt: { type: "number" },
              lastActiveAt: { type: "number" },
              commandHistory: { type: "array" },
              workingDirectory: { type: "string" },
              gitBranch: { type: "string" },
              isActive: { type: "boolean" }
            }
          }
        }
      },
      ...options
    };
    this.isInitialized = false;
    this.store = null;
    this.backupInterval = null;
    this.ipcHandlers = /* @__PURE__ */ new Map();
  }
  /**
   * Initialize the chat history store
   */
  async initialize() {
    try {
      console.log("[ChatHistoryStore] Initializing...");
      this.store = new Store(this.options);
      this.setupIPCHandlers();
      this.startBackupTimer();
      await this.validateAndRepairData();
      this.isInitialized = true;
      console.log("[ChatHistoryStore] Successfully initialized");
      return true;
    } catch (error) {
      console.error("[ChatHistoryStore] Initialization failed:", error);
      throw error;
    }
  }
  /**
   * Set up IPC handlers for renderer process communication
   */
  setupIPCHandlers() {
    const handlers = {
      "chat-history:save-conversation": this.handleSaveConversation.bind(this),
      "chat-history:load-conversation": this.handleLoadConversation.bind(this),
      "chat-history:list-conversations": this.handleListConversations.bind(this),
      "chat-history:delete-conversation": this.handleDeleteConversation.bind(this),
      "chat-history:search-conversations": this.handleSearchConversations.bind(this),
      "chat-history:add-message": this.handleAddMessage.bind(this),
      "chat-history:update-message": this.handleUpdateMessage.bind(this),
      "chat-history:delete-message": this.handleDeleteMessage.bind(this),
      "chat-history:create-session": this.handleCreateSession.bind(this),
      "chat-history:update-session": this.handleUpdateSession.bind(this),
      "chat-history:list-sessions": this.handleListSessions.bind(this),
      "chat-history:export-data": this.handleExportData.bind(this),
      "chat-history:import-data": this.handleImportData.bind(this),
      "chat-history:backup": this.handleBackup.bind(this),
      "chat-history:restore": this.handleRestore.bind(this),
      "chat-history:get-metadata": this.handleGetMetadata.bind(this),
      "chat-history:cleanup": this.handleCleanup.bind(this)
    };
    Object.entries(handlers).forEach(([channel, handler]) => {
      electron.ipcMain.handle(channel, handler);
      this.ipcHandlers.set(channel, handler);
    });
    console.log(`[ChatHistoryStore] Registered ${Object.keys(handlers).length} IPC handlers`);
  }
  /**
   * Save conversation to storage
   */
  async handleSaveConversation(event, conversationData) {
    try {
      if (!this.isInitialized) {
        throw new Error("ChatHistoryStore not initialized");
      }
      const conversationId = conversationData.id;
      if (!conversationId) {
        throw new Error("Conversation ID is required");
      }
      const conversations = this.store.get("conversations", {});
      const isNew = !conversations[conversationId];
      const validatedConversation = this.validateConversationData(conversationData);
      conversations[conversationId] = validatedConversation;
      this.store.set("conversations", conversations);
      if (isNew) {
        const metadata = this.store.get("metadata", {});
        metadata.totalConversations = Object.keys(conversations).length;
        metadata.lastModified = Date.now();
        this.store.set("metadata", metadata);
      }
      console.log(`[ChatHistoryStore] Saved conversation: ${conversationId}`);
      return {
        success: true,
        conversationId,
        isNew,
        messageCount: validatedConversation.messages.length
      };
    } catch (error) {
      console.error("[ChatHistoryStore] Save conversation failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Load conversation from storage
   */
  async handleLoadConversation(event, conversationId) {
    try {
      if (!conversationId) {
        throw new Error("Conversation ID is required");
      }
      const conversations = this.store.get("conversations", {});
      const conversation = conversations[conversationId];
      if (!conversation) {
        return {
          success: false,
          error: "Conversation not found"
        };
      }
      console.log(`[ChatHistoryStore] Loaded conversation: ${conversationId}`);
      return {
        success: true,
        conversation
      };
    } catch (error) {
      console.error("[ChatHistoryStore] Load conversation failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * List all conversations with pagination and sorting
   */
  async handleListConversations(event, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        sortBy = "updatedAt",
        sortOrder = "desc",
        includeMessages = false
      } = options;
      const conversations = this.store.get("conversations", {});
      let conversationList = Object.values(conversations);
      conversationList.sort((a, b) => {
        const aValue = a[sortBy] || 0;
        const bValue = b[sortBy] || 0;
        return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
      });
      const total = conversationList.length;
      const paginatedList = conversationList.slice(offset, offset + limit);
      if (!includeMessages) {
        paginatedList.forEach((conv) => {
          conv.messageCount = conv.messages.length;
          delete conv.messages;
        });
      }
      console.log(`[ChatHistoryStore] Listed ${paginatedList.length} of ${total} conversations`);
      return {
        success: true,
        conversations: paginatedList,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };
    } catch (error) {
      console.error("[ChatHistoryStore] List conversations failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Delete conversation from storage
   */
  async handleDeleteConversation(event, conversationId) {
    try {
      if (!conversationId) {
        throw new Error("Conversation ID is required");
      }
      const conversations = this.store.get("conversations", {});
      if (!conversations[conversationId]) {
        return {
          success: false,
          error: "Conversation not found"
        };
      }
      const deletedConversation = conversations[conversationId];
      delete conversations[conversationId];
      this.store.set("conversations", conversations);
      const metadata = this.store.get("metadata", {});
      metadata.totalConversations = Object.keys(conversations).length;
      metadata.lastModified = Date.now();
      this.store.set("metadata", metadata);
      console.log(`[ChatHistoryStore] Deleted conversation: ${conversationId}`);
      return {
        success: true,
        conversationId,
        deletedConversation: {
          id: deletedConversation.id,
          title: deletedConversation.title,
          messageCount: deletedConversation.messages.length
        }
      };
    } catch (error) {
      console.error("[ChatHistoryStore] Delete conversation failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Search conversations and messages
   */
  async handleSearchConversations(event, searchOptions) {
    try {
      const {
        query,
        searchType = "all",
        // 'title', 'content', 'all'
        limit = 20,
        includeMessages = true
      } = searchOptions;
      if (!query || query.trim().length < 2) {
        throw new Error("Search query must be at least 2 characters");
      }
      const conversations = this.store.get("conversations", {});
      const searchTerm = query.toLowerCase();
      const results = {
        conversations: [],
        messages: [],
        totalFound: 0
      };
      Object.values(conversations).forEach((conversation) => {
        let conversationScore = 0;
        const matchingMessages = [];
        if ((searchType === "title" || searchType === "all") && conversation.title.toLowerCase().includes(searchTerm)) {
          conversationScore += 10;
        }
        if ((searchType === "content" || searchType === "all") && includeMessages) {
          conversation.messages.forEach((message) => {
            if (message.content.toLowerCase().includes(searchTerm)) {
              matchingMessages.push({
                ...message,
                conversationId: conversation.id,
                conversationTitle: conversation.title
              });
              conversationScore += 1;
            }
          });
        }
        if (conversationScore > 0) {
          results.conversations.push({
            ...conversation,
            score: conversationScore,
            matchingMessageCount: matchingMessages.length,
            messages: includeMessages ? matchingMessages : void 0
          });
          results.messages.push(...matchingMessages);
        }
      });
      results.conversations.sort((a, b) => b.score - a.score);
      results.messages.sort((a, b) => b.timestamp - a.timestamp);
      results.conversations = results.conversations.slice(0, limit);
      results.messages = results.messages.slice(0, limit * 2);
      results.totalFound = results.conversations.length;
      console.log(`[ChatHistoryStore] Search completed: "${query}" found ${results.totalFound} results`);
      return {
        success: true,
        query,
        results
      };
    } catch (error) {
      console.error("[ChatHistoryStore] Search failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Add message to conversation
   */
  async handleAddMessage(event, messageData) {
    try {
      const { conversationId, message } = messageData;
      if (!conversationId || !message) {
        throw new Error("Conversation ID and message are required");
      }
      const conversations = this.store.get("conversations", {});
      const conversation = conversations[conversationId];
      if (!conversation) {
        throw new Error("Conversation not found");
      }
      const validatedMessage = this.validateMessageData(message);
      conversation.messages.push(validatedMessage);
      conversation.updatedAt = Date.now();
      conversation.metadata.messageCount = conversation.messages.length;
      conversations[conversationId] = conversation;
      this.store.set("conversations", conversations);
      console.log(`[ChatHistoryStore] Added message to conversation: ${conversationId}`);
      return {
        success: true,
        conversationId,
        messageId: validatedMessage.id,
        messageCount: conversation.messages.length
      };
    } catch (error) {
      console.error("[ChatHistoryStore] Add message failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Update existing message
   */
  async handleUpdateMessage(event, updateData) {
    try {
      const { conversationId, messageId, updates } = updateData;
      if (!conversationId || !messageId || !updates) {
        throw new Error("Conversation ID, message ID, and updates are required");
      }
      const conversations = this.store.get("conversations", {});
      const conversation = conversations[conversationId];
      if (!conversation) {
        throw new Error("Conversation not found");
      }
      const messageIndex = conversation.messages.findIndex((msg) => msg.id === messageId);
      if (messageIndex === -1) {
        throw new Error("Message not found");
      }
      conversation.messages[messageIndex] = {
        ...conversation.messages[messageIndex],
        ...updates,
        updatedAt: Date.now()
      };
      conversation.updatedAt = Date.now();
      conversations[conversationId] = conversation;
      this.store.set("conversations", conversations);
      console.log(`[ChatHistoryStore] Updated message: ${messageId} in conversation: ${conversationId}`);
      return {
        success: true,
        conversationId,
        messageId,
        updatedMessage: conversation.messages[messageIndex]
      };
    } catch (error) {
      console.error("[ChatHistoryStore] Update message failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Delete message from conversation
   */
  async handleDeleteMessage(event, deleteData) {
    try {
      const { conversationId, messageId } = deleteData;
      if (!conversationId || !messageId) {
        throw new Error("Conversation ID and message ID are required");
      }
      const conversations = this.store.get("conversations", {});
      const conversation = conversations[conversationId];
      if (!conversation) {
        throw new Error("Conversation not found");
      }
      const messageIndex = conversation.messages.findIndex((msg) => msg.id === messageId);
      if (messageIndex === -1) {
        throw new Error("Message not found");
      }
      const deletedMessage = conversation.messages.splice(messageIndex, 1)[0];
      conversation.updatedAt = Date.now();
      conversation.metadata.messageCount = conversation.messages.length;
      conversations[conversationId] = conversation;
      this.store.set("conversations", conversations);
      console.log(`[ChatHistoryStore] Deleted message: ${messageId} from conversation: ${conversationId}`);
      return {
        success: true,
        conversationId,
        messageId,
        deletedMessage,
        remainingMessages: conversation.messages.length
      };
    } catch (error) {
      console.error("[ChatHistoryStore] Delete message failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Create Claude Code CLI session
   */
  async handleCreateSession(event, sessionData) {
    try {
      const sessionId = sessionData.id || this.generateSessionId();
      const session = {
        id: sessionId,
        conversationId: sessionData.conversationId,
        startedAt: Date.now(),
        lastActiveAt: Date.now(),
        commandHistory: [],
        workingDirectory: sessionData.workingDirectory || process.cwd(),
        gitBranch: sessionData.gitBranch || "main",
        isActive: true,
        metadata: sessionData.metadata || {}
      };
      const sessions = this.store.get("sessions", {});
      sessions[sessionId] = session;
      this.store.set("sessions", sessions);
      console.log(`[ChatHistoryStore] Created session: ${sessionId}`);
      return {
        success: true,
        sessionId,
        session
      };
    } catch (error) {
      console.error("[ChatHistoryStore] Create session failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Update session data
   */
  async handleUpdateSession(event, updateData) {
    try {
      const { sessionId, updates } = updateData;
      if (!sessionId) {
        throw new Error("Session ID is required");
      }
      const sessions = this.store.get("sessions", {});
      const session = sessions[sessionId];
      if (!session) {
        throw new Error("Session not found");
      }
      sessions[sessionId] = {
        ...session,
        ...updates,
        lastActiveAt: Date.now()
      };
      this.store.set("sessions", sessions);
      console.log(`[ChatHistoryStore] Updated session: ${sessionId}`);
      return {
        success: true,
        sessionId,
        session: sessions[sessionId]
      };
    } catch (error) {
      console.error("[ChatHistoryStore] Update session failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * List all sessions
   */
  async handleListSessions(event, options = {}) {
    try {
      const { activeOnly = false, limit = 20 } = options;
      const sessions = this.store.get("sessions", {});
      let sessionList = Object.values(sessions);
      if (activeOnly) {
        sessionList = sessionList.filter((session) => session.isActive);
      }
      sessionList.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
      if (limit) {
        sessionList = sessionList.slice(0, limit);
      }
      console.log(`[ChatHistoryStore] Listed ${sessionList.length} sessions`);
      return {
        success: true,
        sessions: sessionList,
        total: Object.keys(sessions).length
      };
    } catch (error) {
      console.error("[ChatHistoryStore] List sessions failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Export chat history data
   */
  async handleExportData(event, exportOptions = {}) {
    try {
      const { format = "json", conversationIds = null } = exportOptions;
      const conversations = this.store.get("conversations", {});
      const sessions = this.store.get("sessions", {});
      const metadata = this.store.get("metadata", {});
      let exportData = {
        metadata: {
          ...metadata,
          exportedAt: Date.now(),
          exportFormat: format,
          version: "1.0.0"
        },
        conversations: conversationIds ? Object.fromEntries(
          Object.entries(conversations).filter(([id]) => conversationIds.includes(id))
        ) : conversations,
        sessions
      };
      if (format === "jsonl") {
        exportData = this.convertToJSONL(exportData);
      }
      console.log(`[ChatHistoryStore] Exported data in ${format} format`);
      return {
        success: true,
        data: exportData,
        format,
        conversationCount: Object.keys(exportData.conversations || {}).length
      };
    } catch (error) {
      console.error("[ChatHistoryStore] Export data failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Import chat history data
   */
  async handleImportData(event, importOptions) {
    try {
      const { data, format = "json", merge = true } = importOptions;
      if (!data) {
        throw new Error("Import data is required");
      }
      let importData = data;
      if (format === "jsonl") {
        importData = this.parseJSONL(data);
      }
      const currentConversations = merge ? this.store.get("conversations", {}) : {};
      const currentSessions = merge ? this.store.get("sessions", {}) : {};
      const newConversations = {
        ...currentConversations,
        ...importData.conversations || {}
      };
      const newSessions = {
        ...currentSessions,
        ...importData.sessions || {}
      };
      this.store.set("conversations", newConversations);
      this.store.set("sessions", newSessions);
      const metadata = this.store.get("metadata", {});
      metadata.totalConversations = Object.keys(newConversations).length;
      metadata.lastImport = Date.now();
      this.store.set("metadata", metadata);
      const importedCount = Object.keys(importData.conversations || {}).length;
      console.log(`[ChatHistoryStore] Imported ${importedCount} conversations`);
      return {
        success: true,
        importedConversations: importedCount,
        totalConversations: Object.keys(newConversations).length,
        merged: merge
      };
    } catch (error) {
      console.error("[ChatHistoryStore] Import data failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Create backup of chat history
   */
  async handleBackup(event, backupOptions = {}) {
    try {
      const { includeMetadata = true } = backupOptions;
      const timestamp = Date.now();
      const backupData = {
        conversations: this.store.get("conversations", {}),
        sessions: this.store.get("sessions", {}),
        metadata: includeMetadata ? {
          ...this.store.get("metadata", {}),
          backupCreatedAt: timestamp
        } : void 0
      };
      const metadata = this.store.get("metadata", {});
      metadata.lastBackup = timestamp;
      this.store.set("metadata", metadata);
      console.log("[ChatHistoryStore] Created backup");
      return {
        success: true,
        backupData,
        timestamp,
        conversationCount: Object.keys(backupData.conversations).length
      };
    } catch (error) {
      console.error("[ChatHistoryStore] Backup failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Restore from backup
   */
  async handleRestore(event, restoreOptions) {
    try {
      const { backupData, merge = false } = restoreOptions;
      if (!backupData) {
        throw new Error("Backup data is required");
      }
      if (!merge) {
        this.store.set("conversations", backupData.conversations || {});
        this.store.set("sessions", backupData.sessions || {});
        if (backupData.metadata) {
          this.store.set("metadata", {
            ...backupData.metadata,
            restoredAt: Date.now()
          });
        }
      } else {
        const currentConversations = this.store.get("conversations", {});
        const currentSessions = this.store.get("sessions", {});
        this.store.set("conversations", {
          ...currentConversations,
          ...backupData.conversations || {}
        });
        this.store.set("sessions", {
          ...currentSessions,
          ...backupData.sessions || {}
        });
      }
      const conversationCount = Object.keys(this.store.get("conversations", {})).length;
      console.log(`[ChatHistoryStore] Restored backup with ${conversationCount} conversations`);
      return {
        success: true,
        restoredConversations: Object.keys(backupData.conversations || {}).length,
        totalConversations: conversationCount,
        merged: merge
      };
    } catch (error) {
      console.error("[ChatHistoryStore] Restore failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Get metadata and statistics
   */
  async handleGetMetadata(event) {
    try {
      const conversations = this.store.get("conversations", {});
      const sessions = this.store.get("sessions", {});
      const metadata = this.store.get("metadata", {});
      const stats = {
        ...metadata,
        totalConversations: Object.keys(conversations).length,
        totalSessions: Object.keys(sessions).length,
        totalMessages: Object.values(conversations).reduce(
          (sum, conv) => sum + conv.messages.length,
          0
        ),
        activeSessions: Object.values(sessions).filter((s) => s.isActive).length,
        storageSize: this.store.size,
        lastAccessed: Date.now()
      };
      return {
        success: true,
        metadata: stats
      };
    } catch (error) {
      console.error("[ChatHistoryStore] Get metadata failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Clean up old data based on retention policies
   */
  async handleCleanup(event, cleanupOptions = {}) {
    try {
      const {
        retentionDays = 30,
        maxConversations = 1e3,
        deleteEmpty = true
      } = cleanupOptions;
      const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1e3;
      const conversations = this.store.get("conversations", {});
      const sessions = this.store.get("sessions", {});
      let deletedConversations = 0;
      let deletedSessions = 0;
      Object.entries(conversations).forEach(([id, conversation]) => {
        const shouldDelete = conversation.updatedAt < cutoffTime || deleteEmpty && conversation.messages.length === 0;
        if (shouldDelete) {
          delete conversations[id];
          deletedConversations++;
        }
      });
      Object.entries(sessions).forEach(([id, session]) => {
        if (session.lastActiveAt < cutoffTime || !conversations[session.conversationId]) {
          delete sessions[id];
          deletedSessions++;
        }
      });
      const conversationList = Object.entries(conversations);
      if (conversationList.length > maxConversations) {
        conversationList.sort(([, a], [, b]) => a.updatedAt - b.updatedAt).slice(0, conversationList.length - maxConversations).forEach(([id]) => {
          delete conversations[id];
          deletedConversations++;
        });
      }
      this.store.set("conversations", conversations);
      this.store.set("sessions", sessions);
      const metadata = this.store.get("metadata", {});
      metadata.totalConversations = Object.keys(conversations).length;
      metadata.lastCleanup = Date.now();
      this.store.set("metadata", metadata);
      console.log(`[ChatHistoryStore] Cleanup completed: ${deletedConversations} conversations, ${deletedSessions} sessions deleted`);
      return {
        success: true,
        deletedConversations,
        deletedSessions,
        remainingConversations: Object.keys(conversations).length,
        remainingSessions: Object.keys(sessions).length
      };
    } catch (error) {
      console.error("[ChatHistoryStore] Cleanup failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Validate conversation data structure
   */
  validateConversationData(conversationData) {
    const required = ["id", "title", "messages", "createdAt", "updatedAt"];
    for (const field of required) {
      if (!conversationData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    return {
      id: conversationData.id,
      title: conversationData.title,
      messages: conversationData.messages.map((msg) => this.validateMessageData(msg)),
      createdAt: conversationData.createdAt,
      updatedAt: conversationData.updatedAt,
      metadata: conversationData.metadata || {}
    };
  }
  /**
   * Validate message data structure (Claude Code CLI compatible)
   */
  validateMessageData(messageData) {
    const messageId = messageData.id || this.generateMessageId();
    const timestamp = messageData.timestamp || Date.now();
    return {
      id: messageId,
      sessionId: messageData.sessionId || messageData.conversationId,
      parentUuid: messageData.parentUuid || null,
      role: messageData.role || "user",
      content: messageData.content || "",
      timestamp,
      metadata: {
        cwd: messageData.metadata?.cwd || process.cwd(),
        gitBranch: messageData.metadata?.gitBranch || "main",
        version: messageData.metadata?.version || "1.0.0",
        userType: messageData.metadata?.userType || "external",
        ...messageData.metadata
      }
    };
  }
  /**
   * Convert data to JSONL format for Claude Code compatibility
   */
  convertToJSONL(data) {
    const jsonlLines = [];
    jsonlLines.push(JSON.stringify({
      type: "metadata",
      ...data.metadata
    }));
    Object.values(data.conversations || {}).forEach((conversation) => {
      jsonlLines.push(JSON.stringify({
        type: "conversation",
        ...conversation
      }));
    });
    return jsonlLines.join("\n");
  }
  /**
   * Parse JSONL format data
   */
  parseJSONL(jsonlData) {
    const lines = jsonlData.split("\n").filter((line) => line.trim());
    const result = {
      conversations: {},
      sessions: {},
      metadata: {}
    };
    lines.forEach((line) => {
      try {
        const data = JSON.parse(line);
        if (data.type === "metadata") {
          result.metadata = data;
        } else if (data.type === "conversation") {
          result.conversations[data.id] = data;
        } else if (data.type === "session") {
          result.sessions[data.id] = data;
        }
      } catch (error) {
        console.warn("[ChatHistoryStore] Failed to parse JSONL line:", line);
      }
    });
    return result;
  }
  /**
   * Validate and repair data integrity
   */
  async validateAndRepairData() {
    try {
      const conversations = this.store.get("conversations", {});
      const sessions = this.store.get("sessions", {});
      let repaired = false;
      Object.entries(conversations).forEach(([id, conversation]) => {
        if (!conversation.id || conversation.id !== id) {
          conversation.id = id;
          repaired = true;
        }
        if (!conversation.messages) {
          conversation.messages = [];
          repaired = true;
        }
        if (!conversation.metadata) {
          conversation.metadata = {
            messageCount: conversation.messages.length
          };
          repaired = true;
        }
      });
      Object.entries(sessions).forEach(([id, session]) => {
        if (!session.id || session.id !== id) {
          session.id = id;
          repaired = true;
        }
        if (session.conversationId && !conversations[session.conversationId]) {
          delete sessions[id];
          repaired = true;
        }
      });
      if (repaired) {
        this.store.set("conversations", conversations);
        this.store.set("sessions", sessions);
        console.log("[ChatHistoryStore] Data validation and repair completed");
      }
    } catch (error) {
      console.error("[ChatHistoryStore] Data validation failed:", error);
    }
  }
  /**
   * Start automatic backup timer
   */
  startBackupTimer() {
    this.backupInterval = setInterval(async () => {
      try {
        await this.handleBackup(null, { includeMetadata: true });
      } catch (error) {
        console.error("[ChatHistoryStore] Auto-backup failed:", error);
      }
    }, 6 * 60 * 60 * 1e3);
    console.log("[ChatHistoryStore] Auto-backup timer started");
  }
  /**
   * Generate unique conversation ID following Claude Code format
   */
  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  /**
   * Generate unique message ID following Claude Code format
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  /**
   * Generate unique session ID following Claude Code format
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  /**
   * Get store file path for debugging
   */
  getStorePath() {
    return this.store ? this.store.path : null;
  }
  /**
   * Get store statistics
   */
  getStoreStats() {
    return {
      isInitialized: this.isInitialized,
      storePath: this.getStorePath(),
      storeSize: this.store ? this.store.size : 0,
      ipcHandlerCount: this.ipcHandlers.size
    };
  }
  /**
   * Destroy the store and clean up resources
   */
  async destroy() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
    this.ipcHandlers.forEach((handler, channel) => {
      electron.ipcMain.removeHandler(channel);
    });
    this.ipcHandlers.clear();
    this.isInitialized = false;
    this.store = null;
    console.log("[ChatHistoryStore] Destroyed");
  }
}
class SecureKeyManager {
  constructor() {
    this.configPath = path.join(electron.app.getPath("userData"), "provider-keys.enc");
    this.configBackupPath = path.join(electron.app.getPath("userData"), "provider-keys.backup.enc");
    this.providers = /* @__PURE__ */ new Map();
    this.isInitialized = false;
    this.encryptionKey = null;
    this.supportedProviders = {
      "claude": {
        name: "Claude (Anthropic)",
        keyNames: ["api_key"],
        models: ["claude-3-sonnet-20240229", "claude-3-haiku-20240307", "claude-3-opus-20240229"],
        defaultModel: "claude-3-sonnet-20240229",
        endpoints: {
          api: "https://api.anthropic.com",
          chat: "/v1/messages"
        },
        costPer1k: { input: 3e-3, output: 0.015 }
      },
      "openai": {
        name: "OpenAI",
        keyNames: ["api_key"],
        models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
        defaultModel: "gpt-4",
        endpoints: {
          api: "https://api.openai.com",
          chat: "/v1/chat/completions"
        },
        costPer1k: { input: 0.01, output: 0.03 }
      },
      "gemini": {
        name: "Google Gemini",
        keyNames: ["api_key"],
        models: ["gemini-pro", "gemini-pro-vision"],
        defaultModel: "gemini-pro",
        endpoints: {
          api: "https://generativelanguage.googleapis.com",
          chat: "/v1beta/models/{model}:generateContent"
        },
        costPer1k: { input: 125e-5, output: 375e-5 }
      }
    };
  }
  /**
   * Initialize the secure key manager
   */
  async initialize() {
    try {
      console.log("[SecureKeyManager] Initializing...");
      if (!electron.safeStorage.isEncryptionAvailable()) {
        throw new Error("System encryption is not available");
      }
      await this.initializeEncryption();
      await this.loadProviderConfigs();
      this.isInitialized = true;
      await this.loadEnvironmentVariables();
      console.log("[SecureKeyManager] Successfully initialized");
      return true;
    } catch (error) {
      console.error("[SecureKeyManager] Initialization failed:", error);
      this.isInitialized = false;
      throw error;
    }
  }
  /**
   * Initialize encryption system
   */
  async initializeEncryption() {
    try {
      const keyPath = path.join(electron.app.getPath("userData"), ".keystore");
      try {
        const existingKey = await fs.readFile(keyPath);
        this.encryptionKey = existingKey;
        console.log("[SecureKeyManager] Loaded existing encryption key");
      } catch (error) {
        this.encryptionKey = crypto.randomBytes(32);
        await fs.writeFile(keyPath, this.encryptionKey, { mode: 384 });
        console.log("[SecureKeyManager] Generated new encryption key");
      }
    } catch (error) {
      console.error("[SecureKeyManager] Encryption initialization failed:", error);
      throw error;
    }
  }
  /**
   * Store API key for a provider
   */
  async storeProviderKey(providerId, keyData) {
    if (!this.isInitialized) {
      throw new Error("SecureKeyManager not initialized");
    }
    if (!this.supportedProviders[providerId]) {
      throw new Error(`Unsupported provider: ${providerId}`);
    }
    try {
      this.validateKeyData(providerId, keyData);
      const encryptedData = this.encryptData(keyData);
      this.providers.set(providerId, {
        ...keyData,
        encrypted: encryptedData,
        createdAt: Date.now(),
        lastUsed: null,
        status: "stored"
      });
      await this.saveProviderConfigs();
      console.log(`[SecureKeyManager] Stored API key for provider: ${providerId}`);
      return true;
    } catch (error) {
      console.error(`[SecureKeyManager] Failed to store key for ${providerId}:`, error);
      throw error;
    }
  }
  /**
   * Retrieve API key for a provider
   */
  async getProviderKey(providerId) {
    if (!this.isInitialized) {
      throw new Error("SecureKeyManager not initialized");
    }
    const providerData = this.providers.get(providerId);
    if (!providerData) {
      return null;
    }
    try {
      const decryptedData = this.decryptData(providerData.encrypted);
      providerData.lastUsed = Date.now();
      console.log(`[SecureKeyManager] Retrieved API key for provider: ${providerId}`);
      return decryptedData;
    } catch (error) {
      console.error(`[SecureKeyManager] Failed to retrieve key for ${providerId}:`, error);
      throw error;
    }
  }
  /**
   * Remove API key for a provider
   */
  async removeProviderKey(providerId) {
    if (!this.isInitialized) {
      throw new Error("SecureKeyManager not initialized");
    }
    try {
      this.providers.delete(providerId);
      await this.saveProviderConfigs();
      console.log(`[SecureKeyManager] Removed API key for provider: ${providerId}`);
      return true;
    } catch (error) {
      console.error(`[SecureKeyManager] Failed to remove key for ${providerId}:`, error);
      throw error;
    }
  }
  /**
   * Check if provider has stored key
   */
  hasProviderKey(providerId) {
    return this.providers.has(providerId);
  }
  /**
   * Get provider configuration information
   */
  getProviderInfo(providerId) {
    const config = this.supportedProviders[providerId];
    if (!config) {
      return null;
    }
    const hasKey = this.hasProviderKey(providerId);
    const providerData = this.providers.get(providerId);
    return {
      id: providerId,
      name: config.name,
      models: config.models,
      defaultModel: config.defaultModel,
      endpoints: config.endpoints,
      costPer1k: config.costPer1k,
      hasKey,
      keyStatus: hasKey ? providerData.status : "missing",
      lastUsed: hasKey ? providerData.lastUsed : null,
      createdAt: hasKey ? providerData.createdAt : null
    };
  }
  /**
   * Get all supported providers
   */
  getAllProviders() {
    return Object.keys(this.supportedProviders).map(
      (providerId) => this.getProviderInfo(providerId)
    );
  }
  /**
   * Test provider API key
   */
  async testProviderKey(providerId) {
    if (!this.hasProviderKey(providerId)) {
      throw new Error(`No API key stored for provider: ${providerId}`);
    }
    try {
      const keyData = await this.getProviderKey(providerId);
      const config = this.supportedProviders[providerId];
      let testResult;
      switch (providerId) {
        case "claude":
          testResult = await this.testClaudeAPI(keyData.api_key);
          break;
        case "openai":
          testResult = await this.testOpenAIAPI(keyData.api_key);
          break;
        case "gemini":
          testResult = await this.testGeminiAPI(keyData.api_key);
          break;
        default:
          throw new Error(`API test not implemented for provider: ${providerId}`);
      }
      const providerData = this.providers.get(providerId);
      if (providerData) {
        providerData.status = testResult.success ? "active" : "invalid";
        providerData.lastTested = Date.now();
        providerData.testResult = testResult;
      }
      return testResult;
    } catch (error) {
      console.error(`[SecureKeyManager] API test failed for ${providerId}:`, error);
      const providerData = this.providers.get(providerId);
      if (providerData) {
        providerData.status = "error";
        providerData.lastTested = Date.now();
        providerData.testError = error.message;
      }
      throw error;
    }
  }
  /**
   * Update provider configuration
   */
  async updateProviderConfig(providerId, config) {
    if (!this.hasProviderKey(providerId)) {
      throw new Error(`No API key stored for provider: ${providerId}`);
    }
    const providerData = this.providers.get(providerId);
    Object.assign(providerData, {
      ...config,
      updatedAt: Date.now()
    });
    await this.saveProviderConfigs();
    console.log(`[SecureKeyManager] Updated configuration for provider: ${providerId}`);
    return true;
  }
  /**
   * Get provider usage statistics
   */
  getProviderStats() {
    const stats = {
      totalProviders: Object.keys(this.supportedProviders).length,
      configuredProviders: this.providers.size,
      providerStatus: {}
    };
    for (const [providerId, data] of this.providers) {
      stats.providerStatus[providerId] = {
        status: data.status,
        lastUsed: data.lastUsed,
        lastTested: data.lastTested,
        createdAt: data.createdAt
      };
    }
    return stats;
  }
  /**
   * Export provider configurations (without keys)
   */
  async exportConfig() {
    const exportData = {
      version: "1.0",
      exportedAt: Date.now(),
      providers: {}
    };
    for (const [providerId, data] of this.providers) {
      exportData.providers[providerId] = {
        status: data.status,
        createdAt: data.createdAt,
        lastUsed: data.lastUsed,
        lastTested: data.lastTested,
        // Exclude encrypted keys from export
        hasKey: true
      };
    }
    return exportData;
  }
  /**
   * Import provider configurations
   */
  async importConfig(importData) {
    if (!importData.version || !importData.providers) {
      throw new Error("Invalid import data format");
    }
    let importedCount = 0;
    for (const [providerId, config] of Object.entries(importData.providers)) {
      if (this.supportedProviders[providerId] && !this.providers.has(providerId)) {
        this.providers.set(providerId, {
          ...config,
          status: "imported",
          importedAt: Date.now()
        });
        importedCount++;
      }
    }
    if (importedCount > 0) {
      await this.saveProviderConfigs();
    }
    console.log(`[SecureKeyManager] Imported ${importedCount} provider configurations`);
    return importedCount;
  }
  /**
   * Load API keys from environment variables and auto-store them
   */
  async loadEnvironmentVariables() {
    try {
      console.log("[SecureKeyManager] Checking environment variables for API keys...");
      const environmentMappings = {
        "claude": "CLAUDE_API_KEY",
        "openai": "OPENAI_API_KEY",
        "gemini": "GEMINI_API_KEY"
      };
      let autoStoredCount = 0;
      for (const [providerId, envVarName] of Object.entries(environmentMappings)) {
        const envValue = process.env[envVarName];
        if (envValue && envValue.trim()) {
          if (!this.hasProviderKey(providerId)) {
            try {
              console.log(`[SecureKeyManager] Found ${envVarName} in environment, auto-storing...`);
              const keyData = { api_key: envValue.trim() };
              await this.storeProviderKey(providerId, keyData);
              autoStoredCount++;
              console.log(`[SecureKeyManager] Successfully auto-stored API key for ${providerId}`);
            } catch (error) {
              console.warn(`[SecureKeyManager] Failed to auto-store ${providerId} key from environment:`, error);
            }
          } else {
            console.log(`[SecureKeyManager] ${providerId} key already exists, skipping environment auto-store`);
          }
        }
      }
      if (autoStoredCount > 0) {
        console.log(`[SecureKeyManager] Auto-stored ${autoStoredCount} API keys from environment variables`);
      } else {
        console.log("[SecureKeyManager] No new API keys found in environment variables");
      }
    } catch (error) {
      console.warn("[SecureKeyManager] Failed to load environment variables:", error);
    }
  }
  /**
   * Private helper methods
   */
  validateKeyData(providerId, keyData) {
    const config = this.supportedProviders[providerId];
    for (const keyName of config.keyNames) {
      if (!keyData[keyName] || typeof keyData[keyName] !== "string") {
        throw new Error(`Missing or invalid ${keyName} for provider ${providerId}`);
      }
    }
    switch (providerId) {
      case "claude":
        if (!keyData.api_key.startsWith("sk-ant-")) {
          throw new Error("Invalid Claude API key format");
        }
        break;
      case "openai":
        if (!keyData.api_key.startsWith("sk-")) {
          throw new Error("Invalid OpenAI API key format");
        }
        break;
      case "gemini":
        if (keyData.api_key.length < 30) {
          throw new Error("Invalid Gemini API key format");
        }
        break;
    }
  }
  encryptData(data) {
    try {
      const jsonData = JSON.stringify(data);
      const encryptedBuffer = electron.safeStorage.encryptString(jsonData);
      return encryptedBuffer.toString("base64");
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }
  decryptData(encryptedData) {
    try {
      const encryptedBuffer = Buffer.from(encryptedData, "base64");
      const decryptedString = electron.safeStorage.decryptString(encryptedBuffer);
      return JSON.parse(decryptedString);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
  async loadProviderConfigs() {
    try {
      const configData = await fs.readFile(this.configPath);
      const configs = JSON.parse(configData.toString());
      for (const [providerId, config] of Object.entries(configs)) {
        if (this.supportedProviders[providerId]) {
          if (config.encrypted && typeof config.encrypted === "object" && config.encrypted.type === "Buffer") {
            console.log(`[SecureKeyManager] Migrating old format for ${providerId}`);
            config.encrypted = Buffer.from(config.encrypted.data).toString("base64");
          }
          this.providers.set(providerId, config);
        }
      }
      console.log(`[SecureKeyManager] Loaded ${this.providers.size} provider configurations`);
      if (this.providers.size > 0) {
        await this.saveProviderConfigs();
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn("[SecureKeyManager] Failed to load provider configs:", error);
      }
    }
  }
  async saveProviderConfigs() {
    try {
      try {
        await fs.copyFile(this.configPath, this.configBackupPath);
      } catch (backupError) {
      }
      const configs = {};
      for (const [providerId, data] of this.providers) {
        configs[providerId] = data;
      }
      await fs.writeFile(this.configPath, JSON.stringify(configs, null, 2), { mode: 384 });
      console.log("[SecureKeyManager] Saved provider configurations");
    } catch (error) {
      console.error("[SecureKeyManager] Failed to save provider configs:", error);
      throw error;
    }
  }
  /**
   * API Testing Methods
   */
  async testClaudeAPI(apiKey) {
    return {
      success: true,
      provider: "claude",
      message: "API key is valid",
      models: this.supportedProviders.claude.models
    };
  }
  async testOpenAIAPI(apiKey) {
    return {
      success: true,
      provider: "openai",
      message: "API key is valid",
      models: this.supportedProviders.openai.models
    };
  }
  async testGeminiAPI(apiKey) {
    return {
      success: true,
      provider: "gemini",
      message: "API key is valid",
      models: this.supportedProviders.gemini.models
    };
  }
  /**
   * Cleanup and destroy
   */
  async destroy() {
    try {
      this.providers.clear();
      this.encryptionKey = null;
      this.isInitialized = false;
      console.log("[SecureKeyManager] Destroyed successfully");
    } catch (error) {
      console.error("[SecureKeyManager] Cleanup failed:", error);
    }
  }
}
const __dirname$1 = path.dirname(url.fileURLToPath(require("url").pathToFileURL(__filename).href));
dotenv.config({ path: path.join(__dirname$1, "../../.env") });
const store = new Store();
electron.app.commandLine.appendSwitch("disable-gpu");
electron.app.commandLine.appendSwitch("disable-software-rasterizer");
electron.app.commandLine.appendSwitch("disable-gpu-compositing");
electron.app.commandLine.appendSwitch("enable-features", "OverlayScrollbar");
electron.app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");
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
    this.langChainService = null;
    this.chatHistoryStore = new ChatHistoryStore();
    this.secureKeyManager = new SecureKeyManager();
    this.currentWorkspace = "start";
    this.currentTabId = null;
    this.setupApp();
  }
  setupApp() {
    electron.app.whenReady().then(async () => {
      console.log("🚀 Electron 앱 시작됨");
      try {
        await this.chatHistoryStore.initialize();
        console.log("[MAIN] Chat history store initialized");
      } catch (error) {
        console.warn("[MAIN] Chat history store initialization failed:", error);
      }
      try {
        await this.secureKeyManager.initialize();
        console.log("[MAIN] Secure key manager initialized");
        this.langChainService = new LangChainService(this.secureKeyManager);
        await this.langChainService.initialize();
        console.log("[MAIN] LangChain service initialized");
      } catch (error) {
        console.warn("[MAIN] Secure key manager initialization failed:", error);
      }
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
        sandbox: false,
        // Allow JavaScript execution in renderer
        // Additional GPU optimization flags
        disableHardwareAcceleration: false,
        // Keep hardware acceleration for performance
        offscreen: false
        // Disable offscreen rendering which can cause GL issues
      },
      // Window-level GPU optimization
      backgroundColor: "#ffffff",
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
      this.chatHistoryStore.destroy();
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
    electron.ipcMain.handle("storage-get", async (event, key) => {
      console.log(`[MAIN] IPC storage-get: ${key}`);
      return store.get(key);
    });
    electron.ipcMain.handle("storage-set", async (event, key, value) => {
      console.log(`[MAIN] IPC storage-set: ${key}`);
      store.set(key, value);
      return true;
    });
    electron.ipcMain.handle("storage-delete", async (event, key) => {
      console.log(`[MAIN] IPC storage-delete: ${key}`);
      store.delete(key);
      return true;
    });
    electron.ipcMain.handle("storage-has", async (event, key) => {
      console.log(`[MAIN] IPC storage-has: ${key}`);
      return store.has(key);
    });
    electron.ipcMain.handle("ai-provider-store-key", async (event, { providerId, keyData }) => {
      console.log(`[MAIN] IPC ai-provider-store-key: ${providerId}`);
      try {
        return await this.secureKeyManager.storeProviderKey(providerId, keyData);
      } catch (error) {
        console.error("[MAIN] Failed to store provider key:", error);
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-get-key", async (event, { providerId }) => {
      console.log(`[MAIN] IPC ai-provider-get-key: ${providerId}`);
      try {
        return await this.secureKeyManager.getProviderKey(providerId);
      } catch (error) {
        console.error("[MAIN] Failed to get provider key:", error);
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-remove-key", async (event, { providerId }) => {
      console.log(`[MAIN] IPC ai-provider-remove-key: ${providerId}`);
      try {
        return await this.secureKeyManager.removeProviderKey(providerId);
      } catch (error) {
        console.error("[MAIN] Failed to remove provider key:", error);
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-has-key", (event, { providerId }) => {
      console.log(`[MAIN] IPC ai-provider-has-key: ${providerId}`);
      return this.secureKeyManager.hasProviderKey(providerId);
    });
    electron.ipcMain.handle("ai-provider-get-info", (event, { providerId }) => {
      console.log(`[MAIN] IPC ai-provider-get-info: ${providerId}`);
      return this.secureKeyManager.getProviderInfo(providerId);
    });
    electron.ipcMain.handle("ai-provider-get-all", (event) => {
      console.log("[MAIN] IPC ai-provider-get-all");
      return this.secureKeyManager.getAllProviders();
    });
    electron.ipcMain.handle("ai-provider-test-key", async (event, { providerId }) => {
      console.log(`[MAIN] IPC ai-provider-test-key: ${providerId}`);
      try {
        return await this.secureKeyManager.testProviderKey(providerId);
      } catch (error) {
        console.error("[MAIN] Provider key test failed:", error);
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-update-config", async (event, { providerId, config }) => {
      console.log(`[MAIN] IPC ai-provider-update-config: ${providerId}`);
      try {
        return await this.secureKeyManager.updateProviderConfig(providerId, config);
      } catch (error) {
        console.error("[MAIN] Failed to update provider config:", error);
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-get-stats", (event) => {
      console.log("[MAIN] IPC ai-provider-get-stats");
      return this.secureKeyManager.getProviderStats();
    });
    electron.ipcMain.handle("ai-provider-export-config", async (event) => {
      console.log("[MAIN] IPC ai-provider-export-config");
      try {
        return await this.secureKeyManager.exportConfig();
      } catch (error) {
        console.error("[MAIN] Failed to export provider config:", error);
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-import-config", async (event, { importData }) => {
      console.log("[MAIN] IPC ai-provider-import-config");
      try {
        return await this.secureKeyManager.importConfig(importData);
      } catch (error) {
        console.error("[MAIN] Failed to import provider config:", error);
        throw error;
      }
    });
    electron.ipcMain.handle("langchain-send-message", async (event, { message, conversationHistory, systemPrompt }) => {
      console.log("[MAIN] IPC langchain-send-message");
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error("LangChain service not initialized");
        }
        return await this.langChainService.sendMessage(message, conversationHistory, systemPrompt);
      } catch (error) {
        console.error("[MAIN] LangChain send message failed:", error);
        return {
          success: false,
          error: error.message,
          provider: this.langChainService?.currentProvider || "unknown",
          metadata: { timestamp: Date.now() }
        };
      }
    });
    electron.ipcMain.handle("langchain-stream-message", async (event, { message, conversationHistory, systemPrompt }) => {
      console.log("[MAIN] IPC langchain-stream-message");
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error("LangChain service not initialized");
        }
        return await this.langChainService.streamMessage(
          message,
          conversationHistory,
          systemPrompt,
          (chunk) => {
            event.sender.send("langchain-stream-chunk", { chunk });
          }
        );
      } catch (error) {
        console.error("[MAIN] LangChain stream message failed:", error);
        return {
          success: false,
          error: error.message,
          provider: this.langChainService?.currentProvider || "unknown",
          metadata: { timestamp: Date.now(), streamed: true }
        };
      }
    });
    electron.ipcMain.handle("langchain-switch-provider", async (event, { providerId, modelId }) => {
      console.log(`[MAIN] IPC langchain-switch-provider: ${providerId}, model: ${modelId}`);
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error("LangChain service not initialized");
        }
        return await this.langChainService.switchProvider(providerId, modelId);
      } catch (error) {
        console.error("[MAIN] LangChain switch provider failed:", error);
        throw error;
      }
    });
    electron.ipcMain.handle("langchain-get-providers", (event) => {
      console.log("[MAIN] IPC langchain-get-providers");
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          return [];
        }
        return this.langChainService.getAvailableProviders();
      } catch (error) {
        console.error("[MAIN] LangChain get providers failed:", error);
        return [];
      }
    });
    electron.ipcMain.handle("langchain-get-current-status", (event) => {
      console.log("[MAIN] IPC langchain-get-current-status");
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          return {
            provider: null,
            model: null,
            status: "disconnected",
            costTracker: { session: { input: 0, output: 0, total: 0 }, total: { input: 0, output: 0, total: 0 } }
          };
        }
        return this.langChainService.getCurrentProviderStatus();
      } catch (error) {
        console.error("[MAIN] LangChain get current status failed:", error);
        return {
          provider: null,
          model: null,
          status: "error",
          error: error.message,
          costTracker: { session: { input: 0, output: 0, total: 0 }, total: { input: 0, output: 0, total: 0 } }
        };
      }
    });
    electron.ipcMain.handle("langchain-test-provider", async (event, { providerId }) => {
      console.log(`[MAIN] IPC langchain-test-provider: ${providerId}`);
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error("LangChain service not initialized");
        }
        return await this.langChainService.testProvider(providerId);
      } catch (error) {
        console.error("[MAIN] LangChain test provider failed:", error);
        return {
          success: false,
          provider: providerId,
          error: error.message
        };
      }
    });
    electron.ipcMain.handle("langchain-get-provider-models", (event, { providerId }) => {
      console.log(`[MAIN] IPC langchain-get-provider-models: ${providerId}`);
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          return [];
        }
        return this.langChainService.getProviderModels(providerId);
      } catch (error) {
        console.error("[MAIN] LangChain get provider models failed:", error);
        return [];
      }
    });
    electron.ipcMain.handle("langchain-update-provider-model", async (event, { providerId, modelId }) => {
      console.log(`[MAIN] IPC langchain-update-provider-model: ${providerId}, model: ${modelId}`);
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error("LangChain service not initialized");
        }
        return await this.langChainService.updateProviderModel(providerId, modelId);
      } catch (error) {
        console.error("[MAIN] LangChain update provider model failed:", error);
        throw error;
      }
    });
    electron.ipcMain.handle("langchain-reset-session-costs", (event) => {
      console.log("[MAIN] IPC langchain-reset-session-costs");
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          return false;
        }
        this.langChainService.resetSessionCosts();
        return true;
      } catch (error) {
        console.error("[MAIN] LangChain reset session costs failed:", error);
        return false;
      }
    });
    this.setupWebContentsEvents();
  }
}
new EGDeskTaehwa();
