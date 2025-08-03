/**
 * UIManager - Centralized UI Management System
 * 
 * Manages all UI components, theming, animations, and layout transitions.
 * As specified in PRD: UI 우선주의 및 모듈화된 UI 컴포넌트 관리
 */

class UIManager {
  constructor(options = {}) {
    this.eventTarget = new EventTarget();
    
    this.options = {
      theme: options.theme || 'light-grey',
      animations: options.animations !== false,
      responsiveBreakpoints: options.responsiveBreakpoints || {
        mobile: 768,
        tablet: 1024,
        desktop: 1200
      },
      ...options
    };
    
    this.isInitialized = false;
    this.currentTheme = this.options.theme;
    this.uiComponents = new Map();
    this.currentWorkspace = 'start';
    this.screenSize = 'desktop';
    
    // Animation state management
    this.isTransitioning = false;
    this.animationQueue = [];
    this.activeAnimations = new Set();
    
    // Chat history panel state
    this.historyPanelCollapsed = false;
    this.historyPanelWidth = 280;
    this.collapsedHistoryPanelWidth = 60;
    
    // Provider UI state management
    this.providerUIState = {
      currentProvider: 'claude',
      providerStatus: new Map(),
      costDisplays: new Map(),
      switching: false,
      transitionTimeout: null
    };
  }

  /**
   * Add event listener (EventTarget compatibility)
   */
  addEventListener(type, listener, options) {
    console.log(`[UIManager] 🎧 Adding event listener for: ${type}`);
    this.eventTarget.addEventListener(type, listener, options);
  }

  /**
   * Remove event listener (EventTarget compatibility)
   */
  removeEventListener(type, listener, options) {
    this.eventTarget.removeEventListener(type, listener, options);
  }

  /**
   * Dispatch custom event (EventTarget compatibility)
   */
  dispatchEvent(event) {
    console.log(`[UIManager] 📢 Dispatching event: ${event.type}`, event.detail);
    return this.eventTarget.dispatchEvent(event);
  }

  /**
   * Initialize UI Manager
   */
  async initialize() {
    try {
      console.log('[UIManager] 🎨 Initializing UI management system...');
      
      // Apply initial theme
      this.applyTheme(this.currentTheme);
      
      // Set up responsive design handlers
      this.setupResponsiveDesign();
      
      // Initialize keyboard shortcuts
      this.setupKeyboardShortcuts();
      
      // Set up animation system
      if (this.options.animations) {
        this.setupAnimationSystem();
      }
      
      // Cache essential DOM elements
      this.cacheDOMElements();
      
      // Load UI preferences
      await this.loadUIPreferences();
      
      // Set up enhanced keyboard shortcuts
      this.setupEnhancedKeyboardShortcuts();
      
      // Set up provider UI integration
      this.setupProviderUIIntegration();
      
      // Start auto-save for UI preferences
      this.startAutoSave();
      
      this.isInitialized = true;
      console.log('[UIManager] ✅ UI Manager initialized successfully');
      this.dispatchEvent(new CustomEvent('initialized'));
      
      return true;
    } catch (error) {
      console.error('[UIManager] ❌ Initialization failed:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
      throw error;
    }
  }

  /**
   * Cache essential DOM elements for performance
   */
  cacheDOMElements() {
    this.elements = {
      appHeader: document.getElementById('app-header'),
      startScreen: document.getElementById('start-screen'),
      mainContent: document.getElementById('main-content'),
      workspaceTabs: document.querySelector('.workspace-tabs'),
      workspaceLayout: document.getElementById('workspace-layout'),
      browserContainer: document.getElementById('browser-component-container'),
      chatContainer: document.getElementById('chat-component-container'),
      historyContainer: document.getElementById('chat-history-container'),
      providerIndicators: document.querySelectorAll('.provider-indicator'),
      statusIndicators: document.querySelectorAll('.status-indicator'),
      costDisplays: document.querySelectorAll('.cost-display')
    };
    
    // Set initial loading states for component containers
    this.setComponentLoadingState();
    
    console.log('[UIManager] Cached DOM elements:', Object.keys(this.elements));
    console.log('[UIManager] Critical elements status:', {
      startScreen: !!this.elements.startScreen,
      mainContent: !!this.elements.mainContent,
      workspaceLayout: !!this.elements.workspaceLayout,
      workspaceTabs: !!this.elements.workspaceTabs
    });
  }

  /**
   * Refresh DOM element cache to ensure current elements
   */
  refreshDOMElementCache() {
    // Re-query critical elements in case they changed
    this.elements.startScreen = document.getElementById('start-screen');
    this.elements.mainContent = document.getElementById('main-content');
    this.elements.workspaceLayout = document.getElementById('workspace-layout');
    this.elements.workspaceTabs = document.querySelector('.workspace-tabs');
    
    console.log('[UIManager] DOM element cache refreshed');
  }

  /**
   * Set loading states for component containers
   */
  setComponentLoadingState() {
    const containers = [this.elements.browserContainer, this.elements.chatContainer, this.elements.historyContainer];
    containers.forEach(container => {
      if (container && !container.querySelector('.component-initialized')) {
        container.classList.add('loading');
      }
    });
  }

  /**
   * Mark component as initialized
   */
  markComponentInitialized(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.classList.remove('loading', 'error');
      container.classList.add('component-initialized');
      console.log(`[UIManager] Component marked as initialized: ${containerId}`);
    }
  }

  /**
   * Mark component as failed
   */
  markComponentFailed(containerId, error) {
    const container = document.getElementById(containerId);
    if (container) {
      container.classList.remove('loading');
      container.classList.add('error');
      console.error(`[UIManager] Component marked as failed: ${containerId}`, error);
    }
  }

  /**
   * Apply theme to the application
   */
  applyTheme(themeName) {
    console.log(`[UIManager] 🎨 Applying theme: ${themeName}`);
    
    const themes = {
      'light-grey': {
        '--primary-bg': '#f8f9fa',
        '--secondary-bg': '#e9ecef',
        '--tertiary-bg': '#dee2e6',
        '--accent-bg': '#ced4da',
        '--accent-hover': '#adb5bd',
        '--success': '#28a745',
        '--warning': '#ffc107',
        '--error': '#dc3545',
        '--text-primary': '#212529',
        '--text-secondary': '#495057',
        '--text-muted': '#6c757d',
        '--border': '#dee2e6',
        '--border-light': '#e9ecef',
        '--shadow': '0 1px 3px rgba(0, 0, 0, 0.1)',
        '--shadow-lg': '0 4px 12px rgba(0, 0, 0, 0.15)',
        '--gradient-primary': 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        '--gradient-secondary': 'linear-gradient(135deg, #dee2e6 0%, #ced4da 100%)'
      },
      'dark': {
        '--primary-bg': '#1a1a1a',
        '--secondary-bg': '#2d2d2d',
        '--tertiary-bg': '#404040',
        '--accent-bg': '#525252',
        '--accent-hover': '#666666',
        '--success': '#4ade80',
        '--warning': '#fbbf24',
        '--error': '#f87171',
        '--text-primary': '#ffffff',
        '--text-secondary': '#d1d5db',
        '--text-muted': '#9ca3af',
        '--border': '#404040',
        '--border-light': '#525252',
        '--shadow': '0 1px 3px rgba(0, 0, 0, 0.3)',
        '--shadow-lg': '0 4px 12px rgba(0, 0, 0, 0.4)',
        '--gradient-primary': 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        '--gradient-secondary': 'linear-gradient(135deg, #2d2d2d 0%, #404040 100%)'
      }
    };
    
    const theme = themes[themeName];
    if (theme) {
      const root = document.documentElement;
      Object.entries(theme).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
      
      this.currentTheme = themeName;
      document.body.setAttribute('data-theme', themeName);
      
      console.log(`[UIManager] ✅ Theme applied: ${themeName}`);
      this.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: themeName } }));
    } else {
      console.warn(`[UIManager] Theme not found: ${themeName}`);
    }
  }

  /**
   * Set up responsive design handling
   */
  setupResponsiveDesign() {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      let newSize = 'desktop';
      
      if (width <= this.options.responsiveBreakpoints.mobile) {
        newSize = 'mobile';
      } else if (width <= this.options.responsiveBreakpoints.tablet) {
        newSize = 'tablet';
      }
      
      if (newSize !== this.screenSize) {
        const previousSize = this.screenSize;
        this.screenSize = newSize;
        
        document.body.className = document.body.className
          .replace(/screen-\w+/g, '')
          .trim() + ` screen-${newSize}`;
        
        console.log(`[UIManager] 📱 Screen size changed: ${previousSize} → ${newSize}`);
        this.dispatchEvent(new CustomEvent('screen-size-changed', { 
          detail: { 
            previous: previousSize, 
            current: newSize, 
            width 
          }
        }));
        
        // Adjust UI for screen size
        this.adjustUIForScreenSize(newSize);
      }
    };
    
    // Initial check
    updateScreenSize();
    
    // Listen for resize events
    window.addEventListener('resize', updateScreenSize);
    
    console.log('[UIManager] 📱 Responsive design system activated');
  }

  /**
   * Adjust UI for different screen sizes
   */
  adjustUIForScreenSize(screenSize) {
    switch (screenSize) {
      case 'mobile':
        this.applyMobileLayout();
        break;
      case 'tablet':
        this.applyTabletLayout();
        break;
      case 'desktop':
        this.applyDesktopLayout();
        break;
    }
  }

  /**
   * Apply mobile-specific layout adjustments
   */
  applyMobileLayout() {
    // Remove all inline styles - let CSS handle the layout
    if (this.elements.workspaceLayout) {
      this.elements.workspaceLayout.style.removeProperty('flexDirection');
      this.elements.workspaceLayout.style.removeProperty('gap');
    }
    
    if (this.elements.browserContainer) {
      this.elements.browserContainer.style.removeProperty('minHeight');
    }
    
    if (this.elements.chatContainer) {
      this.elements.chatContainer.style.removeProperty('minHeight');
    }
    
    // Auto-collapse history panel on mobile
    if (!this.historyPanelCollapsed) {
      this.toggleHistoryPanel(true);
    }
    
    // Apply mobile-specific chat layout
    this.applyChatLayoutForScreenSize('mobile');
    
    console.log('[UIManager] 📱 Mobile layout applied');
  }

  /**
   * Apply tablet-specific layout adjustments
   */
  applyTabletLayout() {
    // Remove all inline styles - let CSS handle the layout
    if (this.elements.workspaceLayout) {
      this.elements.workspaceLayout.style.removeProperty('flexDirection');
      this.elements.workspaceLayout.style.removeProperty('gap');
    }
    
    // Apply tablet-specific chat layout
    this.applyChatLayoutForScreenSize('tablet');
    
    console.log('[UIManager] 📱 Tablet layout applied');
  }

  /**
   * Apply desktop-specific layout adjustments
   */
  applyDesktopLayout() {
    // Remove all inline styles - let CSS handle the layout
    if (this.elements.workspaceLayout) {
      this.elements.workspaceLayout.style.removeProperty('flexDirection');
      this.elements.workspaceLayout.style.removeProperty('gap');
    }
    
    // Apply desktop-specific chat layout
    this.applyChatLayoutForScreenSize('desktop');
    
    console.log('[UIManager] 🖥️ Desktop layout applied');
  }

  /**
   * Apply chat layout adjustments for different screen sizes
   */
  applyChatLayoutForScreenSize(screenSize) {
    if (this.currentWorkspace !== 'blog') return;
    
    const historyContainer = this.elements.historyContainer;
    const chatContainer = this.elements.chatContainer;
    const browserContainer = this.elements.browserContainer;
    
    if (!historyContainer || !chatContainer || !browserContainer) return;
    
    // Apply collapsed state class
    if (this.historyPanelCollapsed) {
      historyContainer.classList.add('collapsed');
    } else {
      historyContainer.classList.remove('collapsed');
    }
    
    // Clear any inline styles that might conflict with CSS
    historyContainer.style.removeProperty('flex');
    historyContainer.style.removeProperty('order');
    historyContainer.style.removeProperty('minWidth');
    chatContainer.style.removeProperty('flex');
    chatContainer.style.removeProperty('order');
    chatContainer.style.removeProperty('minWidth');
    browserContainer.style.removeProperty('flex');
    browserContainer.style.removeProperty('order');
    browserContainer.style.removeProperty('minWidth');
    
    // Let CSS handle the layout based on media queries
    // No need to manually set styles here
    
    // Emit layout update event
    this.dispatchEvent(new CustomEvent('chat-layout-updated', {
      detail: {
        screenSize,
        historyCollapsed: this.historyPanelCollapsed,
        workspace: this.currentWorkspace
      }
    }));
    
    console.log(`[UIManager] 💬 Chat layout applied for ${screenSize} (history ${this.historyPanelCollapsed ? 'collapsed' : 'expanded'})`);
  }

  /**
   * Set up keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    const shortcuts = {
      'Escape': () => this.switchWorkspace('start'),
      'F11': () => this.toggleFullscreen(),
      'F1': () => this.showHelp(),
      'Alt+1': () => this.switchWorkspace('start'),
      'Alt+2': () => this.switchWorkspace('blog'),
      'Alt+3': () => this.switchWorkspace('future'),
      'Ctrl+Shift+h': () => this.toggleHistoryPanel(),
      'Ctrl+Shift+k': () => this.focusHistorySearch(),
      'Ctrl+Shift+n': () => this.createNewChatSession(),
      'ArrowUp': (e) => this.handleHistoryNavigation(e, 'up'),
      'ArrowDown': (e) => this.handleHistoryNavigation(e, 'down')
    };

    document.addEventListener('keydown', (event) => {
      const key = event.key;
      const modifiers = [];
      
      if (event.ctrlKey) modifiers.push('Ctrl');
      if (event.altKey) modifiers.push('Alt');
      if (event.shiftKey) modifiers.push('Shift');
      if (event.metaKey) modifiers.push('Meta');
      
      const shortcut = modifiers.length > 0 ? 
        `${modifiers.join('+')}+${key}` : key;
      
      if (shortcuts[shortcut]) {
        event.preventDefault();
        shortcuts[shortcut]();
      }
    });
    
    console.log('[UIManager] ⌨️ Keyboard shortcuts activated');
  }

  /**
   * Set up animation system
   */
  setupAnimationSystem() {
    // Animation styles are now defined in index.html - no dynamic CSS injection
    console.log('[UIManager] ✨ Animation system initialized');
  }

  /**
   * Pause all animations temporarily
   */
  pauseAnimations() {
    console.log('[UIManager] 🚫 Pausing animations during workspace transition');
    const animationStyle = document.getElementById('ui-animations');
    if (animationStyle) {
      animationStyle.disabled = true;
    }
    
    // Clear any active animations
    this.clearActiveAnimations();
    
    this.animationsPaused = true;
  }

  /**
   * Resume animations after workspace transition
   */
  resumeAnimations() {
    console.log('[UIManager] ▶️ Resuming animations after workspace transition');
    const animationStyle = document.getElementById('ui-animations');
    if (animationStyle) {
      animationStyle.disabled = false;
    }
    
    this.animationsPaused = false;
  }

  /**
   * Clear all active animations
   */
  clearActiveAnimations() {
    // Remove all animation classes from elements
    document.querySelectorAll('.ui-fade-in, .ui-fade-out, .ui-slide-up, .ui-slide-down').forEach(el => {
      el.classList.remove('ui-fade-in', 'ui-fade-out', 'ui-slide-up', 'ui-slide-down');
    });
    
    // Clear active animation tracking
    this.activeAnimations.clear();
    
    console.log('[UIManager] 🧹 Cleared all active animations');
  }

  /**
   * Queue animation to prevent conflicts
   */
  queueAnimation(animationFn) {
    return new Promise((resolve, reject) => {
      this.animationQueue.push({ fn: animationFn, resolve, reject });
      this.processAnimationQueue();
    });
  }

  /**
   * Process animation queue to prevent conflicts
   */
  async processAnimationQueue() {
    if (this.isTransitioning || this.animationQueue.length === 0) {
      return;
    }

    this.isTransitioning = true;
    const { fn, resolve, reject } = this.animationQueue.shift();

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.isTransitioning = false;
      // Process next animation in queue
      if (this.animationQueue.length > 0) {
        setTimeout(() => this.processAnimationQueue(), 50);
      }
    }
  }

  /**
   * Switch workspace with enhanced animation control
   */
  async switchWorkspace(workspace) {
    if (this.currentWorkspace === workspace) {
      console.log(`[UIManager] Already in workspace: ${workspace}`);
      return;
    }

    console.log(`[UIManager] 🔄 Switching workspace: ${this.currentWorkspace} → ${workspace}`);
    
    // If already transitioning, queue this request
    if (this.isTransitioning) {
      console.log(`[UIManager] ⏳ Queueing workspace switch (already transitioning)`);
      return this.queueAnimation(() => this.switchWorkspace(workspace));
    }

    try {
      this.isTransitioning = true;
      
      // Emit pre-switch event
      this.dispatchEvent(new CustomEvent('workspace-switching', { 
        detail: { 
          from: this.currentWorkspace, 
          to: workspace 
        }
      }));

      // Pause other animations during transition
      this.pauseAnimations();
      
      // Apply animations if enabled
      if (this.options.animations && !this.animationsPaused) {
        await this.animateWorkspaceTransition(this.currentWorkspace, workspace);
      } else {
        this.updateWorkspaceUIWithHistory(workspace);
      }

      this.currentWorkspace = workspace;
      
      // Update workspace tabs
      this.updateWorkspaceTabs(workspace);
      
      // Resume animations
      this.resumeAnimations();
      
      // Emit post-switch event
      this.dispatchEvent(new CustomEvent('workspace-switched', { 
        detail: { 
          workspace, 
          screenSize: this.screenSize 
        }
      }));

      console.log(`[UIManager] ✅ Workspace switched to: ${workspace}`);
      
    } catch (error) {
      console.error(`[UIManager] ❌ Workspace switch failed:`, error);
      
      // Resume animations even on error
      this.resumeAnimations();
      
      this.dispatchEvent(new CustomEvent('workspace-switch-failed', { 
        detail: { workspace, error }
      }));
      
      throw error;
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Animate workspace transition
   */
  async animateWorkspaceTransition(fromWorkspace, toWorkspace) {
    const duration = 400; // milliseconds
    
    // Fade out current workspace
    if (fromWorkspace === 'start' && this.elements.startScreen) {
      this.elements.startScreen.classList.add('ui-fade-out');
    } else if (this.elements.mainContent) {
      this.elements.mainContent.classList.add('ui-fade-out');
    }
    
    // Wait for fade out
    await new Promise(resolve => setTimeout(resolve, duration / 2));
    
    // Update UI
    this.updateWorkspaceUIWithHistory(toWorkspace);
    
    // Fade in new workspace
    if (toWorkspace === 'start' && this.elements.startScreen) {
      this.elements.startScreen.classList.remove('ui-fade-out');
      this.elements.startScreen.classList.add('ui-fade-in');
    } else if (this.elements.mainContent) {
      this.elements.mainContent.classList.remove('ui-fade-out');
      this.elements.mainContent.classList.add('ui-fade-in');
    }
    
    // Clean up animation classes
    setTimeout(() => {
      document.querySelectorAll('.ui-fade-in, .ui-fade-out').forEach(el => {
        el.classList.remove('ui-fade-in', 'ui-fade-out');
      });
    }, duration);
  }

  /**
   * Update workspace UI without animations
   */
  updateWorkspaceUI(workspace) {
    console.log(`[UIManager] 🎯 updateWorkspaceUI called for workspace: ${workspace}`);
    
    // Refresh DOM element cache to ensure we have current elements
    this.refreshDOMElementCache();
    
    // Log current DOM element states
    console.log('[UIManager] DOM element status:');
    console.log('  startScreen:', {
      exists: !!this.elements.startScreen,
      currentDisplay: this.elements.startScreen?.style.display,
      computedDisplay: this.elements.startScreen ? window.getComputedStyle(this.elements.startScreen).display : 'N/A'
    });
    console.log('  mainContent:', {
      exists: !!this.elements.mainContent,
      hasActiveClass: this.elements.mainContent?.classList.contains('active'),
      currentDisplay: this.elements.mainContent?.style.display,
      computedDisplay: this.elements.mainContent ? window.getComputedStyle(this.elements.mainContent).display : 'N/A'
    });
    console.log('  workspaceTabs:', {
      exists: !!this.elements.workspaceTabs,
      hasShowClass: this.elements.workspaceTabs?.classList.contains('show')
    });
    console.log('  workspaceLayout:', {
      exists: !!this.elements.workspaceLayout,
      currentDisplay: this.elements.workspaceLayout?.style.display,
      computedDisplay: this.elements.workspaceLayout ? window.getComputedStyle(this.elements.workspaceLayout).display : 'N/A'
    });
    
    // Update visibility
    if (workspace === 'start') {
      console.log('[UIManager] 📋 Switching to start workspace');
      if (this.elements.startScreen) {
        this.elements.startScreen.style.display = 'flex';
        this.elements.startScreen.style.visibility = 'visible';
        this.elements.startScreen.style.opacity = '1';
        console.log('[UIManager] ✅ startScreen shown');
      }
      if (this.elements.mainContent) {
        this.elements.mainContent.classList.remove('active');
        console.log('[UIManager] ✅ mainContent active class removed');
      }
      if (this.elements.workspaceTabs) {
        this.elements.workspaceTabs.classList.remove('show');
        console.log('[UIManager] ✅ workspaceTabs show class removed');
      }
    } else {
      console.log(`[UIManager] 📋 Switching to ${workspace} workspace`);
      if (this.elements.startScreen) {
        this.elements.startScreen.style.display = 'none';
        console.log('[UIManager] ✅ startScreen hidden');
      }
      if (this.elements.mainContent) {
        this.elements.mainContent.classList.add('active');
        console.log('[UIManager] ✅ mainContent active class added');
        
        // Force visibility for blog workspace
        if (workspace === 'blog') {
          this.elements.mainContent.style.opacity = '1';
          this.elements.mainContent.style.visibility = 'visible';
          this.elements.mainContent.style.pointerEvents = 'auto';
          console.log('[UIManager] 🔧 Forced blog workspace visibility');
        }
      }
      if (this.elements.workspaceTabs) {
        this.elements.workspaceTabs.classList.add('show');
        console.log('[UIManager] ✅ workspaceTabs show class added');
      }
      if (this.elements.workspaceLayout && workspace === 'blog') {
        // Ensure workspace layout is visible for blog workspace
        this.elements.workspaceLayout.style.display = 'flex';
        console.log('[UIManager] ✅ workspaceLayout display set to flex for blog');
      }
    }
    
    // Log DOM element states after changes
    console.log('[UIManager] DOM element status after changes:');
    console.log('  startScreen:', {
      currentDisplay: this.elements.startScreen?.style.display,
      computedDisplay: this.elements.startScreen ? window.getComputedStyle(this.elements.startScreen).display : 'N/A'
    });
    console.log('  mainContent:', {
      hasActiveClass: this.elements.mainContent?.classList.contains('active'),
      currentDisplay: this.elements.mainContent?.style.display,
      computedDisplay: this.elements.mainContent ? window.getComputedStyle(this.elements.mainContent).display : 'N/A',
      opacity: this.elements.mainContent ? window.getComputedStyle(this.elements.mainContent).opacity : 'N/A',
      visibility: this.elements.mainContent ? window.getComputedStyle(this.elements.mainContent).visibility : 'N/A'
    });
    console.log('  workspaceLayout:', {
      currentDisplay: this.elements.workspaceLayout?.style.display,
      computedDisplay: this.elements.workspaceLayout ? window.getComputedStyle(this.elements.workspaceLayout).display : 'N/A'
    });
    
    // Update body class for workspace-specific styling
    const oldClassName = document.body.className;
    document.body.className = document.body.className
      .replace(/workspace-\w+/g, '')
      .trim() + ` workspace-${workspace}`;
    console.log(`[UIManager] Body class updated: '${oldClassName}' → '${document.body.className}'`);
    
    // Emit UI update event for other components to listen to
    this.dispatchEvent(new CustomEvent('ui-updated', { 
      detail: { workspace }
    }));
    
    console.log(`[UIManager] ✅ updateWorkspaceUI completed for workspace: ${workspace}`);
  }

  /**
   * Update workspace tabs active state
   */
  updateWorkspaceTabs(workspace) {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.workspace === workspace);
    });
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `ui-notification ui-notification-${type}`;
    notification.textContent = message;
    
    // Notification styles are now defined in index.html - no dynamic CSS injection
    document.body.appendChild(notification);
    
    // Auto-remove
    setTimeout(() => {
      notification.style.animation = 'uiFadeOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, duration);
    
    console.log(`[UIManager] 📢 Notification: ${type} - ${message}`);
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      console.log('[UIManager] 📺 Exited fullscreen');
    } else {
      document.documentElement.requestFullscreen();
      console.log('[UIManager] 📺 Entered fullscreen');
    }
  }

  /**
   * Show help modal
   */
  showHelp() {
    this.showNotification('도움말 기능은 개발 중입니다', 'info');
    console.log('[UIManager] ❓ Help requested');
  }

  /**
   * Get current UI state
   */
  getUIState() {
    return {
      currentWorkspace: this.currentWorkspace,
      currentTheme: this.currentTheme,
      screenSize: this.screenSize,
      isFullscreen: !!document.fullscreenElement,
      animationsEnabled: this.options.animations,
      historyPanelCollapsed: this.historyPanelCollapsed,
      historyPanelWidth: this.historyPanelWidth,
      providerUIState: this.getProviderUIState()
    };
  }

  /**
   * Register UI component
   */
  registerComponent(name, component) {
    this.uiComponents.set(name, component);
    console.log(`[UIManager] 📦 Registered UI component: ${name}`);
    this.dispatchEvent(new CustomEvent('component-registered', { 
      detail: { name, component }
    }));
  }

  /**
   * Get registered component
   */
  getComponent(name) {
    return this.uiComponents.get(name);
  }

  /**
   * Destroy UI Manager
   */
  destroy() {
    // Save final UI state
    this.saveUIPreferences();
    
    // Stop auto-save
    this.stopAutoSave();
    
    // Clean up event listeners
    window.removeEventListener('resize', this.handleResize);
    
    // Clear components
    this.uiComponents.clear();
    
    // No need to remove animation styles - they are now defined in index.html
    
    // Clear provider UI state
    if (this.providerUIState.transitionTimeout) {
      clearTimeout(this.providerUIState.transitionTimeout);
    }
    
    this.isInitialized = false;
    // Custom Event Target does not require manual cleanup of listeners
    this.eventTarget = null;
    
    console.log('[UIManager] 🗑️ UI Manager destroyed');
  }

  /**
   * Toggle chat history panel collapse state
   */
  toggleHistoryPanel(forceCollapsed = null) {
    const shouldCollapse = forceCollapsed !== null ? forceCollapsed : !this.historyPanelCollapsed;
    
    this.historyPanelCollapsed = shouldCollapse;
    
    // Apply layout changes
    this.applyChatLayoutForScreenSize(this.screenSize);
    
    // Emit event for other components
    this.dispatchEvent(new CustomEvent('history-panel-toggled', { 
      detail: { 
        collapsed: shouldCollapse,
        screenSize: this.screenSize 
      }
    }));
    
    console.log(`[UIManager] 📝 History panel ${shouldCollapse ? 'collapsed' : 'expanded'}`);
  }

  /**
   * Handle history panel toggle from WorkspaceManager
   */
  handleHistoryPanelToggle(collapsed) {
    this.historyPanelCollapsed = collapsed;
    this.applyChatLayoutForScreenSize(this.screenSize);
    
    console.log(`[UIManager] 📝 History panel state updated: ${collapsed ? 'collapsed' : 'expanded'}`);
  }

  /**
   * Focus history search input
   */
  focusHistorySearch() {
    if (window.workspaceManager) {
      const historyPanel = window.workspaceManager.getChatHistoryPanel();
      if (historyPanel && historyPanel.focusSearch) {
        historyPanel.focusSearch();
      }
    }
  }

  /**
   * Create new chat session
   */
  createNewChatSession() {
    if (window.workspaceManager) {
      const historyPanel = window.workspaceManager.getChatHistoryPanel();
      if (historyPanel && historyPanel.createNewChat) {
        historyPanel.createNewChat();
      }
    }
  }

  /**
   * Update workspace UI to include history panel considerations
   */
  updateWorkspaceUIWithHistory(workspace) {
    // Call the original updateWorkspaceUI
    this.updateWorkspaceUI(workspace);
    
    // Apply chat-specific layout if in blog workspace
    if (workspace === 'blog') {
      setTimeout(() => {
        this.applyChatLayoutForScreenSize(this.screenSize);
      }, 100);
    }
  }

  /**
   * Save UI preferences (for state persistence)
   */
  saveUIPreferences() {
    const preferences = {
      theme: this.currentTheme,
      historyPanelCollapsed: this.historyPanelCollapsed,
      historyPanelWidth: this.historyPanelWidth,
      screenSize: this.screenSize
    };
    
    try {
      if (window.electronAPI?.state?.saveUIPreferences) {
        window.electronAPI.state.saveUIPreferences(preferences);
      } else {
        localStorage.setItem('uiPreferences', JSON.stringify(preferences));
      }
    } catch (error) {
      console.warn('[UIManager] Failed to save UI preferences:', error);
    }
  }

  /**
   * Load UI preferences (for state persistence)
   */
  async loadUIPreferences() {
    try {
      let preferences = null;
      
      if (window.electronAPI?.state?.loadUIPreferences) {
        const result = await window.electronAPI.state.loadUIPreferences();
        preferences = result.success ? result.data : null;
      } else {
        const stored = localStorage.getItem('uiPreferences');
        preferences = stored ? JSON.parse(stored) : null;
      }
      
      if (preferences) {
        this.currentTheme = preferences.theme || this.currentTheme;
        this.historyPanelCollapsed = preferences.historyPanelCollapsed || false;
        this.historyPanelWidth = preferences.historyPanelWidth || 280;
        
        // Apply loaded theme
        this.applyTheme(this.currentTheme);
        
        console.log('[UIManager] 💾 UI preferences loaded');
      }
    } catch (error) {
      console.warn('[UIManager] Failed to load UI preferences:', error);
    }
  }

  /**
   * Enhanced keyboard shortcut handler with history panel support
   */
  setupEnhancedKeyboardShortcuts() {
    // Listen for workspace-specific shortcuts
    window.addEventListener('workspace-switched', (event) => {
      const { workspace } = event.detail;
      
      if (workspace === 'blog') {
        // Enable chat history shortcuts
        this.enableChatHistoryShortcuts();
      } else {
        // Disable chat history shortcuts
        this.disableChatHistoryShortcuts();
      }
    });
  }

  /**
   * Enable chat history specific shortcuts
   */
  enableChatHistoryShortcuts() {
    console.log('[UIManager] ⌨️ Chat history shortcuts enabled');
  }

  /**
   * Disable chat history specific shortcuts
   */
  disableChatHistoryShortcuts() {
    console.log('[UIManager] ⌨️ Chat history shortcuts disabled');
  }

  /**
   * Handle history navigation with arrow keys
   */
  handleHistoryNavigation(event, direction) {
    // Only handle if we're in the blog workspace and not typing in an input
    if (this.currentWorkspace !== 'blog') return;
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
    
    const historyPanel = window.workspaceManager?.getChatHistoryPanel();
    if (!historyPanel) return;
    
    // Prevent default scrolling
    event.preventDefault();
    
    // Navigate through history items
    const conversations = historyPanel.filteredConversations || [];
    if (conversations.length === 0) return;
    
    const currentIndex = conversations.findIndex(conv => conv.id === historyPanel.currentSessionId);
    let newIndex;
    
    if (direction === 'up') {
      newIndex = currentIndex <= 0 ? conversations.length - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex >= conversations.length - 1 ? 0 : currentIndex + 1;
    }
    
    const targetConversation = conversations[newIndex];
    if (targetConversation && historyPanel.selectConversation) {
      historyPanel.selectConversation(targetConversation.id);
    }
  }

  /**
   * Handle workspace-specific shortcuts
   */
  handleWorkspaceShortcuts(event) {
    if (this.currentWorkspace === 'blog') {
      // Blog workspace specific shortcuts
      if (event.ctrlKey && event.shiftKey) {
        switch (event.key) {
          case 'H':
            event.preventDefault();
            this.toggleHistoryPanel();
            break;
          case 'K':
            event.preventDefault();
            this.focusHistorySearch();
            break;
          case 'N':
            event.preventDefault();
            this.createNewChatSession();
            break;
        }
      }
    }
  }

  /**
   * Save UI state periodically
   */
  startAutoSave() {
    // Save UI preferences every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      this.saveUIPreferences();
    }, 30000);
  }

  /**
   * Set up provider UI integration
   */
  setupProviderUIIntegration() {
    // Listen for provider-related events
    const providerEvents = [
      'workspace-provider-changed',
      'workspace-provider-status-changed',
      'workspace-cost-updated',
      'chat-providerChanged',
      'chat-providerStatusChanged',
      'chat-costUpdated'
    ];
    
    providerEvents.forEach(eventType => {
      window.addEventListener(eventType, (event) => {
        this.handleProviderUIEvent(eventType, event.detail);
      });
    });
    
    // Initialize provider status indicators
    this.initializeProviderIndicators();
    
    console.log('[UIManager] Provider UI integration setup complete');
  }
  
  /**
   * Initialize provider status indicators
   */
  initializeProviderIndicators() {
    // Provider UI styles are now defined in index.html - no dynamic CSS injection
    
    // Initialize provider status for all workspaces
    const workspaceHeaders = document.querySelectorAll('.workspace-header, .chat-header');
    workspaceHeaders.forEach(header => {
      this.ensureProviderIndicators(header);
    });
  }
  
  
  /**
   * Ensure provider indicators exist in header
   */
  ensureProviderIndicators(header) {
    if (!header.querySelector('.provider-section')) {
      const providerSection = document.createElement('div');
      providerSection.className = 'provider-section';
      providerSection.innerHTML = `
        <div class="provider-info">
          <span class="provider-indicator claude" title="Claude">🤖</span>
          <span class="status-indicator disconnected" title="Status"></span>
          <span class="provider-model-info"></span>
          <span class="cost-display" title="Session Cost">$0.00</span>
        </div>
      `;
      
      // Insert before existing controls or at the end
      const controls = header.querySelector('.chat-controls, .workspace-controls');
      if (controls) {
        header.insertBefore(providerSection, controls);
      } else {
        header.appendChild(providerSection);
      }
    }
  }
  
  /**
   * Handle provider UI events
   */
  handleProviderUIEvent(eventType, detail) {
    switch (eventType) {
      case 'workspace-provider-changed':
      case 'chat-providerChanged':
        this.updateProviderState(detail.workspaceId || 'current', {
          activeProvider: detail.provider || detail.newProvider
        });
        break;
        
      case 'workspace-provider-status-changed':
      case 'chat-providerStatusChanged':
        this.updateProviderStatus(
          detail.workspaceId || 'current',
          detail.provider,
          detail.status,
          detail.model
        );
        break;
        
      case 'workspace-cost-updated':
      case 'chat-costUpdated':
        this.updateCostDisplay(detail.workspaceId || 'current', {
          sessionCost: detail.sessionCost,
          sessionTokens: detail.sessionTokens,
          provider: detail.provider
        });
        break;
    }
  }
  
  /**
   * Update provider state
   */
  updateProviderState(workspaceId, state) {
    const { activeProvider, switching } = state;
    
    if (activeProvider) {
      this.providerUIState.currentProvider = activeProvider;
    }
    
    if (switching !== undefined) {
      this.providerUIState.switching = switching;
    }
    
    // Update provider indicators
    const indicators = this.getProviderIndicators(workspaceId);
    indicators.forEach(indicator => {
      if (activeProvider) {
        // Remove old provider classes
        indicator.classList.remove('claude', 'openai', 'gemini');
        // Add new provider class
        indicator.classList.add(activeProvider);
        
        // Update icon and title
        const providerIcons = {
          claude: '🤖',
          openai: '🧠',
          gemini: '💎'
        };
        
        const providerNames = {
          claude: 'Claude',
          openai: 'OpenAI',
          gemini: 'Gemini'
        };
        
        indicator.textContent = providerIcons[activeProvider] || '❓';
        indicator.setAttribute('title', providerNames[activeProvider] || 'Unknown');
      }
      
      // Handle switching animation
      if (switching) {
        indicator.classList.add('switching');
        
        // Clear previous timeout
        if (this.providerUIState.transitionTimeout) {
          clearTimeout(this.providerUIState.transitionTimeout);
        }
        
        // Remove switching class after animation
        this.providerUIState.transitionTimeout = setTimeout(() => {
          indicator.classList.remove('switching');
          this.providerUIState.switching = false;
        }, 800);
      }
    });
    
    console.log(`[UIManager] Provider state updated: ${activeProvider}${switching ? ' (switching)' : ''}`);
  }
  
  /**
   * Update provider status
   */
  updateProviderStatus(workspaceId, provider, status, model) {
    this.providerUIState.providerStatus.set(provider, { status, model });
    
    // Update status indicators
    const statusIndicators = this.getStatusIndicators(workspaceId);
    statusIndicators.forEach(indicator => {
      // Remove old status classes
      indicator.classList.remove('connected', 'connecting', 'disconnected', 'error');
      // Add new status class
      indicator.classList.add(status);
      
      // Update title
      const statusTexts = {
        connected: 'Connected',
        connecting: 'Connecting...',
        disconnected: 'Disconnected',
        error: 'Error'
      };
      
      const title = `${statusTexts[status] || 'Unknown'}${model ? ` - ${model}` : ''}`;
      indicator.setAttribute('title', title);
    });
    
    // Update model info displays
    const modelInfos = this.getModelInfoDisplays(workspaceId);
    modelInfos.forEach(modelInfo => {
      modelInfo.textContent = model || '';
    });
    
    console.log(`[UIManager] Provider status updated: ${provider} - ${status}${model ? ` (${model})` : ''}`);
  }
  
  /**
   * Update cost display
   */
  updateCostDisplay(workspaceId, costInfo) {
    const { sessionCost, sessionTokens, provider } = costInfo;
    
    this.providerUIState.costDisplays.set(workspaceId, costInfo);
    
    // Update cost displays
    const costDisplays = this.getCostDisplays(workspaceId);
    costDisplays.forEach(display => {
      const cost = sessionCost || 0;
      display.textContent = `$${cost.toFixed(4)}`;
      display.setAttribute('title', `${sessionTokens || 0} tokens - ${provider || 'unknown'}`);
      
      // Add update animation
      display.classList.add('updating');
      setTimeout(() => display.classList.remove('updating'), 500);
      
      // Update cost level styling
      display.classList.remove('high-cost', 'warning-cost');
      if (cost > 0.50) {
        display.classList.add('warning-cost');
      } else if (cost > 0.10) {
        display.classList.add('high-cost');
      }
    });
    
    console.log(`[UIManager] Cost display updated: $${sessionCost?.toFixed(4) || '0.0000'}`);
  }
  
  /**
   * Get provider indicators for workspace
   */
  getProviderIndicators(workspaceId) {
    if (workspaceId === 'current' || !workspaceId) {
      return document.querySelectorAll('.provider-indicator');
    }
    return document.querySelectorAll(`[data-workspace="${workspaceId}"] .provider-indicator`);
  }
  
  /**
   * Get status indicators for workspace
   */
  getStatusIndicators(workspaceId) {
    if (workspaceId === 'current' || !workspaceId) {
      return document.querySelectorAll('.status-indicator');
    }
    return document.querySelectorAll(`[data-workspace="${workspaceId}"] .status-indicator`);
  }
  
  /**
   * Get cost displays for workspace
   */
  getCostDisplays(workspaceId) {
    if (workspaceId === 'current' || !workspaceId) {
      return document.querySelectorAll('.cost-display');
    }
    return document.querySelectorAll(`[data-workspace="${workspaceId}"] .cost-display`);
  }
  
  /**
   * Get model info displays for workspace
   */
  getModelInfoDisplays(workspaceId) {
    if (workspaceId === 'current' || !workspaceId) {
      return document.querySelectorAll('.provider-model-info');
    }
    return document.querySelectorAll(`[data-workspace="${workspaceId}"] .provider-model-info`);
  }
  
  /**
   * Get provider UI state
   */
  getProviderUIState() {
    return {
      ...this.providerUIState,
      providerStatus: new Map(this.providerUIState.providerStatus),
      costDisplays: new Map(this.providerUIState.costDisplays)
    };
  }
  
  /**
   * Stop auto-save
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }
}

export default UIManager;
