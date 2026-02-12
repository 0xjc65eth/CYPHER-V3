'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  CandlestickChart,
  LineChart,
  Maximize2,
  Settings,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { createChart, IChartApi, ISeriesApi, Time, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

interface ChartData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface Indicator {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  params?: Record<string, number>;
}

type ChartType = 'candlestick' | 'line' | 'area' | 'bar';
type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

const TIME_FRAMES: { value: TimeFrame; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '5m', label: '5M' },
  { value: '15m', label: '15M' },
  { value: '30m', label: '30M' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' }
];

const INDICATORS: Indicator[] = [
  { id: 'sma', name: 'SMA', enabled: false, color: '#2962FF', params: { period: 20 } },
  { id: 'ema', name: 'EMA', enabled: false, color: '#FB8C00', params: { period: 20 } },
  { id: 'bb', name: 'Bollinger Bands', enabled: false, color: '#6A1B9A' },
  { id: 'rsi', name: 'RSI', enabled: false, color: '#00897B' },
  { id: 'macd', name: 'MACD', enabled: false, color: '#E91E63' }
];

interface TradingChartSystemProps {
  symbol?: string;
  height?: number;
  showVolume?: boolean;
  enableIndicators?: boolean;
  enableDrawing?: boolean;
  onPriceUpdate?: (price: number) => void;
}

export function TradingChartSystem({
  symbol = 'BTCUSDT',
  height = 500,
  showVolume = true,
  enableIndicators = true,
  enableDrawing = true,
  onPriceUpdate
}: TradingChartSystemProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1h');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [indicators, setIndicators] = useState(INDICATORS);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);

  // WebSocket connection for real-time data
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: '#1a1a1a' },
        textColor: '#d1d4dc'
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' }
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#4a4a4a',
          style: 0,
          labelBackgroundColor: '#2a2a2a'
        },
        horzLine: {
          width: 1,
          color: '#4a4a4a',
          style: 0,
          labelBackgroundColor: '#2a2a2a'
        }
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
        scaleMargins: {
          top: 0.1,
          bottom: showVolume ? 0.3 : 0.1
        }
      },
      timeScale: {
        borderColor: '#2a2a2a',
        timeVisible: true,
        secondsVisible: false
      }
    });

    chartRef.current = chart;

    // Create main series based on chart type
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350'
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Create volume series if enabled
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: {
          type: 'volume'
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.8,
          bottom: 0
        }
      });
      volumeSeriesRef.current = volumeSeries;
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height, showVolume]);

  // Fetch historical data
  const fetchHistoricalData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const interval = timeFrame.replace('m', 'min').replace('h', 'hour').replace('d', 'day').replace('w', 'week');
      const response = await fetch(`/api/binance/klines?symbol=${symbol}&interval=${timeFrame}&limit=500`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const data = await response.json();
      
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid data format');
      }

      const chartData: ChartData[] = data.map((candle: any) => ({
        time: (candle[0] / 1000) as Time,
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));

      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData(chartData);
      }

      if (showVolume && volumeSeriesRef.current) {
        const volumeData = chartData.map(d => ({
          time: d.time,
          value: d.volume || 0,
          color: d.close >= d.open ? '#26a69a' : '#ef5350'
        }));
        volumeSeriesRef.current.setData(volumeData);
      }

      // Calculate price change
      if (chartData.length > 1) {
        const firstPrice = chartData[0].close;
        const currentPrice = chartData[chartData.length - 1].close;
        const change = ((currentPrice - firstPrice) / firstPrice) * 100;
        setPriceChange(change);
        setLastPrice(currentPrice);
        onPriceUpdate?.(currentPrice);
      }

      // Fit content
      chartRef.current?.timeScale().fitContent();

    } catch (err) {
      console.error('Chart data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
      toast.error('Failed to load chart data');
    } finally {
      setIsLoading(false);
    }
  };

  // Setup WebSocket for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${timeFrame}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Chart WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.k) {
            const candle: ChartData = {
              time: (data.k.t / 1000) as Time,
              open: parseFloat(data.k.o),
              high: parseFloat(data.k.h),
              low: parseFloat(data.k.l),
              close: parseFloat(data.k.c),
              volume: parseFloat(data.k.v)
            };

            if (candlestickSeriesRef.current) {
              candlestickSeriesRef.current.update(candle);
            }

            if (showVolume && volumeSeriesRef.current) {
              volumeSeriesRef.current.update({
                time: candle.time,
                value: candle.volume || 0,
                color: candle.close >= candle.open ? '#26a69a' : '#ef5350'
              });
            }

            setLastPrice(candle.close);
            onPriceUpdate?.(candle.close);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Chart WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('Chart WebSocket disconnected');
        // Reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [symbol, timeFrame, showVolume, onPriceUpdate]);

  // Fetch data when symbol or timeframe changes
  useEffect(() => {
    fetchHistoricalData();
  }, [symbol, timeFrame]);

  // Toggle indicator
  const toggleIndicator = (indicatorId: string) => {
    setIndicators(prev => 
      prev.map(ind => 
        ind.id === indicatorId ? { ...ind, enabled: !ind.enabled } : ind
      )
    );
    // TODO: Implement indicator rendering
  };

  // Export chart as image
  const exportChart = () => {
    if (chartRef.current) {
      const canvas = (chartRef.current as any)._private__chartWidget._private__canvas;
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${symbol}_${timeFrame}_${Date.now()}.png`;
      a.click();
      toast.success('Chart exported successfully');
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      chartContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              {symbol}
              {lastPrice && (
                <span className={`text-sm ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              )}
            </h3>
            {lastPrice && (
              <p className="text-2xl font-bold text-white">
                ${lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chart Type Selector */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setChartType('candlestick')}
              className={`p-2 rounded ${chartType === 'candlestick' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Candlestick Chart"
            >
              <CandlestickChart className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-2 rounded ${chartType === 'line' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Line Chart"
            >
              <LineChart className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded ${chartType === 'bar' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Bar Chart"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>

          {/* Time Frame Selector */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            {TIME_FRAMES.map(tf => (
              <button
                key={tf.value}
                onClick={() => setTimeFrame(tf.value)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  timeFrame === tf.value
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {enableIndicators && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title="Indicators"
              >
                <Activity className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={fetchHistoricalData}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Refresh"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={exportChart}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Export Chart"
            >
              <Download className="w-4 h-4" />
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Indicators Panel */}
      {showSettings && enableIndicators && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-b border-gray-800 p-4"
        >
          <h4 className="text-sm font-medium text-gray-400 mb-3">Technical Indicators</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {indicators.map(indicator => (
              <label
                key={indicator.id}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={indicator.enabled}
                  onChange={() => toggleIndicator(indicator.id)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">{indicator.name}</span>
              </label>
            ))}
          </div>
        </motion.div>
      )}

      {/* Chart Container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-10">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-10">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-400">{error}</p>
              <button
                onClick={fetchHistoricalData}
                className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div 
          ref={chartContainerRef} 
          className="w-full"
          style={{ height: `${height}px` }}
        />
      </div>
    </div>
  );
}