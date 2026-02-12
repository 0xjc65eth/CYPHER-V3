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

  useEffect(() => {
    generateChartData();
    generateTechnicalIndicators();
  }, [selectedAsset, timeframe]); // Remove isLive from deps

  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        updateLiveData();
      }, 5000); // Update every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [isLive]); // Separate effect for live updates

  const generateChartData = () => {
    const basePrice = getAssetPrice(selectedAsset);
    const data: ChartDataPoint[] = [];
    const dataPoints = 50;
    
    for (let i = 0; i < dataPoints; i++) {
      const time = new Date(Date.now() - (dataPoints - i) * getTimeframeMs(timeframe));
      const volatility = 0.02 + Math.random() * 0.03; // 2-5% volatility
      const change = (Math.random() - 0.5) * volatility;
      const price = basePrice * (1 + change * (i / dataPoints));
      
      const open = i > 0 ? data[i - 1].close : price;
      const close = price;
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = 1000000 + Math.random() * 5000000;

      data.push({
        time: time.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        price: close,
        volume,
        change: change * 100,
        high,
        low,
        open,
        close
      });
    }
    
    setChartData(data);
  };

  const generateTechnicalIndicators = () => {
    const indicatorsList: TechnicalIndicator[] = [
      {
        name: 'RSI(14)',
        value: 65.8 + Math.random() * 20 - 10,
        signal: Math.random() > 0.5 ? 'BUY' : 'HOLD',
        strength: 75 + Math.random() * 20,
        color: 'text-purple-400'
      },
      {
        name: 'MACD',
        value: 1247.8 + Math.random() * 500 - 250,
        signal: Math.random() > 0.3 ? 'BUY' : 'SELL',
        strength: 82 + Math.random() * 15,
        color: 'text-blue-400'
      },
      {
        name: 'MA(20)',
        value: getAssetPrice(selectedAsset) * (0.98 + Math.random() * 0.04),
        signal: 'BUY',
        strength: 88 + Math.random() * 10,
        color: 'text-green-400'
      },
      {
        name: 'BBANDS',
        value: 0.75 + Math.random() * 0.3,
        signal: Math.random() > 0.6 ? 'BUY' : 'HOLD',
        strength: 70 + Math.random() * 25,
        color: 'text-yellow-400'
      }
    ];
    
    setIndicators(indicatorsList);
  };

  const updateLiveData = () => {
    setChartData(prev => {
      const newData = [...prev];
      const lastPoint = newData[newData.length - 1];
      const change = (Math.random() - 0.5) * 0.005; // 0.5% max change
      const newPrice = lastPoint.close * (1 + change);
      
      // Update last point
      newData[newData.length - 1] = {
        ...lastPoint,
        close: newPrice,
        price: newPrice,
        high: Math.max(lastPoint.high, newPrice),
        low: Math.min(lastPoint.low, newPrice),
        change: change * 100
      };
      
      return newData;
    });
    
    setLastUpdate(new Date());
  };

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
            
            {/* Simulated Price Line */}
            <svg className="absolute inset-0 w-full h-full">
              <path
                d={`M 0,${120 + Math.sin(0) * 30} ${chartData.map((_, i) => 
                  `L ${(i / chartData.length) * 100},${120 + Math.sin(i * 0.5) * 30 + (Math.random() - 0.5) * 20}`
                ).join(' ')}`}
                fill="none"
                stroke="url(#priceGradient)"
                strokeWidth="2"
                className="drop-shadow-sm"
              />
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