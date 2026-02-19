// Comprehensive Error Recovery System
// Handles error detection, reporting, and recovery mechanisms

import React from 'react';

export interface ErrorReport {
  id: string;
  timestamp: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: {
    component?: string;
    level: 'app' | 'page' | 'component';
    section?: string;
    critical?: boolean;
    url?: string;
    userAgent?: string;
  };
  recovery: {
    attempted: boolean;
    successful?: boolean;
    retryCount: number;
    strategy?: string;
  };
  metadata?: Record<string, any>;
}

class ErrorRecoveryService {
  private static instance: ErrorRecoveryService;
  private errorReports: Map<string, ErrorReport> = new Map();
  private maxRetries = 3;
  private retryDelayBase = 1000;
  private enableAutoRecovery = true;

  static getInstance(): ErrorRecoveryService {
    if (!ErrorRecoveryService.instance) {
      ErrorRecoveryService.instance = new ErrorRecoveryService();
    }
    return ErrorRecoveryService.instance;
  }

  // Report an error and attempt recovery
  async reportError(
    error: Error,
    context: Partial<ErrorReport['context']>,
    metadata?: Record<string, any>
  ): Promise<ErrorReport> {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();

    const errorReport: ErrorReport = {
      id: errorId,
      timestamp,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        level: 'component',
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
        ...context,
      },
      recovery: {
        attempted: false,
        retryCount: 0,
      },
      metadata,
    };

    this.errorReports.set(errorId, errorReport);

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Recovery Service - ${errorId}`);
      console.error('Error:', error);
      console.groupEnd();
    }

    // Send to external error tracking
    await this.sendToErrorTracking(errorReport);

    // Attempt automatic recovery for certain error types
    if (this.enableAutoRecovery && this.shouldAttemptAutoRecovery(errorReport)) {
      await this.attemptRecovery(errorId);
    }

    return errorReport;
  }

  // Attempt recovery for a specific error
  async attemptRecovery(errorId: string): Promise<boolean> {
    const errorReport = this.errorReports.get(errorId);
    if (!errorReport || errorReport.recovery.retryCount >= this.maxRetries) {
      return false;
    }

    errorReport.recovery.attempted = true;
    errorReport.recovery.retryCount += 1;

    const strategy = this.selectRecoveryStrategy(errorReport);
    errorReport.recovery.strategy = strategy;

    try {
      const success = await this.executeRecoveryStrategy(strategy, errorReport);
      errorReport.recovery.successful = success;
      
      if (success) {
      } else {
      }

      return success;
    } catch (recoveryError) {
      console.error(`💥 Recovery attempt failed for ${errorId}:`, recoveryError);
      errorReport.recovery.successful = false;
      return false;
    }
  }

  // Select appropriate recovery strategy based on error type
  private selectRecoveryStrategy(errorReport: ErrorReport): string {
    const { error, context } = errorReport;

    // Chart-specific errors
    if (context.component?.toLowerCase().includes('chart')) {
      if (error.message.includes('Element type is invalid')) {
        return 'reload-chart-component';
      }
      if (error.message.includes('data')) {
        return 'refresh-chart-data';
      }
      return 'fallback-chart';
    }

    // Dashboard errors
    if (context.section?.toLowerCase().includes('dashboard')) {
      if (context.critical) {
        return 'safe-mode-dashboard';
      }
      return 'refresh-dashboard-section';
    }

    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'retry-network-request';
    }

    // Component loading errors
    if (error.message.includes('Element type is invalid')) {
      return 'reload-component';
    }

    // Default strategy
    return 'generic-retry';
  }

  // Execute specific recovery strategy
  private async executeRecoveryStrategy(
    strategy: string, 
    errorReport: ErrorReport
  ): Promise<boolean> {
    const delay = this.retryDelayBase * Math.pow(2, errorReport.recovery.retryCount - 1);
    
    // Wait before attempting recovery
    await new Promise(resolve => setTimeout(resolve, delay));

    switch (strategy) {
      case 'reload-chart-component':
        return this.reloadChartComponent(errorReport);
        
      case 'refresh-chart-data':
        return this.refreshChartData(errorReport);
        
      case 'fallback-chart':
        return this.useFallbackChart(errorReport);
        
      case 'safe-mode-dashboard':
        return this.enableSafeModeDashboard(errorReport);
        
      case 'refresh-dashboard-section':
        return this.refreshDashboardSection(errorReport);
        
      case 'retry-network-request':
        return this.retryNetworkRequest(errorReport);
        
      case 'reload-component':
        return this.reloadComponent(errorReport);
        
      case 'generic-retry':
        return this.genericRetry(errorReport);
        
      default:
        return false;
    }
  }

  // Recovery strategy implementations
  private async reloadChartComponent(errorReport: ErrorReport): Promise<boolean> {
    try {
      // Trigger a re-render of the chart component
      const event = new CustomEvent('chart-reload', {
        detail: { errorId: errorReport.id, component: errorReport.context.component }
      });
      window.dispatchEvent(event);
      return true;
    } catch {
      return false;
    }
  }

  private async refreshChartData(errorReport: ErrorReport): Promise<boolean> {
    try {
      // Trigger data refresh for charts
      const event = new CustomEvent('chart-data-refresh', {
        detail: { errorId: errorReport.id, component: errorReport.context.component }
      });
      window.dispatchEvent(event);
      return true;
    } catch {
      return false;
    }
  }

  private async useFallbackChart(errorReport: ErrorReport): Promise<boolean> {
    try {
      // Switch to fallback chart mode
      const event = new CustomEvent('chart-fallback', {
        detail: { errorId: errorReport.id, component: errorReport.context.component }
      });
      window.dispatchEvent(event);
      return true;
    } catch {
      return false;
    }
  }

  private async enableSafeModeDashboard(errorReport: ErrorReport): Promise<boolean> {
    try {
      // Enable dashboard safe mode
      if (typeof window !== 'undefined') {
        window.location.href = window.location.pathname + '?safe=true';
      }
      return true;
    } catch {
      return false;
    }
  }

  private async refreshDashboardSection(errorReport: ErrorReport): Promise<boolean> {
    try {
      // Trigger section refresh
      const event = new CustomEvent('dashboard-section-refresh', {
        detail: { errorId: errorReport.id, section: errorReport.context.section }
      });
      window.dispatchEvent(event);
      return true;
    } catch {
      return false;
    }
  }

  private async retryNetworkRequest(errorReport: ErrorReport): Promise<boolean> {
    try {
      // Retry failed network requests
      const event = new CustomEvent('network-retry', {
        detail: { errorId: errorReport.id, context: errorReport.context }
      });
      window.dispatchEvent(event);
      return true;
    } catch {
      return false;
    }
  }

  private async reloadComponent(errorReport: ErrorReport): Promise<boolean> {
    try {
      // Trigger component reload
      const event = new CustomEvent('component-reload', {
        detail: { errorId: errorReport.id, component: errorReport.context.component }
      });
      window.dispatchEvent(event);
      return true;
    } catch {
      return false;
    }
  }

  private async genericRetry(errorReport: ErrorReport): Promise<boolean> {
    try {
      // Generic retry mechanism
      const event = new CustomEvent('error-retry', {
        detail: { errorId: errorReport.id, context: errorReport.context }
      });
      window.dispatchEvent(event);
      return true;
    } catch {
      return false;
    }
  }

  // Determine if auto-recovery should be attempted
  private shouldAttemptAutoRecovery(errorReport: ErrorReport): boolean {
    const { error, context } = errorReport;

    // Don't auto-recover for syntax errors or critical app errors
    if (error.name === 'SyntaxError' || context.level === 'app') {
      return false;
    }

    // Auto-recover for data and network errors
    if (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('data') ||
      error.message.includes('Element type is invalid')
    ) {
      return true;
    }

    // Auto-recover for component-level errors
    return context.level === 'component';
  }

  // Send error report to external tracking service
  private async sendToErrorTracking(errorReport: ErrorReport): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      try {
        if (typeof window !== 'undefined' && (window as any).Sentry) {
          (window as any).Sentry.captureException(new Error(errorReport.error.message), {
            tags: {
              errorRecoveryId: errorReport.id,
              component: errorReport.context.component,
              level: errorReport.context.level,
              section: errorReport.context.section,
            },
            contexts: {
              errorRecovery: {
                attempted: errorReport.recovery.attempted,
                retryCount: errorReport.recovery.retryCount,
                strategy: errorReport.recovery.strategy,
              },
            },
            extra: errorReport.metadata,
          });
        }

        // Also store locally for analysis
        const storedReports = JSON.parse(localStorage.getItem('errorReports') || '[]');
        storedReports.push(errorReport);
        // Keep only last 20 reports
        localStorage.setItem('errorReports', JSON.stringify(storedReports.slice(-20)));
      } catch (err) {
        console.error('Failed to send error report:', err);
      }
    }
  }

  // Generate unique error ID
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get error statistics
  getErrorStats(): {
    totalErrors: number;
    recoveredErrors: number;
    failedRecoveries: number;
    recoveryRate: number;
  } {
    const reports = Array.from(this.errorReports.values());
    const totalErrors = reports.length;
    const recoveredErrors = reports.filter(r => r.recovery.successful === true).length;
    const failedRecoveries = reports.filter(r => r.recovery.attempted && r.recovery.successful === false).length;
    const recoveryRate = totalErrors > 0 ? (recoveredErrors / totalErrors) * 100 : 0;

    return {
      totalErrors,
      recoveredErrors,
      failedRecoveries,
      recoveryRate,
    };
  }

  // Get recent error reports
  getRecentErrors(limit = 10): ErrorReport[] {
    return Array.from(this.errorReports.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // Clear old error reports
  cleanup(maxAge = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    for (const [id, report] of this.errorReports) {
      if (new Date(report.timestamp).getTime() < cutoff) {
        this.errorReports.delete(id);
      }
    }
  }
}

// Export singleton instance
export const errorRecoveryService = ErrorRecoveryService.getInstance();

// React hook for using error recovery
export function useErrorRecovery() {
  const [errorStats, setErrorStats] = React.useState(() => errorRecoveryService.getErrorStats());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setErrorStats(errorRecoveryService.getErrorStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const reportError = React.useCallback(
    (error: Error, context?: Partial<ErrorReport['context']>, metadata?: Record<string, any>) => {
      return errorRecoveryService.reportError(error, context || {}, metadata);
    },
    []
  );

  const attemptRecovery = React.useCallback((errorId: string) => {
    return errorRecoveryService.attemptRecovery(errorId);
  }, []);

  return {
    errorStats,
    reportError,
    attemptRecovery,
    recentErrors: errorRecoveryService.getRecentErrors(),
  };
}

export default errorRecoveryService;