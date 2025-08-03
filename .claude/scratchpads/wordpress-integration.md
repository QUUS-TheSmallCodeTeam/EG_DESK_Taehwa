# WordPress Integration Design

## Enhanced WordPress REST API Integration

### 1. Enhanced WPApiClient

#### WPApiClient.js Improvements
```javascript
class WPApiClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || '';
    this.credentials = config.credentials || {};
    this.timeout = config.timeout || 30000;
    this.retryAttempts = config.retryAttempts || 3;
    
    // Event system for status updates
    this.eventBus = config.eventBus;
    
    // Request interceptors for authentication
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Add authentication headers and error handling
    this.requestConfig = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.credentials.token}` || `Basic ${this.encodeCredentials()}`
      },
      timeout: this.timeout
    };
  }

  encodeCredentials() {
    if (this.credentials.username && this.credentials.password) {
      return btoa(`${this.credentials.username}:${this.credentials.password}`);
    }
    return '';
  }

  async publishBlogPost(blogContent, options = {}) {
    try {
      this.eventBus?.emit('blog.publishing.started', {
        title: blogContent.title,
        timestamp: Date.now()
      });

      // Prepare post data
      const postData = this.preparePostData(blogContent, options);
      
      // Upload featured image if provided
      if (blogContent.featuredImage) {
        postData.featured_media = await this.uploadFeaturedImage(blogContent.featuredImage);
      }
      
      // Create the post
      const response = await this.createPost(postData);
      
      // Handle categories and tags
      await this.handleTaxonomies(response.id, blogContent);
      
      // Set SEO metadata if plugin available
      await this.setSEOMetadata(response.id, blogContent.seoMeta);
      
      this.eventBus?.emit('blog.publishing.completed', {
        postId: response.id,
        url: response.link,
        title: response.title.rendered,
        timestamp: Date.now()
      });

      return {
        success: true,
        id: response.id,
        title: response.title.rendered,
        link: response.link,
        status: response.status,
        publishedAt: response.date,
        slug: response.slug
      };

    } catch (error) {
      this.eventBus?.emit('blog.publishing.failed', {
        error: error.message,
        title: blogContent.title,
        timestamp: Date.now()
      });
      
      throw new Error(`Publishing failed: ${error.message}`);
    }
  }

  preparePostData(blogContent, options) {
    const postData = {
      title: blogContent.title,
      content: this.formatContent(blogContent.content),
      excerpt: blogContent.excerpt,
      status: options.status || 'publish',
      author: options.authorId || 1,
      date: options.publishDate || new Date().toISOString(),
      slug: options.slug || this.generateSlug(blogContent.title)
    };

    // Add custom fields if provided
    if (blogContent.customFields) {
      postData.meta = blogContent.customFields;
    }

    return postData;
  }

  formatContent(content) {
    // Convert markdown to HTML if needed
    let formattedContent = content;
    
    // Add WordPress-specific formatting
    formattedContent = this.addWordPressBlocks(formattedContent);
    
    // Optimize images and media
    formattedContent = this.optimizeMediaLinks(formattedContent);
    
    return formattedContent;
  }

  addWordPressBlocks(content) {
    // Convert content to WordPress Gutenberg blocks if needed
    let blockedContent = content;
    
    // Convert headings to heading blocks
    blockedContent = blockedContent.replace(
      /^(#{1,6})\s+(.+)$/gm,
      (match, hashes, text) => {
        const level = hashes.length;
        return `<!-- wp:heading {"level":${level}} -->\n<h${level}>${text}</h${level}>\n<!-- /wp:heading -->`;
      }
    );
    
    // Convert paragraphs to paragraph blocks
    const paragraphs = blockedContent.split('\n\n').filter(p => p.trim());
    const blockContent = paragraphs.map(paragraph => {
      if (paragraph.startsWith('<!-- wp:')) {
        return paragraph; // Already a block
      }
      return `<!-- wp:paragraph -->\n<p>${paragraph}</p>\n<!-- /wp:paragraph -->`;
    }).join('\n\n');
    
    return blockContent;
  }

  async handleTaxonomies(postId, blogContent) {
    // Handle categories
    if (blogContent.categories && blogContent.categories.length > 0) {
      const categoryIds = await this.ensureCategories(blogContent.categories);
      await this.updatePost(postId, { categories: categoryIds });
    }
    
    // Handle tags
    if (blogContent.tags && blogContent.tags.length > 0) {
      const tagIds = await this.ensureTags(blogContent.tags);
      await this.updatePost(postId, { tags: tagIds });
    }
  }

  async ensureCategories(categories) {
    const categoryIds = [];
    
    for (const categoryName of categories) {
      try {
        // Check if category exists
        const existingCategories = await this.apiRequest('GET', '/wp/v2/categories', {
          search: categoryName
        });
        
        let categoryId;
        if (existingCategories.length > 0) {
          categoryId = existingCategories[0].id;
        } else {
          // Create new category
          const newCategory = await this.apiRequest('POST', '/wp/v2/categories', {
            name: categoryName,
            slug: this.generateSlug(categoryName)
          });
          categoryId = newCategory.id;
        }
        
        categoryIds.push(categoryId);
      } catch (error) {
        console.warn(`Failed to handle category ${categoryName}:`, error);
      }
    }
    
    return categoryIds;
  }

  async ensureTags(tags) {
    const tagIds = [];
    
    for (const tagName of tags) {
      try {
        // Check if tag exists
        const existingTags = await this.apiRequest('GET', '/wp/v2/tags', {
          search: tagName
        });
        
        let tagId;
        if (existingTags.length > 0) {
          tagId = existingTags[0].id;
        } else {
          // Create new tag
          const newTag = await this.apiRequest('POST', '/wp/v2/tags', {
            name: tagName,
            slug: this.generateSlug(tagName)
          });
          tagId = newTag.id;
        }
        
        tagIds.push(tagId);
      } catch (error) {
        console.warn(`Failed to handle tag ${tagName}:`, error);
      }
    }
    
    return tagIds;
  }

  async setSEOMetadata(postId, seoMeta) {
    if (!seoMeta) return;
    
    try {
      // Support for Yoast SEO plugin
      const yoastMeta = {
        _yoast_wpseo_title: seoMeta.title,
        _yoast_wpseo_metadesc: seoMeta.description,
        _yoast_wpseo_focuskw: seoMeta.focusKeyword,
        _yoast_wpseo_canonical: seoMeta.canonical
      };
      
      await this.updatePostMeta(postId, yoastMeta);
    } catch (error) {
      console.warn('Failed to set SEO metadata:', error);
    }
  }

  async uploadFeaturedImage(imageData) {
    try {
      const formData = new FormData();
      
      if (typeof imageData === 'string') {
        // URL provided - download and upload
        const imageBlob = await this.downloadImage(imageData);
        formData.append('file', imageBlob, 'featured-image.jpg');
      } else {
        // File object provided
        formData.append('file', imageData);
      }
      
      const response = await this.apiRequest('POST', '/wp/v2/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      return response.id;
    } catch (error) {
      console.warn('Failed to upload featured image:', error);
      return null;
    }
  }

  async createPost(postData) {
    return await this.apiRequest('POST', '/wp/v2/posts', postData);
  }

  async updatePost(postId, updateData) {
    return await this.apiRequest('POST', `/wp/v2/posts/${postId}`, updateData);
  }

  async updatePostMeta(postId, metaData) {
    return await this.apiRequest('POST', `/wp/v2/posts/${postId}`, {
      meta: metaData
    });
  }

  async getPost(postId) {
    return await this.apiRequest('GET', `/wp/v2/posts/${postId}`);
  }

  async deletePost(postId) {
    return await this.apiRequest('DELETE', `/wp/v2/posts/${postId}`);
  }

  async listPosts(params = {}) {
    const defaultParams = {
      per_page: 10,
      page: 1,
      orderby: 'date',
      order: 'desc'
    };
    
    return await this.apiRequest('GET', '/wp/v2/posts', { ...defaultParams, ...params });
  }

  async testConnection() {
    try {
      const response = await this.apiRequest('GET', '/wp/v2/posts', { per_page: 1 });
      return {
        success: true,
        message: 'WordPress connection successful',
        postsCount: response.length
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error
      };
    }
  }

  async apiRequest(method, endpoint, data = null, config = {}) {
    const url = `${this.baseUrl}/wp-json${endpoint}`;
    const requestConfig = {
      method,
      ...this.requestConfig,
      ...config
    };

    if (data && method !== 'GET') {
      if (data instanceof FormData) {
        delete requestConfig.headers['Content-Type']; // Let browser set it
        requestConfig.body = data;
      } else {
        requestConfig.body = JSON.stringify(data);
      }
    }

    // Add query parameters for GET requests
    if (data && method === 'GET') {
      const params = new URLSearchParams(data);
      url += `?${params}`;
    }

    let lastError;
    
    // Retry logic
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, requestConfig);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
        
      } catch (error) {
        lastError = error;
        
        if (attempt < this.retryAttempts) {
          await this.delay(attempt * 1000); // Exponential backoff
          continue;
        }
      }
    }
    
    throw lastError;
  }

  generateSlug(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async downloadImage(url) {
    const response = await fetch(url);
    return await response.blob();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  optimizeMediaLinks(content) {
    // Add lazy loading and responsive image attributes
    return content.replace(
      /<img([^>]*)src="([^"]*)"([^>]*)>/g,
      '<img$1src="$2"$3 loading="lazy" decoding="async">'
    );
  }
}
```

### 2. Publishing Pipeline Manager

#### PublishingWorkflow.js
```javascript
class PublishingWorkflow {
  constructor(wpApiClient, eventBus) {
    this.wpApiClient = wpApiClient;
    this.eventBus = eventBus;
    this.publishingQueue = [];
    this.isProcessing = false;
  }

  async queueForPublishing(blogContent, options = {}) {
    const publishJob = {
      id: Date.now(),
      content: blogContent,
      options: {
        status: options.status || 'publish',
        publishDate: options.publishDate || new Date(),
        categories: options.categories || [],
        tags: options.tags || [],
        ...options
      },
      status: 'queued',
      createdAt: Date.now(),
      attempts: 0
    };

    this.publishingQueue.push(publishJob);
    
    this.eventBus.emit('blog.publishing.queued', {
      jobId: publishJob.id,
      title: blogContent.title
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      await this.processQueue();
    }

    return publishJob.id;
  }

  async processQueue() {
    if (this.isProcessing || this.publishingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.publishingQueue.length > 0) {
      const job = this.publishingQueue.shift();
      
      try {
        job.status = 'processing';
        this.eventBus.emit('blog.publishing.processing', {
          jobId: job.id,
          title: job.content.title
        });

        const result = await this.wpApiClient.publishBlogPost(job.content, job.options);
        
        job.status = 'completed';
        job.result = result;
        job.completedAt = Date.now();

        this.eventBus.emit('blog.publishing.success', {
          jobId: job.id,
          result: result
        });

      } catch (error) {
        job.attempts++;
        job.lastError = error.message;

        if (job.attempts < 3) {
          // Retry logic
          job.status = 'retrying';
          this.publishingQueue.push(job); // Re-queue for retry
          
          this.eventBus.emit('blog.publishing.retry', {
            jobId: job.id,
            attempt: job.attempts,
            error: error.message
          });
        } else {
          job.status = 'failed';
          job.failedAt = Date.now();
          
          this.eventBus.emit('blog.publishing.failed', {
            jobId: job.id,
            error: error.message,
            attempts: job.attempts
          });
        }
      }

      // Add delay between publishing attempts
      await this.delay(2000);
    }

    this.isProcessing = false;
  }

  async immediatePublish(blogContent, options = {}) {
    try {
      return await this.wpApiClient.publishBlogPost(blogContent, options);
    } catch (error) {
      // Fallback to queue if immediate publish fails
      return await this.queueForPublishing(blogContent, options);
    }
  }

  getQueueStatus() {
    return {
      queued: this.publishingQueue.filter(job => job.status === 'queued').length,
      processing: this.publishingQueue.filter(job => job.status === 'processing').length,
      failed: this.publishingQueue.filter(job => job.status === 'failed').length,
      total: this.publishingQueue.length,
      isProcessing: this.isProcessing
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 3. WordPress Configuration Manager

#### WPConfigManager.js
```javascript
class WPConfigManager {
  constructor(electronStore) {
    this.store = electronStore;
    this.configKey = 'wordpress.config';
  }

  saveConfig(config) {
    // Validate configuration
    const validatedConfig = this.validateConfig(config);
    
    // Encrypt sensitive data
    const encryptedConfig = this.encryptSensitiveData(validatedConfig);
    
    this.store.set(this.configKey, encryptedConfig);
    
    return { success: true, message: 'WordPress configuration saved successfully' };
  }

  getConfig() {
    const encryptedConfig = this.store.get(this.configKey, {});
    return this.decryptSensitiveData(encryptedConfig);
  }

  validateConfig(config) {
    const required = ['siteUrl', 'username', 'password'];
    const missing = required.filter(field => !config[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate URL format
    try {
      new URL(config.siteUrl);
    } catch {
      throw new Error('Invalid site URL format');
    }

    return {
      siteUrl: config.siteUrl.replace(/\/$/, ''), // Remove trailing slash
      username: config.username,
      password: config.password,
      defaultCategories: config.defaultCategories || [],
      defaultTags: config.defaultTags || [],
      defaultAuthor: config.defaultAuthor || 1,
      autoPublish: config.autoPublish || false
    };
  }

  encryptSensitiveData(config) {
    // Basic encryption for password (use proper encryption in production)
    return {
      ...config,
      password: Buffer.from(config.password).toString('base64')
    };
  }

  decryptSensitiveData(config) {
    if (!config.password) return config;
    
    return {
      ...config,
      password: Buffer.from(config.password, 'base64').toString()
    };
  }

  async testConnection(config = null) {
    const testConfig = config || this.getConfig();
    
    if (!testConfig.siteUrl) {
      return { success: false, message: 'No WordPress configuration found' };
    }

    const tempClient = new WPApiClient({
      baseUrl: testConfig.siteUrl,
      credentials: {
        username: testConfig.username,
        password: testConfig.password
      }
    });

    return await tempClient.testConnection();
  }
}
```

### 4. Media Management

#### MediaUploader.js
```javascript
class MediaUploader {
  constructor(wpApiClient) {
    this.wpApiClient = wpApiClient;
    this.supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  async uploadImage(file, metadata = {}) {
    // Validate file
    this.validateFile(file);
    
    // Optimize image if needed
    const optimizedFile = await this.optimizeImage(file);
    
    // Upload to WordPress
    const result = await this.wpApiClient.uploadMedia(optimizedFile, metadata);
    
    return {
      id: result.id,
      url: result.source_url,
      title: result.title.rendered,
      alt: result.alt_text,
      caption: result.caption.rendered,
      filename: result.media_details.file
    };
  }

  validateFile(file) {
    if (!this.supportedTypes.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }
    
    if (file.size > this.maxFileSize) {
      throw new Error('File size too large (max 10MB)');
    }
  }

  async optimizeImage(file) {
    // Basic image optimization
    // In production, use more sophisticated image processing
    return file;
  }

  async generateFeaturedImage(blogContent) {
    // Generate featured image based on blog content
    // Could integrate with AI image generation services
    return null;
  }
}
```

This WordPress integration provides comprehensive publishing capabilities with error handling, retry logic, media management, and proper WordPress REST API integration.