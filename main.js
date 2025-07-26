const { app, BrowserWindow, BrowserView, ipcMain, Menu } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const Store = require('electron-store');

// Import modular components
const WebContentsManager = require('./modules/WebContentsManager');

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
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true,
        sandbox: false  // Allow JavaScript execution in renderer
      },
      show: false
    });

    // Load the overlay UI (EG-Desk interface)
    this.mainWindow.loadFile('index.html');

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

  hideBrowserView() {
    console.log('🙈 Browser View 숨김');
    this.mainWindow.setBrowserView(null);
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
        console.log('[MAIN] Hiding browser view');
        this.hideBrowserView();
      }
      
      console.log(`[MAIN] Workspace switched to ${workspace}`);
      return { success: true, workspace };
    });

    // Browser navigation APIs (via WebContentsManager)
    ipcMain.handle('browser-load-url', async (event, url) => {
      console.log(`[MAIN] IPC browser-load-url: ${url}`);
      
      try {
        await this.webContentsManager.loadURL(url);
        console.log(`[MAIN] Browser URL loaded: ${url}`);
        return { success: true, url };
      } catch (error) {
        console.error(`[MAIN] Browser URL load failed: ${error}`);
        throw error;
      }
    });

    ipcMain.handle('browser-go-back', async (event) => {
      console.log('[MAIN] IPC browser-go-back');
      return await this.webContentsManager.goBack();
    });

    ipcMain.handle('browser-go-forward', async (event) => {
      console.log('[MAIN] IPC browser-go-forward');
      return await this.webContentsManager.goForward();
    });

    ipcMain.handle('browser-reload', async (event) => {
      console.log('[MAIN] IPC browser-reload');
      return await this.webContentsManager.reload();
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
    ipcMain.handle('browser-execute-script', async (event, script) => {
      console.log('[MAIN] IPC browser-execute-script');
      try {
        return await this.webContentsManager.executeScript(script);
      } catch (error) {
        console.error('[MAIN] Script execution failed:', error);
        throw error;
      }
    });

    ipcMain.handle('browser-get-navigation-state', (event) => {
      return this.webContentsManager.getNavigationState();
    });

    // BrowserView bounds update
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