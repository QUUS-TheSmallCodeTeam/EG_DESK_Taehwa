document.addEventListener('DOMContentLoaded', async () => {
    console.log('[RENDERER] DOMContentLoaded: Initializing EG-Desk');

    if (!window.electronAPI) {
        console.error('[RENDERER] FATAL: electronAPI is not available on window object!');
        return;
    }
    console.log('[RENDERER] electronAPI loaded successfully:', Object.keys(window.electronAPI));

    // Centralized workspace switching logic
    window.switchWorkspace = async function(workspace) {
        console.log(`[RENDERER] switchWorkspace called for: ${workspace}`);
        
        try {
            if (!window.electronAPI.switchWorkspace) {
                console.error('[RENDERER] electronAPI.switchWorkspace function not found!');
                throw new Error('switchWorkspace API not available');
            }

            console.log(`[RENDERER] Sending IPC message 'switch-workspace' to main process with workspace: ${workspace}`);
            const result = await window.electronAPI.switchWorkspace(workspace);
            console.log(`[RENDERER] Received response from main process for 'switch-workspace':`, result);

            if (!result || !result.success) {
                console.error(`[RENDERER] Workspace switch failed in main process for: ${workspace}`);
                return;
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

    // Blog workspace specific initializations
    async function initializeBlogWorkspace() {
        console.log('[RENDERER] Initializing Blog Workspace UI components...');
        
        const addressBar = document.getElementById('address-bar');
        const goButton = document.getElementById('go-btn');
        const backButton = document.getElementById('back-btn');
        const forwardButton = document.getElementById('forward-btn');
        const reloadButton = document.getElementById('reload-btn');

        // Setup navigation handlers only once
        if (!goButton.dataset.initialized) {
            goButton.addEventListener('click', () => loadURL(addressBar.value));
            addressBar.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadURL(addressBar.value); });
            backButton.addEventListener('click', () => window.electronAPI.browser.goBack());
            forwardButton.addEventListener('click', () => window.electronAPI.browser.goForward());
            reloadButton.addEventListener('click', () => window.electronAPI.browser.reload());
            goButton.dataset.initialized = 'true';
            console.log('[RENDERER] Blog navigation handlers attached.');
        }

        // Setup browser event listeners
        window.electronAPI.onBrowserNavigated((event, url) => {
            console.log(`[RENDERER] Browser navigated to: ${url}`);
            updateNavigationState();
            addTerminalLine(`Navigated to: ${url}`, 'output');
        });

        window.electronAPI.onBrowserLoadFinished(() => {
            console.log('[RENDERER] Browser finished loading.');
            updateNavigationState();
            addTerminalLine('Page load complete!', 'output');
        });

        window.electronAPI.onBrowserLoadFailed((event, error) => {
            console.error(`[RENDERER] Browser load failed: ${error}`);
            addTerminalLine(`Failed to load page: ${error}`, 'error');
        });

        await updateNavigationState();
        initializeTerminal();
        initializeResizer();
        console.log('[RENDERER] Blog Workspace UI initialization complete.');
    }

    async function loadURL(url) {
        console.log(`[RENDERER] Attempting to load URL: ${url}`);
        if (!url) return;
        let fullUrl = url.includes('://') ? url : 'https://' + url;
        
        try {
            const result = await window.electronAPI.browser.loadURL(fullUrl);
            if (result.success) {
                document.getElementById('address-bar').value = fullUrl;
                addTerminalLine(`Loading: ${fullUrl}`, 'output');
            }
        } catch (error) {
            console.error(`[RENDERER] Failed to load URL: ${error.message}`);
            addTerminalLine(`Error loading URL: ${error.message}`, 'error');
        }
    }

    async function updateNavigationState() {
        try {
            const [canGoBack, canGoForward, currentURL] = await Promise.all([
                window.electronAPI.browser.canGoBack(),
                window.electronAPI.browser.canGoForward(),
                window.electronAPI.browser.getCurrentURL()
            ]);

            document.getElementById('back-btn').disabled = !canGoBack;
            document.getElementById('forward-btn').disabled = !canGoForward;
            if (currentURL !== 'about:blank') {
                document.getElementById('address-bar').value = currentURL;
            }
            console.log(`[RENDERER] Nav state updated: back=${canGoBack}, forward=${canGoForward}, url=${currentURL}`);
        } catch (error) {
            console.error('[RENDERER] Failed to update navigation state:', error);
        }
    }

    function initializeTerminal() {
        const terminalInput = document.getElementById('terminal-input');
        if (terminalInput && !terminalInput.dataset.initialized) {
            terminalInput.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter' && terminalInput.value.trim()) {
                    const command = terminalInput.value.trim();
                    addTerminalLine(`$ ${command}`, 'command');
                    terminalInput.value = '';
                    try {
                        const result = await window.electronAPI.command.execute(command);
                        if (result.success && result.data) {
                            result.data.split('\n').forEach(line => addTerminalLine(line, 'output'));
                        } else if (!result.success) {
                            addTerminalLine(`Error: ${result.error}`, 'error');
                        }
                    } catch (error) {
                        addTerminalLine(`Execution failed: ${error.message}`, 'error');
                    }
                }
            });
            terminalInput.dataset.initialized = 'true';
            console.log('[RENDERER] Terminal initialized.');
        }
    }

    function addTerminalLine(text, type = 'output') {
        const output = document.getElementById('terminal-output');
        if (output) {
            const line = document.createElement('div');
            line.className = `${type}-line`;
            line.textContent = text;
            output.appendChild(line);
            output.scrollTop = output.scrollHeight;
        }
    }

    function initializeResizer() {
        const resizer = document.getElementById('resizer');
        if (resizer && !resizer.dataset.initialized) {
            const browserContainer = document.getElementById('browser-container');
            const terminalContainer = document.getElementById('terminal-container');
            
            const handleMouseMove = (e) => {
                const totalWidth = resizer.parentElement.offsetWidth;
                const browserWidth = e.clientX;
                if (browserWidth > 300 && totalWidth - browserWidth > 200) {
                    browserContainer.style.width = `${browserWidth}px`;
                    terminalContainer.style.width = `${totalWidth - browserWidth - resizer.offsetWidth}px`;
                }
            };

            const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };

            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            });
            resizer.dataset.initialized = 'true';
            console.log('[RENDERER] Resizer initialized.');
        }
    }
});