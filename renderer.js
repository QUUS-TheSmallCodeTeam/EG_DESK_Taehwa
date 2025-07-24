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
    
    // Check if all components are loaded
    console.log('[RENDERER] Component availability check:');
    console.log('  BrowserTabComponent:', typeof window.BrowserTabComponent);
    console.log('  ChatComponent:', typeof window.ChatComponent);
    console.log('  WorkspaceManager:', typeof window.WorkspaceManager);

    // Initialize WorkspaceManager if available
    if (typeof window.WorkspaceManager !== 'undefined') {
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

    // Centralized workspace switching logic using WorkspaceManager
    window.switchWorkspace = async function(workspace) {
        console.log(`[RENDERER] switchWorkspace called for: ${workspace}`);
        
        try {
            // Notify main process about workspace switch
            if (window.electronAPI.switchWorkspace) {
                const result = await window.electronAPI.switchWorkspace(workspace);
                console.log(`[RENDERER] Main process workspace switch result:`, result);
            }
            
            // Use WorkspaceManager if available
            if (window.workspaceManager) {
                console.log(`[RENDERER] Using WorkspaceManager to switch to: ${workspace}`);
                await window.workspaceManager.switchToWorkspace(workspace);
                console.log(`[RENDERER] WorkspaceManager switched to: ${workspace}`);
                
                // Debug: Check if components were created
                if (workspace === 'blog') {
                    const browserComponent = window.workspaceManager.getBrowserComponent();
                    const chatComponent = window.workspaceManager.getChatComponent();
                    console.log(`[RENDERER] Components after switch:`, {
                        browserComponent: !!browserComponent,
                        chatComponent: !!chatComponent
                    });
                }
            } else {
                console.warn('[RENDERER] WorkspaceManager not available, using fallback');
            }
            
            // Update UI based on the new workspace
            updateUIForWorkspace(workspace);
            
        } catch (error) {
            console.error(`[RENDERER] Error during workspace switch for '${workspace}':`, error);
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
            if (workspace) {
                console.log(`[RENDERER] Workspace button clicked: ${workspace}`);
                switchWorkspace(workspace);
            }
            return; // Stop further execution
        }
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