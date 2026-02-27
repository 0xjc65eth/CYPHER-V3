'use client'

import { useState, useEffect } from 'react'
import { Card, Title, Text, Badge } from '@tremor/react'
import { RiArrowUpDownLine, RiArrowUpSLine, RiArrowDownSLine, RiExchangeLine } from 'react-icons/ri'
import { useMarketData } from '@/hooks/useMarketData'

export function TopMoversCard() {
  const { data, isLoading } = useMarketData(60000) // Refresh every minute
  const [mounted, setMounted] = useState(false)
  const [sortBy, setSortBy] = useState<'gainers' | 'losers' | 'volume'>('gainers')

  // Avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Format large numbers
  const formatNumber = (num: number, decimals: number = 2) => {
    if (num >= 1000000000000) {
      return `$${(num / 1000000000000).toFixed(decimals)}T`;
    }
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(decimals)}B`;
    }
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(decimals)}M`;
    }
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(decimals)}K`;
    }
    return `$${num.toFixed(decimals)}`;
  };

  // Format price based on value
  const formatPrice = (price: number) => {
    if (price < 0.01) {
      return price.toFixed(6);
    }
    if (price < 1) {
      return price.toFixed(4);
    }
    if (price < 10) {
      return price.toFixed(3);
    }
    if (price < 1000) {
      return price.toFixed(2);
    }
    return price.toFixed(0);
  };

  // Sort and filter top movers
  const getTopMovers = () => {
    if (!data || !data.top_movers) return [];

    const movers = [...data.top_movers];

    if (sortBy === 'gainers') {
      return movers.sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0, 5);
    }

    if (sortBy === 'losers') {
      return movers.sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, 5);
    }

    return movers.sort((a, b) => b.volume_24h - a.volume_24h).slice(0, 5);
  };

  const topMovers = getTopMovers();

  // Return null during SSR to avoid hydration issues
  if (!mounted) return null;

  return (
    <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3 border border-blue-500/30">
            <RiArrowUpDownLine className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <Title className="text-white text-xl">Top Movers</Title>
            <Text className="text-xs text-gray-400">24h price change</Text>
          </div>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={() => setSortBy('gainers')}
            className={`px-2 py-1 text-xs rounded ${sortBy === 'gainers' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-blue-500/20 text-gray-400 hover:bg-blue-500/30'} transition-colors`}
          >
            Gainers
          </button>
          <button
            onClick={() => setSortBy('losers')}
            className={`px-2 py-1 text-xs rounded ${sortBy === 'losers' ? 'bg-rose-500/30 text-rose-300' : 'bg-blue-500/20 text-gray-400 hover:bg-blue-500/30'} transition-colors`}
          >
            Losers
          </button>
          <button
            onClick={() => setSortBy('volume')}
            className={`px-2 py-1 text-xs rounded ${sortBy === 'volume' ? 'bg-purple-500/30 text-purple-300' : 'bg-blue-500/20 text-gray-400 hover:bg-blue-500/30'} transition-colors`}
          >
            Volume
          </button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 bg-blue-500/20 rounded mb-2"></div>
          ))}
        </div>
      ) : topMovers.length === 0 ? (
        <div className="text-center py-6">
          <Text className="text-gray-400 font-mono text-sm">Market data temporarily unavailable — external APIs may be rate-limited</Text>
        </div>
      ) : (
        <div className="space-y-3">
          {topMovers.map((coin, index) => (
            <div
              key={index}
              className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20 hover:border-blue-500/40 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-2 text-xs font-bold text-white">
                    {coin.symbol}
                  </div>
                  <div>
                    <Text className="text-white font-medium">{coin.name}</Text>
                    <div className="flex items-center">
                      <Text className="text-gray-400 text-xs mr-2">${formatPrice(coin.price)}</Text>
                      <Badge
                        color={coin.price_change_percentage_24h >= 0 ? 'emerald' : 'rose'}
                        size="xs"
                      >
                        <div className="flex items-center">
                          {coin.price_change_percentage_24h >= 0 ? (
                            <RiArrowUpSLine className="mr-0.5" />
                          ) : (
                            <RiArrowDownSLine className="mr-0.5" />
                          )}
                          {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                        </div>
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end text-xs text-gray-400 mb-1">
                    <RiExchangeLine className="mr-1" />
                    <span>24h Vol: {formatNumber(coin.volume_24h)}</span>
                  </div>
                  <Text className="text-xs text-gray-400">
                    MCap: {formatNumber(coin.market_cap)}
                  </Text>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
