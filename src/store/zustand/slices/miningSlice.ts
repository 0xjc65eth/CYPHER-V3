import { StateCreator } from 'zustand'
import { RootState } from '../index'

export interface MiningState {
  hashRate: number
  difficulty: number
  nextAdjustment: number
  blockHeight: number
  avgBlockTime: number
  isLoading: boolean
  error: string | null
  lastUpdated: string | null
}

export interface MiningActions {
  setMiningData: (data: Partial<MiningState>) => void
  setMiningLoading: (loading: boolean) => void
  setMiningError: (error: string) => void
}

export interface MiningSlice {
  mining: MiningState
  setMiningData: MiningActions['setMiningData']
  setMiningLoading: MiningActions['setMiningLoading']
  setMiningError: MiningActions['setMiningError']
}

const initialMiningState: MiningState = {
  hashRate: 0,
  difficulty: 0,
  nextAdjustment: 0,
  blockHeight: 0,
  avgBlockTime: 600,
  isLoading: false,
  error: null,
  lastUpdated: null,
}

export const createMiningSlice: StateCreator<
  RootState,
  [['zustand/immer', never]],
  [],
  MiningSlice
> = (set) => ({
  mining: initialMiningState,

  setMiningData: (data: Partial<MiningState>) => {
    set((state) => {
      state.mining = {
        ...state.mining,
        ...data,
        lastUpdated: new Date().toISOString(),
        error: null,
      }
    })
  },

  setMiningLoading: (loading: boolean) => {
    set((state) => {
      state.mining.isLoading = loading
    })
  },

  setMiningError: (error: string) => {
    set((state) => {
      state.mining.error = error
      state.mining.isLoading = false
    })
  },
})
