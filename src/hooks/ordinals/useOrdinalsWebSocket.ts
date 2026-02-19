/**
 * useOrdinalsWebSocket Hook - CYPHER V3
 * React hook for Ordinals data via HTTP polling (replaces WebSocket dependency)
 *
 * The WebSocket server on port 8080 is not running, so this implementation
 * polls the existing REST API endpoints every 30 seconds instead.
 *
 * Usage:
 * const { priceUpdates, volumeUpdates, connected } = useOrdinalsWebSocket('bitcoin-punks');
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const POLL_INTERVAL = 30000; // 30 seconds

interface PriceUpdate {
  collectionSymbol: string;
  floorPrice: number;
  floorPriceUSD: number;
  change24h: number;
  timestamp: number;
}

interface VolumeUpdate {
  collectionSymbol: string;
  volume24h: number;
  volumeUSD24h: number;
  trades24h: number;
  timestamp: number;
}

interface NewSale {
  collectionSymbol: string;
  inscriptionId: string;
  price: number;
  priceUSD: number;
  buyer: string;
  seller: string;
  timestamp: number;
}

interface UseOrdinalsWebSocketReturn {
  connected: boolean;
  priceUpdates: PriceUpdate | null;
  volumeUpdates: VolumeUpdate | null;
  recentSales: NewSale[];
  error: string | null;
}

interface CollectionData {
  name: string;
  symbol: string;
  floor: number;
  floorUSD: number;
  volume: number;
  volume24h: number;
  listed: number;
  owners: number;
  supply: number;
  change: number;
  trades24h: number;
}

export function useOrdinalsWebSocket(
  collectionSymbol?: string,
  autoConnect: boolean = true
): UseOrdinalsWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [priceUpdates, setPriceUpdates] = useState<PriceUpdate | null>(null);
  const [volumeUpdates, setVolumeUpdates] = useState<VolumeUpdate | null>(null);
  const [recentSales, setRecentSales] = useState<NewSale[]>([]);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/ordinals/');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      if (!json.success || !json.data?.trending_collections) {
        throw new Error('Invalid response format');
      }

      const collections: CollectionData[] = json.data.trending_collections;

      // If a specific collection is requested, filter to it; otherwise use the first one
      let target: CollectionData | undefined;
      if (collectionSymbol) {
        target = collections.find(
          (c) =>
            c.symbol === collectionSymbol ||
            c.name.toLowerCase() === collectionSymbol.toLowerCase()
        );
      } else if (collections.length > 0) {
        target = collections[0];
      }

      if (target) {
        const now = Date.now();
        setPriceUpdates({
          collectionSymbol: target.symbol || target.name,
          floorPrice: target.floor,
          floorPriceUSD: target.floorUSD,
          change24h: target.change,
          timestamp: now,
        });
        setVolumeUpdates({
          collectionSymbol: target.symbol || target.name,
          volume24h: target.volume24h ?? target.volume,
          volumeUSD24h: target.volume,
          trades24h: target.trades24h,
          timestamp: now,
        });
      }

      setConnected(true);
      setError(null);
    } catch (err) {
      console.error('[useOrdinalsWebSocket] Poll error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setConnected(false);
      // Keep existing data on error so the UI doesn't blank out
    }
  }, [collectionSymbol]);

  useEffect(() => {
    if (!autoConnect) return;

    // Initial fetch
    fetchData();

    // Set up polling interval
    intervalRef.current = setInterval(fetchData, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoConnect, fetchData]);

  return {
    connected,
    priceUpdates,
    volumeUpdates,
    recentSales,
    error,
  };
}

/**
 * useOrdinalsMarketFeed Hook
 * Poll market-wide activity updates from /api/ordinals/activity/
 */
export function useOrdinalsMarketFeed(autoConnect: boolean = true) {
  const [connected, setConnected] = useState(false);
  const [marketUpdates, setMarketUpdates] = useState<any[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/ordinals/activity/');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) {
        throw new Error('Invalid response format');
      }

      // Map activity items into the same shape consumers expect
      const updates = json.data.slice(0, 50).map((item: any) => ({
        type: item.kind || 'listing',
        data: {
          collectionSymbol: item.collectionSymbol || '',
          inscriptionId: item.tokenId || '',
          price: item.price || item.listedPrice || 0,
          blockHeight: item.blockHeight,
          createdAt: item.createdAt,
          inscriptionNumber: item.inscriptionNumber,
        },
      }));

      setMarketUpdates(updates);
      setConnected(true);
    } catch (err) {
      console.error('[useOrdinalsMarketFeed] Poll error:', err);
      setConnected(false);
      // Keep existing data on error
    }
  }, []);

  useEffect(() => {
    if (!autoConnect) return;

    // Initial fetch
    fetchActivity();

    // Set up polling interval
    intervalRef.current = setInterval(fetchActivity, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoConnect, fetchActivity]);

  return { connected, marketUpdates };
}
