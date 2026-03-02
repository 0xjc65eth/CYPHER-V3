import { StateCreator } from 'zustand'
import { RootState } from '../index'

export interface RealTimeState {
  // Connection status
  connected: boolean
  connecting: boolean
  connectionAttempts: number
  lastConnectionAttempt: number | null
  
  // Real-time data
  data: {
    prices: Record<string, {
      symbol: string
      price: number
      change24h: number
      volume24h: number
      lastUpdated: number
    }>
    orderBook: {
      bids: Array<[number, number]>
      asks: Array<[number, number]>
      lastUpdated: number
    }
    trades: Array<{
      id: string
      price: number
      quantity: number
      side: 'buy' | 'sell'
      timestamp: number
    }>
    marketData: {
      totalMarketCap: number
      btcDominance: number
      volume24h: number
      activeMarkets: number
      lastUpdated: number
    }
  }
  
  // Subscriptions
  subscriptions: Set<string>
  
  // Configuration
  config: {
    autoReconnect: boolean
    maxReconnectAttempts: number
    reconnectDelay: number
    heartbeatInterval: number
    subscriptionBatchSize: number
  }
  
  // Error handling
  error: string | null
  connectionError: string | null
  
  // Performance metrics
  metrics: {
    latency: number
    messagesReceived: number
    messagesPerSecond: number
    connectionUptime: number
    dataQuality: number
  }
}

export interface RealTimeActions {
  // Connection management
  connectRealTime: () => Promise<void>
  disconnectRealTime: () => void
  reconnectRealTime: () => Promise<void>
  
  // Data updates
  updateRealTimeData: (data: Partial<RealTimeState['data']>) => void
  updatePrices: (prices: RealTimeState['data']['prices']) => void
  updateOrderBook: (orderBook: RealTimeState['data']['orderBook']) => void
  updateTrades: (trades: RealTimeState['data']['trades']) => void
  updateMarketData: (marketData: RealTimeState['data']['marketData']) => void
  
  // Subscriptions
  subscribe: (symbols: string[]) => void
  unsubscribe: (symbols: string[]) => void
  clearSubscriptions: () => void
  
  // Configuration
  updateRealTimeConfig: (config: Partial<RealTimeState['config']>) => void
  
  // Error handling
  setRealTimeError: (error: string | null) => void
  setConnectionError: (error: string | null) => void
  clearRealTimeErrors: () => void
  
  // Metrics
  updateMetrics: (metrics: Partial<RealTimeState['metrics']>) => void
  resetMetrics: () => void
}

export interface RealTimeSlice {
  realTime: RealTimeState
  connectRealTime: RealTimeActions['connectRealTime']
  disconnectRealTime: RealTimeActions['disconnectRealTime']
  reconnectRealTime: RealTimeActions['reconnectRealTime']
  updateRealTimeData: RealTimeActions['updateRealTimeData']
  updatePrices: RealTimeActions['updatePrices']
  updateOrderBook: RealTimeActions['updateOrderBook']
  updateTrades: RealTimeActions['updateTrades']
  updateMarketData: RealTimeActions['updateMarketData']
  subscribe: RealTimeActions['subscribe']
  unsubscribe: RealTimeActions['unsubscribe']
  clearSubscriptions: RealTimeActions['clearSubscriptions']
  updateRealTimeConfig: RealTimeActions['updateRealTimeConfig']
  setRealTimeError: RealTimeActions['setRealTimeError']
  setConnectionError: RealTimeActions['setConnectionError']
  clearRealTimeErrors: RealTimeActions['clearRealTimeErrors']
  updateMetrics: RealTimeActions['updateMetrics']
  resetMetrics: RealTimeActions['resetMetrics']
}

const initialRealTimeState: RealTimeState = {
  connected: false,
  connecting: false,
  connectionAttempts: 0,
  lastConnectionAttempt: null,
  data: {
    prices: {},
    orderBook: {
      bids: [],
      asks: [],
      lastUpdated: 0,
    },
    trades: [],
    marketData: {
      totalMarketCap: 0,
      btcDominance: 0,
      volume24h: 0,
      activeMarkets: 0,
      lastUpdated: 0,
    },
  },
  subscriptions: new Set(),
  config: {
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 5000,
    heartbeatInterval: 30000,
    subscriptionBatchSize: 50,
  },
  error: null,
  connectionError: null,
  metrics: {
    latency: 0,
    messagesReceived: 0,
    messagesPerSecond: 0,
    connectionUptime: 0,
    dataQuality: 0,
  },
}

export const createRealTimeSlice: StateCreator<
  RootState,
  [['zustand/immer', never]],
  [],
  RealTimeSlice
> = (set, get) => ({
  realTime: initialRealTimeState,
  
  connectRealTime: async () => {
    set((state) => {
      state.realTime.connecting = true
      state.realTime.connectionError = null
      state.realTime.connectionAttempts += 1
      state.realTime.lastConnectionAttempt = Date.now()
    })
    
    try {
      // Mock real-time connection - replace with actual WebSocket implementation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      set((state) => {
        state.realTime.connected = true
        state.realTime.connecting = false
        state.realTime.connectionError = null
        state.realTime.metrics.connectionUptime = Date.now()
      })
      
      // Start mock data updates
      get().startMockDataUpdates?.()
      
    } catch (error: any) {
      set((state) => {
        state.realTime.connecting = false
        state.realTime.connectionError = error.message || 'Failed to connect to real-time data'
      })
      throw error
    }
  },
  
  disconnectRealTime: () => {
    set((state) => {
      state.realTime.connected = false
      state.realTime.connecting = false
      state.realTime.subscriptions.clear()
      state.realTime.connectionError = null
      state.realTime.error = null
    })
  },
  
  reconnectRealTime: async () => {
    const { realTime } = get()
    if (realTime.connectionAttempts >= realTime.config.maxReconnectAttempts) {
      set((state) => {
        state.realTime.connectionError = 'Maximum reconnection attempts reached'
      })
      return
    }
    
    await get().connectRealTime()
  },
  
  updateRealTimeData: (data: Partial<RealTimeState['data']>) => {
    set((state) => {
      state.realTime.data = { ...state.realTime.data, ...data }
      state.realTime.metrics.messagesReceived += 1
    })
  },
  
  updatePrices: (prices: RealTimeState['data']['prices']) => {
    set((state) => {
      state.realTime.data.prices = prices
      state.realTime.metrics.messagesReceived += 1
    })
  },
  
  updateOrderBook: (orderBook: RealTimeState['data']['orderBook']) => {
    set((state) => {
      state.realTime.data.orderBook = orderBook
      state.realTime.metrics.messagesReceived += 1
    })
  },
  
  updateTrades: (trades: RealTimeState['data']['trades']) => {
    set((state) => {
      state.realTime.data.trades = trades
      state.realTime.metrics.messagesReceived += 1
    })
  },
  
  updateMarketData: (marketData: RealTimeState['data']['marketData']) => {
    set((state) => {
      state.realTime.data.marketData = marketData
      state.realTime.metrics.messagesReceived += 1
    })
  },
  
  subscribe: (symbols: string[]) => {
    set((state) => {
      symbols.forEach(symbol => {
        state.realTime.subscriptions.add(symbol)
      })
    })
  },
  
  unsubscribe: (symbols: string[]) => {
    set((state) => {
      symbols.forEach(symbol => {
        state.realTime.subscriptions.delete(symbol)
      })
    })
  },
  
  clearSubscriptions: () => {
    set((state) => {
      state.realTime.subscriptions.clear()
    })
  },
  
  updateRealTimeConfig: (config: Partial<RealTimeState['config']>) => {
    set((state) => {
      state.realTime.config = { ...state.realTime.config, ...config }
    })
  },
  
  setRealTimeError: (error: string | null) => {
    set((state) => {
      state.realTime.error = error
    })
  },
  
  setConnectionError: (error: string | null) => {
    set((state) => {
      state.realTime.connectionError = error
    })
  },
  
  clearRealTimeErrors: () => {
    set((state) => {
      state.realTime.error = null
      state.realTime.connectionError = null
    })
  },
  
  updateMetrics: (metrics: Partial<RealTimeState['metrics']>) => {
    set((state) => {
      state.realTime.metrics = { ...state.realTime.metrics, ...metrics }
    })
  },
  
  resetMetrics: () => {
    set((state) => {
      state.realTime.metrics = {
        latency: 0,
        messagesReceived: 0,
        messagesPerSecond: 0,
        connectionUptime: 0,
        dataQuality: 0,
      }
    })
  },
})