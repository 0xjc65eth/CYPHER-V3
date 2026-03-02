"use client"

import { useState, useEffect } from 'react'

interface Opportunity {
  id: string
  title: string
  description: string
  type: 'Arbitrage' | 'Trade' | 'Mint'
  successProbability: number // 0-100
  potentialReturn: number // percentage
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High'
  timeFrame: 'Immediate' | 'Short-term' | 'Medium-term' | 'Long-term'
  updatedAt: string
  detailedAnalysis: string
  neuralConfidence: number // 0-100
  marketData: {
    volume24h?: number
    priceChange24h?: number
    liquidityScore?: number
    socialSentiment?: 'Bearish' | 'Neutral' | 'Bullish' | 'Very Bullish'
  }
  actionSteps: string[]
  links: {
    title: string
    url: string
  }[]
}

interface OpportunitiesData {
  opportunities: Opportunity[]
}

interface UseOpportunitiesResult {
  data: OpportunitiesData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useOpportunities(address: string): UseOpportunitiesResult {
  const [data, setData] = useState<OpportunitiesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchOpportunities = async () => {
    if (!address) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // FALLBACK: Replace with real opportunities API endpoint
      // Opportunities should come from real-time arbitrage detection engine
      const response = await fetch(`/api/opportunities/?address=${encodeURIComponent(address)}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else {
        // API returned error - show empty state
        setData({ opportunities: [] })
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch opportunities'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOpportunities()
  }, [address])

  return {
    data,
    isLoading,
    error,
    refetch: fetchOpportunities
  }
}
