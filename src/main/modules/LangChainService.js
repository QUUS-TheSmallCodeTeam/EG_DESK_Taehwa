/**
 * LangChainService - Multi-Provider AI Chat Service using LangChain
 * 
 * Provides unified interface for multiple AI providers (Claude, OpenAI, Gemini)
 * using LangChain for standardized communication and provider switching.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

class LangChainService {
  constructor(secureKeyManager) {
    this.secureKeyManager = secureKeyManager;
    this.providers = new Map();
    this.currentProvider = 'claude';
    this.currentModel = null;
    this.isInitialized = false;
    
    // Cost tracking
    this.costTracker = {
      session: { input: 0, output: 0, total: 0 },
      total: { input: 0, output: 0, total: 0 }
    };
    
    // Provider configurations - Limited to 3 models as requested
    this.providerConfigs = {
      claude: {
        name: 'Claude (4.0 Sonnet)',
        models: [
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 4.0 Sonnet', context: 200000 }
        ],
        defaultModel: 'claude-3-5-sonnet-20241022',
        costPer1k: { input: 0.003, output: 0.015 }
      },
      openai: {
        name: 'ChatGPT (GPT-4o)',
        models: [
          { id: 'gpt-4o', name: 'GPT-4o', context: 128000 }
        ],
        defaultModel: 'gpt-4o',
        costPer1k: { input: 0.005, output: 0.015 }
      },
      gemini: {
        name: 'Gemini (2.5 Flash)',
        models: [
          { id: 'gemini-1.5-flash', name: 'Gemini 2.5 Flash', context: 1000000 }
        ],
        defaultModel: 'gemini-1.5-flash',
        costPer1k: { input: 0.00125, output: 0.00375 }
      }
    };
  }

  /**
   * Initialize the LangChain service
   */
  async initialize() {
    try {
      console.log('[LangChainService] Initializing...');
      
      if (!this.secureKeyManager || !this.secureKeyManager.isInitialized) {
        throw new Error('SecureKeyManager not initialized');
      }
      
      await this.initializeProviders();
      this.isInitialized = true;
      
      console.log('[LangChainService] Successfully initialized');
      return true;
    } catch (error) {
      console.error('[LangChainService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize available providers based on stored API keys
   */
  async initializeProviders() {
    const availableProviders = [];
    
    for (const [providerId, config] of Object.entries(this.providerConfigs)) {
      try {
        if (this.secureKeyManager.hasProviderKey(providerId)) {
          const keyData = await this.secureKeyManager.getProviderKey(providerId);
          const provider = await this.createProvider(providerId, keyData.api_key);
          
          if (provider) {
            this.providers.set(providerId, {
              instance: provider,
              config: config,
              currentModel: config.defaultModel,
              status: 'ready'
            });
            availableProviders.push(providerId);
            
            // Set first available provider as current
            if (!this.currentProvider || !this.providers.has(this.currentProvider)) {
              this.currentProvider = providerId;
              this.currentModel = config.defaultModel;
            }
          }
        }
      } catch (error) {
        console.warn(`[LangChainService] Failed to initialize provider ${providerId}:`, error);
      }
    }
    
    console.log(`[LangChainService] Initialized providers: ${availableProviders.join(', ')}`);
    
    if (availableProviders.length === 0) {
      throw new Error('No AI providers available. Please configure API keys.');
    }
  }

  /**
   * Create provider instance based on type
   */
  async createProvider(providerId, apiKey) {
    switch (providerId) {
      case 'claude':
        return new ChatAnthropic({
          apiKey: apiKey,
          model: this.providerConfigs.claude.defaultModel,
          temperature: 0.7,
          maxTokens: 4000
        });
        
      case 'openai':
        return new ChatOpenAI({
          apiKey: apiKey,
          model: this.providerConfigs.openai.defaultModel,
          temperature: 0.7,
          maxTokens: 4000
        });
        
      case 'gemini':
        return new ChatGoogleGenerativeAI({
          apiKey: apiKey,
          model: this.providerConfigs.gemini.defaultModel,
          temperature: 0.7,
          maxOutputTokens: 4000
        });
        
      default:
        throw new Error(`Unsupported provider: ${providerId}`);
    }
  }

  /**
   * Switch to a different provider
   */
  async switchProvider(providerId, modelId = null) {
    if (!this.isInitialized) {
      throw new Error('LangChainService not initialized');
    }
    
    if (!this.providers.has(providerId)) {
      throw new Error(`Provider ${providerId} not available`);
    }
    
    const provider = this.providers.get(providerId);
    
    // Update model if specified
    if (modelId) {
      const config = this.providerConfigs[providerId];
      const model = config.models.find(m => m.id === modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not available for provider ${providerId}`);
      }
      
      // Update provider instance with new model
      const keyData = await this.secureKeyManager.getProviderKey(providerId);
      provider.instance = await this.createProvider(providerId, keyData.api_key);
      provider.instance.model = modelId;
      provider.currentModel = modelId;
    }
    
    this.currentProvider = providerId;
    this.currentModel = provider.currentModel;
    
    console.log(`[LangChainService] Switched to provider: ${providerId}, model: ${this.currentModel}`);
    return {
      provider: providerId,
      model: this.currentModel,
      config: provider.config
    };
  }

  /**
   * Send a chat message
   */
  async sendMessage(message, conversationHistory = [], systemPrompt = null) {
    if (!this.isInitialized) {
      throw new Error('LangChainService not initialized');
    }
    
    if (!this.providers.has(this.currentProvider)) {
      throw new Error(`Current provider ${this.currentProvider} not available`);
    }
    
    try {
      const provider = this.providers.get(this.currentProvider);
      const messages = this.buildMessageHistory(message, conversationHistory, systemPrompt);
      
      console.log(`[LangChainService] Sending message to ${this.currentProvider}...`);
      
      const startTime = Date.now();
      const response = await provider.instance.invoke(messages);
      const endTime = Date.now();
      
      // Calculate costs and tokens (approximate)
      const inputTokens = this.estimateTokens(messages);
      const outputTokens = this.estimateTokens([response]);
      const cost = this.calculateCost(inputTokens, outputTokens);
      
      // Update cost tracking
      this.updateCostTracking(inputTokens, outputTokens, cost);
      
      const result = {
        success: true,
        message: response.content,
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          inputTokens,
          outputTokens,
          cost,
          responseTime: endTime - startTime,
          timestamp: Date.now()
        }
      };
      
      console.log(`[LangChainService] Response received from ${this.currentProvider} in ${result.metadata.responseTime}ms`);
      return result;
      
    } catch (error) {
      console.error(`[LangChainService] Error sending message to ${this.currentProvider}:`, error);
      
      return {
        success: false,
        error: error.message,
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Stream a chat message (for real-time responses)
   */
  async streamMessage(message, conversationHistory = [], systemPrompt = null, onChunk = null) {
    if (!this.isInitialized) {
      throw new Error('LangChainService not initialized');
    }
    
    if (!this.providers.has(this.currentProvider)) {
      throw new Error(`Current provider ${this.currentProvider} not available`);
    }
    
    try {
      const provider = this.providers.get(this.currentProvider);
      const messages = this.buildMessageHistory(message, conversationHistory, systemPrompt);
      
      console.log(`[LangChainService] Streaming message to ${this.currentProvider}...`);
      
      const startTime = Date.now();
      let fullResponse = '';
      
      const stream = await provider.instance.stream(messages);
      
      for await (const chunk of stream) {
        const content = chunk.content;
        if (content) {
          fullResponse += content;
          if (onChunk) {
            onChunk(content);
          }
        }
      }
      
      const endTime = Date.now();
      
      // Calculate costs and tokens (approximate)
      const inputTokens = this.estimateTokens(messages);
      const outputTokens = this.estimateTokens([{ content: fullResponse }]);
      const cost = this.calculateCost(inputTokens, outputTokens);
      
      // Update cost tracking
      this.updateCostTracking(inputTokens, outputTokens, cost);
      
      const result = {
        success: true,
        message: fullResponse,
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          inputTokens,
          outputTokens,
          cost,
          responseTime: endTime - startTime,
          timestamp: Date.now(),
          streamed: true
        }
      };
      
      console.log(`[LangChainService] Stream completed from ${this.currentProvider} in ${result.metadata.responseTime}ms`);
      return result;
      
    } catch (error) {
      console.error(`[LangChainService] Error streaming message to ${this.currentProvider}:`, error);
      
      return {
        success: false,
        error: error.message,
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          timestamp: Date.now(),
          streamed: true
        }
      };
    }
  }

  /**
   * Build message history for LangChain
   */
  buildMessageHistory(currentMessage, conversationHistory = [], systemPrompt = null) {
    const messages = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }
    
    // Add conversation history
    for (const historyItem of conversationHistory) {
      if (historyItem.role === 'user') {
        messages.push(new HumanMessage(historyItem.content));
      } else if (historyItem.role === 'assistant') {
        messages.push(new AIMessage(historyItem.content));
      }
    }
    
    // Add current message
    messages.push(new HumanMessage(currentMessage));
    
    return messages;
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(messages) {
    const text = messages.map(msg => {
      if (typeof msg === 'string') return msg;
      if (msg.content) return msg.content;
      return '';
    }).join(' ');
    
    // Rough estimation: 1 token = ~4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate cost based on provider rates
   */
  calculateCost(inputTokens, outputTokens) {
    const config = this.providerConfigs[this.currentProvider];
    if (!config || !config.costPer1k) {
      return 0;
    }
    
    const inputCost = (inputTokens / 1000) * config.costPer1k.input;
    const outputCost = (outputTokens / 1000) * config.costPer1k.output;
    
    return inputCost + outputCost;
  }

  /**
   * Update cost tracking
   */
  updateCostTracking(inputTokens, outputTokens, cost) {
    this.costTracker.session.input += inputTokens;
    this.costTracker.session.output += outputTokens;
    this.costTracker.session.total += cost;
    
    this.costTracker.total.input += inputTokens;
    this.costTracker.total.output += outputTokens;
    this.costTracker.total.total += cost;
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    const providers = [];
    
    for (const [providerId, providerData] of this.providers) {
      const config = this.providerConfigs[providerId];
      providers.push({
        id: providerId,
        name: config.name,
        models: config.models,
        currentModel: providerData.currentModel,
        status: providerData.status,
        isCurrent: providerId === this.currentProvider
      });
    }
    
    return providers;
  }

  /**
   * Get current provider status
   */
  getCurrentProviderStatus() {
    if (!this.currentProvider || !this.providers.has(this.currentProvider)) {
      return {
        provider: null,
        model: null,
        status: 'disconnected',
        costTracker: this.costTracker
      };
    }
    
    const provider = this.providers.get(this.currentProvider);
    const config = this.providerConfigs[this.currentProvider];
    
    return {
      provider: {
        id: this.currentProvider,
        name: config.name,
        currentModel: this.currentModel
      },
      model: config.models.find(m => m.id === this.currentModel),
      status: provider.status,
      costTracker: this.costTracker
    };
  }

  /**
   * Reset session cost tracking
   */
  resetSessionCosts() {
    this.costTracker.session = { input: 0, output: 0, total: 0 };
    console.log('[LangChainService] Session costs reset');
  }

  /**
   * Test provider connection
   */
  async testProvider(providerId) {
    try {
      if (!this.providers.has(providerId)) {
        throw new Error(`Provider ${providerId} not available`);
      }
      
      const testMessage = "Hello! Please respond with 'Connection test successful.' to confirm the API is working.";
      const result = await this.sendMessage(testMessage, []);
      
      if (result.success) {
        return {
          success: true,
          provider: providerId,
          message: 'Provider connection test successful',
          response: result.message,
          metadata: result.metadata
        };
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      return {
        success: false,
        provider: providerId,
        error: error.message
      };
    }
  }

  /**
   * Get provider models
   */
  getProviderModels(providerId) {
    const config = this.providerConfigs[providerId];
    return config ? config.models : [];
  }

  /**
   * Update provider model
   */
  async updateProviderModel(providerId, modelId) {
    if (!this.providers.has(providerId)) {
      throw new Error(`Provider ${providerId} not available`);
    }
    
    const config = this.providerConfigs[providerId];
    const model = config.models.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not available for provider ${providerId}`);
    }
    
    const provider = this.providers.get(providerId);
    provider.currentModel = modelId;
    
    // Update current model if this is the active provider
    if (providerId === this.currentProvider) {
      this.currentModel = modelId;
      // Recreate provider instance with new model
      const keyData = await this.secureKeyManager.getProviderKey(providerId);
      provider.instance = await this.createProvider(providerId, keyData.api_key);
      provider.instance.model = modelId;
    }
    
    console.log(`[LangChainService] Updated ${providerId} model to ${modelId}`);
    return true;
  }

  /**
   * Cleanup and destroy
   */
  async destroy() {
    try {
      this.providers.clear();
      this.currentProvider = null;
      this.currentModel = null;
      this.isInitialized = false;
      
      console.log('[LangChainService] Destroyed successfully');
    } catch (error) {
      console.error('[LangChainService] Cleanup failed:', error);
    }
  }
}

export default LangChainService;