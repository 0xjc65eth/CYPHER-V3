/**
 * Bitcoin Ecosystem Service
 * Provides Bitcoin ecosystem data and statistics via real API sources.
 *
 * Data sources:
 * - Runes: Hiro API via /api/runes/list
 * - Ordinals: Hiro API
 * - Mempool: mempool.space
 * - BRC-20: UniSat/Hiro
 */

export interface BitcoinEcosystemStats {
  totalRunes: number;
  runesVolume24h: number;
  activeHolders: number;
  totalTransactions: number;
  totalInscriptions: number;
  ordinalsVolume24h: number;
  brc20Tokens: number;
  networkHashrate: number;
  mempool: {
    size: number;
    avgFee: number;
  };
}

export interface RuneData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  marketCap: number;
  supply: number;
  holders: number;
  mints: number;
  mintProgress: number;
}

import { RareSatData } from '@/types/rare-sats';

const BASE_URL = typeof window !== 'undefined'
  ? ''
  : `http://localhost:${process.env.PORT || 4444}`;

const FETCH_TIMEOUT = 10000;

async function fetchInternal<T>(path: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const response = await fetch(`${BASE_URL}${path}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const json = await response.json();
    return json.data ?? json;
  } catch {
    return null;
  }
}

async function fetchExternal<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', ...headers },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

class BitcoinEcosystemService {
  private static instance: BitcoinEcosystemService;

  static getInstance(): BitcoinEcosystemService {
    if (!BitcoinEcosystemService.instance) {
      BitcoinEcosystemService.instance = new BitcoinEcosystemService();
    }
    return BitcoinEcosystemService.instance;
  }

  async getEcosystemStats(): Promise<BitcoinEcosystemStats> {
    const hiroHeaders: Record<string, string> = {};
    if (process.env.HIRO_API_KEY) hiroHeaders['x-hiro-api-key'] = process.env.HIRO_API_KEY;

    // Fetch from multiple real sources in parallel
    const [runesResult, mempoolResult, ordinalsResult, miningResult] = await Promise.allSettled([
      fetchInternal<any>('/api/runes/list?limit=50'),
      fetchExternal<any>('https://mempool.space/api/mempool'),
      fetchExternal<any>('https://api.hiro.so/ordinals/v1/stats', hiroHeaders),
      fetchInternal<any>('/api/mining-data'),
    ]);

    // Runes data from our API
    const runesData = runesResult.status === 'fulfilled' ? runesResult.value : null;
    const runes = runesData?.results || runesData?.data || [];
    const totalRunes = runesData?.total ?? runes.length;
    const activeHolders = runes.reduce((sum: number, r: any) => sum + (r.total_holders || r.holders || 0), 0);
    const totalTransactions = runes.reduce(
      (sum: number, r: any) => sum + (r.total_mints || 0), 0
    );

    // Mempool data from mempool.space
    const mempoolData = mempoolResult.status === 'fulfilled' ? mempoolResult.value : null;
    const mempoolSize = mempoolData?.count ?? 0;

    // Fetch fees separately
    const feesData = await fetchExternal<any>('https://mempool.space/api/v1/fees/recommended');
    const avgFee = feesData?.halfHourFee ?? 0;

    // Ordinals stats from Hiro
    const ordinalsData = ordinalsResult.status === 'fulfilled' ? ordinalsResult.value : null;
    const totalInscriptions = ordinalsData?.total_inscriptions ?? 0;

    // Mining/hashrate from internal API
    const miningData = miningResult.status === 'fulfilled' ? miningResult.value : null;
    let networkHashrate = 0;
    if (miningData?.hashrate) {
      const parsed = parseFloat(miningData.hashrate);
      if (!isNaN(parsed)) {
        networkHashrate = parsed * 1e6;
      }
    }

    return {
      totalRunes,
      runesVolume24h: 0, // Real volume requires aggregation not available from Hiro free tier
      activeHolders,
      totalTransactions,
      totalInscriptions,
      ordinalsVolume24h: 0, // Real volume requires marketplace aggregation
      brc20Tokens: 0, // Would need BRC-20 indexer count — 0 instead of fake number
      networkHashrate,
      mempool: {
        size: mempoolSize,
        avgFee,
      },
    };
  }

  async getRunesData(): Promise<RuneData[]> {
    const data = await fetchInternal<any>('/api/runes/list?limit=50');
    const runes = data?.results || data?.data || [];

    return runes.map((r: any) => ({
      id: r.id || `rune_${r.number || 0}`,
      name: r.spaced_name || r.name || 'Unknown',
      symbol: r.symbol || (r.name || 'UNK').replace(/[•\s]/g, '').substring(0, 8),
      price: 0, // Hiro free tier does not provide price — 0 instead of fake
      change24h: 0,
      marketCap: 0,
      supply: r.supply?.current ? parseInt(r.supply.current) / Math.pow(10, r.divisibility || 0) : 0,
      holders: r.total_holders || 0,
      mints: parseInt(r.supply?.total_mints || '0'),
      mintProgress: parseFloat(r.supply?.mint_percentage || '0'),
    }));
  }

  async getRareSatsData(address?: string): Promise<RareSatData> {
    // Without a specific address, we cannot fetch real rare sats data.
    // Return empty result — no fake data.
    if (!address) {
      return { type: 'RareSatData', sats: [], totalValue: 0, count: 0 };
    }

    // Try to fetch real ordinals/inscriptions for this address from Hiro
    try {
      const hiroHeaders: Record<string, string> = { 'Accept': 'application/json' };
      if (process.env.HIRO_API_KEY) hiroHeaders['x-hiro-api-key'] = process.env.HIRO_API_KEY;

      const res = await fetch(
        `https://api.hiro.so/ordinals/v1/inscriptions?address=${encodeURIComponent(address)}&limit=20`,
        { headers: hiroHeaders, signal: AbortSignal.timeout(8000) }
      );

      if (!res.ok) {
        return { type: 'RareSatData', sats: [], totalValue: 0, count: 0 };
      }

      const data = await res.json();
      const inscriptions = data.results || [];

      const sats = inscriptions.map((ins: any) => ({
        id: ins.id || '',
        rarity: ins.sat_rarity || 'common',
        value: 0, // Real value requires marketplace lookup
        satNumber: ins.sat_ordinal || 0,
        block: ins.genesis_block_height || 0,
        offset: ins.sat_offset || 0,
        type: ins.sat_rarity ? `${ins.sat_rarity} Sat` : 'Inscription',
        inscription: ins.content_type || undefined,
        address,
      }));

      return {
        type: 'RareSatData',
        sats,
        totalValue: 0, // Real valuation requires marketplace data
        count: sats.length,
      };
    } catch {
      return { type: 'RareSatData', sats: [], totalValue: 0, count: 0 };
    }
  }
}

export const bitcoinEcosystemService = BitcoinEcosystemService.getInstance();
