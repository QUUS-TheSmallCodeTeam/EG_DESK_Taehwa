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
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import OpenAI from "openai";

class LangChainService {
  constructor(secureKeyManager) {
    this.secureKeyManager = secureKeyManager;
    this.providers = new Map();
    this.currentProvider = 'claude';
    this.currentModel = null;
    this.isInitialized = false;
    this.blogAutomationTool = null;
    this.electronWindow = null;
    this.currentConversationHistory = [];
    this.agentExecutor = null;
    
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
        name: 'OpenAI GPT Models',
        models: [
          { id: 'gpt-5', name: 'GPT-5 (Latest)', context: 128000 },
          { id: 'gpt-5-mini', name: 'GPT-5 Mini', context: 128000 },
          { id: 'gpt-5-nano', name: 'GPT-5 Nano', context: 128000 },
          { id: 'gpt-4.1', name: 'GPT-4.1', context: 1000000 },
          { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', context: 1000000 },
          { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', context: 1000000 },
          { id: 'gpt-4o', name: 'GPT-4o (Multimodal)', context: 128000 },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', context: 128000 },
          { id: 'o3', name: 'O3 (Reasoning)', context: 128000 },
          { id: 'o4-mini', name: 'O4 Mini (Reasoning)', context: 128000 }
        ],
        defaultModel: 'gpt-5',
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
   * Set Electron window reference for IPC communication
   */
  async setElectronWindow(window) {
    this.electronWindow = window;
    await this.initializeBlogTool();
  }

  /**
   * Check if message is a blog request
   */
  checkIfBlogRequest(message) {
    const blogPatterns = [
      /블로그.*(?:써|작성|만들|생성|게시)/i,
      /(?:써|작성|만들|생성|게시).*블로그/i,
      /blog.*(?:write|create|post|article|publish)/i,
      /(?:write|create|post|publish).*(?:blog|article)/i,
      /글.*(?:써|작성|게시)/i,
      /포스트.*(?:작성|올려|게시)/i,
      /아티클.*(?:써|작성|게시)/i,
      /게시.*(?:블로그|글|포스트)/i
    ];
    
    return blogPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Initialize blog automation tool
   */
  async initializeBlogTool() {
    if (!this.electronWindow) return;
    
    // Define the schema for blog automation - simplified
    const blogSchema = z.object({
      topic: z.string().describe("The main topic or title of the blog post")
    });
    
    // Create the blog automation tool with complete workflow
    this.blogAutomationTool = tool(
      async ({ topic }, runManager) => {
        // Set default values for optional parameters
        const subtopics = [];
        const audience = "일반 독자";
        const tone = "professional";
        const keywords = [];
        try {
          console.log('🚀 [BlogAutomationTool] Starting blog automation workflow');
          console.log('📝 [BlogAutomationTool] Tool called with params:', {
            topic,
            subtopics,
            audience,
            tone,
            keywords
          });
          
          // Get the current conversation context if available
          const conversationContext = this.currentConversationHistory || [];
          
          // Send progress update to renderer
          const sendProgress = (message) => {
            this.electronWindow.webContents.send('blog-automation-progress', { message });
          };
          
          sendProgress(`📝 블로그 작성을 시작합니다. 주제: "${topic}"`);
          
          // Step 1: Generate blog title with context
          sendProgress('🎯 제목을 생성하고 있습니다...');
          const titlePrompt = `${conversationContext.length > 0 ? '이전 대화 내용을 참고하여, ' : ''}주제 "${topic}"에 대한 매력적인 블로그 제목을 한국어로 만들어주세요. 
          대상 독자: ${audience}, 톤: ${tone}
          제목만 반환하세요.`;
          
          // Create clean messages for title generation without system prompts
          const titleMessages = [
            new SystemMessage('당신은 전문 블로그 작가입니다. 주어진 주제에 대해 매력적이고 SEO에 최적화된 한국어 블로그 제목을 생성해주세요. 따옴표 없이 제목만 출력하세요.'),
            new HumanMessage(titlePrompt)
          ];
          
          // Check if OpenAI provider is available
          if (!this.providers.has('openai')) {
            console.error('❌ [BlogAutomationTool] OpenAI provider not available');
            throw new Error('OpenAI provider not available');
          }
          
          console.log('📝 [BlogAutomationTool] Generating title with messages:', titleMessages.length);
          
          // Create a separate model without tools for content generation
          const contentModel = new ChatOpenAI({
            apiKey: (await this.secureKeyManager.getProviderKey('openai')).api_key,
            model: 'gpt-4o',
            temperature: 1  // GPT-5 only supports default temperature
          });
          
          const titleResponse = await contentModel.invoke(titleMessages);
          console.log('📝 [BlogAutomationTool] Title response:', titleResponse);
          
          const rawTitle = titleResponse.content?.trim() || `${topic}에 대한 전문가 가이드`;
          // Clean the title - remove quotes if present
          const title = rawTitle.replace(/^["']|["']$/g, '').trim();
          console.log('📝 [BlogAutomationTool] Generated title:', title);
          sendProgress(`✅ 제목 생성 완료: ${title}`);
          
          // Step 2: Generate blog content with context
          sendProgress('📝 본문 내용을 작성하고 있습니다...');
          const contentPrompt = `${conversationContext.length > 0 ? '우리의 대화 내용을 바탕으로, ' : ''}다음 블로그 글을 작성해주세요:
          제목: ${title}
          주제: ${topic}
          하위 주제: ${subtopics?.join(', ') || '자유롭게 구성'}
          대상 독자: ${audience}
          톤: ${tone}
          키워드: ${keywords?.join(', ') || ''}
          
          ${conversationContext.length > 0 ? '대화에서 언급된 중요한 포인트들을 포함시켜주세요.' : ''}
          HTML 형식으로 작성하되, 구조화된 섹션과 단락으로 나누어주세요.`;
          
          // Include conversation history for context
          const contentMessages = [];
          if (conversationContext.length > 0) {
            // Add conversation context
            contentMessages.push(...conversationContext.slice(-10)); // Last 10 messages for more context
          }
          contentMessages.push(new HumanMessage(contentPrompt));
          
          const contentResponse = await contentModel.invoke(contentMessages);
          const content = contentResponse.content;
          sendProgress('✅ 본문 작성 완료');
          
          // Step 3: Generate 2 images with dynamic prompts
          sendProgress('🎨 이미지를 생성하고 있습니다...');
          const images = [];
          
          // Generate dynamic image prompts based on blog content
          let imagePrompts;
          try {
            sendProgress('🎯 블로그 내용에 맞는 이미지 프롬프트를 생성하고 있습니다...');
            
            const promptGenerationMessage = `
Analyze this blog content and generate 2 specific image prompts for DALL-E:

BLOG TITLE: "${title}"
BLOG TOPIC: "${topic}"
BLOG CONTENT: ${content.substring(0, 1000)}...

Generate 2 image prompts:
1. FEATURED_IMAGE: A header illustration specific to this blog topic
2. SECTION_IMAGE: A supporting illustration for the content

CRITICAL REQUIREMENTS:
- NO TEXT, LABELS, NUMBERS, or WRITTEN WORDS in either image
- Must be visually relevant to the specific blog topic "${topic}"
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

            const promptResponse = await contentModel.invoke([
              new SystemMessage('You are a technical visual design expert specializing in creating DALL-E prompts for electrical engineering blog content. Focus on visual symbolism and technical aesthetics.'),
              new HumanMessage(promptGenerationMessage)
            ]);
            
            if (promptResponse.content) {
              // Parse the response to extract prompts
              const featuredMatch = promptResponse.content.match(/FEATURED_IMAGE:\s*([\s\S]*?)(?=SECTION_IMAGE:|$)/i);
              const sectionMatch = promptResponse.content.match(/SECTION_IMAGE:\s*([\s\S]*?)$/i);
              
              if (featuredMatch && sectionMatch) {
                imagePrompts = {
                  featured: featuredMatch[1].trim(),
                  section: sectionMatch[1].trim()
                };
                console.log('✅ [BlogAutomationTool] Generated dynamic image prompts');
              }
            }
          } catch (promptError) {
            console.error('❌ [BlogAutomationTool] Dynamic prompt generation failed:', promptError);
          }
          
          // Fallback to default prompts if dynamic generation failed
          if (!imagePrompts) {
            console.log('📝 [BlogAutomationTool] Using fallback image prompts');
            imagePrompts = {
              featured: `Create a professional abstract header illustration for a technical blog about ${topic}.
              Style: Clean, modern, minimalist design with technical aesthetic.
              Visual elements: Abstract circuit patterns, geometric shapes, technology symbols relevant to ${topic}.
              Color scheme: Professional blue and silver tones.
              IMPORTANT: No text, labels, numbers, or written words in the image.
              Focus on abstract visual elements only.`,
              section: `Create a supporting technical illustration for ${topic}.
              Visual elements: Geometric shapes, technical symbols, flow diagrams, abstract patterns related to ${topic}.
              Style: Minimalist technical diagram with clean lines.
              Color scheme: Professional, muted colors.
              IMPORTANT: Avoid any text, labels, numbers, or written elements.
              Pure visual representation only.`
            };
          }
          
          const featuredImagePrompt = imagePrompts.featured;
          const sectionImagePrompt = imagePrompts.section;
          
          // Generate images using DALL-E via OpenAI
          try {
            const openai = new OpenAI({ 
              apiKey: this.providers.get('openai').apiKey 
            });
            
            // Generate featured image
            console.log('🎨 [BlogAutomationTool] Generating featured image with DALL-E...');
            const featuredImageResponse = await openai.images.generate({
              model: "dall-e-3",
              prompt: featuredImagePrompt,
              n: 1,
              size: "1024x1024",  // Use smaller size to reduce file size
              quality: "standard",
              response_format: "url"  // Get URL format
            });
            
            if (featuredImageResponse.data[0]?.url) {
              images.push({
                type: 'featured',
                prompt: featuredImagePrompt,
                url: featuredImageResponse.data[0].url,
                placeholder: false
              });
              console.log('✅ [BlogAutomationTool] Featured image generated');
            }
            
            // Generate section image
            console.log('🎨 [BlogAutomationTool] Generating section image with DALL-E...');
            const sectionImageResponse = await openai.images.generate({
              model: "dall-e-3",
              prompt: sectionImagePrompt,
              n: 1,
              size: "1024x1024",
              quality: "standard"
            });
            
            if (sectionImageResponse.data[0]?.url) {
              images.push({
                type: 'section',
                prompt: sectionImagePrompt,
                url: sectionImageResponse.data[0].url,
                placeholder: false
              });
              console.log('✅ [BlogAutomationTool] Section image generated');
            }
          } catch (imageError) {
            console.error('❌ [BlogAutomationTool] Image generation failed:', imageError);
            // Fallback to placeholder if image generation fails
            images.push({
              type: 'featured',
              prompt: featuredImagePrompt,
              placeholder: true
            });
            images.push({
              type: 'section',
              prompt: sectionImagePrompt,
              placeholder: true
            });
          }
          sendProgress('✅ 이미지 생성 완료 (2개)');
          
          // Step 4: Format and combine everything
          sendProgress('📐 최종 포맷팅 중...');
          const formattedContent = `
          <article>
            <h1>${title}</h1>
            <!-- Featured Image Placeholder -->
            <figure class="featured-image">
              <img src="[FEATURED_IMAGE]" alt="${title}" />
            </figure>
            
            ${content}
            
            <!-- Section Image Placeholder -->
            <figure class="section-image">
              <img src="[SECTION_IMAGE]" alt="${topic} illustration" />
            </figure>
          </article>
          `;
          
          // Step 5: Send to renderer for WordPress publishing
          sendProgress('📤 WordPress에 게시 준비 중...');
          console.log('🔔 [BlogAutomationTool] Sending IPC to renderer:', {
            title,
            topic,
            hasContent: !!formattedContent,
            hasImages: images.length
          });
          
          this.electronWindow.webContents.send('start-blog-automation-from-tool', {
            title,
            content: formattedContent,
            topic,
            images,
            metadata: {
              audience,
              tone,
              keywords,
              subtopics
            },
            fromTool: true
          });
          
          return `✅ 블로그 자동화가 완료되었습니다!
📌 제목: ${title}
🎨 이미지: 2개 생성됨
📝 상태: WordPress 게시 진행 중...`;
          
        } catch (error) {
          console.error('[BlogAutomationTool] Error:', error);
          return `❌ 블로그 자동화 실패: ${error.message}`;
        }
      },
      {
        name: "create_blog_post",
        description: "Creates a blog post. Use when user asks to write a blog, post, or article about any topic. Extract the topic from the user's request.",
        schema: blogSchema
      }
    );
    
    console.log('🛠️ LangChainService: Blog automation tool initialized');
    
    // Initialize agent executor for tool calling
    await this.initializeAgentExecutor();
  }

  /**
   * Initialize agent executor for tool calling
   */
  async initializeAgentExecutor() {
    console.log('🤖 LangChainService: Initializing agent executor');
    
    // Get current provider instance
    if (!this.providers.has(this.currentProvider)) {
      console.log('⚠️ LangChainService: No provider available for agent executor');
      return;
    }
    
    const provider = this.providers.get(this.currentProvider);
    const tools = [this.blogAutomationTool];
    
    try {
      // Create prompt template with system message
      const prompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          `You are an AI assistant for 태화트랜스 (Taehwa Trans), specializing in electrical sensors and blog automation.

IMPORTANT RULES:
1. When a user asks you to write a blog, article, or post, you MUST use the create_blog_post tool.
2. Do NOT write blog content directly in the chat.
3. Extract the topic from the user's request and use it in the tool call.
4. The create_blog_post tool will handle all aspects of blog creation including title, content, images, and publishing.

You have access to the following tool:
{tools}

To use a tool, respond with a JSON object with 'name' and 'arguments' keys:
{{"name": "tool_name", "arguments": {{"param1": "value1", "param2": "value2"}}}}

Examples:
- User: "블로그 글 써줘" -> Use create_blog_post with a relevant topic
- User: "로고스키 코일에 대한 블로그 글을 써줘" -> Use create_blog_post with topic: "로고스키 코일"
- User: "Write a blog about smart grids" -> Use create_blog_post with topic: "smart grids"`
        ],
        ["user", "{input}"],
        new MessagesPlaceholder("agent_scratchpad")
      ]);
      
      // Create the agent based on provider type
      if (this.currentProvider === 'openai') {
        try {
          // Bind the tool directly to the model
          const modelWithTools = provider.instance.bind({
            tools: [this.blogAutomationTool]
          });
          
          // Store the model with tools for direct invocation
          this.modelWithTools = modelWithTools;
          
          // Also create agent executor for backward compatibility
          const agent = await createOpenAIFunctionsAgent({
            llm: provider.instance,
            tools,
            prompt
          });
          
          // Create agent executor
          this.agentExecutor = new AgentExecutor({
            agent,
            tools,
            verbose: true,
            returnIntermediateSteps: true,
            maxIterations: 3,
            handleParsingErrors: true
          });
          
          console.log('✅ LangChainService: Model with tools and agent executor initialized');
        } catch (error) {
          console.error('❌ LangChainService: Failed to create agent with tools:', error);
          this.agentExecutor = null;
          this.modelWithTools = null;
        }
      } else {
        // For other providers, we'll use direct tool binding
        console.log('⚠️ LangChainService: Agent executor only fully supported for OpenAI');
        this.agentExecutor = null;
        this.modelWithTools = null;
        return;
      }
      
      console.log('✅ LangChainService: Agent executor initialized successfully');
    } catch (error) {
      console.error('❌ LangChainService: Failed to initialize agent executor:', error);
      this.agentExecutor = null;
    }
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
            temperature: 1,  // GPT-5 only supports default temperature
            max_completion_tokens: 4000
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
    
    // Reinitialize agent executor for new provider
    if (this.blogAutomationTool) {
      await this.initializeAgentExecutor();
    }
    
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
    console.log('📨 [LangChainService] Received message:', message.substring(0, 50) + '...');
    
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
      
      // Store current conversation history for tool context
      this.currentConversationHistory = messages;
      
      const startTime = Date.now();
      let response;
      
      // Always try to use model with tools for OpenAI to let LLM decide
      if (this.modelWithTools && this.currentProvider === 'openai') {
        console.log('🤖 [LangChainService] Using model with tools - letting LLM decide');
        
        try {
          // Let the LLM decide whether to use tools based on the message
          const toolMessages = [
            new SystemMessage(`You are an AI assistant for 태화트랜스 (Taehwa Trans). You have access to tools including blog creation. Use tools when appropriate based on user requests.`),
            ...messages.slice(1) // Skip the original system message
          ];
          
          const toolResponse = await this.modelWithTools.invoke(toolMessages);
          console.log('🛠️ [LangChainService] Tool response:', {
            hasContent: !!toolResponse.content,
            hasToolCalls: !!(toolResponse.tool_calls && toolResponse.tool_calls.length > 0),
            toolCalls: toolResponse.tool_calls
          });
          
          if (toolResponse.tool_calls && toolResponse.tool_calls.length > 0) {
            // Execute the tool calls
            for (const toolCall of toolResponse.tool_calls) {
              console.log('🔧 [LangChainService] Executing tool call:', toolCall);
              if (toolCall.name === 'create_blog_post') {
                const result = await this.blogAutomationTool.invoke(toolCall.args);
                console.log('✅ [LangChainService] Tool execution result:', result);
                // Don't return tool execution details to chat - just a simple confirmation
                response = {
                  content: '블로그 작성을 시작했습니다. 잠시 후 WordPress에 게시됩니다.',
                  tool_calls: [toolCall]
                };
              }
            }
          } else {
            // No tool calls - normal response
            console.log('💬 [LangChainService] LLM chose not to use tools');
            response = toolResponse;
          }
        } catch (modelError) {
          console.error('❌ [LangChainService] Model with tools failed:', modelError);
          
          // Fall back to regular chat
          response = await provider.instance.invoke(messages);
        }
      } else {
        // Regular chat without agent executor
        console.log('💬 [LangChainService] Using regular chat (not a blog request)');
        response = await provider.instance.invoke(messages);
      }
      
      const endTime = Date.now();
      
      console.log('📥 [LangChainService] Response received:', {
        hasContent: !!response.content,
        contentLength: response.content?.length,
        contentPreview: response.content?.substring(0, 100) + '...',
        hasToolCalls: !!(response.tool_calls && response.tool_calls.length > 0),
        toolCallsCount: response.tool_calls?.length || 0,
        responseKeys: Object.keys(response)
      });
      
      // Tool calls are already handled above, no need to process again
      
      // Calculate costs and tokens (approximate)
      const inputTokens = this.estimateTokens(messages);
      const outputTokens = this.estimateTokens([response]);
      const cost = this.calculateCost(inputTokens, outputTokens);
      
      // Update cost tracking
      this.updateCostTracking(inputTokens, outputTokens, cost);
      
      const result = {
        success: true,
        message: response.content || (response.tool_calls ? '블로그 작성을 시작합니다...' : ''),
        provider: this.currentProvider,
        model: this.currentModel,
        metadata: {
          inputTokens,
          outputTokens,
          cost,
          responseTime: endTime - startTime,
          timestamp: Date.now(),
          toolCalls: response.tool_calls
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
  async streamMessage(message, conversationHistory = [], systemPrompt = null) {
    console.log('🌊 [LangChainService] Starting streaming for:', message.substring(0, 50) + '...');
    
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
      const messages = this.buildMessageHistory(message, conversationHistory, systemPrompt);
      
      // Store current conversation history for tool context
      this.currentConversationHistory = messages;
      
      // Always use regular message handling for all requests to allow LLM to decide
      // LLM will determine if it should use tools based on the message intent
      console.log('🔄 [LangChainService] Redirecting streaming to regular message for tool decision');
      return await this.sendMessage(message, conversationHistory, systemPrompt);
      
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