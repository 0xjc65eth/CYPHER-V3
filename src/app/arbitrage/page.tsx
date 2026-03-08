'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  TrendingUp,
  Activity,
  AlertTriangle,
  Eye,
  RefreshCw,
  Zap,
  Target,
  Bell,
  BellOff,
  BarChart3,
  Info,
  ArrowRightLeft,
  Triangle,
} from 'lucide-react';
import { PremiumContent } from '@/components/premium-content';
import { RunesTerminalProvider } from '@/contexts/RunesTerminalContext';
import { useUnifiedArbitrage, useSpotPerpArbitrage, type UnifiedOpportunity } from '@/hooks/useArbitrage';
import { useArbitrage } from '@/hooks/useArbitrage';
import OpportunityDetails from '@/components/arbitrage/OpportunityDetails';
import type { ArbitrageOpportunity as OpportunityType } from '@/hooks/useArbitrage';
import ArbitrageHistory from '@/components/arbitrage/ArbitrageHistory';
import SpreadChart from '@/components/arbitrage/SpreadChart';
import ExchangePriceTable from '@/components/arbitrage/ExchangePriceTable';
import ProfitCalculator from '@/components/arbitrage/ProfitCalculator';
import { triangularArbitrage, ArbitrageOpportunity as TriangularOpportunity } from '@/services/arbitrage/TriangularArbitrage';
import { ExchangePriceGrid } from '@/components/arbitrage/ExchangePriceGrid';
import { TriangularPathVisualizer } from '@/components/arbitrage/TriangularPathVisualizer';
import { PerformanceAnalytics } from '@/components/arbitrage/PerformanceAnalytics';
import { ProfessionalCharts } from '@/components/arbitrage/ProfessionalCharts';
import { LiquidityHeatmap } from '@/components/arbitrage/LiquidityHeatmap';
import { PaperTradingPanel } from '@/components/arbitrage/PaperTradingPanel';
import { BacktestPanel } from '@/components/arbitrage/BacktestPanel';
import { AlertSystemPanel } from '@/components/arbitrage/AlertSystemPanel';
import { OrderBlocksPanel } from '@/components/arbitrage/OrderBlocksPanel';
import { FairValueGapsPanel } from '@/components/arbitrage/FairValueGapsPanel';
import { MarketMakerMetrics } from '@/components/arbitrage/MarketMakerMetrics';

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

interface SelectedOpportunityInfo {
  symbol: string;
  buySource?: string;
  sellSource?: string;
  buyPrice?: number;
  sellPrice?: number;
  spread?: number;
  type?: string;
  riskScore?: string;
  confidence?: number;
}

const SUPPORTED_PAIRS = ['ALL', 'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT'] as const;

const ARB_TYPE_COLORS: Record<string, string> = {
  'cex-cex': 'bg-blue-500/20 border-blue-500 text-blue-400',
  'spot-perp': 'bg-cyan-500/20 border-cyan-500 text-cyan-400',
  'triangular': 'bg-green-500/20 border-green-500 text-green-400',
  'ordinals': 'bg-orange-500/20 border-orange-500 text-orange-400',
  'runes': 'bg-purple-500/20 border-purple-500 text-purple-400',
  'brc20': 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
};

const ARB_TYPE_LABELS: Record<string, string> = {
  'cex-cex': 'CEX↔CEX',
  'spot-perp': 'Spot↔Perp',
  'triangular': 'Triangular',
  'ordinals': 'Ordinals',
  'runes': 'Runes',
  'brc20': 'BRC-20',
};

export default function ArbitragePage() {
  const [selectedPair, setSelectedPair] = useState<string>('ALL');
  const [selectedOpportunity, setSelectedOpportunity] = useState<SelectedOpportunityInfo | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [arbTypeFilter, setArbTypeFilter] = useState<string>('all');
  const [countdown, setCountdown] = useState(15);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Real exchange data from /api/arbitrage/prices
  const [arbData, setArbData] = useState<ArbitrageApiData | null>(null);
  const [arbLoading, setArbLoading] = useState(true);
  const [arbError, setArbError] = useState<string | null>(null);
  const [arbLastUpdate, setArbLastUpdate] = useState<Date | null>(null);

  // Unified arbitrage data
  const {
    opportunities: unifiedOpps,
    typeCounts,
    totalCount: unifiedTotal,
    bestNetProfit,
    loading: unifiedLoading,
    error: unifiedError,
    refresh: refreshUnified,
  } = useUnifiedArbitrage(arbTypeFilter);

  // Spot-Perp summary for card
  const { summary: spotPerpSummary, loading: spotPerpLoading } = useSpotPerpArbitrage();

  // Triangular arbitrage for dedicated tab
  const [triangularOpps, setTriangularOpps] = useState<TriangularOpportunity[]>([]);
  const [triangularLoading, setTriangularLoading] = useState(false);

  // Cross-exchange hook (for paper trading tab)
  const {
    opportunities: crossExchangeOpps,
    loading: crossExchangeLoading,
  } = useArbitrage(0, 'all', selectedPair);

  const fetchArbPrices = useCallback(async () => {
    try {
      const pairParam = selectedPair !== 'ALL' ? `?pair=${encodeURIComponent(selectedPair)}` : '';
      const res = await fetch(`/api/arbitrage/prices/${pairParam}`);
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
  }, [selectedPair]);

  const fetchTriangularOpportunities = useCallback(async () => {
    try {
      setTriangularLoading(true);
      const opps = await triangularArbitrage.scanTriangularArbitrage('USDT');
      setTriangularOpps(opps);
    } catch {
      // Triangular scan failed silently
    } finally {
      setTriangularLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArbPrices();
    const interval = setInterval(fetchArbPrices, 15000);
    return () => clearInterval(interval);
  }, [fetchArbPrices]);

  useEffect(() => {
    fetchTriangularOpportunities();
    const interval = setInterval(fetchTriangularOpportunities, 60000);
    return () => clearInterval(interval);
  }, [fetchTriangularOpportunities]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 15 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getRiskBadgeColor = (riskScore: string) => {
    switch (riskScore) {
      case 'low': return 'bg-green-500/20 border-green-500 text-green-400';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      case 'high': return 'bg-red-500/20 border-red-500 text-red-400';
      default: return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  };

  const arbYhpFallback = (tabName: string) => (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-16 h-16 bg-[#1a1a2e] border border-[#00ff88]/30 rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl">🔒</span>
      </div>
      <h3 className="text-lg font-bold text-[#00ff88] mb-2 font-mono">{tabName} — YHP ACCESS</h3>
      <p className="text-gray-400 text-sm text-center max-w-md mb-4">
        This arbitrage feature requires Yield Hacker Pass. Connect your ETH wallet to verify YHP ownership.
      </p>
      <div className="text-[10px] text-gray-600 font-mono">REQUIRED: YIELD HACKER PASS NFT</div>
    </div>
  );

  // Filter unified opportunities by pair if selected
  const filteredUnifiedOpps = selectedPair === 'ALL'
    ? unifiedOpps
    : unifiedOpps.filter(o => o.asset === selectedPair.split('/')[0]);

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
                <p className="text-gray-400 text-sm">Unified Multi-Type Arbitrage Intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>LIVE</span>
              </div>
              <select
                value={selectedPair}
                onChange={(e) => setSelectedPair(e.target.value)}
                className="bg-[#1a1a2e] border border-[#2a2a3e] text-orange-400 font-mono text-xs px-3 py-1.5 rounded-lg focus:border-orange-500 focus:outline-none cursor-pointer"
              >
                {SUPPORTED_PAIRS.map(pair => (
                  <option key={pair} value={pair} className="bg-[#0a0a0f] text-orange-400">
                    {pair === 'ALL' ? 'ALL PAIRS' : pair}
                  </option>
                ))}
              </select>
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

        {/* Content — 6 consolidated tabs */}
        <div className="p-6">
          <Tabs defaultValue="scanner" className="w-full">
            <div className="border-b border-[#1a1a2e] mb-6">
              <TabsList className="bg-transparent border-0 p-0 h-auto flex flex-wrap gap-0">
                <TabsTrigger value="scanner" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  Scanner
                </TabsTrigger>
                <TabsTrigger value="triangular" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  Triangular <span className="ml-1 px-1 py-0.5 text-[9px] bg-purple-500/20 text-purple-400 rounded font-bold">YHP</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  Analytics <span className="ml-1 px-1 py-0.5 text-[9px] bg-purple-500/20 text-purple-400 rounded font-bold">YHP</span>
                </TabsTrigger>
                <TabsTrigger value="charts-smc" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  Charts & SMC <span className="ml-1 px-1 py-0.5 text-[9px] bg-purple-500/20 text-purple-400 rounded font-bold">YHP</span>
                </TabsTrigger>
                <TabsTrigger value="paper-backtest" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  Paper Trading <span className="ml-1 px-1 py-0.5 text-[9px] bg-purple-500/20 text-purple-400 rounded font-bold">YHP</span>
                </TabsTrigger>
                <TabsTrigger value="alerts-history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                  Alerts & History
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                TAB 1: UNIFIED SCANNER — All arb types in one view
            ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="scanner">
              <div className="space-y-6">
                {/* Summary Cards — 5 cards including Spot vs Perp */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Opportunities</div>
                    <div className="text-2xl font-bold text-orange-400">
                      {unifiedLoading ? '--' : unifiedTotal}
                    </div>
                    <div className="text-xs text-gray-400">across all types</div>
                  </div>
                  <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Best Net Profit</div>
                    <div className={`text-2xl font-bold ${bestNetProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {unifiedLoading ? '--' : `${bestNetProfit.toFixed(4)}%`}
                    </div>
                    <div className="text-xs text-gray-400">after fees</div>
                  </div>
                  <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Exchanges</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {arbData?.exchangeCount || '--'}
                    </div>
                    <div className="text-xs text-gray-400">with live data</div>
                  </div>
                  <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Live Arb Types</div>
                    <div className="text-2xl font-bold text-purple-400">
                      {Object.keys(typeCounts).length || '--'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {Object.entries(typeCounts).map(([k, v]) => `${ARB_TYPE_LABELS[k] || k}: ${v}`).join(', ') || 'scanning...'}
                    </div>
                  </div>
                  {/* Spot vs Perp Card */}
                  <div className={`bg-[#1a1a2e] rounded-lg border p-4 ${
                    spotPerpSummary && spotPerpSummary.btcBasis > 0
                      ? 'border-green-500/40'
                      : spotPerpSummary && spotPerpSummary.btcBasis < 0
                        ? 'border-red-500/40'
                        : 'border-[#2a2a3e]'
                  }`}>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Spot vs Perp</div>
                    {spotPerpLoading ? (
                      <div className="text-2xl font-bold text-gray-500">--</div>
                    ) : spotPerpSummary ? (
                      <>
                        <div className={`text-2xl font-bold ${spotPerpSummary.btcBasis > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {spotPerpSummary.btcBasis > 0 ? '+' : ''}{spotPerpSummary.btcBasis.toFixed(4)}%
                        </div>
                        <div className="text-xs text-gray-400">
                          Funding: {(spotPerpSummary.btcFundingRate * 100).toFixed(4)}% / 8h
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Ann: {spotPerpSummary.btcAnnualizedFunding.toFixed(1)}%
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">No data</div>
                    )}
                  </div>
                </div>

                {/* Type Filter Chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Filter:</span>
                  {[
                    { key: 'all', label: 'All Types', icon: Target },
                    { key: 'cex-cex', label: 'CEX↔CEX', icon: ArrowRightLeft },
                    { key: 'spot-perp', label: 'Spot↔Perp', icon: TrendingUp },
                    { key: 'triangular', label: 'Triangular', icon: Triangle },
                    { key: 'ordinals', label: 'Ordinals', icon: Eye },
                    { key: 'runes', label: 'Runes', icon: Zap },
                    { key: 'brc20', label: 'BRC-20', icon: Activity },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setArbTypeFilter(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                        arbTypeFilter === key
                          ? 'bg-[#00ff88]/10 border-[#00ff88]/50 text-[#00ff88]'
                          : 'bg-[#1a1a2e] border-[#2a2a3e] text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                      {key !== 'all' && typeCounts[key] != null && (
                        <span className="ml-1 text-[10px] opacity-70">({typeCounts[key]})</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Educational Banner */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-blue-400 font-semibold mb-1">Unified Arbitrage Scanner</h3>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        Real-time scanning across CEX↔CEX (8 exchanges), Spot↔Perp (Hyperliquid), and Triangular paths.
                        Net profit accounts for trading fees, network costs, and slippage. Refreshes every 15 seconds.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Unified Opportunities Table */}
                <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-orange-400 flex items-center gap-2 text-base">
                        <Zap className="h-5 w-5" />
                        Live Opportunities
                        {!unifiedLoading && <span className="text-xs text-gray-500 font-normal ml-2">{filteredUnifiedOpps.length} found</span>}
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#2a2a3e] hover:border-orange-500"
                        disabled={unifiedLoading}
                        onClick={() => refreshUnified()}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${unifiedLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {unifiedLoading && filteredUnifiedOpps.length === 0 ? (
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-12 bg-gray-800/50 rounded animate-pulse" />
                        ))}
                      </div>
                    ) : unifiedError ? (
                      <div className="text-center py-8">
                        <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                        <p className="text-red-400 text-sm">{unifiedError}</p>
                      </div>
                    ) : filteredUnifiedOpps.length === 0 ? (
                      <div className="text-center py-8">
                        <Target className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No opportunities detected for this filter</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                          <thead>
                            <tr className="border-b border-[#2a2a3e]">
                              <th className="text-left p-3 text-gray-400 text-xs">Type</th>
                              <th className="text-left p-3 text-gray-400 text-xs">Asset</th>
                              <th className="text-left p-3 text-gray-400 text-xs">Buy Market</th>
                              <th className="text-left p-3 text-gray-400 text-xs">Sell Market</th>
                              <th className="text-right p-3 text-gray-400 text-xs">Buy Price</th>
                              <th className="text-right p-3 text-gray-400 text-xs">Sell Price</th>
                              <th className="text-right p-3 text-gray-400 text-xs">Spread %</th>
                              <th className="text-right p-3 text-gray-400 text-xs">Net Profit</th>
                              <th className="text-center p-3 text-gray-400 text-xs">Confidence</th>
                              <th className="text-center p-3 text-gray-400 text-xs">Risk</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUnifiedOpps.slice(0, 30).map((opp, i) => (
                              <motion.tr
                                key={opp.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.02 }}
                                className={`border-b border-[#1a1a2e] hover:bg-white/[0.02] cursor-pointer transition-colors ${
                                  opp.netProfitPercent > 0 ? 'bg-green-500/[0.02]' : ''
                                }`}
                                onClick={() => setSelectedOpportunity({
                                  symbol: opp.asset,
                                  buySource: opp.buyExchange,
                                  sellSource: opp.sellExchange,
                                  buyPrice: opp.buyPrice,
                                  sellPrice: opp.sellPrice,
                                  spread: opp.spreadPercent,
                                  type: opp.arbType,
                                  riskScore: opp.riskLevel,
                                  confidence: opp.confidence,
                                })}
                              >
                                <td className="p-3">
                                  <Badge className={`${ARB_TYPE_COLORS[opp.arbType] || 'bg-gray-500/20 border-gray-500 text-gray-400'} border text-[10px]`}>
                                    {ARB_TYPE_LABELS[opp.arbType] || opp.arbType}
                                  </Badge>
                                </td>
                                <td className="p-3">
                                  <span className="font-bold text-white text-sm">{opp.asset}</span>
                                </td>
                                <td className="p-3 text-sm text-gray-300">{opp.buyExchange}</td>
                                <td className="p-3 text-sm text-gray-300">{opp.sellExchange}</td>
                                <td className="p-3 text-right font-mono text-sm text-green-400">
                                  ${opp.buyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-mono text-sm text-red-400">
                                  ${opp.sellPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-mono text-sm">
                                  <span className={opp.spreadPercent > 0.05 ? 'text-green-400' : 'text-gray-300'}>
                                    {opp.spreadPercent.toFixed(4)}%
                                  </span>
                                </td>
                                <td className="p-3 text-right font-mono text-sm">
                                  <span className={`font-bold ${opp.netProfitPercent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {opp.netProfitPercent > 0 ? '+' : ''}{opp.netProfitPercent.toFixed(4)}%
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="text-xs text-gray-300">{opp.confidence}%</span>
                                </td>
                                <td className="p-3 text-center">
                                  <Badge className={`${getRiskBadgeColor(opp.riskLevel)} border text-[10px]`}>
                                    {opp.riskLevel.toUpperCase()}
                                  </Badge>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Exchange Price Table + Profit Calculator (existing) */}
                {arbData && (
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
                    <div className="mt-6">
                      <h3 className="text-[#00ff88] font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Live Exchange Prices
                      </h3>
                      <ExchangePriceGrid />
                    </div>
                  </>
                )}

                {arbLastUpdate && (
                  <div className="text-[10px] text-gray-500 text-right">
                    Last updated: {arbLastUpdate.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════
                TAB 2: TRIANGULAR (YHP)
            ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="triangular">
              <PremiumContent requiredFeature="arbitrage" fallback={arbYhpFallback('TRIANGULAR ARBITRAGE')}>
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

                {triangularLoading && triangularOpps.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 text-[#00ff88] animate-spin mx-auto mb-4" />
                      <p className="text-gray-400">Scanning triangular paths...</p>
                    </div>
                  </div>
                ) : triangularOpps.length === 0 ? (
                  <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-8 text-center">
                    <Target className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-gray-300 font-semibold mb-2">No Opportunities Found</h3>
                    <p className="text-gray-500 text-sm">
                      No profitable triangular arbitrage paths detected. The engine uses real exchange data and scans continuously.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {triangularOpps.slice(0, 12).map((opp, i) => (
                      <motion.div
                        key={opp.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <TriangularPathVisualizer
                          path={{
                            id: opp.id,
                            baseCurrency: opp.baseCurrency,
                            tradingPath: opp.tradingPath.map(step => ({
                              fromCurrency: step.fromCurrency,
                              toCurrency: step.toCurrency,
                              exchange: step.exchange,
                              price: step.price,
                              fee: 0,
                            })),
                            exchanges: opp.exchanges,
                            expectedProfit: opp.expectedProfit,
                            profitAmount: opp.profitAmount,
                            fees: opp.fees,
                            riskLevel: opp.riskLevel,
                            confidence: opp.confidence,
                            executionTime: opp.executionTime,
                            status: new Date(opp.expiresAt) < new Date() ? 'expired' : 'active',
                            createdAt: new Date(opp.timestamp),
                            expiresAt: new Date(opp.expiresAt),
                          }}
                          onExecute={(path) => {
                            setSelectedOpportunity({
                              symbol: `TRI-${path.id}`,
                              type: 'triangular',
                            });
                          }}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-blue-400 font-semibold mb-1">Real Exchange Data Engine</h4>
                      <p className="text-sm text-gray-300">
                        Triangular paths now use real bid/ask data from Binance, Coinbase, Kraken, and OKX.
                        CoinGecko is used only as fallback for cross-pairs not available on exchanges.
                        Opportunities refresh every 30 seconds.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              </PremiumContent>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════
                TAB 3: ANALYTICS (YHP)
            ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="analytics">
              <PremiumContent requiredFeature="arbitrage" fallback={arbYhpFallback('ANALYTICS')}>
              {(() => {
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

                    <SpreadChart opportunities={crossExchangeOpps} />

                    <PerformanceAnalytics strategy="all" defaultPeriod="24h" />
                  </div>
                );
              })()}
              </PremiumContent>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════
                TAB 4: CHARTS & SMC (merged) (YHP)
            ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="charts-smc">
              <PremiumContent requiredFeature="arbitrage" fallback={arbYhpFallback('CHARTS & SMC')}>
                <div className="space-y-6">
                  <ProfessionalCharts
                    symbol="BTC/USDT"
                    timeframe="1h"
                    height={500}
                    showSMC={true}
                  />
                  <LiquidityHeatmap
                    symbol="BTC/USDT"
                    levels={30}
                  />

                  {/* SMC Panels */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <OrderBlocksPanel asset="BTC/USDT" timeframe="1h" maxBlocks={8} />
                    <FairValueGapsPanel asset="BTC/USDT" timeframe="1h" maxGaps={8} />
                    <MarketMakerMetrics symbol="BTC/USDT" />
                  </div>
                </div>
              </PremiumContent>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════
                TAB 5: PAPER TRADING & BACKTEST (merged) (YHP)
            ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="paper-backtest">
              <PremiumContent requiredFeature="arbitrage" fallback={arbYhpFallback('PAPER TRADING & BACKTEST')}>
                <div className="space-y-8">
                  <PaperTradingPanel
                    initialBalance={10000}
                    onTradeExecuted={() => {}}
                    opportunities={crossExchangeOpps.map(o => ({
                      id: o.id,
                      symbol: o.symbol,
                      buySource: o.buySource,
                      sellSource: o.sellSource,
                      buyPrice: o.buyPrice,
                      sellPrice: o.sellPrice,
                      spread: o.spread,
                      netProfitPercent: o.netProfitPercent,
                      estimatedProfitPer1BTC: o.estimatedProfitPer1BTC,
                    }))}
                  />
                  <BacktestPanel onBacktestComplete={() => {}} />
                </div>
              </PremiumContent>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════
                TAB 6: ALERTS & HISTORY (merged)
            ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="alerts-history">
              <div className="space-y-8">
                <PremiumContent requiredFeature="arbitrage" fallback={arbYhpFallback('ALERT SYSTEM')}>
                  <AlertSystemPanel onAlertTriggered={() => {}} />
                </PremiumContent>
                <ArbitrageHistory />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Opportunity Details Modal */}
        <OpportunityDetails
          opportunity={selectedOpportunity as OpportunityType | null}
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
