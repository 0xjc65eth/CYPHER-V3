"use client"

import { useState, useEffect } from 'react'

interface Transaction {
  type: 'Sent' | 'Received'
  amount: string
  valueUSD: number
  date: string
}

interface PortfolioData {
  totalValue: number
  btc: {
    amount: number
    value: number
  }
  ordinals: {
    count: number
    value: number
  }
  runes: {
    count: number
    value: number
  }
  rareSats: {
    count: number
    value: number
  }
  recentTransactions: Transaction[]
}

interface UsePortfolioResult {
  data: PortfolioData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function usePortfolio(address: string): UsePortfolioResult {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPortfolioData = async () => {
    if (!address) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {

      // Fetch real data from our API
      const response = await fetch(`/api/portfolio/data/?address=${address}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch portfolio data: ${response.status}`)
      }

      // Parse the response
      const portfolioData = await response.json()

      // Map API response to PortfolioData — no fake multipliers
      setData(mapPortfolioData(portfolioData))
    } catch (err) {
      console.error('Error fetching portfolio data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch portfolio data'))
    } finally {
      setIsLoading(false)
    }
  }

  // Map raw API data to PortfolioData interface
  const mapPortfolioData = (rawData: any): PortfolioData => {
    const btc = rawData.btc || { amount: 0, value: 0 }
    const ordinals = rawData.ordinals || { count: 0, value: 0 }
    const runes = rawData.runes || { count: 0, value: 0 }
    const rareSats = rawData.rareSats || { count: 0, value: 0 }

    return {
      totalValue: (btc.value || 0) + (ordinals.value || 0) + (runes.value || 0) + (rareSats.value || 0),
      btc: { amount: btc.amount || 0, value: btc.value || 0 },
      ordinals: { count: ordinals.count || 0, value: ordinals.value || 0 },
      runes: { count: runes.count || 0, value: runes.value || 0 },
      rareSats: { count: rareSats.count || 0, value: rareSats.value || 0 },
      recentTransactions: Array.isArray(rawData.recentTransactions) ? rawData.recentTransactions : [],
    }
  }

  useEffect(() => {
    fetchPortfolioData()
  }, [address])

  return {
    data,
    isLoading,
    error,
    refetch: fetchPortfolioData
  }
}
