'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Monitor, 
  Zap, 
  Database, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Circle
} from 'lucide-react';
import { cacheManager } from '@/lib/cache/performance-cache';

interface PerformanceMetrics {
  // Core Web Vitals
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  FCP?: number; // First Contentful Paint
  TTFB?: number; // Time to First Byte

  // Custom metrics
  renderTime: number;
  apiResponseTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  componentLoadTime: number;
  
  // Bundle metrics
  bundleSize: number;
  initialLoadTime: number;
  
  // Network metrics
  networkLatency: number;
  downloadSpeed: number;
}

interface ComponentPerformance {
  name: string;
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  memoryImpact: number;
  isOptimized: boolean;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [componentMetrics, setComponentMetrics] = useState<ComponentPerformance[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [alertLevel, setAlertLevel] = useState<'good' | 'needs-improvement' | 'poor'>('good');

  const collectMetrics = useCallback(async () => {
    const performance = window.performance;
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    // Core Web Vitals (simplified collection)
    const LCP = await getLCP();
    const FID = await getFID();
    const CLS = await getCLS();
    
    // Custom metrics
    const cacheMetrics = cacheManager.getAllMetrics();
    const memoryInfo = (performance as any).memory;
    
    const newMetrics: PerformanceMetrics = {
      LCP,
      FID,
      CLS,
      FCP: navigation.loadEventEnd - navigation.fetchStart,
      TTFB: navigation.responseStart - navigation.fetchStart,
      renderTime: performance.now(),
      apiResponseTime: calculateAverageApiResponseTime(),
      cacheHitRate: calculateCacheHitRate(cacheMetrics),
      memoryUsage: memoryInfo ? memoryInfo.usedJSHeapSize / 1024 / 1024 : 0,
      componentLoadTime: calculateComponentLoadTime(),
      bundleSize: await getBundleSize(),
      initialLoadTime: navigation.loadEventEnd - navigation.fetchStart,
      networkLatency: navigation.responseStart - navigation.requestStart,
      downloadSpeed: calculateDownloadSpeed(navigation)
    };

    setMetrics(newMetrics);
    
    // Update alert level based on performance
    setAlertLevel(calculateAlertLevel(newMetrics));
    
    // Collect component-specific metrics
    collectComponentMetrics();
  }, []);

  const collectComponentMetrics = useCallback(() => {
    // This would collect metrics from React DevTools or custom instrumentation
    const mockComponentMetrics: ComponentPerformance[] = [
      {
        name: 'BloombergDashboard',
        renderCount: 15,
        averageRenderTime: 45.2,
        lastRenderTime: 42.1,
        memoryImpact: 2.3,
        isOptimized: true
      },
      {
        name: 'BloombergProfessionalChart',
        renderCount: 8,
        averageRenderTime: 125.4,
        lastRenderTime: 118.7,
        memoryImpact: 5.2,
        isOptimized: true
      }
    ];
    
    setComponentMetrics(mockComponentMetrics);
  }, []);

  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(collectMetrics, 5000); // Collect every 5 seconds
      collectMetrics(); // Initial collection
      
      return () => clearInterval(interval);
    }
  }, [isMonitoring, collectMetrics]);

  // Performance measurement functions
  const getLCP = (): Promise<number> => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry.startTime);
        observer.disconnect();
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      
      // Fallback after 5 seconds
      setTimeout(() => resolve(0), 5000);
    });
  };

  const getFID = (): Promise<number> => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0];
        resolve(firstEntry.processingStart - firstEntry.startTime);
        observer.disconnect();
      });
      
      observer.observe({ entryTypes: ['first-input'] });
      
      // Fallback after 5 seconds
      setTimeout(() => resolve(0), 5000);
    });
  };

  const getCLS = (): Promise<number> => {
    return new Promise((resolve) => {
      let cls = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            cls += entry.value;
          }
        });
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      
      setTimeout(() => {
        observer.disconnect();
        resolve(cls);
      }, 5000);
    });
  };

  const calculateAverageApiResponseTime = (): number => {
    const apiMetrics = cacheManager.getAllMetrics();
    return Object.values(apiMetrics).reduce((avg, metric: any) => 
      avg + (metric.avgResponseTime || 0), 0) / Object.keys(apiMetrics).length;
  };

  const calculateCacheHitRate = (cacheMetrics: any): number => {
    return Object.values(cacheMetrics).reduce((rate: number, metric: any) => 
      rate + (metric.hitRate || 0), 0) / Object.keys(cacheMetrics).length;
  };

  const calculateComponentLoadTime = (): number => {
    const resourceEntries = performance.getEntriesByType('resource');
    const componentEntries = resourceEntries.filter((entry: PerformanceResourceTiming) => 
      entry.name.includes('components') || entry.name.includes('chunk')
    );
    
    return componentEntries.reduce((total, entry) => 
      total + (entry.duration || 0), 0) / componentEntries.length;
  };

  const getBundleSize = async (): Promise<number> => {
    // This would require build-time analysis or service worker
    // For now, estimate based on resource timing
    const resourceEntries = performance.getEntriesByType('resource');
    const jsEntries = resourceEntries.filter((entry: PerformanceResourceTiming) => 
      entry.name.includes('.js')
    );
    
    return jsEntries.reduce((total, entry) => total + (entry.transferSize || 0), 0) / 1024; // KB
  };

  const calculateDownloadSpeed = (navigation: PerformanceNavigationTiming): number => {
    const transferSize = navigation.transferSize || 1000000; // 1MB fallback
    const downloadTime = navigation.responseEnd - navigation.responseStart;
    return downloadTime > 0 ? (transferSize / downloadTime) * 1000 : 0; // bytes per second
  };

  const calculateAlertLevel = (metrics: PerformanceMetrics): 'good' | 'needs-improvement' | 'poor' => {
    const issues = [];
    
    if (metrics.LCP && metrics.LCP > 4000) issues.push('LCP');
    if (metrics.FID && metrics.FID > 300) issues.push('FID');
    if (metrics.CLS && metrics.CLS > 0.25) issues.push('CLS');
    if (metrics.cacheHitRate < 70) issues.push('Cache');
    if (metrics.memoryUsage > 50) issues.push('Memory');
    
    if (issues.length >= 3) return 'poor';
    if (issues.length >= 1) return 'needs-improvement';
    return 'good';
  };

  const getMetricStatus = (value: number, thresholds: { good: number; fair: number }) => {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.fair) return 'needs-improvement';
    return 'poor';
  };

  const formatBytes = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatTime = (ms: number) => {
    return `${ms.toFixed(1)}ms`;
  };

  if (!metrics && !isMonitoring) {
    return (
      <Card className="p-6 bg-gray-900 border-orange-500/30">
        <div className="text-center">
          <Monitor className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-orange-500 mb-2">Performance Monitor</h3>
          <p className="text-sm text-orange-500/60 mb-4">
            Monitor real-time application performance metrics
          </p>
          <Button
            onClick={() => setIsMonitoring(true)}
            className="bg-orange-500 hover:bg-orange-600 text-black"
          >
            <Zap className="w-4 h-4 mr-2" />
            Start Monitoring
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor className="w-6 h-6 text-orange-500" />
          <h2 className="text-xl font-bold text-orange-500">Performance Monitor</h2>
          <Badge className={`
            ${alertLevel === 'good' ? 'bg-green-500/20 text-green-400' : 
              alertLevel === 'needs-improvement' ? 'bg-yellow-500/20 text-yellow-400' : 
              'bg-red-500/20 text-red-400'}
          `}>
            {alertLevel === 'good' ? 'Good' : 
             alertLevel === 'needs-improvement' ? 'Needs Improvement' : 'Poor'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={collectMetrics}
            className="text-orange-500 hover:bg-orange-500/10"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={isMonitoring ? "default" : "ghost"}
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={isMonitoring ? "bg-orange-500 text-black" : "text-orange-500 hover:bg-orange-500/10"}
          >
            {isMonitoring ? 'Stop' : 'Start'}
          </Button>
        </div>
      </div>

      {metrics && (
        <>
          {/* Core Web Vitals */}
          <Card className="p-4 bg-gray-900 border-orange-500/30">
            <h3 className="text-sm font-bold text-orange-500 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Core Web Vitals
            </h3>
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-[10px] text-orange-500/60 mb-1">LCP</div>
                <div className={`text-sm font-bold ${
                  getMetricStatus(metrics.LCP || 0, { good: 2500, fair: 4000 }) === 'good' ? 'text-green-400' :
                  getMetricStatus(metrics.LCP || 0, { good: 2500, fair: 4000 }) === 'needs-improvement' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {formatTime(metrics.LCP || 0)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-orange-500/60 mb-1">FID</div>
                <div className={`text-sm font-bold ${
                  getMetricStatus(metrics.FID || 0, { good: 100, fair: 300 }) === 'good' ? 'text-green-400' :
                  getMetricStatus(metrics.FID || 0, { good: 100, fair: 300 }) === 'needs-improvement' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {formatTime(metrics.FID || 0)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-orange-500/60 mb-1">CLS</div>
                <div className={`text-sm font-bold ${
                  getMetricStatus(metrics.CLS || 0, { good: 0.1, fair: 0.25 }) === 'good' ? 'text-green-400' :
                  getMetricStatus(metrics.CLS || 0, { good: 0.1, fair: 0.25 }) === 'needs-improvement' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {(metrics.CLS || 0).toFixed(3)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-orange-500/60 mb-1">FCP</div>
                <div className="text-sm font-bold text-orange-500">
                  {formatTime(metrics.FCP || 0)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-orange-500/60 mb-1">TTFB</div>
                <div className="text-sm font-bold text-orange-500">
                  {formatTime(metrics.TTFB || 0)}
                </div>
              </div>
            </div>
          </Card>

          {/* Application Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 bg-gray-900 border-orange-500/30">
              <h3 className="text-sm font-bold text-orange-500 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Application Performance
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-orange-500/60 text-xs">API Response:</span>
                  <span className="text-orange-500 text-xs font-mono">
                    {formatTime(metrics.apiResponseTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-500/60 text-xs">Cache Hit Rate:</span>
                  <span className={`text-xs font-mono ${
                    metrics.cacheHitRate > 80 ? 'text-green-400' : 
                    metrics.cacheHitRate > 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {metrics.cacheHitRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-500/60 text-xs">Component Load:</span>
                  <span className="text-orange-500 text-xs font-mono">
                    {formatTime(metrics.componentLoadTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-500/60 text-xs">Bundle Size:</span>
                  <span className="text-orange-500 text-xs font-mono">
                    {(metrics.bundleSize / 1024).toFixed(1)} MB
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gray-900 border-orange-500/30">
              <h3 className="text-sm font-bold text-orange-500 mb-4 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Resource Usage
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-orange-500/60 text-xs">Memory Usage:</span>
                  <span className={`text-xs font-mono ${
                    metrics.memoryUsage > 50 ? 'text-red-400' : 
                    metrics.memoryUsage > 25 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {formatBytes(metrics.memoryUsage * 1024 * 1024)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-500/60 text-xs">Network Latency:</span>
                  <span className="text-orange-500 text-xs font-mono">
                    {formatTime(metrics.networkLatency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-500/60 text-xs">Download Speed:</span>
                  <span className="text-orange-500 text-xs font-mono">
                    {(metrics.downloadSpeed / 1024 / 1024).toFixed(1)} MB/s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-500/60 text-xs">Initial Load:</span>
                  <span className="text-orange-500 text-xs font-mono">
                    {formatTime(metrics.initialLoadTime)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Component Performance */}
          <Card className="p-4 bg-gray-900 border-orange-500/30">
            <h3 className="text-sm font-bold text-orange-500 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Component Performance
            </h3>
            <div className="space-y-2">
              {componentMetrics.map((component, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-orange-500/10">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      component.isOptimized ? 'bg-green-400' : 'bg-yellow-400'
                    }`} />
                    <span className="text-xs text-orange-500 font-mono">{component.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-orange-500/60">
                      Renders: {component.renderCount}
                    </span>
                    <span className="text-orange-500/60">
                      Avg: {formatTime(component.averageRenderTime)}
                    </span>
                    <span className="text-orange-500/60">
                      Last: {formatTime(component.lastRenderTime)}
                    </span>
                    <span className="text-orange-500/60">
                      Memory: {formatBytes(component.memoryImpact * 1024 * 1024)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default PerformanceMonitor;