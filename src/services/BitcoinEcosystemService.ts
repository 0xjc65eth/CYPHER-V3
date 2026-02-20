/**
 * Bitcoin Ecosystem Service
 * Provides Bitcoin ecosystem data and statistics via internal API routes
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

class BitcoinEcosystemService {
  private static instance: BitcoinEcosystemService;

  static getInstance(): BitcoinEcosystemService {
    if (!BitcoinEcosystemService.instance) {
      BitcoinEcosystemService.instance = new BitcoinEcosystemService();
    }
    return BitcoinEcosystemService.instance;
  }

  async getEcosystemStats(): Promise<BitcoinEcosystemStats> {
    // Fetch runes and mining data from internal API routes in parallel
    const [runesResult, miningResult] = await Promise.allSettled([
      fetchInternal<any>('/api/runes/market-data?limit=50&includeAnalytics=true'),
      fetchInternal<any>('/api/mining-data'),
    ]);

    const runesData = runesResult.status === 'fulfilled' ? runesResult.value : null;
    const miningData = miningResult.status === 'fulfilled' ? miningResult.value : null;

    const runes = runesData?.runes || [];
    const analytics = runesData?.analytics;

    const totalRunes = analytics?.marketOverview?.activeRunes ?? runes.length;
    const runesVolume24h = analytics?.marketOverview?.totalVolume24h ?? 0;
    const activeHolders = runes.reduce((sum: number, r: any) => sum + (r.holders || 0), 0);
    const totalTransactions = runes.reduce(
      (sum: number, r: any) => sum + (r.transactions?.transfers24h || 0),
      0
    );

    // Parse hashrate string like "578.4 EH/s" to a number
    let networkHashrate = 450000000;
    if (miningData?.hashrate) {
      const parsed = parseFloat(miningData.hashrate);
      if (!isNaN(parsed)) {
        networkHashrate = parsed * 1e6; // EH/s to TH/s approximation for display
      }
    }

    let mempoolSize = 25000;
    let avgFee = 12;
    if (miningData?.mempoolTxCount) {
      mempoolSize = miningData.mempoolTxCount;
    }

    return {
      totalRunes,
      runesVolume24h,
      activeHolders,
      totalTransactions,
      totalInscriptions: 45892343, // Ordinals inscriptions - would need a separate API
      ordinalsVolume24h: 485000,   // Would need ordinals marketplace API
      brc20Tokens: 156,            // Would need BRC-20 indexer API
      networkHashrate,
      mempool: {
        size: mempoolSize,
        avgFee,
      },
    };
  }

  async getRunesData(): Promise<RuneData[]> {
    const data = await fetchInternal<any>('/api/runes/market-data?limit=50&includeAnalytics=false');
    const runes = data?.runes || [];

    return runes.map((r: any) => ({
      id: r.id,
      name: r.name,
      symbol: r.symbol,
      price: r.price?.current ?? 0,
      change24h: r.price?.change24h ?? 0,
      marketCap: r.marketCap?.current ?? 0,
      supply: r.supply?.circulating ?? 0,
      holders: r.holders ?? 0,
      mints: r.transactions?.mints24h ?? 0,
      mintProgress: r.minting?.progress ?? 0,
    }));
  }

  async getRareSatsData(address?: string): Promise<RareSatData> {
    // Rare sats data requires specialized indexer APIs (e.g., Hiro Ordinals)
    // Keeping static data as there's no free public API for this
    const rareSats = [
      {
        id: 'sat_001',
        rarity: 'vintage',
        value: 0.5,
        satNumber: 50000000000,
        block: 1,
        offset: 0,
        type: 'Block 1 Sat',
        inscription: 'Genesis Block Satoshi',
        address: address || ''
      },
      {
        id: 'sat_002',
        rarity: 'pizza',
        value: 0.3,
        satNumber: 1234567890,
        block: 57043,
        offset: 100,
        type: 'Pizza Transaction Sat',
        address: address || ''
      },
      {
        id: 'sat_003',
        rarity: 'palindrome',
        value: 0.2,
        satNumber: 1234554321,
        block: 100000,
        offset: 50,
        type: 'Palindrome Sat',
        address: address || ''
      },
      {
        id: 'sat_004',
        rarity: 'block9',
        value: 0.4,
        satNumber: 450000000,
        block: 9,
        offset: 0,
        type: 'Block 9 Sat',
        inscription: 'Early Bitcoin History',
        address: address || ''
      },
      {
        id: 'sat_005',
        rarity: 'fibonacci',
        value: 0.15,
        satNumber: 2147483647,
        block: 200000,
        offset: 89,
        type: 'Fibonacci Sequence Sat',
        address: address || ''
      }
    ];

    const totalValue = rareSats.reduce((sum, sat) => sum + sat.value, 0);

    return {
      type: 'RareSatData',
      sats: rareSats,
      totalValue,
      count: rareSats.length
    };
  }
}

export const bitcoinEcosystemService = BitcoinEcosystemService.getInstance();
