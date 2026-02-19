'use client';

import React from 'react';
import { 
  Gauge, RefreshCw, AlertTriangle, Home, Settings, 
  Activity, Database, Wifi, WifiOff, Shield,
  ChevronDown, RotateCcw, Terminal
} from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import { Button } from './button';
import { Card } from './card';
import Link from 'next/link';

interface DashboardErrorBoundaryProps {
  children: React.ReactNode;
  section?: string;
  critical?: boolean;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  fallbackMode?: 'minimal' | 'safe' | 'offline';
  showSystemStatus?: boolean;
}

// System status check
function useSystemStatus() {
  const [status, setStatus] = React.useState({
    online: true,
    api: 'checking',
    database: 'checking',
    wallet: 'checking',
  });

  React.useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const checkStatus = async () => {
      try {
        setStatus(prev => ({ ...prev, api: 'checking' }));
        
        // Check API status
        const apiResponse = await fetch('/api/health/', { 
          method: 'GET',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        });
        
        setStatus(prev => ({ 
          ...prev, 
          api: apiResponse.ok ? 'healthy' : 'error',
          database: apiResponse.ok ? 'healthy' : 'error'
        }));
      } catch (error) {
        setStatus(prev => ({ 
          ...prev, 
          api: 'error',
          database: 'error'
        }));
      }

      // Check wallet status
      try {
        const hasWallet = typeof window !== 'undefined' && 
          (window as any).unisat || 
          (window as any).xverse || 
          (window as any).okxwallet;
        
        setStatus(prev => ({ 
          ...prev, 
          wallet: hasWallet ? 'healthy' : 'unavailable'
        }));
      } catch (error) {
        setStatus(prev => ({ ...prev, wallet: 'error' }));
      }
    };

    // Initial check
    checkStatus();

    // Periodic checks
    timeoutId = setTimeout(() => {
      checkStatus();
    }, 10000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  React.useEffect(() => {
    const handleOnline = () => setStatus(prev => ({ ...prev, online: true }));
    const handleOffline = () => setStatus(prev => ({ ...prev, online: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setStatus(prev => ({ ...prev, online: navigator.onLine }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}

// Minimal dashboard fallback
function MinimalDashboard() {
  const systemStatus = useSystemStatus();

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <Terminal className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">CYPHER ORDI - Safe Mode</h2>
        <p className="text-gray-400">Core functions are available while we resolve issues</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bitcoin Price */}
        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded">
              <Activity className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Bitcoin Price</p>
              <p className="text-lg font-semibold text-white">$--,---</p>
            </div>
          </div>
        </Card>

        {/* System Status */}
        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded">
              <Database className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">System Status</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  systemStatus.online ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <p className="text-sm text-white">
                  {systemStatus.online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded">
              <Settings className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Quick Actions</p>
              <p className="text-sm text-white">Available</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-500 mb-4">
          Basic functionality is maintained. Full features will return shortly.
        </p>
        <Button asChild>
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}

// Dashboard-specific error fallback
function DashboardErrorFallback({ 
  error, 
  retry, 
  section,
  critical,
  fallbackMode,
  showSystemStatus
}: { 
  error?: Error; 
  retry: () => void;
  section?: string;
  critical?: boolean;
  fallbackMode?: 'minimal' | 'safe' | 'offline';
  showSystemStatus?: boolean;
}) {
  const [showDetails, setShowDetails] = React.useState(false);
  const [retryAttempts, setRetryAttempts] = React.useState(0);
  const [autoRetrying, setAutoRetrying] = React.useState(false);
  const systemStatus = useSystemStatus();

  const isDashboardCritical = critical || error?.message?.includes('critical');
  const isDataError = error?.message?.includes('data') || error?.message?.includes('fetch');
  const isRenderError = error?.message?.includes('render') || error?.message?.includes('Element type');

  const getErrorSeverity = () => {
    if (isDashboardCritical) return 'critical';
    if (isDataError) return 'warning';
    return 'error';
  };

  const getErrorTitle = () => {
    if (isDashboardCritical) return 'Critical Dashboard Error';
    if (isDataError) return 'Dashboard Data Error';
    if (isRenderError) return 'Dashboard Rendering Error';
    return `Dashboard Error${section ? ` - ${section}` : ''}`;
  };

  const getErrorMessage = () => {
    if (isDashboardCritical) {
      return 'A critical error has occurred in the dashboard. Your data is safe, but some features may be temporarily unavailable.';
    }
    if (isDataError) {
      return 'Failed to load dashboard data. This may be due to network issues or server problems.';
    }
    if (isRenderError) {
      return 'The dashboard component failed to render properly. This might be due to a component loading issue.';
    }
    return error?.message || 'An unexpected error occurred in the dashboard.';
  };

  const handleRetry = () => {
    setRetryAttempts(prev => prev + 1);
    retry();
  };

  const handleAutoRetry = React.useCallback(() => {
    if (retryAttempts < 3 && isDataError) {
      setAutoRetrying(true);
      setTimeout(() => {
        setAutoRetrying(false);
        handleRetry();
      }, 2000 + (retryAttempts * 1000)); // Progressive delay
    }
  }, [retryAttempts, isDataError, retry]);

  React.useEffect(() => {
    if (isDataError && retryAttempts === 0) {
      handleAutoRetry();
    }
  }, [isDataError, retryAttempts, handleAutoRetry]);

  const severity = getErrorSeverity();

  // Show minimal dashboard for critical errors
  if (fallbackMode === 'minimal' || (isDashboardCritical && retryAttempts > 2)) {
    return <MinimalDashboard />;
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className={`max-w-2xl w-full ${
        severity === 'critical' ? 'bg-red-950 border-red-800' :
        severity === 'warning' ? 'bg-yellow-950 border-yellow-800' :
        'bg-gray-900 border-gray-700'
      }`}>
        <div className="p-6">
          {/* Error Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className={`p-3 rounded-full ${
              severity === 'critical' ? 'bg-red-500/10' :
              severity === 'warning' ? 'bg-yellow-500/10' :
              'bg-gray-500/10'
            }`}>
              <AlertTriangle className={`w-8 h-8 ${
                severity === 'critical' ? 'text-red-500' :
                severity === 'warning' ? 'text-yellow-500' :
                'text-gray-500'
              }`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                {getErrorTitle()}
              </h3>
              <p className="text-gray-400 mb-4">
                {getErrorMessage()}
              </p>
              
              {retryAttempts > 0 && (
                <div className="flex items-center gap-2 text-sm text-yellow-400">
                  <RotateCcw className="w-4 h-4" />
                  <span>Retry attempts: {retryAttempts}/3</span>
                </div>
              )}
            </div>
          </div>

          {/* System Status */}
          {showSystemStatus && (
            <div className="mb-6 p-4 bg-gray-800 rounded-lg">
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                System Status
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  {systemStatus.online ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-500" />
                  )}
                  <span className={systemStatus.online ? 'text-green-400' : 'text-red-400'}>
                    Network
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className={`w-4 h-4 ${
                    systemStatus.api === 'healthy' ? 'text-green-500' :
                    systemStatus.api === 'checking' ? 'text-yellow-500' :
                    'text-red-500'
                  }`} />
                  <span className={
                    systemStatus.api === 'healthy' ? 'text-green-400' :
                    systemStatus.api === 'checking' ? 'text-yellow-400' :
                    'text-red-400'
                  }>
                    API
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className={`w-4 h-4 ${
                    systemStatus.wallet === 'healthy' ? 'text-green-500' :
                    systemStatus.wallet === 'unavailable' ? 'text-yellow-500' :
                    'text-red-500'
                  }`} />
                  <span className={
                    systemStatus.wallet === 'healthy' ? 'text-green-400' :
                    systemStatus.wallet === 'unavailable' ? 'text-yellow-400' :
                    'text-red-400'
                  }>
                    Wallet
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  <span className="text-green-400">Core</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              onClick={handleRetry}
              disabled={autoRetrying}
              className={`${
                severity === 'critical' ? 'bg-red-600 hover:bg-red-700' :
                'bg-orange-600 hover:bg-orange-700'
              } text-white`}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRetrying ? 'animate-spin' : ''}`} />
              {autoRetrying ? 'Auto Retrying...' : 'Retry Dashboard'}
            </Button>
            
            <Button asChild variant="outline" className="text-white border-gray-600 hover:bg-gray-800">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Link>
            </Button>

            {isDashboardCritical && (
              <Button 
                onClick={() => window.location.href = '/?safe=true'}
                variant="outline"
                className="text-yellow-400 border-yellow-600 hover:bg-yellow-900/20"
              >
                <Shield className="w-4 h-4 mr-2" />
                Safe Mode
              </Button>
            )}
          </div>

          {/* Recovery Suggestions */}
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <h4 className="text-sm font-medium text-white mb-2">Try these solutions:</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li className="flex items-center">
                <span className="w-1 h-1 bg-gray-600 rounded-full mr-2" />
                Refresh the page or clear browser cache
              </li>
              <li className="flex items-center">
                <span className="w-1 h-1 bg-gray-600 rounded-full mr-2" />
                Check your internet connection
              </li>
              <li className="flex items-center">
                <span className="w-1 h-1 bg-gray-600 rounded-full mr-2" />
                Try disconnecting and reconnecting your wallet
              </li>
              <li className="flex items-center">
                <span className="w-1 h-1 bg-gray-600 rounded-full mr-2" />
                Switch to safe mode if issues persist
              </li>
            </ul>
          </div>

          {/* Error Details (Development) */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="border-t border-gray-800 pt-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center justify-between w-full text-sm text-gray-500 hover:text-gray-400 transition-colors"
              >
                <span>Technical Details</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${
                  showDetails ? 'rotate-180' : ''
                }`} />
              </button>
              
              {showDetails && (
                <div className="mt-3 space-y-3">
                  <div className="bg-gray-800 rounded p-3">
                    <h5 className="text-xs font-medium text-gray-400 mb-1">Section:</h5>
                    <p className="text-xs text-gray-300">{section || 'Unknown'}</p>
                  </div>
                  <div className="bg-gray-800 rounded p-3">
                    <h5 className="text-xs font-medium text-gray-400 mb-1">Error Message:</h5>
                    <p className="text-xs text-red-400 font-mono">{error.message}</p>
                  </div>
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

export function DashboardErrorBoundary({ 
  children, 
  section,
  critical = false,
  onError,
  fallbackMode = 'safe',
  showSystemStatus = true
}: DashboardErrorBoundaryProps) {
  const dashboardErrorHandler = React.useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    // Log dashboard-specific error
    console.group('🎛️ Dashboard Error Boundary');
    console.error('Section:', section);
    console.error('Critical:', critical);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.groupEnd();

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Report to error tracking with dashboard context
    if (process.env.NODE_ENV === 'production') {
      try {
        if (typeof window !== 'undefined' && (window as any).Sentry) {
          (window as any).Sentry.captureException(error, {
            contexts: {
              dashboard: {
                section,
                critical,
                fallbackMode,
                componentStack: errorInfo.componentStack,
              },
            },
            tags: {
              errorBoundary: 'dashboard',
              section: section || 'unknown',
              critical: critical.toString(),
            },
            level: critical ? 'error' : 'warning',
          });
        }
      } catch (reportingError) {
        console.error('Failed to report dashboard error:', reportingError);
      }
    }
  }, [section, critical, onError, fallbackMode]);

  return (
    <ErrorBoundary
      name={`Dashboard_${section || 'Unknown'}`}
      level="page"
      onError={dashboardErrorHandler}
      fallback={(props) => (
        <DashboardErrorFallback 
          {...props}
          section={section}
          critical={critical}
          fallbackMode={fallbackMode}
          showSystemStatus={showSystemStatus}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// HOC for wrapping dashboard sections
export function withDashboardErrorBoundary<P extends object>(
  DashboardComponent: React.ComponentType<P>,
  options?: {
    section?: string;
    critical?: boolean;
    fallbackMode?: 'minimal' | 'safe' | 'offline';
    showSystemStatus?: boolean;
  }
) {
  const WrappedDashboard = (props: P) => (
    <DashboardErrorBoundary
      section={options?.section || DashboardComponent.displayName || DashboardComponent.name}
      critical={options?.critical}
      fallbackMode={options?.fallbackMode}
      showSystemStatus={options?.showSystemStatus}
    >
      <DashboardComponent {...props} />
    </DashboardErrorBoundary>
  );

  WrappedDashboard.displayName = `withDashboardErrorBoundary(${DashboardComponent.displayName || DashboardComponent.name})`;
  
  return WrappedDashboard;
}

export default DashboardErrorBoundary;