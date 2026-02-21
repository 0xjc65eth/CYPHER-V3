import { StateCreator } from 'zustand'
import { RootState } from '../index'

export interface WalletState {
  // Connection
  connected: boolean
  connecting: boolean
  address: string | null
  publicKey: string | null
  
  // Balance and assets
  balance: number
  ordinals: Ordinal[] | null
  runes: RuneBalance[] | null
  inscriptions: Inscription[] | null
  rareSats: RareSat[] | null
  transactions: Transaction[] | null
  
  // PnL and analytics
  pnl: {
    realized: number
    unrealized: number
    total: number
    percentage: number
    breakdown: {
      bitcoin: number
      ordinals: number
      runes: number
    }
  }
  
  // Loading states
  loading: {
    connection: boolean
    balance: boolean
    ordinals: boolean
    runes: boolean
    transactions: boolean
  }
  
  // Error handling
  error: string | null
  warnings: string[]
  
  // User preferences
  preferences: {
    autoRefresh: boolean
    refreshInterval: number
    showTestnet: boolean
    privacyMode: boolean
    notifications: {
      transactions: boolean
      priceAlerts: boolean
      news: boolean
    }
  }
  
  // Session data
  lastRefresh: number
  sessionId: string | null
}

export interface WalletActions {
  // Connection actions
  connectWallet: (provider?: string) => Promise<void>
  disconnectWallet: () => void
  reconnectWallet: () => Promise<void>
  
  // Data actions
  updateWalletBalance: (balance: number) => void
  updateOrdinals: (ordinals: Ordinal[]) => void
  updateRunes: (runes: RuneBalance[]) => void
  updateInscriptions: (inscriptions: Inscription[]) => void
  updateRareSats: (rareSats: RareSat[]) => void
  updateTransactions: (transactions: Transaction[]) => void
  updatePnL: (pnl: Partial<WalletState['pnl']>) => void
  
  // Loading actions
  setWalletLoading: (key: keyof WalletState['loading'], loading: boolean) => void
  setWalletError: (error: string | null) => void
  addWalletWarning: (warning: string) => void
  clearWalletWarnings: () => void
  
  // Preferences
  updateWalletPreferences: (preferences: Partial<WalletState['preferences']>) => void
  
  // Refresh actions
  refreshWalletData: () => Promise<void>
  setLastRefresh: (timestamp: number) => void
}

export interface WalletSlice {
  wallet: WalletState
  connectWallet: WalletActions['connectWallet']
  disconnectWallet: WalletActions['disconnectWallet']
  reconnectWallet: WalletActions['reconnectWallet']
  updateWalletBalance: WalletActions['updateWalletBalance']
  updateOrdinals: WalletActions['updateOrdinals']
  updateRunes: WalletActions['updateRunes']
  updateInscriptions: WalletActions['updateInscriptions']
  updateRareSats: WalletActions['updateRareSats']
  updateTransactions: WalletActions['updateTransactions']
  updatePnL: WalletActions['updatePnL']
  setWalletLoading: WalletActions['setWalletLoading']
  setWalletError: WalletActions['setWalletError']
  addWalletWarning: WalletActions['addWalletWarning']
  clearWalletWarnings: WalletActions['clearWalletWarnings']
  updateWalletPreferences: WalletActions['updateWalletPreferences']
  refreshWalletData: WalletActions['refreshWalletData']
  setLastRefresh: WalletActions['setLastRefresh']
}

// Types from existing codebase
interface Ordinal {
  id: string
  number: number
  content_type: string
  content_body?: string
  genesis_address: string
  genesis_block_height: number
  genesis_fee: number
  genesis_transaction: string
  location: string
  value: number
  offset: number
  mime_type: string
  timestamp: string
}

interface RuneBalance {
  rune: string
  runeid: string
  spacedRune: string
  amount: string
  symbol: string
  divisibility: number
}

interface Inscription {
  id: string
  number: number
  address: string
  content_type: string
  content_length: number
  timestamp: string
  genesis_height: number
  genesis_fee: number
  genesis_transaction: string
  location: string
  output: string
  value: number
  offset: number
}

interface RareSat {
  satributes: string[]
  satoshi: number
  utxo: string
  ranges: Array<{
    start: number
    end: number
    size: number
    name: string
    year_start: string
  }>
}

interface Transaction {
  txid: string
  version: number
  locktime: number
  vin: Array<{
    txid: string
    vout: number
    prevout: {
      scriptpubkey: string
      scriptpubkey_asm: string
      scriptpubkey_type: string
      scriptpubkey_address: string
      value: number
    }
    scriptsig: string
    scriptsig_asm: string
    is_coinbase: boolean
    sequence: number
  }>
  vout: Array<{
    scriptpubkey: string
    scriptpubkey_asm: string
    scriptpubkey_type: string
    scriptpubkey_address: string
    value: number
  }>
  size: number
  weight: number
  fee: number
  status: {
    confirmed: boolean
    block_height: number
    block_hash: string
    block_time: number
  }
}

const initialWalletState: WalletState = {
  connected: false,
  connecting: false,
  address: null,
  publicKey: null,
  balance: 0,
  ordinals: null,
  runes: null,
  inscriptions: null,
  rareSats: null,
  transactions: null,
  pnl: {
    realized: 0,
    unrealized: 0,
    total: 0,
    percentage: 0,
    breakdown: {
      bitcoin: 0,
      ordinals: 0,
      runes: 0,
    },
  },
  loading: {
    connection: false,
    balance: false,
    ordinals: false,
    runes: false,
    transactions: false,
  },
  error: null,
  warnings: [],
  preferences: {
    autoRefresh: true,
    refreshInterval: 30000,
    showTestnet: false,
    privacyMode: false,
    notifications: {
      transactions: true,
      priceAlerts: true,
      news: false,
    },
  },
  lastRefresh: 0,
  sessionId: null,
}

export const createWalletSlice: StateCreator<
  RootState,
  [],
  [],
  WalletSlice
> = (set, get) => ({
  wallet: initialWalletState,
  
  connectWallet: async (provider?: string) => {
    set((state) => {
      state.wallet.connecting = true
      state.wallet.error = null
      state.wallet.loading.connection = true
    })
    
    try {
      // Attempt real wallet connection via browser provider
      let address = ''
      let publicKey = ''

      if (typeof window !== 'undefined') {
        // Try Xverse
        const xverseProvider = (window as any).XverseProviders?.BitcoinProvider
        // Try UniSat
        const unisatProvider = (window as any).unisat

        if (xverseProvider) {
          const response = await xverseProvider.request('getAccounts', null)
          address = response.result?.[0]?.address || ''
          publicKey = response.result?.[0]?.publicKey || ''
        } else if (unisatProvider) {
          const accounts = await unisatProvider.requestAccounts()
          address = accounts[0] || ''
          const pubKey = await unisatProvider.getPublicKey()
          publicKey = pubKey || ''
        }
      }

      if (!address) {
        throw new Error('No wallet provider found. Install Xverse or UniSat extension.')
      }

      set((state) => {
        state.wallet.connected = true
        state.wallet.connecting = false
        state.wallet.address = address
        state.wallet.publicKey = publicKey
        state.wallet.sessionId = `session_${Date.now()}`
        state.wallet.loading.connection = false
        state.wallet.lastRefresh = Date.now()
      })

      // Trigger initial data refresh
      get().refreshWalletData()
      
    } catch (error: any) {
      set((state) => {
        state.wallet.connecting = false
        state.wallet.error = error.message || 'Failed to connect wallet'
        state.wallet.loading.connection = false
      })
      throw error
    }
  },
  
  disconnectWallet: () => {
    set((state) => {
      state.wallet = { ...initialWalletState }
    })
  },
  
  reconnectWallet: async () => {
    const { connectWallet } = get()
    await connectWallet()
  },
  
  updateWalletBalance: (balance: number) => {
    set((state) => {
      state.wallet.balance = balance
      state.wallet.pnl.breakdown.bitcoin = balance
      state.wallet.pnl.total = 
        state.wallet.pnl.breakdown.bitcoin + 
        state.wallet.pnl.breakdown.ordinals + 
        state.wallet.pnl.breakdown.runes
    })
  },
  
  updateOrdinals: (ordinals: Ordinal[]) => {
    set((state) => {
      state.wallet.ordinals = ordinals
      state.wallet.pnl.breakdown.ordinals = ordinals.reduce((sum, ord) => sum + ord.value, 0)
      state.wallet.pnl.total = 
        state.wallet.pnl.breakdown.bitcoin + 
        state.wallet.pnl.breakdown.ordinals + 
        state.wallet.pnl.breakdown.runes
    })
  },
  
  updateRunes: (runes: RuneBalance[]) => {
    set((state) => {
      state.wallet.runes = runes
      // Placeholder: real runes PnL requires market price data per rune
      state.wallet.pnl.breakdown.runes = 0
      state.wallet.pnl.total = 
        state.wallet.pnl.breakdown.bitcoin + 
        state.wallet.pnl.breakdown.ordinals + 
        state.wallet.pnl.breakdown.runes
    })
  },
  
  updateInscriptions: (inscriptions: Inscription[]) => {
    set((state) => {
      state.wallet.inscriptions = inscriptions
    })
  },
  
  updateRareSats: (rareSats: RareSat[]) => {
    set((state) => {
      state.wallet.rareSats = rareSats
    })
  },
  
  updateTransactions: (transactions: Transaction[]) => {
    set((state) => {
      state.wallet.transactions = transactions
    })
  },
  
  updatePnL: (pnl: Partial<WalletState['pnl']>) => {
    set((state) => {
      state.wallet.pnl = { ...state.wallet.pnl, ...pnl }
    })
  },
  
  setWalletLoading: (key: keyof WalletState['loading'], loading: boolean) => {
    set((state) => {
      state.wallet.loading[key] = loading
    })
  },
  
  setWalletError: (error: string | null) => {
    set((state) => {
      state.wallet.error = error
    })
  },
  
  addWalletWarning: (warning: string) => {
    set((state) => {
      if (!state.wallet.warnings.includes(warning)) {
        state.wallet.warnings.push(warning)
      }
    })
  },
  
  clearWalletWarnings: () => {
    set((state) => {
      state.wallet.warnings = []
    })
  },
  
  updateWalletPreferences: (preferences: Partial<WalletState['preferences']>) => {
    set((state) => {
      state.wallet.preferences = { ...state.wallet.preferences, ...preferences }
    })
  },
  
  refreshWalletData: async () => {
    const { wallet } = get()
    if (!wallet.connected || !wallet.address) return
    
    try {
      set((state) => ({
        ...state,
        wallet: {
          ...state.wallet,
          loading: {
            ...state.wallet.loading,
            balance: true,
            ordinals: true,
            runes: true,
            transactions: true
          }
        }
      }))
      
      // Placeholder: returns zero balances until real wallet API is connected
      await new Promise(resolve => setTimeout(resolve, 500))

      // Zero-value fallback — replace with real Mempool/Hiro API calls
      get().updateWalletBalance(0)
      get().updateOrdinals([])
      get().updateRunes([])
      get().updateTransactions([])
      
      set((state) => ({
        ...state,
        wallet: {
          ...state.wallet,
          loading: {
            ...state.wallet.loading,
            balance: false,
            ordinals: false,
            runes: false,
            transactions: false
          },
          lastRefresh: Date.now()
        }
      }))
      
    } catch (error: any) {
      set((state) => ({
        ...state,
        wallet: {
          ...state.wallet,
          error: error.message || 'Failed to refresh wallet data',
          loading: {
            ...state.wallet.loading,
            balance: false,
            ordinals: false,
            runes: false,
            transactions: false
          }
        }
      }))
    }
  },
  
  setLastRefresh: (timestamp: number) => {
    set((state) => ({
      ...state,
      wallet: {
        ...state.wallet,
        lastRefresh: timestamp
      }
    }))
  },
})