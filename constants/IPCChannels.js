/**
 * IPC Channel Constants
 * Centralized constants for IPC communication to prevent typos
 * and improve maintainability across the application.
 */

const IPC_CHANNELS = {
  // Store operations
  STORE_GET: 'store-get',
  STORE_SET: 'store-set',

  // Terminal logging
  TERMINAL_LOG: 'terminal-log',

  // Workspace management
  SWITCH_WORKSPACE: 'switch-workspace',

  // Browser control APIs
  BROWSER_LOAD_URL: 'browser-load-url',
  BROWSER_GO_BACK: 'browser-go-back',
  BROWSER_GO_FORWARD: 'browser-go-forward',
  BROWSER_RELOAD: 'browser-reload',
  BROWSER_CAN_GO_BACK: 'browser-can-go-back',
  BROWSER_CAN_GO_FORWARD: 'browser-can-go-forward',
  BROWSER_GET_URL: 'browser-get-url',
  BROWSER_EXECUTE_SCRIPT: 'browser-execute-script',
  BROWSER_GET_NAVIGATION_STATE: 'browser-get-navigation-state',
  BROWSER_UPDATE_BOUNDS: 'browser-update-bounds',

  // Browser events
  BROWSER_NAVIGATED: 'browser-navigated',
  BROWSER_LOAD_FAILED: 'browser-load-failed',
  BROWSER_LOAD_FINISHED: 'browser-load-finished',

  // Command execution
  EXECUTE_COMMAND: 'execute-command',

  // Window controls
  WINDOW_MINIMIZE: 'window-minimize',
  WINDOW_MAXIMIZE: 'window-maximize',
  WINDOW_CLOSE: 'window-close',

  // Menu events
  MENU_NEW_WORKFLOW: 'menu-new-workflow',
  MENU_SETTINGS: 'menu-settings',
  SWITCH_TO_BLOG_WORKFLOW: 'switch-to-blog-workflow',
  SWITCH_TO_MAIN_WORKSPACE: 'switch-to-main-workspace'
};

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IPC_CHANNELS;
} else {
  window.IPC_CHANNELS = IPC_CHANNELS;
}