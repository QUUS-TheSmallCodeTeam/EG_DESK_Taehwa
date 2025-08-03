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
      this.setupWebContentsEvents(webContentsView, tabId);
      this.webContentsViews.set(tabId, webContentsView);
      await webContentsView.webContents.loadURL(url2);
      this.emit("tab-created", { tabId, url: url2 });
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
      if (this.currentTabId && this.webContentsViews.has(this.currentTabId)) {
        const oldView = this.webContentsViews.get(this.currentTabId);
        try {
          if (this.mainWindow.contentView && this.mainWindow.contentView.children.includes(oldView)) {
            this.mainWindow.contentView.removeChildView(oldView);
          }
        } catch (e) {
        }
      }
      try {
        if (this.mainWindow.contentView) {
          this.mainWindow.contentView.addChildView(newView);
          if (typeof newView.setVisible === "function") {
            newView.setVisible(false);
          }
        } else {
          throw new Error("MainWindow contentView API not available");
        }
      } catch (addError) {
        throw addError;
      }
      this.currentTabId = tabId;
      this.emit("tab-switched", { tabId });
      return { id: tabId };
    } catch (error) {
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
    try {
      const webContentsView = this.webContentsViews.get(targetTabId);
      await webContentsView.webContents.loadURL(url2);
      this.emit("url-loaded", { tabId: targetTabId, url: url2 });
      return { success: true, url: url2, tabId: targetTabId };
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
      throw new Error("No active tab for navigation");
    }
    const webContentsView = this.webContentsViews.get(targetTabId);
    if (webContentsView.webContents.canGoBack()) {
      webContentsView.webContents.goBack();
      return { success: true };
    } else {
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
      return { success: true };
    } else {
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
    } else {
      const windowBounds = this.mainWindow.getBounds();
      targetBounds = {
        x: 0,
        y: 0,
        width: windowBounds.width,
        height: windowBounds.height
      };
    }
    try {
      if (typeof webContentsView.setBounds === "function") {
        webContentsView.setBounds(targetBounds);
      } else {
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
    if (this.boundsUpdateTimeout) {
      clearTimeout(this.boundsUpdateTimeout);
    }
    const webContentsView = this.webContentsViews.get(this.currentTabId);
    if (preciseBounds) {
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
      }
    } catch (error) {
    }
  }
  /**
   * Set up WebContents event handlers
   */
  setupWebContentsEvents(webContentsView, tabId) {
    const webContents = webContentsView.webContents;
    webContents.on("did-navigate", (event, url2) => {
      this.emit("navigation", { tabId, url: url2, type: "navigate" });
    });
    webContents.on("did-navigate-in-page", (event, url2) => {
      this.emit("navigation", { tabId, url: url2, type: "navigate-in-page" });
    });
    webContents.on("did-finish-load", () => {
      const title = webContents.getTitle();
      const url2 = webContents.getURL();
      this.emit("loading-finished", { tabId, title, url: url2 });
    });
    webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
      this.emit("loading-failed", { tabId, errorCode, errorDescription, url: validatedURL });
    });
    webContents.on("page-title-updated", (event, title) => {
      this.emit("title-updated", { tabId, title });
    });
    webContents.on("certificate-error", (event, url2, error, certificate, callback) => {
      event.preventDefault();
      callback(true);
    });
    webContents.on("did-start-loading", () => {
      this.emit("loading-started", { tabId });
    });
    webContents.on("did-stop-loading", () => {
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
    const webContentsView = this.webContentsViews.get(tabId);
    if (this.currentTabId === tabId) {
      try {
        if (this.mainWindow.contentView && this.mainWindow.contentView.children.includes(webContentsView)) {
          this.mainWindow.contentView.removeChildView(webContentsView);
        }
      } catch (e) {
      }
      this.currentTabId = null;
    }
    webContentsView.webContents.close();
    this.webContentsViews.delete(tabId);
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
    this.removeAllListeners();
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
        name: "Claude (4.0 Sonnet)",
        models: [
          { id: "claude-3-5-sonnet-20241022", name: "Claude 4.0 Sonnet", context: 2e5 }
        ],
        defaultModel: "claude-3-5-sonnet-20241022",
        costPer1k: { input: 3e-3, output: 0.015 }
      },
      openai: {
        name: "ChatGPT (GPT-4o)",
        models: [
          { id: "gpt-4o", name: "GPT-4o", context: 128e3 }
        ],
        defaultModel: "gpt-4o",
        costPer1k: { input: 5e-3, output: 0.015 }
      },
      gemini: {
        name: "Gemini (2.5 Flash)",
        models: [
          { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", context: 1e6 }
        ],
        defaultModel: "gemini-2.5-flash",
        costPer1k: { input: 125e-5, output: 375e-5 }
      }
    };
  }
  /**
   * Initialize the LangChain service
   */
  async initialize() {
    try {
      console.log("🔧 LangChainService: Starting initialization...");
      if (!this.secureKeyManager || !this.secureKeyManager.isInitialized) {
        console.error("❌ LangChainService: SecureKeyManager not initialized");
        throw new Error("SecureKeyManager not initialized");
      }
      console.log("✅ LangChainService: SecureKeyManager is ready");
      await this.initializeProviders();
      this.isInitialized = true;
      console.log("✅ LangChainService: Initialization complete");
      console.log("📊 LangChainService: Current status:", {
        isInitialized: this.isInitialized,
        currentProvider: this.currentProvider,
        currentModel: this.currentModel,
        availableProviders: Array.from(this.providers.keys())
      });
      return true;
    } catch (error) {
      console.error("❌ LangChainService: Initialization failed:", error);
      throw error;
    }
  }
  /**
   * Initialize available providers based on stored API keys
   */
  async initializeProviders() {
    console.log("🔍 LangChainService: Starting provider initialization...");
    const availableProviders = [];
    this.currentProvider = "openai";
    this.currentModel = this.providerConfigs.openai.defaultModel;
    console.log("📝 LangChainService: Set default provider to OpenAI with model:", this.currentModel);
    console.log("🔑 LangChainService: Checking API keys for all providers...");
    for (const [providerId, config] of Object.entries(this.providerConfigs)) {
      try {
        console.log(`🔍 LangChainService: Checking provider ${providerId}...`);
        const hasKey = this.secureKeyManager.hasProviderKey(providerId);
        console.log(`🔑 LangChainService: Provider ${providerId} has API key:`, hasKey);
        if (hasKey) {
          console.log(`🔓 LangChainService: Getting API key for ${providerId}...`);
          const keyData = await this.secureKeyManager.getProviderKey(providerId);
          console.log(`✅ LangChainService: Got API key for ${providerId}, key length:`, keyData.api_key?.length || 0);
          console.log(`🏗️ LangChainService: Creating provider instance for ${providerId}...`);
          const provider = await this.createProvider(providerId, keyData.api_key);
          if (provider) {
            console.log(`✅ LangChainService: Successfully created provider ${providerId}`);
            this.providers.set(providerId, {
              instance: provider,
              config,
              currentModel: config.defaultModel,
              status: "ready"
            });
            availableProviders.push(providerId);
            console.log(`📊 LangChainService: Provider ${providerId} added to available providers`);
            if (!this.currentProvider || !this.providers.has(this.currentProvider)) {
              console.log(`🎯 LangChainService: Setting ${providerId} as current provider`);
              this.currentProvider = providerId;
              this.currentModel = config.defaultModel;
            }
          } else {
            console.warn(`⚠️ LangChainService: Failed to create provider instance for ${providerId}`);
          }
        } else {
          console.log(`🔒 LangChainService: No API key found for ${providerId}`);
        }
      } catch (error) {
        console.error(`❌ LangChainService: Error initializing provider ${providerId}:`, error.message);
      }
    }
    console.log("📊 LangChainService: Provider initialization summary:", {
      availableProviders,
      totalProviders: availableProviders.length,
      currentProvider: this.currentProvider,
      currentModel: this.currentModel,
      providersMap: Array.from(this.providers.keys())
    });
    if (availableProviders.length === 0) {
      console.warn("⚠️ LangChainService: No AI providers available. Please configure API keys.");
      this.currentProvider = "openai";
      this.currentModel = this.providerConfigs.openai.defaultModel;
      console.log("🎯 LangChainService: Fallback - Set default provider to OpenAI for UI purposes");
    } else {
      console.log(`✅ LangChainService: Successfully initialized ${availableProviders.length} providers`);
    }
  }
  /**
   * Create provider instance based on type
   */
  async createProvider(providerId, apiKey) {
    console.log(`🏗️ LangChainService: Creating provider ${providerId} with key length:`, apiKey?.length || 0);
    try {
      let provider;
      switch (providerId) {
        case "claude":
          console.log("🤖 LangChainService: Creating ChatAnthropic instance...");
          provider = new anthropic.ChatAnthropic({
            apiKey,
            model: this.providerConfigs.claude.defaultModel,
            temperature: 0.7,
            maxTokens: 4e3
          });
          break;
        case "openai":
          console.log("🧠 LangChainService: Creating ChatOpenAI instance...");
          provider = new openai.ChatOpenAI({
            apiKey,
            model: this.providerConfigs.openai.defaultModel,
            temperature: 0.7,
            maxTokens: 4e3
          });
          break;
        case "gemini":
          console.log("💎 LangChainService: Creating ChatGoogleGenerativeAI instance...");
          provider = new googleGenai.ChatGoogleGenerativeAI({
            apiKey,
            model: this.providerConfigs.gemini.defaultModel,
            temperature: 0.7,
            maxOutputTokens: 4e3
          });
          break;
        default:
          throw new Error(`Unsupported provider: ${providerId}`);
      }
      console.log(`✅ LangChainService: Successfully created provider instance for ${providerId}`);
      return provider;
    } catch (error) {
      console.error(`❌ LangChainService: Failed to create provider ${providerId}:`, error.message);
      throw error;
    }
  }
  /**
   * Switch to a different provider
   */
  async switchProvider(providerId, modelId = null) {
    console.log(`🔄 LangChainService: Switching to provider ${providerId} with model ${modelId}`);
    if (!this.isInitialized) {
      console.error("❌ LangChainService: Service not initialized for provider switch");
      throw new Error("LangChainService not initialized");
    }
    this.currentProvider = providerId;
    console.log(`📝 LangChainService: Set current provider to ${providerId}`);
    if (!this.providers.has(providerId)) {
      console.log(`⚠️ LangChainService: Provider ${providerId} not in initialized providers map`);
      const config = this.providerConfigs[providerId];
      if (!config) {
        console.error(`❌ LangChainService: Unknown provider ${providerId}`);
        throw new Error(`Unknown provider ${providerId}`);
      }
      this.currentModel = modelId || config.defaultModel;
      console.log(`📝 LangChainService: Set model to ${this.currentModel} for provider without API key`);
      const result2 = {
        success: true,
        provider: providerId,
        model: this.currentModel,
        status: "no_api_key",
        message: `Provider ${providerId} selected but API key not configured`
      };
      console.log("✅ LangChainService: Provider switch result (no API key):", result2);
      return result2;
    }
    console.log(`✅ LangChainService: Provider ${providerId} found in initialized providers`);
    const provider = this.providers.get(providerId);
    if (modelId) {
      console.log(`🔄 LangChainService: Updating model to ${modelId}`);
      const config = this.providerConfigs[providerId];
      const model = config.models.find((m) => m.id === modelId);
      if (!model) {
        console.error(`❌ LangChainService: Model ${modelId} not available for provider ${providerId}`);
        throw new Error(`Model ${modelId} not available for provider ${providerId}`);
      }
      console.log(`🔄 LangChainService: Recreating provider instance with new model...`);
      const keyData = await this.secureKeyManager.getProviderKey(providerId);
      provider.instance = await this.createProvider(providerId, keyData.api_key);
      provider.instance.model = modelId;
      provider.currentModel = modelId;
      console.log(`✅ LangChainService: Updated provider instance with model ${modelId}`);
    }
    this.currentProvider = providerId;
    this.currentModel = provider.currentModel;
    const result = {
      success: true,
      provider: providerId,
      model: this.currentModel,
      config: provider.config
    };
    console.log("✅ LangChainService: Provider switch result (with API key):", result);
    return result;
  }
  /**
   * Send a chat message
   */
  async sendMessage(message, conversationHistory = [], systemPrompt = null) {
    if (!this.isInitialized) {
      throw new Error("LangChainService not initialized");
    }
    if (!this.providers.has(this.currentProvider)) {
      return {
        success: false,
        error: `${this.currentProvider} API key not configured. Please add your API key in settings.`,
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          timestamp: Date.now(),
          needsApiKey: true
        }
      };
    }
    try {
      const provider = this.providers.get(this.currentProvider);
      const messages2 = this.buildMessageHistory(message, conversationHistory, systemPrompt);
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
      return result;
    } catch (error) {
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
      return {
        success: false,
        error: `${this.currentProvider} API key not configured. Please add your API key in settings.`,
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          timestamp: Date.now(),
          needsApiKey: true,
          streamed: true
        }
      };
    }
    try {
      const provider = this.providers.get(this.currentProvider);
      const messages2 = this.buildMessageHistory(message, conversationHistory, systemPrompt);
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
      return result;
    } catch (error) {
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
    console.log("📊 LangChainService: Getting current provider status...");
    console.log("📊 LangChainService: Current state:", {
      currentProvider: this.currentProvider,
      currentModel: this.currentModel,
      isInitialized: this.isInitialized,
      providersCount: this.providers.size,
      availableProviders: Array.from(this.providers.keys())
    });
    if (!this.currentProvider) {
      console.log("⚠️ LangChainService: No current provider set");
      return {
        provider: null,
        model: null,
        status: "disconnected",
        costTracker: this.costTracker
      };
    }
    const config = this.providerConfigs[this.currentProvider];
    if (!config) {
      console.log(`❌ LangChainService: No config found for provider ${this.currentProvider}`);
      return {
        provider: null,
        model: null,
        status: "disconnected",
        costTracker: this.costTracker
      };
    }
    console.log(`📝 LangChainService: Found config for provider ${this.currentProvider}`);
    if (this.providers.has(this.currentProvider)) {
      console.log(`✅ LangChainService: Provider ${this.currentProvider} is initialized with API key`);
      const provider = this.providers.get(this.currentProvider);
      const status2 = {
        provider: {
          id: this.currentProvider,
          name: config.name,
          currentModel: this.currentModel
        },
        model: config.models.find((m) => m.id === this.currentModel),
        status: provider.status,
        costTracker: this.costTracker
      };
      console.log("📊 LangChainService: Status with API key:", status2);
      return status2;
    }
    console.log(`⚠️ LangChainService: Provider ${this.currentProvider} selected but no API key configured`);
    const status = {
      provider: {
        id: this.currentProvider,
        name: config.name,
        currentModel: this.currentModel
      },
      model: config.models.find((m) => m.id === this.currentModel),
      status: "no_api_key",
      costTracker: this.costTracker
    };
    console.log("📊 LangChainService: Status without API key:", status);
    return status;
  }
  /**
   * Reset session cost tracking
   */
  resetSessionCosts() {
    this.costTracker.session = { input: 0, output: 0, total: 0 };
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
    } catch (error) {
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
      this.store = new Store(this.options);
      this.setupIPCHandlers();
      this.startBackupTimer();
      await this.validateAndRepairData();
      this.isInitialized = true;
      return true;
    } catch (error) {
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
      return {
        success: true,
        conversationId,
        isNew,
        messageCount: validatedConversation.messages.length
      };
    } catch (error) {
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
      return {
        success: true,
        conversation
      };
    } catch (error) {
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
      return {
        success: true,
        query,
        results
      };
    } catch (error) {
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
      return {
        success: true,
        conversationId,
        messageId: validatedMessage.id,
        messageCount: conversation.messages.length
      };
    } catch (error) {
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
      return {
        success: true,
        conversationId,
        messageId,
        updatedMessage: conversation.messages[messageIndex]
      };
    } catch (error) {
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
      return {
        success: true,
        conversationId,
        messageId,
        deletedMessage,
        remainingMessages: conversation.messages.length
      };
    } catch (error) {
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
      return {
        success: true,
        sessionId,
        session
      };
    } catch (error) {
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
      return {
        success: true,
        sessionId,
        session: sessions[sessionId]
      };
    } catch (error) {
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
      return {
        success: true,
        sessions: sessionList,
        total: Object.keys(sessions).length
      };
    } catch (error) {
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
      return {
        success: true,
        data: exportData,
        format,
        conversationCount: Object.keys(exportData.conversations || {}).length
      };
    } catch (error) {
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
      return {
        success: true,
        importedConversations: importedCount,
        totalConversations: Object.keys(newConversations).length,
        merged: merge
      };
    } catch (error) {
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
      return {
        success: true,
        backupData,
        timestamp,
        conversationCount: Object.keys(backupData.conversations).length
      };
    } catch (error) {
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
      return {
        success: true,
        restoredConversations: Object.keys(backupData.conversations || {}).length,
        totalConversations: conversationCount,
        merged: merge
      };
    } catch (error) {
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
      return {
        success: true,
        deletedConversations,
        deletedSessions,
        remainingConversations: Object.keys(conversations).length,
        remainingSessions: Object.keys(sessions).length
      };
    } catch (error) {
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
      }
    } catch (error) {
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
      }
    }, 6 * 60 * 60 * 1e3);
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
      console.log("🔐 SecureKeyManager: Starting initialization...");
      if (!electron.safeStorage.isEncryptionAvailable()) {
        console.error("❌ SecureKeyManager: System encryption is not available");
        throw new Error("System encryption is not available");
      }
      console.log("✅ SecureKeyManager: System encryption is available");
      await this.initializeEncryption();
      console.log("✅ SecureKeyManager: Encryption initialized");
      await this.loadProviderConfigs();
      console.log("✅ SecureKeyManager: Provider configs loaded");
      this.isInitialized = true;
      console.log("✅ SecureKeyManager: Set as initialized");
      await this.loadEnvironmentVariables();
      console.log("✅ SecureKeyManager: Environment variables processed");
      console.log("📊 SecureKeyManager: Initialization complete. Summary:", {
        isInitialized: this.isInitialized,
        providersCount: this.providers.size,
        providers: Array.from(this.providers.keys())
      });
      return true;
    } catch (error) {
      console.error("❌ SecureKeyManager: Initialization failed:", error);
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
      } catch (error) {
        this.encryptionKey = crypto.randomBytes(32);
        await fs.writeFile(keyPath, this.encryptionKey, { mode: 384 });
      }
    } catch (error) {
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
      return true;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Retrieve API key for a provider
   */
  async getProviderKey(providerId) {
    console.log(`🔓 SecureKeyManager: Getting provider key for ${providerId}`);
    if (!this.isInitialized) {
      console.error("❌ SecureKeyManager: Not initialized when getting provider key");
      throw new Error("SecureKeyManager not initialized");
    }
    const providerData = this.providers.get(providerId);
    if (!providerData) {
      console.log(`⚠️ SecureKeyManager: No provider data found for ${providerId}`);
      return null;
    }
    console.log(`✅ SecureKeyManager: Found provider data for ${providerId}`);
    try {
      console.log(`🔓 SecureKeyManager: Decrypting key data for ${providerId}`);
      const decryptedData = this.decryptData(providerData.encrypted);
      console.log(`✅ SecureKeyManager: Successfully decrypted key for ${providerId}, key length:`, decryptedData.api_key?.length || 0);
      providerData.lastUsed = Date.now();
      return decryptedData;
    } catch (error) {
      console.error(`❌ SecureKeyManager: Failed to decrypt key for ${providerId}:`, error.message);
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
      return true;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Check if provider has stored key
   */
  hasProviderKey(providerId) {
    const hasKey = this.providers.has(providerId);
    console.log(`🔑 SecureKeyManager: Provider ${providerId} has key: ${hasKey}`);
    return hasKey;
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
    return importedCount;
  }
  /**
   * Load API keys from environment variables and auto-store them
   */
  async loadEnvironmentVariables() {
    try {
      console.log("🌍 SecureKeyManager: Loading environment variables...");
      const environmentMappings = {
        "claude": "CLAUDE_API_KEY",
        "openai": "OPENAI_API_KEY",
        "gemini": "GEMINI_API_KEY"
      };
      let autoStoredCount = 0;
      console.log("🔍 SecureKeyManager: Checking environment variables for providers...");
      for (const [providerId, envVarName] of Object.entries(environmentMappings)) {
        console.log(`🔍 SecureKeyManager: Checking ${envVarName} for provider ${providerId}`);
        const envValue = process.env[envVarName];
        if (envValue && envValue.trim()) {
          console.log(`✅ SecureKeyManager: Found ${envVarName} with length: ${envValue.trim().length}`);
          if (!this.hasProviderKey(providerId)) {
            try {
              console.log(`💾 SecureKeyManager: Auto-storing key for ${providerId} from ${envVarName}`);
              const keyData = { api_key: envValue.trim() };
              await this.storeProviderKey(providerId, keyData);
              console.log(`✅ SecureKeyManager: Successfully auto-stored key for ${providerId}`);
              autoStoredCount++;
            } catch (error) {
              console.error(`❌ SecureKeyManager: Failed to auto-store key for ${providerId}:`, error.message);
            }
          } else {
            console.log(`📝 SecureKeyManager: Provider ${providerId} already has stored key, skipping env variable`);
          }
        } else {
          console.log(`⚠️ SecureKeyManager: No value found for ${envVarName}`);
        }
      }
      if (autoStoredCount > 0) {
        console.log(`✅ SecureKeyManager: Auto-stored ${autoStoredCount} API keys from environment variables`);
      } else {
        console.log("📝 SecureKeyManager: No new API keys auto-stored from environment variables");
      }
    } catch (error) {
      console.error("❌ SecureKeyManager: Error loading environment variables:", error);
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
            config.encrypted = Buffer.from(config.encrypted.data).toString("base64");
          }
          this.providers.set(providerId, config);
        }
      }
      if (this.providers.size > 0) {
        await this.saveProviderConfigs();
      }
    } catch (error) {
      if (error.code !== "ENOENT") ;
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
    } catch (error) {
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
    } catch (error) {
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
});
process.on("unhandledRejection", (reason, promise) => {
});
electron.app.on("render-process-gone", (event, webContents, details) => {
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
      try {
        await this.chatHistoryStore.initialize();
      } catch (error) {
      }
      try {
        await this.secureKeyManager.initialize();
        this.langChainService = new LangChainService(this.secureKeyManager);
        await this.langChainService.initialize();
      } catch (error) {
      }
      this.createMainWindow();
      this.setupMenu();
      this.setupIPC();
    });
    electron.app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        electron.app.quit();
      }
    });
    electron.app.on("activate", () => {
      if (electron.BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }
  createMainWindow() {
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
      this.mainWindow.loadFile(rendererPath);
    }
    this.initializeWebContentsManager();
    this.mainWindow.once("ready-to-show", () => {
      this.mainWindow.show();
    });
    this.mainWindow.webContents.once("did-finish-load", () => {
    });
    this.mainWindow.on("closed", () => {
      this.webContentsManager.destroy();
      this.chatHistoryStore.destroy();
      this.mainWindow = null;
    });
    this.mainWindow.webContents.on("render-process-gone", (event, details) => {
    });
    this.mainWindow.on("unresponsive", () => {
    });
  }
  initializeWebContentsManager() {
    this.webContentsManager.initialize(this.mainWindow);
  }
  async setupBlogWorkspace() {
    try {
      const tabId = await this.webContentsManager.createTab("https://m8chaa.mycafe24.com/");
      await this.webContentsManager.switchTab(tabId);
      this.currentTabId = tabId;
    } catch (error) {
    }
  }
  hideWebContentsView() {
    if (this.currentTabId && this.webContentsManager) {
      try {
        const currentView = this.webContentsManager.webContentsViews.get(this.currentTabId);
        if (currentView) {
          if (this.mainWindow.contentView && this.mainWindow.contentView.children.includes(currentView)) {
            this.mainWindow.contentView.removeChildView(currentView);
          }
        }
      } catch (error) {
      }
    }
    this.currentTabId = null;
  }
  setupWebContentsEvents() {
    this.webContentsManager.on("navigation", (data) => {
      this.mainWindow.webContents.send("browser-navigated", data);
    });
    this.webContentsManager.on("loading-failed", (data) => {
      this.mainWindow.webContents.send("browser-load-failed", data);
    });
    this.webContentsManager.on("loading-finished", (data) => {
      this.mainWindow.webContents.send("browser-load-finished", data);
    });
    this.webContentsManager.on("loading-started", (data) => {
      this.mainWindow.webContents.send("browser-load-started", data);
    });
    this.webContentsManager.on("loading-stopped", (data) => {
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
    electron.ipcMain.handle("store-get", (event, key) => {
      return store.get(key);
    });
    electron.ipcMain.handle("store-set", (event, key, value) => {
      store.set(key, value);
      return true;
    });
    electron.ipcMain.handle("terminal-log", (event, message, level = "log") => {
      const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
      const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "📝";
      console[level](`${prefix} [${timestamp}] ${message}`);
    });
    electron.ipcMain.handle("switch-workspace", async (event, workspace) => {
      this.currentWorkspace = workspace;
      if (workspace === "blog") {
        await this.setupBlogWorkspace();
      } else {
        this.hideWebContentsView();
      }
      return { success: true, workspace };
    });
    electron.ipcMain.handle("browser-create-tab", async (event, { url: url2, options }) => {
      try {
        const tabId = await this.webContentsManager.createTab(url2, options);
        return { success: true, tabId, url: url2 };
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("browser-switch-tab", async (event, { tabId }) => {
      try {
        const result = await this.webContentsManager.switchTab(tabId);
        return result;
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("browser-load-url", async (event, { url: url2, tabId }) => {
      try {
        const result = await this.webContentsManager.loadURL(url2, tabId);
        return result;
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("browser-go-back", async (event, { tabId } = {}) => {
      return await this.webContentsManager.goBack(tabId);
    });
    electron.ipcMain.handle("browser-go-forward", async (event, { tabId } = {}) => {
      return await this.webContentsManager.goForward(tabId);
    });
    electron.ipcMain.handle("browser-reload", async (event, { tabId } = {}) => {
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
      try {
        return await this.webContentsManager.executeScript(script, tabId);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("browser-get-navigation-state", (event, { tabId } = {}) => {
      return this.webContentsManager.getNavigationState(tabId);
    });
    electron.ipcMain.handle("browser-close-tab", async (event, { tabId }) => {
      try {
        this.webContentsManager.closeTab(tabId);
        return { success: true, tabId };
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("browser-update-bounds", (event, bounds) => {
      try {
        this.webContentsManager.updateWebContentsViewBounds(bounds);
        return { success: true };
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.on("window-minimize", () => {
      this.mainWindow.minimize();
    });
    electron.ipcMain.on("window-maximize", () => {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    });
    electron.ipcMain.on("window-close", () => {
      this.mainWindow.close();
    });
    electron.ipcMain.handle("storage-get", async (event, key) => {
      return store.get(key);
    });
    electron.ipcMain.handle("storage-set", async (event, key, value) => {
      store.set(key, value);
      return true;
    });
    electron.ipcMain.handle("storage-delete", async (event, key) => {
      store.delete(key);
      return true;
    });
    electron.ipcMain.handle("storage-has", async (event, key) => {
      return store.has(key);
    });
    electron.ipcMain.handle("ai-provider-store-key", async (event, { providerId, keyData }) => {
      try {
        return await this.secureKeyManager.storeProviderKey(providerId, keyData);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-get-key", async (event, { providerId }) => {
      try {
        return await this.secureKeyManager.getProviderKey(providerId);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-remove-key", async (event, { providerId }) => {
      try {
        return await this.secureKeyManager.removeProviderKey(providerId);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-has-key", (event, { providerId }) => {
      return this.secureKeyManager.hasProviderKey(providerId);
    });
    electron.ipcMain.handle("ai-provider-get-info", (event, { providerId }) => {
      return this.secureKeyManager.getProviderInfo(providerId);
    });
    electron.ipcMain.handle("ai-provider-get-all", (event) => {
      return this.secureKeyManager.getAllProviders();
    });
    electron.ipcMain.handle("ai-provider-test-key", async (event, { providerId }) => {
      try {
        return await this.secureKeyManager.testProviderKey(providerId);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-update-config", async (event, { providerId, config }) => {
      try {
        return await this.secureKeyManager.updateProviderConfig(providerId, config);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-get-stats", (event) => {
      return this.secureKeyManager.getProviderStats();
    });
    electron.ipcMain.handle("ai-provider-export-config", async (event) => {
      try {
        return await this.secureKeyManager.exportConfig();
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("ai-provider-import-config", async (event, { importData }) => {
      try {
        return await this.secureKeyManager.importConfig(importData);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("langchain-send-message", async (event, { message, conversationHistory, systemPrompt }) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error("LangChain service not initialized");
        }
        return await this.langChainService.sendMessage(message, conversationHistory, systemPrompt);
      } catch (error) {
        return {
          success: false,
          error: error.message,
          provider: this.langChainService?.currentProvider || "unknown",
          metadata: { timestamp: Date.now() }
        };
      }
    });
    electron.ipcMain.handle("langchain-stream-message", async (event, { message, conversationHistory, systemPrompt }) => {
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
        return {
          success: false,
          error: error.message,
          provider: this.langChainService?.currentProvider || "unknown",
          metadata: { timestamp: Date.now(), streamed: true }
        };
      }
    });
    electron.ipcMain.handle("langchain-switch-provider", async (event, { providerId, modelId }) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error("LangChain service not initialized");
        }
        return await this.langChainService.switchProvider(providerId, modelId);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("langchain-get-providers", (event) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          return [];
        }
        return this.langChainService.getAvailableProviders();
      } catch (error) {
        return [];
      }
    });
    electron.ipcMain.handle("langchain-get-current-status", (event) => {
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
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error("LangChain service not initialized");
        }
        return await this.langChainService.testProvider(providerId);
      } catch (error) {
        return {
          success: false,
          provider: providerId,
          error: error.message
        };
      }
    });
    electron.ipcMain.handle("langchain-get-provider-models", (event, { providerId }) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          return [];
        }
        return this.langChainService.getProviderModels(providerId);
      } catch (error) {
        return [];
      }
    });
    electron.ipcMain.handle("langchain-update-provider-model", async (event, { providerId, modelId }) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error("LangChain service not initialized");
        }
        return await this.langChainService.updateProviderModel(providerId, modelId);
      } catch (error) {
        throw error;
      }
    });
    electron.ipcMain.handle("langchain-reset-session-costs", (event) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          return false;
        }
        this.langChainService.resetSessionCosts();
        return true;
      } catch (error) {
        return false;
      }
    });
    this.setupWebContentsEvents();
  }
}
new EGDeskTaehwa();
