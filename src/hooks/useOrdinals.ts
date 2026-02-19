/**
 * Custom React Hooks for Ordinals System - CYPHER V3
 * Professional Bloomberg Terminal-style hooks for Bitcoin Ordinals collections
 *
 * Features:
 * - useCollections: Fetch and filter collections with 30s auto-refresh
 * - useMarketMetrics: Calculate aggregate market metrics (memoized)
 * - useMarketInsights: Generate market strength/liquidity/risk insights
 * - usePriceAlerts: Manage price alerts with localStorage and browser notifications
 * - useWatchlist: Manage favorites/watchlist with localStorage persistence
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ProcessedCollection,
  MarketMetrics,
  FilterOptions,
  PriceAlert,
  SortField,
  DEFAULT_ORDINALS_CONFIG
} from '@/types/ordinals';

/**
 * Target collection symbols to fetch from Magic Eden
 * (Not used directly - API route has its own list, but kept for reference)
 */
const COLLECTION_SYMBOLS = [
  'bitcoin-punks',
  'nodemonkes',
  'bitcoin-puppets',
  'quantum-cats',
  'ordinal-maxi-biz',
  'runestones',
  'bitmap',
  'ink',
  'pizza-ninjas',
  'taproot-wizards',
  'bitcoin-frogs',
  'natcats',
  'rsic',
  'degods-btc',
  'ordinal-punks',
] as const;

/**
 * Market insights derived from market metrics
 */
export interface MarketInsights {
  marketStrength: 'strong' | 'moderate' | 'weak';
  liquidityScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  topPerformers: string[]; // Collection IDs
  recommendations: string[];
}

/**
 * useCollections Hook
 * Fetches and filters Bitcoin Ordinals collections with auto-refresh
 *
 * @param filters - Filter options for collections
 * @returns Collections data, loading state, error, and refresh function
 */
export function useCollections(filters?: Partial<FilterOptions>, watchlist: string[] = []) {
  const [collections, setCollections] = useState<ProcessedCollection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Track previous watchlist to avoid unnecessary refetches
  const watchlistRef = useRef(watchlist);
  watchlistRef.current = watchlist;

  // Fetch collections from Magic Eden API
  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 🔧 FIX: Add trailing slash to avoid 308 redirect
      const response = await fetch('/api/ordinals/');
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      const json = await response.json();

      if (!json.success || !json.data?.trending_collections) {
        throw new Error('Invalid response from ordinals API');
      }

      const processed: ProcessedCollection[] = [];

      for (const c of json.data.trending_collections) {
        const floorPrice = c.floor ?? 0; // already in BTC from API
        const supply = c.supply ?? 0;
        const listed = c.listed ?? 0;

        // Sanitize owners: must be a reasonable integer (not satoshi counts or garbage values)
        const rawOwners = Number(c.owners ?? 0);
        const owners = (Number.isFinite(rawOwners) && rawOwners > 0 && rawOwners < 1_000_000)
          ? Math.round(rawOwners)
          : 0;

        // Volume data from API
        // volume24h may be 0 if only stat endpoint was used (activities calls cause 429s)
        // volume (all-time) is available from the stat endpoint
        const volume24h = c.volume24h ?? 0;
        const volume7d = c.volume7d ?? 0;
        const volumeUSD24h = c.volumeUSD24h ?? 0;
        const totalVolume = c.volume ?? 0; // all-time volume in BTC

        const volumeHistory: number[] = c.volumeHistory || [];

        processed.push({
          id: c.symbol,
          name: c.name ?? c.symbol,
          symbol: c.symbol,
          floorPrice,
          floorPriceUSD: c.floorUSD ?? 0,
          // If volume24h is 0 but totalVolume exists, use totalVolume for display
          // The UI will label it correctly as "Total Vol" vs "24h Vol"
          volume24h,
          volume7d,
          volumeUSD24h,
          totalVolume, // all-time volume passthrough
          marketCap: floorPrice * supply,
          listed,
          owners,
          supply,
          image: c.imageURI || '',
          priceChange24h: c.change ?? 0,
          priceChange7d: c.change7d ?? 0,
          priceChange30d: c.change30d ?? 0,
          bestBid: c.bestBid ?? floorPrice,
          bidAskSpread: c.bidAskSpread ?? 0,
          vwap24h: c.vwap24h ?? 0,
          trades24h: c.trades24h ?? 0,
          volumeHistory,
          isFavorite: watchlistRef.current.includes(c.symbol),
        });
      }

      // Sort by floor price descending by default
      processed.sort((a, b) => b.floorPrice - a.floorPrice);

      setCollections(processed);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch collections';
      setError(errorMessage);
      console.error('Error fetching collections:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ FIX: Use ref to stabilize fetchCollections reference and prevent infinite loop
  const fetchRef = useRef(fetchCollections);
  useEffect(() => {
    fetchRef.current = fetchCollections;
  }, [fetchCollections]);

  // Auto-refresh every 30 seconds - uses stable ref to avoid infinite loop
  useEffect(() => {
    fetchRef.current(); // Initial fetch on mount

    const interval = setInterval(() => {
      fetchRef.current(); // Auto-refresh every 30s
    }, DEFAULT_ORDINALS_CONFIG.DEFAULT_REFRESH_INTERVAL * 1000);

    return () => clearInterval(interval);
  }, []); // ✅ Empty deps - executes only once on mount

  // Update favorite status when watchlist changes (without refetching)
  useEffect(() => {
    setCollections(prev =>
      prev.map(collection => ({
        ...collection,
        isFavorite: watchlist.includes(collection.id),
      }))
    );
  }, [watchlist]);

  // Apply filters and sorting
  const filteredCollections = useMemo(() => {
    let filtered = [...collections];

    if (!filters) return filtered;

    // Apply search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        collection =>
          collection.name.toLowerCase().includes(query) ||
          collection.symbol.toLowerCase().includes(query)
      );
    }

    // Apply favorites filter
    if (filters.showFavoritesOnly) {
      filtered = filtered.filter(collection => collection.isFavorite);
    }

    // Apply price filters
    if (filters.minPrice !== undefined) {
      filtered = filtered.filter(collection => collection.floorPrice >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter(collection => collection.floorPrice <= filters.maxPrice!);
    }

    // Apply volume filter
    if (filters.minVolume !== undefined) {
      filtered = filtered.filter(collection => collection.volume24h >= filters.minVolume!);
    }

    // Apply sorting
    if (filters.sortBy) {
      const sortField = filters.sortBy;
      const sortOrder = filters.sortOrder || 'desc';

      filtered.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        // Handle string comparison for name/symbol
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        // Handle numeric comparison
        const aNum = Number(aValue) || 0;
        const bNum = Number(bValue) || 0;

        return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
      });
    }

    return filtered;
  }, [collections, filters]);

  return {
    collections: filteredCollections,
    allCollections: collections,
    loading,
    error,
    lastUpdated,
    refresh: fetchCollections
  };
}

/**
 * useMarketMetrics Hook
 * Calculates aggregate market metrics from collections (memoized for performance)
 *
 * @param collections - Array of processed collections
 * @returns Aggregate market metrics
 */
export function useMarketMetrics(collections: ProcessedCollection[]): MarketMetrics {
  return useMemo(() => {
    if (collections.length === 0) {
      return {
        totalCollections: 0,
        totalVolume24h: 0,
        totalVolume7d: 0,
        avgFloorPrice: 0,
        totalListed: 0,
        totalOwners: 0,
        marketCap: 0
      };
    }

    const metrics = collections.reduce(
      (acc, collection) => {
        acc.totalVolume24h += collection.volume24h;
        acc.totalVolume7d += collection.volume7d;
        acc.totalListed += collection.listed;
        acc.totalOwners += collection.owners;
        acc.marketCap += collection.marketCap;
        acc.floorPriceSum += collection.floorPrice;
        return acc;
      },
      {
        totalVolume24h: 0,
        totalVolume7d: 0,
        totalListed: 0,
        totalOwners: 0,
        marketCap: 0,
        floorPriceSum: 0
      }
    );

    return {
      totalCollections: collections.length,
      totalVolume24h: metrics.totalVolume24h,
      totalVolume7d: metrics.totalVolume7d,
      avgFloorPrice: metrics.floorPriceSum / collections.length,
      totalListed: metrics.totalListed,
      totalOwners: metrics.totalOwners,
      marketCap: metrics.marketCap
    };
  }, [collections]);
}

/**
 * useMarketInsights Hook
 * Generates market strength, liquidity, and risk insights from metrics
 *
 * @param metrics - Market metrics
 * @param collections - Collections for analysis
 * @returns Market insights and recommendations
 */
export function useMarketInsights(
  metrics: MarketMetrics,
  collections: ProcessedCollection[]
): MarketInsights {
  return useMemo(() => {
    // Safely calculate market strength based on volume trends
    const avg7dVolume = (metrics.totalVolume7d / 7) || 1;
    const volumeRatio = metrics.totalVolume24h / avg7dVolume;
    let marketStrength: 'strong' | 'moderate' | 'weak';

    if (volumeRatio > 1.5) {
      marketStrength = 'strong';
    } else if (volumeRatio > 0.8) {
      marketStrength = 'moderate';
    } else {
      marketStrength = 'weak';
    }

    // Calculate liquidity score (0-100) with safety checks
    // Based on listed items vs supply and trading activity
    const validCollections = collections.filter(c => c.supply > 0);
    const listingRatio = validCollections.length > 0
      ? validCollections.reduce((sum, c) => sum + (c.listed / c.supply || 0), 0) / validCollections.length
      : 0;

    const volumeScore = metrics.marketCap > 0
      ? Math.min((metrics.totalVolume24h / metrics.marketCap) * 100, 50)
      : 0;

    const liquidityScore = Math.min(Math.round(listingRatio * 50 + volumeScore), 100) || 0;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (liquidityScore > 70 && marketStrength === 'strong') {
      riskLevel = 'low';
    } else if (liquidityScore > 40 && marketStrength !== 'weak') {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    // Identify top performers (top 5 by 24h price change)
    const topPerformers = collections
      .filter(c => c.priceChange24h > 0)
      .sort((a, b) => b.priceChange24h - a.priceChange24h)
      .slice(0, 5)
      .map(c => c.id);

    // Generate recommendations
    const recommendations: string[] = [];

    if (marketStrength === 'strong') {
      recommendations.push('Market showing strong momentum - consider active trading');
    } else if (marketStrength === 'weak') {
      recommendations.push('Market cooling down - watch for accumulation opportunities');
    }

    if (liquidityScore < 40) {
      recommendations.push('Low liquidity - exercise caution with large positions');
    } else if (liquidityScore > 70) {
      recommendations.push('High liquidity - favorable conditions for entry/exit');
    }

    if (riskLevel === 'high') {
      recommendations.push('Elevated risk - consider smaller position sizes');
    }

    if (topPerformers.length > 0) {
      recommendations.push(`${topPerformers.length} collections showing positive momentum`);
    }

    return {
      marketStrength,
      liquidityScore,
      riskLevel,
      topPerformers,
      recommendations
    };
  }, [metrics, collections]);
}

/**
 * usePriceAlerts Hook
 * Manages price alerts with localStorage persistence and browser notifications
 *
 * @returns Alert management functions and state
 */
export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);

  // Load alerts from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('ordinals-price-alerts');
      if (stored) {
        const parsedAlerts = JSON.parse(stored) as PriceAlert[];
        setAlerts(parsedAlerts);
      }
    } catch (error) {
      console.error('Error loading price alerts from localStorage:', error);
    }

    // Check notification permission
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Save alerts to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('ordinals-price-alerts', JSON.stringify(alerts));
    } catch (error) {
      console.error('Error saving price alerts to localStorage:', error);
    }
  }, [alerts]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setNotificationsEnabled(granted);
      return granted;
    }

    return false;
  }, []);

  // Add new alert
  const addAlert = useCallback(
    (
      collectionId: string,
      collectionName: string,
      type: 'above' | 'below',
      targetPrice: number,
      currentPrice: number
    ) => {
      const newAlert: PriceAlert = {
        id: `${collectionId}-${Date.now()}`,
        collectionId,
        collectionName,
        type,
        targetPrice,
        currentPrice,
        isActive: true,
        createdAt: Date.now()
      };

      setAlerts(prev => [...prev, newAlert]);
      return newAlert.id;
    },
    []
  );

  // Remove alert
  const removeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  // Toggle alert active state
  const toggleAlert = useCallback((alertId: string) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, isActive: !alert.isActive } : alert
      )
    );
  }, []);

  // Update alert current price
  const updateAlertPrice = useCallback((alertId: string, currentPrice: number) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, currentPrice } : alert
      )
    );
  }, []);

  // Check alerts and trigger notifications
  const checkAlerts = useCallback(
    (collections: ProcessedCollection[]) => {
      if (!notificationsEnabled) return;

      alerts.forEach(alert => {
        if (!alert.isActive) return;

        const collection = collections.find(c => c.id === alert.collectionId);
        if (!collection) return;

        const shouldTrigger =
          (alert.type === 'above' && collection.floorPrice >= alert.targetPrice) ||
          (alert.type === 'below' && collection.floorPrice <= alert.targetPrice);

        if (shouldTrigger) {
          // Send notification
          new Notification(`Price Alert: ${alert.collectionName}`, {
            body: `Floor price is now ${collection.floorPrice} BTC (${alert.type} ${alert.targetPrice} BTC)`,
            icon: collection.image,
            tag: alert.id
          });

          // Deactivate alert after triggering
          toggleAlert(alert.id);
        }

        // Update current price
        if (alert.currentPrice !== collection.floorPrice) {
          updateAlertPrice(alert.id, collection.floorPrice);
        }
      });
    },
    [alerts, notificationsEnabled, toggleAlert, updateAlertPrice]
  );

  // Clear all alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    notificationsEnabled,
    addAlert,
    removeAlert,
    toggleAlert,
    updateAlertPrice,
    checkAlerts,
    clearAlerts,
    requestNotificationPermission
  };
}

/**
 * useWatchlist Hook
 * Manages favorites/watchlist with localStorage persistence
 *
 * @returns Watchlist management functions and state
 */
export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);

  // Load watchlist from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('ordinals-watchlist');
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setWatchlist(parsed);
      }
    } catch (error) {
      console.error('Error loading watchlist from localStorage:', error);
    }
  }, []);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('ordinals-watchlist', JSON.stringify(watchlist));
    } catch (error) {
      console.error('Error saving watchlist to localStorage:', error);
    }
  }, [watchlist]);

  // Add collection to watchlist
  const addToWatchlist = useCallback((collectionId: string) => {
    setWatchlist(prev => {
      if (prev.includes(collectionId)) return prev;
      return [...prev, collectionId];
    });
  }, []);

  // Remove collection from watchlist
  const removeFromWatchlist = useCallback((collectionId: string) => {
    setWatchlist(prev => prev.filter(id => id !== collectionId));
  }, []);

  // Toggle collection in watchlist
  const toggleWatchlist = useCallback((collectionId: string) => {
    setWatchlist(prev => {
      if (prev.includes(collectionId)) {
        return prev.filter(id => id !== collectionId);
      }
      return [...prev, collectionId];
    });
  }, []);

  // Check if collection is in watchlist
  const isInWatchlist = useCallback(
    (collectionId: string) => {
      return watchlist.includes(collectionId);
    },
    [watchlist]
  );

  // Clear watchlist
  const clearWatchlist = useCallback(() => {
    setWatchlist([]);
  }, []);

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    isInWatchlist,
    clearWatchlist
  };
}

/**
 * Combined hook that provides all Ordinals functionality
 * Convenient wrapper for common use cases
 *
 * @param filters - Optional filter options
 * @returns All hooks combined
 */
export function useOrdinalsSystem(filters?: Partial<FilterOptions>) {
  const collectionsData = useCollections(filters);
  const metrics = useMarketMetrics(collectionsData.collections);
  const insights = useMarketInsights(metrics, collectionsData.collections);
  const priceAlerts = usePriceAlerts();
  const watchlist = useWatchlist();

  // Auto-check alerts when collections update
  useEffect(() => {
    if (!collectionsData.loading && collectionsData.collections.length > 0) {
      priceAlerts.checkAlerts(collectionsData.collections);
    }
  }, [collectionsData.collections, collectionsData.loading, priceAlerts]);

  return {
    ...collectionsData,
    metrics,
    insights,
    priceAlerts,
    watchlist
  };
}
