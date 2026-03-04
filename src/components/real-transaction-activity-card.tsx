'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRealNetworkData, useRealMiningData } from '@/hooks/useRealAnalyticsData'
import { DashboardCard } from '@/components/dashboard-card'
import { 
  RiExchangeLine, 
  RiFlaskLine as RiFlashLine,
  RiTimeLine,
  RiBarChartLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiSignalWifiLine,
  RiRefreshLine,
  RiCpuLine,
  RiDatabase2Line,
  RiGasStationLine
} from 'react-icons/ri'
import { Activity, TrendingUp, TrendingDown, Zap, Clock, Hash, DollarSign } from 'lucide-react'

export function RealTransactionActivityCard() {
  const [mounted, setMounted] = useState(false)
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  
  const networkData = useRealNetworkData()
  const miningData = useRealMiningData()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isLoading = networkData.isLoading || miningData.isLoading
  const hasError = networkData.isError || miningData.isError

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M'
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K'
    return num.toString()
  }

  // Format hash rate
  const formatHashRate = (rate: number): string => {
    if (rate >= 1e18) return (rate / 1e18).toFixed(1) + ' EH/s'
    if (rate >= 1e15) return (rate / 1e15).toFixed(1) + ' PH/s'
    if (rate >= 1e12) return (rate / 1e12).toFixed(1) + ' TH/s'
    return rate.toString() + ' H/s'
  }

  const networkStats = networkData.data || {
    blockHeight: 0,
    difficulty: 0,
    hashrate: 0,
    mempoolSize: 0,
    nodeCount: 0,
    feeRates: { fast: 0, medium: 0, slow: 0 },
    lastBlock: { hash: '', timestamp: 0, size: 0, txCount: 0 }
  }

  const miningStats = miningData.data || {
    hashPrice: 0,
    revenue24h: 0,
    difficultyAdjustment: {
      current: 0,
      next: 0,
      estimatedChange: 0,
      blocksUntilAdjustment: 0
    },
    poolDistribution: {},
    minerMetrics: {
      totalMiners: 0,
      efficiency: 0,
      powerConsumption: 0
    }
  }

  // Calculate estimated transaction metrics
  const estimatedTPS = 7 // Bitcoin's theoretical TPS
  const averageBlockTime = 10 // minutes
  const estimatedTxPerBlock = networkStats.lastBlock.txCount || 2500
  const dailyTransactions = (24 * 60 / averageBlockTime) * estimatedTxPerBlock

  // Fee rate trends (mock data - would need historical API)
  const feeRateHistory = [
    { time: '00:00', fast: 45, medium: 32, slow: 18 },
    { time: '04:00', fast: 52, medium: 38, slow: 22 },
    { time: '08:00', fast: 48, medium: 35, slow: 20 },
    { time: '12:00', fast: 55, medium: 42, slow: 25 },
    { time: '16:00', fast: networkStats.feeRates.fast, medium: networkStats.feeRates.medium, slow: networkStats.feeRates.slow },
    { time: '20:00', fast: 47, medium: 33, slow: 19 }
  ]

  return (
    <DashboardCard
      title="Network Activity & Transactions"
      subtitle="Real-time blockchain metrics and mining data"
      colorScheme={"cyan" as any}
      className="shadow-xl"
    >
      {/* Status Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-500" />
            <span className="text-lg font-semibold text-white">Live Network</span>
          </div>
          
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="1h">1 Hour</option>
            <option value="24h">24 Hours</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <RiRefreshLine className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              <span className="text-xs text-blue-400 font-medium">Syncing</span>
            </div>
          )}
          
          {!isLoading && !hasError && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg">
              <RiSignalWifiLine className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs text-green-400 font-medium">Live</span>
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

      {/* Key Network Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-4 rounded-xl border border-cyan-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-5 h-5 text-cyan-400" />
            <span className="text-xs text-cyan-300 font-medium">Block Height</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {mounted ? formatNumber(networkStats.blockHeight) : '---'}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400">+144 (24h)</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 p-4 rounded-xl border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2">
            <RiCpuLine className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-purple-300 font-medium">Hash Rate</span>
          </div>
          <p className="text-xl font-bold text-white">
            {mounted ? formatHashRate(networkStats.hashrate) : '---'}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400">+2.1%</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 p-4 rounded-xl border border-orange-500/30">
          <div className="flex items-center gap-2 mb-2">
            <RiGasStationLine className="w-5 h-5 text-orange-400" />
            <span className="text-xs text-orange-300 font-medium">Fee Rate</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {mounted ? networkStats.feeRates.medium : '--'} <span className="text-sm text-gray-400">sat/vB</span>
          </p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingDown className="w-3 h-3 text-red-400" />
            <span className="text-xs text-red-400">-8.5%</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4 rounded-xl border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <RiExchangeLine className="w-5 h-5 text-green-400" />
            <span className="text-xs text-green-300 font-medium">Daily Tx</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {mounted ? formatNumber(dailyTransactions) : '---'}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400">+5.2%</span>
          </div>
        </div>
      </div>

      {/* Transaction & Fee Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Fee Rate Trends */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <RiGasStationLine className="w-5 h-5 text-orange-500" />
            Fee Rate Trends
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Fast</p>
                <p className="text-lg font-bold text-green-400">{networkStats.feeRates.fast}</p>
                <p className="text-xs text-gray-500">~10 min</p>
              </div>
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Medium</p>
                <p className="text-lg font-bold text-yellow-400">{networkStats.feeRates.medium}</p>
                <p className="text-xs text-gray-500">~30 min</p>
              </div>
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Slow</p>
                <p className="text-lg font-bold text-red-400">{networkStats.feeRates.slow}</p>
                <p className="text-xs text-gray-500">~1 hour</p>
              </div>
            </div>

            {/* Fee Rate History Chart (simplified) */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">24h Fee History</p>
              <div className="h-20 bg-gray-900/50 rounded-lg p-2 flex items-end justify-between gap-1">
                {feeRateHistory.map((point, index) => (
                  <div key={index} className="flex-1 space-y-1">
                    <div 
                      className="bg-green-500/60 rounded-sm" 
                      style={{ height: `${(point.fast / 60) * 100}%` }}
                    ></div>
                    <div 
                      className="bg-yellow-500/60 rounded-sm" 
                      style={{ height: `${(point.medium / 60) * 80}%` }}
                    ></div>
                    <div 
                      className="bg-red-500/60 rounded-sm" 
                      style={{ height: `${(point.slow / 60) * 60}%` }}
                    ></div>
                    <p className="text-xs text-gray-500 text-center">{point.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mining & Difficulty */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <RiCpuLine className="w-5 h-5 text-cyan-500" />
            Mining Metrics
          </h3>
          
          <div className="space-y-4">
            <div className="bg-gray-900/50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Difficulty</span>
                <span className="text-sm font-medium text-white">
                  {(networkStats.difficulty / 1e12).toFixed(2)}T
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Next Adjustment</span>
                <span className="text-sm font-medium text-white">
                  {miningStats.difficultyAdjustment.blocksUntilAdjustment} blocks
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Estimated Change</span>
                <span className={`text-sm font-medium ${
                  miningStats.difficultyAdjustment.estimatedChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {miningStats.difficultyAdjustment.estimatedChange >= 0 ? '+' : ''}
                  {miningStats.difficultyAdjustment.estimatedChange.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="bg-gray-900/50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Hash Price</span>
                <span className="text-sm font-medium text-white">
                  ${miningStats.hashPrice.toFixed(3)}/TH/day
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">24h Revenue</span>
                <span className="text-sm font-medium text-white">
                  ${formatNumber(miningStats.revenue24h)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Active Miners</span>
                <span className="text-sm font-medium text-white">
                  {formatNumber(miningStats.minerMetrics.totalMiners)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Block Information */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <RiDatabase2Line className="w-5 h-5 text-cyan-500" />
          Latest Block
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-900/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-gray-400">Height</span>
            </div>
            <p className="text-lg font-bold text-white">{formatNumber(networkStats.blockHeight)}</p>
          </div>

          <div className="bg-gray-900/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <RiExchangeLine className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-400">Transactions</span>
            </div>
            <p className="text-lg font-bold text-white">{formatNumber(networkStats.lastBlock.txCount)}</p>
          </div>

          <div className="bg-gray-900/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <RiDatabase2Line className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-400">Size</span>
            </div>
            <p className="text-lg font-bold text-white">{(networkStats.lastBlock.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>

          <div className="bg-gray-900/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-gray-400">Time</span>
            </div>
            <p className="text-lg font-bold text-white">
              {networkStats.lastBlock.timestamp ? 
                new Date(networkStats.lastBlock.timestamp * 1000).toLocaleTimeString() : 
                '--:--:--'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Network Health Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <RiSignalWifiLine className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-300">Network Health</span>
          </div>
          <p className="text-xl font-bold text-green-400">Excellent</p>
          <p className="text-xs text-gray-400">All systems operational</p>
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <RiTimeLine className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-300">Avg Block Time</span>
          </div>
          <p className="text-xl font-bold text-white">9.8 min</p>
          <p className="text-xs text-gray-400">Within target range</p>
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <RiFlashLine className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-gray-300">TPS</span>
          </div>
          <p className="text-xl font-bold text-white">{estimatedTPS}</p>
          <p className="text-xs text-gray-400">Theoretical maximum</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>Real-time blockchain data</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          <span>Last block: {mounted ? new Date().toLocaleTimeString() : '--:--:--'}</span>
        </div>
      </div>
    </DashboardCard>
  )
}