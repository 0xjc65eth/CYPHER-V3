// Enhanced Error Logger for Production
import { ErrorReport, ErrorLogger, ErrorMonitoringService } from './types';

class ProductionErrorLogger implements ErrorLogger {
  private static instance: ProductionErrorLogger;
  private monitoring?: ErrorMonitoringService;
  private isProduction = process.env.NODE_ENV === 'production';
  private sessionId = this.generateSessionId();
  private errorQueue: ErrorReport[] = [];
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  private constructor() {
    this.initializeMonitoring();
    this.setupOnlineListener();
  }

  static getInstance(): ProductionErrorLogger {
    if (!ProductionErrorLogger.instance) {
      ProductionErrorLogger.instance = new ProductionErrorLogger();
    }
    return ProductionErrorLogger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeMonitoring() {
    if (this.isProduction && typeof window !== 'undefined') {
      try {
        // Initialize Sentry or other monitoring service
        // This is a mock implementation - replace with actual service
        this.monitoring = {
          captureException: (error: Error, context?: any) => {
            console.error('Monitoring Service - Exception:', error, context);
          },
          captureMessage: (message: string, level?: string, context?: any) => {
          },
          setUser: (user: { id: string; email?: string }) => {
          },
          setTag: (key: string, value: string) => {
          },
          setContext: (key: string, context: any) => {
          },
          addBreadcrumb: (breadcrumb: any) => {
          }
        };
      } catch (error) {
        console.error('Failed to initialize monitoring service:', error);
      }
    }
  }

  private setupOnlineListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushErrorQueue();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  private async flushErrorQueue() {
    if (!this.isOnline || this.errorQueue.length === 0) return;

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    for (const report of errorsToSend) {
      try {
        await this.sendErrorReport(report);
      } catch (error) {
        // If sending fails, put it back in queue
        this.errorQueue.push(report);
        console.error('Failed to send queued error report:', error);
      }
    }
  }

  private createErrorContext(): Partial<import('./types').ErrorContextInfo> {
    const context: Partial<import('./types').ErrorContextInfo> = {
      timestamp: new Date(),
      sessionId: this.sessionId,
      environment: (process.env.NODE_ENV as any) || 'development',
    };

    if (typeof window !== 'undefined') {
      context.url = window.location.href;
      context.userAgent = navigator.userAgent;
    }

    if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BUILD_VERSION) {
      context.buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION;
    }

    return context;
  }

  private determineErrorSeverity(error: Error): ErrorReport['severity'] {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Critical errors that can break the app
    if (
      message.includes('wallet') && message.includes('private key') ||
      message.includes('transaction') && message.includes('failed') ||
      message.includes('network') && message.includes('unavailable') ||
      stack.includes('trading') && stack.includes('execution')
    ) {
      return 'critical';
    }

    // High severity for user-facing features
    if (
      message.includes('wallet') ||
      message.includes('trading') ||
      message.includes('payment') ||
      message.includes('authentication')
    ) {
      return 'high';
    }

    // Medium for UI and data issues
    if (
      message.includes('render') ||
      message.includes('api') ||
      message.includes('fetch') ||
      message.includes('load')
    ) {
      return 'medium';
    }

    return 'low';
  }

  private categorizeError(error: Error): ErrorReport['category'] {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('wallet') || stack.includes('wallet')) return 'wallet_interaction';
    if (message.includes('trading') || stack.includes('trading')) return 'trading_operation';
    if (message.includes('ai') || message.includes('neural') || stack.includes('ai')) return 'ai_processing';
    if (message.includes('api') || message.includes('fetch')) return 'api_call';
    if (message.includes('blockchain') || message.includes('bitcoin') || message.includes('ethereum')) return 'blockchain_interaction';
    if (message.includes('async') || message.includes('promise')) return 'async_operation';
    if (message.includes('network') || message.includes('timeout')) return 'network_error';
    if (message.includes('auth') || message.includes('login')) return 'authentication';
    if (message.includes('validation') || message.includes('invalid')) return 'validation';
    if (stack.includes('render') || stack.includes('component')) return 'ui_render';

    return 'unknown';
  }

  private async sendErrorReport(report: ErrorReport): Promise<void> {
    if (!this.isOnline) {
      this.errorQueue.push(report);
      return;
    }

    try {
      // Send to monitoring service
      if (this.monitoring) {
        this.monitoring.captureException(report.error, report.context);
      }

      // Send to custom endpoint if needed
      if (this.isProduction && typeof fetch !== 'undefined') {
        await fetch('/api/errors/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...report,
            error: {
              name: report.error.name,
              message: report.error.message,
              stack: report.error.stack,
            }
          }),
        });
      }
    } catch (error) {
      console.error('Failed to send error report:', error);
      throw error;
    }
  }

  error(message: string, data?: any): void {
    const error = new Error(message);
    if (data) {
      (error as any).data = data;
    }
    
    const report: ErrorReport = {
      error,
      errorInfo: { componentStack: '' },
      context: this.createErrorContext() as import('./types').ErrorContextInfo,
      severity: this.determineErrorSeverity(error),
      category: this.categorizeError(error)
    };

    console.error(`[ERROR] ${message}`, data);
    this.report(report);
  }

  warn(message: string, data?: any): void {
    
    if (this.monitoring) {
      this.monitoring.captureMessage(message, 'warning', data);
    }
  }

  info(message: string, data?: any): void {
    
    if (this.monitoring) {
      this.monitoring.captureMessage(message, 'info', data);
    }
  }

  debug(message: string, data?: any): void {
    if (!this.isProduction) {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }

  async report(report: ErrorReport): Promise<void> {
    try {
      // Add breadcrumb for tracking
      if (this.monitoring) {
        this.monitoring.addBreadcrumb({
          message: `Error reported: ${report.error.message}`,
          category: report.category,
          level: 'error',
          data: {
            severity: report.severity,
            component: report.context.component,
            url: report.context.url
          }
        });
      }

      await this.sendErrorReport(report);
    } catch (error) {
      console.error('Failed to report error:', error);
    }
  }

  // Helper methods for specific error types
  reportWalletError(error: Error, walletType?: string, operation?: string): void {
    const enhancedError = error as any;
    enhancedError.walletType = walletType;
    enhancedError.operation = operation;

    this.error(`Wallet Error (${walletType}): ${error.message}`, {
      walletType,
      operation,
      originalError: error
    });
  }

  reportTradingError(error: Error, exchange?: string, pair?: string, operation?: string): void {
    const enhancedError = error as any;
    enhancedError.exchange = exchange;
    enhancedError.pair = pair;
    enhancedError.operation = operation;

    this.error(`Trading Error (${exchange}): ${error.message}`, {
      exchange,
      pair,
      operation,
      originalError: error
    });
  }

  reportAIError(error: Error, model?: string, operation?: string): void {
    const enhancedError = error as any;
    enhancedError.model = model;
    enhancedError.operation = operation;

    this.error(`AI Error (${model}): ${error.message}`, {
      model,
      operation,
      originalError: error
    });
  }

  reportAPIError(error: Error, endpoint?: string, method?: string, status?: number): void {
    const enhancedError = error as any;
    enhancedError.endpoint = endpoint;
    enhancedError.method = method;
    enhancedError.status = status;

    this.error(`API Error (${method} ${endpoint}): ${error.message}`, {
      endpoint,
      method,
      status,
      originalError: error
    });
  }

  // Performance tracking
  trackPerformance(name: string, duration: number, additionalData?: any): void {
    this.info(`Performance: ${name} took ${duration}ms`, {
      performance: true,
      duration,
      ...additionalData
    });
  }

  // User action tracking
  trackUserAction(action: string, data?: any): void {
    if (this.monitoring) {
      this.monitoring.addBreadcrumb({
        message: `User action: ${action}`,
        category: 'user',
        level: 'info',
        data
      });
    }
  }
}

// Export singleton instance
export const errorLogger = ProductionErrorLogger.getInstance();
export default errorLogger;