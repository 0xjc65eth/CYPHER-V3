import { useState, useEffect, useCallback } from 'react';
import { HiroRunesAPI } from '@/lib/api/hiro/runes';
import { logger } from '@/lib/logger';

interface RuneToken {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  volumeChange24h: number;
  marketCap: number;
  totalSupply: number;
  circulatingSupply: number;
  maxSupply?: number;
  holders: number;
  mintProgress: number;
  mintingActive: boolean;
  etching: {
    block: number;
    transaction: string;
    timestamp: number;
    etcher: string;
  };
  divisibility: number;
  spacers: number;
  premine: number;
  cap: number;
  heightStart?: number;
  heightEnd?: number;
  offsetStart?: number;
  offsetEnd?: number;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category?: string;
}

interface RunesMetrics {
  totalTokens: number;
  totalMarketCap: number;
  totalVolume24h: number;
  totalHolders: number;
  activeMints: number;
  completedMints: number;
  averagePrice: number;
  topGainer: RuneToken;
  topLoser: RuneToken;
  mostVolume: RuneToken;
  marketCapGrowth24h: number;
  holderGrowth24h: number;
}

interface PriceHistoryPoint {
  timestamp: number;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
}

interface RunesTokenPricesData {
  tokens: RuneToken[];
  metrics: RunesMetrics | null;
  priceHistory: PriceHistoryPoint[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Gamma.io collection stat shape (from our API proxy)
interface MECollectionStat {
  rune: string;
  runeName?: string;
  spacedRune?: string;
  symbol?: string;
  floorUnitPrice?: { formatted?: string; value?: number };
  marketCap?: number;
  volume?: number;
  volumeChange?: number;
  sales?: number;
  holders?: number;
  listedCount?: number;
  totalSupply?: string;
  ownerCount?: number;
}

// Gamma.io market info shape (from our API proxy)
interface MEMarketInfo {
  rune: string;
  runeName?: string;
  spacedRune?: string;
  symbol?: string;
  floorUnitPrice?: { formatted?: string; value?: number };
  marketCap?: number;
  totalVolume?: number;
  volume24h?: number;
  holders?: number;
  totalSupply?: string;
  listedCount?: number;
  txnCount24h?: number;
  mintProgress?: number;
  priceChange24h?: number;
  divisibility?: number;
}

// Gamma.io activity shape
interface MEActivity {
  id: string;
  type: string;
  rune: string;
  amount?: string;
  formattedAmount?: string;
  unitPrice?: { formatted?: string; value?: number };
  totalPrice?: { formatted?: string; value?: number };
  timestamp?: string;
  createdAt?: string;
}

/**
 * Fetch Gamma.io collection stats (batch - top runes)
 */
async function fetchMECollectionStats(limit: number = 30): Promise<MECollectionStat[]> {
  try {
    const res = await fetch(`/api/marketplace/runes/collection-stats/?limit=${limit}&sortBy=volume&sortDirection=desc&window=1d`
    );
    if (!res.ok) throw new Error(`ME collection-stats ${res.status}`);
    const data = await res.json();
    return data.runes || [];
  } catch (err) {
    logger.error(err instanceof Error ? err : new Error(String(err)), 'Failed to fetch ME collection stats');
    return [];
  }
}

/**
 * Fetch Gamma.io market info for a single rune
 */
async function fetchMEMarketInfo(rune: string): Promise<MEMarketInfo | null> {
  try {
    const encodedRune = encodeURIComponent(rune);
    const res = await fetch(`/api/marketplace/runes/market/${encodedRune}/`);
    if (!res.ok) throw new Error(`ME market info ${res.status}`);
    return await res.json();
  } catch (err) {
    logger.error(err instanceof Error ? err : new Error(String(err)), `Failed to fetch ME market info for ${rune}`);
    return null;
  }
}

/**
 * Fetch Gamma.io activities for a rune (for price history)
 */
async function fetchMEActivities(rune: string, limit: number = 100): Promise<MEActivity[]> {
  try {
    const encodedRune = encodeURIComponent(rune);
    const res = await fetch(`/api/marketplace/runes/activities/${encodedRune}/?type=buying&limit=${limit}`
    );
    if (!res.ok) throw new Error(`ME activities ${res.status}`);
    const data = await res.json();
    return data.activities || [];
  } catch (err) {
    logger.error(err instanceof Error ? err : new Error(String(err)), `Failed to fetch ME activities for ${rune}`);
    return [];
  }
}

/**
 * Build OHLCV price history from Gamma.io activities.
 * Groups activities into time buckets based on timeframe.
 */
function buildPriceHistory(
  activities: MEActivity[],
  timeframe: '1d' | '7d' | '30d' | '90d' | '1y' | 'all'
): PriceHistoryPoint[] {
  // Filter to activities that have price data
  const priced = activities
    .filter(a => a.unitPrice?.value && a.unitPrice.value > 0)
    .map(a => ({
      timestamp: a.timestamp ? new Date(a.timestamp).getTime() :
                 a.createdAt ? new Date(a.createdAt).getTime() : 0,
      price: (a.unitPrice!.value || 0) / 100_000_000, // sats to BTC
      volume: a.totalPrice?.value ? a.totalPrice.value / 100_000_000 : 0,
    }))
    .filter(a => a.timestamp > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (priced.length === 0) return [];

  // Determine bucket size based on timeframe
  const bucketMs = timeframe === '1d' ? 3600_000 :        // 1 hour
                   timeframe === '7d' ? 3600_000 * 4 :     // 4 hours
                   timeframe === '30d' ? 86400_000 :       // 1 day
                   timeframe === '90d' ? 86400_000 * 3 :   // 3 days
                   86400_000 * 7;                           // 1 week

  // Group into buckets
  const buckets = new Map<number, { prices: number[]; volumes: number[] }>();
  for (const p of priced) {
    const bucketKey = Math.floor(p.timestamp / bucketMs) * bucketMs;
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, { prices: [], volumes: [] });
    }
    const bucket = buckets.get(bucketKey)!;
    bucket.prices.push(p.price);
    bucket.volumes.push(p.volume);
  }

  // Convert to OHLCV points
  const points: PriceHistoryPoint[] = [];
  const sortedKeys = Array.from(buckets.keys()).sort((a, b) => a - b);
  for (const key of sortedKeys) {
    const bucket = buckets.get(key)!;
    const prices = bucket.prices;
    const totalVolume = bucket.volumes.reduce((s, v) => s + v, 0);
    points.push({
      timestamp: key,
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
      price: prices[prices.length - 1],
      volume: totalVolume,
    });
  }

  return points;
}

export function useRunesTokenPrices(
  selectedToken: string = 'all',
  timeframe: '1d' | '7d' | '30d' | '90d' | '1y' | 'all' = '7d'
): RunesTokenPricesData {
  const [data, setData] = useState<RunesTokenPricesData>({
    tokens: [],
    metrics: null,
    priceHistory: [],
    loading: true,
    error: null,
    refetch: () => {}
  });

  const hiroAPI = new HiroRunesAPI();

  const fetchRunesData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch Hiro etchings and ME collection stats in parallel
      const [etchingsResponse, meStats] = await Promise.all([
        hiroAPI.getEtchings({ limit: 100, sort_by: 'minted', order: 'desc' }),
        fetchMECollectionStats(50),
      ]);

      // Build a lookup map from ME collection stats by rune name
      const meStatsMap = new Map<string, MECollectionStat>();
      for (const stat of meStats) {
        if (stat.rune) meStatsMap.set(stat.rune, stat);
        if (stat.runeName) meStatsMap.set(stat.runeName, stat);
        if (stat.spacedRune) meStatsMap.set(stat.spacedRune, stat);
      }

      // For each Hiro etching, try to find ME market data
      // Also batch-fetch individual market info for top runes that have ME stats
      const topRuneNames = meStats.slice(0, 20).map(s => s.rune).filter(Boolean);
      const marketInfoPromises = topRuneNames.map(rune => fetchMEMarketInfo(rune));
      const marketInfoResults = await Promise.all(marketInfoPromises);

      // Build market info lookup
      const meMarketMap = new Map<string, MEMarketInfo>();
      for (const info of marketInfoResults) {
        if (info && info.rune) {
          meMarketMap.set(info.rune, info);
          if (info.runeName) meMarketMap.set(info.runeName, info);
          if (info.spacedRune) meMarketMap.set(info.spacedRune, info);
        }
      }

      // Convert to RuneToken[]
      const tokens: RuneToken[] = [];

      for (const etching of etchingsResponse.results) {
        try {
          const totalSupply = parseFloat(etching.total_supply) || 0;
          const minted = parseFloat(etching.minted) || 0;
          const mintProgress = totalSupply > 0 ? (minted / totalSupply) * 100 : 0;
          const mintingActive = mintProgress < 100 && (etching.terms?.cap ? parseFloat(etching.terms.cap) > minted : false);

          // Look up ME data by various name forms
          const meStat = meStatsMap.get(etching.name) ||
                         meStatsMap.get(etching.rune_id) || null;
          const meMarket = meMarketMap.get(etching.name) ||
                           meMarketMap.get(etching.rune_id) || null;

          // Price: prefer market info floorUnitPrice, fall back to collection stat
          let price = 0;
          if (meMarket?.floorUnitPrice?.value) {
            price = meMarket.floorUnitPrice.value / 100_000_000;
          } else if (meStat?.floorUnitPrice?.value) {
            price = meStat.floorUnitPrice.value / 100_000_000;
          }

          // Price change from ME market info
          const priceChangePercent24h = meMarket?.priceChange24h ?? 0;
          const priceChange24h = price * (priceChangePercent24h / 100);

          // Volume from ME
          const volume24h = meMarket?.volume24h ??
                            meStat?.volume ?? 0;
          const volumeChange24h = meStat?.volumeChange ?? 0;

          // Market cap from ME
          const marketCap = meMarket?.marketCap ??
                            meStat?.marketCap ??
                            (price * minted);

          // Holders from ME
          const holders = meMarket?.holders ??
                          meStat?.holders ??
                          meStat?.ownerCount ?? 0;

          const token: RuneToken = {
            id: etching.rune_id,
            name: etching.name,
            symbol: etching.symbol || etching.name.substring(0, 6).toUpperCase(),
            price,
            priceChange24h,
            priceChangePercent24h,
            volume24h,
            volumeChange24h,
            marketCap,
            totalSupply,
            circulatingSupply: minted,
            maxSupply: totalSupply,
            holders,
            mintProgress,
            mintingActive,
            etching: {
              block: etching.genesis_height,
              transaction: etching.genesis_tx_hash,
              timestamp: etching.timestamp,
              etcher: 'Unknown'
            },
            divisibility: etching.divisibility,
            spacers: 0,
            premine: parseFloat(etching.premine) || 0,
            cap: parseFloat(etching.terms?.cap || '0'),
            heightStart: etching.terms?.height_start,
            heightEnd: etching.terms?.height_end,
            offsetStart: etching.terms?.offset_start,
            offsetEnd: etching.terms?.offset_end,
            rarity: mintProgress > 99 ? 'rare' : mintProgress > 90 ? 'uncommon' : 'common',
            category: etching.name.includes('DOG') || etching.name.includes('MEME') ? 'meme' :
                     etching.name.includes('WIZARD') || etching.name.includes('ART') ? 'art' : 'utility'
          };

          tokens.push(token);
        } catch (error) {
          logger.error(error instanceof Error ? error : new Error(String(error)), `Error processing rune ${etching.name}`);
        }
      }

      // Sort tokens by volume (most active first) so the top ones with data are prominent
      tokens.sort((a, b) => b.volume24h - a.volume24h);

      // Compute metrics from real data
      const tokensWithPrice = tokens.filter(t => t.price > 0);
      const sortedByChange = [...tokensWithPrice].sort((a, b) => b.priceChangePercent24h - a.priceChangePercent24h);
      const sortedByVolume = [...tokensWithPrice].sort((a, b) => b.volume24h - a.volume24h);

      // Fallback token for metrics if no priced tokens exist
      const fallbackToken = tokens[0] || {
        id: '', name: 'N/A', symbol: 'N/A', price: 0, priceChange24h: 0,
        priceChangePercent24h: 0, volume24h: 0, volumeChange24h: 0, marketCap: 0,
        totalSupply: 0, circulatingSupply: 0, holders: 0, mintProgress: 0,
        mintingActive: false, etching: { block: 0, transaction: '', timestamp: 0, etcher: '' },
        divisibility: 0, spacers: 0, premine: 0, cap: 0,
      } as RuneToken;

      const totalMarketCap = tokens.reduce((sum, t) => sum + t.marketCap, 0);
      const totalVolume24h = tokens.reduce((sum, t) => sum + t.volume24h, 0);
      const totalHolders = tokens.reduce((sum, t) => sum + t.holders, 0);

      const metrics: RunesMetrics = {
        totalTokens: tokens.length,
        totalMarketCap,
        totalVolume24h,
        totalHolders,
        activeMints: tokens.filter(t => t.mintingActive).length,
        completedMints: tokens.filter(t => !t.mintingActive).length,
        averagePrice: tokensWithPrice.length > 0
          ? tokensWithPrice.reduce((s, t) => s + t.price, 0) / tokensWithPrice.length
          : 0,
        topGainer: sortedByChange[0] || fallbackToken,
        topLoser: sortedByChange[sortedByChange.length - 1] || fallbackToken,
        mostVolume: sortedByVolume[0] || fallbackToken,
        marketCapGrowth24h: 0,
        holderGrowth24h: 0,
      };

      // Fetch price history from ME activities
      let priceHistory: PriceHistoryPoint[] = [];
      if (selectedToken !== 'all') {
        const token = tokens.find(t => t.id === selectedToken);
        if (token) {
          const activities = await fetchMEActivities(token.name, 200);
          priceHistory = buildPriceHistory(activities, timeframe);
        }
      } else if (sortedByVolume.length > 0) {
        // For "all" view, show the top volume rune's price history
        const topRune = sortedByVolume[0];
        const activities = await fetchMEActivities(topRune.name, 200);
        priceHistory = buildPriceHistory(activities, timeframe);
      }

      setData({
        tokens,
        metrics,
        priceHistory,
        loading: false,
        error: null,
        refetch: fetchRunesData
      });

    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Error fetching runes data:');
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch runes data'
      }));
    }
  }, [selectedToken, timeframe]);

  useEffect(() => {
    fetchRunesData();

    // Real-time updates every 30 seconds
    const interval = setInterval(fetchRunesData, 30000);

    return () => clearInterval(interval);
  }, [fetchRunesData]);

  return {
    ...data,
    refetch: fetchRunesData
  };
}
