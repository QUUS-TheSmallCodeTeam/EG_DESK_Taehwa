# CLAUDE Integration Guide - Taehwa Project

## Project Overview

**EG-Desk:Taehwa** is an AI-powered blog automation workflow system for Taehwa Trans (electrical sensor manufacturer). Built on modern Electron + electron-vite framework as a desktop application, it runs completely locally without external server dependencies.

### Project Vision & Requirements
📋 **Complete Project Requirements**: See `docs/EG-Desk-Taehwa-PRD.md` for comprehensive project vision and specifications  
🎯 **Current Phase**: See `docs/EG-Desk-Taehwa-Stage1-Blog-Automation-PRD-v2.md` for Stage 1 implementation details

### Current Implementation Status: Modern Electron-Vite + ES Modules Architecture
**Objective**: Building a robust modular workspace switching interface with integrated browser tabs and AI chat terminal using electron-vite build system and strict ES6 module architecture.

## 핵심 기술스택 & 아키텍처

### Modern Electron + electron-vite 기반 로컬 애플리케이션
- **빌드 시스템**: electron-vite 4.0.0 (현대적, 빠른 HMR, ESM 기반)
- **메인 프로세스**: `src/main/index.js` - Electron 애플리케이션 컨트롤러, WebContents 관리
- **렌더러 프로세스**: `src/renderer/index.html` + `src/renderer/index.js` - UI 및 사용자 상호작용
- **프리로드 스크립트**: `src/main/preload.js` - 보안 IPC 통신 (contextIsolation: true)
- **모듈 시스템**: 엄격한 ES6 imports/exports (.js 확장자 필수, CommonJS 없음)

### 의존성 패키지 (현재 버전)
```json
{
  "electron": "^37.2.4",          // 최신 Electron
  "electron-vite": "^4.0.0",      // 현대적 빌드 시스템
  "vite": "^7.0.6",               // 고성능 번들러
  "axios": "^1.6.0",              // WordPress REST API 호출
  "electron-store": "^8.1.0",     // 로컬 데이터 저장
  "electron-tabs": "^1.0.4"       // 탭 관리 (향후 사용)
}
```

### 개발 환경
- **개발 서버**: `yarn dev` (포트 5173, HMR 지원)
- **빌드**: `yarn build` (프로덕션)
- **미리보기**: `yarn preview` (빌드된 앱 테스트)

### 브라우저 자동화 핵심 기능
- **webContents API**: 브라우저 탭 제어 및 웹 콘텐츠 조작  
- **executeJavaScript()**: DOM 조작 및 콘텐츠 주입
- **BrowserView/BrowserWindow**: 내장 브라우저 세션 관리
- **IPC 통신**: 메인-렌더러 프로세스 간 안전한 데이터 교환
- **DevTools Protocol**: 네트워크 모니터링 및 디버깅

## 🎯 사용자 의도 및 비즈니스 목표

### 태화트랜스(Taehwa Trans) 회사 배경
- **업종**: 전기센서 제조업체 (전류센서, 변류기 전문)
- **주요 제품**: Rogowski Coils, Split-core CT, Zero-Phase CT, ACB CTs
- **웹사이트**: taehwa8161/ 디렉토리에 기존 PHP 기반 WordPress 사이트 보유
- **목표**: AI 기반 한국어 기술 블로그 자동화로 SEO 향상 및 리드 생성

### 개발자(사용자) 의도
1. **워크플로우 자동화**: 수동 블로그 작성을 AI 기반 자동화로 대체
2. **기술적 우수성**: 최신 electron-vite + ES modules 아키텍처로 견고한 데스크톱 앱 구현
3. **모듈화**: 엄격한 모듈 분리로 확장 가능하고 유지보수 가능한 구조
4. **전문성**: 전기센서 업계 특화 콘텐츠 생성으로 차별화
5. **AI 통합**: Claude Code CLI 기반 다중 AI 에이전트 시스템 구축으로 사용자 경험 극대화

### Stage 1 목표 (현재 단계)
📋 **상세 요구사항**: `docs/EG-Desk-Taehwa-Stage1-Blog-Automation-PRD-v2.md` 참조
- 기본 Electron 앱 UI 완성 (✅ 완료)
- 워크스페이스 시스템 구현 (🔄 진행중)
- AI 채팅 인터페이스 통합 (🔄 진행중)
- WordPress API 연동 준비 (⏳ 대기)

### 장기 비전
📋 **전체 로드맵**: `docs/EG-Desk-Taehwa-PRD.md` 참조
- 다중 워크스페이스 지원 (블로그, 소셜미디어, 고급 자동화)
- 한국어 SEO 최적화 엔진
- 전기센서 업계 특화 템플릿 시스템
- 성과 추적 및 분석 대시보드

## 현재 프로젝트 구조 (electron-vite + ES modules)

```
taehwa_project/
├── src/                                    # 소스 코드 루트
│   ├── main/                               # 메인 프로세스 (Node.js 컨텍스트)
│   │   ├── index.js                        # Electron 앱 진입점 (BrowserWindow 설정)
│   │   ├── preload.js                      # IPC 브릿지 (보안 컨텍스트)
│   │   └── modules/
│   │       ├── ClaudeService.js            # Claude API 서비스
│   │       └── WebContentsManager.js       # 브라우저 제어 (메인 프로세스)
│   └── renderer/                           # 렌더러 프로세스 (브라우저 컨텍스트)
│       ├── index.html                      # 메인 UI 템플릿
│       ├── index.js                        # 애플리케이션 진입점
│       ├── components/                     # 재사용 가능한 UI 컴포넌트
│       │   ├── BrowserTabComponent.js      # 브라우저 탭 인터페이스
│       │   └── ChatComponent.js            # AI 채팅 인터페이스
│       ├── modules/                        # 핵심 애플리케이션 모듈
│       │   ├── EGDeskCore.js               # 모듈 오케스트레이터 (355 라인)
│       │   ├── WorkspaceManager.js         # 워크스페이스 조정 (457 라인)
│       │   ├── core/                       # 핵심 시스템
│       │   │   ├── ai-agent/               # Claude 통합
│       │   │   │   ├── ClaudeIntegration.js
│       │   │   │   ├── ConversationManager.js
│       │   │   │   └── TaskExecutor.js
│       │   │   ├── content-system/         # 콘텐츠 생성
│       │   │   │   ├── ContentGenerator.js
│       │   │   │   ├── TemplateManager.js
│       │   │   │   ├── SEOOptimizer.js
│       │   │   │   └── QualityChecker.js
│       │   │   └── state-management/       # 글로벌 상태
│       │   │       ├── GlobalStateManager.js # (222 라인)
│       │   │       └── EventBus.js
│       │   └── blog-automation/
│       │       └── wordpress/
│       │           └── WPApiClient.js      # WordPress REST API
│       ├── ui/
│       │   ├── UIManager.js                # 테마, 레이아웃, 애니메이션
│       │   └── workspace/                  # 워크스페이스별 UI
│       └── utils/
│           └── EventEmitter.js             # 이벤트 시스템 기반
├── docs/                                   # 프로젝트 문서
│   ├── CLAUDE.md                           # 이 파일 (프로젝트 가이드)
│   ├── EG-Desk-Taehwa-PRD.md              # 메인 PRD
│   ├── EG-Desk-Taehwa-Stage1-Blog-Automation-PRD-v2.md # Stage 1 PRD
│   └── [기타 문서들]
├── electron.vite.config.js                # 빌드 설정
├── package.json                            # electron-vite + 의존성
├── memory.md                               # 프로젝트 메모리/진행상황
├── taehwa8161/                             # 태화트랜스 기존 WordPress 사이트
│   └── www/                                # PHP 웹사이트 파일들
└── out/                                    # 빌드 출력 (자동 생성)
```



## ⚡ 개발 원칙 및 아키텍처 가이드라인

### 🔒 필수 준수 사항
1. **ES6 모듈 엄격 사용**: 모든 import/export에 .js 확장자 필수, CommonJS 금지
2. **보안 우선**: contextIsolation: true, nodeIntegration: false 유지
3. **모듈 경계 존중**: 각 모듈은 명확한 책임 범위와 인터페이스 유지
4. **IPC 통신 패턴**: 메인-렌더러 간 데이터 교환은 preload.js를 통해서만
5. **상태 관리 집중화**: GlobalStateManager.js를 통한 중앙 집중식 상태 관리

### 🏗️ 아키텍처 패턴
- **Event-Driven**: EventEmitter 패턴으로 모듈 간 느슨한 결합
- **Component Lifecycle**: 컴포넌트 초기화, 정리, 메모리 관리 철저
- **Modular Design**: 재사용 가능한 컴포넌트와 서비스 분리
- **Separation of Concerns**: UI(renderer) vs 비즈니스 로직(main) 명확 분리

### 📋 코딩 스타일
- **파일 경로**: 항상 상대 경로로 명시적 .js 확장자 포함
- **네이밍**: camelCase (변수/함수), PascalCase (클래스/컴포넌트)
- **에러 처리**: try-catch 블록과 명확한 에러 메시지
- **로깅**: console.log에 모듈명 prefix 추가 (예: `[WorkspaceManager]`)

### 🔧 개발 도구 및 명령어
- **개발**: `yarn dev` (포트 5173, HMR 활성화)
- **빌드**: `yarn build` (프로덕션)
- **미리보기**: `yarn preview` (빌드 결과 테스트)
- **설정**: `electron.vite.config.js`에서 빌드 설정 관리

## 현재 구현된 모듈 아키텍처

### 1. 범용 EG-Desk 핵심 모듈

```javascript
// EG-Desk-Core-Modules/
// AI-Integration-System/
class ClaudeIntegration {
  // Claude Code CLI 통합 로직
  async executeCommand(command) { /* Claude Code CLI 실행 */ }
  async getResponse(query) { /* AI 응답 처리 */ }
}

class ConversationManager {
  // 사용자 대화 컨텍스트 관리
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

### 주차 3-4: AI 시스템 및 콘텐츠 자동화 (다음 단계)
- [ ] Claude Code CLI 통합 모듈 구현
- [ ] 한국어 자연어 명령 처리 시스템
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
3. **AI-Integration-System**: Claude Code CLI 통합
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

## AI 시스템 통합 계획

### Claude Code CLI 활용 예시
```javascript
// ClaudeIntegration.js 구현 예시
class ClaudeIntegration {
  async generateBlogContent(prompt, context = {}) {
    const command = `claude "${prompt}"`;
    const response = await this.executeCommand(command);
    return this.parseResponse(response);
  }
  
  async optimizeForSEO(content, keywords) {
    const prompt = `이 콘텐츠를 ${keywords} 키워드로 SEO 최적화해줘: ${content}`;
    return await this.generateBlogContent(prompt);
  }
}
```

### 사용자 자연어 명령 처리 예시 (Claude Code CLI)
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
- ⏳ AI 시스템 응답 시간: 3초 이내 (미구현)
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
│       │   ├── ai-agent/            # Claude Code CLI 통합
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

#### 4. AI 통합 시스템

```javascript
// ClaudeIntegration - Claude Code CLI 통합
class ClaudeIntegration {
  constructor() {
    this.conversationManager = new ConversationManager();
    this.taskExecutor = new TaskExecutor();
  }
  
  // ✅ 구현된 Claude Code CLI 통합
  async executeCommand(command) { /* Claude Code CLI 실행 */ }
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
4. **AI 통합 시스템**: Claude Code CLI 통합, 대화 관리, 작업 실행
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

## 🤖 EG-Desk 내장 AI 에이전트 시스템 (계획)

### 사용자용 AI 에이전트 워크플로우
EG-Desk:Taehwa 앱은 **사용자가 활용할 수 있는 다중 AI 에이전트 시스템**을 내장할 예정입니다. 이는 블로그 자동화를 위한 전문 AI 에이전트들로 구성됩니다.

### 계획된 사용자 에이전트들
1. **📝 Blog Content Agent**: 전기센서 업계 특화 콘텐츠 자동 생성
2. **🔍 SEO Optimization Agent**: 한국어 SEO 최적화 및 키워드 분석
3. **📊 Analytics Agent**: 블로그 성과 분석 및 개선 제안
4. **🎨 Visual Content Agent**: 이미지 및 차트 자동 생성
5. **📅 Content Planning Agent**: 콘텐츠 캘린더 및 발행 스케줄 관리
6. **🔗 WordPress Integration Agent**: WordPress 사이트 연동 및 자동 게시

### 사용자 경험 시나리오
```markdown
사용자: "로고스키 코일에 대한 기술 블로그 글 작성해줘"
↓
1. Blog Content Agent가 전기센서 전문 지식으로 초안 작성
2. SEO Optimization Agent가 한국어 키워드 최적화
3. Visual Content Agent가 관련 다이어그램 생성
4. WordPress Integration Agent가 자동으로 게시
5. Analytics Agent가 성과 모니터링 시작
```

### 에이전트 간 협업 패턴
- **Context Sharing**: 모든 에이전트가 Taehwa Trans 제품 정보 공유
- **Workflow Chaining**: 콘텐츠 생성 → SEO 최적화 → 게시 → 분석 자동 연계
- **User Feedback Loop**: 사용자 피드백을 통한 에이전트 성능 개선
- **Domain Expertise**: 전기센서 업계 특화 지식 베이스 활용

---

**개발 문의**: 이 문서는 Claude Code 개발 시 참조 자료로 활용해주세요. 구체적인 구현 질문이나 코드 리뷰가 필요한 경우 이 컨텍스트를 바탕으로 요청해주시면 됩니다.