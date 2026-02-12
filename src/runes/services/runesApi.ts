// =============================================================================
// CYPHER V3 - Magic Eden Runes API Service
// Serviço para comunicação com a API de Runes da Magic Eden
// Módulo independente - não depende de Ordinals
// =============================================================================

import {
  RuneCollectionStats,
  RuneMarketInfo,
  RuneOrder,
  RuneActivity,
  RuneUtxo,
  RuneBalance,
  ProcessedRune,
  RuneStatsParams,
  RuneOrdersParams,
  RuneActivitiesParams,
  SATS_PER_BTC,
  VERIFIED_RUNES,
  FEATURED_RUNES,
} from '../types/runes';

// -----------------------------------------------------------------------------
// Configuração
// -----------------------------------------------------------------------------

const API_BASE_URL = 'https://api-mainnet.magiceden.dev';
const API_TIMEOUT = 15000;

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30000;

// -----------------------------------------------------------------------------
// Utilitários
// -----------------------------------------------------------------------------

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '2');
        await sleep(retryAfter * 1000);
        return fetchWithRetry(url, options, retries - 1);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (retries > 0 && error instanceof Error && error.name !== 'AbortError') {
      await sleep(1000);
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = CACHE_TTL
): Promise<T> {
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data as T;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });

  return data;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// -----------------------------------------------------------------------------
// Endpoints da API - Runes Info
// -----------------------------------------------------------------------------

export async function fetchRuneStats(
  params?: RuneStatsParams
): Promise<RuneCollectionStats[]> {
  const queryParams = new URLSearchParams();

  if (params?.sort) queryParams.set('sort', params.sort);
  if (params?.direction) queryParams.set('direction', params.direction);
  if (params?.offset) queryParams.set('offset', params.offset.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.window) queryParams.set('window', params.window);

  const url = `${API_BASE_URL}/v2/ord/btc/runes/collection_stats/search${queryParams.toString() ? '?' + queryParams : ''}`;
  const cacheKey = `rune-stats:${queryParams.toString()}`;

  return cachedFetch(cacheKey, () => fetchWithRetry<RuneCollectionStats[]>(url));
}

export async function fetchRuneMarketInfo(
  rune: string
): Promise<RuneMarketInfo> {
  const encodedRune = encodeURIComponent(rune);
  const url = `${API_BASE_URL}/v2/ord/btc/runes/market/${encodedRune}/info`;
  const cacheKey = `rune-info:${rune}`;

  return cachedFetch(cacheKey, () => fetchWithRetry<RuneMarketInfo>(url), 60000);
}

export async function fetchRuneOrders(
  rune: string,
  params?: RuneOrdersParams
): Promise<RuneOrder[]> {
  const queryParams = new URLSearchParams();

  if (params?.offset) queryParams.set('offset', params.offset.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.sort) queryParams.set('sort', params.sort);
  if (params?.status) queryParams.set('status', params.status);

  const encodedRune = encodeURIComponent(rune);
  const url = `${API_BASE_URL}/v2/ord/btc/runes/orders/${encodedRune}${queryParams.toString() ? '?' + queryParams : ''}`;
  const cacheKey = `rune-orders:${rune}:${queryParams.toString()}`;

  return cachedFetch(cacheKey, () => fetchWithRetry<RuneOrder[]>(url));
}

export async function fetchRuneActivities(
  rune: string,
  params?: RuneActivitiesParams
): Promise<RuneActivity[]> {
  const queryParams = new URLSearchParams();

  if (params?.offset) queryParams.set('offset', params.offset.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.type && params.type !== 'all') queryParams.set('type', params.type);

  const encodedRune = encodeURIComponent(rune);
  const url = `${API_BASE_URL}/v2/ord/btc/runes/activities/${encodedRune}${queryParams.toString() ? '?' + queryParams : ''}`;
  const cacheKey = `rune-activities:${rune}:${queryParams.toString()}`;

  return cachedFetch(cacheKey, () => fetchWithRetry<RuneActivity[]>(url));
}

// -----------------------------------------------------------------------------
// Endpoints da API - Wallet
// -----------------------------------------------------------------------------

export async function fetchWalletRuneUtxos(
  address: string
): Promise<RuneUtxo[]> {
  const url = `${API_BASE_URL}/v2/ord/btc/runes/utxos/wallet/${address}`;
  const cacheKey = `wallet-utxos:${address}`;

  return cachedFetch(cacheKey, () => fetchWithRetry<RuneUtxo[]>(url));
}

export async function fetchWalletRuneActivities(
  address: string,
  params?: RuneActivitiesParams
): Promise<RuneActivity[]> {
  const queryParams = new URLSearchParams();

  if (params?.offset) queryParams.set('offset', params.offset.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());

  const url = `${API_BASE_URL}/v2/ord/btc/runes/wallet/activities/${address}${queryParams.toString() ? '?' + queryParams : ''}`;
  const cacheKey = `wallet-activities:${address}:${queryParams.toString()}`;

  return cachedFetch(cacheKey, () => fetchWithRetry<RuneActivity[]>(url));
}

export async function fetchWalletRuneBalance(
  address: string,
  rune: string
): Promise<RuneBalance> {
  const encodedRune = encodeURIComponent(rune);
  const url = `${API_BASE_URL}/v2/ord/btc/runes/wallet/balances/${address}/${encodedRune}`;
  const cacheKey = `wallet-balance:${address}:${rune}`;

  return cachedFetch(cacheKey, () => fetchWithRetry<RuneBalance>(url));
}

// -----------------------------------------------------------------------------
// Processamento de Dados
// -----------------------------------------------------------------------------

export async function fetchBtcPrice(): Promise<number> {
  try {
    const response = await cachedFetch(
      'btc-price',
      async () => {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
          { next: { revalidate: 60 } } as any
        );
        return res.json();
      },
      60000
    );
    return response?.bitcoin?.usd || 95000;
  } catch {
    return 95000;
  }
}

export function satsToBtc(sats: number): number {
  return sats / SATS_PER_BTC;
}

export function formatRuneName(name: string): string {
  return name
    .replace(/•/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getRuneImageUrl(rune: string, imageUri?: string): string {
  if (imageUri) return imageUri;
  return `https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://ord.cdn.magiceden.dev/runes/${encodeURIComponent(rune)}/image`;
}

export async function processRunes(
  stats: RuneCollectionStats[],
  btcPrice: number,
  favorites: Set<string> = new Set()
): Promise<ProcessedRune[]> {
  const processed: ProcessedRune[] = [];

  for (const stat of stats) {
    const floorBtc = satsToBtc(stat.floorUnitPrice || 0);
    const marketCapBtc = satsToBtc(stat.marketCap || 0);
    const volume24hBtc = satsToBtc(stat.volume24h || 0);
    const volume7dBtc = satsToBtc(stat.volume7d || 0);

    const totalMintable = stat.totalSupply + (stat.pendingSupply || 0);
    const mintProgress = totalMintable > 0
      ? (stat.totalSupply / totalMintable) * 100
      : 100;

    processed.push({
      id: stat.runeId || stat.rune,
      name: formatRuneName(stat.rune),
      spacedName: stat.rune,
      symbol: stat.symbol || '◆',
      imageUrl: getRuneImageUrl(stat.rune, stat.imageURI),

      floorPrice: floorBtc,
      floorPriceUsd: floorBtc * btcPrice,
      floorPriceSats: stat.floorUnitPrice || 0,

      marketCap: marketCapBtc,
      marketCapUsd: marketCapBtc * btcPrice,
      marketCapSats: stat.marketCap || 0,

      volume24h: volume24hBtc,
      volume24hUsd: volume24hBtc * btcPrice,
      volume7d: volume7dBtc,
      volume7dUsd: volume7dBtc * btcPrice,
      totalVolume: satsToBtc(stat.totalVolume || 0),

      totalSupply: stat.totalSupply || 0,
      circulatingSupply: stat.totalSupply || 0,
      pendingSupply: stat.pendingSupply || 0,
      mintable: stat.mintable || false,
      mintProgress,
      divisibility: stat.divisibility || 0,

      holders: stat.holders || 0,
      listed: stat.listed || 0,
      listedPct: stat.totalSupply ? ((stat.listed || 0) / stat.totalSupply) * 100 : 0,
      sales24h: stat.sales24h || 0,
      sales7d: stat.sales7d || 0,
      txCount: 0,

      priceChange24h: stat.priceChange24h || 0,
      priceChange7d: stat.priceChange7d || 0,

      volumeHistory7d: generateMockHistory(volume7dBtc, 7),
      priceHistory7d: generateMockHistory(floorBtc, 7),

      verified: VERIFIED_RUNES.has(stat.rune),
      featured: FEATURED_RUNES.has(stat.rune),
      turbo: stat.turbo || false,
      etching: stat.etching,
      etchingBlock: stat.etchingBlock,

      isFavorite: favorites.has(stat.runeId || stat.rune),
      lastUpdated: Date.now(),
    });
  }

  return processed;
}

function generateMockHistory(currentValue: number, points: number): number[] {
  if (currentValue === 0) return Array(points).fill(0);

  const history: number[] = [];
  let value = currentValue * (0.8 + Math.random() * 0.4);

  for (let i = 0; i < points - 1; i++) {
    history.push(value);
    value = value * (0.9 + Math.random() * 0.2);
  }

  history.push(currentValue);
  return history;
}

// -----------------------------------------------------------------------------
// Funções de Agregação
// -----------------------------------------------------------------------------

export function calculateRuneMarketMetrics(
  runes: ProcessedRune[],
  btcPrice: number
): {
  totalRunes: number;
  totalMarketCap: number;
  totalMarketCapUsd: number;
  totalVolume24h: number;
  totalVolume24hUsd: number;
  totalVolume7d: number;
  totalHolders: number;
  totalListings: number;
  mintableRunes: number;
  avgFloorPrice: number;
  avgFloorPriceUsd: number;
} {
  if (runes.length === 0) {
    return {
      totalRunes: 0,
      totalMarketCap: 0,
      totalMarketCapUsd: 0,
      totalVolume24h: 0,
      totalVolume24hUsd: 0,
      totalVolume7d: 0,
      totalHolders: 0,
      totalListings: 0,
      mintableRunes: 0,
      avgFloorPrice: 0,
      avgFloorPriceUsd: 0,
    };
  }

  const totalMarketCap = runes.reduce((sum, r) => sum + r.marketCap, 0);
  const totalVolume24h = runes.reduce((sum, r) => sum + r.volume24h, 0);
  const totalVolume7d = runes.reduce((sum, r) => sum + r.volume7d, 0);
  const totalHolders = runes.reduce((sum, r) => sum + r.holders, 0);
  const totalListings = runes.reduce((sum, r) => sum + r.listed, 0);
  const mintableRunes = runes.filter(r => r.mintable).length;

  const avgFloorPrice = runes.reduce((sum, r) => sum + r.floorPrice, 0) / runes.length;

  return {
    totalRunes: runes.length,
    totalMarketCap,
    totalMarketCapUsd: totalMarketCap * btcPrice,
    totalVolume24h,
    totalVolume24hUsd: totalVolume24h * btcPrice,
    totalVolume7d,
    totalHolders,
    totalListings,
    mintableRunes,
    avgFloorPrice,
    avgFloorPriceUsd: avgFloorPrice * btcPrice,
  };
}

// -----------------------------------------------------------------------------
// API Service Export
// -----------------------------------------------------------------------------

export const runesApi = {
  fetchRuneStats,
  fetchRuneMarketInfo,
  fetchRuneOrders,
  fetchRuneActivities,
  fetchWalletRuneUtxos,
  fetchWalletRuneActivities,
  fetchWalletRuneBalance,
  fetchBtcPrice,
  satsToBtc,
  formatRuneName,
  processRunes,
  calculateRuneMarketMetrics,
  clearCache: () => cache.clear(),
  getCacheSize: () => cache.size,
};

export default runesApi;
