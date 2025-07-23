const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    notifyParent: (message) => ipcRenderer.send('webview-message', message),
    getURL: () => ipcRenderer.invoke('get-webview-url'),
    canGoBack: () => ipcRenderer.invoke('can-go-back'),
    canGoForward: () => ipcRenderer.invoke('can-go-forward'),
    validateURL: (url) => ipcRenderer.invoke('validate-url', url)
});
