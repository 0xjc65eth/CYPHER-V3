import type { RootState as ZustandRootState } from '@/store/zustand'

// Define interfaces for state
export interface UserState {
  address: string | null
  nftData: {
    name: string
    collection: string
    image: string
    isVerified: boolean
  } | null
  isConnected: boolean
  subscription: {
    type: 'free' | 'premium' | 'enterprise'
    expiresAt: string | null
  }
}

export interface MarketState {
  btcPrice: number
  btcChange24h: number
  volume24h: number
  marketCap: number
}

export interface MempoolState {
  pendingTransactions: number
  averageFeeRate: number
  mempoolSize: number
  lastUpdated: string
  transactions: any[]
  feeRates: {
    low: number
    medium: number
    high: number
  }
  blocks: {
    height: number
    hash: string
    timestamp: number
    size: number
    weight: number
  }[]
}

export interface MiningState {
  hashRate: number
  difficulty: number
  blockTime: number
  lastUpdated: string
}

// Root state type
export type RootState = ZustandRootState
