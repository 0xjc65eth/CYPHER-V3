'use client';

import React from 'react';

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  url: string;
  userAgent: string;
  type: 'hydration' | 'wallet' | 'api' | 'render' | 'unknown';
  metadata?: Record<string, any>;
}

class ErrorMonitor {
  private static instance: ErrorMonitor;
  private errors: ErrorReport[] = [];
  private maxErrors = 100;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupErrorHandlers();
    }
  }

  static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor();
    }
    return ErrorMonitor.instance;
  }

  private setupErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        type: this.categorizeError(event.message),
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        }
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: event.reason?.toString() || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        type: this.categorizeError(event.reason?.toString() || ''),
        metadata: {
          reason: event.reason
        }
      });
    });

    // Console error interceptor
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (this.shouldCaptureConsoleError(message)) {
        this.captureError({
          message,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          type: this.categorizeError(message),
          metadata: { source: 'console.error', args }
        });
      }
      originalError.apply(console, args);
    };
  }

  private shouldCaptureConsoleError(message: string): boolean {
    // Filtrar erros que queremos capturar
    const relevantErrors = [
      'hydrat',
      'mismatch',
      'wallet',
      'web3',
      'ethereum',
      'Failed to connect',
      'Network Error'
    ];

    return relevantErrors.some(term => 
      message.toLowerCase().includes(term.toLowerCase())
    );
  }

  private categorizeError(message: string): ErrorReport['type'] {
    const msg = message.toLowerCase();
    
    if (msg.includes('hydrat') || msg.includes('mismatch')) {
      return 'hydration';
    }
    if (msg.includes('wallet') || msg.includes('web3') || msg.includes('ethereum')) {
      return 'wallet';
    }
    if (msg.includes('fetch') || msg.includes('api') || msg.includes('network')) {
      return 'api';
    }
    if (msg.includes('render') || msg.includes('component')) {
      return 'render';
    }
    
    return 'unknown';
  }

  captureError(error: Omit<ErrorReport, 'timestamp' | 'url' | 'userAgent'> & 
                    Partial<Pick<ErrorReport, 'timestamp' | 'url' | 'userAgent'>>) {
    const errorReport: ErrorReport = {
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
      ...error
    };

    this.errors.unshift(errorReport);
    
    // Manter apenas os últimos erros
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log no desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Monitor - ${errorReport.type.toUpperCase()}`);
      console.error('Message:', errorReport.message);
      console.error('Stack:', errorReport.stack);
      console.error('Metadata:', errorReport.metadata);
      console.groupEnd();
    }

    // Em produção, enviar para serviço de monitoramento
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(errorReport);
    }
  }

  private async sendToMonitoringService(error: ErrorReport) {
    try {
      // Implementar envio para Sentry, LogRocket, etc.
      await fetch('/api/errors/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      });
    } catch (e) {
    }
  }

  getErrors(): ErrorReport[] {
    return [...this.errors];
  }

  getErrorsByType(type: ErrorReport['type']): ErrorReport[] {
    return this.errors.filter(error => error.type === type);
  }

  getHydrationErrors(): ErrorReport[] {
    return this.getErrorsByType('hydration');
  }

  getWalletErrors(): ErrorReport[] {
    return this.getErrorsByType('wallet');
  }

  clearErrors() {
    this.errors = [];
  }

  // Método para relatório de saúde
  getHealthReport() {
    const totalErrors = this.errors.length;
    const errorsByType = {
      hydration: this.getErrorsByType('hydration').length,
      wallet: this.getErrorsByType('wallet').length,
      api: this.getErrorsByType('api').length,
      render: this.getErrorsByType('render').length,
      unknown: this.getErrorsByType('unknown').length,
    };

    const recentErrors = this.errors.filter(
      error => Date.now() - error.timestamp < 5 * 60 * 1000 // últimos 5 minutos
    ).length;

    return {
      totalErrors,
      errorsByType,
      recentErrors,
      healthScore: Math.max(0, 100 - (recentErrors * 10)), // 0-100
      status: recentErrors === 0 ? 'healthy' : recentErrors < 5 ? 'warning' : 'critical'
    };
  }
}

// Hook React para usar o Error Monitor
export function useErrorMonitor() {
  const [monitor] = React.useState(() => ErrorMonitor.getInstance());
  const [errors, setErrors] = React.useState<ErrorReport[]>([]);

  React.useEffect(() => {
    const updateErrors = () => {
      setErrors(monitor.getErrors());
    };

    updateErrors();
    const interval = setInterval(updateErrors, 5000); // Atualiza a cada 5s
    
    return () => clearInterval(interval);
  }, [monitor]);

  return {
    monitor,
    errors,
    hydrationErrors: monitor.getHydrationErrors(),
    walletErrors: monitor.getWalletErrors(),
    healthReport: monitor.getHealthReport(),
    clearErrors: monitor.clearErrors.bind(monitor)
  };
}

// Instância global
export const errorMonitor = ErrorMonitor.getInstance();