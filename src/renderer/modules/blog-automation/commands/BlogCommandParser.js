/**
 * BlogCommandParser - Parses blog-related commands from user input
 * 
 * Handles various blog command formats:
 * - /blog new
 * - /blog publish
 * - Natural language commands
 */

class BlogCommandParser {
  constructor() {
    // Define command patterns
    this.commandPatterns = [
      {
        pattern: /^\/blog\s+(\w+)(?:\s+(.*))?$/i,
        type: 'slash_command'
      },
      {
        pattern: /블로그\s*(?:글|포스트)?\s*(?:써|작성|만들|올려)/i,
        type: 'natural_language',
        action: 'auto'
      },
      {
        pattern: /.*블로그\s*글.*(?:써|작성)/i,
        type: 'natural_language',
        action: 'auto'
      },
      {
        pattern: /(?:아무|랜덤|자동).*블로그.*(?:써|올려|게시)/i,
        type: 'natural_language',
        action: 'auto'
      },
      {
        pattern: /(?:태화|taehwa).*(?:로고스키|전류센서|변류기).*(?:글|블로그|포스트)/i,
        type: 'natural_language',
        action: 'new',
        context: 'product_specific'
      },
      {
        pattern: /SEO\s*키워드.*(?:블로그|글|포스트)/i,
        type: 'natural_language',
        action: 'new',
        context: 'seo_focused'
      },
      {
        pattern: /블로그.*게시|발행|퍼블리시/i,
        type: 'natural_language',
        action: 'publish'
      },
      {
        pattern: /(?:그냥|일단).*블로그.*(?:써|쓰고|올려)/i,
        type: 'natural_language',
        action: 'auto'
      },
      {
        pattern: /블로그.*(?:하나|한개|한 개).*(?:써|작성|올려)/i,
        type: 'natural_language',
        action: 'auto'
      }
    ];
    
    // Blog action mappings
    this.validActions = ['new', 'auto', 'publish', 'list', 'status', 'help', 'edit', 'delete'];
  }

  /**
   * Parse user input for blog commands
   */
  parse(input) {
    if (!input || typeof input !== 'string') {
      return null;
    }
    
    const trimmedInput = input.trim();
    console.log('[BlogCommandParser] Parsing input:', trimmedInput);
    
    // Check slash commands first
    const slashCommand = this.parseSlashCommand(trimmedInput);
    if (slashCommand) {
      console.log('[BlogCommandParser] Found slash command:', slashCommand);
      return slashCommand;
    }
    
    // Check natural language patterns
    const naturalCommand = this.parseNaturalLanguage(trimmedInput);
    if (naturalCommand) {
      console.log('[BlogCommandParser] Found natural language command:', naturalCommand);
      return naturalCommand;
    }
    
    console.log('[BlogCommandParser] No blog command found in input');
    return null;
  }

  /**
   * Parse slash-style commands
   */
  parseSlashCommand(input) {
    const match = input.match(this.commandPatterns[0].pattern);
    
    if (!match) {
      return null;
    }
    
    const action = match[1].toLowerCase();
    const params = match[2] ? match[2].trim() : '';
    
    if (!this.validActions.includes(action)) {
      return {
        type: 'blog',
        action: 'unknown',
        raw: input
      };
    }
    
    return {
      type: 'blog',
      action: action,
      params: this.parseParams(params),
      raw: input
    };
  }

  /**
   * Parse natural language commands
   */
  parseNaturalLanguage(input) {
    for (let i = 1; i < this.commandPatterns.length; i++) {
      const pattern = this.commandPatterns[i];
      
      if (pattern.pattern.test(input)) {
        const command = {
          type: 'blog',
          action: pattern.action,
          params: {
            naturalLanguage: true,
            originalInput: input
          },
          raw: input
        };
        
        // Extract additional context
        if (pattern.context) {
          command.params.context = pattern.context;
        }
        
        // Extract specific keywords or topics
        this.extractTopicsAndKeywords(input, command.params);
        
        return command;
      }
    }
    
    return null;
  }

  /**
   * Parse command parameters
   */
  parseParams(paramString) {
    if (!paramString) {
      return {};
    }
    
    const params = {};
    
    // Parse key=value pairs
    const keyValuePattern = /(\w+)=["']?([^"']+)["']?/g;
    let match;
    
    while ((match = keyValuePattern.exec(paramString)) !== null) {
      params[match[1]] = match[2];
    }
    
    // If no key-value pairs, treat as free text
    if (Object.keys(params).length === 0) {
      params.text = paramString;
    }
    
    return params;
  }

  /**
   * Extract topics and keywords from natural language input
   */
  extractTopicsAndKeywords(input, params) {
    // Product keywords
    const productKeywords = {
      '로고스키': 'rogowski_coil',
      'rogowski': 'rogowski_coil',
      '전류센서': 'current_sensor',
      '변류기': 'current_transformer',
      'CT': 'current_transformer',
      '영상변류기': 'zero_phase_ct',
      'ACB': 'acb_ct'
    };
    
    // Technical keywords
    const technicalKeywords = [
      '측정', '정확도', '설치', '유지보수', '교정', '사양', '규격',
      '전력품질', '에너지관리', '스마트그리드', 'IoT', '산업용'
    ];
    
    // Extract product focus
    for (const [keyword, value] of Object.entries(productKeywords)) {
      if (input.includes(keyword)) {
        params.product = value;
        break;
      }
    }
    
    // Extract technical keywords
    params.keywords = [];
    for (const keyword of technicalKeywords) {
      if (input.includes(keyword)) {
        params.keywords.push(keyword);
      }
    }
    
    // Extract SEO keywords if mentioned
    const seoMatch = input.match(/SEO\s*키워드\s*['"']?([^'"']+)['"']?/i);
    if (seoMatch) {
      params.seoKeywords = seoMatch[1].split(/[,\s]+/).filter(k => k.length > 0);
    }
    
    // Detect content type preferences
    if (input.includes('기술') || input.includes('technical')) {
      params.contentType = 'technical';
    } else if (input.includes('소개') || input.includes('introduction')) {
      params.contentType = 'introduction';
    } else if (input.includes('비교') || input.includes('comparison')) {
      params.contentType = 'comparison';
    }
  }

  /**
   * Check if input might be a blog-related query
   */
  isBlogRelated(input) {
    const blogKeywords = [
      '블로그', 'blog', '글', '포스트', 'post', '작성', '써', '게시',
      '발행', 'publish', 'wordpress', 'wp', '콘텐츠', 'content'
    ];
    
    const lowerInput = input.toLowerCase();
    return blogKeywords.some(keyword => lowerInput.includes(keyword));
  }

  /**
   * Get command suggestions based on partial input
   */
  getSuggestions(partialInput) {
    if (!partialInput.startsWith('/blog')) {
      return [];
    }
    
    const suggestions = this.validActions.map(action => ({
      command: `/blog ${action}`,
      description: this.getActionDescription(action)
    }));
    
    const partialAction = partialInput.replace('/blog', '').trim();
    if (partialAction) {
      return suggestions.filter(s => 
        s.command.toLowerCase().includes(partialAction.toLowerCase())
      );
    }
    
    return suggestions;
  }

  /**
   * Get description for blog action
   */
  getActionDescription(action) {
    const descriptions = {
      'new': '새 블로그 글 작성',
      'auto': '자동 블로그 생성 및 게시',
      'publish': '작성된 글 게시',
      'list': '저장된 초안 목록',
      'status': '현재 작업 상태',
      'help': '도움말 보기',
      'edit': '초안 수정',
      'delete': '초안 삭제'
    };
    
    return descriptions[action] || action;
  }
}

export default BlogCommandParser;