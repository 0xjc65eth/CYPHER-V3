import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, Time, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';

interface ChartData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface EnhancedChartProps {
  symbol: string;
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  height?: number;
}

export const EnhancedChart: React.FC<EnhancedChartProps> = ({ 
  symbol, 
  interval, 
  height = 500 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPrice, setLastPrice] = useState<number | null>(null);

  // Fetch historical data
  const fetchHistoricalData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Convert interval to Binance format
      const binanceInterval = interval === '1d' ? '1d' : interval;
      const limit = 500; // Get last 500 candles

      const response = await fetch(
        `/api/binance/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }
      
      // Data is already transformed by our API
      const chartData: ChartData[] = result.data;

      return chartData;
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
      return [];
    } finally {
      setLoading(false);
    }
  }, [symbol, interval]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    let chart: IChartApi | null = null;
    let candleSeries: ISeriesApi<"Candlestick"> | null = null;
    let volumeSeries: ISeriesApi<"Histogram"> | null = null;

    const initChart = async () => {
      // Create chart
      chart = createChart(chartContainerRef.current!, {
        width: chartContainerRef.current!.clientWidth,
        height: height,
        layout: {
          background: { type: 'solid', color: '#0a0a0a' },
          textColor: '#d1d4dc',
        },
        grid: {
          vertLines: { color: 'rgba(42, 42, 42, 0.5)' },
          horzLines: { color: 'rgba(42, 42, 42, 0.5)' },
        },
        crosshair: {
          mode: 1,
          vertLine: {
            width: 1,
            color: '#9B7DFF',
            style: 3,
          },
          horzLine: {
            width: 1,
            color: '#9B7DFF',
            style: 3,
          },
        },
        rightPriceScale: {
          borderColor: '#2a2a2a',
          scaleMargins: {
            top: 0.1,
            bottom: 0.25,
          },
        },
        timeScale: {
          borderColor: '#2a2a2a',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      chartRef.current = chart;

      // Add candlestick series
      candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });

      candleSeriesRef.current = candleSeries;

      // Add volume series
      volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      volumeSeriesRef.current = volumeSeries;

      // Load historical data
      const historicalData = await fetchHistoricalData();
      
      if (historicalData.length > 0) {
        candleSeries.setData(historicalData);
        
        // Set volume data
        const volumeData = historicalData.map(candle => ({
          time: candle.time,
          value: candle.volume || 0,
          color: candle.close >= candle.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
        }));
        
        volumeSeries.setData(volumeData);
        
        // Update last price
        setLastPrice(historicalData[historicalData.length - 1].close);
      }

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      // Setup WebSocket for real-time updates
      setupWebSocket();

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    };

    const setupWebSocket = () => {
      try {
        const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected for', symbol);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const kline = data.k;
            
            const candle: ChartData = {
              time: Math.floor(kline.t / 1000) as Time,
              open: parseFloat(kline.o),
              high: parseFloat(kline.h),
              low: parseFloat(kline.l),
              close: parseFloat(kline.c),
              volume: parseFloat(kline.v),
            };

            // Update candlestick
            if (candleSeriesRef.current) {
              candleSeriesRef.current.update(candle);
            }

            // Update volume
            if (volumeSeriesRef.current) {
              volumeSeriesRef.current.update({
                time: candle.time,
                value: candle.volume || 0,
                color: candle.close >= candle.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
              });
            }

            // Update last price
            setLastPrice(candle.close);
          } catch (err) {
            console.error('Error processing WebSocket message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('Real-time connection error');
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          // Attempt to reconnect after 5 seconds
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.CLOSED) {
              setupWebSocket();
            }
          }, 5000);
        };
      } catch (err) {
        console.error('Error setting up WebSocket:', err);
        setError('Failed to connect to real-time data');
      }
    };

    initChart();

    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (chart) {
        chart.remove();
      }
    };
  }, [symbol, interval, height, fetchHistoricalData]);

  const formatPrice = (price: number): string => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(8);
  };

  const getPriceChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-400';
  };

  return (
    <Card className="p-4 bg-gray-900">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {symbol.replace('USDT', '/USDT')}
            {lastPrice && (
              <span className="text-2xl font-mono">
                ${formatPrice(lastPrice)}
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-400">Interval: {interval}</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors">
            Indicators
          </button>
          <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors">
            Full Screen
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-[500px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2">Loading chart data...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <p className="text-red-500">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Reload
            </button>
          </div>
        </div>
      )}

      <div 
        ref={chartContainerRef} 
        className="w-full" 
        style={{ display: loading || error ? 'none' : 'block' }}
      />
    </Card>
  );
};