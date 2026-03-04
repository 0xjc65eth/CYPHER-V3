/**
 * 🚀 ENHANCED RUNES DATA HOOK
 * Uses the optimized API service with real Hiro API integration
 * Features: Real-time data, intelligent caching, graceful fallbacks
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useEffect } from 'react'

interface EnhancedRunesOptions {
  limit?: number
  offset?: number
  order?: 'asc' | 'desc'
  refreshInterval?: number
  staleTime?: number
  gcTime?: number
  enabled?: boolean
}

interface RuneData {
  name: string
  formatted_name: string
  id: string
  number: number
  etching: string
  supply: string
  premine: string
  symbol: string
  divisibility: number
  terms: any
  turbo: boolean
  burned: string
  mints: number
  unique_holders: number
  volume_24h: number
  market: {
    price_in_btc: number
    market_cap: number
  }
  timestamp: number
}

interface EnhancedRunesResponse {
  data: RuneData[]
  loading: boolean
  error: string | null
  success: boolean
  source: string
  responseTime: number
  cached: boolean
  total: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  refreshData: () => void
  clearCache: () => void
  healthStatus: 'healthy' | 'degraded' | 'critical' | 'unknown'
}

export function useEnhancedRunesData(options: EnhancedRunesOptions = {}): EnhancedRunesResponse {
  const {
    limit = 20,
    offset = 0,
    order = 'desc',
    refreshInterval = 60000, // 1 minute
    staleTime = 30000, // 30 seconds
    gcTime = 300000, // 5 minutes (formerly cacheTime)
    enabled = true
  } = options

  const queryClient = useQueryClient()
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'degraded' | 'critical' | 'unknown'>('unknown')

  const queryKey = ['enhanced-runes', { limit, offset, order }]

  const {
    data: queryData,
    isLoading,
    error,
    isError,
    refetch,
    isFetching,
    dataUpdatedAt
  } = useQuery({
    queryKey,
    queryFn: async () => {
      
      try {
        const response = await fetch(`/api/runes-list/?limit=${limit}&offset=${offset}&order=${order}`)
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`)
        }
        
        const result = await response.json()
        
        // Update health status based on response
        if (result.success && result.source !== 'fallback') {
          setHealthStatus('healthy')
        } else if (result.success && result.source === 'fallback') {
          setHealthStatus('degraded')
        } else {
          setHealthStatus('critical')
        }
        
        
        return {
          ...result,
          fetchedAt: Date.now()
        }
      } catch (error) {
        console.error('❌ Enhanced Runes data fetch failed:', error)
        setHealthStatus('critical')
        throw error
      }
    },
    enabled,
    refetchInterval: refreshInterval,
    staleTime,
    gcTime,
    retry: (failureCount, error) => {
      // Implement intelligent retry logic
      if (failureCount >= 3) return false
      
      // Don't retry for client errors (4xx)
      const errorMessage = error?.message || ''
      if (errorMessage.includes('4')) return false
      
      return true
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff with jitter
      return Math.min(1000 * 2 ** attemptIndex + Math.random() * 1000, 30000)
    }
  })

  // Enhanced data processing
  const processedData = queryData?.data?.map((rune: any, index: number) => ({
    ...rune,
    // Add computed fields
    marketCapFormatted: formatMarketCap(rune.market?.market_cap || 0),
    volumeFormatted: formatVolume(rune.volume_24h || 0),
    holdersFormatted: formatNumber(rune.unique_holders || 0),
    supplyFormatted: formatSupply(rune.supply || '0'),
    rank: offset + index + 1,
    
    // Trend indicators derived from real data (no mock random)
    trend: {
      direction: (rune.market?.price_change_24h || 0) >= 0 ? 'up' as const : 'down' as const,
      strength: Math.min(100, Math.abs(rune.market?.price_change_24h || 0) * 5),
      period: '24h'
    },

    // Health indicators derived from real data
    health: {
      liquidityScore: Math.min(100, (rune.volume_24h || 0) / 10),
      adoptionScore: Math.min(100, (rune.unique_holders || 0) / 100),
      activityScore: Math.min(100, (rune.mints || 0) / 1000)
    }
  })) || []

  // Refresh function
  const refreshData = useCallback(() => {
    refetch()
  }, [refetch])

  // Clear cache function
  const clearCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: ['enhanced-runes'] })
  }, [queryClient])

  // Health monitoring effect
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/system/hiro-health/')
        const health = await response.json()
        
        if (health.endpoints?.runes?.success) {
          setHealthStatus('healthy')
        } else if (health.score > 50) {
          setHealthStatus('degraded')
        } else {
          setHealthStatus('critical')
        }
      } catch {
        setHealthStatus('unknown')
      }
    }

    const interval = setInterval(checkHealth, 120000) // Check every 2 minutes
    return () => clearInterval(interval)
  }, [])

  // Pagination helpers
  const hasNextPage = processedData.length === limit
  const hasPreviousPage = offset > 0
  const totalEstimate = queryData?.total || processedData.length

  return {
    data: processedData,
    loading: isLoading || isFetching,
    error: isError ? (error as Error)?.message || 'Unknown error' : null,
    success: queryData?.success || false,
    source: queryData?.source || 'unknown',
    responseTime: queryData?.responseTime || 0,
    cached: queryData?.cached || false,
    total: totalEstimate,
    hasNextPage,
    hasPreviousPage,
    refreshData,
    clearCache,
    healthStatus
  }
}

// Utility functions
function formatMarketCap(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

function formatVolume(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`
  return value.toString()
}

function formatNumber(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
  return value.toString()
}

function formatSupply(supply: string): string {
  const num = parseFloat(supply)
  if (isNaN(num)) return supply
  
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
  return num.toLocaleString()
}

// Export types
export type { RuneData, EnhancedRunesOptions, EnhancedRunesResponse }