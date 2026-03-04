'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Bitcoin, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { useBitcoinPrice } from '@/hooks/useBitcoinPrice';
import { useTopCryptoPrices } from '@/hooks/useTopCryptoPrices';
import { useOrdinalsFloorPrices } from '@/hooks/useOrdinalsFloorPrices';
import { useRunesTokenPrices } from '@/hooks/useRunesTokenPrices';

interface PriceItem {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  icon?: string;
}

export function PriceTrackerSection() {
  const { price: btcPrice, change24h: btcChange } = useBitcoinPrice();
  const { prices: topCrypto, loading: cryptoLoading } = useTopCryptoPrices();
  const { collections: ordinals, loading: ordinalsLoading } = useOrdinalsFloorPrices();
  const { tokens: runes, loading: runesLoading } = useRunesTokenPrices();
  
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    setLastUpdate(new Date());
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number): string => {
    if (!price || price === 0) return '$0.00';
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}k`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toFixed(0);
  };

  return (
    <div className="space-y-6">
      {/* Bitcoin Live Price Header */}
      <Card className="bg-gradient-to-r from-orange-900/20 to-yellow-900/20 border-orange-800/50">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-full">
                <Bitcoin className="w-8 h-8 text-orange-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Bitcoin</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-3xl font-bold text-white">{formatPrice(btcPrice)}</span>
                  <div className={`flex items-center gap-1 ${btcChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {btcChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="font-medium">{Math.abs(btcChange).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Last update</p>
              <p className="text-sm text-gray-300">{lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--:--'}</p>
              <RefreshCw className="w-4 h-4 text-gray-500 mt-1 animate-spin" />
            </div>
          </div>
        </div>
      </Card>

      {/* Price Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Crypto Prices */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Top Cryptocurrencies</h3>
            <div className="space-y-3">
              {cryptoLoading ? (
                <div className="text-center py-4 text-gray-400">Loading...</div>
              ) : (
                topCrypto.slice(0, 10).map((crypto, index) => (
                  <div key={crypto.symbol} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-sm w-6">{index + 1}</span>
                      <div>
                        <p className="font-medium text-white">{crypto.symbol.toUpperCase()}</p>
                        <p className="text-xs text-gray-400">{crypto.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">{formatPrice(crypto.price)}</p>
                      <p className={`text-sm ${crypto.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Ordinals Floor Prices */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Ordinals Collections</h3>
            <div className="space-y-3">
              {ordinalsLoading ? (
                <div className="text-center py-4 text-gray-400">Loading...</div>
              ) : (
                ordinals.slice(0, 5).map((collection) => (
                  <div key={collection.name} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
                    <div>
                      <p className="font-medium text-white">{collection.name}</p>
                      <p className="text-xs text-gray-400">Vol: {formatVolume(collection.volume24h)} BTC</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">{collection.floorPrice} BTC</p>
                      <p className={`text-sm ${collection.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {collection.change24h >= 0 ? '+' : ''}{collection.change24h.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Runes Token Prices */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Runes Tokens</h3>
            <div className="space-y-3">
              {runesLoading ? (
                <div className="text-center py-4 text-gray-400">Loading...</div>
              ) : (
                runes.slice(0, 5).map((token) => (
                  <div key={token.symbol} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
                    <div>
                      <p className="font-medium text-white">{token.symbol}</p>
                      <p className="text-xs text-gray-400">ID: {token.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">{formatPrice(token.price)}</p>
                      <p className="text-xs text-gray-400">Vol: {formatVolume(token.volume24h)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Market Activity */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Market Activity</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Active Markets</span>
                <span className="text-white font-medium">2,847</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">24h Trades</span>
                <span className="text-white font-medium">1.2M</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Market Sentiment</span>
                <span className="text-green-500 font-medium">Bullish</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Active Traders</span>
                <span className="text-white font-medium">384K</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}