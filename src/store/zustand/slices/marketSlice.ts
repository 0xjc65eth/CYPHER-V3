import { StateCreator } from 'zustand'
import { RootState } from '../index'

export interface MarketData {
  // Main market data
  btcPrice: number
  btcChange24h: number
  btcVolume24h: number
  btcMarketCap: number
  btcDominance: number
  
  // Alternative markets
  ethPrice: number
  ethChange24h: number
  solPrice: number
  solChange24h: number
  
  // Market indices
  fearGreedIndex: number
  totalMarketCap: number
  volume24h: number
  marketCapChange24h: number
  
  // Mining data
  hashrate: number
  difficulty: number
  nextDifficultyAdjustment: number
  blockHeight: number
  avgBlockTime: number
  
  // Mempool data
  mempoolSize: number
  mempoolFees: {
    low: number
    medium: number
    high: number
  }
  pendingTransactions: number
  
  // Lightning Network
  lightningCapacity: number
  lightningNodes: number
  lightningChannels: number
  
  // Ordinals & Runes
  ordinalsVolume24h: number
  runesVolume24h: number
  inscriptionsToday: number
  
  // Timestamps
  lastUpdated: number
  lastPriceUpdate: number
  lastMiningUpdate: number
  lastMempoolUpdate: number
}

export interface PriceData {
  [symbol: string]: {
    price: number
    change24h: number
    volume24h: number
    marketCap: number
    lastUpdated: number
  }
}

export interface MarketState {
  // Data
  data: MarketData
  prices: PriceData
  watchlist: string[]
  
  // Loading states
  loading: {
    prices: boolean
    market: boolean
    mining: boolean
    mempool: boolean
    ordinals: boolean
  }
  
  // Error handling
  error: string | null
  lastError: {
    message: string
    timestamp: number
    source: string
  } | null
  
  // Preferences
  preferences: {
    currency: 'USD' | 'BTC' | 'EUR'
    priceAlerts: Array<{
      id: string
      symbol: string
      type: 'above' | 'below'
      price: number
      enabled: boolean
    }>
    refreshInterval: number
    showTestnetData: boolean
  }
  
  // Real-time data
  realTimeUpdates: {
    enabled: boolean
    lastUpdate: number
    updateCount: number
  }
  
  // Historical data cache
  priceHistory: {
    [symbol: string]: Array<{
      timestamp: number
      price: number
      volume: number
    }>
  }
}

export interface MarketActions {
  // Data updates
  updateMarketData: (data: Partial<MarketData>) => void
  updatePrices: (prices: Partial<PriceData>) => void
  updatePrice: (symbol: string, price: number, change24h?: number, volume24h?: number, marketCap?: number) => void
  
  // Watchlist management
  addToWatchlist: (symbol: string) => void
  removeFromWatchlist: (symbol: string) => void
  clearWatchlist: () => void
  
  // Loading states
  setMarketLoading: (key: keyof MarketState['loading'], loading: boolean) => void
  setMarketError: (error: string | null, source?: string) => void
  
  // Preferences
  updateMarketPreferences: (preferences: Partial<MarketState['preferences']>) => void
  addPriceAlert: (alert: MarketState['preferences']['priceAlerts'][0]) => void
  removePriceAlert: (id: string) => void
  
  // Real-time updates
  enableRealTimeUpdates: () => void
  disableRealTimeUpdates: () => void
  updateRealTimeData: (data: Partial<MarketData>) => void
  
  // Historical data
  addPriceHistory: (symbol: string, data: { timestamp: number; price: number; volume: number }) => void
  clearPriceHistory: (symbol?: string) => void
  
  // Refresh actions
  refreshMarketData: () => Promise<void>
  refreshPrices: () => Promise<void>
}

export interface MarketSlice {
  market: MarketState
  updateMarketData: MarketActions['updateMarketData']
  updatePrices: MarketActions['updatePrices']
  updatePrice: MarketActions['updatePrice']
  addToWatchlist: MarketActions['addToWatchlist']
  removeFromWatchlist: MarketActions['removeFromWatchlist']
  clearWatchlist: MarketActions['clearWatchlist']
  setMarketLoading: MarketActions['setMarketLoading']
  setMarketError: MarketActions['setMarketError']
  updateMarketPreferences: MarketActions['updateMarketPreferences']
  addPriceAlert: MarketActions['addPriceAlert']
  removePriceAlert: MarketActions['removePriceAlert']
  enableRealTimeUpdates: MarketActions['enableRealTimeUpdates']
  disableRealTimeUpdates: MarketActions['disableRealTimeUpdates']
  updateRealTimeData: MarketActions['updateRealTimeData']
  addPriceHistory: MarketActions['addPriceHistory']
  clearPriceHistory: MarketActions['clearPriceHistory']
  refreshMarketData: MarketActions['refreshMarketData']
  refreshPrices: MarketActions['refreshPrices']
}

const initialMarketData: MarketData = {
  btcPrice: 0,
  btcChange24h: 0,
  btcVolume24h: 0,
  btcMarketCap: 0,
  btcDominance: 0,
  ethPrice: 0,
  ethChange24h: 0,
  solPrice: 0,
  solChange24h: 0,
  fearGreedIndex: 50,
  totalMarketCap: 0,
  volume24h: 0,
  marketCapChange24h: 0,
  hashrate: 0,
  difficulty: 0,
  nextDifficultyAdjustment: 0,
  blockHeight: 0,
  avgBlockTime: 600,
  mempoolSize: 0,
  mempoolFees: {
    low: 1,
    medium: 5,
    high: 10,
  },
  pendingTransactions: 0,
  lightningCapacity: 0,
  lightningNodes: 0,
  lightningChannels: 0,
  ordinalsVolume24h: 0,
  runesVolume24h: 0,
  inscriptionsToday: 0,
  lastUpdated: 0,
  lastPriceUpdate: 0,
  lastMiningUpdate: 0,
  lastMempoolUpdate: 0,
}

const initialMarketState: MarketState = {
  data: initialMarketData,
  prices: {},
  watchlist: ['BTC', 'ETH', 'SOL'],
  loading: {
    prices: false,
    market: false,
    mining: false,
    mempool: false,
    ordinals: false,
  },
  error: null,
  lastError: null,
  preferences: {
    currency: 'USD',
    priceAlerts: [],
    refreshInterval: 30000,
    showTestnetData: false,
  },
  realTimeUpdates: {
    enabled: false,
    lastUpdate: 0,
    updateCount: 0,
  },
  priceHistory: {},
}

export const createMarketSlice: StateCreator<
  RootState,
  [],
  [],
  MarketSlice
> = (set, get) => ({
  market: initialMarketState,
  
  updateMarketData: (data: Partial<MarketData>) => {
    set((state) => {
      state.market.data = { ...state.market.data, ...data }
      state.market.data.lastUpdated = Date.now()
      state.market.error = null
    })
  },
  
  updatePrices: (prices: Partial<PriceData>) => {
    set((state) => {
      const timestamp = Date.now()
      
      Object.entries(prices).forEach(([symbol, priceData]) => {
        state.market.prices[symbol] = {
          ...priceData,
          lastUpdated: timestamp,
        }
        
        // Update main data if BTC
        if (symbol === 'BTC') {
          state.market.data.btcPrice = priceData.price
          state.market.data.btcChange24h = priceData.change24h
          state.market.data.btcVolume24h = priceData.volume24h
          state.market.data.btcMarketCap = priceData.marketCap
        }
        
        // Add to price history
        if (!state.market.priceHistory[symbol]) {
          state.market.priceHistory[symbol] = []
        }
        
        state.market.priceHistory[symbol].push({
          timestamp,
          price: priceData.price,
          volume: priceData.volume24h,
        })
        
        // Keep only last 1000 entries
        if (state.market.priceHistory[symbol].length > 1000) {
          state.market.priceHistory[symbol] = state.market.priceHistory[symbol].slice(-1000)
        }
      })
      
      state.market.data.lastPriceUpdate = timestamp
      state.market.error = null
    })
  },
  
  updatePrice: (symbol: string, price: number, change24h = 0, volume24h = 0, marketCap = 0) => {
    const priceData = { price, change24h, volume24h, marketCap }
    get().updatePrices({ [symbol]: priceData })
  },
  
  addToWatchlist: (symbol: string) => {
    set((state) => {
      if (!state.market.watchlist.includes(symbol)) {
        state.market.watchlist.push(symbol)
      }
    })
  },
  
  removeFromWatchlist: (symbol: string) => {
    set((state) => {
      state.market.watchlist = state.market.watchlist.filter(s => s !== symbol)
    })
  },
  
  clearWatchlist: () => {
    set((state) => {
      state.market.watchlist = []
    })
  },
  
  setMarketLoading: (key: keyof MarketState['loading'], loading: boolean) => {
    set((state) => {
      state.market.loading[key] = loading
    })
  },
  
  setMarketError: (error: string | null, source = 'unknown') => {
    set((state) => {
      state.market.error = error
      if (error) {
        state.market.lastError = {
          message: error,
          timestamp: Date.now(),
          source,
        }
      }
    })
  },
  
  updateMarketPreferences: (preferences: Partial<MarketState['preferences']>) => {
    set((state) => {
      state.market.preferences = { ...state.market.preferences, ...preferences }
    })
  },
  
  addPriceAlert: (alert: MarketState['preferences']['priceAlerts'][0]) => {
    set((state) => {
      state.market.preferences.priceAlerts.push(alert)
    })
  },
  
  removePriceAlert: (id: string) => {
    set((state) => {
      state.market.preferences.priceAlerts = state.market.preferences.priceAlerts.filter(
        alert => alert.id !== id
      )
    })
  },
  
  enableRealTimeUpdates: () => {
    set((state) => {
      state.market.realTimeUpdates.enabled = true
    })
  },
  
  disableRealTimeUpdates: () => {
    set((state) => {
      state.market.realTimeUpdates.enabled = false
    })
  },
  
  updateRealTimeData: (data: Partial<MarketData>) => {
    set((state) => {
      if (state.market.realTimeUpdates.enabled) {
        state.market.data = { ...state.market.data, ...data }
        state.market.realTimeUpdates.lastUpdate = Date.now()
        state.market.realTimeUpdates.updateCount++
      }
    })
  },
  
  addPriceHistory: (symbol: string, data: { timestamp: number; price: number; volume: number }) => {
    set((state) => {
      if (!state.market.priceHistory[symbol]) {
        state.market.priceHistory[symbol] = []
      }
      
      state.market.priceHistory[symbol].push(data)
      
      // Keep only last 1000 entries
      if (state.market.priceHistory[symbol].length > 1000) {
        state.market.priceHistory[symbol] = state.market.priceHistory[symbol].slice(-1000)
      }
    })
  },
  
  clearPriceHistory: (symbol?: string) => {
    set((state) => {
      if (symbol) {
        delete state.market.priceHistory[symbol]
      } else {
        state.market.priceHistory = {}
      }
    })
  },
  
  refreshMarketData: async () => {
    try {
      set((state) => {
        state.market.loading.market = true
        state.market.error = null
      })

      // Fetch real market data from APIs in parallel
      const [priceRes, fngRes, mempoolRes] = await Promise.allSettled([
        fetch('/api/coingecko/?endpoint=/simple/price&params=' + encodeURIComponent('ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true')),
        fetch('https://api.alternative.me/fng/?limit=1'),
        fetch('/api/mempool/'),
      ])

      const priceData = priceRes.status === 'fulfilled' && priceRes.value.ok
        ? await priceRes.value.json() : null
      const fngData = fngRes.status === 'fulfilled' && fngRes.value.ok
        ? await fngRes.value.json() : null
      const mempoolData = mempoolRes.status === 'fulfilled' && mempoolRes.value.ok
        ? await mempoolRes.value.json() : null

      const marketUpdate: Partial<MarketData> = {
        lastUpdated: Date.now(),
      }

      // Price data from CoinGecko
      if (priceData?.bitcoin) {
        marketUpdate.btcPrice = priceData.bitcoin.usd || 0
        marketUpdate.btcChange24h = priceData.bitcoin.usd_24h_change || 0
        marketUpdate.btcVolume24h = priceData.bitcoin.usd_24h_vol || 0
        marketUpdate.btcMarketCap = priceData.bitcoin.usd_market_cap || 0
      }
      if (priceData?.ethereum) {
        marketUpdate.ethPrice = priceData.ethereum.usd || 0
        marketUpdate.ethChange24h = priceData.ethereum.usd_24h_change || 0
      }
      if (priceData?.solana) {
        marketUpdate.solPrice = priceData.solana.usd || 0
        marketUpdate.solChange24h = priceData.solana.usd_24h_change || 0
      }

      // Fear & Greed Index
      if (fngData?.data?.[0]) {
        marketUpdate.fearGreedIndex = parseInt(fngData.data[0].value) || 50
      }

      // Mempool data
      if (mempoolData) {
        const mp = mempoolData.data || mempoolData
        if (mp.count !== undefined) marketUpdate.pendingTransactions = mp.count
        if (mp.vsize !== undefined) marketUpdate.mempoolSize = mp.vsize
      }

      get().updateMarketData(marketUpdate)

    } catch (error: any) {
      get().setMarketError(error.message || 'Failed to refresh market data', 'refreshMarketData')
    } finally {
      set((state) => {
        state.market.loading.market = false
      })
    }
  },
  
  refreshPrices: async () => {
    const { watchlist } = get().market

    try {
      set((state) => {
        state.market.loading.prices = true
      })

      // Map common symbols to CoinGecko IDs
      const symbolToId: Record<string, string> = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'DOGE': 'dogecoin',
        'ADA': 'cardano',
        'DOT': 'polkadot',
        'AVAX': 'avalanche-2',
        'MATIC': 'matic-network',
        'LINK': 'chainlink',
        'UNI': 'uniswap',
        'XRP': 'ripple',
        'BNB': 'binancecoin',
        'LTC': 'litecoin',
      }

      const ids = watchlist
        .map(s => symbolToId[s] || s.toLowerCase())
        .join(',')

      const response = await fetch(
        '/api/coingecko/?endpoint=/simple/price&params=' +
        encodeURIComponent(`ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`)
      )

      if (!response.ok) throw new Error('Failed to fetch prices')

      const data = await response.json()

      // Build reverse map: coingecko id -> symbol
      const idToSymbol: Record<string, string> = {}
      for (const [symbol, id] of Object.entries(symbolToId)) {
        idToSymbol[id] = symbol
      }

      const prices: PriceData = {}
      for (const [id, values] of Object.entries(data)) {
        const symbol = idToSymbol[id] || id.toUpperCase()
        const v = values as any
        if (watchlist.includes(symbol)) {
          prices[symbol] = {
            price: v.usd || 0,
            change24h: v.usd_24h_change || 0,
            volume24h: v.usd_24h_vol || 0,
            marketCap: v.usd_market_cap || 0,
            lastUpdated: Date.now(),
          }
        }
      }

      get().updatePrices(prices)

    } catch (error: any) {
      get().setMarketError(error.message || 'Failed to refresh prices', 'refreshPrices')
    } finally {
      set((state) => {
        state.market.loading.prices = false
      })
    }
  },
})