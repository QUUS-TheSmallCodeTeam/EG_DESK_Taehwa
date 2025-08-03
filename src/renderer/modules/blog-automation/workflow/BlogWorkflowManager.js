/**
 * BlogWorkflowManager - Manages blog creation workflow steps
 * 
 * Handles workflow state, step progression, and persistence
 */

import { EventEmitter } from '../../../utils/EventEmitter.js';

class BlogWorkflowManager extends EventEmitter {
  constructor() {
    super();
    
    // Define workflow steps
    this.workflowSteps = [
      {
        id: 'gather_requirements',
        name: '요구사항 수집',
        description: '블로그 주제 및 요구사항 파악'
      },
      {
        id: 'generate_outline',
        name: '개요 생성',
        description: 'AI를 통한 블로그 구조 생성'
      },
      {
        id: 'generate_content',
        name: '콘텐츠 생성',
        description: '섹션별 상세 내용 작성'
      },
      {
        id: 'review_content',
        name: '콘텐츠 검토',
        description: '생성된 내용 검토 및 수정'
      },
      {
        id: 'prepare_publishing',
        name: '게시 준비',
        description: 'SEO 최적화 및 메타데이터 설정'
      },
      {
        id: 'publish',
        name: '게시',
        description: 'WordPress에 게시'
      }
    ];
    
    this.activeWorkflows = new Map();
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(config = {}) {
    const workflow = {
      id: `workflow_${Date.now()}`,
      type: config.type || 'blog_creation',
      status: 'active',
      currentStep: 0,
      steps: [...this.workflowSteps],
      data: {
        createdAt: new Date().toISOString(),
        ...config.params
      },
      completed: false,
      completedSteps: []
    };
    
    // Add workflow methods
    workflow.getCurrentStep = () => this.getCurrentStep(workflow);
    workflow.moveToNextStep = () => this.moveToNextStep(workflow);
    workflow.moveToPreviousStep = () => this.moveToPreviousStep(workflow);
    workflow.complete = () => this.completeWorkflow(workflow);
    workflow.getStatus = () => this.getWorkflowStatus(workflow);
    
    this.activeWorkflows.set(workflow.id, workflow);
    
    // Save to storage
    await this.saveWorkflow(workflow);
    
    this.emit('workflow_created', workflow);
    
    return workflow;
  }

  /**
   * Get current step of workflow
   */
  getCurrentStep(workflow) {
    return workflow.steps[workflow.currentStep];
  }

  /**
   * Move to next step
   */
  moveToNextStep(workflow) {
    if (workflow.currentStep < workflow.steps.length - 1) {
      // Mark current step as completed
      const currentStep = workflow.steps[workflow.currentStep];
      workflow.completedSteps.push({
        id: currentStep.id,
        completedAt: new Date().toISOString()
      });
      
      workflow.currentStep++;
      
      this.emit('step_completed', {
        workflowId: workflow.id,
        completedStep: currentStep,
        nextStep: workflow.steps[workflow.currentStep]
      });
      
      // Save progress
      this.saveWorkflow(workflow);
      
      return true;
    }
    
    return false;
  }

  /**
   * Move to previous step
   */
  moveToPreviousStep(workflow) {
    if (workflow.currentStep > 0) {
      workflow.currentStep--;
      
      // Remove from completed steps
      workflow.completedSteps = workflow.completedSteps.filter(
        step => workflow.steps.findIndex(s => s.id === step.id) < workflow.currentStep
      );
      
      this.emit('step_reverted', {
        workflowId: workflow.id,
        currentStep: workflow.steps[workflow.currentStep]
      });
      
      // Save progress
      this.saveWorkflow(workflow);
      
      return true;
    }
    
    return false;
  }

  /**
   * Complete workflow
   */
  completeWorkflow(workflow) {
    workflow.completed = true;
    workflow.completedAt = new Date().toISOString();
    workflow.status = 'completed';
    
    this.emit('workflow_completed', workflow);
    
    // Save final state
    this.saveWorkflow(workflow);
    
    // Remove from active workflows
    this.activeWorkflows.delete(workflow.id);
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(workflow) {
    const totalSteps = workflow.steps.length;
    const completedSteps = workflow.completedSteps.length;
    const progress = (completedSteps / totalSteps) * 100;
    
    return {
      id: workflow.id,
      type: workflow.type,
      status: workflow.status,
      currentStep: workflow.getCurrentStep(),
      progress: Math.round(progress),
      totalSteps: totalSteps,
      completedSteps: completedSteps,
      data: workflow.data,
      createdAt: workflow.data.createdAt,
      completedAt: workflow.completedAt
    };
  }

  /**
   * Save workflow to storage
   */
  async saveWorkflow(workflow) {
    try {
      const workflows = await window.electronAPI.store.get('blog.workflows') || {};
      workflows[workflow.id] = workflow;
      await window.electronAPI.store.set('blog.workflows', workflows);
    } catch (error) {
      console.error('[BlogWorkflowManager] Failed to save workflow:', error);
    }
  }

  /**
   * Load saved workflows
   */
  async loadSavedWorkflows() {
    try {
      const workflows = await window.electronAPI.store.get('blog.workflows') || {};
      
      for (const [id, workflow] of Object.entries(workflows)) {
        if (workflow.status === 'active' && !workflow.completed) {
          // Restore workflow methods
          workflow.getCurrentStep = () => this.getCurrentStep(workflow);
          workflow.moveToNextStep = () => this.moveToNextStep(workflow);
          workflow.moveToPreviousStep = () => this.moveToPreviousStep(workflow);
          workflow.complete = () => this.completeWorkflow(workflow);
          workflow.getStatus = () => this.getWorkflowStatus(workflow);
          
          this.activeWorkflows.set(id, workflow);
        }
      }
      
      console.log(`[BlogWorkflowManager] Loaded ${this.activeWorkflows.size} active workflows`);
    } catch (error) {
      console.error('[BlogWorkflowManager] Failed to load workflows:', error);
    }
  }

  /**
   * Get saved drafts
   */
  async getSavedDrafts() {
    try {
      const workflows = await window.electronAPI.store.get('blog.workflows') || {};
      const drafts = [];
      
      for (const workflow of Object.values(workflows)) {
        if (workflow.data.generatedContent && !workflow.data.publishResult) {
          drafts.push({
            id: workflow.id,
            title: workflow.data.generatedContent.title || 'Untitled',
            excerpt: workflow.data.generatedContent.excerpt || '',
            createdAt: workflow.data.createdAt,
            status: workflow.status,
            progress: this.getWorkflowStatus(workflow).progress
          });
        }
      }
      
      // Sort by creation date
      drafts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return drafts;
    } catch (error) {
      console.error('[BlogWorkflowManager] Failed to get drafts:', error);
      return [];
    }
  }

  /**
   * Resume workflow from draft
   */
  async resumeWorkflow(workflowId) {
    try {
      const workflows = await window.electronAPI.store.get('blog.workflows') || {};
      const workflow = workflows[workflowId];
      
      if (!workflow) {
        throw new Error('Workflow not found');
      }
      
      // Restore workflow methods
      workflow.getCurrentStep = () => this.getCurrentStep(workflow);
      workflow.moveToNextStep = () => this.moveToNextStep(workflow);
      workflow.moveToPreviousStep = () => this.moveToPreviousStep(workflow);
      workflow.complete = () => this.completeWorkflow(workflow);
      workflow.getStatus = () => this.getWorkflowStatus(workflow);
      
      this.activeWorkflows.set(workflowId, workflow);
      
      this.emit('workflow_resumed', workflow);
      
      return workflow;
    } catch (error) {
      console.error('[BlogWorkflowManager] Failed to resume workflow:', error);
      throw error;
    }
  }

  /**
   * Delete workflow/draft
   */
  async deleteWorkflow(workflowId) {
    try {
      const workflows = await window.electronAPI.store.get('blog.workflows') || {};
      delete workflows[workflowId];
      await window.electronAPI.store.set('blog.workflows', workflows);
      
      // Remove from active workflows if present
      this.activeWorkflows.delete(workflowId);
      
      this.emit('workflow_deleted', workflowId);
      
      return true;
    } catch (error) {
      console.error('[BlogWorkflowManager] Failed to delete workflow:', error);
      return false;
    }
  }

  /**
   * Get active workflow
   */
  getActiveWorkflow() {
    // Return the most recent active workflow
    const workflows = Array.from(this.activeWorkflows.values());
    if (workflows.length === 0) return null;
    
    return workflows.sort((a, b) => 
      new Date(b.data.createdAt) - new Date(a.data.createdAt)
    )[0];
  }

  /**
   * Cancel active workflow
   */
  async cancelWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return false;
    
    workflow.status = 'cancelled';
    workflow.cancelledAt = new Date().toISOString();
    
    await this.saveWorkflow(workflow);
    this.activeWorkflows.delete(workflowId);
    
    this.emit('workflow_cancelled', workflow);
    
    return true;
  }
}

export default BlogWorkflowManager;