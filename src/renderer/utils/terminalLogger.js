/**
 * Terminal Logger - Sends renderer process logs to main process terminal
 */

class TerminalLogger {
  constructor() {
    this.isEnabled = true;
    this.context = 'Renderer';
  }

  /**
   * Set context for logging
   */
  setContext(context) {
    this.context = context;
  }

  /**
   * Log info message
   */
  log(...args) {
    if (!this.isEnabled) return;
    
    const message = this.formatMessage(args);
    console.log(...args); // Keep browser console log
    
    // Send to main process terminal
    if (window.electronAPI && window.electronAPI.log) {
      window.electronAPI.log.info(`[${this.context}] ${message}`);
    }
  }

  /**
   * Log warning message
   */
  warn(...args) {
    if (!this.isEnabled) return;
    
    const message = this.formatMessage(args);
    console.warn(...args); // Keep browser console log
    
    // Send to main process terminal
    if (window.electronAPI && window.electronAPI.log) {
      window.electronAPI.log.warn(`[${this.context}] ${message}`);
    }
  }

  /**
   * Log error message
   */
  error(...args) {
    if (!this.isEnabled) return;
    
    const message = this.formatMessage(args);
    console.error(...args); // Keep browser console log
    
    // Send to main process terminal
    if (window.electronAPI && window.electronAPI.log) {
      window.electronAPI.log.error(`[${this.context}] ${message}`);
    }
  }

  /**
   * Format message from arguments
   */
  formatMessage(args) {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return '[Object]';
        }
      }
      return String(arg);
    }).join(' ');
  }

  /**
   * Create a logger with specific context
   */
  createLogger(context) {
    const logger = new TerminalLogger();
    logger.setContext(context);
    return logger;
  }
}

// Export singleton instance
const terminalLogger = new TerminalLogger();

export default terminalLogger;
export { TerminalLogger };