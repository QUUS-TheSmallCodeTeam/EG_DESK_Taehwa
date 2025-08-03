"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  // General IPC invoke method for direct access
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  // Event listener methods
  on: (channel, callback) => ipcRenderer.on(channel, callback),
  off: (channel, callback) => ipcRenderer.off(channel, callback),
  // Workspace management
  switchWorkspace: (workspace) => ipcRenderer.invoke("switch-workspace", workspace),
  // Browser control APIs (via WebContentsManager) - Legacy support
  browser: {
    loadURL: (url) => ipcRenderer.invoke("browser-load-url", { url }),
    goBack: () => ipcRenderer.invoke("browser-go-back"),
    goForward: () => ipcRenderer.invoke("browser-go-forward"),
    reload: () => ipcRenderer.invoke("browser-reload"),
    canGoBack: () => ipcRenderer.invoke("browser-can-go-back"),
    canGoForward: () => ipcRenderer.invoke("browser-can-go-forward"),
    getCurrentURL: () => ipcRenderer.invoke("browser-get-url"),
    getNavigationState: () => ipcRenderer.invoke("browser-get-navigation-state"),
    executeScript: (script) => ipcRenderer.invoke("browser-execute-script", { script }),
    updateBounds: (bounds) => ipcRenderer.invoke("browser-update-bounds", bounds)
  },
  // Browser event listeners
  onBrowserNavigated: (callback) => ipcRenderer.on("browser-navigated", callback),
  onBrowserLoadFailed: (callback) => ipcRenderer.on("browser-load-failed", callback),
  onBrowserLoadFinished: (callback) => ipcRenderer.on("browser-load-finished", callback),
  // Store operations
  store: {
    get: (key) => ipcRenderer.invoke("store-get", key),
    set: (key, value) => ipcRenderer.invoke("store-set", key, value)
  },
  // Terminal logging
  log: {
    info: (message) => ipcRenderer.invoke("terminal-log", message, "log"),
    warn: (message) => ipcRenderer.invoke("terminal-log", message, "warn"),
    error: (message) => ipcRenderer.invoke("terminal-log", message, "error")
  },
  // Storage for secure data
  storage: {
    get: (key) => ipcRenderer.invoke("storage-get", key),
    set: (key, value) => ipcRenderer.invoke("storage-set", key, value),
    delete: (key) => ipcRenderer.invoke("storage-delete", key),
    has: (key) => ipcRenderer.invoke("storage-has", key)
  },
  // Chat History management
  chatHistory: {
    // Conversation management
    saveConversation: (conversationData) => ipcRenderer.invoke("chat-history:save-conversation", conversationData),
    loadConversation: (conversationId) => ipcRenderer.invoke("chat-history:load-conversation", conversationId),
    listConversations: (options) => ipcRenderer.invoke("chat-history:list-conversations", options),
    deleteConversation: (conversationId) => ipcRenderer.invoke("chat-history:delete-conversation", conversationId),
    searchConversations: (searchOptions) => ipcRenderer.invoke("chat-history:search-conversations", searchOptions),
    // Message management
    addMessage: (messageData) => ipcRenderer.invoke("chat-history:add-message", messageData),
    updateMessage: (updateData) => ipcRenderer.invoke("chat-history:update-message", updateData),
    deleteMessage: (deleteData) => ipcRenderer.invoke("chat-history:delete-message", deleteData),
    // Session management
    createSession: (sessionData) => ipcRenderer.invoke("chat-history:create-session", sessionData),
    updateSession: (updateData) => ipcRenderer.invoke("chat-history:update-session", updateData),
    listSessions: (options) => ipcRenderer.invoke("chat-history:list-sessions", options),
    // Import/Export
    exportData: (exportOptions) => ipcRenderer.invoke("chat-history:export-data", exportOptions),
    importData: (importOptions) => ipcRenderer.invoke("chat-history:import-data", importOptions),
    // Backup/Restore
    backup: (backupOptions) => ipcRenderer.invoke("chat-history:backup", backupOptions),
    restore: (restoreOptions) => ipcRenderer.invoke("chat-history:restore", restoreOptions),
    // Metadata and cleanup
    getMetadata: () => ipcRenderer.invoke("chat-history:get-metadata"),
    cleanup: (cleanupOptions) => ipcRenderer.invoke("chat-history:cleanup", cleanupOptions)
  },
  // Window controls
  window: {
    minimize: () => ipcRenderer.send("window-minimize"),
    maximize: () => ipcRenderer.send("window-maximize"),
    close: () => ipcRenderer.send("window-close")
  },
  // Menu events
  onMenuEvent: (callback) => {
    const events = [
      "menu-new-workflow",
      "menu-settings",
      "switch-to-blog-workflow",
      "switch-to-main-workspace"
    ];
    events.forEach((event) => {
      ipcRenderer.on(event, callback);
    });
  },
  // AI Provider Management
  aiProvider: {
    // Key management
    storeKey: (providerId, keyData) => ipcRenderer.invoke("ai-provider-store-key", { providerId, keyData }),
    getKey: (providerId) => ipcRenderer.invoke("ai-provider-get-key", { providerId }),
    removeKey: (providerId) => ipcRenderer.invoke("ai-provider-remove-key", { providerId }),
    hasKey: (providerId) => ipcRenderer.invoke("ai-provider-has-key", { providerId }),
    // Provider information
    getInfo: (providerId) => ipcRenderer.invoke("ai-provider-get-info", { providerId }),
    getAll: () => ipcRenderer.invoke("ai-provider-get-all"),
    getStats: () => ipcRenderer.invoke("ai-provider-get-stats"),
    // Configuration management
    updateConfig: (providerId, config) => ipcRenderer.invoke("ai-provider-update-config", { providerId, config }),
    testKey: (providerId) => ipcRenderer.invoke("ai-provider-test-key", { providerId }),
    // Import/Export
    exportConfig: () => ipcRenderer.invoke("ai-provider-export-config"),
    importConfig: (importData) => ipcRenderer.invoke("ai-provider-import-config", { importData })
  },
  // LangChain Multi-Provider AI Chat
  langchainSendMessage: (options) => ipcRenderer.invoke("langchain-send-message", options),
  langchainStreamMessage: (options) => ipcRenderer.invoke("langchain-stream-message", options),
  langchainSwitchProvider: (options) => ipcRenderer.invoke("langchain-switch-provider", options),
  langchainGetProviders: () => ipcRenderer.invoke("langchain-get-providers"),
  langchainGetCurrentStatus: () => ipcRenderer.invoke("langchain-get-current-status"),
  langchainTestProvider: (options) => ipcRenderer.invoke("langchain-test-provider", options),
  langchainGetProviderModels: (options) => ipcRenderer.invoke("langchain-get-provider-models", options),
  langchainUpdateProviderModel: (options) => ipcRenderer.invoke("langchain-update-provider-model", options),
  langchainResetSessionCosts: () => ipcRenderer.invoke("langchain-reset-session-costs"),
  // LangChain streaming events
  onLangChainStreamChunk: (callback) => ipcRenderer.on("langchain-stream-chunk", callback),
  // WordPress API proxy
  wordpress: {
    request: async (params) => {
      if (params.isFormData && params.data instanceof FormData) {
        const file = params.data.get("file");
        if (file) {
          const buffer = await file.arrayBuffer();
          params.data = {
            file: {
              buffer: Array.from(new Uint8Array(buffer)),
              filename: file.name,
              type: file.type
            }
          };
        }
      }
      return ipcRenderer.invoke("wordpress-api-request", params);
    }
  },
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
