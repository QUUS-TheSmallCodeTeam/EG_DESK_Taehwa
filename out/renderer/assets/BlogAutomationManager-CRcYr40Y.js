import { E as EventEmitter } from "./index-BVKxRGvd.js";
class BlogCommandParser {
  constructor() {
    this.commandPatterns = [
      {
        pattern: /^\/blog\s+(\w+)(?:\s+(.*))?$/i,
        type: "slash_command"
      },
      {
        pattern: /블로그\s*(?:글|포스트)?\s*(?:써|작성|만들|올려)/i,
        type: "natural_language",
        action: "auto"
      },
      {
        pattern: /.*블로그\s*글.*(?:써|작성)/i,
        type: "natural_language",
        action: "auto"
      },
      {
        pattern: /(?:아무|랜덤|자동).*블로그.*(?:써|올려|게시)/i,
        type: "natural_language",
        action: "auto"
      },
      {
        pattern: /(?:태화|taehwa).*(?:로고스키|전류센서|변류기).*(?:글|블로그|포스트)/i,
        type: "natural_language",
        action: "new",
        context: "product_specific"
      },
      {
        pattern: /SEO\s*키워드.*(?:블로그|글|포스트)/i,
        type: "natural_language",
        action: "new",
        context: "seo_focused"
      },
      {
        pattern: /블로그.*게시|발행|퍼블리시/i,
        type: "natural_language",
        action: "publish"
      },
      {
        pattern: /(?:그냥|일단).*블로그.*(?:써|쓰고|올려)/i,
        type: "natural_language",
        action: "auto"
      },
      {
        pattern: /블로그.*(?:하나|한개|한 개).*(?:써|작성|올려)/i,
        type: "natural_language",
        action: "auto"
      }
    ];
    this.validActions = ["new", "auto", "publish", "list", "status", "help", "edit", "delete"];
  }
  /**
   * Parse user input for blog commands
   */
  parse(input) {
    if (!input || typeof input !== "string") {
      return null;
    }
    const trimmedInput = input.trim();
    console.log("[BlogCommandParser] Parsing input:", trimmedInput);
    const slashCommand = this.parseSlashCommand(trimmedInput);
    if (slashCommand) {
      console.log("[BlogCommandParser] Found slash command:", slashCommand);
      return slashCommand;
    }
    const naturalCommand = this.parseNaturalLanguage(trimmedInput);
    if (naturalCommand) {
      console.log("[BlogCommandParser] Found natural language command:", naturalCommand);
      return naturalCommand;
    }
    console.log("[BlogCommandParser] No blog command found in input");
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
    const params = match[2] ? match[2].trim() : "";
    if (!this.validActions.includes(action)) {
      return {
        type: "blog",
        action: "unknown",
        raw: input
      };
    }
    return {
      type: "blog",
      action,
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
          type: "blog",
          action: pattern.action,
          params: {
            naturalLanguage: true,
            originalInput: input
          },
          raw: input
        };
        if (pattern.context) {
          command.params.context = pattern.context;
        }
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
    const keyValuePattern = /(\w+)=["']?([^"']+)["']?/g;
    let match;
    while ((match = keyValuePattern.exec(paramString)) !== null) {
      params[match[1]] = match[2];
    }
    if (Object.keys(params).length === 0) {
      params.text = paramString;
    }
    return params;
  }
  /**
   * Extract topics and keywords from natural language input
   */
  extractTopicsAndKeywords(input, params) {
    const productKeywords = {
      "로고스키": "rogowski_coil",
      "rogowski": "rogowski_coil",
      "전류센서": "current_sensor",
      "변류기": "current_transformer",
      "CT": "current_transformer",
      "영상변류기": "zero_phase_ct",
      "ACB": "acb_ct"
    };
    const technicalKeywords = [
      "측정",
      "정확도",
      "설치",
      "유지보수",
      "교정",
      "사양",
      "규격",
      "전력품질",
      "에너지관리",
      "스마트그리드",
      "IoT",
      "산업용"
    ];
    for (const [keyword, value] of Object.entries(productKeywords)) {
      if (input.includes(keyword)) {
        params.product = value;
        break;
      }
    }
    params.keywords = [];
    for (const keyword of technicalKeywords) {
      if (input.includes(keyword)) {
        params.keywords.push(keyword);
      }
    }
    const seoMatch = input.match(/SEO\s*키워드\s*['"']?([^'"']+)['"']?/i);
    if (seoMatch) {
      params.seoKeywords = seoMatch[1].split(/[,\s]+/).filter((k) => k.length > 0);
    }
    if (input.includes("기술") || input.includes("technical")) {
      params.contentType = "technical";
    } else if (input.includes("소개") || input.includes("introduction")) {
      params.contentType = "introduction";
    } else if (input.includes("비교") || input.includes("comparison")) {
      params.contentType = "comparison";
    }
  }
  /**
   * Check if input might be a blog-related query
   */
  isBlogRelated(input) {
    const blogKeywords = [
      "블로그",
      "blog",
      "글",
      "포스트",
      "post",
      "작성",
      "써",
      "게시",
      "발행",
      "publish",
      "wordpress",
      "wp",
      "콘텐츠",
      "content"
    ];
    const lowerInput = input.toLowerCase();
    return blogKeywords.some((keyword) => lowerInput.includes(keyword));
  }
  /**
   * Get command suggestions based on partial input
   */
  getSuggestions(partialInput) {
    if (!partialInput.startsWith("/blog")) {
      return [];
    }
    const suggestions = this.validActions.map((action) => ({
      command: `/blog ${action}`,
      description: this.getActionDescription(action)
    }));
    const partialAction = partialInput.replace("/blog", "").trim();
    if (partialAction) {
      return suggestions.filter(
        (s) => s.command.toLowerCase().includes(partialAction.toLowerCase())
      );
    }
    return suggestions;
  }
  /**
   * Get description for blog action
   */
  getActionDescription(action) {
    const descriptions = {
      "new": "새 블로그 글 작성",
      "auto": "자동 블로그 생성 및 게시",
      "publish": "작성된 글 게시",
      "list": "저장된 초안 목록",
      "status": "현재 작업 상태",
      "help": "도움말 보기",
      "edit": "초안 수정",
      "delete": "초안 삭제"
    };
    return descriptions[action] || action;
  }
}
class BlogWorkflowManager extends EventEmitter {
  constructor() {
    super();
    this.workflowSteps = [
      {
        id: "gather_requirements",
        name: "요구사항 수집",
        description: "블로그 주제 및 요구사항 파악"
      },
      {
        id: "generate_outline",
        name: "개요 생성",
        description: "AI를 통한 블로그 구조 생성"
      },
      {
        id: "generate_content",
        name: "콘텐츠 생성",
        description: "섹션별 상세 내용 작성"
      },
      {
        id: "review_content",
        name: "콘텐츠 검토",
        description: "생성된 내용 검토 및 수정"
      },
      {
        id: "prepare_publishing",
        name: "게시 준비",
        description: "SEO 최적화 및 메타데이터 설정"
      },
      {
        id: "publish",
        name: "게시",
        description: "WordPress에 게시"
      }
    ];
    this.activeWorkflows = /* @__PURE__ */ new Map();
  }
  /**
   * Create a new workflow
   */
  async createWorkflow(config = {}) {
    const workflow = {
      id: `workflow_${Date.now()}`,
      type: config.type || "blog_creation",
      status: "active",
      currentStep: 0,
      steps: [...this.workflowSteps],
      data: {
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        ...config.params
      },
      completed: false,
      completedSteps: []
    };
    workflow.getCurrentStep = () => this.getCurrentStep(workflow);
    workflow.moveToNextStep = () => this.moveToNextStep(workflow);
    workflow.moveToPreviousStep = () => this.moveToPreviousStep(workflow);
    workflow.complete = () => this.completeWorkflow(workflow);
    workflow.getStatus = () => this.getWorkflowStatus(workflow);
    this.activeWorkflows.set(workflow.id, workflow);
    await this.saveWorkflow(workflow);
    this.emit("workflow_created", workflow);
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
      const currentStep = workflow.steps[workflow.currentStep];
      workflow.completedSteps.push({
        id: currentStep.id,
        completedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      workflow.currentStep++;
      this.emit("step_completed", {
        workflowId: workflow.id,
        completedStep: currentStep,
        nextStep: workflow.steps[workflow.currentStep]
      });
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
      workflow.completedSteps = workflow.completedSteps.filter(
        (step) => workflow.steps.findIndex((s) => s.id === step.id) < workflow.currentStep
      );
      this.emit("step_reverted", {
        workflowId: workflow.id,
        currentStep: workflow.steps[workflow.currentStep]
      });
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
    workflow.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    workflow.status = "completed";
    this.emit("workflow_completed", workflow);
    this.saveWorkflow(workflow);
    this.activeWorkflows.delete(workflow.id);
  }
  /**
   * Get workflow status
   */
  getWorkflowStatus(workflow) {
    const totalSteps = workflow.steps.length;
    const completedSteps = workflow.completedSteps.length;
    const progress = completedSteps / totalSteps * 100;
    return {
      id: workflow.id,
      type: workflow.type,
      status: workflow.status,
      currentStep: workflow.getCurrentStep(),
      progress: Math.round(progress),
      totalSteps,
      completedSteps,
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
      const workflows = await window.electronAPI.store.get("blog.workflows") || {};
      workflows[workflow.id] = workflow;
      await window.electronAPI.store.set("blog.workflows", workflows);
    } catch (error) {
      console.error("[BlogWorkflowManager] Failed to save workflow:", error);
    }
  }
  /**
   * Load saved workflows
   */
  async loadSavedWorkflows() {
    try {
      const workflows = await window.electronAPI.store.get("blog.workflows") || {};
      for (const [id, workflow] of Object.entries(workflows)) {
        if (workflow.status === "active" && !workflow.completed) {
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
      console.error("[BlogWorkflowManager] Failed to load workflows:", error);
    }
  }
  /**
   * Get saved drafts
   */
  async getSavedDrafts() {
    try {
      const workflows = await window.electronAPI.store.get("blog.workflows") || {};
      const drafts = [];
      for (const workflow of Object.values(workflows)) {
        if (workflow.data.generatedContent && !workflow.data.publishResult) {
          drafts.push({
            id: workflow.id,
            title: workflow.data.generatedContent.title || "Untitled",
            excerpt: workflow.data.generatedContent.excerpt || "",
            createdAt: workflow.data.createdAt,
            status: workflow.status,
            progress: this.getWorkflowStatus(workflow).progress
          });
        }
      }
      drafts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return drafts;
    } catch (error) {
      console.error("[BlogWorkflowManager] Failed to get drafts:", error);
      return [];
    }
  }
  /**
   * Resume workflow from draft
   */
  async resumeWorkflow(workflowId) {
    try {
      const workflows = await window.electronAPI.store.get("blog.workflows") || {};
      const workflow = workflows[workflowId];
      if (!workflow) {
        throw new Error("Workflow not found");
      }
      workflow.getCurrentStep = () => this.getCurrentStep(workflow);
      workflow.moveToNextStep = () => this.moveToNextStep(workflow);
      workflow.moveToPreviousStep = () => this.moveToPreviousStep(workflow);
      workflow.complete = () => this.completeWorkflow(workflow);
      workflow.getStatus = () => this.getWorkflowStatus(workflow);
      this.activeWorkflows.set(workflowId, workflow);
      this.emit("workflow_resumed", workflow);
      return workflow;
    } catch (error) {
      console.error("[BlogWorkflowManager] Failed to resume workflow:", error);
      throw error;
    }
  }
  /**
   * Delete workflow/draft
   */
  async deleteWorkflow(workflowId) {
    try {
      const workflows = await window.electronAPI.store.get("blog.workflows") || {};
      delete workflows[workflowId];
      await window.electronAPI.store.set("blog.workflows", workflows);
      this.activeWorkflows.delete(workflowId);
      this.emit("workflow_deleted", workflowId);
      return true;
    } catch (error) {
      console.error("[BlogWorkflowManager] Failed to delete workflow:", error);
      return false;
    }
  }
  /**
   * Get active workflow
   */
  getActiveWorkflow() {
    const workflows = Array.from(this.activeWorkflows.values());
    if (workflows.length === 0) return null;
    return workflows.sort(
      (a, b) => new Date(b.data.createdAt) - new Date(a.data.createdAt)
    )[0];
  }
  /**
   * Cancel active workflow
   */
  async cancelWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return false;
    workflow.status = "cancelled";
    workflow.cancelledAt = (/* @__PURE__ */ new Date()).toISOString();
    await this.saveWorkflow(workflow);
    this.activeWorkflows.delete(workflowId);
    this.emit("workflow_cancelled", workflow);
    return true;
  }
}
class BlogContentGenerator extends EventEmitter {
  constructor() {
    super();
    this.langChainService = null;
    this.isInitialized = false;
    this.settings = {
      maxRetries: 3,
      temperature: 0.7,
      maxTokens: 4e3,
      language: "korean",
      industry: "electrical_sensors"
    };
  }
  /**
   * Initialize the content generator
   */
  async initialize(langChainAPI) {
    if (!langChainAPI) {
      throw new Error("LangChain API is required");
    }
    this.langChainAPI = langChainAPI;
    this.isInitialized = true;
    console.log("[BlogContentGenerator] Initialized");
  }
  /**
   * Generate blog post outline
   */
  async generateOutline(requirements, systemPrompt) {
    console.log("[BlogContentGenerator] Generating outline");
    try {
      this.emit("progress", {
        stage: "outline",
        status: "starting",
        message: "블로그 개요 생성 시작..."
      });
      const userPrompt = `
다음 요구사항을 바탕으로 블로그 글의 상세한 개요를 JSON 형식으로 작성해주세요:

요구사항: ${JSON.stringify(requirements, null, 2)}

JSON 형식:
{
  "title": "블로그 제목",
  "seoTitle": "SEO 최적화 제목",
  "excerpt": "간단한 요약 (2-3문장)",
  "seoDescription": "메타 설명 (150-160자)",
  "keywords": ["키워드1", "키워드2"],
  "sections": [
    {
      "id": "section1",
      "title": "섹션 제목",
      "summary": "섹션 내용 요약",
      "keyPoints": ["핵심 포인트 1", "핵심 포인트 2"]
    }
  ],
  "targetAudience": "대상 독자",
  "tone": "글의 톤",
  "estimatedReadTime": "예상 읽기 시간(분)"
}
      `.trim();
      const response = await this.langChainAPI.langchainSendMessage({
        message: userPrompt,
        conversationHistory: [],
        systemPrompt
      });
      if (!response.success) {
        throw new Error(response.error || "Outline generation failed");
      }
      const outline = this.parseJSONResponse(response.message);
      this.emit("progress", {
        stage: "outline",
        status: "completed",
        message: "개요 생성 완료",
        data: outline
      });
      return outline;
    } catch (error) {
      console.error("[BlogContentGenerator] Outline generation error:", error);
      this.emit("progress", {
        stage: "outline",
        status: "error",
        message: "개요 생성 실패: " + error.message
      });
      throw error;
    }
  }
  /**
   * Generate full blog content based on outline
   */
  async generateFullContent(requirements, outline, options = {}) {
    console.log("[BlogContentGenerator] Generating full content");
    try {
      this.emit("progress", {
        stage: "content",
        status: "starting",
        message: "콘텐츠 생성 시작..."
      });
      const content = {
        title: outline.title,
        seoTitle: outline.seoTitle,
        excerpt: outline.excerpt,
        seoDescription: outline.seoDescription,
        keywords: outline.keywords,
        sections: [],
        metadata: {
          generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          language: options.language || "korean",
          industry: options.industry || "electrical_sensors",
          targetAudience: outline.targetAudience,
          tone: outline.tone,
          estimatedReadTime: outline.estimatedReadTime
        }
      };
      const intro = await this.generateIntroduction(outline, requirements);
      content.introduction = intro;
      for (let i = 0; i < outline.sections.length; i++) {
        const section = outline.sections[i];
        this.emit("progress", {
          stage: "content",
          status: "generating",
          message: `섹션 ${i + 1}/${outline.sections.length} 생성 중...`,
          progress: i / outline.sections.length * 100
        });
        const sectionContent = await this.generateSection(
          section,
          outline,
          requirements,
          options
        );
        content.sections.push(sectionContent);
      }
      const conclusion = await this.generateConclusion(outline, requirements);
      content.conclusion = conclusion;
      content.html = this.formatAsHTML(content);
      content.plainText = this.formatAsPlainText(content);
      this.emit("progress", {
        stage: "content",
        status: "completed",
        message: "콘텐츠 생성 완료",
        data: content
      });
      return content;
    } catch (error) {
      console.error("[BlogContentGenerator] Content generation error:", error);
      this.emit("progress", {
        stage: "content",
        status: "error",
        message: "콘텐츠 생성 실패: " + error.message
      });
      throw error;
    }
  }
  /**
   * Generate introduction section
   */
  async generateIntroduction(outline, requirements) {
    const prompt = `
블로그 글의 서론을 작성해주세요.

제목: ${outline.title}
요구사항: ${requirements}
대상 독자: ${outline.targetAudience}
톤: ${outline.tone}

서론 작성 지침:
1. 독자의 관심을 끄는 첫 문장
2. 글의 주제와 중요성 설명
3. 글에서 다룰 내용 간단히 소개
4. 2-3단락으로 구성

전문적이면서도 읽기 쉬운 한국어로 작성해주세요.
    `.trim();
    const response = await this.langChainAPI.langchainSendMessage({
      message: prompt,
      conversationHistory: [],
      systemPrompt: null
    });
    if (!response.success) {
      throw new Error("Introduction generation failed");
    }
    return response.message;
  }
  /**
   * Generate a single section
   */
  async generateSection(section, outline, requirements, options) {
    const prompt = `
다음 블로그 섹션의 내용을 작성해주세요.

섹션 제목: ${section.title}
섹션 요약: ${section.summary}
핵심 포인트: ${section.keyPoints.join(", ")}

전체 글 제목: ${outline.title}
대상 독자: ${outline.targetAudience}
톤: ${outline.tone}

작성 지침:
1. 섹션 제목에 맞는 상세한 내용 작성
2. 핵심 포인트를 모두 다루기
3. 실제 예시나 응용 사례 포함
4. 3-5단락으로 구성
5. 기술적 정확성 유지

${options.industry === "electrical_sensors" ? "전기센서 산업 관련 전문 지식을 포함하여" : ""} 
전문적이고 이해하기 쉬운 한국어로 작성해주세요.
    `.trim();
    const response = await this.langChainAPI.langchainSendMessage({
      message: prompt,
      conversationHistory: [],
      systemPrompt: null
    });
    if (!response.success) {
      throw new Error(`Section generation failed: ${section.title}`);
    }
    return {
      id: section.id,
      title: section.title,
      content: response.message,
      keyPoints: section.keyPoints
    };
  }
  /**
   * Generate conclusion section
   */
  async generateConclusion(outline, requirements) {
    const prompt = `
블로그 글의 결론을 작성해주세요.

제목: ${outline.title}
주요 내용: ${outline.sections.map((s) => s.title).join(", ")}
대상 독자: ${outline.targetAudience}

결론 작성 지침:
1. 주요 내용 요약
2. 핵심 메시지 재강조
3. 행동 유도(CTA) 포함 - 태화트랜스 제품 문의, 추가 정보 요청 등
4. 미래 전망이나 추가 고려사항
5. 2-3단락으로 구성

독자가 행동을 취하도록 유도하는 설득력 있는 결론을 작성해주세요.
    `.trim();
    const response = await this.langChainAPI.langchainSendMessage({
      message: prompt,
      conversationHistory: [],
      systemPrompt: null
    });
    if (!response.success) {
      throw new Error("Conclusion generation failed");
    }
    return response.message;
  }
  /**
   * Parse JSON response from AI
   */
  parseJSONResponse(text) {
    try {
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      return JSON.parse(jsonText);
    } catch (error) {
      console.error("[BlogContentGenerator] JSON parsing error:", error);
      console.log("Raw response:", text);
      throw new Error("Failed to parse AI response as JSON");
    }
  }
  /**
   * Format content as HTML
   */
  formatAsHTML(content) {
    let html = "";
    html += `<h1>${content.title}</h1>

`;
    html += `<div class="introduction">
${this.paragraphsToHTML(content.introduction)}
</div>

`;
    for (const section of content.sections) {
      html += `<section id="${section.id}">
`;
      html += `<h2>${section.title}</h2>
`;
      html += this.paragraphsToHTML(section.content);
      html += `
</section>

`;
    }
    html += `<div class="conclusion">
${this.paragraphsToHTML(content.conclusion)}
</div>
`;
    return html;
  }
  /**
   * Convert paragraphs to HTML
   */
  paragraphsToHTML(text) {
    if (!text) return "";
    return text.split("\n\n").filter((p) => p.trim()).map((p) => `<p>${p.trim()}</p>`).join("\n");
  }
  /**
   * Format content as plain text
   */
  formatAsPlainText(content) {
    let text = "";
    text += `${content.title}
${"=".repeat(content.title.length)}

`;
    text += `${content.introduction}

`;
    for (const section of content.sections) {
      text += `${section.title}
${"-".repeat(section.title.length)}
`;
      text += `${section.content}

`;
    }
    text += `결론
----
${content.conclusion}
`;
    return text;
  }
  /**
   * Optimize content for SEO
   */
  async optimizeForSEO(content, keywords) {
    console.log("[BlogContentGenerator] Optimizing for SEO");
    const prompt = `
다음 콘텐츠를 SEO 최적화해주세요.

목표 키워드: ${keywords.join(", ")}

현재 콘텐츠:
${JSON.stringify(content, null, 2)}

최적화 요구사항:
1. 키워드를 자연스럽게 포함 (과도하지 않게)
2. 제목과 부제목에 키워드 배치
3. 메타 설명 최적화
4. 이미지 alt 텍스트 제안
5. 내부/외부 링크 제안

최적화된 콘텐츠를 JSON 형식으로 반환해주세요.
    `.trim();
    const response = await this.langChainAPI.langchainSendMessage({
      message: prompt,
      conversationHistory: [],
      systemPrompt: null
    });
    if (!response.success) {
      console.warn("[BlogContentGenerator] SEO optimization failed, returning original");
      return content;
    }
    try {
      return this.parseJSONResponse(response.message);
    } catch (error) {
      console.warn("[BlogContentGenerator] Failed to parse SEO response, returning original");
      return content;
    }
  }
  /**
   * Generate content variations for A/B testing
   */
  async generateVariations(content, count = 2) {
    const variations = [content];
    for (let i = 1; i < count; i++) {
      const prompt = `
다음 콘텐츠의 변형 버전을 만들어주세요.
같은 정보를 다른 방식으로 표현하되, 톤과 구조를 약간 변경해주세요.

원본 제목: ${content.title}
원본 서론: ${content.introduction.substring(0, 200)}...

변형 지침:
1. 핵심 메시지는 유지
2. 표현 방식과 문체 변경
3. 다른 예시나 비유 사용
4. 제목도 변형

변형된 제목과 서론을 제공해주세요.
      `.trim();
      const response = await this.langChainAPI.langchainSendMessage({
        message: prompt,
        conversationHistory: [],
        systemPrompt: null
      });
      if (response.success) {
        variations.push({
          ...content,
          title: response.message.split("\n")[0],
          variation: i
        });
      }
    }
    return variations;
  }
  /**
   * Clean up resources
   */
  async destroy() {
    this.removeAllListeners();
    this.langChainService = null;
  }
}
class BlogSystemPrompts {
  constructor() {
    this.companyContext = `
태화트랜스(Taehwa Trans)는 대한민국의 선도적인 전기센서 제조업체입니다.
주요 제품군:
- Rogowski Coils (로고스키 코일): 비접촉식 전류 측정
- Split-core CT (분할형 변류기): 설치가 간편한 전류 변환기
- Solid CT (솔리드 변류기): 고정밀 전류 측정
- Zero-Phase CT (영상변류기): 누전 감지용
- ACB CTs (ACB 변류기): 차단기용 특수 변류기

전문 분야: 전력품질 모니터링, 에너지 관리, 스마트그리드 솔루션
    `.trim();
    this.industryTerms = {
      "current_sensor": "전류센서",
      "current_transformer": "변류기",
      "rogowski_coil": "로고스키 코일",
      "accuracy": "정확도",
      "measurement": "측정",
      "power_quality": "전력품질",
      "energy_management": "에너지관리",
      "smart_grid": "스마트그리드",
      "calibration": "교정",
      "installation": "설치"
    };
  }
  /**
   * Get requirements gathering prompt
   */
  getRequirementsPrompt() {
    return `당신은 태화트랜스의 기술 블로그 작성을 돕는 전문가입니다.
사용자가 원하는 블로그 주제와 요구사항을 파악하기 위해 다음 정보를 수집해주세요:

1. 주요 주제 (예: 특정 제품, 기술 동향, 응용 사례)
2. 대상 독자 (예: 엔지니어, 구매 담당자, 일반 고객)
3. 글의 목적 (예: 제품 소개, 기술 교육, 문제 해결)
4. 원하는 글의 톤 (예: 전문적, 친근한, 교육적)
5. 특별히 포함되어야 할 내용이나 키워드

친근하고 전문적인 톤으로 대화하며, 필요한 정보를 자연스럽게 수집해주세요.`;
  }
  /**
   * Get outline generation prompt
   */
  getOutlinePrompt(requirements) {
    return `당신은 전기센서 산업 전문 기술 블로그 작가입니다.
다음 요구사항을 바탕으로 SEO 최적화된 블로그 글 개요를 작성해주세요.

회사 정보:
${this.companyContext}

요구사항:
${JSON.stringify(requirements, null, 2)}

개요 작성 지침:
1. 제목: SEO 키워드를 포함한 매력적인 제목 (60자 이내)
2. 서론: 독자의 관심을 끄는 도입부 구성
3. 본문: 3-5개의 주요 섹션으로 구성
4. 각 섹션: 명확한 소제목과 핵심 내용 요약
5. 결론: 행동 유도(CTA) 포함
6. SEO 메타 설명: 150-160자의 요약

전문적이면서도 이해하기 쉬운 구조로 작성해주세요.`;
  }
  /**
   * Get content generation prompt for specific section
   */
  getContentPrompt(section, context) {
    return `전기센서 산업 전문가로서 다음 섹션의 내용을 작성해주세요.

섹션: ${section.title}
맥락: ${JSON.stringify(context, null, 2)}

작성 지침:
1. 전문 용어는 쉽게 설명하면서도 정확하게 사용
2. 실제 응용 사례나 예시 포함
3. 태화트랜스 제품의 장점 자연스럽게 언급
4. 단락은 3-4문장으로 구성하여 가독성 확보
5. 기술적 정확성 유지하면서 이해하기 쉽게 작성

한국어로 자연스럽고 전문적인 톤으로 작성해주세요.`;
  }
  /**
   * Get SEO optimization prompt
   */
  getSEOPrompt(content, keywords) {
    return `다음 블로그 콘텐츠를 SEO 최적화해주세요.

목표 키워드: ${keywords.join(", ")}

최적화 지침:
1. 키워드를 자연스럽게 본문에 분산 (키워드 밀도 1-2%)
2. 헤딩 태그(H1, H2, H3) 구조 최적화
3. 메타 설명 최적화 (150-160자)
4. 이미지 alt 텍스트 제안
5. 내부/외부 링크 제안

원본 콘텐츠:
${content}

최적화된 버전을 제공하고, 개선 사항을 설명해주세요.`;
  }
  /**
   * Get quality check prompt
   */
  getQualityCheckPrompt(content) {
    return `다음 기술 블로그 콘텐츠의 품질을 평가해주세요.

평가 기준:
1. 기술적 정확성 (전기센서 관련 정보)
2. 가독성과 구조
3. SEO 최적화 수준
4. 대상 독자에 대한 적절성
5. 행동 유도(CTA) 효과성

콘텐츠:
${content}

각 기준별 점수(1-10)와 개선 제안을 제공해주세요.`;
  }
  /**
   * Get product-specific prompts
   */
  getProductPrompt(productType) {
    const productPrompts = {
      "rogowski_coil": `로고스키 코일의 비접촉식 측정 원리와 장점을 설명하세요.
특히 대전류 측정, 설치 용이성, 선형성 등의 특징을 강조하고,
기존 CT 대비 우수성을 부각시켜주세요.`,
      "current_transformer": `변류기의 기본 원리와 태화트랜스 제품의 특장점을 설명하세요.
정확도 등급, 부담(burden), 포화 특성 등 기술적 사양을 
실무자가 이해하기 쉽게 설명해주세요.`,
      "zero_phase_ct": `영상변류기의 누전 감지 원리와 안전성을 설명하세요.
감도 설정, 오동작 방지, 설치 시 주의사항 등
현장 적용 시 필요한 실무 지식을 포함해주세요.`
    };
    return productPrompts[productType] || this.getGeneralProductPrompt();
  }
  /**
   * Get general product prompt
   */
  getGeneralProductPrompt() {
    return `태화트랜스의 전기센서 제품을 소개하는 내용을 작성하세요.
제품의 기술적 우수성, 신뢰성, 비용 효율성을 강조하고,
실제 적용 사례와 고객 이점을 포함해주세요.`;
  }
  /**
   * Get technical article prompts
   */
  getTechnicalPrompt(topic) {
    const technicalPrompts = {
      "power_quality": `전력품질 모니터링에서 전류센서의 역할을 설명하세요.
고조파 측정, 역률 개선, 에너지 효율 향상 등의 관점에서
태화트랜스 제품의 기술적 우위를 설명해주세요.`,
      "smart_grid": `스마트그리드에서 정밀 전류 측정의 중요성을 설명하세요.
실시간 모니터링, 빅데이터 분석, 예측 유지보수 등
미래 전력망에서의 응용을 다뤄주세요.`,
      "energy_management": `에너지 관리 시스템(EMS)에서 전류센서의 활용을 설명하세요.
에너지 사용 패턴 분석, 비용 절감, 탄소 배출 감소 등
ESG 경영과 연계하여 설명해주세요.`
    };
    return technicalPrompts[topic] || this.getGeneralTechnicalPrompt();
  }
  /**
   * Get general technical prompt
   */
  getGeneralTechnicalPrompt() {
    return `전기센서 기술의 최신 동향과 응용 분야를 다뤄주세요.
Industry 4.0, IoT, AI 등 신기술과의 융합을 포함하여
미래 지향적인 관점에서 작성해주세요.`;
  }
  /**
   * Get Korean language optimization prompt
   */
  getKoreanOptimizationPrompt(content) {
    return `다음 기술 블로그 콘텐츠를 한국어 문체 최적화해주세요.

최적화 지침:
1. 전문 용어는 한글(영문) 형식으로 표기
2. 문장은 간결하고 명확하게
3. 경어체 사용 (습니다/입니다)
4. 기술 문서지만 딱딱하지 않게
5. 적절한 접속사와 전환어 사용

원본:
${content}

자연스러운 한국어로 다듬어주세요.`;
  }
}
class TerminalLogger {
  constructor() {
    this.isEnabled = true;
    this.context = "Renderer";
  }
  /**
   * Set context for logging
   */
  setContext(context) {
    this.context = context;
  }
  /**
   * Log info message
   */
  log(...args) {
    if (!this.isEnabled) return;
    const message = this.formatMessage(args);
    console.log(...args);
    if (window.electronAPI && window.electronAPI.log) {
      window.electronAPI.log.info(`[${this.context}] ${message}`);
    }
  }
  /**
   * Log warning message
   */
  warn(...args) {
    if (!this.isEnabled) return;
    const message = this.formatMessage(args);
    console.warn(...args);
    if (window.electronAPI && window.electronAPI.log) {
      window.electronAPI.log.warn(`[${this.context}] ${message}`);
    }
  }
  /**
   * Log error message
   */
  error(...args) {
    if (!this.isEnabled) return;
    const message = this.formatMessage(args);
    console.error(...args);
    if (window.electronAPI && window.electronAPI.log) {
      window.electronAPI.log.error(`[${this.context}] ${message}`);
    }
  }
  /**
   * Format message from arguments
   */
  formatMessage(args) {
    return args.map((arg) => {
      if (typeof arg === "object") {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return "[Object]";
        }
      }
      return String(arg);
    }).join(" ");
  }
  /**
   * Create a logger with specific context
   */
  createLogger(context) {
    const logger = new TerminalLogger();
    logger.setContext(context);
    return logger;
  }
}
const terminalLogger = new TerminalLogger();
class WPPublishingService extends EventEmitter {
  constructor() {
    super();
    this.config = {
      siteUrl: "https://m8chaa.mycafe24.com",
      apiBase: "/wp-json/wp/v2",
      credentials: null,
      maxRetries: 3,
      retryDelay: 2e3
    };
    this.isInitialized = false;
  }
  /**
   * Initialize the publishing service
   */
  async initialize() {
    terminalLogger.log("[WPPublishingService] Initializing...");
    try {
      if (window.electronAPI && window.electronAPI.store) {
        try {
          const storedCreds = await window.electronAPI.store.get("wordpress.credentials");
          if (storedCreds) {
            this.config.credentials = storedCreds;
            terminalLogger.log("[WPPublishingService] Loaded stored credentials");
          } else {
            terminalLogger.log("[WPPublishingService] No stored credentials, using default");
            this.config.credentials = {
              username: "m8chaa",
              password: "0gs8 Ydya LfhD 1twc 6RM1 4o7f"
            };
            await window.electronAPI.store.set("wordpress.credentials", this.config.credentials);
            terminalLogger.log("[WPPublishingService] Default credentials saved");
          }
        } catch (error) {
          terminalLogger.warn("[WPPublishingService] Could not load stored credentials:", error);
          this.config.credentials = {
            username: "m8chaa",
            password: "0gs8 Ydya LfhD 1twc 6RM1 4o7f"
          };
        }
      }
      if (this.config.credentials) {
        const isValid = await this.testConnection();
        if (!isValid) {
          terminalLogger.warn("[WPPublishingService] Stored credentials are invalid");
          this.config.credentials = null;
        }
      }
      this.isInitialized = true;
      terminalLogger.log("[WPPublishingService] Initialization complete");
    } catch (error) {
      terminalLogger.error("[WPPublishingService] Initialization failed:", error);
      this.isInitialized = true;
    }
  }
  /**
   * Set WordPress credentials
   */
  async setCredentials(username, password) {
    this.config.credentials = {
      username,
      password
      // Should be Application Password
    };
    const isValid = await this.testConnection();
    if (isValid) {
      await window.electronAPI.store.set("wordpress.credentials", this.config.credentials);
      terminalLogger.log("[WPPublishingService] Credentials saved");
    }
    return isValid;
  }
  /**
   * Test WordPress connection
   */
  async testConnection() {
    terminalLogger.log("[WPPublishingService] Testing WordPress connection...");
    try {
      const response = await window.electronAPI.wordpress.request({
        method: "GET",
        endpoint: "/users/me",
        credentials: this.config.credentials
      });
      if (response.success) {
        const userData = response.data;
        terminalLogger.log("[WPPublishingService] Connection successful. User:", userData.name);
        this.emit("connection_tested", { success: true, user: userData });
        return true;
      } else {
        terminalLogger.error("[WPPublishingService] Connection failed:", response.status || response.error);
        this.emit("connection_tested", { success: false, error: response.error || "Connection failed" });
        return false;
      }
    } catch (error) {
      terminalLogger.error("[WPPublishingService] Connection test error:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      });
      this.emit("connection_tested", { success: false, error: error.message });
      return false;
    }
  }
  /**
   * Publish a blog post
   */
  async publishPost(postData) {
    terminalLogger.log("[WPPublishingService] Publishing post:", postData.title);
    if (!this.config.credentials) {
      throw new Error("WordPress credentials not configured");
    }
    this.emit("publish_progress", {
      stage: "preparing",
      message: "게시물 준비 중..."
    });
    try {
      const payload = await this.preparePostPayload(postData);
      const post = await this.createPostWithRetry(payload);
      if (postData.media && postData.media.length > 0) {
        await this.uploadAndAttachMedia(post.id, postData.media);
      }
      if (postData.finalContent) {
        await this.updatePost(post.id, { content: postData.finalContent });
      }
      this.emit("publish_progress", {
        stage: "completed",
        message: "게시 완료!",
        post
      });
      return post;
    } catch (error) {
      terminalLogger.error("[WPPublishingService] Publishing failed:", error);
      this.emit("publish_progress", {
        stage: "error",
        message: "게시 실패: " + error.message,
        error
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
      status: postData.status || "draft",
      format: "standard",
      comment_status: "open",
      ping_status: "open"
    };
    if (postData.categories && postData.categories.length > 0) {
      payload.categories = await this.resolveCategories(postData.categories);
    }
    if (postData.tags && postData.tags.length > 0) {
      payload.tags = await this.resolveTags(postData.tags);
    }
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
      this.emit("publish_progress", {
        stage: "creating",
        message: "포스트 생성 중...",
        retry: retries
      });
      const response = await window.electronAPI.wordpress.request({
        method: "POST",
        endpoint: "/posts",
        data: payload,
        credentials: this.config.credentials
      });
      if (!response.success) {
        throw new Error(`API Error ${response.status || "Unknown"}: ${JSON.stringify(response.error)}`);
      }
      const post = response.data;
      terminalLogger.log("[WPPublishingService] Post created successfully:", {
        id: post.id,
        title: post.title?.rendered || post.title,
        link: post.link,
        status: post.status
      });
      return post;
    } catch (error) {
      terminalLogger.error("[WPPublishingService] Create post error:", error);
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
    terminalLogger.log("[WPPublishingService] Updating post:", postId);
    const response = await window.electronAPI.wordpress.request({
      method: "PUT",
      endpoint: `/posts/${postId}`,
      data: updates,
      credentials: this.config.credentials
    });
    if (!response.success) {
      throw new Error(`Failed to update post: ${response.error || "Unknown error"}`);
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
        const searchResponse = await window.electronAPI.wordpress.request({
          method: "GET",
          endpoint: `/categories?search=${encodeURIComponent(name)}`,
          credentials: this.config.credentials
        });
        if (searchResponse.success) {
          const categories = searchResponse.data;
          if (categories.length > 0) {
            categoryIds.push(categories[0].id);
          } else {
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
      method: "POST",
      headers: {
        "Authorization": this.getAuthHeader(),
        "Content-Type": "application/json"
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
        const searchResponse = await fetch(
          `${this.config.siteUrl}${this.config.apiBase}/tags?search=${encodeURIComponent(name)}`,
          {
            headers: {
              "Authorization": this.getAuthHeader()
            }
          }
        );
        if (searchResponse.ok) {
          const tags = await searchResponse.json();
          if (tags.length > 0) {
            tagIds.push(tags[0].id);
          } else {
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
      method: "POST",
      headers: {
        "Authorization": this.getAuthHeader(),
        "Content-Type": "application/json"
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
    terminalLogger.log("[WPPublishingService] Uploading media files...");
    this.emit("publish_progress", {
      stage: "uploading_media",
      message: "미디어 업로드 중..."
    });
    const uploadedMedia = [];
    for (const file of mediaFiles) {
      try {
        const media = await this.uploadMedia(file);
        uploadedMedia.push(media);
        if (uploadedMedia.length === 1 && file.type.startsWith("image/")) {
          await this.setFeaturedImage(postId, media.id);
        }
      } catch (error) {
        terminalLogger.error("[WPPublishingService] Media upload failed:", error);
      }
    }
    return uploadedMedia;
  }
  /**
   * Upload single media file
   */
  async uploadMedia(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${this.config.siteUrl}${this.config.apiBase}/media`, {
      method: "POST",
      headers: {
        "Authorization": this.getAuthHeader()
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
      throw new Error("No credentials configured");
    }
    const { username, password } = this.config.credentials;
    const base64 = btoa(`${username}:${password}`);
    return `Basic ${base64}`;
  }
  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Get recent posts
   */
  async getRecentPosts(count = 10) {
    const response = await fetch(
      `${this.config.siteUrl}${this.config.apiBase}/posts?per_page=${count}&_embed`,
      {
        headers: {
          "Authorization": this.getAuthHeader()
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
        method: "DELETE",
        headers: {
          "Authorization": this.getAuthHeader()
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
    terminalLogger.log("[BlogAutomationManager] Initializing...");
    try {
      this.langChainAPI = window.electronAPI;
      this.globalState = dependencies.globalState;
      this.chatComponent = dependencies.chatComponent;
      await this.contentGenerator.initialize(this.langChainAPI);
      await this.publishingService.initialize();
      this.setupEventListeners();
      this.isInitialized = true;
      terminalLogger.log("[BlogAutomationManager] Initialization complete");
      return true;
    } catch (error) {
      terminalLogger.error("[BlogAutomationManager] Initialization failed:", error);
      throw error;
    }
  }
  /**
   * Handle chat message to detect and process blog commands
   */
  async handleChatMessage(message) {
    terminalLogger.log("[BlogAutomationManager] Received message:", message);
    const command = this.commandParser.parse(message);
    if (!command || command.type !== "blog") {
      terminalLogger.log("[BlogAutomationManager] Not a blog command, returning null");
      return null;
    }
    terminalLogger.log("[BlogAutomationManager] Processing blog command:", command);
    switch (command.action) {
      case "new":
        return await this.startNewBlogWorkflow(command.params);
      case "auto":
        return await this.startAutomatedBlog(command.params);
      case "publish":
        return await this.publishBlog(command.params);
      case "list":
        return await this.listDrafts();
      case "status":
        return await this.getWorkflowStatus();
      case "help":
        return this.getBlogHelp();
      default:
        return {
          type: "error",
          message: "Unknown blog command. Type /blog help for available commands."
        };
    }
  }
  /**
   * Start fully automated blog creation
   */
  async startAutomatedBlog(params = {}) {
    terminalLogger.log("[BlogAutomationManager] Starting automated blog creation");
    try {
      this.activeWorkflow = await this.workflowManager.createWorkflow({
        type: "blog_automation",
        params,
        automated: true,
        timestamp: Date.now()
      });
      if (params.fromTool && params.title && params.content) {
        terminalLogger.log("[BlogAutomationManager] Using pre-generated content from tool");
        const finalContent2 = {
          title: params.title,
          html: params.content,
          content: params.content,
          excerpt: `${params.topic} - ${params.metadata?.audience || "일반 독자"}를 위한 블로그`,
          keywords: params.metadata?.keywords || [],
          seoTitle: params.title,
          seoDescription: `${params.topic}에 대한 상세한 가이드`,
          images: params.images || [],
          hasImages: params.images?.length > 0
        };
        this.emit("automation_progress", {
          step: "publishing",
          message: "📤 WordPress에 게시하고 있습니다..."
        });
        terminalLogger.log("[BlogAutomationManager] Publishing content:", {
          title: finalContent2.title,
          hasContent: !!finalContent2.html,
          contentLength: finalContent2.html?.length,
          hasImages: finalContent2.hasImages
        });
        const publishResult2 = await this.autoPublish(finalContent2);
        this.emit("automation_completed", {
          success: true,
          result: publishResult2,
          message: `✅ 블로그 작성이 완료되었습니다!

📌 제목: ${publishResult2.title}
🔗 URL: ${publishResult2.link}
📊 상태: ${publishResult2.status === "publish" ? "게시됨" : "초안"}`
        });
        return {
          type: "automated_complete",
          result: publishResult2,
          content: finalContent2
        };
      }
      this.emit("automation_started", {
        message: "🚀 블로그 작성을 시작합니다. 잠시만 기다려주세요..."
      });
      const requirements = await this.determineRequirements(params);
      this.emit("automation_progress", {
        step: "requirements",
        message: `📝 주제 분석 중: "${requirements.topic}"`
      });
      const outline = await this.generateOutlineAutomated(requirements);
      this.emit("automation_progress", {
        step: "outline",
        message: `📋 글의 구조를 잡고 있습니다... (${outline.sections?.length || 0}개 섹션)`
      });
      const content = await this.generateContentAutomated(requirements, outline);
      this.emit("automation_progress", {
        step: "content",
        message: "✍️ 본문을 작성하고 있습니다..."
      });
      this.emit("automation_progress", {
        step: "images_start",
        message: "🎨 관련 이미지를 생성하고 있습니다..."
      });
      const images = await this.generateImages(content);
      const finalContent = await this.combineContentWithImages(content, images);
      this.emit("automation_progress", {
        step: "publishing",
        message: "📤 WordPress에 게시하고 있습니다..."
      });
      const publishResult = await this.autoPublish(finalContent);
      this.emit("automation_completed", {
        success: true,
        result: publishResult,
        message: `✅ 블로그 작성이 완료되었습니다!

📌 제목: ${publishResult.title}
🔗 URL: ${publishResult.link}
📊 상태: ${publishResult.status === "publish" ? "게시됨" : "초안"}`
      });
      return {
        type: "automated_complete",
        result: publishResult,
        content: finalContent
      };
    } catch (error) {
      terminalLogger.error("[BlogAutomationManager] Automation failed:", error);
      this.emit("automation_failed", {
        error: error.message
      });
      return {
        type: "error",
        message: `자동화 실패: ${error.message}`
      };
    }
  }
  /**
   * Determine requirements automatically
   */
  async determineRequirements(params) {
    if (params.text || params.topic || params.originalInput) {
      let topic = params.text || params.topic;
      if (!topic && params.originalInput) {
        const topicMatch = params.originalInput.match(/(.+?)(?:에 관한|에 대한|관련|대해|에 대해서|에 관해서)?\s*블로그/);
        if (topicMatch) {
          topic = topicMatch[1].trim();
        } else {
          topic = params.originalInput.replace(/블로그.*$/i, "").trim();
        }
      }
      return {
        topic: topic || params.originalInput,
        audience: params.audience || "전기 엔지니어 및 구매 담당자",
        purpose: params.purpose || "제품 소개 및 기술 교육",
        tone: params.tone || "전문적이면서 이해하기 쉬운",
        keywords: params.keywords || []
      };
    }
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
      throw new Error("Failed to determine topic");
    }
    return {
      topic: response.message.trim(),
      audience: "전기 엔지니어 및 구매 담당자",
      purpose: "제품 소개 및 기술 교육",
      tone: "전문적이면서 이해하기 쉬운",
      keywords: []
    };
  }
  /**
   * Generate outline automatically
   */
  async generateOutlineAutomated(requirements) {
    const systemPrompt = this.systemPrompts.getOutlinePrompt(requirements);
    const outline = await this.contentGenerator.generateOutline(requirements, systemPrompt);
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
        industry: "electrical_sensors",
        language: "korean",
        seoKeywords: outline.keywords || []
      }
    );
    this.activeWorkflow.data.generatedContent = content;
    return content;
  }
  /**
   * Generate images for the blog post
   */
  async generateImages(content) {
    terminalLogger.log("[BlogAutomationManager] Generating images");
    const images = [];
    try {
      const featuredImagePrompt = `
Create a professional technical illustration for a blog post about "${content.title}".
The image should be clean, modern, and suitable for an electrical sensor manufacturing company.
Include technical elements but keep it visually appealing.
Style: Technical diagram, clean lines, professional color scheme.
      `.trim();
      if (this.langChainAPI.generateImage) {
        const featuredImage = await this.langChainAPI.generateImage({
          prompt: featuredImagePrompt,
          size: "1024x1024",
          quality: "standard"
        });
        if (featuredImage.success) {
          images.push({
            type: "featured",
            url: featuredImage.url,
            alt: `${content.title} - Featured Image`,
            caption: content.title
          });
        }
      }
      if (content.sections && content.sections.length > 2) {
        const keySection = content.sections[Math.floor(content.sections.length / 2)];
        const sectionImagePrompt = `
Create a technical diagram illustrating "${keySection.title}".
Focus on electrical sensor technology and measurement principles.
Style: Clean technical illustration, minimalist, professional.
        `.trim();
        if (this.langChainAPI.generateImage) {
          const sectionImage = await this.langChainAPI.generateImage({
            prompt: sectionImagePrompt,
            size: "1024x1024",
            quality: "standard"
          });
          if (sectionImage.success) {
            images.push({
              type: "section",
              url: sectionImage.url,
              alt: `${keySection.title} - Diagram`,
              caption: keySection.title,
              sectionId: keySection.id
            });
          }
        }
      }
    } catch (error) {
      terminalLogger.warn("[BlogAutomationManager] Image generation failed:", error);
    }
    return images;
  }
  /**
   * Combine content with generated images
   */
  async combineContentWithImages(content, images) {
    terminalLogger.log("[BlogAutomationManager] Combining content with images");
    let enhancedHTML = content.html;
    const featuredImage = images.find((img) => img.type === "featured");
    if (featuredImage) {
      const featuredImageHTML = `
<figure class="wp-block-image size-large">
  <img src="${featuredImage.url}" alt="${featuredImage.alt}" />
  <figcaption>${featuredImage.caption}</figcaption>
</figure>

`;
      enhancedHTML = featuredImageHTML + enhancedHTML;
    }
    images.filter((img) => img.type === "section").forEach((image) => {
      const sectionImageHTML = `
<figure class="wp-block-image size-medium aligncenter">
  <img src="${image.url}" alt="${image.alt}" />
  <figcaption>${image.caption}</figcaption>
</figure>
`;
      const sectionPattern = new RegExp(`(<section[^>]*id="${image.sectionId}"[^>]*>.*?<h2[^>]*>.*?</h2>)`, "i");
      enhancedHTML = enhancedHTML.replace(sectionPattern, `$1
${sectionImageHTML}`);
    });
    const finalContent = {
      ...content,
      html: enhancedHTML,
      images,
      hasImages: images.length > 0
    };
    return finalContent;
  }
  /**
   * Auto-publish the blog post
   */
  async autoPublish(content) {
    terminalLogger.log("[BlogAutomationManager] Auto-publishing blog post");
    if (!this.publishingService.config.credentials) {
      throw new Error("WordPress credentials not configured. Please set up credentials first.");
    }
    const postData = {
      title: content.title,
      content: content.html,
      excerpt: content.excerpt,
      status: "publish",
      // Auto-publish as published
      categories: content.categories || ["Technology"],
      tags: content.keywords || [],
      meta: {
        seo_title: content.seoTitle,
        seo_description: content.seoDescription,
        seo_keywords: content.keywords
      }
    };
    if (content.images && content.images.length > 0) {
      terminalLogger.log("[BlogAutomationManager] Processing images for upload...");
      try {
        const uploadedImages = await this.uploadImagesToWordPress(content.images);
        const featuredImage = uploadedImages.find((img) => img.type === "featured");
        if (featuredImage && featuredImage.mediaId) {
          postData.featured_media = featuredImage.mediaId;
          terminalLogger.log("[BlogAutomationManager] Featured image set:", featuredImage.mediaId);
        }
        if (uploadedImages.length > 0) {
          content.html = this.replaceImageUrlsInContent(content.html, uploadedImages);
          postData.content = content.html;
        }
      } catch (error) {
        terminalLogger.error("[BlogAutomationManager] Image upload failed:", error);
      }
    }
    terminalLogger.log("[BlogAutomationManager] Calling publishPost with data:", {
      title: postData.title,
      status: postData.status,
      hasContent: !!postData.content,
      contentPreview: postData.content?.substring(0, 100) + "..."
    });
    const result = await this.publishingService.publishPost(postData);
    this.activeWorkflow.data.publishResult = result;
    this.activeWorkflow.complete();
    return result;
  }
  /**
   * Start a new blog creation workflow (interactive)
   */
  async startNewBlogWorkflow(params = {}) {
    terminalLogger.log("[BlogAutomationManager] Starting new blog workflow");
    if (this.activeWorkflow && !this.activeWorkflow.completed) {
      return {
        type: "warning",
        message: "A blog workflow is already in progress. Complete or cancel it first."
      };
    }
    try {
      this.activeWorkflow = await this.workflowManager.createWorkflow({
        type: "blog_creation",
        params,
        timestamp: Date.now()
      });
      const response = await this.runInteractiveWorkflow();
      return response;
    } catch (error) {
      terminalLogger.error("[BlogAutomationManager] Failed to start workflow:", error);
      return {
        type: "error",
        message: "Failed to start blog workflow: " + error.message
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
      case "gather_requirements":
        return {
          type: "interactive",
          step: "requirements",
          message: "블로그 주제를 알려주세요. 어떤 내용을 다루고 싶으신가요?",
          prompt: this.systemPrompts.getRequirementsPrompt()
        };
      case "generate_outline":
        return {
          type: "processing",
          message: "블로그 개요를 생성하고 있습니다...",
          action: async () => await this.generateOutline()
        };
      case "generate_content":
        return {
          type: "processing",
          message: "블로그 콘텐츠를 생성하고 있습니다...",
          action: async () => await this.generateContent()
        };
      case "review_content":
        return {
          type: "review",
          content: workflow.data.generatedContent,
          message: "생성된 콘텐츠를 검토해주세요. 수정이 필요하시면 알려주세요."
        };
      case "prepare_publishing":
        return {
          type: "confirmation",
          message: "WordPress에 게시할 준비가 완료되었습니다. 게시하시겠습니까?",
          data: workflow.data
        };
      default:
        return {
          type: "info",
          message: "Workflow step not implemented: " + currentStep.id
        };
    }
  }
  /**
   * Generate blog outline based on requirements
   */
  async generateOutline() {
    const workflow = this.activeWorkflow;
    const requirements = workflow.data.requirements;
    terminalLogger.log("[BlogAutomationManager] Generating outline for:", requirements);
    try {
      const systemPrompt = this.systemPrompts.getOutlinePrompt(requirements);
      const outline = await this.contentGenerator.generateOutline(
        requirements,
        systemPrompt
      );
      workflow.data.outline = outline;
      workflow.moveToNextStep();
      return {
        type: "outline_generated",
        outline,
        message: "개요가 생성되었습니다. 확인해주세요."
      };
    } catch (error) {
      terminalLogger.error("[BlogAutomationManager] Outline generation failed:", error);
      throw error;
    }
  }
  /**
   * Generate full blog content
   */
  async generateContent() {
    const workflow = this.activeWorkflow;
    const { requirements, outline } = workflow.data;
    terminalLogger.log("[BlogAutomationManager] Generating content");
    try {
      const content = await this.contentGenerator.generateFullContent(
        requirements,
        outline,
        {
          industry: "electrical_sensors",
          language: "korean",
          seoKeywords: workflow.data.seoKeywords || []
        }
      );
      workflow.data.generatedContent = content;
      workflow.moveToNextStep();
      return {
        type: "content_generated",
        content,
        message: "콘텐츠가 생성되었습니다."
      };
    } catch (error) {
      terminalLogger.error("[BlogAutomationManager] Content generation failed:", error);
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
        type: "error",
        message: "게시할 콘텐츠가 없습니다. 먼저 블로그를 생성해주세요."
      };
    }
    if (!this.publishingService.config.credentials) {
      return {
        type: "credential_required",
        message: "WordPress 인증 정보가 필요합니다. 사용자명과 비밀번호를 입력해주세요.",
        prompt: "credentials"
      };
    }
    try {
      terminalLogger.log("[BlogAutomationManager] Publishing to WordPress");
      const postData = {
        title: workflow.data.generatedContent.title,
        content: workflow.data.generatedContent.html || workflow.data.generatedContent.content,
        excerpt: workflow.data.generatedContent.excerpt,
        status: params.draft ? "draft" : "publish",
        categories: workflow.data.categories || [],
        tags: workflow.data.tags || [],
        meta: {
          seo_title: workflow.data.generatedContent.seoTitle,
          seo_description: workflow.data.generatedContent.seoDescription,
          seo_keywords: workflow.data.seoKeywords
        }
      };
      const result = await this.publishingService.publishPost(postData);
      workflow.data.publishResult = result;
      workflow.complete();
      return {
        type: "published",
        result,
        message: `블로그가 성공적으로 게시되었습니다! URL: ${result.link}`
      };
    } catch (error) {
      terminalLogger.error("[BlogAutomationManager] Publishing failed:", error);
      if (error.message.includes("401") || error.message.includes("authentication")) {
        return {
          type: "credential_required",
          message: "인증 실패: WordPress 사용자명과 비밀번호를 확인해주세요.",
          prompt: "credentials"
        };
      }
      return {
        type: "error",
        message: "게시 중 오류가 발생했습니다: " + error.message
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
          type: "success",
          message: "WordPress 인증 정보가 저장되었습니다."
        };
      } else {
        return {
          type: "error",
          message: "인증 실패: 사용자명과 비밀번호를 확인해주세요."
        };
      }
    } catch (error) {
      terminalLogger.error("[BlogAutomationManager] Credential setup failed:", error);
      return {
        type: "error",
        message: "인증 정보 설정 중 오류가 발생했습니다: " + error.message
      };
    }
  }
  /**
   * Get blog automation help
   */
  getBlogHelp() {
    return {
      type: "help",
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
    this.workflowManager.on("step_completed", (data) => {
      this.emit("workflow_progress", data);
    });
    this.contentGenerator.on("progress", (data) => {
      this.emit("generation_progress", data);
    });
    this.publishingService.on("publish_progress", (data) => {
      this.emit("publish_progress", data);
    });
    this.on("automation_started", (data) => {
      if (this.chatComponent) {
        this.chatComponent.addAssistantMessage(data.message, false);
      }
    });
    this.on("automation_progress", (data) => {
      if (this.chatComponent) {
        this.chatComponent.addAssistantMessage(data.message, false);
      }
    });
    this.on("automation_completed", (data) => {
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
    this.on("automation_failed", (data) => {
      if (this.chatComponent) {
        this.chatComponent.showError("자동화 실패: " + data.error);
      }
    });
  }
  /**
   * Get current workflow status
   */
  async getWorkflowStatus() {
    if (!this.activeWorkflow) {
      return {
        type: "info",
        message: "진행 중인 작업이 없습니다."
      };
    }
    return {
      type: "status",
      workflow: this.activeWorkflow.getStatus(),
      message: "현재 작업 상태입니다."
    };
  }
  /**
   * List saved drafts
   */
  async listDrafts() {
    try {
      const drafts = await this.workflowManager.getSavedDrafts();
      return {
        type: "drafts",
        drafts,
        message: `저장된 초안: ${drafts.length}개`
      };
    } catch (error) {
      terminalLogger.error("[BlogAutomationManager] Failed to list drafts:", error);
      return {
        type: "error",
        message: "초안 목록을 불러올 수 없습니다."
      };
    }
  }
  /**
   * Handle workflow continuation
   */
  async continueWorkflow(userInput) {
    if (!this.activeWorkflow) {
      return {
        type: "error",
        message: "진행 중인 작업이 없습니다."
      };
    }
    const currentStep = this.activeWorkflow.getCurrentStep();
    switch (currentStep.id) {
      case "gather_requirements":
        this.activeWorkflow.data.requirements = userInput;
        this.activeWorkflow.moveToNextStep();
        return await this.runInteractiveWorkflow();
      case "review_content":
        if (userInput.toLowerCase().includes("수정")) {
          return {
            type: "interactive",
            message: "어떤 부분을 수정하시겠습니까?"
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
    terminalLogger.log("[BlogAutomationManager] Uploading images to WordPress...");
    const uploadedImages = [];
    for (const image of images) {
      try {
        const response = await fetch(image.url);
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.statusText}`);
        }
        const blob = await response.blob();
        const filename = `blog-image-${Date.now()}-${image.type}.jpg`;
        const file = new File([blob], filename, { type: "image/jpeg" });
        terminalLogger.log("[BlogAutomationManager] Uploading image:", filename);
        const formData = new FormData();
        formData.append("file", file);
        const uploadResponse = await window.electronAPI.wordpress.request({
          method: "POST",
          endpoint: "/media",
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
          terminalLogger.log("[BlogAutomationManager] Image uploaded successfully:", media.id);
        }
      } catch (error) {
        terminalLogger.error("[BlogAutomationManager] Failed to upload image:", error);
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
        updatedContent = updatedContent.replace(
          new RegExp(image.originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          image.wpUrl
        );
        if (image.type === "featured") {
          updatedContent = updatedContent.replace("[FEATURED_IMAGE]", image.wpUrl);
        } else if (image.type === "section") {
          updatedContent = updatedContent.replace("[SECTION_IMAGE]", image.wpUrl);
        }
      }
    }
    return updatedContent;
  }
  /**
   * Clean up resources
   */
  async destroy() {
    terminalLogger.log("[BlogAutomationManager] Destroying...");
    if (this.activeWorkflow && !this.activeWorkflow.completed) {
      await this.workflowManager.saveWorkflow(this.activeWorkflow);
    }
    await this.contentGenerator.destroy();
    await this.publishingService.destroy();
    this.removeAllListeners();
  }
}
export {
  BlogAutomationManager as default
};
