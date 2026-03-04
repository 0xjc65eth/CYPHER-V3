/**
 * Sistema de Logging para Desenvolvimento
 * Registra progresso, erros e métricas de performance
 * Works in both browser and server environments
 * Respects LOG_LEVEL env var: error | warn | info | debug (default: info)
 */

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

function getLogLevel(): LogLevel {
  const env = typeof process !== 'undefined' ? process.env?.LOG_LEVEL : undefined;
  if (env && env in LOG_LEVELS) return env as LogLevel;
  return 'info';
}

export class DevelopmentLogger {
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= LOG_LEVELS[getLogLevel()];
  }

  log(category: string, message: string, data?: unknown) {
    console.log(`[${category}]`, message, data || '');
  }

  milestone(title: string, details: string) {
    console.log('MILESTONE:', title);
    console.log(details);
  }

  progress(feature: string, percentage: number) {
    this.log('PROGRESS', `${feature}: ${percentage}% complete`);
  }

  error(messageOrError: string | Error, dataOrContext?: unknown, extra?: unknown) {
    if (!this.shouldLog('error')) return;
    if (messageOrError instanceof Error) {
      this.log('ERROR', messageOrError.message, {
        stack: messageOrError.stack,
        context: dataOrContext,
        timestamp: new Date().toISOString(),
      });
    } else if (extra !== undefined) {
      // Support 3-arg form: error('CATEGORY', 'message', errorData)
      this.log(messageOrError, dataOrContext as string, extra);
    } else {
      this.log('ERROR', messageOrError, dataOrContext);
    }
  }

  performance(metric: string, value: number, unit: string = 'ms') {
    if (!this.shouldLog('debug')) return;
    this.log('PERFORMANCE', `${metric}: ${value}${unit}`);
  }

  info(message: string, data?: unknown) {
    if (!this.shouldLog('info')) return;
    this.log('INFO', message, data);
  }

  warn(message: string, data?: unknown) {
    if (!this.shouldLog('warn')) return;
    this.log('WARN', message, data);
  }

  debug(message: string, data?: unknown) {
    if (!this.shouldLog('debug')) return;
    this.log('DEBUG', message, data);
  }
}

// Exportar instância singleton
export const devLogger = new DevelopmentLogger();
export const logger = devLogger;
export const loggerService = devLogger;
