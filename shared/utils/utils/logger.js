// Centralized logging utility for the Front Range Pool League App

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    this.level = this.getLogLevel();
    this.isProduction = import.meta.env.PROD;
  }

  getLogLevel() {
    if (this.isProduction) {
      return LOG_LEVELS.ERROR; // Only errors in production
    }
    
    const debugMode = import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true';
    const consoleLogging = import.meta.env.VITE_ENABLE_CONSOLE_LOGGING === 'true';
    
    if (debugMode && consoleLogging) {
      return LOG_LEVELS.DEBUG;
    } else if (debugMode) {
      return LOG_LEVELS.INFO;
    } else {
      return LOG_LEVELS.WARN;
    }
  }

  error(message, ...args) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  warn(message, ...args) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  info(message, ...args) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  debug(message, ...args) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  // Special method for backend connectivity checks
  backendCheck(message, ...args) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.log(`[BACKEND] ${message}`, ...args);
    }
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
