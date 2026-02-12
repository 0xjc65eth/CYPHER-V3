'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Flame } from 'lucide-react';
import { rateLimitedFetch } from '@/lib/rateLimitedFetch';

interface Mover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  volume: number;
}

const FALLBACK_GAINERS: Mover[] = [
  { symbol: 'ORDI', name: 'Ordinals', price: 45.23, change: 24.5, volume: 12.4 },
  { symbol: 'SATS', name: 'SATS', price: 0.000234, change: 18.2, volume: 8.7 },
  { symbol: 'PIPE', name: 'PIPE', price: 2.34, change: 15.8, volume: 5.2 },
];

const FALLBACK_LOSERS: Mover[] = [
  { symbol: 'RUNE', name: 'Runes', price: 0.892, change: -12.3, volume: 6.1 },
  { symbol: 'CATS', name: 'Cats', price: 0.00123, change: -8.7, volume: 3.4 },
  { symbol: 'RATS', name: 'Rats', price: 0.000089, change: -6.2, volume: 2.1 },
];

export function TopMovers() {
  const [isMounted, setIsMounted] = useState(false);
  const [topGainers, setTopGainers] = useState<Mover[]>(FALLBACK_GAINERS);
  const [topLosers, setTopLosers] = useState<Mover[]>(FALLBACK_LOSERS);

  useEffect(() => {
    setIsMounted(true);

    const fetchTopMovers = async () => {
      try {
        const coins: any[] = await rateLimitedFetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h',
          { cacheTTL: 120000 } // 2 minutes cache
        );

        if (coins && Array.isArray(coins)) {
          const sorted = coins
            .filter((c: any) => c.price_change_percentage_24h != null)
            .sort((a: any, b: any) => b.price_change_percentage_24h - a.price_change_percentage_24h);

          const gainers = sorted.slice(0, 3).map((c: any) => ({
            symbol: (c.symbol || '').toUpperCase(),
            name: c.name || c.symbol,
            price: c.current_price || 0,
            change: c.price_change_percentage_24h || 0,
            volume: (c.total_volume || 0) / 1e9
          }));

          const losers = sorted.slice(-3).reverse().map((c: any) => ({
            symbol: (c.symbol || '').toUpperCase(),
            name: c.name || c.symbol,
            price: c.current_price || 0,
            change: c.price_change_percentage_24h || 0,
            volume: (c.total_volume || 0) / 1e9
          }));

          if (gainers.length > 0) setTopGainers(gainers);
          if (losers.length > 0) setTopLosers(losers);
        }
      } catch {
        console.log('CoinGecko top movers unavailable, using fallback');
      }
    };

    fetchTopMovers();
  }, []);

  const formatPrice = (price: number) => {
    if (!isMounted) return '--';
    if (price < 0.0001) return price.toExponential(2);
    if (price < 1) return price.toFixed(6);
    return price.toFixed(2);
  };

  if (!isMounted) {
    return (
      <Card className="bg-gray-900 border-gray-800 p-3">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-white flex items-center">
            <Flame className="w-4 h-4 mr-1.5 text-orange-500" />
            Top Movers
          </h4>
        </div>
        <div className="h-32 bg-gray-800/50 rounded animate-pulse" />
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800 p-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white flex items-center">
          <Flame className="w-4 h-4 mr-1.5 text-orange-500" />
          Top Movers
        </h4>
      </div>

      <div className="space-y-3">
        {/* Top Gainers */}
        <div>
          <h5 className="text-xs text-gray-400 mb-2 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
            Top Gainers
          </h5>
          <div className="space-y-1">
            {topGainers.map((mover) => (
              <div key={mover.symbol} className="bg-gray-800 rounded p-2 hover:bg-gray-750 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-white">{mover.symbol}</span>
                    <span className="text-xs text-gray-500 ml-1">{mover.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-white">${formatPrice(mover.price)}</div>
                    <div className="text-xs text-green-500">+{mover.change}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Losers */}
        <div>
          <h5 className="text-xs text-gray-400 mb-2 flex items-center">
            <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
            Top Losers
          </h5>
          <div className="space-y-1">
            {topLosers.map((mover) => (
              <div key={mover.symbol} className="bg-gray-800 rounded p-2 hover:bg-gray-750 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-white">{mover.symbol}</span>
                    <span className="text-xs text-gray-500 ml-1">{mover.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-white">${formatPrice(mover.price)}</div>
                    <div className="text-xs text-red-500">{mover.change}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}