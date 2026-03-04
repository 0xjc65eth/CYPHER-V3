'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Activity } from 'lucide-react';
import { formatCompactNumber } from '@/utils/formatters';

export interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
  side: 'bid' | 'ask';
}

export interface OrderFlowProps {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  currentPrice?: number;
  maxLevels?: number;
  className?: string;
}

export function OrderFlow({
  bids,
  asks,
  currentPrice,
  maxLevels = 10,
  className = ''
}: OrderFlowProps) {
  const { displayBids, displayAsks, maxTotal } = useMemo(() => {
    const topBids = bids.slice(0, maxLevels).reverse();
    const topAsks = asks.slice(0, maxLevels);

    const allTotals = [...topBids, ...topAsks].map(level => level.total);
    const max = Math.max(...allTotals, 1);

    return {
      displayBids: topBids,
      displayAsks: topAsks,
      maxTotal: max
    };
  }, [bids, asks, maxLevels]);

  const formatPrice = (price: number) => price.toFixed(8);
  const formatAmount = (amount: number) => formatCompactNumber(amount, 2);

  const spread = useMemo(() => {
    if (asks.length === 0 || bids.length === 0) return null;
    const lowestAsk = asks[0].price;
    const highestBid = bids[0].price;
    const spreadValue = lowestAsk - highestBid;
    const spreadPercent = ((spreadValue / highestBid) * 100).toFixed(4);
    return { value: spreadValue, percent: spreadPercent };
  }, [asks, bids]);

  return (
    <div className={`bg-gray-900/40 border border-gray-800 rounded-terminal ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-400" />
            <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider">
              Order Book
            </h3>
          </div>
          {spread && (
            <div className="text-xs">
              <span className="text-gray-500">Spread: </span>
              <span className="font-mono font-semibold text-gray-300">
                {formatPrice(spread.value)}
              </span>
              <span className="text-gray-600 ml-1">({spread.percent}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-2 px-4 py-2 bg-gray-900/60 text-[10px] text-gray-500 uppercase font-semibold border-b border-gray-800">
        <div className="text-left">Price</div>
        <div className="text-right">Amount</div>
        <div className="text-right">Total</div>
      </div>

      <div className="divide-y divide-gray-800/50">
        {/* Asks (Sell Orders) */}
        <div className="p-4 space-y-1">
          {displayAsks.map((level, index) => (
            <OrderBookRow
              key={`ask-${index}`}
              level={level}
              maxTotal={maxTotal}
              formatPrice={formatPrice}
              formatAmount={formatAmount}
              delay={index * 0.02}
            />
          ))}
        </div>

        {/* Current Price */}
        {currentPrice && (
          <div className="px-4 py-3 bg-gray-900/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-green-400 animate-pulse" />
                <span className="text-xs text-gray-500 uppercase">Last Price</span>
              </div>
              <span className="text-lg font-bold text-white font-mono">
                {formatPrice(currentPrice)}
              </span>
            </div>
          </div>
        )}

        {/* Bids (Buy Orders) */}
        <div className="p-4 space-y-1">
          {displayBids.map((level, index) => (
            <OrderBookRow
              key={`bid-${index}`}
              level={level}
              maxTotal={maxTotal}
              formatPrice={formatPrice}
              formatAmount={formatAmount}
              delay={index * 0.02}
            />
          ))}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-2 gap-4 p-4 border-t border-gray-800 bg-gray-900/60">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowUp className="h-3 w-3 text-green-400" />
            <span className="text-[10px] text-gray-500 uppercase">Total Bids</span>
          </div>
          <div className="text-sm font-bold text-green-400 font-mono">
            {formatAmount(bids.reduce((sum, b) => sum + b.amount, 0))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowDown className="h-3 w-3 text-red-400" />
            <span className="text-[10px] text-gray-500 uppercase">Total Asks</span>
          </div>
          <div className="text-sm font-bold text-red-400 font-mono">
            {formatAmount(asks.reduce((sum, a) => sum + a.amount, 0))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderBookRow({
  level,
  maxTotal,
  formatPrice,
  formatAmount,
  delay
}: {
  level: OrderBookLevel;
  maxTotal: number;
  formatPrice: (n: number) => string;
  formatAmount: (n: number) => string;
  delay: number;
}) {
  const percentage = (level.total / maxTotal) * 100;
  const isBid = level.side === 'bid';

  return (
    <motion.div
      initial={{ opacity: 0, x: isBid ? -10 : 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.2 }}
      className="relative grid grid-cols-3 gap-2 text-xs font-mono hover:bg-gray-800/50 px-2 py-1.5 rounded cursor-pointer group"
    >
      {/* Background bar */}
      <div
        className={`absolute inset-y-0 ${isBid ? 'right-0' : 'left-0'} transition-all duration-300 ${
          isBid ? 'bg-green-500/10 group-hover:bg-green-500/20' : 'bg-red-500/10 group-hover:bg-red-500/20'
        }`}
        style={{ width: `${percentage}%` }}
      />

      {/* Content */}
      <div className={`relative z-10 ${isBid ? 'text-green-400' : 'text-red-400'} font-semibold`}>
        {formatPrice(level.price)}
      </div>
      <div className="relative z-10 text-right text-gray-300">
        {formatAmount(level.amount)}
      </div>
      <div className="relative z-10 text-right text-gray-500">
        {formatAmount(level.total)}
      </div>
    </motion.div>
  );
}

// Compact order book (for sidebar)
export function CompactOrderFlow({
  bids,
  asks,
  className = ''
}: {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  className?: string;
}) {
  const topBid = bids[0];
  const topAsk = asks[0];

  if (!topBid || !topAsk) return null;

  const spread = topAsk.price - topBid.price;
  const midPrice = (topAsk.price + topBid.price) / 2;

  return (
    <div className={`bg-gray-900/40 border border-gray-800 rounded-terminal p-3 ${className}`}>
      <div className="text-[10px] text-gray-500 uppercase font-semibold mb-2">Order Book</div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Best Ask</span>
          <span className="text-xs font-mono font-semibold text-red-400">
            {topAsk.price.toFixed(8)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Mid Price</span>
          <span className="text-sm font-mono font-bold text-white">
            {midPrice.toFixed(8)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Best Bid</span>
          <span className="text-xs font-mono font-semibold text-green-400">
            {topBid.price.toFixed(8)}
          </span>
        </div>

        <div className="pt-2 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Spread</span>
            <span className="text-xs font-mono text-orange-400">
              {spread.toFixed(8)} ({((spread / midPrice) * 100).toFixed(4)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
