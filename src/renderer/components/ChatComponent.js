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
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      throw new Error(`Container with ID "${this.containerId}" not found`);
    }

    try {
      this.render();
      this.setupEventListeners();
      this.initializeProviders();
      this.displayWelcomeMessage();
      
      this.isInitialized = true;
      
      return true;
    } catch (error) {
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
              <h3 class="chat-title">AI 블로그 어시스턴트</h3>
              <div class="chat-status">
                <span id="${this.containerId}-status-text" class="status-text">준비됨</span>
                <div id="${this.containerId}-status-dot" class="status-dot"></div>
              </div>
            </div>
          </div>
          
          <div class="header-right">
            <!-- Provider Controls -->
            <div class="provider-controls">
              <select id="${this.containerId}-provider-select" class="provider-selector">
              </select>
              <select id="${this.containerId}-model-select" class="model-selector" disabled style="pointer-events: none; opacity: 0.8;">
                <option value="">모델 선택</option>
              </select>
            </div>
            
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
              <button id="${this.containerId}-reset-costs" class="reset-costs-btn" title="세션 비용 초기화">🔄</button>
            </div>` : ''}
            
            <div class="header-actions">
              <button id="${this.containerId}-settings-btn" class="action-btn" title="설정">⚙️</button>
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
                placeholder="메시지를 입력하세요..."
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
      'message-content', 'send-btn', 'status-dot'
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
      // Component may not display correctly without required CSS styles
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
        if (window.electronAPI?.langchainGetCurrentStatus) {
          await window.electronAPI.langchainGetCurrentStatus();
        }
        
        // Test if Chat History service is ready
        if (window.electronAPI?.chatHistory?.getMetadata) {
          await window.electronAPI.chatHistory.getMetadata();
        }
        
        return true;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error('Backend services not available');
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }





  /**
   * Send a message
   */
  async sendMessage() {
    const message = this.elements.messageInput.value.trim();
    if (!message || this.isStreaming) return;

    console.log('💬 ChatComponent: Attempting to send message...');
    console.log('📊 ChatComponent: Current state:', {
      currentProvider: this.currentProvider,
      currentModel: this.currentModel,
      messageLength: message.length
    });

    // Check if provider and model are selected
    if (!this.currentProvider || !this.currentModel) {
      console.error('❌ ChatComponent: No provider or model selected');
      this.showError('프로바이더와 모델을 먼저 선택해주세요');
      return;
    }
    
    console.log('✅ ChatComponent: Provider and model validated, proceeding with message send...');

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
      // Check if it's an API key configuration issue
      if (error.message && error.message.includes('API key not configured')) {
        this.showError(`${this.currentProvider} API 키가 설정되지 않았습니다. 설정에서 API 키를 추가해주세요.`);
      } else {
        this.showError(`메시지 전송 실패: ${error.message}`);
      }
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
    this.elements.typingIndicator.textContent = 'AI가 입력 중...';
    
    // Add placeholder assistant message
    this.currentStreamingMessageElement = this.addAssistantMessage('', true);

    try {
      const result = await window.electronAPI.langchainStreamMessage({
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
        // Check if API key is needed
        if (result.metadata?.needsApiKey) {
          // Remove placeholder message
          if (this.currentStreamingMessageElement) {
            this.currentStreamingMessageElement.remove();
          }
          this.showError(`${result.provider} API 키가 설정되지 않았습니다. 설정에서 API 키를 추가해주세요.`);
          return; // Don't throw, just show error message
        }
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
    this.elements.typingIndicator.textContent = 'AI가 생각 중...';

    const result = await window.electronAPI.langchainSendMessage({
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
      // Check if API key is needed
      if (result.metadata?.needsApiKey) {
        this.showError(`${result.provider} API 키가 설정되지 않았습니다. 설정에서 API 키를 추가해주세요.`);
        return; // Don't throw, just show error message
      }
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
      // Update final message content
      const messageContent = this.currentStreamingMessageElement.querySelector('.message-content');
      if (messageContent && result.message) {
        messageContent.textContent = result.message;
      }

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
   * Get API key environment variable name for provider
   */
  getApiKeyEnvVar(providerId) {
    switch (providerId) {
      case 'claude': return 'ANTHROPIC_API_KEY';
      case 'openai': return 'OPENAI_API_KEY';
      case 'gemini': return 'GOOGLE_API_KEY';
      default: return 'API_KEY';
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
    console.log('📊 ChatComponent: Updating provider status:', status);
    
    if (status.provider) {
      this.currentProvider = status.provider.id;
      this.currentModel = status.provider.currentModel;
      
      console.log('✅ ChatComponent: Updated provider status:', {
        currentProvider: this.currentProvider,
        currentModel: this.currentModel,
        status: status.status
      });
    }

    if (status.costTracker) {
      this.costTracker = status.costTracker;
      this.updateCostDisplayFromTracker();
      console.log('💰 ChatComponent: Updated cost tracker');
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
      await window.electronAPI.langchainResetSessionCosts();
      this.costTracker.session = { input: 0, output: 0, total: 0 };
      this.updateCostDisplayFromTracker();
      this.addSystemMessage('세션 비용이 초기화되었습니다');
    } catch (error) {
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
      <h3>AI 채팅에 오신 것을 환영합니다</h3>
      <p>AI 어시스턴트와 대화를 시작하세요. 고급 AI 기술로 최상의 경험을 제공합니다.</p>
    `;
    
    this.elements.messagesList.appendChild(welcomeDiv);
  }

  /**
   * Show error message
   */
  showError(message) {
    this.addSystemMessage(`오류: ${message}`);
  }

  /**
   * Show settings
   */
  showSettings() {
    // TODO: Implement settings panel
    this.addSystemMessage('설정 패널이 곧 제공됩니다...');
  }

  /**
   * Initialize providers
   */
  async initializeProviders() {
    try {
      console.log('🔧 ChatComponent: Starting provider initialization...');
      
      // Hardcoded providers - OpenAI first as default
      this.availableProviders = [
        { id: 'openai', name: 'ChatGPT', model: 'gpt-4o' },
        { id: 'claude', name: 'Claude', model: 'claude-3-5-sonnet-20241022' },
        { id: 'gemini', name: 'Gemini', model: 'gemini-2.5-flash' }
      ];
      
      console.log('📝 ChatComponent: Available providers:', this.availableProviders);
      
      // Populate provider dropdown without placeholder option
      this.elements.providerSelect.innerHTML = '';
      this.availableProviders.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.id;
        option.textContent = provider.name;
        this.elements.providerSelect.appendChild(option);
        console.log(`📝 ChatComponent: Added provider option: ${provider.name} (${provider.id})`);
      });

      // Set default provider to OpenAI (ChatGPT)
      this.currentProvider = 'openai';
      this.elements.providerSelect.value = this.currentProvider;
      console.log(`🎯 ChatComponent: Set default provider to: ${this.currentProvider}`);
      
      console.log('🔄 ChatComponent: Calling handleProviderChange...');
      await this.handleProviderChange(this.currentProvider);
      
      console.log('✅ ChatComponent: Provider initialization complete');
      
    } catch (error) {
      console.error('❌ ChatComponent: Provider initialization failed:', error);
      this.showError(`프로바이더 초기화 실패: ${error.message}`);
      this.updateStatus('오프라인', 'disconnected');
    }
  }

  /**
   * Handle provider change
   */
  async handleProviderChange(providerId) {
    console.log(`🔄 ChatComponent: Handling provider change to: ${providerId}`);
    
    if (!providerId) {
      console.log('⚠️ ChatComponent: No provider ID provided');
      this.elements.modelSelect.disabled = true;
      this.elements.modelSelect.innerHTML = '<option value="">모델 선택</option>';
      return;
    }

    try {
      // Fixed models for each provider
      const providerModels = {
        'openai': { id: 'gpt-4o', name: 'GPT-4o' },
        'claude': { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        'gemini': { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }
      };
      
      const model = providerModels[providerId];
      if (!model) {
        console.error(`❌ ChatComponent: Unknown provider: ${providerId}`);
        throw new Error(`Unknown provider: ${providerId}`);
      }
      
      console.log(`📝 ChatComponent: Found model for ${providerId}:`, model);
      
      // Check if electronAPI is available
      if (!window.electronAPI || !window.electronAPI.langchainSwitchProvider) {
        console.error('❌ ChatComponent: electronAPI.langchainSwitchProvider not available');
        throw new Error('LangChain service not available');
      }
      
      console.log('🔄 ChatComponent: Calling LangChain switchProvider...');
      // Switch provider
      const switchResult = await window.electronAPI.langchainSwitchProvider({ 
        providerId, 
        modelId: model.id 
      });
      
      console.log('📊 ChatComponent: Switch provider result:', switchResult);
      
      if (!switchResult || !switchResult.success) {
        console.error('❌ ChatComponent: Provider switch failed:', switchResult);
        throw new Error(switchResult?.error || '프로바이더 전환 실패');
      }
      
      this.currentProvider = providerId;
      this.currentModel = model.id;
      
      console.log('✅ ChatComponent: Updated current provider and model:', {
        currentProvider: this.currentProvider,
        currentModel: this.currentModel
      });
      
      // Update model dropdown with single fixed model
      this.updateModelDropdown([model]);
      this.elements.modelSelect.value = model.id;
      
      console.log('📝 ChatComponent: Updated model dropdown');
      
      // Update status based on API key availability
      if (switchResult.status === 'no_api_key') {
        console.log('⚠️ ChatComponent: Provider has no API key configured');
        this.updateStatus('API 키 필요', 'warning');
        this.showError(`${providerId} 선택됨 - API 키를 환경변수에 설정하세요: ${this.getApiKeyEnvVar(providerId)}`);
      } else {
        console.log('✅ ChatComponent: Provider connected successfully');
        this.updateStatus('연결됨', 'connected');
      }
      
    } catch (error) {
      console.error('❌ ChatComponent: Provider change error:', error);
      this.showError(`프로바이더 변경 실패: ${error.message}`);
    }
  }

  /**
   * Handle model change
   */
  async handleModelChange(modelId) {
    if (!modelId || !this.currentProvider) return;

    try {
      const result = await window.electronAPI.langchainUpdateProviderModel({ 
        providerId: this.currentProvider,
        modelId 
      });
      this.currentModel = modelId;
    } catch (error) {
      this.showError('모델 변경 실패');
    }
  }

  /**
   * Update model dropdown
   */
  updateModelDropdown(models) {
    this.elements.modelSelect.innerHTML = '';
    this.elements.modelSelect.disabled = models.length === 0;

    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.name;
      this.elements.modelSelect.appendChild(option);
    });

    // Set first model as default
    if (models.length > 0) {
      this.elements.modelSelect.value = models[0].id;
      if (!this.currentModel) {
        this.handleModelChange(models[0].id);
      }
    }
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
      
      if (state.currentProvider !== undefined) {
        this.currentProvider = state.currentProvider;
      }
      
      if (state.currentModel !== undefined) {
        this.currentModel = state.currentModel;
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
        this.updateStatus('이전 세션에서 복원됨', state.providerStatus);
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
      
      this.addSystemMessage('새 채팅 세션이 시작되었습니다');
      
    } catch (error) {
    }
  }

  /**
   * Load session from conversation data
   */
  async loadSession(conversation) {
    try {
      
      await this.setState({
        currentSessionId: conversation.id,
        conversationHistory: conversation.messages || [],
        currentProvider: conversation.provider || this.currentProvider,
        currentModel: conversation.model || this.currentModel,
        costTracker: conversation.costTracker || this.costTracker
      });
      
      this.addSystemMessage(`대화 불러오기: ${conversation.title || '제목 없음'}`);
      
    } catch (error) {
      this.showError(`세션 불러오기 실패: ${error.message}`);
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
  }
}

// Export for use in other modules
export default ChatComponent;