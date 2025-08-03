/**
 * ChatMessageHistory - Detailed Message View Component
 * 
 * Provides detailed view of conversation messages with threading support,
 * search highlighting, message navigation, and integration with the chat system.
 */

class ChatMessageHistory {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = null;
    this.elements = {};
    this.isInitialized = false;
    
    // Current conversation and navigation state
    this.currentConversation = null;
    this.currentMessageIndex = 0;
    this.searchQuery = '';
    this.highlightedMatches = [];
    this.currentMatchIndex = 0;
    
    // Component options
    this.options = {
      title: options.title || 'Message History',
      icon: options.icon || '💬',
      showMessageActions: options.showMessageActions !== false,
      showTimestamps: options.showTimestamps !== false,
      showThreading: options.showThreading !== false,
      enableSearch: options.enableSearch !== false,
      messagePageSize: options.messagePageSize || 50,
      virtualScrolling: options.virtualScrolling !== false,
      showCopyButton: options.showCopyButton !== false,
      showEditButton: options.showEditButton !== false,
      showBranchButton: options.showBranchButton !== false,
      ...options
    };
    
    // Event callbacks
    this.onMessageSelect = options.onMessageSelect || (() => {});
    this.onMessageEdit = options.onMessageEdit || (() => {});
    this.onMessageBranch = options.onMessageBranch || (() => {});
    this.onConversationUpdate = options.onConversationUpdate || (() => {});
    
    // Virtual scrolling state
    this.visibleMessages = [];
    this.scrollTop = 0;
    this.itemHeight = 80; // Estimated height per message
  }

  /**
   * Initialize the message history component
   */
  async initialize() {
    console.log(`[ChatMessageHistory] Starting initialization for: ${this.containerId}`);
    
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`[ChatMessageHistory] Container with ID "${this.containerId}" not found`);
      throw new Error(`Container with ID "${this.containerId}" not found`);
    }

    try {
      this.render();
      console.log(`[ChatMessageHistory] Render completed`);
      
      this.setupEventListeners();
      console.log(`[ChatMessageHistory] Event listeners setup`);
      
      this.setupKeyboardShortcuts();
      console.log(`[ChatMessageHistory] Keyboard shortcuts setup`);
      
      this.isInitialized = true;
      console.log(`[ChatMessageHistory] Initialized successfully in container: ${this.containerId}`);
      
      // Dispatch initialization event
      this.dispatchEvent('message-history-initialized', {
        containerId: this.containerId
      });
    } catch (error) {
      console.error(`[ChatMessageHistory] Initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Render the message history component HTML
   */
  render() {
    this.container.innerHTML = `
      <div class="message-history-component">
        <!-- Message History Header -->
        <div class="message-history-header">
          <div class="header-content">
            <div class="history-icon">${this.options.icon}</div>
            <span class="history-title">${this.options.title}</span>
            <div class="conversation-info">
              <span class="conversation-title">No conversation selected</span>
              <span class="message-count">0 messages</span>
            </div>
          </div>
          <div class="header-actions">
            ${this.options.enableSearch ? `
              <button class="action-btn search-toggle-btn" title="Toggle Search">
                <span>🔍</span>
              </button>
            ` : ''}
            <button class="action-btn export-btn" title="Export Messages">
              <span>💾</span>
            </button>
            <button class="action-btn settings-btn" title="Message Settings">
              <span>⚙️</span>
            </button>
          </div>
        </div>
        
        <!-- Search Bar -->
        ${this.options.enableSearch ? `
          <div class="message-search-bar hidden">
            <div class="search-container">
              <span class="search-icon">🔍</span>
              <input 
                type="text" 
                id="${this.containerId}-search" 
                class="search-input" 
                placeholder="Search messages..."
                autocomplete="off"
              />
              <div class="search-navigation">
                <button class="nav-btn prev-match" title="Previous Match" disabled>
                  <span>↑</span>
                </button>
                <span class="match-counter">0/0</span>
                <button class="nav-btn next-match" title="Next Match" disabled>
                  <span>↓</span>
                </button>
              </div>
              <button class="clear-search-btn" title="Clear Search">
                <span>✕</span>
              </button>
            </div>
          </div>
        ` : ''}
        
        <!-- Message Timeline -->
        <div class="message-timeline-container">
          <div id="${this.containerId}-timeline" class="message-timeline">
            <!-- Messages will be dynamically added here -->
          </div>
          <div class="loading-indicator" style="display: none;">
            <div class="loading-spinner"></div>
            <span>Loading messages...</span>
          </div>
          <div class="empty-state" style="display: none;">
            <div class="empty-icon">💬</div>
            <div class="empty-title">No messages in this conversation</div>
            <div class="empty-description">Start chatting to see your message history</div>
          </div>
        </div>
        
        <!-- Message Actions Panel -->
        <div class="message-actions-panel hidden">
          <div class="actions-header">
            <span class="selected-message-info">Message Selected</span>
            <button class="close-panel-btn">✕</button>
          </div>
          <div class="actions-content">
            ${this.options.showCopyButton ? `
              <button class="action-button copy-btn">
                <span>📋</span> Copy Message
              </button>
            ` : ''}
            ${this.options.showEditButton ? `
              <button class="action-button edit-btn">
                <span>✏️</span> Edit Message
              </button>
            ` : ''}
            ${this.options.showBranchButton ? `
              <button class="action-button branch-btn">
                <span>🌿</span> Branch Conversation
              </button>
            ` : ''}
            <button class="action-button quote-btn">
              <span>💬</span> Quote Message
            </button>
            <button class="action-button delete-btn danger">
              <span>🗑️</span> Delete Message
            </button>
          </div>
        </div>
      </div>
    `;

    // Cache DOM elements
    this.elements = {
      component: this.container.querySelector('.message-history-component'),
      header: this.container.querySelector('.message-history-header'),
      conversationTitle: this.container.querySelector('.conversation-title'),
      messageCount: this.container.querySelector('.message-count'),
      searchToggleBtn: this.container.querySelector('.search-toggle-btn'),
      exportBtn: this.container.querySelector('.export-btn'),
      settingsBtn: this.container.querySelector('.settings-btn'),
      searchBar: this.container.querySelector('.message-search-bar'),
      searchInput: document.getElementById(`${this.containerId}-search`),
      searchNavigation: this.container.querySelector('.search-navigation'),
      prevMatchBtn: this.container.querySelector('.prev-match'),
      nextMatchBtn: this.container.querySelector('.next-match'),
      matchCounter: this.container.querySelector('.match-counter'),
      clearSearchBtn: this.container.querySelector('.clear-search-btn'),
      timeline: document.getElementById(`${this.containerId}-timeline`),
      loadingIndicator: this.container.querySelector('.loading-indicator'),
      emptyState: this.container.querySelector('.empty-state'),
      actionsPanel: this.container.querySelector('.message-actions-panel'),
      selectedMessageInfo: this.container.querySelector('.selected-message-info'),
      closePanelBtn: this.container.querySelector('.close-panel-btn'),
      copyBtn: this.container.querySelector('.copy-btn'),
      editBtn: this.container.querySelector('.edit-btn'),
      branchBtn: this.container.querySelector('.branch-btn'),
      quoteBtn: this.container.querySelector('.quote-btn'),
      deleteBtn: this.container.querySelector('.delete-btn')
    };

    // CSS styles are now handled by index.html - no dynamic injection needed
  }


  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Search toggle
    this.elements.searchToggleBtn?.addEventListener('click', () => {
      this.toggleSearch();
    });

    // Search functionality
    let searchTimeout;
    this.elements.searchInput?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.handleSearch(e.target.value);
      }, 300);
    });

    // Search navigation
    this.elements.prevMatchBtn?.addEventListener('click', () => {
      this.navigateSearchResults('prev');
    });

    this.elements.nextMatchBtn?.addEventListener('click', () => {
      this.navigateSearchResults('next');
    });

    // Clear search
    this.elements.clearSearchBtn?.addEventListener('click', () => {
      this.clearSearch();
    });

    // Export messages
    this.elements.exportBtn?.addEventListener('click', () => {
      this.exportMessages();
    });

    // Settings
    this.elements.settingsBtn?.addEventListener('click', () => {
      this.showSettings();
    });

    // Message actions panel
    this.elements.closePanelBtn?.addEventListener('click', () => {
      this.hideActionsPanel();
    });

    // Action buttons
    this.elements.copyBtn?.addEventListener('click', () => {
      this.copySelectedMessage();
    });

    this.elements.editBtn?.addEventListener('click', () => {
      this.editSelectedMessage();
    });

    this.elements.branchBtn?.addEventListener('click', () => {
      this.branchFromSelectedMessage();
    });

    this.elements.quoteBtn?.addEventListener('click', () => {
      this.quoteSelectedMessage();
    });

    this.elements.deleteBtn?.addEventListener('click', () => {
      this.deleteSelectedMessage();
    });

    // Timeline scrolling for pagination
    this.elements.timeline?.addEventListener('scroll', () => {
      this.handleTimelineScroll();
    });
  }

  /**
   * Set up keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    this.boundKeyHandler = (e) => this.handleKeyboard(e);
    document.addEventListener('keydown', this.boundKeyHandler);
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboard(e) {
    if (!this.isInitialized || !this.currentConversation) return;

    const isInputFocused = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

    // Global shortcuts
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      switch (e.key) {
        case 'F':
          e.preventDefault();
          this.toggleSearch();
          break;
        case 'E':
          e.preventDefault();
          this.exportMessages();
          break;
      }
    }

    // Navigation shortcuts (when not typing)
    if (!isInputFocused) {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this.navigateMessages('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.navigateMessages('down');
          break;
        case 'Enter':
          e.preventDefault();
          this.selectCurrentMessage();
          break;
        case 'Escape':
          this.clearSelection();
          this.hideActionsPanel();
          if (this.searchQuery) {
            this.clearSearch();
          }
          break;
        case 'c':
          if (this.selectedMessage) {
            this.copySelectedMessage();
          }
          break;
        case 'e':
          if (this.selectedMessage) {
            this.editSelectedMessage();
          }
          break;
        case 'd':
          if (this.selectedMessage && e.shiftKey) {
            this.deleteSelectedMessage();
          }
          break;
      }
    }

    // Search navigation
    if (this.searchQuery && this.highlightedMatches.length > 0) {
      if (e.key === 'F3' || (e.ctrlKey && e.key === 'g')) {
        e.preventDefault();
        this.navigateSearchResults(e.shiftKey ? 'prev' : 'next');
      }
    }
  }

  /**
   * Load conversation messages
   */
  async loadConversation(conversation) {
    if (!conversation) {
      this.showEmptyState();
      return;
    }

    console.log(`[ChatMessageHistory] Loading conversation: ${conversation.id}`);
    
    this.currentConversation = conversation;
    this.updateHeader();
    
    this.showLoading(true);
    
    try {
      // Get messages (could be from memory or async load)
      const messages = conversation.messages || [];
      
      this.renderMessages(messages);
      this.hideEmptyState();
      
      // Auto-scroll to bottom for new conversations
      if (messages.length > 0) {
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      }
      
    } catch (error) {
      console.error('[ChatMessageHistory] Failed to load conversation:', error);
      this.showError('Failed to load conversation messages');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Update header information
   */
  updateHeader() {
    if (!this.currentConversation) return;

    if (this.elements.conversationTitle) {
      this.elements.conversationTitle.textContent = this.currentConversation.title || 'Unnamed Conversation';
    }

    if (this.elements.messageCount) {
      const count = this.currentConversation.messages?.length || 0;
      this.elements.messageCount.textContent = `${count} message${count !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Render messages in timeline
   */
  renderMessages(messages) {
    if (!this.elements.timeline) return;

    const timelineHTML = messages.map((message, index) => 
      this.renderMessageItem(message, index)
    ).join('');
    
    this.elements.timeline.innerHTML = timelineHTML;
    
    // Set up message event listeners
    this.setupMessageListeners();
    
    // Apply search highlighting if active
    if (this.searchQuery) {
      this.highlightSearchResults();
    }
  }

  /**
   * Render a single message item
   */
  renderMessageItem(message, index) {
    const role = message.role || 'user';
    const timestamp = message.timestamp ? new Date(message.timestamp) : new Date();
    const timeStr = this.formatTimestamp(timestamp);
    const avatar = role === 'user' ? '👤' : '🤖';
    const content = message.content || '';
    
    return `
      <div class="message-item ${role}" data-message-index="${index}" data-message-id="${message.id || index}">
        <div class="message-avatar ${role}">
          ${avatar}
        </div>
        <div class="message-content-wrapper">
          ${this.options.showTimestamps ? `
            <div class="message-header">
              <span class="message-role">${role}</span>
              <span class="message-timestamp" title="${timestamp.toLocaleString()}">${timeStr}</span>
            </div>
          ` : ''}
          <div class="message-content">
            ${this.escapeHtml(content)}
          </div>
          ${this.options.showMessageActions ? `
            <div class="message-actions">
              <button class="message-action-btn copy-message" title="Copy Message">
                📋
              </button>
              <button class="message-action-btn quote-message" title="Quote Message">
                💬
              </button>
              ${this.options.showEditButton ? `
                <button class="message-action-btn edit-message" title="Edit Message">
                  ✏️
                </button>
              ` : ''}
              ${this.options.showBranchButton ? `
                <button class="message-action-btn branch-message" title="Branch Conversation">
                  🌿
                </button>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Set up message-specific event listeners
   */
  setupMessageListeners() {
    const messageItems = this.elements.timeline.querySelectorAll('.message-item');
    
    messageItems.forEach(item => {
      const messageIndex = parseInt(item.dataset.messageIndex);
      const message = this.currentConversation.messages[messageIndex];
      
      // Click to select message
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.message-actions')) {
          this.selectMessage(messageIndex);
        }
      });
      
      // Message action buttons
      const copyBtn = item.querySelector('.copy-message');
      const quoteBtn = item.querySelector('.quote-message');
      const editBtn = item.querySelector('.edit-message');
      const branchBtn = item.querySelector('.branch-message');
      
      copyBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.copyMessage(message);
      });
      
      quoteBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.quoteMessage(message);
      });
      
      editBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.editMessage(messageIndex);
      });
      
      branchBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.branchFromMessage(messageIndex);
      });
    });
  }

  /**
   * Toggle search bar visibility
   */
  toggleSearch() {
    if (!this.elements.searchBar) return;

    const isHidden = this.elements.searchBar.classList.contains('hidden');
    
    if (isHidden) {
      this.elements.searchBar.classList.remove('hidden');
      this.elements.searchInput?.focus();
    } else {
      this.elements.searchBar.classList.add('hidden');
      this.clearSearch();
    }
  }

  /**
   * Handle search input
   */
  handleSearch(query) {
    this.searchQuery = query.trim().toLowerCase();
    
    if (this.searchQuery) {
      this.performSearch();
    } else {
      this.clearSearchHighlights();
    }
  }

  /**
   * Perform search and highlight results
   */
  performSearch() {
    this.clearSearchHighlights();
    
    if (!this.currentConversation?.messages || !this.searchQuery) {
      this.updateSearchNavigation(0, 0);
      return;
    }

    const matches = [];
    const messages = this.currentConversation.messages;
    
    messages.forEach((message, messageIndex) => {
      const content = (message.content || '').toLowerCase();
      const searchRegex = new RegExp(this.escapeRegex(this.searchQuery), 'gi');
      let match;
      
      while ((match = searchRegex.exec(content)) !== null) {
        matches.push({
          messageIndex,
          start: match.index,
          end: match.index + match[0].length,
          text: match[0]
        });
      }
    });
    
    this.highlightedMatches = matches;
    this.currentMatchIndex = 0;
    
    this.highlightSearchResults();
    this.updateSearchNavigation(matches.length > 0 ? 1 : 0, matches.length);
    
    // Navigate to first match
    if (matches.length > 0) {
      this.scrollToMatch(0);
    }
  }

  /**
   * Highlight search results in messages
   */
  highlightSearchResults() {
    if (!this.searchQuery || this.highlightedMatches.length === 0) return;

    this.highlightedMatches.forEach((match, matchIndex) => {
      const messageItem = this.elements.timeline.querySelector(`[data-message-index="${match.messageIndex}"]`);
      if (!messageItem) return;

      const contentElement = messageItem.querySelector('.message-content');
      if (!contentElement) return;

      let content = contentElement.textContent;
      const before = content.substring(0, match.start);
      const matchText = content.substring(match.start, match.end);
      const after = content.substring(match.end);
      
      const highlightClass = matchIndex === this.currentMatchIndex ? 'search-highlight current' : 'search-highlight';
      
      contentElement.innerHTML = 
        this.escapeHtml(before) + 
        `<span class="${highlightClass}">${this.escapeHtml(matchText)}</span>` + 
        this.escapeHtml(after);
    });
  }

  /**
   * Navigate search results
   */
  navigateSearchResults(direction) {
    if (this.highlightedMatches.length === 0) return;

    if (direction === 'next') {
      this.currentMatchIndex = (this.currentMatchIndex + 1) % this.highlightedMatches.length;
    } else {
      this.currentMatchIndex = this.currentMatchIndex <= 0 ? 
        this.highlightedMatches.length - 1 : 
        this.currentMatchIndex - 1;
    }

    this.highlightSearchResults();
    this.updateSearchNavigation(this.currentMatchIndex + 1, this.highlightedMatches.length);
    this.scrollToMatch(this.currentMatchIndex);
  }

  /**
   * Scroll to specific search match
   */
  scrollToMatch(matchIndex) {
    if (!this.highlightedMatches[matchIndex]) return;

    const match = this.highlightedMatches[matchIndex];
    const messageItem = this.elements.timeline.querySelector(`[data-message-index="${match.messageIndex}"]`);
    
    if (messageItem) {
      messageItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Clear search and highlights
   */
  clearSearch() {
    if (this.elements.searchInput) {
      this.elements.searchInput.value = '';
    }
    
    this.searchQuery = '';
    this.clearSearchHighlights();
    this.updateSearchNavigation(0, 0);
  }

  /**
   * Clear search highlights
   */
  clearSearchHighlights() {
    this.highlightedMatches = [];
    this.currentMatchIndex = 0;
    
    // Restore original content
    if (this.currentConversation?.messages) {
      this.renderMessages(this.currentConversation.messages);
    }
  }

  /**
   * Update search navigation UI
   */
  updateSearchNavigation(current, total) {
    if (this.elements.matchCounter) {
      this.elements.matchCounter.textContent = `${current}/${total}`;
    }
    
    const hasMatches = total > 0;
    
    if (this.elements.prevMatchBtn) {
      this.elements.prevMatchBtn.disabled = !hasMatches;
    }
    
    if (this.elements.nextMatchBtn) {
      this.elements.nextMatchBtn.disabled = !hasMatches;
    }
  }

  /**
   * Select a message
   */
  selectMessage(messageIndex) {
    // Clear previous selection
    this.clearSelection();
    
    const messageItem = this.elements.timeline.querySelector(`[data-message-index="${messageIndex}"]`);
    if (!messageItem) return;
    
    messageItem.classList.add('selected');
    this.selectedMessage = {
      index: messageIndex,
      message: this.currentConversation.messages[messageIndex],
      element: messageItem
    };
    
    // Show actions panel
    this.showActionsPanel();
    
    // Notify callback
    this.onMessageSelect(this.selectedMessage);
  }

  /**
   * Clear message selection
   */
  clearSelection() {
    const selectedItem = this.elements.timeline.querySelector('.message-item.selected');
    if (selectedItem) {
      selectedItem.classList.remove('selected');
    }
    
    this.selectedMessage = null;
    this.hideActionsPanel();
  }

  /**
   * Show actions panel
   */
  showActionsPanel() {
    if (!this.elements.actionsPanel || !this.selectedMessage) return;
    
    const message = this.selectedMessage.message;
    const messageInfo = `${message.role || 'user'} message`;
    
    if (this.elements.selectedMessageInfo) {
      this.elements.selectedMessageInfo.textContent = messageInfo;
    }
    
    this.elements.actionsPanel.classList.remove('hidden');
  }

  /**
   * Hide actions panel
   */
  hideActionsPanel() {
    if (this.elements.actionsPanel) {
      this.elements.actionsPanel.classList.add('hidden');
    }
  }

  /**
   * Copy message to clipboard
   */
  async copyMessage(message) {
    try {
      await navigator.clipboard.writeText(message.content || '');
      this.showNotification('Message copied to clipboard', 'success');
    } catch (error) {
      console.error('Failed to copy message:', error);
      this.showNotification('Failed to copy message', 'error');
    }
  }

  /**
   * Copy selected message
   */
  copySelectedMessage() {
    if (this.selectedMessage) {
      this.copyMessage(this.selectedMessage.message);
    }
  }

  /**
   * Quote message
   */
  quoteMessage(message) {
    const quotedText = `> ${message.content}\n\n`;
    this.dispatchEvent('message-quoted', { quotedText, originalMessage: message });
  }

  /**
   * Quote selected message
   */
  quoteSelectedMessage() {
    if (this.selectedMessage) {
      this.quoteMessage(this.selectedMessage.message);
    }
  }

  /**
   * Edit message
   */
  editMessage(messageIndex) {
    const message = this.currentConversation.messages[messageIndex];
    if (!message) return;

    const newContent = prompt('Edit message:', message.content);
    if (newContent !== null && newContent !== message.content) {
      message.content = newContent;
      message.edited = true;
      message.editedAt = new Date().toISOString();
      
      this.renderMessages(this.currentConversation.messages);
      this.onMessageEdit({ messageIndex, message, newContent });
      this.onConversationUpdate(this.currentConversation);
    }
  }

  /**
   * Edit selected message
   */
  editSelectedMessage() {
    if (this.selectedMessage) {
      this.editMessage(this.selectedMessage.index);
    }
  }

  /**
   * Branch from message
   */
  branchFromMessage(messageIndex) {
    const message = this.currentConversation.messages[messageIndex];
    if (!message) return;

    this.onMessageBranch({ 
      messageIndex, 
      message, 
      conversation: this.currentConversation 
    });
  }

  /**
   * Branch from selected message
   */
  branchFromSelectedMessage() {
    if (this.selectedMessage) {
      this.branchFromMessage(this.selectedMessage.index);
    }
  }

  /**
   * Delete selected message
   */
  deleteSelectedMessage() {
    if (!this.selectedMessage) return;

    if (confirm('Are you sure you want to delete this message?')) {
      const messageIndex = this.selectedMessage.index;
      this.currentConversation.messages.splice(messageIndex, 1);
      
      this.clearSelection();
      this.renderMessages(this.currentConversation.messages);
      this.updateHeader();
      this.onConversationUpdate(this.currentConversation);
    }
  }

  /**
   * Export messages
   */
  exportMessages() {
    if (!this.currentConversation?.messages) {
      this.showNotification('No messages to export', 'warning');
      return;
    }

    const exportData = {
      conversation: {
        id: this.currentConversation.id,
        title: this.currentConversation.title,
        createdAt: this.currentConversation.createdAt,
        exportedAt: new Date().toISOString()
      },
      messages: this.currentConversation.messages
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `messages_${this.currentConversation.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'conversation'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showNotification('Messages exported successfully', 'success');
  }

  /**
   * Show settings (placeholder)
   */
  showSettings() {
    this.showNotification('Settings panel coming soon', 'info');
  }

  /**
   * Navigate messages with keyboard
   */
  navigateMessages(direction) {
    const items = Array.from(this.elements.timeline.querySelectorAll('.message-item'));
    if (items.length === 0) return;

    let currentIndex = items.findIndex(item => item.classList.contains('selected'));
    
    if (direction === 'up') {
      currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
    } else {
      currentIndex = currentIndex >= items.length - 1 ? 0 : currentIndex + 1;
    }

    const messageIndex = parseInt(items[currentIndex].dataset.messageIndex);
    this.selectMessage(messageIndex);
    
    // Scroll to selected message
    items[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Select current message (for keyboard navigation)
   */
  selectCurrentMessage() {
    const selectedItem = this.elements.timeline.querySelector('.message-item.selected');
    if (selectedItem) {
      this.showActionsPanel();
    }
  }

  /**
   * Handle timeline scroll for lazy loading
   */
  handleTimelineScroll() {
    // Placeholder for lazy loading implementation
    // Could load more messages when scrolling to top
  }

  /**
   * Scroll to bottom of timeline
   */
  scrollToBottom() {
    if (this.elements.timeline) {
      this.elements.timeline.scrollTop = this.elements.timeline.scrollHeight;
    }
  }

  /**
   * Show loading indicator
   */
  showLoading(show = true) {
    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.style.display = show ? 'flex' : 'none';
    }
    if (this.elements.timeline) {
      this.elements.timeline.style.display = show ? 'none' : 'flex';
    }
  }

  /**
   * Show empty state
   */
  showEmptyState() {
    if (this.elements.emptyState) {
      this.elements.emptyState.style.display = 'flex';
    }
    if (this.elements.timeline) {
      this.elements.timeline.style.display = 'none';
    }
  }

  /**
   * Hide empty state
   */
  hideEmptyState() {
    if (this.elements.emptyState) {
      this.elements.emptyState.style.display = 'none';
    }
    if (this.elements.timeline) {
      this.elements.timeline.style.display = 'flex';
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Simple notification implementation using CSS classes
    const notification = document.createElement('div');
    notification.className = `message-notification message-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('message-notification-fadeout');
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }

  /**
   * Escape HTML for safe rendering
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Escape regex special characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Dispatch custom event
   */
  dispatchEvent(eventType, detail) {
    const event = new CustomEvent(eventType, { detail });
    window.dispatchEvent(event);
  }

  /**
   * Get component state
   */
  getState() {
    return {
      conversationId: this.currentConversation?.id || null,
      selectedMessageIndex: this.selectedMessage?.index || null,
      searchQuery: this.searchQuery,
      isSearchVisible: !this.elements.searchBar?.classList.contains('hidden'),
      scrollPosition: this.elements.timeline?.scrollTop || 0
    };
  }

  /**
   * Destroy the component
   */
  destroy() {
    // Remove event listeners
    if (this.boundKeyHandler) {
      document.removeEventListener('keydown', this.boundKeyHandler);
    }
    
    // Clear data
    this.currentConversation = null;
    this.selectedMessage = null;
    this.highlightedMatches = [];
    
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    this.isInitialized = false;
    
    // Dispatch destruction event
    this.dispatchEvent('message-history-destroyed', {
      containerId: this.containerId
    });
    
    console.log(`[ChatMessageHistory] Destroyed: ${this.containerId}`);
  }
}

// ES6 export
export default ChatMessageHistory;