'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRealOrdinalsData, useRealRunesData } from '@/hooks/useRealAnalyticsData'
import { DashboardCard } from '@/components/dashboard-card'
import {
  RiImageLine,
  RiCoinLine,
  RiBarChartBoxLine,
  RiRefreshLine,
  RiSignalWifiLine,
  RiDatabase2Line
} from 'react-icons/ri'
import { TrendingUp, TrendingDown, Users, Zap, Activity, BarChart3 } from 'lucide-react'

export function OrdinalsRunesRealMarketCard() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'ordinals' | 'runes'>('ordinals')
  
  const ordinalsData = useRealOrdinalsData()
  const runesData = useRealRunesData()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isLoading = ordinalsData.isLoading || runesData.isLoading
  const hasError = ordinalsData.isError || runesData.isError

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K'
    return num.toString()
  }

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const ordinalsMetrics = ordinalsData.data || {
    totalInscriptions: 0,
    inscriptionsToday: 0,
    volume24h: 0,
    marketCap: 0,
    averagePrice: 0,
    topCollections: []
  }

  const runesMetrics = runesData.data || {
    totalRunes: 0,
    newRunesToday: 0,
    volume24h: 0,
    marketCap: 0,
    holders: 0,
    topRunes: []
  }

  return (
    <DashboardCard
      title="Bitcoin Ecosystem Analytics"
      subtitle="Real-time Ordinals & Runes market data"
      colorScheme="purple"
      className="shadow-xl"
    >
      {/* Tab Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex bg-gray-800/50 rounded-xl p-1 border border-gray-700">
          <button
            onClick={() => setActiveTab('ordinals')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'ordinals'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <RiImageLine className="w-4 h-4" />
              Ordinals
            </div>
          </button>
          <button
            onClick={() => setActiveTab('runes')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'runes'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <RiCoinLine className="w-4 h-4" />
              Runes
            </div>
          </button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <RiRefreshLine className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              <span className="text-xs text-blue-400 font-medium">Loading</span>
            </div>
          )}
          
          {!isLoading && !hasError && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg">
              <RiSignalWifiLine className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs text-green-400 font-medium">Live Data</span>
            </div>
          )}

          {hasError && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg">
              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
              <span className="text-xs text-red-400 font-medium">Error</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {activeTab === 'ordinals' ? (
          // Ordinals Content
          <div className="space-y-6">
            {/* Main Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 p-4 rounded-xl border border-purple-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <RiDatabase2Line className="w-5 h-5 text-purple-400" />
                  <span className="text-xs text-purple-300 font-medium">Total Inscriptions</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {mounted ? formatNumber(ordinalsMetrics.totalInscriptions) : '---'}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-400">
                    +{ordinalsMetrics.inscriptionsToday} today
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4 rounded-xl border border-blue-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <span className="text-xs text-blue-300 font-medium">24h Volume</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {mounted ? formatCurrency(ordinalsMetrics.volume24h) : '$---'}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-400">24h</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4 rounded-xl border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-green-400" />
                  <span className="text-xs text-green-300 font-medium">Market Cap</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {mounted ? formatCurrency(ordinalsMetrics.marketCap) : '$---'}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-400">Total</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 p-4 rounded-xl border border-orange-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-orange-400" />
                  <span className="text-xs text-orange-300 font-medium">Avg Price</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {mounted ? formatCurrency(ordinalsMetrics.averagePrice) : '$---'}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-400">Average</span>
                </div>
              </div>
            </div>

            {/* Top Collections */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <RiBarChartBoxLine className="w-5 h-5 text-purple-500" />
                Top Collections
              </h3>
              <div className="space-y-3">
                {ordinalsMetrics.topCollections.length > 0 ? (
                  ordinalsMetrics.topCollections.slice(0, 5).map((collection, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-white">{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{collection.name}</p>
                          <p className="text-xs text-gray-400">{collection.owners} owners</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">{collection.floorPrice.toFixed(4)} BTC</p>
                        <p className="text-xs text-gray-400">{formatCurrency(collection.volume24h)} 24h</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <RiImageLine className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Loading collections data...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Runes Content
          <div className="space-y-6">
            {/* Main Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 p-4 rounded-xl border border-purple-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <RiCoinLine className="w-5 h-5 text-purple-400" />
                  <span className="text-xs text-purple-300 font-medium">Total Runes</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {mounted ? formatNumber(runesMetrics.totalRunes) : '---'}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-400">
                    +{runesMetrics.newRunesToday} today
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4 rounded-xl border border-blue-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <span className="text-xs text-blue-300 font-medium">24h Volume</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {mounted ? formatCurrency(runesMetrics.volume24h) : '$---'}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-400">24h</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4 rounded-xl border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-green-400" />
                  <span className="text-xs text-green-300 font-medium">Market Cap</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {mounted ? formatCurrency(runesMetrics.marketCap) : '$---'}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-400">Total</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 p-4 rounded-xl border border-orange-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-orange-400" />
                  <span className="text-xs text-orange-300 font-medium">Total Holders</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {mounted ? formatNumber(runesMetrics.holders) : '---'}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-400">Total</span>
                </div>
              </div>
            </div>

            {/* Top Runes */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <RiBarChartBoxLine className="w-5 h-5 text-purple-500" />
                Top Runes
              </h3>
              <div className="space-y-3">
                {runesMetrics.topRunes.length > 0 ? (
                  runesMetrics.topRunes.slice(0, 5).map((rune, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-white">{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{rune.name}</p>
                          <p className="text-xs text-gray-400">{rune.symbol} • {formatNumber(rune.holders)} holders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">{formatCurrency(rune.price)}</p>
                        <div className="flex items-center gap-1">
                          {rune.change24h >= 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-400" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-400" />
                          )}
                          <span className={`text-xs ${rune.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {rune.change24h >= 0 ? '+' : ''}{rune.change24h.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <RiCoinLine className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Loading runes data...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-purple-400" />
          <span>Powered by Hiro API</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
          <span>Updated: {mounted ? new Date().toLocaleTimeString() : '--:--:--'}</span>
        </div>
      </div>
    </DashboardCard>
  )
}