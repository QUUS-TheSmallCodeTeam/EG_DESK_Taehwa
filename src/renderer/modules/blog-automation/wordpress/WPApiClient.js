/**
 * WPApiClient - WordPress REST API Client
 * 
 * Handles all WordPress REST API communication for blog automation.
 * As specified in PRD: WordPress-Integration/WPApiClient.js
 */

import { EventEmitter } from '../../../utils/EventEmitter.js';

class WPApiClient extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };
    
    this.siteUrl = null;
    this.credentials = null;
    this.isInitialized = false;
    this.rateLimitDelay = 1000; // 1 second between requests
    this.lastRequestTime = 0;
  }

  /**
   * Initialize WordPress API client
   */
  async initialize(siteUrl, credentials) {
    try {
      
      // Validate inputs
      if (!siteUrl) {
        throw new Error('Site URL is required');
      }
      
      if (typeof siteUrl !== 'string') {
        throw new Error(`Site URL must be a string, received: ${typeof siteUrl} - ${siteUrl}`);
      }
      
      this.siteUrl = siteUrl.replace(/\/$/, ''); // Remove trailing slash
      this.credentials = credentials;
      
      // Test API connection
      await this.testConnection();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      return true;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Test WordPress API connection
   */
  async testConnection() {
    try {
      const response = await this.makeRequest('GET', '/wp-json/wp/v2/users/me');
      
      if (response.id) {
        return { success: true, user: response };
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      throw new Error(`WordPress connection failed: ${error.message}`);
    }
  }

  /**
   * Create a new post
   */
  async createPost(postData) {
    if (!this.isInitialized) {
      throw new Error('WPApiClient not initialized');
    }

    try {
      
      const payload = {
        title: postData.title,
        content: postData.content,
        status: postData.status || 'draft',
        excerpt: postData.excerpt || '',
        categories: postData.categories || [],
        tags: postData.tags || [],
        featured_media: postData.featuredMedia || 0,
        meta: postData.meta || {},
        ...postData.customFields
      };

      const response = await this.makeRequest('POST', '/wp-json/wp/v2/posts', payload);
      
      this.emit('post-created', { id: response.id, post: response });
      
      return response;
    } catch (error) {
      this.emit('post-creation-failed', { error: error.message, postData });
      throw error;
    }
  }

  /**
   * Update existing post
   */
  async updatePost(postId, postData) {
    if (!this.isInitialized) {
      throw new Error('WPApiClient not initialized');
    }

    try {
      
      const payload = {
        title: postData.title,
        content: postData.content,
        status: postData.status,
        excerpt: postData.excerpt,
        categories: postData.categories,
        tags: postData.tags,
        featured_media: postData.featuredMedia,
        meta: postData.meta,
        ...postData.customFields
      };

      // Remove undefined values
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      const response = await this.makeRequest('POST', `/wp-json/wp/v2/posts/${postId}`, payload);
      
      this.emit('post-updated', { id: postId, post: response });
      
      return response;
    } catch (error) {
      this.emit('post-update-failed', { id: postId, error: error.message });
      throw error;
    }
  }

  /**
   * Get post by ID
   */
  async getPost(postId) {
    if (!this.isInitialized) {
      throw new Error('WPApiClient not initialized');
    }

    try {
      const response = await this.makeRequest('GET', `/wp-json/wp/v2/posts/${postId}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get posts with filters
   */
  async getPosts(filters = {}) {
    if (!this.isInitialized) {
      throw new Error('WPApiClient not initialized');
    }

    try {
      const params = new URLSearchParams();
      
      // Common filters
      if (filters.per_page) params.append('per_page', filters.per_page);
      if (filters.page) params.append('page', filters.page);
      if (filters.status) params.append('status', filters.status);
      if (filters.categories) params.append('categories', filters.categories);
      if (filters.tags) params.append('tags', filters.tags);
      if (filters.search) params.append('search', filters.search);
      if (filters.author) params.append('author', filters.author);
      if (filters.before) params.append('before', filters.before);
      if (filters.after) params.append('after', filters.after);

      const queryString = params.toString();
      const endpoint = `/wp-json/wp/v2/posts${queryString ? '?' + queryString : ''}`;
      
      const response = await this.makeRequest('GET', endpoint);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete post
   */
  async deletePost(postId, force = false) {
    if (!this.isInitialized) {
      throw new Error('WPApiClient not initialized');
    }

    try {
      
      const params = force ? '?force=true' : '';
      const response = await this.makeRequest('DELETE', `/wp-json/wp/v2/posts/${postId}${params}`);
      
      this.emit('post-deleted', { id: postId, forced: force });
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload media file
   */
  async uploadMedia(file, metadata = {}) {
    if (!this.isInitialized) {
      throw new Error('WPApiClient not initialized');
    }

    try {
      
      const formData = new FormData();
      formData.append('file', file);
      
      if (metadata.title) formData.append('title', metadata.title);
      if (metadata.caption) formData.append('caption', metadata.caption);
      if (metadata.alt_text) formData.append('alt_text', metadata.alt_text);
      if (metadata.description) formData.append('description', metadata.description);

      const response = await this.makeRequest('POST', '/wp-json/wp/v2/media', formData, {
        'Content-Type': undefined // Let browser set multipart boundary
      });
      
      this.emit('media-uploaded', { id: response.id, media: response });
      
      return response;
    } catch (error) {
      this.emit('media-upload-failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get categories
   */
  async getCategories(params = {}) {
    if (!this.isInitialized) {
      throw new Error('WPApiClient not initialized');
    }

    try {
      const queryParams = new URLSearchParams(params);
      const queryString = queryParams.toString();
      const endpoint = `/wp-json/wp/v2/categories${queryString ? '?' + queryString : ''}`;
      
      const response = await this.makeRequest('GET', endpoint);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create category
   */
  async createCategory(categoryData) {
    if (!this.isInitialized) {
      throw new Error('WPApiClient not initialized');
    }

    try {
      const response = await this.makeRequest('POST', '/wp-json/wp/v2/categories', categoryData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get tags
   */
  async getTags(params = {}) {
    if (!this.isInitialized) {
      throw new Error('WPApiClient not initialized');
    }

    try {
      const queryParams = new URLSearchParams(params);
      const queryString = queryParams.toString();
      const endpoint = `/wp-json/wp/v2/tags${queryString ? '?' + queryString : ''}`;
      
      const response = await this.makeRequest('GET', endpoint);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create tag
   */
  async createTag(tagData) {
    if (!this.isInitialized) {
      throw new Error('WPApiClient not initialized');
    }

    try {
      const response = await this.makeRequest('POST', '/wp-json/wp/v2/tags', tagData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get site information
   */
  async getSiteInfo() {
    if (!this.isInitialized) {
      throw new Error('WPApiClient not initialized');
    }

    try {
      const response = await this.makeRequest('GET', '/wp-json');
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Make HTTP request with authentication and error handling
   */
  async makeRequest(method, endpoint, data = null, customHeaders = {}) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    const url = `${this.siteUrl}${endpoint}`;
    
    let attempt = 0;
    while (attempt < this.options.retryAttempts) {
      try {
        const headers = {
          'Authorization': `Basic ${btoa(this.credentials.username + ':' + this.credentials.password)}`,
          ...customHeaders
        };

        // Don't set Content-Type for FormData
        if (data && !(data instanceof FormData)) {
          headers['Content-Type'] = 'application/json';
        }

        const config = {
          method,
          headers,
          signal: AbortSignal.timeout(this.options.timeout)
        };

        if (data) {
          config.body = data instanceof FormData ? data : JSON.stringify(data);
        }

        const response = await fetch(url, config);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage;
          
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          
          throw new Error(errorMessage);
        }

        const responseData = await response.json();
        return responseData;

      } catch (error) {
        attempt++;
        
        if (attempt >= this.options.retryAttempts) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.options.retryDelay * attempt));
      }
    }
  }

  /**
   * Get client statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      siteUrl: this.siteUrl,
      rateLimitDelay: this.rateLimitDelay,
      timeout: this.options.timeout,
      retryAttempts: this.options.retryAttempts
    };
  }

  /**
   * Update credentials
   */
  updateCredentials(credentials) {
    this.credentials = credentials;
    this.emit('credentials-updated');
  }

  /**
   * Update site URL
   */
  updateSiteUrl(siteUrl) {
    if (!siteUrl) {
      return;
    }
    
    this.siteUrl = siteUrl.replace(/\/$/, '');
    this.emit('site-url-updated', { siteUrl: this.siteUrl });
  }

  /**
   * Destroy WordPress API client
   */
  destroy() {
    this.siteUrl = null;
    this.credentials = null;
    this.isInitialized = false;
    this.removeAllListeners();
  }
}

export default WPApiClient;
