// Import modules
import BrowserTabComponent from './components/BrowserTabComponent.js';
import ChatComponent from './components/ChatComponent.js';
import WorkspaceManager from './modules/WorkspaceManager.js';
import WebContentsManager from './modules/browser-control/WebContentsManager.js';
import UIManager from './ui/UIManager.js';
import EGDeskCore from './modules/EGDeskCore.js';

// Global error handlers for renderer
window.addEventListener('error', (event) => {
    console.error('💥 [RENDERER CRASH] Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('💥 [RENDERER CRASH] Unhandled promise rejection:', event.reason);
});

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[RENDERER] DOMContentLoaded: Initializing EG-Desk');

    try {
        if (!window.electronAPI) {
            console.error('[RENDERER] FATAL: electronAPI is not available on window object!');
            return;
        }
        console.log('[RENDERER] electronAPI loaded successfully:', Object.keys(window.electronAPI));
    
    // Wait a bit for all scripts to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
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

    // Initialize WorkspaceManager (now imported)
    if (WorkspaceManager) {
        console.log('[RENDERER] Creating WebContentsManager proxy...');
        const webContentsManagerProxy = createWebContentsManagerProxy();
        
        console.log('[RENDERER] Creating WorkspaceManager instance...');
        window.workspaceManager = new WorkspaceManager(webContentsManagerProxy);
        
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
            await window.uiManager.switchWorkspace(workspace);
            console.log(`[WORKSPACE-SWITCH:${switchId}] UIManager transition completed`);
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

        if (!startScreen || !mainContent || !workspaceTabs) {
            console.error('[RENDERER] Could not find essential DOM elements for UI update.');
            return;
        }

        // Manage visibility of tabs and content
        if (workspace === 'start') {
            startScreen.style.display = 'flex';
            mainContent.classList.remove('active');
            workspaceTabs.classList.remove('show');
            console.log('[RENDERER] Start screen displayed, main content and tabs hidden.');
        } else {
            startScreen.style.display = 'none';
            mainContent.classList.add('active');
            workspaceTabs.classList.add('show');
            console.log(`[RENDERER] Main content and tabs shown for workspace: ${workspace}`);

            if (workspace === 'blog') {
                // Delay initialization to ensure DOM is ready
                setTimeout(() => {
                    initializeBlogWorkspace();
                }, 100); // Reduced delay
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