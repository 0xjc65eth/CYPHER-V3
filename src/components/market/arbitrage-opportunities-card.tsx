'use client'

import { useState, useEffect } from 'react'
import { Card, Title, Text, Badge, Metric } from '@tremor/react'
import { RiExchangeDollarLine, RiRefreshLine, RiArrowRightLine, RiExternalLinkLine, RiTimeLine, RiPercentLine } from 'react-icons/ri'
import Link from 'next/link'

interface ArbitrageOpportunity {
  id: string
  type: 'ordinals' | 'runes'
  name: string
  symbol: string
  buyExchange: string
  buyPrice: number
  buyLink: string
  sellExchange: string
  sellPrice: number
  sellLink: string
  profitPercentage: number
  estimatedFees: number
  netProfit: number
  volume24h: number
  timeDetected: Date
  difficulty: 'easy' | 'medium' | 'hard'
}

export function ArbitrageOpportunitiesCard() {
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([])
  const [filter, setFilter] = useState<'all' | 'ordinals' | 'runes'>('all')

  // Avoid hydration issues
  useEffect(() => {
    setMounted(true)
    setLastUpdated(new Date())
    
    // Fetch real arbitrage opportunities from API
    fetchArbitrageData()
  }, [])

  // Fetch arbitrage opportunities from API
  const fetchArbitrageData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/arbitrage/opportunities/')
      if (!res.ok) throw new Error(`API returned ${res.status}`)
      const json = await res.json()
      const data = json.data || json.opportunities || []

      if (Array.isArray(data) && data.length > 0) {
        const mapped: ArbitrageOpportunity[] = data.slice(0, 5).map((opp: any, i: number) => ({
          id: opp.id || `arb-${i}`,
          type: (opp.type || 'ordinals') as 'ordinals' | 'runes',
          name: opp.name || opp.pair || 'Unknown',
          symbol: opp.symbol || opp.pair || '???',
          buyExchange: opp.buyExchange || opp.source || 'Exchange A',
          buyPrice: opp.buyPrice || opp.sourcePrice || 0,
          buyLink: opp.buyLink || '#',
          sellExchange: opp.sellExchange || opp.target || 'Exchange B',
          sellPrice: opp.sellPrice || opp.targetPrice || 0,
          sellLink: opp.sellLink || '#',
          profitPercentage: opp.profitPercentage || opp.spread || 0,
          estimatedFees: opp.estimatedFees || 0,
          netProfit: opp.netProfit || opp.estimatedProfit || 0,
          volume24h: opp.volume24h || opp.volume || 0,
          timeDetected: new Date(opp.timeDetected || Date.now()),
          difficulty: (opp.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
        }))
        setOpportunities(mapped)
      } else {
        setOpportunities([])
      }
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch arbitrage data:', err)
      setOpportunities([])
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh data
  const refreshData = () => {
    fetchArbitrageData()
  }

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 60) {
      return `${diffMins} min ago`
    } else {
      return `${Math.floor(diffMins / 60)} hr ago`
    }
  }

  // Format price based on value
  const formatPrice = (price: number) => {
    if (price < 0.00001) {
      return price.toFixed(8)
    }
    if (price < 0.01) {
      return price.toFixed(6)
    }
    if (price < 1) {
      return price.toFixed(4)
    }
    return price.toFixed(3)
  }

  // Filter opportunities
  const filteredOpportunities = filter === 'all' 
    ? opportunities 
    : opportunities.filter(opp => opp.type === filter)

  // Return null during SSR to avoid hydration issues
  if (!mounted) return null

  return (
    <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3 border border-blue-500/30">
            <RiExchangeDollarLine className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <Title className="text-white text-xl">Arbitrage Opportunities</Title>
            <Text className="text-xs text-gray-400">
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
            </Text>
          </div>
        </div>
        <button 
          onClick={refreshData}
          className="p-2 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors border border-blue-500/30"
          disabled={isLoading}
        >
          <RiRefreshLine className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter buttons */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-xs rounded-full ${
            filter === 'all' 
              ? 'bg-blue-500 text-white' 
              : 'bg-blue-500/20 text-gray-300 hover:bg-blue-500/30'
          } transition-colors`}
        >
          All Opportunities
        </button>
        <button
          onClick={() => setFilter('ordinals')}
          className={`px-3 py-1 text-xs rounded-full ${
            filter === 'ordinals' 
              ? 'bg-purple-500 text-white' 
              : 'bg-blue-500/20 text-gray-300 hover:bg-blue-500/30'
          } transition-colors`}
        >
          Ordinals
        </button>
        <button
          onClick={() => setFilter('runes')}
          className={`px-3 py-1 text-xs rounded-full ${
            filter === 'runes' 
              ? 'bg-amber-500 text-white' 
              : 'bg-blue-500/20 text-gray-300 hover:bg-blue-500/30'
          } transition-colors`}
        >
          Runes
        </button>
      </div>

      {/* Opportunities list */}
      <div className="space-y-4">
        {filteredOpportunities.length === 0 ? (
          <div className="text-center py-8 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Text className="text-gray-400">No arbitrage opportunities found</Text>
          </div>
        ) : (
          filteredOpportunities.map((opportunity) => (
            <div 
              key={opportunity.id} 
              className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20 hover:border-blue-500/40 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center">
                    <Text className="text-white font-medium">{opportunity.name}</Text>
                    <Badge 
                      className="ml-2" 
                      color={opportunity.type === 'ordinals' ? 'purple' : 'amber'} 
                      size="xs"
                    >
                      {opportunity.symbol}
                    </Badge>
                    <Badge 
                      className="ml-2" 
                      color={
                        opportunity.profitPercentage > 15 ? 'emerald' : 
                        opportunity.profitPercentage > 8 ? 'blue' : 
                        'gray'
                      } 
                      size="xs"
                    >
                      <div className="flex items-center">
                        <RiPercentLine className="mr-0.5" />
                        {opportunity.profitPercentage.toFixed(1)}% Profit
                      </div>
                    </Badge>
                  </div>
                  <div className="flex items-center mt-1 text-xs text-gray-400">
                    <div className="flex items-center mr-3">
                      <RiTimeLine className="mr-1" />
                      {formatTimeAgo(opportunity.timeDetected)}
                    </div>
                    <div>
                      Difficulty: 
                      <span className={
                        opportunity.difficulty === 'easy' ? ' text-emerald-400' : 
                        opportunity.difficulty === 'medium' ? ' text-amber-400' : 
                        ' text-rose-400'
                      }>
                        {' '}{opportunity.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge 
                  color={opportunity.type === 'ordinals' ? 'purple' : 'amber'}
                >
                  {opportunity.type === 'ordinals' ? 'Ordinals' : 'Runes'}
                </Badge>
              </div>

              <div className="flex items-center justify-between bg-blue-500/5 rounded-lg p-3 mb-3">
                <div>
                  <Text className="text-xs text-gray-400">Buy on {opportunity.buyExchange}</Text>
                  <div className="flex items-center">
                    <Metric className="text-white text-lg">{formatPrice(opportunity.buyPrice)} BTC</Metric>
                    <Link 
                      href={opportunity.buyLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-400 hover:text-blue-300 transition-colors flex items-center text-xs"
                    >
                      Buy <RiExternalLinkLine className="ml-1" />
                    </Link>
                  </div>
                </div>
                <RiArrowRightLine className="text-gray-400 mx-2" />
                <div className="text-right">
                  <Text className="text-xs text-gray-400">Sell on {opportunity.sellExchange}</Text>
                  <div className="flex items-center justify-end">
                    <Metric className="text-white text-lg">{formatPrice(opportunity.sellPrice)} BTC</Metric>
                    <Link 
                      href={opportunity.sellLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-400 hover:text-blue-300 transition-colors flex items-center text-xs"
                    >
                      Sell <RiExternalLinkLine className="ml-1" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Text className="text-gray-400 text-xs">Est. Net Profit</Text>
                  <Text className="text-emerald-400 font-medium">{formatPrice(opportunity.netProfit)} BTC</Text>
                </div>
                <div>
                  <Text className="text-gray-400 text-xs">Est. Fees</Text>
                  <Text className="text-white">{formatPrice(opportunity.estimatedFees)} BTC</Text>
                </div>
                <div>
                  <Text className="text-gray-400 text-xs">24h Volume</Text>
                  <Text className="text-white">{(opportunity.volume24h / 1000).toFixed(1)}K BTC</Text>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
        <Text className="text-xs text-rose-300 font-bold">RISK DISCLAIMER:</Text>
        <Text className="text-xs text-gray-400 mt-1">
          Arbitrage opportunities come with risks including price slippage, transaction delays, and market volatility.
          Estimated profits are based on current market conditions and may change rapidly. Always verify prices before executing trades.
          Transaction fees and network congestion may impact profitability.
        </Text>
      </div>
    </Card>
  )
}

export default ArbitrageOpportunitiesCard
