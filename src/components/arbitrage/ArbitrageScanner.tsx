'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMultiCryptoRealTimePrice } from '@/hooks/useRealTimePrice';
import { useArbitrageOpportunities } from '@/hooks/useArbitrageOpportunities';
import {
  Zap, TrendingUp, DollarSign, Clock, AlertCircle, ExternalLink,
  RefreshCw, Play, Pause, ArrowRight, Calculator,
  ShoppingCart, Tag, Activity, BarChart3, Bell,
  AlertTriangle, TrendingDown, Volume2, Shield,
  Target, Flame, Award, Users, Globe
} from 'lucide-react';

interface ArbitrageOpportunity {
  id: string;
  type: 'ordinals' | 'runes' | 'rare-sats';
  asset: string;
  collection?: string;
  buyMarketplace: string;
  sellMarketplace: string;
  buyPrice: number;
  sellPrice: number;
  fees: {
    buyFee: number;
    sellFee: number;
    networkFee: number;
  };
  profitAmount: number;
  profitPercent: number;
  volume24h: number;
  liquidity: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  timestamp: Date;
  buyLink: string;
  sellLink: string;
}

const MARKETPLACE_LINKS = {
  'Magic Eden': 'https://magiceden.io/ordinals',
  'OrdSwap': 'https://ordswap.io',
  'Gamma': 'https://gamma.io',
  'Unisat': 'https://unisat.io/market',
  'OKX': 'https://www.okx.com/web3/marketplace/ordinals',
  'BitcoinOrdinals': 'https://bitcoinordinals.com',
  'OrdinalsBot': 'https://ordinalsbot.com',
  'Hiro Wallet': 'https://wallet.hiro.so',
  'Leather Wallet': 'https://leather.io'
};

export function ArbitrageScanner() {
  const { opportunities: realOpportunities, loading: hookLoading, error: hookError, refresh } = useArbitrageOpportunities();
  const [activeTab, setActiveTab] = useState<'all' | 'ordinals' | 'runes' | 'rare-sats'>('all');
  const [sortBy, setSortBy] = useState<'profit' | 'confidence' | 'volume'>('profit');
  const [filterMinProfit, setFilterMinProfit] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [executedTrades, setExecutedTrades] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { prices: cryptoPrices, loading: pricesLoading } = useMultiCryptoRealTimePrice();

  // Map real hook data to the component's ArbitrageOpportunity interface
  const opportunities: ArbitrageOpportunity[] = realOpportunities.map((opp) => ({
    id: opp.id,
    type: opp.type,
    asset: opp.asset,
    collection: opp.collection,
    buyMarketplace: opp.buyMarketplace,
    sellMarketplace: opp.sellMarketplace,
    buyPrice: opp.buyPrice,
    sellPrice: opp.sellPrice,
    fees: opp.fees,
    profitAmount: opp.profitAmount,
    profitPercent: opp.profitPercent,
    volume24h: opp.volume24h,
    liquidity: opp.liquidity,
    confidence: typeof opp.confidence === 'number' && opp.confidence <= 1
      ? Math.round(opp.confidence * 100)
      : opp.confidence,
    riskLevel: opp.riskLevel,
    timestamp: opp.timestamp,
    buyLink: opp.buyLink,
    sellLink: opp.sellLink,
  }));

  const loading = hookLoading;

  // Update lastUpdate when data changes
  useEffect(() => {
    if (opportunities.length > 0) {
      setLastUpdate(new Date());
      if (soundEnabled && opportunities.some(opp => opp.profitPercent > 25)) {
        playNotificationSound();
      }
    }
  }, [realOpportunities]);

  // Auto-refresh via polling
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refresh();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  const filteredOpportunities = opportunities.filter(opp => 
    activeTab === 'all' || opp.type === activeTab
  );

  const getMarketplaceIcon = (marketplace: string) => {
    const icons: Record<string, string> = {
      'Magic Eden': '🟣',
      'OrdSwap': '🟡', 
      'Gamma': '🟢',
      'Unisat': '🔵',
      'OKX': '⚫'
    };
    return icons[marketplace] || '⚪';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const playNotificationSound = () => {
    if (!soundEnabled) return;
    
    // Create a notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(900, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Audio notification not available in this environment
    }
  };
  
  const handleDirectTrade = (opportunity: ArbitrageOpportunity, action: 'buy' | 'sell') => {
    const link = action === 'buy' ? opportunity.buyLink : opportunity.sellLink;
    window.open(link, '_blank');
    
    // Track trade execution
    setExecutedTrades(prev => prev + 1);
    setTotalProfit(prev => prev + (opportunity.profitAmount * (cryptoPrices?.BTC?.price || 58000)));
  };
  
  const handleManualRefresh = () => {
    refresh();
  };

  if (loading && opportunities.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-8">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-orange-400 animate-spin" />
            <span className="text-gray-400">Scanning Magic Eden and UniSat for arbitrage opportunities...</span>
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wall Street Trading Floor Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 via-orange-900/20 to-yellow-900/20 animate-pulse" />
        <Card className="relative bg-black/90 border-orange-500/30 backdrop-blur-xl">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-500 blur-xl opacity-50 animate-pulse" />
                  <div className="relative w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                    <Zap className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                    CYPHER ARBITRAGE TRADING FLOOR
                    <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>
                  </h1>
                  <div className="space-y-1">
                    <p className="text-orange-400 font-medium flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Professional Cross-Exchange Arbitrage System
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last update: {lastUpdate.toLocaleTimeString()}
                      {autoRefresh && <span className="text-green-400 ml-2">• Auto-refresh ON</span>}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                {/* Live Stats */}
                <div className="text-right">
                  <div className="text-xs text-gray-400">24H PROFIT</div>
                  <div className="text-2xl font-bold text-green-400">
                    +${totalProfit.toLocaleString()}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-xs text-gray-400">EXECUTED</div>
                  <div className="text-2xl font-bold text-orange-400">
                    {executedTrades}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={soundEnabled ? "default" : "outline"}
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="border-orange-500/50"
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant={alertsEnabled ? "default" : "outline"}
                    onClick={() => setAlertsEnabled(!alertsEnabled)}
                    className="border-orange-500/50"
                  >
                    <Bell className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleManualRefresh}
                    disabled={loading}
                    className="border-blue-500/50 hover:bg-blue-500/10"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant={autoRefresh ? "default" : "outline"}
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Live Market Ticker */}
            <div className="mt-4 flex items-center gap-4 overflow-x-auto">
              {Object.entries(cryptoPrices || {}).map(([symbol, data]) => (
                <div key={symbol} className="flex items-center gap-2 px-3 py-1 bg-gray-900/50 rounded-lg border border-gray-700 flex-shrink-0">
                  <span className="text-xs font-medium text-gray-400">{symbol}</span>
                  <span className="text-sm font-bold text-white">${data.price.toLocaleString()}</span>
                  <span className={`text-xs ${data.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Wall Street Style Trading Metrics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-orange-500/30 p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-orange-500" />
              <Badge className="bg-orange-500/20 text-orange-400 text-xs">LIVE</Badge>
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Active Trades</p>
            <p className="text-3xl font-bold text-white">{filteredOpportunities.length}</p>
            <p className="text-xs text-green-400 mt-1">↑ 23% vs last hour</p>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-green-500/30 p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Avg Spread</p>
            <p className="text-3xl font-bold text-green-400">
              {(filteredOpportunities.reduce((acc, opp) => acc + opp.profitPercent, 0) / filteredOpportunities.length || 0).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400 mt-1">High profit zone</p>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/30 p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-blue-500" />
              <Award className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">24H Volume</p>
            <p className="text-3xl font-bold text-white">
              ₿{(filteredOpportunities.reduce((acc, opp) => acc + opp.volume24h, 0)).toFixed(1)}
            </p>
            <p className="text-xs text-blue-400 mt-1">${((filteredOpportunities.reduce((acc, opp) => acc + opp.volume24h, 0)) * (cryptoPrices?.BTC?.price || 58000)).toLocaleString()}</p>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-purple-500/30 p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-5 h-5 text-purple-500" />
              <Target className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">High Confidence</p>
            <p className="text-3xl font-bold text-white">
              {filteredOpportunities.filter(opp => opp.confidence > 80).length}
            </p>
            <p className="text-xs text-purple-400 mt-1">{((filteredOpportunities.filter(opp => opp.confidence > 80).length / filteredOpportunities.length) * 100 || 0).toFixed(0)}% success rate</p>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/30 p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-full blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-yellow-500" />
              <Bell className="w-4 h-4 text-red-400 animate-pulse" />
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Marketplaces</p>
            <p className="text-3xl font-bold text-white">2</p>
            <p className="text-xs text-yellow-400 mt-1">Magic Eden + UniSat</p>
          </div>
        </Card>
      </div>

      {/* Professional Trading Floor */}
      <Card className="bg-black border-orange-500/30 backdrop-blur-xl">
        <div className="border-b border-orange-500/20">
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-orange-500" />
                LIVE ARBITRAGE OPPORTUNITIES
              </h2>
              
              <div className="flex items-center gap-4">
                <select 
                  className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1 text-sm text-white"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="profit">Sort by Profit</option>
                  <option value="confidence">Sort by Confidence</option>
                  <option value="volume">Sort by Volume</option>
                </select>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Min Profit:</span>
                  <input
                    type="number"
                    value={filterMinProfit}
                    onChange={(e) => setFilterMinProfit(Number(e.target.value))}
                    className="w-16 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                  />
                  <span className="text-sm text-gray-400">%</span>
                </div>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
              <TabsList className="bg-transparent border-0 gap-1 p-0">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-t-lg px-6"
                >
                  ALL ASSETS
                </TabsTrigger>
                <TabsTrigger 
                  value="ordinals"
                  className="data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-t-lg px-6"
                >
                  ORDINALS
                </TabsTrigger>
                <TabsTrigger 
                  value="runes"
                  className="data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-t-lg px-6"
                >
                  RUNES
                </TabsTrigger>
                <TabsTrigger 
                  value="rare-sats"
                  className="data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-t-lg px-6"
                >
                  RARE SATS
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="p-6">
          {hookError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {hookError}
            </div>
          )}
          <div className="space-y-4">
            {filteredOpportunities
              .filter(opp => opp.profitPercent >= filterMinProfit)
              .sort((a, b) => {
                switch (sortBy) {
                  case 'profit': return b.profitPercent - a.profitPercent;
                  case 'confidence': return b.confidence - a.confidence;
                  case 'volume': return b.volume24h - a.volume24h;
                  default: return 0;
                }
              })
              .map((opportunity) => (
                <WallStreetOpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onTrade={handleDirectTrade}
                  btcPrice={cryptoPrices?.BTC?.price || 58000}
                />
              ))}
            {filteredOpportunities.length === 0 && !loading && (
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-400 mb-2">No Opportunities Found</h3>
                <p className="text-gray-500 text-sm">
                  No arbitrage opportunities detected between Magic Eden and UniSat right now.
                  The scanner checks for price discrepancies across marketplaces every 60 seconds.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

interface OpportunityCardProps {
  opportunity: ArbitrageOpportunity;
  onTrade: (opportunity: ArbitrageOpportunity, action: 'buy' | 'sell') => void;
  btcPrice?: number;
}

function WallStreetOpportunityCard({ opportunity, onTrade, btcPrice = 58000 }: OpportunityCardProps) {
  const profitUSD = opportunity.profitAmount * btcPrice;
  const isProfitable = opportunity.profitPercent > 20;
  
  const getMarketplaceIcon = (marketplace: string) => {
    const icons: Record<string, string> = {
      'Magic Eden': '🟣',
      'OrdSwap': '🟡', 
      'Gamma': '🟢',
      'Unisat': '🔵',
      'OKX': '⚫',
      'OrdinalsBot': '🤖',
      'Hiro Wallet': '🔥',
      'Leather Wallet': '🧳'
    };
    return icons[marketplace] || '⚪';
  };
  
  return (
    <div className={`relative overflow-hidden rounded-xl border ${
      isProfitable ? 'border-green-500/50 bg-green-900/10' : 'border-orange-500/30 bg-gray-900/50'
    } backdrop-blur-sm transition-all duration-300 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20`}>
      {/* Profit Alert Banner */}
      {isProfitable && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-green-500 to-transparent px-6 py-1">
          <span className="text-xs font-bold text-white flex items-center gap-1">
            <Flame className="w-3 h-3 animate-pulse" />
            HOT OPPORTUNITY
          </span>
        </div>
      )}
      
      <div className="p-6">
        <div className="grid grid-cols-12 gap-4 items-center">
          {/* Asset Info */}
          <div className="col-span-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                opportunity.type === 'ordinals' ? 'bg-purple-500/20' :
                opportunity.type === 'runes' ? 'bg-blue-500/20' : 'bg-yellow-500/20'
              }`}>
                {opportunity.type === 'ordinals' ? '🎨' :
                 opportunity.type === 'runes' ? 'ᚱ' : '✨'}
              </div>
              <div>
                <h4 className="font-bold text-white">{opportunity.asset}</h4>
                {opportunity.collection && (
                  <p className="text-xs text-gray-400">{opportunity.collection}</p>
                )}
                <Badge className="mt-1" variant="outline">
                  {opportunity.type.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Trading Path */}
          <div className="col-span-4">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">BUY FROM</div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-lg">{getMarketplaceIcon(opportunity.buyMarketplace)}</div>
                  <div className="text-sm font-medium text-white">{opportunity.buyMarketplace}</div>
                  <div className="text-xl font-bold text-orange-400">
                    {opportunity.buyPrice.toFixed(4)} BTC
                  </div>
                  <div className="text-xs text-gray-500">
                    ${(opportunity.buyPrice * btcPrice).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center">
                <ArrowRight className="w-6 h-6 text-orange-500 animate-pulse" />
                <div className="text-xs text-gray-400 mt-1">TRANSFER</div>
              </div>
              
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">SELL ON</div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-lg">{getMarketplaceIcon(opportunity.sellMarketplace)}</div>
                  <div className="text-sm font-medium text-white">{opportunity.sellMarketplace}</div>
                  <div className="text-xl font-bold text-green-400">
                    {opportunity.sellPrice.toFixed(4)} BTC
                  </div>
                  <div className="text-xs text-gray-500">
                    ${(opportunity.sellPrice * btcPrice).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Profit & Metrics */}
          <div className="col-span-3">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4">
              <div className="text-center mb-3">
                <div className="text-xs text-gray-400 uppercase">Net Profit</div>
                <div className={`text-3xl font-bold ${
                  opportunity.profitPercent > 20 ? 'text-green-400' : 'text-orange-400'
                }`}>
                  +{opportunity.profitPercent.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-300">
                  ${profitUSD.toLocaleString()} USD
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Volume:</span>
                  <span className="text-white ml-1">{opportunity.volume24h.toFixed(1)} BTC</span>
                </div>
                <div>
                  <span className="text-gray-500">Liquidity:</span>
                  <span className={`ml-1 ${
                    opportunity.liquidity === 'High' ? 'text-green-400' :
                    opportunity.liquidity === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                  }`}>{opportunity.liquidity}</span>
                </div>
                <div>
                  <span className="text-gray-500">Confidence:</span>
                  <span className="text-white ml-1">{opportunity.confidence}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Risk:</span>
                  <span className={`ml-1 uppercase ${
                    opportunity.riskLevel === 'low' ? 'text-green-400' :
                    opportunity.riskLevel === 'medium' ? 'text-yellow-400' : 'text-red-400'
                  }`}>{opportunity.riskLevel}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="col-span-2">
            <div className="space-y-2">
              <Button
                onClick={() => onTrade(opportunity, 'buy')}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold"
                size="sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                EXECUTE TRADE
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full border-gray-600 hover:border-orange-500"
                onClick={() => {
                  // Open detailed analysis
                }}
              >
                <Calculator className="w-4 h-4 mr-2" />
                ANALYZE
              </Button>
              
              <div className="text-center">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    opportunity.confidence > 80 ? 'border-green-500 text-green-400' :
                    opportunity.confidence > 60 ? 'border-yellow-500 text-yellow-400' :
                    'border-red-500 text-red-400'
                  }`}
                >
                  {opportunity.confidence > 80 ? 'RECOMMENDED' :
                   opportunity.confidence > 60 ? 'MODERATE' : 'RISKY'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Info Bar */}
        <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Updated {new Date(opportunity.timestamp).toLocaleTimeString()}
          </span>
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Total Fees: {((opportunity.fees.buyFee + opportunity.fees.sellFee + opportunity.fees.networkFee) * 100).toFixed(2)}%
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {opportunity.buyMarketplace} vs {opportunity.sellMarketplace}
          </span>
        </div>
      </div>
    </div>
  );
}

function OpportunityCard({ opportunity, onTrade }: OpportunityCardProps) {
  const getMarketplaceIcon = (marketplace: string) => {
    const icons: Record<string, string> = {
      'Magic Eden': '🟣',
      'OrdSwap': '🟡', 
      'Gamma': '🟢',
      'Unisat': '🔵',
      'OKX': '⚫'
    };
    return icons[marketplace] || '⚪';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700 p-6 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold text-white">{opportunity.asset}</h4>
            <Badge variant="outline" className="text-xs">
              {opportunity.type.toUpperCase()}
            </Badge>
            <Badge className={getRiskColor(opportunity.riskLevel)}>
              {opportunity.riskLevel.toUpperCase()} RISK
            </Badge>
          </div>
          
          {opportunity.collection && (
            <p className="text-sm text-gray-400 mb-2">Collection: {opportunity.collection}</p>
          )}
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-green-400">
            +{opportunity.profitPercent.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-400">
            {opportunity.profitAmount.toFixed(6)} BTC profit
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Buy Side */}
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Buy from</span>
            <span className="text-lg">{getMarketplaceIcon(opportunity.buyMarketplace)}</span>
          </div>
          <div className="font-semibold text-white">{opportunity.buyMarketplace}</div>
          <div className="text-xl font-bold text-white mt-1">
            {opportunity.buyPrice.toFixed(6)} BTC
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Fee: {(opportunity.fees.buyFee * 100).toFixed(2)}%
          </div>
        </div>

        {/* Sell Side */}
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Sell on</span>
            <span className="text-lg">{getMarketplaceIcon(opportunity.sellMarketplace)}</span>
          </div>
          <div className="font-semibold text-white">{opportunity.sellMarketplace}</div>
          <div className="text-xl font-bold text-white mt-1">
            {opportunity.sellPrice.toFixed(6)} BTC
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Fee: {(opportunity.fees.sellFee * 100).toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 text-sm text-gray-400">
        <span>Volume (24h): {opportunity.volume24h.toFixed(1)} BTC</span>
        <span>Liquidity: {opportunity.liquidity}</span>
        <span>Confidence: {opportunity.confidence}%</span>
      </div>

      <div className="flex gap-3">
        <Button 
          onClick={() => onTrade(opportunity, 'buy')}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Buy Now
        </Button>
        
        <Button 
          onClick={() => onTrade(opportunity, 'sell')}
          className="flex-1 bg-green-600 hover:bg-green-700"
          size="sm"
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Sell Here
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          className="px-3"
          onClick={() => {
            // Open calculator or detailed analysis
          }}
        >
          <Calculator className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}