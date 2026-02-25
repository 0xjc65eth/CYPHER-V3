'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

interface FinalChartProps {
  symbol: string;
  interval?: string;
  height?: number;
  type?: 'line' | 'area' | 'candle';
}

interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const FinalChart: React.FC<FinalChartProps> = ({ 
  symbol, 
  interval = '1h',
  height = 400,
  type = 'area'
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isAdvancedChart, setIsAdvancedChart] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/binance/klines?symbol=${symbol}&interval=${interval}&limit=100`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        // For Recharts
        const chartData = result.data.map((item: ChartData, index: number) => ({
          time: new Date(item.time * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          price: item.close,
          high: item.high,
          low: item.low,
          open: item.open,
          volume: item.volume,
          rawTime: item.time,
          index
        }));

        setData(chartData);
        
        // Calculate current price and change
        const lastPrice = chartData[chartData.length - 1].price;
        const firstPrice = chartData[0].price;
        setCurrentPrice(lastPrice);
        setPriceChange(((lastPrice - firstPrice) / firstPrice) * 100);

        // Try to load advanced chart after data is ready
        if (!isAdvancedChart && typeof window !== 'undefined') {
          tryLoadAdvancedChart(result.data);
        }
      } else {
        throw new Error('No data received');
      }
    } catch (err) {
      console.error('Chart error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart');
    } finally {
      setLoading(false);
    }
  }, [symbol, interval, isAdvancedChart]);

  // Try to load lightweight-charts
  const tryLoadAdvancedChart = async (rawData: ChartData[]) => {
    if (!containerRef.current) return;

    try {
      const { createChart, CandlestickSeries } = await import('lightweight-charts');

      // Clear any existing content
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        
        // Create advanced chart
        const chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height: height - 80, // Account for header
          layout: {
            background: { color: '#111827' },
            textColor: '#d1d5db',
          },
          grid: {
            vertLines: { color: '#1f2937' },
            horzLines: { color: '#1f2937' },
          },
          crosshair: {
            mode: 1,
          },
          rightPriceScale: {
            borderColor: '#374151',
          },
          timeScale: {
            borderColor: '#374151',
            timeVisible: true,
            secondsVisible: false,
          },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#10b981',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',
        });

        candleSeries.setData(rawData);
        chart.timeScale().fitContent();
        
        chartInstanceRef.current = chart;
        setIsAdvancedChart(true);

        // Handle resize
        const handleResize = () => {
          if (chart && containerRef.current) {
            chart.applyOptions({
              width: containerRef.current.clientWidth,
            });
          }
        };

        window.addEventListener('resize', handleResize);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          chart.remove();
        };
      }
    } catch (err) {
      setIsAdvancedChart(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, 30000); // Update every 30s
    
    return () => {
      clearInterval(interval);
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.remove();
        } catch (e) { console.debug("[chart] Error:", (e as Error).message); }
      }
    };
  }, [fetchData]);

  const formatPrice = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    if (value >= 1) return `$${value.toFixed(2)}`;
    return `$${value.toFixed(6)}`;
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <div className="flex items-center justify-center" style={{ height }}>
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-2" />
          <span className="text-gray-400">Loading chart...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <div className="flex flex-col items-center justify-center" style={{ height }}>
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {symbol.replace('USDT', '/USDT')}
            </h3>
            <p className="text-sm text-gray-400">{interval} Interval</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">
              {formatPrice(currentPrice)}
            </p>
            <p className={`text-sm flex items-center justify-end gap-1 ${
              priceChange >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {priceChange >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        {isAdvancedChart ? (
          <div ref={containerRef} style={{ height: height - 80 }} />
        ) : (
          <ResponsiveContainer width="100%" height={height - 80}>
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                tickFormatter={formatPrice}
                domain={['dataMin - 100', 'dataMax + 100']}
              />
              <Tooltip 
                formatter={(value: any) => formatPrice(value)}
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-400">High</p>
            <p className="font-semibold text-white">
              {data.length > 0 ? formatPrice(Math.max(...data.map(d => d.high))) : '-'}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Low</p>
            <p className="font-semibold text-white">
              {data.length > 0 ? formatPrice(Math.min(...data.map(d => d.low))) : '-'}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Volume</p>
            <p className="font-semibold text-white">
              {data.length > 0 ? `${(data.reduce((sum, d) => sum + d.volume, 0) / 1000).toFixed(1)}K` : '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};