'use client'

import { useState, useEffect } from 'react'
import { Card, Title, Text, Metric, ProgressBar, Badge } from '@tremor/react'
import { RiLineChartLine, RiExchangeDollarLine, RiTimeLine, RiRefreshLine, RiArrowUpSLine, RiArrowDownSLine } from 'react-icons/ri'
import { useMarketData } from '@/hooks/useMarketData'

export function MarketOverviewCard() {
  const marketData = useMarketData() as any // Refresh every minute
  const data = marketData
  const isLoading = marketData.loading || marketData.isLoading
  const error = marketData.error
  const lastUpdated = marketData.lastUpdated
  const refresh = () => {} // useMarketData auto-refreshes
  const [mounted, setMounted] = useState(false)

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

  // Return null during SSR to avoid hydration issues
  if (!mounted) return null;

  return (
    <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3 border border-blue-500/30">
            <RiLineChartLine className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <Title className="text-white text-xl">Market Overview</Title>
            <Text className="text-xs text-gray-400">
              {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}` : 'Loading...'}
            </Text>
          </div>
        </div>
        <button
          onClick={() => refresh()}
          className="p-2 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors border border-blue-500/30"
          disabled={isLoading}
        >
          <RiRefreshLine className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading && !data ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-blue-500/20 rounded w-3/4 mb-2"></div>
          <div className="h-6 bg-blue-500/20 rounded w-1/2 mb-4"></div>
          <div className="h-6 bg-blue-500/20 rounded w-full mb-1"></div>
          <div className="h-6 bg-blue-500/20 rounded w-5/6"></div>
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <Text className="text-rose-400">Error loading market data</Text>
          <button
            onClick={() => refresh()}
            className="mt-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Bitcoin Price */}
          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
            <div className="flex justify-between items-start">
              <div>
                <Text className="text-gray-400">Bitcoin Price</Text>
                <div className="flex items-center">
                  <Metric className="text-white">{formatNumber(data.bitcoin.price, 2)}</Metric>
                  <Badge
                    color={data.bitcoin.price_change_percentage_24h >= 0 ? 'emerald' : 'rose'}
                    className="ml-2"
                  >
                    <div className="flex items-center">
                      {data.bitcoin.price_change_percentage_24h >= 0 ? (
                        <RiArrowUpSLine className="mr-1" />
                      ) : (
                        <RiArrowDownSLine className="mr-1" />
                      )}
                      {data.bitcoin.price_change_percentage_24h.toFixed(2)}%
                    </div>
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <Text className="text-gray-400">24h Range</Text>
                <Text className="text-white">
                  {formatNumber(data.bitcoin.low_24h, 0)} - {formatNumber(data.bitcoin.high_24h, 0)}
                </Text>
              </div>
            </div>
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <Text className="text-gray-400">Market Cap</Text>
              <Metric className="text-white">{formatNumber(data.bitcoin.market_cap)}</Metric>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <Text className="text-gray-400">24h Volume</Text>
              <Metric className="text-white">{formatNumber(data.bitcoin.volume_24h)}</Metric>
            </div>
          </div>

          {/* Global Market */}
          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
            <Text className="text-gray-400 mb-2">Global Market</Text>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text className="text-xs text-gray-400">Total Market Cap</Text>
                <Text className="text-white font-medium">{formatNumber(data.global.total_market_cap)}</Text>
              </div>
              <div>
                <Text className="text-xs text-gray-400">Total Volume</Text>
                <Text className="text-white font-medium">{formatNumber(data.global.total_volume)}</Text>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex justify-between items-center mb-1">
                <Text className="text-xs text-gray-400">BTC Dominance</Text>
                <Text className="text-xs text-white">{data.bitcoin.dominance.toFixed(2)}%</Text>
              </div>
              <ProgressBar value={data.bitcoin.dominance} color="amber" className="mt-1" />
            </div>
          </div>

          {/* ETF Data */}
          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
            <Text className="text-gray-400 mb-2">Bitcoin ETFs</Text>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <Text className="text-xs text-gray-400">Total AUM</Text>
                <Text className="text-white font-medium">{formatNumber(data.etf.total_aum)}</Text>
              </div>
              <div>
                <Text className="text-xs text-gray-400">Daily Inflow</Text>
                <Text className={`font-medium ${data.etf.daily_inflow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {data.etf.daily_inflow >= 0 ? '+' : ''}{formatNumber(data.etf.daily_inflow)}
                </Text>
              </div>
            </div>
            <div className="space-y-2 max-h-[150px] overflow-y-auto">
              {data.etf.products.map((product: any, index: number) => (
                <div key={index} className="flex justify-between items-center text-xs p-2 bg-blue-500/5 rounded">
                  <div>
                    <Text className="text-white font-medium">{product.ticker}</Text>
                    <Text className="text-gray-400">{formatNumber(product.aum)}</Text>
                  </div>
                  <div className="text-right">
                    <Text className="text-white">{formatNumber(product.price, 2)}</Text>
                    <Text className={`${product.daily_inflow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {product.daily_inflow >= 0 ? '+' : ''}{formatNumber(product.daily_inflow)}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
