/**
 * ClaudeIntegration - Claude AI Integration Module
 * 
 * Handles communication with Claude AI for content generation,
 * blog automation, and intelligent task execution.
 * As specified in PRD: AI-Agent-System/ClaudeCodeIntegration.js
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
      model: options.model || 'claude-3-sonnet-20240229',
      ...options
    };
    
    this.isInitialized = false;
    this.currentSession = null;
    this.requestQueue = [];
    this.isProcessing = false;
  }

  /**
   * Initialize Claude integration
   */
  async initialize() {
    try {
      console.log('[ClaudeIntegration] Initializing Claude AI integration...');
      
      // Check if electronAPI is available
      if (!window.electronAPI?.claude) {
        throw new Error('Claude integration not available in main process');
      }
      
      // Test connection
      await this.testConnection();
      
      this.isInitialized = true;
      console.log('[ClaudeIntegration] Successfully initialized');
      this.emit('initialized');
      
      return true;
    } catch (error) {
      console.error('[ClaudeIntegration] Initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Test Claude connection
   */
  async testConnection() {
    const testPrompt = "안녕하세요! 연결 테스트입니다. '연결됨'이라고 간단히 답해주세요.";
    
    try {
      const response = await this.sendMessage(testPrompt, {
        timeout: 10000,
        skipQueue: true
      });
      
      console.log('[ClaudeIntegration] Connection test successful:', response);
      return true;
    } catch (error) {
      console.error('[ClaudeIntegration] Connection test failed:', error);
      throw new Error(`Claude connection failed: ${error.message}`);
    }
  }

  /**
   * Send message to Claude AI
   */
  async sendMessage(prompt, options = {}) {
    if (!this.isInitialized && !options.skipQueue) {
      throw new Error('Claude integration not initialized');
    }

    const request = {
      id: Date.now() + Math.random(),
      prompt,
      options: {
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 4000,
        timeout: options.timeout || this.options.timeout,
        context: options.context || null,
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
        console.log(`[ClaudeIntegration] Processing request: ${request.id}`);
        const result = await this.executeRequest(request);
        request.resolve(result);
      } catch (error) {
        console.error(`[ClaudeIntegration] Request failed: ${request.id}`, error);
        request.reject(error);
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.isProcessing = false;
  }

  /**
   * Execute individual request
   */
  async executeRequest(request) {
    const { prompt, options } = request;
    
    try {
      this.emit('request-started', { id: request.id, prompt: prompt.substring(0, 100) + '...' });
      
      // Call main process Claude integration
      const response = await window.electronAPI.claude.sendMessage({
        prompt,
        options
      });

      if (!response.success) {
        throw new Error(response.error || 'Claude request failed');
      }

      const result = {
        id: request.id,
        content: response.data.content,
        tokens: response.data.tokens || null,
        model: response.data.model || this.options.model,
        timestamp: Date.now()
      };

      console.log(`[ClaudeIntegration] Request completed: ${request.id}`);
      this.emit('response-received', result);
      
      return result;

    } catch (error) {
      console.error(`[ClaudeIntegration] Request execution failed:`, error);
      this.emit('request-failed', { id: request.id, error: error.message });
      throw error;
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
        temperature: 0.7,
        maxTokens: 6000,
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
          model: response.model
        }
      };

    } catch (error) {
      console.error('[ClaudeIntegration] Blog content generation failed:', error);
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
        temperature: 0.5,
        maxTokens: 8000,
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
      console.error('[ClaudeIntegration] SEO optimization failed:', error);
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
        temperature: 0.3,
        maxTokens: 6000,
        context: 'content-analysis'
      });

      return {
        analysis: response.content,
        url,
        analyzedAt: Date.now(),
        suggestions: [] // Will be extracted from response
      };

    } catch (error) {
      console.error('[ClaudeIntegration] Website analysis failed:', error);
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
        temperature: 0.4,
        maxTokens: 4000,
        context: 'wordpress-generation'
      });

      return {
        postData: response.content, // Should be parsed as JSON
        generatedAt: Date.now()
      };

    } catch (error) {
      console.error('[ClaudeIntegration] WordPress post generation failed:', error);
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
      model: this.options.model
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
    console.log('[ClaudeIntegration] Request queue cleared');
  }

  /**
   * Destroy Claude integration
   */
  destroy() {
    this.clearQueue();
    this.isInitialized = false;
    this.currentSession = null;
    this.removeAllListeners();
    console.log('[ClaudeIntegration] Destroyed');
  }
}

export default ClaudeIntegration;
