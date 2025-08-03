// Load environment variables from .env file first
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES6 module equivalent of __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env file from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { app, BrowserWindow, WebContentsView, ipcMain, Menu } from 'electron';
import Store from 'electron-store';

// Import modular components
import WebContentsManager from './modules/WebContentsManager.js';
import LangChainService from './modules/LangChainService.js';
import ChatHistoryStore from './modules/ChatHistoryStore.js';
import SecureKeyManager from './modules/SecureKeyManager.js';

// Initialize store for local data
const store = new Store();

// Disable GPU features that cause EGL warnings
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('enable-features', 'OverlayScrollbar');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

// Global error handlers
process.on('uncaughtException', (error) => {
});

process.on('unhandledRejection', (reason, promise) => {
});

app.on('render-process-gone', (event, webContents, details) => {
});

class EGDeskTaehwa {
  constructor() {
    this.mainWindow = null;
    this.webContentsManager = new WebContentsManager();
    this.langChainService = null; // Initialize after secureKeyManager
    this.chatHistoryStore = new ChatHistoryStore();
    this.secureKeyManager = new SecureKeyManager();
    this.currentWorkspace = 'start';
    this.currentTabId = null;
    this.setupApp();
  }

  setupApp() {
    app.whenReady().then(async () => {
      
      // Initialize chat history store
      try {
        await this.chatHistoryStore.initialize();
      } catch (error) {
      }
      
      // Initialize secure key manager
      try {
        await this.secureKeyManager.initialize();
        
        // Initialize LangChain service with SecureKeyManager
        this.langChainService = new LangChainService(this.secureKeyManager);
        await this.langChainService.initialize();
      } catch (error) {
      }
      
      this.createMainWindow();
      
      // Set window reference for LangChain service after window is created
      if (this.langChainService && this.mainWindow) {
        await this.langChainService.setElectronWindow(this.mainWindow);
      }
      
      this.setupMenu();
      this.setupIPC();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1600,
      height: 1000,
      minWidth: 1280,
      minHeight: 800,
      titleBarStyle: 'hiddenInset',
      title: '',
      icon: path.join(__dirname, 'assets/icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/index.js'),
        webSecurity: true,
        sandbox: false,  // Allow JavaScript execution in renderer
        // Additional GPU optimization flags
        disableHardwareAcceleration: false, // Keep hardware acceleration for performance
        offscreen: false // Disable offscreen rendering which can cause GL issues
      },
      // Window-level GPU optimization
      backgroundColor: '#ffffff',
      show: false
    });

    // Load the renderer process
    if (process.env.VITE_DEV_SERVER_URL) {
      // In development, load from vite dev server
      this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      // In production or preview mode, load the built file
      const rendererPath = path.join(__dirname, '../renderer/index.html');
      this.mainWindow.loadFile(rendererPath);
    }

    // Initialize WebContentsManager for website content
    this.initializeWebContentsManager();

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      // Temporarily enable dev tools to debug renderer issues
      // this.mainWindow.webContents.openDevTools();
    });

    this.mainWindow.webContents.once('did-finish-load', () => {
    });

    this.mainWindow.on('closed', () => {
      this.webContentsManager.destroy();
      this.chatHistoryStore.destroy();
      this.mainWindow = null;
    });
    
    // Updated crash handlers - use render-process-gone (crashed is deprecated)
    this.mainWindow.webContents.on('render-process-gone', (event, details) => {
    });
    
    this.mainWindow.on('unresponsive', () => {
    });

  }

  initializeWebContentsManager() {
    this.webContentsManager.initialize(this.mainWindow);
    
    // Resize handling is now done by BrowserTabComponent
    // this.mainWindow.on('resize', () => {
    //   if (this.currentWorkspace === 'blog') {
    //     this.webContentsManager.updateWebContentsViewBounds();
    //   }
    // });
  }

  async setupBlogWorkspace() {
    
    try {
      // Create and switch to a new tab with default WordPress URL
      const tabId = await this.webContentsManager.createTab('https://m8chaa.mycafe24.com/');
      await this.webContentsManager.switchTab(tabId);
      this.currentTabId = tabId;
      
      // Don't update bounds immediately - let BrowserTabComponent handle it
    } catch (error) {
    }
  }

  hideWebContentsView() {
    // Remove all WebContentsViews with proper API fallback
    if (this.currentTabId && this.webContentsManager) {
      try {
        const currentView = this.webContentsManager.webContentsViews.get(this.currentTabId);
        if (currentView) {
          // Try new contentView API first (Electron 30+)
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
    // WebContentsManager handles browser events internally
    // Set up communication between main process and renderer
    this.webContentsManager.on('navigation', (data) => {
      this.mainWindow.webContents.send('browser-navigated', data);
    });

    this.webContentsManager.on('loading-failed', (data) => {
      this.mainWindow.webContents.send('browser-load-failed', data);
    });

    this.webContentsManager.on('loading-finished', (data) => {
      this.mainWindow.webContents.send('browser-load-finished', data);
    });

    this.webContentsManager.on('loading-started', (data) => {
      this.mainWindow.webContents.send('browser-load-started', data);
    });

    this.webContentsManager.on('loading-stopped', (data) => {
      this.mainWindow.webContents.send('browser-load-stopped', data);
    });
  }

  setupMenu() {
    const template = [
      {
        label: '파일',
        submenu: [
          {
            label: '새 워크플로우',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.mainWindow.webContents.send('menu-new-workflow', { type: 'menu-new-workflow' });
            }
          },
          { type: 'separator' },
          {
            label: '설정',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              this.mainWindow.webContents.send('menu-settings', { type: 'menu-settings' });
            }
          },
          { type: 'separator' },
          {
            label: '종료',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: '편집',
        submenu: [
          { label: '실행 취소', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
          { label: '다시 실행', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
          { type: 'separator' },
          { label: '잘라내기', accelerator: 'CmdOrCtrl+X', role: 'cut' },
          { label: '복사', accelerator: 'CmdOrCtrl+C', role: 'copy' },
          { label: '붙여넣기', accelerator: 'CmdOrCtrl+V', role: 'paste' }
        ]
      },
      {
        label: '보기',
        submenu: [
          { label: '새로고침', accelerator: 'CmdOrCtrl+R', role: 'reload' },
          { label: '강제 새로고침', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
          { label: '개발자 도구', accelerator: 'F12', role: 'toggleDevTools' },
          { type: 'separator' },
          { label: '실제 크기', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
          { label: '확대', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
          { label: '축소', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
          { type: 'separator' },
          { label: '전체화면', accelerator: 'F11', role: 'togglefullscreen' }
        ]
      },
      {
        label: '워크플로우',
        submenu: [
          {
            label: '블로그 자동화',
            accelerator: 'CmdOrCtrl+B',
            click: () => {
              this.mainWindow.webContents.send('switch-to-blog-workflow', { type: 'switch-to-blog-workflow' });
            }
          },
          {
            label: '메인 워크스페이스',
            accelerator: 'CmdOrCtrl+M',
            click: () => {
              this.mainWindow.webContents.send('switch-to-main-workspace', { type: 'switch-to-main-workspace' });
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupIPC() {
    // Store operations
    ipcMain.handle('store-get', (event, key) => {
      return store.get(key);
    });

    ipcMain.handle('store-set', (event, key, value) => {
      store.set(key, value);
      return true;
    });

    // Terminal logging from renderer
    ipcMain.handle('terminal-log', (event, message, level = 'log') => {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '📝';
      console[level](`${prefix} [${timestamp}] ${message}`);
    });

    // Workspace switching
    ipcMain.handle('switch-workspace', async (event, workspace) => {
      this.currentWorkspace = workspace;
      
      if (workspace === 'blog') {
        await this.setupBlogWorkspace();
      } else {
        this.hideWebContentsView();
      }
      
      return { success: true, workspace };
    });

    // Browser navigation APIs (via WebContentsManager)
    ipcMain.handle('browser-create-tab', async (event, { url, options }) => {
      
      try {
        const tabId = await this.webContentsManager.createTab(url, options);
        return { success: true, tabId, url };
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('browser-switch-tab', async (event, { tabId }) => {
      
      try {
        const result = await this.webContentsManager.switchTab(tabId);
        return result;
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('browser-load-url', async (event, { url, tabId }) => {
      
      try {
        const result = await this.webContentsManager.loadURL(url, tabId);
        return result;
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('browser-go-back', async (event, { tabId } = {}) => {
      return await this.webContentsManager.goBack(tabId);
    });

    ipcMain.handle('browser-go-forward', async (event, { tabId } = {}) => {
      return await this.webContentsManager.goForward(tabId);
    });

    ipcMain.handle('browser-reload', async (event, { tabId } = {}) => {
      return await this.webContentsManager.reload(tabId);
    });

    ipcMain.handle('browser-can-go-back', (event) => {
      const state = this.webContentsManager.getNavigationState();
      return state.canGoBack;
    });

    ipcMain.handle('browser-can-go-forward', (event) => {
      const state = this.webContentsManager.getNavigationState();
      return state.canGoForward;
    });

    ipcMain.handle('browser-get-url', (event) => {
      const state = this.webContentsManager.getNavigationState();
      return state.url;
    });

    // WebContentsManager API access
    ipcMain.handle('browser-execute-script', async (event, { script, tabId }) => {
      try {
        return await this.webContentsManager.executeScript(script, tabId);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('browser-get-navigation-state', (event, { tabId } = {}) => {
      return this.webContentsManager.getNavigationState(tabId);
    });

    ipcMain.handle('browser-close-tab', async (event, { tabId }) => {
      
      try {
        this.webContentsManager.closeTab(tabId);
        return { success: true, tabId };
      } catch (error) {
        throw error;
      }
    });

    // WebContentsView bounds update
    ipcMain.handle('browser-update-bounds', (event, bounds) => {
      try {
        this.webContentsManager.updateWebContentsViewBounds(bounds);
        return { success: true };
      } catch (error) {
        throw error;
      }
    });


    // Window control handlers
    ipcMain.on('window-minimize', () => {
      this.mainWindow.minimize();
    });

    ipcMain.on('window-maximize', () => {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    });

    ipcMain.on('window-close', () => {
      this.mainWindow.close();
    });


    // Storage handlers for secure data
    ipcMain.handle('storage-get', async (event, key) => {
      return store.get(key);
    });

    ipcMain.handle('storage-set', async (event, key, value) => {
      store.set(key, value);
      return true;
    });

    ipcMain.handle('storage-delete', async (event, key) => {
      store.delete(key);
      return true;
    });

    ipcMain.handle('storage-has', async (event, key) => {
      return store.has(key);
    });

    // AI Provider and Secure Key Management
    ipcMain.handle('ai-provider-store-key', async (event, { providerId, keyData }) => {
      try {
        return await this.secureKeyManager.storeProviderKey(providerId, keyData);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('ai-provider-get-key', async (event, { providerId }) => {
      try {
        return await this.secureKeyManager.getProviderKey(providerId);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('ai-provider-remove-key', async (event, { providerId }) => {
      try {
        return await this.secureKeyManager.removeProviderKey(providerId);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('ai-provider-has-key', (event, { providerId }) => {
      return this.secureKeyManager.hasProviderKey(providerId);
    });

    ipcMain.handle('ai-provider-get-info', (event, { providerId }) => {
      return this.secureKeyManager.getProviderInfo(providerId);
    });

    ipcMain.handle('ai-provider-get-all', (event) => {
      return this.secureKeyManager.getAllProviders();
    });

    ipcMain.handle('ai-provider-test-key', async (event, { providerId }) => {
      try {
        return await this.secureKeyManager.testProviderKey(providerId);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('ai-provider-update-config', async (event, { providerId, config }) => {
      try {
        return await this.secureKeyManager.updateProviderConfig(providerId, config);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('ai-provider-get-stats', (event) => {
      return this.secureKeyManager.getProviderStats();
    });

    ipcMain.handle('ai-provider-export-config', async (event) => {
      try {
        return await this.secureKeyManager.exportConfig();
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('ai-provider-import-config', async (event, { importData }) => {
      try {
        return await this.secureKeyManager.importConfig(importData);
      } catch (error) {
        throw error;
      }
    });

    // LangChain Service Handlers
    ipcMain.handle('langchain-send-message', async (event, { message, conversationHistory, systemPrompt }) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error('LangChain service not initialized');
        }
        return await this.langChainService.sendMessage(message, conversationHistory, systemPrompt);
      } catch (error) {
        return {
          success: false,
          error: error.message,
          provider: this.langChainService?.currentProvider || 'unknown',
          metadata: { timestamp: Date.now() }
        };
      }
    });

    ipcMain.handle('langchain-stream-message', async (event, { message, conversationHistory, systemPrompt }) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error('LangChain service not initialized');
        }
        
        return await this.langChainService.streamMessage(
          message, 
          conversationHistory, 
          systemPrompt,
          (chunk) => {
            // Send chunk to renderer
            event.sender.send('langchain-stream-chunk', { chunk });
          }
        );
      } catch (error) {
        return {
          success: false,
          error: error.message,
          provider: this.langChainService?.currentProvider || 'unknown',
          metadata: { timestamp: Date.now(), streamed: true }
        };
      }
    });

    ipcMain.handle('langchain-switch-provider', async (event, { providerId, modelId }) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error('LangChain service not initialized');
        }
        return await this.langChainService.switchProvider(providerId, modelId);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('langchain-get-providers', (event) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          return [];
        }
        return this.langChainService.getAvailableProviders();
      } catch (error) {
        return [];
      }
    });

    ipcMain.handle('langchain-get-current-status', (event) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          return {
            provider: null,
            model: null,
            status: 'disconnected',
            costTracker: { session: { input: 0, output: 0, total: 0 }, total: { input: 0, output: 0, total: 0 } }
          };
        }
        return this.langChainService.getCurrentProviderStatus();
      } catch (error) {
        return {
          provider: null,
          model: null,
          status: 'error',
          error: error.message,
          costTracker: { session: { input: 0, output: 0, total: 0 }, total: { input: 0, output: 0, total: 0 } }
        };
      }
    });

    ipcMain.handle('langchain-test-provider', async (event, { providerId }) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error('LangChain service not initialized');
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

    ipcMain.handle('langchain-get-provider-models', (event, { providerId }) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          return [];
        }
        return this.langChainService.getProviderModels(providerId);
      } catch (error) {
        return [];
      }
    });

    ipcMain.handle('langchain-update-provider-model', async (event, { providerId, modelId }) => {
      try {
        if (!this.langChainService || !this.langChainService.isInitialized) {
          throw new Error('LangChain service not initialized');
        }
        return await this.langChainService.updateProviderModel(providerId, modelId);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('langchain-reset-session-costs', (event) => {
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

    // Set up WebContentsManager events
    this.setupWebContentsEvents();

    // Blog automation IPC from tools
    ipcMain.handle('start-blog-automation-from-tool', async (event, data) => {
      console.log('[Main] Received blog automation request from tool:', data);
      // Forward to renderer process
      this.mainWindow.webContents.send('start-blog-automation-from-tool', data);
      return { success: true };
    });

    // WordPress API proxy handlers
    ipcMain.handle('wordpress-api-request', async (event, { method, endpoint, data, credentials, isFormData, isImageUpload }) => {
      const fetch = (await import('node-fetch')).default;
      const FormData = (await import('form-data')).default;
      
      try {
        const url = `https://m8chaa.mycafe24.com/wp-json/wp/v2${endpoint}`;
        const base64Auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
        
        const options = {
          method,
          headers: {
            'Authorization': `Basic ${base64Auth}`
          }
        };
        
        if (data && method !== 'GET') {
          if (isFormData) {
            // Handle FormData for file uploads
            const formData = new FormData();
            
            // Handle image upload from URL
            if (isImageUpload && data.imageUrl) {
              console.log(`📸 [Main] Downloading image from: ${data.imageUrl}`);
              try {
                const imageResponse = await fetch(data.imageUrl);
                if (!imageResponse.ok) {
                  throw new Error(`Failed to download image: ${imageResponse.status}`);
                }
                const imageBuffer = await imageResponse.buffer();
                console.log(`✅ [Main] Image downloaded, size: ${imageBuffer.length} bytes`);
                
                // Check if image is too large (>2MB)
                if (imageBuffer.length > 2 * 1024 * 1024) {
                  console.log(`⚠️ [Main] Image is large (${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB), will be processed by WordPress`);
                }
                
                // Determine content type from URL or default to JPEG
                let contentType = 'image/jpeg';
                let filename = data.filename || 'image.jpg';
                
                if (data.imageUrl.includes('.png')) {
                  contentType = 'image/png';
                  filename = filename.replace('.jpg', '.png');
                }
                
                formData.append('file', imageBuffer, {
                  filename: filename,
                  contentType: contentType
                });
                
                // Add title and alt text for better WordPress handling
                if (data.title) {
                  formData.append('title', data.title);
                  formData.append('alt_text', data.title);
                }
                
              } catch (imageError) {
                console.error('❌ [Main] Image download failed:', imageError);
                throw imageError;
              }
            }
            // Extract file data from the transferred object
            else if (data.file) {
              const { buffer, filename, type } = data.file;
              formData.append('file', Buffer.from(buffer), {
                filename: filename,
                contentType: type
              });
            }
            
            options.body = formData;
            // Let form-data set the Content-Type with boundary
            Object.assign(options.headers, formData.getHeaders());
          } else {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
          }
        }
        
        console.log(`📡 [Main] WordPress API ${method} request to: ${url}`);
        const response = await fetch(url, options);
        
        const responseData = await response.text();
        let parsedData;
        try {
          parsedData = JSON.parse(responseData);
        } catch {
          parsedData = responseData;
        }
        
        if (!response.ok) {
          console.error(`❌ [Main] WordPress API error: ${response.status} - ${responseData}`);
          return {
            success: false,
            status: response.status,
            error: parsedData || response.statusText
          };
        }
        
        console.log(`✅ [Main] WordPress API request successful`);
        return {
          success: true,
          data: parsedData,
          status: response.status
        };
      } catch (error) {
        console.error('❌ [Main] WordPress API request failed:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });
  }
}

// Initialize the application
new EGDeskTaehwa();