# Blog Automation Architecture Design for eg-desk:taehwa

## Current State Analysis

### Existing Components
1. **LangChainService** (main process): Multi-provider AI integration (Claude, OpenAI, Gemini)
2. **ChatComponent** (renderer): User interaction interface with AI
3. **WPApiClient** (renderer/modules/blog-automation/wordpress): Basic WordPress REST API client
4. **Content System Modules**: 
   - ContentGenerator.js
   - TemplateManager.js  
   - SEOOptimizer.js
   - QualityChecker.js
5. **State Management**: GlobalStateManager.js with EventBus

### Requirements Analysis
1. **Chat Command Trigger**: User types blog-related commands in ChatComponent
2. **Interactive Workflow**: System guides user through blog creation process
3. **AI Content Generation**: Use LangChain providers for content creation
4. **WordPress Publishing**: Automated posting via REST API
5. **Complete Pipeline**: Requirements → Content → Review → Publish

## Proposed Architecture

### 1. Blog Automation Module Structure

```
src/renderer/modules/blog-automation/
├── BlogAutomationManager.js        # Main orchestrator
├── commands/
│   ├── BlogCommandParser.js        # Parse chat commands (/blog, /post, etc.)
│   └── BlogCommandRegistry.js      # Command definitions and routing
├── workflow/
│   ├── BlogWorkflowManager.js       # Step-by-step workflow coordination
│   ├── RequirementsCollector.js    # Interactive requirement gathering
│   ├── ContentCreationWorkflow.js  # AI-powered content generation
│   └── PublishingWorkflow.js        # WordPress publishing pipeline
├── content/
│   ├── BlogContentGenerator.js     # LangChain-based content creation
│   ├── BlogTemplateSystem.js       # Blog post templates and structures
│   └── ContentReviewManager.js     # Review and editing interface
├── wordpress/
│   └── WPApiClient.js              # (existing) Enhanced for blog automation
└── ui/
    ├── BlogWorkflowUI.js           # UI components for blog workflow
    ├── ContentEditorUI.js          # Rich content editing interface
    └── PublishingUI.js             # Publishing status and controls
```

### 2. Chat Command Integration

#### Command Structure
```javascript
// Example chat commands
/blog new                    // Start new blog post workflow
/blog draft "title"          // Create draft with title
/blog publish                // Publish current draft
/blog status                 // Show current blog status
/blog template list          // Show available templates
/blog seo optimize          // Run SEO optimization
```

#### ChatComponent Integration
```javascript
// Enhanced ChatComponent with command detection
class ChatComponent {
  // Existing chat functionality...
  
  async handleUserMessage(message) {
    // Check for blog commands
    if (this.blogCommandParser.isBlogCommand(message)) {
      return await this.blogAutomationManager.handleCommand(message);
    }
    
    // Regular chat flow
    return await this.sendToAI(message);
  }
}
```

### 3. Workflow Management System

#### Interactive Requirements Collection
```javascript
class RequirementsCollector {
  async collectBlogRequirements() {
    const requirements = {
      topic: await this.promptUser("What's the main topic?"),
      audience: await this.promptUser("Who is your target audience?"),
      tone: await this.promptUser("What tone should we use? (professional/casual/technical)"),
      length: await this.promptUser("Desired length? (short/medium/long)"),
      keywords: await this.promptUser("Any specific keywords to include?"),
      template: await this.promptUser("Choose template:", await this.getAvailableTemplates())
    };
    
    return requirements;
  }
}
```

#### AI Content Generation Pipeline
```javascript
class BlogContentGenerator {
  constructor(langChainService) {
    this.langChainService = langChainService;
  }
  
  async generateBlogPost(requirements) {
    // Step 1: Generate outline
    const outline = await this.generateOutline(requirements);
    
    // Step 2: Generate content sections
    const sections = await this.generateSections(outline, requirements);
    
    // Step 3: Optimize for SEO
    const optimizedContent = await this.seoOptimizer.optimize(sections, requirements.keywords);
    
    // Step 4: Quality check
    const qualityReport = await this.qualityChecker.analyze(optimizedContent);
    
    return {
      content: optimizedContent,
      outline,
      qualityReport,
      metadata: this.extractMetadata(requirements)
    };
  }
}
```

### 4. State Management Integration

#### Blog State Schema
```javascript
// GlobalStateManager blog state extension
const blogState = {
  currentWorkflow: null,           // Active blog workflow
  drafts: [],                      // Saved drafts
  publishingQueue: [],             // Posts queued for publishing
  templates: [],                   // Available blog templates
  workflowHistory: [],             // Previous workflows
  settings: {
    defaultTemplate: null,
    autoSave: true,
    autoPublish: false,
    wordpressConfig: {}
  }
};
```

#### Event System
```javascript
// EventBus events for blog automation
const blogEvents = {
  'blog.workflow.started': {},
  'blog.requirements.collected': {},
  'blog.content.generated': {},
  'blog.content.reviewed': {},
  'blog.post.published': {},
  'blog.workflow.completed': {},
  'blog.error.occurred': {}
};
```

### 5. WordPress Integration Enhancement

#### Enhanced WPApiClient
```javascript
class WPApiClient {
  // Existing WordPress API methods...
  
  async publishBlogPost(blogContent) {
    const postData = {
      title: blogContent.title,
      content: blogContent.content,
      status: 'publish',
      categories: blogContent.categories,
      tags: blogContent.tags,
      featured_media: blogContent.featuredImage,
      meta: blogContent.seoMeta
    };
    
    const result = await this.createPost(postData);
    
    // Emit success event
    this.eventBus.emit('blog.post.published', {
      postId: result.id,
      url: result.link,
      title: result.title
    });
    
    return result;
  }
}
```

### 6. User Experience Flow

#### Complete Blog Automation Workflow
1. **Command Trigger**: User types `/blog new` in chat
2. **Requirements Collection**: Interactive prompts collect blog requirements
3. **Template Selection**: User chooses from available templates
4. **AI Generation**: LangChain generates content based on requirements
5. **Review Phase**: User reviews and can edit generated content
6. **SEO Optimization**: Automatic or user-triggered SEO optimization
7. **Publishing**: User confirms and publishes to WordPress
8. **Confirmation**: Success notification with published URL

#### UI Integration Points
- **Chat Interface**: Command input and workflow feedback
- **Sidebar Panel**: Blog workflow progress and controls
- **Content Editor**: Rich editing interface for review and modification
- **Publishing Dashboard**: Status monitoring and queue management

### 7. Technical Implementation Strategy

#### Module Integration
1. **BlogAutomationManager** registers with **EGDeskCore**
2. **ChatComponent** integrates **BlogCommandParser**
3. **GlobalStateManager** extends with blog state schema
4. **WorkspaceManager** adds blog workflow UI components

#### Error Handling & Recovery
- Workflow state persistence for recovery
- Graceful degradation when AI services unavailable
- User-friendly error messages and retry mechanisms
- Auto-save functionality for content protection

### 8. Configuration & Settings

#### Blog Automation Settings
```javascript
const blogSettings = {
  aiProvider: 'claude',           // Default AI provider for content generation
  defaultTemplate: 'technical',   // Default blog template
  autoSEO: true,                  // Automatic SEO optimization
  autoPublish: false,             // Require manual publish confirmation
  contentBackup: true,            // Auto-backup generated content
  workflowPersistence: true,      // Save workflow progress
  wordpressIntegration: {
    siteUrl: '',
    apiCredentials: {},
    defaultCategories: [],
    defaultTags: []
  }
};
```

This architecture provides a comprehensive blog automation system that integrates seamlessly with the existing eg-desk:taehwa project structure while maintaining the electron-vite ES6 module architecture and providing a smooth user experience through chat command interface.