'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Calendar,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface ArbitrageHistoryItem {
  id: string;
  symbol: string;
  type: 'ordinals' | 'runes' | 'tokens';
  detectedAt: number;
  spread: number;
  potentialProfit: number;
  estimatedProfit: number;
  buySource: string;
  sellSource: string;
  status: 'active' | 'expired' | 'executed' | 'failed';
  expiresAt?: number;
  executedAt?: number;
  actualProfit?: number;
  baseCurrency: string;
}

interface PerformanceMetrics {
  totalTrades: number;
  totalProfit: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  strategy: string;
  period: string;
  message?: string;
}

export default function ArbitrageHistory() {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<string>('24h');
  const [historyData, setHistoryData] = useState<ArbitrageHistoryItem[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch from the new history endpoint that returns actual opportunity snapshots
      const response = await fetch(`/api/arbitrage/history/?timeframe=${timeframe}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();

      if (data.success && data.history) {
        setHistoryData(data.history.map((h: any) => ({
          id: h.id,
          symbol: h.symbol,
          type: h.type || 'tokens',
          detectedAt: h.detectedAt,
          spread: h.spread,
          potentialProfit: h.potentialProfit || h.estimatedProfit,
          estimatedProfit: h.estimatedProfit,
          buySource: h.buySource,
          sellSource: h.sellSource,
          status: h.status,
          expiresAt: h.expiresAt,
          baseCurrency: h.baseCurrency || 'USD',
        })));

        // Set metrics from history stats
        setMetrics({
          totalTrades: data.stats?.totalOpportunities || 0,
          totalProfit: data.stats?.totalProfit || 0,
          winRate: data.stats?.winRate || 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          strategy: 'all',
          period: timeframe,
        });
      } else {
        setHistoryData([]);
        setMetrics(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch history';
      console.error('[ArbitrageHistory] Error:', message);
      setError(message);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [timeframe]);

  const filteredData = useMemo(() => {
    return historyData.filter(item => {
      const statusMatch = filterStatus === 'all' || item.status === filterStatus;
      const typeMatch = filterType === 'all' || item.type === filterType;
      return statusMatch && typeMatch;
    });
  }, [historyData, filterStatus, filterType]);

  const stats = useMemo(() => {
    if (metrics) {
      return {
        total: metrics.totalTrades,
        executed: metrics.totalTrades,
        expired: 0,
        active: 0,
        totalPotential: metrics.totalProfit + (metrics.avgLoss * (metrics.totalTrades - Math.round(metrics.totalTrades * metrics.winRate / 100))),
        totalActual: metrics.totalProfit,
        successRate: metrics.winRate
      };
    }

    // Fallback to computing from local data
    const executed = filteredData.filter(item => item.status === 'executed');
    const totalPotential = filteredData.reduce((sum, item) => sum + item.potentialProfit, 0);
    const totalActual = executed.reduce((sum, item) => sum + (item.actualProfit || 0), 0);
    const successRate = filteredData.length > 0 ? (executed.length / filteredData.length) * 100 : 0;

    return {
      total: filteredData.length,
      executed: executed.length,
      expired: filteredData.filter(item => item.status === 'expired').length,
      active: filteredData.filter(item => item.status === 'active').length,
      totalPotential,
      totalActual,
      successRate
    };
  }, [filteredData, metrics]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="h-4 w-4 text-blue-400" />;
      case 'executed': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'expired': return <XCircle className="h-4 w-4 text-gray-400" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-400" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500/20 border-blue-500 text-blue-400';
      case 'executed': return 'bg-green-500/20 border-green-500 text-green-400';
      case 'expired': return 'bg-gray-500/20 border-gray-500 text-gray-400';
      case 'failed': return 'bg-red-500/20 border-red-500 text-red-400';
      default: return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    if (currency === 'BTC') {
      return `₿${value.toFixed(8)}`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    if (diff < 3600000) {
      return `${Math.round(diff / 60000)}min ago`;
    } else if (diff < 86400000) {
      return `${Math.round(diff / 3600000)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800/50 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-blue-400">{stats.total}</div>
                <div className="text-xs text-gray-400">Total Trades</div>
              </div>
              <BarChart3 className="h-6 w-6 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-green-400">{stats.executed}</div>
                <div className="text-xs text-gray-400">Executed</div>
              </div>
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-orange-400">{stats.successRate.toFixed(1)}%</div>
                <div className="text-xs text-gray-400">Win Rate</div>
              </div>
              <TrendingUp className="h-6 w-6 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-purple-400">${stats.totalActual.toFixed(2)}</div>
                <div className="text-xs text-gray-400">Total Profit</div>
              </div>
              <TrendingUp className="h-6 w-6 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics from Performance API */}
      {metrics && metrics.totalTrades > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800/50 border-cyan-500/30">
            <CardContent className="p-4">
              <div className="text-xs text-gray-400">Sharpe Ratio</div>
              <div className="text-lg font-bold text-cyan-400">{metrics.sharpeRatio.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="text-xs text-gray-400">Profit Factor</div>
              <div className="text-lg font-bold text-yellow-400">{metrics.profitFactor.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-red-500/30">
            <CardContent className="p-4">
              <div className="text-xs text-gray-400">Max Drawdown</div>
              <div className="text-lg font-bold text-red-400">{metrics.maxDrawdown.toFixed(2)}%</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-green-500/30">
            <CardContent className="p-4">
              <div className="text-xs text-gray-400">Avg Win / Avg Loss</div>
              <div className="text-lg font-bold text-green-400">${metrics.avgWin.toFixed(2)} / ${metrics.avgLoss.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">Period:</span>
          <div className="flex gap-1">
            {[
              { key: '1h', label: '1h' },
              { key: '24h', label: '24h' },
              { key: '7d', label: '7d' },
              { key: '30d', label: '30d' }
            ].map(period => (
              <Button
                key={period.key}
                size="sm"
                variant={timeframe === period.key ? 'default' : 'outline'}
                className={timeframe === period.key ? 'bg-orange-600' : 'border-gray-600 hover:border-orange-500'}
                onClick={() => setTimeframe(period.key)}
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="border-gray-600 hover:border-orange-500"
          onClick={fetchHistory}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <Card className="bg-black/50 border-gray-600">
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-3">
              <RefreshCw className="h-5 w-5 text-orange-400 animate-spin" />
              <span className="text-gray-400">Loading arbitrage history...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Table or Empty State */}
      {!loading && (
        <Card className="bg-black/50 border-gray-600">
          <CardHeader>
            <CardTitle className="text-gray-300 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Arbitrage Trade History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredData.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-400 mb-2">No Arbitrage Trades Executed Yet</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  {metrics && metrics.totalTrades === 0
                    ? 'No trades have been executed in this period. When you execute arbitrage trades, they will appear here with full performance metrics.'
                    : metrics && metrics.totalTrades > 0
                    ? `${metrics.totalTrades} trades found in aggregate. Individual trade details will appear when the execution history is available.`
                    : 'Trade history will populate as arbitrage trades are executed through the system.'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-3 text-gray-400 font-mono text-sm">Status</th>
                      <th className="text-left p-3 text-gray-400 font-mono text-sm">Asset</th>
                      <th className="text-center p-3 text-gray-400 font-mono text-sm">Spread</th>
                      <th className="text-center p-3 text-gray-400 font-mono text-sm">Potential Profit</th>
                      <th className="text-center p-3 text-gray-400 font-mono text-sm">Actual Profit</th>
                      <th className="text-left p-3 text-gray-400 font-mono text-sm">Route</th>
                      <th className="text-center p-3 text-gray-400 font-mono text-sm">Detected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, index) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                        className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            <Badge className={`${getStatusColor(item.status)} border text-xs`}>
                              {item.status.toUpperCase()}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Badge className={`${
                              item.type === 'ordinals' ? 'bg-orange-500/20 border-orange-500 text-orange-400' :
                              item.type === 'runes' ? 'bg-purple-500/20 border-purple-500 text-purple-400' :
                              'bg-blue-500/20 border-blue-500 text-blue-400'
                            } border text-xs`}>
                              {item.type.toUpperCase()}
                            </Badge>
                            <span className="text-white font-medium">{item.symbol}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-bold ${
                            item.spread >= 15 ? 'text-red-400' :
                            item.spread >= 10 ? 'text-orange-400' : 'text-green-400'
                          }`}>
                            {item.spread.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-white font-mono">
                            {formatCurrency(item.potentialProfit, item.baseCurrency)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {item.actualProfit ? (
                            <span className="text-green-400 font-mono">
                              {formatCurrency(item.actualProfit, item.baseCurrency)}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-gray-300 text-sm">
                            {item.buySource} → {item.sellSource}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-gray-400 text-sm">
                            {formatTime(item.detectedAt)}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
