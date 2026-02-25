'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  Volume2,
  Target,
  MousePointer,
  Zap,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  midPrice: number;
}

interface Props {
  pair: string;
  onPriceClick: (price: number, side: 'buy' | 'sell') => void;
  depth?: OrderBookData | null;
}

// Convert pair like "BTC/USDT" to Binance symbol "BTCUSDT"
function pairToSymbol(pair: string): string {
  return pair.replace('/', '').replace('-', '').toUpperCase();
}

export default function InteractiveOrderBook({ pair, onPriceClick, depth }: Props) {
  const [selectedLevel, setSelectedLevel] = useState<{price: number, side: 'buy' | 'sell'} | null>(null);
  const [hoveredLevel, setHoveredLevel] = useState<{price: number, side: 'buy' | 'sell'} | null>(null);
  const [fetchedData, setFetchedData] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch real orderbook data if no depth prop is provided
  useEffect(() => {
    if (depth) {
      // External data provided, no need to fetch
      setFetchedData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const fetchOrderBook = async () => {
      setLoading(true);
      setError(null);
      try {
        const symbol = pairToSymbol(pair);
        const res = await fetch(`/api/market/orderbook?symbol=${symbol}&limit=20`);
        if (!res.ok) {
          throw new Error(`Order book unavailable (${res.status})`);
        }
        const data = await res.json();
        if (cancelled) return;

        if (data.error) {
          throw new Error(data.error);
        }

        const bids: OrderBookEntry[] = (data.bids || []).map((b: any, i: number, arr: any[]) => ({
          price: b.price,
          amount: b.quantity,
          total: arr.slice(0, i + 1).reduce((sum: number, x: any) => sum + x.quantity, 0),
        }));

        const asks: OrderBookEntry[] = (data.asks || []).map((a: any, i: number, arr: any[]) => ({
          price: a.price,
          amount: a.quantity,
          total: arr.slice(0, i + 1).reduce((sum: number, x: any) => sum + x.quantity, 0),
        }));

        const spread = data.spread || (asks[0]?.price && bids[0]?.price ? asks[0].price - bids[0].price : 0);
        const midPrice = bids[0]?.price && asks[0]?.price ? (bids[0].price + asks[0].price) / 2 : 0;

        setFetchedData({ bids, asks, spread, midPrice });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Order book unavailable');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOrderBook();
    // Refresh every 10 seconds
    const interval = setInterval(fetchOrderBook, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [pair, depth]);

  const orderBook = depth || fetchedData;

  // Calculate max volume for visualization
  const maxVolume = useMemo(() => {
    if (!orderBook) return 1;
    const maxBidVolume = Math.max(...orderBook.bids.map(b => b.amount), 0);
    const maxAskVolume = Math.max(...orderBook.asks.map(a => a.amount), 0);
    return Math.max(maxBidVolume, maxAskVolume, 1);
  }, [orderBook]);

  const handleLevelClick = useCallback((price: number, side: 'buy' | 'sell') => {
    setSelectedLevel({ price, side });
    onPriceClick(price, side);
  }, [onPriceClick]);

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(4);
  };

  const OrderLevel = ({
    entry,
    side,
    index
  }: {
    entry: OrderBookEntry;
    side: 'buy' | 'sell';
    index: number;
  }) => {
    const volumePercentage = (entry.amount / maxVolume) * 100;
    const isSelected = selectedLevel?.price === entry.price && selectedLevel?.side === side;
    const isHovered = hoveredLevel?.price === entry.price && hoveredLevel?.side === side;

    return (
      <motion.div
        initial={{ opacity: 0, x: side === 'buy' ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.02, duration: 0.3 }}
        className={`
          relative group cursor-pointer transition-all duration-200 p-2 rounded
          ${isSelected ? 'bg-orange-500/20 border border-orange-500' : ''}
          ${isHovered ? 'bg-gray-700/50' : ''}
          hover:bg-gray-700/30
        `}
        onClick={() => handleLevelClick(entry.price, side)}
        onMouseEnter={() => setHoveredLevel({ price: entry.price, side })}
        onMouseLeave={() => setHoveredLevel(null)}
      >
        {/* Volume Background Bar */}
        <div
          className={`
            absolute inset-y-0 ${side === 'buy' ? 'right-0' : 'left-0'}
            transition-all duration-300 rounded
            ${side === 'buy' ? 'bg-green-500/10' : 'bg-red-500/10'}
            ${isHovered ? 'opacity-80' : 'opacity-40'}
          `}
          style={{ width: `${volumePercentage}%` }}
        />

        {/* Order Level Content */}
        <div className={`relative z-10 grid grid-cols-3 gap-2 text-sm font-mono`}>
          <div className={`text-right ${side === 'buy' ? 'text-green-400' : 'text-red-400'} font-bold`}>
            {formatPrice(entry.price)}
          </div>
          <div className="text-center text-gray-300">
            {formatAmount(entry.amount)}
          </div>
          <div className="text-left text-gray-400 text-xs">
            {formatAmount(entry.total)}
          </div>
        </div>

        {/* Click Indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 top-1/2 transform -translate-y-1/2"
          >
            <Target className="h-3 w-3 text-orange-400" />
          </motion.div>
        )}

        {/* Hover Effect */}
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 border border-gray-500 rounded"
          />
        )}
      </motion.div>
    );
  };

  // Loading state
  if (loading && !orderBook) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <RefreshCw className="h-6 w-6 text-blue-400 animate-spin mb-2" />
        <span className="text-sm text-gray-400">Loading order book...</span>
      </div>
    );
  }

  // Error / no data state
  if (error && !orderBook) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <AlertCircle className="h-6 w-6 text-gray-500 mb-2" />
        <span className="text-sm text-gray-400">{error}</span>
      </div>
    );
  }

  if (!orderBook) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <AlertCircle className="h-6 w-6 text-gray-500 mb-2" />
        <span className="text-sm text-gray-400">Order book unavailable</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-bold text-white">Order Book</span>
            {loading && <RefreshCw className="h-3 w-3 text-gray-500 animate-spin" />}
          </div>
          <Badge className="bg-blue-500/20 border-blue-500 text-blue-400 border">
            <MousePointer className="h-3 w-3 mr-1" />
            Click to Trade
          </Badge>
        </div>

        {/* Headers */}
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 font-bold mb-2 px-2">
          <div className="text-right">Price</div>
          <div className="text-center">Amount</div>
          <div className="text-left">Total</div>
        </div>
      </div>

      {/* Order Book Content */}
      <div className="flex-1 overflow-hidden">
        {/* Asks (Sell Orders) */}
        <div className="mb-4">
          <div className="h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
            <div className="space-y-1">
              {orderBook.asks.slice().reverse().map((ask, index) => (
                <OrderLevel
                  key={`ask-${ask.price}`}
                  entry={ask}
                  side="sell"
                  index={index}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Spread Indicator */}
        <Card className="bg-gray-900/50 border-orange-500/30 mb-4">
          <CardContent className="p-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-lg font-bold text-white">
                  {formatPrice(orderBook.midPrice)}
                </span>
                <TrendingDown className="h-4 w-4 text-red-400" />
              </div>
              <div className="text-xs text-gray-400">
                Spread: {formatPrice(orderBook.spread)} ({((orderBook.spread / orderBook.midPrice) * 100).toFixed(3)}%)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bids (Buy Orders) */}
        <div>
          <div className="h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
            <div className="space-y-1">
              {orderBook.bids.map((bid, index) => (
                <OrderLevel
                  key={`bid-${bid.price}`}
                  entry={bid}
                  side="buy"
                  index={index}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Level Actions */}
      {selectedLevel && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-gray-900 rounded-lg border border-orange-500/30"
        >
          <div className="text-xs text-gray-400 mb-2">Selected Level:</div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm">
              <span className={selectedLevel.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                {selectedLevel.side.toUpperCase()}
              </span>
              <span className="text-white ml-2 font-mono">
                {formatPrice(selectedLevel.price)}
              </span>
            </div>
            <Badge className={`${
              selectedLevel.side === 'buy' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-red-500/20 border-red-500 text-red-400'
            } border`}>
              <Target className="h-3 w-3 mr-1" />
              SELECTED
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onPriceClick(selectedLevel.price, 'buy')}
            >
              <Zap className="h-3 w-3 mr-1" />
              Buy at {formatPrice(selectedLevel.price)}
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => onPriceClick(selectedLevel.price, 'sell')}
            >
              <Zap className="h-3 w-3 mr-1" />
              Sell at {formatPrice(selectedLevel.price)}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
