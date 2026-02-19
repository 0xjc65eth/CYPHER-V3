'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  TrendingUp,
  Clock,
  Zap,
  BarChart3,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface ArbitrageOpportunity {
  id: string;
  pair: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  volume: number;
  confidence: number;
  timeWindow: number;
  profitEstimate: number;
  risk: 'low' | 'medium' | 'high';
}

export function ArbitrageScanner() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [scanningActive, setScanningActive] = useState(true);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchOpportunities = useCallback(async () => {
    try {
      const res = await fetch('/api/arbitrage/opportunities/');
      if (!mountedRef.current) return;

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const json = await res.json();
      const data = json.data || json.opportunities || [];

      if (Array.isArray(data) && data.length > 0) {
        const mapped: ArbitrageOpportunity[] = data.slice(0, 5).map((opp: any, i: number) => ({
          id: opp.id || String(i),
          pair: opp.pair || opp.symbol || 'BTC/USDT',
          buyExchange: opp.buyExchange || opp.source || 'Exchange A',
          sellExchange: opp.sellExchange || opp.target || 'Exchange B',
          buyPrice: opp.buyPrice || opp.sourcePrice || 0,
          sellPrice: opp.sellPrice || opp.targetPrice || 0,
          spread: opp.spread || opp.spreadPercent || 0,
          volume: opp.volume || 0,
          confidence: opp.confidence || 0,
          timeWindow: opp.timeWindow || opp.ttl || 60,
          profitEstimate: opp.profitEstimate || opp.estimatedProfit || 0,
          risk: opp.risk || (opp.spread > 1 ? 'medium' : 'low'),
        }));
        setOpportunities(mapped);
      } else {
        setOpportunities([]);
      }

      setLastScan(new Date());
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('ArbitrageScanner fetch error:', err);
      setError('Failed to fetch opportunities');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchOpportunities();

    let interval: NodeJS.Timeout | null = null;
    if (scanningActive) {
      interval = setInterval(fetchOpportunities, 15000);
    }

    return () => {
      mountedRef.current = false;
      if (interval) clearInterval(interval);
    };
  }, [scanningActive, fetchOpportunities]);

  const getRiskColor = (risk: ArbitrageOpportunity['risk']): string => {
    switch (risk) {
      case 'low':
        return 'bg-green-500/20 text-green-400';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'high':
        return 'bg-red-500/20 text-red-400';
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 85) return 'text-green-400';
    if (confidence >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-400" />
          <h4 className="text-sm font-medium">Arbitrage</h4>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={scanningActive ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setScanningActive(!scanningActive)}
            className="h-6 px-2 text-xs"
          >
            {scanningActive ? 'Stop' : 'Start'}
          </Button>
        </div>
      </div>

      {/* Scanner Status */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${scanningActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-gray-400">
            {loading ? 'Loading...' : scanningActive ? 'Scanning...' : 'Scanner stopped'}
          </span>
        </div>
        <span className="text-gray-500">
          {lastScan ? `Last scan: ${formatTimeAgo(lastScan)}` : 'Never'}
        </span>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          <span className="ml-2 text-sm text-gray-400">Scanning exchanges...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-300">{error}</span>
        </div>
      )}

      {/* No Opportunities */}
      {!loading && !error && opportunities.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No arbitrage opportunities found</p>
          <p className="text-xs text-gray-500 mt-1">Scanner is monitoring cross-exchange prices</p>
        </div>
      )}

      {/* Opportunities List */}
      {!loading && opportunities.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {opportunities.map((opp, index) => (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-3 bg-gray-800/30 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-colors"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{opp.pair}</span>
                  <Badge className={getRiskColor(opp.risk)}>
                    {opp.risk}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-400">
                    +{opp.spread.toFixed(2)}%
                  </p>
                  {opp.profitEstimate > 0 && (
                    <p className="text-xs text-gray-400">
                      ${opp.profitEstimate.toFixed(0)}
                    </p>
                  )}
                </div>
              </div>

              {/* Exchange info */}
              <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                <div className="bg-gray-800/50 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <span className="text-gray-400">Buy</span>
                  </div>
                  <p className="font-medium">{opp.buyExchange}</p>
                  <p className="text-gray-400">${opp.buyPrice.toLocaleString()}</p>
                </div>

                <div className="bg-gray-800/50 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <TrendingUp className="w-3 h-3 text-red-400 rotate-180" />
                    <span className="text-gray-400">Sell</span>
                  </div>
                  <p className="font-medium">{opp.sellExchange}</p>
                  <p className="text-gray-400">${opp.sellPrice.toLocaleString()}</p>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-2">
                {opp.confidence > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Confidence</span>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={opp.confidence}
                        className="w-16 h-1"
                      />
                      <span className={`font-medium ${getConfidenceColor(opp.confidence)}`}>
                        {opp.confidence}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Time Window</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>{opp.timeWindow}s</span>
                  </div>
                </div>

                {opp.volume > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Volume</span>
                    <span>${(opp.volume / 1000).toFixed(0)}K</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Summary */}
      {!loading && opportunities.length > 0 && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-800/30 rounded p-2">
            <div className="flex items-center gap-1 mb-1">
              <Target className="w-3 h-3 text-purple-400" />
              <span className="text-gray-400">Active Opportunities</span>
            </div>
            <p className="font-medium">{opportunities.length}</p>
          </div>

          <div className="bg-gray-800/30 rounded p-2">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-gray-400">Potential Profit</span>
            </div>
            <p className="font-medium">
              ${opportunities.reduce((sum, opp) => sum + opp.profitEstimate, 0).toFixed(0)}
            </p>
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
        <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs">
          <p className="text-yellow-300 font-medium">Risk Warning</p>
          <p className="text-gray-400 mt-1">
            Arbitrage opportunities carry execution risks. Always verify prices and liquidity before trading.
          </p>
        </div>
      </div>
    </div>
  );
}
