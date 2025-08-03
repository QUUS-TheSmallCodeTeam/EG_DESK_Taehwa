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
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', context: 1000000 }
        ],
        defaultModel: 'gemini-2.5-flash',
        costPer1k: { input: 0.00125, output: 0.00375 }
      }
    };
  }

  /**
   * Initialize the LangChain service
   */
  async initialize() {
    try {
      console.log('🔧 LangChainService: Starting initialization...');
      
      if (!this.secureKeyManager || !this.secureKeyManager.isInitialized) {
        console.error('❌ LangChainService: SecureKeyManager not initialized');
        throw new Error('SecureKeyManager not initialized');
      }
      
      console.log('✅ LangChainService: SecureKeyManager is ready');
      
      await this.initializeProviders();
      this.isInitialized = true;
      
      console.log('✅ LangChainService: Initialization complete');
      console.log('📊 LangChainService: Current status:', {
        isInitialized: this.isInitialized,
        currentProvider: this.currentProvider,
        currentModel: this.currentModel,
        availableProviders: Array.from(this.providers.keys())
      });
      
      return true;
    } catch (error) {
      console.error('❌ LangChainService: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize available providers based on stored API keys
   */
  async initializeProviders() {
    console.log('🔍 LangChainService: Starting provider initialization...');
    const availableProviders = [];
    
    // Always set default provider to openai
    this.currentProvider = 'openai';
    this.currentModel = this.providerConfigs.openai.defaultModel;
    console.log('📝 LangChainService: Set default provider to OpenAI with model:', this.currentModel);
    
    console.log('🔑 LangChainService: Checking API keys for all providers...');
    
    for (const [providerId, config] of Object.entries(this.providerConfigs)) {
      try {
        console.log(`🔍 LangChainService: Checking provider ${providerId}...`);
        
        const hasKey = this.secureKeyManager.hasProviderKey(providerId);
        console.log(`🔑 LangChainService: Provider ${providerId} has API key:`, hasKey);
        
        if (hasKey) {
          console.log(`🔓 LangChainService: Getting API key for ${providerId}...`);
          const keyData = await this.secureKeyManager.getProviderKey(providerId);
          console.log(`✅ LangChainService: Got API key for ${providerId}, key length:`, keyData.api_key?.length || 0);
          
          console.log(`🏗️ LangChainService: Creating provider instance for ${providerId}...`);
          const provider = await this.createProvider(providerId, keyData.api_key);
          
          if (provider) {
            console.log(`✅ LangChainService: Successfully created provider ${providerId}`);
            this.providers.set(providerId, {
              instance: provider,
              config: config,
              currentModel: config.defaultModel,
              status: 'ready'
            });
            availableProviders.push(providerId);
            
            console.log(`📊 LangChainService: Provider ${providerId} added to available providers`);
            
            // Set first available provider as current
            if (!this.currentProvider || !this.providers.has(this.currentProvider)) {
              console.log(`🎯 LangChainService: Setting ${providerId} as current provider`);
              this.currentProvider = providerId;
              this.currentModel = config.defaultModel;
            }
          } else {
            console.warn(`⚠️ LangChainService: Failed to create provider instance for ${providerId}`);
          }
        } else {
          console.log(`🔒 LangChainService: No API key found for ${providerId}`);
        }
      } catch (error) {
        console.error(`❌ LangChainService: Error initializing provider ${providerId}:`, error.message);
      }
    }
    
    console.log('📊 LangChainService: Provider initialization summary:', {
      availableProviders: availableProviders,
      totalProviders: availableProviders.length,
      currentProvider: this.currentProvider,
      currentModel: this.currentModel,
      providersMap: Array.from(this.providers.keys())
    });
    
    if (availableProviders.length === 0) {
      console.warn('⚠️ LangChainService: No AI providers available. Please configure API keys.');
      // Don't throw error, allow initialization to continue
      // Set default provider anyway for UI purposes
      this.currentProvider = 'openai';
      this.currentModel = this.providerConfigs.openai.defaultModel;
      console.log('🎯 LangChainService: Fallback - Set default provider to OpenAI for UI purposes');
    } else {
      console.log(`✅ LangChainService: Successfully initialized ${availableProviders.length} providers`);
    }
  }

  /**
   * Create provider instance based on type
   */
  async createProvider(providerId, apiKey) {
    console.log(`🏗️ LangChainService: Creating provider ${providerId} with key length:`, apiKey?.length || 0);
    
    try {
      let provider;
      
      switch (providerId) {
        case 'claude':
          console.log('🤖 LangChainService: Creating ChatAnthropic instance...');
          provider = new ChatAnthropic({
            apiKey: apiKey,
            model: this.providerConfigs.claude.defaultModel,
            temperature: 0.7,
            maxTokens: 4000
          });
          break;
          
        case 'openai':
          console.log('🧠 LangChainService: Creating ChatOpenAI instance...');
          provider = new ChatOpenAI({
            apiKey: apiKey,
            model: this.providerConfigs.openai.defaultModel,
            temperature: 0.7,
            maxTokens: 4000
          });
          break;
          
        case 'gemini':
          console.log('💎 LangChainService: Creating ChatGoogleGenerativeAI instance...');
          provider = new ChatGoogleGenerativeAI({
            apiKey: apiKey,
            model: this.providerConfigs.gemini.defaultModel,
            temperature: 0.7,
            maxOutputTokens: 4000
          });
          break;
          
        default:
          throw new Error(`Unsupported provider: ${providerId}`);
      }
      
      console.log(`✅ LangChainService: Successfully created provider instance for ${providerId}`);
      return provider;
      
    } catch (error) {
      console.error(`❌ LangChainService: Failed to create provider ${providerId}:`, error.message);
      throw error;
    }
  }

  /**
   * Switch to a different provider
   */
  async switchProvider(providerId, modelId = null) {
    console.log(`🔄 LangChainService: Switching to provider ${providerId} with model ${modelId}`);
    
    if (!this.isInitialized) {
      console.error('❌ LangChainService: Service not initialized for provider switch');
      throw new Error('LangChainService not initialized');
    }
    
    // Always allow provider switching, even without API key
    this.currentProvider = providerId;
    console.log(`📝 LangChainService: Set current provider to ${providerId}`);
    
    // Check if provider has API key and is available
    if (!this.providers.has(providerId)) {
      console.log(`⚠️ LangChainService: Provider ${providerId} not in initialized providers map`);
      
      // Provider not initialized (no API key), but still allow selection
      const config = this.providerConfigs[providerId];
      if (!config) {
        console.error(`❌ LangChainService: Unknown provider ${providerId}`);
        throw new Error(`Unknown provider ${providerId}`);
      }
      
      this.currentModel = modelId || config.defaultModel;
      console.log(`📝 LangChainService: Set model to ${this.currentModel} for provider without API key`);
      
      const result = {
        success: true,
        provider: providerId,
        model: this.currentModel,
        status: 'no_api_key',
        message: `Provider ${providerId} selected but API key not configured`
      };
      
      console.log('✅ LangChainService: Provider switch result (no API key):', result);
      return result;
    }
    
    console.log(`✅ LangChainService: Provider ${providerId} found in initialized providers`);
    const provider = this.providers.get(providerId);
    
    // Update model if specified
    if (modelId) {
      console.log(`🔄 LangChainService: Updating model to ${modelId}`);
      const config = this.providerConfigs[providerId];
      const model = config.models.find(m => m.id === modelId);
      if (!model) {
        console.error(`❌ LangChainService: Model ${modelId} not available for provider ${providerId}`);
        throw new Error(`Model ${modelId} not available for provider ${providerId}`);
      }
      
      // Update provider instance with new model
      console.log(`🔄 LangChainService: Recreating provider instance with new model...`);
      const keyData = await this.secureKeyManager.getProviderKey(providerId);
      provider.instance = await this.createProvider(providerId, keyData.api_key);
      provider.instance.model = modelId;
      provider.currentModel = modelId;
      console.log(`✅ LangChainService: Updated provider instance with model ${modelId}`);
    }
    
    this.currentProvider = providerId;
    this.currentModel = provider.currentModel;
    
    const result = {
      success: true,
      provider: providerId,
      model: this.currentModel,
      config: provider.config
    };
    
    console.log('✅ LangChainService: Provider switch result (with API key):', result);
    return result;
  }

  /**
   * Send a chat message
   */
  async sendMessage(message, conversationHistory = [], systemPrompt = null) {
    if (!this.isInitialized) {
      throw new Error('LangChainService not initialized');
    }
    
    if (!this.providers.has(this.currentProvider)) {
      return {
        success: false,
        error: `${this.currentProvider} API key not configured. Please add your API key in settings.`,
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          timestamp: Date.now(),
          needsApiKey: true
        }
      };
    }
    
    try {
      const provider = this.providers.get(this.currentProvider);
      const messages = this.buildMessageHistory(message, conversationHistory, systemPrompt);
      
      
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
      
      return result;
      
    } catch (error) {
      
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
      return {
        success: false,
        error: `${this.currentProvider} API key not configured. Please add your API key in settings.`,
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          timestamp: Date.now(),
          needsApiKey: true,
          streamed: true
        }
      };
    }
    
    try {
      const provider = this.providers.get(this.currentProvider);
      const messages = this.buildMessageHistory(message, conversationHistory, systemPrompt);
      
      
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
      
      return result;
      
    } catch (error) {
      
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
    console.log('📊 LangChainService: Getting current provider status...');
    console.log('📊 LangChainService: Current state:', {
      currentProvider: this.currentProvider,
      currentModel: this.currentModel,
      isInitialized: this.isInitialized,
      providersCount: this.providers.size,
      availableProviders: Array.from(this.providers.keys())
    });
    
    if (!this.currentProvider) {
      console.log('⚠️ LangChainService: No current provider set');
      return {
        provider: null,
        model: null,
        status: 'disconnected',
        costTracker: this.costTracker
      };
    }
    
    const config = this.providerConfigs[this.currentProvider];
    if (!config) {
      console.log(`❌ LangChainService: No config found for provider ${this.currentProvider}`);
      return {
        provider: null,
        model: null,
        status: 'disconnected',
        costTracker: this.costTracker
      };
    }
    
    console.log(`📝 LangChainService: Found config for provider ${this.currentProvider}`);
    
    // If provider has API key configured
    if (this.providers.has(this.currentProvider)) {
      console.log(`✅ LangChainService: Provider ${this.currentProvider} is initialized with API key`);
      const provider = this.providers.get(this.currentProvider);
      
      const status = {
        provider: {
          id: this.currentProvider,
          name: config.name,
          currentModel: this.currentModel
        },
        model: config.models.find(m => m.id === this.currentModel),
        status: provider.status,
        costTracker: this.costTracker
      };
      
      console.log('📊 LangChainService: Status with API key:', status);
      return status;
    }
    
    // Provider selected but no API key configured
    console.log(`⚠️ LangChainService: Provider ${this.currentProvider} selected but no API key configured`);
    const status = {
      provider: {
        id: this.currentProvider,
        name: config.name,
        currentModel: this.currentModel
      },
      model: config.models.find(m => m.id === this.currentModel),
      status: 'no_api_key',
      costTracker: this.costTracker
    };
    
    console.log('📊 LangChainService: Status without API key:', status);
    return status;
  }

  /**
   * Reset session cost tracking
   */
  resetSessionCosts() {
    this.costTracker.session = { input: 0, output: 0, total: 0 };
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
      
    } catch (error) {
    }
  }
}

export default LangChainService;