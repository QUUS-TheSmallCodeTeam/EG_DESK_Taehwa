/**
 * TemplateManager - Manages content templates
 * 
 * Generates prompts and manages user-defined templates for content generation.
 * As specified in PRD: Content-System/TemplateManager.js
 */

import { EventEmitter } from '../../../utils/EventEmitter.js';

class TemplateManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      templatesPath: options.templatesPath || './templates',
      autoReload: options.autoReload !== false,
      ...options
    };
    
    this.templates = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize template manager
   */
  async initialize() {
    try {
      console.log('[TemplateManager] Initializing...');
      
      // Load templates from file or directory
      await this.reloadTemplates();

      if (this.options.autoReload) {
        this.setupFileWatchers();
      }
      
      this.isInitialized = true;
      console.log('[TemplateManager] Successfully initialized');
      this.emit('initialized');
      
      return true;
    } catch (error) {
      console.error('[TemplateManager] Initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Load or reload templates
   */
  async reloadTemplates() {
    try {
      // Placeholder - replace with actual file loading logic
      this.templates.clear();

      // Load templates from external source
      const exampleTemplate = {
        id: 'default',
        prompt: `다음 주제로 기본 템플릿을 사용하여 블로그 글을 작성해 주세요:\n\n주제: {{topic}}\n어투: {{tone}}\n키워드: {{keywords}}\n`  
      };

      this.templates.set(exampleTemplate.id, exampleTemplate);
      console.log(`[TemplateManager] Loaded templates from ${this.options.templatesPath}`);
      this.emit('templates-reloaded', { count: this.templates.size });

    } catch (error) {
      console.error('[TemplateManager] Failed to load templates:', error);
      throw error;
    }
  }

  /**
   * Get available templates
   */
  getAvailableTemplates() {
    return Array.from(this.templates.values());
  }

  /**
   * Generate prompt using a template
   */
  async generatePrompt(templateId, variables = {}) {
    if (!this.templates.has(templateId)) {
      throw new Error(`Template ${templateId} not found`);
    }

    const template = this.templates.get(templateId);
    const prompt = this.fillTemplate(template.prompt, variables);

    console.log(`[TemplateManager] Generated prompt using template: ${templateId}`);
    return prompt;
  }

  /**
   * Fill template with variables
   */
  fillTemplate(templateString, variables) {
    return templateString.replace(/{{(\w+)}}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  /**
   * Add or update a template
   */
  addOrUpdateTemplate(template) {
    if (!template.id || !template.prompt) {
      throw new Error('Invalid template format');
    }

    this.templates.set(template.id, template);
    console.log(`[TemplateManager] Added/Updated template: ${template.id}`);
    this.emit('template-updated', { id: template.id });
  }

  /**
   * Delete a template
   */
  deleteTemplate(templateId) {
    if (!this.templates.has(templateId)) {
      throw new Error(`Template ${templateId} not found`);
    }

    this.templates.delete(templateId);
    console.log(`[TemplateManager] Deleted template: ${templateId}`);
    this.emit('template-deleted', { templateId });
  }

  /**
   * Watch template files for changes
   */
  setupFileWatchers() {
    console.log('[TemplateManager] File watchers not implemented yet. Placeholder for future enhancement.');
  }

  /**
   * Destroy template manager
   */
  destroy() {
    this.templates.clear();
    this.isInitialized = false;
    this.removeAllListeners();
    console.log('[TemplateManager] Destroyed');
  }
}

export default TemplateManager;

