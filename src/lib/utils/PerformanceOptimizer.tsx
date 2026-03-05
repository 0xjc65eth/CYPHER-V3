'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface PerformanceMetrics {
  navigationTiming: any;
  renderTime: number;
  componentCount: number;
  memoryUsage: any;
}

// Hook para monitorar performance
export function usePerformanceMonitor(componentName: string) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [renderStart] = useState(performance.now());

  useEffect(() => {
    const renderEnd = performance.now();
    const renderTime = renderEnd - renderStart;

    // Coleta métricas de performance
    const collectMetrics = () => {
      const navigationTiming = performance.getEntriesByType('navigation')[0];
      const memoryInfo = (performance as any).memory;

      setMetrics({
        navigationTiming,
        renderTime,
        componentCount: document.querySelectorAll('*').length,
        memoryUsage: memoryInfo ? {
          usedJSHeapSize: memoryInfo.usedJSHeapSize,
          totalJSHeapSize: memoryInfo.totalJSHeapSize,
          jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit
        } : null
      });

      // Performance metrics collected
    };

    // Aguardar próximo frame para métricas mais precisas
    requestAnimationFrame(collectMetrics);
  }, [componentName, renderStart]);

  return metrics;
}

// Componente para otimização de renderização
interface OptimizedContainerProps {
  children: React.ReactNode;
  threshold?: number;
  fallback?: React.ReactNode;
  name: string;
}

export function OptimizedContainer({ 
  children, 
  threshold = 100,
  fallback = <div className="animate-pulse bg-gray-800 h-32 rounded"></div>,
  name
}: OptimizedContainerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  usePerformanceMonitor(name);

  // Intersection Observer para lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Delay para evitar render em rajada
          setTimeout(() => setIsReady(true), threshold);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={containerRef} className="min-h-[100px]">
      {isVisible && isReady ? children : fallback}
    </div>
  );
}

// Hook para debounce de operações custosas
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook para throttle de eventos
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const [ready, setReady] = useState(true);

  return useCallback(
    ((...args) => {
      if (!ready) return;

      setReady(false);
      callback(...args);
      
      setTimeout(() => {
        setReady(true);
      }, delay);
    }) as T,
    [ready, callback, delay]
  );
}

// Hook para cache de dados
export function useCache<T>(key: string, fetcher: () => Promise<T>, ttl: number = 300000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cacheKey = `cache_${key}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const now = Date.now();
        
        if (now - parsed.timestamp < ttl) {
          setData(parsed.data);
          return;
        }
      } catch (e) {
        console.warn('Cache parse error:', e);
      }
    }

    // Buscar dados frescos
    setLoading(true);
    fetcher()
      .then(result => {
        setData(result);
        setError(null);
        
        // Salvar no cache
        localStorage.setItem(cacheKey, JSON.stringify({
          data: result,
          timestamp: Date.now()
        }));
      })
      .catch(err => {
        setError(err.message);
        console.error(`Cache fetch error for ${key}:`, err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [key, ttl]);

  return { data, loading, error };
}

// Componente para mostrar métricas de performance em desenvolvimento
export function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const metrics = usePerformanceMonitor('PerformanceMonitor');

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-purple-600 text-white p-2 rounded-full shadow-lg hover:bg-purple-700"
        title="Performance Metrics"
      >
        📊
      </button>
      
      {isVisible && metrics && (
        <div className="absolute bottom-12 right-0 bg-gray-900 border border-gray-700 rounded-lg p-4 w-80 text-sm text-white">
          <h3 className="font-bold mb-2">Performance Metrics</h3>
          <div className="space-y-1">
            <div>Render: {metrics.renderTime.toFixed(2)}ms</div>
            <div>DOM Elements: {metrics.componentCount}</div>
            {metrics.memoryUsage && (
              <div>Memory: {(metrics.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}