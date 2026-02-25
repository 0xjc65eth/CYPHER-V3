'use client';

import React, { useState, useEffect } from 'react';
import styles from '../../styles/WallStreet.module.css';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Volume2, 
  DollarSign,
  Bitcoin,
  Zap,
  BarChart3,
  PieChart,
  Target,
  AlertTriangle,
  Clock,
  Globe,
  Users,
  Flame,
  Eye,
  RefreshCw,
  Maximize2,
  Signal,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Calendar
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
  fearGreedHistory: { timestamp: number; score: number }[];
}

interface TradingSignal {
  id: string;
  asset: string;
  type: 'buy' | 'sell' | 'hold';
  strength: 'weak' | 'moderate' | 'strong';
  timeframe: '1h' | '4h' | '1d' | '1w';
  confidence: number;
  price: number;
  target?: number;
  stopLoss?: number;
  reasoning: string;
  timestamp: number;
}

interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  impact: 'high' | 'medium' | 'low';
  sentiment: 'positive' | 'negative' | 'neutral';
  source: string;
  timestamp: number;
  relatedAssets: string[];
}

interface EconomicIndicator {
  name: string;
  value: number;
  change: number;
  impact: 'bullish' | 'bearish' | 'neutral';
  description: string;
}

export default function MarketOverview() {
  // Estados principais
  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null);
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [indicators, setIndicators] = useState<EconomicIndicator[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '4h' | '1d' | '1w'>('1h');
  const [fullscreen, setFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Estados para animações
  const [flashingTickers, setFlashingTickers] = useState<Set<string>>(new Set());
  const [priceAlerts, setPriceAlerts] = useState<{ [key: string]: 'up' | 'down' }>({});

  // Função para atualizar preços via WebSocket
  const updateTickerPrices = (priceUpdates: any) => {
    setTickers(prevTickers => {
      const newTickers = [...prevTickers];
      const newFlashing = new Set<string>();
      const newAlerts: { [key: string]: 'up' | 'down' } = {};
      
      Object.entries(priceUpdates).forEach(([symbol, data]: any) => {
        const tickerIndex = newTickers.findIndex(t => t.symbol === symbol);
        if (tickerIndex !== -1) {
          const oldPrice = newTickers[tickerIndex].price;
          newTickers[tickerIndex] = {
            ...newTickers[tickerIndex],
            price: data.price,
            change24h: data.change || newTickers[tickerIndex].change24h,
            changePercent24h: data.changePercent || newTickers[tickerIndex].changePercent24h,
            volume24h: data.volume || newTickers[tickerIndex].volume24h,
            lastUpdate: Date.now()
          };
          
          // Adicionar animação se o preço mudou
          if (oldPrice !== data.price) {
            newFlashing.add(symbol);
            newAlerts[symbol] = data.price > oldPrice ? 'up' : 'down';
          }
        }
      });
      
      // Aplicar animações
      if (newFlashing.size > 0) {
        setFlashingTickers(newFlashing);
        setPriceAlerts(newAlerts);
        
        setTimeout(() => {
          setFlashingTickers(new Set());
          setPriceAlerts({});
        }, 2000);
      }
      
      return newTickers;
    });
  };

  // Carregar dados iniciais e conectar WebSocket
  useEffect(() => {
    loadMarketData();
    
    // Conectar WebSocket para dados em tempo real
    let ws: WebSocket | null = null;
    
    if (isLive && typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/websocket`;
      
      try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'price_update') {
              updateTickerPrices(data.payload);
            }
          } catch (error) {
            console.error('Erro ao processar mensagem WebSocket:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('Erro WebSocket:', error);
        };
      } catch (error) {
        console.error('Erro ao conectar WebSocket:', error);
      }
    }
    
    // Auto-refresh se WebSocket não estiver disponível
    const interval = isLive ? setInterval(() => {
      loadMarketData();
      setLastUpdate(new Date());
    }, 5000) : null;
    
    return () => {
      if (ws) ws.close();
      if (interval) clearInterval(interval);
    };
  }, [isLive, selectedTimeframe]);

  // Carregar todos os dados de mercado
  const loadMarketData = async () => {
    try {
      const [tickersRes, sentimentRes, signalsRes, newsRes, indicatorsRes] = await Promise.allSettled([
        fetch('/api/market/tickers/'),
        fetch('/api/market/sentiment/'),
        fetch('/api/market/signals/'),
        fetch('/api/market/news/'),
        fetch('/api/market/indicators/')
      ]);

      // Processar tickers
      if (tickersRes.status === 'fulfilled' && tickersRes.value.ok) {
        const tickersData = await tickersRes.value.json();
        
        // Detectar mudanças de preço para animações
        if (tickers.length > 0) {
          const newFlashing = new Set<string>();
          const newAlerts: { [key: string]: 'up' | 'down' } = {};
          
          (tickersData.data || []).forEach((newTicker: MarketTicker) => {
            const oldTicker = tickers.find(t => t.symbol === newTicker.symbol);
            if (oldTicker && oldTicker.price !== newTicker.price) {
              newFlashing.add(newTicker.symbol);
              newAlerts[newTicker.symbol] = newTicker.price > oldTicker.price ? 'up' : 'down';
            }
          });
          
          setFlashingTickers(newFlashing);
          setPriceAlerts(newAlerts);
          
          // Limpar animações após 2 segundos
          setTimeout(() => {
            setFlashingTickers(new Set());
            setPriceAlerts({});
          }, 2000);
        }
        
        setTickers(tickersData.data || []);
      }

      // Processar outros dados
      if (sentimentRes.status === 'fulfilled' && sentimentRes.value.ok) {
        const sentimentData = await sentimentRes.value.json();
        setSentiment(sentimentData.data);
      }

      if (signalsRes.status === 'fulfilled' && signalsRes.value.ok) {
        const signalsData = await signalsRes.value.json();
        setSignals(signalsData.data || []);
      }

      if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
        const newsData = await newsRes.value.json();
        setNews(newsData.data || []);
      }

      if (indicatorsRes.status === 'fulfilled' && indicatorsRes.value.ok) {
        const indicatorsData = await indicatorsRes.value.json();
        setIndicators(indicatorsData.data || []);
      }

    } catch (error) {
      console.error('Erro ao carregar dados de mercado:', error);
    }
  };

  // Formatação de números
  const formatPrice = (price: number, decimals: number = 2) => {
    if (price < 0.000001) return `${(price * 100000000).toFixed(0)} sats`;
    if (price < 1) return `${price.toFixed(6)}`;
    return `${price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  const formatChange = (change: number, isPercent: boolean = false) => {
    const sign = change >= 0 ? '+' : '';
    const suffix = isPercent ? '%' : '';
    return `${sign}${change.toFixed(2)}${suffix}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000000) return `${(volume / 1000000000).toFixed(2)}B`;
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(2)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(2)}K`;
    return `${volume.toFixed(2)}`;
  };

  // Obter cor do sentimento
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'extreme_greed': return 'text-green-400 bg-green-500/20';
      case 'greed': return 'text-green-300 bg-green-500/15';
      case 'neutral': return 'text-yellow-400 bg-yellow-500/20';
      case 'fear': return 'text-red-300 bg-red-500/15';
      case 'extreme_fear': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  // Obter cor do sinal
  const getSignalColor = (type: string) => {
    switch (type) {
      case 'buy': return 'text-green-400 bg-green-500/20';
      case 'sell': return 'text-red-400 bg-red-500/20';
      default: return 'text-yellow-400 bg-yellow-500/20';
    }
  };

  return (
    <div className={`${styles.wallStreetContainer} ${fullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Matrix Rain Effect */}
      <div className={styles.matrixRain}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={styles.matrixColumn}
            style={{
              left: `${i * 5}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${8 + Math.random() * 4}s`
            }}
          >
            {Array.from({ length: 20 }).map((_, j) => (
              <div key={j}>
                {Math.random() > 0.7 ? String.fromCharCode(0x30A0 + Math.random() * 96) : 
                 Math.random() > 0.5 ? Math.floor(Math.random() * 10) : 
                 String.fromCharCode(65 + Math.random() * 26)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Header estilo trading floor */}
      <div className={styles.tradingHeader}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <h1 className="text-2xl font-bold text-green-400">LIVE MARKET</h1>
              </div>
              
              {/* Market Status */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-300">{lastUpdate.toLocaleTimeString()}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Signal className="h-4 w-4 text-green-400" />
                  <span className="text-green-400">CONNECTED</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="text-blue-400">{sentiment?.activeTraders.toLocaleString() || '0'} traders</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Timeframe selector */}
              <div className="flex items-center bg-gray-900 rounded-lg border border-gray-700">
                {(['1h', '4h', '1d', '1w'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={`px-3 py-2 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                      selectedTimeframe === tf
                        ? 'bg-orange-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tf.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Live toggle */}
              <button
                onClick={() => setIsLive(!isLive)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isLive ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-white animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm font-medium">LIVE</span>
              </button>

              {/* Fullscreen */}
              <button
                onClick={() => setFullscreen(!fullscreen)}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6 relative z-10">
        {/* Ticker Tape Wall Street Style */}
        <div className={styles.tickerTape}>
          <div className={styles.tickerContent}>
            {tickers.map((ticker, index) => (
              <div key={index} className={styles.tickerItem}>
                <span className={styles.tickerSymbol}>{ticker.symbol}</span>
                <span className={styles.tickerPrice}>${formatPrice(ticker.price)}</span>
                <span className={ticker.changePercent24h >= 0 ? styles.tickerChangePositive : styles.tickerChangeNegative}>
                  {formatChange(ticker.changePercent24h, true)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Market Pulse Cards */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
          <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Market Pulse</span>
            </h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {tickers.slice(0, 12).map((ticker) => (
                <div
                  key={ticker.symbol}
                  className={`${styles.tradingCard} transition-all duration-200 ${
                    flashingTickers.has(ticker.symbol)
                      ? priceAlerts[ticker.symbol] === 'up'
                        ? styles.priceFlashGreen
                        : styles.priceFlashRed
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-bold text-sm">{ticker.symbol}</span>
                      {ticker.trending && <Flame className="h-3 w-3 text-orange-400" />}
                    </div>
                    
                    <div className={`text-xs px-2 py-1 rounded ${
                      ticker.volatility === 'high' ? 'bg-red-500/20 text-red-400' :
                      ticker.volatility === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {(ticker.volatility || '').toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className={styles.metricValue}>
                      {formatPrice(ticker.price)}
                    </div>
                    
                    <div className={`text-sm flex items-center space-x-1 ${
                      ticker.changePercent24h >= 0 ? styles.changePositive : styles.changeNegative
                    }`}>
                      {ticker.changePercent24h >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{formatChange(ticker.changePercent24h, true)}</span>
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      Vol: {formatVolume(ticker.volume24h)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Market Sentiment & Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sentiment Dashboard */}
            {sentiment && (
              <div className={styles.tradingCard}>
                <div className={styles.cardHeader}>
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Market Sentiment</span>
                  </h3>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Fear & Greed Index */}
                    <div className="text-center">
                      <div className="relative w-32 h-32 mx-auto mb-4">
                        <div className="absolute inset-0 bg-gray-800 rounded-full"></div>
                        <div 
                          className="absolute inset-2 rounded-full flex items-center justify-center"
                          style={{
                            background: `conic-gradient(from 0deg, 
                              ${sentiment.score <= 20 ? '#ef4444' : 
                                sentiment.score <= 40 ? '#f97316' : 
                                sentiment.score <= 60 ? '#eab308' : 
                                sentiment.score <= 80 ? '#22c55e' : '#10b981'} 
                              ${sentiment.score * 3.6}deg, 
                              #374151 ${sentiment.score * 3.6}deg)`
                          }}
                        >
                          <div className="bg-gray-900 rounded-full w-20 h-20 flex items-center justify-center">
                            <span className="text-2xl font-bold text-white">{sentiment.score}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${getSentimentColor(sentiment.overall)}`}>
                        {sentiment.overall.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>

                    {/* Market Stats */}
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className={styles.metricLabel}>Total Market Cap</span>
                        <span className={styles.metricValue}>{formatVolume(sentiment.totalMarketCap)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className={styles.metricLabel}>24h Volume</span>
                        <span className={styles.metricValue}>{formatVolume(sentiment.totalVolume24h)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className={styles.metricLabel}>BTC Dominance</span>
                        <span className={styles.metricValue}>{sentiment.btcDominance.toFixed(1)}%</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className={styles.metricLabel}>Active Traders</span>
                        <span className={styles.metricValue}>{sentiment.activeTraders.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Economic Indicators */}
            <div className="bg-gray-900/50 rounded-xl border border-gray-800">
              <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-700">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>Economic Indicators</span>
                </h3>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {indicators.map((indicator, index) => (
                    <div key={index} className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">{indicator.name}</span>
                        <div className={`flex items-center space-x-1 ${
                          indicator.impact === 'bullish' ? 'text-green-400' :
                          indicator.impact === 'bearish' ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {indicator.impact === 'bullish' ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : indicator.impact === 'bearish' ? (
                            <ArrowDownRight className="h-3 w-3" />
                          ) : (
                            <Activity className="h-3 w-3" />
                          )}
                          <span className="text-xs">{(indicator.impact || '').toUpperCase()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold">{indicator.value}</span>
                        <span className={`text-sm ${
                          indicator.change >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatChange(indicator.change, true)}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-2">{indicator.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Signals & News */}
          <div className="space-y-6">
            {/* Trading Signals */}
            <div className="bg-gray-900/50 rounded-xl border border-gray-800">
              <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-700">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Trading Signals</span>
                </h3>
              </div>
              
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {signals.map((signal) => (
                  <div key={signal.id} className="p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">{signal.asset}</span>
                      <div className={`px-2 py-1 rounded text-xs font-bold ${getSignalColor(signal.type)}`}>
                        {(signal.type || '').toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Price</span>
                        <span className="text-white">{formatPrice(signal.price)}</span>
                      </div>
                      
                      {signal.target && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Target</span>
                          <span className="text-green-400">{formatPrice(signal.target)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Confidence</span>
                        <span className="text-white">{signal.confidence}%</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2">{signal.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Market News */}
            <div className="bg-gray-900/50 rounded-xl border border-gray-800">
              <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-700">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Market News</span>
                </h3>
              </div>
              
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {news.map((item) => (
                  <div key={item.id} className="p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-white text-sm line-clamp-2">{item.headline}</h4>
                      <div className={`px-2 py-1 rounded text-xs font-medium ml-2 ${
                        item.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                        item.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {(item.impact || '').toUpperCase()}
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">{item.summary}</p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{item.source}</span>
                      <span className="text-gray-500">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Hot Assets */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-800">
          <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-700">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Flame className="h-5 w-5 text-orange-400" />
              <span>Trending Assets</span>
            </h3>
          </div>
          
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                    <th className="pb-2">Asset</th>
                    <th className="pb-2 text-right">Price</th>
                    <th className="pb-2 text-right">24h Change</th>
                    <th className="pb-2 text-right">Volume</th>
                    <th className="pb-2 text-right">Market Cap</th>
                    <th className="pb-2 text-center">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {tickers.filter(t => t.trending).slice(0, 10).map((ticker) => (
                    <tr key={ticker.symbol} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {ticker.type === 'crypto' ? <Bitcoin className="h-4 w-4" /> :
                               ticker.type === 'rune' ? <Zap className="h-4 w-4" /> :
                               ticker.type === 'ordinal' ? <Layers className="h-4 w-4" /> : '🪙'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-white">{ticker.symbol}</div>
                            <div className="text-xs text-gray-400">{ticker.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right text-white font-medium">
                        {formatPrice(ticker.price)}
                      </td>
                      <td className={`py-3 text-right font-medium ${
                        ticker.changePercent24h >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatChange(ticker.changePercent24h, true)}
                      </td>
                      <td className="py-3 text-right text-gray-300">
                        {formatVolume(ticker.volume24h)}
                      </td>
                      <td className="py-3 text-right text-gray-300">
                        {ticker.marketCap ? formatVolume(ticker.marketCap) : '--'}
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                          <Flame className="h-4 w-4 text-orange-400" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}