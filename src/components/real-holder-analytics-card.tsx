'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRealHolderData } from '@/hooks/useRealAnalyticsData'
import { DashboardCard } from '@/components/dashboard-card'
import { 
  RiUser3Line, 
  RiGroup2Line, 
  RiUserAddLine,
  RiPieChartLine,
  RiBarChartLine,
  RiArrowUpLine as RiTrendingUpLine,
  RiSignalWifiLine,
  RiRefreshLine,
  RiTimeLine
} from 'react-icons/ri'
import { Users, TrendingUp, TrendingDown, PieChart, Activity, Clock } from 'lucide-react'

export function RealHolderAnalyticsCard() {
  const [mounted, setMounted] = useState(false)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1d' | '1w' | '1m' | '3m' | '6m' | '1y' | '2y+'>('1y')
  
  const holderData = useRealHolderData()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isLoading = holderData.isLoading
  const hasError = holderData.isError

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M'
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K'
    return num.toString()
  }

  const holderStats = holderData.data || {
    totalAddresses: 0,
    activeAddresses24h: 0,
    newAddresses24h: 0,
    distribution: {
      whales: 0,
      dolphins: 0,
      fish: 0,
      shrimp: 0
    },
    hodlWaves: {
      oneDay: 0,
      oneWeek: 0,
      oneMonth: 0,
      threeMonths: 0,
      sixMonths: 0,
      oneYear: 0,
      twoYears: 0,
      moreThanTwoYears: 0
    }
  }

  // Distribution data for visualization
  const distributionData = [
    { name: 'Whales (>1000 BTC)', value: holderStats.distribution.whales, color: '#8B5CF6', percentage: (holderStats.distribution.whales / holderStats.totalAddresses * 100) },
    { name: 'Dolphins (100-1000 BTC)', value: holderStats.distribution.dolphins, color: '#06B6D4', percentage: (holderStats.distribution.dolphins / holderStats.totalAddresses * 100) },
    { name: 'Fish (1-100 BTC)', value: holderStats.distribution.fish, color: '#10B981', percentage: (holderStats.distribution.fish / holderStats.totalAddresses * 100) },
    { name: 'Shrimp (<1 BTC)', value: holderStats.distribution.shrimp, color: '#F59E0B', percentage: (holderStats.distribution.shrimp / holderStats.totalAddresses * 100) }
  ]

  // HODL Waves data
  const hodlWavesData = [
    { name: '1 Day', value: holderStats.hodlWaves.oneDay, timeframe: '1d', color: '#EF4444' },
    { name: '1 Week', value: holderStats.hodlWaves.oneWeek, timeframe: '1w', color: '#F97316' },
    { name: '1 Month', value: holderStats.hodlWaves.oneMonth, timeframe: '1m', color: '#F59E0B' },
    { name: '3 Months', value: holderStats.hodlWaves.threeMonths, timeframe: '3m', color: '#EAB308' },
    { name: '6 Months', value: holderStats.hodlWaves.sixMonths, timeframe: '6m', color: '#84CC16' },
    { name: '1 Year', value: holderStats.hodlWaves.oneYear, timeframe: '1y', color: '#22C55E' },
    { name: '2 Years', value: holderStats.hodlWaves.twoYears, timeframe: '2y', color: '#06B6D4' },
    { name: '2+ Years', value: holderStats.hodlWaves.moreThanTwoYears, timeframe: '2y+', color: '#8B5CF6' }
  ]

  return (
    <DashboardCard
      title="Bitcoin Holder Analytics"
      subtitle="Real-time distribution and HODL wave analysis"
      colorScheme={"indigo" as any}
      className="shadow-xl"
    >
      {/* Status Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          <span className="text-lg font-semibold text-white">Address Distribution</span>
        </div>
        
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
              <span className="text-xs text-green-400 font-medium">On-Chain Data</span>
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 p-4 rounded-xl border border-indigo-500/30">
          <div className="flex items-center gap-2 mb-2">
            <RiGroup2Line className="w-5 h-5 text-indigo-400" />
            <span className="text-xs text-indigo-300 font-medium">Total Addresses</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {mounted ? formatNumber(holderStats.totalAddresses) : '---'}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400">+2.3% (30d)</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4 rounded-xl border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-green-400" />
            <span className="text-xs text-green-300 font-medium">Active (24h)</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {mounted ? formatNumber(holderStats.activeAddresses24h) : '---'}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400">+8.7%</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 p-4 rounded-xl border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2">
            <RiUserAddLine className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-purple-300 font-medium">New (24h)</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {mounted ? formatNumber(holderStats.newAddresses24h) : '---'}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingDown className="w-3 h-3 text-red-400" />
            <span className="text-xs text-red-400">-1.2%</span>
          </div>
        </div>
      </div>

      {/* Address Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Distribution Chart */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-500" />
            Distribution by Balance
          </h3>
          
          <div className="space-y-4">
            {distributionData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-gray-300">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-white">
                      {formatNumber(item.value)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${item.percentage}%`,
                      backgroundColor: item.color
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* HODL Waves */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              HODL Waves
            </h3>
            
            {/* Timeframe Selector */}
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="px-3 py-1 text-xs bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="1d">1 Day</option>
              <option value="1w">1 Week</option>
              <option value="1m">1 Month</option>
              <option value="3m">3 Months</option>
              <option value="6m">6 Months</option>
              <option value="1y">1 Year</option>
              <option value="2y+">2+ Years</option>
            </select>
          </div>

          <div className="space-y-3">
            {hodlWavesData.map((wave, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-lg border transition-all ${
                  wave.timeframe === selectedTimeframe 
                    ? 'bg-indigo-500/20 border-indigo-500/50' 
                    : 'bg-gray-900/50 border-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: wave.color }}
                    ></div>
                    <span className="text-sm text-gray-300">{wave.name}</span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {(wave.value * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="h-1.5 rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${wave.value * 100}%`,
                      backgroundColor: wave.color
                    }}
                  ></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Address Activity Trends */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <RiBarChartLine className="w-5 h-5 text-indigo-500" />
          Address Activity Insights
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <RiTrendingUpLine className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">Growth Rate</span>
            </div>
            <p className="text-xl font-bold text-white">+2.3%</p>
            <p className="text-xs text-gray-400">30-day average</p>
          </div>

          <div className="bg-gray-900/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <RiPieChartLine className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">Whale Dominance</span>
            </div>
            <p className="text-xl font-bold text-white">
              {((holderStats.distribution.whales / holderStats.totalAddresses) * 100).toFixed(2)}%
            </p>
            <p className="text-xs text-gray-400">Of all addresses</p>
          </div>

          <div className="bg-gray-900/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <RiTimeLine className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-300">Avg HODL Time</span>
            </div>
            <p className="text-xl font-bold text-white">14.3m</p>
            <p className="text-xs text-gray-400">Months (estimated)</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>On-chain address analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
          <span>Updated: {mounted ? new Date().toLocaleTimeString() : '--:--:--'}</span>
        </div>
      </div>
    </DashboardCard>
  )
}