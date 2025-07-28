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
      chatContainer: document.getElementById('chat-component-container')
    };
    
    console.log('[UIManager] Cached DOM elements:', Object.keys(this.elements));
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
    if (this.elements.workspaceLayout) {
      this.elements.workspaceLayout.style.flexDirection = 'column';
      this.elements.workspaceLayout.style.gap = '8px';
    }
    
    if (this.elements.browserContainer) {
      this.elements.browserContainer.style.minHeight = '300px';
    }
    
    if (this.elements.chatContainer) {
      this.elements.chatContainer.style.minHeight = '200px';
    }
    
    console.log('[UIManager] 📱 Mobile layout applied');
  }

  /**
   * Apply tablet-specific layout adjustments
   */
  applyTabletLayout() {
    if (this.elements.workspaceLayout) {
      this.elements.workspaceLayout.style.flexDirection = 'column';
      this.elements.workspaceLayout.style.gap = '12px';
    }
    
    console.log('[UIManager] 📱 Tablet layout applied');
  }

  /**
   * Apply desktop-specific layout adjustments
   */
  applyDesktopLayout() {
    if (this.elements.workspaceLayout) {
      this.elements.workspaceLayout.style.flexDirection = 'row';
      this.elements.workspaceLayout.style.gap = '16px';
    }
    
    console.log('[UIManager] 🖥️ Desktop layout applied');
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
      'Alt+3': () => this.switchWorkspace('future')
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
    // Add CSS for animations if not already present
    if (!document.getElementById('ui-animations')) {
      const style = document.createElement('style');
      style.id = 'ui-animations';
      style.textContent = `
        .ui-transition {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .ui-smooth-transition {
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .ui-fade-in {
          animation: uiFadeIn 0.4s ease-out;
        }
        
        .ui-fade-out {
          animation: uiFadeOut 0.4s ease-out;
        }
        
        .ui-slide-up {
          animation: uiSlideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .ui-slide-down {
          animation: uiSlideDown 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes uiFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes uiFadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-20px); }
        }
        
        @keyframes uiSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes uiSlideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
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
        this.updateWorkspaceUI(workspace);
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
    this.updateWorkspaceUI(toWorkspace);
    
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
      }
      if (this.elements.workspaceTabs) {
        this.elements.workspaceTabs.classList.add('show');
        console.log('[UIManager] ✅ workspaceTabs show class added');
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
      opacity: this.elements.mainContent ? window.getComputedStyle(this.elements.mainContent).opacity : 'N/A'
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
    
    // Add notification styles if not present
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        .ui-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 20px;
          border-radius: 6px;
          color: white;
          font-weight: 500;
          z-index: 10000;
          animation: uiSlideDown 0.3s ease-out;
        }
        .ui-notification-info { background: #3b82f6; }
        .ui-notification-success { background: #10b981; }
        .ui-notification-warning { background: #f59e0b; }
        .ui-notification-error { background: #ef4444; }
      `;
      document.head.appendChild(style);
    }
    
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
      animationsEnabled: this.options.animations
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
    // Clean up event listeners
    window.removeEventListener('resize', this.handleResize);
    
    // Clear components
    this.uiComponents.clear();
    
    // Remove animation styles
    const animationStyles = document.getElementById('ui-animations');
    if (animationStyles) animationStyles.remove();
    
    const notificationStyles = document.getElementById('notification-styles');
    if (notificationStyles) notificationStyles.remove();
    
    this.isInitialized = false;
    // Custom Event Target does not require manual cleanup of listeners
    this.eventTarget = null;
    
    console.log('[UIManager] 🗑️ UI Manager destroyed');
  }
}

export default UIManager;
