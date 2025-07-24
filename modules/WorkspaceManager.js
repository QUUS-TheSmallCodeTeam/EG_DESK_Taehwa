/**
 * WorkspaceManager - Manages different workspaces and their components
 * 
 * Coordinates the initialization and management of workspace-specific components
 * like BrowserTabComponent and ChatComponent for scalable workspace architecture.
 */

class WorkspaceManager {
  constructor(webContentsManager) {
    this.webContentsManager = webContentsManager;
    this.workspaces = new Map();
    this.currentWorkspace = null;
    this.components = new Map();
  }

  /**
   * Initialize workspace manager
   */
  initialize() {
    this.registerWorkspaces();
    console.log('[WorkspaceManager] Initialized with workspaces:', Array.from(this.workspaces.keys()));
  }

  /**
   * Register available workspaces
   */
  registerWorkspaces() {
    // Blog Automation Workspace
    this.workspaces.set('blog', {
      name: 'Blog Automation',
      description: 'AI-powered blog automation workspace',
      components: [
        {
          type: 'browser',
          containerId: 'browser-component-container',
          config: {}
        },
        {
          type: 'chat',
          containerId: 'chat-component-container',
          config: {
            title: 'AI Blog Assistant',
            icon: '🤖',
            welcomeMessages: [
              { text: 'EG-Desk:태화 블로그 자동화 시스템', type: 'welcome' },
              { text: 'WordPress 연동 준비 완료', type: 'success' },
              { text: 'Claude AI 기반 콘텐츠 생성 활성화', type: 'success' },
              { text: '', type: 'output' },
              { text: '💡 블로그 자동화 명령어:', type: 'system' },
              { text: '  claude "현재 페이지 SEO 분석해줘"', type: 'output' },
              { text: '  claude "로고스키 코일 기술 블로그 글 써줘"', type: 'output' },
              { text: '  claude "이 콘텐츠를 WordPress에 게시해줘"', type: 'output' },
              { text: '', type: 'output' }
            ]
          }
        }
      ],
      onActivate: () => this.activateBlogWorkspace(),
      onDeactivate: () => this.deactivateBlogWorkspace()
    });

    // Future workspaces can be added here
    this.workspaces.set('future', {
      name: 'Advanced Workspace',
      description: 'Future advanced features workspace',
      components: [],
      onActivate: () => console.log('[WorkspaceManager] Future workspace activated'),
      onDeactivate: () => console.log('[WorkspaceManager] Future workspace deactivated')
    });
  }

  /**
   * Switch to a workspace
   */
  async switchToWorkspace(workspaceId) {
    if (!this.workspaces.has(workspaceId)) {
      throw new Error(`Workspace "${workspaceId}" not found`);
    }

    console.log(`[WorkspaceManager] Switching to workspace: ${workspaceId}`);

    // Deactivate current workspace
    if (this.currentWorkspace) {
      await this.deactivateWorkspace(this.currentWorkspace);
    }

    // Activate new workspace
    await this.activateWorkspace(workspaceId);
    this.currentWorkspace = workspaceId;

    console.log(`[WorkspaceManager] Successfully switched to: ${workspaceId}`);
    return { success: true, workspace: workspaceId };
  }

  /**
   * Activate a workspace
   */
  async activateWorkspace(workspaceId) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return;

    try {
      // Initialize workspace components
      await this.initializeWorkspaceComponents(workspaceId);

      // Call workspace-specific activation logic
      if (workspace.onActivate) {
        await workspace.onActivate();
      }

      console.log(`[WorkspaceManager] Activated workspace: ${workspaceId}`);
    } catch (error) {
      console.error(`[WorkspaceManager] Failed to activate workspace ${workspaceId}:`, error);
      throw error;
    }
  }

  /**
   * Deactivate a workspace
   */
  async deactivateWorkspace(workspaceId) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return;

    try {
      // Call workspace-specific deactivation logic
      if (workspace.onDeactivate) {
        await workspace.onDeactivate();
      }

      // Destroy workspace components
      this.destroyWorkspaceComponents(workspaceId);

      console.log(`[WorkspaceManager] Deactivated workspace: ${workspaceId}`);
    } catch (error) {
      console.error(`[WorkspaceManager] Failed to deactivate workspace ${workspaceId}:`, error);
    }
  }

  /**
   * Initialize components for a workspace
   */
  async initializeWorkspaceComponents(workspaceId) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace || !workspace.components) return;

    const workspaceKey = `workspace_${workspaceId}`;
    const workspaceComponents = new Map();

    for (const componentConfig of workspace.components) {
      try {
        const component = await this.createComponent(componentConfig);
        if (component) {
          workspaceComponents.set(componentConfig.containerId, component);
          console.log(`[WorkspaceManager] Initialized ${componentConfig.type} component for ${workspaceId}`);
        }
      } catch (error) {
        console.error(`[WorkspaceManager] Failed to create ${componentConfig.type} component:`, error);
      }
    }

    this.components.set(workspaceKey, workspaceComponents);
  }

  /**
   * Create a component based on configuration
   */
  async createComponent(config) {
    const { type, containerId, config: componentConfig } = config;

    switch (type) {
      case 'browser':
        console.log(`[WorkspaceManager] 🌐 Attempting to create browser component...`);
        console.log(`[WorkspaceManager] window.BrowserTabComponent available:`, typeof window.BrowserTabComponent);
        console.log(`[WorkspaceManager] webContentsManager available:`, !!this.webContentsManager);
        
        if (typeof window.BrowserTabComponent === 'undefined') {
          console.error('[WorkspaceManager] ❌ FATAL: BrowserTabComponent not available - check if script is loaded');
          console.log('[WorkspaceManager] Available window objects:', Object.keys(window).filter(k => k.includes('Component')));
          console.log('[WorkspaceManager] All window properties containing "Browser":', Object.keys(window).filter(k => k.includes('Browser')));
          return null;
        }
        
        console.log(`[WorkspaceManager] 🏗️ Creating BrowserTabComponent for container: ${containerId}`);
        const browserComponent = new window.BrowserTabComponent(containerId, this.webContentsManager);
        console.log(`[WorkspaceManager] ✅ BrowserTabComponent instance created`);
        
        try {
          console.log(`[WorkspaceManager] 🚀 Initializing BrowserTabComponent...`);
          await browserComponent.initialize();
          console.log(`[WorkspaceManager] ✅ BrowserTabComponent initialization completed`);
          
          console.log(`[WorkspaceManager] 🌐 Scheduling initial URL load...`);
          // Load initial URL after initialization
          setTimeout(() => {
            console.log(`[WorkspaceManager] 🔄 Triggering loadInitialURL...`);
            browserComponent.loadInitialURL().catch(error => {
              console.error(`[WorkspaceManager] ❌ loadInitialURL failed:`, error);
            });
          }, 100);
          
          console.log(`[WorkspaceManager] 🎉 Browser component setup complete`);
          return browserComponent;
        } catch (initError) {
          console.error('[WorkspaceManager] ❌ BrowserTabComponent initialization failed:', initError);
          throw initError;
        }

      case 'chat':
        if (typeof window.ChatComponent === 'undefined') {
          console.error('[WorkspaceManager] ChatComponent not available');
          return null;
        }
        
        const chatComponent = new window.ChatComponent(containerId, componentConfig);
        await chatComponent.initialize();
        return chatComponent;

      default:
        console.warn(`[WorkspaceManager] Unknown component type: ${type}`);
        return null;
    }
  }

  /**
   * Destroy components for a workspace
   */
  destroyWorkspaceComponents(workspaceId) {
    const workspaceKey = `workspace_${workspaceId}`;
    const workspaceComponents = this.components.get(workspaceKey);

    if (workspaceComponents) {
      workspaceComponents.forEach((component, containerId) => {
        try {
          if (component.destroy) {
            component.destroy();
          }
          console.log(`[WorkspaceManager] Destroyed component in ${containerId}`);
        } catch (error) {
          console.error(`[WorkspaceManager] Error destroying component in ${containerId}:`, error);
        }
      });

      this.components.delete(workspaceKey);
    }
  }

  /**
   * Get component from current workspace
   */
  getComponent(containerId) {
    if (!this.currentWorkspace) return null;
    
    const workspaceKey = `workspace_${this.currentWorkspace}`;
    const workspaceComponents = this.components.get(workspaceKey);
    
    return workspaceComponents ? workspaceComponents.get(containerId) : null;
  }

  /**
   * Get browser component from current workspace
   */
  getBrowserComponent() {
    return this.getComponent('browser-component-container');
  }

  /**
   * Get chat component from current workspace
   */
  getChatComponent() {
    return this.getComponent('chat-component-container');
  }

  /**
   * Blog workspace specific activation
   */
  async activateBlogWorkspace() {
    console.log('[WorkspaceManager] Blog workspace specific setup...');
    
    // Could add blog-specific initialization here
    // e.g., checking WordPress connection, loading saved drafts, etc.
  }

  /**
   * Blog workspace specific deactivation
   */
  async deactivateBlogWorkspace() {
    console.log('[WorkspaceManager] Blog workspace specific cleanup...');
    
    // Could add blog-specific cleanup here
    // e.g., saving drafts, closing WordPress connections, etc.
  }

  /**
   * Get available workspaces
   */
  getAvailableWorkspaces() {
    const workspaceList = [];
    this.workspaces.forEach((workspace, id) => {
      workspaceList.push({
        id,
        name: workspace.name,
        description: workspace.description,
        isActive: this.currentWorkspace === id
      });
    });
    return workspaceList;
  }

  /**
   * Get current workspace info
   */
  getCurrentWorkspace() {
    if (!this.currentWorkspace) return null;
    
    const workspace = this.workspaces.get(this.currentWorkspace);
    return {
      id: this.currentWorkspace,
      name: workspace.name,
      description: workspace.description,
      components: Array.from(this.components.get(`workspace_${this.currentWorkspace}`)?.keys() || [])
    };
  }

  /**
   * Execute command in current workspace's chat component
   */
  async executeCommand(command) {
    const chatComponent = this.getChatComponent();
    if (chatComponent && chatComponent.processCommand) {
      return await chatComponent.processCommand(command);
    }
    throw new Error('No active chat component found');
  }

  /**
   * Navigate browser in current workspace
   */
  async navigateToURL(url) {
    const browserComponent = this.getBrowserComponent();
    if (browserComponent && browserComponent.navigateToURL) {
      return await browserComponent.navigateToURL(url);
    }
    throw new Error('No active browser component found');
  }

  /**
   * Destroy workspace manager
   */
  destroy() {
    // Deactivate current workspace
    if (this.currentWorkspace) {
      this.deactivateWorkspace(this.currentWorkspace);
    }

    // Clear all components
    this.components.forEach((workspaceComponents, workspaceKey) => {
      workspaceComponents.forEach((component) => {
        if (component.destroy) {
          component.destroy();
        }
      });
    });

    this.components.clear();
    this.workspaces.clear();
    this.currentWorkspace = null;

    console.log('[WorkspaceManager] Destroyed');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WorkspaceManager;
} else {
  window.WorkspaceManager = WorkspaceManager;
}