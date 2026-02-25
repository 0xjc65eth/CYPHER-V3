'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye,
  MousePointer,
  ExternalLink,
  Flame,
  Snowflake
} from 'lucide-react';
import Link from 'next/link';

interface TokenData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  pair: string;
  isHot: boolean;
}

interface Props {
  currentPair: string;
  onPairSelect?: (pair: string) => void;
}

export default function ClickableHeatmap({ currentPair, onPairSelect }: Props) {
  const [hoveredToken, setHoveredToken] = useState<TokenData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'hot' | 'runes' | 'ordinals'>('all');

  // Mock tokens data - in real implementation this would come from API
  const tokensData = useMemo((): TokenData[] => [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: 63500,
      change24h: 0,
      volume24h: 25000000000,
      marketCap: 1250000000000,
      pair: 'BTC-USDT',
      isHot: true
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      price: 1850,
      change24h: 0,
      volume24h: 12000000000,
      marketCap: 223000000000,
      pair: 'ETH-USDT',
      isHot: true
    },
    {
      symbol: 'ORDI',
      name: 'Ordinals',
      price: 8,
      change24h: 0,
      volume24h: 50000000,
      marketCap: 1020000000,
      pair: 'ORDI-BTC',
      isHot: true
    },
    {
      symbol: 'RSIC',
      name: 'RSIC Genesis',
      price: 0.000847,
      change24h: 15.67,
      volume24h: 2400000,
      marketCap: 8470000,
      pair: 'RSIC-BTC',
      isHot: true
    },
    {
      symbol: 'DOG',
      name: 'DOG•GO•TO•THE•MOON',
      price: 0.003421,
      change24h: -3.25,
      volume24h: 890000,
      marketCap: 34210000,
      pair: 'DOG-BTC',
      isHot: false
    },
    {
      symbol: 'RUNE',
      name: 'Runestone',
      price: 0.000156,
      change24h: 5.23,
      volume24h: 1250000,
      marketCap: 1560000,
      pair: 'RUNE-BTC',
      isHot: false
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      price: 185.43,
      change24h: -1.23,
      volume24h: 3200000000,
      marketCap: 87000000000,
      pair: 'SOL-USDT',
      isHot: false
    },
    {
      symbol: 'UNCOMMON',
      name: 'Uncommon Goods',
      price: 0.000089,
      change24h: 23.45,
      volume24h: 450000,
      marketCap: 890000,
      pair: 'UNCOMMON-BTC',
      isHot: true
    },
    {
      symbol: 'PIZZA',
      name: 'Pizza Ninja',
      price: 0.000234,
      change24h: -8.76,
      volume24h: 340000,
      marketCap: 2340000,
      pair: 'PIZZA-BTC',
      isHot: false
    },
    {
      symbol: 'MEME',
      name: 'Meme Genesis',
      price: 0.001456,
      change24h: 45.67,
      volume24h: 1800000,
      marketCap: 14560000,
      pair: 'MEME-BTC',
      isHot: true
    },
    {
      symbol: 'PEPE',
      name: 'Pepe Ordinal',
      price: 0.000678,
      change24h: 12.34,
      volume24h: 670000,
      marketCap: 6780000,
      pair: 'PEPE-BTC',
      isHot: true
    },
    {
      symbol: 'RARE',
      name: 'Rare Sats',
      price: 0.002134,
      change24h: -5.43,
      volume24h: 520000,
      marketCap: 21340000,
      pair: 'RARE-BTC',
      isHot: false
    }
  ], []);

  const filteredTokens = useMemo(() => {
    switch (selectedCategory) {
      case 'hot':
        return tokensData.filter(token => token.isHot);
      case 'runes':
        return tokensData.filter(token => ['RSIC', 'DOG', 'RUNE', 'UNCOMMON', 'PIZZA', 'MEME', 'PEPE'].includes(token.symbol));
      case 'ordinals':
        return tokensData.filter(token => ['ORDI', 'RARE'].includes(token.symbol));
      default:
        return tokensData;
    }
  }, [tokensData, selectedCategory]);

  const getChangeColor = (change: number) => {
    if (change > 10) return 'bg-green-500';
    if (change > 5) return 'bg-green-400';
    if (change > 0) return 'bg-green-300';
    if (change > -5) return 'bg-red-300';
    if (change > -10) return 'bg-red-400';
    return 'bg-red-500';
  };

  const getChangeIntensity = (change: number) => {
    const intensity = Math.min(Math.abs(change) / 20, 1);
    return intensity;
  };

  const formatPrice = (price: number) => {
    if (price < 0.001) {
      return `$${price.toFixed(8)}`;
    } else if (price < 1) {
      return `$${price.toFixed(6)}`;
    } else {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap > 1000000000) {
      return `$${(marketCap / 1000000000).toFixed(1)}B`;
    } else if (marketCap > 1000000) {
      return `$${(marketCap / 1000000).toFixed(1)}M`;
    } else {
      return `$${(marketCap / 1000).toFixed(0)}K`;
    }
  };

  const HeatmapCell = ({ token, index }: { token: TokenData; index: number }) => {
    const isCurrentPair = currentPair === token.pair;
    const changeIntensity = getChangeIntensity(token.change24h);
    const isPositive = token.change24h >= 0;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        className="relative group"
      >
        <motion.div
          className={`
            relative p-4 rounded-lg cursor-pointer transition-all duration-300 h-24
            ${getChangeColor(token.change24h)}
            ${isCurrentPair ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-black' : ''}
            hover:scale-105 hover:shadow-xl hover:z-10
          `}
          style={{ 
            opacity: 0.3 + (changeIntensity * 0.7),
            filter: isCurrentPair ? 'brightness(1.2)' : undefined
          }}
          onMouseEnter={() => setHoveredToken(token)}
          onMouseLeave={() => setHoveredToken(null)}
          onClick={() => onPairSelect?.(token.pair)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
            {/* Token Info */}
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-black text-sm truncate">
                    {token.symbol}
                  </div>
                  {token.isHot && (
                    <Flame className="h-3 w-3 text-orange-600" />
                  )}
                  {!token.isHot && token.change24h < -5 && (
                    <Snowflake className="h-3 w-3 text-blue-600" />
                  )}
                </div>
                <div className="text-xs text-black/80 font-medium">
                  {formatPrice(token.price)}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className={`text-xs font-bold flex items-center gap-1 text-black`}>
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {isPositive ? '+' : ''}{token.change24h.toFixed(2)}%
                </div>
                {isCurrentPair && (
                  <Eye className="h-3 w-3 text-black" />
                )}
              </div>
            </div>

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg" />
            
            {/* Click Indicator */}
            <motion.div
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
              initial={{ scale: 0 }}
              whileHover={{ scale: 1 }}
            >
              <ExternalLink className="h-3 w-3 text-black" />
            </motion.div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-bold text-white">Market Heatmap</span>
          </div>
          <Badge className="bg-cyan-500/20 border-cyan-500 text-cyan-400 border">
            <MousePointer className="h-3 w-3 mr-1" />
            Click to Switch
          </Badge>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 mb-4">
          {[
            { key: 'all', label: 'All Markets' },
            { key: 'hot', label: '🔥 Hot' },
            { key: 'runes', label: 'Runes' },
            { key: 'ordinals', label: 'Ordinals' }
          ].map(category => (
            <button
              key={category.key}
              onClick={() => setSelectedCategory(category.key as any)}
              className={`
                px-3 py-1 rounded text-xs font-medium transition-all
                ${selectedCategory === category.key 
                  ? 'bg-cyan-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }
              `}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-3 gap-3 min-h-full">
          {filteredTokens.map((token, index) => (
            <HeatmapCell key={token.symbol} token={token} index={index} />
          ))}
        </div>
      </div>

      {/* Hover Details */}
      {hoveredToken && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-gray-900 rounded-lg border border-cyan-500/30"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-bold text-white">
                {hoveredToken.name}
              </div>
              <div className="text-xs text-gray-400">
                {hoveredToken.symbol} • {hoveredToken.pair}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hoveredToken.isHot && (
                <Badge className="bg-orange-500/20 border-orange-500 text-orange-400 border">
                  <Flame className="h-3 w-3 mr-1" />
                  HOT
                </Badge>
              )}
              <Badge className={`${
                hoveredToken.change24h >= 0 
                  ? 'bg-green-500/20 border-green-500 text-green-400' 
                  : 'bg-red-500/20 border-red-500 text-red-400'
              } border`}>
                {hoveredToken.change24h >= 0 ? '+' : ''}{hoveredToken.change24h.toFixed(2)}%
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-gray-400">Price</div>
              <div className="text-white font-mono">
                {formatPrice(hoveredToken.price)}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Volume 24h</div>
              <div className="text-white font-mono">
                {formatMarketCap(hoveredToken.volume24h)}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Market Cap</div>
              <div className="text-white font-mono">
                {formatMarketCap(hoveredToken.marketCap)}
              </div>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
            <MousePointer className="h-3 w-3" />
            Click to trade {hoveredToken.pair}
          </div>
        </motion.div>
      )}

      {/* Legend */}
      <div className="mt-4 p-2 bg-gray-900/50 rounded text-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-400">Change 24h:</span>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">Bearish</span>
            <div className="flex gap-0.5">
              <div className="w-3 h-2 bg-red-500 rounded-sm" />
              <div className="w-3 h-2 bg-red-400 rounded-sm" />
              <div className="w-3 h-2 bg-red-300 rounded-sm" />
              <div className="w-3 h-2 bg-green-300 rounded-sm" />
              <div className="w-3 h-2 bg-green-400 rounded-sm" />
              <div className="w-3 h-2 bg-green-500 rounded-sm" />
            </div>
            <span className="text-gray-400">Bullish</span>
          </div>
        </div>
        <div className="text-center text-gray-500 text-[10px]">
          Color intensity = change magnitude • Click any token to trade
        </div>
      </div>
    </div>
  );
}