# EG-Desk:태화 프로젝트 메모리

## 최근 구조 복원 - 시작 화면 + 채팅/터미널 워크스페이스
- **시작 화면 복원**: 앱 실행시 start.html 먼저 표시
- **워크스페이스 구조 복원**: 
  - 블로그 자동화 선택시 workspace.html로 전환
  - 브라우저 영역(70%) + 터미널/채팅 영역(30%) 구조
  - 터미널에서 'claude' 명령어 실행 가능 (AI 에이전트와 대화)
- **보안 설정 유지**: 
  - `contextIsolation: true`, `nodeIntegration: false`
  - 안전한 preload 스크립트를 통한 API 노출
- **터미널 로깅**: renderer → main 로그 전달로 터미널에서 디버깅 가능

## 현재 구조 (Best Practice + 기능 복원)
- **메인 애플리케이션**: index.html + renderer.js
- **상단 바**: EG-Desk 헤더 (macOS 버튼과 겹치지 않게 padding-left: 60px)
- **시작 화면**: start.html (EG-Desk 소개 + "블로그 자동화 시작" 버튼)
- **워크스페이스**: workspace.html + workspace.js
  - 브라우저 영역: iframe으로 WordPress 사이트 표시
  - 터미널 영역: 'claude' 명령어 실행 가능 (AI 에이전트 대화)
  - 리사이저: 영역 크기 조절 가능

## 기능 상태
- ✅ Electron 보안 best practice 적용
- ✅ 상단바와 시스템 버튼 겹침 해결
- ✅ 시작 화면 → 워크스페이스 전환 구조
- ✅ 브라우저 + 터미널 레이아웃 복원
- ✅ 터미널에서 'claude' 명령어 실행 가능
- ✅ 터미널 로깅으로 디버깅 지원
- 🔄 AI 에이전트 (Claude Code) 통합 대기
- 🔄 WordPress API 연동 대기

## 다음 단계
- AI 에이전트 (Claude Code) 통합
- WordPress REST API 연동 테스트
- 콘텐츠 생성 파이프라인 구축
- 한국어 SEO 최적화 기능 추가 