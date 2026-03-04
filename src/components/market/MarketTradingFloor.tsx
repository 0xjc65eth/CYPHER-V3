'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Zap,
  DollarSign,
  BarChart3,
  Clock,
  Globe,
  Newspaper,
  Target,
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  Bell,
  Filter,
  Maximize2,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  marketCap: number;
  lastUpdate: Date;
}

interface SMCOpportunity {
  id: string;
  type: 'orderBlock' | 'fairValueGap' | 'liquidityPool' | 'breakerBlock';
  direction: 'long' | 'short';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  riskReward: number;
  probability: number;
  timeframe: string;
  status: 'active' | 'triggered' | 'expired';
  createdAt: Date;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  publishedAt: Date;
  tags: string[];
}

interface Alert {
  id: string;
  type: 'price' | 'volume' | 'technical' | 'news';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  actionable: boolean;
}

export function MarketTradingFloor() {
  const [marketData, setMarketData] = useState<MarketData[]>([
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: 98500,
      change24h: 2.34,
      volume24h: 45678900000,
      high24h: 99800,
      low24h: 96200,
      marketCap: 1920000000000,
      lastUpdate: new Date()
    },
    {
      symbol: 'ORDI',
      name: 'ORDI',
      price: 65.5,
      change24h: 12.5,
      volume24h: 234567890,
      high24h: 68.2,
      low24h: 58.3,
      marketCap: 1376550000,
      lastUpdate: new Date()
    }
  ]);

  const [smcOpportunities, setSmcOpportunities] = useState<SMCOpportunity[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('15m');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);

  // Load initial data
  useEffect(() => {
    loadMarketData();
    loadSMCOpportunities();
    loadNews();
    generateAlerts();

    // Set up WebSocket connection
    connectWebSocket();

    // Auto-refresh
    const interval = isAutoRefresh ? setInterval(() => {
      updateMarketData();
    }, 5000) : null;

    return () => {
      if (interval) clearInterval(interval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [isAutoRefresh]);

  const connectWebSocket = () => {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      updateMarketPrice('BTC', parseFloat(data.c), parseFloat(data.P));
    };

    wsRef.current = ws;
  };

  const updateMarketPrice = (symbol: string, price: number, changePercent: number) => {
    setMarketData(prev => prev.map(item => 
      item.symbol === symbol 
        ? { ...item, price, change24h: changePercent, lastUpdate: new Date() }
        : item
    ));
  };

  const loadMarketData = async () => {
    // In production, fetch from API
    // For now, using mock data
  };

  const loadSMCOpportunities = () => {
    // Generate mock SMC opportunities
    const opportunities: SMCOpportunity[] = [
      {
        id: '1',
        type: 'orderBlock',
        direction: 'long',
        entryPrice: 97500,
        targetPrice: 102000,
        stopLoss: 96000,
        riskReward: 3.0,
        probability: 75,
        timeframe: '4h',
        status: 'active',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: '2',
        type: 'fairValueGap',
        direction: 'short',
        entryPrice: 99200,
        targetPrice: 96500,
        stopLoss: 100500,
        riskReward: 2.08,
        probability: 68,
        timeframe: '1h',
        status: 'active',
        createdAt: new Date(Date.now() - 30 * 60 * 1000)
      },
      {
        id: '3',
        type: 'liquidityPool',
        direction: 'long',
        entryPrice: 98000,
        targetPrice: 103500,
        stopLoss: 95500,
        riskReward: 2.2,
        probability: 82,
        timeframe: '1d',
        status: 'active',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      }
    ];
    setSmcOpportunities(opportunities);
  };

  const loadNews = () => {
    // Generate mock news
    const news: NewsItem[] = [
      {
        id: '1',
        title: 'Bitcoin Breaks $98,000 as Institutional Demand Surges',
        summary: 'Major institutional investors continue to accumulate Bitcoin, pushing the price to new yearly highs.',
        source: 'CoinDesk',
        url: '#',
        sentiment: 'positive',
        impact: 'high',
        publishedAt: new Date(Date.now() - 30 * 60 * 1000),
        tags: ['Bitcoin', 'Price', 'Institutional']
      },
      {
        id: '2',
        title: 'New Ordinals Collection Launches with Record Volume',
        summary: 'The latest Ordinals collection sees unprecedented demand, with over 1000 BTC in volume within the first hour.',
        source: 'Ordinals News',
        url: '#',
        sentiment: 'positive',
        impact: 'medium',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        tags: ['Ordinals', 'NFTs', 'Volume']
      },
      {
        id: '3',
        title: 'Regulatory Concerns Emerge Over Bitcoin ETF Outflows',
        summary: 'Regulators express concerns about recent ETF outflows, citing market manipulation risks.',
        source: 'Reuters',
        url: '#',
        sentiment: 'negative',
        impact: 'medium',
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        tags: ['Regulation', 'ETF', 'Risk']
      }
    ];
    setNewsItems(news);
  };

  const generateAlerts = () => {
    const newAlerts: Alert[] = [
      {
        id: '1',
        type: 'price',
        severity: 'critical',
        title: 'Bitcoin Approaching Resistance',
        message: 'BTC is nearing the $99,000 resistance level with increasing volume',
        timestamp: new Date(),
        actionable: true
      },
      {
        id: '2',
        type: 'technical',
        severity: 'warning',
        title: 'RSI Overbought Signal',
        message: '4H RSI has entered overbought territory (>70)',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        actionable: true
      },
      {
        id: '3',
        type: 'volume',
        severity: 'info',
        title: 'Volume Spike Detected',
        message: '24h volume increased by 45% compared to 7-day average',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        actionable: false
      }
    ];
    setAlerts(newAlerts);
  };

  const updateMarketData = async () => {
    // Fetch real BTC price from CoinGecko proxy
    try {
      const res = await fetch(
        '/api/coingecko?endpoint=/coins/markets&params=' +
          encodeURIComponent('vs_currency=usd&ids=bitcoin&per_page=1&page=1')
      );
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const btc = data[0];
        setMarketData(prev => prev.map(item =>
          item.symbol === 'BTC'
            ? {
                ...item,
                price: btc.current_price || item.price,
                change24h: btc.price_change_percentage_24h || item.change24h,
                volume24h: btc.total_volume || item.volume24h,
                high24h: btc.high_24h || item.high24h,
                low24h: btc.low_24h || item.low24h,
                marketCap: btc.market_cap || item.marketCap,
                lastUpdate: new Date(),
              }
            : item
        ));
      }
    } catch (err) {
      console.error('MarketTradingFloor update error:', err);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-600/20 text-red-400 border-red-500';
      case 'medium': return 'bg-yellow-600/20 text-yellow-400 border-yellow-500';
      default: return 'bg-blue-600/20 text-blue-400 border-blue-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Globe className="w-6 h-6 text-blue-500" />
                Market Trading Floor
              </h1>
              <p className="text-gray-400 text-sm">Real-time market intelligence & Smart Money analysis</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                className={`p-2 rounded-lg transition-colors ${
                  isAutoRefresh 
                    ? 'bg-green-600/20 text-green-400 border border-green-500' 
                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isAutoRefresh ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={() => setShowAlertConfig(!showAlertConfig)}
                className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
              >
                <Bell className="w-4 h-4" />
              </button>
              
              <button className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Market Overview - Left Column */}
          <div className="col-span-3 space-y-6">
            {/* Price Tickers */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Market Prices
              </h3>
              <div className="space-y-3">
                {marketData.map(item => (
                  <div key={item.symbol} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{item.symbol}</span>
                      <span className="text-xs text-gray-500">
                        {format(item.lastUpdate, 'HH:mm:ss')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold">
                        ${item.price.toLocaleString()}
                      </span>
                      <span className={`text-sm font-medium flex items-center gap-1 ${
                        item.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {item.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(item.change24h).toFixed(2)}%
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">24h High:</span>
                        <span className="ml-1">${item.high24h.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">24h Low:</span>
                        <span className="ml-1">${item.low24h.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Stats */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-500" />
                Market Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Market Cap</span>
                  <span className="font-medium">{formatNumber(marketData[0].marketCap)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">24h Volume</span>
                  <span className="font-medium">{formatNumber(marketData[0].volume24h)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">BTC Dominance</span>
                  <span className="font-medium">52.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fear & Greed</span>
                  <span className="font-medium text-green-400">75 - Greed</span>
                </div>
              </div>
            </div>
          </div>

          {/* SMC Opportunities - Center */}
          <div className="col-span-6">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Target className="w-6 h-6 text-orange-500" />
                  Smart Money Concepts
                </h3>
                <select
                  value={selectedTimeframe}
                  onChange={(e) => setSelectedTimeframe(e.target.value)}
                  className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-sm"
                >
                  <option value="5m">5m</option>
                  <option value="15m">15m</option>
                  <option value="1h">1h</option>
                  <option value="4h">4h</option>
                  <option value="1d">1D</option>
                </select>
              </div>

              <div className="space-y-4">
                {smcOpportunities.map(opp => (
                  <motion.div
                    key={opp.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-orange-500 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          opp.direction === 'long' 
                            ? 'bg-green-600/20 text-green-400' 
                            : 'bg-red-600/20 text-red-400'
                        }`}>
                          {opp.direction === 'long' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{opp.type.replace(/([A-Z])/g, ' $1')}</p>
                          <p className="text-sm text-gray-400">{opp.timeframe} timeframe</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">R:R</p>
                        <p className="font-bold text-lg">{opp.riskReward.toFixed(1)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500">Entry</p>
                        <p className="font-mono">${opp.entryPrice.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Target</p>
                        <p className="font-mono text-green-400">${opp.targetPrice.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Stop Loss</p>
                        <p className="font-mono text-red-400">${opp.stopLoss.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-orange-500 to-yellow-500 h-2 rounded-full"
                            style={{ width: `${opp.probability}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400">{opp.probability}% probability</span>
                      </div>
                      <button className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-sm font-medium transition-colors">
                        Trade
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* News & Alerts - Right Column */}
          <div className="col-span-3 space-y-6">
            {/* Alerts */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Active Alerts
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.severity === 'critical' 
                        ? 'bg-red-900/20 border-red-700' 
                        : alert.severity === 'warning'
                        ? 'bg-yellow-900/20 border-yellow-700'
                        : 'bg-blue-900/20 border-blue-700'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {format(alert.timestamp, 'HH:mm:ss')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* News Feed */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-blue-500" />
                Market News
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {newsItems.map(news => (
                  <div key={news.id} className="border-b border-gray-800 pb-3 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium flex-1 pr-2">{news.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getImpactBadge(news.impact)}`}>
                        {news.impact}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{news.summary}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${getSentimentColor(news.sentiment)}`}>
                          {news.sentiment}
                        </span>
                        <span className="text-xs text-gray-500">• {news.source}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {format(news.publishedAt, 'HH:mm')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}