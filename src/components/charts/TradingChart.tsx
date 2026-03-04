'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  ColorType,
  CrosshairMode,
  LineStyle,
  PriceScaleMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries
} from 'lightweight-charts';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Settings, 
  Maximize2, 
  Volume2,
  Target,
  Eye,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import styles from '../../styles/WallStreet.module.css';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradingChartProps {
  symbol?: string;
  timeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
  height?: number;
  showVolume?: boolean;
  showIndicators?: boolean;
  className?: string;
  onCrosshairMove?: (data: any) => void;
}

interface ChartIndicators {
  ma20: boolean;
  ma50: boolean;
  rsi: boolean;
  macd: boolean;
  bb: boolean;
  volume: boolean;
}

export default function TradingChart({
  symbol = 'BTCUSD',
  timeframe = '1h',
  height = 500,
  showVolume = true,
  showIndicators = true,
  className = '',
  onCrosshairMove
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [indicators, setIndicators] = useState<ChartIndicators>({
    ma20: true,
    ma50: true,
    rsi: false,
    macd: false,
    bb: false,
    volume: showVolume
  });
  const [fullscreen, setFullscreen] = useState(false);
  const [chartData, setChartData] = useState<CandleData[]>([]);

  // Configurações do gráfico estilo Wall Street
  const chartOptions = {
    layout: {
      background: { type: ColorType.Solid, color: '#000000' },
      textColor: '#00ff00',
      fontFamily: 'Courier New, monospace'
    },
    grid: {
      vertLines: { 
        color: '#1a1a1a',
        style: LineStyle.Dashed,
        visible: true
      },
      horzLines: { 
        color: '#1a1a1a',
        style: LineStyle.Dashed,
        visible: true
      }
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: '#00ff00',
        width: 1 as const,
        style: LineStyle.Dashed,
        labelBackgroundColor: '#000000'
      },
      horzLine: {
        color: '#00ff00',
        width: 1 as const,
        style: LineStyle.Dashed,
        labelBackgroundColor: '#000000'
      }
    },
    rightPriceScale: {
      borderColor: '#333333',
      textColor: '#00ff00',
      scaleMargins: {
        top: 0.1,
        bottom: showVolume ? 0.3 : 0.1
      }
    },
    timeScale: {
      borderColor: '#333333',
      textColor: '#00ff00',
      timeVisible: true,
      secondsVisible: false
    },
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
      horzTouchDrag: true,
      vertTouchDrag: true
    },
    handleScale: {
      axisPressedMouseMove: true,
      mouseWheel: true,
      pinch: true
    }
  };

  // Configurações das séries
  const candlestickOptions = {
    upColor: '#00ff00',
    downColor: '#ff0000',
    borderUpColor: '#00ff00',
    borderDownColor: '#ff0000',
    wickUpColor: '#00ff00',
    wickDownColor: '#ff0000'
  };

  const volumeOptions = {
    color: '#444444',
    priceFormat: {
      type: 'volume' as const
    },
    priceScaleId: 'volume',
  };

  // Returns empty data - real candle data should be fetched from API and passed as props.
  // FALLBACK: Replace with real market data API (e.g., Binance klines)
  const getChartData = useCallback((): CandleData[] => {
    return [];
  }, [timeframe]);

  // Calcular médias móveis
  const calculateMA = (data: CandleData[], period: number): LineData[] => {
    const ma: LineData[] = [];
    
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += data[j].close;
      }
      ma.push({
        time: data[i].time,
        value: sum / period
      });
    }
    
    return ma;
  };

  // Inicializar gráfico
  useEffect(() => {
    if (!chartContainerRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      // Criar gráfico
      chartRef.current = createChart(chartContainerRef.current, {
        ...chartOptions,
        width: chartContainerRef.current.clientWidth,
        height: fullscreen ? window.innerHeight - 100 : height
      });

      // Criar série de candlesticks
      candlestickSeriesRef.current = chartRef.current.addSeries(CandlestickSeries, candlestickOptions);

      // Criar série de volume se habilitado
      if (indicators.volume) {
        volumeSeriesRef.current = chartRef.current.addSeries(HistogramSeries, volumeOptions);
        chartRef.current.priceScale('volume').applyOptions({
          scaleMargins: { top: 0.7, bottom: 0 },
        });
      }

      // Criar médias móveis se habilitadas
      if (indicators.ma20) {
        ma20SeriesRef.current = chartRef.current.addSeries(LineSeries, {
          color: '#ffff00',
          lineWidth: 2,
          title: 'MA20'
        });
      }

      if (indicators.ma50) {
        ma50SeriesRef.current = chartRef.current.addSeries(LineSeries, {
          color: '#ff8800',
          lineWidth: 2,
          title: 'MA50'
        });
      }

      // Load and set chart data
      const data = getChartData();
      setChartData(data);

      // Convert data for lightweight-charts format
      const candleData = data.map(d => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close
      }));

      const volumeData = data.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? '#00ff0044' : '#ff000044'
      }));

      // Definir dados nas séries
      candlestickSeriesRef.current.setData(candleData);
      
      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(volumeData);
      }

      if (ma20SeriesRef.current) {
        const ma20Data = calculateMA(data, 20);
        ma20SeriesRef.current.setData(ma20Data);
      }

      if (ma50SeriesRef.current) {
        const ma50Data = calculateMA(data, 50);
        ma50SeriesRef.current.setData(ma50Data);
      }

      // Configurar crosshair
      chartRef.current.subscribeCrosshairMove((param) => {
        if (onCrosshairMove) {
          onCrosshairMove(param);
        }
      });

      // Set current price from real data if available
      if (data.length > 0) {
        const lastCandle = data[data.length - 1];
        const previousCandle = data[data.length - 2];
        setCurrentPrice(lastCandle.close);
        setPriceChange(lastCandle.close - previousCandle?.close || 0);
      } else {
        setCurrentPrice(null);
        setPriceChange(0);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Erro ao inicializar gráfico:', err);
      setError('Erro ao carregar gráfico');
      setIsLoading(false);
    }

    // Cleanup
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [timeframe, height, fullscreen, indicators, getChartData, onCrosshairMove]);

  // Redimensionar gráfico
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: fullscreen ? window.innerHeight - 100 : height
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height, fullscreen]);

  // Real-time updates disabled — requires real WebSocket/API feed
  // No fake price simulation with Math.random()
  useEffect(() => {
    if (!candlestickSeriesRef.current || !chartData.length) return;
    // TODO: Connect to real-time price WebSocket (e.g., Binance WS) for live updates
  }, [chartData]);

  const toggleIndicator = (indicator: keyof ChartIndicators) => {
    setIndicators(prev => ({
      ...prev,
      [indicator]: !prev[indicator]
    }));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  if (error) {
    return (
      <div className={`${styles.tradingCard} p-8 text-center ${className}`}>
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.tradingCard} ${className} ${fullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header do gráfico */}
      <div className={styles.cardHeader}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>{symbol} Chart</span>
            </div>
            
            {currentPrice && (
              <div className="flex items-center space-x-4">
                <div className={styles.metricValue}>
                  {formatPrice(currentPrice)}
                </div>
                <div className={`flex items-center space-x-1 ${
                  priceChange >= 0 ? styles.changePositive : styles.changeNegative
                }`}>
                  {priceChange >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{formatPrice(Math.abs(priceChange))}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Timeframe selector */}
            <select 
              value={timeframe}
              onChange={(e) => {
                // Implementar mudança de timeframe
              }}
              className="bg-gray-800 text-green-400 border border-gray-600 rounded px-2 py-1 text-sm"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
              <option value="1w">1w</option>
            </select>

            {/* Indicadores */}
            {showIndicators && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleIndicator('ma20')}
                  className={`text-xs px-2 py-1 rounded ${
                    indicators.ma20 ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  MA20
                </button>
                <button
                  onClick={() => toggleIndicator('ma50')}
                  className={`text-xs px-2 py-1 rounded ${
                    indicators.ma50 ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  MA50
                </button>
                <button
                  onClick={() => toggleIndicator('volume')}
                  className={`text-xs px-2 py-1 rounded ${
                    indicators.volume ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  <Volume2 className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Fullscreen */}
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Container do gráfico */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
            <div className="flex items-center space-x-2 text-green-400">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span>Carregando gráfico...</span>
            </div>
          </div>
        )}
        
        <div
          ref={chartContainerRef}
          className="w-full"
          style={{ height: fullscreen ? 'calc(100vh - 100px)' : height }}
        />

        {/* Empty data overlay */}
        {!isLoading && chartData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-10">
            <div className="text-center text-gray-400">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-mono">No data available</p>
              <p className="text-sm mt-1">Waiting for real market data from API</p>
            </div>
          </div>
        )}
        
        {/* Scan line effect */}
        <div className={styles.scanLine}></div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between p-3 border-t border-gray-700 text-xs">
        <div className="flex items-center space-x-4">
          <div className={styles.connectionStatus}>
            <div className={`${styles.connectionDot} ${styles.connectionDotConnected}`}></div>
            <span>REALTIME</span>
          </div>
          <span className="text-gray-400">
            Last Update: {new Date().toLocaleTimeString()}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-gray-400">TF: {timeframe.toUpperCase()}</span>
          <span className="text-gray-400">
            Candles: {chartData.length}
          </span>
        </div>
      </div>
    </div>
  );
}

export { TradingChart };