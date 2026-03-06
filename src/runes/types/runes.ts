// =============================================================================
// CYPHER V3 - Runes Types
// Types for Gamma.io Runes API integration
// Módulo independente - não depende de Ordinals
// =============================================================================

// -----------------------------------------------------------------------------
// API Response Types (Gamma.io)
// -----------------------------------------------------------------------------

/**
 * Estatísticas de Rune retornadas pelo endpoint /v2/ord/btc/runes/collection_stats/search
 */
export interface RuneCollectionStats {
  rune: string;
  runeId: string;
  symbol: string;
  floorUnitPrice: number;
  marketCap: number;
  totalVolume: number;
  volume24h: number;
  volume7d: number;
  sales24h: number;
  sales7d: number;
  holders: number;
  listed: number;
  totalSupply: number;
  pendingSupply?: number;
  mintable: boolean;
  divisibility: number;
  priceChange24h?: number;
  priceChange7d?: number;
  imageURI?: string;
  etching?: string;
  etchingBlock?: number;
  turbo?: boolean;
}

export interface RuneMarketInfo {
  rune: string;
  runeId: string;
  symbol: string;
  divisibility: number;
  spacedRune: string;
  imageURI?: string;
  floorUnitPrice: number;
  marketCap: number;
  totalSupply: number;
  mintable: boolean;
  holders: number;
  totalVolume: number;
  volume24h: number;
  volume7d: number;
  listed: number;
  txCount: number;
  priceChange24h?: number;
  priceChange7d?: number;
}

export interface RuneOrder {
  id: string;
  rune: string;
  unitPrice: number;
  totalPrice: number;
  amount: number;
  seller: string;
  status: 'active' | 'filled' | 'cancelled';
  createdAt: string;
  expiresAt?: string;
  txid?: string;
  vout?: number;
}

export interface RuneActivity {
  id: string;
  rune: string;
  type: 'sale' | 'listing' | 'cancel' | 'transfer' | 'mint';
  amount: number;
  unitPrice?: number;
  totalPrice?: number;
  from: string;
  to?: string;
  txid: string;
  blockHeight: number;
  timestamp: string;
}

export interface RuneUtxo {
  txid: string;
  vout: number;
  value: number;
  rune: string;
  amount: number;
  address: string;
  scriptPubKey: string;
  confirmations: number;
}

export interface RuneBalance {
  rune: string;
  runeId: string;
  symbol: string;
  spacedRune: string;
  balance: number;
  divisibility: number;
  imageURI?: string;
  floorUnitPrice?: number;
  estimatedValue?: number;
}

// -----------------------------------------------------------------------------
// Application Types (Processados/Enriquecidos)
// -----------------------------------------------------------------------------

export interface ProcessedRune {
  id: string;
  name: string;
  spacedName: string;
  symbol: string;
  imageUrl: string;

  floorPrice: number;
  floorPriceUsd: number;
  floorPriceSats: number;

  marketCap: number;
  marketCapUsd: number;
  marketCapSats: number;

  volume24h: number;
  volume24hUsd: number;
  volume7d: number;
  volume7dUsd: number;
  totalVolume: number;

  totalSupply: number;
  circulatingSupply: number;
  pendingSupply: number;
  mintable: boolean;
  mintProgress: number;
  divisibility: number;

  holders: number;
  listed: number;
  listedPct: number;
  sales24h: number;
  sales7d: number;
  txCount: number;

  priceChange24h: number;
  priceChange7d: number;

  volumeHistory7d: number[];
  priceHistory7d: number[];

  verified: boolean;
  featured: boolean;
  turbo: boolean;
  etching?: string;
  etchingBlock?: number;

  isFavorite: boolean;
  lastUpdated: number;
}

export interface RuneFilters {
  search: string;
  sortBy: RuneSortField;
  sortDirection: 'asc' | 'desc';
  minFloor?: number;
  maxFloor?: number;
  minVolume?: number;
  minMarketCap?: number;
  showOnlyMintable: boolean;
  showOnlyFavorites: boolean;
  showOnlyVerified: boolean;
}

export type RuneSortField =
  | 'floorPrice'
  | 'marketCap'
  | 'volume24h'
  | 'volume7d'
  | 'priceChange24h'
  | 'priceChange7d'
  | 'holders'
  | 'listed'
  | 'totalSupply'
  | 'mintProgress'
  | 'name';

// -----------------------------------------------------------------------------
// Dashboard/Analytics Types
// -----------------------------------------------------------------------------

export interface RuneMarketMetrics {
  totalRunes: number;
  totalMarketCap: number;
  totalMarketCapUsd: number;
  totalVolume24h: number;
  totalVolume24hUsd: number;
  totalVolume7d: number;
  totalVolume7dUsd: number;
  totalHolders: number;
  totalListings: number;
  mintableRunes: number;
  avgFloorPrice: number;
  avgFloorPriceUsd: number;
  topGainers: ProcessedRune[];
  topLosers: ProcessedRune[];
  topVolume: ProcessedRune[];
  mostHeld: ProcessedRune[];
}

export interface RuneMarketInsight {
  id: string;
  type: 'bullish' | 'bearish' | 'neutral' | 'info' | 'mint';
  title: string;
  description: string;
  metric?: string;
  change?: number;
  rune?: string;
}

// -----------------------------------------------------------------------------
// Alerts & Watchlist Types
// -----------------------------------------------------------------------------

export interface RunePriceAlert {
  id: string;
  runeId: string;
  runeName: string;
  type: 'below' | 'above';
  targetPrice: number;
  currentPrice: number;
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
  notificationSent: boolean;
}

export interface RuneWatchlistItem {
  runeId: string;
  addedAt: number;
  priceAtAdd: number;
  notes?: string;
}

// -----------------------------------------------------------------------------
// Wallet Types
// -----------------------------------------------------------------------------

export interface RunePortfolio {
  address: string;
  totalValue: number;
  totalValueUsd: number;
  runesCount: number;
  balances: RuneBalance[];
  recentActivity: RuneActivity[];
}

// -----------------------------------------------------------------------------
// API Request/Response Types
// -----------------------------------------------------------------------------

export interface RuneApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface RuneStatsParams {
  sort?: RuneSortField;
  direction?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
  window?: '1d' | '7d' | '30d' | 'all';
}

export interface RuneOrdersParams {
  offset?: number;
  limit?: number;
  sort?: 'price_asc' | 'price_desc' | 'recent';
  status?: 'active' | 'all';
}

export interface RuneActivitiesParams {
  offset?: number;
  limit?: number;
  type?: 'sale' | 'listing' | 'transfer' | 'mint' | 'all';
}

// -----------------------------------------------------------------------------
// Constantes
// -----------------------------------------------------------------------------

export const SATS_PER_BTC = 100_000_000;

export const DEFAULT_RUNE_FILTERS: RuneFilters = {
  search: '',
  sortBy: 'volume24h',
  sortDirection: 'desc',
  showOnlyMintable: false,
  showOnlyFavorites: false,
  showOnlyVerified: false,
};

export const RUNE_SORT_OPTIONS: { value: RuneSortField; label: string }[] = [
  { value: 'volume24h', label: 'Volume 24h' },
  { value: 'volume7d', label: 'Volume 7d' },
  { value: 'marketCap', label: 'Market Cap' },
  { value: 'floorPrice', label: 'Unit Price' },
  { value: 'priceChange24h', label: 'Change 24h' },
  { value: 'priceChange7d', label: 'Change 7d' },
  { value: 'holders', label: 'Holders' },
  { value: 'listed', label: 'Listed' },
  { value: 'totalSupply', label: 'Supply' },
  { value: 'mintProgress', label: 'Mint Progress' },
  { value: 'name', label: 'Name' },
];

export const VERIFIED_RUNES = new Set([
  'UNCOMMON•GOODS',
  'DOG•GO•TO•THE•MOON',
  'SATOSHI•NAKAMOTO',
  'BITCOIN•PUPPETS',
  'RSIC•GENESIS•RUNE',
  'RUNES•X•RUNES',
  'THE•RUNIX•TOKEN',
  'MEME•ECONOMICS',
  'WANKO•MANKO•RUNES',
  'BILLION•DOLLAR•CAT',
]);

export const FEATURED_RUNES = new Set([
  'UNCOMMON•GOODS',
  'DOG•GO•TO•THE•MOON',
  'SATOSHI•NAKAMOTO',
]);
