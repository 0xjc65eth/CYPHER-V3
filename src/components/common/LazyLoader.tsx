'use client';

import React, { Suspense, lazy, ComponentType, LazyExoticComponent } from 'react';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { LoadingStates } from '@/components/ui/LoadingStates';
import { DashboardSkeleton } from '@/components/ui/skeletons/DashboardSkeleton';
import { ChartSkeleton } from '@/components/ui/skeletons/ChartSkeleton';

interface LazyLoaderProps {
  component: LazyExoticComponent<ComponentType<any>>;
  fallback?: React.ReactNode;
  errorFallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  className?: string;
  props?: any;
}

interface LazyComponentConfig {
  loader: () => Promise<{ default: ComponentType<any> }>;
  loading?: React.ReactNode;
  error?: React.ComponentType<{ error?: Error; retry: () => void }>;
  delay?: number;
  timeout?: number;
}

// Enhanced lazy loader with error handling and better UX
export function LazyLoader({
  component: Component,
  fallback = <LoadingStates variant="spinner" size="lg" text="Loading component..." />,
  errorFallback,
  onError,
  className,
  props = {}
}: LazyLoaderProps) {
  return (
    <ErrorBoundary fallback={errorFallback} onError={onError}>
      <Suspense fallback={<div className={className}>{fallback}</div>}>
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

// Create lazy component with custom configuration
export function createLazyComponent(config: LazyComponentConfig): LazyExoticComponent<ComponentType<any>> {
  const LazyComponent = lazy(async () => {
    // Add artificial delay if specified (useful for testing)
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    // Add timeout protection
    if (config.timeout) {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Component load timeout')), config.timeout);
      });

      return Promise.race([
        config.loader(),
        timeoutPromise
      ]) as Promise<{ default: ComponentType<any> }>;
    }

    return config.loader();
  });

  return LazyComponent;
}

// Preload component for better UX
export function preloadComponent(component: LazyExoticComponent<ComponentType<any>>): void {
  // Access the _payload to trigger loading
  if ('_payload' in component && component._payload) {
    if (component._payload._status === 'pending') {
      return; // Already loading
    }
  }

  // Import the component to preload it
  try {
    const componentModule = component as any;
    if (componentModule._init) {
      componentModule._init(componentModule._payload);
    }
  } catch (error) {
  }
}

// Higher-order component for lazy loading
export function withLazyLoading<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode,
  errorFallback?: React.ComponentType<{ error?: Error; retry: () => void }>
) {
  const LazyComponent = lazy(loader);

  return function LazyWrapper(props: P) {
    return (
      <LazyLoader
        component={LazyComponent}
        fallback={fallback}
        errorFallback={errorFallback}
        props={props}
      />
    );
  };
}

// Specialized lazy loaders for different component types
export const LazyDashboard = ({
  loader,
  variant = 'bloomberg',
  ...props
}: {
  loader: () => Promise<{ default: ComponentType<any> }>;
  variant?: 'bloomberg' | 'standard' | 'professional';
  [key: string]: any;
}) => {
  const Component = createLazyComponent({
    loader,
    loading: <DashboardSkeleton variant={variant} />,
    timeout: 10000
  });

  return <LazyLoader component={Component} props={props} />;
};

export const LazyChart = ({
  loader,
  variant = 'line',
  height = 300,
  ...props
}: {
  loader: () => Promise<{ default: ComponentType<any> }>;
  variant?: 'line' | 'bar' | 'candlestick' | 'area' | 'donut';
  height?: number;
  [key: string]: any;
}) => {
  const Component = createLazyComponent({
    loader,
    loading: <ChartSkeleton variant={variant} height={height} />,
    timeout: 8000
  });

  return <LazyLoader component={Component} props={props} />;
};

export const LazyModal = ({
  loader,
  isOpen,
  ...props
}: {
  loader: () => Promise<{ default: ComponentType<any> }>;
  isOpen: boolean;
  [key: string]: any;
}) => {
  // Only load modal when it's opened
  if (!isOpen) return null;

  const Component = createLazyComponent({
    loader,
    loading: (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <LoadingStates variant="spinner" size="md" text="Loading..." />
        </div>
      </div>
    ),
    timeout: 5000
  });

  return <LazyLoader component={Component} props={props} />;
};

// Intersection Observer based lazy loading for components
export function LazyOnView({
  children,
  fallback = <div className="h-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />,
  threshold = 0.1,
  rootMargin = '50px',
  className = ''
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
}) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isIntersected, setIsIntersected] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isIntersected) {
          setIsIntersected(true);
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin, isIntersected]);

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : fallback}
    </div>
  );
}

// Lazy load images with intersection observer
export function LazyImage({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkZGRkIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+Cjwvc3ZnPg==',
  threshold = 0.1,
  ...props
}: {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  threshold?: number;
  [key: string]: any;
}) {
  const [imageSrc, setImageSrc] = React.useState(placeholder);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isError, setIsError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, threshold]);

  const handleLoad = () => {
    setIsLoaded(true);
    setIsError(false);
  };

  const handleError = () => {
    setIsError(true);
    setIsLoaded(false);
  };

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`transition-opacity duration-300 ${
        isLoaded ? 'opacity-100' : 'opacity-50'
      } ${isError ? 'bg-red-100' : ''} ${className}`}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
}

// Preload commonly used components
export const preloadCommonComponents = () => {
  // Only preload in browser
  if (typeof window === 'undefined') return;

  // Preload critical dashboard components
  import('@/components/dashboard/BloombergProfessionalChart').catch(() => {});
  import('@/components/charts/BitcoinPriceChart').catch(() => {});
  
  // Preload wallet components
  import('@/components/wallet/WalletConnector').catch(() => {});
  import('@/components/wallet/BitcoinWalletConnect').catch(() => {});
  
};

// Hook for managing lazy loading state
export function useLazyLoading() {
  const [loadedComponents, setLoadedComponents] = React.useState<Set<string>>(new Set());
  const [loadingComponents, setLoadingComponents] = React.useState<Set<string>>(new Set());
  const [failedComponents, setFailedComponents] = React.useState<Set<string>>(new Set());

  const markAsLoading = React.useCallback((componentName: string) => {
    setLoadingComponents(prev => new Set(prev).add(componentName));
  }, []);

  const markAsLoaded = React.useCallback((componentName: string) => {
    setLoadingComponents(prev => {
      const newSet = new Set(prev);
      newSet.delete(componentName);
      return newSet;
    });
    setLoadedComponents(prev => new Set(prev).add(componentName));
  }, []);

  const markAsFailed = React.useCallback((componentName: string) => {
    setLoadingComponents(prev => {
      const newSet = new Set(prev);
      newSet.delete(componentName);
      return newSet;
    });
    setFailedComponents(prev => new Set(prev).add(componentName));
  }, []);

  const retry = React.useCallback((componentName: string) => {
    setFailedComponents(prev => {
      const newSet = new Set(prev);
      newSet.delete(componentName);
      return newSet;
    });
  }, []);

  return {
    loadedComponents,
    loadingComponents,
    failedComponents,
    markAsLoading,
    markAsLoaded,
    markAsFailed,
    retry,
    isLoaded: (componentName: string) => loadedComponents.has(componentName),
    isLoading: (componentName: string) => loadingComponents.has(componentName),
    hasFailed: (componentName: string) => failedComponents.has(componentName)
  };
}

export default LazyLoader;