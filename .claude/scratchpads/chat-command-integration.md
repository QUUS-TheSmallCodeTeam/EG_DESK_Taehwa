# Chat Command Integration Design

## ChatComponent Enhancement for Blog Commands

### 1. Command Parser Integration

#### BlogCommandParser.js
```javascript
class BlogCommandParser {
  constructor() {
    this.commandPrefix = '/blog';
    this.commands = new Map([
      ['new', { handler: 'startNewBlog', description: 'Start new blog post workflow' }],
      ['draft', { handler: 'createDraft', description: 'Create draft with title' }],
      ['publish', { handler: 'publishBlog', description: 'Publish current draft' }],
      ['status', { handler: 'showStatus', description: 'Show current blog status' }],
      ['template', { handler: 'manageTemplates', description: 'Template management' }],
      ['seo', { handler: 'optimizeSEO', description: 'SEO optimization' }],
      ['help', { handler: 'showHelp', description: 'Show blog commands help' }]
    ]);
  }

  isBlogCommand(message) {
    return message.trim().startsWith(this.commandPrefix);
  }

  parseCommand(message) {
    const parts = message.trim().substring(this.commandPrefix.length).trim().split(' ');
    const command = parts[0];
    const args = parts.slice(1);
    
    return {
      command,
      args,
      rawArgs: args.join(' '),
      isValid: this.commands.has(command)
    };
  }

  getAvailableCommands() {
    return Array.from(this.commands.entries()).map(([cmd, meta]) => ({
      command: `${this.commandPrefix} ${cmd}`,
      description: meta.description
    }));
  }
}
```

### 2. Enhanced ChatComponent

#### Modified ChatComponent.js Integration
```javascript
// Add to existing ChatComponent class

constructor() {
  // Existing constructor...
  this.blogCommandParser = new BlogCommandParser();
  this.blogAutomationManager = null; // Will be injected
}

async handleUserMessage(message) {
  // Blog command detection
  if (this.blogCommandParser.isBlogCommand(message)) {
    return await this.handleBlogCommand(message);
  }
  
  // Regular AI chat flow
  return await this.sendToAI(message);
}

async handleBlogCommand(message) {
  const parsed = this.blogCommandParser.parseCommand(message);
  
  if (!parsed.isValid) {
    return this.displayBlogCommandHelp(parsed.command);
  }
  
  try {
    const result = await this.blogAutomationManager.executeCommand(parsed);
    this.displayBlogResponse(result);
    return result;
  } catch (error) {
    this.displayBlogError(error);
    return { success: false, error: error.message };
  }
}

displayBlogResponse(result) {
  const blogMessage = {
    role: 'assistant',
    content: result.message,
    type: 'blog-automation',
    data: result.data,
    timestamp: Date.now()
  };
  
  this.addMessage(blogMessage);
  
  // Show workflow UI if needed
  if (result.showWorkflowUI) {
    this.showBlogWorkflowUI(result.workflowData);
  }
}

displayBlogCommandHelp(invalidCommand = null) {
  const commands = this.blogCommandParser.getAvailableCommands();
  let helpContent = '## Blog Automation Commands\n\n';
  
  if (invalidCommand) {
    helpContent += `❌ Unknown command: "${invalidCommand}"\n\n`;
  }
  
  commands.forEach(cmd => {
    helpContent += `**${cmd.command}** - ${cmd.description}\n`;
  });
  
  helpContent += '\n💡 Tip: Type `/blog new` to start creating a blog post!';
  
  this.addMessage({
    role: 'assistant',
    content: helpContent,
    type: 'blog-help',
    timestamp: Date.now()
  });
}
```

### 3. Blog Automation Manager

#### BlogAutomationManager.js
```javascript
class BlogAutomationManager {
  constructor(langChainService, globalStateManager, eventBus) {
    this.langChainService = langChainService;
    this.globalStateManager = globalStateManager;
    this.eventBus = eventBus;
    
    this.workflowManager = new BlogWorkflowManager();
    this.contentGenerator = new BlogContentGenerator(langChainService);
    this.wpApiClient = new WPApiClient();
    
    this.currentWorkflow = null;
  }

  async executeCommand(parsedCommand) {
    const { command, args, rawArgs } = parsedCommand;
    
    switch (command) {
      case 'new':
        return await this.startNewBlog();
      
      case 'draft':
        return await this.createDraft(rawArgs);
      
      case 'publish':
        return await this.publishBlog();
      
      case 'status':
        return await this.showStatus();
      
      case 'template':
        return await this.handleTemplateCommand(args);
      
      case 'seo':
        return await this.handleSEOCommand(args);
      
      case 'help':
        return await this.showHelp();
      
      default:
        throw new Error(`Unknown blog command: ${command}`);
    }
  }

  async startNewBlog() {
    // Initialize new blog workflow
    this.currentWorkflow = await this.workflowManager.createNewWorkflow();
    
    this.eventBus.emit('blog.workflow.started', {
      workflowId: this.currentWorkflow.id,
      timestamp: Date.now()
    });
    
    return {
      success: true,
      message: '🚀 Starting new blog post creation! Let me gather some information...',
      showWorkflowUI: true,
      workflowData: this.currentWorkflow,
      data: {
        nextStep: 'requirements',
        workflowId: this.currentWorkflow.id
      }
    };
  }

  async createDraft(title) {
    if (!title) {
      return {
        success: false,
        message: '❌ Please provide a title. Usage: `/blog draft "Your Blog Title"`'
      };
    }
    
    const draft = await this.workflowManager.createDraft(title);
    
    return {
      success: true,
      message: `📝 Created draft: "${title}". Use \`/blog status\` to see progress.`,
      data: { draftId: draft.id, title }
    };
  }

  async publishBlog() {
    if (!this.currentWorkflow || !this.currentWorkflow.isReadyToPublish()) {
      return {
        success: false,
        message: '❌ No blog post ready to publish. Create content first with `/blog new`.'
      };
    }
    
    const result = await this.wpApiClient.publishBlogPost(this.currentWorkflow.content);
    
    return {
      success: true,
      message: `✅ Blog post published successfully! 🎉\n📄 Title: ${result.title}\n🔗 URL: ${result.link}`,
      data: { postId: result.id, url: result.link }
    };
  }

  async showStatus() {
    const status = this.globalStateManager.getBlogState();
    
    let statusMessage = '## 📊 Blog Automation Status\n\n';
    
    if (this.currentWorkflow) {
      statusMessage += `**Current Workflow:** ${this.currentWorkflow.id}\n`;
      statusMessage += `**Step:** ${this.currentWorkflow.currentStep}\n`;
      statusMessage += `**Progress:** ${this.currentWorkflow.getProgress()}%\n\n`;
    }
    
    statusMessage += `**Drafts:** ${status.drafts.length}\n`;
    statusMessage += `**Publishing Queue:** ${status.publishingQueue.length}\n`;
    statusMessage += `**Templates Available:** ${status.templates.length}\n`;
    
    return {
      success: true,
      message: statusMessage,
      data: status
    };
  }
}
```

### 4. Workflow UI Integration

#### BlogWorkflowUI.js
```javascript
class BlogWorkflowUI {
  constructor(container) {
    this.container = container;
    this.currentStep = null;
  }

  showRequirementsForm(workflow) {
    const formHTML = `
      <div class="blog-workflow-panel">
        <h3>📝 Blog Post Requirements</h3>
        <form id="blog-requirements-form">
          <div class="form-group">
            <label>Topic/Title:</label>
            <input type="text" id="blog-topic" placeholder="What's your blog post about?" required>
          </div>
          
          <div class="form-group">
            <label>Target Audience:</label>
            <select id="blog-audience">
              <option value="general">General Audience</option>
              <option value="technical">Technical/Professional</option>
              <option value="beginners">Beginners</option>
              <option value="experts">Domain Experts</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Content Length:</label>
            <select id="blog-length">
              <option value="short">Short (300-600 words)</option>
              <option value="medium">Medium (600-1200 words)</option>
              <option value="long">Long (1200+ words)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Keywords (comma-separated):</label>
            <input type="text" id="blog-keywords" placeholder="SEO keywords, AI automation, etc.">
          </div>
          
          <div class="form-group">
            <label>Template:</label>
            <select id="blog-template">
              <option value="technical">Technical Article</option>
              <option value="tutorial">Tutorial/Guide</option>
              <option value="opinion">Opinion/Analysis</option>
              <option value="news">News/Update</option>
            </select>
          </div>
          
          <button type="submit">🚀 Generate Content</button>
        </form>
      </div>
    `;
    
    this.container.innerHTML = formHTML;
    this.attachFormHandlers(workflow);
  }

  showContentReview(content) {
    const reviewHTML = `
      <div class="blog-workflow-panel">
        <h3>📄 Content Review</h3>
        <div class="content-preview">
          <h4>${content.title}</h4>
          <div class="content-body">${content.content}</div>
        </div>
        
        <div class="review-actions">
          <button id="edit-content">✏️ Edit</button>
          <button id="regenerate-content">🔄 Regenerate</button>
          <button id="optimize-seo">⚡ Optimize SEO</button>
          <button id="publish-content">🚀 Publish</button>
        </div>
        
        <div class="quality-metrics">
          <h4>📊 Quality Metrics</h4>
          <div class="metric">Word Count: ${content.wordCount}</div>
          <div class="metric">Readability: ${content.readabilityScore}</div>
          <div class="metric">SEO Score: ${content.seoScore}/100</div>
        </div>
      </div>
    `;
    
    this.container.innerHTML = reviewHTML;
    this.attachReviewHandlers(content);
  }

  attachFormHandlers(workflow) {
    const form = document.getElementById('blog-requirements-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const requirements = {
        topic: document.getElementById('blog-topic').value,
        audience: document.getElementById('blog-audience').value,
        length: document.getElementById('blog-length').value,
        keywords: document.getElementById('blog-keywords').value.split(',').map(k => k.trim()),
        template: document.getElementById('blog-template').value
      };
      
      await workflow.setRequirements(requirements);
      this.showGeneratingStatus();
    });
  }

  showGeneratingStatus() {
    this.container.innerHTML = `
      <div class="blog-workflow-panel">
        <h3>🤖 Generating Content...</h3>
        <div class="progress-indicator">
          <div class="progress-bar"></div>
        </div>
        <p>AI is creating your blog post based on your requirements...</p>
      </div>
    `;
  }
}
```

### 5. Integration with Existing Components

#### WorkspaceManager Integration
```javascript
// Add to WorkspaceManager.js
initializeBlogAutomation() {
  this.blogAutomationManager = new BlogAutomationManager(
    this.langChainService,
    this.globalStateManager,
    this.eventBus
  );
  
  this.blogWorkflowUI = new BlogWorkflowUI(
    document.getElementById('blog-workflow-container')
  );
  
  // Inject into ChatComponent
  this.chatComponent.blogAutomationManager = this.blogAutomationManager;
}
```

This chat command integration provides a seamless user experience where blog automation commands feel natural within the existing chat interface while providing specialized UI components for complex workflows.