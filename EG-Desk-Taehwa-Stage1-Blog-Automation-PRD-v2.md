# EG-Desk:태화 1단계 - 자동 블로그 워크플로우 PRD

## 개요

EG-Desk:태화의 1단계는 태화트랜스의 WordPress 웹사이트를 위한 AI 기반 자동 블로깅 시스템 구현에 집중합니다. Electron 기반 애플리케이션으로 개발되며, 블로그 자동화 워크플로우를 테스트베드로 하여 범용 EG-Desk 플랫폼의 핵심 기능들을 모듈화하여 구축합니다.

## 프로젝트 범위 - 1단계

### 핵심 목표
- Electron 기반 UI 우선 개발
- WordPress REST API를 통한 콘텐츠 게시 자동화
- 범용 AI 에이전트 및 채팅 시스템 모듈화
- 전기 센서 산업 특화 블로그 콘텐츠 자동 생성

### 기술 방향성
- **완전 로컬 실행**: Obsidian처럼 백엔드 서버 없이 Electron 앱 단독 실행
- **UI 우선주의**: Electron 네이티브 UI 개발에 최우선순위
- **직접 API 통합**: Electron에서 WordPress /wp-json으로 직접 호출
- **모듈화 설계**: 향후 확장을 위한 범용 컴포넌트 개발
- **한국어 중심**: 전체 인터페이스 및 콘텐츠 한국어 지원
- **Electron 브라우저 기능**: webContents API를 활용한 브라우저 탭 제어 및 웹 콘텐츠 조작

## 모듈화된 아키텍처 설계

### 범용 EG-Desk 컴포넌트

```
EG-Desk-Core-Modules/
├── AI-Agent-System/
│   ├── ClaudeCodeIntegration.js    # Claude Code CLI 통합
│   ├── ConversationManager.js      # 대화 컨텍스트 관리
│   ├── TaskExecutor.js            # 작업 실행 엔진
│   └── ResponseProcessor.js       # AI 응답 처리
├── Chat-Interface/
│   ├── ChatUI.js                  # 채팅 인터페이스 컴포넌트
│   ├── MessageHandler.js          # 메시지 처리 로직
│   ├── HistoryManager.js          # 대화 기록 관리
│   └── InputProcessor.js          # 사용자 입력 처리
├── State-Management/
│   ├── GlobalStateManager.js      # 전역 상태 관리
│   ├── WorkflowTracker.js         # 워크플로우 추적
│   ├── TaskQueue.js               # 작업 큐 관리
│   └── EventBus.js               # 이벤트 통신
├── Browser-Control/
│   ├── WebContentsManager.js      # Electron webContents API 래퍼
│   ├── TabController.js           # 브라우저 탭 관리
│   ├── ContentExtractor.js        # 웹 콘텐츠 추출
│   └── NavigationHandler.js       # 페이지 네비게이션 제어
└── Content-System/
    ├── ContentGenerator.js        # 콘텐츠 생성 엔진
    ├── TemplateManager.js         # 템플릿 관리
    ├── SEOOptimizer.js           # SEO 최적화
    └── QualityChecker.js         # 품질 검증
```

### 블로그 자동화 특화 컴포넌트

```
Blog-Automation-Modules/
├── WordPress-Integration/
│   ├── WPApiClient.js             # WordPress REST API 클라이언트
│   ├── AuthManager.js             # 인증 관리
│   ├── PostPublisher.js           # 게시물 발행
│   ├── MediaUploader.js           # 미디어 업로드
│   └── PreviewController.js       # 실시간 WordPress 미리보기
├── Content-Pipeline/
│   ├── IndustryContentGen.js      # 전기센서 업계 콘텐츠 생성
│   ├── SEOKoreanOptimizer.js     # 한국어 SEO 최적화
│   ├── SchedulingManager.js       # 게시 스케줄링
│   └── PerformanceTracker.js     # 성과 추적
├── Browser-Automation/
│   ├── WordPressNavigator.js      # WordPress 사이트 자동 네비게이션
│   ├── ContentInjector.js         # 콘텐츠 자동 삽입
│   ├── FormAutomator.js           # 양식 자동 작성
│   └── ScreenshotCapture.js       # 결과 스크린샷 캡처
```

## Electron UI 개발 우선순위

### 1. 메인 애플리케이션 창 (최우선)

**메인 워크스페이스 (EG-Desk)**
```
┌─────────────────────────────────────────────────────────┐
│  EG-Desk - 메인 워크스페이스                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│         무한 캔버스 영역 (브라우저 탭들 배치)                  │
│                                                         │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│   │블로그 관리 │  │코드 편집기│  │터미널 제어│              │
│   │워크플로우  │  │   탭    │  │   탭    │              │
│   └──────────┘  └──────────┘  └──────────┘              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**블로그 관리 워크플로우 화면 (현재 구현된 디자인)**
```
┌─────────────────────────────────────────────────────────┐
│ 🏠 시작화면  🤖 블로그자동화  ⚡ 워크스페이스3  (macOS 타이틀바)  │ 
├─────────────────────────────────────────────────────────┤
│ ← → ↻  [URL 주소창]                              [이동]   │
├─────────────────────────────────┬───────────────────────┤
│                                     │                   │
│         브라우저 영역                  │   AI Terminal     │
│       (WordPress 미리보기)           │   (30% 너비)      │
│              (70% 너비)              │                   │
│                                     │   🤖 AI Agent     │
│  ┌─────────────────────────────────┐ │                   │
│  │    웹사이트 컨텐츠가 이 영역에       │ │   • claude 명령    │
│  │         표시됩니다               │ │   • 블로그 생성     │
│  │                                 │ │   • SEO 분석      │
│  │    EG-Desk가 브라우저 컨텍스트를   │ │   • 콘텐츠 최적화   │
│  │        지능적으로 제어합니다        │ │                   │
│  └─────────────────────────────────┘ │ AI-Agent $ ___    │
│                                     │                   │
└─────────────────────────────────────┴───────────────────┘
```

**핵심 UI 컴포넌트 (현재 구현 상태)**
- ✅ **macOS 네이티브 타이틀바 통합**: `titleBarStyle: 'hiddenInset'`으로 시스템 타이틀바에 워크스페이스 탭 직접 배치
- ✅ **Light Grey 미니멀 테마**: 무채색 계열 색상 체계, 깔끔한 버튼 및 인터페이스 디자인
- ✅ **조건부 탭 표시**: 시작 화면에서는 탭 숨김, 워크스페이스 버튼 클릭 시에만 탭 표시
- ✅ **브라우저 영역**: Electron BrowserView API 활용, 70% 너비로 WordPress 미리보기 준비 완료
- ✅ **AI 터미널 인터페이스**: 오른쪽 30% 너비, claude 명령 입력 가능한 터미널 UI
- ✅ **브라우저 컨트롤**: 뒤로/앞으로/새로고침 버튼, URL 주소창, 이동 버튼
- ✅ **리사이저**: 브라우저 영역과 터미널 영역 크기 조절 가능
- 🔄 **워크플로우 전환 로직**: renderer.js 구현 완료, 이벤트 핸들링 디버깅 진행 중

### 2. WordPress API 통합 시스템

**API 클라이언트 설계**
```javascript
class WordPressApiClient {
  constructor(siteUrl, credentials) {
    this.baseUrl = `${siteUrl}/wp-json/wp/v2`;
    this.auth = credentials;
    this.webContents = null; // Electron webContents 인스턴스
  }
  
  // WordPress REST API 호출
  async createPost(postData) {
    // /wp-json/wp/v2/posts 엔드포인트 활용
  }
  
  async uploadMedia(file) {
    // /wp-json/wp/v2/media 엔드포인트 활용
  }
  
  // Electron webContents를 통한 실시간 미리보기
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
```

**인증 시스템**
- Application Passwords 방식 활용
- JWT 토큰 기반 인증 지원
- 안전한 자격증명 저장 (Electron store)

### 3. AI 에이전트 통합 (Claude Code)

**대화 기반 워크플로우**
- "태화트랜스 로고스키 코일에 대한 블로그 글 써줘"
- "SEO 키워드 '전류센서' 포함해서 기술 설명글 작성"
- "지금 작성된 글 WordPress에 게시해줘"

**AI 에이전트 기능**
- 전기센서 업계 전문 지식 기반 콘텐츠 생성
- 한국어 자연어 처리 및 응답
- SEO 최적화된 콘텐츠 구조화
- WordPress 메타데이터 자동 설정

## 구현 우선순위 - 1단계 (6주)

### 주차 1-2: Electron UI 기반 구축 ✅ **완료**
- **EG-Desk 메인 워크스페이스 구축** ✅
  - ✅ 기본 Electron 앱 구조 완성 (`main.js`, `package.json`)
  - ✅ Light Grey 테마 적용 (무채색 미니멀 디자인)
  - ✅ macOS 네이티브 스타일 타이틀바 통합
  - ✅ 브라우저 탭 스타일 워크스페이스 전환 UI

- **블로그 관리 모드 UI** ✅ **부분 완료**
  - ✅ **네이티브 타이틀바 탭 시스템**: macOS 스타일 타이틀바에 워크스페이스 탭 직접 통합
  - ✅ **조건부 탭 표시**: 버튼 클릭 시에만 탭 표시되는 스마트 UI
  - ✅ **구분선 디자인**: 타이틀바 하단 경계선으로 영역 구분
  - ✅ Electron BrowserView API 활용한 브라우저 영역 (70% 너비)
  - ✅ 채팅 인터페이스 구조 (오른쪽 30% 너비)
  - ✅ 워크스페이스 간 전환 로직 (`renderer.js`)
  - 🔄 **진행 중**: 브라우저 탭 이벤트 핸들링 디버깅

### 주차 3-4: AI 에이전트 및 콘텐츠 시스템 📋 **다음 단계**
- **Claude Code 통합**
  - [ ] ClaudeCodeIntegration 모듈 개발
  - [ ] 한국어 자연어 명령 처리 시스템
  - [ ] 대화 컨텍스트 관리 및 기록 시스템
  - [ ] 터미널 claude 명령 실제 동작 연결

- **콘텐츠 생성 엔진**
  - [ ] 전기센서 업계 특화 콘텐츠 템플릿 개발
  - [ ] 한국어 SEO 최적화 알고리즘
  - [ ] 콘텐츠 품질 검증 시스템

### 주차 5-6: WordPress 통합 및 자동화 📋 **다음 단계**
- **WordPress REST API 클라이언트**
  - [ ] /wp-json/wp/v2/posts API 통합 테스트
  - [ ] 인증 시스템 구현 (Application Passwords)
  - [ ] 미디어 업로드 및 메타데이터 관리
  - [ ] BrowserView와 API 연동

- **자동화 워크플로우**
  - [ ] 스케줄링 시스템 구현
  - [ ] 게시 상태 모니터링 및 오류 처리
  - [ ] 성과 추적 및 분석 기능

## 기술 스택

### Electron 애플리케이션 (현재 구현)
- **프레임워크**: Electron 28.0.0 ✅
- **UI 스타일**: Vanilla CSS + Light Grey Theme ✅
- **타이틀바**: macOS 네이티브 `titleBarStyle: 'hiddenInset'` ✅
- **브라우저 제어**: BrowserView API + webContents ✅
- **이벤트 처리**: IPC (Inter-Process Communication) ✅

### 로컬 통합 시스템 (백엔드 서버 불필요, 현재 구현)
- **AI 엔진**: Claude Code CLI 연동 준비 완료 ✅
- **브라우저 제어**: Electron BrowserView + webContents API ✅
- **API 클라이언트**: Axios 라이브러리 설치됨, WordPress REST API 준비 ✅
- **데이터 저장**: electron-store 패키지 설치 및 설정 완료 ✅
- **파일 관리**: Node.js 네이티브 모듈 활용 준비 ✅
- **웹 콘텐츠 조작**: executeJavaScript 메서드 main.js에 구현 ✅

### 한국어 지원
- **폰트**: Noto Sans KR, Nanum Gothic
- **입력기**: 한글 IME 최적화
- **콘텐츠**: 한국어 NLP 라이브러리 통합
- **SEO**: 한국어 키워드 분석 및 최적화

## 성공 지표

### UI/UX 성과
- **사용자 인터페이스**: 직관적인 한국어 UI 완성도 90% 이상
- **응답성**: AI 에이전트 응답 시간 3초 이내
- **안정성**: UI 크래시 없는 연속 8시간 운영

### 자동화 성과
- **콘텐츠 생성**: 1일 1개 고품질 블로그 글 자동 생성
- **게시 성공률**: WordPress API 게시 성공률 95% 이상
- **SEO 점수**: 생성 콘텐츠 평균 SEO 점수 80점 이상

## 향후 확장성 (로컬 우선)

### 범용 EG-Desk 플랫폼 준비
- 개발된 로컬 모듈들은 향후 다른 워크플로우에 재사용 가능
- AI 에이전트 시스템은 블로그 외 다른 로컬 작업에도 적용
- 채팅 인터페이스는 완전 로컬 AI 어시스턴트로 확장

### 추가 기능 통합 준비 (로컬 중심)
- 코드 편집기 모듈 통합 (로컬 파일 편집)
- **고급 브라우저 제어 시스템**: 
  - webContents.setWindowOpenHandler() 활용한 새 창 제어
  - DevTools Protocol을 통한 네트워크 모니터링
  - webContentsView를 활용한 다중 브라우저 세션 관리
  - 자동화된 폼 작성 및 네비게이션
- 터미널 제어 및 Docker 통합 (로컬 시스템 명령)
- 백엔드 서버는 필요시에만 선택적 확장 (현재는 불필요)

## 결론

1단계는 Electron 기반 UI를 우선으로 하여 범용 EG-Desk 플랫폼의 핵심 모듈들을 구축하고, 블로그 자동화 워크플로우를 통해 실제 동작을 검증합니다. WordPress REST API를 활용한 간단하고 안정적인 통합으로 빠른 프로토타이핑을 실현하며, 향후 확장을 위한 견고한 기반을 마련합니다.