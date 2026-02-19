'use client'

import { useState, useEffect } from 'react'
import { RiCoinLine, RiExchangeDollarLine, RiLineChartLine, RiArrowUpSLine, RiArrowDownSLine } from 'react-icons/ri'
import { useOrdinalsMarket } from '@/hooks/useOrdinalsMarket'
import { Activity, BarChart3 } from 'lucide-react'

function formatNumber(num: number, decimals = 0): string {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
  return `$${num.toFixed(decimals)}`
}

function formatBTC(sats: number): string {
  return (sats / 1e8).toFixed(8)
}

function formatCount(num: number): string {
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
  return num.toLocaleString()
}

export function OrdinalsMarketCard() {
  const { data: ordinalsMarket, isLoading: isLoadingMarket } = useOrdinalsMarket()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isLoading = isLoadingMarket || !mounted

  const trend = ordinalsMarket?.trend || '--'
  const trendIsPositive = typeof trend === 'string' && trend.startsWith('+')
  const TrendIcon = trendIsPositive ? RiArrowUpSLine : RiArrowDownSLine
  const trendColor = trendIsPositive ? 'text-emerald-400' : 'text-red-400'

  const signalStyles = ordinalsMarket?.neuralSignal === 'Long'
    ? { bg: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-500/20', icon: 'text-emerald-400', text: 'text-emerald-400' }
    : ordinalsMarket?.neuralSignal === 'Short'
      ? { bg: 'from-red-500/10 to-red-600/5', border: 'border-red-500/20', icon: 'text-red-400', text: 'text-red-400' }
      : { bg: 'from-yellow-500/10 to-yellow-600/5', border: 'border-yellow-500/20', icon: 'text-yellow-400', text: 'text-yellow-400' }

  const confidenceBadge = ordinalsMarket?.confidence === 'High'
    ? 'bg-emerald-500/20 text-emerald-300'
    : ordinalsMarket?.confidence === 'Medium'
      ? 'bg-yellow-500/20 text-yellow-300'
      : 'bg-red-500/20 text-red-300'

  const topCollection = ordinalsMarket?.topCollections?.[0]

  const insightsText = ordinalsMarket
    ? `Ordinals market ${trendIsPositive ? 'shows positive momentum' : 'is experiencing a pullback'} with ${trend} movement.${
        topCollection ? ` Top collection ${topCollection.name} leads with ${topCollection.sales.toLocaleString()} sales in 24h.` : ''
      } Market cap at ${formatNumber(ordinalsMarket.marketCap)} with 24h volume of ${formatNumber(ordinalsMarket.volume)}.${
        ordinalsMarket.holders ? ` ${formatCount(ordinalsMarket.holders)} unique holders tracked.` : ''
      }`
    : 'Loading market insights...'

  return (
    <div className="bg-gradient-to-br from-[#1A2A3A] to-[#2A3A4A] border border-cyan-500/20 rounded-lg overflow-hidden shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-white font-medium">Ordinals Market</h3>
        </div>
        <div className="px-2 py-1 rounded-lg bg-cyan-500/20 text-xs font-bold text-cyan-300 flex items-center">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse mr-1"></span>
          Real-time Data
        </div>
      </div>

      <div className="p-4">
        {/* Market Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg p-3 border border-cyan-500/20">
            <p className="text-xs text-cyan-300 mb-1">Market Cap</p>
            {isLoading ? (
              <div className="h-6 bg-slate-700/50 animate-pulse rounded"></div>
            ) : (
              <p className="text-lg font-bold text-white">{ordinalsMarket?.marketCap ? formatNumber(ordinalsMarket.marketCap) : '--'}</p>
            )}
            <div className="flex items-center mt-1">
              <TrendIcon className={`w-3 h-3 ${trendColor}`} />
              <span className={`text-xs ${trendColor}`}>{trend} (24h)</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg p-3 border border-cyan-500/20">
            <p className="text-xs text-cyan-300 mb-1">24h Volume</p>
            {isLoading ? (
              <div className="h-6 bg-slate-700/50 animate-pulse rounded"></div>
            ) : (
              <p className="text-lg font-bold text-white">{ordinalsMarket?.volume ? formatNumber(ordinalsMarket.volume) : '--'}</p>
            )}
            <div className="flex items-center mt-1">
              <TrendIcon className={`w-3 h-3 ${trendColor}`} />
              <span className={`text-xs ${trendColor}`}>{trend} (24h)</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg p-3 border border-cyan-500/20">
            <p className="text-xs text-cyan-300 mb-1">Collections</p>
            {isLoading ? (
              <div className="h-6 bg-slate-700/50 animate-pulse rounded"></div>
            ) : (
              <p className="text-lg font-bold text-white">{ordinalsMarket?.topCollections?.length || '--'}</p>
            )}
            <div className="flex items-center mt-1">
              <Activity className={`w-3 h-3 text-cyan-300`} />
              <span className={`text-xs text-cyan-300 ml-0.5`}>Tracked</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg p-3 border border-cyan-500/20">
            <p className="text-xs text-cyan-300 mb-1">Holders</p>
            {isLoading ? (
              <div className="h-6 bg-slate-700/50 animate-pulse rounded"></div>
            ) : (
              <p className="text-lg font-bold text-white">{ordinalsMarket?.holders ? formatCount(ordinalsMarket.holders) : '--'}</p>
            )}
            <div className="flex items-center mt-1">
              <TrendIcon className={`w-3 h-3 ${trendColor}`} />
              <span className={`text-xs ${trendColor}`}>{trend} (24h)</span>
            </div>
          </div>
        </div>

        {/* Top Collections */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-white flex items-center">
              <RiCoinLine className="w-4 h-4 text-cyan-400 mr-2" />
              Top Collections
            </h3>
            <span className="text-xs text-cyan-300">Floor (BTC)</span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-700/50 animate-pulse rounded"></div>
              ))}
            </div>
          ) : ordinalsMarket?.topCollections && ordinalsMarket.topCollections.length > 0 ? (
            <div className="space-y-2">
              {ordinalsMarket.topCollections.map((collection, index) => (
                <div key={collection.name} className="flex justify-between items-center p-2 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center mr-2">
                      <span className="text-xs font-bold text-white">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-white">{collection.name}</p>
                      <p className="text-xs text-cyan-300">{collection.sales.toLocaleString()} sales (24h)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">{collection.floor.toFixed(8)}</p>
                    <p className="text-xs text-cyan-300">Vol: {collection.volume.toFixed(4)} BTC</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-cyan-300/60 text-sm">No collection data available</div>
          )}
        </div>

        {/* Chart Placeholder */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-white flex items-center">
              <Activity className="w-4 h-4 text-cyan-400 mr-2" />
              Market Cap Trend (24h)
            </h3>
          </div>
          <div className="h-32 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/10">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 text-cyan-400/40 mx-auto mb-1" />
              <span className="text-xs text-cyan-300/50">Historical data not available</span>
            </div>
          </div>
        </div>

        {/* Market Insights */}
        <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-900/30 to-blue-900/20 border border-cyan-500/20 mb-4">
          <div className="flex items-center mb-2">
            <RiExchangeDollarLine className="w-4 h-4 text-cyan-400 mr-2" />
            <h3 className="text-sm font-medium text-white">Market Insights</h3>
          </div>
          <p className="text-sm text-cyan-200">
            {isLoading ? (
              <div className="h-16 bg-slate-700/50 animate-pulse rounded"></div>
            ) : (
              <>{insightsText}</>
            )}
          </p>
        </div>

        {/* Neural Signal */}
        <div className={`bg-gradient-to-br ${signalStyles.bg} border ${signalStyles.border} p-3 rounded-lg`}>
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center">
              <RiLineChartLine className={`w-4 h-4 ${signalStyles.icon} mr-2`} />
              <h3 className="text-sm font-medium text-white">Neural Signal</h3>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${confidenceBadge}`}>
              {ordinalsMarket?.confidence ? `${ordinalsMarket.confidence} Confidence` : '--'}
            </span>
          </div>
          <div className="flex items-center">
            <span className={`text-lg font-bold ${signalStyles.text}`}>
              {ordinalsMarket?.neuralSignal || '--'}
            </span>
            <span className="mx-2 text-white/50">&bull;</span>
            <span className="text-sm text-white/80">{ordinalsMarket?.rationale || 'Awaiting neural engine analysis...'}</span>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-400 flex justify-between items-center">
          <span>Data from multiple sources</span>
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  )
}
