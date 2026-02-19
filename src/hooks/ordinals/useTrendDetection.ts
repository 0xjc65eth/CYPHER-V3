/**
 * useTrendDetection Hook - CYPHER V3
 * Fetch trend analysis for Ordinals collections
 */

import { useQuery } from '@tanstack/react-query'

export interface TrendAnalysis {
  symbol: string
  name: string
  trendType: 'uptrend' | 'downtrend' | 'sideways' | 'breakout' | 'breakdown'
  strength: number // 0-100
  confidence: number // 0-100
  indicators: {
    ma7?: number
    ma30?: number
    currentPrice: number
    volumeTrend: 'increasing' | 'decreasing' | 'stable'
  }
  signals: Array<{
    type: 'buy' | 'sell' | 'hold'
    reason: string
    strength: number
  }>
}

export interface TrendsSummary {
  totalAnalyzed: number
  uptrends: number
  downtrends: number
  sideways: number
  breakouts: number
  breakdowns: number
  avgStrength: number
}

async function fetchTrends(
  symbol?: string,
  type: 'price' | 'volume' | 'holder' | 'all' = 'all',
  period: '7d' | '30d' | '90d' = '30d'
): Promise<{ trends: TrendAnalysis[]; summary: TrendsSummary }> {
  const params = new URLSearchParams({
    type,
    period,
  })

  if (symbol) {
    params.append('symbol', symbol)
  }

  const response = await fetch(`/api/ordinals/trends/?${params}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch trends')
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch trends')
  }

  return {
    trends: result.data,
    summary: result.summary,
  }
}

/**
 * Hook to fetch trend analysis for all collections or specific collection
 */
export function useTrendDetection(
  symbol?: string,
  type: 'price' | 'volume' | 'holder' | 'all' = 'all',
  period: '7d' | '30d' | '90d' = '30d'
) {
  return useQuery({
    queryKey: ['ordinals', 'trends', symbol, type, period],
    queryFn: () => fetchTrends(symbol, type, period),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  })
}

/**
 * Hook to fetch trend for a specific collection (simplified)
 */
export function useCollectionTrend(
  symbol: string,
  period: '7d' | '30d' | '90d' = '30d'
) {
  const { data, ...rest } = useTrendDetection(symbol, 'all', period)

  return {
    ...rest,
    data: data?.trends[0] || null,
  }
}
