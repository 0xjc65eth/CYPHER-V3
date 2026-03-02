import { StateCreator } from 'zustand'
import { RootState } from '../index'

export interface AssetPriceInfo {
  price: number
  priceChange24h: number
  volume24h: number
  marketCap: number
  lastUpdated: number
}

export interface AssetState {
  selectedAsset: { symbol: string; name?: string; address?: string } | null
  selectedAssetSymbol: string
  assetPrices: Record<string, AssetPriceInfo>
  isLoadingAssetData: boolean
  isLoadingAssetSwitch: boolean
  error: string | null
  lastAssetSwitch: number
  assetHistory: string[]
}

export interface AssetActions {
  setSelectedAsset: (payload: { asset?: AssetState['selectedAsset']; symbol?: string }) => void
  setAssetSwitchComplete: () => void
  setAssetPrice: (payload: { symbol: string; price: number; priceChange24h?: number; volume24h?: number; marketCap?: number }) => void
  setAssetPrices: (prices: Record<string, { price: number; priceChange24h?: number; volume24h?: number; marketCap?: number }>) => void
  setAssetDataLoading: (loading: boolean) => void
  setAssetError: (error: string) => void
  clearAssetError: () => void
  clearStaleAssetData: () => void
  resetAssetState: () => void
}

export interface AssetSlice {
  asset: AssetState
  setSelectedAsset: AssetActions['setSelectedAsset']
  setAssetSwitchComplete: AssetActions['setAssetSwitchComplete']
  setAssetPrice: AssetActions['setAssetPrice']
  setAssetPrices: AssetActions['setAssetPrices']
  setAssetDataLoading: AssetActions['setAssetDataLoading']
  setAssetError: AssetActions['setAssetError']
  clearAssetError: AssetActions['clearAssetError']
  clearStaleAssetData: AssetActions['clearStaleAssetData']
  resetAssetState: AssetActions['resetAssetState']
}

const initialAssetState: AssetState = {
  selectedAsset: null,
  selectedAssetSymbol: 'BTC',
  assetPrices: {},
  isLoadingAssetData: false,
  isLoadingAssetSwitch: false,
  error: null,
  lastAssetSwitch: 0,
  assetHistory: ['BTC'],
}

export const createAssetSlice: StateCreator<
  RootState,
  [['zustand/immer', never]],
  [],
  AssetSlice
> = (set) => ({
  asset: initialAssetState,

  setSelectedAsset: ({ asset, symbol }) => {
    set((state) => {
      state.asset.isLoadingAssetSwitch = true
      if (asset) {
        state.asset.selectedAsset = asset
        state.asset.selectedAssetSymbol = asset.symbol
      } else if (symbol) {
        state.asset.selectedAssetSymbol = symbol
      }
      const newSymbol = asset?.symbol || symbol
      if (newSymbol && !state.asset.assetHistory.includes(newSymbol)) {
        state.asset.assetHistory = [newSymbol, ...state.asset.assetHistory.slice(0, 9)]
      }
      state.asset.lastAssetSwitch = Date.now()
      state.asset.error = null
    })
  },

  setAssetSwitchComplete: () => {
    set((state) => {
      state.asset.isLoadingAssetSwitch = false
    })
  },

  setAssetPrice: ({ symbol, price, priceChange24h, volume24h, marketCap }) => {
    set((state) => {
      state.asset.assetPrices[symbol] = {
        price,
        priceChange24h: priceChange24h || 0,
        volume24h: volume24h || 0,
        marketCap: marketCap || 0,
        lastUpdated: Date.now(),
      }
    })
  },

  setAssetPrices: (prices) => {
    set((state) => {
      const timestamp = Date.now()
      Object.entries(prices).forEach(([symbol, data]) => {
        state.asset.assetPrices[symbol] = {
          price: data.price,
          priceChange24h: data.priceChange24h || 0,
          volume24h: data.volume24h || 0,
          marketCap: data.marketCap || 0,
          lastUpdated: timestamp,
        }
      })
    })
  },

  setAssetDataLoading: (loading) => {
    set((state) => {
      state.asset.isLoadingAssetData = loading
    })
  },

  setAssetError: (error) => {
    set((state) => {
      state.asset.error = error
      state.asset.isLoadingAssetData = false
      state.asset.isLoadingAssetSwitch = false
    })
  },

  clearAssetError: () => {
    set((state) => {
      state.asset.error = null
    })
  },

  clearStaleAssetData: () => {
    set((state) => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      Object.keys(state.asset.assetPrices).forEach((symbol) => {
        if (state.asset.assetPrices[symbol].lastUpdated < fiveMinutesAgo) {
          delete state.asset.assetPrices[symbol]
        }
      })
    })
  },

  resetAssetState: () => {
    set((state) => {
      state.asset = { ...initialAssetState }
    })
  },
})

// Redux-style selectors for backward compatibility
export const selectSelectedAsset = (state: RootState) => state.asset.selectedAsset
export const selectSelectedAssetSymbol = (state: RootState) => state.asset.selectedAssetSymbol
export const selectAssetPrices = (state: RootState) => state.asset.assetPrices
export const selectIsLoadingAssetData = (state: RootState) => state.asset.isLoadingAssetData
export const selectIsLoadingAssetSwitch = (state: RootState) => state.asset.isLoadingAssetSwitch
export const selectAssetError = (state: RootState) => state.asset.error
export const selectAssetHistory = (state: RootState) => state.asset.assetHistory
export const selectLastAssetSwitch = (state: RootState) => state.asset.lastAssetSwitch

// Parameterized selector for specific asset price
export const selectAssetPrice = (symbol: string) => (state: RootState) =>
  state.asset.assetPrices[symbol] || null

// Redux-style action creators for backward compatibility
// These return thunk-like functions that execute the store methods
let storeInstance: any = null

const getStore = () => {
  if (!storeInstance && typeof window !== 'undefined') {
    // Lazy load the store to avoid circular dependencies
    const { useStore } = require('../index')
    storeInstance = useStore
  }
  return storeInstance
}

// Action creators that return functions (for Redux-style dispatch compatibility)
export const setSelectedAsset = (payload: Parameters<AssetActions['setSelectedAsset']>[0]) => () => {
  getStore()?.getState().setSelectedAsset(payload)
}

export const setAssetSwitchComplete = () => () => {
  getStore()?.getState().setAssetSwitchComplete()
}

export const setAssetPrice = (payload: Parameters<AssetActions['setAssetPrice']>[0]) => () => {
  getStore()?.getState().setAssetPrice(payload)
}

export const setAssetPrices = (prices: Parameters<AssetActions['setAssetPrices']>[0]) => () => {
  getStore()?.getState().setAssetPrices(prices)
}

export const setAssetDataLoading = (loading: boolean) => () => {
  getStore()?.getState().setAssetDataLoading(loading)
}

export const setAssetError = (error: string) => () => {
  getStore()?.getState().setAssetError(error)
}

export const clearAssetError = () => () => {
  getStore()?.getState().clearAssetError()
}

export const clearStaleAssetData = () => () => {
  getStore()?.getState().clearStaleAssetData()
}
