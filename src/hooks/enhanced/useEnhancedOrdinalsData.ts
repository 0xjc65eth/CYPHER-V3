/**
 * 🎨 ENHANCED ORDINALS DATA HOOK
 * Real-time Ordinals and collections data with Hiro API integration
 * Features: Collection analytics, floor price tracking, activity monitoring
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useEffect } from 'react'

interface EnhancedOrdinalsOptions {
  includeCollections?: boolean
  includeActivity?: boolean
  refreshInterval?: number
  staleTime?: number
  enabled?: boolean
}

interface CollectionData {
  name: string
  volume_24h: number
  floor_price: number
  unique_holders: number
  supply: number
  sales_24h: number
  image?: string
  verified: boolean
  category: string
  marketplaces: Array<{
    name: string
    url: string
  }>
  links: {
    buy: string
    info: string
  }
  // Enhanced metrics
  liquidityScore: number
  trendDirection: 'up' | 'down' | 'stable'
  priceChange24h: number
  volumeChange24h: number
}

interface OrdinalsStats {
  volume_24h: number
  volume_change_24h: number
  price_change_24h: number
  market_cap: number
  unique_holders: number
  available_supply: number
  inscription_rate: number
  total_collections: number
  data_sources: {
    collections: string
    inscriptions: string
  }
  last_updated: string
}

interface EnhancedOrdinalsResponse {
  stats: OrdinalsStats | null
  collections: CollectionData[]
  loading: boolean
  error: string | null
  success: boolean
  dataSource: string
  lastUpdated: Date | null
  refreshData: () => void
  clearCache: () => void
  healthStatus: 'healthy' | 'degraded' | 'critical' | 'unknown'
  // Analytics
  topPerformers: CollectionData[]
  marketTrends: {
    totalVolume: number
    avgFloorPrice: number
    totalHolders: number
    activeCollections: number
  }
}

export function useEnhancedOrdinalsData(options: EnhancedOrdinalsOptions = {}): EnhancedOrdinalsResponse {
  const {
    includeCollections = true,
    includeActivity = false,
    refreshInterval = 120000, // 2 minutes
    staleTime = 60000, // 1 minute
    enabled = true
  } = options

  const queryClient = useQueryClient()
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'degraded' | 'critical' | 'unknown'>('unknown')

  const queryKey = ['enhanced-ordinals', { includeCollections, includeActivity }]

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
        const response = await fetch('/api/ordinals-stats/')
        
        if (!response.ok) {
          throw new Error(`Ordinals API request failed: ${response.status}`)
        }
        
        const result = await response.json()
        
        // Determine health status based on data sources
        const collections_source = result.data_sources?.collections || 'unknown'
        const inscriptions_source = result.data_sources?.inscriptions || 'unknown'
        
        if (collections_source !== 'fallback' && inscriptions_source !== 'fallback') {
          setHealthStatus('healthy')
        } else if (collections_source === 'fallback' || inscriptions_source === 'fallback') {
          setHealthStatus('degraded')
        } else {
          setHealthStatus('critical')
        }
        
        
        return {
          ...result,
          fetchedAt: Date.now()
        }
      } catch (error) {
        console.error('❌ Enhanced Ordinals data fetch failed:', error)
        setHealthStatus('critical')
        throw error
      }
    },
    enabled,
    refetchInterval: refreshInterval,
    staleTime,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
  })

  // Process and enhance collections data
  const enhancedCollections: CollectionData[] = (queryData?.popular_collections || []).map((collection: any) => {
    // Calculate enhanced metrics
    const liquidityScore = Math.min(100, (collection.volume_24h || 0) / 1000) // Normalize to 0-100
    const volumeChange = 0 // No real change data available
    const priceChange = 0 // No real change data available
    
    let trendDirection: 'up' | 'down' | 'stable' = 'stable'
    if (priceChange > 2) trendDirection = 'up'
    else if (priceChange < -2) trendDirection = 'down'
    
    return {
      ...collection,
      liquidityScore,
      trendDirection,
      priceChange24h: priceChange,
      volumeChange24h: volumeChange
    }
  })

  // Calculate market trends
  const marketTrends = enhancedCollections.reduce(
    (acc, collection) => ({
      totalVolume: acc.totalVolume + (collection.volume_24h || 0),
      avgFloorPrice: acc.avgFloorPrice + (collection.floor_price || 0),
      totalHolders: acc.totalHolders + (collection.unique_holders || 0),
      activeCollections: acc.activeCollections + (collection.volume_24h > 0 ? 1 : 0)
    }),
    { totalVolume: 0, avgFloorPrice: 0, totalHolders: 0, activeCollections: 0 }
  )

  // Adjust average floor price
  if (enhancedCollections.length > 0) {
    marketTrends.avgFloorPrice = marketTrends.avgFloorPrice / enhancedCollections.length
  }

  // Get top performers (top 5 by volume)
  const topPerformers = [...enhancedCollections]
    .sort((a, b) => (b.volume_24h || 0) - (a.volume_24h || 0))
    .slice(0, 5)

  // Refresh function
  const refreshData = useCallback(() => {
    refetch()
  }, [refetch])

  // Clear cache function
  const clearCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: ['enhanced-ordinals'] })
  }, [queryClient])

  // Health monitoring effect
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/system/hiro-health/')
        const health = await response.json()
        
        if (health.endpoints?.ordinals?.success && health.endpoints?.collections?.success) {
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

    const interval = setInterval(checkHealth, 180000) // Check every 3 minutes
    return () => clearInterval(interval)
  }, [])

  return {
    stats: queryData || null,
    collections: enhancedCollections,
    loading: isLoading || isFetching,
    error: isError ? (error as Error)?.message || 'Unknown error' : null,
    success: !!queryData,
    dataSource: queryData?.data_sources?.collections || 'unknown',
    lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
    refreshData,
    clearCache,
    healthStatus,
    topPerformers,
    marketTrends
  }
}

// Additional hooks for specific use cases

export function useCollectionDetails(collectionSlug: string) {
  return useQuery({
    queryKey: ['collection-details', collectionSlug],
    queryFn: async () => {
      const response = await fetch(`/api/ordinals/collections/${collectionSlug}/`)
      if (!response.ok) throw new Error('Failed to fetch collection details')
      return response.json()
    },
    enabled: !!collectionSlug,
    staleTime: 300000, // 5 minutes
    retry: 1
  })
}

export function useOrdinalsActivity(limit = 10) {
  return useQuery({
    queryKey: ['ordinals-activity', limit],
    queryFn: async () => {
      const response = await fetch(`/api/ordinals/activity/?limit=${limit}`)
      if (!response.ok) throw new Error('Failed to fetch ordinals activity')
      return response.json()
    },
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000, // 15 seconds
    retry: 2
  })
}

export function useFloorPriceHistory(collectionSlug: string, period = '7d') {
  return useQuery({
    queryKey: ['floor-price-history', collectionSlug, period],
    queryFn: async () => {
      const response = await fetch(`/api/ordinals/collections/${collectionSlug}/floor-history/?period=${period}`)
      if (!response.ok) throw new Error('Failed to fetch floor price history')
      return response.json()
    },
    enabled: !!collectionSlug,
    staleTime: 600000, // 10 minutes
    retry: 1
  })
}

// Export types
export type { CollectionData, OrdinalsStats, EnhancedOrdinalsOptions, EnhancedOrdinalsResponse }