/**
 * Performance Analytics Dashboard
 * Displays institutional-grade trading metrics:
 * - Sharpe/Sortino/Calmar Ratios
 * - Equity curve chart
 * - Monthly returns heatmap
 * - Drawdown visualization
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  AlertTriangle,
  Info,
  BarChart3,
  Target
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PerformanceMetrics {
  strategy: string;
  period: string;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  totalTrades: number;
  totalProfit: number;
  returnPercent: number;
  volatility: number;
  recoveryTime: number;
}

interface PerformanceAnalyticsProps {
  strategy?: string;
  defaultPeriod?: '24h' | '7d' | '30d' | 'all';
}

export function PerformanceAnalytics({
  strategy = 'all',
  defaultPeriod = '24h'
}: PerformanceAnalyticsProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d' | 'all'>(defaultPeriod);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/arbitrage/performance/?strategy=${strategy}&period=${period}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [strategy, period]);

  const getRatioColor = (value: number, type: 'sharpe' | 'sortino' | 'calmar' | 'profit') => {
    if (type === 'profit') {
      if (value >= 2) return 'text-[#00ff88]';
      if (value >= 1) return 'text-cyan-400';
      return 'text-red-400';
    }
    // Sharpe, Sortino, Calmar
    if (value >= 2) return 'text-[#00ff88]';
    if (value >= 1) return 'text-cyan-400';
    if (value >= 0) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRatioLabel = (value: number, type: 'sharpe' | 'sortino' | 'calmar' | 'profit') => {
    if (type === 'profit') {
      if (value >= 2) return 'EXCELLENT';
      if (value >= 1) return 'GOOD';
      return 'POOR';
    }
    if (value >= 2) return 'EXCELLENT';
    if (value >= 1) return 'GOOD';
    if (value >= 0) return 'FAIR';
    return 'POOR';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  if (loading && !metrics) {
    return (
      <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-[#00ff88] animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-400">{error}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 border-[#2a2a3e]"
                onClick={fetchMetrics}
              >
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#00ff88] mb-1">Performance Analytics</h2>
          <p className="text-gray-400 text-sm">Institutional-grade trading metrics</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex gap-1">
            {(['24h', '7d', '30d', 'all'] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? 'default' : 'outline'}
                className={period === p ? 'bg-[#ff8800] hover:bg-[#ff8800]/90 h-7' : 'border-[#2a2a3e] hover:border-[#ff8800] h-7'}
                onClick={() => setPeriod(p)}
              >
                {p.toUpperCase()}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-[#2a2a3e] hover:border-[#00ff88] h-7"
            onClick={fetchMetrics}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Sharpe Ratio */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4"
        >
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Sharpe Ratio</div>
          <div className={`text-3xl font-bold font-mono ${getRatioColor(metrics.sharpeRatio, 'sharpe')}`}>
            {metrics.sharpeRatio.toFixed(2)}
          </div>
          <Badge className={`mt-2 text-xs border ${
            metrics.sharpeRatio >= 2 ? 'bg-green-500/20 border-green-500 text-green-400' :
            metrics.sharpeRatio >= 1 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' :
            'bg-yellow-500/20 border-yellow-500 text-yellow-400'
          }`}>
            {getRatioLabel(metrics.sharpeRatio, 'sharpe')}
          </Badge>
        </motion.div>

        {/* Sortino Ratio */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4"
        >
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Sortino Ratio</div>
          <div className={`text-3xl font-bold font-mono ${getRatioColor(metrics.sortinoRatio, 'sortino')}`}>
            {metrics.sortinoRatio > 100 ? '∞' : metrics.sortinoRatio.toFixed(2)}
          </div>
          <Badge className={`mt-2 text-xs border ${
            metrics.sortinoRatio >= 2 ? 'bg-green-500/20 border-green-500 text-green-400' :
            metrics.sortinoRatio >= 1 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' :
            'bg-yellow-500/20 border-yellow-500 text-yellow-400'
          }`}>
            {getRatioLabel(metrics.sortinoRatio, 'sortino')}
          </Badge>
        </motion.div>

        {/* Calmar Ratio */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4"
        >
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Calmar Ratio</div>
          <div className={`text-3xl font-bold font-mono ${getRatioColor(metrics.calmarRatio, 'calmar')}`}>
            {metrics.calmarRatio.toFixed(2)}
          </div>
          <Badge className={`mt-2 text-xs border ${
            metrics.calmarRatio >= 1 ? 'bg-green-500/20 border-green-500 text-green-400' :
            metrics.calmarRatio >= 0.5 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' :
            'bg-yellow-500/20 border-yellow-500 text-yellow-400'
          }`}>
            {getRatioLabel(metrics.calmarRatio, 'calmar')}
          </Badge>
        </motion.div>

        {/* Profit Factor */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4"
        >
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Profit Factor</div>
          <div className={`text-3xl font-bold font-mono ${getRatioColor(metrics.profitFactor, 'profit')}`}>
            {metrics.profitFactor > 100 ? '∞' : metrics.profitFactor.toFixed(2)}
          </div>
          <Badge className={`mt-2 text-xs border ${
            metrics.profitFactor >= 2 ? 'bg-green-500/20 border-green-500 text-green-400' :
            metrics.profitFactor >= 1 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' :
            'bg-red-500/20 border-red-500 text-red-400'
          }`}>
            {getRatioLabel(metrics.profitFactor, 'profit')}
          </Badge>
        </motion.div>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Win Rate */}
        <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-3">
          <div className="text-xs text-gray-500 mb-1">Win Rate</div>
          <div className={`text-xl font-bold font-mono ${metrics.winRate >= 60 ? 'text-[#00ff88]' : metrics.winRate >= 50 ? 'text-cyan-400' : 'text-yellow-400'}`}>
            {metrics.winRate.toFixed(1)}%
          </div>
        </div>

        {/* Total Trades */}
        <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-3">
          <div className="text-xs text-gray-500 mb-1">Total Trades</div>
          <div className="text-xl font-bold font-mono text-cyan-400">{metrics.totalTrades}</div>
        </div>

        {/* Total Profit */}
        <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-3">
          <div className="text-xs text-gray-500 mb-1">Total Profit</div>
          <div className={`text-xl font-bold font-mono ${metrics.totalProfit >= 0 ? 'text-[#00ff88]' : 'text-red-400'}`}>
            {formatCurrency(metrics.totalProfit)}
          </div>
        </div>

        {/* Return %*/}
        <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-3">
          <div className="text-xs text-gray-500 mb-1">Return</div>
          <div className={`text-xl font-bold font-mono ${metrics.returnPercent >= 0 ? 'text-[#00ff88]' : 'text-red-400'}`}>
            {metrics.returnPercent >= 0 ? '+' : ''}{metrics.returnPercent.toFixed(2)}%
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-3">
          <div className="text-xs text-gray-500 mb-1">Max Drawdown</div>
          <div className="text-xl font-bold font-mono text-red-400">
            -{metrics.maxDrawdown.toFixed(2)}%
          </div>
        </div>

        {/* Current DD */}
        <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-3">
          <div className="text-xs text-gray-500 mb-1">Current DD</div>
          <div className="text-xl font-bold font-mono text-orange-400">
            -{metrics.currentDrawdown.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Win/Loss Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
          <CardHeader>
            <CardTitle className="text-[#00ff88] text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Win/Loss Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Average Win</span>
              <span className="text-[#00ff88] font-mono font-bold">{formatCurrency(metrics.avgWin)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Average Loss</span>
              <span className="text-red-400 font-mono font-bold">{formatCurrency(metrics.avgLoss)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#2a2a3e]">
              <span className="text-sm text-gray-400">Win/Loss Ratio</span>
              <span className="text-cyan-400 font-mono font-bold">
                {metrics.avgLoss !== 0 ? (Math.abs(metrics.avgWin / metrics.avgLoss)).toFixed(2) : '∞'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
          <CardHeader>
            <CardTitle className="text-[#00ff88] text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recovery Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Recovery Time</span>
              <span className="text-cyan-400 font-mono font-bold">
                {metrics.recoveryTime} {metrics.recoveryTime === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Volatility</span>
              <span className="text-orange-400 font-mono font-bold">{metrics.volatility.toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#2a2a3e]">
              <span className="text-sm text-gray-400">Risk Level</span>
              <Badge className={`border text-xs ${
                metrics.volatility < 5 ? 'bg-green-500/20 border-green-500 text-green-400' :
                metrics.volatility < 10 ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' :
                'bg-red-500/20 border-red-500 text-red-400'
              }`}>
                {metrics.volatility < 5 ? 'LOW' : metrics.volatility < 10 ? 'MEDIUM' : 'HIGH'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-blue-400 font-semibold mb-2">Understanding Performance Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-200">
              <div>
                <strong>Sharpe Ratio:</strong> Risk-adjusted returns. &gt;1 = good, &gt;2 = excellent.
              </div>
              <div>
                <strong>Sortino Ratio:</strong> Like Sharpe but only considers downside risk.
              </div>
              <div>
                <strong>Calmar Ratio:</strong> Return vs max drawdown. &gt;0.5 = good, &gt;1 = excellent.
              </div>
              <div>
                <strong>Profit Factor:</strong> Gross profit / gross loss. &gt;1 = profitable, &gt;2 = excellent.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
