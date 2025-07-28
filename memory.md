# EG-Desk:태화 프로젝트 메모리

## ⚡ electron-vite 마이그레이션 완료 (2025.01)
- **빌드 도구 변경**: electron-webpack → **electron-vite** (현대적, 빠른 HMR)
- **프로젝트 구조**: 
  - `src/main/` - 메인 프로세스 (index.js, preload.js)
  - `src/renderer/` - 렌더러 프로세스 (index.html, index.js, components/, modules/)
  - `electron.vite.config.js` - 통합 설정 파일
- **모듈 시스템**: ES6 imports/exports로 현대화
- **개발 경험**: 
  - 즉시 서버 시작 (ESM 기반)
  - 초고속 HMR (Hot Module Replacement)
  - 메인 프로세스 핫 리로딩 지원

## 현재 구조 (electron-vite + ES6 모듈)
- **메인 프로세스**: `src/main/index.js` + `src/main/preload.js`
- **렌더러 프로세스**: `src/renderer/index.html` + `src/renderer/index.js`
- **컴포넌트**: 
  - BrowserTabComponent.js (브라우저 탭 제어)
  - ChatComponent.js (AI 채팅 인터페이스)
  - WorkspaceManager.js (워크스페이스 관리)
  - WebContentsManager.js (웹콘텐츠 제어)
- **빌드 출력**: `out/` 디렉토리 (package.json main: "./out/main/index.js")

## UI 구조
- **메인 화면**: 단일 index.html + ES6 모듈 로딩
- **상단 바**: macOS 네이티브 타이틀바 통합 (titleBarStyle: 'hiddenInset')
- **워크스페이스 탭**: 시작화면 → 블로그자동화 → 고급워크스페이스
- **레이아웃**: 브라우저 영역(70%) + 채팅 터미널(30%)
- **테마**: Light Grey 미니멀 디자인

## 기능 상태
- ✅ **electron-vite 마이그레이션 완료** - 현대적 빌드 시스템
- ✅ **ES6 모듈화** - import/export 구조로 정리
- ✅ **보안 best practice** - contextIsolation, nodeIntegration 설정
- ✅ **컴포넌트 구조** - 재사용 가능한 모듈화된 컴포넌트
- ✅ **macOS 네이티브 UI** - 타이틀바 통합
- ✅ **WebContents API** - 브라우저 제어 기능
- 🔄 **개발 서버 테스트** - `yarn dev` 명령어로 확인 필요
- 🔄 AI 에이전트 (Claude Code) 통합 대기
- 🔄 WordPress API 연동 대기

## 개발 명령어
- `yarn dev` - 개발 서버 시작 (HMR 지원)
- `yarn build` - 프로덕션 빌드
- `yarn preview` - 빌드된 앱 미리보기

## 다음 단계
1. **개발 서버 테스트** - electron-vite dev 실행 확인
2. **컴포넌트 동작 확인** - HMR을 통한 빠른 개발 테스트
3. AI 에이전트 (Claude Code) 통합
4. WordPress REST API 연동 테스트
5. 콘텐츠 생성 파이프라인 구축 