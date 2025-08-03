/**
 * ContentGenerator - Content Generation Engine
 * 
 * Generates high-quality content using AI and templates.
 * As specified in PRD: Content-System/ContentGenerator.js
 */

import { EventEmitter } from '../../../utils/EventEmitter.js';

class ContentGenerator extends EventEmitter {
  constructor(claudeIntegration, templateManager, options = {}) {
    super();
    
    this.claudeIntegration = claudeIntegration;
    this.templateManager = templateManager;
    this.options = {
      defaultWordCount: options.defaultWordCount || 800,
      defaultTone: options.defaultTone || 'professional',
      industryContext: options.industryContext || '전기센서 및 로고스키 코일 기술',
      ...options
    };
    
    this.isInitialized = false;
    this.generationHistory = [];
  }

  /**
   * Initialize content generator
   */
  async initialize() {
    try {
      
      if (!this.claudeIntegration?.isInitialized) {
        throw new Error('Claude integration not initialized');
      }
      
      this.isInitialized = true;
      this.emit('initialized');
      
      return true;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Generate blog content
   */
  async generateBlogContent(request) {
    if (!this.isInitialized) {
      throw new Error('ContentGenerator not initialized');
    }

    const generationId = this.generateId();
    
    try {
      this.emit('generation-started', { id: generationId, type: 'blog', request });
      
      const options = {
        industryContext: request.industryContext || this.options.industryContext,
        targetKeywords: request.keywords || [],
        tone: request.tone || this.options.defaultTone,
        wordCount: request.wordCount || this.options.defaultWordCount,
        template: request.template || 'default'
      };

      // Use template if specified
      let prompt;
      if (options.template && this.templateManager) {
        prompt = await this.templateManager.generatePrompt(options.template, {
          topic: request.topic,
          ...options
        });
      } else {
        prompt = this.createBlogPrompt(request.topic, options);
      }

      const response = await this.claudeIntegration.sendMessage(prompt, {
        temperature: 0.7,
        maxTokens: Math.max(options.wordCount * 2, 4000),
        context: 'content-generation'
      });

      const result = {
        id: generationId,
        type: 'blog',
        title: this.extractTitle(response.content),
        content: response.content,
        metadata: {
          topic: request.topic,
          wordCount: this.countWords(response.content),
          keywords: options.targetKeywords,
          tone: options.tone,
          generatedAt: Date.now(),
          model: response.model
        }
      };

      this.generationHistory.push(result);
      
      this.emit('generation-completed', result);
      
      return result;

    } catch (error) {
      this.emit('generation-failed', { id: generationId, error: error.message });
      throw error;
    }
  }

  /**
   * Generate SEO-optimized content
   */
  async generateSEOContent(request) {
    if (!this.isInitialized) {
      throw new Error('ContentGenerator not initialized');
    }

    const generationId = this.generateId();
    
    try {
      this.emit('generation-started', { id: generationId, type: 'seo', request });

      const prompt = this.createSEOPrompt(request.topic, {
        primaryKeyword: request.primaryKeyword,
        secondaryKeywords: request.secondaryKeywords || [],
        targetAudience: request.targetAudience || '전기 엔지니어 및 기술자',
        contentType: request.contentType || 'blog',
        wordCount: request.wordCount || this.options.defaultWordCount
      });

      const response = await this.claudeIntegration.sendMessage(prompt, {
        temperature: 0.6,
        maxTokens: Math.max(request.wordCount * 2, 6000),
        context: 'seo-content-generation'
      });

      const result = {
        id: generationId,
        type: 'seo-content',
        title: this.extractTitle(response.content),
        content: response.content,
        metadata: {
          topic: request.topic,
          primaryKeyword: request.primaryKeyword,
          secondaryKeywords: request.secondaryKeywords || [],
          wordCount: this.countWords(response.content),
          generatedAt: Date.now(),
          model: response.model
        }
      };

      this.generationHistory.push(result);
      
      this.emit('generation-completed', result);
      
      return result;

    } catch (error) {
      this.emit('generation-failed', { id: generationId, error: error.message });
      throw error;
    }
  }

  /**
   * Generate product description
   */
  async generateProductDescription(product) {
    if (!this.isInitialized) {
      throw new Error('ContentGenerator not initialized');
    }

    const generationId = this.generateId();
    
    try {
      this.emit('generation-started', { id: generationId, type: 'product-description', product });

      const prompt = `
다음 제품에 대한 전문적이고 매력적인 제품 설명을 작성해 주세요:

제품명: ${product.name}
카테고리: ${product.category || '전기센서'}
주요 특징: ${(product.features || []).join(', ')}
기술 사양: ${product.specifications || ''}
적용 분야: ${product.applications || ''}

요구사항:
- 기술적 정확성 중시
- 고객의 관심을 끄는 매력적인 표현
- 경쟁사와의 차별점 강조
- SEO 친화적 구조
- HTML 형식으로 작성

구조:
1. 제품 개요 (2-3줄)
2. 주요 특징 및 장점
3. 기술 사양
4. 적용 분야 및 사례
5. 구매 포인트
`;

      const response = await this.claudeIntegration.sendMessage(prompt, {
        temperature: 0.6,
        maxTokens: 3000,
        context: 'product-description'
      });

      const result = {
        id: generationId,
        type: 'product-description',
        productName: product.name,
        content: response.content,
        metadata: {
          product: product,
          wordCount: this.countWords(response.content),
          generatedAt: Date.now(),
          model: response.model
        }
      };

      this.generationHistory.push(result);
      
      this.emit('generation-completed', result);
      
      return result;

    } catch (error) {
      this.emit('generation-failed', { id: generationId, error: error.message });
      throw error;
    }
  }

  /**
   * Generate technical documentation
   */
  async generateTechnicalDoc(request) {
    if (!this.isInitialized) {
      throw new Error('ContentGenerator not initialized');
    }

    const generationId = this.generateId();
    
    try {
      this.emit('generation-started', { id: generationId, type: 'technical-doc', request });

      const prompt = `
다음 주제에 대한 기술 문서를 작성해 주세요:

제목: ${request.title}
문서 유형: ${request.docType || '기술 가이드'}
대상 독자: ${request.audience || '기술자 및 엔지니어'}
세부 내용: ${request.details || ''}

요구사항:
- 정확하고 상세한 기술적 설명
- 단계별 절차 포함
- 주의사항 및 안전 지침
- 도표나 그림 설명 포함
- 참고 자료 및 관련 표준

구조:
1. 개요 및 목적
2. 필요 장비/도구
3. 단계별 절차
4. 주의사항
5. 문제 해결
6. 관련 자료
`;

      const response = await this.claudeIntegration.sendMessage(prompt, {
        temperature: 0.4,
        maxTokens: 8000,
        context: 'technical-documentation'
      });

      const result = {
        id: generationId,
        type: 'technical-doc',
        title: request.title,
        content: response.content,
        metadata: {
          docType: request.docType,
          audience: request.audience,
          wordCount: this.countWords(response.content),
          generatedAt: Date.now(),
          model: response.model
        }
      };

      this.generationHistory.push(result);
      
      this.emit('generation-completed', result);
      
      return result;

    } catch (error) {
      this.emit('generation-failed', { id: generationId, error: error.message });
      throw error;
    }
  }

  /**
   * Create blog content prompt
   */
  createBlogPrompt(topic, options) {
    return `
다음 주제로 ${options.industryContext} 분야의 전문적인 블로그 글을 작성해 주세요:

주제: ${topic}

요구사항:
- 글 길이: 약 ${options.wordCount}자
- 어투: ${options.tone === 'professional' ? '전문적이고 신뢰감 있는' : options.tone}
- SEO 키워드: ${options.targetKeywords.join(', ')}
- 한국어로 작성
- 기술적 정확성 중시
- 실용적 정보 포함

구조:
1. 흥미로운 도입부
2. 주요 내용 (기술적 설명, 장점, 적용 분야)
3. 실제 사례나 예시
4. 결론 및 향후 전망

HTML 형식으로 작성하되, <article> 태그로 감싸주세요.
메타 정보도 함께 제공해 주세요.
`;
  }

  /**
   * Create SEO-optimized content prompt
   */
  createSEOPrompt(topic, options) {
    return `
다음 주제로 SEO에 최적화된 콘텐츠를 작성해 주세요:

주제: ${topic}
주요 키워드: ${options.primaryKeyword}
보조 키워드: ${options.secondaryKeywords.join(', ')}
대상 독자: ${options.targetAudience}
콘텐츠 유형: ${options.contentType}
목표 글 길이: ${options.wordCount}자

SEO 최적화 요구사항:
- 제목에 주요 키워드 포함 (60자 이내)
- 메타 설명 생성 (150자 이내)
- H1, H2, H3 태그 구조화
- 키워드 밀도 2-3% 유지 (자연스럽게)
- 내부 링크 제안
- 이미지 alt 텍스트 제안
- FAQ 섹션 포함

구조:
1. SEO 친화적 제목
2. 매력적인 도입부
3. 주요 콘텐츠 (키워드 포함)
4. FAQ 섹션
5. 결론 및 CTA

HTML 형식으로 작성하고, SEO 메타데이터를 별도로 제공해 주세요.
`;
  }

  /**
   * Extract title from content
   */
  extractTitle(content) {
    const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i) || 
                      content.match(/<title[^>]*>(.*?)<\/title>/i) ||
                      content.match(/^#\s*(.+)/m);
    
    return titleMatch ? titleMatch[1].trim() : '생성된 콘텐츠';
  }

  /**
   * Count words in content
   */
  countWords(content) {
    const textOnly = content.replace(/<[^>]*>/g, '');
    return textOnly.trim().length;
  }

  /**
   * Get generation history
   */
  getGenerationHistory(limit = 20) {
    return this.generationHistory
      .slice(-limit)
      .sort((a, b) => b.metadata.generatedAt - a.metadata.generatedAt);
  }

  /**
   * Get generation statistics
   */
  getGenerationStats() {
    const stats = {
      totalGenerations: this.generationHistory.length,
      byType: {},
      averageWordCount: 0,
      totalWords: 0,
      recentGenerations: this.generationHistory.slice(-10).length
    };

    this.generationHistory.forEach(item => {
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
      stats.totalWords += item.metadata.wordCount || 0;
    });

    if (stats.totalGenerations > 0) {
      stats.averageWordCount = Math.round(stats.totalWords / stats.totalGenerations);
    }

    return stats;
  }

  /**
   * Clear generation history
   */
  clearHistory() {
    this.generationHistory = [];
    this.emit('history-cleared');
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `gen_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Destroy content generator
   */
  destroy() {
    this.generationHistory = [];
    this.isInitialized = false;
    this.removeAllListeners();
  }
}

export default ContentGenerator;
