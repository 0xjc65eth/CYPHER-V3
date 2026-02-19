'use client'

import { useState, useEffect } from 'react'
import { Card, Title, Text } from '@tremor/react'
import { RiStockLine, RiTimeLine, RiLineChartLine, RiArrowUpSLine, RiArrowDownSLine, RiScales3Line } from 'react-icons/ri'
import { useTradingData } from '@/hooks/useTradingData'
import { SmcTradeSetup } from '@/services/trading-data-service'

export function SmcTradeSetupsCard() {
  const { data, isLoading, error, lastUpdated } = useTradingData(30000) // Refresh every 30 seconds
  const [mounted, setMounted] = useState(false)

  // Avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Show loading state
  if (isLoading && !data) {
    return (
      <Card className="bg-gradient-to-br from-[#1A2A3A] to-[#2A3A4A] border-none shadow-xl p-6">
        <Title className="text-white text-xl mb-2">SMC Trade Setups</Title>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card className="bg-gradient-to-br from-[#1A2A3A] to-[#2A3A4A] border-none shadow-xl p-6">
        <Title className="text-white text-xl mb-2">SMC Trade Setups</Title>
        <Text className="text-rose-400">Error loading SMC trade setups</Text>
      </Card>
    )
  }

  // Get SMC trade setups from data
  const smcTradeSetups = data?.smcTradeSetups || []

  // Sort by confidence (highest first)
  const sortedSetups = [...smcTradeSetups].sort((a, b) => b.confidence - a.confidence)

  // Get top 4 setups
  const topSetups = sortedSetups.slice(0, 4)

  // Usar uma data fixa para evitar problemas de hidratação
  const formattedDate = mounted
    ? `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
    : "2025-05-03 14:30:00"

  return (
    <Card className="bg-gradient-to-br from-[#1A2A3A] to-[#2A3A4A] border-none shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center mr-3 border border-cyan-500/30">
            <RiStockLine className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <Title className="text-white text-xl">Bitcoin SMC Trade Setups</Title>
            <Text className="text-xs text-gray-400">
              {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}` : 'Real-time data'}
            </Text>
          </div>
        </div>
        <span className="px-2 py-1 rounded bg-cyan-500/20 text-xs font-bold text-cyan-300 border border-cyan-500/30">
          Smart Money Concept
        </span>
      </div>

      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <Text className="text-sm text-white">
          <span className="font-bold">How it works:</span> These setups use Smart Money Concept (SMC) to identify high-probability
          trading opportunities based on institutional order flow. Each setup includes 4 take profit levels and a stop loss.
        </Text>
        <Text className="text-xs text-gray-400 mt-1">
          Analysis date: {formattedDate} • Data sources: CoinMarketCap API
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {topSetups.map((setup) => (
          <div
            key={setup.id}
            className={`bg-gradient-to-br ${
              setup.direction === 'Long' ? 'from-emerald-900/20 to-emerald-800/10 border-emerald-700/30' :
              'from-rose-900/20 to-rose-800/10 border-rose-700/30'
            } rounded-lg p-4 border transition-all duration-300 hover:shadow-lg`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <Text className="font-bold text-white">{setup.asset} ({setup.timeframe})</Text>
                <div className="flex items-center text-xs mt-1">
                  <span className={`${setup.direction === 'Long' ? 'text-emerald-400' : 'text-rose-400'} font-bold`}>
                    {setup.direction}
                  </span>
                  <span className="mx-1 text-gray-400">•</span>
                  <span className="text-gray-400">{setup.setup}</span>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full ${
                setup.status === 'Pending' ? 'bg-blue-500/30 text-blue-300' :
                setup.status === 'Active' ? 'bg-emerald-500/30 text-emerald-300' :
                setup.status === 'Triggered' ? 'bg-amber-500/30 text-amber-300' :
                setup.status === 'Completed' ? 'bg-purple-500/30 text-purple-300' :
                'bg-gray-500/30 text-gray-300'
              } text-xs font-medium`}>
                {setup.status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400">Entry</span>
                  <span className="text-sm font-bold text-white">${mounted ? setup.entry.toLocaleString() : '65,000'}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400">Stop Loss</span>
                  <span className="text-sm font-bold text-rose-400">${mounted ? setup.stopLoss.toLocaleString() : '63,500'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Risk/Reward</span>
                  <span className="text-sm font-bold text-amber-400">{mounted ? setup.riskRewardRatio.toFixed(2) : '3.50'}</span>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-400">TP1</span>
                  <span className="text-xs font-bold text-emerald-400">${mounted ? setup.takeProfits.tp1.toLocaleString() : '65,500'}</span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-400">TP2</span>
                  <span className="text-xs font-bold text-emerald-400">${mounted ? setup.takeProfits.tp2.toLocaleString() : '66,200'}</span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-400">TP3</span>
                  <span className="text-xs font-bold text-emerald-400">${mounted ? setup.takeProfits.tp3.toLocaleString() : '67,100'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">TP4</span>
                  <span className="text-xs font-bold text-emerald-400">${mounted ? setup.takeProfits.tp4.toLocaleString() : '68,500'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div className="flex items-center">
                <RiScales3Line className="w-3 h-3 text-gray-400 mr-1" />
                <span className="text-gray-400 mr-1">Win Rate:</span>
                <span className="text-white">{setup.winRate}%</span>
              </div>
              <div className="flex items-center">
                <RiTimeLine className="w-3 h-3 text-gray-400 mr-1" />
                <span className="text-gray-400 mr-1">Time:</span>
                <span className="text-white">{setup.expectedTimeInTrade}</span>
              </div>
              <div className="flex items-center">
                <RiLineChartLine className="w-3 h-3 text-gray-400 mr-1" />
                <span className="text-gray-400 mr-1">Structure:</span>
                <span className="text-white">{setup.marketStructure}</span>
              </div>
            </div>

            <div className="mt-2 mb-2">
              <Text className="text-xs text-gray-400 mb-1">Key Levels:</Text>
              <div className="flex flex-wrap gap-1">
                {setup.keyLevels.map((level, index) => (
                  <span
                    key={index}
                    className={`text-xs px-2 py-0.5 rounded ${
                      level.type === 'Support' || level.type === 'OB' ? 'bg-emerald-500/20 text-emerald-300' :
                      level.type === 'Resistance' ? 'bg-rose-500/20 text-rose-300' :
                      level.type === 'FVG' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {level.name}: ${level.price.toLocaleString()}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-xs text-gray-400 mt-1 border-t border-gray-700/30 pt-2">
              <span className="font-medium">Entry time:</span> {mounted ? new Date(setup.timestamp).toLocaleString() : '5/3/2025, 2:30:00 PM'}
            </div>
          </div>
        ))}
      </div>

      {topSetups.length === 0 && (
        <div className="text-center py-6">
          <Text className="text-gray-400">No SMC trade setups available at the moment</Text>
        </div>
      )}

      <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
        <Text className="text-xs text-rose-300 font-bold">RISK DISCLAIMER:</Text>
        <Text className="text-xs text-gray-400 mt-1">
          Trading involves substantial risk of loss and is not suitable for all investors. Past performance is not
          indicative of future results. The information provided is for educational purposes only and should not be
          considered financial advice. Always use proper risk management and never risk more than you can afford to lose.
        </Text>
      </div>
    </Card>
  )
}
