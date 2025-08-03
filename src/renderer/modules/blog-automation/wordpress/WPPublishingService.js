/**
 * WPPublishingService - WordPress publishing service
 * 
 * Handles blog post publishing to WordPress using REST API
 * with retry logic, error handling, and media management.
 */

import { EventEmitter } from '../../../utils/EventEmitter.js';
import terminalLogger from '../../../utils/terminalLogger.js';

class WPPublishingService extends EventEmitter {
  constructor() {
    super();
    
    // WordPress configuration
    this.config = {
      siteUrl: 'https://m8chaa.mycafe24.com',
      apiBase: '/wp-json/wp/v2',
      credentials: null,
      maxRetries: 3,
      retryDelay: 2000
    };
    
    this.isInitialized = false;
  }

  /**
   * Initialize the publishing service
   */
  async initialize() {
    terminalLogger.log('[WPPublishingService] Initializing...');
    
    try {
      // Load stored credentials if available
      if (window.electronAPI && window.electronAPI.store) {
        try {
          const storedCreds = await window.electronAPI.store.get('wordpress.credentials');
          if (storedCreds) {
            this.config.credentials = storedCreds;
            terminalLogger.log('[WPPublishingService] Loaded stored credentials');
          } else {
            // Set default credentials for testing
            terminalLogger.log('[WPPublishingService] No stored credentials, using default');
            this.config.credentials = {
              username: 'm8chaa',
              password: '0gs8 Ydya LfhD 1twc 6RM1 4o7f'
            };
            // Save default credentials
            await window.electronAPI.store.set('wordpress.credentials', this.config.credentials);
            terminalLogger.log('[WPPublishingService] Default credentials saved');
          }
        } catch (error) {
          terminalLogger.warn('[WPPublishingService] Could not load stored credentials:', error);
          // Use default credentials as fallback
          this.config.credentials = {
            username: 'm8chaa',
            password: '0gs8 Ydya LfhD 1twc 6RM1 4o7f'
          };
        }
      }
      
      // Test connection if credentials exist
      if (this.config.credentials) {
        const isValid = await this.testConnection();
        if (!isValid) {
          terminalLogger.warn('[WPPublishingService] Stored credentials are invalid');
          this.config.credentials = null;
        }
      }
      
      this.isInitialized = true;
      terminalLogger.log('[WPPublishingService] Initialization complete');
      
    } catch (error) {
      terminalLogger.error('[WPPublishingService] Initialization failed:', error);
      // Don't throw - allow initialization to continue without credentials
      this.isInitialized = true;
    }
  }

  /**
   * Set WordPress credentials
   */
  async setCredentials(username, password) {
    this.config.credentials = {
      username,
      password: password // Should be Application Password
    };
    
    // Test and save credentials
    const isValid = await this.testConnection();
    
    if (isValid) {
      // Save encrypted credentials
      await window.electronAPI.store.set('wordpress.credentials', this.config.credentials);
      terminalLogger.log('[WPPublishingService] Credentials saved');
    }
    
    return isValid;
  }

  /**
   * Test WordPress connection
   */
  async testConnection() {
    terminalLogger.log('[WPPublishingService] Testing WordPress connection...');
    
    try {
      const response = await window.electronAPI.wordpress.request({
        method: 'GET',
        endpoint: '/users/me',
        credentials: this.config.credentials
      });
      
      if (response.success) {
        const userData = response.data;
        terminalLogger.log('[WPPublishingService] Connection successful. User:', userData.name);
        this.emit('connection_tested', { success: true, user: userData });
        return true;
      } else {
        terminalLogger.error('[WPPublishingService] Connection failed:', response.status || response.error);
        this.emit('connection_tested', { success: false, error: response.error || 'Connection failed' });
        return false;
      }
    } catch (error) {
      terminalLogger.error('[WPPublishingService] Connection test error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      });
      this.emit('connection_tested', { success: false, error: error.message });
      return false;
    }
  }

  /**
   * Publish a blog post
   */
  async publishPost(postData) {
    terminalLogger.log('[WPPublishingService] Publishing post:', postData.title);
    
    if (!this.config.credentials) {
      throw new Error('WordPress credentials not configured');
    }
    
    this.emit('publish_progress', {
      stage: 'preparing',
      message: '게시물 준비 중...'
    });
    
    try {
      // Prepare post payload
      const payload = await this.preparePostPayload(postData);
      
      // Create post with retry logic
      const post = await this.createPostWithRetry(payload);
      
      // Upload and attach media if present
      if (postData.media && postData.media.length > 0) {
        await this.uploadAndAttachMedia(post.id, postData.media);
      }
      
      // Update post with final content (including media)
      if (postData.finalContent) {
        await this.updatePost(post.id, { content: postData.finalContent });
      }
      
      this.emit('publish_progress', {
        stage: 'completed',
        message: '게시 완료!',
        post: post
      });
      
      return post;
      
    } catch (error) {
      terminalLogger.error('[WPPublishingService] Publishing failed:', error);
      this.emit('publish_progress', {
        stage: 'error',
        message: '게시 실패: ' + error.message,
        error: error
      });
      throw error;
    }
  }

  /**
   * Prepare post payload for WordPress API
   */
  async preparePostPayload(postData) {
    const payload = {
      title: postData.title,
      content: postData.content || postData.html,
      excerpt: postData.excerpt,
      status: postData.status || 'draft',
      format: 'standard',
      comment_status: 'open',
      ping_status: 'open'
    };
    
    // Add categories
    if (postData.categories && postData.categories.length > 0) {
      payload.categories = await this.resolveCategories(postData.categories);
    }
    
    // Add tags
    if (postData.tags && postData.tags.length > 0) {
      payload.tags = await this.resolveTags(postData.tags);
    }
    
    // Add custom meta
    if (postData.meta) {
      payload.meta = {
        ...postData.meta,
        _yoast_wpseo_title: postData.meta.seo_title || postData.seoTitle,
        _yoast_wpseo_metadesc: postData.meta.seo_description || postData.seoDescription,
        _yoast_wpseo_focuskeywords: postData.meta.seo_keywords || postData.keywords
      };
    }
    
    return payload;
  }

  /**
   * Create post with retry logic
   */
  async createPostWithRetry(payload, retries = 0) {
    try {
      this.emit('publish_progress', {
        stage: 'creating',
        message: '포스트 생성 중...',
        retry: retries
      });
      
      const response = await window.electronAPI.wordpress.request({
        method: 'POST',
        endpoint: '/posts',
        data: payload,
        credentials: this.config.credentials
      });
      
      if (!response.success) {
        throw new Error(`API Error ${response.status || 'Unknown'}: ${JSON.stringify(response.error)}`);
      }
      
      const post = response.data;
      terminalLogger.log('[WPPublishingService] Post created successfully:', {
        id: post.id,
        title: post.title?.rendered || post.title,
        link: post.link,
        status: post.status
      });
      
      return post;
      
    } catch (error) {
      terminalLogger.error('[WPPublishingService] Create post error:', error);
      
      if (retries < this.config.maxRetries) {
        terminalLogger.log(`[WPPublishingService] Retrying... (${retries + 1}/${this.config.maxRetries})`);
        await this.delay(this.config.retryDelay);
        return this.createPostWithRetry(payload, retries + 1);
      }
      
      throw error;
    }
  }

  /**
   * Update existing post
   */
  async updatePost(postId, updates) {
    terminalLogger.log('[WPPublishingService] Updating post:', postId);
    
    const response = await window.electronAPI.wordpress.request({
      method: 'PUT',
      endpoint: `/posts/${postId}`,
      data: updates,
      credentials: this.config.credentials
    });
    
    if (!response.success) {
      throw new Error(`Failed to update post: ${response.error || 'Unknown error'}`);
    }
    
    return response.data;
  }

  /**
   * Resolve category names to IDs
   */
  async resolveCategories(categoryNames) {
    const categoryIds = [];
    
    for (const name of categoryNames) {
      try {
        // First, try to find existing category
        const searchResponse = await window.electronAPI.wordpress.request({
          method: 'GET',
          endpoint: `/categories?search=${encodeURIComponent(name)}`,
          credentials: this.config.credentials
        });
        
        if (searchResponse.success) {
          const categories = searchResponse.data;
          
          if (categories.length > 0) {
            categoryIds.push(categories[0].id);
          } else {
            // Create new category if not found
            const newCategory = await this.createCategory(name);
            categoryIds.push(newCategory.id);
          }
        }
      } catch (error) {
        terminalLogger.warn(`[WPPublishingService] Failed to resolve category "${name}":`, error);
      }
    }
    
    return categoryIds;
  }

  /**
   * Create new category
   */
  async createCategory(name) {
    const response = await fetch(`${this.config.siteUrl}${this.config.apiBase}/categories`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create category: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Resolve tag names to IDs
   */
  async resolveTags(tagNames) {
    const tagIds = [];
    
    for (const name of tagNames) {
      try {
        // First, try to find existing tag
        const searchResponse = await fetch(
          `${this.config.siteUrl}${this.config.apiBase}/tags?search=${encodeURIComponent(name)}`,
          {
            headers: {
              'Authorization': this.getAuthHeader()
            }
          }
        );
        
        if (searchResponse.ok) {
          const tags = await searchResponse.json();
          
          if (tags.length > 0) {
            tagIds.push(tags[0].id);
          } else {
            // Create new tag if not found
            const newTag = await this.createTag(name);
            tagIds.push(newTag.id);
          }
        }
      } catch (error) {
        terminalLogger.warn(`[WPPublishingService] Failed to resolve tag "${name}":`, error);
      }
    }
    
    return tagIds;
  }

  /**
   * Create new tag
   */
  async createTag(name) {
    const response = await fetch(`${this.config.siteUrl}${this.config.apiBase}/tags`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create tag: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Upload and attach media files
   */
  async uploadAndAttachMedia(postId, mediaFiles) {
    terminalLogger.log('[WPPublishingService] Uploading media files...');
    
    this.emit('publish_progress', {
      stage: 'uploading_media',
      message: '미디어 업로드 중...'
    });
    
    const uploadedMedia = [];
    
    for (const file of mediaFiles) {
      try {
        const media = await this.uploadMedia(file);
        uploadedMedia.push(media);
        
        // Set as featured image if it's the first image
        if (uploadedMedia.length === 1 && file.type.startsWith('image/')) {
          await this.setFeaturedImage(postId, media.id);
        }
      } catch (error) {
        terminalLogger.error('[WPPublishingService] Media upload failed:', error);
      }
    }
    
    return uploadedMedia;
  }

  /**
   * Upload single media file
   */
  async uploadMedia(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${this.config.siteUrl}${this.config.apiBase}/media`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader()
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Media upload failed: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Set featured image for post
   */
  async setFeaturedImage(postId, mediaId) {
    await this.updatePost(postId, {
      featured_media: mediaId
    });
  }

  /**
   * Get auth header
   */
  getAuthHeader() {
    if (!this.config.credentials) {
      throw new Error('No credentials configured');
    }
    
    const { username, password } = this.config.credentials;
    const base64 = btoa(`${username}:${password}`);
    return `Basic ${base64}`;
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get recent posts
   */
  async getRecentPosts(count = 10) {
    const response = await fetch(
      `${this.config.siteUrl}${this.config.apiBase}/posts?per_page=${count}&_embed`,
      {
        headers: {
          'Authorization': this.getAuthHeader()
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Delete post
   */
  async deletePost(postId) {
    const response = await fetch(
      `${this.config.siteUrl}${this.config.apiBase}/posts/${postId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': this.getAuthHeader()
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to delete post: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Clean up resources
   */
  async destroy() {
    this.removeAllListeners();
    this.config.credentials = null;
  }
}

export default WPPublishingService;