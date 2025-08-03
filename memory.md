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
- ✅ **9개 에이전트 시스템 완성** - 6개 구현 에이전트 + 3개 인프라 에이전트 (Claude Code 가이드라인 적용)
- 🔄 **개발 서버 테스트** - `yarn dev` 명령어로 확인 필요
- 🔄 AI 에이전트 (Claude Code) 통합 대기
- 🔄 WordPress API 연동 대기

## 개발 명령어
- `yarn dev` - 개발 서버 시작 (HMR 지원)
- `yarn build` - 프로덕션 빌드
- `yarn preview` - 빌드된 앱 미리보기

## 🤖 에이전트 시스템 (2025.01 완전 개편)
**Orchestrator 에이전트 → 전략적 기획자로 전환:**
- **🚫 코딩 금지**: Orchestrator는 절대 코드를 작성하지 않음, 100% 기획/분석/위임 전용
- **🧠 완전한 코드베이스 지식**: electron-vite + ES modules 아키텍처 완벽 이해
- **📋 아키텍처 기반 기획**: 모든 요청을 현재 모듈 구조 관점에서 분석하여 정밀한 작업 계획 수립
- **⚡ 즉시 에이전트 배정**: 모듈별 전문 에이전트에게 구체적 구현 지시사항과 함께 작업 위임
- **🔄 통합 감독**: 에이전트들의 작업 결과가 아키텍처에 맞게 통합되도록 조정

**전문 에이전트 구조 (9개 에이전트)**:

**🎯 Core Implementation Agents (6개)**:
- browser-module-maintainer.md (src/main 브라우저 제어 + IPC)
- workspace-manager.md (UI 컴포넌트 + 워크스페이스 전환)
- chat-manager.md (core/ai-agent 모듈들)
- state-manager.md (core/state-management 모듈들)
- tab-manager.md (브라우저 탭 생명주기)
- wordpress-api-manager.md (core/content-system + WordPress 연동) *향후 content-system-manager.md로 리네임 예정

**🔧 Support & Infrastructure Agents (3개)**:
- **orchestrator.md** (전략 기획 + 에이전트 조정, 코딩 금지, 전체 도구 액세스)
- **prompt-engineer.md** (에이전트 프롬프트 업데이트 + 유지보수, 전체 도구 액세스)
- **researcher.md** (웹 연구 + dependency 관리 + documentation fetch, 전체 도구 액세스)

**핵심 변화 (2025.01 대대적 개편)**:
- **Orchestrator 역할 명확화**: 직접 구현 → 전략 기획 전용 (코딩 완전 금지)
- **전문화된 인프라 에이전트 분리**: 
  - prompt-engineer (에이전트 프롬프트 관리)
  - researcher (외부 연구 + web_search MCP 도구 활용)
- **9개 에이전트 체계**: 6개 구현 + 3개 인프라로 완전 분업화
- **Claude Code 가이드라인 적용**: "MUST BE USED", "PROACTIVELY" 키워드로 강화된 description
- **도구 최적화**: 모든 에이전트가 전체 도구 액세스 (tools 필드 생략으로 통일)
- **문서 구조 완전 분리**: 
  - CLAUDE.md → 순수 프로젝트 정보 (기술스택, 비즈니스 목표, 아키텍처, EG-Desk 내장 AI 에이전트)
  - orchestrator.md → 개발용 sub-agent 시스템 전용 (9-agent 생태계, 협업 패턴, best practices)

## 다음 단계 (2025.01 업데이트)
1. **프로젝트 인텔리전스 강화** - researcher agent로 dependency 관리, documentation fetch, 기술 동향 분석
2. **에이전트 시스템 최적화** - 9개 에이전트 간 협업 워크플로우 완성
3. **프롬프트 엔지니어링 고도화** - prompt-engineer로 에이전트 품질 지속 개선
4. **개발 서버 테스트** - electron-vite dev 실행 확인 및 컴포넌트 동작 검증
5. AI 에이전트 (Claude Code) 통합 및 WordPress REST API 연동
6. 콘텐츠 생성 파이프라인 구축 및 한국어 SEO 최적화 