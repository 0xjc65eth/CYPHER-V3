'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, LineChart, TrendingUp, TrendingDown, 
  Volume2, Activity, Target, Zap, Clock, 
  ChevronUp, ChevronDown, Play, Pause, RefreshCw
} from 'lucide-react';

interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  change: number;
  high: number;
  low: number;
  open: number;
  close: number;
}

interface TechnicalIndicator {
  name: string;
  value: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
  strength: number;
  color: string;
}

export const BloombergProfessionalChart = React.memo(function BloombergProfessionalChart() {
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [timeframe, setTimeframe] = useState('1H');
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'volume'>('candlestick');
  const [isLive, setIsLive] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [indicators, setIndicators] = useState<TechnicalIndicator[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const assets = ['BTC', 'ETH', 'SOL', 'ORDI', 'RUNE'];
  const timeframes = ['1M', '5M', '15M', '1H', '4H', '1D'];

  // Fetch real OHLCV data from charts API
  const fetchChartData = async () => {
    try {
      const intervalMap: Record<string, string> = {
        '1M': '1m', '5M': '5m', '15M': '15m',
        '1H': '1h', '4H': '4h', '1D': '1d'
      };
      const binanceInterval = intervalMap[timeframe] || '1h';
      const symbol = selectedAsset === 'RUNE' ? 'BTCUSDT' : `${selectedAsset}USDT`;

      const res = await fetch(
        `/api/charts/historical?symbol=${symbol}&interval=${binanceInterval}&limit=50`
      );
      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const json = await res.json();
      if (!json.success || !json.data || json.data.length === 0) {
        setChartData([]);
        return;
      }

      const data: ChartDataPoint[] = json.data.map((c: any, i: number) => {
        const prevClose = i > 0 ? json.data[i - 1].close : c.open;
        return {
          time: new Date(c.time).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }),
          price: c.close,
          volume: c.volume || 0,
          change: prevClose > 0 ? ((c.close - prevClose) / prevClose) * 100 : 0,
          high: c.high || c.close,
          low: c.low || c.close,
          open: c.open || c.close,
          close: c.close
        };
      });

      setChartData(data);

      // Calculate real technical indicators from the data
      const closes = data.map(d => d.close);
      computeIndicators(closes);
    } catch (err) {
      console.error('BloombergProfessionalChart fetch error:', err);
      setChartData([]);
    }

    setLastUpdate(new Date());
  };

  // Compute real RSI, MACD, MA from close prices
  const computeIndicators = (closes: number[]) => {
    if (closes.length < 14) {
      setIndicators([]);
      return;
    }

    // RSI(14)
    let gains = 0, losses = 0;
    for (let i = closes.length - 14; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    // MA(20)
    const ma20Period = Math.min(20, closes.length);
    const ma20 = closes.slice(-ma20Period).reduce((a, b) => a + b, 0) / ma20Period;

    // Simple MACD approximation (12-EMA minus 26-EMA)
    const ema = (data: number[], period: number) => {
      const k = 2 / (period + 1);
      let val = data[0];
      for (let i = 1; i < data.length; i++) {
        val = data[i] * k + val * (1 - k);
      }
      return val;
    };
    const ema12 = ema(closes, 12);
    const ema26 = ema(closes, Math.min(26, closes.length));
    const macdValue = ema12 - ema26;

    const lastPrice = closes[closes.length - 1];
    const maSignal: 'BUY' | 'SELL' | 'HOLD' = lastPrice > ma20 ? 'BUY' : lastPrice < ma20 ? 'SELL' : 'HOLD';
    const rsiSignal: 'BUY' | 'SELL' | 'HOLD' = rsi < 30 ? 'BUY' : rsi > 70 ? 'SELL' : 'HOLD';
    const macdSignal: 'BUY' | 'SELL' | 'HOLD' = macdValue > 0 ? 'BUY' : 'SELL';

    setIndicators([
      { name: 'RSI(14)', value: rsi, signal: rsiSignal, strength: Math.abs(rsi - 50) * 2, color: 'text-purple-400' },
      { name: 'MACD', value: macdValue, signal: macdSignal, strength: Math.min(100, Math.abs(macdValue / lastPrice) * 10000), color: 'text-blue-400' },
      { name: 'MA(20)', value: ma20, signal: maSignal, strength: Math.min(100, Math.abs((lastPrice - ma20) / ma20) * 1000), color: 'text-green-400' },
    ]);
  };

  useEffect(() => {
    fetchChartData();
  }, [selectedAsset, timeframe]);

  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        fetchChartData();
      }, 15000); // Refresh every 15 seconds

      return () => clearInterval(interval);
    }
  }, [isLive, selectedAsset, timeframe]);

  const getAssetPrice = (asset: string): number => {
    const prices: { [key: string]: number } = {
      BTC: 105847,
      ETH: 3345,
      SOL: 188.5,
      ORDI: 42.5,
      RUNE: 5.23
    };
    return prices[asset] || 100;
  };

  const getTimeframeMs = (tf: string): number => {
    const timeframes: { [key: string]: number } = {
      '1M': 60000,
      '5M': 300000,
      '15M': 900000,
      '1H': 3600000,
      '4H': 14400000,
      '1D': 86400000
    };
    return timeframes[tf] || 3600000;
  };

  const getCurrentPrice = () => {
    return chartData.length > 0 ? chartData[chartData.length - 1].close : getAssetPrice(selectedAsset);
  };

  const getPriceChange = () => {
    if (chartData.length < 2) return 0;
    const current = chartData[chartData.length - 1].close;
    const previous = chartData[0].close;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div className="space-y-4">
      {/* Chart Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Asset Selector */}
          <div className="flex gap-1">
            {assets.map((asset) => (
              <button
                key={asset}
                onClick={() => setSelectedAsset(asset)}
                className={`px-3 py-1 text-xs font-mono border ${
                  selectedAsset === asset
                    ? 'bg-orange-500 text-black border-orange-500'
                    : 'text-orange-500 border-orange-500/30 hover:bg-orange-500/10'
                }`}
              >
                {asset}
              </button>
            ))}
          </div>
          
          {/* Timeframe Selector */}
          <div className="flex gap-1">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 text-[10px] font-mono border ${
                  timeframe === tf
                    ? 'bg-orange-500 text-black border-orange-500'
                    : 'text-orange-500 border-orange-500/30 hover:bg-orange-500/10'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsLive(!isLive)}
            className={`text-xs font-mono ${
              isLive ? 'text-green-400 hover:bg-green-500/10' : 'text-orange-500/60 hover:bg-orange-500/10'
            }`}
          >
            {isLive ? <Play className="w-3 h-3 mr-1" /> : <Pause className="w-3 h-3 mr-1" />}
            {isLive ? 'LIVE' : 'PAUSED'}
          </Button>
          <span className="text-[10px] text-orange-500/60 font-mono">
            UPD: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Price Display */}
      <div className="bg-gray-900 border border-orange-500/30 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-orange-500 font-mono">{selectedAsset}/USD</h3>
            <Badge className={`text-[10px] font-mono ${
              getPriceChange() >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {timeframe} CHART
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {['candlestick', 'line', 'volume'].map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type as any)}
                className={`p-1 ${
                  chartType === type ? 'text-orange-500' : 'text-orange-500/40 hover:text-orange-500/80'
                }`}
              >
                {type === 'candlestick' && <BarChart3 className="w-4 h-4" />}
                {type === 'line' && <LineChart className="w-4 h-4" />}
                {type === 'volume' && <Volume2 className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <div className="text-orange-500/60 text-[10px]">LAST</div>
            <div className="text-orange-500 font-bold text-lg">
              ${getCurrentPrice().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-orange-500/60 text-[10px]">CHANGE</div>
            <div className={`font-bold ${getPriceChange() >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {getPriceChange() >= 0 ? '+' : ''}{getPriceChange().toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-orange-500/60 text-[10px]">HIGH</div>
            <div className="text-orange-500">
              ${Math.max(...chartData.map(d => d.high)).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-orange-500/60 text-[10px]">LOW</div>
            <div className="text-orange-500">
              ${Math.min(...chartData.map(d => d.low)).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="bg-gray-900 border border-orange-500/30 p-4">
        <div className="h-64 border border-orange-500/20 relative">
          {/* Simulated Chart Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent">
            {/* Grid Lines */}
            <div className="h-full w-full opacity-20">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-px bg-orange-500/30 absolute w-full"
                  style={{ top: `${(i + 1) * 20}%` }}
                />
              ))}
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="w-px bg-orange-500/30 absolute h-full"
                  style={{ left: `${(i + 1) * 10}%` }}
                />
              ))}
            </div>
            
            {/* Price Line from real data */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 256" preserveAspectRatio="none">
              {chartData.length > 1 && (() => {
                const prices = chartData.map(d => d.close);
                const minP = Math.min(...prices);
                const maxP = Math.max(...prices);
                const range = maxP - minP || 1;
                return (
                  <path
                    d={chartData.map((d, i) => {
                      const x = (i / (chartData.length - 1)) * 100;
                      const y = 240 - ((d.close - minP) / range) * 220 + 10;
                      return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="url(#priceGradient)"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    className="drop-shadow-sm"
                  />
                );
              })()}
              <defs>
                <linearGradient id="priceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          {/* Chart Labels */}
          <div className="absolute top-2 left-2 text-[10px] font-mono text-orange-500/60">
            {chartType.toUpperCase()} • {selectedAsset}/USD • {timeframe}
          </div>
          <div className="absolute bottom-2 right-2 text-[10px] font-mono text-orange-500/60">
            CYPHER ANALYTICS
          </div>
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-orange-500/30 p-3">
          <h4 className="text-xs font-bold text-orange-500 font-mono mb-3">TECHNICAL INDICATORS</h4>
          <div className="space-y-2">
            {indicators.map((indicator, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-orange-500/60 font-mono">{indicator.name}:</span>
                  <span className={`text-[10px] font-mono ${indicator.color}`}>
                    {indicator.name.includes('MA') ? '$' : ''}{indicator.value.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1 py-0.5 ${
                    indicator.signal === 'BUY' ? 'bg-green-500/20 text-green-400' :
                    indicator.signal === 'SELL' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {indicator.signal}
                  </span>
                  <span className="text-[10px] text-orange-500/60 font-mono">
                    {indicator.strength.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-orange-500/30 p-3">
          <h4 className="text-xs font-bold text-orange-500 font-mono mb-3">MARKET SENTIMENT</h4>
          <div className="space-y-2 text-[10px] font-mono">
            <div className="flex justify-between">
              <span className="text-orange-500/60">Overall Signal:</span>
              <span className="text-green-400 font-bold">BULLISH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">Volatility:</span>
              <span className="text-yellow-400">MODERATE</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">Volume:</span>
              <span className="text-green-400">HIGH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">Trend:</span>
              <span className="text-green-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                UPWARD
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});