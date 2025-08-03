# State Management Integration for Blog Automation

## GlobalStateManager Extensions

### 1. Blog State Schema

#### Blog State Structure
```javascript
// Addition to existing GlobalStateManager.js
const blogState = {
  // Current workflow management
  currentWorkflow: null,           // Active blog creation workflow
  workflowHistory: [],             // Previous workflows for session
  
  // Content management
  drafts: [],                      // Saved blog drafts
  publishedPosts: [],              // Recently published posts
  templates: [],                   // Available blog templates
  
  // Publishing system
  publishingQueue: [],             // Posts queued for publishing
  publishingStatus: 'idle',        // 'idle', 'processing', 'error'
  
  // User preferences
  settings: {
    defaultTemplate: 'technical',
    defaultProvider: 'claude',
    autoSave: true,
    autoPublish: false,
    wordpressConfig: {
      siteUrl: '',
      isConfigured: false,
      lastConnection: null
    }
  },
  
  // Analytics and tracking
  analytics: {
    totalPosts: 0,
    successfulPublications: 0,
    averageGenerationTime: 0,
    mostUsedTemplate: null
  },
  
  // UI state
  ui: {
    isWorkflowVisible: false,
    activePanel: null,           // 'requirements', 'content', 'review', 'publish'
    showingDrafts: false,
    commandSuggestions: []
  }
};
```

### 2. Enhanced GlobalStateManager

#### Blog State Management Extension
```javascript
class GlobalStateManager {
  constructor() {
    // Existing constructor...
    
    // Initialize blog state
    this.state.blog = this.getDefaultBlogState();
    
    // Blog-specific event handlers
    this.setupBlogEventHandlers();
  }

  getDefaultBlogState() {
    return {
      currentWorkflow: null,
      workflowHistory: [],
      drafts: [],
      publishedPosts: [],
      templates: this.loadDefaultTemplates(),
      publishingQueue: [],
      publishingStatus: 'idle',
      settings: {
        defaultTemplate: 'technical',
        defaultProvider: 'claude',
        autoSave: true,
        autoPublish: false,
        wordpressConfig: {
          siteUrl: '',
          isConfigured: false,
          lastConnection: null
        }
      },
      analytics: {
        totalPosts: 0,
        successfulPublications: 0,
        averageGenerationTime: 0,
        mostUsedTemplate: null
      },
      ui: {
        isWorkflowVisible: false,
        activePanel: null,
        showingDrafts: false,
        commandSuggestions: []
      }
    };
  }

  setupBlogEventHandlers() {
    // Workflow events
    this.eventBus.on('blog.workflow.started', this.handleWorkflowStarted.bind(this));
    this.eventBus.on('blog.workflow.completed', this.handleWorkflowCompleted.bind(this));
    this.eventBus.on('blog.workflow.step.changed', this.handleWorkflowStepChanged.bind(this));
    
    // Content events
    this.eventBus.on('blog.content.generated', this.handleContentGenerated.bind(this));
    this.eventBus.on('blog.draft.saved', this.handleDraftSaved.bind(this));
    this.eventBus.on('blog.draft.loaded', this.handleDraftLoaded.bind(this));
    
    // Publishing events
    this.eventBus.on('blog.publishing.queued', this.handlePublishingQueued.bind(this));
    this.eventBus.on('blog.publishing.completed', this.handlePublishingCompleted.bind(this));
    this.eventBus.on('blog.publishing.failed', this.handlePublishingFailed.bind(this));
    
    // Settings events
    this.eventBus.on('blog.settings.updated', this.handleSettingsUpdated.bind(this));
    this.eventBus.on('wordpress.connection.tested', this.handleWordPressConnection.bind(this));
  }

  // Blog State Getters
  getBlogState() {
    return this.state.blog;
  }

  getCurrentWorkflow() {
    return this.state.blog.currentWorkflow;
  }

  getDrafts() {
    return this.state.blog.drafts;
  }

  getPublishingQueue() {
    return this.state.blog.publishingQueue;
  }

  getBlogSettings() {
    return this.state.blog.settings;
  }

  getBlogAnalytics() {
    return this.state.blog.analytics;
  }

  // Blog State Setters
  setCurrentWorkflow(workflow) {
    this.state.blog.currentWorkflow = workflow;
    this.notifyStateChange('blog.currentWorkflow', workflow);
    
    // Auto-save workflow state
    if (this.state.blog.settings.autoSave) {
      this.saveWorkflowState(workflow);
    }
  }

  updateWorkflowStep(step, data = {}) {
    if (this.state.blog.currentWorkflow) {
      this.state.blog.currentWorkflow.currentStep = step;
      this.state.blog.currentWorkflow.stepData = {
        ...this.state.blog.currentWorkflow.stepData,
        ...data
      };
      
      this.notifyStateChange('blog.workflow.step', { step, data });
      
      // Update UI state
      this.state.blog.ui.activePanel = step;
      this.notifyStateChange('blog.ui.activePanel', step);
    }
  }

  addDraft(draft) {
    const draftWithId = {
      id: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...draft
    };
    
    this.state.blog.drafts.unshift(draftWithId);
    this.notifyStateChange('blog.drafts', this.state.blog.drafts);
    
    // Persist to storage
    this.persistBlogState();
    
    return draftWithId;
  }

  updateDraft(draftId, updates) {
    const draftIndex = this.state.blog.drafts.findIndex(d => d.id === draftId);
    if (draftIndex !== -1) {
      this.state.blog.drafts[draftIndex] = {
        ...this.state.blog.drafts[draftIndex],
        ...updates,
        updatedAt: Date.now()
      };
      
      this.notifyStateChange('blog.drafts', this.state.blog.drafts);
      this.persistBlogState();
    }
  }

  deleteDraft(draftId) {
    this.state.blog.drafts = this.state.blog.drafts.filter(d => d.id !== draftId);
    this.notifyStateChange('blog.drafts', this.state.blog.drafts);
    this.persistBlogState();
  }

  addToPublishingQueue(publishJob) {
    this.state.blog.publishingQueue.push(publishJob);
    this.notifyStateChange('blog.publishingQueue', this.state.blog.publishingQueue);
  }

  updatePublishingStatus(status) {
    this.state.blog.publishingStatus = status;
    this.notifyStateChange('blog.publishingStatus', status);
  }

  addPublishedPost(postData) {
    this.state.blog.publishedPosts.unshift({
      ...postData,
      publishedAt: Date.now()
    });
    
    // Keep only last 50 published posts
    if (this.state.blog.publishedPosts.length > 50) {
      this.state.blog.publishedPosts = this.state.blog.publishedPosts.slice(0, 50);
    }
    
    this.notifyStateChange('blog.publishedPosts', this.state.blog.publishedPosts);
    this.updateAnalytics('postPublished', postData);
  }

  updateBlogSettings(settings) {
    this.state.blog.settings = {
      ...this.state.blog.settings,
      ...settings
    };
    
    this.notifyStateChange('blog.settings', this.state.blog.settings);
    this.persistBlogState();
  }

  updateAnalytics(event, data = {}) {
    const analytics = this.state.blog.analytics;
    
    switch (event) {
      case 'postPublished':
        analytics.totalPosts++;
        analytics.successfulPublications++;
        break;
        
      case 'generationTime':
        const currentAvg = analytics.averageGenerationTime;
        const newTime = data.time;
        const totalPosts = analytics.totalPosts || 1;
        analytics.averageGenerationTime = Math.round(
          (currentAvg * (totalPosts - 1) + newTime) / totalPosts
        );
        break;
        
      case 'templateUsed':
        analytics.mostUsedTemplate = data.template;
        break;
    }
    
    this.notifyStateChange('blog.analytics', analytics);
    this.persistBlogState();
  }

  // Event Handlers
  handleWorkflowStarted(event) {
    const workflow = {
      id: event.workflowId,
      startedAt: event.timestamp,
      currentStep: 'requirements',
      stepData: {},
      status: 'active'
    };
    
    this.setCurrentWorkflow(workflow);
    this.state.blog.ui.isWorkflowVisible = true;
    this.state.blog.ui.activePanel = 'requirements';
    this.notifyStateChange('blog.ui', this.state.blog.ui);
  }

  handleWorkflowCompleted(event) {
    if (this.state.blog.currentWorkflow) {
      this.state.blog.currentWorkflow.completedAt = event.timestamp;
      this.state.blog.currentWorkflow.status = 'completed';
      
      // Add to history
      this.state.blog.workflowHistory.unshift({
        ...this.state.blog.currentWorkflow
      });
      
      // Clear current workflow
      this.state.blog.currentWorkflow = null;
      this.state.blog.ui.isWorkflowVisible = false;
      this.state.blog.ui.activePanel = null;
      
      this.notifyStateChange('blog.workflow.completed', event);
      this.notifyStateChange('blog.ui', this.state.blog.ui);
    }
  }

  handleWorkflowStepChanged(event) {
    this.updateWorkflowStep(event.step, event.data);
  }

  handleContentGenerated(event) {
    if (this.state.blog.settings.autoSave && event.content) {
      const draft = {
        title: event.content.title,
        content: event.content.content,
        metadata: event.content.metadata,
        workflowId: this.state.blog.currentWorkflow?.id,
        autoSaved: true
      };
      
      this.addDraft(draft);
    }
    
    this.updateAnalytics('generationTime', { time: event.generationTime });
  }

  handleDraftSaved(event) {
    if (event.draftId) {
      this.updateDraft(event.draftId, event.data);
    } else {
      this.addDraft(event.data);
    }
  }

  handlePublishingQueued(event) {
    this.addToPublishingQueue(event.publishJob);
    this.updatePublishingStatus('queued');
  }

  handlePublishingCompleted(event) {
    // Remove from queue
    this.state.blog.publishingQueue = this.state.blog.publishingQueue.filter(
      job => job.id !== event.jobId
    );
    
    // Add to published posts
    this.addPublishedPost(event.result);
    
    // Update status
    this.updatePublishingStatus(
      this.state.blog.publishingQueue.length > 0 ? 'processing' : 'idle'
    );
  }

  handlePublishingFailed(event) {
    // Update job status in queue
    const job = this.state.blog.publishingQueue.find(j => j.id === event.jobId);
    if (job) {
      job.status = 'failed';
      job.error = event.error;
    }
    
    this.notifyStateChange('blog.publishingQueue', this.state.blog.publishingQueue);
  }

  handleSettingsUpdated(event) {
    this.updateBlogSettings(event.settings);
  }

  handleWordPressConnection(event) {
    this.state.blog.settings.wordpressConfig = {
      ...this.state.blog.settings.wordpressConfig,
      isConfigured: event.success,
      lastConnection: event.timestamp,
      lastError: event.success ? null : event.error
    };
    
    this.notifyStateChange('blog.settings.wordpress', this.state.blog.settings.wordpressConfig);
  }

  // UI State Management
  showWorkflowPanel(panel = null) {
    this.state.blog.ui.isWorkflowVisible = true;
    this.state.blog.ui.activePanel = panel;
    this.notifyStateChange('blog.ui', this.state.blog.ui);
  }

  hideWorkflowPanel() {
    this.state.blog.ui.isWorkflowVisible = false;
    this.state.blog.ui.activePanel = null;
    this.notifyStateChange('blog.ui', this.state.blog.ui);
  }

  setCommandSuggestions(suggestions) {
    this.state.blog.ui.commandSuggestions = suggestions;
    this.notifyStateChange('blog.ui.commandSuggestions', suggestions);
  }

  // Persistence
  persistBlogState() {
    if (this.electronStore) {
      this.electronStore.set('blog.drafts', this.state.blog.drafts);
      this.electronStore.set('blog.settings', this.state.blog.settings);
      this.electronStore.set('blog.analytics', this.state.blog.analytics);
      this.electronStore.set('blog.publishedPosts', this.state.blog.publishedPosts);
    }
  }

  loadPersistedBlogState() {
    if (this.electronStore) {
      const drafts = this.electronStore.get('blog.drafts', []);
      const settings = this.electronStore.get('blog.settings', this.state.blog.settings);
      const analytics = this.electronStore.get('blog.analytics', this.state.blog.analytics);
      const publishedPosts = this.electronStore.get('blog.publishedPosts', []);
      
      this.state.blog.drafts = drafts;
      this.state.blog.settings = { ...this.state.blog.settings, ...settings };
      this.state.blog.analytics = { ...this.state.blog.analytics, ...analytics };
      this.state.blog.publishedPosts = publishedPosts;
    }
  }

  saveWorkflowState(workflow) {
    if (this.electronStore) {
      this.electronStore.set('blog.currentWorkflow', workflow);
    }
  }

  loadWorkflowState() {
    if (this.electronStore) {
      const workflow = this.electronStore.get('blog.currentWorkflow', null);
      if (workflow) {
        this.setCurrentWorkflow(workflow);
        this.state.blog.ui.isWorkflowVisible = true;
        this.state.blog.ui.activePanel = workflow.currentStep;
      }
    }
  }

  // Utility Methods
  loadDefaultTemplates() {
    return [
      {
        id: 'technical',
        name: 'Technical Article',
        description: 'In-depth technical content with code examples',
        structure: ['introduction', 'overview', 'implementation', 'examples', 'best-practices', 'conclusion']
      },
      {
        id: 'tutorial',
        name: 'Tutorial Guide',
        description: 'Step-by-step instructional content',
        structure: ['introduction', 'prerequisites', 'step-by-step', 'troubleshooting', 'conclusion']
      },
      {
        id: 'opinion',
        name: 'Opinion/Analysis',
        description: 'Thought leadership and analytical content',
        structure: ['introduction', 'current-state', 'analysis', 'implications', 'recommendations', 'conclusion']
      },
      {
        id: 'news',
        name: 'News/Update',
        description: 'Timely updates and announcements',
        structure: ['introduction', 'what-happened', 'impact', 'analysis', 'next-steps']
      }
    ];
  }

  // State validation and recovery
  validateBlogState() {
    // Ensure blog state integrity
    if (!this.state.blog) {
      this.state.blog = this.getDefaultBlogState();
    }
    
    // Validate required properties
    const required = ['drafts', 'settings', 'analytics', 'ui'];
    required.forEach(prop => {
      if (!this.state.blog[prop]) {
        this.state.blog[prop] = this.getDefaultBlogState()[prop];
      }
    });
  }

  // Cleanup old data
  cleanupBlogData() {
    // Remove old workflow history (keep last 20)
    if (this.state.blog.workflowHistory.length > 20) {
      this.state.blog.workflowHistory = this.state.blog.workflowHistory.slice(0, 20);
    }
    
    // Remove old drafts (older than 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    this.state.blog.drafts = this.state.blog.drafts.filter(
      draft => draft.updatedAt > thirtyDaysAgo
    );
    
    this.persistBlogState();
  }
}
```

### 3. Event Bus Integration

#### Blog-Specific Events
```javascript
// Blog automation events for EventBus
const BLOG_EVENTS = {
  // Workflow events
  WORKFLOW_STARTED: 'blog.workflow.started',
  WORKFLOW_STEP_CHANGED: 'blog.workflow.step.changed',
  WORKFLOW_COMPLETED: 'blog.workflow.completed',
  WORKFLOW_CANCELLED: 'blog.workflow.cancelled',
  
  // Content events
  REQUIREMENTS_COLLECTED: 'blog.requirements.collected',
  OUTLINE_GENERATED: 'blog.outline.generated',
  CONTENT_GENERATED: 'blog.content.generated',
  CONTENT_REVIEWED: 'blog.content.reviewed',
  
  // Draft events
  DRAFT_SAVED: 'blog.draft.saved',
  DRAFT_LOADED: 'blog.draft.loaded',
  DRAFT_DELETED: 'blog.draft.deleted',
  
  // Publishing events
  PUBLISHING_QUEUED: 'blog.publishing.queued',
  PUBLISHING_STARTED: 'blog.publishing.started',
  PUBLISHING_COMPLETED: 'blog.publishing.completed',
  PUBLISHING_FAILED: 'blog.publishing.failed',
  
  // Settings events
  SETTINGS_UPDATED: 'blog.settings.updated',
  WORDPRESS_CONNECTION_TESTED: 'wordpress.connection.tested',
  
  // UI events
  UI_PANEL_CHANGED: 'blog.ui.panel.changed',
  UI_WORKFLOW_SHOWN: 'blog.ui.workflow.shown',
  UI_WORKFLOW_HIDDEN: 'blog.ui.workflow.hidden'
};
```

### 4. State Synchronization with UI Components

#### Blog State Subscribers
```javascript
class BlogStateSubscriber {
  constructor(globalStateManager, component) {
    this.stateManager = globalStateManager;
    this.component = component;
    this.subscriptions = [];
    
    this.setupSubscriptions();
  }

  setupSubscriptions() {
    // Subscribe to blog state changes
    this.subscribe('blog.currentWorkflow', this.handleWorkflowChange.bind(this));
    this.subscribe('blog.drafts', this.handleDraftsChange.bind(this));
    this.subscribe('blog.publishingQueue', this.handleQueueChange.bind(this));
    this.subscribe('blog.ui', this.handleUIChange.bind(this));
    this.subscribe('blog.settings', this.handleSettingsChange.bind(this));
  }

  subscribe(statePath, handler) {
    const subscription = this.stateManager.subscribe(statePath, handler);
    this.subscriptions.push(subscription);
    return subscription;
  }

  handleWorkflowChange(workflow) {
    if (this.component.updateWorkflowUI) {
      this.component.updateWorkflowUI(workflow);
    }
  }

  handleDraftsChange(drafts) {
    if (this.component.updateDraftsList) {
      this.component.updateDraftsList(drafts);
    }
  }

  handleQueueChange(queue) {
    if (this.component.updatePublishingStatus) {
      this.component.updatePublishingStatus(queue);
    }
  }

  handleUIChange(uiState) {
    if (this.component.updateBlogUI) {
      this.component.updateBlogUI(uiState);
    }
  }

  handleSettingsChange(settings) {
    if (this.component.updateBlogSettings) {
      this.component.updateBlogSettings(settings);
    }
  }

  unsubscribeAll() {
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions = [];
  }
}
```

This state management integration provides comprehensive blog automation state tracking with persistence, event-driven updates, and clean integration with UI components.