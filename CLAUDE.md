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
- **모듈 시스템**: 메인/렌더러는 ES modules, `preload.js`는 보안상 CommonJS로 유지 (ESM 전환 시 주의)

### 의존성 패키지 (현재 버전)
```json
{
  "devDependencies": {
    "electron": "^37.2.4",                 // 현재 개발용 Electron 버전 (WebContentsView: Electron 30+ 호환)
    "electron-builder": "^24.6.4",        // 배포 빌더
    "electron-vite": "^4.0.0",           // 현대적 빌드 시스템
    "vite": "^7.0.6"                      // 고성능 번들러
  },
  "dependencies": {
    "@langchain/anthropic": "^0.3.25",    // Anthropic 통합 (Claude)
    "@langchain/core": "^0.3.66",         // LangChain 코어
    "@langchain/google-genai": "^0.2.16", // Google Gemini 통합
    "@langchain/openai": "^0.6.3",        // OpenAI 통합
    "axios": "^1.6.0",                    // (일부 모듈에서 사용)
    "dotenv": "^16.4.5",                  // 환경 변수 관리
    "electron-store": "^8.1.0",           // 로컬 데이터 저장 (chat-history)
    "electron-tabs": "^1.0.4",            // 탭 관리 (UI 일부에서 사용)
    "langchain": "^0.3.2",                // 통합 AI 인터페이스
    "node-fetch": "^2.7.0",               // WP 통신 보조
    "openai": "^5.11.0",                  // 이미지 생성 등 OpenAI 직접 사용
    "which": "^5.0.0"                     // 시스템 유틸리티
  }
}
```

### 개발 환경
- **개발 서버**: `yarn dev` (포트 5173, HMR 지원)
- **빌드**: `yarn build` (프로덕션)
- **미리보기**: `yarn preview` (빌드된 앱 테스트)
- **실행**: `npm start` 또는 `electron .` (package.json scripts에 정의)

### 다중 AI 프로바이더 통합 시스템
- **LangChain 기반**: 통합된 인터페이스로 여러 AI 모델 지원
- **지원 프로바이더**: Claude (Anthropic), GPT (OpenAI), Gemini (Google)
- **모델 선택**: 사용자가 실시간으로 AI 모델 변경 가능
- **비용 추적**: 토큰 사용량 및 API 비용 실시간 모니터링
- **보안 키 관리**: 암호화된 API 키 저장 및 관리
- **채팅 히스토리**: 대화 기록 저장, 검색, 세션 관리
- **세션 분석**: 사용 패턴 및 성과 추적

### 브라우저 자동화 핵심 기능
- **webContents API**: 브라우저 탭 제어 및 웹 콘텐츠 조작  
- **executeJavaScript()**: DOM 조작 및 콘텐츠 주입
- **WebContentsView**: 현대적 브라우저 세션 관리 (BrowserView 대체)
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


### 장기 비전
📋 **전체 로드맵**: `docs/EG-Desk-Taehwa-PRD.md` 참조
- 다중 워크스페이스 지원 (블로그, 소셜미디어, 고급 자동화)
- 한국어 SEO 최적화 엔진
- 전기센서 업계 특화 템플릿 시스템
- 성과 추적 및 분석 대시보드

## 현재 프로젝트 구조 (electron-vite + ES modules + Multi-Provider AI)

```
taehwa_project/
├── src/                                    # 소스 코드 루트
│   ├── main/                               # 메인 프로세스 (Node.js 컨텍스트)
│   │   ├── index.js                        # Electron 앱 진입점 (BrowserWindow 설정)
│   │   ├── preload.js                      # IPC 브릿지 (보안 컨텍스트)
│   │   └── modules/                        # 메인 프로세스 서비스
│   │       ├── ChatHistoryStore.js        # 채팅 히스토리 저장소 (SQLite/File)
│   │       ├── LangChainService.js         # 다중 AI 프로바이더 통합 서비스
│   │       ├── SecureKeyManager.js        # API 키 보안 관리 (암호화)
│   │       └── WebContentsManager.js      # 브라우저 제어 (메인 프로세스)
│   └── renderer/                           # 렌더러 프로세스 (브라우저 컨텍스트)
│       ├── index.html                      # 메인 UI 템플릿
│       ├── index.js                        # 애플리케이션 진입점
│       ├── components/                     # 재사용 가능한 UI 컴포넌트
│       │   ├── BrowserTabComponent.js      # 브라우저 탭 인터페이스
│       │   ├── ChatComponent.js            # AI 채팅 인터페이스
│       │   ├── ChatHistoryPanel.js         # 채팅 히스토리 패널
│       │   └── ChatMessageHistory.js      # 메시지 히스토리 컴포넌트
│       ├── modules/                        # 핵심 애플리케이션 모듈
│       │   ├── EGDeskCore.js               # 모듈 오케스트레이터
│       │   ├── WorkspaceManager.js         # 워크스페이스 조정
│       │   ├── core/                       # 핵심 시스템
│       │   │   ├── ai-agent/               # 다중 AI 통합 시스템
│       │   │   │   ├── ChatHistoryManager.js       # 채팅 히스토리 관리
│       │   │   │   ├── ChatSystemIntegration.js    # 통합 채팅 시스템
│       │   │   │   ├── ClaudeIntegration.js         # Claude 특화 통합
│       │   │   │   ├── ConversationManager.js      # 대화 관리
│       │   │   │   ├── SessionAnalytics.js         # 세션 분석 및 추적
│       │   │   │   └── TaskExecutor.js             # 작업 실행
│       │   │   ├── content-system/         # 콘텐츠 생성
│       │   │   │   ├── ContentGenerator.js
│       │   │   │   ├── TemplateManager.js
│       │   │   │   ├── SEOOptimizer.js
│       │   │   │   └── QualityChecker.js
│       │   │   └── state-management/       # 글로벌 상태
│       │   │       ├── ChatHistoryIntegrationExample.js
│       │   │       ├── ChatHistoryManager.js
│       │   │       ├── GlobalStateManager.js
│       │   │       ├── EventBus.js
│       │   │       └── README.md          # 상태 관리 문서
│       │   └── blog-automation/            # 블로그 자동화
│       │       ├── content-pipeline/       # 콘텐츠 파이프라인
│       │       └── wordpress/
│       │           └── WPApiClient.js      # WordPress REST API
│       ├── styles/                         # 스타일시트
│       │   └── app.css                     # 메인 CSS (Google Material Design 영감)
│       ├── ui/                             # UI 관리
│       │   ├── UIManager.js                # 테마, 레이아웃, 애니메이션
│       │   ├── common/                     # 공통 UI 컴포넌트
│       │   └── workspace/                  # 워크스페이스별 UI
│       └── utils/
│           └── EventEmitter.js             # 이벤트 시스템 기반
├── docs/                                   # 프로젝트 문서
│   ├── CLAUDE.md                           # 이 파일 (프로젝트 가이드)
│   ├── EG-Desk-Taehwa-PRD.md              # 메인 PRD
│   └── [기타 문서들]
├── .env.example                            # 환경 변수 템플릿
├── electron.vite.config.js                # 빌드 설정
├── package.json                            # electron-vite + 의존성
├── memory.md                               # 프로젝트 메모리/진행상황
├── taehwa8161/                             # 태화트랜스 기존 WordPress 사이트
│   └── www/                                # PHP 웹사이트 파일들
└── out/                                    # 빌드 출력 (자동 생성)
```



## ⚡ 개발 원칙 및 아키텍처 가이드라인

### 🔒 필수 준수 사항
1. **ES6 모듈 엄격 사용**: 메인/렌더러는 .js 확장자 ESM, `preload.js`는 CommonJS 예외
2. **보안 우선**: contextIsolation: true, nodeIntegration: false 유지
3. **모듈 경계 존중**: 각 모듈은 명확한 책임 범위와 인터페이스 유지
4. **IPC 통신 패턴**: 메인-렌더러 간 데이터 교환은 preload.js를 통해서만
5. **상태 관리 집중화**: GlobalStateManager.js를 통한 중앙 집중식 상태 관리

### 🏗️ 아키텍처 패턴
- **Event-Driven**: EventEmitter 패턴으로 모듈 간 느슨한 결합
- **Component Lifecycle**: 컴포넌트 초기화, 정리, 메모리 관리 철저
- **Modular Design**: 재사용 가능한 컴포넌트와 서비스 분리
- **Separation of Concerns**: UI(renderer) vs 비즈니스 로직(main) 명확 분리
- **Multi-Provider Architecture**: 플러그인 형태의 AI 프로바이더 지원
- **External CSS**: Vite 호환성을 위한 외부 스타일시트 사용
- **2-Column Layout**: 브라우저(70%) + 채팅(30%) 고정 레이아웃

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

### 1. 다중 AI 프로바이더 통합 시스템

```javascript
// Multi-Provider AI Integration
class LangChainService {
  constructor(secureKeyManager) {
    this.providers = new Map(); // Claude, OpenAI, Gemini
    this.currentProvider = 'claude';
    this.costTracker = { session: {}, total: {} };
  }
  
  async switchProvider(provider, model) {
    // 실시간 AI 모델 변경
  }
  
  async sendMessage(message, options = {}) {
    // 통합된 메시지 전송 인터페이스
  }
}

class ChatHistoryManager {
  constructor() {
    this.store = null; // ChatHistoryStore 연동
    this.currentSession = null;
  }
  
  async saveMessage(message, role, metadata) {
    // 메시지 저장 및 세션 관리
  }
  
  async searchHistory(query) {
    // 채팅 히스토리 검색
  }
}

class SessionAnalytics {
  // 사용 패턴 분석 및 성과 추적
  constructor() {
    this.metrics = {
      tokensUsed: 0,
      cost: 0,
      responseTime: [],
      sessionDuration: 0
    };
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
// Renderer: WPApiClient (fetch + Basic Auth)
class WPApiClient {
  constructor(siteUrl, credentials) {
    this.siteUrl = siteUrl.replace(/\/$/, '');
    this.credentials = credentials; // { username, password } (Application Password 권장)
  }

  async createPost(postData) {
    return await window.electronAPI.wordpress.request({
      method: 'POST',
      endpoint: '/posts',
      data: postData,
      credentials: this.credentials
    });
  }

  async uploadMedia(file) {
    const formData = new FormData();
    formData.append('file', file);
    return await window.electronAPI.wordpress.request({
      method: 'POST',
      endpoint: '/media',
      data: formData,
      credentials: this.credentials,
      isFormData: true
    });
  }
}

// Main: IPC 프록시 (preload -> main)
// - 구현 위치: `src/main/index.js` (ipcMain.handle('wordpress-api-request', ...))
// - 렌더러는 `window.electronAPI.wordpress.request(params)`로 호출
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

### 주차 1-2: Electron UI 기반 구축 ✅ (완료)
- [x] 기본 Electron 앱 구조 (`main.js`, `package.json`)
- [x] 다중 AI 프로바이더 통합 (Claude, OpenAI, Gemini)
- [x] 채팅 히스토리 시스템 및 세션 관리
- [x] 2-컬럼 레이아웃 (브라우저 70% + 채팅 30%)
- [x] 현대적 UI/UX (Google Material Design 영감)
- [x] 외부 CSS 파일 구조 (Vite 호환성)
- [x] 보안 API 키 관리 시스템
- [x] 비용 추적 및 사용량 모니터링

### 주차 3-4: 콘텐츠 자동화 및 워크플로우 (진행 중)
- [x] 다중 AI 프로바이더 통합 완료
- [x] 채팅 시스템 및 히스토리 관리 완료
- [ ] 전기센서 업계 특화 콘텐츠 생성 엔진
- [ ] 한국어 SEO 최적화 시스템
- [ ] WordPress 자동화 워크플로우 완성

### 주차 5-6: WordPress 통합 및 자동화 (최종 단계)
- [ ] WordPress REST API 클라이언트 구현
- [ ] Application Passwords 인증 시스템
- [ ] 자동 게시 워크플로우
- [ ] 성과 추적 및 모니터링


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
yarn build            # Electron 앱 빌드 (electron-vite)
# 패키징은 electron-builder 설정으로 진행 (별도 스크립트 없음)
```

## AI 시스템 통합 계획

### LangChain 기반 AI 통합 (현재 구현)
- 메인 프로세스 `LangChainService`가 OpenAI/Claude/Gemini를 통합하고, 툴 콜 기반 블로그 자동화를 수행합니다.
- OpenAI 모델에서 `create_blog_post` 툴을 직접 바인딩하여 LLM 스스로 도구 사용을 결정합니다.
- 렌더러의 `ChatComponent`는 `electronAPI.langchain*` IPC를 호출해 대화를 수행합니다.

```javascript
// src/main/modules/LangChainService.js 주요 포인트
// - providerConfigs: { openai: gpt-4o, claude: claude-3-5-sonnet-20241022, gemini: gemini-2.5-flash }
// - initializeProviders(): SecureKeyManager에서 키를 읽어 활성화
// - initializeBlogTool(): create_blog_post 툴 정의 및 agent executor/툴 바인딩
// - sendMessage(): OpenAI 사용 시 툴 사용 여부를 모델이 스스로 결정하도록 처리
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
  username: 'your-wp-user',
  password: 'your-wp-application-password'
};

// 본 프로젝트의 기본 클라이언트
// - 렌더러: `src/renderer/modules/blog-automation/wordpress/WPApiClient.js` (fetch + Basic Auth)
// - 서비스: `src/renderer/modules/blog-automation/wordpress/WPPublishingService.js` (electronAPI 프록시 사용)
// - 메인 프록시: `src/main/preload.js` 내 `electronAPI.wordpress.request()`를 통해 안전하게 호출
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


## 완성된 다중 AI 통합 아키텍처 (2025년 업데이트)

### 핵심 모듈 개요

#### 1. 다중 AI 통합 + Electron-Vite 기반 구조
```
src/
├── main/                              # 메인 프로세스
│   ├── index.js                      # Electron 메인 엔트리
│   ├── preload.js                    # 프리로드 스크립트
│   └── modules/                      # 메인 프로세스 서비스
│       ├── ChatHistoryStore.js       # 채팅 히스토리 저장소
│       ├── LangChainService.js       # 다중 AI 프로바이더 통합
│       ├── SecureKeyManager.js       # API 키 보안 관리
│       └── WebContentsManager.js     # 브라우저 제어
├── renderer/                          # 렌더러 프로세스
│   ├── components/                   # UI 컴포넌트
│   │   ├── BrowserTabComponent.js    # 브라우저 탭 UI
│   │   ├── ChatComponent.js          # AI 채팅 인터페이스
│   │   ├── ChatHistoryPanel.js       # 채팅 히스토리 패널
│   │   └── ChatMessageHistory.js    # 메시지 히스토리 컴포넌트
│   ├── styles/                       # 스타일시트
│   │   └── app.css                   # Google Material Design 영감 CSS
│   └── modules/                      # 핵심 모듈
│       ├── core/                     # 핵심 시스템
│       │   ├── ai-agent/            # 다중 AI 통합 시스템
│       │   │   ├── ChatHistoryManager.js        # 채팅 히스토리 관리
│       │   │   ├── ChatSystemIntegration.js     # 통합 채팅 시스템
│       │   │   ├── ClaudeIntegration.js          # Claude 특화 통합
│       │   │   ├── ConversationManager.js       # 대화 관리
│       │   │   ├── SessionAnalytics.js          # 세션 분석
│       │   │   └── TaskExecutor.js              # 작업 실행
│       │   ├── content-system/      # 콘텐츠 시스템
│       │   │   ├── ContentGenerator.js
│       │   │   ├── TemplateManager.js
│       │   │   ├── SEOOptimizer.js
│       │   │   └── QualityChecker.js
│       │   └── state-management/    # 상태 관리
│       │       ├── ChatHistoryManager.js
│       │       ├── GlobalStateManager.js
│       │       └── EventBus.js
│       ├── blog-automation/         # 블로그 자동화
│       │   ├── content-pipeline/    # 콘텐츠 파이프라인
│       │   └── wordpress/
│       │       └── WPApiClient.js
│       └── WorkspaceManager.js      # 워크스페이스 관리
└── common/                            # 공통 유틸리티
```

#### 2. 다중 AI 프로바이더 통합 시스템

**핵심 기능**:
- **LangChain 기반 통합**: Claude, OpenAI, Gemini 통합 인터페이스
- **실시간 모델 전환**: 사용자가 실시간으로 AI 모델 변경 가능
- **비용 추적**: 토큰 사용량 및 API 비용 실시간 모니터링
- **채팅 히스토리**: 완전한 대화 기록 저장, 검색, 세션 관리
- **보안 키 관리**: 암호화된 API 키 저장 및 관리
- **세션 분석**: 사용 패턴 추적 및 성과 측정
- **2-컬럼 레이아웃**: 브라우저(70%) + 채팅(30%) 고정 레이아웃
- **외부 CSS**: Vite 호환성을 위한 외부 스타일시트 구조

```javascript
// LangChainService 통합 예시
class LangChainService {
  constructor(secureKeyManager) {
    this.secureKeyManager = secureKeyManager;
    this.providers = new Map(); // Claude, OpenAI, Gemini
    this.currentProvider = 'claude';
    this.costTracker = {
      session: { input: 0, output: 0, total: 0 },
      total: { input: 0, output: 0, total: 0 }
    };
  }
  
  async initializeProviders() {
    // 모든 AI 프로바이더 초기화
    await this.initializeClaude();
    await this.initializeOpenAI();
    await this.initializeGemini();
  }
  
  async switchProvider(provider, model) {
    // 실시간 AI 모델 변경
    this.currentProvider = provider;
    this.currentModel = this.providers.get(provider);
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


## 개발 시 주의사항

### Electron 보안 모범 사례
- `nodeIntegration: false` 유지 (메인/탭 모두)
- `contextIsolation: true` 설정
- preload 스크립트를 통한 안전한 IPC 통신 (현재 `src/main/preload.js`는 CommonJS로 구현되어 있으므로 ESM 전환시 주의)
- `WebContentsView`는 개발 과정에서 `webSecurity:false`가 설정되어 있음. 배포 시 반드시 `true`로 전환 권장
- webContents.executeJavaScript() 사용 시 입력 검증 및 신뢰 도메인만 허용

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

## 부록: Doc/Code Alignment 체크리스트 (2025-08)

- 의존성 및 버전
  - Electron: code=`^37.2.4` 사용 중, 문서/락파일 일치
  - electron-vite: ^4.0.0, vite: ^7.0.6 일치
  - LangChain 패키지군/`openai`/`node-fetch` 등 문서에 반영 완료
- 실행/빌드 스크립트
  - 개발: `yarn dev`, 빌드: `yarn build`, 미리보기: `yarn preview`, 실행: `npm start` 문서 반영
  - 패키징: electron-builder 설정 존재, 별도 스크립트 미정 (문서 갱신)
- 보안/프리로드
  - `nodeIntegration:false`, `contextIsolation:true` 확인
  - `preload.js`는 CommonJS 구현 (ESM 전환 주의) 문서 명시
  - 개발 중 `WebContentsView`의 `webSecurity:false` 설정 존재 → 배포 시 true 권장 명시
- 환경변수/키 관리
  - 표준: `ANTHROPIC_API_KEY` (호환: `CLAUDE_API_KEY`), 그 외 `OPENAI_API_KEY`, `GEMINI_API_KEY`
  - 안전 저장: `SecureKeyManager` + safeStorage 문서 반영
- AI 통합
  - LangChain 기반 멀티 프로바이더 구현 (OpenAI/Claude/Gemini) 명시
  - OpenAI 모델에 `create_blog_post` 툴 바인딩 및 에이전트 실행 플로우 설명 추가
- WordPress 연동
  - 기본 인증: Application Passwords + Basic Auth, 렌더러 `WPApiClient`/`WPPublishingService` 및 `electronAPI.wordpress.request` 경로 문서화
- UI/레이아웃
  - 2-컬럼(브라우저+채팅) 구현 확인, 스타일은 `src/renderer/styles/app.css`/`index.html`에 존재 명시

## 운영 모드와 보안 기본값

### 모드 개념
- **브라우저 모드**: 사용자가 일반 웹사이트를 탐색. 트리거=사용자(UI), 실행=WebContentsView
- **자동화 모드**: 에이전트가 특정 신뢰 도메인(예: WordPress)에서 DOM 자동화. 트리거=에이전트/메인, 실행=WebContentsView

### 브라우저처럼 사용할 때 권장 설정
- `webSecurity: true` (SOP 유지, 혼합 콘텐츠 차단)
- `contextIsolation: true` (페이지 JS와 브리지 격리)
- `nodeIntegration: false` (렌더러에서 Node API 차단)
- `sandbox: true` 권장(호환성 확인 후), 불가 시 다른 보안 옵션 엄격 유지
- `allowRunningInsecureContent: false` (HTTPS 페이지 내 HTTP 리소스 차단)
- IPC: 범용 `invoke` 노출 지양, 채널 화이트리스트 + 파라미터 스키마 검증
- executeJavaScript: 브라우저 모드에서는 비활성/차단 권장. 자동화 모드에서만 신뢰 도메인 + 사전 정의 스니펫 허용
- 네트워크: HTTPS 강제, 인증서 예외 허용 금지(개발 전용 코드 제거)

## 확정된 컨벤션(요약)
- 패키지 매니저: Yarn 고정, 단일 락파일(`yarn.lock`)
- Electron 기준: 37.x (현재 37.2.4)
- 환경변수 표준: `ANTHROPIC_API_KEY` (호환: `CLAUDE_API_KEY`)
- `preload.js`: CommonJS 유지 (보안 브리지)
