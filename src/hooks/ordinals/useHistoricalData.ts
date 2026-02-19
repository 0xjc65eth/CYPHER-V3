/**
 * useHistoricalData Hook - CYPHER V3
 * Fetch historical time-series data for Ordinals collections
 */

import { useQuery } from '@tanstack/react-query'

export interface HistoricalDataPoint {
  date: string
  timestamp: number
  floorPrice?: number
  floorPriceUSD?: number
  volume?: number
  volumeUSD?: number
  trades?: number
  holders?: number
  listed?: number
}

export interface HistoricalAnalytics {
  priceChange: number
  volumeChange: number
  averageVolume: number
  volatility: number
  trend: 'uptrend' | 'downtrend' | 'sideways'
}

export interface HistoricalData {
  symbol: string
  period: string
  interval: string
  timeSeries: HistoricalDataPoint[]
  analytics: HistoricalAnalytics
  summary: {
    dataPoints: number
    firstDate: string
    lastDate: string
    priceRange: {
      min: number
      max: number
    }
    volumeTotal: number
  }
}

async function fetchHistoricalData(
  symbol: string,
  period: '7d' | '30d' | '90d' | '1y' | 'all' = '30d',
  interval: 'daily' | 'weekly' = 'daily',
  metrics: string = 'price,volume,holders'
): Promise<HistoricalData> {
  const params = new URLSearchParams({
    period,
    interval,
    metrics,
  })

  const response = await fetch(`/api/ordinals/historical/${symbol}/?${params}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch historical data')
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch historical data')
  }

  return result.data
}

/**
 * Hook to fetch historical data for a collection
 */
export function useHistoricalData(
  symbol: string,
  period: '7d' | '30d' | '90d' | '1y' | 'all' = '30d',
  interval: 'daily' | 'weekly' = 'daily',
  metrics: string = 'price,volume,holders'
) {
  return useQuery({
    queryKey: ['ordinals', 'historical', symbol, period, interval, metrics],
    queryFn: () => fetchHistoricalData(symbol, period, interval, metrics),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  })
}

/**
 * Hook to fetch price history only (simplified)
 */
export function usePriceHistory(
  symbol: string,
  period: '7d' | '30d' | '90d' | '1y' | 'all' = '30d'
) {
  return useHistoricalData(symbol, period, 'daily', 'price')
}

/**
 * Hook to fetch volume history only (simplified)
 */
export function useVolumeHistory(
  symbol: string,
  period: '7d' | '30d' | '90d' | '1y' | 'all' = '30d'
) {
  return useHistoricalData(symbol, period, 'daily', 'volume')
}
