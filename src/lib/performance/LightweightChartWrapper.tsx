/**
 * Lightweight Chart Wrapper - Optimized for performance
 */

import React, { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

interface LightweightChartProps {
  data: Array<{
    time: number;
    value: number;
  }>;
  width?: number;
  height?: number;
  options?: any;
  onChartReady?: (chart: any) => void;
}

const LightweightChartWrapper: React.FC<LightweightChartProps> = ({
  data,
  width = 600,
  height = 300,
  options = {},
  onChartReady
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initChart = async () => {
      try {
        if (!chartContainerRef.current) return;

        // Dynamic import to reduce bundle size
        const { createChart, LineSeries } = await import('lightweight-charts');
        
        if (!isMounted) return;

        const chart = createChart(chartContainerRef.current, {
          width,
          height,
          layout: {
            background: { color: '#111827' },
            textColor: '#f9fafb',
          },
          grid: {
            vertLines: { color: '#374151' },
            horzLines: { color: '#374151' },
          },
          rightPriceScale: {
            borderColor: '#374151',
          },
          timeScale: {
            borderColor: '#374151',
            timeVisible: true,
            secondsVisible: false,
          },
          ...options
        });

        const lineSeries = chart.addSeries(LineSeries, {
          color: '#f97316',
          lineWidth: 2,
        });

        // Convert data format for lightweight-charts
        const formattedData = data.map(item => ({
          time: Math.floor(item.time / 1000), // Convert to seconds
          value: item.value
        }));

        lineSeries.setData(formattedData);
        
        chartRef.current = chart;
        
        if (onChartReady) {
          onChartReady(chart);
        }

        setIsLoading(false);
        logger.debug('Lightweight chart initialized successfully');
        
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load chart');
          setIsLoading(false);
          logger.error('Failed to initialize lightweight chart:', err);
        }
      }
    };

    initChart();

    return () => {
      isMounted = false;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, width, height, options, onChartReady]);

  // Update chart when data changes
  useEffect(() => {
    if (chartRef.current && data.length > 0) {
      try {
        const series = chartRef.current.getVisibleRange();
        const formattedData = data.map(item => ({
          time: Math.floor(item.time / 1000),
          value: item.value
        }));
        
        // Update the first series (assuming single series for now)
        const allSeries = chartRef.current.getSeries();
        if (allSeries.length > 0) {
          allSeries[0].setData(formattedData);
        }
      } catch (err) {
        logger.warn('Failed to update chart data:', err);
      }
    }
  }, [data]);

  if (error) {
    return (
      <div className="bg-gray-900 border border-red-500/20 rounded p-4 text-center">
        <div className="text-red-400 text-sm">
          Chart Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 border border-orange-500/20 rounded flex items-center justify-center">
          <div className="text-orange-400 text-sm animate-pulse">
            Loading chart...
          </div>
        </div>
      )}
      <div
        ref={chartContainerRef}
        className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      />
    </div>
  );
};

export default LightweightChartWrapper;