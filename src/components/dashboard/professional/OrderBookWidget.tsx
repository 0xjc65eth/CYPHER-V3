'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useMarketData } from '@/hooks/dashboard/useMarketData';

interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export function OrderBookWidget() {
  const marketData = useMarketData();

  const bids: OrderBookEntry[] = (marketData.orderBook?.bids || []).slice(0, 10).map((b) => ({
    price: b.price,
    size: b.amount,
    total: b.total,
  }));

  const asks: OrderBookEntry[] = (marketData.orderBook?.asks || []).slice(0, 10).map((a) => ({
    price: a.price,
    size: a.amount,
    total: a.total,
  }));

  const bestBid = bids[0]?.price || 0;
  const bestAsk = asks[0]?.price || 0;
  const spread = bestAsk - bestBid;
  const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : 0;
  const loading = bids.length === 0 && asks.length === 0;

  const allSizes = [...bids.map(b => b.size), ...asks.map(a => a.size)];
  const maxSize = allSizes.length > 0 ? Math.max(...allSizes) : 1;

  const formatPrice = (price: number) => price.toLocaleString();
  const formatSize = (size: number) => size.toFixed(3);

  const totalBidVolume = bids.reduce((sum, bid) => sum + bid.size, 0);
  const totalAskVolume = asks.reduce((sum, ask) => sum + ask.size, 0);
  const totalVolume = totalBidVolume + totalAskVolume;
  const bidPercentage = totalVolume > 0 ? (totalBidVolume / totalVolume) * 100 : 50;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-green-400" />
          <h4 className="text-sm font-medium">Order Book</h4>
        </div>
        <Badge className="bg-gray-700/50 text-gray-300 text-xs">
          BTC/USDT
        </Badge>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-green-400" />
          <span className="ml-2 text-sm text-gray-400">Loading order book...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Headers */}
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 px-1">
            <span>Price</span>
            <span className="text-right">Size</span>
            <span className="text-right">Total</span>
          </div>

          {/* Asks (Sells) */}
          <div className="space-y-0.5">
            {asks.slice(0, 5).reverse().map((ask, index) => (
              <motion.div
                key={`ask-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative grid grid-cols-3 gap-2 text-xs py-1 px-1 hover:bg-red-500/10 rounded"
              >
                <div
                  className="absolute right-0 top-0 h-full bg-red-500/10"
                  style={{ width: `${(ask.size / maxSize) * 100}%` }}
                />
                <span className="text-red-400 relative z-10">
                  {formatPrice(ask.price)}
                </span>
                <span className="text-right text-white relative z-10">
                  {formatSize(ask.size)}
                </span>
                <span className="text-right text-gray-400 relative z-10">
                  {formatSize(ask.total)}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Spread */}
          <div className="py-2 px-1 bg-gray-800/50 rounded text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-gray-400">Spread:</span>
              <span className="text-sm font-medium">${spread.toFixed(2)}</span>
              {midPrice > 0 && (
                <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                  {((spread / midPrice) * 100).toFixed(3)}%
                </Badge>
              )}
            </div>
            {midPrice > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Mid: ${formatPrice(midPrice)}
              </div>
            )}
          </div>

          {/* Bids (Buys) */}
          <div className="space-y-0.5">
            {bids.slice(0, 5).map((bid, index) => (
              <motion.div
                key={`bid-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative grid grid-cols-3 gap-2 text-xs py-1 px-1 hover:bg-green-500/10 rounded"
              >
                <div
                  className="absolute right-0 top-0 h-full bg-green-500/10"
                  style={{ width: `${(bid.size / maxSize) * 100}%` }}
                />
                <span className="text-green-400 relative z-10">
                  {formatPrice(bid.price)}
                </span>
                <span className="text-right text-white relative z-10">
                  {formatSize(bid.size)}
                </span>
                <span className="text-right text-gray-400 relative z-10">
                  {formatSize(bid.total)}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-gray-800/30 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-green-400" />
                <span className="text-xs text-gray-400">Bid Volume</span>
              </div>
              <span className="text-sm font-medium">
                {totalBidVolume.toFixed(2)} BTC
              </span>
            </div>

            <div className="bg-gray-800/30 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <TrendingDown className="w-3 h-3 text-red-400" />
                <span className="text-xs text-gray-400">Ask Volume</span>
              </div>
              <span className="text-sm font-medium">
                {totalAskVolume.toFixed(2)} BTC
              </span>
            </div>
          </div>

          {/* Volume Distribution */}
          <div className="bg-gray-800/30 rounded p-2">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-gray-400">Volume Distribution</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Progress
                  value={bidPercentage}
                  className="h-2 bg-red-500/20"
                />
              </div>
              <span className="text-xs text-gray-400">{bidPercentage.toFixed(0)}% Buy</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
