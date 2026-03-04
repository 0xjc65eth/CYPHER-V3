/**
 * Enhanced Asset Switch Cache Management
 * Handles cache invalidation and refresh when switching between assets
 */

import { QueryClient } from '@tanstack/react-query'

export class AssetSwitchCacheManager {
  private queryClient: QueryClient
  private activeAsset: string | null = null
  private cacheTimestamps: Map<string, number> = new Map()
  private readonly CACHE_DURATION = 30000 // 30 seconds
  private readonly STALE_TIME = 20000 // 20 seconds
  
  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient
  }
  
  /**
   * Switch to a new asset and handle cache accordingly
   */
  async switchToAsset(newAsset: string): Promise<void> {
    const previousAsset = this.activeAsset
    this.activeAsset = newAsset
    
    
    // Invalidate queries related to the new asset
    await this.invalidateAssetQueries(newAsset)
    
    // If we have cached data for this asset, check if it's fresh
    const lastUpdate = this.cacheTimestamps.get(newAsset)
    const now = Date.now()
    
    if (!lastUpdate || (now - lastUpdate) > this.STALE_TIME) {
      // Data is stale or doesn't exist, fetch fresh data
      await this.fetchFreshAssetData(newAsset)
    }
    
    // Clean up old cache entries
    this.cleanupStaleCache()
  }
  
  /**
   * Invalidate all queries related to a specific asset
   */
  private async invalidateAssetQueries(asset: string): Promise<void> {
    const queriesToInvalidate = [
      ['asset-price', asset],
      ['asset-chart', asset],
      ['asset-volume', asset],
      ['asset-market-data', asset],
      ['trading-pairs', asset],
      ['order-book', asset],
      ['recent-trades', asset]
    ]
    
    await Promise.all(
      queriesToInvalidate.map(queryKey => 
        this.queryClient.invalidateQueries({ queryKey })
      )
    )
  }
  
  /**
   * Fetch fresh data for an asset
   */
  private async fetchFreshAssetData(asset: string): Promise<void> {
    try {
      // Prefetch critical data for the new asset
      const criticalQueries = [
        ['asset-price', asset],
        ['asset-market-data', asset]
      ]
      
      await Promise.all(
        criticalQueries.map(queryKey => 
          this.queryClient.prefetchQuery({
            queryKey,
            staleTime: this.STALE_TIME
          })
        )
      )
      
      // Update timestamp
      this.cacheTimestamps.set(asset, Date.now())
      
    } catch (error) {
      console.error(`❌ Failed to fetch fresh data for ${asset}:`, error)
    }
  }
  
  /**
   * Remove all cached data for an asset
   */
  async clearAssetCache(asset: string): Promise<void> {
    const assetQueries = this.queryClient.getQueryCache()
      .findAll()
      .filter(query => {
        const queryKey = query.queryKey
        return Array.isArray(queryKey) && queryKey.includes(asset)
      })
    
    assetQueries.forEach(query => {
      this.queryClient.removeQueries({ queryKey: query.queryKey })
    })
    
    this.cacheTimestamps.delete(asset)
  }
  
  /**
   * Clean up stale cache entries
   */
  private cleanupStaleCache(): void {
    const now = Date.now()
    const staleAssets: string[] = []
    
    this.cacheTimestamps.forEach((timestamp, asset) => {
      if ((now - timestamp) > this.CACHE_DURATION) {
        staleAssets.push(asset)
      }
    })
    
    staleAssets.forEach(asset => {
      this.cacheTimestamps.delete(asset)
    })
    
    if (staleAssets.length > 0) {
    }
  }
  
  /**
   * Force refresh all data for current asset
   */
  async refreshCurrentAsset(): Promise<void> {
    if (!this.activeAsset) return
    
    await this.invalidateAssetQueries(this.activeAsset)
    await this.fetchFreshAssetData(this.activeAsset)
  }
  
  /**
   * Preload data for multiple assets (useful for dashboard)
   */
  async preloadAssets(assets: string[]): Promise<void> {
    const preloadPromises = assets.map(async (asset) => {
      try {
        await this.queryClient.prefetchQuery({
          queryKey: ['asset-price', asset],
          staleTime: this.STALE_TIME
        })
        this.cacheTimestamps.set(asset, Date.now())
      } catch (error) {
        console.error(`Failed to preload ${asset}:`, error)
      }
    })
    
    await Promise.all(preloadPromises)
  }
  
  /**
   * Check if asset data is fresh
   */
  isAssetDataFresh(asset: string): boolean {
    const timestamp = this.cacheTimestamps.get(asset)
    if (!timestamp) return false
    
    return (Date.now() - timestamp) < this.STALE_TIME
  }
  
  /**
   * Get cache status for debugging
   */
  getCacheStatus(): {
    activeAsset: string | null
    cachedAssets: string[]
    freshAssets: string[]
    staleAssets: string[]
  } {
    const now = Date.now()
    const cachedAssets = Array.from(this.cacheTimestamps.keys())
    const freshAssets: string[] = []
    const staleAssets: string[] = []
    
    cachedAssets.forEach(asset => {
      const timestamp = this.cacheTimestamps.get(asset)!
      if ((now - timestamp) < this.STALE_TIME) {
        freshAssets.push(asset)
      } else {
        staleAssets.push(asset)
      }
    })
    
    return {
      activeAsset: this.activeAsset,
      cachedAssets,
      freshAssets,
      staleAssets
    }
  }
  
  /**
   * Set up automatic cache cleanup
   */
  startAutomaticCleanup(intervalMs: number = 60000): () => void {
    const interval = setInterval(() => {
      this.cleanupStaleCache()
    }, intervalMs)
    
    return () => clearInterval(interval)
  }
}

// React Query utilities for asset switching
export const createAssetSwitchQueryOptions = (asset: string) => ({
  queryKey: ['asset-price', asset],
  staleTime: 20000, // 20 seconds
  cacheTime: 300000, // 5 minutes
  refetchInterval: 30000, // 30 seconds
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000)
})

// Asset data invalidation helpers
export const invalidateAssetQueries = async (
  queryClient: QueryClient, 
  asset: string
): Promise<void> => {
  const patterns = [
    ['asset-price', asset],
    ['asset-chart', asset],
    ['asset-volume', asset],
    ['trading-data', asset]
  ]
  
  await Promise.all(
    patterns.map(pattern => 
      queryClient.invalidateQueries({ queryKey: pattern })
    )
  )
}

// Smart cache prefetching for asset switching
export const prefetchAssetData = async (
  queryClient: QueryClient,
  asset: string,
  fetchFn: (asset: string) => Promise<any>
): Promise<void> => {
  await queryClient.prefetchQuery({
    queryKey: ['asset-price', asset],
    queryFn: () => fetchFn(asset),
    staleTime: 20000,
    gcTime: 300000
  })
}

// Cache warming for popular assets
export const warmupAssetCache = async (
  queryClient: QueryClient,
  assets: string[],
  fetchFn: (asset: string) => Promise<any>
): Promise<void> => {
  const warmupPromises = assets.map(asset =>
    queryClient.prefetchQuery({
      queryKey: ['asset-price', asset],
      queryFn: () => fetchFn(asset),
      staleTime: 30000
    }).catch(error => {
    })
  )
  
  await Promise.allSettled(warmupPromises)
}

export default AssetSwitchCacheManager