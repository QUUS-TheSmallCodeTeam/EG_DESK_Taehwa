# EG-Desk:태화 - Stage 1

AI 기반 자동 블로그 워크플로우 시스템의 첫 번째 단계입니다.

## 다운로드
```bash
# 터미널 앱 열고 
git clone https://github.com/QUUS-TheSmallCodeTeam/EG_DESK_Taehwa.git
```

## 실행 방법

```bash
# 개발 모드 실행
npm install && npm start
```
```bash
# 또는 디버깅 모드
npm install && npm run dev
```

## 테스트 가능 시나리오
1. 간단한 인사 - 예: '안녕?'
2. 블로그 글 작성 및 게시 - 예: 000 에 대해서 블로그 글 작성해줘.
   -> 작성 과정 채팅 화면에 표시됨 (완료까지 최대 5분)
   -> 작성 완료되면 왼쪽 블로그 화면 리프레시


## 현재 구현된 기능

### ✅ 완료된 기능
- **EG-Desk 메인 워크스페이스**: 무한 캔버스 스타일의 워크플로우 선택 화면
- **블로그 관리 워크플로우**: WordPress 미리보기 + AI 채팅 인터페이스
- **한국어 UI**: Noto Sans KR 폰트, 완전 한국어 인터페이스
- **로컬 데이터 저장**: Electron Store를 통한 설정 저장
- **기본 채팅 시뮬레이션**: AI 응답 시뮬레이션 (Claude Code 통합 전)

### 🚧 다음 구현 예정
- WordPress REST API 실제 연동
- Claude Code CLI 통합
- 브라우저 탭 실제 WordPress 사이트 로딩
- 콘텐츠 생성 및 게시 자동화

## 프로젝트 구조

```
taehwa_project/
├── main.js              # Electron 메인 프로세스
├── preload.js           # 보안 IPC 브리지
├── index.html           # UI 구조
├── renderer.js          # 프론트엔드 로직
├── package.json         # 프로젝트 설정
└── README.md           # 이 파일
```

## 사용법

1. 앱 실행 시 **EG-Desk 메인 워크스페이스**가 표시됩니다
2. **"블로그 관리"** 탭을 클릭하여 블로그 자동화 모드로 전환
3. 오른쪽 채팅 패널에서 AI와 대화
4. 메뉴바에서 `워크플로우` → `블로그 자동화` 또는 `Cmd/Ctrl+B`로 빠른 전환

## 키보드 단축키

- `Cmd/Ctrl+B`: 블로그 자동화 모드
- `Cmd/Ctrl+M`: 메인 워크스페이스
- `Cmd/Ctrl+N`: 새 워크플로우
- `F12`: 개발자 도구
