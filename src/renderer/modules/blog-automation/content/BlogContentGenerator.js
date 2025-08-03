/**
 * BlogContentGenerator - AI-powered blog content generation
 * 
 * Uses LangChainService to generate high-quality blog content
 * with industry-specific knowledge and SEO optimization.
 */

import { EventEmitter } from '../../../utils/EventEmitter.js';

class BlogContentGenerator extends EventEmitter {
  constructor() {
    super();
    this.langChainService = null;
    this.isInitialized = false;
    
    // Content generation settings
    this.settings = {
      maxRetries: 3,
      temperature: 0.7,
      maxTokens: 4000,
      language: 'korean',
      industry: 'electrical_sensors'
    };
  }

  /**
   * Initialize the content generator
   */
  async initialize(langChainAPI) {
    if (!langChainAPI) {
      throw new Error('LangChain API is required');
    }
    
    this.langChainAPI = langChainAPI;
    this.isInitialized = true;
    
    console.log('[BlogContentGenerator] Initialized');
  }

  /**
   * Generate blog post outline
   */
  async generateOutline(requirements, systemPrompt) {
    console.log('[BlogContentGenerator] Generating outline');
    
    try {
      this.emit('progress', {
        stage: 'outline',
        status: 'starting',
        message: '블로그 개요 생성 시작...'
      });
      
      const userPrompt = `
다음 요구사항을 바탕으로 블로그 글의 상세한 개요를 JSON 형식으로 작성해주세요:

요구사항: ${JSON.stringify(requirements, null, 2)}

JSON 형식:
{
  "title": "블로그 제목",
  "seoTitle": "SEO 최적화 제목",
  "excerpt": "간단한 요약 (2-3문장)",
  "seoDescription": "메타 설명 (150-160자)",
  "keywords": ["키워드1", "키워드2"],
  "sections": [
    {
      "id": "section1",
      "title": "섹션 제목",
      "summary": "섹션 내용 요약",
      "keyPoints": ["핵심 포인트 1", "핵심 포인트 2"]
    }
  ],
  "targetAudience": "대상 독자",
  "tone": "글의 톤",
  "estimatedReadTime": "예상 읽기 시간(분)"
}
      `.trim();
      
      const response = await this.langChainAPI.langchainSendMessage({
        message: userPrompt,
        conversationHistory: [],
        systemPrompt: systemPrompt
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Outline generation failed');
      }
      
      // Parse JSON response
      const outline = this.parseJSONResponse(response.message);
      
      this.emit('progress', {
        stage: 'outline',
        status: 'completed',
        message: '개요 생성 완료',
        data: outline
      });
      
      return outline;
      
    } catch (error) {
      console.error('[BlogContentGenerator] Outline generation error:', error);
      this.emit('progress', {
        stage: 'outline',
        status: 'error',
        message: '개요 생성 실패: ' + error.message
      });
      throw error;
    }
  }

  /**
   * Generate full blog content based on outline
   */
  async generateFullContent(requirements, outline, options = {}) {
    console.log('[BlogContentGenerator] Generating full content');
    
    try {
      this.emit('progress', {
        stage: 'content',
        status: 'starting',
        message: '콘텐츠 생성 시작...'
      });
      
      const content = {
        title: outline.title,
        seoTitle: outline.seoTitle,
        excerpt: outline.excerpt,
        seoDescription: outline.seoDescription,
        keywords: outline.keywords,
        sections: [],
        metadata: {
          generatedAt: new Date().toISOString(),
          language: options.language || 'korean',
          industry: options.industry || 'electrical_sensors',
          targetAudience: outline.targetAudience,
          tone: outline.tone,
          estimatedReadTime: outline.estimatedReadTime
        }
      };
      
      // Generate introduction
      const intro = await this.generateIntroduction(outline, requirements);
      content.introduction = intro;
      
      // Generate each section
      for (let i = 0; i < outline.sections.length; i++) {
        const section = outline.sections[i];
        
        this.emit('progress', {
          stage: 'content',
          status: 'generating',
          message: `섹션 ${i + 1}/${outline.sections.length} 생성 중...`,
          progress: (i / outline.sections.length) * 100
        });
        
        const sectionContent = await this.generateSection(
          section,
          outline,
          requirements,
          options
        );
        
        content.sections.push(sectionContent);
      }
      
      // Generate conclusion
      const conclusion = await this.generateConclusion(outline, requirements);
      content.conclusion = conclusion;
      
      // Format as HTML
      content.html = this.formatAsHTML(content);
      
      // Generate plain text version
      content.plainText = this.formatAsPlainText(content);
      
      this.emit('progress', {
        stage: 'content',
        status: 'completed',
        message: '콘텐츠 생성 완료',
        data: content
      });
      
      return content;
      
    } catch (error) {
      console.error('[BlogContentGenerator] Content generation error:', error);
      this.emit('progress', {
        stage: 'content',
        status: 'error',
        message: '콘텐츠 생성 실패: ' + error.message
      });
      throw error;
    }
  }

  /**
   * Generate introduction section
   */
  async generateIntroduction(outline, requirements) {
    const prompt = `
블로그 글의 서론을 작성해주세요.

제목: ${outline.title}
요구사항: ${requirements}
대상 독자: ${outline.targetAudience}
톤: ${outline.tone}

서론 작성 지침:
1. 독자의 관심을 끄는 첫 문장
2. 글의 주제와 중요성 설명
3. 글에서 다룰 내용 간단히 소개
4. 2-3단락으로 구성

전문적이면서도 읽기 쉬운 한국어로 작성해주세요.
    `.trim();
    
    const response = await this.langChainAPI.langchainSendMessage({
      message: prompt,
      conversationHistory: [],
      systemPrompt: null
    });
    
    if (!response.success) {
      throw new Error('Introduction generation failed');
    }
    
    return response.message;
  }

  /**
   * Generate a single section
   */
  async generateSection(section, outline, requirements, options) {
    const prompt = `
다음 블로그 섹션의 내용을 작성해주세요.

섹션 제목: ${section.title}
섹션 요약: ${section.summary}
핵심 포인트: ${section.keyPoints.join(', ')}

전체 글 제목: ${outline.title}
대상 독자: ${outline.targetAudience}
톤: ${outline.tone}

작성 지침:
1. 섹션 제목에 맞는 상세한 내용 작성
2. 핵심 포인트를 모두 다루기
3. 실제 예시나 응용 사례 포함
4. 3-5단락으로 구성
5. 기술적 정확성 유지

${options.industry === 'electrical_sensors' ? '전기센서 산업 관련 전문 지식을 포함하여' : ''} 
전문적이고 이해하기 쉬운 한국어로 작성해주세요.
    `.trim();
    
    const response = await this.langChainAPI.langchainSendMessage({
      message: prompt,
      conversationHistory: [],
      systemPrompt: null
    });
    
    if (!response.success) {
      throw new Error(`Section generation failed: ${section.title}`);
    }
    
    return {
      id: section.id,
      title: section.title,
      content: response.message,
      keyPoints: section.keyPoints
    };
  }

  /**
   * Generate conclusion section
   */
  async generateConclusion(outline, requirements) {
    const prompt = `
블로그 글의 결론을 작성해주세요.

제목: ${outline.title}
주요 내용: ${outline.sections.map(s => s.title).join(', ')}
대상 독자: ${outline.targetAudience}

결론 작성 지침:
1. 주요 내용 요약
2. 핵심 메시지 재강조
3. 행동 유도(CTA) 포함 - 태화트랜스 제품 문의, 추가 정보 요청 등
4. 미래 전망이나 추가 고려사항
5. 2-3단락으로 구성

독자가 행동을 취하도록 유도하는 설득력 있는 결론을 작성해주세요.
    `.trim();
    
    const response = await this.langChainAPI.langchainSendMessage({
      message: prompt,
      conversationHistory: [],
      systemPrompt: null
    });
    
    if (!response.success) {
      throw new Error('Conclusion generation failed');
    }
    
    return response.message;
  }

  /**
   * Parse JSON response from AI
   */
  parseJSONResponse(text) {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('[BlogContentGenerator] JSON parsing error:', error);
      console.log('Raw response:', text);
      
      // Attempt to extract structured data manually
      // This is a fallback for when AI doesn't return proper JSON
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  /**
   * Format content as HTML
   */
  formatAsHTML(content) {
    let html = '';
    
    // Title
    html += `<h1>${content.title}</h1>\n\n`;
    
    // Introduction
    html += `<div class="introduction">\n${this.paragraphsToHTML(content.introduction)}\n</div>\n\n`;
    
    // Sections
    for (const section of content.sections) {
      html += `<section id="${section.id}">\n`;
      html += `<h2>${section.title}</h2>\n`;
      html += this.paragraphsToHTML(section.content);
      html += `\n</section>\n\n`;
    }
    
    // Conclusion
    html += `<div class="conclusion">\n${this.paragraphsToHTML(content.conclusion)}\n</div>\n`;
    
    return html;
  }

  /**
   * Convert paragraphs to HTML
   */
  paragraphsToHTML(text) {
    if (!text) return '';
    
    return text
      .split('\n\n')
      .filter(p => p.trim())
      .map(p => `<p>${p.trim()}</p>`)
      .join('\n');
  }

  /**
   * Format content as plain text
   */
  formatAsPlainText(content) {
    let text = '';
    
    // Title
    text += `${content.title}\n${'='.repeat(content.title.length)}\n\n`;
    
    // Introduction
    text += `${content.introduction}\n\n`;
    
    // Sections
    for (const section of content.sections) {
      text += `${section.title}\n${'-'.repeat(section.title.length)}\n`;
      text += `${section.content}\n\n`;
    }
    
    // Conclusion
    text += `결론\n----\n${content.conclusion}\n`;
    
    return text;
  }

  /**
   * Optimize content for SEO
   */
  async optimizeForSEO(content, keywords) {
    console.log('[BlogContentGenerator] Optimizing for SEO');
    
    const prompt = `
다음 콘텐츠를 SEO 최적화해주세요.

목표 키워드: ${keywords.join(', ')}

현재 콘텐츠:
${JSON.stringify(content, null, 2)}

최적화 요구사항:
1. 키워드를 자연스럽게 포함 (과도하지 않게)
2. 제목과 부제목에 키워드 배치
3. 메타 설명 최적화
4. 이미지 alt 텍스트 제안
5. 내부/외부 링크 제안

최적화된 콘텐츠를 JSON 형식으로 반환해주세요.
    `.trim();
    
    const response = await this.langChainAPI.langchainSendMessage({
      message: prompt,
      conversationHistory: [],
      systemPrompt: null
    });
    
    if (!response.success) {
      console.warn('[BlogContentGenerator] SEO optimization failed, returning original');
      return content;
    }
    
    try {
      return this.parseJSONResponse(response.message);
    } catch (error) {
      console.warn('[BlogContentGenerator] Failed to parse SEO response, returning original');
      return content;
    }
  }

  /**
   * Generate content variations for A/B testing
   */
  async generateVariations(content, count = 2) {
    const variations = [content]; // Original is first variation
    
    for (let i = 1; i < count; i++) {
      const prompt = `
다음 콘텐츠의 변형 버전을 만들어주세요.
같은 정보를 다른 방식으로 표현하되, 톤과 구조를 약간 변경해주세요.

원본 제목: ${content.title}
원본 서론: ${content.introduction.substring(0, 200)}...

변형 지침:
1. 핵심 메시지는 유지
2. 표현 방식과 문체 변경
3. 다른 예시나 비유 사용
4. 제목도 변형

변형된 제목과 서론을 제공해주세요.
      `.trim();
      
      const response = await this.langChainAPI.langchainSendMessage({
      message: prompt,
      conversationHistory: [],
      systemPrompt: null
    });
      
      if (response.success) {
        // Create variation based on response
        // This is simplified - in production, you'd want to parse and structure properly
        variations.push({
          ...content,
          title: response.message.split('\n')[0],
          variation: i
        });
      }
    }
    
    return variations;
  }

  /**
   * Clean up resources
   */
  async destroy() {
    this.removeAllListeners();
    this.langChainService = null;
  }
}

export default BlogContentGenerator;