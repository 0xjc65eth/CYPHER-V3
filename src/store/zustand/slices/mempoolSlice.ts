import { StateCreator } from 'zustand'
import { RootState } from '../index'

export interface MempoolState {
  unconfirmedCount: number
  totalSize: number
  totalFees: number
  medianFee: number
  isLoading: boolean
  error: string | null
  lastUpdated: string | null
}

export interface MempoolActions {
  setMempoolData: (data: Partial<MempoolState>) => void
  setMempoolLoading: (loading: boolean) => void
  setMempoolError: (error: string) => void
}

export interface MempoolSlice {
  mempool: MempoolState
  setMempoolData: MempoolActions['setMempoolData']
  setMempoolLoading: MempoolActions['setMempoolLoading']
  setMempoolError: MempoolActions['setMempoolError']
}

const initialMempoolState: MempoolState = {
  unconfirmedCount: 0,
  totalSize: 0,
  totalFees: 0,
  medianFee: 0,
  isLoading: false,
  error: null,
  lastUpdated: null,
}

export const createMempoolSlice: StateCreator<
  RootState,
  [],
  [],
  MempoolSlice
> = (set) => ({
  mempool: initialMempoolState,

  setMempoolData: (data: Partial<MempoolState>) => {
    set((state) => {
      state.mempool = {
        ...state.mempool,
        ...data,
        lastUpdated: new Date().toISOString(),
        error: null,
      }
    })
  },

  setMempoolLoading: (loading: boolean) => {
    set((state) => {
      state.mempool.isLoading = loading
    })
  },

  setMempoolError: (error: string) => {
    set((state) => {
      state.mempool.error = error
      state.mempool.isLoading = false
    })
  },
})
