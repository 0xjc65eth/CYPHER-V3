import { create, StateCreator } from 'zustand'
import { subscribeWithSelector, devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { createSelectors } from './selectors'
import { createWalletSlice, WalletSlice } from './slices/walletSlice'
import { createMarketSlice, MarketSlice } from './slices/marketSlice'
import { createUISlice, UISlice } from './slices/uiSlice'
import { createCacheSlice, CacheSlice } from './slices/cacheSlice'
import { createRealTimeSlice, RealTimeSlice } from './slices/realTimeSlice'
import { createSecuritySlice, SecuritySlice } from './slices/securitySlice'
import { createMiningSlice, MiningSlice } from './slices/miningSlice'
import { createMempoolSlice, MempoolSlice } from './slices/mempoolSlice'
import { createUserSlice, UserSlice } from './slices/userSlice'
import { createAssetSlice, AssetSlice } from './slices/assetSlice'

// Root state interface
// Using Omit to resolve conflicting property names between MarketSlice and RealTimeSlice
export interface RootState extends
  WalletSlice,
  MarketSlice,
  UISlice,
  CacheSlice,
  Omit<RealTimeSlice, 'updateRealTimeData' | 'updatePrices' | 'updateMarketData'>,
  SecuritySlice,
  MiningSlice,
  MempoolSlice,
  UserSlice,
  AssetSlice {
  // Re-declare conflicting members with any to allow both slices
  updateRealTimeData: (...args: any[]) => any;
  updatePrices: (...args: any[]) => any;
  updateMarketData: (...args: any[]) => any;
}

// Helper type for slice creator args
type SliceCreatorArgs = Parameters<StateCreator<RootState, [['zustand/immer', never]], []>>

// Create the main store with all middleware
export const useStore = create<RootState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((...a: SliceCreatorArgs) => ({
          ...createWalletSlice(...a),
          ...createMarketSlice(...a),
          ...createUISlice(...a),
          ...createCacheSlice(...a),
          ...createRealTimeSlice(...a),
          ...createSecuritySlice(...a),
          ...createMiningSlice(...a),
          ...createMempoolSlice(...a),
          ...createUserSlice(...a),
          ...createAssetSlice(...a),
        }))
      ),
      {
        name: 'cypher-ordi-store',
        partialize: (state) => ({
          // Only persist necessary state
          wallet: {
            lastConnectedAddress: state.wallet.address,
            preferences: state.wallet.preferences,
          },
          ui: {
            theme: state.ui.theme,
            sidebarCollapsed: state.ui.sidebarCollapsed,
            notifications: state.ui.notifications,
          },
          market: {
            watchlist: state.market.watchlist,
            preferences: state.market.preferences,
          },
        }),
        version: 1,
        migrate: (persistedState: any, version: number) => {
          // Handle state migrations
          if (version === 0) {
            // Migration from version 0 to 1
            return {
              ...persistedState,
              // Add migration logic here
            }
          }
          return persistedState
        },
      }
    ),
    {
      name: 'cypher-ordi-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)

// Create selectors for performance optimization
export const useStoreSelectors = createSelectors(useStore)

// Export typed hooks
export type StoreState = ReturnType<typeof useStore.getState>
export type StoreActions = ReturnType<typeof useStore.getState>

// Performance-optimized hooks
export const useWalletAddress = () => useStore(state => state.wallet.address)
export const useWalletBalance = () => useStore(state => state.wallet.balance)
export const useWalletConnected = () => useStore(state => state.wallet.connected)
export const useWalletLoading = () => useStore(state => state.wallet.loading)

export const useMarketData = () => useStore(state => state.market.data)
export const useMarketPrices = () => useStore(state => state.market.prices)
export const useMarketLoading = () => useStore(state => state.market.loading)

export const useUITheme = () => useStore(state => state.ui.theme)
export const useUISidebar = () => useStore(state => state.ui.sidebarCollapsed)
export const useUINotifications = () => useStore(state => state.ui.notifications)

export const useRealTimeConnected = () => useStore(state => state.realTime.connected)
export const useRealTimeData = () => useStore(state => state.realTime.data)

// Computed selectors
export const useComputedBalance = () => useStore(state => {
  const { balance, ordinals, runes } = state.wallet
  return {
    total: balance + (ordinals?.reduce((sum, ord) => sum + ord.value, 0) || 0),
    bitcoin: balance,
    ordinals: ordinals?.reduce((sum, ord) => sum + ord.value, 0) || 0,
    runes: runes?.length || 0,
  }
})

export const useMarketSummary = () => useStore(state => {
  const { data, prices } = state.market
  return {
    btcPrice: prices.BTC?.price || 0,
    btcChange: prices.BTC?.change24h || 0,
    totalMarketCap: data?.totalMarketCap || 0,
    dominance: data?.btcDominance || 0,
    volume24h: data?.volume24h || 0,
  }
})

// Action creators for complex operations
export const useStoreActions = () => {
  const store = useStore.getState()
  
  return {
    // Wallet actions
    connectWallet: store.connectWallet,
    disconnectWallet: store.disconnectWallet,
    updateBalance: store.updateWalletBalance,
    
    // Market actions
    updateMarketData: store.updateMarketData,
    updatePrices: store.updatePrices,
    addToWatchlist: store.addToWatchlist,
    
    // UI actions
    toggleSidebar: store.toggleSidebar,
    setTheme: store.setTheme,
    addNotification: store.addNotification,
    
    // Real-time actions
    connectRealTime: store.connectRealTime,
    disconnectRealTime: store.disconnectRealTime,
    updateRealTimeData: store.updateRealTimeData,
    
    // Cache actions
    setCacheData: store.setCacheData,
    getCacheData: store.getCacheData,
    clearCache: store.clearCache,
    
    // Security actions
    updateSecurityStatus: store.updateSecurityStatus,
    logSecurityEvent: store.logSecurityEvent,
  }
}

// Store utilities
export const getStoreSnapshot = () => useStore.getState()

export const subscribeToWalletChanges = (callback: (state: any) => void) => {
  return useStore.subscribe(
    (state) => state.wallet,
    callback,
    { fireImmediately: true }
  )
}

export const subscribeToMarketChanges = (callback: (state: any) => void) => {
  return useStore.subscribe(
    (state) => state.market,
    callback,
    { fireImmediately: true }
  )
}

export const subscribeToRealTimeChanges = (callback: (state: any) => void) => {
  return useStore.subscribe(
    (state) => state.realTime,
    callback,
    { fireImmediately: true }
  )
}

// Store debugging utilities (development only)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).store = useStore;
  (window as any).getStoreState = () => useStore.getState();
  (window as any).storeActions = useStoreActions;
}

export default useStore