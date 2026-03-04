/**
 * 🔥 ENHANCED LOGGER - CYPHER ORDi FUTURE V3
 * Sistema de logging avançado com múltiplos níveis e contexto
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'performance';

export interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  duration?: number;
  metadata?: Record<string, any>;
  // Propriedades flexíveis para contextos específicos
  [key: string]: any;
}

export class EnhancedLogger {
  private static instance: EnhancedLogger;
  private isProduction = process.env.NODE_ENV === 'production';
  private logBuffer: Array<{ level: LogLevel; message: string; context?: LogContext; timestamp: Date }> = [];

  static getInstance(): EnhancedLogger {
    if (!EnhancedLogger.instance) {
      EnhancedLogger.instance = new EnhancedLogger();
    }
    return EnhancedLogger.instance;
  }

  static log(level: LogLevel, message: string, context?: LogContext): void {
    const instance = EnhancedLogger.getInstance();
    instance.writeLog(level, message, context);
  }

  static debug(message: string, context?: LogContext | unknown): void {
    EnhancedLogger.log('debug', message, context as LogContext);
  }

  static info(message: string, context?: LogContext | unknown): void {
    EnhancedLogger.log('info', message, context as LogContext);
  }

  static warn(message: string, context?: LogContext | unknown): void {
    EnhancedLogger.log('warn', message, context as LogContext);
  }

  static error(message: string, context?: LogContext | unknown): void {
    EnhancedLogger.log('error', message, context as LogContext);
  }

  static performance(message: string, duration: number, context?: LogContext | unknown): void {
    EnhancedLogger.log('performance', message, { ...(context as LogContext), duration });
  }

  // Instance methods that delegate to writeLog (used by services that instantiate the logger)
  info(message: string, context?: LogContext | unknown): void {
    this.writeLog('info', message, context as LogContext);
  }

  debug(message: string, context?: LogContext | unknown): void {
    this.writeLog('debug', message, context as LogContext);
  }

  warn(message: string, context?: LogContext | unknown): void {
    this.writeLog('warn', message, context as LogContext);
  }

  error(messageOrError: string | Error, context?: LogContext | string | unknown): void {
    if (messageOrError instanceof Error) {
      const msg = typeof context === 'string' ? context : messageOrError.message;
      const ctx = typeof context === 'string' ? { error: messageOrError.message, stack: messageOrError.stack } : { ...(context && typeof context === 'object' ? context : {}), error: messageOrError.message, stack: messageOrError.stack };
      this.writeLog('error', msg, ctx);
    } else {
      this.writeLog('error', messageOrError, context as LogContext);
    }
  }

  private writeLog(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date();
    const logEntry = { level, message, context, timestamp };
    
    // Add to buffer
    this.logBuffer.push(logEntry);
    
    // Keep buffer size manageable
    if (this.logBuffer.length > 1000) {
      this.logBuffer = this.logBuffer.slice(-500);
    }

    // Console output with formatting
    const prefix = `[${timestamp.toISOString()}] [${level.toUpperCase()}]`;
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    const fullMessage = `${prefix} ${message}${contextStr}`;

    // Only log to console in development or for errors
    if (!this.isProduction || level === 'error' || level === 'warn') {
      switch (level) {
        case 'debug':
          console.debug(fullMessage);
          break;
        case 'info':
          console.info(fullMessage);
          break;
        case 'warn':
          console.warn(fullMessage);
          break;
        case 'error':
          console.error(fullMessage);
          break;
        case 'performance':
          console.log(`⚡ ${fullMessage}`);
          break;
        default:
          console.log(fullMessage);
      }
    }
  }

  getLogBuffer(): typeof this.logBuffer {
    return [...this.logBuffer];
  }

  clearBuffer(): void {
    this.logBuffer = [];
  }

  exportLogs(): string {
    return this.logBuffer
      .map(entry => `${entry.timestamp.toISOString()} [${entry.level.toUpperCase()}] ${entry.message} ${entry.context ? JSON.stringify(entry.context) : ''}`)
      .join('\n');
  }
}

// Convenience exports for compatibility
export const logger = EnhancedLogger;
export const devLogger = {
  log: (component: string, message: string, context?: any) => EnhancedLogger.info(message, { component, ...context }),
  error: (component: string, message: string, context?: any) => EnhancedLogger.error(message, { component, ...context }),
  warn: (component: string, message: string, context?: any) => EnhancedLogger.warn(message, { component, ...context }),
  performance: (message: string, duration: number) => EnhancedLogger.performance(message, duration)
};

// Default export for ES6 compatibility
export default EnhancedLogger;