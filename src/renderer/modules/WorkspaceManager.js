/**
 * WorkspaceManager - Manages different workspaces and their components
 * 
 * Coordinates the initialization and management of workspace-specific components
 * like BrowserTabComponent and ChatComponent for scalable workspace architecture.
 */

import BrowserTabComponent from '../components/BrowserTabComponent.js';
import ChatComponent from '../components/ChatComponent.js';
import ChatHistoryPanel from '../components/ChatHistoryPanel.js';
import eventBus from './core/state-management/EventBus.js';

class WorkspaceManager {
  constructor(webContentsManager) {
    this.webContentsManager = webContentsManager;
    this.workspaces = new Map();
    this.currentWorkspace = null;
    this.components = new Map();
    
    // State management integration (will be set by EGDeskCore)
    this.globalStateManager = null;
    this.eventBus = null;
    
    // Enhanced provider state management
    this.providerStates = new Map();
    this.globalProviderState = {
      activeProvider: 'claude',
      providers: new Map(),
      costTracking: {
        sessionCost: 0,
        totalCost: 0,
        sessionTokens: 0,
        totalTokens: 0
      },
      switching: false,
      healthStatus: new Map(),
      analytics: {
        switchCount: 0,
        lastSwitchTime: null,
        averageResponseTime: new Map(),
        providerReliability: new Map()
      }
    };
    
    // Event bus subscriptions
    this.eventSubscriptions = [];
    this.providerChannels = new Map();
    
    // Provider event handlers
    this.boundProviderHandlers = {
      providerChanged: (event) => this.handleProviderChanged(event.detail),
      providerStatusChanged: (event) => this.handleProviderStatusChanged(event.detail),
      costUpdated: (event) => this.handleCostUpdated(event.detail)
    };
  }

  /**
   * Initialize workspace manager
   */
  initialize() {
    this.registerWorkspaces();
    this.setupProviderIntegration();
    this.setupEventBusIntegration();
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
            enableProviderSelection: true,
            enableCostTracking: false,  // Disabled as requested
            enableStreaming: true,
            defaultProvider: 'claude',
            enableRealTimeUpdates: true,
            enableProviderRecommendations: true,
            welcomeMessages: [
              { text: 'EG-Desk:태화 블로그 다중 AI 시스템', type: 'welcome' },
              { text: 'WordPress 연동 준비 완료', type: 'success' },
              { text: 'Claude, OpenAI, Gemini 지원 활성화', type: 'success' },
              { text: '', type: 'output' },
              { text: '💡 다중 AI 블로그 자동화 명령어:', type: 'system' },
              { text: '  claude "현재 페이지 SEO 분석해줘"', type: 'output' },
              { text: '  openai "블로그 글 최적화해줘"', type: 'output' },
              { text: '  gemini "콘텐츠 번역해줘"', type: 'output' },
              { text: '  /provider claude - AI 제공자 변경', type: 'output' },
              { text: '  /cost - 현재 사용 비용 확인', type: 'output' },
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
    });
  }

  /**
   * Switch to a workspace with animation coordination
   */
  async switchToWorkspace(workspaceId) {
    console.log('[WorkspaceManager] switchToWorkspace called with:', workspaceId);
    if (!this.workspaces.has(workspaceId)) {
      throw new Error(`Workspace "${workspaceId}" not found`);
    }

    console.log('[WorkspaceManager] Workspace found, starting switch...');
    try {
      // Pause any component-level animations during workspace switch
      this.pauseComponentAnimations();

      // Deactivate current workspace
      if (this.currentWorkspace) {
        await this.deactivateWorkspace(this.currentWorkspace);
      }

      // Small delay to ensure clean state before activation
      await new Promise(resolve => setTimeout(resolve, 50));

      // Activate new workspace
      await this.activateWorkspace(workspaceId);
      this.currentWorkspace = workspaceId;

      // Resume component animations after workspace is fully loaded
      setTimeout(() => {
        this.resumeComponentAnimations();
      }, 100);

      return { success: true, workspace: workspaceId };
    } catch (error) {
      // Ensure animations are resumed even on error
      this.resumeComponentAnimations();
      throw error;
    }
  }

  /**
   * Activate a workspace
   */
  async activateWorkspace(workspaceId) {
    console.log('[WorkspaceManager] activateWorkspace called with:', workspaceId);
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      console.log('[WorkspaceManager] No workspace found for:', workspaceId);
      return;
    }

    console.log('[WorkspaceManager] Found workspace, initializing components...');
    try {
      // Initialize workspace components
      await this.initializeWorkspaceComponents(workspaceId);

      // Call workspace-specific activation logic
      console.log('[WorkspaceManager] Checking onActivate callback...', !!workspace.onActivate);
      if (workspace.onActivate) {
        console.log('[WorkspaceManager] Calling onActivate callback...');
        await workspace.onActivate();
        console.log('[WorkspaceManager] onActivate callback completed');
      }

    } catch (error) {
      console.error('[WorkspaceManager] Error in activateWorkspace:', error);
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
      // Save workspace state before deactivation
      await this.saveWorkspaceState(workspaceId);

      // Call workspace-specific deactivation logic
      if (workspace.onDeactivate) {
        await workspace.onDeactivate();
      }

      // Destroy workspace components (state is already saved)
      this.destroyWorkspaceComponents(workspaceId);

    } catch (error) {
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
        }
      } catch (error) {
      }
    }

    this.components.set(workspaceKey, workspaceComponents);
    
    // Restore workspace state after components are created
    await this.restoreWorkspaceState(workspaceId);
  }

  /**
   * Save workspace state including chat history and UI state
   */
  async saveWorkspaceState(workspaceId) {
    try {
      
      const workspaceKey = `workspace_${workspaceId}`;
      const workspaceComponents = this.components.get(workspaceKey);
      const workspaceState = {
        workspaceId,
        timestamp: Date.now(),
        componentStates: {}
      };

      if (workspaceComponents) {
        // Save chat component state
        const chatComponent = this.getChatComponent(workspaceId);
        if (chatComponent && typeof chatComponent.getState === 'function') {
          workspaceState.componentStates.chat = chatComponent.getState();
        }

        // Save chat history panel state
        const historyPanel = this.getChatHistoryPanel(workspaceId);
        if (historyPanel && typeof historyPanel.getState === 'function') {
          workspaceState.componentStates.chatHistory = historyPanel.getState();
        }

        // Save browser component state if available
        const browserComponent = this.getBrowserComponent(workspaceId);
        if (browserComponent && typeof browserComponent.getState === 'function') {
          workspaceState.componentStates.browser = browserComponent.getState();
        }
      }

      // Save to GlobalStateManager
      if (this.globalStateManager) {
        await this.globalStateManager.setState(`workspace_${workspaceId}`, workspaceState);
      }

      // Publish state saved event
      if (this.eventBus) {
        this.eventBus.publish('workspace-state-saved', {
          workspaceId,
          state: workspaceState
        });
      }

    } catch (error) {
    }
  }

  /**
   * Restore workspace state including chat history and UI state
   */
  async restoreWorkspaceState(workspaceId) {
    try {

      if (!this.globalStateManager) {
        return;
      }

      const workspaceState = await this.globalStateManager.getState(`workspace_${workspaceId}`);
      if (!workspaceState || !workspaceState.componentStates) {
        return;
      }

      const workspaceKey = `workspace_${workspaceId}`;
      const workspaceComponents = this.components.get(workspaceKey);

      if (workspaceComponents) {
        // Restore chat component state
        if (workspaceState.componentStates.chat) {
          const chatComponent = this.getChatComponent(workspaceId);
          if (chatComponent && typeof chatComponent.setState === 'function') {
            await chatComponent.setState(workspaceState.componentStates.chat);
          }
        }

        // Restore chat history panel state
        if (workspaceState.componentStates.chatHistory) {
          const historyPanel = this.getChatHistoryPanel(workspaceId);
          if (historyPanel && typeof historyPanel.setState === 'function') {
            await historyPanel.setState(workspaceState.componentStates.chatHistory);
          }
        }

        // Restore browser component state if available
        if (workspaceState.componentStates.browser) {
          const browserComponent = this.getBrowserComponent(workspaceId);
          if (browserComponent && typeof browserComponent.setState === 'function') {
            await browserComponent.setState(workspaceState.componentStates.browser);
          }
        }
      }

      // Publish state restored event
      if (this.eventBus) {
        this.eventBus.publish('workspace-state-restored', {
          workspaceId,
          state: workspaceState
        });
      }


    } catch (error) {
    }
  }

  /**
   * Create a component based on configuration
   */
  async createComponent(config) {
    const { type, containerId, config: componentConfig } = config;

    try {
      switch (type) {
        case 'browser':
          
          if (typeof BrowserTabComponent === 'undefined') {
            if (window.uiManager) window.uiManager.markComponentFailed(containerId, 'BrowserTabComponent not available');
            return null;
          }
          
          const browserComponent = new BrowserTabComponent(containerId, this.webContentsManager);
          
          await browserComponent.initialize();
          
          // Mark component as initialized in UI
          if (window.uiManager) window.uiManager.markComponentInitialized(containerId);
          
          // Load initial URL after initialization
          setTimeout(() => {
            browserComponent.loadInitialURL().catch(error => {
            });
          }, 100);
          
          return browserComponent;

        case 'chat':
          if (typeof ChatComponent === 'undefined') {
            if (window.uiManager) window.uiManager.markComponentFailed(containerId, 'ChatComponent not available');
            return null;
          }
          
          const chatComponent = new ChatComponent(containerId, componentConfig);
          
          // Integrate with state management before initialization
          if (this.globalStateManager) {
            chatComponent.globalStateManager = this.globalStateManager;
          }
          if (this.eventBus) {
            chatComponent.eventBus = this.eventBus;
          }
          
          await chatComponent.initialize();
          
          // Mark component as initialized in UI
          if (window.uiManager) window.uiManager.markComponentInitialized(containerId);
          
          // Set up provider state integration
          this.integrateChatComponentWithProviderState(chatComponent);
          
          return chatComponent;

        case 'chat-history':
          if (typeof ChatHistoryPanel === 'undefined') {
            if (window.uiManager) window.uiManager.markComponentFailed(containerId, 'ChatHistoryPanel not available');
            return null;
          }
          
          const historyPanel = new ChatHistoryPanel(containerId, {
            ...componentConfig,
            onSessionSelect: (conversation) => this.handleHistorySessionSelect(conversation),
            onSessionDelete: (sessionId) => this.handleHistorySessionDelete(sessionId),
            onToggleCollapse: (collapsed) => this.handleHistoryPanelToggle(collapsed)
          });
          
          // Integrate with state management before initialization
          if (this.globalStateManager) {
            historyPanel.globalStateManager = this.globalStateManager;
          }
          if (this.eventBus) {
            historyPanel.eventBus = this.eventBus;
          }
          
          await historyPanel.initialize();
          
          // Mark component as initialized in UI
          if (window.uiManager) window.uiManager.markComponentInitialized(containerId);
          
          return historyPanel;

        default:
          if (window.uiManager) window.uiManager.markComponentFailed(containerId, `Unknown component type: ${type}`);
          return null;
      }
    } catch (error) {
      if (window.uiManager) window.uiManager.markComponentFailed(containerId, error);
      throw error;
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
        } catch (error) {
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
   * Get browser component from specific or current workspace
   */
  getBrowserComponent(workspaceId = null) {
    const targetWorkspace = workspaceId || this.currentWorkspace;
    if (!targetWorkspace) return null;
    
    const workspaceKey = `workspace_${targetWorkspace}`;
    const workspaceComponents = this.components.get(workspaceKey);
    return workspaceComponents?.get('browser-component-container') || null;
  }

  /**
   * Get chat component from specific or current workspace
   */
  getChatComponent(workspaceId = null) {
    const targetWorkspace = workspaceId || this.currentWorkspace;
    if (!targetWorkspace) {
      console.warn('[WorkspaceManager] No target workspace for getChatComponent');
      return null;
    }
    
    const workspaceKey = `workspace_${targetWorkspace}`;
    const workspaceComponents = this.components.get(workspaceKey);
    const chatComponent = workspaceComponents?.get('chat-component-container');
    
    console.log('[WorkspaceManager] getChatComponent:', {
      targetWorkspace,
      workspaceKey,
      hasComponents: !!workspaceComponents,
      componentKeys: workspaceComponents ? Array.from(workspaceComponents.keys()) : [],
      chatComponentFound: !!chatComponent
    });
    
    return chatComponent || null;
  }

  /**
   * Get chat history panel from specific or current workspace
   */
  getChatHistoryPanel(workspaceId = null) {
    const targetWorkspace = workspaceId || this.currentWorkspace;
    if (!targetWorkspace) return null;
    
    const workspaceKey = `workspace_${targetWorkspace}`;
    const workspaceComponents = this.components.get(workspaceKey);
    return workspaceComponents?.get('chat-history-container') || null;
  }

  /**
   * Blog workspace specific activation
   */
  async activateBlogWorkspace() {
    console.log('[WorkspaceManager] Activating blog workspace...');
    
    // Initialize chat history integration
    const historyPanel = this.getChatHistoryPanel();
    const chatComponent = this.getChatComponent();
    
    console.log('[WorkspaceManager] Chat component found:', !!chatComponent);
    console.log('[WorkspaceManager] History panel found:', !!historyPanel);
    
    if (historyPanel && chatComponent) {
      // Set up bidirectional communication between history panel and chat component
      
      // Load any existing session
      const currentSession = historyPanel.getCurrentConversation();
      if (currentSession && chatComponent.loadSession) {
        chatComponent.loadSession(currentSession);
      }
      
      // Set up provider state synchronization
      this.syncProviderStateWithComponents(chatComponent, historyPanel);
    }
    
    // Initialize provider monitoring for this workspace
    this.initializeWorkspaceProviderMonitoring('blog');
    
    // Initialize blog automation
    try {
      // Dynamically import BlogAutomationManager to avoid circular dependencies
      const { default: BlogAutomationManager } = await import('./blog-automation/BlogAutomationManager.js');
      
      if (!this.blogAutomationManager) {
        this.blogAutomationManager = new BlogAutomationManager();
        
        // Initialize with dependencies
        await this.blogAutomationManager.initialize({
          globalState: this.globalStateManager,
          chatComponent: chatComponent
        });
        
        console.log('[WorkspaceManager] Blog automation initialized');
      }
      
      // Set blog automation manager in chat component
      if (chatComponent && chatComponent.setBlogAutomationManager) {
        chatComponent.setBlogAutomationManager(this.blogAutomationManager);
        console.log('[WorkspaceManager] Blog automation connected to chat');
      } else {
        console.error('[WorkspaceManager] ChatComponent not found or setBlogAutomationManager method missing!', {
          chatComponent: !!chatComponent,
          hasSetMethod: chatComponent ? !!chatComponent.setBlogAutomationManager : false
        });
      }
      
      // Make chat component globally accessible for button clicks
      window.chatComponent = chatComponent;
      
    } catch (error) {
      console.error('[WorkspaceManager] Failed to initialize blog automation:', error);
    }
  }

  /**
   * Blog workspace specific deactivation
   */
  async deactivateBlogWorkspace() {
    
    // Clean up blog automation
    if (this.blogAutomationManager) {
      try {
        await this.blogAutomationManager.destroy();
        console.log('[WorkspaceManager] Blog automation cleaned up');
      } catch (error) {
        console.error('[WorkspaceManager] Error cleaning up blog automation:', error);
      }
    }
    
    // Remove global chat component reference
    if (window.chatComponent) {
      delete window.chatComponent;
    }
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
   * Pause component-level animations during workspace transitions
   */
  pauseComponentAnimations() {
    
    // Get all active components and pause their animations
    this.components.forEach((workspaceComponents, workspaceKey) => {
      workspaceComponents.forEach((component, containerId) => {
        if (component.pauseAnimations && typeof component.pauseAnimations === 'function') {
          try {
            component.pauseAnimations();
          } catch (error) {
          }
        }
      });
    });
  }

  /**
   * Resume component-level animations after workspace transitions
   */
  resumeComponentAnimations() {
    
    // Get all active components and resume their animations
    this.components.forEach((workspaceComponents, workspaceKey) => {
      workspaceComponents.forEach((component, containerId) => {
        if (component.resumeAnimations && typeof component.resumeAnimations === 'function') {
          try {
            component.resumeAnimations();
          } catch (error) {
          }
        }
      });
    });
  }

  /**
   * Clear all component animations to prevent conflicts
   */
  clearComponentAnimations() {
    
    this.components.forEach((workspaceComponents, workspaceKey) => {
      workspaceComponents.forEach((component, containerId) => {
        if (component.clearAnimations && typeof component.clearAnimations === 'function') {
          try {
            component.clearAnimations();
          } catch (error) {
          }
        }
      });
    });
  }

  /**
   * Destroy workspace manager
   */
  destroy() {
    // Clear all animations before destroying
    this.clearComponentAnimations();
    
    // Clean up provider integration and EventBus subscriptions
    this.cleanupProviderIntegration();
    
    // Publish workspace shutdown event
    eventBus.publish('workspace-manager-shutdown', {
      workspaceId: this.currentWorkspace,
      timestamp: Date.now(),
      providerState: this.getGlobalProviderState()
    });
    
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
    this.providerStates.clear();
    this.currentWorkspace = null;

  }
  
  /**
   * Clean up provider integration and EventBus subscriptions
   */
  cleanupProviderIntegration() {
    // Remove provider event listeners
    Object.entries(this.boundProviderHandlers).forEach(([eventType, handler]) => {
      window.removeEventListener(`chat-${eventType}`, handler);
    });
    
    // Clean up EventBus subscriptions
    this.eventSubscriptions.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.eventSubscriptions = [];
    
    // Clean up provider channels
    this.providerChannels.clear();
    
    // Clear provider monitoring intervals
    this.providerStates.forEach((state, workspaceId) => {
      if (state.statusCheckInterval) {
        clearInterval(state.statusCheckInterval);
      }
    });
    
  }

  /**
   * Handle chat history session selection
   */
  handleHistorySessionSelect(conversation) {
    
    const chatComponent = this.getChatComponent();
    if (chatComponent && chatComponent.loadSession) {
      chatComponent.loadSession(conversation);
    }
    
    // Emit event for other components to listen
    this.dispatchEvent?.('history-session-selected', { conversation });
  }

  /**
   * Handle chat history session deletion
   */
  handleHistorySessionDelete(sessionId) {
    
    const chatComponent = this.getChatComponent();
    if (chatComponent && chatComponent.clearSession) {
      chatComponent.clearSession(sessionId);
    }
    
    // Emit event for other components to listen
    this.dispatchEvent?.('history-session-deleted', { sessionId });
  }

  /**
   * Handle chat history panel toggle
   */
  handleHistoryPanelToggle(collapsed) {
    
    // Notify UI manager about layout change
    if (window.uiManager && window.uiManager.handleHistoryPanelToggle) {
      window.uiManager.handleHistoryPanelToggle(collapsed);
    }
    
    // Emit event for other components to listen
    this.dispatchEvent?.('history-panel-toggled', { collapsed });
  }

  /**
   * Update chat history with new conversation data
   */
  updateChatHistory(conversation) {
    const historyPanel = this.getChatHistoryPanel();
    if (historyPanel && historyPanel.updateConversation) {
      historyPanel.updateConversation(conversation);
    }
  }

  /**
   * Get current chat session from history
   */
  getCurrentChatSession() {
    const historyPanel = this.getChatHistoryPanel();
    return historyPanel?.getCurrentConversation() || null;
  }

  /**
   * Create new chat session
   */
  createNewChatSession() {
    const historyPanel = this.getChatHistoryPanel();
    if (historyPanel && historyPanel.createNewChat) {
      historyPanel.createNewChat();
    }
  }

  /**
   * Set up EventBus integration for real-time updates
   */
  setupEventBusIntegration() {
    // Subscribe to provider events
    this.eventSubscriptions.push(
      eventBus.subscribe('active-provider-changed', (event) => {
        this.handleProviderSwitchEvent(event.data);
      }, 'WorkspaceManager-ProviderSwitch')
    );
    
    this.eventSubscriptions.push(
      eventBus.subscribe('provider-status-changed', (event) => {
        this.handleProviderStatusEvent(event.data);
      }, 'WorkspaceManager-ProviderStatus')
    );
    
    this.eventSubscriptions.push(
      eventBus.subscribe('provider-usage-tracked', (event) => {
        this.handleProviderUsageEvent(event.data);
      }, 'WorkspaceManager-ProviderUsage')
    );
    
    this.eventSubscriptions.push(
      eventBus.subscribe('cost-limit-warning', (event) => {
        this.handleCostLimitWarning(event.data);
      }, 'WorkspaceManager-CostWarning')
    );
    
    this.eventSubscriptions.push(
      eventBus.subscribe('provider-health-check-completed', (event) => {
        this.handleProviderHealthUpdate(event.data);
      }, 'WorkspaceManager-ProviderHealth')
    );
    
    // Subscribe to UI coordination events
    this.eventSubscriptions.push(
      eventBus.subscribe('ui-provider-switch-update', (event) => {
        this.coordinateProviderSwitchUI(event.data);
      }, 'WorkspaceManager-UISwitchCoordination')
    );
    
    this.eventSubscriptions.push(
      eventBus.subscribe('ui-realtime-cost-update', (event) => {
        this.coordinateCostUpdateUI(event.data);
      }, 'WorkspaceManager-UICostCoordination')
    );
    
  }
  
  /**
   * Handle provider switch events from EventBus
   */
  handleProviderSwitchEvent(eventData) {
    const { providerId, previousProvider, reason, conversationId } = eventData;
    
    
    // Update global state
    this.globalProviderState.activeProvider = providerId;
    this.globalProviderState.switching = true;
    this.globalProviderState.analytics.switchCount++;
    this.globalProviderState.analytics.lastSwitchTime = Date.now();
    
    // Update workspace-specific state
    const workspaceState = this.providerStates.get(this.currentWorkspace);
    if (workspaceState) {
      workspaceState.activeProvider = providerId;
    }
    
    // Update UI components
    this.updateAllComponentsForProviderSwitch(providerId, previousProvider);
    
    // Update workspace header
    this.updateWorkspaceHeader(this.currentWorkspace, { 
      activeProvider: providerId,
      switching: true
    });
    
    // Reset switching flag after transition
    setTimeout(() => {
      this.globalProviderState.switching = false;
      this.updateWorkspaceHeader(this.currentWorkspace, { switching: false });
    }, 500);
  }
  
  /**
   * Handle provider status events
   */
  handleProviderStatusEvent(eventData) {
    const { providerId, status, error, healthMetrics } = eventData;
    
    
    // Update provider status in global state
    this.globalProviderState.providers.set(providerId, { status, error });
    
    if (healthMetrics) {
      this.globalProviderState.healthStatus.set(providerId, healthMetrics);
    }
    
    // Update workspace UI
    this.updateProviderStatusDisplay(providerId, status, error);
  }
  
  /**
   * Handle provider usage tracking events
   */
  handleProviderUsageEvent(eventData) {
    const { providerId, cost, tokens, sessionCost, efficiency } = eventData;
    
    // Update cost tracking
    this.globalProviderState.costTracking.sessionCost = sessionCost;
    this.globalProviderState.costTracking.totalCost += cost;
    this.globalProviderState.costTracking.sessionTokens += tokens;
    this.globalProviderState.costTracking.totalTokens += tokens;
    
    // Update workspace cost displays
    this.updateWorkspaceCostDisplay(this.currentWorkspace, providerId, {
      sessionCost,
      cost,
      tokens,
      efficiency
    });
  }
  
  /**
   * Handle cost limit warnings
   */
  handleCostLimitWarning(eventData) {
    const { type, percentage, severity, recommendation } = eventData;
    
    
    // Show workspace-level cost warning
    this.showWorkspaceCostWarning({
      type,
      percentage,
      severity,
      recommendation
    });
  }
  
  /**
   * Handle provider health updates
   */
  handleProviderHealthUpdate(eventData) {
    const { results, healthyCount, totalCount } = eventData;
    
    
    // Update workspace health indicators
    this.updateWorkspaceHealthDisplay({
      healthyCount,
      totalCount,
      healthyPercentage: (healthyCount / totalCount) * 100
    });
  }
  
  /**
   * Coordinate provider switch across UI components
   */
  coordinateProviderSwitchUI(eventData) {
    const { switchId, providerId, status } = eventData;
    
    // Update chat component if available
    const chatComponent = this.getChatComponent();
    if (chatComponent && chatComponent.handleProviderSwitchCoordination) {
      chatComponent.handleProviderSwitchCoordination(eventData);
    }
    
    // Update chat history panel
    const historyPanel = this.getChatHistoryPanel();
    if (historyPanel && historyPanel.handleProviderSwitchCoordination) {
      historyPanel.handleProviderSwitchCoordination(eventData);
    }
  }
  
  /**
   * Coordinate cost updates across UI components
   */
  coordinateCostUpdateUI(eventData) {
    // Update all cost-aware components
    const chatComponent = this.getChatComponent();
    if (chatComponent && chatComponent.handleCostUpdateCoordination) {
      chatComponent.handleCostUpdateCoordination(eventData);
    }
    
    // Update workspace cost indicators
    this.updateWorkspaceCostIndicators(eventData);
  }
  
  /**
   * Integrate chat component with provider state
   */
  integrateChatComponentWithProviderState(chatComponent) {
    // Set up provider channel for the chat component
    const chatProviderId = this.globalProviderState.activeProvider;
    const providerChannel = eventBus.createProviderChannel(chatProviderId);
    this.providerChannels.set(`chat-${chatComponent.containerId}`, providerChannel);
    
    // Listen for chat component provider events
    if (chatComponent.onProviderChange) {
      chatComponent.onProviderChange((newProvider) => {
        eventBus.publish('active-provider-changed', {
          providerId: newProvider,
          previousProvider: this.globalProviderState.activeProvider,
          reason: 'user-selection',
          source: 'chat-component'
        });
      });
    }
    
    if (chatComponent.onCostUpdate) {
      chatComponent.onCostUpdate((costData) => {
        eventBus.publish('provider-usage-tracked', {
          ...costData,
          source: 'chat-component'
        });
      });
    }
  }
  
  /**
   * Update all components for provider switch
   */
  updateAllComponentsForProviderSwitch(newProvider, previousProvider) {
    // Update chat component
    const chatComponent = this.getChatComponent();
    if (chatComponent && chatComponent.updateProviderState) {
      chatComponent.updateProviderState(newProvider);
    }
    
    // Update chat history panel
    const historyPanel = this.getChatHistoryPanel();
    if (historyPanel && historyPanel.updateProviderContext) {
      historyPanel.updateProviderContext(newProvider, previousProvider);
    }
    
    // Update browser component if it's provider-aware
    const browserComponent = this.getBrowserComponent();
    if (browserComponent && browserComponent.updateProviderContext) {
      browserComponent.updateProviderContext(newProvider);
    }
  }
  
  /**
   * Update provider status display
   */
  updateProviderStatusDisplay(providerId, status, error) {
    const statusIndicator = document.querySelector(`[data-provider="${providerId}"] .status-indicator`);
    if (statusIndicator) {
      statusIndicator.className = `status-indicator ${status}`;
      statusIndicator.setAttribute('title', error || `${providerId} - ${status}`);
    }
    
    // Update workspace header if this is the active provider
    if (providerId === this.globalProviderState.activeProvider) {
      this.updateWorkspaceHeader(this.currentWorkspace, {
        provider: providerId,
        status,
        error
      });
    }
  }
  
  /**
   * Update workspace cost indicators
   */
  updateWorkspaceCostIndicators(costData) {
    const { sessionCost, efficiency, limits } = costData;
    
    // Update cost display in workspace header
    this.updateWorkspaceHeader(this.currentWorkspace, {
      costInfo: {
        sessionCost,
        efficiency: efficiency?.costPerToken,
        warningLevel: limits?.sessionPercentage > 80 ? 'warning' : 'normal'
      }
    });
  }
  
  /**
   * Show workspace-level cost warning
   */
  showWorkspaceCostWarning(warningData) {
    const { type, percentage, severity, recommendation } = warningData;
    
    // Create or update workspace warning indicator
    const workspaceElement = document.querySelector(`[data-workspace="${this.currentWorkspace}"]`);
    if (workspaceElement) {
      let warningIndicator = workspaceElement.querySelector('.cost-warning-indicator');
      
      if (!warningIndicator) {
        warningIndicator = document.createElement('div');
        warningIndicator.className = 'cost-warning-indicator';
        workspaceElement.appendChild(warningIndicator);
      }
      
      warningIndicator.className = `cost-warning-indicator ${severity}`;
      warningIndicator.textContent = `${type.toUpperCase()}: ${percentage.toFixed(1)}%`;
      warningIndicator.setAttribute('title', recommendation);
      
      // Auto-hide after delay unless critical
      if (severity !== 'critical') {
        setTimeout(() => {
          warningIndicator.style.display = 'none';
        }, 10000);
      }
    }
  }
  
  /**
   * Update workspace health display
   */
  updateWorkspaceHealthDisplay(healthData) {
    const { healthyCount, totalCount, healthyPercentage } = healthData;
    
    const healthIndicator = document.querySelector(`[data-workspace="${this.currentWorkspace}"] .health-indicator`);
    if (healthIndicator) {
      healthIndicator.textContent = `${healthyCount}/${totalCount}`;
      healthIndicator.className = `health-indicator ${
        healthyPercentage >= 80 ? 'healthy' : 
        healthyPercentage >= 50 ? 'warning' : 'critical'
      }`;
      healthIndicator.setAttribute('title', `${healthyPercentage.toFixed(1)}% providers healthy`);
    }
  }
  
  /**
   * Set up provider integration
   */
  setupProviderIntegration() {
    // Listen for provider events from chat components
    Object.entries(this.boundProviderHandlers).forEach(([eventType, handler]) => {
      window.addEventListener(`chat-${eventType}`, handler);
    });
    
    // Initialize provider states for each workspace
    this.workspaces.forEach((workspace, workspaceId) => {
      this.providerStates.set(workspaceId, {
        activeProvider: 'claude',
        providerStatus: new Map([
          ['claude', { status: 'disconnected', model: null, cost: 0 }],
          ['openai', { status: 'disconnected', model: null, cost: 0 }],
          ['gemini', { status: 'disconnected', model: null, cost: 0 }]
        ]),
        costTracking: {
          sessionCost: 0,
          sessionTokens: 0
        }
      });
    });
    
  }
  
  /**
   * Handle provider changed event
   */
  handleProviderChanged(detail) {
    const { provider, workspaceId = this.currentWorkspace, componentId } = detail;
    
    if (!workspaceId || !this.providerStates.has(workspaceId)) return;
    
    const workspaceProviderState = this.providerStates.get(workspaceId);
    const previousProvider = workspaceProviderState.activeProvider;
    
    workspaceProviderState.activeProvider = provider;
    this.globalProviderState.activeProvider = provider;
    this.globalProviderState.switching = true;
    
    
    // Update UI to reflect provider change
    this.updateWorkspaceProviderUI(workspaceId, provider);
    
    // Notify other components of provider change
    this.notifyProviderChange(workspaceId, provider, previousProvider);
    
    // Reset switching flag after transition
    setTimeout(() => {
      this.globalProviderState.switching = false;
    }, 300);
  }
  
  /**
   * Handle provider status changed event
   */
  handleProviderStatusChanged(detail) {
    const { provider, status, model, workspaceId = this.currentWorkspace } = detail;
    
    if (!workspaceId || !this.providerStates.has(workspaceId)) return;
    
    const workspaceProviderState = this.providerStates.get(workspaceId);
    const providerInfo = workspaceProviderState.providerStatus.get(provider);
    
    if (providerInfo) {
      providerInfo.status = status;
      if (model) providerInfo.model = model;
      
      // Update global provider registry
      this.globalProviderState.providers.set(provider, { status, model });
      
      
      // Update workspace UI
      this.updateWorkspaceProviderStatus(workspaceId, provider, status, model);
    }
  }
  
  /**
   * Handle cost updated event
   */
  handleCostUpdated(detail) {
    const { provider, sessionCost, sessionTokens, totalCost, totalTokens, workspaceId = this.currentWorkspace } = detail;
    
    if (!workspaceId || !this.providerStates.has(workspaceId)) return;
    
    const workspaceProviderState = this.providerStates.get(workspaceId);
    const providerInfo = workspaceProviderState.providerStatus.get(provider);
    
    if (providerInfo) {
      providerInfo.cost = sessionCost || 0;
      
      // Update workspace cost tracking
      workspaceProviderState.costTracking.sessionCost = sessionCost || 0;
      workspaceProviderState.costTracking.sessionTokens = sessionTokens || 0;
      
      // Update global cost tracking
      this.globalProviderState.costTracking.sessionCost = sessionCost || 0;
      this.globalProviderState.costTracking.totalCost = totalCost || 0;
      this.globalProviderState.costTracking.sessionTokens = sessionTokens || 0;
      this.globalProviderState.costTracking.totalTokens = totalTokens || 0;
      
      
      // Update workspace cost display
      this.updateWorkspaceCostDisplay(workspaceId, provider);
    }
  }
  
  /**
   * Update workspace provider UI
   */
  updateWorkspaceProviderUI(workspaceId, provider) {
    // Update UI manager with provider change
    if (window.uiManager && window.uiManager.updateProviderState) {
      window.uiManager.updateProviderState(workspaceId, {
        activeProvider: provider,
        switching: this.globalProviderState.switching
      });
    }
    
    // Update workspace header if exists
    this.updateWorkspaceHeader(workspaceId, { activeProvider: provider });
  }
  
  /**
   * Update workspace provider status
   */
  updateWorkspaceProviderStatus(workspaceId, provider, status, model) {
    // Update workspace header with status
    this.updateWorkspaceHeader(workspaceId, {
      provider,
      status,
      model
    });
    
    // Notify UI manager
    if (window.uiManager && window.uiManager.updateProviderStatus) {
      window.uiManager.updateProviderStatus(workspaceId, provider, status, model);
    }
  }
  
  /**
   * Update workspace cost display
   */
  updateWorkspaceCostDisplay(workspaceId, provider) {
    const workspaceProviderState = this.providerStates.get(workspaceId);
    if (!workspaceProviderState) return;
    
    const costInfo = {
      sessionCost: workspaceProviderState.costTracking.sessionCost,
      sessionTokens: workspaceProviderState.costTracking.sessionTokens,
      provider
    };
    
    // Update workspace header with cost info
    this.updateWorkspaceHeader(workspaceId, { costInfo });
    
    // Notify UI manager
    if (window.uiManager && window.uiManager.updateCostDisplay) {
      window.uiManager.updateCostDisplay(workspaceId, costInfo);
    }
  }
  
  /**
   * Update workspace header with enhanced provider information
   */
  updateWorkspaceHeader(workspaceId, updateInfo) {
    const headerElement = document.querySelector(`[data-workspace="${workspaceId}"] .workspace-header`);
    if (!headerElement) {
      return;
    }
    
    // Update provider indicator if needed
    if (updateInfo.activeProvider) {
      const providerIndicator = headerElement.querySelector('.provider-indicator');
      if (providerIndicator) {
        providerIndicator.textContent = this.getProviderIcon(updateInfo.activeProvider);
        providerIndicator.setAttribute('data-provider', updateInfo.activeProvider);
        
        // Add switching animation if specified
        if (updateInfo.switching) {
          providerIndicator.classList.add('switching');
          setTimeout(() => {
            providerIndicator.classList.remove('switching');
          }, 500);
        }
      } else {
        // Create provider indicator if it doesn't exist
        const newProviderIndicator = document.createElement('div');
        newProviderIndicator.className = 'provider-indicator';
        newProviderIndicator.textContent = this.getProviderIcon(updateInfo.activeProvider);
        newProviderIndicator.setAttribute('data-provider', updateInfo.activeProvider);
        headerElement.appendChild(newProviderIndicator);
      }
    }
    
    // Update status indicator if needed
    if (updateInfo.status) {
      const statusIndicator = headerElement.querySelector('.status-indicator');
      if (statusIndicator) {
        statusIndicator.className = `status-indicator ${updateInfo.status}`;
        if (updateInfo.model) {
          statusIndicator.setAttribute('title', `${updateInfo.provider} - ${updateInfo.model}`);
        }
        if (updateInfo.error) {
          statusIndicator.setAttribute('title', `${updateInfo.provider} - Error: ${updateInfo.error}`);
        }
      } else {
        // Create status indicator if it doesn't exist
        const newStatusIndicator = document.createElement('div');
        newStatusIndicator.className = `status-indicator ${updateInfo.status}`;
        newStatusIndicator.setAttribute('title', updateInfo.error || `${updateInfo.provider} - ${updateInfo.status}`);
        headerElement.appendChild(newStatusIndicator);
      }
    }
    
    // Update cost display if needed
    if (updateInfo.costInfo) {
      const costDisplay = headerElement.querySelector('.cost-display');
      if (costDisplay) {
        const { sessionCost, efficiency, warningLevel, sessionTokens } = updateInfo.costInfo;
        
        costDisplay.textContent = `$${sessionCost?.toFixed(4) || '0.0000'}`;
        costDisplay.className = `cost-display ${warningLevel || 'normal'}`;
        
        let tooltipText = `${sessionTokens || 0} tokens`;
        if (efficiency) {
          tooltipText += ` • $${efficiency.toFixed(6)}/token`;
        }
        costDisplay.setAttribute('title', tooltipText);
      } else {
        // Create cost display if it doesn't exist
        const newCostDisplay = document.createElement('div');
        newCostDisplay.className = `cost-display ${updateInfo.costInfo.warningLevel || 'normal'}`;
        newCostDisplay.textContent = `$${updateInfo.costInfo.sessionCost?.toFixed(4) || '0.0000'}`;
        headerElement.appendChild(newCostDisplay);
      }
    }
    
    // Update health indicator if needed
    if (updateInfo.healthStatus) {
      let healthIndicator = headerElement.querySelector('.health-indicator');
      if (!healthIndicator) {
        healthIndicator = document.createElement('div');
        healthIndicator.className = 'health-indicator';
        headerElement.appendChild(healthIndicator);
      }
      
      const { healthyCount, totalCount, healthyPercentage } = updateInfo.healthStatus;
      healthIndicator.textContent = `${healthyCount}/${totalCount}`;
      healthIndicator.className = `health-indicator ${
        healthyPercentage >= 80 ? 'healthy' : 
        healthyPercentage >= 50 ? 'warning' : 'critical'
      }`;
      healthIndicator.setAttribute('title', `${healthyPercentage.toFixed(1)}% providers healthy`);
    }
    
    // Update switching state indicator
    if (updateInfo.switching !== undefined) {
      const switchingIndicator = headerElement.querySelector('.switching-indicator');
      if (updateInfo.switching) {
        if (!switchingIndicator) {
          const newSwitchingIndicator = document.createElement('div');
          newSwitchingIndicator.className = 'switching-indicator active';
          newSwitchingIndicator.textContent = '⚡';
          newSwitchingIndicator.setAttribute('title', 'Switching provider...');
          headerElement.appendChild(newSwitchingIndicator);
        }
      } else if (switchingIndicator) {
        switchingIndicator.remove();
      }
    }
  }
  
  /**
   * Get provider icon
   */
  getProviderIcon(provider) {
    const icons = {
      claude: '🤖',
      openai: '🧠',
      gemini: '💎'
    };
    return icons[provider] || '❓';
  }
  
  /**
   * Notify other components of provider change
   */
  notifyProviderChange(workspaceId, newProvider, previousProvider) {
    // Notify chat history panel if it exists
    const historyPanel = this.getChatHistoryPanel();
    if (historyPanel && historyPanel.handleProviderChange) {
      historyPanel.handleProviderChange({
        workspaceId,
        newProvider,
        previousProvider
      });
    }
    
    // Emit global event
    this.dispatchEvent('provider-changed', {
      workspaceId,
      newProvider,
      previousProvider
    });
  }
  
  /**
   * Sync provider state with components
   */
  syncProviderStateWithComponents(chatComponent, historyPanel) {
    if (chatComponent) {
      // Set initial provider state
      const workspaceState = this.providerStates.get(this.currentWorkspace);
      if (workspaceState && chatComponent.setProviderState) {
        chatComponent.setProviderState(workspaceState.activeProvider);
      }
      
      // Listen for provider changes from chat component
      if (chatComponent.onProviderChange) {
        chatComponent.onProviderChange((provider) => {
          this.handleProviderChanged({ provider, componentId: chatComponent.containerId });
        });
      }
    }
    
    if (historyPanel) {
      // Set up provider metadata integration
      if (historyPanel.enableProviderMetadata) {
        historyPanel.enableProviderMetadata(true);
      }
    }
  }
  
  /**
   * Initialize workspace provider monitoring
   */
  initializeWorkspaceProviderMonitoring(workspaceId) {
    const workspaceState = this.providerStates.get(workspaceId);
    if (!workspaceState) return;
    
    // Set up periodic provider status checking
    const checkInterval = setInterval(() => {
      this.checkProviderStatuses(workspaceId);
    }, 30000); // Check every 30 seconds
    
    // Store interval for cleanup
    workspaceState.statusCheckInterval = checkInterval;
    
  }
  
  /**
   * Check provider statuses for workspace
   */
  async checkProviderStatuses(workspaceId) {
    const workspaceState = this.providerStates.get(workspaceId);
    if (!workspaceState) return;
    
    // Check each provider status
    for (const [provider, info] of workspaceState.providerStatus) {
      if (info.status === 'connected' || info.status === 'connecting') {
        // Ping provider to ensure it's still responsive
        try {
          if (window.electronAPI?.ai?.pingProvider) {
            const pingResult = await window.electronAPI.ai.pingProvider(provider);
            if (!pingResult.success) {
              this.handleProviderStatusChanged({
                provider,
                status: 'disconnected',
                workspaceId
              });
            }
          }
        } catch (error) {
          this.handleProviderStatusChanged({
            provider,
            status: 'error',
            workspaceId
          });
        }
      }
    }
  }
  
  /**
   * Get provider state for workspace
   */
  getProviderState(workspaceId = this.currentWorkspace) {
    return this.providerStates.get(workspaceId) || null;
  }
  
  /**
   * Get global provider state with enhanced analytics
   */
  getGlobalProviderState() {
    return { 
      ...this.globalProviderState,
      analytics: {
        ...this.globalProviderState.analytics,
        providerHealth: Object.fromEntries(this.globalProviderState.healthStatus),
        activeChannels: this.providerChannels.size,
        lastUpdated: Date.now()
      }
    };
  }
  
  /**
   * Get workspace provider analytics
   */
  getWorkspaceProviderAnalytics(workspaceId = this.currentWorkspace) {
    const workspaceState = this.providerStates.get(workspaceId);
    if (!workspaceState) return null;
    
    return {
      workspaceId,
      activeProvider: workspaceState.activeProvider,
      providerStatus: Object.fromEntries(workspaceState.providerStatus),
      costTracking: workspaceState.costTracking,
      healthMetrics: this.globalProviderState.healthStatus.get(workspaceState.activeProvider),
      analytics: {
        switchCount: this.globalProviderState.analytics.switchCount,
        lastSwitchTime: this.globalProviderState.analytics.lastSwitchTime
      }
    };
  }
  
  /**
   * Export workspace provider configuration
   */
  exportWorkspaceProviderConfig(workspaceId = this.currentWorkspace) {
    const analytics = this.getWorkspaceProviderAnalytics(workspaceId);
    const workspace = this.workspaces.get(workspaceId);
    
    return {
      version: '1.0',
      exportedAt: Date.now(),
      workspaceId,
      workspaceName: workspace?.name,
      providerConfiguration: analytics,
      eventBusIntegration: {
        activeSubscriptions: this.eventSubscriptions.length,
        providerChannels: this.providerChannels.size
      }
    };
  }
  
  /**
   * Switch provider for current workspace
   */
  async switchProvider(provider, workspaceId = this.currentWorkspace) {
    const chatComponent = this.getChatComponent();
    if (chatComponent && chatComponent.switchProvider) {
      return await chatComponent.switchProvider(provider);
    }
    return false;
  }
  
  /**
   * Dispatch custom events (if event system is available)
   */
  dispatchEvent(eventType, detail) {
    if (typeof CustomEvent !== 'undefined' && window.dispatchEvent) {
      const event = new CustomEvent(`workspace-${eventType}`, { detail });
      window.dispatchEvent(event);
    }
  }
}

// ES6 export
export default WorkspaceManager;