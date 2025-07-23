const { app, BrowserWindow, BrowserView, ipcMain, Menu } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const Store = require('electron-store');

// Initialize store for local data
const store = new Store();

class EGDeskTaehwa {
  constructor() {
    this.mainWindow = null;
    this.browserView = null;
    this.currentWorkspace = 'start';
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
        sandbox: true
      },
      show: false
    });

    // Load the overlay UI (EG-Desk interface)
    this.mainWindow.loadFile('index.html');

    // Create browser view for website content
    this.createBrowserView();

    this.mainWindow.once('ready-to-show', () => {
      console.log('🎉 Main Window 표시 준비 완료');
      this.mainWindow.show();
    });

    this.mainWindow.webContents.once('did-finish-load', () => {
      console.log('✅ 페이지 로딩 완료');
    });

    this.mainWindow.on('closed', () => {
      console.log('❌ Main Window 닫힘');
      this.mainWindow = null;
      this.browserView = null;
    });

    console.log('📱 Main Window 생성 완료');
  }

  createBrowserView() {
    console.log('🌐 Browser View 생성');
    this.browserView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true
      }
    });

    // Initially hidden - shown when blog workspace is active
    this.mainWindow.setBrowserView(null);
  }

  setupBlogWorkspace() {
    console.log('🚀 블로그 워크스페이스 설정');
    if (!this.browserView) {
      this.createBrowserView();
    }

    // Set browser view for the main window
    this.mainWindow.setBrowserView(this.browserView);
    
    // Position browser view (accounting for header + controls + terminal)
    const bounds = this.mainWindow.getBounds();
    this.browserView.setBounds({
      x: 0,
      y: 100, // Header (60px) + Controls (40px)
      width: Math.floor(bounds.width * 0.7), // 70% width for browser
      height: bounds.height - 100 // Full height minus header/controls
    });

    // Load default WordPress URL
    this.browserView.webContents.loadURL('https://m8chaa.mycafe24.com/');

    // Set up browser navigation events
    this.setupBrowserEvents();
  }

  hideBrowserView() {
    console.log('🙈 Browser View 숨김');
    if (this.browserView) {
      this.mainWindow.setBrowserView(null);
    }
  }

  setupBrowserEvents() {
    if (!this.browserView) return;

    const webContents = this.browserView.webContents;

    webContents.on('did-navigate', (event, url) => {
      console.log('🧭 Browser 네비게이션:', url);
      this.mainWindow.webContents.send('browser-navigated', url);
    });

    webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('❌ Browser 로드 실패:', errorDescription);
      this.mainWindow.webContents.send('browser-load-failed', errorDescription);
    });

    webContents.on('did-finish-load', () => {
      console.log('✅ Browser 로드 완료');
      this.mainWindow.webContents.send('browser-load-finished');
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
    ipcMain.handle('switch-workspace', (event, workspace) => {
      console.log(`[MAIN] IPC switch-workspace received: ${workspace}`);
      this.currentWorkspace = workspace;
      
      if (workspace === 'blog') {
        console.log('[MAIN] Setting up blog workspace');
        this.setupBlogWorkspace();
      } else {
        console.log('[MAIN] Hiding browser view');
        this.hideBrowserView();
      }
      
      console.log(`[MAIN] Workspace switched to ${workspace}`);
      return { success: true, workspace };
    });

    // Browser navigation APIs (for BrowserView)
    ipcMain.handle('browser-load-url', async (event, url) => {
      console.log(`[MAIN] IPC browser-load-url: ${url}`);
      if (!this.browserView) {
        console.error('[MAIN] Browser view not available for loadURL');
        throw new Error('Browser view not available');
      }
      
      try {
        await this.browserView.webContents.loadURL(url);
        console.log(`[MAIN] Browser URL loaded: ${url}`);
        return { success: true, url };
      } catch (error) {
        console.error(`[MAIN] Browser URL load failed: ${error}`);
        throw error;
      }
    });

    ipcMain.handle('browser-go-back', (event) => {
      console.log('[MAIN] IPC browser-go-back');
      if (!this.browserView) return false;
      
      if (this.browserView.webContents.canGoBack()) {
        this.browserView.webContents.goBack();
        return true;
      }
      return false;
    });

    ipcMain.handle('browser-go-forward', (event) => {
      console.log('[MAIN] IPC browser-go-forward');
      if (!this.browserView) return false;
      
      if (this.browserView.webContents.canGoForward()) {
        this.browserView.webContents.goForward();
        return true;
      }
      return false;
    });

    ipcMain.handle('browser-reload', (event) => {
      console.log('[MAIN] IPC browser-reload');
      if (!this.browserView) return false;
      
      this.browserView.webContents.reload();
      return true;
    });

    ipcMain.handle('browser-can-go-back', (event) => {
      if (!this.browserView) return false;
      return this.browserView.webContents.canGoBack();
    });

    ipcMain.handle('browser-can-go-forward', (event) => {
      if (!this.browserView) return false;
      return this.browserView.webContents.canGoForward();
    });

    ipcMain.handle('browser-get-url', (event) => {
      if (!this.browserView) return 'about:blank';
      return this.browserView.webContents.getURL();
    });

    // Window resize handler for browser view
    ipcMain.handle('resize-browser-view', (event, bounds) => {
      if (!this.browserView) return;
      
      console.log(`[MAIN] Resizing browser view: ${JSON.stringify(bounds)}`);
      this.browserView.setBounds(bounds);
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

    // Window resize event to adjust browser view
    this.mainWindow.on('resize', () => {
      if (this.browserView && this.currentWorkspace === 'blog') {
        const bounds = this.mainWindow.getBounds();
        const newBounds = {
          x: 0,
          y: 100,
          width: Math.floor(bounds.width * 0.7),
          height: bounds.height - 100
        };
        console.log(`[MAIN] Window resized, adjusting browser view to: ${JSON.stringify(newBounds)}`);
        this.browserView.setBounds(newBounds);
      }
    });
  }
}

// Initialize the application
new EGDeskTaehwa();