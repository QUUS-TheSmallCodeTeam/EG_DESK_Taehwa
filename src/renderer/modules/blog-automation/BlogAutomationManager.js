/**
 * BlogAutomationManager - Central orchestrator for blog automation workflow
 * 
 * Manages the complete blog automation lifecycle from command parsing to publishing.
 * Integrates with ChatComponent, LangChainService, and WordPress API.
 */

import { EventEmitter } from '../../utils/EventEmitter.js';
import BlogCommandParser from './commands/BlogCommandParser.js';
import BlogWorkflowManager from './workflow/BlogWorkflowManager.js';
import BlogContentGenerator from './content/BlogContentGenerator.js';
import BlogSystemPrompts from './prompts/BlogSystemPrompts.js';
import WPPublishingService from './wordpress/WPPublishingService.js';
import terminalLogger from '../../utils/terminalLogger.js';

class BlogAutomationManager extends EventEmitter {
  constructor() {
    super();
    this.commandParser = new BlogCommandParser();
    this.workflowManager = new BlogWorkflowManager();
    this.contentGenerator = new BlogContentGenerator();
    this.systemPrompts = new BlogSystemPrompts();
    this.publishingService = new WPPublishingService();
    
    this.activeWorkflow = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the blog automation system
   */
  async initialize(dependencies) {
    terminalLogger.log('[BlogAutomationManager] Initializing...');
    
    try {
      // Store dependencies - use window.electronAPI for LangChain access
      this.langChainAPI = window.electronAPI; // Access LangChain through preload API
      this.globalState = dependencies.globalState;
      this.chatComponent = dependencies.chatComponent;
      
      // Initialize sub-modules with proper API access
      await this.contentGenerator.initialize(this.langChainAPI);
      await this.publishingService.initialize();
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      terminalLogger.log('[BlogAutomationManager] Initialization complete');
      
      return true;
    } catch (error) {
      terminalLogger.error('[BlogAutomationManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Handle chat message to detect and process blog commands
   */
  async handleChatMessage(message) {
    terminalLogger.log('[BlogAutomationManager] Received message:', message);
    
    // Parse command
    const command = this.commandParser.parse(message);
    
    if (!command || command.type !== 'blog') {
      terminalLogger.log('[BlogAutomationManager] Not a blog command, returning null');
      return null; // Not a blog command
    }
    
    terminalLogger.log('[BlogAutomationManager] Processing blog command:', command);
    
    // Handle different blog commands
    switch (command.action) {
      case 'new':
        return await this.startNewBlogWorkflow(command.params);
        
      case 'auto':
        return await this.startAutomatedBlog(command.params);
        
      case 'publish':
        return await this.publishBlog(command.params);
        
      case 'list':
        return await this.listDrafts();
        
      case 'status':
        return await this.getWorkflowStatus();
        
      case 'help':
        return this.getBlogHelp();
        
      default:
        return {
          type: 'error',
          message: 'Unknown blog command. Type /blog help for available commands.'
        };
    }
  }

  /**
   * Start fully automated blog creation
   */
  async startAutomatedBlog(params = {}) {
    terminalLogger.log('[BlogAutomationManager] Starting automated blog creation');
    
    try {
      // Create workflow
      this.activeWorkflow = await this.workflowManager.createWorkflow({
        type: 'blog_automation',
        params: params,
        automated: true,
        timestamp: Date.now()
      });
      
      // Check if data is from tool (already has title and content)
      if (params.fromTool && params.title && params.content) {
        terminalLogger.log('[BlogAutomationManager] Using pre-generated content from tool');
        
        // Create content object from tool data
        const finalContent = {
          title: params.title,
          html: params.content,
          content: params.content,
          excerpt: `${params.topic} - ${params.metadata?.audience || '일반 독자'}를 위한 블로그`,
          keywords: params.metadata?.keywords || [],
          seoTitle: params.title,
          seoDescription: `${params.topic}에 대한 상세한 가이드`,
          images: params.images || [],
          hasImages: params.images?.length > 0
        };
        
        // Directly publish
        this.emit('automation_progress', {
          step: 'publishing',
          message: '📤 WordPress에 게시하고 있습니다...'
        });
        
        terminalLogger.log('[BlogAutomationManager] Publishing content:', {
          title: finalContent.title,
          hasContent: !!finalContent.html,
          contentLength: finalContent.html?.length,
          hasImages: finalContent.hasImages
        });
        
        const publishResult = await this.autoPublish(finalContent);
        
        this.emit('automation_completed', {
          success: true,
          result: publishResult,
          message: `✅ 블로그 작성이 완료되었습니다!\n\n📌 제목: ${publishResult.title}\n🔗 URL: ${publishResult.link}\n📊 상태: ${publishResult.status === 'publish' ? '게시됨' : '초안'}`
        });
        
        return {
          type: 'automated_complete',
          result: publishResult,
          content: finalContent
        };
      }
      
      // Original flow for non-tool automation
      // Show initial status
      this.emit('automation_started', {
        message: '🚀 블로그 작성을 시작합니다. 잠시만 기다려주세요...'
      });
      
      // Step 1: Determine topic and requirements
      const requirements = await this.determineRequirements(params);
      this.emit('automation_progress', {
        step: 'requirements',
        message: `📝 주제 분석 중: "${requirements.topic}"`
      });
      
      // Step 2: Generate outline
      const outline = await this.generateOutlineAutomated(requirements);
      this.emit('automation_progress', {
        step: 'outline',
        message: `📋 글의 구조를 잡고 있습니다... (${outline.sections?.length || 0}개 섹션)`
      });
      
      // Step 3: Generate content
      const content = await this.generateContentAutomated(requirements, outline);
      this.emit('automation_progress', {
        step: 'content',
        message: '✍️ 본문을 작성하고 있습니다...'
      });
      
      // Step 4: Generate images
      this.emit('automation_progress', {
        step: 'images_start',
        message: '🎨 관련 이미지를 생성하고 있습니다...'
      });
      const images = await this.generateImages(content);
      
      // Step 5: Combine content with images
      const finalContent = await this.combineContentWithImages(content, images);
      
      // Step 6: Auto-publish
      this.emit('automation_progress', {
        step: 'publishing',
        message: '📤 WordPress에 게시하고 있습니다...'
      });
      const publishResult = await this.autoPublish(finalContent);
      
      this.emit('automation_completed', {
        success: true,
        result: publishResult,
        message: `✅ 블로그 작성이 완료되었습니다!\n\n📌 제목: ${publishResult.title}\n🔗 URL: ${publishResult.link}\n📊 상태: ${publishResult.status === 'publish' ? '게시됨' : '초안'}`
      });
      
      return {
        type: 'automated_complete',
        result: publishResult,
        content: finalContent
      };
      
    } catch (error) {
      terminalLogger.error('[BlogAutomationManager] Automation failed:', error);
      this.emit('automation_failed', {
        error: error.message
      });
      
      return {
        type: 'error',
        message: `자동화 실패: ${error.message}`
      };
    }
  }

  /**
   * Determine requirements automatically
   */
  async determineRequirements(params) {
    // If topic is provided, use it
    if (params.text || params.topic || params.originalInput) {
      // Extract topic from originalInput if needed
      let topic = params.text || params.topic;
      
      if (!topic && params.originalInput) {
        // Extract topic from natural language input
        // e.g., "건강한 라이프스타일에 관한 블로그 글을 써줘" -> "건강한 라이프스타일"
        const topicMatch = params.originalInput.match(/(.+?)(?:에 관한|에 대한|관련|대해|에 대해서|에 관해서)?\s*블로그/);
        if (topicMatch) {
          topic = topicMatch[1].trim();
        } else {
          // If no specific topic pattern found, use the full input as context
          topic = params.originalInput.replace(/블로그.*$/i, '').trim();
        }
      }
      
      return {
        topic: topic || params.originalInput,
        audience: params.audience || '전기 엔지니어 및 구매 담당자',
        purpose: params.purpose || '제품 소개 및 기술 교육',
        tone: params.tone || '전문적이면서 이해하기 쉬운',
        keywords: params.keywords || []
      };
    }
    
    // Otherwise, generate a trending topic
    const trendingTopicPrompt = `
전기센서 산업의 최신 트렌드와 태화트랜스 제품을 고려하여 
오늘 작성하기 좋은 블로그 주제를 하나 추천해주세요.

고려사항:
- 시즌성 (현재 시기와 관련된 주제)
- 산업 트렌드 (스마트그리드, IoT, 에너지 관리 등)
- 태화트랜스 주력 제품 (로고스키 코일, 변류기 등)

추천 주제를 한 문장으로 제시해주세요.
    `.trim();
    
    const response = await this.langChainAPI.langchainSendMessage({
      message: trendingTopicPrompt,
      conversationHistory: [],
      systemPrompt: this.systemPrompts.getGeneralProductPrompt()
    });
    
    if (!response.success) {
      throw new Error('Failed to determine topic');
    }
    
    return {
      topic: response.message.trim(),
      audience: '전기 엔지니어 및 구매 담당자',
      purpose: '제품 소개 및 기술 교육',
      tone: '전문적이면서 이해하기 쉬운',
      keywords: []
    };
  }

  /**
   * Generate outline automatically
   */
  async generateOutlineAutomated(requirements) {
    const systemPrompt = this.systemPrompts.getOutlinePrompt(requirements);
    const outline = await this.contentGenerator.generateOutline(requirements, systemPrompt);
    
    // Store in workflow
    this.activeWorkflow.data.requirements = requirements;
    this.activeWorkflow.data.outline = outline;
    
    return outline;
  }

  /**
   * Generate content automatically
   */
  async generateContentAutomated(requirements, outline) {
    const content = await this.contentGenerator.generateFullContent(
      requirements,
      outline,
      {
        industry: 'electrical_sensors',
        language: 'korean',
        seoKeywords: outline.keywords || []
      }
    );
    
    // Store in workflow
    this.activeWorkflow.data.generatedContent = content;
    
    return content;
  }

  /**
   * Generate images for the blog post
   */
  async generateImages(content) {
    terminalLogger.log('[BlogAutomationManager] Generating images');
    
    const images = [];
    
    try {
      // Generate dynamic image prompts based on blog content
      let imagePrompts;
      try {
        terminalLogger.log('[BlogAutomationManager] Generating dynamic image prompts');
        
        const promptGenerationMessage = `
Analyze this blog content and generate 2 specific image prompts for DALL-E:

BLOG TITLE: "${content.title}"
BLOG CONTENT: ${content.content?.substring(0, 1000) || content.html?.substring(0, 1000)}...

Generate 2 image prompts:
1. FEATURED_IMAGE: A header illustration specific to this blog topic
2. SECTION_IMAGE: A supporting illustration for the content

CRITICAL REQUIREMENTS:
- NO TEXT, LABELS, NUMBERS, or WRITTEN WORDS in either image
- Must be visually relevant to the specific blog topic
- Professional technical aesthetic for electrical sensor industry
- Clean, modern, minimalist design
- Use visual symbols and abstract representations only
- Color scheme: Professional blues, silvers, technical tones

For electrical sensor topics, include relevant visual elements like:
- Circuit patterns, sensor shapes, electrical connections
- For Rogowski coils: circular/toroidal shapes, electromagnetic field patterns
- For current transformers: rectangular/square transformer shapes
- For smart grid: network patterns, grid connections
- For measurement: gauge-like elements, waveforms

Respond in this exact format:
FEATURED_IMAGE:
[Your contextual featured image prompt here]

SECTION_IMAGE:
[Your contextual section image prompt here]
        `.trim();

        const promptResponse = await this.langChainAPI.langchainSendMessage({
          message: promptGenerationMessage,
          conversationHistory: [],
          systemPrompt: 'You are a technical visual design expert specializing in creating DALL-E prompts for electrical engineering blog content. Focus on visual symbolism and technical aesthetics.'
        });
        
        if (promptResponse.success && promptResponse.message) {
          // Parse the response to extract prompts
          const featuredMatch = promptResponse.message.match(/FEATURED_IMAGE:\s*([\s\S]*?)(?=SECTION_IMAGE:|$)/i);
          const sectionMatch = promptResponse.message.match(/SECTION_IMAGE:\s*([\s\S]*?)$/i);
          
          if (featuredMatch && sectionMatch) {
            imagePrompts = {
              featured: featuredMatch[1].trim(),
              section: sectionMatch[1].trim()
            };
            terminalLogger.log('[BlogAutomationManager] Generated dynamic image prompts');
          }
        }
      } catch (promptError) {
        terminalLogger.error('[BlogAutomationManager] Dynamic prompt generation failed:', promptError);
      }
      
      // Fallback to default prompts if dynamic generation failed
      if (!imagePrompts) {
        terminalLogger.log('[BlogAutomationManager] Using fallback image prompts');
        imagePrompts = {
          featured: `Create a professional abstract illustration representing electrical sensor technology.
Style: Clean, modern, minimalist design with technical aesthetic.
Visual elements: Circuit patterns, sensor components, electrical connections, abstract waves.
Color scheme: Professional blue and silver tones.
IMPORTANT: No text, labels, numbers, or written words in the image.
Focus on visual symbolism and technical imagery only.`,
          section: `Create a clean technical illustration showing electrical measurement concepts.
Visual elements: Geometric shapes, circuit symbols, measurement indicators, flow diagrams.
Style: Minimalist technical diagram with clean lines and abstract representations.
Color scheme: Professional, muted colors with emphasis on clarity.
IMPORTANT: Avoid any text, labels, numbers, or written elements.
Pure visual representation only.`
        };
      }
      
      const featuredImagePrompt = imagePrompts.featured;
      
      // Check if image generation is available
      if (this.langChainAPI.generateImage) {
        const featuredImage = await this.langChainAPI.generateImage({
          prompt: featuredImagePrompt,
          size: '1024x1024',
          quality: 'standard'
        });
        
        if (featuredImage.success) {
          images.push({
            type: 'featured',
            url: featuredImage.url,
            alt: `${content.title} - Featured Image`,
            caption: content.title
          });
        }
      }
      
      // Generate section images if content has multiple sections
      if (content.sections && content.sections.length > 2) {
        // Generate an image for a key section
        const keySection = content.sections[Math.floor(content.sections.length / 2)];
        const sectionImagePrompt = imagePrompts.section;
        
        if (this.langChainAPI.generateImage) {
          const sectionImage = await this.langChainAPI.generateImage({
            prompt: sectionImagePrompt,
            size: '1024x1024',
            quality: 'standard'
          });
          
          if (sectionImage.success) {
            images.push({
              type: 'section',
              url: sectionImage.url,
              alt: `${keySection.title} - Diagram`,
              caption: keySection.title,
              sectionId: keySection.id
            });
          }
        }
      }
      
    } catch (error) {
      terminalLogger.warn('[BlogAutomationManager] Image generation failed:', error);
      // Continue without images
    }
    
    return images;
  }

  /**
   * Combine content with generated images
   */
  async combineContentWithImages(content, images) {
    terminalLogger.log('[BlogAutomationManager] Combining content with images');
    
    let enhancedHTML = content.html;
    
    // Add featured image at the beginning
    const featuredImage = images.find(img => img.type === 'featured');
    if (featuredImage) {
      const featuredImageHTML = `
<figure class="wp-block-image size-large">
  <img src="${featuredImage.url}" alt="${featuredImage.alt}" />
  <figcaption>${featuredImage.caption}</figcaption>
</figure>

`;
      enhancedHTML = featuredImageHTML + enhancedHTML;
    }
    
    // Insert section images
    images.filter(img => img.type === 'section').forEach(image => {
      const sectionImageHTML = `
<figure class="wp-block-image size-medium aligncenter">
  <img src="${image.url}" alt="${image.alt}" />
  <figcaption>${image.caption}</figcaption>
</figure>
`;
      
      // Find the section and insert image after its heading
      const sectionPattern = new RegExp(`(<section[^>]*id="${image.sectionId}"[^>]*>.*?<h2[^>]*>.*?</h2>)`, 'i');
      enhancedHTML = enhancedHTML.replace(sectionPattern, `$1\n${sectionImageHTML}`);
    });
    
    // Update content object
    const finalContent = {
      ...content,
      html: enhancedHTML,
      images: images,
      hasImages: images.length > 0
    };
    
    return finalContent;
  }

  /**
   * Auto-publish the blog post
   */
  async autoPublish(content) {
    terminalLogger.log('[BlogAutomationManager] Auto-publishing blog post');
    
    // Check credentials
    if (!this.publishingService.config.credentials) {
      throw new Error('WordPress credentials not configured. Please set up credentials first.');
    }
    
    // Prepare post data
    const postData = {
      title: content.title,
      content: content.html,
      excerpt: content.excerpt,
      status: 'publish', // Auto-publish as published
      categories: content.categories || ['Technology'],
      tags: content.keywords || [],
      meta: {
        seo_title: content.seoTitle,
        seo_description: content.seoDescription,
        seo_keywords: content.keywords
      }
    };
    
    // Upload images if any
    if (content.images && content.images.length > 0) {
      terminalLogger.log('[BlogAutomationManager] Processing images for upload...');
      
      try {
        // Convert image URLs to blobs and upload to WordPress
        const uploadedImages = await this.uploadImagesToWordPress(content.images);
        
        // Set featured image if available
        const featuredImage = uploadedImages.find(img => img.type === 'featured');
        if (featuredImage && featuredImage.mediaId) {
          postData.featured_media = featuredImage.mediaId;
          terminalLogger.log('[BlogAutomationManager] Featured image set:', featuredImage.mediaId);
        }
        
        // Update content with uploaded image URLs
        if (uploadedImages.length > 0) {
          content.html = this.replaceImageUrlsInContent(content.html, uploadedImages);
          postData.content = content.html;
        }
      } catch (error) {
        terminalLogger.error('[BlogAutomationManager] Image upload failed:', error);
        // Continue without images if upload fails
      }
    }
    
    // Publish
    terminalLogger.log('[BlogAutomationManager] Calling publishPost with data:', {
      title: postData.title,
      status: postData.status,
      hasContent: !!postData.content,
      contentPreview: postData.content?.substring(0, 100) + '...'
    });
    
    const result = await this.publishingService.publishPost(postData);
    
    // Update workflow
    this.activeWorkflow.data.publishResult = result;
    this.activeWorkflow.complete();
    
    return result;
  }

  /**
   * Start a new blog creation workflow (interactive)
   */
  async startNewBlogWorkflow(params = {}) {
    terminalLogger.log('[BlogAutomationManager] Starting new blog workflow');
    
    // Check if workflow is already active
    if (this.activeWorkflow && !this.activeWorkflow.completed) {
      return {
        type: 'warning',
        message: 'A blog workflow is already in progress. Complete or cancel it first.'
      };
    }
    
    try {
      // Create new workflow
      this.activeWorkflow = await this.workflowManager.createWorkflow({
        type: 'blog_creation',
        params: params,
        timestamp: Date.now()
      });
      
      // Start interactive workflow
      const response = await this.runInteractiveWorkflow();
      
      return response;
    } catch (error) {
      terminalLogger.error('[BlogAutomationManager] Failed to start workflow:', error);
      return {
        type: 'error',
        message: 'Failed to start blog workflow: ' + error.message
      };
    }
  }

  /**
   * Run interactive workflow with user
   */
  async runInteractiveWorkflow() {
    const workflow = this.activeWorkflow;
    const currentStep = workflow.getCurrentStep();
    
    switch (currentStep.id) {
      case 'gather_requirements':
        return {
          type: 'interactive',
          step: 'requirements',
          message: '블로그 주제를 알려주세요. 어떤 내용을 다루고 싶으신가요?',
          prompt: this.systemPrompts.getRequirementsPrompt()
        };
        
      case 'generate_outline':
        return {
          type: 'processing',
          message: '블로그 개요를 생성하고 있습니다...',
          action: async () => await this.generateOutline()
        };
        
      case 'generate_content':
        return {
          type: 'processing',
          message: '블로그 콘텐츠를 생성하고 있습니다...',
          action: async () => await this.generateContent()
        };
        
      case 'review_content':
        return {
          type: 'review',
          content: workflow.data.generatedContent,
          message: '생성된 콘텐츠를 검토해주세요. 수정이 필요하시면 알려주세요.'
        };
        
      case 'prepare_publishing':
        return {
          type: 'confirmation',
          message: 'WordPress에 게시할 준비가 완료되었습니다. 게시하시겠습니까?',
          data: workflow.data
        };
        
      default:
        return {
          type: 'info',
          message: 'Workflow step not implemented: ' + currentStep.id
        };
    }
  }

  /**
   * Generate blog outline based on requirements
   */
  async generateOutline() {
    const workflow = this.activeWorkflow;
    const requirements = workflow.data.requirements;
    
    terminalLogger.log('[BlogAutomationManager] Generating outline for:', requirements);
    
    try {
      // Use system prompt for outline generation
      const systemPrompt = this.systemPrompts.getOutlinePrompt(requirements);
      
      const outline = await this.contentGenerator.generateOutline(
        requirements,
        systemPrompt
      );
      
      // Update workflow data
      workflow.data.outline = outline;
      workflow.moveToNextStep();
      
      return {
        type: 'outline_generated',
        outline: outline,
        message: '개요가 생성되었습니다. 확인해주세요.'
      };
    } catch (error) {
      terminalLogger.error('[BlogAutomationManager] Outline generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate full blog content
   */
  async generateContent() {
    const workflow = this.activeWorkflow;
    const { requirements, outline } = workflow.data;
    
    terminalLogger.log('[BlogAutomationManager] Generating content');
    
    try {
      // Generate content section by section
      const content = await this.contentGenerator.generateFullContent(
        requirements,
        outline,
        {
          industry: 'electrical_sensors',
          language: 'korean',
          seoKeywords: workflow.data.seoKeywords || []
        }
      );
      
      // Update workflow data
      workflow.data.generatedContent = content;
      workflow.moveToNextStep();
      
      return {
        type: 'content_generated',
        content: content,
        message: '콘텐츠가 생성되었습니다.'
      };
    } catch (error) {
      terminalLogger.error('[BlogAutomationManager] Content generation failed:', error);
      throw error;
    }
  }

  /**
   * Publish blog to WordPress
   */
  async publishBlog(params = {}) {
    const workflow = this.activeWorkflow;
    
    if (!workflow || !workflow.data.generatedContent) {
      return {
        type: 'error',
        message: '게시할 콘텐츠가 없습니다. 먼저 블로그를 생성해주세요.'
      };
    }
    
    // Check if credentials are configured
    if (!this.publishingService.config.credentials) {
      return {
        type: 'credential_required',
        message: 'WordPress 인증 정보가 필요합니다. 사용자명과 비밀번호를 입력해주세요.',
        prompt: 'credentials'
      };
    }
    
    try {
      terminalLogger.log('[BlogAutomationManager] Publishing to WordPress');
      
      // Prepare post data
      const postData = {
        title: workflow.data.generatedContent.title,
        content: workflow.data.generatedContent.html || workflow.data.generatedContent.content,
        excerpt: workflow.data.generatedContent.excerpt,
        status: params.draft ? 'draft' : 'publish',
        categories: workflow.data.categories || [],
        tags: workflow.data.tags || [],
        meta: {
          seo_title: workflow.data.generatedContent.seoTitle,
          seo_description: workflow.data.generatedContent.seoDescription,
          seo_keywords: workflow.data.seoKeywords
        }
      };
      
      // Publish via WordPress API
      const result = await this.publishingService.publishPost(postData);
      
      // Update workflow
      workflow.data.publishResult = result;
      workflow.complete();
      
      return {
        type: 'published',
        result: result,
        message: `블로그가 성공적으로 게시되었습니다! URL: ${result.link}`
      };
    } catch (error) {
      terminalLogger.error('[BlogAutomationManager] Publishing failed:', error);
      
      // Check if it's an authentication error
      if (error.message.includes('401') || error.message.includes('authentication')) {
        return {
          type: 'credential_required',
          message: '인증 실패: WordPress 사용자명과 비밀번호를 확인해주세요.',
          prompt: 'credentials'
        };
      }
      
      return {
        type: 'error',
        message: '게시 중 오류가 발생했습니다: ' + error.message
      };
    }
  }

  /**
   * Set WordPress credentials
   */
  async setWordPressCredentials(username, password) {
    try {
      const isValid = await this.publishingService.setCredentials(username, password);
      
      if (isValid) {
        return {
          type: 'success',
          message: 'WordPress 인증 정보가 저장되었습니다.'
        };
      } else {
        return {
          type: 'error',
          message: '인증 실패: 사용자명과 비밀번호를 확인해주세요.'
        };
      }
    } catch (error) {
      terminalLogger.error('[BlogAutomationManager] Credential setup failed:', error);
      return {
        type: 'error',
        message: '인증 정보 설정 중 오류가 발생했습니다: ' + error.message
      };
    }
  }

  /**
   * Get blog automation help
   */
  getBlogHelp() {
    return {
      type: 'help',
      message: `
**블로그 자동화 명령어:**

• **/blog new** - 새 블로그 글 작성 시작 (대화형)
• **/blog auto** - 완전 자동 블로그 생성 및 게시
• **/blog auto [주제]** - 특정 주제로 자동 생성
• **/blog publish** - 작성된 글을 WordPress에 게시
• **/blog list** - 저장된 초안 목록 보기
• **/blog status** - 현재 작업 상태 확인
• **/blog help** - 도움말 보기

**자동화 예시:**
- "/blog auto" - AI가 트렌드 주제 선택 후 자동 생성
- "/blog auto 로고스키 코일의 장점" - 해당 주제로 자동 생성
- "스마트그리드에서 전류센서 활용 블로그 자동으로 써줘"

**특징:**
- 이미지 자동 생성 (제목 및 섹션 이미지)
- SEO 최적화
- 즉시 게시 또는 초안 저장
      `
    };
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for workflow events
    this.workflowManager.on('step_completed', (data) => {
      this.emit('workflow_progress', data);
    });
    
    // Listen for content generation events
    this.contentGenerator.on('progress', (data) => {
      this.emit('generation_progress', data);
    });
    
    // Listen for publishing events
    this.publishingService.on('publish_progress', (data) => {
      this.emit('publish_progress', data);
    });
    
    // Listen for automation events and relay to chat
    this.on('automation_started', (data) => {
      if (this.chatComponent) {
        this.chatComponent.addAssistantMessage(data.message, false);
      }
    });
    
    this.on('automation_progress', (data) => {
      if (this.chatComponent) {
        this.chatComponent.addAssistantMessage(data.message, false);
      }
    });
    
    this.on('automation_completed', (data) => {
      if (this.chatComponent) {
        if (data.success) {
          this.chatComponent.addPublishSuccess({
            message: data.message,
            result: data.result
          });
        } else {
          this.chatComponent.showError(data.message);
        }
      }
    });
    
    this.on('automation_failed', (data) => {
      if (this.chatComponent) {
        this.chatComponent.showError('자동화 실패: ' + data.error);
      }
    });
  }

  /**
   * Get current workflow status
   */
  async getWorkflowStatus() {
    if (!this.activeWorkflow) {
      return {
        type: 'info',
        message: '진행 중인 작업이 없습니다.'
      };
    }
    
    return {
      type: 'status',
      workflow: this.activeWorkflow.getStatus(),
      message: '현재 작업 상태입니다.'
    };
  }

  /**
   * List saved drafts
   */
  async listDrafts() {
    try {
      const drafts = await this.workflowManager.getSavedDrafts();
      
      return {
        type: 'drafts',
        drafts: drafts,
        message: `저장된 초안: ${drafts.length}개`
      };
    } catch (error) {
      terminalLogger.error('[BlogAutomationManager] Failed to list drafts:', error);
      return {
        type: 'error',
        message: '초안 목록을 불러올 수 없습니다.'
      };
    }
  }

  /**
   * Handle workflow continuation
   */
  async continueWorkflow(userInput) {
    if (!this.activeWorkflow) {
      return {
        type: 'error',
        message: '진행 중인 작업이 없습니다.'
      };
    }
    
    // Process user input based on current step
    const currentStep = this.activeWorkflow.getCurrentStep();
    
    switch (currentStep.id) {
      case 'gather_requirements':
        this.activeWorkflow.data.requirements = userInput;
        this.activeWorkflow.moveToNextStep();
        return await this.runInteractiveWorkflow();
        
      case 'review_content':
        if (userInput.toLowerCase().includes('수정')) {
          // Handle content modification
          return {
            type: 'interactive',
            message: '어떤 부분을 수정하시겠습니까?'
          };
        } else {
          this.activeWorkflow.moveToNextStep();
          return await this.runInteractiveWorkflow();
        }
        
      default:
        return await this.runInteractiveWorkflow();
    }
  }

  /**
   * Upload images to WordPress
   */
  async uploadImagesToWordPress(images) {
    terminalLogger.log('[BlogAutomationManager] Uploading images to WordPress...');
    const uploadedImages = [];
    
    for (const image of images) {
      try {
        // Download image from URL
        const response = await fetch(image.url);
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        // Create File object from blob
        const filename = `blog-image-${Date.now()}-${image.type}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg' });
        
        terminalLogger.log('[BlogAutomationManager] Uploading image:', filename);
        
        // Upload to WordPress using the existing media upload functionality
        const formData = new FormData();
        formData.append('file', file);
        
        const uploadResponse = await window.electronAPI.wordpress.request({
          method: 'POST',
          endpoint: '/media',
          data: formData,
          credentials: this.publishingService.config.credentials,
          isFormData: true
        });
        
        if (uploadResponse.success) {
          const media = uploadResponse.data;
          uploadedImages.push({
            ...image,
            mediaId: media.id,
            wpUrl: media.source_url || media.url,
            originalUrl: image.url
          });
          terminalLogger.log('[BlogAutomationManager] Image uploaded successfully:', media.id);
        }
      } catch (error) {
        terminalLogger.error('[BlogAutomationManager] Failed to upload image:', error);
      }
    }
    
    return uploadedImages;
  }

  /**
   * Replace image URLs in content with WordPress URLs
   */
  replaceImageUrlsInContent(content, uploadedImages) {
    let updatedContent = content;
    
    for (const image of uploadedImages) {
      if (image.originalUrl && image.wpUrl) {
        // Replace the placeholder or original URL with WordPress URL
        updatedContent = updatedContent.replace(
          new RegExp(image.originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          image.wpUrl
        );
        
        // Also replace any placeholder tags
        if (image.type === 'featured') {
          updatedContent = updatedContent.replace('[FEATURED_IMAGE]', image.wpUrl);
        } else if (image.type === 'section') {
          updatedContent = updatedContent.replace('[SECTION_IMAGE]', image.wpUrl);
        }
      }
    }
    
    return updatedContent;
  }

  /**
   * Clean up resources
   */
  async destroy() {
    terminalLogger.log('[BlogAutomationManager] Destroying...');
    
    // Save any active workflows
    if (this.activeWorkflow && !this.activeWorkflow.completed) {
      await this.workflowManager.saveWorkflow(this.activeWorkflow);
    }
    
    // Clean up sub-modules
    await this.contentGenerator.destroy();
    await this.publishingService.destroy();
    
    this.removeAllListeners();
  }
}

export default BlogAutomationManager;