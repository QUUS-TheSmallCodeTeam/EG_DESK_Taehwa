/**
 * ChatHistoryIntegrationExample - Usage Example for Enhanced State Management
 * 
 * This file demonstrates how to integrate and use the enhanced state management
 * system for comprehensive chat history functionality in the eg-desk:taehwa project.
 */

import GlobalStateManager from './GlobalStateManager.js';
import eventBus from './EventBus.js';
import ChatHistoryManager from './ChatHistoryManager.js';

/**
 * Example integration showing how chat-manager agent would use the enhanced state system
 */
class ChatHistoryIntegrationExample {
  constructor() {
    this.stateManager = null;
    this.chatHistoryManager = null;
  }

  /**
   * Initialize the complete chat history system
   */
  async initialize() {
    try {

      // 1. Initialize Global State Manager
      this.stateManager = new GlobalStateManager({
        persistState: true,
        autoSave: true,
        saveInterval: 5000 // Save every 5 seconds for demo
      });

      await this.stateManager.initialize();

      // 2. Initialize Event Bus (singleton, already initialized)
      await eventBus.initialize();

      // 3. Initialize Chat History Manager
      this.chatHistoryManager = new ChatHistoryManager(this.stateManager);
      await this.chatHistoryManager.initialize();

      // 4. Set up demonstration event handlers
      this.setupDemoEventHandlers();

      return true;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Set up event handlers for demonstration
   */
  setupDemoEventHandlers() {
    // Listen for conversation events
    eventBus.subscribe('conversation-created', (eventData) => {
    });

    eventBus.subscribe('message-added', (eventData) => {
        conversationId: eventData.data.conversationId,
        messageId: eventData.data.messageId,
        role: eventData.data.message.role
      });
    });

    eventBus.subscribe('chat-history-searched', (eventData) => {
        query: eventData.data.query,
        results: eventData.data.results
      });
    });

    eventBus.subscribe('active-conversation-changed', (eventData) => {
        new: eventData.data.conversationId,
        previous: eventData.data.previousId
      });
    });
  }

  /**
   * Demonstrate creating conversations and adding messages
   */
  async demonstrateConversationFlow() {

    try {
      // Create a conversation about web development
      const webDevConversationId = await this.chatHistoryManager.createConversation({
        title: 'Web Development Discussion',
        tags: ['web-dev', 'javascript', 'react'],
        metadata: {
          project: 'eg-desk-taehwa',
          category: 'technical'
        }
      });

      // Add some messages to the conversation
      await this.chatHistoryManager.addMessage(webDevConversationId, 
        'I need help setting up a React component for chat history', {
        role: 'user',
        type: 'text'
      });

      await this.chatHistoryManager.addMessage(webDevConversationId,
        'I can help you create a React component for chat history. Let\'s start with the basic structure...', {
        role: 'assistant',
        type: 'text'
      });

      // Create another conversation about project management
      const projectConversationId = await this.chatHistoryManager.createConversation({
        title: 'Project Planning',
        tags: ['project-management', 'planning'],
        metadata: {
          priority: 'high',
          deadline: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      });

      await this.chatHistoryManager.addMessage(projectConversationId,
        'What are the key milestones for the eg-desk project?', {
        role: 'user'
      });

      // Set active conversation
      this.stateManager.setActiveConversation(webDevConversationId);

      
      return {
        webDevConversationId,
        projectConversationId
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Demonstrate search functionality
   */
  async demonstrateSearchFeatures() {

    try {
      // Search for React-related conversations
      const reactResults = await this.chatHistoryManager.searchConversations('React component', {
        includeMessages: true,
        limit: 10
      });

        conversations: reactResults.conversations.length,
        messages: reactResults.messages.length
      });

      // Search by tags
      const webDevResults = await this.chatHistoryManager.searchConversations('', {
        tags: ['web-dev'],
        includeMessages: false
      });

        conversations: webDevResults.conversations.length
      });

      // Search with date range
      const recentResults = await this.chatHistoryManager.searchConversations('', {
        dateRange: {
          startDate: Date.now() - (24 * 60 * 60 * 1000), // Last 24 hours
          endDate: Date.now()
        }
      });

        conversations: recentResults.conversations.length
      });


    } catch (error) {
      throw error;
    }
  }

  /**
   * Demonstrate analytics and insights
   */
  async demonstrateAnalytics(conversationIds) {

    try {
      // Get overall chat history statistics
      const stats = this.stateManager.getChatHistoryStats();

      // Get insights for specific conversations
      for (const conversationId of conversationIds) {
        const insights = this.chatHistoryManager.getConversationInsights(conversationId);
      }

      // Get manager statistics
      const managerStats = this.chatHistoryManager.getManagerStats();

      // Get event bus health metrics
      const healthMetrics = eventBus.getHealthMetrics();
        status: healthMetrics.healthStatus,
        eventsPerMinute: healthMetrics.eventsPerMinute,
        chatHistoryEvents: healthMetrics.chatHistoryEventStats.totalChatHistoryEvents
      });


    } catch (error) {
      throw error;
    }
  }

  /**
   * Demonstrate state persistence and loading
   */
  async demonstratePersistence() {

    try {
      // Force save current state
      await this.stateManager.saveState();

      // Simulate loading state (in real scenario, this would be on app restart)
      const currentChatHistory = this.stateManager.getState('chatHistory');
        totalConversations: Object.keys(currentChatHistory.conversations).length,
        activeConversation: currentChatHistory.activeConversationId,
        preferences: currentChatHistory.userPreferences
      });

      // Update preferences
      this.stateManager.updateChatHistoryPreferences({
        retentionDays: 45,
        maxConversations: 500,
        enableSearch: true
      });


    } catch (error) {
      throw error;
    }
  }

  /**
   * Demonstrate cross-module event coordination
   */
  demonstrateEventCoordination() {

    // Simulate events from different modules
    
    // Simulate UI requesting a conversation
    eventBus.publish('ui-conversation-request', {
      action: 'load',
      conversationId: 'test-conversation'
    });

    // Simulate workspace synchronization
    eventBus.publish('workspace-chat-history-sync', {
      syncType: 'full',
      timestamp: Date.now()
    });

    // Simulate real-time update
    eventBus.handleRealtimeUpdate('message-typing', {
      conversationId: 'active-conversation',
      userId: 'user-123',
      isTyping: true
    });

    // Demonstrate conflict resolution setup
    eventBus.setupConflictResolution();
    
    // Simulate a conflict
    eventBus.publish('state-conflict-detected', {
      conflictId: 'conflict-123',
      timestamps: [Date.now() - 1000, Date.now()],
      affectedConversation: 'test-conversation'
    });

  }

  /**
   * Demonstrate export/import functionality
   */
  async demonstrateDataPortability() {

    try {
      // Export all chat history
      const fullExport = this.stateManager.exportChatHistory();
        conversationCount: Object.keys(fullExport.conversations).length,
        exportSize: JSON.stringify(fullExport).length,
        version: fullExport.version
      });

      // Export specific conversations
      const conversations = this.stateManager.getConversations({ limit: 2 });
      const conversationIds = conversations.map(conv => conv.id);
      const partialExport = this.stateManager.exportChatHistory(conversationIds);
      
        selectedConversations: conversationIds.length,
        exportedConversations: Object.keys(partialExport.conversations).length
      });

      // Simulate import (in real usage, this would be from a file)
      await this.stateManager.importChatHistory(partialExport, { merge: true });


    } catch (error) {
      throw error;
    }
  }

  /**
   * Run complete demonstration
   */
  async runDemo() {
    try {
      // Initialize system
      await this.initialize();

      // Wait a moment for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Run demonstrations
      const { webDevConversationId, projectConversationId } = await this.demonstrateConversationFlow();
      
      await this.demonstrateSearchFeatures();
      
      await this.demonstrateAnalytics([webDevConversationId, projectConversationId]);
      
      await this.demonstratePersistence();
      
      this.demonstrateEventCoordination();
      
      await this.demonstrateDataPortability();


    } catch (error) {
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.chatHistoryManager) {
      this.chatHistoryManager.destroy();
    }
    
    if (this.stateManager) {
      await this.stateManager.destroy();
    }

  }
}

// Export for use in other modules
export default ChatHistoryIntegrationExample;

// Example usage (commented out to prevent automatic execution):
/*
async function runChatHistoryDemo() {
  const demo = new ChatHistoryIntegrationExample();
  
  try {
    await demo.runDemo();
  } catch (error) {
  } finally {
    await demo.cleanup();
  }
}

// Uncomment to run the demo:
// runChatHistoryDemo();
*/