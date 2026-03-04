'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  TrendingUp, 
  TrendingDown, 
  Volume2, 
  Zap,
  Target,
  Timer,
  DollarSign,
  BarChart3,
  Activity,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Layers,
  Eye,
  Brain
} from 'lucide-react';
import { formatUSD, formatCompactNumber } from '@/utils/formatters';

interface OrderBookEntry {
  price: number;
  volume: number;
  count: number;
  total: number;
  side: 'bid' | 'ask';
  timestamp: number;
  intensity: number;
}

interface Trade {
  id: string;
  price: number;
  volume: number;
  side: 'buy' | 'sell';
  timestamp: number;
  aggressive: boolean;
}

interface MarketDepth {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  midPrice: number;
  totalBidVolume: number;
  totalAskVolume: number;
}

export default function ProfessionalOrderBook() {
  const [marketDepth, setMarketDepth] = useState<MarketDepth>({
    bids: [],
    asks: [],
    spread: 0,
    midPrice: 0,
    totalBidVolume: 0,
    totalAskVolume: 0
  });
  
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [orderSize, setOrderSize] = useState('');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('limit');
  const [currentPrice, setCurrentPrice] = useState(45000);
  const [priceChange, setPriceChange] = useState(0);
  const [volume24h, setVolume24h] = useState(0);
  
  // Order book should come from real exchange data, not Math.random()
  useEffect(() => {
    if (!isLive) return;

    // Initialize with empty order book
    setMarketDepth({
      bids: [],
      asks: [],
      spread: 0,
      midPrice: currentPrice,
      totalBidVolume: 0,
      totalAskVolume: 0
    });

    // In production, connect to real WebSocket feed here
    // Example: connectToExchangeOrderBook(symbol)
  }, [isLive, currentPrice]);

  // Trades should come from real exchange data, not Math.random()
  useEffect(() => {
    if (!isLive) return;

    // Initialize with empty trades
    setTrades([]);
    setPriceChange(0);
    setVolume24h(0);

    // In production, connect to real trade feed here
    // Example: connectToExchangeTrades(symbol)
  }, [isLive, currentPrice]);

  const handleOrderBookClick = (price: number) => {
    setSelectedPrice(price);
  };

  const getVolumeBarWidth = (volume: number, maxVolume: number) => {
    return Math.min((volume / maxVolume) * 100, 100);
  };

  const maxBidVolume = Math.max(...marketDepth.bids.map(b => b.volume), 0);
  const maxAskVolume = Math.max(...marketDepth.asks.map(a => a.volume), 0);
  const maxVolume = Math.max(maxBidVolume, maxAskVolume);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className="h-8 w-8 text-cyan-500" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                PROFESSIONAL ORDER BOOK
              </h1>
            </div>
            <Badge className="bg-cyan-500/20 border-cyan-500 text-cyan-400">
              <Activity className="h-3 w-3 mr-1" />
              LEVEL II DATA
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsLive(!isLive)}
              variant="outline"
              size="sm"
              className={`border-cyan-500/50 ${isLive ? 'text-green-400' : 'text-red-400'}`}
            >
              {isLive ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {isLive ? 'LIVE' : 'PAUSED'}
            </Button>
            <Button variant="outline" size="sm" className="border-cyan-500/50">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Market Summary */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <Card className="bg-black/50 border-cyan-500/30">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-400">LAST PRICE</p>
                <p className="text-2xl font-bold text-cyan-400">
                  ${currentPrice.toLocaleString()}
                </p>
                <p className={`text-sm ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {priceChange >= 0 ? '+' : ''}{formatCompactNumber(priceChange, 2)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-green-500/30">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-400">BID</p>
                <p className="text-xl font-bold text-green-400">
                  ${marketDepth.bids[0]?.price.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-gray-400">
                  {marketDepth.bids[0]?.volume.toFixed(4) || '0'} BTC
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-red-500/30">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-400">ASK</p>
                <p className="text-xl font-bold text-red-400">
                  ${marketDepth.asks[0]?.price.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-gray-400">
                  {marketDepth.asks[0]?.volume.toFixed(4) || '0'} BTC
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-orange-500/30">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-400">SPREAD</p>
                <p className="text-xl font-bold text-orange-400">
                  ${marketDepth.spread.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">
                  {marketDepth.midPrice > 0 ? ((marketDepth.spread / marketDepth.midPrice) * 100).toFixed(3) : '0'}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-purple-500/30">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-400">24H VOLUME</p>
                <p className="text-xl font-bold text-purple-400">
                  {formatCompactNumber(volume24h, 2)}
                </p>
                <p className="text-xs text-gray-400">BTC</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Order Book */}
        <Card className="col-span-2 bg-black/50 border-cyan-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-cyan-400">ORDER BOOK</h2>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 border-green-500 text-green-400 text-xs">
                  BIDS: {formatCompactNumber(marketDepth.totalBidVolume, 2)}
                </Badge>
                <Badge className="bg-red-500/20 border-red-500 text-red-400 text-xs">
                  ASKS: {formatCompactNumber(marketDepth.totalAskVolume, 2)}
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              {/* Headers */}
              <div className="grid grid-cols-4 gap-2 text-xs text-gray-400 font-mono mb-2">
                <span>PRICE</span>
                <span>SIZE</span>
                <span>TOTAL</span>
                <span>COUNT</span>
              </div>

              {/* Asks (Sell Orders) - Red */}
              <div className="max-h-40 overflow-y-auto">
                {marketDepth.asks.slice().reverse().map((ask, index) => (
                  <motion.div
                    key={`ask-${ask.price}-${ask.timestamp}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative grid grid-cols-4 gap-2 text-xs font-mono py-1 px-2 rounded cursor-pointer hover:bg-red-500/10 transition-colors"
                    onClick={() => handleOrderBookClick(ask.price)}
                  >
                    {/* Volume Bar Background */}
                    <div 
                      className="absolute left-0 top-0 h-full bg-red-500/20 rounded transition-all duration-300"
                      style={{ width: `${getVolumeBarWidth(ask.volume, maxVolume)}%` }}
                    />
                    
                    <span className="text-red-400 relative z-10">{ask.price.toLocaleString()}</span>
                    <span className="text-white relative z-10">{ask.volume.toFixed(4)}</span>
                    <span className="text-gray-400 relative z-10">{ask.total.toFixed(0)}</span>
                    <span className="text-gray-400 relative z-10">{ask.count}</span>
                  </motion.div>
                ))}
              </div>

              {/* Spread Indicator */}
              <div className="py-2 text-center border-t border-b border-gray-700">
                <span className="text-orange-400 font-bold">
                  SPREAD: ${marketDepth.spread.toFixed(2)} ({marketDepth.midPrice > 0 ? ((marketDepth.spread / marketDepth.midPrice) * 100).toFixed(3) : '0'}%)
                </span>
              </div>

              {/* Bids (Buy Orders) - Green */}
              <div className="max-h-40 overflow-y-auto">
                {marketDepth.bids.map((bid, index) => (
                  <motion.div
                    key={`bid-${bid.price}-${bid.timestamp}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative grid grid-cols-4 gap-2 text-xs font-mono py-1 px-2 rounded cursor-pointer hover:bg-green-500/10 transition-colors"
                    onClick={() => handleOrderBookClick(bid.price)}
                  >
                    {/* Volume Bar Background */}
                    <div 
                      className="absolute left-0 top-0 h-full bg-green-500/20 rounded transition-all duration-300"
                      style={{ width: `${getVolumeBarWidth(bid.volume, maxVolume)}%` }}
                    />
                    
                    <span className="text-green-400 relative z-10">{bid.price.toLocaleString()}</span>
                    <span className="text-white relative z-10">{bid.volume.toFixed(4)}</span>
                    <span className="text-gray-400 relative z-10">{bid.total.toFixed(0)}</span>
                    <span className="text-gray-400 relative z-10">{bid.count}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trade History */}
        <Card className="bg-black/50 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-purple-400">TRADES</h2>
              <Badge className="bg-purple-500/20 border-purple-500 text-purple-400">
                <Timer className="h-3 w-3 mr-1" />
                REAL-TIME
              </Badge>
            </div>

            <div className="space-y-1">
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 font-mono mb-2">
                <span>PRICE</span>
                <span>SIZE</span>
                <span>TIME</span>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {trades.map((trade) => (
                    <motion.div
                      key={trade.id}
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`grid grid-cols-3 gap-2 text-xs font-mono py-1 px-2 rounded ${
                        trade.aggressive ? 'bg-yellow-500/10' : ''
                      }`}
                    >
                      <span className={trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                        {trade.price.toLocaleString()}
                      </span>
                      <span className="text-white">{trade.volume.toFixed(4)}</span>
                      <span className="text-gray-400">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Entry */}
        <Card className="bg-black/50 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-yellow-400">ORDER ENTRY</h2>
              <Target className="h-6 w-6 text-yellow-400" />
            </div>

            <div className="space-y-4">
              {/* Order Type */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setOrderType('market')}
                  variant={orderType === 'market' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                >
                  MARKET
                </Button>
                <Button
                  onClick={() => setOrderType('limit')}
                  variant={orderType === 'limit' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                >
                  LIMIT
                </Button>
              </div>

              {/* Price Input */}
              {orderType === 'limit' && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">PRICE</label>
                  <Input
                    type="number"
                    value={selectedPrice || ''}
                    onChange={(e) => setSelectedPrice(Number(e.target.value))}
                    placeholder="Enter price"
                    className="bg-black/50 border-yellow-500/30"
                  />
                </div>
              )}

              {/* Size Input */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">SIZE (BTC)</label>
                <Input
                  type="number"
                  value={orderSize}
                  onChange={(e) => setOrderSize(e.target.value)}
                  placeholder="0.00000000"
                  className="bg-black/50 border-yellow-500/30"
                />
              </div>

              {/* Quick Size Buttons */}
              <div className="grid grid-cols-4 gap-1">
                {['25%', '50%', '75%', 'MAX'].map((percent) => (
                  <Button
                    key={percent}
                    variant="outline"
                    size="sm"
                    className="text-xs border-yellow-500/30"
                  >
                    {percent}
                  </Button>
                ))}
              </div>

              {/* Order Total */}
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-white font-bold">
                    ${((selectedPrice || currentPrice) * Number(orderSize || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Order Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button className="bg-green-600 hover:bg-green-700 text-white font-bold">
                  BUY
                </Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white font-bold">
                  SELL
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}