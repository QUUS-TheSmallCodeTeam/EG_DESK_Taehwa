/**
 * ChatComponent - Modern Messenger-Style AI Chat Interface
 * 
 * A modern, messenger-style chat component that integrates with LangChain
 * for multi-provider AI conversations with real-time cost tracking.
 */

// Terminal logger helper
const terminalLog = {
  log: (...args) => {
    console.log(...args);
    if (window.electronAPI && window.electronAPI.log) {
      window.electronAPI.log.info(args.join(' '));
    }
  },
  warn: (...args) => {
    console.warn(...args);
    if (window.electronAPI && window.electronAPI.log) {
      window.electronAPI.log.warn(args.join(' '));
    }
  },
  error: (...args) => {
    console.error(...args);
    if (window.electronAPI && window.electronAPI.log) {
      window.electronAPI.log.error(args.join(' '));
    }
  }
};

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
    
    // Blog automation integration
    this.blogAutomationManager = null;
    this.isInBlogWorkflow = false;
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
      this.setupBlogAutomationIPC();
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

    terminalLog.log('💬 [ChatComponent] User message:', message);
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

      // Skip all pattern checking - let AI decide what to do with tools
      // This is an AI chat app! LLM should decide whether to use blog tool or not

      // Regular AI chat message
      // Prepare conversation history for API
      const apiHistory = this.conversationHistory.slice(-20); // Last 20 messages
      
      terminalLog.log('🤖 [ChatComponent] Sending to AI:', {
        mode: this.options.enableStreaming ? 'streaming' : 'regular',
        provider: this.currentProvider,
        model: this.currentModel
      });

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
    
    terminalLog.log('🌊 [ChatComponent] Starting streaming response...');
    
    // Add placeholder assistant message
    this.currentStreamingMessageElement = this.addAssistantMessage('', true);

    try {
      const result = await window.electronAPI.langchainStreamMessage({
        message,
        conversationHistory,
        systemPrompt: this.getBlogAutomationSystemPrompt()
      });

      if (result.success) {
        terminalLog.log('✅ [ChatComponent] AI streaming response complete:', {
          length: result.message.length,
          provider: result.provider,
          cost: result.metadata.cost
        });
        
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
        
        // Check if AI wants to initiate blog automation
        await this.checkForAIBlogAutomation(result.message);
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
    
    terminalLog.log('📤 [ChatComponent] Sending regular message to AI...');

    const result = await window.electronAPI.langchainSendMessage({
      message,
      conversationHistory,
      systemPrompt: this.getBlogAutomationSystemPrompt()
    });

    if (result.success) {
      terminalLog.log('✅ [ChatComponent] AI response received:', {
        length: result.message.length,
        provider: result.provider,
        hasToolCalls: result.metadata?.toolCalls?.length > 0
      });
      
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
      
      // Check if AI wants to initiate blog automation
      // Also check if AI mistakenly wrote blog content in chat
      if (result.message && (
        result.message.includes('제목:') || 
        result.message.includes('서론:') || 
        result.message.includes('본문:') ||
        result.message.includes('<h1>') ||
        result.message.includes('<h2>') ||
        result.message.length > 1000
      )) {
        terminalLog.warn('⚠️ AI wrote blog content in chat! Intercepting...');
        // Replace the message with a proper response
        result.message = '블로그 작성을 시작하겠습니다. 잠시만 기다려주세요.';
        
        // Extract topic from the mistaken content
        const topicMatch = result.message.match(/제목:\s*(.+?)[\n\r]/);
        const topic = topicMatch ? topicMatch[1] : '요청하신 주제';
        
        // Force blog automation
        setTimeout(async () => {
          if (this.blogAutomationManager) {
            await this.blogAutomationManager.startAutomatedBlog({
              topic: topic,
              originalInput: message
            });
          }
        }, 500);
      } else {
        await this.checkForAIBlogAutomation(result.message);
      }
      
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
    if (this.currentStreamingContent && chunk) {
      this.currentStreamingContent.textContent += chunk;
      this.scrollToBottom();
    } else {
      terminalLog.warn('[ChatComponent] handleStreamChunk called but missing:', {
        hasStreamingContent: !!this.currentStreamingContent,
        hasChunk: !!chunk,
        chunkLength: chunk?.length
      });
    }
  }

  /**
   * Finalize streaming message
   */
  finalizeStreamingMessage(result) {
    if (this.currentStreamingMessageElement) {
      // Don't overwrite the streamed content if result.message is empty
      // The content was already streamed chunk by chunk
      const messageContent = this.currentStreamingMessageElement.querySelector('.message-content');
      if (messageContent && result.message && result.message.trim() !== '') {
        // Only update if we have actual content
        messageContent.textContent = result.message;
      } else if (messageContent && !result.message) {
        // If no result.message, use the streamed content
        result.message = messageContent.textContent;
      }

      // Remove streaming indicator
      const streamingIndicator = this.currentStreamingMessageElement.querySelector('.streaming-indicator');
      if (streamingIndicator) {
        streamingIndicator.remove();
      }

      // Add metadata
      this.addMessageMetadata(this.currentStreamingMessageElement, result);
      
      this.currentStreamingMessageElement = null;
      this.currentStreamingContent = null;
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
    
    // Store reference to streaming content element
    if (isStreaming) {
      this.currentStreamingContent = messageElement.querySelector('.message-content');
    }
    
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
    
    // Support both plain text and HTML content
    if (content.includes('<') && content.includes('>')) {
      // Seems like HTML content
      messageContent.innerHTML = content;
    } else {
      // Plain text - preserve line breaks and formatting
      messageContent.textContent = content;
      // Convert line breaks to <br> for proper display
      messageContent.innerHTML = messageContent.innerHTML.replace(/\n/g, '<br>');
    }

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
   * Setup IPC listeners for blog automation from tool
   */
  setupBlogAutomationIPC() {
    // Remove any existing listeners first to prevent duplicates
    window.electronAPI.removeAllListeners('start-blog-automation-from-tool');
    
    // Listen for blog automation from tool calling
    window.electronAPI.on('start-blog-automation-from-tool', async (event, data) => {
      terminalLog.log('[ChatComponent] Received blog automation from tool:', data);
      
      if (!this.blogAutomationManager) {
        terminalLog.error('[ChatComponent] BlogAutomationManager not initialized!');
        terminalLog.log('[ChatComponent] Attempting direct WordPress publish without BlogAutomationManager');
        
        // Directly publish to WordPress without BlogAutomationManager
        try {
          await this.directPublishToWordPress(data);
          return;
        } catch (error) {
          terminalLog.error('[ChatComponent] Direct publish failed:', error);
          this.showError('블로그 게시 중 오류가 발생했습니다: ' + error.message);
          return;
        }
      }
      
      try {
        terminalLog.log('[ChatComponent] Calling startAutomatedBlog with params:', {
          topic: data.topic,
          title: data.title,
          hasContent: !!data.content,
          contentLength: data.content?.length,
          imagesCount: data.images?.length,
          fromTool: true
        });
        
        // Start automated blog with the data from tool
        const response = await this.blogAutomationManager.startAutomatedBlog({
          topic: data.topic,
          title: data.title,
          content: data.content,
          images: data.images,
          metadata: data.metadata,
          fromTool: true
        });
        
        terminalLog.log('[ChatComponent] Blog automation response:', response);
        
        if (response) {
          // Handle completion
          if (response.type === 'automated_complete') {
            this.addPublishSuccess({
              message: response.result.message || '블로그가 성공적으로 게시되었습니다!',
              result: response.result
            });
          } else if (response.type === 'error') {
            this.showError(response.message);
          }
        }
      } catch (error) {
        terminalLog.error('[ChatComponent] Blog automation from tool failed:', error);
        terminalLog.error('[ChatComponent] Error stack:', error.stack);
        this.showError('블로그 자동화 중 오류가 발생했습니다: ' + error.message);
      }
    });
    
    // Listen for progress updates from tool
    window.electronAPI.on('blog-automation-progress', (event, data) => {
      terminalLog.log('[ChatComponent] Blog automation progress:', data);
      this.addAssistantMessage(data.message, false);
    });
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
        // Don't restore conversation history on initial load to prevent auto-generated messages
        // Only set the history without rendering
        this.conversationHistory = [];
        
        // Clear any existing messages
        this.clearMessages();
        
        terminalLog.log('[ChatComponent] Skipping conversation history restoration to prevent auto-generated messages');
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
   * Set blog automation manager
   */
  setBlogAutomationManager(blogAutomationManager) {
    this.blogAutomationManager = blogAutomationManager;
    terminalLog.log('[ChatComponent] BlogAutomationManager set:', !!blogAutomationManager);
    
    // Listen for blog automation events
    if (this.blogAutomationManager) {
      this.blogAutomationManager.on('workflow_progress', (data) => {
        this.handleWorkflowProgress(data);
      });
      
      this.blogAutomationManager.on('generation_progress', (data) => {
        this.handleGenerationProgress(data);
      });
    }
  }

  /**
   * Handle blog commands
   */
  async handleBlogCommand(message) {
    if (!this.blogAutomationManager) return null;
    
    try {
      const response = await this.blogAutomationManager.handleChatMessage(message);
      
      if (!response) return null; // Not a blog command
      
      // Handle different response types
      switch (response.type) {
        case 'interactive':
          this.isInBlogWorkflow = true;
          this.addAssistantMessage(response.message, false);
          break;
          
        case 'processing':
          this.isInBlogWorkflow = true;
          this.addAssistantMessage(response.message, false);
          if (response.action) {
            // Execute async action
            setTimeout(async () => {
              try {
                const result = await response.action();
                this.handleBlogActionResult(result);
              } catch (error) {
                this.showError('처리 중 오류가 발생했습니다: ' + error.message);
              }
            }, 100);
          }
          break;
          
        case 'review':
          this.isInBlogWorkflow = true;
          this.addBlogContentReview(response);
          break;
          
        case 'confirmation':
          this.isInBlogWorkflow = true;
          this.addBlogConfirmation(response);
          break;
          
        case 'published':
          this.isInBlogWorkflow = false;
          this.addPublishSuccess(response);
          break;
          
        case 'credential_required':
          this.addCredentialPrompt(response);
          break;
          
        case 'help':
          this.addAssistantMessage(response.message, false);
          break;
          
        case 'error':
          this.showError(response.message);
          break;
          
        case 'success':
          this.addAssistantMessage(response.message, false);
          break;
          
        default:
          this.addAssistantMessage(response.message || 'Command processed', false);
      }
      
      return response;
    } catch (error) {
      terminalLog.error('[ChatComponent] Blog command error:', error);
      this.showError('블로그 명령 처리 중 오류가 발생했습니다.');
      return null;
    }
  }

  /**
   * Handle blog workflow continuation
   */
  async handleBlogWorkflowContinuation(message) {
    if (!this.blogAutomationManager) return;
    
    try {
      const response = await this.blogAutomationManager.continueWorkflow(message);
      
      // Handle response same as blog command
      if (response) {
        await this.handleBlogCommand(message);
      }
    } catch (error) {
      terminalLog.error('[ChatComponent] Workflow continuation error:', error);
      this.showError('워크플로우 진행 중 오류가 발생했습니다.');
    }
  }

  /**
   * Get blog automation system prompt
   */
  getBlogAutomationSystemPrompt() {
    if (!this.blogAutomationManager) {
      return null;
    }
    
    return `당신은 태화트랜스의 AI 블로그 어시스턴트입니다.

🚨 핵심 규칙 🚨
블로그 작성 요청을 받으면:
1. create_blog_post tool을 사용하세요 (OpenAI 모델에서만 가능)
2. 절대로 채팅창에 블로그 내용을 직접 쓰지 마세요
3. Tool이 없다면 [BLOG_AUTO_START:주제] 형식을 사용하세요

블로그 요청 예시:
- "블로그 글 써줘"
- "스마트그리드에 대한 블로그 작성해줘"
- "로고스키 코일 관련 포스트 만들어줘"
- "새로운 글 작성해줘"

올바른 응답:
✅ Tool 사용: create_blog_post 도구를 실행
✅ Tool 없을 때: "[BLOG_AUTO_START:스마트그리드] 블로그 작성을 시작합니다."

금지된 응답:
❌ "제목: 스마트그리드의 미래..."
❌ "서론: 현대 사회에서..."
❌ 블로그 본문 내용 직접 작성

일반 대화:
- 친절하고 전문적인 톤 유지
- 기술적 질문에 답변
- 한국어로 자연스럽게 대화`;
  }

  /**
   * Check if AI wants to initiate blog automation
   */
  async checkForAIBlogAutomation(aiResponse) {
    if (!this.blogAutomationManager || !aiResponse) {
      return;
    }
    
    // Check if AI response contains blog automation trigger
    const blogAutoPattern = /\[BLOG_AUTO_START\]\s*\n(.+)/;
    const match = aiResponse.match(blogAutoPattern);
    
    if (match) {
      const suggestedTopic = match[1].trim();
      terminalLog.log('[ChatComponent] AI initiated blog automation with topic:', suggestedTopic);
      
      // Remove the marker from the displayed message
      const cleanedResponse = aiResponse.replace(blogAutoPattern, '').trim();
      
      // Update the last assistant message to remove the marker
      const messages = this.elements.messagesList.querySelectorAll('.message.assistant');
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const messageContent = lastMessage.querySelector('.message-content');
        if (messageContent) {
          messageContent.textContent = cleanedResponse;
        }
      }
      
      // Start automated blog creation in background
      // No need for additional system message - BlogAutomationManager will handle all notifications
      setTimeout(async () => {
        try {
          const response = await this.blogAutomationManager.startAutomatedBlog({
            topic: suggestedTopic,
            aiInitiated: true
          });
          
          if (response) {
            // The automation manager will emit events that are already handled by event listeners
            // No need to call handleBlogActionResult for automated flow
          }
        } catch (error) {
          terminalLog.error('[ChatComponent] AI blog automation failed:', error);
          this.showError('블로그 자동화 중 오류가 발생했습니다: ' + error.message);
        }
      }, 500); // Small delay to let the UI update first
    }
  }

  /**
   * Handle blog action result
   */
  handleBlogActionResult(result) {
    switch (result.type) {
      case 'outline_generated':
        this.addBlogOutline(result);
        // Continue workflow
        setTimeout(() => {
          this.blogAutomationManager.runInteractiveWorkflow().then(response => {
            if (response) {
              this.handleBlogCommand('');
            }
          });
        }, 1000);
        break;
        
      case 'content_generated':
        this.addAssistantMessage('콘텐츠가 생성되었습니다. 검토해주세요.', false);
        break;
        
      case 'automated_complete':
        // Blog was automatically created and published
        this.addPublishSuccess({
          message: result.result.message || '블로그가 자동으로 생성되고 게시되었습니다!',
          result: result.result
        });
        this.isInBlogWorkflow = false;
        // Continue workflow
        setTimeout(() => {
          this.blogAutomationManager.runInteractiveWorkflow().then(response => {
            if (response) {
              this.handleBlogCommand('');
            }
          });
        }, 1000);
        break;
        
      default:
        if (result.message) {
          this.addAssistantMessage(result.message, false);
        }
    }
  }

  /**
   * Add blog outline to chat
   */
  addBlogOutline(result) {
    const outline = result.outline;
    const outlineHTML = `
      <div class="blog-outline">
        <h3>${outline.title}</h3>
        <p class="excerpt">${outline.excerpt}</p>
        <div class="sections">
          <h4>섹션 구성:</h4>
          <ol>
            ${outline.sections.map(section => `
              <li>
                <strong>${section.title}</strong>
                <p>${section.summary}</p>
              </li>
            `).join('')}
          </ol>
        </div>
        <div class="metadata">
          <span>대상 독자: ${outline.targetAudience}</span>
          <span>예상 읽기 시간: ${outline.estimatedReadTime}분</span>
        </div>
      </div>
    `;
    
    this.addAssistantMessage(outlineHTML, true);
  }

  /**
   * Add blog content review
   */
  addBlogContentReview(response) {
    const content = response.content;
    const reviewHTML = `
      <div class="blog-review">
        <h3>생성된 콘텐츠 검토</h3>
        <div class="content-preview">
          <h4>${content.title}</h4>
          <div class="content-body">
            ${content.html || content.plainText}
          </div>
        </div>
        <p class="review-prompt">${response.message}</p>
        <div class="review-actions">
          <button onclick="window.chatComponent.approveBlogContent()">승인하고 계속</button>
          <button onclick="window.chatComponent.requestBlogEdit()">수정 요청</button>
        </div>
      </div>
    `;
    
    this.addAssistantMessage(reviewHTML, true);
  }

  /**
   * Add blog confirmation
   */
  addBlogConfirmation(response) {
    const confirmHTML = `
      <div class="blog-confirmation">
        <h3>게시 준비 완료</h3>
        <p>${response.message}</p>
        <div class="confirmation-actions">
          <button onclick="window.chatComponent.publishBlog()">게시하기</button>
          <button onclick="window.chatComponent.saveDraft()">초안으로 저장</button>
          <button onclick="window.chatComponent.cancelPublish()">취소</button>
        </div>
      </div>
    `;
    
    this.addAssistantMessage(confirmHTML, true);
  }

  /**
   * Add publish success message
   */
  addPublishSuccess(response) {
    const successHTML = `
      <div class="publish-success">
        <h3>✅ 게시 완료!</h3>
        <p>${response.message}</p>
        <div class="publish-details">
          <p><strong>제목:</strong> ${response.result.title}</p>
          <p><strong>URL:</strong> <a href="${response.result.link}" target="_blank">${response.result.link}</a></p>
          <p><strong>상태:</strong> ${response.result.status}</p>
        </div>
      </div>
    `;
    
    this.addAssistantMessage(successHTML, true);
  }

  /**
   * Add credential prompt
   */
  addCredentialPrompt(response) {
    const promptHTML = `
      <div class="credential-prompt">
        <h3>WordPress 인증 정보 입력</h3>
        <p>${response.message}</p>
        <div class="credential-form">
          <div class="form-group">
            <label for="wp-username">사용자명:</label>
            <input type="text" id="wp-username" placeholder="WordPress 사용자명">
          </div>
          <div class="form-group">
            <label for="wp-password">비밀번호:</label>
            <input type="password" id="wp-password" placeholder="Application Password 권장">
          </div>
          <div class="form-actions">
            <button onclick="window.chatComponent.submitWordPressCredentials()">인증하기</button>
            <button onclick="window.chatComponent.cancelCredentials()">취소</button>
          </div>
        </div>
      </div>
    `;
    
    this.addAssistantMessage(promptHTML, true);
  }

  /**
   * Handle workflow progress events
   */
  handleWorkflowProgress(data) {
    // Show progress in UI
    const progressMessage = `워크플로우 진행 중: ${data.completedStep.name} 완료`;
    this.showInfo(progressMessage);
  }

  /**
   * Handle generation progress events
   */
  handleGenerationProgress(data) {
    // Update typing indicator with progress
    if (this.elements.typingIndicator) {
      this.elements.typingIndicator.textContent = data.message || 'AI가 생성 중...';
    }
  }

  /**
   * Blog action handlers (exposed for button clicks)
   */
  approveBlogContent() {
    this.elements.messageInput.value = '승인';
    this.sendMessage();
  }

  requestBlogEdit() {
    this.elements.messageInput.value = '수정이 필요합니다.';
    this.sendMessage();
  }

  publishBlog() {
    this.elements.messageInput.value = '/blog publish';
    this.sendMessage();
  }

  saveDraft() {
    this.elements.messageInput.value = '/blog publish draft=true';
    this.sendMessage();
  }

  cancelPublish() {
    this.isInBlogWorkflow = false;
    this.addAssistantMessage('게시가 취소되었습니다. 초안은 저장되어 있습니다.', false);
  }

  /**
   * Submit WordPress credentials
   */
  async submitWordPressCredentials() {
    const usernameInput = document.getElementById('wp-username');
    const passwordInput = document.getElementById('wp-password');
    
    if (!usernameInput || !passwordInput) {
      this.showError('인증 정보 입력 필드를 찾을 수 없습니다.');
      return;
    }
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!username || !password) {
      this.showError('사용자명과 비밀번호를 모두 입력해주세요.');
      return;
    }
    
    try {
      // Set credentials in blog automation manager
      const result = await this.blogAutomationManager.setWordPressCredentials(username, password);
      
      if (result.type === 'success') {
        this.addAssistantMessage(result.message, false);
        // Retry publishing
        setTimeout(() => {
          this.publishBlog();
        }, 1000);
      } else {
        this.showError(result.message);
      }
    } catch (error) {
      terminalLog.error('[ChatComponent] Credential submission error:', error);
      this.showError('인증 정보 설정 중 오류가 발생했습니다.');
    }
  }

  /**
   * Cancel credential input
   */
  cancelCredentials() {
    this.addAssistantMessage('인증이 취소되었습니다. WordPress에 게시하려면 인증 정보가 필요합니다.', false);
  }

  /**
   * Direct publish to WordPress without BlogAutomationManager
   */
  async directPublishToWordPress(data) {
    terminalLog.log('[ChatComponent] Direct publishing to WordPress...');
    
    try {
      // Get stored credentials
      const credentials = await window.electronAPI.store.get('wordpress.credentials');
      if (!credentials) {
        throw new Error('WordPress credentials not found');
      }
      
      // Process images first
      const uploadedImages = [];
      if (data.images && data.images.length > 0) {
        terminalLog.log('[ChatComponent] Processing images for upload...');
        
        for (const image of data.images) {
          try {
            // Skip placeholder images
            if (image.placeholder || !image.url || image.url.includes('[')) {
              terminalLog.log('[ChatComponent] Skipping placeholder image');
              continue;
            }
            
            // Download image
            const response = await fetch(image.url);
            const blob = await response.blob();
            
            // Convert to array buffer for IPC
            const arrayBuffer = await blob.arrayBuffer();
            const filename = `blog-image-${Date.now()}-${image.type}.jpg`;
            
            // Upload to WordPress
            const uploadResponse = await window.electronAPI.wordpress.request({
              method: 'POST',
              endpoint: '/media',
              data: {
                file: {
                  buffer: Array.from(new Uint8Array(arrayBuffer)),
                  filename: filename,
                  type: 'image/jpeg'
                }
              },
              credentials: credentials,
              isFormData: true
            });
            
            if (uploadResponse.success) {
              uploadedImages.push({
                ...image,
                mediaId: uploadResponse.data.id,
                wpUrl: uploadResponse.data.source_url
              });
              terminalLog.log('[ChatComponent] Image uploaded:', uploadResponse.data.id);
            }
          } catch (error) {
            terminalLog.error('[ChatComponent] Image upload failed:', error);
          }
        }
      }
      
      // Update content with uploaded image URLs
      let finalContent = data.content;
      if (uploadedImages.length > 0) {
        for (const img of uploadedImages) {
          if (img.type === 'featured') {
            finalContent = finalContent.replace('[FEATURED_IMAGE]', img.wpUrl);
          } else if (img.type === 'section') {
            finalContent = finalContent.replace('[SECTION_IMAGE]', img.wpUrl);
          }
        }
      }
      
      // Create post
      const postData = {
        title: data.title,
        content: finalContent,
        status: 'publish',
        format: 'standard',
        categories: [1] // Default category
      };
      
      // Set featured image if available
      const featuredImage = uploadedImages.find(img => img.type === 'featured');
      if (featuredImage) {
        postData.featured_media = featuredImage.mediaId;
      }
      
      const postResponse = await window.electronAPI.wordpress.request({
        method: 'POST',
        endpoint: '/posts',
        data: postData,
        credentials: credentials
      });
      
      if (postResponse.success) {
        const post = postResponse.data;
        terminalLog.log('[ChatComponent] Post published successfully:', post.id);
        
        this.addPublishSuccess({
          message: '블로그가 성공적으로 게시되었습니다!',
          result: {
            title: post.title.rendered,
            link: post.link,
            status: post.status
          }
        });
      } else {
        throw new Error('Failed to publish post');
      }
      
    } catch (error) {
      terminalLog.error('[ChatComponent] Direct publish error:', error);
      throw error;
    }
  }
  
  /**
   * Show info message
   */
  showInfo(message) {
    // Create temporary info element
    const infoElement = document.createElement('div');
    infoElement.className = 'chat-info-message';
    infoElement.textContent = message;
    
    this.elements.messagesContainer.appendChild(infoElement);
    this.scrollToBottom();
    
    // Remove after 3 seconds
    setTimeout(() => {
      infoElement.remove();
    }, 3000);
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    // Remove IPC listeners
    window.electronAPI.removeAllListeners('start-blog-automation-from-tool');
    
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    // No dynamic styles to remove since CSS is defined in index.html
    
    this.isInitialized = false;
  }
}

// Export for use in other modules
export default ChatComponent;