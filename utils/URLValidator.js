/**
 * URL Validation Utility
 * Shared URL validation and normalization logic to prevent duplication
 * between BrowserController and BrowserTabComponent
 */

class URLValidator {
  /**
   * Validate and normalize URL
   * @param {string} url - URL to validate
   * @returns {string} Validated URL
   */
  static validateURL(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('유효하지 않은 URL입니다');
    }

    url = url.trim();
    
    // Add protocol if missing
    if (!url.match(/^https?:\/\//)) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url;
      } else {
        // Treat as search query
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
    }

    // Basic URL validation
    try {
      new URL(url);
      return url;
    } catch (error) {
      throw new Error('올바른 URL 형식이 아닙니다');
    }
  }

  /**
   * Check if URL is a valid HTTP/HTTPS URL
   * @param {string} url - URL to check
   * @returns {boolean} True if valid HTTP/HTTPS URL
   */
  static isValidHttpUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract domain from URL
   * @param {string} url - URL to extract domain from
   * @returns {string|null} Domain or null if invalid
   */
  static extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return null;
    }
  }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = URLValidator;
} else {
  window.URLValidator = URLValidator;
}