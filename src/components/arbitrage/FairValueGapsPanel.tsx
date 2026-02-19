/**
 * Fair Value Gaps (FVG) Panel Component
 * Displays price gaps that may be filled later
 * Used by institutional traders to identify inefficient price zones
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Zap,
  RefreshCw,
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface FairValueGap {
  id: string;
  asset: string;
  timeframe: string;
  type: 'bullish' | 'bearish';
  high: number;
  low: number;
  gapSize?: number;
  fillPercentage?: number;
  fillProbability: number;
  createdAt: string;
}

interface FairValueGapsPanelProps {
  asset?: string;
  timeframe?: string;
  maxGaps?: number;
}

export function FairValueGapsPanel({
  asset = 'BTC/USDT',
  timeframe = '1h',
  maxGaps = 10
}: FairValueGapsPanelProps) {
  const [gaps, setGaps] = useState<FairValueGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFairValueGaps = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/arbitrage/smc-signals/?asset=${asset}&timeframe=${timeframe}&type=fair_value_gap`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setGaps((data.fairValueGaps || []).slice(0, maxGaps));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch FVGs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFairValueGaps();
    const interval = setInterval(fetchFairValueGaps, 60000);
    return () => clearInterval(interval);
  }, [asset, timeframe]);

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const bullishGaps = gaps.filter(g => g.type === 'bullish');
  const bearishGaps = gaps.filter(g => g.type === 'bearish');

  return (
    <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#00ff88] flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Fair Value Gaps
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/20 border-blue-500 text-blue-400 border text-xs">
              {asset}
            </Badge>
            <Badge className="bg-purple-500/20 border-purple-500 text-purple-400 border text-xs">
              {timeframe}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="border-[#2a2a3e] hover:border-[#00ff88] h-7"
              onClick={fetchFairValueGaps}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && gaps.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="h-6 w-6 text-[#00ff88] animate-spin mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Loading Fair Value Gaps...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="h-6 w-6 text-red-400 mx-auto mb-2" />
              <p className="text-red-400 text-sm">{error}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 border-[#2a2a3e]"
                onClick={fetchFairValueGaps}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : gaps.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Info className="h-6 w-6 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No Fair Value Gaps detected</p>
              <p className="text-gray-500 text-xs mt-1">Waiting for price inefficiencies</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Statistics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#0d0d1a] rounded-lg p-2 border border-green-500/20">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-green-400" />
                  <span className="text-xs text-gray-400">Bullish FVGs</span>
                </div>
                <div className="text-lg font-bold text-green-400">{bullishGaps.length}</div>
              </div>
              <div className="bg-[#0d0d1a] rounded-lg p-2 border border-red-500/20">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown className="h-3 w-3 text-red-400" />
                  <span className="text-xs text-gray-400">Bearish FVGs</span>
                </div>
                <div className="text-lg font-bold text-red-400">{bearishGaps.length}</div>
              </div>
            </div>

            {/* Gap List */}
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {gaps.map((gap, index) => (
                <motion.div
                  key={gap.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-[#0d0d1a] border rounded-lg p-3 ${
                    gap.type === 'bullish'
                      ? 'border-green-500/20 hover:border-green-500/40'
                      : 'border-red-500/20 hover:border-red-500/40'
                  } transition-all`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {gap.type === 'bullish' ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                      <Badge
                        className={`border text-xs ${
                          gap.type === 'bullish'
                            ? 'bg-green-500/20 border-green-500 text-green-400'
                            : 'bg-red-500/20 border-red-500 text-red-400'
                        }`}
                      >
                        {gap.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-cyan-400 font-mono text-sm font-bold">
                        {gap.fillProbability}%
                      </div>
                      <div className="text-xs text-gray-500">fill prob.</div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Range:</span>
                      <span className="text-white font-mono">
                        {formatPrice(gap.low)} - {formatPrice(gap.high)}
                      </span>
                    </div>
                    {gap.gapSize && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Gap Size:</span>
                        <span className="text-[#00ff88] font-mono font-bold">
                          ${gap.gapSize.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {gap.fillPercentage !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Filled:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-[#0a0a0f] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-[#00ff88] rounded-full transition-all"
                              style={{ width: `${gap.fillPercentage}%` }}
                            />
                          </div>
                          <span className="text-cyan-400 font-mono font-bold w-10 text-right">
                            {gap.fillPercentage}%
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-[#2a2a3e] mt-2">
                      <span className="text-gray-500">{formatTimeAgo(gap.createdAt)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-300">
                  <strong>Fair Value Gaps (FVG)</strong> occur when price moves rapidly,
                  leaving inefficient zones. These gaps have a ~75% historical fill rate
                  as smart money seeks liquidity. Unfilled gaps represent potential
                  support/resistance zones.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0d0d1a;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #2a2a3e;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3a3a4e;
        }
      `}</style>
    </Card>
  );
}
