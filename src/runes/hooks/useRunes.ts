// =============================================================================
// CYPHER V3 - Runes Hooks
// Custom hooks para gerenciar estado de Runes, watchlist e alertas
// Módulo independente - não depende de Ordinals
// =============================================================================

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ProcessedRune,
  RuneFilters,
  RuneMarketMetrics,
  RuneMarketInsight,
  RunePriceAlert,
  RuneWatchlistItem,
  RuneActivity,
  DEFAULT_RUNE_FILTERS,
} from '../types/runes';
import { runesApi, calculateRuneMarketMetrics } from '../services/runesApi';

// -----------------------------------------------------------------------------
// Storage Keys
// -----------------------------------------------------------------------------

const STORAGE_KEYS = {
  FAVORITES: 'cypher-runes-favorites',
  WATCHLIST: 'cypher-runes-watchlist',
  ALERTS: 'cypher-runes-alerts',
  FILTERS: 'cypher-runes-filters',
} as const;

// -----------------------------------------------------------------------------
// useRunes - Hook principal para buscar e gerenciar Runes
// -----------------------------------------------------------------------------

interface UseRunesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  limit?: number;
}

interface UseRunesReturn {
  runes: ProcessedRune[];
  filteredRunes: ProcessedRune[];
  isLoading: boolean;
  error: string | null;
  btcPrice: number;
  lastUpdated: number | null;
  filters: RuneFilters;
  setFilters: React.Dispatch<React.SetStateAction<RuneFilters>>;
  refresh: () => Promise<void>;
  toggleFavorite: (runeId: string) => void;
  favorites: Set<string>;
}

export function useRunes(options: UseRunesOptions = {}): UseRunesReturn {
  const {
    autoRefresh = true,
    refreshInterval = 60000,
    limit = 100,
  } = options;

  const [runes, setRunes] = useState<ProcessedRune[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [btcPrice, setBtcPrice] = useState(95000);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<RuneFilters>(DEFAULT_RUNE_FILTERS);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      console.warn('Failed to load rune favorites:', e);
    }
  }, []);

  const saveFavorites = useCallback((newFavorites: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify([...newFavorites]));
    } catch (e) {
      console.warn('Failed to save rune favorites:', e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const [statsData, price] = await Promise.all([
        runesApi.fetchRuneStats({ limit, sort: 'volume24h', direction: 'desc' }),
        runesApi.fetchBtcPrice(),
      ]);

      if (!isMountedRef.current) return;

      setBtcPrice(price);

      const processed = await runesApi.processRunes(statsData, price, favorites);

      setRunes(processed);
      setLastUpdated(Date.now());
    } catch (e) {
      if (!isMountedRef.current) return;

      const message = e instanceof Error ? e.message : 'Failed to fetch runes';
      setError(message);
      console.error('Error fetching runes:', e);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [limit, favorites]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, autoRefresh, refreshInterval]);

  const toggleFavorite = useCallback((runeId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(runeId)) {
        newFavorites.delete(runeId);
      } else {
        newFavorites.add(runeId);
      }
      saveFavorites(newFavorites);
      return newFavorites;
    });

    setRunes(prev =>
      prev.map(r =>
        r.id === runeId ? { ...r, isFavorite: !r.isFavorite } : r
      )
    );
  }, [saveFavorites]);

  const filteredRunes = useMemo(() => {
    let result = [...runes];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        r =>
          r.name.toLowerCase().includes(searchLower) ||
          r.spacedName.toLowerCase().includes(searchLower) ||
          r.symbol.includes(filters.search)
      );
    }

    if (filters.showOnlyFavorites) {
      result = result.filter(r => r.isFavorite);
    }

    if (filters.showOnlyVerified) {
      result = result.filter(r => r.verified);
    }

    if (filters.showOnlyMintable) {
      result = result.filter(r => r.mintable);
    }

    if (filters.minFloor !== undefined) {
      result = result.filter(r => r.floorPriceSats >= filters.minFloor!);
    }
    if (filters.maxFloor !== undefined) {
      result = result.filter(r => r.floorPriceSats <= filters.maxFloor!);
    }

    if (filters.minVolume !== undefined) {
      result = result.filter(r => r.volume24h >= filters.minVolume!);
    }

    if (filters.minMarketCap !== undefined) {
      result = result.filter(r => r.marketCap >= filters.minMarketCap!);
    }

    result.sort((a, b) => {
      const aValue = a[filters.sortBy as keyof ProcessedRune];
      const bValue = b[filters.sortBy as keyof ProcessedRune];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return filters.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return filters.sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    return result;
  }, [runes, filters]);

  return {
    runes,
    filteredRunes,
    isLoading,
    error,
    btcPrice,
    lastUpdated,
    filters,
    setFilters,
    refresh: fetchData,
    toggleFavorite,
    favorites,
  };
}

// -----------------------------------------------------------------------------
// useRuneMarketMetrics - Métricas agregadas do mercado
// -----------------------------------------------------------------------------

export function useRuneMarketMetrics(
  runes: ProcessedRune[],
  btcPrice: number
): RuneMarketMetrics {
  return useMemo(() => {
    const baseMetrics = calculateRuneMarketMetrics(runes, btcPrice);

    if (runes.length === 0) {
      return {
        ...baseMetrics,
        totalVolume7d: 0,
        totalVolume7dUsd: 0,
        topGainers: [],
        topLosers: [],
        topVolume: [],
        mostHeld: [],
      };
    }

    const totalVolume7d = runes.reduce((sum, r) => sum + r.volume7d, 0);

    const sortedByChange = [...runes].sort(
      (a, b) => b.priceChange24h - a.priceChange24h
    );

    const topGainers = sortedByChange.filter(r => r.priceChange24h > 0).slice(0, 3);
    const topLosers = sortedByChange.filter(r => r.priceChange24h < 0).slice(-3).reverse();
    const topVolume = [...runes].sort((a, b) => b.volume24h - a.volume24h).slice(0, 3);
    const mostHeld = [...runes].sort((a, b) => b.holders - a.holders).slice(0, 3);

    return {
      ...baseMetrics,
      totalVolume7d,
      totalVolume7dUsd: totalVolume7d * btcPrice,
      topGainers,
      topLosers,
      topVolume,
      mostHeld,
    };
  }, [runes, btcPrice]);
}

// -----------------------------------------------------------------------------
// useRuneMarketInsights - Insights inteligentes do mercado
// -----------------------------------------------------------------------------

export function useRuneMarketInsights(
  metrics: RuneMarketMetrics,
  runes: ProcessedRune[]
): RuneMarketInsight[] {
  return useMemo(() => {
    const insights: RuneMarketInsight[] = [];

    if (runes.length === 0) return insights;

    if (metrics.mintableRunes > 0) {
      const mintablePct = (metrics.mintableRunes / metrics.totalRunes) * 100;
      insights.push({
        id: 'mintable-runes',
        type: 'mint',
        title: 'Active Minting',
        description: `${metrics.mintableRunes} Runes (${mintablePct.toFixed(1)}%) still mintable`,
        metric: `${metrics.mintableRunes} mintable`,
      });
    }

    const avgVolume = metrics.totalVolume24h / runes.length;
    const highVolumeCount = runes.filter(r => r.volume24h > avgVolume * 2).length;

    if (highVolumeCount > runes.length * 0.15) {
      insights.push({
        id: 'high-volume',
        type: 'bullish',
        title: 'High Trading Activity',
        description: `${highVolumeCount} Runes showing 2x+ average volume`,
        metric: `${metrics.totalVolume24h.toFixed(4)} BTC`,
        change: highVolumeCount,
      });
    }

    const gainersCount = runes.filter(r => r.priceChange24h > 5).length;
    const losersCount = runes.filter(r => r.priceChange24h < -5).length;

    if (gainersCount > losersCount * 1.5) {
      insights.push({
        id: 'bullish-momentum',
        type: 'bullish',
        title: 'Bullish Momentum',
        description: `${gainersCount} Runes up >5% vs ${losersCount} down >5%`,
        change: gainersCount - losersCount,
      });
    } else if (losersCount > gainersCount * 1.5) {
      insights.push({
        id: 'bearish-momentum',
        type: 'bearish',
        title: 'Bearish Pressure',
        description: `${losersCount} Runes down >5% vs ${gainersCount} up >5%`,
        change: losersCount - gainersCount,
      });
    }

    if (metrics.topGainers.length > 0) {
      const topGainer = metrics.topGainers[0];
      insights.push({
        id: 'top-gainer',
        type: 'bullish',
        title: `Top Gainer: ${topGainer.name}`,
        description: `Up ${topGainer.priceChange24h.toFixed(1)}% in 24h`,
        change: topGainer.priceChange24h,
        rune: topGainer.spacedName,
      });
    }

    if (metrics.mostHeld.length > 0) {
      const topHeld = metrics.mostHeld[0];
      const holdersPct = (topHeld.holders / metrics.totalHolders) * 100;
      if (holdersPct > 20) {
        insights.push({
          id: 'top-held',
          type: 'info',
          title: `Most Held: ${topHeld.name}`,
          description: `${topHeld.holders.toLocaleString()} holders (${holdersPct.toFixed(1)}% of total)`,
          rune: topHeld.spacedName,
        });
      }
    }

    return insights.slice(0, 4);
  }, [metrics, runes]);
}

// -----------------------------------------------------------------------------
// useRuneWatchlist - Gerenciar watchlist
// -----------------------------------------------------------------------------

interface UseRuneWatchlistReturn {
  watchlist: RuneWatchlistItem[];
  addToWatchlist: (runeId: string, currentPrice: number) => void;
  removeFromWatchlist: (runeId: string) => void;
  isInWatchlist: (runeId: string) => boolean;
  updateNotes: (runeId: string, notes: string) => void;
}

export function useRuneWatchlist(): UseRuneWatchlistReturn {
  const [watchlist, setWatchlist] = useState<RuneWatchlistItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
      if (stored) {
        setWatchlist(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load rune watchlist:', e);
    }
  }, []);

  const saveWatchlist = useCallback((items: RuneWatchlistItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save rune watchlist:', e);
    }
  }, []);

  const addToWatchlist = useCallback(
    (runeId: string, currentPrice: number) => {
      setWatchlist(prev => {
        if (prev.some(item => item.runeId === runeId)) {
          return prev;
        }
        const newList = [
          ...prev,
          { runeId, addedAt: Date.now(), priceAtAdd: currentPrice },
        ];
        saveWatchlist(newList);
        return newList;
      });
    },
    [saveWatchlist]
  );

  const removeFromWatchlist = useCallback(
    (runeId: string) => {
      setWatchlist(prev => {
        const newList = prev.filter(item => item.runeId !== runeId);
        saveWatchlist(newList);
        return newList;
      });
    },
    [saveWatchlist]
  );

  const isInWatchlist = useCallback(
    (runeId: string) => watchlist.some(item => item.runeId === runeId),
    [watchlist]
  );

  const updateNotes = useCallback(
    (runeId: string, notes: string) => {
      setWatchlist(prev => {
        const newList = prev.map(item =>
          item.runeId === runeId ? { ...item, notes } : item
        );
        saveWatchlist(newList);
        return newList;
      });
    },
    [saveWatchlist]
  );

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    updateNotes,
  };
}

// -----------------------------------------------------------------------------
// useRunePriceAlerts - Gerenciar alertas de preço
// -----------------------------------------------------------------------------

interface UseRunePriceAlertsReturn {
  alerts: RunePriceAlert[];
  addAlert: (alert: Omit<RunePriceAlert, 'id' | 'createdAt' | 'triggered' | 'triggeredAt' | 'notificationSent'>) => void;
  removeAlert: (alertId: string) => void;
  checkAlerts: (runes: ProcessedRune[]) => RunePriceAlert[];
  clearTriggeredAlerts: () => void;
}

export function useRunePriceAlerts(): UseRunePriceAlertsReturn {
  const [alerts, setAlerts] = useState<RunePriceAlert[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ALERTS);
      if (stored) {
        setAlerts(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load rune alerts:', e);
    }
  }, []);

  const saveAlerts = useCallback((items: RunePriceAlert[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save rune alerts:', e);
    }
  }, []);

  const addAlert = useCallback(
    (alert: Omit<RunePriceAlert, 'id' | 'createdAt' | 'triggered' | 'triggeredAt' | 'notificationSent'>) => {
      const newAlert: RunePriceAlert = {
        ...alert,
        id: `rune-alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        triggered: false,
        notificationSent: false,
      };

      setAlerts(prev => {
        const newList = [...prev, newAlert];
        saveAlerts(newList);
        return newList;
      });
    },
    [saveAlerts]
  );

  const removeAlert = useCallback(
    (alertId: string) => {
      setAlerts(prev => {
        const newList = prev.filter(a => a.id !== alertId);
        saveAlerts(newList);
        return newList;
      });
    },
    [saveAlerts]
  );

  const checkAlerts = useCallback(
    (runes: ProcessedRune[]): RunePriceAlert[] => {
      const triggeredNow: RunePriceAlert[] = [];

      setAlerts(prev => {
        const updated = prev.map(alert => {
          if (alert.triggered) return alert;

          const rune = runes.find(r => r.id === alert.runeId);
          if (!rune) return alert;

          const shouldTrigger =
            (alert.type === 'below' && rune.floorPriceSats <= alert.targetPrice) ||
            (alert.type === 'above' && rune.floorPriceSats >= alert.targetPrice);

          if (shouldTrigger) {
            const triggered = {
              ...alert,
              triggered: true,
              triggeredAt: Date.now(),
              currentPrice: rune.floorPriceSats,
            };
            triggeredNow.push(triggered);
            return triggered;
          }

          return { ...alert, currentPrice: rune.floorPriceSats };
        });

        saveAlerts(updated);
        return updated;
      });

      return triggeredNow;
    },
    [saveAlerts]
  );

  const clearTriggeredAlerts = useCallback(() => {
    setAlerts(prev => {
      const newList = prev.filter(a => !a.triggered);
      saveAlerts(newList);
      return newList;
    });
  }, [saveAlerts]);

  return {
    alerts,
    addAlert,
    removeAlert,
    checkAlerts,
    clearTriggeredAlerts,
  };
}

// -----------------------------------------------------------------------------
// useRuneDetails - Buscar detalhes de uma Rune específica
// -----------------------------------------------------------------------------

interface UseRuneDetailsReturn {
  marketInfo: any | null;
  orders: any[];
  activities: RuneActivity[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRuneDetails(runeName: string | null): UseRuneDetailsReturn {
  const [marketInfo, setMarketInfo] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [activities, setActivities] = useState<RuneActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!runeName) return;

    setIsLoading(true);
    setError(null);

    try {
      const [infoData, ordersData, activitiesData] = await Promise.all([
        runesApi.fetchRuneMarketInfo(runeName).catch(() => null),
        runesApi.fetchRuneOrders(runeName, { limit: 20 }).catch(() => []),
        runesApi.fetchRuneActivities(runeName, { limit: 20 }).catch(() => []),
      ]);

      setMarketInfo(infoData);
      setOrders(ordersData);
      setActivities(activitiesData);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to fetch rune details';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [runeName]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {
    marketInfo,
    orders,
    activities,
    isLoading,
    error,
    refresh: fetchDetails,
  };
}
