/**
 * Opportunity Scanner Component - REAL DATA VERSION
 * Displays REAL arbitrage opportunities from /api/arbitrage/real-opportunities
 * Uses live exchange prices from 8+ exchanges
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Eye,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

interface RealOpportunity {
  id: string;
  pair: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  profitPercent: number;
  profitUSD: number;
  volume24h: number;
  priceImpact: number;
  executionTime: number;
  risk: 'low' | 'medium' | 'high';
  confidence: number;
  timestamp: number;
  expiresAt: number;
  minTradeSize: number;
  maxTradeSize: number;
  fees: {
    buyFee: number;
    sellFee: number;
    totalFeePercent: number;
  };
}

interface OpportunityScannerProps {
  onSelectOpportunity?: (opportunity: RealOpportunity) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function OpportunityScanner({
  onSelectOpportunity,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: OpportunityScannerProps) {
  const [opportunities, setOpportunities] = useState<RealOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [sortBy, setSortBy] = useState<'profit' | 'confidence' | 'risk'>('profit');

  // Fetch REAL opportunities from API
  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/arbitrage/real-opportunities/?' + new URLSearchParams({
        pairs: 'BTC/USDT,ETH/USDT,SOL/USDT',
        minProfitPercent: '0.1',
        maxPriceImpact: '2.0',
        exchanges: 'binance,coinbase,kraken,bybit,okx,bitfinex,kucoin,gateio',
        includeGasCosts: 'true'
      }));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data.opportunities) {
        setOpportunities(data.data.opportunities);
        setLastUpdate(new Date());
      } else {
        throw new Error(data.message || 'Invalid response format');
      }
    } catch (err) {
      console.error('Failed to fetch opportunities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch opportunities');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh
  useEffect(() => {
    fetchOpportunities();

    if (autoRefresh) {
      const interval = setInterval(fetchOpportunities, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Sort opportunities
  const sortedOpportunities = [...opportunities].sort((a, b) => {
    switch (sortBy) {
      case 'profit':
        return b.profitPercent - a.profitPercent;
      case 'confidence':
        return b.confidence - a.confidence;
      case 'risk':
        const riskOrder = { low: 0, medium: 1, high: 2 };
        return riskOrder[a.risk] - riskOrder[b.risk];
      default:
        return 0;
    }
  });

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/20 border-green-500 text-green-400';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      case 'high': return 'bg-red-500/20 border-red-500 text-red-400';
      default: return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(4)}%`;
  };

  return (
    <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#00ff88] flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Arbitrage Opportunities
            {opportunities.length > 0 && (
              <Badge className="bg-[#00ff88]/20 border-[#00ff88] text-[#00ff88] border ml-2">
                {opportunities.length} ACTIVE
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-xs text-gray-500">
                Updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="border-[#2a2a3e] hover:border-[#00ff88] h-7"
              onClick={fetchOpportunities}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Sort Controls */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-500">Sort by:</span>
          <Button
            size="sm"
            variant={sortBy === 'profit' ? 'default' : 'outline'}
            className={sortBy === 'profit' ? 'bg-[#00ff88] hover:bg-[#00ff88]/90 text-black h-6 text-xs' : 'border-[#2a2a3e] h-6 text-xs'}
            onClick={() => setSortBy('profit')}
          >
            Profit
          </Button>
          <Button
            size="sm"
            variant={sortBy === 'confidence' ? 'default' : 'outline'}
            className={sortBy === 'confidence' ? 'bg-cyan-600 hover:bg-cyan-700 h-6 text-xs' : 'border-[#2a2a3e] h-6 text-xs'}
            onClick={() => setSortBy('confidence')}
          >
            Confidence
          </Button>
          <Button
            size="sm"
            variant={sortBy === 'risk' ? 'default' : 'outline'}
            className={sortBy === 'risk' ? 'bg-orange-600 hover:bg-orange-700 h-6 text-xs' : 'border-[#2a2a3e] h-6 text-xs'}
            onClick={() => setSortBy('risk')}
          >
            Risk
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-4 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div>
                <div className="text-red-400 font-semibold">Error Loading Opportunities</div>
                <div className="text-sm text-red-300 mt-1">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && opportunities.length === 0 && (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin mx-auto mb-4" />
            <div className="text-gray-400">Scanning 8 exchanges for arbitrage opportunities...</div>
          </div>
        )}

        {/* No Opportunities */}
        {!loading && opportunities.length === 0 && !error && (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <div className="text-gray-400 font-semibold mb-2">No Profitable Opportunities Found</div>
            <div className="text-sm text-gray-500">
              Current market spreads are smaller than trading fees.
              Try adjusting minimum profit threshold or check back later.
            </div>
          </div>
        )}

        {/* Opportunities Table */}
        {sortedOpportunities.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a3e] text-gray-500 text-xs uppercase">
                  <th className="text-left p-2">Pair</th>
                  <th className="text-left p-2">Buy From</th>
                  <th className="text-left p-2">Sell To</th>
                  <th className="text-right p-2">Net Profit</th>
                  <th className="text-center p-2">Risk</th>
                  <th className="text-center p-2">Confidence</th>
                  <th className="text-right p-2">Volume</th>
                  <th className="text-center p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedOpportunities.map((opp, index) => (
                  <motion.tr
                    key={opp.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-[#2a2a3e] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-2">
                      <div className="font-mono font-bold text-white">{opp.pair}</div>
                    </td>
                    <td className="p-2">
                      <div className="text-green-400 font-semibold">{opp.buyExchange}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(opp.buyPrice)}</div>
                    </td>
                    <td className="p-2">
                      <div className="text-red-400 font-semibold">{opp.sellExchange}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(opp.sellPrice)}</div>
                    </td>
                    <td className="p-2 text-right">
                      <div className="text-[#00ff88] font-mono font-bold">
                        {formatPercent(opp.profitPercent)}
                      </div>
                      <div className="text-xs text-gray-500">{formatCurrency(opp.profitUSD)}</div>
                    </td>
                    <td className="p-2 text-center">
                      <Badge className={`${getRiskColor(opp.risk)} border text-[10px]`}>
                        {opp.risk.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-2 text-center">
                      <div className={`font-mono font-bold ${getConfidenceColor(opp.confidence)}`}>
                        {opp.confidence}%
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      <div className="text-cyan-400 font-mono">
                        {formatCurrency(opp.volume24h)}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <Button
                        size="sm"
                        onClick={() => onSelectOpportunity?.(opp)}
                        className="bg-blue-600 hover:bg-blue-700 h-6 text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Info Banner */}
        {!error && (
          <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded p-3">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-200">
                <strong>Real-Time Data:</strong> Scanning {opportunities.length > 0 ? '8 live exchanges' : 'Binance, Coinbase, Kraken, Bybit, OKX, Bitfinex, KuCoin, Gate.io'}
                {' '}for arbitrage opportunities. Prices update every {refreshInterval / 1000} seconds.
                Net profit includes trading fees and gas costs.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
