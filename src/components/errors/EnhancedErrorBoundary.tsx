'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Mail, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  lastError: Date | null;
}

interface EnhancedErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
  enableRetry?: boolean;
  maxRetries?: number;
  showDetails?: boolean;
  reportError?: boolean;
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  onRetry: () => void;
  onReport: () => void;
  onNavigateHome: () => void;
  level: string;
  showDetails: boolean;
}

class EnhancedErrorBoundary extends Component<EnhancedErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: EnhancedErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      lastError: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
      lastError: new Date()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Error Boundary caught an error:', error);
    console.error('📍 Error Info:', errorInfo);
    
    this.setState({
      errorInfo
    });

    // Report error to monitoring service
    if (this.props.reportError !== false) {
      this.reportError(error, errorInfo);
    }

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.state.errorId);
    }

    // Auto-retry for certain types of errors
    if (this.shouldAutoRetry(error)) {
      this.scheduleAutoRetry();
    }
  }

  componentDidUpdate(prevProps: EnhancedErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetOnPropsChange && resetOnPropsChange) {
      if (resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          (key, index) => key !== prevProps.resetKeys?.[index]
        );
        
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private shouldAutoRetry(error: Error): boolean {
    // Auto-retry for network errors, chunk loading errors, etc.
    const retryableErrors = [
      'ChunkLoadError',
      'NetworkError',
      'TypeError: Failed to fetch',
      'Loading chunk'
    ];

    return retryableErrors.some(pattern => 
      error.name.includes(pattern) || error.message.includes(pattern)
    );
  }

  private scheduleAutoRetry(): void {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      this.resetTimeoutId = window.setTimeout(() => {
        this.handleRetry();
      }, Math.min(1000 * Math.pow(2, this.state.retryCount), 10000)); // Exponential backoff, max 10s
    }
  }

  private reportError(error: Error, errorInfo: ErrorInfo): void {
    const errorReport = {
      id: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      level: this.props.level || 'component',
      retryCount: this.state.retryCount,
      props: this.props.isolate ? {} : Object.keys(this.props).reduce((acc, key) => {
        if (key !== 'children' && key !== 'onError') {
          acc[key] = this.props[key as keyof EnhancedErrorBoundaryProps];
        }
        return acc;
      }, {} as any)
    };

    // Send to error reporting service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          errorBoundary: errorReport
        }
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('🔥 Error Report:', errorReport);
    }

    // Send to custom endpoint
    fetch('/api/errors/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorReport),
    }).catch(err => {
      console.error('Failed to report error:', err);
    });
  }

  private resetErrorBoundary = (): void => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      lastError: null
    });
  };

  private handleRetry = (): void => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  private handleReport = (): void => {
    if (this.state.error && this.state.errorInfo) {
      this.reportError(this.state.error, this.state.errorInfo);
    }
  };

  private handleNavigateHome = (): void => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          retryCount={this.state.retryCount}
          onRetry={this.handleRetry}
          onReport={this.handleReport}
          onNavigateHome={this.handleNavigateHome}
          level={this.props.level || 'component'}
          showDetails={this.props.showDetails ?? process.env.NODE_ENV === 'development'}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
function DefaultErrorFallback({
  error,
  errorInfo,
  errorId,
  retryCount,
  onRetry,
  onReport,
  onNavigateHome,
  level,
  showDetails
}: ErrorFallbackProps) {
  const getErrorSeverity = () => {
    if (level === 'page') return 'high';
    if (level === 'section') return 'medium';
    return 'low';
  };

  const getErrorMessage = () => {
    const severity = getErrorSeverity();
    
    switch (severity) {
      case 'high':
        return 'This page encountered an unexpected error and cannot be displayed.';
      case 'medium':
        return 'This section is temporarily unavailable due to an error.';
      default:
        return 'This component failed to load properly.';
    }
  };

  const getErrorTitle = () => {
    const severity = getErrorSeverity();
    
    switch (severity) {
      case 'high':
        return 'Page Error';
      case 'medium':
        return 'Section Error';
      default:
        return 'Component Error';
    }
  };

  const cardClass = level === 'page' 
    ? 'min-h-screen flex items-center justify-center p-4' 
    : level === 'section'
    ? 'min-h-[400px] flex items-center justify-center p-4'
    : 'min-h-[200px] flex items-center justify-center p-4';

  return (
    <div className={cardClass}>
      <Card className="max-w-lg w-full p-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            {getErrorTitle()}
          </h3>
          
          <p className="text-red-600 dark:text-red-400 mb-4">
            {getErrorMessage()}
          </p>

          {retryCount > 0 && (
            <p className="text-sm text-red-500 dark:text-red-400 mb-4">
              Retry attempt: {retryCount}
            </p>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                onClick={onRetry}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>

              {level === 'page' && (
                <Button
                  onClick={onNavigateHome}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              )}

              <Button
                onClick={onReport}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
              >
                <Mail className="w-4 h-4 mr-2" />
                Report
              </Button>
            </div>

            {showDetails && error && (
              <details className="text-left mt-4">
                <summary className="cursor-pointer text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Technical Details
                </summary>
                
                <div className="mt-2 p-3 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800">
                  <div className="space-y-2">
                    <div>
                      <strong className="text-xs text-red-700 dark:text-red-300">Error ID:</strong>
                      <code className="block text-xs text-red-600 dark:text-red-400 font-mono">
                        {errorId}
                      </code>
                    </div>
                    
                    <div>
                      <strong className="text-xs text-red-700 dark:text-red-300">Message:</strong>
                      <code className="block text-xs text-red-600 dark:text-red-400 font-mono">
                        {error.message}
                      </code>
                    </div>

                    {error.stack && (
                      <div>
                        <strong className="text-xs text-red-700 dark:text-red-300">Stack:</strong>
                        <pre className="text-xs text-red-600 dark:text-red-400 font-mono overflow-auto max-h-32 bg-red-50 dark:bg-red-900/50 p-2 rounded mt-1">
                          {error.stack}
                        </pre>
                      </div>
                    )}

                    {errorInfo?.componentStack && (
                      <div>
                        <strong className="text-xs text-red-700 dark:text-red-300">Component Stack:</strong>
                        <pre className="text-xs text-red-600 dark:text-red-400 font-mono overflow-auto max-h-32 bg-red-50 dark:bg-red-900/50 p-2 rounded mt-1">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// Specialized error boundaries
export function PageErrorBoundary({ children, ...props }: Omit<EnhancedErrorBoundaryProps, 'level'>) {
  return (
    <EnhancedErrorBoundary level="page" {...props}>
      {children}
    </EnhancedErrorBoundary>
  );
}

export function SectionErrorBoundary({ children, ...props }: Omit<EnhancedErrorBoundaryProps, 'level'>) {
  return (
    <EnhancedErrorBoundary level="section" {...props}>
      {children}
    </EnhancedErrorBoundary>
  );
}

export function ComponentErrorBoundary({ children, ...props }: Omit<EnhancedErrorBoundaryProps, 'level'>) {
  return (
    <EnhancedErrorBoundary level="component" {...props}>
      {children}
    </EnhancedErrorBoundary>
  );
}

// HOC for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<EnhancedErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error handling in functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
    console.error('🚨 Captured error:', error);
  }, []);

  // Throw error to be caught by error boundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}

export { EnhancedErrorBoundary };
export default EnhancedErrorBoundary;