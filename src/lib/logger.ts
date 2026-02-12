/**
 * Sistema de Logging para Desenvolvimento
 * Registra progresso, erros e métricas de performance
 * Works in both browser and server environments
 */

export class DevelopmentLogger {
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

  error(error: Error, context?: string) {
    this.log('ERROR', error.message, {
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  performance(metric: string, value: number, unit: string = 'ms') {
    this.log('PERFORMANCE', `${metric}: ${value}${unit}`);
  }

  info(message: string, data?: unknown) {
    this.log('INFO', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('WARN', message, data);
  }

  debug(message: string, data?: unknown) {
    this.log('DEBUG', message, data);
  }
}

// Exportar instância singleton
export const devLogger = new DevelopmentLogger();
export const logger = devLogger;
export const loggerService = devLogger;
