const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Workspace management
  switchWorkspace: (workspace) => ipcRenderer.invoke('switch-workspace', workspace),

  // Browser control APIs (for BrowserView)
  browser: {
    loadURL: (url) => ipcRenderer.invoke('browser-load-url', url),
    goBack: () => ipcRenderer.invoke('browser-go-back'),
    goForward: () => ipcRenderer.invoke('browser-go-forward'),
    reload: () => ipcRenderer.invoke('browser-reload'),
    canGoBack: () => ipcRenderer.invoke('browser-can-go-back'),
    canGoForward: () => ipcRenderer.invoke('browser-can-go-forward'),
    getCurrentURL: () => ipcRenderer.invoke('browser-get-url'),
    resizeView: (bounds) => ipcRenderer.invoke('resize-browser-view', bounds)
  },

  // Browser event listeners
  onBrowserNavigated: (callback) => ipcRenderer.on('browser-navigated', callback),
  onBrowserLoadFailed: (callback) => ipcRenderer.on('browser-load-failed', callback),  
  onBrowserLoadFinished: (callback) => ipcRenderer.on('browser-load-finished', callback),

  // Store operations
  store: {
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value)
  },

  // Terminal logging
  log: {
    info: (message) => ipcRenderer.invoke('terminal-log', message, 'log'),
    warn: (message) => ipcRenderer.invoke('terminal-log', message, 'warn'),
    error: (message) => ipcRenderer.invoke('terminal-log', message, 'error')
  },

  // Command execution
  command: {
    execute: (command) => ipcRenderer.invoke('execute-command', command)
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close')
  },

  // Menu events
  onMenuEvent: (callback) => {
    const events = [
      'menu-new-workflow',
      'menu-settings', 
      'switch-to-blog-workflow',
      'switch-to-main-workspace'
    ];
    
    events.forEach(event => {
      ipcRenderer.on(event, callback);
    });
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});