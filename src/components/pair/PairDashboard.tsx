'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3,
  Brain,
  Target,
  Zap,
  Eye,
  Settings,
  RefreshCw,
  ExternalLink,
  MousePointer,
  Layers,
  LineChart,
  Volume2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePairDashboard } from '@/hooks/usePairData';

// Dynamic imports for charts with SSR safety
const ApexChart = dynamic(() => import('react-apexcharts'), { 
  ssr: false,
  loading: () => <div className="h-96 bg-gray-900/50 animate-pulse rounded-lg flex items-center justify-center">
    <RefreshCw className="h-8 w-8 text-orange-400 animate-spin" />
  </div>
});

const InteractiveOrderBook = dynamic(() => import('./InteractiveOrderBook'), { 
  ssr: false,
  loading: () => <div className="h-96 bg-gray-900/50 animate-pulse rounded-lg" />
});

const ClickableHeatmap = dynamic(() => import('./ClickableHeatmap'), { 
  ssr: false,
  loading: () => <div className="h-64 bg-gray-900/50 animate-pulse rounded-lg" />
});

interface Props {
  base: string;
  quote: string;
  pairId: string;
}

export default function PairDashboard({ base, quote, pairId }: Props) {
  const router = useRouter();
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [selectedIndicators, setSelectedIndicators] = useState(['RSI', 'MACD', 'BOLLINGER']);
  const [selectedCandle, setSelectedCandle] = useState<any>(null);
  const [autoTrade, setAutoTrade] = useState(false);
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('candlestick');

  // Use the comprehensive hook
  const {
    candles,
    stats,
    depth,
    technical,
    realTime,
    volume,
    trades,
    isFullyLoaded
  } = usePairDashboard(base, quote);

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
  const availableIndicators = ['RSI', 'MACD', 'BOLLINGER', 'VWAP', 'VOLUME_PROFILE'];

  // Handle candlestick click
  const handleCandleClick = useCallback((event: any, chartContext: any, config: any) => {
    if (config.dataPointIndex >= 0) {
      const candleData = candles[selectedTimeframe]?.[config.dataPointIndex];
      setSelectedCandle({
        ...candleData,
        index: config.dataPointIndex,
        timeframe: selectedTimeframe
      });
    }
  }, [candles, selectedTimeframe]);

  // Handle order book click
  const handleOrderBookClick = useCallback((price: number, side: 'buy' | 'sell') => {
    // Auto-fill trade form
    // This would integrate with a trading form
  }, []);

  // Handle pair switching
  const handlePairSwitch = useCallback((newPair: string) => {
    router.push(`/pair/${newPair}`);
  }, [router]);

  // ApexCharts configuration for candlestick with indicators
  const candlestickOptions = {
    chart: {
      id: 'pair-candlestick',
      type: 'candlestick' as const,
      height: 500,
      background: 'transparent',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      events: {
        click: handleCandleClick
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      }
    },
    title: {
      text: `${base}/${quote} - ${selectedTimeframe.toUpperCase()}`,
      style: {
        color: '#fff',
        fontSize: '18px',
        fontWeight: 'bold'
      }
    },
    xaxis: {
      type: 'datetime' as const,
      labels: {
        style: { colors: '#9CA3AF' }
      },
      axisBorder: { color: '#374151' },
      axisTicks: { color: '#374151' }
    },
    yaxis: {
      tooltip: { enabled: true },
      labels: {
        style: { colors: '#9CA3AF' },
        formatter: (value: number) => `$${value.toFixed(4)}`
      },
      axisBorder: { color: '#374151' }
    },
    grid: {
      borderColor: '#374151',
      strokeDashArray: 3
    },
    tooltip: {
      theme: 'dark',
      custom: ({ seriesIndex, dataPointIndex, w }: any) => {
        const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
        if (!data) return '';
        
        return `
          <div class="bg-gray-900 border border-gray-700 rounded-lg p-3">
            <div class="text-white font-bold">${base}/${quote}</div>
            <div class="text-sm text-gray-400">
              <div>Open: $${data.y[0]?.toFixed(4)}</div>
              <div>High: $${data.y[1]?.toFixed(4)}</div>
              <div>Low: $${data.y[2]?.toFixed(4)}</div>
              <div>Close: $${data.y[3]?.toFixed(4)}</div>
              <div>Volume: ${data.volume?.toLocaleString()}</div>
              <div class="mt-2 text-orange-400">Click for details</div>
            </div>
          </div>
        `;
      }
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#10B981',
          downward: '#EF4444'
        },
        wick: {
          useFillColor: true
        }
      }
    },
    responsive: [{
      breakpoint: 768,
      options: {
        chart: { height: 300 }
      }
    }]
  };

  // Generate series data for ApexCharts
  const candlestickSeries = [{
    name: 'Price',
    data: candles[selectedTimeframe]?.map(candle => ({
      x: candle.timestamp,
      y: [candle.open, candle.high, candle.low, candle.close],
      volume: candle.volume
    })) || []
  }];

  // RSI Options
  const rsiOptions = {
    chart: {
      id: 'rsi',
      type: 'line' as const,
      height: 150,
      background: 'transparent',
      toolbar: { show: false }
    },
    colors: ['#8B5CF6'],
    xaxis: {
      type: 'datetime' as const,
      labels: { show: false }
    },
    yaxis: {
      min: 0,
      max: 100,
      labels: {
        style: { colors: '#9CA3AF' }
      },
      axisBorder: { color: '#374151' }
    },
    grid: {
      borderColor: '#374151',
      yaxis: { lines: { show: true } }
    },
    stroke: { width: 2 },
    annotations: {
      yaxis: [
        { y: 70, borderColor: '#EF4444', label: { text: 'Overbought' } },
        { y: 30, borderColor: '#10B981', label: { text: 'Oversold' } }
      ]
    }
  };

  const rsiSeries = [{
    name: 'RSI',
    data: technical.analysis?.rsi?.value ? 
      Array.from({ length: 50 }, (_, i) => ({
        x: Date.now() - (49 - i) * 60000,
        y: Math.random() * 100 // Mock RSI data
      })) : []
  }];

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
  };

  const formatChange = (change: number) => {
    const isPositive = change >= 0;
    return (
      <span className={`flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </span>
    );
  };

  if (!isFullyLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative mb-4">
            <div className="w-16 h-16 border-4 border-orange-400/20 rounded-full animate-spin">
              <div className="absolute inset-2 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" 
                   style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
            </div>
          </div>
          <h3 className="text-xl font-bold text-orange-400 mb-2">
            Loading {base}/{quote} Advanced Terminal
          </h3>
          <p className="text-gray-400 text-sm">Initializing real-time data feeds...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Enhanced Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className="h-8 w-8 text-orange-500" />
              <div>
                <h1 className="text-3xl font-bold text-white">
                  <span className="text-orange-400">{base}</span>
                  <span className="text-gray-400 mx-2">/</span>
                  <span className="text-green-400">{quote}</span>
                </h1>
                <p className="text-sm text-gray-400">Advanced Trading Terminal</p>
              </div>
            </div>
            
            {/* Real-time status */}
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/20 border-green-500 text-green-400 border">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                REAL-TIME
              </Badge>
              <Badge className="bg-blue-500/20 border-blue-500 text-blue-400 border">
                <MousePointer className="h-3 w-3 mr-1" />
                INTERACTIVE
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-400">Last Update</div>
              <div className="text-sm text-white font-mono">
                {realTime.lastUpdate ? new Date(realTime.lastUpdate).toLocaleTimeString() : 'Live'}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-orange-500/50 hover:border-orange-500"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Price Header */}
        <Card className="bg-gray-900/50 border-orange-500/30">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-8 gap-6">
              <div className="md:col-span-3">
                <div className="text-4xl font-bold text-white mb-2">
                  {formatPrice(realTime.price || stats?.price || 0)}
                </div>
                <div className="text-lg">
                  {formatChange(realTime.change || stats?.change24h || 0)}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  24h Vol: ${(realTime.volume || stats?.volume24h || 0).toLocaleString()}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:col-span-5">
                <div>
                  <div className="text-xs text-gray-400 mb-1">24h High</div>
                  <div className="text-lg font-bold text-green-400">
                    {formatPrice(stats?.high24h || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">24h Low</div>
                  <div className="text-lg font-bold text-red-400">
                    {formatPrice(stats?.low24h || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Market Cap</div>
                  <div className="text-lg font-bold text-white">
                    ${((stats?.marketCap || 0) / 1000000).toFixed(1)}M
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">TVL</div>
                  <div className="text-lg font-bold text-white">
                    ${((stats?.tvl || 0) / 1000000).toFixed(1)}M
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Holders</div>
                  <div className="text-lg font-bold text-white">
                    {(stats?.holders || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls - Reorganized in two rows */}
      <div className="space-y-4 mb-6">
        {/* Top row: Timeframes and Quick Switcher */}
        <div className="flex items-center justify-between">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 font-medium">Timeframe:</span>
            <div className="flex gap-1">
              {timeframes.map((tf) => (
                <Button
                  key={tf}
                  onClick={() => setSelectedTimeframe(tf)}
                  variant={selectedTimeframe === tf ? 'default' : 'outline'}
                  size="sm"
                  className={selectedTimeframe === tf ? 'bg-orange-600' : 'border-gray-600 hover:border-orange-500'}
                >
                  {tf.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* Quick Pair Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 font-medium">🚀 Quick Switch:</span>
            <div className="flex gap-1">
              {['BTC-ETH', 'BTC-SOL', 'ETH-USDT', 'ORDI-BTC'].map((pair) => (
                <Button
                  key={pair}
                  onClick={() => handlePairSwitch(pair)}
                  variant="outline"
                  size="sm"
                  className={`border-gray-600 hover:border-cyan-500 text-xs transition-all ${
                    pairId === pair ? 'bg-cyan-600 border-cyan-500 text-white' : ''
                  }`}
                >
                  {pair}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row: Indicators and Chart Type */}
        <div className="flex items-center justify-between">
          {/* Indicator Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 font-medium">Indicators:</span>
            <div className="flex gap-1">
              {availableIndicators.map((indicator) => (
                <Button
                  key={indicator}
                  onClick={() => {
                    setSelectedIndicators(prev => 
                      prev.includes(indicator) 
                        ? prev.filter(i => i !== indicator)
                        : [...prev, indicator]
                    );
                  }}
                  variant={selectedIndicators.includes(indicator) ? 'default' : 'outline'}
                  size="sm"
                  className={selectedIndicators.includes(indicator) ? 'bg-blue-600' : 'border-gray-600 hover:border-blue-500'}
                >
                  {indicator}
                </Button>
              ))}
            </div>
          </div>

          {/* Chart Type */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 font-medium">Chart Type:</span>
            <div className="flex gap-1">
              {(['candlestick', 'line', 'area'] as const).map((type) => (
                <Button
                  key={type}
                  onClick={() => setChartType(type)}
                  variant={chartType === type ? 'default' : 'outline'}
                  size="sm"
                  className={chartType === type ? 'bg-purple-600' : 'border-gray-600 hover:border-purple-500'}
                >
                  {type === 'candlestick' ? <BarChart3 className="h-4 w-4" /> :
                   type === 'line' ? <LineChart className="h-4 w-4" /> :
                   <Activity className="h-4 w-4" />}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Advanced Candlestick Chart */}
        <Card className="lg:col-span-3 bg-black/50 border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-orange-400 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Professional Chart - Click candles for analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ApexChart
                options={candlestickOptions}
                series={candlestickSeries}
                type="candlestick"
                height={500}
              />
              
              {/* RSI Indicator */}
              {selectedIndicators.includes('RSI') && (
                <div>
                  <div className="text-sm font-bold text-purple-400 mb-2">RSI (14)</div>
                  <ApexChart
                    options={rsiOptions}
                    series={rsiSeries}
                    type="line"
                    height={150}
                  />
                </div>
              )}
              
              {/* Volume */}
              <div>
                <div className="text-sm font-bold text-blue-400 mb-2">Volume</div>
                <div className="h-20 bg-gray-900/30 rounded-lg p-2">
                  <div className="flex items-end justify-between h-full gap-1">
                    {candles[selectedTimeframe]?.slice(-30).map((candle, index) => {
                      const maxVolume = Math.max(...(candles[selectedTimeframe]?.map(c => c.volume) || []));
                      const volumeHeight = (candle.volume / maxVolume) * 100;
                      const isGreen = candle.close > candle.open;
                      
                      return (
                        <div
                          key={index}
                          className={`w-2 ${isGreen ? 'bg-green-400/60' : 'bg-red-400/60'} hover:opacity-80 cursor-pointer`}
                          style={{ height: `${volumeHeight}%` }}
                          onClick={() => setSelectedCandle(candle)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Order Book */}
        <Card className="bg-black/50 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-blue-400 flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Interactive Order Book
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InteractiveOrderBook 
              pair={pairId} 
              onPriceClick={handleOrderBookClick}
              depth={depth}
            />
          </CardContent>
        </Card>
      </div>

      {/* Technical Analysis Panel */}
      {technical.analysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-black/50 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                RSI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Value:</span>
                  <span className="text-white font-bold">{technical.analysis.rsi?.value?.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Signal:</span>
                  <Badge className={`${
                    technical.analysis.rsi?.signal === 'BUY' ? 'bg-green-500/20 border-green-500 text-green-400' :
                    technical.analysis.rsi?.signal === 'SELL' ? 'bg-red-500/20 border-red-500 text-red-400' :
                    'bg-gray-500/20 border-gray-500 text-gray-400'
                  } border`}>
                    {technical.analysis.rsi?.signal}
                  </Badge>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${technical.analysis.rsi?.strength}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-purple-400 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                MACD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Value:</span>
                  <span className="text-white font-bold">{technical.analysis.macd?.value?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Signal:</span>
                  <Badge className={`${
                    technical.analysis.macd?.signal === 'BUY' ? 'bg-green-500/20 border-green-500 text-green-400' :
                    'bg-red-500/20 border-red-500 text-red-400'
                  } border`}>
                    {technical.analysis.macd?.signal}
                  </Badge>
                </div>
                <div className="text-xs text-gray-400">
                  Histogram: {technical.analysis.macd?.histogram?.toFixed(4)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-yellow-500/30">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center gap-2">
                <Target className="h-5 w-5" />
                VWAP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Value:</span>
                  <span className="text-white font-bold">{formatPrice(technical.analysis.vwap?.value || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Signal:</span>
                  <Badge className={`${
                    technical.analysis.vwap?.signal === 'BULLISH' ? 'bg-green-500/20 border-green-500 text-green-400' :
                    'bg-red-500/20 border-red-500 text-red-400'
                  } border`}>
                    {technical.analysis.vwap?.signal}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-cyan-400 flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Overall Signal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    technical.analysis.overall?.signal === 'BUY' ? 'text-green-400' :
                    technical.analysis.overall?.signal === 'SELL' ? 'text-red-400' :
                    'text-gray-400'
                  }`}>
                    {technical.analysis.overall?.signal}
                  </div>
                  <div className="text-sm text-gray-400">
                    Confidence: {technical.analysis.overall?.confidence?.toFixed(0)}%
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="text-green-400 font-bold">{technical.analysis.overall?.signals?.buy}</div>
                    <div className="text-gray-400">Buy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-400 font-bold">{technical.analysis.overall?.signals?.sell}</div>
                    <div className="text-gray-400">Sell</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400 font-bold">{technical.analysis.overall?.signals?.neutral}</div>
                    <div className="text-gray-400">Neutral</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Clickable Heatmap & Trading Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clickable Market Heatmap */}
        <Card className="lg:col-span-2 bg-black/50 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Interactive Market Heatmap - Click to switch pairs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ClickableHeatmap currentPair={pairId} onPairSelect={handlePairSwitch} />
          </CardContent>
        </Card>

        {/* Quick Trading Actions */}
        <Card className="bg-black/50 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-purple-400 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Link 
                  href={`https://app.runesdex.com/swap?base=${base}&quote=${quote}&utm_source=terminal&utm_medium=pair&utm_campaign=trade`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Buy
                  </Button>
                </Link>
                
                <Link 
                  href={`https://app.runesdex.com/swap?base=${quote}&quote=${base}&utm_source=terminal&utm_medium=pair&utm_campaign=trade`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Sell
                  </Button>
                </Link>
              </div>

              {/* Quick pair navigation */}
              <div className="space-y-2">
                <div className="text-sm text-gray-400">Switch to:</div>
                <div className="grid grid-cols-1 gap-1">
                  {['BTC-ETH', 'BTC-SOL', 'BTC-ORDI', 'ETH-USDT', 'SOL-USDT', 'ORDI-BTC'].map((pair) => (
                    <Button 
                      key={pair} 
                      variant="outline" 
                      size="sm" 
                      className="w-full border-gray-600 hover:border-purple-500"
                      onClick={() => handlePairSwitch(pair)}
                    >
                      {pair}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Auto-trade toggle */}
              <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Auto-trade signals</span>
                  <Button
                    onClick={() => setAutoTrade(!autoTrade)}
                    variant={autoTrade ? 'default' : 'outline'}
                    size="sm"
                    className={autoTrade ? 'bg-orange-600' : 'border-gray-600'}
                  >
                    {autoTrade ? 'ON' : 'OFF'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Candle Analysis Modal */}
      <AnimatePresence>
        {selectedCandle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setSelectedCandle(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Candle Analysis</h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCandle(null)}>
                  ×
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-400">Open</div>
                    <div className="text-white font-bold">{formatPrice(selectedCandle.open)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Close</div>
                    <div className={`font-bold ${selectedCandle.close > selectedCandle.open ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPrice(selectedCandle.close)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">High</div>
                    <div className="text-green-400 font-bold">{formatPrice(selectedCandle.high)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Low</div>
                    <div className="text-red-400 font-bold">{formatPrice(selectedCandle.low)}</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-400">Volume</div>
                  <div className="text-white font-bold">{selectedCandle.volume?.toLocaleString()}</div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-400">Time</div>
                  <div className="text-white">{new Date(selectedCandle.timestamp).toLocaleString()}</div>
                </div>
                
                <div className="pt-3 border-t border-gray-700">
                  <div className="text-xs text-gray-400 mb-2">Quick Actions</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      Buy at {formatPrice(selectedCandle.close)}
                    </Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700">
                      Sell at {formatPrice(selectedCandle.close)}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}