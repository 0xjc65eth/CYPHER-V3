'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Volume2,
  Eye,
  ExternalLink,
  Filter,
  RefreshCw,
  Zap,
  Target,
  Bell,
  BellOff,
  Maximize2,
  BarChart3,
  Home,
  ArrowLeft,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { RunesTerminalProvider } from '@/contexts/RunesTerminalContext';
import { useArbitrage } from '@/hooks/useArbitrage';
import ArbitrageHeatmap from '@/components/arbitrage/ArbitrageHeatmap';
import OpportunityDetails from '@/components/arbitrage/OpportunityDetails';
import ArbitrageHistory from '@/components/arbitrage/ArbitrageHistory';
import SpreadChart from '@/components/arbitrage/SpreadChart';
import ExchangePriceTable from '@/components/arbitrage/ExchangePriceTable';
import ProfitCalculator from '@/components/arbitrage/ProfitCalculator';
import { triangularArbitrage, ArbitrageOpportunity as TriangularOpportunity } from '@/services/arbitrage/TriangularArbitrage';
import { OpportunityScanner } from '@/components/arbitrage/OpportunityScanner';
import { ExchangePriceGrid } from '@/components/arbitrage/ExchangePriceGrid';
import { OrderBlocksPanel } from '@/components/arbitrage/OrderBlocksPanel';
import { FairValueGapsPanel } from '@/components/arbitrage/FairValueGapsPanel';
import { MarketMakerMetrics } from '@/components/arbitrage/MarketMakerMetrics';
import { TriangularPathVisualizer } from '@/components/arbitrage/TriangularPathVisualizer';
import { PerformanceAnalytics } from '@/components/arbitrage/PerformanceAnalytics';
import { RiskManagementPanel } from '@/components/arbitrage/RiskManagementPanel';
import { ProfessionalCharts } from '@/components/arbitrage/ProfessionalCharts';
import { LiquidityHeatmap } from '@/components/arbitrage/LiquidityHeatmap';
import { PaperTradingPanel } from '@/components/arbitrage/PaperTradingPanel';
import { BacktestPanel } from '@/components/arbitrage/BacktestPanel';
import { AlertSystemPanel } from '@/components/arbitrage/AlertSystemPanel';

interface ArbitrageApiData {
  exchanges: Array<{
    name: string;
    bid: number;
    ask: number;
    last: number;
    spread: number;
    spreadPercent: number;
    volume24h: number | null;
    fee: number;
    feePercent: string;
  }>;
  bestBid: { exchange: string; price: number };
  bestAsk: { exchange: string; price: number };
  maxSpread: number;
  maxSpreadPercent: number;
  opportunities: Array<{
    buyFrom: string;
    sellTo: string;
    buyPrice: number;
    sellPrice: number;
    spreadPercent: number;
    buyFee: number;
    sellFee: number;
    netProfitPercent: number;
    estimatedProfitPer1BTC: number;
  }>;
  fees: Record<string, number>;
  errors?: string[];
  exchangeCount: number;
  timestamp: number;
}

export default function ArbitragePage() {
  const [minSpread, setMinSpread] = useState(5);
  const [selectedAssetType, setSelectedAssetType] = useState<'all' | 'ordinals' | 'runes' | 'tokens'>('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [newOpportunityCount, setNewOpportunityCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Real exchange data from /api/arbitrage/prices
  const [arbData, setArbData] = useState<ArbitrageApiData | null>(null);
  const [arbLoading, setArbLoading] = useState(true);
  const [arbError, setArbError] = useState<string | null>(null);
  const [arbLastUpdate, setArbLastUpdate] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(15);

  // Triangular arbitrage opportunities from real engine
  const [triangularOpps, setTriangularOpps] = useState<TriangularOpportunity[]>([]);
  const [triangularLoading, setTriangularLoading] = useState(false);

  const {
    opportunities,
    loading,
    error,
    lastUpdate,
    totalSpread,
    avgSpread
  } = useArbitrage(minSpread, selectedAssetType);

  const fetchArbPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/arbitrage/prices/');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ArbitrageApiData = await res.json();
      if (data.exchanges) {
        setArbData(data);
        setArbError(null);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setArbError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setArbLoading(false);
      setArbLastUpdate(new Date());
      setCountdown(15);
    }
  }, []);

  const fetchTriangularOpportunities = useCallback(async () => {
    try {
      setTriangularLoading(true);
      // Get active opportunities from the triangular arbitrage engine
      const opportunities = await triangularArbitrage.scanTriangularArbitrage('USDT');
      setTriangularOpps(opportunities);
    } catch (error) {
      console.error('Error fetching triangular opportunities:', error);
    } finally {
      setTriangularLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArbPrices();
    fetchTriangularOpportunities();
    const interval = setInterval(() => {
      fetchArbPrices();
      fetchTriangularOpportunities();
    }, 30000); // 30 seconds for triangular (matches engine's update cycle)
    return () => clearInterval(interval);
  }, [fetchArbPrices, fetchTriangularOpportunities]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 15 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Alert system for new opportunities
  useEffect(() => {
    if (opportunities.length > newOpportunityCount && newOpportunityCount > 0 && alertsEnabled) {
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
      setNewOpportunityCount(opportunities.length);
    } else {
      setNewOpportunityCount(opportunities.length);
    }
  }, [opportunities.length, newOpportunityCount, alertsEnabled]);

  const formatCurrency = (value: number, currency: string = 'BTC') => {
    if (currency === 'BTC') {
      return `₿${value.toFixed(8)}`;
    } else if (currency === 'USD') {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${value.toFixed(6)} ${currency}`;
  };

  const formatSpread = (spread: number) => {
    const color = spread >= 15 ? 'text-red-400' : spread >= 10 ? 'text-orange-400' : 'text-green-400';
    return <span className={`font-bold ${color}`}>{spread.toFixed(2)}%</span>;
  };

  const getRiskBadgeColor = (riskScore: string) => {
    switch (riskScore) {
      case 'low': return 'bg-green-500/20 border-green-500 text-green-400';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      case 'high': return 'bg-red-500/20 border-red-500 text-red-400';
      default: return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  };

  const formatExecutionTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const OpportunityRow = ({ opportunity, index }: { opportunity: any; index: number }) => {
    return (
      <motion.tr
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1, duration: 0.3 }}
        className="border-b border-[#2a2a3e] hover:bg-white/[0.02] cursor-pointer transition-all duration-200"
        onClick={() => setSelectedOpportunity(opportunity)}
      >
        <td className="p-4">
          <div className="flex items-center gap-2">
            <Badge className={`${
              opportunity.type === 'ordinals' ? 'bg-orange-500/20 border-orange-500 text-orange-400' :
              opportunity.type === 'runes' ? 'bg-purple-500/20 border-purple-500 text-purple-400' :
              'bg-blue-500/20 border-blue-500 text-blue-400'
            } border`}>
              {opportunity.type.toUpperCase()}
            </Badge>
            <div>
              <div className="font-bold text-white">{opportunity.symbol}</div>
              <div className="text-xs text-gray-400">{opportunity.name}</div>
            </div>
          </div>
        </td>
        <td className="p-4">
          <div className="text-center">
            <div className="text-green-400 font-mono font-bold">
              {formatCurrency(opportunity.buyPrice, opportunity.baseCurrency)}
            </div>
            <div className="text-xs text-gray-400">{opportunity.buySource}</div>
          </div>
        </td>
        <td className="p-4">
          <div className="text-center">
            <div className="text-red-400 font-mono font-bold">
              {formatCurrency(opportunity.sellPrice, opportunity.baseCurrency)}
            </div>
            <div className="text-xs text-gray-400">{opportunity.sellSource}</div>
          </div>
        </td>
        <td className="p-4 text-center">
          {formatSpread(opportunity.spread)}
        </td>
        <td className="p-4">
          <div className="text-center">
            <div className="text-white font-mono">
              {formatCurrency(opportunity.potentialProfit, opportunity.baseCurrency)}
            </div>
            <div className="text-xs text-gray-400">
              Taxa: {opportunity.estimatedFees ? formatCurrency(opportunity.estimatedFees.total, opportunity.baseCurrency) : 'N/A'}
            </div>
          </div>
        </td>
        <td className="p-4">
          <div className="text-center space-y-1">
            <Badge className={`${getRiskBadgeColor(opportunity.riskScore)} border text-xs`}>
              {opportunity.riskScore.toUpperCase()}
            </Badge>
            <div className="text-xs text-gray-400">
              Trust: {opportunity.trustScore || 0}%
            </div>
          </div>
        </td>
        <td className="p-4">
          <div className="text-center">
            <div className="text-cyan-400 font-mono font-bold">
              {formatExecutionTime(opportunity.executionTime || 300)}
            </div>
            <div className="text-xs text-gray-400">
              {opportunity.historicalSuccess ? `${opportunity.historicalSuccess}% success` : 'New'}
            </div>
          </div>
        </td>
        <td className="p-4">
          <div className="flex items-center justify-center gap-1">
            {opportunity.liquidity >= 80 ? (
              <Badge className="bg-green-500/20 border-green-500 text-green-400 border">High</Badge>
            ) : opportunity.liquidity >= 50 ? (
              <Badge className="bg-yellow-500/20 border-yellow-500 text-yellow-400 border">Med</Badge>
            ) : (
              <Badge className="bg-red-500/20 border-red-500 text-red-400 border">Low</Badge>
            )}
          </div>
        </td>
        <td className="p-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOpportunity(opportunity);
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              Details
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-gray-600 hover:border-green-500"
              onClick={(e) => {
                e.stopPropagation();
                window.open(opportunity.buyLink, '_blank');
              }}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </motion.tr>
    );
  };

  const bestOpp = arbData?.opportunities?.[0];

  return (
    <RunesTerminalProvider>
      <div className="min-h-screen bg-[#0a0a0f] text-white font-mono">
        {/* Header */}
        <div className="p-6 border-b border-[#2a2a3e]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Brain className="h-8 w-8 text-orange-500 shrink-0" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-orange-400">CYPHER ARBITRAGE</h1>
                <p className="text-gray-400 text-sm">8-Exchange Real-Time Spread Detection</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>LIVE</span>
              </div>
              <div className="text-xs text-gray-500 bg-[#1a1a2e] px-3 py-1.5 rounded-lg border border-[#2a2a3e]">
                Refresh in {countdown}s
              </div>
              <Button
                onClick={() => setAlertsEnabled(!alertsEnabled)}
                variant={alertsEnabled ? 'default' : 'outline'}
                size="sm"
                className={alertsEnabled ? 'bg-green-600' : 'border-[#2a2a3e]'}
              >
                {alertsEnabled ? <Bell className="h-4 w-4 mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
                Alerts {alertsEnabled ? 'ON' : 'OFF'}
              </Button>
              {arbLastUpdate && (
                <div className="text-xs text-gray-500">
                  {arbLastUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <Tabs defaultValue="scanner" className="w-full">
            <div className="border-b border-[#1a1a2e] mb-6">
              <TabsList className="bg-transparent border-0 p-0 h-auto">
                <TabsTrigger value="scanner" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  Live Scanner
                </TabsTrigger>
                <TabsTrigger value="cross-exchange" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  Cross-Exchange
                </TabsTrigger>
                <TabsTrigger value="triangular" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  Triangular
                </TabsTrigger>
                <TabsTrigger value="analytics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="smc" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  SMC Analysis
                </TabsTrigger>
                <TabsTrigger value="performance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  Performance
                </TabsTrigger>
                <TabsTrigger value="risk" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  Risk
                </TabsTrigger>
                <TabsTrigger value="charts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  Charts
                </TabsTrigger>
                <TabsTrigger value="paper-trading" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  Paper Trading
                </TabsTrigger>
                <TabsTrigger value="backtest" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  Backtest
                </TabsTrigger>
                <TabsTrigger value="alerts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  Alerts
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Live Scanner Tab */}
            <TabsContent value="scanner">
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Exchanges</div>
                    <div className="text-2xl font-bold text-orange-400">
                      {arbData?.exchangeCount || '--'}
                    </div>
                    <div className="text-xs text-gray-400">with live data</div>
                  </div>
                  <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Max Spread</div>
                    <div className="text-2xl font-bold text-green-400">
                      {arbData?.maxSpreadPercent != null ? `${arbData.maxSpreadPercent.toFixed(4)}%` : '--'}
                    </div>
                    <div className="text-xs text-gray-400">
                      ${arbData?.maxSpread != null ? arbData.maxSpread.toFixed(2) : '--'}
                    </div>
                  </div>
                  <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Best Opportunity</div>
                    <div className="text-sm font-bold text-cyan-400 truncate">
                      {bestOpp ? `${bestOpp.buyFrom} → ${bestOpp.sellTo}` : '--'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {bestOpp ? `Net: ${bestOpp.netProfitPercent.toFixed(4)}%` : 'No opportunities'}
                    </div>
                  </div>
                  <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Est. Profit / 1 BTC</div>
                    <div className={`text-2xl font-bold ${bestOpp?.estimatedProfitPer1BTC && bestOpp.estimatedProfitPer1BTC > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {bestOpp?.estimatedProfitPer1BTC != null ? `$${bestOpp.estimatedProfitPer1BTC.toFixed(2)}` : '--'}
                    </div>
                    <div className="text-xs text-gray-400">after fees</div>
                  </div>
                </div>

                {/* Educational Banner - Why Negative Profits */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                        Why Are Profits Negative or Zero?
                      </h3>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        Cryptocurrency markets are highly efficient. Current spreads between exchanges (0.01-0.10%)
                        are typically smaller than combined trading fees (0.5-3%), making arbitrage unprofitable.
                        When profitable opportunities briefly appear due to price divergence, they are captured within
                        seconds by automated trading bots with direct exchange connections and lower fees.
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-blue-300">
                        <span className="font-mono">Profitable when: Spread &gt; (Buy Fee + Sell Fee + Network Fee)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Live BTC/USDT prices from {arbData?.exchangeCount || 0} exchanges
                    {arbData?.errors && arbData.errors.length > 0 && (
                      <span className="ml-2 text-yellow-400 text-xs">
                        ({arbData.errors.length} exchange{arbData.errors.length > 1 ? 's' : ''} failed)
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#2a2a3e] hover:border-orange-500"
                    disabled={arbLoading}
                    onClick={fetchArbPrices}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${arbLoading ? 'animate-spin' : ''}`} />
                    {arbLoading ? 'Updating...' : 'Refresh'}
                  </Button>
                </div>

                {arbError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
                    <span>
                      <AlertTriangle className="h-4 w-4 inline mr-2" />
                      {arbError}
                    </span>
                    <button onClick={fetchArbPrices} className="text-xs underline hover:text-red-300">Retry</button>
                  </div>
                )}

                {/* Exchange Price Table */}
                {arbLoading && !arbData ? (
                  <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] p-6">
                    <div className="space-y-3">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-800/50 rounded animate-pulse" />
                      ))}
                    </div>
                  </div>
                ) : arbData ? (
                  <>
                    <ExchangePriceTable
                      exchanges={arbData.exchanges}
                      loading={arbLoading}
                      bestBid={arbData.bestBid}
                      bestAsk={arbData.bestAsk}
                    />

                    <ProfitCalculator
                      arbOpportunities={arbData.opportunities}
                      fees={arbData.fees}
                    />

                    {/* New Professional Components */}
                    <div className="space-y-6 mt-6">
                      {/* Exchange Price Grid */}
                      <div>
                        <h3 className="text-[#00ff88] font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Live Exchange Prices
                        </h3>
                        <ExchangePriceGrid
                          exchanges={arbData.exchanges}
                          loading={arbLoading}
                          bestBid={arbData.bestBid}
                          bestAsk={arbData.bestAsk}
                        />
                      </div>

                      {/* Opportunity Scanner - Professional Table */}
                      {arbData.opportunities && arbData.opportunities.length > 0 && (
                        <div>
                          <h3 className="text-[#00ff88] font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Detected Opportunities (CCXT Real-Time)
                          </h3>
                          <OpportunityScanner
                            opportunities={arbData.opportunities.map((opp: any, idx: number) => ({
                              id: `opp-${idx}`,
                              type: 'cex-dex',
                              symbol: 'BTC/USDT',
                              buyExchange: opp.buyFrom,
                              sellExchange: opp.sellTo,
                              buyPrice: opp.buyPrice,
                              sellPrice: opp.sellPrice,
                              spread: opp.sellPrice - opp.buyPrice,
                              spreadPercent: opp.spreadPercent,
                              estimatedProfit: opp.estimatedProfitPer1BTC,
                              netProfit: opp.estimatedProfitPer1BTC,
                              fees: {
                                buy: opp.buyFee,
                                sell: opp.sellFee,
                                network: 0,
                                total: opp.buyFee + opp.sellFee
                              },
                              riskScore: opp.netProfitPercent > 0.5 ? 3 : opp.netProfitPercent > 0.1 ? 5 : 7,
                              confidence: Math.min(95, Math.max(50, Math.abs(opp.netProfitPercent) * 100)),
                              executionTime: 60,
                              timestamp: new Date()
                            }))}
                            loading={arbLoading}
                            onSelectOpportunity={(opp) => setSelectedOpportunity(opp)}
                          />
                        </div>
                      )}
                    </div>
                  </>
                ) : null}

                {arbLastUpdate && (
                  <div className="text-[10px] text-gray-500 text-right">
                    Last updated: {arbLastUpdate.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Cross-Exchange Tab */}
            <TabsContent value="cross-exchange">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-orange-400">{opportunities.length}</div>
                        <div className="text-sm text-gray-400">Active Opportunities</div>
                      </div>
                      <Target className="h-8 w-8 text-orange-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-green-400">{totalSpread ? totalSpread.toFixed(1) : '0.0'}%</div>
                        <div className="text-sm text-gray-400">Total Spread</div>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-blue-400">{avgSpread ? avgSpread.toFixed(1) : '0.0'}%</div>
                        <div className="text-sm text-gray-400">Avg Spread</div>
                      </div>
                      <Activity className="h-8 w-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-purple-400">
                          {opportunities.filter(o => o.spread >= 10).length}
                        </div>
                        <div className="text-sm text-gray-400">Spreads &gt; 10%</div>
                      </div>
                      <Zap className="h-8 w-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">Min spread:</span>
                    <div className="flex gap-1">
                      {[3, 5, 10, 15].map(value => (
                        <Button
                          key={value}
                          size="sm"
                          variant={minSpread === value ? 'default' : 'outline'}
                          className={minSpread === value ? 'bg-orange-600' : 'border-[#2a2a3e] hover:border-orange-500'}
                          onClick={() => setMinSpread(value)}
                        >
                          {value}%
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Type:</span>
                    <div className="flex gap-1">
                      {[
                        { key: 'all', label: 'All' },
                        { key: 'ordinals', label: 'Ordinals' },
                        { key: 'runes', label: 'Runes' },
                        { key: 'tokens', label: 'Tokens' }
                      ].map(type => (
                        <Button
                          key={type.key}
                          size="sm"
                          variant={selectedAssetType === type.key ? 'default' : 'outline'}
                          className={selectedAssetType === type.key ? 'bg-blue-600' : 'border-[#2a2a3e] hover:border-blue-500'}
                          onClick={() => setSelectedAssetType(type.key as any)}
                        >
                          {type.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#2a2a3e] hover:border-green-500"
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Updating...' : 'Refresh'}
                </Button>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div className="xl:col-span-3">
                  <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
                    <CardHeader>
                      <CardTitle className="text-orange-400 flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        Arbitrage Opportunities - Spread &gt;= {minSpread}%
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="flex items-center justify-center h-64">
                          <div className="text-center">
                            <RefreshCw className="h-8 w-8 text-orange-400 animate-spin mx-auto mb-4" />
                            <p className="text-gray-400">Scanning markets...</p>
                          </div>
                        </div>
                      ) : error ? (
                        <div className="flex items-center justify-center h-64">
                          <div className="text-center">
                            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-4" />
                            <p className="text-red-400">Error loading data</p>
                            <p className="text-gray-400 text-sm">{error}</p>
                          </div>
                        </div>
                      ) : opportunities.length === 0 ? (
                        <div className="flex items-center justify-center h-64">
                          <div className="text-center">
                            <Target className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-400">No opportunities found</p>
                            <p className="text-gray-500 text-sm">Lower the minimum spread to see more</p>
                          </div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[900px]">
                            <thead>
                              <tr className="border-b border-[#2a2a3e]">
                                <th className="text-left p-4 text-gray-400 font-mono">Asset</th>
                                <th className="text-center p-4 text-gray-400 font-mono">Buy</th>
                                <th className="text-center p-4 text-gray-400 font-mono">Sell</th>
                                <th className="text-center p-4 text-gray-400 font-mono">Spread</th>
                                <th className="text-center p-4 text-gray-400 font-mono">Profit/Fees</th>
                                <th className="text-center p-4 text-gray-400 font-mono">Risk/Trust</th>
                                <th className="text-center p-4 text-gray-400 font-mono">Exec. Time</th>
                                <th className="text-center p-4 text-gray-400 font-mono">Liquidity</th>
                                <th className="text-center p-4 text-gray-400 font-mono">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {opportunities.map((opportunity, index) => (
                                <OpportunityRow
                                  key={`${opportunity.symbol}-${opportunity.buySource}-${opportunity.sellSource}`}
                                  opportunity={opportunity}
                                  index={index}
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="xl:col-span-1">
                  <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
                    <CardHeader>
                      <CardTitle className="text-cyan-400 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Market Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ArbitrageHeatmap opportunities={opportunities} />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Triangular Tab */}
            <TabsContent value="triangular">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#00ff88]">Triangular Arbitrage Paths</h2>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500/10 border-green-500/30 text-green-400 border text-xs flex items-center gap-1">
                      <Activity className="h-3 w-3 animate-pulse" />
                      LIVE ENGINE
                    </Badge>
                    <Badge className="bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88] border text-xs">
                      {triangularOpps.length} Routes
                    </Badge>
                  </div>
                </div>

                {/* Loading State */}
                {triangularLoading && triangularOpps.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 text-[#00ff88] animate-spin mx-auto mb-4" />
                      <p className="text-gray-400">Scanning triangular paths...</p>
                    </div>
                  </div>
                ) : triangularOpps.length === 0 ? (
                  <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-8">
                    <div className="text-center">
                      <Target className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <h3 className="text-gray-300 font-semibold mb-2">No Opportunities Found</h3>
                      <p className="text-gray-500 text-sm">
                        No profitable triangular arbitrage paths detected. The engine scans continuously for opportunities.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {triangularOpps.slice(0, 12).map((opp, i) => {

                      return (
                        <motion.div
                          key={opp.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <TriangularPathVisualizer
                            path={{
                              ...opp,
                              status: new Date(opp.expiresAt) < new Date() ? 'expired' : 'active',
                              createdAt: new Date(opp.createdAt || Date.now())
                            }}
                            onExecute={(path) => {
                              // TODO: Implement paper trade execution
                              alert(`Paper trade execution for path ${path.id} - Coming soon!`);
                            }}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Real-Time Engine Notice */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-blue-400 font-semibold mb-1">Real-Time Triangular Arbitrage Engine</h4>
                      <p className="text-sm text-gray-300">
                        This view uses the live <code className="text-xs bg-black/30 px-1 py-0.5 rounded">TriangularArbitrage.ts</code> engine
                        which continuously scans for profitable 3-step trading paths across multiple exchanges.
                        Data refreshes every 30 seconds. The engine calculates net profit after accounting for trading fees,
                        network costs, and slippage. Opportunities are ranked by profitability and risk level.
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-blue-300">
                        <RefreshCw className="h-3 w-3" />
                        <span>Next update in {30 - (countdown % 30)}s</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              {(() => {
                // Compute real analytics from arbData
                const allOpps = arbData?.opportunities || [];
                const profitableOpps = allOpps.filter(o => o.netProfitPercent > 0);
                const totalProfit = profitableOpps.reduce((sum, o) => sum + o.estimatedProfitPer1BTC, 0);
                const successRate = allOpps.length > 0 ? (profitableOpps.length / allOpps.length * 100) : 0;
                const avgSpreadCaptured = allOpps.length > 0
                  ? allOpps.reduce((sum, o) => sum + o.spreadPercent, 0) / allOpps.length
                  : 0;
                const bestTrade = allOpps.length > 0
                  ? allOpps.reduce((best, o) => o.estimatedProfitPer1BTC > best.estimatedProfitPer1BTC ? o : best, allOpps[0])
                  : null;

                // Compute spread distribution from exchange data
                const exchangeSpreads = (arbData?.exchanges || []).map(e => e.spreadPercent).filter(s => s > 0);
                const spreadBuckets = [
                  { range: '0.01% - 0.05%', min: 0.01, max: 0.05 },
                  { range: '0.05% - 0.10%', min: 0.05, max: 0.10 },
                  { range: '0.10% - 0.20%', min: 0.10, max: 0.20 },
                  { range: '0.20% - 0.50%', min: 0.20, max: 0.50 },
                  { range: '> 0.50%', min: 0.50, max: Infinity },
                ].map(b => {
                  const count = exchangeSpreads.filter(s => s >= b.min && s < b.max).length;
                  const pct = exchangeSpreads.length > 0 ? Math.round(count / exchangeSpreads.length * 100) : 0;
                  return { range: b.range, count, pct };
                });

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Est. Profit / 1 BTC</div>
                        <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${totalProfit.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400">{profitableOpps.length} profitable paths</div>
                      </div>
                      <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Profitable Rate</div>
                        <div className="text-2xl font-bold text-[#00ff88]">{successRate.toFixed(1)}%</div>
                        <div className="text-xs text-gray-400">{profitableOpps.length} / {allOpps.length} paths</div>
                      </div>
                      <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Avg Spread</div>
                        <div className="text-2xl font-bold text-cyan-400">{avgSpreadCaptured.toFixed(4)}%</div>
                        <div className="text-xs text-gray-400">across {arbData?.exchangeCount || 0} exchanges</div>
                      </div>
                      <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Best Path</div>
                        <div className="text-2xl font-bold text-orange-400">
                          {bestTrade ? `$${bestTrade.estimatedProfitPer1BTC.toFixed(2)}` : '--'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {bestTrade ? `${bestTrade.buyFrom} → ${bestTrade.sellTo}` : 'No data'}
                        </div>
                      </div>
                    </div>

                    {/* Spread Distribution */}
                    <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
                      <CardHeader>
                        <CardTitle className="text-[#00ff88] flex items-center gap-2 text-base">
                          <BarChart3 className="h-5 w-5" />
                          Spread Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {spreadBuckets.map((bucket) => (
                            <div key={bucket.range} className="flex items-center gap-3">
                              <div className="w-32 text-xs text-gray-400 font-mono">{bucket.range}</div>
                              <div className="flex-1 bg-[#0d0d1a] rounded-full h-4 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#00ff88]/60 to-[#00ff88] rounded-full transition-all"
                                  style={{ width: `${Math.max(bucket.pct, 2)}%` }}
                                />
                              </div>
                              <div className="w-16 text-xs text-gray-300 text-right font-mono">{bucket.count} ({bucket.pct}%)</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Spread Chart */}
                    <SpreadChart opportunities={opportunities} />

                    <div className="text-center py-2">
                      <p className="text-xs text-gray-500">Analytics computed from live exchange data. Refreshes every 15s.</p>
                    </div>
                  </div>
                );
              })()}
            </TabsContent>

            {/* SMC Analysis Tab */}
            <TabsContent value="smc">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-[#00ff88] mb-1">Smart Money Concepts Analysis</h2>
                    <p className="text-gray-400 text-sm">
                      Institutional trading patterns and price action analysis
                    </p>
                  </div>
                  <Badge className="bg-blue-500/20 border-blue-500 text-blue-400 border">
                    <Activity className="h-3 w-3 mr-1 animate-pulse" />
                    LIVE DATA
                  </Badge>
                </div>

                {/* Info Banner */}
                <div className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-purple-400 font-semibold mb-2">What is Smart Money Concepts (SMC)?</h3>
                      <p className="text-sm text-gray-300 leading-relaxed mb-2">
                        SMC reveals institutional trading activity by identifying zones where large players
                        (banks, hedge funds, market makers) accumulate or distribute positions. These patterns
                        repeat because institutions must move billions without causing massive slippage.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                        <div className="bg-black/20 rounded p-2">
                          <div className="text-green-400 font-semibold text-xs mb-1">Order Blocks</div>
                          <div className="text-xs text-gray-400">
                            Price zones where institutions accumulated large positions. Price often returns here.
                          </div>
                        </div>
                        <div className="bg-black/20 rounded p-2">
                          <div className="text-cyan-400 font-semibold text-xs mb-1">Fair Value Gaps</div>
                          <div className="text-xs text-gray-400">
                            Inefficient price zones left by rapid moves. ~75% historical fill rate.
                          </div>
                        </div>
                        <div className="bg-black/20 rounded p-2">
                          <div className="text-orange-400 font-semibold text-xs mb-1">Market Maker Metrics</div>
                          <div className="text-xs text-gray-400">
                            Volume Profile, POC, and inventory management insights.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Order Blocks */}
                  <div className="lg:col-span-1">
                    <OrderBlocksPanel asset="BTC/USDT" timeframe="1h" maxBlocks={8} />
                  </div>

                  {/* Center Column - Fair Value Gaps */}
                  <div className="lg:col-span-1">
                    <FairValueGapsPanel asset="BTC/USDT" timeframe="1h" maxGaps={8} />
                  </div>

                  {/* Right Column - Market Maker Metrics */}
                  <div className="lg:col-span-1">
                    <MarketMakerMetrics symbol="BTC/USDT" />
                  </div>
                </div>

                {/* Additional Info */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-yellow-400 font-semibold mb-1">Note on SMC Detection</h4>
                      <p className="text-sm text-yellow-200/80">
                        SMC signals are detected from candlestick patterns and require historical price data.
                        In this demo, signals will appear once we integrate with a price data source (e.g., Binance API).
                        The detection algorithms are ready and will automatically populate when connected to live data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance">
              <PerformanceAnalytics strategy="all" defaultPeriod="24h" />
            </TabsContent>

            {/* Risk Management Tab */}
            <TabsContent value="risk">
              <RiskManagementPanel
                capital={10000}
                currentExposure={0}
                currentDrawdown={0}
              />
            </TabsContent>

            {/* Charts Tab - Phase 4 */}
            <TabsContent value="charts">
              <div className="space-y-6">
                {/* Professional TradingView-style Charts */}
                <ProfessionalCharts
                  symbol="BTC/USDT"
                  timeframe="1h"
                  height={500}
                  showSMC={true}
                />

                {/* Liquidity Heatmap */}
                <LiquidityHeatmap
                  symbol="BTC/USDT"
                  levels={30}
                />
              </div>
            </TabsContent>

            {/* Paper Trading Tab - Phase 5 */}
            <TabsContent value="paper-trading">
              <PaperTradingPanel
                initialBalance={10000}
                onTradeExecuted={() => {}}
              />
            </TabsContent>

            {/* Backtest Tab - Phase 5 */}
            <TabsContent value="backtest">
              <BacktestPanel
                onBacktestComplete={() => {}}
              />
            </TabsContent>

            {/* Alerts Tab - Phase 5 */}
            <TabsContent value="alerts">
              <AlertSystemPanel
                onAlertTriggered={() => {}}
              />
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <ArbitrageHistory />
            </TabsContent>
          </Tabs>
        </div>

        {/* Opportunity Details Modal */}
        <OpportunityDetails
          opportunity={selectedOpportunity}
          onClose={() => setSelectedOpportunity(null)}
        />

        {/* Alert Audio */}
        <audio ref={audioRef} preload="auto">
          <source src="/sounds/alert.wav" type="audio/wav" />
          <source src="/sounds/alert.mp3" type="audio/mpeg" />
        </audio>
      </div>
    </RunesTerminalProvider>
  );
}
