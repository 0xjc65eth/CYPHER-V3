'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Volume2, 
  DollarSign,
  Bitcoin,
  BarChart3,
  Globe,
  Target,
  AlertTriangle,
  Clock,
  Users,
  Flame,
  RefreshCw,
  Maximize2,
  Signal,
  ArrowUpRight,
  ArrowDownRight,
  Newspaper
} from 'lucide-react';

interface MarketTicker {
  symbol: string;
  name: string;
  type: 'crypto' | 'ordinal' | 'rune' | 'brc20';
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap?: number;
  high24h: number;
  low24h: number;
  lastUpdate: number;
  trending: boolean;
  volatility: 'low' | 'medium' | 'high';
}

interface MarketSentiment {
  overall: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  score: number;
  btcDominance: number;
  totalMarketCap: number;
  totalVolume24h: number;
  activeTraders: number;
  fearGreedComponents: {
    volatility: number;
    momentum: number;
    social: number;
    dominance: number;
    trends: number;
  };
}

export default function MarketOverviewOrganized() {
  const [isLive, setIsLive] = useState(true);
  const [timeframe, setTimeframe] = useState('1h');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  
  // Market data states
  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [indicators, setIndicators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Format helpers
  const formatPrice = (price: number): string => {
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(1)}M`;
    return `$${(volume / 1e3).toFixed(1)}K`;
  };

  const formatChange = (change: number, showPercent = false): string => {
    const sign = change >= 0 ? '+' : '';
    return showPercent ? `${sign}${change.toFixed(2)}%` : `${sign}${change.toFixed(2)}`;
  };

  // Get sentiment color
  const getSentimentColor = (score: number) => {
    if (score <= 25) return 'text-red-500 bg-red-500/10';
    if (score <= 45) return 'text-orange-500 bg-orange-500/10';
    if (score <= 55) return 'text-yellow-500 bg-yellow-500/10';
    if (score <= 75) return 'text-lime-500 bg-lime-500/10';
    return 'text-green-500 bg-green-500/10';
  };

  const getSentimentText = (overall: string) => {
    switch (overall) {
      case 'extreme_fear': return 'Extreme Fear';
      case 'fear': return 'Fear';
      case 'neutral': return 'Neutral';
      case 'greed': return 'Greed';
      case 'extreme_greed': return 'Extreme Greed';
      default: return 'Unknown';
    }
  };

  // Load market data
  const loadMarketData = async () => {
    try {
      setLoading(true);
      
      const [tickersRes, sentimentRes, signalsRes, newsRes, indicatorsRes] = await Promise.all([
        fetch('/api/market/tickers/'),
        fetch('/api/market/sentiment/'),
        fetch('/api/market/signals/'),
        fetch('/api/market/news/'),
        fetch('/api/market/indicators/')
      ]);

      if (tickersRes.ok) {
        const data = await tickersRes.json();
        setTickers(data.data || []);
      }

      if (sentimentRes.ok) {
        const data = await sentimentRes.json();
        setSentiment(data.data);
      }

      if (signalsRes.ok) {
        const data = await signalsRes.json();
        setSignals(data.data || []);
      }

      if (newsRes.ok) {
        const data = await newsRes.json();
        setNews(data.data || []);
      }

      if (indicatorsRes.ok) {
        const data = await indicatorsRes.json();
        setIndicators(data.data || []);
      }

      setLastUpdate(Date.now());
    } catch (error) {
      console.error('Erro ao carregar dados do mercado:', error);
    } finally {
      setLoading(false);
    }
  };

  // WebSocket integration
  useEffect(() => {
    loadMarketData();

    // Use polling for market data updates (WebSocket server not available on Vercel)
    const interval = isLive ? setInterval(loadMarketData, 30000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLive]);

  const updatePricesFromWebSocket = (priceUpdates: any) => {
    setTickers(prevTickers => 
      prevTickers.map(ticker => {
        const update = priceUpdates[ticker.symbol];
        if (update) {
          return {
            ...ticker,
            price: update.price || ticker.price,
            change24h: update.change || ticker.change24h,
            changePercent24h: update.changePercent || ticker.changePercent24h,
            lastUpdate: Date.now()
          };
        }
        return ticker;
      })
    );
    setLastUpdate(Date.now());
  };

  const updateMarketStats = (stats: any) => {
    setSentiment(prev => prev ? {
      ...prev,
      totalMarketCap: stats.totalMarketCap || prev.totalMarketCap,
      btcDominance: stats.btcDominance || prev.btcDominance,
      totalVolume24h: stats.totalVolume24h || prev.totalVolume24h,
      activeTraders: stats.activeTraders || prev.activeTraders
    } : null);
  };

  const addNewSignal = (signal: any) => {
    setSignals(prev => [signal, ...prev].slice(0, 10));
  };

  if (loading && tickers.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading market data...</p>
        </div>
      </div>
    );
  }

  // Top movers
  const topGainers = [...tickers]
    .sort((a, b) => b.changePercent24h - a.changePercent24h)
    .slice(0, 5);
  
  const topLosers = [...tickers]
    .sort((a, b) => a.changePercent24h - b.changePercent24h)
    .slice(0, 5);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : ''} bg-black text-white`}>
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-orange-500" />
              <span>Market Overview</span>
            </h1>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsLive(!isLive)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                  isLive 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}
              >
                <Signal className={`h-4 w-4 ${isLive ? 'animate-pulse' : ''}`} />
                <span>{isLive ? 'LIVE' : 'PAUSED'}</span>
              </button>

              <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-1">
                {['1h', '4h', '1d', '1w'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                      timeframe === tf
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              <Clock className="h-4 w-4 inline mr-1" />
              Last update: {lastUpdate > 0 ? new Date(lastUpdate).toLocaleTimeString() : '--:--:--'}
            </div>
            
            <button
              onClick={() => loadMarketData()}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Maximize2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Market Stats Bar */}
        {sentiment && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            {/* Fear & Greed Index */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-sm text-gray-400 mb-2">Fear & Greed Index</div>
              <div className={`text-2xl font-bold ${getSentimentColor(sentiment.score).split(' ')[0]}`}>
                {sentiment.score}
              </div>
              <div className={`text-sm mt-1 ${getSentimentColor(sentiment.score).split(' ')[0]}`}>
                {getSentimentText(sentiment.overall)}
              </div>
            </div>

            {/* Market Cap */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-sm text-gray-400 mb-2">Total Market Cap</div>
              <div className="text-2xl font-bold text-white">
                {formatVolume(sentiment.totalMarketCap)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                24h Volume: {formatVolume(sentiment.totalVolume24h)}
              </div>
            </div>

            {/* BTC Dominance */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-sm text-gray-400 mb-2">BTC Dominance</div>
              <div className="text-2xl font-bold text-orange-500">
                {sentiment.btcDominance.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                ETH: {((100 - sentiment.btcDominance) * 0.4).toFixed(1)}%
              </div>
            </div>

            {/* Active Traders */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-sm text-gray-400 mb-2">Active Traders</div>
              <div className="text-2xl font-bold text-white flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-500" />
                {(sentiment.activeTraders / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Online now
              </div>
            </div>

            {/* Network Activity */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-sm text-gray-400 mb-2">Network Activity</div>
              <div className="text-2xl font-bold text-green-500 flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                High
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Gas: 47 gwei
              </div>
            </div>
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Price Tickers */}
          <div className="xl:col-span-2 space-y-6">
            {/* Top Assets */}
            <div className="bg-gray-900 rounded-xl border border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-lg font-bold flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-orange-500" />
                  Top Assets by Market Cap
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left p-4 text-gray-400 font-medium">Asset</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Price</th>
                      <th className="text-right p-4 text-gray-400 font-medium">24h Change</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Volume</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Market Cap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickers.slice(0, 10).map((ticker) => (
                      <tr key={ticker.symbol} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                              <Bitcoin className="h-4 w-4 text-orange-500" />
                            </div>
                            <div>
                              <div className="font-medium text-white">{ticker.symbol}</div>
                              <div className="text-xs text-gray-500">{ticker.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="text-white font-medium">{formatPrice(ticker.price)}</div>
                        </td>
                        <td className="p-4 text-right">
                          <div className={`font-medium ${ticker.changePercent24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatChange(ticker.changePercent24h, true)}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="text-gray-400">{formatVolume(ticker.volume24h)}</div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="text-gray-400">{ticker.marketCap ? formatVolume(ticker.marketCap) : '-'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Market Movers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Gainers */}
              <div className="bg-gray-900 rounded-xl border border-gray-800">
                <div className="p-4 border-b border-gray-800">
                  <h3 className="text-lg font-bold flex items-center text-green-500">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Top Gainers
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {topGainers.map((ticker) => (
                    <div key={ticker.symbol} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <div className="font-medium text-white">{ticker.symbol}</div>
                          <div className="text-xs text-gray-500">{formatPrice(ticker.price)}</div>
                        </div>
                      </div>
                      <div className="text-green-500 font-bold">
                        {formatChange(ticker.changePercent24h, true)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Losers */}
              <div className="bg-gray-900 rounded-xl border border-gray-800">
                <div className="p-4 border-b border-gray-800">
                  <h3 className="text-lg font-bold flex items-center text-red-500">
                    <TrendingDown className="h-5 w-5 mr-2" />
                    Top Losers
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {topLosers.map((ticker) => (
                    <div key={ticker.symbol} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        </div>
                        <div>
                          <div className="font-medium text-white">{ticker.symbol}</div>
                          <div className="text-xs text-gray-500">{formatPrice(ticker.price)}</div>
                        </div>
                      </div>
                      <div className="text-red-500 font-bold">
                        {formatChange(ticker.changePercent24h, true)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Signals & News */}
          <div className="space-y-6">
            {/* Trading Signals */}
            <div className="bg-gray-900 rounded-xl border border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-lg font-bold flex items-center">
                  <Target className="h-5 w-5 mr-2 text-orange-500" />
                  Trading Signals
                </h3>
              </div>
              
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {signals.slice(0, 5).map((signal, index) => (
                  <div key={index} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">{signal.asset}</span>
                      <div className={`px-2 py-1 rounded text-xs font-bold ${
                        signal.type === 'buy' ? 'bg-green-500/20 text-green-400' :
                        signal.type === 'sell' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {signal.type?.toUpperCase() || 'HOLD'}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-400">
                      <div className="flex justify-between mb-1">
                        <span>Confidence</span>
                        <span className="text-white">{signal.confidence}%</span>
                      </div>
                      <p className="text-xs mt-2">{signal.reasoning}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market News */}
            <div className="bg-gray-900 rounded-xl border border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-lg font-bold flex items-center">
                  <Newspaper className="h-5 w-5 mr-2 text-orange-500" />
                  Latest News
                </h3>
              </div>
              
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {news.slice(0, 5).map((item, index) => (
                  <div key={index} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <h4 className="font-medium text-white mb-1 line-clamp-2">{item.title}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{item.source}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        item.sentiment === 'bullish' ? 'bg-green-500/20 text-green-400' :
                        item.sentiment === 'bearish' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {item.sentiment}
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