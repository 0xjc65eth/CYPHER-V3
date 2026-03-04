'use client';

import React from 'react';
import { ChartErrorBoundary } from '@/components/ui/error-boundaries';

interface SafeChartWrapperProps {
  children: React.ReactNode;
  chartType?: string;
  dataSource?: string;
  data?: any[];
  className?: string;
  fallbackHeight?: number;
}

// Safe wrapper for all chart components to prevent "Element type is invalid" errors
export function SafeChartWrapper({
  children,
  chartType = 'Chart',
  dataSource,
  data,
  className = '',
  fallbackHeight = 200
}: SafeChartWrapperProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Generate fallback data if none provided
  const fallbackData = React.useMemo(() => {
    if (data && data.length > 0) return data;

    // Generate deterministic fallback data
    return Array.from({ length: 10 }, (_, i) => {
      const t = i / 10;
      return {
        time: Date.now() - (9 - i) * 24 * 60 * 60 * 1000,
        value: 0.5 + Math.sin(t * Math.PI * 3) * 0.15 + Math.cos(t * Math.PI * 2) * 0.1,
        price: 50000 + Math.sin(t * Math.PI * 4) * 5000 + Math.cos(t * Math.PI * 2.5) * 3000,
        volume: 500000 + Math.sin(t * Math.PI * 5) * 300000 + Math.cos(t * Math.PI * 3) * 150000,
      };
    });
  }, [data]);

  // Don't render charts on server side to prevent hydration issues
  if (!isMounted) {
    return (
      <div
        className={`bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-center ${className}`}
        style={{ height: fallbackHeight }}
      >
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-400">Loading {chartType}...</p>
        </div>
      </div>
    );
  }

  return (
    <ChartErrorBoundary
      chartType={chartType}
      dataSource={dataSource}
      fallbackData={fallbackData}
      showFallbackChart={true}
    >
      <div className={`safe-chart-container ${className}`}>
        {children}
      </div>
    </ChartErrorBoundary>
  );
}

// HOC for wrapping existing chart components
export function withSafeChart<P extends object>(
  ChartComponent: React.ComponentType<P>,
  config?: {
    chartType?: string;
    dataSource?: string;
    fallbackHeight?: number;
  }
) {
  const SafeChart = (props: P & { className?: string; data?: any[] }) => (
    <SafeChartWrapper
      chartType={config?.chartType || ChartComponent.displayName || ChartComponent.name}
      dataSource={config?.dataSource}
      data={(props as any).data}
      className={(props as any).className}
      fallbackHeight={config?.fallbackHeight}
    >
      <ChartComponent {...props} />
    </SafeChartWrapper>
  );

  SafeChart.displayName = `SafeChart(${ChartComponent.displayName || ChartComponent.name})`;

  return SafeChart;
}

export default SafeChartWrapper;
