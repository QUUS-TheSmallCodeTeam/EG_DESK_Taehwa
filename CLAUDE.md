# EG-Desk:태화 프로젝트 개발 가이드

## 프로젝트 개요

**EG-Desk:태화**는 태화트랜스(전기센서 제조업체)를 위한 AI 기반 자동 블로그 워크플로우 시스템입니다. Electron 프레임워크 기반으로 구축된 데스크톱 애플리케이션으로, 완전히 로컬에서 실행되며 외부 서버 의존성이 없습니다.

### 현재 구현 목표: PRD Stage 1 - 블로그 자동화 시스템

**목표**: WordPress REST API를 통한 콘텐츠 게시 자동화 및 범용 EG-Desk 플랫폼의 핵심 모듈 구축

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

## 다음 개발 스텝

### 즉시 구현 필요 (우선순위 HIGH)
1. **WebContentsManager 클래스 구현**
   - 다중 브라우저 탭 관리
   - executeJavaScript() 래퍼 함수
   - 탭 간 전환 및 상태 관리

2. **블로그 관리 워크스페이스 UI 완성**
   - 70% 브라우저 영역: webView 컴포넌트
   - 30% 채팅 영역: AI 명령 입력 인터페이스
   - 상단 탭 바: 다중 WordPress 페이지 관리

3. **WordPress API 클라이언트 기본 구현**
   - GET /wp-json/wp/v2/posts (기존 포스트 조회)
   - POST /wp-json/wp/v2/posts (새 포스트 생성)
   - 인증 시스템 (Application Passwords)

### 중기 개발 목표 (우선순위 MEDIUM)
1. **Claude Code CLI 통합**
2. **콘텐츠 생성 엔진**  
3. **한국어 SEO 최적화**

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

**개발 문의**: 이 문서는 Claude Code 개발 시 참조 자료로 활용해주세요. 구체적인 구현 질문이나 코드 리뷰가 필요한 경우 이 컨텍스트를 바탕으로 요청해주시면 됩니다.