'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

interface CryptoAsset {
  symbol: string;
  name: string;
  price: number;
  change1h: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  image: string;
}

interface ForexPair {
  pair: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  available?: boolean;
}

interface CommodityAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
  available?: boolean;
}

interface IndexAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  available?: boolean;
}

interface StockAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  available?: boolean;
}

export interface MultiAssetData {
  crypto: CryptoAsset[];
  forex: ForexPair[];
  commodities: CommodityAsset[];
  indices: IndexAsset[];
  stocks: StockAsset[];
  timestamp: number;
}

// ETF → index symbol mapping (must match API route)
const ETF_TO_INDEX: Record<string, string> = { SPY: 'SPX', QQQ: 'NDX', DIA: 'DJI', IWM: 'RUT' };
const INDEX_NAMES: Record<string, string> = { SPY: 'S&P 500', QQQ: 'NASDAQ', DIA: 'Dow Jones', IWM: 'Russell 2000' };
const FOREX_NAMES: Record<string, string> = {
  'AUD/USD': 'Australian Dollar / US Dollar',
  'USD/CHF': 'US Dollar / Swiss Franc',
  'USD/CAD': 'US Dollar / Canadian Dollar',
};

/**
 * Hook that fetches multi-asset data in 2 staggered batches to respect
 * TwelveData's 8 credits/minute rate limit on the free tier.
 *
 * - Batch 1 (immediate): CoinGecko crypto + 8 TwelveData symbols (all categories)
 * - Batch 2 (after 65s): 8 more TwelveData symbols (enrichment)
 *
 * Both batches are cached by Vercel CDN for 5 min, so after the first
 * successful cycle, all data loads instantly.
 */
export function useMultiAssetData(refreshInterval = 120000) {
  const [data, setData] = useState<MultiAssetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const enrichTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enrichInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch batch 1 (primary: crypto + priority TwelveData symbols)
  const fetchPrimary = useCallback(async () => {
    try {
      const res = await fetch('/api/market/multi-asset/?batch=1');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData((prev) => {
        if (!prev) return json;
        // Merge: keep enriched data from batch 2 if we have it
        return mergeData(json, prev);
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch batch 2 (enrichment: remaining TwelveData symbols)
  const fetchEnrich = useCallback(async () => {
    try {
      const res = await fetch('/api/market/multi-asset/?batch=2');
      if (!res.ok) return; // Silently skip — batch 1 data is enough
      const json = await res.json();
      if (!json.quotes || Object.keys(json.quotes).length === 0) return;

      // Merge enrichment quotes into current data
      setData((prev) => {
        if (!prev) return prev;
        return mergeEnrichment(prev, json.quotes);
      });
    } catch {
      // Silently skip enrichment failures
    }
  }, []);

  useEffect(() => {
    // Batch 1: fetch immediately + poll every refreshInterval
    fetchPrimary();
    const primaryId = setInterval(fetchPrimary, refreshInterval);

    // Batch 2: fetch after 65s delay (to avoid TwelveData rate limit),
    // then poll every refreshInterval
    enrichTimer.current = setTimeout(() => {
      fetchEnrich();
      enrichInterval.current = setInterval(fetchEnrich, refreshInterval);
    }, 65000);

    return () => {
      clearInterval(primaryId);
      if (enrichTimer.current) clearTimeout(enrichTimer.current);
      if (enrichInterval.current) clearInterval(enrichInterval.current);
    };
  }, [fetchPrimary, fetchEnrich, refreshInterval]);

  return { data, loading, error, refetch: fetchPrimary };
}

// --- Merge helpers ---

/** Merge fresh batch 1 data with existing enriched data */
function mergeData(fresh: MultiAssetData, existing: MultiAssetData): MultiAssetData {
  return {
    crypto: fresh.crypto, // Always use fresh crypto
    forex: mergeByKey(fresh.forex, existing.forex, 'pair'),
    commodities: mergeByKey(fresh.commodities, existing.commodities, 'symbol'),
    indices: mergeByKey(fresh.indices, existing.indices, 'symbol'),
    stocks: mergeByKey(fresh.stocks, existing.stocks, 'symbol'),
    timestamp: fresh.timestamp,
  };
}

/** Merge enrichment quotes into existing data */
function mergeEnrichment(data: MultiAssetData, quotes: Record<string, any>): MultiAssetData {
  const enrichedForex = [...data.forex];
  const enrichedIndices = [...data.indices];
  const enrichedStocks = [...data.stocks];

  for (const [sym, q] of Object.entries(quotes)) {
    const close = parseFloat(q.close) || 0;
    const change = parseFloat(q.change) || 0;
    const pct = parseFloat(q.percent_change) || 0;

    // Forex enrichment
    if (sym.includes('/') && !sym.includes('XAU') && !sym.includes('XAG')) {
      const idx = enrichedForex.findIndex((f) => f.pair === sym);
      const entry = { pair: sym, price: close, change, changePercent: pct, previousClose: close - change, available: true };
      if (idx >= 0) enrichedForex[idx] = entry;
      else enrichedForex.push(entry);
    }

    // Index ETF enrichment
    if (ETF_TO_INDEX[sym]) {
      const displaySym = ETF_TO_INDEX[sym];
      const idx = enrichedIndices.findIndex((i) => i.symbol === displaySym);
      const entry = { symbol: displaySym, name: INDEX_NAMES[sym] || sym, price: close, change, changePercent: pct, available: true };
      if (idx >= 0) enrichedIndices[idx] = entry;
      else enrichedIndices.push(entry);
    }

    // Stock enrichment
    if (!sym.includes('/') && !ETF_TO_INDEX[sym]) {
      const idx = enrichedStocks.findIndex((s) => s.symbol === sym);
      const entry = { symbol: sym, name: q.name || sym, price: close, change, changePercent: pct, volume: parseInt(q.volume, 10) || 0, available: true };
      if (idx >= 0) enrichedStocks[idx] = entry;
      else enrichedStocks.push(entry);
    }
  }

  return {
    ...data,
    forex: enrichedForex,
    indices: enrichedIndices,
    stocks: enrichedStocks,
    timestamp: Date.now(),
  };
}

/** Merge two arrays by key, preferring items with available=true */
function mergeByKey<T extends Record<string, any>>(fresh: T[], existing: T[], key: string): T[] {
  const map = new Map<string, T>();
  // Add existing items first
  for (const item of existing) {
    if (item[key]) map.set(item[key], item);
  }
  // Overwrite with fresh items (but keep existing enriched items that fresh doesn't have)
  for (const item of fresh) {
    if (item[key]) {
      const existingItem = map.get(item[key]);
      // Keep the enriched version if fresh version has no data
      if (existingItem?.available && !item.available) continue;
      map.set(item[key], item);
    }
  }
  return Array.from(map.values());
}
