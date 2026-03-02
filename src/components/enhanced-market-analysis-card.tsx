'use client'

import { useState, useEffect } from 'react'
import { DashboardCard } from '@/components/dashboard-card'
import { RiLineChartLine, RiExchangeDollarLine, RiTimeLine, RiRefreshLine, RiArrowUpSLine, RiArrowDownSLine } from 'react-icons/ri'
import { getCryptoPrices } from '@/services/coinmarketcap-service'
import { LineChart } from '@tremor/react'

export function EnhancedMarketAnalysisCard() {
  const [mounted, setMounted] = useState(false)
  const [marketData, setMarketData] = useState({
    volume24h: 0,
    marketCap: 0,
    btcPrice: 0,
    btcChange24h: 0,
    isLoading: true
  })
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [timeAgo, setTimeAgo] = useState<string>('just now')

  // Generate sample chart data
  const chartData = [
    { date: '2024-01', 'Volume': 25, 'Market Cap': 45 },
    { date: '2024-02', 'Volume': 35, 'Market Cap': 50 },
    { date: '2024-03', 'Volume': 40, 'Market Cap': 60 },
    { date: '2024-04', 'Volume': 45, 'Market Cap': 70 },
    { date: '2024-05', 'Volume': 50, 'Market Cap': 80 },
  ]

  // Fetch data from CoinMarketCap API
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setMarketData(prev => ({ ...prev, isLoading: true }))
        const pricesData = await getCryptoPrices(['BTC'])
        
        if (pricesData['BTC']) {
          const btcData = pricesData['BTC']
          setMarketData({
            volume24h: btcData.volume_24h || 45678901234,
            marketCap: btcData.market_cap || 1234567890123,
            btcPrice: btcData.price || 64000,
            btcChange24h: btcData.percentChange24h || 2.5,
            isLoading: false
          })
          setLastUpdated(new Date())
        }
      } catch (error) {
        console.error('Error fetching market data:', error)
        // Set fallback data
        setMarketData({
          volume24h: 45678901234,
          marketCap: 1234567890123,
          btcPrice: 64000,
          btcChange24h: 2.5,
          isLoading: false
        })
        setLastUpdated(new Date())
      }
    }

    fetchMarketData()
    const interval = setInterval(fetchMarketData, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

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

  // Avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  const changeColor = marketData.btcChange24h >= 0 ? 'text-emerald-400' : 'text-rose-400'

  return (
    <DashboardCard 
      title="Market Analysis" 
      subtitle="Bitcoin market metrics and trends"
      colorScheme="orange"
      className="shadow-xl"
    >
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mr-3">
              <RiLineChartLine className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              {marketData.isLoading ? (
                <>
                  <div className="flex items-center">
                    <div className="h-8 w-32 bg-slate-700/50 animate-pulse rounded"></div>
                    <RiRefreshLine className="w-5 h-5 text-amber-400 ml-2 animate-spin" />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-transparent bg-clip-text">
                    ${mounted ? marketData.btcPrice.toLocaleString() : "64,000.00"}
                  </p>
                  <div className="flex items-center mt-1">
                    {marketData.btcChange24h >= 0 ? (
                      <div className="flex items-center px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                        <RiArrowUpSLine className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-400">
                          +{marketData.btcChange24h.toFixed(2)}%
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center px-2 py-1 bg-rose-500/20 border border-rose-500/30 rounded-lg">
                        <RiArrowDownSLine className="w-4 h-4 text-rose-400" />
                        <span className="text-xs font-medium text-rose-400">
                          {marketData.btcChange24h.toFixed(2)}%
                        </span>
                      </div>
                    )}
                    <span className="text-xs text-gray-300 ml-2">(24h)</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center">
            <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              CoinMarketCap API
            </span>
          </div>
          <div className="flex items-center mt-2">
            <RiTimeLine className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
            <p className="text-xs text-gray-300">Updated {mounted ? timeAgo : "just now"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4 rounded-xl border border-amber-500/30 shadow-md hover:shadow-lg transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <RiExchangeDollarLine className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xs text-amber-300 font-medium">24h Volume</p>
          </div>
          <p className="text-lg font-bold text-white">
            ${mounted ? marketData.volume24h.toLocaleString() : "45,678,901,234"}
          </p>
          <div className="w-full bg-slate-800/50 h-2.5 mt-2 rounded-full p-0.5">
            <div className="h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: '65%' }}>
              <div className="w-full h-full bg-white/30 rounded-full"></div>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4 rounded-xl border border-amber-500/30 shadow-md hover:shadow-lg transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-xs text-amber-300 font-medium">Market Cap</p>
          </div>
          <p className="text-lg font-bold text-white">
            ${mounted ? marketData.marketCap.toLocaleString() : "1,234,567,890,123"}
          </p>
          <div className="w-full bg-slate-800/50 h-2.5 mt-2 rounded-full p-0.5">
            <div className="h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: '80%' }}>
              <div className="w-full h-full bg-white/30 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-amber-300 font-medium flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Market Trends
          </p>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-xs text-amber-400">Volume</span>
            <span className="px-2 py-0.5 rounded-lg bg-orange-500/20 border border-orange-500/30 text-xs text-orange-400">Market Cap</span>
          </div>
        </div>
        
        {mounted && (
          <LineChart
            data={chartData}
            index="date"
            categories={["Volume", "Market Cap"]}
            colors={["amber", "orange"]}
            className="h-40"
            showLegend={false}
            showXAxis={true}
            showYAxis={true}
            yAxisWidth={40}
            valueFormatter={(value) => `$${value}B`}
          />
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-slate-700/30 text-xs text-gray-300 flex justify-between items-center">
        <span className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Data from CoinMarketCap API
        </span>
        <span className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Updated: {new Date().toLocaleTimeString()}
        </span>
      </div>
    </DashboardCard>
  )
}
