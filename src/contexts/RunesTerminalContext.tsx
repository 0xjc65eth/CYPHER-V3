'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

// Types
export interface GlobalFilters {
  timeframe: '1h' | '24h' | '7d' | '30d';
  minValue: number;
  maxValue: number;
  category: 'all' | 'meme' | 'utility' | 'gaming' | 'defi' | 'art';
  sortBy: 'marketCap' | 'volume' | 'change' | 'holders' | 'name';
  sortOrder: 'asc' | 'desc';
  search: string;
}

export interface TerminalSettings {
  selectedRune: string;
  favorites: string[];
  isFullscreen: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  theme: 'dark' | 'terminal' | 'bloomberg';
  panels: {
    charts: boolean;
    pools: boolean;
    holders: boolean;
    transactions: boolean;
    analytics: boolean;
  };
  chartSettings: {
    showVolume: boolean;
    showMA: boolean;
    showRSI: boolean;
    candleInterval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  };
}

export interface RunesTerminalState {
  filters: GlobalFilters;
  settings: TerminalSettings;
  isLoading: boolean;
  error: string | null;
  lastUpdate: number;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

// Actions
type RunesTerminalAction =
  | { type: 'SET_FILTERS'; payload: Partial<GlobalFilters> }
  | { type: 'SET_SETTINGS'; payload: Partial<TerminalSettings> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'connected' | 'disconnected' | 'reconnecting' }
  | { type: 'UPDATE_LAST_UPDATE' }
  | { type: 'TOGGLE_FAVORITE'; payload: string }
  | { type: 'RESET_FILTERS' }
  | { type: 'RESET_SETTINGS' };

// Initial state
const initialFilters: GlobalFilters = {
  timeframe: '24h',
  minValue: 0,
  maxValue: Infinity,
  category: 'all',
  sortBy: 'marketCap',
  sortOrder: 'desc',
  search: ''
};

const initialSettings: TerminalSettings = {
  selectedRune: 'all',
  favorites: [],
  isFullscreen: false,
  autoRefresh: true,
  refreshInterval: 30000,
  theme: 'dark',
  panels: {
    charts: true,
    pools: true,
    holders: true,
    transactions: true,
    analytics: true
  },
  chartSettings: {
    showVolume: true,
    showMA: false,
    showRSI: false,
    candleInterval: '1h'
  }
};

const initialState: RunesTerminalState = {
  filters: initialFilters,
  settings: initialSettings,
  isLoading: false,
  error: null,
  lastUpdate: 0,
  connectionStatus: 'disconnected'
};

// Reducer
function runesTerminalReducer(state: RunesTerminalState, action: RunesTerminalAction): RunesTerminalState {
  switch (action.type) {
    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };

    case 'SET_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload
      };

    case 'UPDATE_LAST_UPDATE':
      return {
        ...state,
        lastUpdate: Date.now()
      };

    case 'TOGGLE_FAVORITE':
      const favorites = state.settings.favorites.includes(action.payload)
        ? state.settings.favorites.filter(id => id !== action.payload)
        : [...state.settings.favorites, action.payload];
      
      return {
        ...state,
        settings: {
          ...state.settings,
          favorites
        }
      };

    case 'RESET_FILTERS':
      return {
        ...state,
        filters: initialFilters
      };

    case 'RESET_SETTINGS':
      return {
        ...state,
        settings: initialSettings
      };

    default:
      return state;
  }
}

// Context
interface RunesTerminalContextType {
  state: RunesTerminalState;
  setFilters: (filters: Partial<GlobalFilters>) => void;
  setSettings: (settings: Partial<TerminalSettings>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'reconnecting') => void;
  updateLastUpdate: () => void;
  toggleFavorite: (runeId: string) => void;
  resetFilters: () => void;
  resetSettings: () => void;
  
  // Computed values
  filteredFavorites: string[];
  isConnected: boolean;
  hasFiltersApplied: boolean;
}

const RunesTerminalContext = createContext<RunesTerminalContextType | undefined>(undefined);

// Provider component
export function RunesTerminalProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(runesTerminalReducer, initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedFilters = localStorage.getItem('runes-terminal-filters');
        const savedSettings = localStorage.getItem('runes-terminal-settings');

        if (savedFilters) {
          const filters = JSON.parse(savedFilters);
          dispatch({ type: 'SET_FILTERS', payload: filters });
        }

        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          dispatch({ type: 'SET_SETTINGS', payload: settings });
        }
      } catch (error) {
      }
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('runes-terminal-filters', JSON.stringify(state.filters));
        localStorage.setItem('runes-terminal-settings', JSON.stringify(state.settings));
      } catch (error) {
      }
    }
  }, [state.filters, state.settings]);

  // Action creators
  const setFilters = useCallback((filters: Partial<GlobalFilters>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const setSettings = useCallback((settings: Partial<TerminalSettings>) => {
    dispatch({ type: 'SET_SETTINGS', payload: settings });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const setConnectionStatus = useCallback((status: 'connected' | 'disconnected' | 'reconnecting') => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
  }, []);

  const updateLastUpdate = useCallback(() => {
    dispatch({ type: 'UPDATE_LAST_UPDATE' });
  }, []);

  const toggleFavorite = useCallback((runeId: string) => {
    dispatch({ type: 'TOGGLE_FAVORITE', payload: runeId });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);

  const resetSettings = useCallback(() => {
    dispatch({ type: 'RESET_SETTINGS' });
  }, []);

  // Computed values
  const filteredFavorites = state.settings.favorites;
  const isConnected = state.connectionStatus === 'connected';
  const hasFiltersApplied = (
    state.filters.search !== '' ||
    state.filters.category !== 'all' ||
    state.filters.minValue > 0 ||
    state.filters.maxValue < Infinity ||
    state.filters.timeframe !== '24h'
  );

  const contextValue: RunesTerminalContextType = {
    state,
    setFilters,
    setSettings,
    setLoading,
    setError,
    setConnectionStatus,
    updateLastUpdate,
    toggleFavorite,
    resetFilters,
    resetSettings,
    filteredFavorites,
    isConnected,
    hasFiltersApplied
  };

  return (
    <RunesTerminalContext.Provider value={contextValue}>
      {children}
    </RunesTerminalContext.Provider>
  );
}

// Hook to use the context
export function useRunesTerminal() {
  const context = useContext(RunesTerminalContext);
  if (context === undefined) {
    throw new Error('useRunesTerminal must be used within a RunesTerminalProvider');
  }
  return context;
}

// Custom hooks for specific functionality
export function useRunesFilters() {
  const { state, setFilters, resetFilters, hasFiltersApplied } = useRunesTerminal();
  return {
    filters: state.filters,
    setFilters,
    resetFilters,
    hasFiltersApplied
  };
}

export function useRunesSettings() {
  const { state, setSettings, resetSettings } = useRunesTerminal();
  return {
    settings: state.settings,
    setSettings,
    resetSettings
  };
}

export function useRunesFavorites() {
  const { state, toggleFavorite, filteredFavorites } = useRunesTerminal();
  return {
    favorites: state.settings.favorites,
    toggleFavorite,
    filteredFavorites
  };
}

export function useRunesConnection() {
  const { state, setConnectionStatus, updateLastUpdate, isConnected } = useRunesTerminal();
  return {
    connectionStatus: state.connectionStatus,
    setConnectionStatus,
    updateLastUpdate,
    isConnected,
    lastUpdate: state.lastUpdate
  };
}