import { app, BrowserWindow, WebContentsView, ipcMain, Menu } from 'electron';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';

// ES6 module equivalent of __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import modular components
import WebContentsManager from './modules/WebContentsManager.js';

// Initialize store for local data
const store = new Store();

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('💥 [FATAL] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

app.on('render-process-gone', (event, webContents, details) => {
  console.error('💥 [FATAL] Render process gone:', details);
});

class EGDeskTaehwa {
  constructor() {
    this.mainWindow = null;
    this.webContentsManager = new WebContentsManager();
    this.currentWorkspace = 'start';
    this.currentTabId = null;
    this.setupApp();
  }

  setupApp() {
    app.whenReady().then(() => {
      console.log('🚀 Electron 앱 시작됨');
      this.createMainWindow();
      this.setupMenu();
      this.setupIPC();
    });

    app.on('window-all-closed', () => {
      console.log('🔴 모든 창이 닫힘');
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      console.log('🔵 앱 활성화됨');
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }

  createMainWindow() {
    console.log('📱 Main Window 생성 시작');
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
        sandbox: false  // Allow JavaScript execution in renderer
      },
      show: false
    });

    // Load the renderer process
    if (process.env.VITE_DEV_SERVER_URL) {
      // In development, load from vite dev server
      this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      // In production or preview mode, load the built file
      const rendererPath = path.join(__dirname, '../renderer/index.html');
      console.log(`🔍 Loading renderer from: ${rendererPath}`);
      this.mainWindow.loadFile(rendererPath);
    }

    // Initialize WebContentsManager for website content
    this.initializeWebContentsManager();

    this.mainWindow.once('ready-to-show', () => {
      console.log('🎉 Main Window 표시 준비 완료');
      this.mainWindow.show();
      
      // Temporarily enable dev tools to debug renderer issues
      // this.mainWindow.webContents.openDevTools();
    });

    this.mainWindow.webContents.once('did-finish-load', () => {
      console.log('✅ 페이지 로딩 완료');
    });

    this.mainWindow.on('closed', () => {
      console.log('❌ Main Window 닫힘');
      this.webContentsManager.destroy();
      this.mainWindow = null;
    });
    
    // Updated crash handlers - use render-process-gone (crashed is deprecated)
    this.mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('💥 [CRASH] Render process gone:', details);
      console.error('💥 [CRASH] Reason:', details.reason);
      console.error('💥 [CRASH] Exit code:', details.exitCode);
    });
    
    this.mainWindow.on('unresponsive', () => {
      console.error('💥 [CRASH] Window became unresponsive!');
    });

    console.log('📱 Main Window 생성 완료');
  }

  initializeWebContentsManager() {
    console.log('🌐 WebContentsManager 초기화');
    this.webContentsManager.initialize(this.mainWindow);
    
    // Resize handling is now done by BrowserTabComponent
    // this.mainWindow.on('resize', () => {
    //   if (this.currentWorkspace === 'blog') {
    //     this.webContentsManager.updateWebContentsViewBounds();
    //   }
    // });
  }

  async setupBlogWorkspace() {
    console.log('🚀 블로그 워크스페이스 설정');
    
    try {
      // Create and switch to a new tab with default WordPress URL
      const tabId = await this.webContentsManager.createTab('https://m8chaa.mycafe24.com/');
      await this.webContentsManager.switchTab(tabId);
      this.currentTabId = tabId;
      
      // Don't update bounds immediately - let BrowserTabComponent handle it
      console.log(`[EGDeskTaehwa] Blog workspace ready with tab ${tabId} - bounds will be updated by BrowserTabComponent`);
    } catch (error) {
      console.error('[EGDeskTaehwa] Failed to setup blog workspace:', error);
    }
  }

  hideWebContentsView() {
    console.log('🙈 WebContents View 숨김');
    // Remove all WebContentsViews with proper API fallback
    if (this.currentTabId && this.webContentsManager) {
      try {
        const currentView = this.webContentsManager.webContentsViews.get(this.currentTabId);
        if (currentView) {
          // Try new contentView API first (Electron 30+)
          if (this.mainWindow.contentView && this.mainWindow.contentView.children.includes(currentView)) {
            this.mainWindow.contentView.removeChildView(currentView);
            console.log('🙈 Successfully removed WebContentsView with contentView');
          }
          // Fallback to setBrowserView(null) for Electron 28.x
          else if (typeof this.mainWindow.setBrowserView === 'function') {
            this.mainWindow.setBrowserView(null);
            console.log('🙈 Successfully removed WebContentsView with setBrowserView');
          }
        }
      } catch (error) {
        console.error('🙈 Failed to remove WebContentsView:', error);
      }
    }
    this.currentTabId = null;
  }

  setupWebContentsEvents() {
    // WebContentsManager handles browser events internally
    // Set up communication between main process and renderer
    this.webContentsManager.on('navigation', (data) => {
      console.log('🧭 Browser 네비게이션:', data.url);
      this.mainWindow.webContents.send('browser-navigated', data);
    });

    this.webContentsManager.on('loading-failed', (data) => {
      console.error('❌ Browser 로드 실패:', data.errorDescription);
      this.mainWindow.webContents.send('browser-load-failed', data);
    });

    this.webContentsManager.on('loading-finished', (data) => {
      console.log('✅ Browser 로드 완료');
      this.mainWindow.webContents.send('browser-load-finished', data);
    });

    this.webContentsManager.on('loading-started', (data) => {
      console.log('🔄 Browser 로드 시작');
      this.mainWindow.webContents.send('browser-load-started', data);
    });

    this.webContentsManager.on('loading-stopped', (data) => {
      console.log('⏹️ Browser 로드 중지');
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
    console.log('[MAIN] Setting up IPC handlers');
    // Store operations
    ipcMain.handle('store-get', (event, key) => {
      console.log(`[MAIN] IPC store-get: ${key}`);
      return store.get(key);
    });

    ipcMain.handle('store-set', (event, key, value) => {
      console.log(`[MAIN] IPC store-set: ${key}`);
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
      console.log(`[MAIN] IPC switch-workspace received: ${workspace}`);
      this.currentWorkspace = workspace;
      
      if (workspace === 'blog') {
        console.log('[MAIN] Setting up blog workspace');
        await this.setupBlogWorkspace();
      } else {
        console.log('[MAIN] Hiding web contents view');
        this.hideWebContentsView();
      }
      
      console.log(`[MAIN] Workspace switched to ${workspace}`);
      return { success: true, workspace };
    });

    // Browser navigation APIs (via WebContentsManager)
    ipcMain.handle('browser-create-tab', async (event, { url, options }) => {
      console.log(`[MAIN] IPC browser-create-tab: ${url}`);
      
      try {
        const tabId = await this.webContentsManager.createTab(url, options);
        console.log(`[MAIN] Browser tab created: ${tabId}`);
        return { success: true, tabId, url };
      } catch (error) {
        console.error(`[MAIN] Browser tab creation failed: ${error}`);
        throw error;
      }
    });

    ipcMain.handle('browser-switch-tab', async (event, { tabId }) => {
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

    ipcMain.handle('browser-load-url', async (event, { url, tabId }) => {
      console.log(`[MAIN] IPC browser-load-url: ${url} in tab: ${tabId || 'current'}`);
      
      try {
        const result = await this.webContentsManager.loadURL(url, tabId);
        console.log(`[MAIN] Browser URL loaded: ${url}`);
        return result;
      } catch (error) {
        console.error(`[MAIN] Browser URL load failed: ${error}`);
        throw error;
      }
    });

    ipcMain.handle('browser-go-back', async (event, { tabId } = {}) => {
      console.log(`[MAIN] IPC browser-go-back for tab: ${tabId || 'current'}`);
      return await this.webContentsManager.goBack(tabId);
    });

    ipcMain.handle('browser-go-forward', async (event, { tabId } = {}) => {
      console.log(`[MAIN] IPC browser-go-forward for tab: ${tabId || 'current'}`);
      return await this.webContentsManager.goForward(tabId);
    });

    ipcMain.handle('browser-reload', async (event, { tabId } = {}) => {
      console.log(`[MAIN] IPC browser-reload for tab: ${tabId || 'current'}`);
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
      console.log(`[MAIN] IPC browser-execute-script in tab: ${tabId || 'current'}`);
      try {
        return await this.webContentsManager.executeScript(script, tabId);
      } catch (error) {
        console.error('[MAIN] Script execution failed:', error);
        throw error;
      }
    });

    ipcMain.handle('browser-get-navigation-state', (event, { tabId } = {}) => {
      console.log(`[MAIN] IPC browser-get-navigation-state for tab: ${tabId || 'current'}`);
      return this.webContentsManager.getNavigationState(tabId);
    });

    ipcMain.handle('browser-close-tab', async (event, { tabId }) => {
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

    // WebContentsView bounds update
    ipcMain.handle('browser-update-bounds', (event, bounds) => {
      console.log(`[MAIN] IPC browser-update-bounds:`, bounds);
      try {
        this.webContentsManager.updateWebContentsViewBounds(bounds);
        return { success: true };
      } catch (error) {
        console.error(`[MAIN] Failed to update browser bounds:`, error);
        throw error;
      }
    });

    // Command execution
    ipcMain.handle('execute-command', async (event, command) => {
      console.log(`[MAIN] IPC execute-command: ${command}`);
      return new Promise((resolve) => {
        if (command.startsWith('claude ')) {
          exec(`./${command}`, { cwd: __dirname }, (error, stdout, stderr) => {
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
          resolve({ success: false, error: 'This command is not allowed.' });
        }
      });
    });

    // Window control handlers
    ipcMain.on('window-minimize', () => {
      console.log('[MAIN] Minimizing window');
      this.mainWindow.minimize();
    });

    ipcMain.on('window-maximize', () => {
      console.log('[MAIN] Maximizing/unmaximizing window');
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    });

    ipcMain.on('window-close', () => {
      console.log('[MAIN] Closing window');
      this.mainWindow.close();
    });

    // Set up WebContentsManager events
    this.setupWebContentsEvents();
  }
}

// Initialize the application
new EGDeskTaehwa();