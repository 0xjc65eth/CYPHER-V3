/**
 * useCollectionMilestones Hook - CYPHER V3
 * Fetch milestone events for Ordinals collections
 */

import { useQuery } from '@tanstack/react-query'

export type MilestoneType =
  | 'ATH'
  | 'ATL'
  | 'VOLUME_SPIKE'
  | 'HOLDER_SURGE'
  | 'WHALE_BUY'
  | 'BREAKOUT'
  | 'BREAKDOWN'

export type MilestoneSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface MilestoneEvent {
  id: string
  collectionSymbol: string
  type: MilestoneType
  timestamp: number
  date: string
  data: {
    value: number
    previousValue?: number
    changePercent?: number
    context?: string
  }
  severity: MilestoneSeverity
}

export interface MilestonesStats {
  totalMilestones: number
  athCount: number
  atlCount: number
  volumeSpikeCount: number
  holderSurgeCount: number
  breakoutCount: number
  breakdownCount: number
  lastMilestone: string | null
  bySeverity: {
    low: number
    medium: number
    high: number
    critical: number
  }
}

async function fetchMilestones(
  symbol: string,
  limit: number = 50,
  type?: MilestoneType,
  severity?: MilestoneSeverity
): Promise<{ milestones: MilestoneEvent[]; stats: MilestonesStats }> {
  const params = new URLSearchParams({
    limit: limit.toString(),
  })

  if (type) {
    params.append('type', type)
  }

  if (severity) {
    params.append('severity', severity)
  }

  const response = await fetch(`/api/ordinals/milestones/${symbol}/?${params}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch milestones')
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch milestones')
  }

  return result.data
}

/**
 * Hook to fetch milestones for a collection
 */
export function useCollectionMilestones(
  symbol: string,
  limit: number = 50,
  type?: MilestoneType,
  severity?: MilestoneSeverity
) {
  return useQuery({
    queryKey: ['ordinals', 'milestones', symbol, limit, type, severity],
    queryFn: () => fetchMilestones(symbol, limit, type, severity),
    enabled: !!symbol,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
  })
}

/**
 * Hook to fetch recent milestones (last 10)
 */
export function useRecentMilestones(symbol: string) {
  return useCollectionMilestones(symbol, 10)
}

/**
 * Hook to fetch critical milestones only
 */
export function useCriticalMilestones(symbol: string, limit: number = 20) {
  return useCollectionMilestones(symbol, limit, undefined, 'critical')
}
