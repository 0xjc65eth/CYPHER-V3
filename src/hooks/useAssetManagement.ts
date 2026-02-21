import { useCallback, useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  setSelectedAsset,
  setAssetSwitchComplete,
  setAssetPrice,
  setAssetPrices,
  setAssetDataLoading,
  setAssetError,
  clearAssetError,
  clearStaleAssetData,
  selectSelectedAsset,
  selectSelectedAssetSymbol,
  selectAssetPrice,
  selectAssetPrices,
  selectIsLoadingAssetData,
  selectIsLoadingAssetSwitch,
  selectAssetError,
  selectAssetHistory,
  selectLastAssetSwitch
} from '@/store/assetSlice'
import { Token } from '@/types/quickTrade'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { rateLimitedFetch } from '@/lib/rateLimitedFetch'

// Asset price fetching service
class AssetPriceService {
  private static readonly BASE_URL = typeof window !== 'undefined' ? '/api/coingecko' : 'https://api.coingecko.com/api/v3'
  
  static async fetchAssetPrice(symbol: string): Promise<{
    price: number
    priceChange24h: number
    volume24h: number
    marketCap: number
  }> {
    try {
      // Map symbol to CoinGecko ID
      const symbolToId: Record<string, string> = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'USDC': 'usd-coin',
        'USDT': 'tether',
        'BNB': 'binancecoin',
        'AVAX': 'avalanche-2',
        'MATIC': 'matic-network',
        'UNI': 'uniswap',
        'LINK': 'chainlink',
        'DOT': 'polkadot',
        'ADA': 'cardano',
        'DOGE': 'dogecoin',
        'LTC': 'litecoin',
        'XRP': 'ripple'
      }
      
      const coinId = symbolToId[symbol.toUpperCase()] || symbol.toLowerCase()

      const data = await rateLimitedFetch(
        `${this.BASE_URL}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
      )
      const coinData = data[coinId]
      
      if (!coinData) {
        throw new Error(`No data found for ${symbol}`)
      }
      
      return {
        price: coinData.usd || 0,
        priceChange24h: coinData.usd_24h_change || 0,
        volume24h: coinData.usd_24h_vol || 0,
        marketCap: coinData.usd_market_cap || 0
      }
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error)
      // Return fallback data when API is unavailable
      console.warn(`[AssetPriceService] API unavailable for ${symbol}, returning fallback data with zeroed values`)
      return this.getFallbackPriceData(symbol)
    }
  }

  static async fetchMultipleAssetPrices(symbols: string[]): Promise<Record<string, {
    price: number
    priceChange24h: number
    volume24h: number
    marketCap: number
  }>> {
    try {
      const symbolToId: Record<string, string> = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'USDC': 'usd-coin',
        'USDT': 'tether',
        'BNB': 'binancecoin',
        'AVAX': 'avalanche-2',
        'MATIC': 'matic-network'
      }

      const coinIds = symbols.map(symbol => symbolToId[symbol.toUpperCase()] || symbol.toLowerCase()).join(',')

      const data = await rateLimitedFetch(
        `${this.BASE_URL}/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
      )
      const result: Record<string, any> = {}

      symbols.forEach(symbol => {
        const coinId = symbolToId[symbol.toUpperCase()] || symbol.toLowerCase()
        const coinData = data[coinId]

        if (coinData) {
          result[symbol.toUpperCase()] = {
            price: coinData.usd || 0,
            priceChange24h: coinData.usd_24h_change || 0,
            volume24h: coinData.usd_24h_vol || 0,
            marketCap: coinData.usd_market_cap || 0
          }
        }
      })

      return result
    } catch (error) {
      console.error('Error fetching multiple prices:', error)
      // Return fallback data when API is unavailable
      console.warn(`[AssetPriceService] API unavailable for multiple assets, returning fallback data with zeroed values`)
      const result: Record<string, any> = {}
      symbols.forEach(symbol => {
        result[symbol.toUpperCase()] = this.getFallbackPriceData(symbol)
      })
      return result
    }
  }

  private static getFallbackPriceData(symbol: string) {
    const fallbackPrices: Record<string, any> = {
      BTC: { price: 0, priceChange24h: 0, volume24h: 0, marketCap: 0 },
      ETH: { price: 0, priceChange24h: 0, volume24h: 0, marketCap: 0 },
      SOL: { price: 0, priceChange24h: 0, volume24h: 0, marketCap: 0 },
      USDC: { price: 0, priceChange24h: 0, volume24h: 0, marketCap: 0 },
      USDT: { price: 0, priceChange24h: 0, volume24h: 0, marketCap: 0 }
    }

    return fallbackPrices[symbol.toUpperCase()] || { price: 0, priceChange24h: 0, volume24h: 0, marketCap: 0 }
  }
}

export function useAssetManagement() {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  
  // Selectors
  const selectedAsset = useAppSelector(selectSelectedAsset)
  const selectedAssetSymbol = useAppSelector(selectSelectedAssetSymbol)
  const assetPrices = useAppSelector(selectAssetPrices)
  const isLoadingAssetData = useAppSelector(selectIsLoadingAssetData)
  const isLoadingAssetSwitch = useAppSelector(selectIsLoadingAssetSwitch)
  const assetError = useAppSelector(selectAssetError)
  const assetHistory = useAppSelector(selectAssetHistory)
  const lastAssetSwitch = useAppSelector(selectLastAssetSwitch)
  
  // Get current asset price
  const currentAssetPrice = useAppSelector(selectAssetPrice(selectedAssetSymbol))
  
  // Asset price query with React Query for caching and background updates
  const { data: liveAssetPrice, isLoading: isLoadingLivePrice } = useQuery({
    queryKey: ['asset-price', selectedAssetSymbol],
    queryFn: () => AssetPriceService.fetchAssetPrice(selectedAssetSymbol),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
    enabled: !!selectedAssetSymbol,
    onSuccess: (data) => {
      dispatch(setAssetPrice({
        symbol: selectedAssetSymbol,
        ...data
      }))
    },
    onError: (error: any) => {
      dispatch(setAssetError(`Failed to fetch price for ${selectedAssetSymbol}: ${error.message}`))
    }
  })
  
  // Multiple assets price query for dashboard
  const popularAssets = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'BNB', 'AVAX', 'MATIC']
  const { data: multipleAssetPrices } = useQuery({
    queryKey: ['multiple-asset-prices', popularAssets],
    queryFn: () => AssetPriceService.fetchMultipleAssetPrices(popularAssets),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 45000,
    onSuccess: (data) => {
      dispatch(setAssetPrices(data))
    }
  })
  
  // Switch to new asset
  const switchAsset = useCallback(async (asset?: Token, symbol?: string) => {
    try {
      dispatch(clearAssetError())
      dispatch(setSelectedAsset({ asset, symbol }))
      
      const targetSymbol = asset?.symbol || symbol
      if (!targetSymbol) return
      
      // Invalidate and refetch queries for the new asset
      await queryClient.invalidateQueries(['asset-price', targetSymbol])
      
      // If we don't have recent price data, fetch it immediately
      const existingPrice = assetPrices[targetSymbol]
      const isStale = !existingPrice || (Date.now() - existingPrice.lastUpdated) > 60000
      
      if (isStale) {
        dispatch(setAssetDataLoading(true))
        try {
          const priceData = await AssetPriceService.fetchAssetPrice(targetSymbol)
          dispatch(setAssetPrice({
            symbol: targetSymbol,
            ...priceData
          }))
        } catch (error: any) {
          dispatch(setAssetError(`Failed to fetch price data: ${error.message}`))
        } finally {
          dispatch(setAssetDataLoading(false))
        }
      }
      
      dispatch(setAssetSwitchComplete())
    } catch (error: any) {
      dispatch(setAssetError(`Failed to switch asset: ${error.message}`))
      dispatch(setAssetSwitchComplete())
    }
  }, [dispatch, queryClient, assetPrices])
  
  // Refresh current asset data
  const refreshAssetData = useCallback(async () => {
    if (!selectedAssetSymbol) return
    
    try {
      dispatch(setAssetDataLoading(true))
      await queryClient.refetchQueries(['asset-price', selectedAssetSymbol])
    } catch (error: any) {
      dispatch(setAssetError(`Failed to refresh data: ${error.message}`))
    } finally {
      dispatch(setAssetDataLoading(false))
    }
  }, [selectedAssetSymbol, dispatch, queryClient])
  
  // Refresh multiple assets
  const refreshAllAssets = useCallback(async () => {
    try {
      dispatch(setAssetDataLoading(true))
      await queryClient.refetchQueries(['multiple-asset-prices'])
    } catch (error: any) {
      dispatch(setAssetError(`Failed to refresh all assets: ${error.message}`))
    } finally {
      dispatch(setAssetDataLoading(false))
    }
  }, [dispatch, queryClient])
  
  // Get asset by symbol
  const getAssetPrice = useCallback((symbol: string) => {
    return assetPrices[symbol]
  }, [assetPrices])
  
  // Check if asset data is fresh (less than 2 minutes old)
  const isAssetDataFresh = useCallback((symbol: string) => {
    const assetData = assetPrices[symbol]
    if (!assetData) return false
    return (Date.now() - assetData.lastUpdated) < 120000 // 2 minutes
  }, [assetPrices])
  
  // Clear error
  const clearError = useCallback(() => {
    dispatch(clearAssetError())
  }, [dispatch])
  
  // Cleanup stale data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(clearStaleAssetData())
    }, 300000) // Every 5 minutes
    
    return () => clearInterval(interval)
  }, [dispatch])
  
  // Memoized return object
  return useMemo(() => ({
    // State
    selectedAsset,
    selectedAssetSymbol,
    currentAssetPrice,
    assetPrices,
    assetHistory,
    isLoadingAssetData: isLoadingAssetData || isLoadingLivePrice,
    isLoadingAssetSwitch,
    assetError,
    lastAssetSwitch,
    
    // Actions
    switchAsset,
    refreshAssetData,
    refreshAllAssets,
    getAssetPrice,
    isAssetDataFresh,
    clearError,
    
    // Utilities
    isDataStale: (symbol: string) => !isAssetDataFresh(symbol),
    hasAssetData: (symbol: string) => !!assetPrices[symbol],
    getAssetDisplayPrice: (symbol: string) => {
      const price = assetPrices[symbol]?.price
      if (!price) return '$0.00'
      if (price < 0.01) return `$${price.toFixed(6)}`
      if (price < 1) return `$${price.toFixed(4)}`
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
  }), [
    selectedAsset,
    selectedAssetSymbol,
    currentAssetPrice,
    assetPrices,
    assetHistory,
    isLoadingAssetData,
    isLoadingLivePrice,
    isLoadingAssetSwitch,
    assetError,
    lastAssetSwitch,
    switchAsset,
    refreshAssetData,
    refreshAllAssets,
    getAssetPrice,
    isAssetDataFresh,
    clearError
  ])
}