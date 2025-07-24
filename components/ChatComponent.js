/**
 * ChatComponent - Reusable AI Chat Interface Component
 * 
 * A self-contained chat component for AI interaction that can be used
 * in any workspace. Handles terminal-style chat with Claude AI integration.
 */

class ChatComponent {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = null;
    this.elements = {};
    this.isInitialized = false;
    this.commandHistory = [];
    this.historyIndex = -1;
    
    // Component options
    this.options = {
      title: options.title || 'AI Agent Terminal',
      icon: options.icon || '🤖',
      placeholder: options.placeholder || 'AI 에이전트와 대화하기...',
      prompt: options.prompt || 'AI-Agent $',
      welcomeMessages: options.welcomeMessages || this.getDefaultWelcomeMessages(),
      maxHistorySize: options.maxHistorySize || 100,
      ...options
    };
  }

  /**
   * Initialize the chat component
   */
  async initialize() {
    console.log(`[ChatComponent] Starting initialization for: ${this.containerId}`);
    
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`[ChatComponent] Container with ID "${this.containerId}" not found`);
      throw new Error(`Container with ID "${this.containerId}" not found`);
    }

    try {
      this.render();
      console.log(`[ChatComponent] Render completed`);
      
      this.setupEventListeners();
      console.log(`[ChatComponent] Event listeners setup`);
      
      this.displayWelcomeMessages();
      console.log(`[ChatComponent] Welcome messages displayed`);
      
      this.isInitialized = true;
      console.log(`[ChatComponent] Initialized successfully in container: ${this.containerId}`);
    } catch (error) {
      console.error(`[ChatComponent] Initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Render the chat component HTML
   */
  render() {
    this.container.innerHTML = `
      <div class="chat-component">
        <!-- Chat Header -->
        <div class="chat-header">
          <div class="chat-icon">${this.options.icon}</div>
          <span class="chat-title">${this.options.title}</span>
          <div class="chat-status">
            <div class="status-dot online"></div>
          </div>
        </div>
        
        <!-- Chat Output -->
        <div id="${this.containerId}-output" class="chat-output">
          <!-- Messages will be dynamically added here -->
        </div>
        
        <!-- Chat Input -->
        <div class="chat-input-container">
          <span class="chat-prompt">${this.options.prompt}</span>
          <input 
            type="text" 
            id="${this.containerId}-input" 
            class="chat-input" 
            placeholder="${this.options.placeholder}"
            autocomplete="off"
          />
        </div>
      </div>
    `;

    // Cache DOM elements
    this.elements = {
      output: document.getElementById(`${this.containerId}-output`),
      input: document.getElementById(`${this.containerId}-input`),
      header: this.container.querySelector('.chat-header'),
      statusDot: this.container.querySelector('.status-dot')
    };

    // Add component-specific styles
    this.addStyles();
  }

  /**
   * Add CSS styles for the chat component
   */
  addStyles() {
    const styleId = `chat-component-styles`;
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .chat-component {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }

      .chat-header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-weight: 600;
        font-size: 14px;
        gap: 10px;
        flex-shrink: 0;
      }

      .chat-icon {
        font-size: 16px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .chat-title {
        flex: 1;
      }

      .chat-status {
        display: flex;
        align-items: center;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-left: 8px;
      }

      .status-dot.online {
        background: #10b981;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
      }

      .status-dot.busy {
        background: #f59e0b;
        box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
      }

      .status-dot.offline {
        background: #ef4444;
        box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
      }

      .chat-output {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        font-size: 13px;
        line-height: 1.6;
        background: #fafafa;
        color: #374151;
      }

      .chat-output::-webkit-scrollbar {
        width: 6px;
      }

      .chat-output::-webkit-scrollbar-track {
        background: transparent;
      }

      .chat-output::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 3px;
      }

      .chat-output::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }

      .chat-input-container {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: #f9fafb;
        border-top: 1px solid #e5e7eb;
        gap: 8px;
      }

      .chat-prompt {
        color: #10b981;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        font-size: 13px;
        font-weight: 600;
        flex-shrink: 0;
      }

      .chat-input {
        flex: 1;
        border: none;
        background: transparent;
        color: #374151;
        font-size: 13px;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        outline: none;
        padding: 8px 0;
      }

      .chat-input::placeholder {
        color: #9ca3af;
      }

      /* Message Types */
      .message {
        margin-bottom: 8px;
        word-wrap: break-word;
      }

      .message.command {
        color: #10b981;
        font-weight: 600;
      }

      .message.output {
        color: #374151;
        margin-left: 16px;
      }

      .message.error {
        color: #ef4444;
        margin-left: 16px;
        font-weight: 500;
      }

      .message.success {
        color: #10b981;
        margin-left: 16px;
        font-weight: 500;
      }

      .message.warning {
        color: #f59e0b;
        margin-left: 16px;
        font-weight: 500;
      }

      .message.system {
        color: #6b7280;
        font-style: italic;
        margin-left: 16px;
      }

      .message.welcome {
        color: #3b82f6;
        margin-bottom: 4px;
      }

      .message.ai-response {
        color: #7c3aed;
        margin-left: 16px;
        white-space: pre-wrap;
      }

      /* Status indicators */
      .status-indicator {
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        margin-right: 8px;
        vertical-align: middle;
      }

      .status-indicator.success { background: #10b981; }
      .status-indicator.error { background: #ef4444; }
      .status-indicator.warning { background: #f59e0b; }
      .status-indicator.info { background: #3b82f6; }

      /* Animations */
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .message {
        animation: fadeInUp 0.2s ease-out;
      }

      /* Typing indicator */
      .typing-indicator {
        display: none;
        margin-left: 16px;
        color: #9ca3af;
        font-style: italic;
      }

      .typing-indicator.active {
        display: block;
      }

      .typing-dots {
        display: inline-block;
        animation: typing 1.4s infinite;
      }

      @keyframes typing {
        0%, 60%, 100% { opacity: 0; }
        30% { opacity: 1; }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Enter key to send message
    this.elements.input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateHistory(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateHistory(1);
      }
    });

    // Focus input when clicking on chat area
    this.elements.output?.addEventListener('click', () => {
      this.elements.input?.focus();
    });

    // Auto-focus input
    setTimeout(() => {
      this.elements.input?.focus();
    }, 100);
  }

  /**
   * Send a message
   */
  async sendMessage() {
    const input = this.elements.input;
    if (!input || !input.value.trim()) return;

    const message = input.value.trim();
    
    // Add to history
    this.addToHistory(message);
    
    // Display user command
    this.addMessage(`${this.options.prompt} ${message}`, 'command');
    
    // Clear input
    input.value = '';
    this.historyIndex = -1;

    // Show typing indicator
    this.showTypingIndicator();

    try {
      // Process the command
      await this.processCommand(message);
    } catch (error) {
      this.addMessage(`실행 오류: ${error.message}`, 'error');
    } finally {
      // Hide typing indicator
      this.hideTypingIndicator();
    }
  }

  /**
   * Process a command (can be overridden or extended)
   */
  async processCommand(command) {
    // Check if it's a built-in command
    if (this.handleBuiltInCommands(command)) {
      return;
    }

    // Execute via electronAPI if available
    if (window.electronAPI?.command?.execute) {
      try {
        const result = await window.electronAPI.command.execute(command);
        
        if (result.success) {
          if (result.data) {
            const lines = result.data.split('\n');
            lines.forEach(line => {
              if (line.trim()) {
                this.addMessage(line, 'output');
              }
            });
          } else {
            this.addMessage('명령이 성공적으로 실행되었습니다.', 'success');
          }
        } else {
          this.addMessage(`오류: ${result.error}`, 'error');
        }
      } catch (error) {
        this.addMessage(`실행 실패: ${error.message}`, 'error');
      }
    } else {
      // Fallback for when electronAPI is not available
      this.addMessage('AI 에이전트가 현재 사용할 수 없습니다.', 'error');
    }
  }

  /**
   * Handle built-in commands
   */
  handleBuiltInCommands(command) {
    const cmd = command.toLowerCase().trim();
    
    switch (cmd) {
      case 'clear':
      case 'cls':
        this.clearOutput();
        return true;
        
      case 'help':
        this.showHelp();
        return true;
        
      case 'history':
        this.showHistory();
        return true;
        
      default:
        return false;
    }
  }

  /**
   * Add a message to the chat output
   */
  addMessage(text, type = 'output') {
    if (!this.elements.output) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    // Add status indicator for certain types
    if (['success', 'error', 'warning', 'info'].includes(type)) {
      const indicator = document.createElement('span');
      indicator.className = `status-indicator ${type}`;
      messageDiv.appendChild(indicator);
    }
    
    messageDiv.appendChild(document.createTextNode(text));
    this.elements.output.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    this.scrollToBottom();
  }

  /**
   * Add multiple messages at once
   */
  addMessages(messages) {
    messages.forEach(({ text, type }) => {
      this.addMessage(text, type);
    });
  }

  /**
   * Show typing indicator
   */
  showTypingIndicator() {
    if (!this.elements.output) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator active';
    indicator.innerHTML = 'AI 에이전트가 생각 중<span class="typing-dots">...</span>';
    indicator.id = `${this.containerId}-typing`;
    
    this.elements.output.appendChild(indicator);
    this.scrollToBottom();
  }

  /**
   * Hide typing indicator
   */
  hideTypingIndicator() {
    const indicator = document.getElementById(`${this.containerId}-typing`);
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Clear chat output
   */
  clearOutput() {
    if (this.elements.output) {
      this.elements.output.innerHTML = '';
    }
  }

  /**
   * Show help message
   */
  showHelp() {
    const helpMessages = [
      { text: '사용 가능한 명령어:', type: 'system' },
      { text: '  • claude "질문이나 요청"  - Claude AI와 대화', type: 'output' },
      { text: '  • clear, cls           - 화면 지우기', type: 'output' },
      { text: '  • help                 - 도움말 표시', type: 'output' },
      { text: '  • history              - 명령어 기록 보기', type: 'output' },
      { text: '', type: 'output' },
      { text: '팁: 위/아래 화살표로 명령어 기록을 탐색할 수 있습니다.', type: 'system' }
    ];
    
    this.addMessages(helpMessages);
  }

  /**
   * Show command history
   */
  showHistory() {
    if (this.commandHistory.length === 0) {
      this.addMessage('명령어 기록이 없습니다.', 'system');
      return;
    }
    
    this.addMessage('최근 명령어 기록:', 'system');
    this.commandHistory.slice(-10).forEach((cmd, index) => {
      this.addMessage(`  ${index + 1}. ${cmd}`, 'output');
    });
  }

  /**
   * Navigate command history
   */
  navigateHistory(direction) {
    if (this.commandHistory.length === 0) return;
    
    if (direction === -1) { // Up arrow
      if (this.historyIndex === -1) {
        this.historyIndex = this.commandHistory.length - 1;
      } else if (this.historyIndex > 0) {
        this.historyIndex--;
      }
    } else if (direction === 1) { // Down arrow
      if (this.historyIndex < this.commandHistory.length - 1) {
        this.historyIndex++;
      } else {
        this.historyIndex = -1;
        this.elements.input.value = '';
        return;
      }
    }
    
    if (this.historyIndex >= 0 && this.historyIndex < this.commandHistory.length) {
      this.elements.input.value = this.commandHistory[this.historyIndex];
    }
  }

  /**
   * Add command to history
   */
  addToHistory(command) {
    // Avoid duplicates
    if (this.commandHistory[this.commandHistory.length - 1] !== command) {
      this.commandHistory.push(command);
      
      // Limit history size
      if (this.commandHistory.length > this.options.maxHistorySize) {
        this.commandHistory.shift();
      }
    }
  }

  /**
   * Display welcome messages
   */
  displayWelcomeMessages() {
    this.options.welcomeMessages.forEach(({ text, type }) => {
      this.addMessage(text, type);
    });
  }

  /**
   * Get default welcome messages
   */
  getDefaultWelcomeMessages() {
    return [
      { text: 'EG-Desk:태화 AI Agent 시스템 온라인', type: 'welcome' },
      { text: 'Claude AI 연동 활성화됨', type: 'success' },
      { text: 'WordPress API 연결 대기중', type: 'system' },
      { text: '', type: 'output' },
      { text: '💡 예시 명령어:', type: 'system' },
      { text: '  claude "현재 페이지 SEO 분석해줘"', type: 'output' },
      { text: '  claude "블로그 글 작성: 로고스키 코일 기술"', type: 'output' },
      { text: '  help (도움말)', type: 'output' },
      { text: '', type: 'output' }
    ];
  }

  /**
   * Scroll to bottom of chat
   */
  scrollToBottom() {
    if (this.elements.output) {
      this.elements.output.scrollTop = this.elements.output.scrollHeight;
    }
  }

  /**
   * Set status (online, busy, offline)
   */
  setStatus(status) {
    if (this.elements.statusDot) {
      this.elements.statusDot.className = `status-dot ${status}`;
    }
  }

  /**
   * Focus input
   */
  focus() {
    this.elements.input?.focus();
  }

  /**
   * Get component statistics
   */
  getStats() {
    return {
      messageCount: this.elements.output?.children.length || 0,
      historySize: this.commandHistory.length,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    this.commandHistory = [];
    this.historyIndex = -1;
    this.isInitialized = false;
    
    console.log(`[ChatComponent] Destroyed: ${this.containerId}`);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatComponent;
} else {
  window.ChatComponent = ChatComponent;
}