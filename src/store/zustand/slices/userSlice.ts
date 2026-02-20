import { StateCreator } from 'zustand'
import { RootState } from '../index'

export interface UserState {
  id: string | null
  email: string | null
  name: string | null
  isAuthenticated: boolean
  preferences: {
    theme: 'light' | 'dark'
    language: string
    notifications: boolean
  }
  isLoading: boolean
  error: string | null
}

export interface UserActions {
  setUser: (data: Partial<UserState>) => void
  setUserLoading: (loading: boolean) => void
  setUserError: (error: string) => void
  logout: () => void
}

export interface UserSlice {
  user: UserState
  setUser: UserActions['setUser']
  setUserLoading: UserActions['setUserLoading']
  setUserError: UserActions['setUserError']
  logout: UserActions['logout']
}

const initialUserState: UserState = {
  id: null,
  email: null,
  name: null,
  isAuthenticated: false,
  preferences: {
    theme: 'dark',
    language: 'en',
    notifications: true,
  },
  isLoading: false,
  error: null,
}

export const createUserSlice: StateCreator<
  RootState,
  [],
  [],
  UserSlice
> = (set) => ({
  user: initialUserState,

  setUser: (data: Partial<UserState>) => {
    set((state) => {
      state.user = { ...state.user, ...data, error: null }
    })
  },

  setUserLoading: (loading: boolean) => {
    set((state) => {
      state.user.isLoading = loading
    })
  },

  setUserError: (error: string) => {
    set((state) => {
      state.user.error = error
      state.user.isLoading = false
    })
  },

  logout: () => {
    set((state) => {
      state.user.id = null
      state.user.email = null
      state.user.name = null
      state.user.isAuthenticated = false
      state.user.error = null
    })
  },
})
