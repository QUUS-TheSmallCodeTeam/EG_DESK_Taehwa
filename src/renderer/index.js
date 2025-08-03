// Import CSS first - this ensures styles are loaded in development mode
import './styles/app.css';

// Import modules
import BrowserTabComponent from './components/BrowserTabComponent.js';
import ChatComponent from './components/ChatComponent.js';
import WorkspaceManager from './modules/WorkspaceManager.js';
// Note: WebContentsManager is now handled in main process via electronAPI
import UIManager from './ui/UIManager.js';
import EGDeskCore from './modules/EGDeskCore.js';

// Global error handlers for renderer
window.addEventListener('error', (event) => {
    console.error('💥 [RENDERER CRASH] Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('💥 [RENDERER CRASH] Unhandled promise rejection:', event.reason);
});

// Emergency style injection no longer needed - CSS is imported via ES modules

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[RENDERER] DOMContentLoaded: Initializing EG-Desk');
    
    // CSS is now imported at the top of the file, so it should be loaded
    console.log('[RENDERER] CSS imported via ES modules');

    try {
        if (!window.electronAPI) {
            console.error('[RENDERER] FATAL: electronAPI is not available on window object!');
            return;
        }
        console.log('[RENDERER] electronAPI loaded successfully:', Object.keys(window.electronAPI));
    
    // Wait a bit for all scripts to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initialize EGDeskCore first
    console.log('[RENDERER] Initializing EGDeskCore...');
    window.egDeskCore = new EGDeskCore({
        enableLogging: true,
        autoInitialize: true
    });
    await window.egDeskCore.initialize();
    console.log('[RENDERER] EGDeskCore initialized successfully');
    
    // Initialize UI Manager first
    console.log('[RENDERER] Initializing UI Manager...');
    window.uiManager = new UIManager({
        theme: 'light-grey',
        animations: true
    });
    await window.uiManager.initialize();
    
    // Set up UIManager event listeners
    window.uiManager.addEventListener('workspace-switched', (event) => {
        const data = event.detail;
        console.log('[RENDERER] UIManager workspace switched:', data.workspace);
        
        // Trigger blog workspace initialization if needed
        if (data.workspace === 'blog') {
            setTimeout(() => {
                initializeBlogWorkspace();
            }, 100);
        }
    });
    
    console.log('[RENDERER] UI Manager initialized successfully');
    
    // Check if all components are loaded
    console.log('[RENDERER] Component availability check:');
    console.log('  BrowserTabComponent:', typeof BrowserTabComponent);
    console.log('  ChatComponent:', typeof ChatComponent);
    console.log('  WorkspaceManager:', typeof WorkspaceManager);
    console.log('  UIManager:', typeof UIManager);

    // Initialize WorkspaceManager with EGDeskCore integration
    if (WorkspaceManager) {
        console.log('[RENDERER] Creating WebContentsManager proxy instance...');
        const webContentsManager = createWebContentsManagerProxy();
        
        console.log('[RENDERER] Creating WorkspaceManager instance...');
        window.workspaceManager = new WorkspaceManager(webContentsManager);
        
        // Integrate with EGDeskCore state management
        window.egDeskCore.setWorkspaceManager(window.workspaceManager);
        
        console.log('[RENDERER] Initializing WorkspaceManager...');
        await window.workspaceManager.initialize();
        console.log('[RENDERER] WorkspaceManager initialized successfully');
    } else {
        console.warn('[RENDERER] WorkspaceManager not available, using fallback mode');
        console.log('[RENDERER] Available classes:', Object.keys(window).filter(k => k.includes('Manager') || k.includes('Component')));
    }

    // Enhanced workspace switching logic with improved logging and error handling
    window.switchWorkspace = async function(workspace) {
        const switchId = `switch-${Date.now()}`;
        console.log(`[WORKSPACE-SWITCH:${switchId}] 🚀 Starting workspace switch to: ${workspace}`);
        
        try {
            await executeWorkspaceSwitch(workspace, switchId);
            console.log(`[WORKSPACE-SWITCH:${switchId}] ✅ Successfully switched to workspace: ${workspace}`);
        } catch (error) {
            console.error(`[WORKSPACE-SWITCH:${switchId}] ❌ Failed to switch to workspace '${workspace}':`, error);
            await handleWorkspaceSwitchError(workspace, error, switchId);
        }
    };

    /**
     * Executes the core workspace switching logic
     * @param {string} workspace - Target workspace name
     * @param {string} switchId - Unique identifier for this switch operation
     */
    async function executeWorkspaceSwitch(workspace, switchId) {
        console.log(`[WORKSPACE-SWITCH:${switchId}] 📋 Executing switch sequence for: ${workspace}`);
        
        // Step 1: Update UI with animations
        await updateUIForWorkspaceSwitch(workspace, switchId);
        
        // Step 2: Notify main process
        await notifyMainProcessWorkspaceSwitch(workspace, switchId);
        
        // Step 3: Handle workspace-specific logic
        await handleWorkspaceSpecificLogic(workspace, switchId);
        
        console.log(`[WORKSPACE-SWITCH:${switchId}] 🎯 All switch steps completed for: ${workspace}`);
    }

    /**
     * Updates UI for workspace switch with proper logging
     * @param {string} workspace - Target workspace name
     * @param {string} switchId - Unique identifier for this switch operation
     */
    async function updateUIForWorkspaceSwitch(workspace, switchId) {
        console.log(`[WORKSPACE-SWITCH:${switchId}] 🎨 Updating UI for workspace: ${workspace}`);
        
        if (window.uiManager) {
            console.log(`[WORKSPACE-SWITCH:${switchId}] Using UIManager for animated transition`);
            console.log(`[WORKSPACE-SWITCH:${switchId}] UIManager status:`, {
                isInitialized: window.uiManager.isInitialized,
                currentWorkspace: window.uiManager.currentWorkspace,
                methodExists: typeof window.uiManager.switchWorkspace === 'function'
            });
            
            try {
                await window.uiManager.switchWorkspace(workspace);
                console.log(`[WORKSPACE-SWITCH:${switchId}] UIManager transition completed successfully`);
                
                // Verify main content is visible for blog workspace
                if (workspace === 'blog') {
                    const mainContent = document.getElementById('main-content');
                    console.log(`[WORKSPACE-SWITCH:${switchId}] Blog workspace verification:`, {
                        mainContentExists: !!mainContent,
                        hasActiveClass: mainContent?.classList.contains('active'),
                        opacity: mainContent ? window.getComputedStyle(mainContent).opacity : 'N/A',
                        visibility: mainContent ? window.getComputedStyle(mainContent).visibility : 'N/A'
                    });
                }
            } catch (error) {
                console.error(`[WORKSPACE-SWITCH:${switchId}] UIManager transition failed:`, error);
                console.log(`[WORKSPACE-SWITCH:${switchId}] Falling back to direct UI update`);
                updateUIForWorkspace(workspace);
            }
        } else {
            console.log(`[WORKSPACE-SWITCH:${switchId}] Using fallback UI update (no UIManager)`);
            updateUIForWorkspace(workspace);
            console.log(`[WORKSPACE-SWITCH:${switchId}] Fallback UI update completed`);
        }
    }

    /**
     * Notifies main process about workspace switch
     * @param {string} workspace - Target workspace name
     * @param {string} switchId - Unique identifier for this switch operation
     */
    async function notifyMainProcessWorkspaceSwitch(workspace, switchId) {
        console.log(`[WORKSPACE-SWITCH:${switchId}] 📡 Notifying main process of workspace switch`);
        
        if (window.electronAPI?.switchWorkspace) {
            const result = await window.electronAPI.switchWorkspace(workspace);
            console.log(`[WORKSPACE-SWITCH:${switchId}] Main process response:`, result);
        } else {
            console.warn(`[WORKSPACE-SWITCH:${switchId}] electronAPI.switchWorkspace not available`);
        }
    }

    /**
     * Handles workspace-specific initialization logic
     * @param {string} workspace - Target workspace name
     * @param {string} switchId - Unique identifier for this switch operation
     */
    async function handleWorkspaceSpecificLogic(workspace, switchId) {
        console.log(`[WORKSPACE-SWITCH:${switchId}] 🔧 Handling workspace-specific logic for: ${workspace}`);
        
        if (workspace === 'start') {
            console.log(`[WORKSPACE-SWITCH:${switchId}] Start workspace selected, no WorkspaceManager needed`);
            return;
        }
        
        if (!window.workspaceManager) {
            console.warn(`[WORKSPACE-SWITCH:${switchId}] WorkspaceManager not available for workspace: ${workspace}`);
            return;
        }
        
        console.log(`[WORKSPACE-SWITCH:${switchId}] Activating WorkspaceManager for: ${workspace}`);
        await window.workspaceManager.switchToWorkspace(workspace);
        console.log(`[WORKSPACE-SWITCH:${switchId}] WorkspaceManager activation completed`);
        
        // Log component status for debugging
        await logWorkspaceComponentStatus(workspace, switchId);
    }

    /**
     * Logs the status of workspace components for debugging
     * @param {string} workspace - Current workspace name
     * @param {string} switchId - Unique identifier for this switch operation
     */
    async function logWorkspaceComponentStatus(workspace, switchId) {
        if (workspace === 'blog' && window.workspaceManager) {
            const browserComponent = window.workspaceManager.getBrowserComponent();
            const chatComponent = window.workspaceManager.getChatComponent();
            
            const componentStatus = {
                browserComponent: {
                    exists: !!browserComponent,
                    type: browserComponent?.constructor?.name || 'unknown'
                },
                chatComponent: {
                    exists: !!chatComponent,
                    type: chatComponent?.constructor?.name || 'unknown'
                }
            };
            
            console.log(`[WORKSPACE-SWITCH:${switchId}] 🔍 Blog workspace component status:`, componentStatus);
        }
    }

    /**
     * Handles errors during workspace switching
     * @param {string} workspace - Target workspace name
     * @param {Error} error - The error that occurred
     * @param {string} switchId - Unique identifier for this switch operation
     */
    async function handleWorkspaceSwitchError(workspace, error, switchId) {
        console.error(`[WORKSPACE-SWITCH:${switchId}] 💥 Error details:`, {
            workspace,
            errorMessage: error.message,
            errorStack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        // Show user-friendly error notification
        if (window.uiManager?.showNotification) {
            const errorMessage = `워크스페이스 전환 실패: ${error.message}`;
            console.log(`[WORKSPACE-SWITCH:${switchId}] 📢 Showing error notification to user`);
            window.uiManager.showNotification(errorMessage, 'error');
        } else {
            console.warn(`[WORKSPACE-SWITCH:${switchId}] Unable to show error notification (no UIManager)`);
        }
        
        // Attempt recovery by falling back to start workspace
        if (workspace !== 'start') {
            console.log(`[WORKSPACE-SWITCH:${switchId}] 🔄 Attempting recovery by switching to start workspace`);
            try {
                await executeWorkspaceSwitch('start', `${switchId}-recovery`);
                console.log(`[WORKSPACE-SWITCH:${switchId}] ✅ Recovery successful`);
            } catch (recoveryError) {
                console.error(`[WORKSPACE-SWITCH:${switchId}] 💀 Recovery failed:`, recoveryError);
            }
        }
    };

    function updateUIForWorkspace(workspace) {
        console.log(`[RENDERER] Updating UI for workspace: ${workspace}`);

        // Update active tab state
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.workspace === workspace);
        });

        const startScreen = document.getElementById('start-screen');
        const mainContent = document.getElementById('main-content');
        const workspaceTabs = document.querySelector('.workspace-tabs');

        if (!startScreen || !mainContent) {
            console.error('[RENDERER] Could not find essential DOM elements');
            return;
        }

        // Simple visibility management
        if (workspace === 'start') {
            startScreen.style.display = 'flex';
            mainContent.classList.remove('active');
            if (workspaceTabs) workspaceTabs.classList.remove('show');
        } else {
            startScreen.style.display = 'none';
            mainContent.classList.add('active');
            if (workspaceTabs) workspaceTabs.classList.add('show');
            
            if (workspace === 'blog') {
                setTimeout(() => {
                    initializeBlogWorkspace();
                }, 100);
            }
        }
    }

    // Event delegation for dynamic content
    document.addEventListener('click', (event) => {
        const target = event.target;
        console.log(`[CLICK-DEBUG] Click detected on:`, {
            tagName: target.tagName,
            className: target.className,
            id: target.id,
            dataset: target.dataset
        });

        // Handle tab clicks
        if (target.matches('.tab, .tab *')) {
            event.preventDefault();
            event.stopPropagation();
            const tab = target.closest('.tab');
            const workspace = tab.dataset.workspace;
            console.log(`[RENDERER] Tab clicked: ${workspace}`);
            switchWorkspace(workspace);
            return; // Stop further execution
        }

        // Handle workspace buttons from the start screen
        if (target.matches('.workspace-btn, .workspace-btn *')) {
            event.preventDefault();
            const button = target.closest('.workspace-btn');
            const workspace = button.dataset.workspace;
            console.log(`[CLICK-DEBUG] Button found:`, {
                button: button,
                workspace: workspace,
                dataset: button.dataset
            });
            if (workspace) {
                console.log(`[RENDERER] Workspace button clicked: ${workspace}`);
                switchWorkspace(workspace);
            } else {
                console.error(`[CLICK-DEBUG] No workspace found on button:`, button);
            }
            return; // Stop further execution
        }
        
        console.log(`[CLICK-DEBUG] Click not handled, target:`, target);
    });

    // Initial setup
    console.log('[RENDERER] Initializing with start workspace.');
    updateUIForWorkspace('start');
    
    // Add visual feedback for successful initialization
    setTimeout(() => {
      if (window.uiManager) {
        window.uiManager.showNotification('EG-Desk:태화 시스템 준비 완료', 'success', 2000);
      }
    }, 500);

        console.log('[RENDERER] EG-Desk initialization complete.');
    } catch (error) {
        console.error('💥 [RENDERER CRASH] Initialization failed:', error);
        // Try to send error to main process
        if (window.electronAPI?.log?.error) {
            window.electronAPI.log.error(`Renderer crash: ${error.message}`);
        }
    }

    // DEBUGGING: Fallback function removed for crash testing
    
    // Create a proxy for WebContentsManager that uses electronAPI
    function createWebContentsManagerProxy() {
        return {
            // Proxy methods to electronAPI
            async createTab(url) {
                // In the proxy, we don't actually create tabs
                // The main process handles this
                return 'proxy-tab-' + Date.now();
            },
            
            async switchTab(tabId) {
                // Tab switching is handled by main process
                return { id: tabId };
            },
            
            async loadURL(url, tabId) {
                return await window.electronAPI.browser.loadURL(url);
            },
            
            async goBack(tabId) {
                return await window.electronAPI.browser.goBack();
            },
            
            async goForward(tabId) {
                return await window.electronAPI.browser.goForward();
            },
            
            async reload(tabId) {
                return await window.electronAPI.browser.reload();
            },
            
            async getNavigationState(tabId) {
                try {
                    return await window.electronAPI.browser.getNavigationState();
                } catch (error) {
                    console.warn('[RENDERER] getNavigationState failed:', error);
                    return {
                        canGoBack: false,
                        canGoForward: false,
                        isLoading: false,
                        url: 'about:blank',
                        title: 'No Tab'
                    };
                }
            },
            
            async executeScript(script, tabId) {
                return await window.electronAPI.browser.executeScript(script);
            },
            
            // Event system proxy
            on(event, handler) {
                // Map to electronAPI events
                switch (event) {
                    case 'navigation':
                        window.electronAPI.onBrowserNavigated((evt, data) => {
                            handler({ tabId: 'proxy-tab', url: data.url || data, type: 'navigate' });
                        });
                        break;
                    case 'loading-finished':
                        window.electronAPI.onBrowserLoadFinished((evt, data) => {
                            handler({ tabId: 'proxy-tab', title: data?.title });
                        });
                        break;
                    case 'loading-failed':
                        window.electronAPI.onBrowserLoadFailed((evt, error) => {
                            handler({ tabId: 'proxy-tab', errorDescription: error });
                        });
                        break;
                }
            },
            
            getCurrentTab() {
                return { id: 'proxy-tab' };
            },
            
            // Add missing updateWebContentsViewBounds method
            updateWebContentsViewBounds(preciseBounds) {
                console.log(`[WebContentsManagerProxy] updateWebContentsViewBounds called with:`, preciseBounds);
                if (window.electronAPI?.browser?.updateBounds) {
                    return window.electronAPI.browser.updateBounds(preciseBounds);
                } else {
                    console.warn(`[WebContentsManagerProxy] updateBounds not available in electronAPI.browser`);
                    return Promise.resolve();
                }
            }
        };
    }

    // Blog workspace specific initializations
    async function initializeBlogWorkspace() {
        console.log('[RENDERER] Initializing Blog Workspace with components...');
        
        // CSS 디버깅 - 현재 HTML 문서의 스타일 상태 확인
        if (window.electronAPI?.log?.info) {
            window.electronAPI.log.info('[CSS-DEBUG] Blog workspace initializing...');
            window.electronAPI.log.info('[CSS-DEBUG] Document ready state:', document.readyState);
            window.electronAPI.log.info('[CSS-DEBUG] HTML element has styles:', {
                styleElement: !!document.querySelector('style'),
                linkElements: document.querySelectorAll('link[rel="stylesheet"]').length,
                inlineStyles: document.documentElement.innerHTML.includes('<style>')
            });
        }
        
        // index.html에 있는 스타일 태그 확인
        const styleElements = document.querySelectorAll('style');
        if (window.electronAPI?.log?.info) {
            window.electronAPI.log.info('[CSS-DEBUG] Found style elements:', styleElements.length);
            
            let foundComponentContainer = false;
            let foundBrowserTabComponent = false;
            
            styleElements.forEach((style, index) => {
                const contentLength = style.textContent.length;
                window.electronAPI.log.info(`[CSS-DEBUG] Style element ${index} content length:`, contentLength);
                
                // component-container 스타일이 있는지 확인
                if (style.textContent.includes('.component-container')) {
                    foundComponentContainer = true;
                    window.electronAPI.log.info('[CSS-DEBUG] Found .component-container styles in style element', index);
                }
                if (style.textContent.includes('.browser-tab-component')) {
                    foundBrowserTabComponent = true;
                    window.electronAPI.log.info('[CSS-DEBUG] Found .browser-tab-component styles in style element', index);
                }
            });
            
            if (!foundComponentContainer) {
                window.electronAPI.log.error('[CSS-DEBUG] ERROR: .component-container styles NOT FOUND in any style element!');
            }
            if (!foundBrowserTabComponent) {
                window.electronAPI.log.error('[CSS-DEBUG] ERROR: .browser-tab-component styles NOT FOUND in any style element!');
            }
        }
        
        // 컴포넌트 컨테이너들의 클래스 확인
        setTimeout(() => {
            const containers = {
                chatHistory: document.getElementById('chat-history-container'),
                browser: document.getElementById('browser-component-container'),
                chat: document.getElementById('chat-component-container')
            };
            
            if (window.electronAPI?.log?.info) {
                window.electronAPI.log.info('[CSS-DEBUG] Component container classes:');
                
                let allContainersHaveClass = true;
                
                Object.entries(containers).forEach(([name, elem]) => {
                    if (elem) {
                        const hasComponentContainerClass = elem.classList.contains('component-container');
                        const computedStyles = {
                            background: window.getComputedStyle(elem).backgroundColor,
                            border: window.getComputedStyle(elem).border,
                            borderRadius: window.getComputedStyle(elem).borderRadius
                        };
                        
                        window.electronAPI.log.info(`[CSS-DEBUG] ${name}:`, {
                            className: elem.className,
                            hasComponentContainer: hasComponentContainerClass,
                            computedStyles: computedStyles
                        });
                        
                        if (!hasComponentContainerClass) {
                            allContainersHaveClass = false;
                            window.electronAPI.log.error(`[CSS-DEBUG] ERROR: ${name} does NOT have component-container class!`);
                        }
                        
                        // 배경색이 투명하면 CSS가 적용되지 않은 것
                        if (computedStyles.background === 'rgba(0, 0, 0, 0)' || computedStyles.background === 'transparent') {
                            window.electronAPI.log.warn(`[CSS-DEBUG] WARNING: ${name} has transparent background - CSS may not be applied!`);
                        }
                    } else {
                        window.electronAPI.log.error(`[CSS-DEBUG] ERROR: ${name} container element not found!`);
                    }
                });
                
                if (allContainersHaveClass) {
                    window.electronAPI.log.info('[CSS-DEBUG] SUCCESS: All containers have component-container class');
                } else {
                    window.electronAPI.log.error('[CSS-DEBUG] FAILURE: Some containers missing component-container class');
                }
                
                // 브라우저 컴포넌트 내부 확인
                const browserTabComponent = document.querySelector('.browser-tab-component');
                if (browserTabComponent) {
                    window.electronAPI.log.info('[CSS-DEBUG] Found .browser-tab-component element');
                } else {
                    window.electronAPI.log.error('[CSS-DEBUG] ERROR: .browser-tab-component element NOT FOUND!');
                }
            }
        }, 200);
        
        // The WorkspaceManager already handles BrowserTabComponent and ChatComponent initialization
        // We just need to set up terminal functionality
        initializeTerminalFromIndex();
        console.log('[RENDERER] Blog Workspace initialization complete - components handled by WorkspaceManager.');
    }

    function initializeTerminalFromIndex() {
        // Terminal functionality is now handled by ChatComponent
        // This function is kept for compatibility but WorkspaceManager handles the actual initialization
        console.log('[RENDERER] Terminal initialization delegated to ChatComponent via WorkspaceManager');
    }
});