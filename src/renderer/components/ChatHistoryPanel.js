/**
 * ChatHistoryPanel - Chat History Navigation UI Component
 * 
 * Provides a collapsible sidebar with conversation history, search functionality,
 * and session management features integrated with the workspace layout system.
 */

class ChatHistoryPanel {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = null;
    this.elements = {};
    this.isInitialized = false;
    this.isCollapsed = false;
    this.searchQuery = '';
    
    // Chat history data
    this.conversations = [];
    this.currentSessionId = null;
    this.filteredConversations = [];
    
    // Provider integration
    this.providerMetadataEnabled = false;
    this.providerFilter = 'all';
    this.currentProvider = null;
    
    // State management integration (will be set by WorkspaceManager)
    this.globalStateManager = null;
    this.eventBus = null;
    
    // Component options
    this.options = {
      title: options.title || 'Chat History',
      icon: options.icon || '📝',
      searchPlaceholder: options.searchPlaceholder || 'Search conversations...',
      maxDisplayed: options.maxDisplayed || 50,
      showPreview: options.showPreview !== false,
      collapsible: options.collapsible !== false,
      defaultCollapsed: options.defaultCollapsed === true,
      enableProviderMetadata: options.enableProviderMetadata !== false,
      showProviderFilter: options.showProviderFilter !== false,
      showCostInfo: options.showCostInfo !== false,
      ...options
    };
    
    // Event callbacks
    this.onSessionSelect = options.onSessionSelect || (() => {});
    this.onSessionDelete = options.onSessionDelete || (() => {});
    this.onToggleCollapse = options.onToggleCollapse || (() => {});
  }

  /**
   * Initialize the chat history panel
   */
  async initialize() {
    
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      throw new Error(`Container with ID "${this.containerId}" not found`);
    }

    try {
      this.render();
      
      this.setupEventListeners();
      
      // Initialize workspace integration
      this.setupWorkspaceIntegration();
      
      // Load panel preferences first
      await this.loadPanelPreferences();
      
      // Load initial data if available
      await this.loadConversations();
      
      // Set initial collapsed state (if not overridden by preferences)
      if (this.options.defaultCollapsed && !this.preferencesLoaded) {
        this.toggleCollapse(true);
      }
      
      // Set up real-time synchronization
      this.setupRealTimeSync();
      
      this.isInitialized = true;
      
      // Notify initialization complete
      this.dispatchEvent('chat-history-panel-initialized', {
        containerId: this.containerId,
        conversationsCount: this.conversations.length,
        isCollapsed: this.isCollapsed
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Render the chat history panel HTML
   */
  render() {
    this.container.innerHTML = `
      <div class="chat-history-panel ${this.options.defaultCollapsed ? 'collapsed' : ''}">
        <!-- History Header -->
        <div class="history-header">
          <div class="header-content">
            <div class="history-icon">${this.options.icon}</div>
            <span class="history-title">${this.options.title}</span>
            <div class="history-actions">
              <button class="action-btn new-chat-btn" title="New Chat">
                <span>💬</span>
              </button>
              ${this.options.collapsible ? `
                <button class="action-btn collapse-btn" title="Toggle Panel">
                  <span class="collapse-icon">◀</span>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
        
        <!-- Search Section -->
        <div class="history-search">
          <div class="search-container">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              id="${this.containerId}-search" 
              class="search-input" 
              placeholder="${this.options.searchPlaceholder}"
              autocomplete="off"
            />
            <button class="clear-search-btn" title="Clear Search" style="display: none;">
              <span>✕</span>
            </button>
          </div>
          <div class="search-filters">
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="today">Today</button>
            <button class="filter-btn" data-filter="week">Week</button>
            ${this.options.showProviderFilter ? `
            <div class="provider-filters">
              <button class="provider-filter-btn active" data-provider="all" title="All Providers">🔗</button>
              <button class="provider-filter-btn" data-provider="claude" title="Claude">🤖</button>
              <button class="provider-filter-btn" data-provider="openai" title="OpenAI">🧠</button>
              <button class="provider-filter-btn" data-provider="gemini" title="Gemini">💎</button>
            </div>` : ''}
          </div>
        </div>
        
        <!-- Conversations List -->
        <div class="conversations-container">
          <div id="${this.containerId}-list" class="conversations-list">
            <!-- Conversations will be dynamically added here -->
          </div>
          <div class="loading-indicator" style="display: none;">
            <div class="loading-spinner"></div>
            <span>Loading conversations...</span>
          </div>
          <div class="empty-state" style="display: none;">
            <div class="empty-icon">💬</div>
            <div class="empty-title">No conversations yet</div>
            <div class="empty-description">Start a new chat to see your conversation history</div>
            <button class="empty-action-btn">Start New Chat</button>
          </div>
        </div>
        
        <!-- History Stats (collapsed view) -->
        <div class="history-stats">
          <div class="stats-item">
            <span class="stats-value">0</span>
            <span class="stats-label">Total</span>
          </div>
          <div class="stats-item">
            <span class="stats-value">0</span>
            <span class="stats-label">Today</span>
          </div>
        </div>
      </div>
    `;

    // Cache DOM elements
    this.elements = {
      panel: this.container.querySelector('.chat-history-panel'),
      header: this.container.querySelector('.history-header'),
      searchInput: document.getElementById(`${this.containerId}-search`),
      searchContainer: this.container.querySelector('.search-container'),
      clearSearchButton: this.container.querySelector('.clear-search-btn'),
      filterButtons: this.container.querySelectorAll('.filter-btn'),
      conversationsList: document.getElementById(`${this.containerId}-list`),
      loadingIndicator: this.container.querySelector('.loading-indicator'),
      emptyState: this.container.querySelector('.empty-state'),
      collapseBtn: this.container.querySelector('.collapse-btn'),
      newChatBtn: this.container.querySelector('.new-chat-btn'),
      emptyActionBtn: this.container.querySelector('.empty-action-btn'),
      statsItems: this.container.querySelectorAll('.stats-value')
    };

    // CSS styles are now handled by index.html - no dynamic injection needed
  }


  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Search functionality with debouncing
    let searchTimeout;
    this.elements.searchInput?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.handleSearch(e.target.value);
      }, 300); // Debounce search for better performance
    });

    // Clear search button
    this.elements.clearSearchButton?.addEventListener('click', () => {
      this.clearSearch();
    });

    // Filter buttons
    this.elements.filterButtons?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleFilterChange(e.target.dataset.filter);
      });
    });
    
    // Provider filter buttons
    this.elements.providerFilterButtons = this.container.querySelectorAll('.provider-filter-btn');
    this.elements.providerFilterButtons?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleProviderFilterChange(e.target.dataset.provider);
      });
    });

    // Collapse/expand button
    this.elements.collapseBtn?.addEventListener('click', () => {
      this.toggleCollapse();
    });

    // New chat button
    this.elements.newChatBtn?.addEventListener('click', () => {
      this.createNewChat();
    });

    // Empty state action button
    this.elements.emptyActionBtn?.addEventListener('click', () => {
      this.createNewChat();
    });

    // Enhanced keyboard shortcuts
    this.boundKeydownHandler = (e) => this.handleKeyboardShortcuts(e);
    document.addEventListener('keydown', this.boundKeydownHandler);
    
    // Context menu for conversations
    this.setupContextMenu();
  }

  /**
   * Load conversations from storage or API
   */
  async loadConversations() {
    this.showLoading(true);
    
    try {
      let conversations = [];
      
      // Try GlobalStateManager first (if integrated)
      if (this.globalStateManager) {
        try {
          conversations = await this.globalStateManager.loadChatHistory('blog') || [];
        } catch (error) {
        }
      }
      
      // Try state-manager fallback
      if (conversations.length === 0 && window.electronAPI?.state?.loadChatHistory) {
        const result = await window.electronAPI.state.loadChatHistory();
        if (result.success && result.data) {
          conversations = result.data;
        }
      }
      
      // Try legacy chat history API if state-manager failed
      if (conversations.length === 0 && window.electronAPI?.chatHistory) {
        const result = await window.electronAPI.chatHistory.getConversations();
        if (result.success) {
          conversations = result.data || [];
        }
      }
      
      // Fallback to localStorage
      if (conversations.length === 0) {
        const stored = localStorage.getItem('chatHistory');
        if (stored) {
          conversations = JSON.parse(stored);
        }
      }
      
      this.conversations = conversations;
      this.updateFilteredConversations();
      this.renderConversations();
      this.updateStats();
      
    } catch (error) {
      this.showError('Failed to load conversation history');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Handle search input
   */
  handleSearch(query) {
    this.searchQuery = query.trim().toLowerCase();
    
    // Show/hide clear button
    if (this.elements.clearSearchButton) {
      this.elements.clearSearchButton.style.display = query ? 'block' : 'none';
    }
    
    this.updateFilteredConversations();
    this.renderConversations();
  }

  /**
   * Clear search
   */
  clearSearch() {
    if (this.elements.searchInput) {
      this.elements.searchInput.value = '';
    }
    this.handleSearch('');
  }

  /**
   * Handle filter change
   */
  handleFilterChange(filter) {
    // Update active filter button
    this.elements.filterButtons?.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    this.currentFilter = filter;
    this.updateFilteredConversations();
    this.renderConversations();
    
    // Save preference
    this.debouncedSavePreferences();
  }

  /**
   * Update filtered conversations based on search and filters
   */
  updateFilteredConversations() {
    let filtered = [...this.conversations];
    
    // Apply search filter
    if (this.searchQuery) {
      filtered = filtered.filter(conv => 
        conv.title?.toLowerCase().includes(this.searchQuery) ||
        conv.preview?.toLowerCase().includes(this.searchQuery) ||
        conv.messages?.some(msg => 
          msg.content?.toLowerCase().includes(this.searchQuery)
        )
      );
    }
    
    // Apply provider filter
    if (this.providerFilter && this.providerFilter !== 'all') {
      filtered = filtered.filter(conv => {
        const providerInfo = this.getConversationProviderInfo(conv);
        return providerInfo.provider === this.providerFilter;
      });
    }
    
    // Apply time filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    switch (this.currentFilter) {
      case 'today':
        filtered = filtered.filter(conv => 
          new Date(conv.lastModified || conv.createdAt) >= today
        );
        break;
      case 'week':
        filtered = filtered.filter(conv => 
          new Date(conv.lastModified || conv.createdAt) >= weekAgo
        );
        break;
      default: // 'all'
        break;
    }
    
    // Sort by last modified (most recent first)
    filtered.sort((a, b) => 
      new Date(b.lastModified || b.createdAt) - new Date(a.lastModified || a.createdAt)
    );
    
    this.filteredConversations = filtered.slice(0, this.options.maxDisplayed);
  }

  /**
   * Render conversations list
   */
  renderConversations() {
    if (!this.elements.conversationsList) return;
    
    if (this.filteredConversations.length === 0) {
      this.showEmptyState();
      return;
    }
    
    this.hideEmptyState();
    
    const listHTML = this.filteredConversations.map(conv => 
      this.renderConversationItem(conv)
    ).join('');
    
    this.elements.conversationsList.innerHTML = listHTML;
    
    // Add event listeners to conversation items
    this.setupConversationListeners();
  }

  /**
   * Render a single conversation item
   */
  renderConversationItem(conversation) {
    const isActive = conversation.id === this.currentSessionId;
    const timeAgo = this.formatTimeAgo(new Date(conversation.lastModified || conversation.createdAt));
    const messageCount = conversation.messages?.length || 0;
    const preview = this.options.showPreview ? conversation.preview || 'No preview available' : '';
    
    // Provider metadata
    const providerInfo = this.getConversationProviderInfo(conversation);
    const costInfo = this.getConversationCostInfo(conversation);
    
    return `
      <div class="conversation-item ${isActive ? 'active' : ''}" data-session-id="${conversation.id}">
        <div class="conversation-header">
          <div class="conversation-title-group">
            ${providerInfo.provider && this.options.enableProviderMetadata ? `
              <span class="provider-badge ${providerInfo.provider}" title="${providerInfo.displayName}">
                ${providerInfo.icon}
              </span>
            ` : ''}
            <div class="conversation-title">${this.highlightSearch(conversation.title || 'Unnamed Conversation')}</div>
          </div>
          <div class="conversation-time">${timeAgo}</div>
        </div>
        ${this.options.showPreview ? `
          <div class="conversation-preview">${this.highlightSearch(preview)}</div>
        ` : ''}
        <div class="conversation-meta">
          <div class="conversation-stats">
            <div class="message-count">
              <span>💬</span>
              <span>${messageCount}</span>
            </div>
            ${providerInfo.model && this.options.enableProviderMetadata ? `
              <div class="model-info" title="AI Model">
                <span>🔧</span>
                <span>${providerInfo.model}</span>
              </div>
            ` : ''}
            ${costInfo.totalCost > 0 && this.options.showCostInfo ? `
              <div class="cost-info" title="Total Cost">
                <span>💰</span>
                <span>$${costInfo.totalCost.toFixed(4)}</span>
              </div>
            ` : ''}
          </div>
          <div class="conversation-actions">
            <button class="conversation-action-btn pin" title="Pin Conversation">
              <span>📌</span>
            </button>
            <button class="conversation-action-btn delete" title="Delete Conversation">
              <span>🗑️</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners for conversation items
   */
  setupConversationListeners() {
    const conversationItems = this.elements.conversationsList.querySelectorAll('.conversation-item');
    
    conversationItems.forEach(item => {
      const sessionId = item.dataset.sessionId;
      
      // Click to select conversation
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.conversation-actions')) {
          this.selectConversation(sessionId);
        }
      });
      
      // Delete button
      const deleteBtn = item.querySelector('.conversation-action-btn.delete');
      deleteBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteConversation(sessionId);
      });
      
      // Pin button
      const pinBtn = item.querySelector('.conversation-action-btn.pin');
      pinBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePinConversation(sessionId);
      });
    });
  }

  /**
   * Select a conversation
   */
  selectConversation(sessionId) {
    const conversation = this.conversations.find(conv => conv.id === sessionId);
    if (!conversation) return;
    
    this.currentSessionId = sessionId;
    this.renderConversations(); // Re-render to update active state
    
    // Notify parent component
    this.onSessionSelect(conversation);
    
  }

  /**
   * Create new chat session
   */
  createNewChat() {
    const newSession = {
      id: `session_${Date.now()}`,
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      messages: [],
      preview: ''
    };
    
    this.conversations.unshift(newSession);
    this.selectConversation(newSession.id);
    
    // Save to storage
    this.saveConversations();
    
  }

  /**
   * Delete a conversation
   */
  deleteConversation(sessionId) {
    if (confirm('Are you sure you want to delete this conversation?')) {
      this.conversations = this.conversations.filter(conv => conv.id !== sessionId);
      
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }
      
      this.updateFilteredConversations();
      this.renderConversations();
      this.updateStats();
      this.saveConversations();
      
      // Notify parent component
      this.onSessionDelete(sessionId);
      
    }
  }

  /**
   * Toggle pin status of a conversation
   */
  togglePinConversation(sessionId) {
    const conversation = this.conversations.find(conv => conv.id === sessionId);
    if (conversation) {
      conversation.pinned = !conversation.pinned;
      this.updateFilteredConversations();
      this.renderConversations();
      this.saveConversations();
      
    }
  }

  /**
   * Toggle collapse state
   */
  toggleCollapse(force = null) {
    const shouldCollapse = force !== null ? force : !this.isCollapsed;
    
    this.isCollapsed = shouldCollapse;
    this.elements.panel?.classList.toggle('collapsed', shouldCollapse);
    
    // Save preference
    this.debouncedSavePreferences();
    
    // Notify parent component about size change
    this.onToggleCollapse(shouldCollapse);
    
  }

  /**
   * Focus search input
   */
  focusSearch() {
    this.elements.searchInput?.focus();
  }

  /**
   * Show/hide loading indicator
   */
  showLoading(show = true) {
    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.style.display = show ? 'flex' : 'none';
    }
    if (this.elements.conversationsList) {
      this.elements.conversationsList.style.display = show ? 'none' : 'block';
    }
  }

  /**
   * Show/hide empty state
   */
  showEmptyState() {
    if (this.elements.emptyState) {
      this.elements.emptyState.style.display = 'flex';
    }
    if (this.elements.conversationsList) {
      this.elements.conversationsList.style.display = 'none';
    }
  }

  /**
   * Hide empty state
   */
  hideEmptyState() {
    if (this.elements.emptyState) {
      this.elements.emptyState.style.display = 'none';
    }
    if (this.elements.conversationsList) {
      this.elements.conversationsList.style.display = 'block';
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    // Could implement toast notification or inline error display
  }

  /**
   * Update statistics
   */
  updateStats() {
    if (!this.elements.statsItems) return;
    
    const total = this.conversations.length;
    const today = this.conversations.filter(conv => {
      const convDate = new Date(conv.lastModified || conv.createdAt);
      const todayDate = new Date();
      return convDate.toDateString() === todayDate.toDateString();
    }).length;
    
    const statsValues = Array.from(this.elements.statsItems);
    if (statsValues[0]) statsValues[0].textContent = total.toString();
    if (statsValues[1]) statsValues[1].textContent = today.toString();
  }

  /**
   * Highlight search terms in text
   */
  highlightSearch(text) {
    if (!this.searchQuery || !text) return text;
    
    const regex = new RegExp(`(${this.searchQuery})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
  }

  /**
   * Format time ago string
   */
  formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }

  /**
   * Save conversations to storage
   */
  async saveConversations() {
    try {
      // Try GlobalStateManager first (if integrated)
      if (this.globalStateManager) {
        try {
          await this.globalStateManager.saveChatHistory('blog', this.conversations);
          
          // Emit state change event
          if (this.eventBus) {
            this.eventBus.publish('chat-history-updated', {
              workspaceId: 'blog',
              conversations: this.conversations.length,
              source: 'ChatHistoryPanel'
            });
          }
          return;
        } catch (error) {
        }
      }
      
      // Try state-manager fallback
      if (window.electronAPI?.state?.saveChatHistory) {
        const result = await window.electronAPI.state.saveChatHistory(this.conversations);
        if (result.success) {
          return;
        }
      }
      
      // Try legacy chat history API
      if (window.electronAPI?.chatHistory) {
        await window.electronAPI.chatHistory.saveConversations(this.conversations);
        return;
      }
      
      // Fallback to localStorage
      localStorage.setItem('chatHistory', JSON.stringify(this.conversations));
      
    } catch (error) {
    }
  }

  /**
   * Add or update a conversation
   */
  updateConversation(conversation) {
    const existingIndex = this.conversations.findIndex(conv => conv.id === conversation.id);
    
    if (existingIndex >= 0) {
      this.conversations[existingIndex] = { ...conversation, lastModified: new Date().toISOString() };
    } else {
      this.conversations.unshift({ ...conversation, createdAt: new Date().toISOString(), lastModified: new Date().toISOString() });
    }
    
    this.updateFilteredConversations();
    this.renderConversations();
    this.updateStats();
    this.saveConversations();
  }

  /**
   * Get current conversation
   */
  getCurrentConversation() {
    return this.conversations.find(conv => conv.id === this.currentSessionId) || null;
  }

  /**
   * Get component state
   */
  getState() {
    return {
      isCollapsed: this.isCollapsed,
      currentSessionId: this.currentSessionId,
      searchQuery: this.searchQuery,
      currentFilter: this.currentFilter || 'all',
      providerFilter: this.providerFilter || 'all',
      conversations: this.conversations,
      conversationsCount: this.conversations.length,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Set component state for restoration
   */
  async setState(state) {
    try {
      
      if (state.conversations && Array.isArray(state.conversations)) {
        this.conversations = state.conversations;
      }
      
      if (state.currentSessionId !== undefined) {
        this.currentSessionId = state.currentSessionId;
      }
      
      if (state.searchQuery !== undefined) {
        this.searchQuery = state.searchQuery;
        if (this.elements.searchInput) {
          this.elements.searchInput.value = state.searchQuery;
        }
      }
      
      if (state.currentFilter !== undefined) {
        this.currentFilter = state.currentFilter;
        // Update filter button state
        this.elements.filterButtons?.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.filter === state.currentFilter);
        });
      }
      
      if (state.providerFilter !== undefined) {
        this.providerFilter = state.providerFilter;
        // Update provider filter button state
        this.elements.providerFilterButtons?.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.provider === state.providerFilter);
        });
      }
      
      if (state.isCollapsed !== undefined) {
        this.toggleCollapse(state.isCollapsed);
      }
      
      // Update filtered conversations and re-render
      this.updateFilteredConversations();
      this.renderConversations();
      this.updateStats();
      
      
      // Publish state restored event
      this.dispatchEvent('chat-history-panel-state-restored', {
        containerId: this.containerId,
        state: state
      });
      
    } catch (error) {
    }
  }

  /**
   * Save panel preferences
   */
  async savePanelPreferences() {
    const preferences = {
      isCollapsed: this.isCollapsed,
      currentFilter: this.currentFilter || 'all',
      searchQuery: this.searchQuery
    };
    
    try {
      if (window.electronAPI?.state?.saveHistoryPanelPreferences) {
        await window.electronAPI.state.saveHistoryPanelPreferences(preferences);
      } else {
        localStorage.setItem('historyPanelPreferences', JSON.stringify(preferences));
      }
    } catch (error) {
    }
  }

  /**
   * Load panel preferences
   */
  async loadPanelPreferences() {
    try {
      let preferences = null;
      
      if (window.electronAPI?.state?.loadHistoryPanelPreferences) {
        const result = await window.electronAPI.state.loadHistoryPanelPreferences();
        preferences = result.success ? result.data : null;
      } else {
        const stored = localStorage.getItem('historyPanelPreferences');
        preferences = stored ? JSON.parse(stored) : null;
      }
      
      if (preferences) {
        if (preferences.isCollapsed !== undefined) {
          this.toggleCollapse(preferences.isCollapsed);
        }
        if (preferences.currentFilter) {
          this.handleFilterChange(preferences.currentFilter);
        }
        if (preferences.searchQuery) {
          this.elements.searchInput.value = preferences.searchQuery;
          this.handleSearch(preferences.searchQuery);
        }
      }
    } catch (error) {
    }
  }

  /**
   * Debounced save preferences to avoid excessive saves
   */
  debouncedSavePreferences() {
    clearTimeout(this.savePreferencesTimeout);
    this.savePreferencesTimeout = setTimeout(() => {
      this.savePanelPreferences();
    }, 1000); // Save 1 second after last change
  }

  /**
   * Setup workspace integration
   */
  setupWorkspaceIntegration() {
    // Listen for workspace events
    this.workspaceEventHandlers = {
      'workspace-switched': (event) => this.handleWorkspaceSwitch(event.detail),
      'chat-message-added': (event) => this.handleChatMessageAdded(event.detail),
      'chat-session-created': (event) => this.handleChatSessionCreated(event.detail),
      'ui-theme-changed': (event) => this.handleThemeChange(event.detail)
    };

    Object.entries(this.workspaceEventHandlers).forEach(([eventType, handler]) => {
      window.addEventListener(eventType, handler);
    });

    // Subscribe to global state manager if available
    if (window.globalStateManager) {
      window.globalStateManager.subscribe('chat-history', (data) => {
        this.handleGlobalStateUpdate(data);
      });
    }
  }

  /**
   * Setup real-time synchronization
   */
  setupRealTimeSync() {
    // Set up periodic sync with storage
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncWithStorage();
      } catch (error) {
      }
    }, 10000); // Sync every 10 seconds

    // Listen for storage changes from other instances
    window.addEventListener('storage', (e) => {
      if (e.key === 'chatHistory') {
        this.handleStorageChange(e);
      }
    });
  }

  /**
   * Enhanced keyboard shortcuts handler
   */
  handleKeyboardShortcuts(e) {
    const isInputFocused = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
    
    // Global shortcuts (work even when input is focused)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      switch (e.key) {
        case 'K':
          e.preventDefault();
          this.focusSearch();
          break;
        case 'N':
          e.preventDefault();
          this.createNewChat();
          break;
        case 'H':
          e.preventDefault();
          this.toggleCollapse();
          break;
        case 'E':
          e.preventDefault();
          this.exportConversations();
          break;
      }
    }

    // Navigation shortcuts (only when input is not focused)
    if (!isInputFocused) {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this.navigateConversations('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.navigateConversations('down');
          break;
        case 'Enter':
          e.preventDefault();
          this.activateSelectedConversation();
          break;
        case 'Delete':
        case 'Backspace':
          if (e.shiftKey) {
            e.preventDefault();
            this.deleteSelectedConversation();
          }
          break;
        case 'Escape':
          this.clearSearch();
          break;
      }
    }
  }

  /**
   * Setup context menu for conversations
   */
  setupContextMenu() {
    this.elements.conversationsList?.addEventListener('contextmenu', (e) => {
      const conversationItem = e.target.closest('.conversation-item');
      if (conversationItem) {
        e.preventDefault();
        this.showContextMenu(e, conversationItem.dataset.sessionId);
      }
    });
  }

  /**
   * Show context menu for conversation
   */
  showContextMenu(event, sessionId) {
    const conversation = this.conversations.find(conv => conv.id === sessionId);
    if (!conversation) return;

    const contextMenu = document.createElement('div');
    contextMenu.className = 'conversation-context-menu';
    contextMenu.innerHTML = `
      <div class="context-menu-item" data-action="open">
        <span>📖</span> Open Conversation
      </div>
      <div class="context-menu-item" data-action="rename">
        <span>✏️</span> Rename
      </div>
      <div class="context-menu-item" data-action="duplicate">
        <span>📋</span> Duplicate
      </div>
      <div class="context-menu-item" data-action="export">
        <span>💾</span> Export
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item danger" data-action="delete">
        <span>🗑️</span> Delete
      </div>
    `;

    // Position menu
    contextMenu.style.position = 'fixed';
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.style.top = `${event.clientY}px`;
    contextMenu.style.zIndex = '10000';

    // Add to document
    document.body.appendChild(contextMenu);

    // Handle menu item clicks
    contextMenu.addEventListener('click', (e) => {
      const action = e.target.closest('.context-menu-item')?.dataset.action;
      if (action) {
        this.handleContextMenuAction(action, sessionId);
      }
      document.body.removeChild(contextMenu);
    });

    // Remove menu on outside click
    const removeMenu = (e) => {
      if (!contextMenu.contains(e.target)) {
        document.body.removeChild(contextMenu);
        document.removeEventListener('click', removeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', removeMenu), 0);
  }

  /**
   * Handle context menu actions
   */
  handleContextMenuAction(action, sessionId) {
    const conversation = this.conversations.find(conv => conv.id === sessionId);
    if (!conversation) return;

    switch (action) {
      case 'open':
        this.selectConversation(sessionId);
        break;
      case 'rename':
        this.renameConversation(sessionId);
        break;
      case 'duplicate':
        this.duplicateConversation(sessionId);
        break;
      case 'export':
        this.exportSingleConversation(sessionId);
        break;
      case 'delete':
        this.deleteConversation(sessionId);
        break;
    }
  }

  /**
   * Navigate conversations with keyboard
   */
  navigateConversations(direction) {
    const items = Array.from(this.elements.conversationsList.querySelectorAll('.conversation-item'));
    if (items.length === 0) return;

    let currentIndex = items.findIndex(item => item.classList.contains('keyboard-selected'));
    
    if (currentIndex === -1) {
      currentIndex = items.findIndex(item => item.classList.contains('active'));
    }

    if (direction === 'up') {
      currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
    } else {
      currentIndex = currentIndex >= items.length - 1 ? 0 : currentIndex + 1;
    }

    // Update selection
    items.forEach(item => item.classList.remove('keyboard-selected'));
    items[currentIndex].classList.add('keyboard-selected');
    items[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Activate selected conversation
   */
  activateSelectedConversation() {
    const selectedItem = this.elements.conversationsList.querySelector('.keyboard-selected');
    if (selectedItem) {
      this.selectConversation(selectedItem.dataset.sessionId);
    }
  }

  /**
   * Delete selected conversation
   */
  deleteSelectedConversation() {
    const selectedItem = this.elements.conversationsList.querySelector('.keyboard-selected');
    if (selectedItem) {
      this.deleteConversation(selectedItem.dataset.sessionId);
    }
  }

  /**
   * Rename conversation
   */
  renameConversation(sessionId) {
    const conversation = this.conversations.find(conv => conv.id === sessionId);
    if (!conversation) return;

    const newTitle = prompt('Enter new conversation title:', conversation.title);
    if (newTitle && newTitle.trim() && newTitle.trim() !== conversation.title) {
      conversation.title = newTitle.trim();
      conversation.lastModified = new Date().toISOString();
      
      this.updateFilteredConversations();
      this.renderConversations();
      this.saveConversations();
      
    }
  }

  /**
   * Duplicate conversation
   */
  duplicateConversation(sessionId) {
    const conversation = this.conversations.find(conv => conv.id === sessionId);
    if (!conversation) return;

    const duplicated = {
      ...conversation,
      id: `session_${Date.now()}`,
      title: `${conversation.title} (Copy)`,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    this.conversations.unshift(duplicated);
    this.updateFilteredConversations();
    this.renderConversations();
    this.updateStats();
    this.saveConversations();
    
  }

  /**
   * Export single conversation
   */
  exportSingleConversation(sessionId) {
    const conversation = this.conversations.find(conv => conv.id === sessionId);
    if (!conversation) return;

    const exportData = JSON.stringify([conversation], null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation_${conversation.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export all conversations
   */
  exportConversations() {
    if (this.conversations.length === 0) {
      alert('No conversations to export');
      return;
    }

    const exportData = JSON.stringify(this.conversations, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_history_export_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Handle workspace switch
   */
  handleWorkspaceSwitch(detail) {
    const { workspace } = detail;
    
    if (workspace === 'blog') {
      this.setWorkspaceMode('blog');
    } else {
      this.setWorkspaceMode('default');
    }
  }

  /**
   * Set workspace mode
   */
  setWorkspaceMode(mode) {
    this.workspaceMode = mode;
    
    if (this.elements.panel) {
      this.elements.panel.classList.toggle('blog-mode', mode === 'blog');
    }
    
  }

  /**
   * Handle chat message added
   */
  handleChatMessageAdded(detail) {
    const { conversationId, message } = detail;
    
    // Update conversation in local cache
    const conversation = this.conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      if (!conversation.messages) conversation.messages = [];
      conversation.messages.push(message);
      conversation.lastModified = new Date().toISOString();
      conversation.preview = message.content?.substring(0, 100) || '';
      
      this.updateFilteredConversations();
      this.renderConversations();
      this.updateStats();
      this.debouncedSaveConversations();
    }
  }

  /**
   * Handle chat session created
   */
  handleChatSessionCreated(detail) {
    const { sessionId, conversation } = detail;
    
    // Add new conversation to the beginning of the list
    this.conversations.unshift(conversation);
    this.selectConversation(sessionId);
    
    this.updateFilteredConversations();
    this.renderConversations();
    this.updateStats();
    this.saveConversations();
  }

  /**
   * Handle theme change
   */
  handleThemeChange(detail) {
    const { theme } = detail;
    
    if (this.elements.panel) {
      this.elements.panel.classList.remove('theme-light', 'theme-dark');
      this.elements.panel.classList.add(`theme-${theme}`);
    }
  }

  /**
   * Handle global state update
   */
  handleGlobalStateUpdate(data) {
    // Sync with global state if needed
    if (data.conversations && Array.isArray(data.conversations)) {
      this.conversations = data.conversations;
      this.updateFilteredConversations();
      this.renderConversations();
      this.updateStats();
    }
  }

  /**
   * Sync with storage
   */
  async syncWithStorage() {
    try {
      // Check if there are newer conversations in storage
      const stored = localStorage.getItem('chatHistory');
      if (stored) {
        const storedConversations = JSON.parse(stored);
        
        // Simple timestamp-based sync
        const lastLocalUpdate = Math.max(...this.conversations.map(c => new Date(c.lastModified || c.createdAt).getTime()));
        const lastStoredUpdate = Math.max(...storedConversations.map(c => new Date(c.lastModified || c.createdAt).getTime()));
        
        if (lastStoredUpdate > lastLocalUpdate) {
          this.conversations = storedConversations;
          this.updateFilteredConversations();
          this.renderConversations();
          this.updateStats();
        }
      }
    } catch (error) {
    }
  }

  /**
   * Handle storage change
   */
  handleStorageChange(event) {
    if (event.key === 'chatHistory' && event.newValue) {
      try {
        const newConversations = JSON.parse(event.newValue);
        
        this.conversations = newConversations;
        this.updateFilteredConversations();
        this.renderConversations();
        this.updateStats();
      } catch (error) {
      }
    }
  }

  /**
   * Debounced save conversations
   */
  debouncedSaveConversations() {
    clearTimeout(this.saveConversationsTimeout);
    this.saveConversationsTimeout = setTimeout(() => {
      this.saveConversations();
    }, 2000); // Save 2 seconds after last change
  }

  /**
   * Cleanup workspace integration
   */
  cleanupWorkspaceIntegration() {
    if (this.workspaceEventHandlers) {
      Object.entries(this.workspaceEventHandlers).forEach(([eventType, handler]) => {
        window.removeEventListener(eventType, handler);
      });
    }

    if (window.globalStateManager) {
      window.globalStateManager.unsubscribe('chat-history');
    }
  }

  /**
   * Handle provider filter change
   */
  handleProviderFilterChange(provider) {
    // Update active provider filter button
    this.elements.providerFilterButtons?.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.provider === provider);
    });
    
    this.providerFilter = provider;
    this.updateFilteredConversations();
    this.renderConversations();
    
    // Save preference
    this.debouncedSavePreferences();
    
  }
  
  /**
   * Get conversation provider info
   */
  getConversationProviderInfo(conversation) {
    const metadata = conversation.providerMetadata || {};
    const provider = metadata.lastProvider || this.inferProviderFromMessages(conversation);
    
    const providerInfo = {
      claude: { icon: '🤖', displayName: 'Claude' },
      openai: { icon: '🧠', displayName: 'OpenAI' },
      gemini: { icon: '💎', displayName: 'Gemini' }
    };
    
    return {
      provider,
      model: metadata.lastModel,
      icon: providerInfo[provider]?.icon || '❓',
      displayName: providerInfo[provider]?.displayName || 'Unknown'
    };
  }
  
  /**
   * Get conversation cost info
   */
  getConversationCostInfo(conversation) {
    const metadata = conversation.providerMetadata || {};
    return {
      totalCost: metadata.totalCost || 0,
      totalTokens: metadata.totalTokens || 0
    };
  }
  
  /**
   * Infer provider from conversation messages
   */
  inferProviderFromMessages(conversation) {
    if (!conversation.messages || conversation.messages.length === 0) {
      return null;
    }
    
    // Check recent messages for provider metadata
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      const message = conversation.messages[i];
      if (message.metadata && message.metadata.provider) {
        return message.metadata.provider;
      }
    }
    
    return null;
  }
  
  /**
   * Handle provider change from workspace
   */
  handleProviderChange(detail) {
    const { workspaceId, newProvider, previousProvider } = detail;
    
    this.currentProvider = newProvider;
    
    // Update UI to reflect current provider
    if (this.elements.panel) {
      this.elements.panel.setAttribute('data-current-provider', newProvider);
    }
    
    // Update provider filter if it was set to the previous provider
    if (this.providerFilter === previousProvider) {
      this.handleProviderFilterChange(newProvider);
    }
    
  }
  
  /**
   * Enable provider metadata display
   */
  enableProviderMetadata(enabled = true) {
    this.providerMetadataEnabled = enabled;
    this.options.enableProviderMetadata = enabled;
    
    if (enabled) {
      // Re-render conversations to show provider metadata
      this.renderConversations();
    }
    
  }
  
  /**
   * Get provider statistics
   */
  getProviderStatistics() {
    const stats = {
      totalConversations: this.conversations.length,
      providerBreakdown: {},
      totalCost: 0,
      totalTokens: 0
    };
    
    this.conversations.forEach(conv => {
      const providerInfo = this.getConversationProviderInfo(conv);
      const costInfo = this.getConversationCostInfo(conv);
      
      if (providerInfo.provider) {
        stats.providerBreakdown[providerInfo.provider] = {
          count: (stats.providerBreakdown[providerInfo.provider]?.count || 0) + 1,
          cost: (stats.providerBreakdown[providerInfo.provider]?.cost || 0) + costInfo.totalCost,
          tokens: (stats.providerBreakdown[providerInfo.provider]?.tokens || 0) + costInfo.totalTokens
        };
      }
      
      stats.totalCost += costInfo.totalCost;
      stats.totalTokens += costInfo.totalTokens;
    });
    
    return stats;
  }
  
  /**
   * Dispatch custom event
   */
  dispatchEvent(eventType, detail) {
    const event = new CustomEvent(eventType, { detail });
    window.dispatchEvent(event);
  }

  /**
   * Destroy the component
   */
  destroy() {
    // Save final preferences
    this.savePanelPreferences();
    
    // Clear timers
    clearTimeout(this.savePreferencesTimeout);
    clearInterval(this.syncInterval);
    
    // Remove event listeners
    if (this.boundKeydownHandler) {
      document.removeEventListener('keydown', this.boundKeydownHandler);
    }
    
    // Clean up workspace integration
    this.cleanupWorkspaceIntegration();
    
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    this.conversations = [];
    this.filteredConversations = [];
    this.currentSessionId = null;
    this.isInitialized = false;
    
    // Notify destruction
    this.dispatchEvent('chat-history-panel-destroyed', {
      containerId: this.containerId
    });
    
  }
}

// ES6 export
export default ChatHistoryPanel;