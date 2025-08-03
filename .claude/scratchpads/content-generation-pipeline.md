# Content Generation Pipeline Design

## LangChain-Based Blog Content Creation

### 1. Content Generation Workflow

#### BlogContentGenerator.js
```javascript
class BlogContentGenerator {
  constructor(langChainService) {
    this.langChainService = langChainService;
    this.templateManager = new BlogTemplateSystem();
    this.seoOptimizer = new SEOOptimizer();
    this.qualityChecker = new QualityChecker();
  }

  async generateBlogPost(requirements) {
    try {
      // Step 1: Generate comprehensive outline
      const outline = await this.generateOutline(requirements);
      
      // Step 2: Create content sections
      const sections = await this.generateContentSections(outline, requirements);
      
      // Step 3: Combine and refine content
      const fullContent = await this.combineAndRefine(sections, requirements);
      
      // Step 4: Generate metadata and SEO elements
      const metadata = await this.generateMetadata(fullContent, requirements);
      
      // Step 5: Quality assessment
      const qualityReport = await this.qualityChecker.analyze(fullContent);
      
      return {
        title: metadata.title,
        content: fullContent.body,
        excerpt: metadata.excerpt,
        tags: metadata.tags,
        categories: metadata.categories,
        seoMeta: metadata.seo,
        outline: outline,
        qualityReport: qualityReport,
        wordCount: this.countWords(fullContent.body),
        readabilityScore: this.calculateReadability(fullContent.body),
        generatedAt: Date.now()
      };
      
    } catch (error) {
      console.error('Content generation failed:', error);
      throw new Error(`Content generation failed: ${error.message}`);
    }
  }

  async generateOutline(requirements) {
    const template = this.templateManager.getTemplate(requirements.template);
    
    const prompt = `Create a detailed blog post outline based on these requirements:
    
    Topic: ${requirements.topic}
    Target Audience: ${requirements.audience}
    Content Length: ${requirements.length}
    Keywords: ${requirements.keywords.join(', ')}
    Template Structure: ${template.structure}
    
    Requirements:
    - Create 3-7 main sections with descriptive headings
    - Include introduction and conclusion
    - Add sub-points for complex sections
    - Incorporate target keywords naturally
    - Consider ${requirements.audience} audience level
    - Aim for ${this.getLengthTarget(requirements.length)} words
    
    Return a structured outline in JSON format:
    {
      "introduction": "Introduction heading and brief description",
      "sections": [
        {
          "heading": "Section title",
          "description": "What this section covers",
          "subpoints": ["Key point 1", "Key point 2"]
        }
      ],
      "conclusion": "Conclusion heading and brief description"
    }`;

    const response = await this.langChainService.sendMessage(prompt, [], this.getSystemPrompt('outline'));
    return this.parseOutlineResponse(response.message);
  }

  async generateContentSections(outline, requirements) {
    const sections = [];
    
    // Generate introduction
    const introduction = await this.generateIntroduction(outline, requirements);
    sections.push({ type: 'introduction', content: introduction });
    
    // Generate main sections
    for (const section of outline.sections) {
      const content = await this.generateSection(section, requirements, outline);
      sections.push({ 
        type: 'section', 
        heading: section.heading,
        content: content 
      });
    }
    
    // Generate conclusion
    const conclusion = await this.generateConclusion(outline, requirements);
    sections.push({ type: 'conclusion', content: conclusion });
    
    return sections;
  }

  async generateIntroduction(outline, requirements) {
    const prompt = `Write an engaging introduction for a blog post about "${requirements.topic}".
    
    Context:
    - Target audience: ${requirements.audience}
    - Main sections will cover: ${outline.sections.map(s => s.heading).join(', ')}
    - Keywords to include: ${requirements.keywords.slice(0, 3).join(', ')}
    
    Requirements:
    - Hook the reader in the first sentence
    - Clearly state what the post will cover
    - Include 1-2 target keywords naturally
    - Match the tone for ${requirements.audience} audience
    - Length: 100-150 words for ${requirements.length} post
    
    Write only the introduction content without headings.`;

    const response = await this.langChainService.sendMessage(prompt, [], this.getSystemPrompt('content'));
    return response.message;
  }

  async generateSection(section, requirements, fullOutline) {
    const prompt = `Write a detailed section for the blog post about "${requirements.topic}".
    
    Section Details:
    - Heading: ${section.heading}
    - Description: ${section.description}
    - Key points to cover: ${section.subpoints.join(', ')}
    
    Context:
    - Target audience: ${requirements.audience}
    - Keywords to incorporate: ${requirements.keywords.join(', ')}
    - Overall post outline: ${fullOutline.sections.map(s => s.heading).join(' → ')}
    
    Requirements:
    - Start with the section heading (use ##)
    - Provide comprehensive coverage of the topic
    - Include practical examples or use cases
    - Use subheadings (###) for complex topics
    - Include relevant keywords naturally
    - Match tone for ${requirements.audience} audience
    - Target length: ${this.getSectionLength(requirements.length)} words
    
    Write the complete section with headings and formatting.`;

    const response = await this.langChainService.sendMessage(prompt, [], this.getSystemPrompt('content'));
    return response.message;
  }

  async generateConclusion(outline, requirements) {
    const prompt = `Write a compelling conclusion for the blog post about "${requirements.topic}".
    
    Context:
    - Main sections covered: ${outline.sections.map(s => s.heading).join(', ')}
    - Target audience: ${requirements.audience}
    - Key takeaways should relate to: ${requirements.keywords.slice(0, 2).join(', ')}
    
    Requirements:
    - Summarize key points without repeating content
    - Provide actionable next steps for readers
    - Include a call-to-action relevant to ${requirements.audience}
    - End with a thought-provoking question or statement
    - Length: 80-120 words
    
    Write only the conclusion content without headings.`;

    const response = await this.langChainService.sendMessage(prompt, [], this.getSystemPrompt('content'));
    return response.message;
  }

  async combineAndRefine(sections, requirements) {
    // Combine all sections
    let fullContent = '';
    
    sections.forEach(section => {
      switch (section.type) {
        case 'introduction':
          fullContent += section.content + '\n\n';
          break;
        case 'section':
          fullContent += section.content + '\n\n';
          break;
        case 'conclusion':
          fullContent += '## Conclusion\n\n' + section.content + '\n\n';
          break;
      }
    });

    // Refine for consistency and flow
    const refinedContent = await this.refineContent(fullContent, requirements);
    
    return {
      body: refinedContent,
      wordCount: this.countWords(refinedContent)
    };
  }

  async refineContent(content, requirements) {
    const prompt = `Review and refine this blog post content for consistency and flow:

    ${content}

    Requirements:
    - Ensure smooth transitions between sections
    - Maintain consistent tone throughout
    - Optimize keyword density for: ${requirements.keywords.join(', ')}
    - Check for repetitive phrases or ideas
    - Ensure content matches ${requirements.audience} audience level
    - Verify all information is accurate and helpful

    Return the refined content with improved flow and consistency.`;

    const response = await this.langChainService.sendMessage(prompt, [], this.getSystemPrompt('editor'));
    return response.message;
  }

  async generateMetadata(content, requirements) {
    const prompt = `Generate metadata for this blog post:

    Title Topic: ${requirements.topic}
    Content Preview: ${content.body.substring(0, 500)}...
    Target Keywords: ${requirements.keywords.join(', ')}

    Generate:
    1. SEO-optimized title (60 characters max)
    2. Meta description (150-160 characters)
    3. Excerpt (100-150 words)
    4. 5-8 relevant tags
    5. 2-3 categories
    6. Focus keyword and secondary keywords

    Return in JSON format:
    {
      "title": "SEO-optimized title",
      "excerpt": "Compelling excerpt",
      "metaDescription": "SEO meta description",
      "tags": ["tag1", "tag2", ...],
      "categories": ["category1", "category2"],
      "seo": {
        "focusKeyword": "primary keyword",
        "secondaryKeywords": ["keyword2", "keyword3"]
      }
    }`;

    const response = await this.langChainService.sendMessage(prompt, [], this.getSystemPrompt('metadata'));
    return this.parseMetadataResponse(response.message);
  }

  getSystemPrompt(type) {
    const prompts = {
      'outline': 'You are an expert content strategist. Create detailed, well-structured blog post outlines that engage readers and achieve content goals.',
      
      'content': 'You are a professional content writer specializing in creating engaging, informative blog posts. Write in a clear, authoritative style that provides value to readers.',
      
      'editor': 'You are an experienced content editor. Review content for flow, consistency, clarity, and engagement while maintaining the author\'s voice and intent.',
      
      'metadata': 'You are an SEO specialist. Generate optimized metadata that improves search visibility while accurately representing the content.'
    };
    
    return prompts[type] || prompts['content'];
  }

  getLengthTarget(lengthType) {
    const targets = {
      'short': '300-600',
      'medium': '600-1200', 
      'long': '1200-2500'
    };
    return targets[lengthType] || targets['medium'];
  }

  getSectionLength(lengthType) {
    const targets = {
      'short': '80-150',
      'medium': '150-300',
      'long': '300-500'
    };
    return targets[lengthType] || targets['medium'];
  }

  parseOutlineResponse(response) {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in outline response');
    } catch (error) {
      console.error('Failed to parse outline response:', error);
      // Return fallback outline
      return this.createFallbackOutline();
    }
  }

  parseMetadataResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in metadata response');
    } catch (error) {
      console.error('Failed to parse metadata response:', error);
      return this.createFallbackMetadata();
    }
  }

  countWords(text) {
    return text.trim().split(/\s+/).length;
  }

  calculateReadability(text) {
    // Simple readability calculation (Flesch Reading Ease approximation)
    const sentences = text.split(/[.!?]+/).length - 1;
    const words = this.countWords(text);
    const syllables = this.countSyllables(text);
    
    if (sentences === 0 || words === 0) return 0;
    
    const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  countSyllables(text) {
    // Simple syllable counting approximation
    const vowelGroups = text.toLowerCase().match(/[aeiouy]+/g);
    return vowelGroups ? vowelGroups.length : 0;
  }

  createFallbackOutline() {
    return {
      introduction: "Introduction to the topic",
      sections: [
        {
          heading: "Overview",
          description: "General overview of the topic",
          subpoints: ["Key concept 1", "Key concept 2"]
        },
        {
          heading: "Implementation",
          description: "How to implement or apply the concepts",
          subpoints: ["Step 1", "Step 2", "Best practices"]
        },
        {
          heading: "Benefits and Considerations",
          description: "Advantages and things to consider",
          subpoints: ["Main benefits", "Potential challenges"]
        }
      ],
      conclusion: "Summary and next steps"
    };
  }

  createFallbackMetadata() {
    return {
      title: "Blog Post Title",
      excerpt: "This blog post provides valuable insights on the topic...",
      metaDescription: "Learn about this important topic with practical insights and actionable advice.",
      tags: ["blog", "content", "information"],
      categories: ["General"],
      seo: {
        focusKeyword: "blog topic",
        secondaryKeywords: ["related topic", "information"]
      }
    };
  }
}
```

### 2. Content Quality System

#### QualityChecker.js Enhancement
```javascript
class QualityChecker {
  constructor() {
    this.metrics = [
      'wordCount',
      'readability',
      'keywordDensity',
      'headingStructure',
      'contentDepth',
      'engagement'
    ];
  }

  async analyze(content) {
    const analysis = {
      overall: 0,
      metrics: {},
      suggestions: [],
      passed: true
    };

    // Word count analysis
    analysis.metrics.wordCount = this.analyzeWordCount(content);
    
    // Readability analysis
    analysis.metrics.readability = this.analyzeReadability(content);
    
    // Keyword density
    analysis.metrics.keywordDensity = this.analyzeKeywordDensity(content, content.keywords);
    
    // Heading structure
    analysis.metrics.headingStructure = this.analyzeHeadingStructure(content);
    
    // Content depth
    analysis.metrics.contentDepth = this.analyzeContentDepth(content);
    
    // Calculate overall score
    analysis.overall = this.calculateOverallScore(analysis.metrics);
    
    // Generate suggestions
    analysis.suggestions = this.generateSuggestions(analysis.metrics);
    
    // Determine if quality passes threshold
    analysis.passed = analysis.overall >= 70;

    return analysis;
  }

  analyzeWordCount(content) {
    const wordCount = content.wordCount || this.countWords(content.body || content);
    
    let score = 100;
    let feedback = 'Good length';
    
    if (wordCount < 300) {
      score = 40;
      feedback = 'Content is too short for effective SEO';
    } else if (wordCount < 500) {
      score = 70;
      feedback = 'Consider adding more detail';
    } else if (wordCount > 3000) {
      score = 80;
      feedback = 'Very comprehensive, consider breaking into multiple posts';
    }

    return { score, feedback, wordCount };
  }

  analyzeReadability(content) {
    const readabilityScore = content.readabilityScore || this.calculateReadability(content.body || content);
    
    let feedback = '';
    if (readabilityScore >= 60) {
      feedback = 'Easy to read';
    } else if (readabilityScore >= 30) {
      feedback = 'Moderately difficult';
    } else {
      feedback = 'Difficult to read - consider simplifying';
    }

    return { 
      score: Math.min(100, readabilityScore + 30), 
      feedback, 
      readabilityScore 
    };
  }

  generateSuggestions(metrics) {
    const suggestions = [];

    if (metrics.wordCount.score < 70) {
      suggestions.push({
        type: 'content',
        priority: 'high',
        message: 'Consider expanding content with more examples and details'
      });
    }

    if (metrics.readability.score < 70) {
      suggestions.push({
        type: 'readability',
        priority: 'medium', 
        message: 'Use shorter sentences and simpler vocabulary for better readability'
      });
    }

    if (metrics.headingStructure.score < 80) {
      suggestions.push({
        type: 'structure',
        priority: 'medium',
        message: 'Improve heading hierarchy and add more subheadings'
      });
    }

    return suggestions;
  }
}
```

### 3. User Interaction Workflow

#### Interactive Content Creation
```javascript
class InteractiveContentCreator {
  constructor(blogContentGenerator, chatComponent) {
    this.generator = blogContentGenerator;
    this.chatComponent = chatComponent;
    this.currentSession = null;
  }

  async startInteractiveSession(initialRequirements) {
    this.currentSession = {
      id: Date.now(),
      requirements: initialRequirements,
      stage: 'outline',
      content: {},
      userFeedback: []
    };

    // Generate initial outline
    await this.generateAndReviewOutline();
  }

  async generateAndReviewOutline() {
    this.chatComponent.addMessage({
      role: 'assistant',
      content: '🤖 Generating blog outline based on your requirements...',
      type: 'status'
    });

    const outline = await this.generator.generateOutline(this.currentSession.requirements);
    this.currentSession.content.outline = outline;

    // Present outline for review
    const outlineReview = this.formatOutlineForReview(outline);
    this.chatComponent.addMessage({
      role: 'assistant',
      content: outlineReview,
      type: 'outline-review',
      actions: [
        { id: 'approve-outline', label: '✅ Looks good, generate content' },
        { id: 'modify-outline', label: '✏️ Suggest changes' },
        { id: 'regenerate-outline', label: '🔄 Try different approach' }
      ]
    });
  }

  async handleUserFeedback(action, feedback = '') {
    switch (action) {
      case 'approve-outline':
        await this.generateContent();
        break;
        
      case 'modify-outline':
        await this.modifyOutline(feedback);
        break;
        
      case 'regenerate-outline':
        await this.regenerateOutline();
        break;
        
      case 'approve-content':
        await this.finalizeContent();
        break;
        
      case 'edit-content':
        await this.enterEditMode();
        break;
    }
  }

  async generateContent() {
    this.chatComponent.addMessage({
      role: 'assistant', 
      content: '✍️ Creating your blog content... This may take a moment.',
      type: 'status'
    });

    const content = await this.generator.generateBlogPost(this.currentSession.requirements);
    this.currentSession.content.full = content;

    // Present content for review
    const contentReview = this.formatContentForReview(content);
    this.chatComponent.addMessage({
      role: 'assistant',
      content: contentReview,
      type: 'content-review',
      actions: [
        { id: 'approve-content', label: '🚀 Publish this content' },
        { id: 'edit-content', label: '✏️ Edit content' },
        { id: 'regenerate-section', label: '🔄 Regenerate sections' }
      ]
    });
  }

  formatOutlineForReview(outline) {
    let formatted = '## 📋 Blog Post Outline\n\n';
    formatted += `**Introduction:** ${outline.introduction}\n\n`;
    
    outline.sections.forEach((section, index) => {
      formatted += `**${index + 1}. ${section.heading}**\n`;
      formatted += `${section.description}\n`;
      if (section.subpoints.length > 0) {
        section.subpoints.forEach(point => {
          formatted += `  • ${point}\n`;
        });
      }
      formatted += '\n';
    });
    
    formatted += `**Conclusion:** ${outline.conclusion}\n\n`;
    formatted += '❓ Does this outline look good for your blog post?';
    
    return formatted;
  }

  formatContentForReview(content) {
    let formatted = `## 📄 Generated Blog Post\n\n`;
    formatted += `**Title:** ${content.title}\n\n`;
    formatted += `**Word Count:** ${content.wordCount} words\n`;
    formatted += `**Quality Score:** ${content.qualityReport.overall}/100\n\n`;
    
    // Show excerpt
    formatted += `**Excerpt:**\n${content.excerpt}\n\n`;
    
    // Show quality metrics
    if (content.qualityReport.suggestions.length > 0) {
      formatted += `**💡 Suggestions:**\n`;
      content.qualityReport.suggestions.forEach(suggestion => {
        formatted += `• ${suggestion.message}\n`;
      });
      formatted += '\n';
    }
    
    formatted += '📝 The full content is ready for review. What would you like to do?';
    
    return formatted;
  }
}
```

This content generation pipeline provides a robust, AI-powered system for creating high-quality blog posts with user interaction and quality control throughout the process.