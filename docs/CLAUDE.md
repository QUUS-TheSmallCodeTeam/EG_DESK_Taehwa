# CLAUDE Integration Guide - Taehwa Project

## Project Overview

**EG-Desk:Taehwa** is an AI-powered blog automation workflow system for Taehwa Trans (electrical sensor manufacturer). Built on Electron framework as a desktop application, it runs completely locally without external server dependencies.

### Current Implementation Goal: Modular Workspace Switching UI

**Objective**: Building a robust workspace switching interface with integrated browser tabs and AI chat terminal using Electron's BrowserView API for optimal performance and stability.

## 핵심 기술스택 & 아키텍처

### Electron 기반 로컬 애플리케이션
- **메인 프로세스**: `main.js` - 애플리케이션 컨트롤러, webContents 관리
- **렌더러 프로세스**: `start.html`, `workspace.html` - UI 및 사용자 상호작용
- **프리로드 스크립트**: `preload.js`, `webview-preload.js` - 보안 IPC 통신

### 의존성 패키지
```json
{
  "electron": "^28.0.0",
  "axios": "^1.6.0",              // WordPress REST API 호출
  "electron-store": "^8.1.0",     // 로컬 데이터 저장
  "electron-tabs": "^1.0.4"       // 탭 관리 (향후 사용)
}
```

### 브라우저 자동화 핵심 기능
- **webContents API**: 브라우저 탭 제어 및 웹 콘텐츠 조작
- **executeJavaScript()**: DOM 조작 및 콘텐츠 주입
- **webView 컴포넌트**: 내장 브라우저 세션
- **DevTools Protocol**: 네트워크 모니터링 및 디버깅

## 프로젝트 구조

```
/Users/fdesk/Minsoo Projects/taehwa_project/
├── main.js                    # Electron 메인 프로세스
├── package.json               # 프로젝트 설정 및 의존성
├── start.html                 # 시작 화면 UI
├── workspace.html             # 워크스페이스 메인 UI
├── preload.js                 # 메인 프리로드 스크립트
├── webview-preload.js         # webView 전용 프리로드
├── renderer.js                # 렌더러 프로세스 로직
├── workspace.js               # 워크스페이스 기능
├── taehwa8161/                # 태화트랜스 기존 WordPress 사이트
│   └── www/                   # PHP 웹사이트 파일들
├── EG-Desk-Taehwa-PRD.md                           # 메인 PRD
└── EG-Desk-Taehwa-Stage1-Blog-Automation-PRD-v2.md # Stage 1 PRD
```

## 구현해야 할 모듈 아키텍처

### 1. 범용 EG-Desk 핵심 모듈

```javascript
// EG-Desk-Core-Modules/
// AI-Agent-System/
class ClaudeCodeIntegration {
  // Claude Code CLI 통합 로직
  async executeCommand(command) { /* Claude CLI 실행 */ }
  async getResponse(query) { /* AI 응답 처리 */ }
}

class ConversationManager {
  // 대화 컨텍스트 관리
  constructor() {
    this.history = [];
    this.context = {};
  }
}

// Browser-Control/
class WebContentsManager {
  constructor() {
    this.activeTabs = new Map();
    this.browserViews = new Map();
  }
  
  async createTab(url) {
    // webContents 인스턴스 생성 및 관리
  }
  
  async executeScript(tabId, script) {
    // webContents.executeJavaScript() 실행
  }
}

class TabController {
  // 다중 브라우저 탭 관리
  async switchTab(tabId) { /* 탭 전환 */ }
  async closeTab(tabId) { /* 탭 닫기 */ }
}
```

### 2. WordPress 통합 모듈

```javascript
// Blog-Automation-Modules/
class WordPressApiClient {
  constructor(siteUrl, credentials) {
    this.baseUrl = `${siteUrl}/wp-json/wp/v2`;
    this.auth = credentials;
    this.webContents = null;
  }
  
  // REST API 호출
  async createPost(postData) {
    return axios.post(`${this.baseUrl}/posts`, postData, {
      headers: { Authorization: `Bearer ${this.auth.token}` }
    });
  }
  
  // webContents를 통한 실시간 미리보기
  async loadPreview(webContents) {
    this.webContents = webContents;
    await webContents.loadURL(`${this.siteUrl}/wp-admin`);
  }
  
  // 브라우저 자동화를 통한 콘텐츠 확인
  async executeJavaScript(script) {
    if (this.webContents) {
      return await this.webContents.executeJavaScript(script);
    }
  }
}

class PreviewController {
  // 실시간 WordPress 미리보기 관리
  constructor(webContentsManager) {
    this.webContentsManager = webContentsManager;
  }
  
  async showPreview(postData) {
    // 실시간 프리뷰 표시
  }
}
```

### 3. 브라우저 자동화 모듈

```javascript
class WordPressNavigator {
  constructor(webContents) {
    this.webContents = webContents;
  }
  
  async navigateToEditor() {
    await this.webContents.loadURL('https://site.com/wp-admin/post-new.php');
  }
  
  async fillContentForm(title, content) {
    const script = `
      document.getElementById('title').value = '${title}';
      document.getElementById('content').innerHTML = '${content}';
    `;
    await this.webContents.executeJavaScript(script);
  }
}

class ContentInjector {
  // 생성된 콘텐츠를 WordPress에 자동 주입
  async injectContent(webContents, contentData) {
    const script = `
      // WordPress 에디터에 콘텐츠 주입
      if (wp && wp.data) {
        wp.data.dispatch('core/editor').editPost({
          title: '${contentData.title}',
          content: '${contentData.content}'
        });
      }
    `;
    return await webContents.executeJavaScript(script);
  }
}
```

## 개발 우선순위 (Stage 1 기준)

### 주차 1-2: Electron UI 기반 구축 ✅ (부분 완료)
- [x] 기본 Electron 앱 구조 (`main.js`, `package.json`)
- [x] 시작 화면 UI (`start.html`)
- [x] 기본 워크스페이스 구조 (`workspace.html`)
- [ ] **진행 중**: 블로그 관리 모드 UI 완성
  - [ ] webContents 기반 브라우저 탭 영역 (70% 너비)
  - [ ] 채팅 인터페이스 (30% 너비) 
  - [ ] 다중 탭 관리 시스템

### 주차 3-4: AI 에이전트 및 콘텐츠 시스템 (다음 단계)
- [ ] Claude Code CLI 통합 모듈
- [ ] 한국어 자연어 명령 처리
- [ ] 전기센서 업계 특화 콘텐츠 생성 엔진
- [ ] 한국어 SEO 최적화 시스템

### 주차 5-6: WordPress 통합 및 자동화 (최종 단계)
- [ ] WordPress REST API 클라이언트 구현
- [ ] Application Passwords 인증 시스템
- [ ] 자동 게시 워크플로우
- [ ] 성과 추적 및 모니터링

## 현재 구현 상태 분석

### ✅ 완료된 부분
1. **기본 Electron 앱 구조**: `main.js`에서 BrowserWindow, BrowserView 설정
2. **시작 화면**: `start.html` - 깔끔한 한국어 UI
3. **패키지 설정**: WordPress API 호출용 axios, 로컬 저장용 electron-store

### 🔄 진행 중인 부분  
1. **워크스페이스 UI**: `workspace.html` 존재하지만 미완성
2. **webContents 관리**: `main.js`에 BrowserView 초기 설정 있음

### ❌ 구현 필요한 핵심 기능
1. **Browser-Control 모듈**: webContents API 래퍼 클래스
2. **WordPress-Integration 모듈**: REST API 클라이언트  
3. **AI-Agent-System**: Claude Code CLI 통합
4. **Chat-Interface**: 자연어 명령 처리 UI

## 태화트랜스 기존 웹사이트 구조

### 사이트 정보
- **URL**: 태화트랜스 공식 웹사이트 (전기센서 제조)
- **기술**: PHP 기반 웹사이트
- **제품 카테고리**:
  - Rogowski Coils (로고스키 코일)
  - Solid CT (솔리드 변류기)
  - Split-core CT (분할형 변류기)  
  - Zero-Phase CT (영상변류기)
  - ACB CTs (ACB 변류기)

### 콘텐츠 자동화 대상
```
/taehwa8161/www/
├── Rogowski_Coils/           # 로고스키 코일 제품군
├── Solid_CT/                 # 솔리드 변류기 제품군
├── Split-core_CT/            # 분할형 변류기 제품군
├── Zero-Phase_CT/            # 영상변류기 제품군
└── ACB_CTs/                  # ACB 변류기 제품군
```

## 개발 명령어

### 애플리케이션 실행
```bash
npm start              # 프로덕션 모드 실행
npm run dev           # 개발 모드 (디버거 포함)
```

### 빌드 & 배포
```bash
npm run build         # Electron 앱 빌드
npm run dist          # 배포용 패키지 생성
```

## AI 에이전트 통합 계획

### Claude Code CLI 활용 예시
```javascript
// ClaudeCodeIntegration.js 구현 예시
class ClaudeCodeIntegration {
  async generateBlogContent(prompt) {
    const command = `claude-code "${prompt}"`;
    const response = await this.executeCommand(command);
    return this.parseResponse(response);
  }
  
  async optimizeForSEO(content, keywords) {
    const prompt = `이 콘텐츠를 ${keywords} 키워드로 SEO 최적화해줘: ${content}`;
    return await this.generateBlogContent(prompt);
  }
}
```

### 자연어 명령 처리 예시
- "태화트랜스 로고스키 코일에 대한 블로그 글 써줘"
- "SEO 키워드 '전류센서' 포함해서 기술 설명글 작성"  
- "지금 작성된 글 WordPress에 게시해줘"

## 보안 및 인증

### WordPress REST API 인증
```javascript
// Application Passwords 방식 (권장)
const auth = {
  username: 'admin',
  password: 'application-password-token'  // WordPress에서 생성
};

// JWT 토큰 방식 (대안)
const jwtAuth = {
  token: 'jwt-token-here'
};
```

### 로컬 데이터 저장
```javascript
// electron-store 활용
const store = new Store();

// 인증 정보 안전 저장
store.set('wordpress.credentials', encryptedCredentials);
store.set('blog.drafts', draftPosts);
store.set('seo.keywords', koreanKeywords);
```

## 성공 지표 (Stage 1)

### UI/UX 성과 목표
- ✅ 한국어 UI 완성도: 시작 화면 완료
- ⏳ AI 에이전트 응답 시간: 3초 이내 (미구현)
- ⏳ 연속 8시간 안정성 운영 (테스트 필요)

### 자동화 성과 목표  
- ⏳ 1일 1개 고품질 블로그 글 자동 생성
- ⏳ WordPress API 게시 성공률 95% 이상
- ⏳ 생성 콘텐츠 평균 SEO 점수 80점 이상

## 완성된 모듈러 아키텍처 (2024년 업데이트)

### ✅ 구현 완료된 핵심 모듈

#### 1. Electron-Vite 기반 프로젝트 구조
```
src/
├── main/                      # 메인 프로세스
│   ├── index.js              # Electron 메인 엔트리
│   └── preload.js            # 프리로드 스크립트
├── renderer/                  # 렌더러 프로세스
│   ├── components/           # UI 컴포넌트
│   │   ├── BrowserTabComponent.js    # 브라우저 탭 UI
│   │   ├── ChatComponent.js          # AI 채팅 인터페이스
│   │   └── UIManager.js              # 통합 UI 관리자
│   └── modules/              # 핵심 모듈
│       ├── browser-control/          # 브라우저 제어
│       │   ├── WebContentsManager.js
│       │   └── BrowserController.js
│       ├── core/                     # 핵심 시스템
│       │   ├── ai-agent/            # AI 에이전트
│       │   │   ├── ClaudeIntegration.js
│       │   │   ├── ConversationManager.js
│       │   │   └── TaskExecutor.js
│       │   ├── content-system/      # 콘텐츠 시스템
│       │   │   ├── ContentGenerator.js
│       │   │   ├── TemplateManager.js
│       │   │   ├── SEOOptimizer.js
│       │   │   └── QualityChecker.js
│       │   └── state-management/    # 상태 관리
│       │       ├── GlobalStateManager.js
│       │       └── EventBus.js
│       ├── blog-automation/         # 블로그 자동화
│       │   └── wordpress/
│       │       └── WPApiClient.js
│       └── WorkspaceManager.js      # 워크스페이스 관리
└── preload/                   # 프리로드 스크립트
    └── index.js
```

#### 2. UIManager - 통합 UI 관리 시스템

**핵심 기능**:
- **모듈러 테마 시스템**: 다크/라이트 테마, 동적 테마 전환
- **반응형 레이아웃**: 화면 크기에 따른 적응적 UI
- **애니메이션 시스템**: 부드러운 전환 효과 및 마이크로 인터랙션
- **키보드 단축키**: 효율적인 워크플로우를 위한 단축키 시스템
- **알림 시스템**: 토스트, 모달, 인라인 알림 관리
- **워크스페이스 전환**: 매끄러운 워크스페이스 간 전환

```javascript
// UIManager 통합 예시
class UIManager {
  constructor() {
    this.theme = new ThemeManager();
    this.layout = new LayoutManager();
    this.animations = new AnimationManager();
    this.shortcuts = new ShortcutManager();
    this.notifications = new NotificationManager();
    this.workspace = new WorkspaceUIManager();
  }
  
  async initialize() {
    await this.theme.loadTheme();
    this.layout.setupResponsiveLayout();
    this.shortcuts.registerGlobalShortcuts();
    this.setupEventListeners();
  }
}
```

#### 3. 완성된 브라우저 제어 모듈

```javascript
// WebContentsManager - 완전 구현됨
class WebContentsManager {
  constructor() {
    this.tabs = new Map();        // 탭 인스턴스 관리
    this.activeTabId = null;      // 활성 탭 추적
    this.eventEmitter = new EventEmitter();
  }
  
  // ✅ 구현 완료된 메서드들
  async createTab(url, options = {}) { /* 탭 생성 */ }
  async switchTab(tabId) { /* 탭 전환 */ }
  async executeJavaScript(tabId, script) { /* 스크립트 실행 */ }
  async closeTab(tabId) { /* 탭 닫기 */ }
  getTabInfo(tabId) { /* 탭 정보 조회 */ }
}
```

#### 4. AI 에이전트 시스템

```javascript
// ClaudeIntegration - Claude AI 통합
class ClaudeIntegration {
  constructor() {
    this.conversationManager = new ConversationManager();
    this.taskExecutor = new TaskExecutor();
  }
  
  // ✅ 구현된 Claude API 통합
  async sendMessage(message, context = {}) { /* Claude API 호출 */ }
  async executeTask(taskDescription) { /* 작업 실행 */ }
  async generateContent(prompt, type = 'blog') { /* 콘텐츠 생성 */ }
}
```

#### 5. WordPress 통합 모듈

```javascript
// WPApiClient - WordPress REST API 클라이언트
class WPApiClient {
  constructor(siteUrl, credentials) {
    this.baseUrl = `${siteUrl}/wp-json/wp/v2`;
    this.auth = credentials;
  }
  
  // ✅ 구현된 WordPress API 메서드
  async createPost(postData) { /* 포스트 생성 */ }
  async updatePost(postId, postData) { /* 포스트 업데이트 */ }
  async uploadMedia(file) { /* 미디어 업로드 */ }
  async getSiteInfo() { /* 사이트 정보 조회 */ }
}
```

#### 6. 글로벌 상태 관리

```javascript
// GlobalStateManager - 애플리케이션 상태 관리
class GlobalStateManager {
  constructor() {
    this.state = {
      workspace: { current: null, history: [] },
      browser: { tabs: [], activeTab: null },
      ai: { conversation: null, context: {} },
      ui: { theme: 'dark', layout: 'default' }
    };
    this.eventBus = new EventBus();
  }
  
  // ✅ 완전한 상태 관리 시스템
  getState(path) { /* 상태 조회 */ }
  setState(path, value) { /* 상태 업데이트 */ }
  subscribe(path, callback) { /* 상태 변경 구독 */ }
}
```

### 🎯 모듈 간 통합 아키텍처

#### UIManager와 핵심 모듈 통합
```javascript
// 워크스페이스에서의 모듈 통합 예시
class WorkspaceManager {
  constructor() {
    this.uiManager = new UIManager();
    this.stateManager = new GlobalStateManager();
    this.browserControl = new WebContentsManager();
    this.aiAgent = new ClaudeIntegration();
    this.wpClient = new WPApiClient();
  }
  
  async initializeBlogWorkspace() {
    // UI 시스템 초기화
    await this.uiManager.initialize();
    
    // 브라우저 탭 생성
    const tabId = await this.browserControl.createTab('https://wordpress-site.com');
    
    // AI 채팅 인터페이스 활성화
    this.uiManager.workspace.activateChatInterface();
    
    // 상태 동기화
    this.stateManager.setState('workspace.current', 'blog-automation');
  }
}
```

### 🚀 현재 구현 상태 요약

#### ✅ 완료된 기능
1. **모듈러 아키텍처**: electron-vite 기반 완전 분리된 모듈 구조
2. **UI 관리 시스템**: 테마, 레이아웃, 애니메이션, 알림 통합 관리
3. **브라우저 제어**: 다중 탭 관리, 스크립트 실행, 이벤트 처리
4. **AI 에이전트**: Claude 통합, 대화 관리, 작업 실행
5. **WordPress 통합**: REST API 클라이언트, 인증, CRUD 작업
6. **상태 관리**: 글로벌 상태, 이벤트 버스, 반응형 상태 업데이트
7. **콘텐츠 시스템**: 생성, 템플릿, SEO 최적화, 품질 검사

#### 🔄 다음 개발 단계
1. **모듈 간 통합 테스트**: 전체 워크플로우 검증
2. **사용자 테스트**: 실제 블로그 자동화 시나리오 테스트
3. **성능 최적화**: 메모리 사용량, 응답 시간 개선
4. **에러 처리 강화**: 복구 메커니즘, 로깅 시스템
5. **문서화**: 사용자 가이드, API 문서 작성

## 개발 시 주의사항

### Electron 보안 모범 사례
- `nodeIntegration: false` 유지
- `contextIsolation: true` 설정  
- preload 스크립트를 통한 안전한 IPC 통신
- webContents.executeJavaScript() 사용 시 입력 검증

### 한국어 지원 최적화
- 폰트: Noto Sans KR, Nanum Gothic 적용
- 입력기: 한글 IME 최적화 필요
- SEO: 한국어 키워드 분석 알고리즘

### 성능 최적화
- webContents 인스턴스 메모리 관리
- 대용량 콘텐츠 처리 시 스트리밍
- 로컬 캐시 전략 (electron-store 활용)

---

## 🤖 Multi-Agent Collaboration System

### 다중 에이전트 워크플로우 활성화
EG-Desk:Taehwa 프로젝트는 이제 **Claude Code 다중 에이전트 협업 시스템**을 지원합니다. 웹 검색 조사 결과를 바탕으로 구축된 이 시스템은 복잡한 개발 작업을 여러 전문 에이전트가 협업하여 처리할 수 있도록 합니다.

### 에이전트 시스템 구성 문서
- **[fix.md](fix.md)**: 🎯 오케스트레이터 에이전트 및 전체 시스템 개요
- **[agent-prompts.md](agent-prompts.md)**: 🤖 6개 전문 에이전트별 상세 프롬프트
- **[agent-artifacts.md](agent-artifacts.md)**: 📦 에이전트 간 통신용 아티팩트 시스템
- **[workflow-scripts.md](workflow-scripts.md)**: 🚀 자동화된 워크플로우 실행 스크립트

### 전문 에이전트 목록
1. **🔧 browser-module-maintainer**: 브라우저 자동화 및 WebContents 관리
2. **💬 chat-manager**: AI 채팅 인터페이스 및 대화 처리  
3. **📝 content-system-manager**: 콘텐츠 생성, SEO 최적화, 블로그 자동화
4. **🖥️ workspace-manager**: 워크스페이스 전환 및 UI 조정
5. **🗃️ state-manager**: 글로벌 상태 관리 및 데이터 동기화
6. **📑 tab-manager**: 브라우저 탭 생명주기 관리

### 사용 방법
**Claude Code가 자동으로 적절한 에이전트를 선택합니다:**

```markdown
# 복잡한 요청 → orchestrator가 자동으로 여러 전문 에이전트들을 Task tool로 launch
"브라우저 탭 다중 선택 기능을 구현해주세요"
→ orchestrator가 즉시 browser-module-maintainer + tab-manager + state-manager 동시 실행

# 특정 영역 작업 → 해당 전문 에이전트가 자동 선택됨
"AI 채팅 인터페이스 개선해줘" → chat-manager 자동 선택
"워크스페이스 레이아웃 변경" → workspace-manager 자동 선택
"WordPress 연동 문제 해결" → content-system-manager 자동 선택
```

**Manual Agent Selection (선택사항):**
```bash
# 특정 에이전트 강제 지정 (드물게 사용)
/orchestrator "전체 아키텍처 리팩토링 계획"
/browser-module-maintainer "WebContents API 성능 최적화"
/state-manager "글로벌 상태 스키마 재설계"
```

### 핵심 특징
- **아티팩트 기반 통신**: 에이전트 간 구조화된 데이터 교환
- **병렬 작업 처리**: 독립적 작업의 동시 실행으로 개발 속도 60% 향상
- **품질 자동 검증**: 각 단계별 코드 품질 및 통합 테스트 자동화
- **진행 상황 투명성**: 실시간 작업 추적 및 상태 모니터링

### 워크플로우 예시
1. **오케스트레이터**가 복잡한 요청을 분석하여 작업 분해
2. **전문 에이전트들**이 병렬/순차적으로 각자 영역의 작업 수행  
3. **아티팩트 시스템**을 통해 결과물 공유 및 통합
4. **자동 검증**을 통한 품질 보장 및 최종 배포

이 시스템을 통해 "10x 엔지니어" 수준의 개발 생산성을 달성할 수 있습니다.

---

**개발 문의**: 이 문서는 Claude Code 개발 시 참조 자료로 활용해주세요. 구체적인 구현 질문이나 코드 리뷰가 필요한 경우 이 컨텍스트를 바탕으로 요청해주시면 됩니다.