/**
 * Liquidity Heatmap Component
 * Visualizes order book depth across price levels
 * Shows liquidity concentration and potential stop-loss clusters
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Droplets,
  RefreshCw,
  Info,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { motion } from 'framer-motion';

interface LiquidityLevel {
  price: number;
  bidVolume: number;
  askVolume: number;
  totalVolume: number;
  percentOfMax: number;
}

interface LiquidityHeatmapProps {
  symbol?: string;
  levels?: number;
}

export function LiquidityHeatmap({
  symbol = 'BTC/USDT',
  levels = 30
}: LiquidityHeatmapProps) {
  const [liquidityData, setLiquidityData] = useState<LiquidityLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch REAL order book data from Binance
  const fetchRealOrderBook = async (): Promise<LiquidityLevel[]> => {
    try {
      const binanceSymbol = symbol.replace('/', ''); // BTC/USDT → BTCUSDT

      // Fetch order book depth from Binance
      const response = await fetch(
        `https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=${levels}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // data.bids = [[price, quantity], [price, quantity], ...]
      // data.asks = [[price, quantity], [price, quantity], ...]

      const bids: [string, string][] = data.bids || [];
      const asks: [string, string][] = data.asks || [];

      // Combine bids and asks into unified price levels
      const priceLevels = new Map<number, { bidVolume: number; askVolume: number }>();

      // Process bids (buy orders)
      bids.forEach(([priceStr, quantityStr]) => {
        const price = parseFloat(priceStr);
        const quantity = parseFloat(quantityStr);

        if (!priceLevels.has(price)) {
          priceLevels.set(price, { bidVolume: 0, askVolume: 0 });
        }
        priceLevels.get(price)!.bidVolume += quantity;
      });

      // Process asks (sell orders)
      asks.forEach(([priceStr, quantityStr]) => {
        const price = parseFloat(priceStr);
        const quantity = parseFloat(quantityStr);

        if (!priceLevels.has(price)) {
          priceLevels.set(price, { bidVolume: 0, askVolume: 0 });
        }
        priceLevels.get(price)!.askVolume += quantity;
      });

      // Convert to LiquidityLevel array
      const liquidityLevels: LiquidityLevel[] = [];
      let maxVolume = 0;

      priceLevels.forEach((volumes, price) => {
        const totalVolume = volumes.bidVolume + volumes.askVolume;
        maxVolume = Math.max(maxVolume, totalVolume);

        liquidityLevels.push({
          price,
          bidVolume: volumes.bidVolume,
          askVolume: volumes.askVolume,
          totalVolume,
          percentOfMax: 0 // Will calculate after
        });
      });

      // Calculate percentages
      liquidityLevels.forEach(level => {
        level.percentOfMax = maxVolume > 0 ? (level.totalVolume / maxVolume) * 100 : 0;
      });

      // Update current price (mid-point of best bid and best ask)
      if (bids.length > 0 && asks.length > 0) {
        const bestBid = parseFloat(bids[0][0]);
        const bestAsk = parseFloat(asks[0][0]);
        setCurrentPrice((bestBid + bestAsk) / 2);
      }

      return liquidityLevels.sort((a, b) => b.price - a.price); // Highest price first
    } catch (err) {
      console.error('Failed to fetch order book:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch order book');
      return [];
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      const data = await fetchRealOrderBook();
      setLiquidityData(data);
      setLoading(false);
    };

    loadData();

    // Auto-refresh every 10 seconds
    const interval = setInterval(loadData, 10000);

    return () => clearInterval(interval);
  }, [levels, symbol]);

  const getHeatmapColor = (percent: number, isBid: boolean): string => {
    // Blue (low) → Yellow (med) → Red (high) for liquidity
    if (percent < 30) return isBid ? 'bg-blue-900/40' : 'bg-red-900/40';
    if (percent < 60) return isBid ? 'bg-blue-700/60' : 'bg-red-700/60';
    if (percent < 80) return isBid ? 'bg-yellow-600/80' : 'bg-orange-600/80';
    return isBid ? 'bg-green-500' : 'bg-red-500';
  };

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatVolume = (volume: number) => {
    return volume.toFixed(1);
  };

  // Find max liquidity level
  const maxLiquidityLevel = liquidityData.reduce((max, level) =>
    level.totalVolume > max.totalVolume ? level : max,
    liquidityData[0] || { price: 0, totalVolume: 0, bidVolume: 0, askVolume: 0, percentOfMax: 0 }
  );

  return (
    <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#00ff88] flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Liquidity Heatmap
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/20 border-blue-500 text-blue-400 border text-xs">
              {symbol}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="border-[#2a2a3e] hover:border-[#00ff88] h-7"
              onClick={async () => {
                setLoading(true);
                setError(null);
                const newData = await fetchRealOrderBook();
                setLiquidityData(newData);
                setLoading(false);
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-4 mb-4">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-red-400" />
              <div>
                <div className="text-red-400 font-semibold">Error Loading Order Book</div>
                <div className="text-sm text-red-300 mt-1">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && liquidityData.length === 0 && (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin mx-auto mb-4" />
            <div className="text-gray-400">Fetching real-time order book from Binance...</div>
          </div>
        )}

        {/* Summary Stats */}
        {liquidityData.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#0d0d1a] rounded p-2 text-center">
            <div className="text-xs text-gray-500 mb-1">Current Price</div>
            <div className="text-sm font-mono text-cyan-400 font-bold">
              {formatPrice(currentPrice)}
            </div>
          </div>
          <div className="bg-[#0d0d1a] rounded p-2 text-center">
            <div className="text-xs text-gray-500 mb-1">Max Liquidity</div>
            <div className="text-sm font-mono text-[#00ff88] font-bold">
              {formatPrice(maxLiquidityLevel.price)}
            </div>
          </div>
          <div className="bg-[#0d0d1a] rounded p-2 text-center">
            <div className="text-xs text-gray-500 mb-1">Total Levels</div>
            <div className="text-sm font-mono text-orange-400 font-bold">
              {liquidityData.length}
            </div>
          </div>
        </div>
        )}

        {/* Heatmap */}
        {liquidityData.length > 0 && (
          <div className="bg-[#0d0d1a] rounded-lg p-4 border border-[#2a2a3e]">
          <div className="space-y-0.5 max-h-96 overflow-y-auto custom-scrollbar">
            {liquidityData.map((level, index) => {
              const isCurrentPrice = Math.abs(level.price - currentPrice) < 25;
              const bidPercent = (level.bidVolume / level.totalVolume) * 100;
              const askPercent = (level.askVolume / level.totalVolume) * 100;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.01 }}
                  className={`relative flex items-center h-6 ${
                    isCurrentPrice ? 'border-l-2 border-cyan-400 bg-cyan-400/10' : ''
                  }`}
                >
                  {/* Price Label */}
                  <div className="absolute left-0 z-10 px-2">
                    <span className={`text-xs font-mono ${
                      isCurrentPrice ? 'text-cyan-400 font-bold' : 'text-gray-400'
                    }`}>
                      {formatPrice(level.price)}
                    </span>
                  </div>

                  {/* Bid Volume (left side, green) */}
                  <div
                    className={`h-full ${getHeatmapColor(level.percentOfMax, true)} transition-all`}
                    style={{
                      width: `${bidPercent / 2}%`,
                      marginLeft: '25%'
                    }}
                  />

                  {/* Ask Volume (right side, red) */}
                  <div
                    className={`h-full ${getHeatmapColor(level.percentOfMax, false)} transition-all`}
                    style={{
                      width: `${askPercent / 2}%`
                    }}
                  />

                  {/* Volume Label */}
                  <div className="absolute right-2 z-10">
                    <span className="text-xs font-mono text-gray-500">
                      {formatVolume(level.totalVolume)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
        )}

        {/* Legend */}
        {liquidityData.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-900/40 via-blue-700/60 to-green-500 rounded" />
            <span className="text-gray-400">Bid Liquidity (Buy Orders)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-red-900/40 via-red-700/60 to-red-500 rounded" />
            <span className="text-gray-400">Ask Liquidity (Sell Orders)</span>
          </div>
        </div>
        )}

        {/* Info Banner */}
        {!error && (
          <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-200">
                <strong>Real-Time Order Book:</strong> Shows LIVE order book depth from Binance API.
                High liquidity zones (bright colors) indicate strong support/resistance or
                stop-loss clusters. Updates every 10 seconds with real bid/ask volumes.
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
