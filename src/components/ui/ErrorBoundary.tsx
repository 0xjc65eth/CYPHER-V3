'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Bug, Home, ChevronDown } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';
import Link from 'next/link';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void; errorId?: string }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'app' | 'page' | 'component';
  name?: string;
}

// Error reporting service
class ErrorReporter {
  static report(error: Error, errorInfo: React.ErrorInfo, context?: string) {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Context:', context);
      console.groupEnd();
    }

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      try {
        // Send to Sentry or your error tracking service
        if (typeof window !== 'undefined' && (window as any).Sentry) {
          (window as any).Sentry.captureException(error, {
            contexts: {
              react: {
                componentStack: errorInfo.componentStack,
              },
            },
            tags: {
              errorBoundary: context || 'unknown',
            },
          });
        }
        
        // Also store locally for fallback
        const storedErrors = JSON.parse(localStorage.getItem('cypherErrors') || '[]');
        storedErrors.push(errorReport);
        // Keep only last 10 errors
        localStorage.setItem('cypherErrors', JSON.stringify(storedErrors.slice(-10)));
      } catch (reportingError) {
        console.error('Failed to report error:', reportingError);
      }
    }
  }
}

// Enhanced error fallback component
function EnhancedErrorFallback({ 
  error, 
  retry, 
  errorId,
  level = 'component',
  name 
}: { 
  error?: Error; 
  retry: () => void; 
  errorId?: string;
  level?: 'app' | 'page' | 'component';
  name?: string;
}) {
  const [showDetails, setShowDetails] = React.useState(false);
  const [reportSent, setReportSent] = React.useState(false);

  const isElementTypeError = error?.message?.includes('Element type is invalid');
  const isDashboardError = error?.stack?.includes('dashboard') || name?.toLowerCase().includes('dashboard');
  const isChartError = error?.stack?.includes('chart') || name?.toLowerCase().includes('chart');

  const getErrorTitle = () => {
    if (isElementTypeError) {
      return 'Component Loading Error';
    }
    if (isDashboardError) {
      return 'Dashboard Error';
    }
    if (isChartError) {
      return 'Chart Rendering Error';
    }
    return 'Something went wrong';
  };

  const getErrorMessage = () => {
    if (isElementTypeError) {
      return 'A component failed to load properly. This might be due to a missing import or invalid component type.';
    }
    if (isDashboardError) {
      return 'The dashboard encountered an error while loading. Your data is safe and we\'re working to fix this.';
    }
    if (isChartError) {
      return 'The chart component failed to render. This might be due to invalid data or a rendering issue.';
    }
    return error?.message || 'An unexpected error occurred while loading this component.';
  };

  const getSuggestions = () => {
    const suggestions = [];
    
    if (isElementTypeError) {
      suggestions.push('Try refreshing the page');
      suggestions.push('Check if all components are properly imported');
      suggestions.push('Verify component exports and imports');
    } else if (isDashboardError) {
      suggestions.push('Try refreshing the dashboard');
      suggestions.push('Check your internet connection');
      suggestions.push('Clear browser cache if the issue persists');
    } else if (isChartError) {
      suggestions.push('Try refreshing the chart data');
      suggestions.push('Check if the data source is available');
      suggestions.push('Verify chart configuration');
    } else {
      suggestions.push('Try refreshing the page');
      suggestions.push('Check your internet connection');
      suggestions.push('Contact support if the issue persists');
    }
    
    return suggestions;
  };

  const sendErrorReport = async () => {
    try {
      setReportSent(true);
      // In a real app, send to your error reporting service
      console.log('Error report sent:', { error, errorId, level, name });
    } catch (err) {
      console.error('Failed to send error report:', err);
    }
  };

  const getContainerClasses = () => {
    switch (level) {
      case 'app':
        return 'min-h-screen flex items-center justify-center bg-gray-950 p-4';
      case 'page':
        return 'min-h-[60vh] flex items-center justify-center p-4';
      default:
        return 'min-h-[200px] flex items-center justify-center bg-gray-900 border border-red-500/20 rounded-lg p-4';
    }
  };

  return (
    <div className={getContainerClasses()} role="alert" aria-live="assertive">
      <Card className="max-w-2xl w-full bg-gray-900 border-red-500/20">
        <div className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-500/10 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-500" aria-hidden="true" />
            </div>
          </div>
          
          <h3 className="text-xl font-semibold text-white mb-2">
            {getErrorTitle()}
          </h3>
          
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            {getErrorMessage()}
          </p>

          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <Button
              onClick={retry}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            {level === 'app' && (
              <Button asChild variant="outline">
                <Link href="/" className="text-white border-gray-600 hover:bg-gray-800">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Link>
              </Button>
            )}
            
            {!reportSent && (
              <Button
                onClick={sendErrorReport}
                variant="outline"
                className="text-white border-gray-600 hover:bg-gray-800"
              >
                <Bug className="w-4 h-4 mr-2" />
                Report Issue
              </Button>
            )}
          </div>

          {reportSent && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm">
                ✓ Error report sent. Thank you for helping us improve!
              </p>
            </div>
          )}

          {/* Suggestions */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Try these solutions:</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              {getSuggestions().map((suggestion, index) => (
                <li key={index} className="flex items-center justify-center">
                  <span className="w-1 h-1 bg-gray-600 rounded-full mr-2" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          {/* Error details toggle */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="border-t border-gray-800 pt-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center justify-center w-full text-sm text-gray-500 hover:text-gray-400 transition-colors"
              >
                <span>Error Details</span>
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${
                  showDetails ? 'rotate-180' : ''
                }`} />
              </button>
              
              {showDetails && (
                <div className="mt-3 text-left">
                  <div className="bg-gray-800 rounded p-3 mb-3">
                    <h5 className="text-xs font-medium text-gray-400 mb-1">Error Message:</h5>
                    <p className="text-xs text-red-400 font-mono">{error.message}</p>
                  </div>
                  
                  {errorId && (
                    <div className="bg-gray-800 rounded p-3 mb-3">
                      <h5 className="text-xs font-medium text-gray-400 mb-1">Error ID:</h5>
                      <p className="text-xs text-gray-300 font-mono">{errorId}</p>
                    </div>
                  )}
                  
                  <div className="bg-gray-800 rounded p-3">
                    <h5 className="text-xs font-medium text-gray-400 mb-1">Stack Trace:</h5>
                    <pre className="text-xs text-red-400 overflow-auto max-h-32 font-mono whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const context = `${this.props.level || 'component'}_${this.props.name || 'unknown'}`;
    
    this.setState({
      error,
      errorInfo
    });

    // Report error
    ErrorReporter.report(error, errorInfo, context);

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    // Add a small delay to prevent immediate re-error
    this.retryTimeoutId = window.setTimeout(() => {
      this.setState({ 
        hasError: false, 
        error: undefined, 
        errorInfo: undefined,
        errorId: undefined
      });
    }, 100);
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || EnhancedErrorFallback;
      
      return (
        <FallbackComponent 
          error={this.state.error} 
          retry={this.handleRetry}
          errorId={this.state.errorId}
          level={this.props.level}
          name={this.props.name}
        />
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ComponentType<{ error?: Error; retry: () => void; errorId?: string }>;
    level?: 'app' | 'page' | 'component';
    name?: string;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  }
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary 
      fallback={options?.fallback}
      level={options?.level || 'component'}
      name={options?.name || Component.displayName || Component.name}
      onError={options?.onError}
    >
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Error recovery hook
export function useErrorRecovery() {
  const [retryCount, setRetryCount] = React.useState(0);
  const [lastError, setLastError] = React.useState<Error | null>(null);

  const reportError = React.useCallback((error: Error, context?: string) => {
    setLastError(error);
    console.error(`Error in ${context}:`, error);
    
    // Report to error tracking service
    if (process.env.NODE_ENV === 'production') {
      try {
        if (typeof window !== 'undefined' && (window as any).Sentry) {
          (window as any).Sentry.captureException(error, {
            tags: { context: context || 'unknown' }
          });
        }
      } catch (reportingError) {
        console.error('Failed to report error:', reportingError);
      }
    }
  }, []);

  const retry = React.useCallback(() => {
    setRetryCount(prev => prev + 1);
    setLastError(null);
  }, []);

  const reset = React.useCallback(() => {
    setRetryCount(0);
    setLastError(null);
  }, []);

  return { retryCount, lastError, reportError, retry, reset };
}

export default ErrorBoundary;