// Error Boundary Components and Utilities
// Comprehensive error handling system for CYPHER ORDI
import React from 'react';

import { ErrorBoundary, withErrorBoundary, useErrorRecovery } from './ErrorBoundary';
import { ChartErrorBoundary, withChartErrorBoundary } from './ChartErrorBoundary';
import { DashboardErrorBoundary, withDashboardErrorBoundary } from './DashboardErrorBoundary';

export { ErrorBoundary, withErrorBoundary, useErrorRecovery };
export { ChartErrorBoundary, withChartErrorBoundary };
export { DashboardErrorBoundary, withDashboardErrorBoundary };

// Error Recovery Utilities
export function createErrorRecoveryConfig(type: 'chart' | 'dashboard' | 'component') {
  const baseConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
  };

  switch (type) {
    case 'chart':
      return {
        ...baseConfig,
        showFallbackChart: true,
        autoRetry: true,
        retryDelay: 500,
      };
    
    case 'dashboard':
      return {
        ...baseConfig,
        critical: false,
        fallbackMode: 'safe' as const,
        showSystemStatus: true,
        maxRetries: 5,
      };
    
    default:
      return baseConfig;
  }
}

// Global error handler for unhandled promise rejections
export function setupGlobalErrorHandling() {
  if (typeof window !== 'undefined') {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Report to error tracking
      if (process.env.NODE_ENV === 'production' && (window as any).Sentry) {
        (window as any).Sentry.captureException(event.reason, {
          tags: { source: 'unhandled-rejection' }
        });
      }
      
      // Prevent the default browser error handling
      event.preventDefault();
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      
      // Report to error tracking
      if (process.env.NODE_ENV === 'production' && (window as any).Sentry) {
        (window as any).Sentry.captureException(event.error, {
          tags: { source: 'global-error' }
        });
      }
    });

    // Handle React error boundary fallbacks
    window.addEventListener('react-error-boundary', (event: any) => {
      console.error('React Error Boundary triggered:', event.detail);
      
      // Report to error tracking
      if (process.env.NODE_ENV === 'production' && (window as any).Sentry) {
        (window as any).Sentry.captureException(event.detail.error, {
          contexts: {
            react: {
              componentStack: event.detail.errorInfo?.componentStack,
            },
          },
          tags: { source: 'react-error-boundary' }
        });
      }
    });
  }
}

// Error boundary decorator for class components
export function errorBoundary(config?: {
  fallback?: React.ComponentType<any>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'app' | 'page' | 'component';
}) {
  return function <T extends React.ComponentClass<any>>(target: T): T {
    const WrappedComponent = withErrorBoundary(target, config as any);
    return WrappedComponent as any;
  };
}

// Chart error boundary decorator
export function chartErrorBoundary(config?: {
  chartType?: string;
  dataSource?: string;
  fallbackData?: any[];
  showFallbackChart?: boolean;
}) {
  return function <T extends React.ComponentClass<any>>(target: T): T {
    const WrappedComponent = withChartErrorBoundary(target, config as any);
    return WrappedComponent as any;
  };
}

// Dashboard error boundary decorator
export function dashboardErrorBoundary(config?: {
  section?: string;
  critical?: boolean;
  fallbackMode?: 'minimal' | 'safe' | 'offline';
  showSystemStatus?: boolean;
}) {
  return function <T extends React.ComponentClass<any>>(target: T): T {
    const WrappedComponent = withDashboardErrorBoundary(target, config as any);
    return WrappedComponent as any;
  };
}