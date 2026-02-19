'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppDispatch, useAppSelector } from '@/store'
import { 
  setSelectedAsset, 
  setAssetSwitchComplete,
  selectSelectedAssetSymbol,
  selectIsLoadingAssetSwitch,
  selectLastAssetSwitch
} from '@/store/assetSlice'
import { AssetSwitchCacheManager } from '@/lib/cache/assetSwitchCache'
import { Token } from '@/types/quickTrade'

interface AssetSwitchContextType {
  // Current state
  selectedAsset: string
  isLoadingSwitch: boolean
  lastSwitchTime: number
  
  // Actions
  switchAsset: (asset?: Token, symbol?: string) => Promise<void>
  refreshCurrentAsset: () => Promise<void>
  preloadAssets: (assets: string[]) => Promise<void>
  
  // Cache utilities
  isAssetDataFresh: (asset: string) => boolean
  getCacheStatus: () => any
  clearAssetCache: (asset: string) => Promise<void>
  
  // Event listeners
  onAssetSwitch: (callback: (newAsset: string, oldAsset: string) => void) => () => void
  onAssetDataRefresh: (callback: (asset: string) => void) => () => void
}

const AssetSwitchContext = createContext<AssetSwitchContextType | undefined>(undefined)

interface AssetSwitchProviderProps {
  children: React.ReactNode
  defaultAsset?: string
  preloadAssets?: string[]
  enableAutoRefresh?: boolean
  refreshInterval?: number
}

export function AssetSwitchProvider({
  children,
  defaultAsset = 'BTC',
  preloadAssets = ['BTC', 'ETH', 'SOL', 'USDC'],
  enableAutoRefresh = true,
  refreshInterval = 30000
}: AssetSwitchProviderProps) {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  
  // Redux state
  const selectedAsset = useAppSelector(selectSelectedAssetSymbol)
  const isLoadingSwitch = useAppSelector(selectIsLoadingAssetSwitch)
  const lastSwitchTime = useAppSelector(selectLastAssetSwitch)
  
  // Local state
  const [cacheManager] = useState(() => new AssetSwitchCacheManager(queryClient))
  const [switchListeners, setSwitchListeners] = useState<Set<(newAsset: string, oldAsset: string) => void>>(new Set())
  const [refreshListeners, setRefreshListeners] = useState<Set<(asset: string) => void>>(new Set())
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Initialize default asset
  useEffect(() => {
    if (!isInitialized && !selectedAsset) {
      dispatch(setSelectedAsset({ symbol: defaultAsset }))
      setIsInitialized(true)
    }
  }, [dispatch, defaultAsset, selectedAsset, isInitialized])
  
  // Preload assets on mount
  useEffect(() => {
    if (preloadAssets.length > 0) {
      cacheManager.preloadAssets(preloadAssets).catch(console.error)
    }
  }, [cacheManager, preloadAssets])
  
  // Auto refresh current asset
  useEffect(() => {
    if (!enableAutoRefresh || !selectedAsset) return
    
    const interval = setInterval(async () => {
      try {
        await cacheManager.refreshCurrentAsset()
        refreshListeners.forEach(listener => listener(selectedAsset))
      } catch (error) {
        console.error('Auto refresh failed:', error)
      }
    }, refreshInterval)
    
    return () => clearInterval(interval)
  }, [enableAutoRefresh, refreshInterval, selectedAsset, cacheManager, refreshListeners])
  
  // Switch asset implementation
  const switchAsset = useCallback(async (asset?: Token, symbol?: string) => {
    const newAsset = asset?.symbol || symbol
    if (!newAsset || newAsset === selectedAsset) return
    
    const oldAsset = selectedAsset
    
    try {
      // Update Redux state to show loading
      dispatch(setSelectedAsset({ asset, symbol }))
      
      // Handle cache switching
      await cacheManager.switchToAsset(newAsset)
      
      // Notify listeners
      switchListeners.forEach(listener => listener(newAsset, oldAsset))
      
      // Complete the switch
      dispatch(setAssetSwitchComplete())
      
    } catch (error: any) {
      console.error(`❌ Asset switch failed: ${oldAsset} → ${newAsset}`, error)
      
      // Revert to previous asset on error
      if (oldAsset) {
        dispatch(setSelectedAsset({ symbol: oldAsset }))
      }
      dispatch(setAssetSwitchComplete())
      
      throw error
    }
  }, [selectedAsset, dispatch, cacheManager, switchListeners])
  
  // Refresh current asset
  const refreshCurrentAsset = useCallback(async () => {
    if (!selectedAsset) return
    
    try {
      await cacheManager.refreshCurrentAsset()
      refreshListeners.forEach(listener => listener(selectedAsset))
    } catch (error) {
      console.error(`❌ Failed to refresh ${selectedAsset}:`, error)
      throw error
    }
  }, [selectedAsset, cacheManager, refreshListeners])
  
  // Preload multiple assets
  const preloadAssetsFunc = useCallback(async (assets: string[]) => {
    try {
      await cacheManager.preloadAssets(assets)
    } catch (error) {
      console.error('❌ Failed to preload assets:', error)
      throw error
    }
  }, [cacheManager])
  
  // Check if asset data is fresh
  const isAssetDataFresh = useCallback((asset: string) => {
    return cacheManager.isAssetDataFresh(asset)
  }, [cacheManager])
  
  // Get cache status
  const getCacheStatus = useCallback(() => {
    return cacheManager.getCacheStatus()
  }, [cacheManager])
  
  // Clear asset cache
  const clearAssetCache = useCallback(async (asset: string) => {
    await cacheManager.clearAssetCache(asset)
  }, [cacheManager])
  
  // Event listener management
  const onAssetSwitch = useCallback((callback: (newAsset: string, oldAsset: string) => void) => {
    setSwitchListeners(prev => new Set(prev).add(callback))
    
    return () => {
      setSwitchListeners(prev => {
        const newSet = new Set(prev)
        newSet.delete(callback)
        return newSet
      })
    }
  }, [])
  
  const onAssetDataRefresh = useCallback((callback: (asset: string) => void) => {
    setRefreshListeners(prev => new Set(prev).add(callback))
    
    return () => {
      setRefreshListeners(prev => {
        const newSet = new Set(prev)
        newSet.delete(callback)
        return newSet
      })
    }
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return cacheManager.startAutomaticCleanup()
  }, [cacheManager])
  
  // Context value
  const contextValue = useMemo<AssetSwitchContextType>(() => ({
    // State
    selectedAsset,
    isLoadingSwitch,
    lastSwitchTime,
    
    // Actions
    switchAsset,
    refreshCurrentAsset,
    preloadAssets: preloadAssetsFunc,
    
    // Cache utilities
    isAssetDataFresh,
    getCacheStatus,
    clearAssetCache,
    
    // Event listeners
    onAssetSwitch,
    onAssetDataRefresh
  }), [
    selectedAsset,
    isLoadingSwitch,
    lastSwitchTime,
    switchAsset,
    refreshCurrentAsset,
    preloadAssetsFunc,
    isAssetDataFresh,
    getCacheStatus,
    clearAssetCache,
    onAssetSwitch,
    onAssetDataRefresh
  ])
  
  return (
    <AssetSwitchContext.Provider value={contextValue}>
      {children}
    </AssetSwitchContext.Provider>
  )
}

// Hook to use asset switching
export function useAssetSwitch() {
  const context = useContext(AssetSwitchContext)
  if (context === undefined) {
    throw new Error('useAssetSwitch must be used within an AssetSwitchProvider')
  }
  return context
}

// Helper hook for asset switching with loading states
export function useAssetSwitchWithStates() {
  const assetSwitch = useAssetSwitch()
  const [isSwitching, setIsSwitching] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)
  
  const switchAssetWithStates = useCallback(async (asset?: Token, symbol?: string) => {
    setIsSwitching(true)
    setSwitchError(null)
    
    try {
      await assetSwitch.switchAsset(asset, symbol)
    } catch (error: any) {
      setSwitchError(error.message || 'Failed to switch asset')
      throw error
    } finally {
      setIsSwitching(false)
    }
  }, [assetSwitch])
  
  const clearError = useCallback(() => {
    setSwitchError(null)
  }, [])
  
  return {
    ...assetSwitch,
    switchAsset: switchAssetWithStates,
    isSwitching: isSwitching || assetSwitch.isLoadingSwitch,
    switchError,
    clearError
  }
}

export default AssetSwitchProvider