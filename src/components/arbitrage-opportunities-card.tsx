'use client'

import { useState, useEffect } from 'react'
import { Card, Title, Text } from '@tremor/react'
import { RiExchangeLine, RiTimeLine, RiShieldCheckLine, RiMoneyDollarCircleLine, RiPercentLine } from 'react-icons/ri'
import { useTradingData } from '@/hooks/useTradingData'
import { ArbitrageOpportunity } from '@/services/trading-data-service'
import { DataFreshness } from '@/components/ui/DataFreshness'

export function ArbitrageOpportunitiesCard() {
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
      <Card className="bg-gradient-to-br from-[#1D2D3D] to-[#2D3D4D] border-none shadow-xl p-6">
        <Title className="text-white text-xl mb-2">Arbitrage Opportunities</Title>
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
      <Card className="bg-gradient-to-br from-[#1D2D3D] to-[#2D3D4D] border-none shadow-xl p-6">
        <Title className="text-white text-xl mb-2">Arbitrage Opportunities</Title>
        <Text className="text-rose-400">Error loading arbitrage data</Text>
      </Card>
    )
  }

  // Get arbitrage opportunities from data
  const arbitrageOpportunities = data?.arbitrageOpportunities || []

  // Filter for Ordinals and Runes opportunities with positive profit only
  const filteredOpportunities = arbitrageOpportunities.filter(
    opp => (opp.asset.includes('Ordinal') || opp.asset.includes('Rune') || opp.asset.includes('BTC')) &&
           opp.estimatedProfit > 0
  )

  // Sort by estimated profit (highest first)
  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => b.estimatedProfit - a.estimatedProfit)

  // Get top 6 opportunities
  const topOpportunities = sortedOpportunities.slice(0, 6)

  // Usar uma data fixa para evitar problemas de hidratação
  const formattedDate = mounted
    ? `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
    : "2025-05-03 14:30:00"

  return (
    <Card className="bg-gradient-to-br from-[#1D2D3D] to-[#2D3D4D] border-none shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mr-3 border border-emerald-500/30">
            <RiExchangeLine className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <Title className="text-white text-xl">Ordinals & Runes Arbitrage</Title>
            <Text className="text-xs text-gray-400">
              {lastUpdated ? <DataFreshness timestamp={lastUpdated} /> : 'Real-time data'}
            </Text>
          </div>
        </div>
        <span className="px-2 py-1 rounded bg-emerald-500/20 text-xs font-bold text-emerald-300 border border-emerald-500/30">
          {topOpportunities.length} Active
        </span>
      </div>

      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <Text className="text-sm text-white">
          <span className="font-bold">How it works:</span> These opportunities represent price differences between marketplaces.
          Buy at the lower price on the source exchange and sell at the higher price on the target exchange to capture the spread.
        </Text>
        <Text className="text-xs text-gray-400 mt-1">
          Analysis date: {formattedDate} • Data sources: Ordiscan API
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topOpportunities.map((opportunity) => (
          <div
            key={opportunity.id}
            className={`bg-gradient-to-br ${
              opportunity.risk === 'Low' ? 'from-emerald-900/20 to-emerald-800/10 border-emerald-700/30' :
              opportunity.risk === 'Medium' ? 'from-amber-900/20 to-amber-800/10 border-amber-700/30' :
              'from-rose-900/20 to-rose-800/10 border-rose-700/30'
            } rounded-lg p-4 border transition-all duration-300 hover:shadow-lg`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <Text className="font-bold text-white">{opportunity.asset}</Text>
                <div className="flex items-center text-xs text-gray-400 mt-1">
                  <span>{opportunity.sourceExchange}</span>
                  <RiExchangeLine className="mx-1" />
                  <span>{opportunity.targetExchange}</span>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full ${
                opportunity.risk === 'Low' ? 'bg-emerald-500/30 text-emerald-300' :
                opportunity.risk === 'Medium' ? 'bg-amber-500/30 text-amber-300' :
                'bg-rose-500/30 text-rose-300'
              } text-xs font-medium`}>
                {opportunity.risk} Risk
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="flex items-center">
                <RiPercentLine className="w-3 h-3 text-gray-400 mr-1" />
                <span className="text-gray-400 mr-1">Diff:</span>
                <span className="text-emerald-400 font-bold">{opportunity.percentageDifference.toFixed(2)}%</span>
              </div>
              <div className="flex items-center">
                <RiMoneyDollarCircleLine className="w-3 h-3 text-gray-400 mr-1" />
                <span className="text-gray-400 mr-1">Profit:</span>
                <span className="text-emerald-400 font-bold">${opportunity.estimatedProfit.toFixed(2)}</span>
              </div>
              <div className="flex items-center">
                <RiTimeLine className="w-3 h-3 text-gray-400 mr-1" />
                <span className="text-gray-400 mr-1">Time:</span>
                <span className="text-white">{opportunity.timeToExecute}</span>
              </div>
              <div className="flex items-center">
                <RiShieldCheckLine className="w-3 h-3 text-gray-400 mr-1" />
                <span className="text-gray-400 mr-1">Conf:</span>
                <span className="text-white">{opportunity.confidence}%</span>
              </div>
            </div>

            {/* Profit calculation details */}
            <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/30 mb-3 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-400">Buy price:</span>
                <span className="text-white font-medium">${(opportunity.priceDifference / (opportunity.percentageDifference / 100)).toFixed(6)}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-400">Sell price:</span>
                <span className="text-white font-medium">${(opportunity.priceDifference / (opportunity.percentageDifference / 100) * (1 + opportunity.percentageDifference / 100)).toFixed(6)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">After fees:</span>
                <span className="text-emerald-400 font-medium">${opportunity.estimatedProfit.toFixed(2)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mb-3">
              <a
                href={`https://${opportunity.sourceExchange.toLowerCase().replace(/\s+/g, '')}.io/market/${opportunity.asset.toLowerCase().replace('/', '-').replace('rune20/', 'rune/')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center px-2 py-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-colors"
              >
                Buy on {opportunity.sourceExchange}
              </a>
              <a
                href={`https://${opportunity.targetExchange.toLowerCase().replace(/\s+/g, '')}.io/market/${opportunity.asset.toLowerCase().replace('/', '-').replace('rune20/', 'rune/')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center px-2 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-colors"
              >
                Sell on {opportunity.targetExchange}
              </a>
            </div>

            <div className="flex justify-between items-center text-xs mb-2">
              <span className={`px-2 py-0.5 rounded ${
                opportunity.status === 'New' ? 'bg-blue-500/20 text-blue-300' :
                opportunity.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300' :
                opportunity.status === 'Closing' ? 'bg-amber-500/20 text-amber-300' :
                'bg-gray-500/20 text-gray-300'
              }`}>
                {opportunity.status}
              </span>
              <span className="text-gray-400">
                Vol: ${opportunity.volume24h.toLocaleString()}
              </span>
            </div>

            <div className="text-xs text-gray-400 mt-1 border-t border-gray-700/30 pt-2">
              <span className="font-medium">Entry time:</span> {mounted ? new Date(opportunity.timestamp).toLocaleString() : '5/3/2025, 2:30:00 PM'}
            </div>
          </div>
        ))}
      </div>

      {topOpportunities.length === 0 && (
        <div className="text-center py-6">
          <Text className="text-gray-400">No arbitrage opportunities available at the moment</Text>
        </div>
      )}

      <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
        <Text className="text-xs text-rose-300 font-bold">RISK DISCLAIMER:</Text>
        <Text className="text-xs text-gray-400 mt-1">
          Arbitrage trading involves risks including but not limited to market volatility, liquidity issues,
          transaction fees, and execution delays. Past performance is not indicative of future results.
          Always conduct your own research before trading.
        </Text>
      </div>
    </Card>
  )
}
