# EG-Desk Taehwa Electron Code Review (May 2025)

> 이 문서는 이전 `fix.md` 내용을 완전히 대체합니다. 분석 대상은 현재 저장소 코드와 Electron 28.0 문서[1] 및 context7 MCP 설계 원칙을 기준으로 합니다.

## 1. 개요

* 보안 기본값(`contextIsolation`, `sandbox`, `nodeIntegration =false`)은 양호합니다.
* 모듈화 구조(WebContentsManager ↔︎ BrowserTabComponent ↔︎ WorkspaceManager)가 context7 MCP 의도와 대체로 부합합니다.
* 하지만 API 불일치(BrowserView vs WebContentsView), 중복된 브라우저 제어 로직, 취약한 `exec` 사용 등 기술 부채가 존재합니다.

---

## 2. 메인 프로세스 `main.js`

### 잘 된 점 ✅
1. 전역 오류 처리(`uncaughtException`, `unhandledRejection`, `render-process-gone`).
2. 안전한 `webPreferences` 설정.
3. 메뉴 템플릿이 간결하며 macOS 단축키를 고려함.

### 개선 사항 ⚠️
1. **BrowserView 감가상각 주석 오해**  
   코드에서는 `BrowserView`를 생성하지만 주석에는 *deprecated* 라고 명시되어 혼란을 줍니다.  
   • Electron 28에서 신규 `WebContentsView` API를 사용하거나, 계속 BrowserView를 유지할 경우 주석을 수정하세요.
2. **`exec` 보안**  
   `command.startsWith('claude ')`만 검증하면 `claude ; rm -rf /` 같은 명령이 통과할 수 있습니다.  
   • `child_process.spawn`에 인자 배열을 전달하고 `shell-escape`로 이스케이프하세요.  
   • 또는 별도 유틸리티 프로세스에 작업을 위임하고 IPC로 통신하십시오.
3. **뷰 자원 해제 누락**  
   `hideBrowserView()`에서 `setBrowserView(null)`만 호출하고 기존 view를 파괴하지 않습니다.  
   • `view.webContents.destroy()` 호출 또는 재사용 풀을 구현하세요.

---

## 3. `WebContentsManager`

### API 일관성
* 모듈 헤더에는 *WebContentsView 사용*이라 쓰였지만 실제로는 `BrowserView`를 생성합니다.  
  → 팩토리 함수(`createView()`)로 추상화해 쉽게 전환할 수 있게 하십시오.

### 기하 연동 문제
* `updateWebContentsViewBounds()`가 헤더 28 px 같은 하드코드를 사용합니다.  
  → 렌더러가 `browser-viewport`의 정확한 `getBoundingClientRect()`를 IPC로 전달하도록 하고, DPI(`devicePixelRatio`)를 고려해 라운딩하십시오.

### 프록시 누락
* Renderer 프록시에 `updateWebContentsViewBounds`가 없어 `BrowserTabComponent` 호출 시 `undefined is not a function` 오류가 잠재합니다.  
  → 프록시와 preload에 채널(`browser-update-bounds`)을 추가하세요.

### 기타
* `webContents.close()` 뒤에 `destroy()`는 중복입니다. Electron docs[1]에 따라 `destroy()`만 호출하세요.

---

## 4. 렌더러 `renderer.js`
1. 초기화 단계에서 `BrowserTabComponent` 기능을 중복 구현한 레거시 코드가 남아 있습니다. 안정화 후 제거하십시오.
2. `createWebContentsManagerProxy`를 ES 모듈로 분리해 테스트 가능성을 높이세요.
3. 워크스페이스 전환시 `ipcRenderer.removeAllListeners`로 리스너 누수를 방지하세요.

---

## 5. `BrowserTabComponent`

| 문제 | 권장 조치 |
|------|-----------|
| URL 검증 로직이 `BrowserController`에도 중복 | 공용 `validateURL` 유틸로 리팩터링 |
| 누락된 `updateWebContentsViewBounds` 프록시 호출 | §3 참고 |
| `getBoundingClientRect()` 결과가 CSS 픽셀 기반 | `* devicePixelRatio` 적용 |
| 기본 URL 하드코딩 | 워크스페이스 설정값으로 이동 |
| `resize` 리스너 해제 없음 | `destroy()`에서 `removeEventListener` 호출 |

---

## 6. `BrowserController`
현재 기능이 `BrowserTabComponent`와 100% 겹칩니다. context7 MCP의 *단일 책임 원칙*에 따라 삭제하거나, headless 자동화를 위해 별도 목적이 있다면 명확히 구분하십시오.

---

## 7. `preload.js`
* IPC 채널 문자열이 여러 파일에 분산돼 있습니다. Enum/상수화하여 오타를 방지하세요.
* 공통 `validateURL` 또는 기타 툴 함수를 여기서 노출하면 렌더러 중복을 줄일 수 있습니다.

---

## 8. 보안 체크리스트

| 항목 | 상태 | 조치 |
|------|------|------|
| `contextIsolation` | ✅ |
| `sandbox` | ✅ |
| remote 모듈 비활성화 | ✅ |
| CSP 메타태그 | ❌ `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; img-src 'self' data:">` 추가 |
| 권한 요청 핸들러 | ❌ `session.setPermissionRequestHandler()`로 기본 거부 |
| 외부 링크 처리 | ❌ `setWindowOpenHandler`에서 `shell.openExternal` 사용 |

---

## 9. 코딩 스타일 (Electron Coding Style 가이드[1])
1. `require` 순서를 *Node 내장 → Electron → 로컬 모듈* 로 통일.
2. 불변 값은 `const` 사용, 대문자 스네이크 케이스 적용.
3. 모든 파일 끝에 공백 줄 삽입.
4. `npm run lint`로 공백/세미콜론 자동 수정.

---

## 10. 다음 단계 제안
1. **BrowserView ↔︎ WebContentsView 결정 및 전면 리팩터**
2. 프로덕션 빌드 전에 프록시/중복 코드 정리.
3. `exec` 경로 하드닝.
4. E2E 테스트 추가(작업 공간 전환, 브라우저 탐색 시나리오).
5. Electron Forge 패키징 재검증.

---

## 참고 링크
[1] Electron Coding Style: <https://www.electronjs.org/docs/latest/development/coding-style>