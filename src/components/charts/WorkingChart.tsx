'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface WorkingChartProps {
  symbol: string;
  interval?: string;
  height?: number;
}

export const WorkingChart: React.FC<WorkingChartProps> = ({ 
  symbol, 
  interval = '1h',
  height = 400 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartInstance, setChartInstance] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  useEffect(() => {
    let chart: any = null;
    let mounted = true;

    const initializeChart = async () => {
      if (!containerRef.current || !mounted) return;

      try {
        setLoading(true);
        setError(null);

        // First, fetch the data
        const response = await fetch(
          `/api/binance/klines?symbol=${symbol}&interval=${interval}&limit=100`
        );

        if (!response.ok) {
          throw new Error(`API Error: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success || !result.data || result.data.length === 0) {
          throw new Error('No data available');
        }

        // Set current price
        const lastCandle = result.data[result.data.length - 1];
        setCurrentPrice(lastCandle.close);

        // Only load lightweight-charts if we have data
        if (typeof window !== 'undefined' && mounted) {
          try {
            const { createChart, CandlestickSeries } = await import('lightweight-charts');
            
            if (!mounted || !containerRef.current) return;

            // Clear container
            containerRef.current.innerHTML = '';

            // Create chart
            chart = createChart(containerRef.current, {
              width: containerRef.current.clientWidth,
              height: height,
              layout: {
                background: { color: 'transparent' },
                textColor: '#d1d4dc',
              },
              grid: {
                vertLines: { color: '#2a2a2a' },
                horzLines: { color: '#2a2a2a' },
              },
              crosshair: {
                mode: 1,
              },
              rightPriceScale: {
                borderColor: '#2a2a2a',
              },
              timeScale: {
                borderColor: '#2a2a2a',
                timeVisible: true,
                secondsVisible: false,
              },
            });

            // Add candlestick series
            const candleSeries = chart.addSeries(CandlestickSeries, {
              upColor: '#26a69a',
              downColor: '#ef5350',
              borderVisible: false,
              wickUpColor: '#26a69a',
              wickDownColor: '#ef5350',
            });

            // Set the data
            candleSeries.setData(result.data);

            // Fit content
            chart.timeScale().fitContent();

            setChartInstance(chart);

            // Handle resize
            const handleResize = () => {
              if (chart && containerRef.current && mounted) {
                chart.applyOptions({
                  width: containerRef.current.clientWidth,
                });
              }
            };

            window.addEventListener('resize', handleResize);

            // Store cleanup function
            return () => {
              window.removeEventListener('resize', handleResize);
              if (chart) {
                chart.remove();
              }
            };
          } catch (chartError) {
            console.error('Chart library error:', chartError);
            throw new Error('Failed to load chart library');
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Chart initialization error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load chart');
          setLoading(false);
        }
      }
    };

    initializeChart();

    // Cleanup
    return () => {
      mounted = false;
      if (chart) {
        try {
          chart.remove();
        } catch (e) {
          console.error('Error removing chart:', e);
        }
      }
    };
  }, [symbol, interval, height]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-center justify-center" style={{ height }}>
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-2" />
          <span className="text-gray-400">Loading chart...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <div className="flex flex-col items-center justify-center" style={{ height }}>
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">
          {symbol.replace('USDT', '/USDT')} - {interval}
        </h3>
        {currentPrice && (
          <div className="text-right">
            <p className="text-2xl font-bold text-white">
              ${currentPrice.toLocaleString('en-US', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: currentPrice < 1 ? 6 : 2 
              })}
            </p>
          </div>
        )}
      </div>
      <div 
        ref={containerRef} 
        style={{ width: '100%', height }} 
        className="chart-container"
      />
    </div>
  );
};