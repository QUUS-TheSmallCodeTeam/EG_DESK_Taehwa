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
      console.log('[EGDeskCore] 🚀 Starting EG-Desk:태화 module initialization...');
      
      if (this.isInitialized) {
        console.warn('[EGDeskCore] Already initialized');
        return;
      }

      // Create module instances
      await this.createModuleInstances();
      
      // Initialize modules in dependency order
      await this.initializeModules();
      
      // Set up inter-module communication
      this.setupInterModuleCommunication();
      
      this.isInitialized = true;
      console.log('[EGDeskCore] ✅ All modules initialized successfully');
      this.emit('initialized');
      
      return true;
    } catch (error) {
      console.error('[EGDeskCore] ❌ Initialization failed:', error);
      this.emit('initialization-failed', error);
      throw error;
    }
  }

  /**
   * Create instances of all modules
   */
  async createModuleInstances() {
    console.log('[EGDeskCore] 🏗️  Creating module instances...');
    
    try {
    
    // State Management & Communication (singleton eventBus)
    console.log('[EGDeskCore] 📦 Creating eventBus...');
    this.modules.set('eventBus', EventBus);
    console.log('[EGDeskCore] 📦 Creating globalStateManager...');
    this.modules.set('globalStateManager', new GlobalStateManager());
    
    // AI Agent System
    console.log('[EGDeskCore] 📦 Creating claudeIntegration...');
    this.modules.set('claudeIntegration', new ClaudeIntegration());
    console.log('[EGDeskCore] 📦 Creating conversationManager...');
    this.modules.set('conversationManager', new ConversationManager());
    console.log('[EGDeskCore] 📦 Creating taskExecutor...');
    this.modules.set('taskExecutor', new TaskExecutor());
    
    // Content System
    console.log('[EGDeskCore] 📦 Creating templateManager...');
    this.modules.set('templateManager', new TemplateManager());
    console.log('[EGDeskCore] 📦 Creating contentGenerator...');
    const contentGenerator = new ContentGenerator(
      this.modules.get('claudeIntegration'),
      this.modules.get('templateManager')
    );
    this.modules.set('contentGenerator', contentGenerator);
    console.log('[EGDeskCore] 📦 Creating seoOptimizer...');
    this.modules.set('seoOptimizer', new SEOOptimizer());
    console.log('[EGDeskCore] 📦 Creating qualityChecker...');
    this.modules.set('qualityChecker', new QualityChecker());
    
    // Blog Automation - REMOVED to prevent initialization errors
    console.log('[EGDeskCore] ⚠️  WPApiClient NOT created - will be created only when WordPress settings provided');
    // this.modules.set('wpApiClient', new WPApiClient()); // COMMENTED OUT
    
    // Workspace Management (will be integrated with WebContentsManager proxy)
    this.modules.set('workspaceManager', null); // Will be set later with proper proxy
    
    console.log(`[EGDeskCore] ✅ Created ${this.modules.size} module instances successfully`);
    
    } catch (error) {
      console.error('[EGDeskCore] ❌ Error during module instance creation:', error);
      console.error('[EGDeskCore] 📊 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Initialize modules in dependency order
   */
  async initializeModules() {
    console.log('[EGDeskCore] Initializing modules in dependency order...');
    
    for (const moduleName of this.initializationOrder) {
      const module = this.modules.get(moduleName);
      
      if (!module) {
        console.warn(`[EGDeskCore] Module ${moduleName} not found, skipping...`);
        continue;
      }

      try {
        console.log(`[EGDeskCore] Initializing ${moduleName}...`);
        
        if (typeof module.initialize === 'function') {
          await module.initialize();
        }
        
        console.log(`[EGDeskCore] ✅ ${moduleName} initialized`);
      } catch (error) {
        console.error(`[EGDeskCore] ❌ Failed to initialize ${moduleName}:`, error);
        throw new Error(`Module initialization failed: ${moduleName} - ${error.message}`);
      }
    }
  }

  /**
   * Set up inter-module communication via EventBus
   */
  setupInterModuleCommunication() {
    console.log('[EGDeskCore] Setting up inter-module communication...');
    
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
      console.log('[EGDeskCore] 🔍 WordPress publish request received, checking wpApiClient...');
      const wpApiClient = this.modules.get('wpApiClient');
      
      if (!wpApiClient) {
        console.error('[EGDeskCore] ❌ wpApiClient not available for publish request');
        eventBus.publish('wordpress:publish-failed', { error: 'WordPress API client not initialized' });
        return;
      }
      
      try {
        console.log('[EGDeskCore] 📤 Creating WordPress post via wpApiClient...');
        const result = await wpApiClient.createPost(eventData.data);
        eventBus.publish('wordpress:published', result);
      } catch (error) {
        console.error('[EGDeskCore] ❌ WordPress publish failed:', error);
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

    console.log('[EGDeskCore] Inter-module communication established');
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
      
      console.log('[EGDeskCore] WorkspaceManager integrated with state management');
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
      console.log('[EGDeskCore] 🔍 Initializing WordPress API client...');
      console.log('[EGDeskCore] 📝 Received siteUrl:', siteUrl, 'type:', typeof siteUrl);
      console.log('[EGDeskCore] 📝 Received credentials:', credentials ? 'provided' : 'missing');
      
      // Create wpApiClient if it doesn't exist
      let wpApiClient = this.modules.get('wpApiClient');
      if (!wpApiClient) {
        console.log('[EGDeskCore] 🏗️  Creating new WPApiClient instance...');
        wpApiClient = new WPApiClient();
        this.modules.set('wpApiClient', wpApiClient);
      }
      
      console.log('[EGDeskCore] 🚀 Calling wpApiClient.initialize...');
      await wpApiClient.initialize(siteUrl, credentials);
      console.log('[EGDeskCore] ✅ WordPress API client initialized successfully');
      
      return true;
    } catch (error) {
      console.error('[EGDeskCore] ❌ WordPress API initialization failed:', error);
      console.error('[EGDeskCore] 📊 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
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
    console.log(`[EGDeskCore] 📝 Starting blog workflow: ${workflowId}`);
    
    try {
      const eventBus = this.modules.get('eventBus');
      
      // Step 1: Generate content
      console.log(`[EGDeskCore] Step 1: Generating content for topic: ${request.topic}`);
      eventBus.publish('content:generate-request', request);
      const contentResult = await eventBus.waitForEvent('content:generated', 60000);
      
      // Step 2: Optimize for SEO
      console.log(`[EGDeskCore] Step 2: Optimizing content for SEO`);
      eventBus.publish('content:optimize-request', {
        content: contentResult.data.content,
        options: { targetKeywords: request.keywords || [] }
      });
      const seoResult = await eventBus.waitForEvent('content:optimized', 30000);
      
      // Step 3: Quality check
      console.log(`[EGDeskCore] Step 3: Checking content quality`);
      eventBus.publish('content:quality-check-request', {
        content: seoResult.data.optimizedContent
      });
      const qualityResult = await eventBus.waitForEvent('content:quality-checked', 15000);
      
      // Step 4: Publish to WordPress (if requested)
      let publishResult = null;
      if (request.autoPublish) {
        console.log(`[EGDeskCore] Step 4: Publishing to WordPress`);
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
      
      console.log(`[EGDeskCore] ✅ Blog workflow completed: ${workflowId}`);
      this.emit('workflow-completed', workflowResult);
      
      return workflowResult;
      
    } catch (error) {
      console.error(`[EGDeskCore] ❌ Blog workflow failed: ${workflowId}`, error);
      
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
    console.log('[EGDeskCore] 🔄 Destroying all modules...');
    
    // Destroy in reverse order
    const destroyOrder = [...this.initializationOrder].reverse();
    
    for (const moduleName of destroyOrder) {
      const module = this.modules.get(moduleName);
      
      if (module && typeof module.destroy === 'function') {
        try {
          await module.destroy();
          console.log(`[EGDeskCore] ✅ ${moduleName} destroyed`);
        } catch (error) {
          console.error(`[EGDeskCore] ❌ Failed to destroy ${moduleName}:`, error);
        }
      }
    }
    
    this.modules.clear();
    this.isInitialized = false;
    this.removeAllListeners();
    
    console.log('[EGDeskCore] 🔄 All modules destroyed');
  }
}

export default EGDeskCore;
