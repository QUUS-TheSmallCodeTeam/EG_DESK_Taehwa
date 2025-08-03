/**
 * AI Integration Module - LangChain Based
 * 
 * Handles AI communication through LangChain multi-provider system
 * for content generation, blog automation, and intelligent task execution.
 */

// Simple EventEmitter implementation for browser compatibility
class SimpleEventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  emit(event, ...args) {
    if (!this.events[event]) {
      return false;
    }
    this.events[event].forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error('EventEmitter listener error:', error);
      }
    });
    return true;
  }

  removeListener(event, listener) {
    if (!this.events[event]) {
      return this;
    }
    this.events[event] = this.events[event].filter(l => l !== listener);
    return this;
  }

  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
    return this;
  }
}

class ClaudeIntegration extends SimpleEventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      timeout: options.timeout || 30000,
      maxRetries: options.maxRetries || 3,
      defaultProvider: options.defaultProvider || 'openai',
      ...options
    };
    
    this.isInitialized = false;
    this.currentSession = null;
    this.requestQueue = [];
    this.isProcessing = false;
    this.providerStatus = null;
  }

  /**
   * Initialize AI integration with LangChain
   */
  async initialize() {
    try {
      console.log('[AIIntegration] Initializing LangChain AI integration...');
      
      // Check if electronAPI is available
      if (!window.electronAPI?.langchainGetProviders) {
        throw new Error('LangChain integration not available in main process');
      }
      
      // Get available providers and current status
      await this.checkSystemRequirements();
      
      // Test connection if possible
      try {
        await this.testConnection();
        console.log('[AIIntegration] Connection test passed');
      } catch (testError) {
        console.warn('[AIIntegration] Connection test failed, but continuing:', testError.message);
        // Don't fail initialization if connection test fails
      }
      
      this.isInitialized = true;
      console.log('[AIIntegration] Successfully initialized');
      this.emit('initialized');
      
      return true;
    } catch (error) {
      console.error('[AIIntegration] Initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Check system requirements and available providers
   */
  async checkSystemRequirements() {
    try {
      console.log('[AIIntegration] Checking available AI providers...');
      
      // Get available providers
      const providers = await window.electronAPI.langchainGetProviders();
      
      // Get current provider status
      const status = await window.electronAPI.langchainGetCurrentStatus();
      
      // Store system information
      this.systemInfo = {
        availableProviders: providers,
        currentProvider: status.provider,
        currentModel: status.model,
        status: status.status,
        isConfigured: status.status === 'connected',
        lastChecked: Date.now()
      };
      
      console.log('[AIIntegration] System requirements check:', this.systemInfo);
      
      // Emit system status
      this.emit('system-status', this.systemInfo);
      
      // Warn about missing requirements but don't fail
      if (!this.systemInfo.isConfigured) {
        console.warn('[AIIntegration] No AI provider is currently configured');
        this.emit('configuration-warning', {
          message: 'No AI provider configured. Please set up API keys in settings.',
          suggestions: [
            'Configure OpenAI API key',
            'Configure Anthropic API key', 
            'Configure other supported providers'
          ]
        });
      }
      
      return this.systemInfo;
    } catch (error) {
      console.error('[AIIntegration] System requirements check failed:', error);
      // Don't throw error, just warn and continue
      this.systemInfo = {
        availableProviders: [],
        currentProvider: null,
        isConfigured: false,
        error: error.message,
        lastChecked: Date.now()
      };
      
      this.emit('system-status', this.systemInfo);
      return this.systemInfo;
    }
  }

  /**
   * Test AI connection
   */
  async testConnection() {
    const testPrompt = "안녕하세요! 연결 테스트입니다. '연결됨'이라고 간단히 답해주세요.";
    
    try {
      const response = await this.sendMessage(testPrompt, {
        timeout: 10000,
        skipQueue: true
      });
      
      console.log('[AIIntegration] Connection test successful:', response);
      return true;
    } catch (error) {
      console.error('[AIIntegration] Connection test failed:', error);
      throw new Error(`AI connection failed: ${error.message}`);
    }
  }

  /**
   * Send message to AI through LangChain
   */
  async sendMessage(prompt, options = {}) {
    if (!this.isInitialized && !options.skipQueue) {
      throw new Error('AI integration not initialized');
    }

    const request = {
      id: Date.now() + Math.random(),
      prompt,
      options: {
        systemPrompt: options.systemPrompt || null,
        context: options.context || null,
        timeout: options.timeout || this.options.timeout,
        ...options
      },
      timestamp: Date.now()
    };

    // Add to queue if not skipping
    if (!options.skipQueue) {
      return this.addToQueue(request);
    }

    return this.executeRequest(request);
  }

  /**
   * Stream message to AI through LangChain
   */
  async streamMessage(prompt, options = {}, onChunk = null) {
    if (!this.isInitialized) {
      throw new Error('AI integration not initialized');
    }

    try {
      const request = {
        message: prompt,
        conversationHistory: options.conversationHistory || [],
        systemPrompt: options.systemPrompt || null
      };

      // Set up streaming event listener if callback provided
      if (onChunk) {
        const streamHandler = (event, data) => {
          if (data.chunk) {
            onChunk(data.chunk);
          }
        };
        window.electronAPI.onLangChainStreamChunk(streamHandler);
      }

      const response = await window.electronAPI.langchainStreamMessage(request);

      if (!response.success) {
        throw new Error(response.error || 'AI stream request failed');
      }

      return {
        id: Date.now(),
        content: response.content || '',
        provider: response.provider,
        model: response.model,
        timestamp: Date.now(),
        streamed: true
      };

    } catch (error) {
      console.error('[AIIntegration] Stream request failed:', error);
      throw error;
    }
  }

  /**
   * Add request to processing queue
   */
  async addToQueue(request) {
    return new Promise((resolve, reject) => {
      request.resolve = resolve;
      request.reject = reject;
      
      this.requestQueue.push(request);
      this.processQueue();
    });
  }

  /**
   * Process request queue
   */
  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      
      try {
        console.log(`[AIIntegration] Processing request: ${request.id}`);
        const result = await this.executeRequest(request);
        request.resolve(result);
      } catch (error) {
        console.error(`[AIIntegration] Request failed: ${request.id}`, error);
        request.reject(error);
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.isProcessing = false;
  }

  /**
   * Execute individual request through LangChain
   */
  async executeRequest(request) {
    const { prompt, options } = request;
    
    try {
      this.emit('request-started', { id: request.id, prompt: prompt.substring(0, 100) + '...' });
      
      // Check if system is configured before making request
      if (!this.systemInfo?.isConfigured) {
        // Try to refresh system status
        await this.checkSystemRequirements();
        
        if (!this.systemInfo?.isConfigured) {
          throw new Error('No AI provider is configured. Please configure API keys in settings.');
        }
      }
      
      // Call LangChain service
      const response = await window.electronAPI.langchainSendMessage({
        message: prompt,
        conversationHistory: options.conversationHistory || [],
        systemPrompt: options.systemPrompt
      });

      if (!response.success) {
        throw new Error(response.error || 'AI request failed');
      }

      const result = {
        id: request.id,
        content: response.content || response.message || '',
        provider: response.provider,
        model: response.model,
        tokens: response.metadata?.tokens || null,
        timestamp: Date.now(),
        cost: response.metadata?.cost || null
      };

      console.log(`[AIIntegration] Request completed: ${request.id}`);
      this.emit('response-received', result);
      
      return result;

    } catch (error) {
      console.error(`[AIIntegration] Request execution failed:`, error);
      this.emit('request-failed', { id: request.id, error: error.message });
      throw error;
    }
  }

  /**
   * Switch AI provider
   */
  async switchProvider(providerId, modelId = null) {
    try {
      console.log(`[AIIntegration] Switching to provider: ${providerId}, model: ${modelId}`);
      
      const response = await window.electronAPI.langchainSwitchProvider({
        providerId,
        modelId
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to switch provider');
      }

      // Refresh system info after switching
      await this.checkSystemRequirements();
      
      console.log('[AIIntegration] Provider switched successfully');
      this.emit('provider-switched', { providerId, modelId });
      
      return response;
    } catch (error) {
      console.error('[AIIntegration] Failed to switch provider:', error);
      throw error;
    }
  }

  /**
   * Get available providers
   */
  async getAvailableProviders() {
    try {
      return await window.electronAPI.langchainGetProviders();
    } catch (error) {
      console.error('[AIIntegration] Failed to get providers:', error);
      return [];
    }
  }

  /**
   * Get current status
   */
  async getCurrentStatus() {
    try {
      return await window.electronAPI.langchainGetCurrentStatus();
    } catch (error) {
      console.error('[AIIntegration] Failed to get current status:', error);
      return {
        provider: null,
        model: null,
        status: 'disconnected'
      };
    }
  }

  /**
   * Generate blog content with industry-specific knowledge
   */
  async generateBlogContent(topic, options = {}) {
    const industryContext = options.industryContext || '전기센서 및 로고스키 코일 기술';
    const targetKeywords = options.targetKeywords || [];
    const tone = options.tone || 'professional';
    const wordCount = options.wordCount || 800;

    const prompt = `
다음 주제로 ${industryContext} 분야의 전문적인 블로그 글을 작성해 주세요:

주제: ${topic}

요구사항:
- 글 길이: 약 ${wordCount}자
- 어투: ${tone === 'professional' ? '전문적이고 신뢰감 있는' : tone}
- SEO 키워드: ${targetKeywords.join(', ')}
- 한국어로 작성
- 기술적 정확성 중시
- 실용적 정보 포함

구조:
1. 흥미로운 도입부
2. 주요 내용 (기술적 설명, 장점, 적용 분야)
3. 실제 사례나 예시
4. 결론 및 향후 전망

HTML 형식으로 작성하되, <article> 태그로 감싸주세요.
`;

    try {
      const response = await this.sendMessage(prompt, {
        systemPrompt: '당신은 전문적인 기술 블로그 작성자입니다. 정확하고 유용한 정보를 제공하며, SEO에 최적화된 콘텐츠를 작성합니다.',
        context: 'blog-generation'
      });

      return {
        title: this.extractTitleFromContent(response.content),
        content: response.content,
        keywords: targetKeywords,
        wordCount: this.countWords(response.content),
        metadata: {
          generatedAt: Date.now(),
          topic,
          industryContext,
          tone,
          provider: response.provider,
          model: response.model
        }
      };

    } catch (error) {
      console.error('[AIIntegration] Blog content generation failed:', error);
      throw error;
    }
  }

  /**
   * Optimize content for SEO
   */
  async optimizeForSEO(content, targetKeywords = [], options = {}) {
    const prompt = `
다음 블로그 콘텐츠를 한국어 SEO에 최적화해 주세요:

원본 콘텐츠:
${content}

타겟 키워드: ${targetKeywords.join(', ')}

SEO 최적화 요구사항:
- 메타 설명 (150자 이내)
- 제목 최적화 (60자 이내)
- 키워드 밀도 최적화 (자연스럽게)
- H1, H2, H3 태그 구조 개선
- 내부 링크 제안
- 이미지 alt 텍스트 제안

최적화된 HTML과 SEO 메타데이터를 JSON 형식으로 제공해 주세요.
`;

    try {
      const response = await this.sendMessage(prompt, {
        systemPrompt: '당신은 SEO 전문가입니다. 한국어 검색 최적화에 특화된 조언을 제공합니다.',
        context: 'seo-optimization'
      });

      return {
        optimizedContent: response.content,
        seoData: {
          metaTitle: '', // Will be extracted from response
          metaDescription: '', // Will be extracted from response
          keywords: targetKeywords,
          optimizedAt: Date.now()
        }
      };

    } catch (error) {
      console.error('[AIIntegration] SEO optimization failed:', error);
      throw error;
    }
  }

  /**
   * Analyze website content
   */
  async analyzeWebsiteContent(htmlContent, url, options = {}) {
    const prompt = `
다음 웹사이트 콘텐츠를 분석해 주세요:

URL: ${url}
HTML 콘텐츠: ${htmlContent.substring(0, 10000)}...

분석 요청:
1. SEO 상태 평가
2. 콘텐츠 품질 평가
3. 개선 제안사항
4. 키워드 분석
5. 구조적 문제점

JSON 형식으로 상세한 분석 결과를 제공해 주세요.
`;

    try {
      const response = await this.sendMessage(prompt, {
        systemPrompt: '당신은 웹 콘텐츠 분석 전문가입니다. SEO, 사용성, 콘텐츠 품질을 종합적으로 평가합니다.',
        context: 'content-analysis'
      });

      return {
        analysis: response.content,
        url,
        analyzedAt: Date.now(),
        suggestions: [] // Will be extracted from response
      };

    } catch (error) {
      console.error('[AIIntegration] Website analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generate WordPress post data
   */
  async generateWordPressPost(content, options = {}) {
    const prompt = `
다음 콘텐츠를 WordPress 게시물 형태로 변환해 주세요:

콘텐츠: ${content}

WordPress 형식 요구사항:
- 제목 최적화
- 카테고리 제안
- 태그 제안
- 발췌문 생성
- 공개 상태 결정
- SEO 친화적 슬러그 생성

JSON 형식으로 WordPress REST API에 적합한 형태로 제공해 주세요.
`;

    try {
      const response = await this.sendMessage(prompt, {
        systemPrompt: '당신은 WordPress 콘텐츠 관리 전문가입니다. SEO와 사용자 경험을 고려한 게시물을 생성합니다.',
        context: 'wordpress-generation'
      });

      return {
        postData: response.content, // Should be parsed as JSON
        generatedAt: Date.now()
      };

    } catch (error) {
      console.error('[AIIntegration] WordPress post generation failed:', error);
      throw error;
    }
  }

  /**
   * Extract title from generated content
   */
  extractTitleFromContent(content) {
    const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i) || 
                      content.match(/<title[^>]*>(.*?)<\/title>/i) ||
                      content.match(/^#\s*(.+)/m);
    
    return titleMatch ? titleMatch[1].trim() : '생성된 블로그 글';
  }

  /**
   * Count words in content
   */
  countWords(content) {
    // Remove HTML tags and count Korean words
    const textOnly = content.replace(/<[^>]*>/g, '');
    return textOnly.trim().length; // For Korean, character count is more meaningful
  }

  /**
   * Get current session info
   */
  getSessionInfo() {
    return {
      isInitialized: this.isInitialized,
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing,
      currentProvider: this.systemInfo?.currentProvider || null,
      currentModel: this.systemInfo?.currentModel || null
    };
  }

  /**
   * Clear request queue
   */
  clearQueue() {
    this.requestQueue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.requestQueue = [];
    console.log('[AIIntegration] Request queue cleared');
  }

  /**
   * Destroy AI integration
   */
  destroy() {
    this.clearQueue();
    this.isInitialized = false;
    this.currentSession = null;
    this.removeAllListeners();
    console.log('[AIIntegration] Destroyed');
  }
}

export default ClaudeIntegration;