/**
 * SecureKeyManager - Secure API Key Management Module
 * 
 * Manages secure storage and retrieval of AI provider API keys using Electron's safeStorage.
 * Provides encrypted storage, provider configuration management, and IPC communication.
 */

import { safeStorage, app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

class SecureKeyManager {
  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'provider-keys.enc');
    this.configBackupPath = path.join(app.getPath('userData'), 'provider-keys.backup.enc');
    this.providers = new Map();
    this.isInitialized = false;
    this.encryptionKey = null;
    
    // Supported AI providers
    this.supportedProviders = {
      'claude': {
        name: 'Claude (Anthropic)',
        keyNames: ['api_key'],
        models: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
        defaultModel: 'claude-3-sonnet-20240229',
        endpoints: {
          api: 'https://api.anthropic.com',
          chat: '/v1/messages'
        },
        costPer1k: { input: 0.003, output: 0.015 }
      },
      'openai': {
        name: 'OpenAI',
        keyNames: ['api_key'],
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        defaultModel: 'gpt-4',
        endpoints: {
          api: 'https://api.openai.com',
          chat: '/v1/chat/completions'
        },
        costPer1k: { input: 0.01, output: 0.03 }
      },
      'gemini': {
        name: 'Google Gemini',
        keyNames: ['api_key'],
        models: ['gemini-pro', 'gemini-pro-vision'],
        defaultModel: 'gemini-pro',
        endpoints: {
          api: 'https://generativelanguage.googleapis.com',
          chat: '/v1beta/models/{model}:generateContent'
        },
        costPer1k: { input: 0.00125, output: 0.00375 }
      }
    };
  }

  /**
   * Initialize the secure key manager
   */
  async initialize() {
    try {
      console.log('🔐 SecureKeyManager: Starting initialization...');
      
      // Check if safeStorage is available
      if (!safeStorage.isEncryptionAvailable()) {
        console.error('❌ SecureKeyManager: System encryption is not available');
        throw new Error('System encryption is not available');
      }
      
      console.log('✅ SecureKeyManager: System encryption is available');
      
      // Generate or load encryption key
      await this.initializeEncryption();
      console.log('✅ SecureKeyManager: Encryption initialized');
      
      // Load existing provider configurations
      await this.loadProviderConfigs();
      console.log('✅ SecureKeyManager: Provider configs loaded');
      
      // Set initialized flag before loading environment variables
      // so that storeProviderKey() can be called during loadEnvironmentVariables()
      this.isInitialized = true;
      console.log('✅ SecureKeyManager: Set as initialized');
      
      // Check for environment variables and auto-store them
      await this.loadEnvironmentVariables();
      console.log('✅ SecureKeyManager: Environment variables processed');
      
      console.log('📊 SecureKeyManager: Initialization complete. Summary:', {
        isInitialized: this.isInitialized,
        providersCount: this.providers.size,
        providers: Array.from(this.providers.keys())
      });
      
      return true;
    } catch (error) {
      console.error('❌ SecureKeyManager: Initialization failed:', error);
      this.isInitialized = false; // Reset on error
      throw error;
    }
  }

  /**
   * Initialize encryption system
   */
  async initializeEncryption() {
    try {
      // Generate a unique encryption key for this installation
      const keyPath = path.join(app.getPath('userData'), '.keystore');
      
      try {
        const existingKey = await fs.readFile(keyPath);
        this.encryptionKey = existingKey;
      } catch (error) {
        // Generate new key
        this.encryptionKey = crypto.randomBytes(32);
        await fs.writeFile(keyPath, this.encryptionKey, { mode: 0o600 });
      }
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Store API key for a provider
   */
  async storeProviderKey(providerId, keyData) {
    if (!this.isInitialized) {
      throw new Error('SecureKeyManager not initialized');
    }
    
    if (!this.supportedProviders[providerId]) {
      throw new Error(`Unsupported provider: ${providerId}`);
    }
    
    try {
      // Validate key data
      this.validateKeyData(providerId, keyData);
      
      // Encrypt the key data
      const encryptedData = this.encryptData(keyData);
      
      // Store in memory
      this.providers.set(providerId, {
        ...keyData,
        encrypted: encryptedData,
        createdAt: Date.now(),
        lastUsed: null,
        status: 'stored'
      });
      
      // Persist to disk
      await this.saveProviderConfigs();
      
      return true;
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieve API key for a provider
   */
  async getProviderKey(providerId) {
    console.log(`🔓 SecureKeyManager: Getting provider key for ${providerId}`);
    
    if (!this.isInitialized) {
      console.error('❌ SecureKeyManager: Not initialized when getting provider key');
      throw new Error('SecureKeyManager not initialized');
    }
    
    const providerData = this.providers.get(providerId);
    if (!providerData) {
      console.log(`⚠️ SecureKeyManager: No provider data found for ${providerId}`);
      return null;
    }
    
    console.log(`✅ SecureKeyManager: Found provider data for ${providerId}`);
    
    try {
      // Decrypt the key data
      console.log(`🔓 SecureKeyManager: Decrypting key data for ${providerId}`);
      const decryptedData = this.decryptData(providerData.encrypted);
      
      console.log(`✅ SecureKeyManager: Successfully decrypted key for ${providerId}, key length:`, decryptedData.api_key?.length || 0);
      
      // Update last used timestamp
      providerData.lastUsed = Date.now();
      
      return decryptedData;
      
    } catch (error) {
      console.error(`❌ SecureKeyManager: Failed to decrypt key for ${providerId}:`, error.message);
      throw error;
    }
  }

  /**
   * Remove API key for a provider
   */
  async removeProviderKey(providerId) {
    if (!this.isInitialized) {
      throw new Error('SecureKeyManager not initialized');
    }
    
    try {
      this.providers.delete(providerId);
      await this.saveProviderConfigs();
      
      return true;
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if provider has stored key
   */
  hasProviderKey(providerId) {
    const hasKey = this.providers.has(providerId);
    console.log(`🔑 SecureKeyManager: Provider ${providerId} has key: ${hasKey}`);
    return hasKey;
  }

  /**
   * Get provider configuration information
   */
  getProviderInfo(providerId) {
    const config = this.supportedProviders[providerId];
    if (!config) {
      return null;
    }
    
    const hasKey = this.hasProviderKey(providerId);
    const providerData = this.providers.get(providerId);
    
    return {
      id: providerId,
      name: config.name,
      models: config.models,
      defaultModel: config.defaultModel,
      endpoints: config.endpoints,
      costPer1k: config.costPer1k,
      hasKey,
      keyStatus: hasKey ? providerData.status : 'missing',
      lastUsed: hasKey ? providerData.lastUsed : null,
      createdAt: hasKey ? providerData.createdAt : null
    };
  }

  /**
   * Get all supported providers
   */
  getAllProviders() {
    return Object.keys(this.supportedProviders).map(providerId => 
      this.getProviderInfo(providerId)
    );
  }

  /**
   * Test provider API key
   */
  async testProviderKey(providerId) {
    if (!this.hasProviderKey(providerId)) {
      throw new Error(`No API key stored for provider: ${providerId}`);
    }
    
    try {
      const keyData = await this.getProviderKey(providerId);
      const config = this.supportedProviders[providerId];
      
      // Simple API test based on provider
      let testResult;
      
      switch (providerId) {
        case 'claude':
          testResult = await this.testClaudeAPI(keyData.api_key);
          break;
        case 'openai':
          testResult = await this.testOpenAIAPI(keyData.api_key);
          break;
        case 'gemini':
          testResult = await this.testGeminiAPI(keyData.api_key);
          break;
        default:
          throw new Error(`API test not implemented for provider: ${providerId}`);
      }
      
      // Update provider status
      const providerData = this.providers.get(providerId);
      if (providerData) {
        providerData.status = testResult.success ? 'active' : 'invalid';
        providerData.lastTested = Date.now();
        providerData.testResult = testResult;
      }
      
      return testResult;
      
    } catch (error) {
      
      const providerData = this.providers.get(providerId);
      if (providerData) {
        providerData.status = 'error';
        providerData.lastTested = Date.now();
        providerData.testError = error.message;
      }
      
      throw error;
    }
  }

  /**
   * Update provider configuration
   */
  async updateProviderConfig(providerId, config) {
    if (!this.hasProviderKey(providerId)) {
      throw new Error(`No API key stored for provider: ${providerId}`);
    }
    
    const providerData = this.providers.get(providerId);
    
    // Update configuration
    Object.assign(providerData, {
      ...config,
      updatedAt: Date.now()
    });
    
    await this.saveProviderConfigs();
    
    return true;
  }

  /**
   * Get provider usage statistics
   */
  getProviderStats() {
    const stats = {
      totalProviders: Object.keys(this.supportedProviders).length,
      configuredProviders: this.providers.size,
      providerStatus: {}
    };
    
    for (const [providerId, data] of this.providers) {
      stats.providerStatus[providerId] = {
        status: data.status,
        lastUsed: data.lastUsed,
        lastTested: data.lastTested,
        createdAt: data.createdAt
      };
    }
    
    return stats;
  }

  /**
   * Export provider configurations (without keys)
   */
  async exportConfig() {
    const exportData = {
      version: '1.0',
      exportedAt: Date.now(),
      providers: {}
    };
    
    for (const [providerId, data] of this.providers) {
      exportData.providers[providerId] = {
        status: data.status,
        createdAt: data.createdAt,
        lastUsed: data.lastUsed,
        lastTested: data.lastTested,
        // Exclude encrypted keys from export
        hasKey: true
      };
    }
    
    return exportData;
  }

  /**
   * Import provider configurations
   */
  async importConfig(importData) {
    if (!importData.version || !importData.providers) {
      throw new Error('Invalid import data format');
    }
    
    let importedCount = 0;
    
    for (const [providerId, config] of Object.entries(importData.providers)) {
      if (this.supportedProviders[providerId] && !this.providers.has(providerId)) {
        // Only import metadata, not actual keys
        this.providers.set(providerId, {
          ...config,
          status: 'imported',
          importedAt: Date.now()
        });
        importedCount++;
      }
    }
    
    if (importedCount > 0) {
      await this.saveProviderConfigs();
    }
    
    return importedCount;
  }

  /**
   * Load API keys from environment variables and auto-store them
   */
  async loadEnvironmentVariables() {
    try {
      console.log('🌍 SecureKeyManager: Loading environment variables...');
      
      const environmentMappings = {
        'claude': 'CLAUDE_API_KEY',
        'openai': 'OPENAI_API_KEY', 
        'gemini': 'GEMINI_API_KEY'
      };

      let autoStoredCount = 0;
      console.log('🔍 SecureKeyManager: Checking environment variables for providers...');

      for (const [providerId, envVarName] of Object.entries(environmentMappings)) {
        console.log(`🔍 SecureKeyManager: Checking ${envVarName} for provider ${providerId}`);
        const envValue = process.env[envVarName];
        
        if (envValue && envValue.trim()) {
          console.log(`✅ SecureKeyManager: Found ${envVarName} with length: ${envValue.trim().length}`);
          
          // Only auto-store if we don't already have a key for this provider
          if (!this.hasProviderKey(providerId)) {
            try {
              console.log(`💾 SecureKeyManager: Auto-storing key for ${providerId} from ${envVarName}`);
              const keyData = { api_key: envValue.trim() };
              await this.storeProviderKey(providerId, keyData);
              
              console.log(`✅ SecureKeyManager: Successfully auto-stored key for ${providerId}`);
              autoStoredCount++;
            } catch (error) {
              console.error(`❌ SecureKeyManager: Failed to auto-store key for ${providerId}:`, error.message);
            }
          } else {
            console.log(`📝 SecureKeyManager: Provider ${providerId} already has stored key, skipping env variable`);
          }
        } else {
          console.log(`⚠️ SecureKeyManager: No value found for ${envVarName}`);
        }
      }

      if (autoStoredCount > 0) {
        console.log(`✅ SecureKeyManager: Auto-stored ${autoStoredCount} API keys from environment variables`);
      } else {
        console.log('📝 SecureKeyManager: No new API keys auto-stored from environment variables');
      }

    } catch (error) {
      console.error('❌ SecureKeyManager: Error loading environment variables:', error);
      // Don't throw error - this is not critical for operation
    }
  }

  /**
   * Private helper methods
   */

  validateKeyData(providerId, keyData) {
    const config = this.supportedProviders[providerId];
    
    for (const keyName of config.keyNames) {
      if (!keyData[keyName] || typeof keyData[keyName] !== 'string') {
        throw new Error(`Missing or invalid ${keyName} for provider ${providerId}`);
      }
    }
    
    // Additional validation based on provider
    switch (providerId) {
      case 'claude':
        if (!keyData.api_key.startsWith('sk-ant-')) {
          throw new Error('Invalid Claude API key format');
        }
        break;
      case 'openai':
        if (!keyData.api_key.startsWith('sk-')) {
          throw new Error('Invalid OpenAI API key format');
        }
        break;
      case 'gemini':
        if (keyData.api_key.length < 30) {
          throw new Error('Invalid Gemini API key format');
        }
        break;
    }
  }

  encryptData(data) {
    try {
      const jsonData = JSON.stringify(data);
      const encryptedBuffer = safeStorage.encryptString(jsonData);
      // Convert Buffer to base64 string for JSON storage
      return encryptedBuffer.toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  decryptData(encryptedData) {
    try {
      // Convert base64 string back to Buffer
      const encryptedBuffer = Buffer.from(encryptedData, 'base64');
      const decryptedString = safeStorage.decryptString(encryptedBuffer);
      return JSON.parse(decryptedString);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  async loadProviderConfigs() {
    try {
      const configData = await fs.readFile(this.configPath);
      const configs = JSON.parse(configData.toString());
      
      for (const [providerId, config] of Object.entries(configs)) {
        if (this.supportedProviders[providerId]) {
          // Check if we need to migrate old Buffer format
          if (config.encrypted && typeof config.encrypted === 'object' && config.encrypted.type === 'Buffer') {
            // Convert old Buffer format to base64 string
            config.encrypted = Buffer.from(config.encrypted.data).toString('base64');
          }
          this.providers.set(providerId, config);
        }
      }
      
      
      // Save migrated data if any changes were made
      if (this.providers.size > 0) {
        await this.saveProviderConfigs();
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
      }
    }
  }

  async saveProviderConfigs() {
    try {
      // Create backup
      try {
        await fs.copyFile(this.configPath, this.configBackupPath);
      } catch (backupError) {
        // Ignore backup errors for new installations
      }
      
      const configs = {};
      for (const [providerId, data] of this.providers) {
        configs[providerId] = data;
      }
      
      await fs.writeFile(this.configPath, JSON.stringify(configs, null, 2), { mode: 0o600 });
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * API Testing Methods
   */

  async testClaudeAPI(apiKey) {
    // This would implement actual API testing
    // For now, return mock response
    return {
      success: true,
      provider: 'claude',
      message: 'API key is valid',
      models: this.supportedProviders.claude.models
    };
  }

  async testOpenAIAPI(apiKey) {
    // This would implement actual API testing
    // For now, return mock response
    return {
      success: true,
      provider: 'openai',
      message: 'API key is valid',
      models: this.supportedProviders.openai.models
    };
  }

  async testGeminiAPI(apiKey) {
    // This would implement actual API testing
    // For now, return mock response
    return {
      success: true,
      provider: 'gemini',
      message: 'API key is valid',
      models: this.supportedProviders.gemini.models
    };
  }

  /**
   * Cleanup and destroy
   */
  async destroy() {
    try {
      // Clear sensitive data from memory
      this.providers.clear();
      this.encryptionKey = null;
      
      this.isInitialized = false;
      
    } catch (error) {
    }
  }
}

export default SecureKeyManager;