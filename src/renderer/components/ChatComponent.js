/**
 * ChatComponent - Modern Messenger-Style AI Chat Interface
 * 
 * A modern, messenger-style chat component that integrates with LangChain
 * for multi-provider AI conversations with real-time cost tracking.
 */

class ChatComponent {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = null;
    this.elements = {};
    this.isInitialized = false;
    this.messageId = 0;
    
    // Component options
    this.options = {
      title: options.title || 'AI Chat',
      placeholder: options.placeholder || 'Type your message...',
      enableProviderSelection: options.enableProviderSelection !== false,
      enableCostTracking: false,
      enableStreaming: options.enableStreaming !== false,
      maxMessages: options.maxMessages || 100,
      ...options
    };
    
    // Chat state
    this.currentProvider = null;
    this.currentModel = null;
    this.providerStatus = 'disconnected';
    this.availableProviders = [];
    this.conversationHistory = [];
    this.costTracker = {
      session: { input: 0, output: 0, total: 0 },
      total: { input: 0, output: 0, total: 0 }
    };
    
    // Streaming state
    this.isStreaming = false;
    this.currentStreamingMessageElement = null;
    
    // State management integration (will be set by WorkspaceManager)
    this.globalStateManager = null;
    this.eventBus = null;
    this.currentSessionId = null;
  }

  /**
   * Initialize the chat component
   */
  async initialize() {
    console.log(`[ChatComponent] Initializing messenger-style chat: ${this.containerId}`);
    
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      throw new Error(`Container with ID "${this.containerId}" not found`);
    }

    try {
      this.render();
      this.setupEventListeners();
      await this.initializeProviders();
      this.displayWelcomeMessage();
      
      this.isInitialized = true;
      console.log(`[ChatComponent] Messenger-style chat initialized: ${this.containerId}`);
      
      return true;
    } catch (error) {
      console.error(`[ChatComponent] Initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Render the messenger-style chat interface
   */
  render() {
    this.container.innerHTML = `
      <div class="messenger-chat">
        <!-- Header -->
        <div class="chat-header">
          <div class="header-left">
            <div class="chat-avatar">
              <div class="avatar-icon">🤖</div>
            </div>
            <div class="chat-info">
              <h3 class="chat-title">${this.options.title}</h3>
              <div class="chat-status">
                <span id="${this.containerId}-status-text" class="status-text">Ready</span>
                <div id="${this.containerId}-status-dot" class="status-dot"></div>
              </div>
            </div>
          </div>
          
          <div class="header-right">
            ${this.options.enableProviderSelection ? `
            <div class="provider-controls">
              <select id="${this.containerId}-provider-select" class="provider-selector">
                <option value="">Select Provider...</option>
              </select>
              <select id="${this.containerId}-model-select" class="model-selector" disabled>
                <option value="">Select Model...</option>
              </select>
            </div>` : ''}
            
            ${this.options.enableCostTracking ? `
            <div class="cost-tracker">
              <div class="cost-session">
                <span class="cost-label">Session:</span>
                <span id="${this.containerId}-session-cost" class="cost-value">$0.00</span>
              </div>
              <div class="cost-total">
                <span class="cost-label">Total:</span>
                <span id="${this.containerId}-total-cost" class="cost-value">$0.00</span>
              </div>
              <button id="${this.containerId}-reset-costs" class="reset-costs-btn" title="Reset Session Costs">🔄</button>
            </div>` : ''}
            
            <div class="header-actions">
              <button id="${this.containerId}-settings-btn" class="action-btn" title="Settings">⚙️</button>
            </div>
          </div>
        </div>

        <!-- Messages Container -->
        <div id="${this.containerId}-messages" class="messages-container">
          <div class="messages-scroll">
            <div id="${this.containerId}-messages-list" class="messages-list">
              <!-- Messages will be added here -->
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="chat-input-area">
          <div class="input-container">
            <div class="input-wrapper">
              <textarea 
                id="${this.containerId}-input" 
                class="message-input" 
                placeholder="${this.options.placeholder}"
                rows="1"
                maxlength="10000"
              ></textarea>
              <div class="input-actions">
                <button id="${this.containerId}-send-btn" class="send-btn" disabled>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22,2 15,22 11,13 2,9"></polygon>
                  </svg>
                </button>
              </div>
            </div>
            <div class="input-footer">
              <div class="typing-indicator">
                <span id="${this.containerId}-typing" class="typing-text"></span>
              </div>
              <div class="char-counter">
                <span id="${this.containerId}-char-count" class="char-count">0/10000</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Cache element references
    this.elements = {
      statusText: document.getElementById(`${this.containerId}-status-text`),
      statusDot: document.getElementById(`${this.containerId}-status-dot`),
      providerSelect: document.getElementById(`${this.containerId}-provider-select`),
      modelSelect: document.getElementById(`${this.containerId}-model-select`),
      sessionCost: document.getElementById(`${this.containerId}-session-cost`),
      totalCost: document.getElementById(`${this.containerId}-total-cost`),
      resetCostsBtn: document.getElementById(`${this.containerId}-reset-costs`),
      messagesContainer: document.getElementById(`${this.containerId}-messages`),
      messagesList: document.getElementById(`${this.containerId}-messages-list`),
      messageInput: document.getElementById(`${this.containerId}-input`),
      sendBtn: document.getElementById(`${this.containerId}-send-btn`),
      typingIndicator: document.getElementById(`${this.containerId}-typing`),
      charCount: document.getElementById(`${this.containerId}-char-count`),
      settingsBtn: document.getElementById(`${this.containerId}-settings-btn`)
    };

    // CSS validation - check if index.html has all required styles
    this.addStyles();
  }

  /**
   * Add modern messenger-style CSS
   * NOTE: CSS injection disabled - styles are defined in index.html
   */
  addStyles() {
    // CSS styles are now defined in index.html to prevent design changes after component load
    // This method is kept for backwards compatibility but does nothing
    
    // Check if required CSS classes exist in the document
    const requiredClasses = [
      'messenger-chat', 'chat-header', 'messages-container', 'messages-scroll', 
      'messages-list', 'message', 'message-avatar', 'message-bubble', 
      'message-content', 'send-btn', 'provider-selector', 'status-dot'
    ];
    
    const missingClasses = requiredClasses.filter(className => {
      const elements = document.getElementsByClassName(className);
      const hasInCSS = Array.from(document.styleSheets).some(sheet => {
        try {
          return Array.from(sheet.cssRules || []).some(rule => 
            rule.selectorText && rule.selectorText.includes(`.${className}`)
          );
        } catch (e) {
          return false;
        }
      });
      return elements.length === 0 && !hasInCSS;
    });
    
    if (missingClasses.length > 0) {
      console.warn(`[ChatComponent] Missing CSS classes in index.html:`, missingClasses);
      console.warn(`[ChatComponent] Component may not display correctly without these styles`);
    } else {
      console.log(`[ChatComponent] All required CSS classes found in index.html`);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Provider selection
    if (this.elements.providerSelect) {
      this.elements.providerSelect.addEventListener('change', (e) => {
        this.handleProviderChange(e.target.value);
      });
    }

    // Model selection
    if (this.elements.modelSelect) {
      this.elements.modelSelect.addEventListener('change', (e) => {
        this.handleModelChange(e.target.value);
      });
    }

    // Reset costs
    if (this.elements.resetCostsBtn) {
      this.elements.resetCostsBtn.addEventListener('click', () => {
        this.resetSessionCosts();
      });
    }

    // Message input
    this.elements.messageInput.addEventListener('input', (e) => {
      this.handleInputChange(e);
    });

    this.elements.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Send button
    this.elements.sendBtn.addEventListener('click', () => {
      this.sendMessage();
    });

    // Auto-resize textarea
    this.elements.messageInput.addEventListener('input', () => {
      this.autoResizeTextarea();
    });

    // Settings button
    if (this.elements.settingsBtn) {
      this.elements.settingsBtn.addEventListener('click', () => {
        this.showSettings();
      });
    }

    // Listen for streaming chunks
    if (window.electronAPI) {
      window.electronAPI.onLangChainStreamChunk((data) => {
        this.handleStreamChunk(data.chunk);
      });
    }
  }

  /**
   * Wait for backend services to be ready
   */
  async waitForServicesReady(maxAttempts = 10, delay = 500) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Test if Claude service is ready
        if (window.electronAPI?.claude?.checkConfiguration) {
          await window.electronAPI.claude.checkConfiguration();
        }
        
        // Test if LangChain service is ready  
        if (window.electronAPI?.invoke) {
          await window.electronAPI.invoke('langchain-get-current-status');
        }
        
        // Test if Chat History service is ready
        if (window.electronAPI?.chatHistory?.getMetadata) {
          await window.electronAPI.chatHistory.getMetadata();
        }
        
        console.log(`[ChatComponent] Backend services ready after ${attempt} attempts`);
        return true;
      } catch (error) {
        console.warn(`[ChatComponent] Services not ready, attempt ${attempt}/${maxAttempts}:`, error.message);
        
        if (attempt === maxAttempts) {
          console.error(`[ChatComponent] Services failed to initialize after ${maxAttempts} attempts`);
          throw new Error('Backend services not available');
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Initialize available providers
   */
  async initializeProviders() {
    try {
      // Don't show connecting status initially
      
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Wait for backend services to be ready
      await this.waitForServicesReady();

      // Get available providers
      this.availableProviders = await window.electronAPI.invoke('langchain-get-providers');
      
      if (this.availableProviders.length === 0) {
        throw new Error('No AI providers configured');
      }

      // Populate provider dropdown
      if (this.elements.providerSelect) {
        this.elements.providerSelect.innerHTML = '<option value="">Select Provider...</option>';
        
        this.availableProviders.forEach(provider => {
          const option = document.createElement('option');
          option.value = provider.id;
          option.textContent = `${this.getProviderIcon(provider.id)} ${provider.name}`;
          if (provider.isCurrent) {
            option.selected = true;
            this.currentProvider = provider.id;
          }
          this.elements.providerSelect.appendChild(option);
        });
      }

      // Get current status
      const status = await window.electronAPI.invoke('langchain-get-current-status');
      this.updateProviderStatus(status);

      this.updateStatus('Ready', 'ready');
      
    } catch (error) {
      console.error('[ChatComponent] Provider initialization failed:', error);
      this.updateStatus(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * Handle provider change
   */
  async handleProviderChange(providerId) {
    if (!providerId) return;

    try {
      this.updateStatus('Switching provider...', 'connecting');
      
      const result = await window.electronAPI.invoke('langchain-switch-provider', { providerId });
      this.currentProvider = result.provider;
      this.currentModel = result.model;

      // Update model dropdown
      this.updateModelDropdown(providerId);
      
      // Update status
      const status = await window.electronAPI.invoke('langchain-get-current-status');
      this.updateProviderStatus(status);
      
      this.updateStatus('Connected', 'connected');
      
      // Add system message
      this.addSystemMessage(`Switched to ${result.config.name} (${result.model})`);
      
    } catch (error) {
      console.error('[ChatComponent] Provider switch failed:', error);
      this.updateStatus(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * Handle model change
   */
  async handleModelChange(modelId) {
    if (!modelId || !this.currentProvider) return;

    try {
      this.updateStatus('Updating model...', 'connecting');
      
      await window.electronAPI.invoke('langchain-update-provider-model', { 
        providerId: this.currentProvider, 
        modelId 
      });
      
      this.currentModel = modelId;
      
      // Update status
      const status = await window.electronAPI.invoke('langchain-get-current-status');
      this.updateProviderStatus(status);
      
      this.updateStatus('Connected', 'connected');
      
      // Add system message
      this.addSystemMessage(`Model updated to ${modelId}`);
      
    } catch (error) {
      console.error('[ChatComponent] Model update failed:', error);
      this.updateStatus(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * Update model dropdown based on selected provider
   */
  async updateModelDropdown(providerId) {
    if (!this.elements.modelSelect) return;

    try {
      const models = await window.electronAPI.invoke('langchain-get-provider-models', { providerId });
      
      this.elements.modelSelect.innerHTML = '<option value="">Select Model...</option>';
      this.elements.modelSelect.disabled = false;
      
      models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = `${model.name} (${model.context.toLocaleString()} tokens)`;
        if (model.id === this.currentModel) {
          option.selected = true;
        }
        this.elements.modelSelect.appendChild(option);
      });
      
    } catch (error) {
      console.error('[ChatComponent] Failed to load models:', error);
      this.elements.modelSelect.disabled = true;
    }
  }

  /**
   * Send a message
   */
  async sendMessage() {
    const message = this.elements.messageInput.value.trim();
    if (!message || this.isStreaming) return;

    if (!this.currentProvider) {
      this.showError('Please select a provider first');
      return;
    }

    try {
      // Add user message to UI
      this.addUserMessage(message);
      
      // Clear input
      this.elements.messageInput.value = '';
      this.updateCharCount();
      this.autoResizeTextarea();
      this.elements.sendBtn.disabled = true;

      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: Date.now()
      });

      // Prepare conversation history for API
      const apiHistory = this.conversationHistory.slice(-20); // Last 20 messages

      if (this.options.enableStreaming) {
        await this.sendStreamingMessage(message, apiHistory);
      } else {
        await this.sendRegularMessage(message, apiHistory);
      }

    } catch (error) {
      console.error('[ChatComponent] Send message failed:', error);
      this.showError(`Failed to send message: ${error.message}`);
    } finally {
      this.isStreaming = false;
      this.elements.sendBtn.disabled = false;
      this.elements.typingIndicator.textContent = '';
    }
  }

  /**
   * Send streaming message
   */
  async sendStreamingMessage(message, conversationHistory) {
    this.isStreaming = true;
    this.elements.typingIndicator.textContent = 'AI is typing...';
    
    // Add placeholder assistant message
    this.currentStreamingMessageElement = this.addAssistantMessage('', true);

    try {
      const result = await window.electronAPI.invoke('langchain-stream-message', {
        message,
        conversationHistory,
        systemPrompt: null
      });

      if (result.success) {
        // Update conversation history
        this.conversationHistory.push({
          role: 'assistant',
          content: result.message,
          timestamp: result.metadata.timestamp,
          provider: result.provider,
          model: result.model,
          cost: result.metadata.cost
        });

        // Update cost tracking
        this.updateCostDisplay(result.metadata);
        
        // Finalize streaming message
        this.finalizeStreamingMessage(result);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      // Remove placeholder message on error
      if (this.currentStreamingMessageElement) {
        this.currentStreamingMessageElement.remove();
      }
      throw error;
    }
  }

  /**
   * Send regular message
   */
  async sendRegularMessage(message, conversationHistory) {
    this.elements.typingIndicator.textContent = 'AI is thinking...';

    const result = await window.electronAPI.invoke('langchain-send-message', {
      message,
      conversationHistory,
      systemPrompt: null
    });

    if (result.success) {
      // Add assistant message to UI
      this.addAssistantMessage(result.message, false, result);
      
      // Update conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: result.message,
        timestamp: result.metadata.timestamp,
        provider: result.provider,
        model: result.model,
        cost: result.metadata.cost
      });

      // Update cost tracking
      this.updateCostDisplay(result.metadata);
      
    } else {
      throw new Error(result.error);
    }
  }

  /**
   * Handle streaming chunk
   */
  handleStreamChunk(chunk) {
    if (this.currentStreamingMessageElement && chunk) {
      const messageContent = this.currentStreamingMessageElement.querySelector('.message-content');
      if (messageContent) {
        messageContent.textContent += chunk;
        this.scrollToBottom();
      }
    }
  }

  /**
   * Finalize streaming message
   */
  finalizeStreamingMessage(result) {
    if (this.currentStreamingMessageElement) {
      // Remove streaming indicator
      const streamingIndicator = this.currentStreamingMessageElement.querySelector('.streaming-indicator');
      if (streamingIndicator) {
        streamingIndicator.remove();
      }

      // Add metadata
      this.addMessageMetadata(this.currentStreamingMessageElement, result);
      
      this.currentStreamingMessageElement = null;
    }
  }

  /**
   * Add user message to UI
   */
  addUserMessage(content) {
    const messageElement = this.createMessageElement('user', content, {
      timestamp: Date.now()
    });
    
    this.elements.messagesList.appendChild(messageElement);
    this.scrollToBottom();
    
    return messageElement;
  }

  /**
   * Add assistant message to UI
   */
  addAssistantMessage(content, isStreaming = false, result = null) {
    const messageElement = this.createMessageElement('assistant', content, result, isStreaming);
    
    this.elements.messagesList.appendChild(messageElement);
    this.scrollToBottom();
    
    return messageElement;
  }

  /**
   * Add system message to UI
   */
  addSystemMessage(content) {
    const messageElement = this.createMessageElement('system', content, {
      timestamp: Date.now()
    });
    
    this.elements.messagesList.appendChild(messageElement);
    this.scrollToBottom();
    
    return messageElement;
  }

  /**
   * Create message element
   */
  createMessageElement(type, content, result = null, isStreaming = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.id = `message-${++this.messageId}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = this.getMessageAvatar(type);

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = content;

    bubble.appendChild(messageContent);

    if (isStreaming) {
      const streamingIndicator = document.createElement('div');
      streamingIndicator.className = 'streaming-indicator';
      streamingIndicator.innerHTML = `
        <div class="streaming-dot"></div>
        <div class="streaming-dot"></div>
        <div class="streaming-dot"></div>
      `;
      bubble.appendChild(streamingIndicator);
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);

    // Add metadata if provided
    if (result && !isStreaming) {
      this.addMessageMetadata(messageDiv, result);
    }

    return messageDiv;
  }

  /**
   * Add message metadata
   */
  addMessageMetadata(messageElement, result) {
    const bubble = messageElement.querySelector('.message-bubble');
    const metadata = document.createElement('div');
    metadata.className = 'message-metadata';

    const time = new Date(result.metadata?.timestamp || Date.now()).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    let metadataHTML = `<span class="message-time">${time}</span>`;

    if (result.provider) {
      const providerIcon = this.getProviderIcon(result.provider);
      metadataHTML += `<span class="message-provider">${providerIcon} ${result.provider}</span>`;
    }

    if (result.metadata?.cost && this.options.enableCostTracking) {
      metadataHTML += `<span class="message-cost">$${result.metadata.cost.toFixed(4)}</span>`;
    }

    metadata.innerHTML = metadataHTML;
    bubble.appendChild(metadata);
  }

  /**
   * Get message avatar
   */
  getMessageAvatar(type) {
    switch (type) {
      case 'user': return '👤';
      case 'assistant': return '🤖';
      case 'system': return 'ℹ️';
      default: return '💬';
    }
  }

  /**
   * Get provider icon
   */
  getProviderIcon(providerId) {
    switch (providerId) {
      case 'claude': return '🤖';
      case 'openai': return '🧠';
      case 'gemini': return '💎';
      default: return '🔮';
    }
  }

  /**
   * Handle input change
   */
  handleInputChange(e) {
    const value = e.target.value;
    this.updateCharCount();
    this.elements.sendBtn.disabled = !value.trim() || this.isStreaming;
  }

  /**
   * Update character count
   */
  updateCharCount() {
    const length = this.elements.messageInput.value.length;
    const maxLength = 10000;
    
    this.elements.charCount.textContent = `${length}/${maxLength}`;
    
    this.elements.charCount.className = 'char-count';
    if (length > maxLength * 0.9) {
      this.elements.charCount.classList.add('danger');
    } else if (length > maxLength * 0.8) {
      this.elements.charCount.classList.add('warning');
    }
  }

  /**
   * Auto-resize textarea
   */
  autoResizeTextarea() {
    const textarea = this.elements.messageInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  /**
   * Update status
   */
  updateStatus(text, status) {
    if (this.elements.statusText) {
      this.elements.statusText.textContent = text;
    }
    
    if (this.elements.statusDot) {
      this.elements.statusDot.className = `status-dot ${status}`;
    }
    
    this.providerStatus = status;
  }

  /**
   * Update provider status
   */
  updateProviderStatus(status) {
    if (status.provider) {
      this.currentProvider = status.provider.id;
      this.currentModel = status.provider.currentModel;
      
      if (this.elements.providerSelect) {
        this.elements.providerSelect.value = this.currentProvider;
      }
      
      this.updateModelDropdown(this.currentProvider);
    }

    if (status.costTracker) {
      this.costTracker = status.costTracker;
      this.updateCostDisplayFromTracker();
    }
  }

  /**
   * Update cost display
   */
  updateCostDisplay(metadata) {
    if (!this.options.enableCostTracking || !metadata.cost) return;

    this.costTracker.session.total += metadata.cost;
    this.costTracker.total.total += metadata.cost;

    this.updateCostDisplayFromTracker();
  }

  /**
   * Update cost display from tracker
   */
  updateCostDisplayFromTracker() {
    if (this.elements.sessionCost) {
      this.elements.sessionCost.textContent = `$${this.costTracker.session.total.toFixed(4)}`;
    }
    
    if (this.elements.totalCost) {
      this.elements.totalCost.textContent = `$${this.costTracker.total.total.toFixed(4)}`;
    }
  }

  /**
   * Reset session costs
   */
  async resetSessionCosts() {
    try {
      await window.electronAPI.invoke('langchain-reset-session-costs');
      this.costTracker.session = { input: 0, output: 0, total: 0 };
      this.updateCostDisplayFromTracker();
      this.addSystemMessage('Session costs reset');
    } catch (error) {
      console.error('[ChatComponent] Failed to reset session costs:', error);
    }
  }

  /**
   * Scroll to bottom
   */
  scrollToBottom() {
    const scrollContainer = this.elements.messagesContainer.querySelector('.messages-scroll');
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }

  /**
   * Display welcome message
   */
  displayWelcomeMessage() {
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'welcome-message';
    welcomeDiv.innerHTML = `
      <h3>Welcome to AI Chat</h3>
      <p>Select a provider and start chatting with AI assistants. Your conversations are powered by multiple AI providers for the best experience.</p>
    `;
    
    this.elements.messagesList.appendChild(welcomeDiv);
  }

  /**
   * Show error message
   */
  showError(message) {
    this.addSystemMessage(`Error: ${message}`);
  }

  /**
   * Show settings
   */
  showSettings() {
    // TODO: Implement settings panel
    this.addSystemMessage('Settings panel coming soon...');
  }

  /**
   * Get component state for persistence
   */
  getState() {
    return {
      currentProvider: this.currentProvider,
      currentModel: this.currentModel,
      currentSessionId: this.currentSessionId,
      conversationHistory: this.conversationHistory,
      costTracker: this.costTracker,
      providerStatus: this.providerStatus,
      isInitialized: this.isInitialized,
      messageId: this.messageId
    };
  }

  /**
   * Set component state for restoration
   */
  async setState(state) {
    try {
      console.log(`[ChatComponent] Restoring state for: ${this.containerId}`);
      
      if (state.currentProvider !== undefined) {
        this.currentProvider = state.currentProvider;
        if (this.elements.providerSelect) {
          this.elements.providerSelect.value = state.currentProvider;
        }
      }
      
      if (state.currentModel !== undefined) {
        this.currentModel = state.currentModel;
        if (this.elements.modelSelect) {
          this.elements.modelSelect.value = state.currentModel;
        }
      }
      
      if (state.currentSessionId !== undefined) {
        this.currentSessionId = state.currentSessionId;
      }
      
      if (state.conversationHistory && Array.isArray(state.conversationHistory)) {
        this.conversationHistory = state.conversationHistory;
        
        // Re-render conversation history
        this.clearMessages();
        for (const message of this.conversationHistory) {
          if (message.role === 'user') {
            this.addUserMessage(message.content);
          } else if (message.role === 'assistant') {
            this.addAssistantMessage(message.content, false, {
              provider: message.provider,
              model: message.model,
              metadata: {
                timestamp: message.timestamp,
                cost: message.cost
              }
            });
          } else if (message.role === 'system') {
            this.addSystemMessage(message.content);
          }
        }
      }
      
      if (state.costTracker) {
        this.costTracker = state.costTracker;
        this.updateCostDisplayFromTracker();
      }
      
      if (state.providerStatus !== undefined) {
        this.providerStatus = state.providerStatus;
        this.updateStatus('Restored from previous session', state.providerStatus);
      }
      
      if (state.messageId !== undefined) {
        this.messageId = state.messageId;
      }
      
      // Sync with GlobalStateManager if available
      if (this.globalStateManager && this.currentSessionId) {
        await this.globalStateManager.saveCurrentChatSession('blog', {
          sessionId: this.currentSessionId,
          conversationHistory: this.conversationHistory,
          provider: this.currentProvider,
          model: this.currentModel,
          costTracker: this.costTracker
        });
      }
      
      console.log(`[ChatComponent] State restored successfully`);
      
      // Emit state restored event
      if (this.eventBus) {
        this.eventBus.publish('chat-component-state-restored', {
          containerId: this.containerId,
          sessionId: this.currentSessionId,
          provider: this.currentProvider,
          messagesCount: this.conversationHistory.length
        });
      }
      
    } catch (error) {
      console.error(`[ChatComponent] Failed to restore state:`, error);
    }
  }

  /**
   * Clear all messages from the UI
   */
  clearMessages() {
    if (this.elements.messagesList) {
      this.elements.messagesList.innerHTML = '';
      this.messageId = 0;
    }
  }

  /**
   * Start new session
   */
  async startNewSession() {
    try {
      this.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      this.conversationHistory = [];
      this.costTracker.session = { input: 0, output: 0, total: 0 };
      
      this.clearMessages();
      this.updateCostDisplayFromTracker();
      
      // Save to GlobalStateManager
      if (this.globalStateManager) {
        await this.globalStateManager.saveCurrentChatSession('blog', {
          sessionId: this.currentSessionId,
          conversationHistory: this.conversationHistory,
          provider: this.currentProvider,
          model: this.currentModel,
          costTracker: this.costTracker
        });
      }
      
      // Emit new session event
      if (this.eventBus) {
        this.eventBus.publish('chat-session-started', {
          sessionId: this.currentSessionId,
          provider: this.currentProvider,
          model: this.currentModel
        });
      }
      
      this.addSystemMessage('New chat session started');
      console.log(`[ChatComponent] Started new session: ${this.currentSessionId}`);
      
    } catch (error) {
      console.error(`[ChatComponent] Failed to start new session:`, error);
    }
  }

  /**
   * Load session from conversation data
   */
  async loadSession(conversation) {
    try {
      console.log(`[ChatComponent] Loading session: ${conversation.id}`);
      
      await this.setState({
        currentSessionId: conversation.id,
        conversationHistory: conversation.messages || [],
        currentProvider: conversation.provider || this.currentProvider,
        currentModel: conversation.model || this.currentModel,
        costTracker: conversation.costTracker || this.costTracker
      });
      
      this.addSystemMessage(`Loaded conversation: ${conversation.title || 'Untitled'}`);
      
    } catch (error) {
      console.error(`[ChatComponent] Failed to load session:`, error);
      this.showError(`Failed to load session: ${error.message}`);
    }
  }

  /**
   * Save current session
   */
  async saveCurrentSession() {
    if (!this.currentSessionId || !this.globalStateManager) return;
    
    try {
      const sessionData = {
        sessionId: this.currentSessionId,
        conversationHistory: this.conversationHistory,
        provider: this.currentProvider,
        model: this.currentModel,
        costTracker: this.costTracker,
        lastModified: Date.now()
      };
      
      await this.globalStateManager.saveCurrentChatSession('blog', sessionData);
      
      // Emit session saved event
      if (this.eventBus) {
        this.eventBus.publish('chat-session-saved', {
          sessionId: this.currentSessionId,
          messagesCount: this.conversationHistory.length
        });
      }
      
    } catch (error) {
      console.error(`[ChatComponent] Failed to save session:`, error);
    }
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    // No dynamic styles to remove since CSS is defined in index.html
    
    this.isInitialized = false;
    console.log(`[ChatComponent] Destroyed: ${this.containerId}`);
  }
}

// Export for use in other modules
export default ChatComponent;