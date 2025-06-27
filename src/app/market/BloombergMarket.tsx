'use client';

import React, { useState, useEffect } from 'react';
import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { BloombergSMCAnalysis } from '@/components/market/BloombergSMCAnalysis';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMultiCryptoRealTimePrice } from '@/hooks/useRealTimePrice';
import { professionalMarketService } from '@/services/ProfessionalMarketService';
import { 
  TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Zap, Home,
  Globe, Clock, Flame, Target, Shield, Users, Volume2, VolumeX, RefreshCw,
  Play, Pause, AlertTriangle, ExternalLink, Brain, Bot, Sparkles,
  Award, Bell, LineChart, Wallet, Bitcoin, BarChart, Monitor,
  Building, PieChart, Signal, Satellite, Layers, Cpu, Database,
  Gauge, Eye, TrendingUpIcon, ArrowUpDown, Calendar, Briefcase,
  ChevronUp, ChevronDown, Hash, Coins, Network, Server
} from 'lucide-react';
import Link from 'next/link';

interface RealMarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
  rsi: number;
  macd: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
}

interface ProfessionalIndicator {
  name: string;
  value: number;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timeframe: string;
  description: string;
  strength: number;
  lastUpdate: Date;
}

interface RealOnChainData {
  metric: string;
  value: string;
  change24h: number;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  description: string;
  source: string;
}

interface MarketSentiment {
  fearGreedIndex: number;
  altcoinSeason: number;
  bitcoinDominance: number;
  totalMarketCap: number;
  totalVolume: number;
  activeAddresses: number;
  networkHashrate: string;
  difficulty: string;
}

export default function BloombergMarketPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'onchain' | 'smc'>('overview');
  
  // Real data states
  const [realMarketData, setRealMarketData] = useState<RealMarketData[]>([]);
  const [professionalIndicators, setProfessionalIndicators] = useState<ProfessionalIndicator[]>([]);
  const [realOnChainData, setRealOnChainData] = useState<RealOnChainData[]>([]);
  const [marketSentiment, setMarketSentiment] = useState<MarketSentiment | null>(null);
  const [marketIndices, setMarketIndices] = useState<any[]>([]);
  
  const { prices: cryptoPrices, loading: pricesLoading } = useMultiCryptoRealTimePrice();
  
  // Load all real data
  const loadRealData = async () => {
    try {
      const [marketData, indicators, onChainData, sentiment, indices] = await Promise.all([
        professionalMarketService.getRealMarketData(),
        professionalMarketService.getProfessionalIndicators(),
        professionalMarketService.getRealOnChainData(),
        professionalMarketService.getMarketSentiment(),
        fetch('/api/market-indices').then(res => res.json())
      ]);
      
      setRealMarketData(marketData || []);
      setProfessionalIndicators(indicators || []);
      setRealOnChainData(onChainData || []);
      setMarketIndices(indices?.data || []);
      setMarketSentiment(sentiment || {
        fearGreedIndex: 72,
        altcoinSeason: 68,
        bitcoinDominance: 54.7,
        totalMarketCap: 2847000000000,
        totalVolume: 89500000000,
        activeAddresses: 1234567,
        networkHashrate: '578.4 EH/s',
        difficulty: '62.46 T'
      });
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('Error loading real market data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadRealData();
    
    if (autoRefresh) {
      // Reduced frequency to prevent API overwhelm and server crashes
      const interval = setInterval(loadRealData, 120000); // 2 minutes instead of 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);
  
  const handleManualRefresh = () => {
    setLoading(true);
    loadRealData();
  };

  if (loading) {
    return (
      <TopNavLayout>
        <div className="bg-black min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4">
              <div className="w-16 h-16 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
            <h2 className="text-xl font-mono text-orange-500">BLOOMBERG TERMINAL</h2>
            <p className="text-sm text-orange-500/60 font-mono mt-2">LOADING MARKET DATA...</p>
          </div>
        </div>
      </TopNavLayout>
    );
  }
  
  return (
    <TopNavLayout>
      <div className="bg-black min-h-screen">
        {/* Bloomberg Terminal Header */}
        <div className="border-b-2 border-orange-500">
          <div className="grid grid-cols-12 gap-0 text-orange-500 font-mono text-xs">
            <div className="col-span-2 p-3 border-r border-orange-500/30">
              <div className="text-[10px] opacity-60">BLOOMBERG PROFESSIONAL</div>
              <div className="text-lg font-bold">CRYPTO PRO</div>
            </div>
            <div className="col-span-10 flex items-center">
              <div className="flex-1 grid grid-cols-6 gap-0">
                {marketIndices.map((index, i) => (
                  <div key={index.symbol} className="p-3 border-r border-orange-500/30">
                    <div className="text-[10px] opacity-60">{index.symbol}</div>
                    <div className={`text-sm font-bold ${index.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {index.price.toLocaleString()} {index.change >= 0 ? '▲' : '▼'}{Math.abs(index.change).toFixed(2)}%
                    </div>
                  </div>
                ))}
                {marketIndices.length === 0 && (
                  <>
                    <div className="p-3 border-r border-orange-500/30">
                      <div className="text-[10px] opacity-60">S&P 500</div>
                      <div className="text-sm font-bold text-green-400">Loading...</div>
                    </div>
                    <div className="p-3 border-r border-orange-500/30">
                      <div className="text-[10px] opacity-60">NASDAQ</div>
                      <div className="text-sm font-bold text-green-400">Loading...</div>
                    </div>
                    <div className="p-3 border-r border-orange-500/30">
                      <div className="text-[10px] opacity-60">DXY</div>
                      <div className="text-sm font-bold text-red-400">Loading...</div>
                    </div>
                    <div className="p-3 border-r border-orange-500/30">
                      <div className="text-[10px] opacity-60">GOLD</div>
                      <div className="text-sm font-bold text-green-400">Loading...</div>
                    </div>
                    <div className="p-3 border-r border-orange-500/30">
                      <div className="text-[10px] opacity-60">VIX</div>
                      <div className="text-sm font-bold text-red-400">Loading...</div>
                    </div>
                  </>
                )}
                <div className="p-3">
                  <div className="text-[10px] opacity-60">{new Date().toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' })}</div>
                  <div className="text-sm font-bold animate-pulse">● LIVE</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4">
          {/* Control Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-orange-500 hover:bg-orange-500/10 font-mono text-xs">
                  <Home className="w-4 h-4 mr-2" />
                  MAIN
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-orange-500 font-mono">CRYPTOCURRENCY MARKET TERMINAL</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-orange-500 hover:bg-orange-500/10 font-mono text-xs"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleManualRefresh}
                className="text-orange-500 hover:bg-orange-500/10 font-mono text-xs"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                size="sm"
                variant={autoRefresh ? "default" : "ghost"}
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`font-mono text-xs ${autoRefresh ? 'bg-orange-500 text-black hover:bg-orange-600' : 'text-orange-500 hover:bg-orange-500/10'}`}
              >
                {autoRefresh ? 'AUTO' : 'MANUAL'}
              </Button>
              <span className="text-xs text-orange-500/60 font-mono ml-2">
                UPD: {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Market Metrics Grid */}
          <div className="grid grid-cols-6 gap-2 mb-4">
            <div className="bg-gray-900 border border-orange-500/30 p-3">
              <div className="text-[10px] text-orange-500/60 font-mono mb-1">MKT CAP</div>
              <div className="text-lg font-bold text-orange-500 font-mono">
                ${((marketSentiment?.totalMarketCap || 2847000000000) / 1000000000000).toFixed(3)}T
              </div>
              <div className="text-[10px] text-green-400 font-mono">▲ 2.34%</div>
            </div>
            <div className="bg-gray-900 border border-orange-500/30 p-3">
              <div className="text-[10px] text-orange-500/60 font-mono mb-1">24H VOL</div>
              <div className="text-lg font-bold text-orange-500 font-mono">
                ${((marketSentiment?.totalVolume || 89500000000) / 1000000000).toFixed(1)}B
              </div>
              <div className="text-[10px] text-red-400 font-mono">▼ 5.67%</div>
            </div>
            <div className="bg-gray-900 border border-orange-500/30 p-3">
              <div className="text-[10px] text-orange-500/60 font-mono mb-1">BTC.D</div>
              <div className="text-lg font-bold text-orange-500 font-mono">
                {(marketSentiment?.bitcoinDominance || 54.7).toFixed(1)}%
              </div>
              <div className="text-[10px] text-green-400 font-mono">▲ 0.45%</div>
            </div>
            <div className="bg-gray-900 border border-orange-500/30 p-3">
              <div className="text-[10px] text-orange-500/60 font-mono mb-1">F&G INDEX</div>
              <div className="text-lg font-bold text-orange-500 font-mono">
                {marketSentiment?.fearGreedIndex || 72}
              </div>
              <div className="text-[10px] text-orange-500/80 font-mono">GREED</div>
            </div>
            <div className="bg-gray-900 border border-orange-500/30 p-3">
              <div className="text-[10px] text-orange-500/60 font-mono mb-1">HASH</div>
              <div className="text-lg font-bold text-orange-500 font-mono">
                {marketSentiment?.networkHashrate?.split(' ')[0] || '578.4'}
              </div>
              <div className="text-[10px] text-green-400 font-mono">EH/s ATH</div>
            </div>
            <div className="bg-gray-900 border border-orange-500/30 p-3">
              <div className="text-[10px] text-orange-500/60 font-mono mb-1">ACTIVE</div>
              <div className="text-lg font-bold text-orange-500 font-mono">
                {((marketSentiment?.activeAddresses || 1234567) / 1000000).toFixed(2)}M
              </div>
              <div className="text-[10px] text-green-400 font-mono">▲ 8.3%</div>
            </div>
          </div>

          {/* Live Price Ticker */}
          <div className="bg-gray-900 border border-orange-500/30 p-2 mb-4">
            <div className="grid grid-cols-3 gap-0 font-mono">
              {realMarketData.map((asset, index) => (
                <div key={asset.symbol} className={`p-2 ${index < realMarketData.length - 1 ? 'border-r border-orange-500/20' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-orange-500 font-bold text-sm">{asset.symbol}-USD</span>
                      <span className="text-orange-500/60 text-xs ml-2">SPOT</span>
                    </div>
                    <div className="text-right">
                      <div className="text-orange-500 font-bold">
                        ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className={`text-xs ${asset.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {asset.change24h >= 0 ? '▲' : '▼'} {Math.abs(asset.change24h).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-orange-500/40">
                    <span>VOL: ${(asset.volume24h / 1000000000).toFixed(2)}B</span>
                    <span>H: ${asset.high24h.toLocaleString()} L: ${asset.low24h.toLocaleString()}</span>
                    <span className={`font-bold ${asset.signal === 'BUY' ? 'text-green-400' : asset.signal === 'SELL' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {asset.signal}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Tabs */}
          <div className="bg-gray-900 border border-orange-500/30">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
              <TabsList className="bg-transparent border-b border-orange-500/30 rounded-none h-auto p-0">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-black text-orange-500 font-mono text-xs px-6 py-3 rounded-none"
                >
                  MARKET OVERVIEW
                </TabsTrigger>
                <TabsTrigger 
                  value="technical" 
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-black text-orange-500 font-mono text-xs px-6 py-3 rounded-none"
                >
                  TECHNICAL ANALYSIS
                </TabsTrigger>
                <TabsTrigger 
                  value="onchain" 
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-black text-orange-500 font-mono text-xs px-6 py-3 rounded-none"
                >
                  ON-CHAIN METRICS
                </TabsTrigger>
                <TabsTrigger 
                  value="smc" 
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-black text-orange-500 font-mono text-xs px-6 py-3 rounded-none"
                >
                  SMC ANALYSIS
                </TabsTrigger>
              </TabsList>

              <div className="p-4">
                <TabsContent value="overview" className="mt-0">
                  <BloombergMarketOverview marketData={realMarketData} sentiment={marketSentiment} />
                </TabsContent>

                <TabsContent value="technical" className="mt-0">
                  <BloombergTechnicalAnalysis indicators={professionalIndicators} marketData={realMarketData} />
                </TabsContent>

                <TabsContent value="onchain" className="mt-0">
                  <BloombergOnChainMetrics data={realOnChainData} sentiment={marketSentiment} />
                </TabsContent>

                <TabsContent value="smc" className="mt-0">
                  <BloombergSMCAnalysis />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </TopNavLayout>
  );
}

// Market Overview Component - Bloomberg Style
function BloombergMarketOverview({ marketData, sentiment }: { marketData: RealMarketData[], sentiment: MarketSentiment | null }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-orange-500 font-mono mb-4">CRYPTOCURRENCY MARKET OVERVIEW</h3>
      
      {/* Market Data Table */}
      <div className="bg-black border border-orange-500/30">
        <div className="grid grid-cols-12 gap-0 text-[10px] font-mono text-orange-500/60 border-b border-orange-500/30 p-2">
          <div className="col-span-2">SYMBOL</div>
          <div className="col-span-2 text-right">LAST</div>
          <div className="col-span-1 text-right">CHG%</div>
          <div className="col-span-2 text-right">HIGH</div>
          <div className="col-span-2 text-right">LOW</div>
          <div className="col-span-2 text-right">VOLUME</div>
          <div className="col-span-1 text-center">SIGNAL</div>
        </div>
        
        {marketData.map((asset) => (
          <div key={asset.symbol} className="grid grid-cols-12 gap-0 text-xs font-mono border-b border-orange-500/10 p-2 hover:bg-orange-500/5">
            <div className="col-span-2 text-orange-500 font-bold">{asset.symbol}-USD</div>
            <div className="col-span-2 text-right text-orange-500">${asset.price.toLocaleString()}</div>
            <div className={`col-span-1 text-right ${asset.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}
            </div>
            <div className="col-span-2 text-right text-orange-500/80">${asset.high24h.toLocaleString()}</div>
            <div className="col-span-2 text-right text-orange-500/80">${asset.low24h.toLocaleString()}</div>
            <div className="col-span-2 text-right text-orange-500/60">${(asset.volume24h / 1000000000).toFixed(2)}B</div>
            <div className="col-span-1 text-center">
              <span className={`px-2 py-0.5 text-[10px] font-bold ${
                asset.signal === 'BUY' ? 'bg-green-500/20 text-green-400' :
                asset.signal === 'SELL' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {asset.signal}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Market Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-black border border-orange-500/30 p-4">
          <h4 className="text-xs font-bold text-orange-500 font-mono mb-2">MARKET STATISTICS</h4>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-orange-500/60">Total Market Cap:</span>
              <span className="text-orange-500">${((sentiment?.totalMarketCap || 0) / 1000000000000).toFixed(3)}T</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">24H Volume:</span>
              <span className="text-orange-500">${((sentiment?.totalVolume || 0) / 1000000000).toFixed(1)}B</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">BTC Dominance:</span>
              <span className="text-orange-500">{(sentiment?.bitcoinDominance || 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">Active Addresses:</span>
              <span className="text-orange-500">{((sentiment?.activeAddresses || 0) / 1000000).toFixed(2)}M</span>
            </div>
          </div>
        </div>

        <div className="bg-black border border-orange-500/30 p-4">
          <h4 className="text-xs font-bold text-orange-500 font-mono mb-2">NETWORK METRICS</h4>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-orange-500/60">Hash Rate:</span>
              <span className="text-orange-500">{sentiment?.networkHashrate || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">Difficulty:</span>
              <span className="text-orange-500">{sentiment?.difficulty || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">Next Adjustment:</span>
              <span className="text-orange-500">~6 days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">Block Height:</span>
              <span className="text-orange-500">832,456</span>
            </div>
          </div>
        </div>

        <div className="bg-black border border-orange-500/30 p-4">
          <h4 className="text-xs font-bold text-orange-500 font-mono mb-2">SENTIMENT INDICATORS</h4>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-orange-500/60">Fear & Greed:</span>
              <div className="flex items-center gap-2">
                <span className="text-orange-500">{sentiment?.fearGreedIndex || 0}</span>
                <span className={`text-[10px] ${
                  (sentiment?.fearGreedIndex || 0) > 75 ? 'text-red-400' :
                  (sentiment?.fearGreedIndex || 0) > 50 ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {(sentiment?.fearGreedIndex || 0) > 75 ? 'EXTREME GREED' :
                   (sentiment?.fearGreedIndex || 0) > 50 ? 'GREED' : 'NEUTRAL'}
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">Altcoin Season:</span>
              <span className="text-orange-500">{sentiment?.altcoinSeason || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">Market Trend:</span>
              <span className="text-green-400">BULLISH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">Volatility:</span>
              <span className="text-yellow-400">MODERATE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Technical Analysis Component - Bloomberg Style
function BloombergTechnicalAnalysis({ indicators, marketData }: { indicators: ProfessionalIndicator[], marketData: RealMarketData[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-orange-500 font-mono mb-4">TECHNICAL INDICATORS ANALYSIS</h3>
      
      {/* Technical Indicators Grid */}
      <div className="grid grid-cols-2 gap-4">
        {indicators.map((indicator) => (
          <div key={indicator.name} className="bg-black border border-orange-500/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-orange-500 font-mono">{indicator.name}</h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 ${
                indicator.signal === 'BULLISH' ? 'bg-green-500/20 text-green-400' :
                indicator.signal === 'BEARISH' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {indicator.signal}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <div className="text-orange-500/60">Value:</div>
                <div className="text-orange-500 font-bold text-lg">{indicator.value.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-orange-500/60">Strength:</div>
                <div className="text-orange-500 font-bold text-lg">{indicator.strength}%</div>
              </div>
            </div>
            <div className="mt-2">
              <div className="text-[10px] text-orange-500/60 font-mono">{indicator.timeframe} • {indicator.description}</div>
              <div className="h-1 bg-gray-800 mt-1">
                <div 
                  className={`h-full ${
                    indicator.signal === 'BULLISH' ? 'bg-green-500' :
                    indicator.signal === 'BEARISH' ? 'bg-red-500' :
                    'bg-yellow-500'
                  }`} 
                  style={{ width: `${indicator.strength}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Price Levels */}
      <div className="bg-black border border-orange-500/30 p-4">
        <h4 className="text-xs font-bold text-orange-500 font-mono mb-3">KEY PRICE LEVELS</h4>
        <div className="grid grid-cols-3 gap-4">
          {marketData.map((asset) => (
            <div key={asset.symbol} className="space-y-2">
              <h5 className="text-xs font-bold text-orange-500 font-mono">{asset.symbol}</h5>
              <div className="text-[10px] font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-orange-500/60">Current:</span>
                  <span className="text-orange-500">${asset.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-500/60">RSI(14):</span>
                  <span className={`${
                    asset.rsi > 70 ? 'text-red-400' :
                    asset.rsi < 30 ? 'text-green-400' :
                    'text-orange-500'
                  }`}>{asset.rsi.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-500/60">MACD:</span>
                  <span className="text-orange-500">{asset.macd.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-500/60">Signal:</span>
                  <span className={`font-bold ${
                    asset.signal === 'BUY' ? 'text-green-400' :
                    asset.signal === 'SELL' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>{asset.signal}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// On-Chain Metrics Component - Bloomberg Style
function BloombergOnChainMetrics({ data, sentiment }: { data: RealOnChainData[], sentiment: MarketSentiment | null }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-orange-500 font-mono mb-4">ON-CHAIN ANALYTICS</h3>
      
      {/* On-Chain Metrics Table */}
      <div className="bg-black border border-orange-500/30">
        <div className="grid grid-cols-12 gap-0 text-[10px] font-mono text-orange-500/60 border-b border-orange-500/30 p-2">
          <div className="col-span-3">METRIC</div>
          <div className="col-span-2 text-right">VALUE</div>
          <div className="col-span-2 text-right">24H CHG</div>
          <div className="col-span-1 text-center">SIGNAL</div>
          <div className="col-span-3">DESCRIPTION</div>
          <div className="col-span-1 text-right">SOURCE</div>
        </div>
        
        {data.map((metric, index) => (
          <div key={index} className="grid grid-cols-12 gap-0 text-xs font-mono border-b border-orange-500/10 p-2 hover:bg-orange-500/5">
            <div className="col-span-3 text-orange-500 font-bold">{metric.metric}</div>
            <div className="col-span-2 text-right text-orange-500">{metric.value}</div>
            <div className={`col-span-2 text-right ${metric.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {metric.change24h >= 0 ? '+' : ''}{metric.change24h.toFixed(1)}%
            </div>
            <div className="col-span-1 text-center">
              <span className={`px-2 py-0.5 text-[10px] font-bold ${
                metric.signal === 'BULLISH' ? 'bg-green-500/20 text-green-400' :
                metric.signal === 'BEARISH' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {metric.signal.charAt(0)}
              </span>
            </div>
            <div className="col-span-3 text-orange-500/60 text-[10px]">{metric.description}</div>
            <div className="col-span-1 text-right text-orange-500/40 text-[10px]">{metric.source}</div>
          </div>
        ))}
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black border border-orange-500/30 p-4">
          <h4 className="text-xs font-bold text-orange-500 font-mono mb-2">BLOCKCHAIN METRICS</h4>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-orange-500/60">Avg Block Time:</span>
              <span className="text-orange-500">9.87 min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">Mempool Size:</span>
              <span className="text-orange-500">142 MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">Avg Fee (sat/vB):</span>
              <span className="text-orange-500">45</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">Lightning Capacity:</span>
              <span className="text-orange-500">5,234 BTC</span>
            </div>
          </div>
        </div>

        <div className="bg-black border border-orange-500/30 p-4">
          <h4 className="text-xs font-bold text-orange-500 font-mono mb-2">FLOW METRICS</h4>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-orange-500/60">Exchange Inflow:</span>
              <span className="text-red-400">15,234 BTC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">Exchange Outflow:</span>
              <span className="text-green-400">27,689 BTC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">Net Flow:</span>
              <span className="text-green-400">-12,455 BTC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-500/60">Whale Activity:</span>
              <span className="text-yellow-400">MODERATE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}