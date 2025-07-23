document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔧 워크스페이스 로딩 시작...');
    
    // --- Element Selections ---
    const browserView = document.getElementById('browser-view');
    const addressBar = document.getElementById('address-bar');
    const goButton = document.getElementById('go-btn');
    const backButton = document.getElementById('back-btn');
    const forwardButton = document.getElementById('forward-btn');
    const reloadButton = document.getElementById('reload-btn');

    console.log('🔍 요소 확인:', {
        browserView: !!browserView,
        addressBar: !!addressBar,
        goButton: !!goButton,
        backButton: !!backButton,
        forwardButton: !!forwardButton,
        reloadButton: !!reloadButton
    });

    const terminalOutput = document.getElementById('terminal-output');
    const terminalInput = document.getElementById('terminal-input');
    const terminalContainer = document.getElementById('terminal-container');

    const resizer = document.getElementById('resizer');
    const browserContainer = document.getElementById('browser-container');

    const WORDPRESS_URL = 'https://m8chaa.mycafe24.com/';
    console.log('🎯 기본 URL:', WORDPRESS_URL);

    // --- Initial State ---
    if (browserView && addressBar) {
        console.log('🔄 초기 상태 설정 중...');
        addressBar.value = WORDPRESS_URL;
        console.log('📝 주소창 값 설정:', addressBar.value);
        
        // Remove the direct loadURL call here - it will cause errors
        console.log('✅ 브라우저 초기화 완료');
    }

    // Load default URL with proper error handling
    console.log('🚀 기본 URL 로드 시작');
    await loadURL(WORDPRESS_URL);

    // Event listeners with logging
    if (goButton) {
        console.log('🔗 Go 버튼 이벤트 리스너 추가');
        goButton.addEventListener('click', () => {
            console.log('🖱️ Go 버튼 클릭됨, URL:', addressBar.value);
            loadURL(addressBar.value);
        });
    }
    
    if (addressBar) {
        console.log('🔗 주소창 이벤트 리스너 추가');
        addressBar.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') {
                console.log('⌨️ 주소창 Enter 키, URL:', addressBar.value);
                loadURL(addressBar.value);
            }
        });
    }
    
    if (backButton) {
        console.log('🔗 뒤로가기 버튼 이벤트 리스너 추가');
        backButton.addEventListener('click', () => {
            console.log('🖱️ 뒤로가기 버튼 클릭됨');
            if (window.electronAPI && window.electronAPI.browserAction) {
                window.electronAPI.browserAction('goBack');
            } else {
                console.error('❌ electronAPI.browserAction을 찾을 수 없음');
            }
        });
    }
    
    if (forwardButton) {
        console.log('🔗 앞으로가기 버튼 이벤트 리스너 추가');
        forwardButton.addEventListener('click', () => {
            console.log('🖱️ 앞으로가기 버튼 클릭됨');
            if (window.electronAPI && window.electronAPI.browserAction) {
                window.electronAPI.browserAction('goForward');
            } else {
                console.error('❌ electronAPI.browserAction을 찾을 수 없음');
            }
        });
    }
    
    if (reloadButton) {
        console.log('🔗 새로고침 버튼 이벤트 리스너 추가');
        reloadButton.addEventListener('click', () => {
            console.log('🖱️ 새로고침 버튼 클릭됨');
            if (window.electronAPI && window.electronAPI.browserAction) {
                window.electronAPI.browserAction('reload');
            } else {
                console.error('❌ electronAPI.browserAction을 찾을 수 없음');
            }
        });
    }

    async function loadURL(url) {
        console.log('🌐 URL 로드 함수 호출됨:', url);
        try {
            console.log('🔍 electronAPI 확인:', !!window.electronAPI);
            console.log('🔍 validateURL 확인:', !!window.electronAPI?.validateURL);
            console.log('🔍 loadWebviewURL 확인:', !!window.electronAPI?.loadWebviewURL);
            
            const validatedUrl = await window.electronAPI.validateURL(url);
            console.log('✅ URL 검증 완료:', validatedUrl);
            
            await window.electronAPI.loadWebviewURL(validatedUrl);
            console.log('✅ Webview URL 로드 완료:', validatedUrl);
            
            addressBar.value = validatedUrl;
            console.log('📝 주소창 업데이트 완료:', validatedUrl);
        } catch (error) {
            console.error('❌ URL 로드 실패:', error);
            addTerminalLine(`로드 실패: ${error.message}`, 'error');
        }
    }

    // Webview event handlers for full browser capabilities
    browserView.addEventListener('dom-ready', () => {
        console.log('Webview DOM ready, loading default URL');
        loadURL(WORDPRESS_URL);
    });

    browserView.addEventListener('did-fail-load', (event) => {
        console.error('Webview load failed:', event.errorDescription);
        addTerminalLine(`Webview 로드 실패: ${event.errorDescription}`, 'error');
    });

    updateNavigationButtons();  // Initial state

    // --- Resizer Logic ---
    if (resizer && browserContainer && terminalContainer) {
        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            console.log('리사이저 드래그 시작');
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', () => {
                console.log('리사이저 드래그 종료');
                document.removeEventListener('mousemove', handleMouseMove);
            });
        });

        function handleMouseMove(e) {
            const mainContent = document.getElementById('main-content');
            if (!mainContent) return;
            
            const totalWidth = mainContent.offsetWidth;
            const browserWidth = e.clientX;
            const resizerWidth = resizer.offsetWidth;
            const terminalWidth = totalWidth - browserWidth - resizerWidth;

            const minBrowserWidth = 300;
            const minTerminalWidth = 200;
            
            if (browserWidth < minBrowserWidth || terminalWidth < minTerminalWidth) {
                return;
            }

            const browserFlex = browserWidth / totalWidth;
            const terminalFlex = terminalWidth / totalWidth;

            browserContainer.style.flex = `${browserFlex * 10}`;
            terminalContainer.style.flex = `${terminalFlex * 10}`;
        }
    }

    // --- Terminal Logic ---
    function addTerminalLine(text, type = 'output') {
        const line = document.createElement('div');
        line.className = `${type}-line`;
        line.textContent = text;
        terminalOutput.appendChild(line);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    if (terminalInput) {
        terminalInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                const command = terminalInput.value.trim();
                if (command) {
                    // 명령어 표시
                    addTerminalLine(`$ ${command}`, 'command');

                    // Send command to the main process for execution
                    if (window.electronAPI && window.electronAPI.command) {
                        try {
                            console.log('명령어 실행:', command);
                            const result = await window.electronAPI.command.execute(command);
                            
                            if (result.success) {
                                if (result.data) {
                                    const lines = result.data.split('\n');
                                    lines.forEach(line => {
                                        if (line.trim()) {
                                            addTerminalLine(line, 'output');
                                        }
                                    });
                                }
                            } else {
                                addTerminalLine(`오류: ${result.error}`, 'error');
                            }
                        } catch (error) {
                            console.error('명령어 실행 실패:', error);
                            addTerminalLine(`실행 실패: ${error.message}`, 'error');
                        }
                    } else {
                        addTerminalLine('오류: electronAPI를 사용할 수 없습니다', 'error');
                    }

                    terminalInput.value = '';
                }
            }
        });

        // 터미널 입력창에 포커스
        terminalInput.focus();
    }
    
    console.log('워크스페이스 초기화 완료');
});
