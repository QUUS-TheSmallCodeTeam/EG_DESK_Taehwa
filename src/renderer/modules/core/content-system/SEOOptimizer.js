/**
 * SEOOptimizer - Korean SEO Optimization Module
 * 
 * Optimizes content for Korean search engines and SEO best practices.
 * As specified in PRD: Content-System/SEOOptimizer.js
 */

import { EventEmitter } from '../../../utils/EventEmitter.js';

class SEOOptimizer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      targetKeywordDensity: options.targetKeywordDensity || 0.025, // 2.5%
      maxKeywordDensity: options.maxKeywordDensity || 0.035, // 3.5%
      titleMaxLength: options.titleMaxLength || 60,
      descriptionMaxLength: options.descriptionMaxLength || 150,
      ...options
    };
    
    this.isInitialized = false;
    this.koreanStopWords = new Set([
      '그리고', '그러나', '또한', '하지만', '따라서', '그래서', '이것은', '그것은',
      '이런', '그런', '어떤', '무엇', '어떻게', '왜', '언제', '어디서', '누가',
      '것이다', '것입니다', '입니다', '있다', '없다', '한다', '합니다'
    ]);
  }

  /**
   * Initialize SEO optimizer
   */
  async initialize() {
    try {
      
      this.isInitialized = true;
      this.emit('initialized');
      
      return true;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Optimize content for SEO
   */
  async optimizeContent(content, options = {}) {
    if (!this.isInitialized) {
      throw new Error('SEOOptimizer not initialized');
    }

    const optimizationId = this.generateId();
    
    try {
      this.emit('optimization-started', { id: optimizationId, content: content.substring(0, 100) + '...' });

      const analysis = this.analyzeContent(content, options);
      const recommendations = this.generateRecommendations(analysis, options);
      const optimizedContent = await this.applyOptimizations(content, recommendations, options);

      const result = {
        id: optimizationId,
        originalContent: content,
        optimizedContent,
        analysis,
        recommendations,
        seoScore: this.calculateSEOScore(analysis, options),
        optimizedAt: Date.now()
      };

      this.emit('optimization-completed', result);
      
      return result;

    } catch (error) {
      this.emit('optimization-failed', { id: optimizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Analyze content for SEO factors
   */
  analyzeContent(content, options = {}) {
    const textContent = this.stripHTML(content);
    const targetKeywords = options.targetKeywords || [];
    
    const analysis = {
      wordCount: this.countWords(textContent),
      characterCount: textContent.length,
      title: this.extractTitle(content),
      headings: this.extractHeadings(content),
      keywords: this.analyzeKeywords(textContent, targetKeywords),
      readability: this.analyzeReadability(textContent),
      structure: this.analyzeStructure(content),
      meta: this.analyzeMeta(content),
      internalLinks: this.analyzeInternalLinks(content),
      images: this.analyzeImages(content)
    };

    return analysis;
  }

  /**
   * Generate SEO recommendations
   */
  generateRecommendations(analysis, options = {}) {
    const recommendations = [];
    const targetKeywords = options.targetKeywords || [];
    
    // Title optimization
    if (!analysis.title) {
      recommendations.push({
        type: 'title',
        priority: 'high',
        message: 'H1 태그가 없습니다. SEO를 위해 명확한 제목을 추가하세요.',
        fix: 'add_h1_tag'
      });
    } else if (analysis.title.length > this.options.titleMaxLength) {
      recommendations.push({
        type: 'title',
        priority: 'medium',
        message: `제목이 ${this.options.titleMaxLength}자를 초과합니다. (현재: ${analysis.title.length}자)`,
        fix: 'shorten_title'
      });
    }

    // Keyword density optimization
    targetKeywords.forEach(keyword => {
      const keywordData = analysis.keywords.find(k => k.word === keyword);
      if (!keywordData) {
        recommendations.push({
          type: 'keyword',
          priority: 'high',
          message: `타겟 키워드 "${keyword}"가 콘텐츠에 포함되지 않았습니다.`,
          fix: 'add_keyword',
          keyword
        });
      } else if (keywordData.density < this.options.targetKeywordDensity) {
        recommendations.push({
          type: 'keyword',
          priority: 'medium',
          message: `키워드 "${keyword}"의 밀도가 낮습니다. (현재: ${(keywordData.density * 100).toFixed(1)}%)`,
          fix: 'increase_keyword_density',
          keyword
        });
      } else if (keywordData.density > this.options.maxKeywordDensity) {
        recommendations.push({
          type: 'keyword',
          priority: 'medium',
          message: `키워드 "${keyword}"의 밀도가 너무 높습니다. (현재: ${(keywordData.density * 100).toFixed(1)}%)`,
          fix: 'decrease_keyword_density',
          keyword
        });
      }
    });

    // Heading structure
    if (analysis.headings.h2.length === 0) {
      recommendations.push({
        type: 'structure',
        priority: 'medium',
        message: 'H2 태그가 없습니다. 콘텐츠 구조를 개선하기 위해 부제목을 추가하세요.',
        fix: 'add_h2_tags'
      });
    }

    // Content length
    if (analysis.wordCount < 300) {
      recommendations.push({
        type: 'content',
        priority: 'high',
        message: `콘텐츠가 너무 짧습니다. (현재: ${analysis.wordCount}자) SEO를 위해 최소 300자 이상 작성하세요.`,
        fix: 'expand_content'
      });
    }

    // Meta description
    if (!analysis.meta.description) {
      recommendations.push({
        type: 'meta',
        priority: 'high',
        message: '메타 설명이 없습니다. 검색 결과에 표시될 설명을 추가하세요.',
        fix: 'add_meta_description'
      });
    }

    // Images without alt text
    if (analysis.images.withoutAlt > 0) {
      recommendations.push({
        type: 'accessibility',
        priority: 'medium',
        message: `${analysis.images.withoutAlt}개의 이미지에 alt 텍스트가 없습니다.`,
        fix: 'add_alt_text'
      });
    }

    return recommendations;
  }

  /**
   * Apply SEO optimizations to content
   */
  async applyOptimizations(content, recommendations, options = {}) {
    let optimizedContent = content;
    const targetKeywords = options.targetKeywords || [];

    for (const recommendation of recommendations) {
      switch (recommendation.fix) {
        case 'add_h1_tag':
          if (!this.extractTitle(optimizedContent)) {
            const title = options.suggestedTitle || '제목을 입력하세요';
            optimizedContent = `<h1>${title}</h1>\n\n${optimizedContent}`;
          }
          break;

        case 'add_h2_tags':
          // Add H2 tags to structure content
          optimizedContent = this.addH2Tags(optimizedContent);
          break;

        case 'add_meta_description':
          if (options.suggestedDescription) {
            const metaTag = `<meta name="description" content="${options.suggestedDescription}">`;
            optimizedContent = `${metaTag}\n${optimizedContent}`;
          }
          break;

        case 'add_keyword':
          if (recommendation.keyword) {
            optimizedContent = this.addKeywordNaturally(optimizedContent, recommendation.keyword);
          }
          break;
      }
    }

    return optimizedContent;
  }

  /**
   * Calculate SEO score based on analysis
   */
  calculateSEOScore(analysis, options = {}) {
    let score = 0;
    let maxScore = 0;

    // Title score (20 points)
    maxScore += 20;
    if (analysis.title) {
      if (analysis.title.length <= this.options.titleMaxLength) {
        score += 20;
      } else {
        score += 10;
      }
    }

    // Content length score (15 points)
    maxScore += 15;
    if (analysis.wordCount >= 800) {
      score += 15;
    } else if (analysis.wordCount >= 500) {
      score += 10;
    } else if (analysis.wordCount >= 300) {
      score += 5;
    }

    // Heading structure score (15 points)
    maxScore += 15;
    if (analysis.headings.h2.length >= 2) {
      score += 10;
    } else if (analysis.headings.h2.length >= 1) {
      score += 5;
    }
    if (analysis.headings.h3.length >= 1) {
      score += 5;
    }

    // Keyword optimization score (25 points)
    maxScore += 25;
    const targetKeywords = options.targetKeywords || [];
    if (targetKeywords.length > 0) {
      let keywordScore = 0;
      targetKeywords.forEach(keyword => {
        const keywordData = analysis.keywords.find(k => k.word === keyword);
        if (keywordData && 
            keywordData.density >= this.options.targetKeywordDensity && 
            keywordData.density <= this.options.maxKeywordDensity) {
          keywordScore += 25 / targetKeywords.length;
        }
      });
      score += keywordScore;
    }

    // Meta description score (10 points)
    maxScore += 10;
    if (analysis.meta.description && 
        analysis.meta.description.length <= this.options.descriptionMaxLength) {
      score += 10;
    }

    // Image optimization score (10 points)
    maxScore += 10;
    if (analysis.images.total > 0) {
      const altTextRatio = (analysis.images.total - analysis.images.withoutAlt) / analysis.images.total;
      score += altTextRatio * 10;
    } else {
      score += 5; // No images is okay
    }

    // Internal links score (5 points)
    maxScore += 5;
    if (analysis.internalLinks > 0) {
      score += 5;
    }

    return {
      score: Math.round(score),
      maxScore,
      percentage: Math.round((score / maxScore) * 100),
      grade: this.getScoreGrade(score / maxScore)
    };
  }

  /**
   * Helper methods
   */
  stripHTML(content) {
    return content.replace(/<[^>]*>/g, '');
  }

  countWords(text) {
    return text.trim().length; // For Korean, character count is more meaningful
  }

  extractTitle(content) {
    const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    return titleMatch ? titleMatch[1].trim() : null;
  }

  extractHeadings(content) {
    return {
      h1: (content.match(/<h1[^>]*>.*?<\/h1>/gi) || []).length,
      h2: (content.match(/<h2[^>]*>.*?<\/h2>/gi) || []).length,
      h3: (content.match(/<h3[^>]*>.*?<\/h3>/gi) || []).length
    };
  }

  analyzeKeywords(text, targetKeywords = []) {
    const words = text.toLowerCase()
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !this.koreanStopWords.has(word));

    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    const totalWords = words.length;
    const keywords = [];

    // Analyze target keywords
    targetKeywords.forEach(keyword => {
      const count = wordCount[keyword.toLowerCase()] || 0;
      keywords.push({
        word: keyword,
        count,
        density: count / totalWords,
        isTarget: true
      });
    });

    // Find top keywords
    const sortedWords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    sortedWords.forEach(([word, count]) => {
      if (!keywords.find(k => k.word === word)) {
        keywords.push({
          word,
          count,
          density: count / totalWords,
          isTarget: false
        });
      }
    });

    return keywords;
  }

  analyzeReadability(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    return {
      sentenceCount: sentences.length,
      averageWordsPerSentence: sentences.length > 0 ? words.length / sentences.length : 0,
      averageCharactersPerWord: words.length > 0 ? text.length / words.length : 0
    };
  }

  analyzeStructure(content) {
    return {
      hasList: /<[uo]l>/i.test(content),
      hasTable: /<table>/i.test(content),
      hasBlockquote: /<blockquote>/i.test(content),
      paragraphCount: (content.match(/<p[^>]*>/gi) || []).length
    };
  }

  analyzeMeta(content) {
    const descriptionMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const keywordsMatch = content.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i);
    
    return {
      description: descriptionMatch ? descriptionMatch[1] : null,
      keywords: keywordsMatch ? keywordsMatch[1] : null
    };
  }

  analyzeInternalLinks(content) {
    const internalLinks = content.match(/<a[^>]*href=["'][^"']*["'][^>]*>/gi) || [];
    return internalLinks.filter(link => !link.includes('http')).length;
  }

  analyzeImages(content) {
    const images = content.match(/<img[^>]*>/gi) || [];
    const withoutAlt = images.filter(img => !img.includes('alt=')).length;
    
    return {
      total: images.length,
      withoutAlt,
      withAlt: images.length - withoutAlt
    };
  }

  addH2Tags(content) {
    // Simple implementation - in reality, this would be more sophisticated
    const paragraphs = content.split('<p>');
    if (paragraphs.length > 3) {
      const midpoint = Math.floor(paragraphs.length / 2);
      paragraphs[midpoint] = '<h2>주요 내용</h2>\n<p>' + paragraphs[midpoint];
    }
    return paragraphs.join('<p>');
  }

  addKeywordNaturally(content, keyword) {
    // Simple implementation - add keyword in a natural way
    const textContent = this.stripHTML(content);
    if (textContent.length > 100 && !textContent.toLowerCase().includes(keyword.toLowerCase())) {
      const sentences = textContent.split('.').filter(s => s.trim().length > 0);
      if (sentences.length > 1) {
        sentences[1] += ` ${keyword}는 중요한 요소입니다.`;
        return content.replace(textContent, sentences.join('.'));
      }
    }
    return content;
  }

  getScoreGrade(percentage) {
    if (percentage >= 0.9) return 'A+';
    if (percentage >= 0.8) return 'A';
    if (percentage >= 0.7) return 'B+';
    if (percentage >= 0.6) return 'B';
    if (percentage >= 0.5) return 'C+';
    if (percentage >= 0.4) return 'C';
    return 'D';
  }

  generateId() {
    return `seo_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Destroy SEO optimizer
   */
  destroy() {
    this.isInitialized = false;
    this.removeAllListeners();
  }
}

export default SEOOptimizer;
