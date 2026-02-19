/**
 * Exchange Price Grid Component - REAL DATA VERSION
 * Displays REAL-TIME prices from 8 exchanges
 * Uses /api/arbitrage/prices for live data
 * Bloomberg Terminal style with color-coded best bid/ask
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  Activity,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ExchangePrice {
  name: string;
  bid: number;
  ask: number;
  last: number;
  spread: number;
  spreadPercent: number;
  volume24h: number | null;
  fee: number;
}

interface ExchangePriceGridProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function ExchangePriceGrid({
  autoRefresh = true,
  refreshInterval = 15000 // 15 seconds
}: ExchangePriceGridProps) {
  const [exchanges, setExchanges] = useState<ExchangePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [bestBid, setBestBid] = useState<{ exchange: string; price: number } | null>(null);
  const [bestAsk, setBestAsk] = useState<{ exchange: string; price: number } | null>(null);

  // Fetch REAL exchange prices
  const fetchPrices = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/arbitrage/prices/');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.exchanges && data.bestBid && data.bestAsk) {
        setExchanges(data.exchanges);
        setBestBid(data.bestBid);
        setBestAsk(data.bestAsk);
        setLastUpdate(new Date());
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Failed to fetch exchange prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh
  useEffect(() => {
    fetchPrices();

    if (autoRefresh) {
      const interval = setInterval(fetchPrices, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatVolume = (volume: number | null) => {
    if (volume === null) return 'N/A';
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(2)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(2)}K`;
    return volume.toFixed(2);
  };

  const isBestBid = (exchange: string, price: number) => {
    return bestBid && exchange === bestBid.exchange && Math.abs(price - bestBid.price) < 0.01;
  };

  const isBestAsk = (exchange: string, price: number) => {
    return bestAsk && exchange === bestAsk.exchange && Math.abs(price - bestAsk.price) < 0.01;
  };

  return (
    <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#00ff88] flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Exchange Prices
            <Badge className="bg-cyan-500/20 border-cyan-500 text-cyan-400 border ml-2">
              {exchanges.length} EXCHANGES
            </Badge>
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
              onClick={fetchPrices}
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
              <XCircle className="h-5 w-5 text-red-400" />
              <div>
                <div className="text-red-400 font-semibold">Error Loading Prices</div>
                <div className="text-sm text-red-300 mt-1">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && exchanges.length === 0 && (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin mx-auto mb-4" />
            <div className="text-gray-400">Fetching live prices from 8 exchanges...</div>
          </div>
        )}

        {/* Prices Grid */}
        {exchanges.length > 0 && (
          <>
            {/* Best Bid/Ask Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#0d0d1a] rounded-lg p-4 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-gray-500 uppercase">Best Bid (Sell Here)</span>
                </div>
                <div className="text-2xl font-mono font-bold text-green-400">
                  {bestBid ? formatPrice(bestBid.price) : 'N/A'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {bestBid ? bestBid.exchange : ''}
                </div>
              </div>
              <div className="bg-[#0d0d1a] rounded-lg p-4 border border-red-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-gray-500 uppercase">Best Ask (Buy Here)</span>
                </div>
                <div className="text-2xl font-mono font-bold text-red-400">
                  {bestAsk ? formatPrice(bestAsk.price) : 'N/A'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {bestAsk ? bestAsk.exchange : ''}
                </div>
              </div>
            </div>

            {/* Exchange Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {exchanges.map((exchange, index) => (
                <motion.div
                  key={exchange.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-[#0d0d1a] rounded-lg p-3 border border-[#2a2a3e] hover:border-[#00ff88] transition-all"
                >
                  {/* Exchange Name */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-white text-sm">{exchange.name}</div>
                    <CheckCircle className="h-3 w-3 text-green-400" />
                  </div>

                  {/* Last Price */}
                  <div className="text-lg font-mono font-bold text-cyan-400 mb-2">
                    {formatPrice(exchange.last)}
                  </div>

                  {/* Bid/Ask */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div>
                      <div className="text-gray-500">Bid</div>
                      <div className={`font-mono font-semibold ${
                        isBestBid(exchange.name, exchange.bid)
                          ? 'text-green-400 font-bold'
                          : 'text-gray-300'
                      }`}>
                        {formatPrice(exchange.bid)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Ask</div>
                      <div className={`font-mono font-semibold ${
                        isBestAsk(exchange.name, exchange.ask)
                          ? 'text-red-400 font-bold'
                          : 'text-gray-300'
                      }`}>
                        {formatPrice(exchange.ask)}
                      </div>
                    </div>
                  </div>

                  {/* Spread & Volume */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500">Spread</div>
                      <div className="font-mono text-orange-400">
                        {exchange.spreadPercent.toFixed(4)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Vol 24h</div>
                      <div className="font-mono text-purple-400">
                        {formatVolume(exchange.volume24h)}
                      </div>
                    </div>
                  </div>

                  {/* Fee */}
                  <div className="mt-2 pt-2 border-t border-[#2a2a3e]">
                    <div className="text-xs text-gray-500">Trading Fee</div>
                    <div className="font-mono text-xs text-gray-400">
                      {(exchange.fee * 100).toFixed(3)}%
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Info Banner */}
            <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded p-3">
              <div className="flex items-start gap-2">
                <Activity className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-200">
                  <strong>Real-Time Data:</strong> Prices are fetched directly from exchange APIs (Binance, Coinbase, Kraken, Bybit, OKX, Bitfinex, KuCoin, Gate.io).
                  Updates every {refreshInterval / 1000} seconds. Best bid/ask highlighted for optimal arbitrage routing.
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
