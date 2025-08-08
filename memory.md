# EG-Desk:태화 메모리

## ✅ 확정된 결정
- 패키지 매니저: Yarn 고정
- 락파일: `yarn.lock`만 유지 (단일 락파일)
- Electron 기준: 37.x (현재 37.2.4)
- 환경변수 표준: `ANTHROPIC_API_KEY` (=`CLAUDE_API_KEY`는 호환 alias)
- preload 스크립트: CommonJS 유지
- 문서 역할: `CLAUDE.md`는 아키텍처/형상만, 진행/설명은 포함하지 않음
- 루트 테스트/디버그 파일: `create_published_post.js`, `debug_browser.js`, `debug.html` 삭제 및 향후 포함 금지 