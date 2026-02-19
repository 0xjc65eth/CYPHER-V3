/**
 * Market Maker Metrics Component
 * Professional market making analytics:
 * - Bid-Ask spread optimization
 * - Volume Profile (POC, Value Area)
 * - Inventory management
 * - Fill rate analytics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown,
  Target
} from 'lucide-react';

interface VolumeProfile {
  price: number;
  volume: number;
  percentOfTotal: number;
}

interface MarketMakerMetrics {
  symbol: string;
  currentSpread: number; // in bps (basis points)
  currentSpreadPercent: number;
  optimalSpread: number; // recommended spread
  spreadQuality: 'tight' | 'normal' | 'wide';
  volumeProfile: VolumeProfile[];
  poc: number; // Point of Control (highest volume price)
  valueAreaHigh: number; // 70% volume area high
  valueAreaLow: number; // 70% volume area low
  inventory: {
    position: number; // BTC units
    value: number; // USD value
    side: 'long' | 'short' | 'neutral';
    targetNeutral: number;
  };
  fillRate: {
    bids: number; // percentage
    asks: number;
    overall: number;
  };
  profitability: {
    spreadCapture: number; // Average spread captured
    pnlToday: number;
    roi: number; // percentage
  };
  timestamp: number;
}

interface MarketMakerMetricsProps {
  symbol?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export function MarketMakerMetrics({
  symbol = 'BTC/USDT',
  autoRefresh = true,
  refreshInterval = 30000
}: MarketMakerMetricsProps) {
  const [metrics, setMetrics] = useState<MarketMakerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch REAL order book from Binance
      const binanceSymbol = symbol.replace('/', '');
      const depthRes = await fetch(
        `https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=100`
      );

      if (!depthRes.ok) throw new Error(`HTTP ${depthRes.status}`);

      const orderBook = await depthRes.json();
      const bids: [string, string][] = orderBook.bids || [];
      const asks: [string, string][] = orderBook.asks || [];

      if (bids.length === 0 || asks.length === 0) {
        throw new Error('Empty order book');
      }

      // Calculate REAL spread
      const bestBid = parseFloat(bids[0][0]);
      const bestAsk = parseFloat(asks[0][0]);
      const currentPrice = (bestBid + bestAsk) / 2;
      const spreadAbsolute = bestAsk - bestBid;
      const spreadPercent = (spreadAbsolute / currentPrice) * 100;
      const spreadBps = spreadPercent * 100; // basis points

      // Build REAL volume profile from order book depth
      const volumeProfile: VolumeProfile[] = [];
      const priceLevels = new Map<number, number>();

      // Aggregate bid volumes
      bids.forEach(([price, quantity]) => {
        const p = parseFloat(price);
        const q = parseFloat(quantity);
        priceLevels.set(p, (priceLevels.get(p) || 0) + q);
      });

      // Aggregate ask volumes
      asks.forEach(([price, quantity]) => {
        const p = parseFloat(price);
        const q = parseFloat(quantity);
        priceLevels.set(p, (priceLevels.get(p) || 0) + q);
      });

      // Convert to VolumeProfile array
      const totalVolume = Array.from(priceLevels.values()).reduce((sum, v) => sum + v, 0);

      priceLevels.forEach((volume, price) => {
        volumeProfile.push({
          price,
          volume,
          percentOfTotal: (volume / totalVolume) * 100
        });
      });

      // Sort by price (descending)
      volumeProfile.sort((a, b) => b.price - a.price);

      // Find POC (Point of Control) - highest volume price level
      const poc = volumeProfile.reduce((max, v) => v.volume > max.volume ? v : max).price;

      // Calculate Value Area (70% of volume)
      const sortedByVolume = [...volumeProfile].sort((a, b) => b.volume - a.volume);
      let cumulativeVolume = 0;
      const targetVolume = totalVolume * 0.7;
      const valueAreaPrices: number[] = [];

      for (const v of sortedByVolume) {
        cumulativeVolume += v.volume;
        valueAreaPrices.push(v.price);
        if (cumulativeVolume >= targetVolume) break;
      }

      const valueAreaHigh = Math.max(...valueAreaPrices);
      const valueAreaLow = Math.min(...valueAreaPrices);

      // Determine spread quality based on REAL spread
      const spreadQuality: 'tight' | 'normal' | 'wide' =
        spreadPercent < 0.05 ? 'tight' :
        spreadPercent < 0.15 ? 'normal' : 'wide';

      const realMetrics: MarketMakerMetrics = {
        symbol,
        currentSpread: spreadBps,
        currentSpreadPercent: spreadPercent,
        optimalSpread: 0.05, // Target 5 bps
        spreadQuality,
        volumeProfile,
        poc,
        valueAreaHigh,
        valueAreaLow,
        inventory: {
          position: 0, // Neutral by default (would come from portfolio API)
          value: 0,
          side: 'neutral',
          targetNeutral: 0
        },
        fillRate: {
          bids: 0, // Would come from execution history API
          asks: 0,
          overall: 0
        },
        profitability: {
          spreadCapture: spreadBps * 0.7, // Assume 70% spread capture
          pnlToday: 0, // Would come from execution history
          roi: 0
        },
        timestamp: Date.now()
      };

      setMetrics(realMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [symbol, autoRefresh, refreshInterval]);

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatBps = (bps: number) => {
    return `${bps.toFixed(1)} bps`;
  };

  if (loading && !metrics) {
    return (
      <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 text-[#00ff88] animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-6 w-6 text-red-400 mx-auto mb-2" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#00ff88] flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Market Maker Metrics
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/20 border-blue-500 text-blue-400 border text-xs">
              {metrics.symbol}
            </Badge>
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
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Spread Metrics */}
        <div>
          <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Spread Analysis</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#0d0d1a] rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">Current</div>
              <div className="text-lg font-bold text-cyan-400 font-mono">
                {formatBps(metrics.currentSpread)}
              </div>
              <div className="text-xs text-gray-500">{(metrics.currentSpreadPercent).toFixed(3)}%</div>
            </div>
            <div className="bg-[#0d0d1a] rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">Optimal</div>
              <div className="text-lg font-bold text-[#00ff88] font-mono">
                {formatBps(metrics.optimalSpread * 100)}
              </div>
              <div className="text-xs text-gray-500">Target</div>
            </div>
            <div className="bg-[#0d0d1a] rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">Quality</div>
              <Badge
                className={`border text-xs ${
                  metrics.spreadQuality === 'tight'
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : metrics.spreadQuality === 'normal'
                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                    : 'bg-red-500/20 border-red-500 text-red-400'
                }`}
              >
                {metrics.spreadQuality.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Volume Profile */}
        <div>
          <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Volume Profile</h4>
          <div className="bg-[#0d0d1a] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">POC (Point of Control)</span>
              <span className="text-[#00ff88] font-mono font-bold">{formatPrice(metrics.poc)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Value Area High</span>
              <span className="text-cyan-400 font-mono">{formatPrice(metrics.valueAreaHigh)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Value Area Low</span>
              <span className="text-cyan-400 font-mono">{formatPrice(metrics.valueAreaLow)}</span>
            </div>

            {/* Volume Histogram */}
            <div className="pt-2 space-y-0.5">
              {metrics.volumeProfile.slice(0, 15).map((level, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-16 text-xs text-gray-500 font-mono text-right">
                    {(level.price / 1000).toFixed(1)}k
                  </div>
                  <div className="flex-1 bg-[#0a0a0f] rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${level.percentOfTotal}%` }}
                      transition={{ delay: i * 0.02 }}
                      className={`h-full rounded-full ${
                        level.price === metrics.poc
                          ? 'bg-gradient-to-r from-[#00ff88] to-cyan-500'
                          : level.price >= metrics.valueAreaLow && level.price <= metrics.valueAreaHigh
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-600'
                          : 'bg-gradient-to-r from-gray-600 to-gray-700'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Inventory Management */}
        <div>
          <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Inventory</h4>
          <div className="bg-[#0d0d1a] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <Badge
                className={`border text-xs ${
                  metrics.inventory.side === 'long'
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : metrics.inventory.side === 'short'
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : 'bg-gray-500/20 border-gray-500 text-gray-400'
                }`}
              >
                {metrics.inventory.side.toUpperCase()}
              </Badge>
              <div className="text-right">
                <div className="text-white font-mono font-bold">
                  {metrics.inventory.position > 0 ? '+' : ''}
                  {metrics.inventory.position.toFixed(4)} BTC
                </div>
                <div className="text-xs text-gray-400">{formatPrice(metrics.inventory.value)}</div>
              </div>
            </div>
            <div className="w-full h-2 bg-[#0a0a0f] rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  metrics.inventory.side === 'long'
                    ? 'bg-gradient-to-r from-gray-600 via-green-500 to-green-400'
                    : metrics.inventory.side === 'short'
                    ? 'bg-gradient-to-r from-red-400 via-red-500 to-gray-600'
                    : 'bg-gray-600'
                }`}
                style={{
                  width: `${Math.abs(metrics.inventory.position) * 100}%`,
                  marginLeft: metrics.inventory.position < 0 ? `${(1 + metrics.inventory.position) * 100}%` : '0'
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
              <span>-1.0 BTC</span>
              <span>Target: {metrics.inventory.targetNeutral}</span>
              <span>+1.0 BTC</span>
            </div>
          </div>
        </div>

        {/* Fill Rates */}
        <div>
          <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Fill Rates</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#0d0d1a] rounded-lg p-2 text-center">
              <div className="text-xs text-gray-500 mb-1">Bids</div>
              <div className="text-lg font-bold text-green-400 font-mono">{metrics.fillRate.bids}%</div>
            </div>
            <div className="bg-[#0d0d1a] rounded-lg p-2 text-center">
              <div className="text-xs text-gray-500 mb-1">Asks</div>
              <div className="text-lg font-bold text-red-400 font-mono">{metrics.fillRate.asks}%</div>
            </div>
            <div className="bg-[#0d0d1a] rounded-lg p-2 text-center">
              <div className="text-xs text-gray-500 mb-1">Overall</div>
              <div className="text-lg font-bold text-cyan-400 font-mono">{metrics.fillRate.overall}%</div>
            </div>
          </div>
        </div>

        {/* Profitability */}
        <div>
          <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Profitability</h4>
          <div className="bg-[#0d0d1a] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Spread Capture</span>
              <span className="text-cyan-400 font-mono">{(metrics.profitability.spreadCapture * 100).toFixed(2)} bps</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">P&L Today</span>
              <span className={`font-mono font-bold ${metrics.profitability.pnlToday >= 0 ? 'text-[#00ff88]' : 'text-red-400'}`}>
                {metrics.profitability.pnlToday >= 0 ? '+' : ''}${metrics.profitability.pnlToday.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">ROI</span>
              <span className="text-[#00ff88] font-mono font-bold">{(metrics.profitability.roi * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-300">
              <strong>Real-Time Order Book Analysis:</strong> REAL spread calculated from Binance best bid/ask.
              Volume Profile built from actual order book depth (100 levels). POC = highest volume price level.
              Value Area = 70% of real volume. Updates every {refreshInterval / 1000}s.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
