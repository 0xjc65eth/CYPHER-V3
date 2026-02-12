'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, ColorType, CandlestickSeries, LineSeries, AreaSeries, HistogramSeries } from 'lightweight-charts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3,
  CandlestickChart,
  LineChart,
  DollarSign,
  Users,
  Flame
} from 'lucide-react';
import { motion } from 'framer-motion';
import { RuneMarketData } from '@/services/runes';

interface RunesProfessionalChartProps {
  selectedRune?: RuneMarketData;
  height?: number;
}

type ChartType = 'candlestick' | 'line' | 'area' | 'volume';
type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

interface PriceData {
  time: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  value?: number;
  volume?: number;
}

export default function RunesProfessionalChart({ 
  selectedRune, 
  height = 400 
}: RunesProfessionalChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick' | 'Line' | 'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1h');
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  // Generate realistic price data
  const generatePriceData = (basePrice: number, points: number): PriceData[] => {
    const data: PriceData[] = [];
    const now = Date.now();
    const interval = timeFrameToMilliseconds(timeFrame);
    
    let currentPrice = basePrice;
    
    for (let i = points - 1; i >= 0; i--) {
      const time = Math.floor((now - i * interval) / 1000);
      const volatility = 0.002; // 0.2% volatility
      const trend = Math.sin(i / 10) * 0.001; // Slight trending
      
      const change = (Math.random() - 0.5) * volatility + trend;
      currentPrice *= (1 + change);
      
      const high = currentPrice * (1 + Math.random() * volatility);
      const low = currentPrice * (1 - Math.random() * volatility);
      const open = low + Math.random() * (high - low);
      const close = low + Math.random() * (high - low);
      const volume = 10000 + Math.random() * 50000;
      
      data.push({
        time,
        open,
        high,
        low,
        close,
        value: close,
        volume
      });
    }
    
    return data;
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Add a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (!chartContainerRef.current) return;

      try {
          const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: height,
            layout: {
              background: { type: ColorType.Solid, color: '#000000' },
              textColor: '#d1d5db',
              fontSize: 12,
              fontFamily: 'Monaco, monospace'
            },
            grid: {
              vertLines: { color: '#1f2937', style: 1 },
              horzLines: { color: '#1f2937', style: 1 }
            },
            crosshair: {
              mode: 1,
              vertLine: {
                width: 1,
                color: '#fb923c',
                style: 2,
                labelBackgroundColor: '#fb923c'
              },
              horzLine: {
                width: 1,
                color: '#fb923c',
                style: 2,
                labelBackgroundColor: '#fb923c'
              }
            },
            rightPriceScale: {
              borderColor: '#1f2937',
              scaleMargins: {
                top: 0.1,
                bottom: 0.2
              }
            },
            timeScale: {
              borderColor: '#1f2937',
              timeVisible: true,
              secondsVisible: false,
              tickMarkFormatter: (time: number) => {
                const date = new Date(time * 1000);
                if (timeFrame === '1m' || timeFrame === '5m' || timeFrame === '15m') {
                  return date.toLocaleTimeString();
                }
                return date.toLocaleDateString();
              }
            }
          });

          chartRef.current = chart;

          // Handle resize
          const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
              chartRef.current.applyOptions({
                width: chartContainerRef.current.clientWidth
              });
            }
          };

          window.addEventListener('resize', handleResize);

          // Cleanup function
          return () => {
            window.removeEventListener('resize', handleResize);
            if (chart) {
              chart.remove();
            }
          };
        } catch (error) {
          console.error('Error creating chart:', error);
          setChartError(`Chart initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }, 100); // Small delay

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }, [height, timeFrame]);

  // Update chart data
  useEffect(() => {
    if (!chartRef.current || !selectedRune) return;

    setIsLoading(true);
    
    // Clear existing series
    if (seriesRef.current) {
      try {
        chartRef.current.removeSeries(seriesRef.current);
        seriesRef.current = null;
      } catch (error) {
        console.warn('Error removing price series:', error);
      }
    }
    if (volumeSeriesRef.current) {
      try {
        chartRef.current.removeSeries(volumeSeriesRef.current);
        volumeSeriesRef.current = null;
      } catch (error) {
        console.warn('Error removing volume series:', error);
      }
    }

    // Generate new data
    const data = generatePriceData(selectedRune.price.current, 100);
    setPriceData(data);

    try {
      // Add price series based on chart type
      switch (chartType) {
        case 'candlestick':
          if (chartRef.current) {
            seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
              upColor: '#10b981',
              downColor: '#ef4444',
              borderUpColor: '#10b981',
              borderDownColor: '#ef4444',
              wickUpColor: '#10b981',
              wickDownColor: '#ef4444'
            });
            seriesRef.current.setData(data);
          }
          break;

        case 'line':
          if (chartRef.current) {
            seriesRef.current = chartRef.current.addSeries(LineSeries, {
              color: '#fb923c',
              lineWidth: 2,
              priceLineVisible: true,
              lastValueVisible: true
            });
            seriesRef.current.setData(data.map(d => ({ time: d.time, value: d.close! })));
          }
          break;

        case 'area':
          if (chartRef.current) {
            seriesRef.current = chartRef.current.addSeries(AreaSeries, {
              topColor: 'rgba(251, 146, 60, 0.4)',
              bottomColor: 'rgba(251, 146, 60, 0.0)',
              lineColor: '#fb923c',
              lineWidth: 2
            });
            seriesRef.current.setData(data.map(d => ({ time: d.time, value: d.close! })));
          }
          break;
      }

      // Add volume histogram
      if (chartType !== 'volume' && chartRef.current) {
        volumeSeriesRef.current = chartRef.current.addSeries(HistogramSeries, {
          color: '#374151',
          priceFormat: {
            type: 'volume'
          },
          priceScaleId: '',
          scaleMargins: {
            top: 0.8,
            bottom: 0
          }
        });
        volumeSeriesRef.current.setData(data.map(d => ({
          time: d.time,
          value: d.volume!,
          color: d.close! > d.open! ? '#10b98120' : '#ef444420'
        })));
      }

      if (chartRef.current && typeof chartRef.current.timeScale === 'function') {
        chartRef.current.timeScale().fitContent();
      }
    } catch (error) {
      console.error('Error updating chart:', error);
      setChartError(`Chart update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRune, chartType, timeFrame]);

  const timeFrameToMilliseconds = (tf: TimeFrame): number => {
    const map: Record<TimeFrame, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000
    };
    return map[tf];
  };

  const formatPrice = (price: number): string => {
    if (price < 0.00001) return price.toExponential(2);
    if (price < 1) return price.toFixed(8);
    return price.toFixed(2);
  };

  const latestPrice = priceData[priceData.length - 1];
  const priceChange = selectedRune?.price.change24h || 0;

  return (
    <Card className="bg-black border-gray-800">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-white">
                {selectedRune?.name || 'Select a Rune'}
              </h3>
              {selectedRune && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-mono text-orange-400">
                    ${formatPrice(selectedRune.price.current)}
                  </span>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                    priceChange >= 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                  }`}>
                    {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>{Math.abs(priceChange).toFixed(2)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Chart Type Selector */}
            <div className="flex bg-gray-900 rounded-lg p-1">
              <Button
                size="sm"
                variant={chartType === 'candlestick' ? 'default' : 'ghost'}
                className="px-2 py-1 h-7"
                onClick={() => setChartType('candlestick')}
              >
                <CandlestickChart className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={chartType === 'line' ? 'default' : 'ghost'}
                className="px-2 py-1 h-7"
                onClick={() => setChartType('line')}
              >
                <LineChart className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={chartType === 'area' ? 'default' : 'ghost'}
                className="px-2 py-1 h-7"
                onClick={() => setChartType('area')}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>

            {/* Time Frame Selector */}
            <Select value={timeFrame} onValueChange={(value: TimeFrame) => setTimeFrame(value)}>
              <SelectTrigger className="w-20 h-8 bg-gray-900 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1m</SelectItem>
                <SelectItem value="5m">5m</SelectItem>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="4h">4h</SelectItem>
                <SelectItem value="1d">1D</SelectItem>
                <SelectItem value="1w">1W</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Market Stats */}
        {selectedRune && (
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-900 rounded-lg p-2">
              <div className="flex items-center gap-1 text-gray-400 text-xs">
                <DollarSign className="h-3 w-3" />
                <span>Market Cap</span>
              </div>
              <p className="text-white font-mono mt-1">
                ${(selectedRune.marketCap.current / 1e6).toFixed(2)}M
              </p>
            </div>
            <div className="bg-gray-900 rounded-lg p-2">
              <div className="flex items-center gap-1 text-gray-400 text-xs">
                <Activity className="h-3 w-3" />
                <span>24h Volume</span>
              </div>
              <p className="text-white font-mono mt-1">
                ${(selectedRune.volume.volume24h / 1e3).toFixed(2)}K
              </p>
            </div>
            <div className="bg-gray-900 rounded-lg p-2">
              <div className="flex items-center gap-1 text-gray-400 text-xs">
                <Users className="h-3 w-3" />
                <span>Holders</span>
              </div>
              <p className="text-white font-mono mt-1">
                {selectedRune.holders.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-900 rounded-lg p-2">
              <div className="flex items-center gap-1 text-gray-400 text-xs">
                <Flame className="h-3 w-3" />
                <span>Minted</span>
              </div>
              <p className="text-white font-mono mt-1">
                {selectedRune.minting.progress.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Activity className="h-8 w-8 text-orange-400" />
              </motion.div>
            </div>
          )}
          
          {chartError ? (
            <div className="h-96 flex items-center justify-center bg-gray-900/50 rounded-lg m-4">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Chart Temporarily Unavailable</h3>
                <p className="text-gray-400 text-sm mb-4">Professional chart is loading. Using fallback display.</p>
                {selectedRune && (
                  <div className="bg-black border border-gray-700 rounded-lg p-4 max-w-md mx-auto">
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div>
                        <p className="text-gray-400 text-xs">Current Price</p>
                        <p className="text-orange-400 text-xl font-mono">${formatPrice(selectedRune.price.current)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">24h Change</p>
                        <p className={`text-lg font-mono ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Volume 24h</p>
                        <p className="text-white text-lg font-mono">${(selectedRune.volume.volume24h / 1e3).toFixed(2)}K</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Market Cap</p>
                        <p className="text-white text-lg font-mono">${(selectedRune.marketCap.current / 1e6).toFixed(2)}M</p>
                      </div>
                    </div>
                  </div>
                )}
                <Button 
                  onClick={() => window.location.reload()} 
                  className="mt-4 bg-orange-600 hover:bg-orange-700"
                  size="sm"
                >
                  Reload Chart
                </Button>
              </div>
            </div>
          ) : (
            <div ref={chartContainerRef} className="w-full" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}