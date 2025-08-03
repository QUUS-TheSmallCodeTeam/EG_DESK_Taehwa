/**
 * EGDeskCore - Main Module Integration Orchestrator
 * 
 * Coordinates initialization and communication between all EG-Desk modules.
 * Implements the complete modular architecture as specified in the PRD.
 */

import { EventEmitter } from '../utils/EventEmitter.js';

// Core Modules
import ClaudeIntegration from './core/ai-agent/ClaudeIntegration.js';
import ConversationManager from './core/ai-agent/ConversationManager.js';
import TaskExecutor from './core/ai-agent/TaskExecutor.js';
import ContentGenerator from './core/content-system/ContentGenerator.js';
import TemplateManager from './core/content-system/TemplateManager.js';
import SEOOptimizer from './core/content-system/SEOOptimizer.js';
import QualityChecker from './core/content-system/QualityChecker.js';
import GlobalStateManager from './core/state-management/GlobalStateManager.js';
import EventBus from './core/state-management/EventBus.js';

// Browser Control - No longer needed in renderer, handled by main process

// Blog Automation Modules
import WPApiClient from './blog-automation/wordpress/WPApiClient.js';

// Workspace Management
import WorkspaceManager from './WorkspaceManager.js';

class EGDeskCore extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      enableLogging: options.enableLogging !== false,
      autoInitialize: options.autoInitialize !== false,
      ...options
    };
    
    this.isInitialized = false;
    this.modules = new Map();
    this.initializationOrder = [
      'eventBus',
      'globalStateManager',
      'claudeIntegration',
      'conversationManager',
      'taskExecutor',
      'templateManager',
      'contentGenerator',
      'seoOptimizer',
      'qualityChecker'
      // wpApiClient will be initialized when WordPress settings are provided
      // workspaceManager will be initialized separately after proxy setup
    ];
  }

  /**
   * Initialize all EG-Desk modules
   */
  async initialize() {
    try {
      
      if (this.isInitialized) {
        return;
      }

      // Create module instances
      await this.createModuleInstances();
      
      // Initialize modules in dependency order
      await this.initializeModules();
      
      // Set up inter-module communication
      this.setupInterModuleCommunication();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      return true;
    } catch (error) {
      this.emit('initialization-failed', error);
      throw error;
    }
  }

  /**
   * Create instances of all modules
   */
  async createModuleInstances() {
    
    try {
    
    // State Management & Communication (singleton eventBus)
    this.modules.set('eventBus', EventBus);
    this.modules.set('globalStateManager', new GlobalStateManager());
    
    // AI Agent System
    this.modules.set('claudeIntegration', new ClaudeIntegration());
    this.modules.set('conversationManager', new ConversationManager());
    this.modules.set('taskExecutor', new TaskExecutor());
    
    // Content System
    this.modules.set('templateManager', new TemplateManager());
    const contentGenerator = new ContentGenerator(
      this.modules.get('claudeIntegration'),
      this.modules.get('templateManager')
    );
    this.modules.set('contentGenerator', contentGenerator);
    this.modules.set('seoOptimizer', new SEOOptimizer());
    this.modules.set('qualityChecker', new QualityChecker());
    
    // Blog Automation - REMOVED to prevent initialization errors
    // this.modules.set('wpApiClient', new WPApiClient()); // COMMENTED OUT
    
    // Workspace Management (will be integrated with WebContentsManager proxy)
    this.modules.set('workspaceManager', null); // Will be set later with proper proxy
    
    
    } catch (error) {
      throw error;
    }
  }

  /**
   * Initialize modules in dependency order
   */
  async initializeModules() {
    
    for (const moduleName of this.initializationOrder) {
      const module = this.modules.get(moduleName);
      
      if (!module) {
        continue;
      }

      try {
        
        if (typeof module.initialize === 'function') {
          await module.initialize();
        }
        
      } catch (error) {
        throw new Error(`Module initialization failed: ${moduleName} - ${error.message}`);
      }
    }
  }

  /**
   * Set up inter-module communication via EventBus
   */
  setupInterModuleCommunication() {
    
    const eventBus = this.modules.get('eventBus');
    
    // Content generation workflow events
    eventBus.subscribe('content:generate-request', async (eventData) => {
      const contentGenerator = this.modules.get('contentGenerator');
      const result = await contentGenerator.generateBlogContent(eventData.data);
      eventBus.publish('content:generated', result);
    }, 'EGDeskCore');

    // SEO optimization events
    eventBus.subscribe('content:optimize-request', async (eventData) => {
      const seoOptimizer = this.modules.get('seoOptimizer');
      const result = await seoOptimizer.optimizeContent(eventData.data.content, eventData.data.options);
      eventBus.publish('content:optimized', result);
    }, 'EGDeskCore');

    // WordPress publishing events
    eventBus.subscribe('wordpress:publish-request', async (eventData) => {
      const wpApiClient = this.modules.get('wpApiClient');
      
      if (!wpApiClient) {
        eventBus.publish('wordpress:publish-failed', { error: 'WordPress API client not initialized' });
        return;
      }
      
      try {
        const result = await wpApiClient.createPost(eventData.data);
        eventBus.publish('wordpress:published', result);
      } catch (error) {
        eventBus.publish('wordpress:publish-failed', { error: error.message });
      }
    }, 'EGDeskCore');

    // Quality check events
    eventBus.subscribe('content:quality-check-request', async (eventData) => {
      const qualityChecker = this.modules.get('qualityChecker');
      const result = await qualityChecker.checkContentQuality(eventData.data.content);
      eventBus.publish('content:quality-checked', result);
    }, 'EGDeskCore');

    // Claude AI communication events
    eventBus.subscribe('ai:message-request', async (eventData) => {
      const claudeIntegration = this.modules.get('claudeIntegration');
      const result = await claudeIntegration.sendMessage(eventData.data.prompt, eventData.data.options);
      eventBus.publish('ai:message-response', result);
    }, 'EGDeskCore');

  }

  /**
   * Get module instance by name
   */
  getModule(moduleName) {
    return this.modules.get(moduleName);
  }

  /**
   * Set WorkspaceManager after proxy creation
   */
  setWorkspaceManager(workspaceManager) {
    this.modules.set('workspaceManager', workspaceManager);
    
    // Integrate WorkspaceManager with state management
    const globalStateManager = this.modules.get('globalStateManager');
    const eventBus = this.modules.get('eventBus');
    
    if (workspaceManager && globalStateManager) {
      // Pass state manager and event bus to workspace manager
      workspaceManager.globalStateManager = globalStateManager;
      workspaceManager.eventBus = eventBus;
      
      // Expose state manager globally for components
      window.globalStateManager = globalStateManager;
      window.eventBus = eventBus;
      
    }
  }

  /**
   * Get all modules
   */
  getAllModules() {
    return Object.fromEntries(this.modules);
  }

  /**
   * Check if all modules are initialized
   */
  isFullyInitialized() {
    return this.isInitialized;
  }

  /**
   * Initialize WordPress API client with credentials
   */
  async initializeWordPressClient(siteUrl, credentials) {
    try {
      
      // Create wpApiClient if it doesn't exist
      let wpApiClient = this.modules.get('wpApiClient');
      if (!wpApiClient) {
        wpApiClient = new WPApiClient();
        this.modules.set('wpApiClient', wpApiClient);
      }
      
      await wpApiClient.initialize(siteUrl, credentials);
      
      return true;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get system status
   */
  getSystemStatus() {
    const moduleStatus = {};
    
    for (const [name, module] of this.modules) {
      moduleStatus[name] = {
        isInitialized: module.isInitialized !== undefined ? module.isInitialized : true,
        hasError: false
      };
    }

    return {
      isInitialized: this.isInitialized,
      totalModules: this.modules.size,
      moduleStatus,
      timestamp: Date.now()
    };
  }

  /**
   * Execute a complete blog automation workflow
   */
  async executeBlogWorkflow(request) {
    if (!this.isInitialized) {
      throw new Error('EGDeskCore not initialized');
    }

    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    try {
      const eventBus = this.modules.get('eventBus');
      
      // Step 1: Generate content
      eventBus.publish('content:generate-request', request);
      const contentResult = await eventBus.waitForEvent('content:generated', 60000);
      
      // Step 2: Optimize for SEO
      eventBus.publish('content:optimize-request', {
        content: contentResult.data.content,
        options: { targetKeywords: request.keywords || [] }
      });
      const seoResult = await eventBus.waitForEvent('content:optimized', 30000);
      
      // Step 3: Quality check
      eventBus.publish('content:quality-check-request', {
        content: seoResult.data.optimizedContent
      });
      const qualityResult = await eventBus.waitForEvent('content:quality-checked', 15000);
      
      // Step 4: Publish to WordPress (if requested)
      let publishResult = null;
      if (request.autoPublish) {
        eventBus.publish('wordpress:publish-request', {
          title: contentResult.data.title,
          content: seoResult.data.optimizedContent,
          status: request.publishStatus || 'draft',
          categories: request.categories || [],
          tags: request.tags || []
        });
        publishResult = await eventBus.waitForEvent('wordpress:published', 30000);
      }
      
      const workflowResult = {
        workflowId,
        status: 'completed',
        steps: {
          contentGeneration: contentResult.data,
          seoOptimization: seoResult.data,
          qualityCheck: qualityResult.data,
          publishing: publishResult?.data || null
        },
        completedAt: Date.now()
      };
      
      this.emit('workflow-completed', workflowResult);
      
      return workflowResult;
      
    } catch (error) {
      
      const errorResult = {
        workflowId,
        status: 'failed',
        error: error.message,
        failedAt: Date.now()
      };
      
      this.emit('workflow-failed', errorResult);
      throw error;
    }
  }

  /**
   * Destroy all modules
   */
  async destroy() {
    
    // Destroy in reverse order
    const destroyOrder = [...this.initializationOrder].reverse();
    
    for (const moduleName of destroyOrder) {
      const module = this.modules.get(moduleName);
      
      if (module && typeof module.destroy === 'function') {
        try {
          await module.destroy();
        } catch (error) {
        }
      }
    }
    
    this.modules.clear();
    this.isInitialized = false;
    this.removeAllListeners();
    
  }
}

export default EGDeskCore;
