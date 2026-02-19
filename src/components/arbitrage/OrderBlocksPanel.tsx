/**
 * Order Blocks Panel Component
 * Displays Smart Money Concepts - Order Block zones
 * Shows bullish/bearish institutional accumulation/distribution areas
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Target,
  RefreshCw,
  AlertTriangle,
  Eye,
  Info
} from 'lucide-react';

interface OrderBlock {
  id: string;
  asset: string;
  timeframe: string;
  type: 'bullish' | 'bearish';
  price: number;
  high: number;
  low: number;
  strength: number; // 1-10
  volume: number;
  fillProbability: number; // 0-100
  distancePercent: number;
  createdAt: string;
  expiresAt: string;
}

interface OrderBlocksPanelProps {
  asset?: string;
  timeframe?: string;
  maxBlocks?: number;
}

export function OrderBlocksPanel({
  asset = 'BTC/USDT',
  timeframe = '1h',
  maxBlocks = 10
}: OrderBlocksPanelProps) {
  const [orderBlocks, setOrderBlocks] = useState<OrderBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<OrderBlock | null>(null);

  const fetchOrderBlocks = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/arbitrage/smc-signals/?asset=${asset}&timeframe=${timeframe}&type=order_block`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setOrderBlocks(data.orderBlocks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Order Blocks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderBlocks();
    const interval = setInterval(fetchOrderBlocks, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [asset, timeframe]);

  const getStrengthColor = (strength: number) => {
    if (strength >= 8) return 'text-green-400';
    if (strength >= 5) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getStrengthLabel = (strength: number) => {
    if (strength >= 8) return 'STRONG';
    if (strength >= 5) return 'MODERATE';
    return 'WEAK';
  };

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

  const bullishBlocks = orderBlocks.filter(b => b.type === 'bullish').slice(0, maxBlocks / 2);
  const bearishBlocks = orderBlocks.filter(b => b.type === 'bearish').slice(0, maxBlocks / 2);

  return (
    <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#00ff88] flex items-center gap-2">
            <Target className="h-5 w-5" />
            Order Blocks
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
              onClick={fetchOrderBlocks}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && orderBlocks.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="h-6 w-6 text-[#00ff88] animate-spin mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Loading Order Blocks...</p>
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
                onClick={fetchOrderBlocks}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : orderBlocks.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Info className="h-6 w-6 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No Order Blocks detected</p>
              <p className="text-gray-500 text-xs mt-1">Waiting for institutional price action</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bullish Order Blocks */}
            {bullishBlocks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <h4 className="text-green-400 font-semibold text-sm">Bullish Order Blocks</h4>
                  <Badge className="bg-green-500/20 border-green-500 text-green-400 border text-xs">
                    {bullishBlocks.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {bullishBlocks.map((block, index) => (
                    <motion.div
                      key={block.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-[#0d0d1a] border border-green-500/20 rounded-lg p-3 hover:border-green-500/40 transition-all cursor-pointer"
                      onClick={() => setSelectedBlock(block)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-mono font-bold text-sm">
                              {formatPrice(block.price)}
                            </span>
                            <Badge className={`border text-xs ${getStrengthColor(block.strength)}`}>
                              {getStrengthLabel(block.strength)} ({block.strength}/10)
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-400 space-y-0.5">
                            <div>Range: {formatPrice(block.low)} - {formatPrice(block.high)}</div>
                            <div>Distance: {block.distancePercent.toFixed(2)}% away</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-cyan-400 font-mono text-sm font-bold">
                            {block.fillProbability}%
                          </div>
                          <div className="text-xs text-gray-500">fill prob.</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{formatTimeAgo(block.createdAt)}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 hover:bg-green-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBlock(block);
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Bearish Order Blocks */}
            {bearishBlocks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-400" />
                  <h4 className="text-red-400 font-semibold text-sm">Bearish Order Blocks</h4>
                  <Badge className="bg-red-500/20 border-red-500 text-red-400 border text-xs">
                    {bearishBlocks.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {bearishBlocks.map((block, index) => (
                    <motion.div
                      key={block.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (bullishBlocks.length + index) * 0.05 }}
                      className="bg-[#0d0d1a] border border-red-500/20 rounded-lg p-3 hover:border-red-500/40 transition-all cursor-pointer"
                      onClick={() => setSelectedBlock(block)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-mono font-bold text-sm">
                              {formatPrice(block.price)}
                            </span>
                            <Badge className={`border text-xs ${getStrengthColor(block.strength)}`}>
                              {getStrengthLabel(block.strength)} ({block.strength}/10)
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-400 space-y-0.5">
                            <div>Range: {formatPrice(block.low)} - {formatPrice(block.high)}</div>
                            <div>Distance: {block.distancePercent.toFixed(2)}% away</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-cyan-400 font-mono text-sm font-bold">
                            {block.fillProbability}%
                          </div>
                          <div className="text-xs text-gray-500">fill prob.</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{formatTimeAgo(block.createdAt)}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 hover:bg-red-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBlock(block);
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-300">
                  <strong>Order Blocks</strong> are price zones where institutional traders (smart money)
                  accumulated or distributed large positions. Price often returns to these zones before continuing
                  the trend. Higher strength = more volume & retests.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
