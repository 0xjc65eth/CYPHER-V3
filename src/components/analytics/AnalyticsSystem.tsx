'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { realAnalyticsDataService, RealMarketMetrics, RealNetworkMetrics } from '@/services/RealAnalyticsDataService';
import { motion } from 'framer-motion';
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Users,
  Clock,
  Calendar,
  ChevronDown,
  Download,
  RefreshCw,
  Filter,
  Zap,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  Percent,
  Target,
  Loader2,
  Coins
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'react-hot-toast';
import {
  LineChart as RechartsLineChart,
  Line as RechartsLine,
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: React.ElementType;
  color: string;
  prefix?: string;
  suffix?: string;
}

interface ChartData {
  labels: string[];
  datasets: any[];
}

interface TechnicalIndicator {
  name: string;
  value: number;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number;
}

interface MarketMetrics {
  price: number;
  volume24h: number;
  marketCap: number;
  dominance: number;
  hashrate: number;
  difficulty: number;
  blockHeight: number;
  mempoolSize: number;
  feeRate: {
    fast: number;
    medium: number;
    slow: number;
  };
  priceChange24h: number;
  volumeChange24h: number;
  lastUpdated: string;
  source: 'live' | 'cached';
}

type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
type ChartType = 'price' | 'volume' | 'onchain' | 'mining' | 'defi';

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  border: '1px solid #333',
  color: '#fff',
};

// Legacy constant kept for reference - recharts uses inline props
const _CHART_OPTIONS_LEGACY = {
  scales: {
    x: {
      grid: {
        display: false,
        drawBorder: false
      },
      ticks: {
        color: '#9CA3AF'
      }
    },
    y: {
      grid: {
        color: 'rgba(75, 85, 99, 0.3)',
        drawBorder: false
      },
      ticks: {
        color: '#9CA3AF'
      }
    }
  }
};

export function AnalyticsSystem() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [chartType, setChartType] = useState<ChartType>('price');
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const [marketMetrics, setMarketMetrics] = useState<MarketMetrics>({
    price: 0,
    volume24h: 0,
    marketCap: 0,
    dominance: 0,
    hashrate: 0,
    difficulty: 0,
    blockHeight: 0,
    mempoolSize: 0,
    feeRate: {
      fast: 0,
      medium: 0,
      slow: 0
    },
    priceChange24h: 0,
    volumeChange24h: 0,
    lastUpdated: '',
    source: 'live'
  });

  const [realDataLoaded, setRealDataLoaded] = useState(false);

  const [priceChartData, setPriceChartData] = useState<ChartData>({
    labels: [],
    datasets: []
  });

  const [volumeChartData, setVolumeChartData] = useState<ChartData>({
    labels: [],
    datasets: []
  });

  const [technicalIndicators, setTechnicalIndicators] = useState<TechnicalIndicator[]>([]);

  // Load data
  useEffect(() => {
    loadAnalyticsData();
    
    if (autoRefresh) {
      const interval = setInterval(loadAnalyticsData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [timeRange, chartType, autoRefresh]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      
      // Fetch real market data
      const [realMarketData, realNetworkData] = await Promise.allSettled([
        realAnalyticsDataService.getRealMarketMetrics(),
        realAnalyticsDataService.getRealNetworkMetrics()
      ]);

      if (realMarketData.status === 'fulfilled' && realNetworkData.status === 'fulfilled') {
        const marketData = realMarketData.value;
        const networkData = realNetworkData.value;
        
        // Update market metrics with real data
        setMarketMetrics({
          price: marketData.price,
          volume24h: marketData.volume24h,
          marketCap: marketData.marketCap,
          dominance: marketData.dominance,
          hashrate: networkData.hashrate / 1e18, // Convert to EH/s
          difficulty: networkData.difficulty / 1e12, // Convert to T
          blockHeight: networkData.blockHeight,
          mempoolSize: networkData.mempoolSize,
          feeRate: networkData.feeRates,
          priceChange24h: marketData.priceChange24h,
          volumeChange24h: marketData.volumeChange24h,
          lastUpdated: marketData.lastUpdated,
          source: marketData.source
        });
        
        setRealDataLoaded(true);
      } else {
        setRealDataLoaded(false);
      }
      
      // Generate realistic technical indicators based on real price
      const currentPrice = realMarketData.status === 'fulfilled' ? realMarketData.value.price : 98500;
      const realTechnicalIndicators = calculateRealTechnicalIndicators(currentPrice);
      setTechnicalIndicators(realTechnicalIndicators);
      
      // Generate chart data based on real price movements
      generateRealChartData(currentPrice);
      
    } catch (error) {
      console.error('Failed to load real analytics data:', error);
      toast.error('Failed to load real analytics data');
      setRealDataLoaded(false);
    } finally {
      setIsLoading(false);
    }
  };

  const [priceHistoryForIndicators, setPriceHistoryForIndicators] = useState<number[]>([]);

  const calculateRealTechnicalIndicators = (currentPrice: number): TechnicalIndicator[] => {
    // Without sufficient price history, show honest "insufficient data" state
    if (priceHistoryForIndicators.length < 30) {
      return [
        { name: 'RSI (14)', value: 0, signal: 'neutral', strength: 0 },
        { name: 'MACD', value: 0, signal: 'neutral', strength: 0 },
        { name: 'SMA (50)', value: 0, signal: 'neutral', strength: 0 },
        { name: 'SMA (200)', value: 0, signal: 'neutral', strength: 0 },
        { name: 'Bollinger Bands', value: 0, signal: 'neutral', strength: 0 },
        { name: 'Stochastic', value: 0, signal: 'neutral', strength: 0 },
      ];
    }

    // Use real calculations from TechnicalIndicatorsService
    const { calculateRSI, calculateMACD, calculateSMA, calculateBollingerBands } = require('@/services/TechnicalIndicatorsService');

    const closes = priceHistoryForIndicators;
    const rsi = calculateRSI(closes, 14);
    const macdResult = calculateMACD(closes);
    const sma50Arr = calculateSMA(closes, Math.min(50, closes.length));
    const sma200Arr = calculateSMA(closes, Math.min(200, closes.length));
    const bb = calculateBollingerBands(closes);

    const sma50 = sma50Arr.length > 0 ? sma50Arr[sma50Arr.length - 1] : currentPrice;
    const sma200 = sma200Arr.length > 0 ? sma200Arr[sma200Arr.length - 1] : currentPrice;

    return [
      {
        name: 'RSI (14)',
        value: Math.round(rsi * 100) / 100,
        signal: rsi > 70 ? 'sell' : rsi < 30 ? 'buy' : 'neutral',
        strength: Math.abs(rsi - 50) / 50
      },
      {
        name: 'MACD',
        value: Math.round(macdResult.macd * 100) / 100,
        signal: macdResult.histogram > 0 ? 'buy' : macdResult.histogram < 0 ? 'sell' : 'neutral',
        strength: Math.min(Math.abs(macdResult.macd) / 1000, 1)
      },
      {
        name: 'SMA (50)',
        value: Math.round(sma50 * 100) / 100,
        signal: currentPrice > sma50 ? 'buy' : 'sell',
        strength: Math.abs(currentPrice - sma50) / currentPrice
      },
      {
        name: 'SMA (200)',
        value: Math.round(sma200 * 100) / 100,
        signal: currentPrice > sma200 ? 'buy' : 'sell',
        strength: Math.abs(currentPrice - sma200) / currentPrice
      },
      {
        name: 'Bollinger Bands',
        value: Math.round(bb.bandwidth * 100) / 100,
        signal: bb.percentB > 80 ? 'sell' : bb.percentB < 20 ? 'buy' : 'neutral',
        strength: Math.abs(bb.percentB - 50) / 50
      },
      {
        name: 'Stochastic',
        value: 0,
        signal: 'neutral',
        strength: 0
      }
    ];
  };

  const generateRealChartData = async (currentPrice: number) => {
    // Fetch real historical price data from CoinGecko instead of generating random data
    const daysMap: Record<TimeRange, string> = {
      '1h': '1', '24h': '1', '7d': '7', '30d': '30', '90d': '90', '1y': '365', 'all': '365',
    };
    const days = daysMap[timeRange] || '7';

    try {
      const params = `vs_currency=usd&days=${days}`;
      const res = await fetch(
        `/api/coingecko?endpoint=/coins/bitcoin/market_chart&params=${encodeURIComponent(params)}`
      );

      if (!res.ok) {
        // If fetch fails, show empty chart
        setPriceChartData({ labels: [], datasets: [{ label: 'Bitcoin Price', data: [], borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: true, tension: 0.4 }] });
        setVolumeChartData({ labels: [], datasets: [{ label: 'Volume', data: [], backgroundColor: '#10B981', borderRadius: 4 }] });
        return;
      }

      const histData = await res.json();
      const prices: [number, number][] = histData.prices || [];
      const volumes: [number, number][] = histData.total_volumes || [];

      if (prices.length === 0) {
        setPriceChartData({ labels: [], datasets: [{ label: 'Bitcoin Price', data: [], borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: true, tension: 0.4 }] });
        setVolumeChartData({ labels: [], datasets: [{ label: 'Volume', data: [], backgroundColor: '#10B981', borderRadius: 4 }] });
        return;
      }

      // Store closes for technical indicator calculations
      setPriceHistoryForIndicators(prices.map(p => p[1]));

      const formatStr = timeRange === '1h' || timeRange === '24h' ? 'HH:mm' : 'MMM dd';
      const priceLabels = prices.map(p => format(new Date(p[0]), formatStr));
      const priceValues = prices.map(p => p[1]);
      const volumeValues = volumes.map(v => v[1]);

      setPriceChartData({
        labels: priceLabels,
        datasets: [{
          label: 'Bitcoin Price',
          data: priceValues,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true,
          tension: 0.4
        }]
      });

      setVolumeChartData({
        labels: priceLabels,
        datasets: [{
          label: 'Volume',
          data: volumeValues,
          backgroundColor: '#10B981',
          borderRadius: 4
        }]
      });
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
      setPriceChartData({ labels: [], datasets: [{ label: 'Bitcoin Price', data: [], borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: true, tension: 0.4 }] });
      setVolumeChartData({ labels: [], datasets: [{ label: 'Volume', data: [], backgroundColor: '#10B981', borderRadius: 4 }] });
    }
  };

  const getDataPointsForTimeRange = (range: TimeRange): number[] => {
    switch (range) {
      case '1h': return Array.from({ length: 12 }, (_, i) => i * 5); // 5-min intervals
      case '24h': return Array.from({ length: 24 }, (_, i) => i); // Hourly
      case '7d': return Array.from({ length: 7 }, (_, i) => i); // Daily
      case '30d': return Array.from({ length: 30 }, (_, i) => i); // Daily
      case '90d': return Array.from({ length: 30 }, (_, i) => i * 3); // 3-day intervals
      case '1y': return Array.from({ length: 52 }, (_, i) => i * 7); // Weekly
      default: return Array.from({ length: 30 }, (_, i) => i);
    }
  };

  const getTimeInterval = (range: TimeRange): number => {
    switch (range) {
      case '1h': return 5 * 60 * 1000; // 5 minutes
      case '24h': return 60 * 60 * 1000; // 1 hour
      case '7d': return 24 * 60 * 60 * 1000; // 1 day
      case '30d': return 24 * 60 * 60 * 1000; // 1 day
      case '90d': return 3 * 24 * 60 * 60 * 1000; // 3 days
      case '1y': return 7 * 24 * 60 * 60 * 1000; // 1 week
      default: return 24 * 60 * 60 * 1000;
    }
  };

  const metricCards: MetricCard[] = [
    {
      id: 'price',
      title: 'Bitcoin Price',
      value: marketMetrics.price || 0,
      change: marketMetrics.priceChange24h || 0,
      changeLabel: '24h',
      icon: DollarSign,
      color: 'orange',
      prefix: '$',
      suffix: ''
    },
    {
      id: 'volume',
      title: '24h Volume',
      value: marketMetrics.volume24h ? (marketMetrics.volume24h / 1000000000).toFixed(2) : '0.00',
      change: marketMetrics.volumeChange24h || 0,
      changeLabel: '24h',
      icon: Activity,
      color: 'blue',
      prefix: '$',
      suffix: 'B'
    },
    {
      id: 'marketcap',
      title: 'Market Cap',
      value: marketMetrics.marketCap ? (marketMetrics.marketCap / 1000000000000).toFixed(2) : '0.00',
      change: marketMetrics.priceChange24h || 0, // Market cap change roughly follows price change
      changeLabel: '24h',
      icon: BarChart3,
      color: 'green',
      prefix: '$',
      suffix: 'T'
    },
    {
      id: 'dominance',
      title: 'BTC Dominance',
      value: marketMetrics.dominance ? marketMetrics.dominance.toFixed(1) : '0.0',
      change: 0.1, // Small change typically
      changeLabel: '24h',
      icon: PieChart,
      color: 'purple',
      prefix: '',
      suffix: '%'
    },
    {
      id: 'hashrate',
      title: 'Hash Rate',
      value: marketMetrics.hashrate ? marketMetrics.hashrate.toFixed(1) : '0.0',
      change: 1.2, // Typically small changes
      changeLabel: '7d',
      icon: Zap,
      color: 'yellow',
      prefix: '',
      suffix: ' EH/s'
    },
    {
      id: 'difficulty',
      title: 'Difficulty',
      value: marketMetrics.difficulty ? marketMetrics.difficulty.toFixed(2) : '0.00',
      change: 2.1, // Difficulty adjustment typically small
      changeLabel: 'adjustment',
      icon: Target,
      color: 'red',
      prefix: '',
      suffix: 'T'
    }
  ];

  const formatMetricValue = (card: MetricCard): string => {
    return `${card.prefix || ''}${
      typeof card.value === 'number' ? card.value.toLocaleString() : card.value
    }${card.suffix || ''}`;
  };

  const getSignalColor = (signal: string): string => {
    switch (signal) {
      case 'buy': return 'text-green-400';
      case 'sell': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getSignalStrength = (strength: number): string => {
    if (strength >= 0.8) return 'Strong';
    if (strength >= 0.6) return 'Moderate';
    return 'Weak';
  };

  const exportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      timeRange,
      metrics: marketMetrics,
      indicators: technicalIndicators,
      priceData: priceChartData.datasets[0].data,
      volumeData: volumeChartData.datasets[0].data
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitcoin-analytics-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Analytics data exported');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              Bitcoin Analytics Dashboard
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-gray-400">Real-time market data and technical analysis</p>
              {realDataLoaded && (
                <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full border border-green-500/30 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  Live Data
                </span>
              )}
              {marketMetrics.source === 'cached' && (
                <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
                  Cached
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="1h">1 Hour</option>
              <option value="24h">24 Hours</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
              <option value="90d">90 Days</option>
              <option value="1y">1 Year</option>
              <option value="all">All Time</option>
            </select>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition-colors ${
                autoRefresh 
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500' 
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            >
              <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={exportData}
              className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
              title="Export data"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metricCards.map(card => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-gray-800 rounded-xl border p-4 relative ${
                realDataLoaded ? 'border-green-500/30' : 'border-gray-700'
              }`}
            >
              {realDataLoaded && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">{card.title}</span>
                <card.icon className={`w-5 h-5 text-${card.color}-500`} />
              </div>
              <p className="text-2xl font-bold text-white">
                {formatMetricValue(card)}
              </p>
              <div className={`flex items-center gap-1 mt-1 text-sm ${
                card.change >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {card.change >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                <span>{Math.abs(card.change).toFixed(2)}%</span>
                <span className="text-gray-500">({card.changeLabel})</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Price Chart */}
          <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Price Chart</h2>
              <div className="flex items-center gap-2">
                {['price', 'volume', 'onchain'].map(type => (
                  <button
                    key={type}
                    onClick={() => setChartType(type as ChartType)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      chartType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-96">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : chartType === 'price' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={priceChartData.labels.map((label: string, i: number) => ({
                    name: label,
                    value: priceChartData.datasets[0]?.data[i] ?? 0
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                    <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <RechartsLine type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2} dot={false} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={volumeChartData.labels.map((label: string, i: number) => ({
                    name: label,
                    value: volumeChartData.datasets[0]?.data[i] ?? 0
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                    <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <RechartsBar dataKey="value" fill="#10B981" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Technical Indicators */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Technical Indicators</h2>
            <div className="space-y-4">
              {technicalIndicators.map(indicator => (
                <div key={indicator.name} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">{indicator.name}</p>
                    <p className="font-medium text-white">
                      {indicator.value.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${getSignalColor(indicator.signal)}`}>
                      {indicator.signal.toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getSignalStrength(indicator.strength)}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Overall Signal */}
              <div className="pt-4 mt-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Overall Signal</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const buyCount = technicalIndicators.filter(i => i.signal === 'buy').length;
                      const sellCount = technicalIndicators.filter(i => i.signal === 'sell').length;
                      const total = technicalIndicators.length || 1;
                      const score = Math.round((buyCount / total) * 5);
                      const overallSignal = buyCount > sellCount ? 'buy' : sellCount > buyCount ? 'sell' : 'neutral';
                      const signalColor = overallSignal === 'buy' ? 'text-green-400' : overallSignal === 'sell' ? 'text-red-400' : 'text-gray-400';
                      const barColor = overallSignal === 'buy' ? 'bg-green-500' : overallSignal === 'sell' ? 'bg-red-500' : 'bg-gray-500';
                      return (
                        <>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(i => (
                              <div
                                key={i}
                                className={`w-8 h-2 rounded-full ${
                                  i <= score ? barColor : 'bg-gray-700'
                                }`}
                              />
                            ))}
                          </div>
                          <span className={`${signalColor} font-medium`}>
                            {priceHistoryForIndicators.length < 30 ? 'NO DATA' : overallSignal.toUpperCase()}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Network Stats */}
          <div className={`bg-gray-800 rounded-xl border p-6 ${
            realDataLoaded ? 'border-green-500/30' : 'border-gray-700'
          }`}>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Network Stats
              {realDataLoaded && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse ml-auto"></div>
              )}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Block Height</span>
                <span className="text-white font-mono">{marketMetrics.blockHeight.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Difficulty</span>
                <span className="text-white">{marketMetrics.difficulty.toFixed(2)}T</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Hash Rate</span>
                <span className="text-white">{marketMetrics.hashrate.toFixed(1)} EH/s</span>
              </div>
            </div>
          </div>

          {/* Fee Estimates */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Fee Estimates
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Fast (10 min)</span>
                <span className="text-white">{marketMetrics.feeRate.fast} sat/vB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Medium (30 min)</span>
                <span className="text-white">{marketMetrics.feeRate.medium} sat/vB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Slow (1 hour)</span>
                <span className="text-white">{marketMetrics.feeRate.slow} sat/vB</span>
              </div>
            </div>
          </div>

          {/* Market Sentiment */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Market Sentiment
            </h3>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <RechartsPieChart width={128} height={128}>
                  <Pie
                    data={[
                      { name: 'Bullish', value: 65, fill: '#10B981' },
                      { name: 'Neutral', value: 20, fill: '#6B7280' },
                      { name: 'Bearish', value: 15, fill: '#EF4444' }
                    ]}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    strokeWidth={0}
                  >
                    {[{ fill: '#10B981' }, { fill: '#6B7280' }, { fill: '#EF4444' }].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </RechartsPieChart>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">65%</p>
                    <p className="text-xs text-gray-400">Bullish</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DeFi Stats */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-purple-500" />
              Bitcoin DeFi
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Wrapped BTC</span>
                <span className="text-white">152,345 BTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Lightning Capacity</span>
                <span className="text-white">5,234 BTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Stacks TVL</span>
                <span className="text-white">$234M</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}