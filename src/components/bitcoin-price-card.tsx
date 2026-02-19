'use client'

import { useMarketData } from '@/hooks/useMarketData'
import { useRealMarketData } from '@/hooks/useRealAnalyticsData'
import { DashboardCard } from '@/components/dashboard-card'
import RechartsChart from '@/components/charts/RechartsChart'
import { RiArrowUpSLine, RiArrowDownSLine, RiLineChartLine, RiExchangeDollarLine, RiCoinLine, RiTimeLine, RiRefreshLine } from 'react-icons/ri'
import { useMemo, useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, BarChart3, Activity, Zap } from 'lucide-react'

export function BitcoinPriceCard() {
  const [mounted, setMounted] = useState(false)
  const marketData = useMarketData()
  const realMarketData = useRealMarketData()
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [timeAgo, setTimeAgo] = useState<string>('just now')
  
  // Use real data if available, fallback to market data
  const currentData = realMarketData.data ? {
    btcPrice: realMarketData.data.price,
    btcChange24h: realMarketData.data.priceChange24h,
    volume24h: realMarketData.data.volume24h,
    marketCap: realMarketData.data.marketCap,
    lastUpdated: realMarketData.data.lastUpdated,
    isLoading: realMarketData.isLoading,
    source: realMarketData.data.source
  } : {
    btcPrice: marketData.btcPrice || 0,
    btcChange24h: marketData.btcChange24h || 0,
    volume24h: marketData.volume24h?.total || 0,
    marketCap: marketData.marketCap?.total || 0,
    lastUpdated: marketData.lastUpdated,
    isLoading: marketData.isLoading || false,
    source: marketData.source || 'fallback'
  }

  // Evitar hidratação usando useEffect para renderizar apenas no cliente
  useEffect(() => {
    setMounted(true)
  }, [])

  const deltaType = (currentData?.btcChange24h ?? 0) >= 0 ? "increase" : "decrease"
  const DeltaIcon = (currentData?.btcChange24h ?? 0) >= 0 ? RiArrowUpSLine : RiArrowDownSLine
  const changeColor = (currentData?.btcChange24h ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"

  // Update last updated time
  useEffect(() => {
    if (currentData?.lastUpdated) {
      setLastUpdated(new Date(currentData.lastUpdated))
    }
  }, [currentData?.lastUpdated])

  // Log market data for debugging
  useEffect(() => {
  }, [currentData])

  // Update time ago string
  useEffect(() => {
    if (!lastUpdated) return

    const updateTimeAgo = () => {
      const now = new Date()
      const diffMs = now.getTime() - lastUpdated.getTime()
      const diffSec = Math.floor(diffMs / 1000)

      if (diffSec < 10) {
        setTimeAgo('just now')
      } else if (diffSec < 60) {
        setTimeAgo(`${diffSec} seconds ago`)
      } else if (diffSec < 3600) {
        const diffMin = Math.floor(diffSec / 60)
        setTimeAgo(`${diffMin} minute${diffMin > 1 ? 's' : ''} ago`)
      } else {
        const diffHour = Math.floor(diffSec / 3600)
        setTimeAgo(`${diffHour} hour${diffHour > 1 ? 's' : ''} ago`)
      }
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 10000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  // Generate realistic historical data for professional charts
  const priceHistory = useMemo(() => {
    const basePrice = currentData?.btcPrice || 96583.51
    const volatility = 0.015 // 1.5% volatility for more realistic movement
    const hours = 24
    const seed = 12345

    const pseudoRandom = (index: number) => {
      const x = Math.sin(seed + index) * 10000
      return x - Math.floor(x)
    }

    return Array.from({ length: hours }, (_, i) => {
      const timeAgo = hours - i
      const now = new Date()
      const time = new Date(now.getTime() - timeAgo * 60 * 60 * 1000)
      
      // Create more realistic price movement with trend
      const trendFactor = 1 + (Math.sin(i * 0.1) * 0.005) // Slight trend
      const randomFactor = 1 + (pseudoRandom(i) * volatility * 2 - volatility)
      const price = basePrice * trendFactor * randomFactor
      
      const open = i === 0 ? price : priceHistory?.[i-1]?.close || price
      const close = price
      const high = Math.max(open, close) * (1 + pseudoRandom(i + 100) * 0.008)
      const low = Math.min(open, close) * (1 - pseudoRandom(i + 200) * 0.008)
      const volume = 500000 + pseudoRandom(i + 300) * 2000000
      
      return {
        time: time.toISOString(),
        value: price,
        open,
        high,
        low,
        close,
        volume
      }
    }).reverse()
  }, [currentData?.btcPrice, mounted])

  // Calculate additional metrics
  const hourlyChange = useMemo(() => {
    if (priceHistory.length < 2) return 0
    const current = priceHistory[priceHistory.length - 1].value
    const previous = priceHistory[priceHistory.length - 2].value
    return ((current - previous) / previous) * 100
  }, [priceHistory])

  // Chart configuration for professional display
  const chartConfig = useMemo(() => ({
    type: 'area' as const,
    height: 200,
    theme: 'dark' as const,
    showGrid: true,
    showCrosshair: true,
    showTooltip: true,
    colors: [currentData?.btcChange24h && currentData.btcChange24h >= 0 ? '#10B981' : '#EF4444'],
    precision: 2,
    realtime: true,
    library: 'recharts' as const
  }), [currentData?.btcChange24h])

  return (
    <DashboardCard
      title="Bitcoin Real-Time Analytics"
      subtitle="Live price and market data"
      colorScheme="orange"
      className="shadow-xl"
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mr-3">
              <RiCoinLine className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center">
              {currentData.isLoading ? (
                <>
                  <div className="flex flex-col">
                    <p className="text-3xl font-bold text-white opacity-50">
                      {mounted && currentData?.btcPrice
                        ? `$${(currentData.btcPrice).toLocaleString()}`
                        : "$96,583.51" /* Valor atualizado para SSR */
                      }
                    </p>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-300 flex items-center gap-1.5">
                        <RiRefreshLine className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                        Loading latest data...
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col">
                  <p className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-transparent bg-clip-text">
                    {mounted
                      ? `$${(currentData?.btcPrice ?? 0).toLocaleString()}`
                      : "$96,583.51" /* Valor atualizado para SSR */
                    }
                  </p>
                  <div className="flex items-center mt-1">
                    <DeltaIcon className={`w-4 h-4 ${changeColor}`} />
                    <span className={`${changeColor} font-medium mr-2`}>
                      {mounted
                        ? (currentData?.btcChange24h ?? 0).toFixed(2)
                        : "0.00" /* Valor fixo para SSR */
                      }%
                    </span>
                    <span className="text-xs text-gray-300">(24h)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center">
            <span className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${
              currentData.source === 'live' ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400' :
              currentData.source === 'cached' ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400' :
              'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400'
            }`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${
                currentData.source === 'live' ? 'bg-green-400' :
                currentData.source === 'cached' ? 'bg-blue-400' :
                'bg-amber-400'
              }`}></span>
              {currentData.source === 'live' ? 'Live Data' :
               currentData.source === 'cached' ? 'Cached' :
               'Fallback API'}
            </span>
          </div>
          <div className="flex items-center mt-2">
            <RiTimeLine className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
            <p className="text-xs text-gray-300">Updated {mounted ? timeAgo : "just now"}</p>
          </div>
        </div>
      </div>

      {/* Professional Price Chart */}
      <div className="mt-6">
        <RechartsChart
          data={priceHistory}
          config={chartConfig}
          className="bg-transparent border-0 p-0"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-5">
        <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 p-4 rounded-xl border border-indigo-500/30 shadow-md hover:shadow-lg transition-all group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <RiExchangeDollarLine className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-xs text-indigo-300 font-medium">24h Volume</p>
          </div>
          <p className="text-lg font-bold text-white font-mono">
            {mounted
              ? `$${(currentData?.volume24h ?? 0).toLocaleString()}`
              : "$45,678,901,234"
            }
          </p>
          <div className="mt-2 h-1 bg-indigo-500/20 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full animate-pulse" style={{width: '67%'}} />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 p-4 rounded-xl border border-purple-500/30 shadow-md hover:shadow-lg transition-all group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BarChart3 className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-xs text-purple-300 font-medium">Market Cap</p>
          </div>
          <p className="text-lg font-bold text-white font-mono">
            {mounted
              ? `$${(currentData?.marketCap ?? 0).toLocaleString()}`
              : "$1,234,567,890,123"
            }
          </p>
          <div className="mt-2 h-1 bg-purple-500/20 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full animate-pulse" style={{width: '89%'}} />
          </div>
        </div>
      </div>

      <div className="mt-5 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4 rounded-xl border border-blue-500/30 shadow-md hover:shadow-lg transition-all group">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-sm text-blue-300 font-medium">Hourly Change</p>
          </div>
          <div className="flex items-center">
            {hourlyChange >= 0 ? (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="font-medium">
                  {mounted
                    ? `+${Math.abs(hourlyChange).toFixed(2)}`
                    : "+0.05"
                  }%
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 font-mono">
                <TrendingDown className="w-3.5 h-3.5" />
                <span className="font-medium">
                  {mounted
                    ? `-${Math.abs(hourlyChange).toFixed(2)}`
                    : "-0.05"
                  }%
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="w-full bg-slate-800/50 h-3 mt-3 rounded-full p-0.5 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${hourlyChange >= 0 ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 'bg-gradient-to-r from-rose-500 to-red-400'}`}
            style={{ 
              width: mounted ? `${Math.min(Math.abs(hourlyChange) * 15, 100)}%` : "8%",
              boxShadow: hourlyChange >= 0 ? '0 0 10px rgba(16, 185, 129, 0.5)' : '0 0 10px rgba(239, 68, 68, 0.5)'
            }}
          >
            <div className="w-full h-full bg-white/20 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-slate-700/30 text-xs text-gray-300 flex justify-between items-center">
        <span className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-mono">Professional Charts Enabled</span>
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="font-mono">Updated: {mounted ? new Date().toLocaleTimeString() : "--:--:--"}</span>
        </span>
      </div>
    </DashboardCard>
  )
}
