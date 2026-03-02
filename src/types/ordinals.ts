/**
 * Ordinals Data Types
 *
 * This file defines the types for Bitcoin Ordinals data used in the Bitcoin Blockchain Analytics application.
 * Enhanced with professional Ordinals system types for CYPHER V3 Bloomberg Terminal
 */

export interface OrdinalData {
  id: string;
  inscription_id: string;
  inscription_number: number;
  address: string;
  output: string;
  location: string;
  contentType: string;
  contentLength: number;
  timestamp: string;
  genesisTransaction: string;
  genesisHeight: number;
  sat: string;
  satRarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  satOffset: number;
  preview?: string;
  content?: string;
  metadata?: Record<string, any>;
  // Market data properties (optional, populated when available)
  volume24h?: number;
  floorPrice?: number;
  priceChange24h?: number;
  marketCap?: number;
  holders?: number;
  listed?: number;
}

export interface OrdinalCollection {
  id: string;
  name: string;
  description?: string;
  creator: string;
  inscriptionCount: number;
  floorPrice?: number;
  totalVolume?: number;
  createdAt: string;
  updatedAt: string;
  verified: boolean;
  iconUrl?: string;
  bannerUrl?: string;
  socialLinks?: {
    twitter?: string;
    discord?: string;
    website?: string;
  };
  attributes?: {
    name: string;
    values: string[];
    counts: number[];
  }[];
}

export interface OrdinalMarketData {
  timestamp: string;
  floorPrice: number;
  volume24h: number;
  sales24h: number;
  averagePrice24h: number;
  highestSale24h: number;
  lowestSale24h: number;
  marketCap: number;
  holders: number;
  listedCount: number;
  totalListedValue: number;
}

export interface OrdinalTransaction {
  id: string;
  inscriptionId: string;
  txid: string;
  blockHeight: number;
  timestamp: string;
  fromAddress: string;
  toAddress: string;
  price?: number;
  marketplace?: string;
  type: 'transfer' | 'sale' | 'mint';
  feeRate: number;
  feeTotal: number;
}

export interface OrdinalStats {
  totalInscriptions: number;
  inscriptionsLast24h: number;
  inscriptionsLast7d: number;
  totalVolumeBTC: number;
  volumeBTCLast24h: number;
  volumeBTCLast7d: number;
  averagePriceBTC: number;
  averagePriceBTCLast24h: number;
  averagePriceBTCLast7d: number;
  totalCollections: number;
  totalHolders: number;
  totalMarketplaces: number;
}

/**
 * PROFESSIONAL ORDINALS SYSTEM TYPES
 * Enhanced type definitions for Bloomberg Terminal-style Ordinals dashboard
 */

/**
 * Processed collection with enhanced market data and charting information
 * ALL DATA IS REAL - NO MORE Math.random() OR ESTIMATES!
 */
export interface ProcessedCollection {
  id: string;
  name: string;
  symbol: string;
  floorPrice: number;              // Floor price in BTC (REAL)
  floorPriceUSD?: number;          // Floor price in USD (REAL, converted from live BTC/USD rate)
  volume24h: number;               // 24h trading volume in BTC (0 if only stat endpoint used)
  volume7d: number;                // 7d trading volume in BTC (0 if only stat endpoint used)
  volumeUSD24h?: number;           // 24h volume in USD
  totalVolume?: number;            // All-time total volume in BTC (from stat endpoint)
  marketCap: number;               // Market capitalization in BTC
  listed: number;                  // Number of items listed
  owners: number;                  // Number of unique owners
  supply: number;                  // Total supply
  image: string;                   // Collection image URL
  priceChange24h: number;          // REAL 24h price change % (from historical data)
  priceChange7d?: number;          // REAL 7d price change %
  priceChange30d?: number;         // REAL 30d price change %
  bestBid?: number;                // Lowest listing price (REAL from listings API)
  bidAskSpread?: number;           // Bid-ask spread percentage (REAL)
  vwap24h?: number;                // 24h VWAP (REAL calculated from activities)
  trades24h?: number;              // Number of trades in 24h (REAL count)
  volumeHistory: number[];         // REAL historical volume data (from activities API, NOT Math.random())
  isFavorite: boolean;             // User favorite status
}

/**
 * Aggregated market metrics across all collections
 */
export interface MarketMetrics {
  totalCollections: number;        // Total number of tracked collections
  totalVolume24h: number;          // Aggregate 24h volume in BTC
  totalVolume7d: number;           // Aggregate 7d volume in BTC
  avgFloorPrice: number;           // Average floor price across collections
  totalListed: number;             // Total items listed across all collections
  totalOwners: number;             // Total unique owners across collections
  marketCap: number;               // Total market cap in BTC
}

/**
 * Price alert configuration and status
 */
export interface PriceAlert {
  id: string;
  collectionId: string;
  collectionName: string;
  type: 'above' | 'below';         // Alert when price goes above or below target
  targetPrice: number;             // Target price in BTC
  currentPrice: number;            // Current price in BTC
  isActive: boolean;               // Whether alert is active
  createdAt: number;               // Timestamp when alert was created
}

/**
 * Filter and sorting options for collections display
 */
export interface FilterOptions {
  searchQuery: string;             // Search term for filtering by name/symbol
  minPrice?: number;               // Minimum floor price filter
  maxPrice?: number;               // Maximum floor price filter
  minVolume?: number;              // Minimum 24h volume filter
  sortBy: SortField;               // Field to sort by
  sortOrder: 'asc' | 'desc';       // Sort direction
  showFavoritesOnly: boolean;      // Filter to show only favorites
}

/**
 * Valid sort fields for collections
 */
export type SortField =
  | 'name'
  | 'floorPrice'
  | 'volume24h'
  | 'volume7d'
  | 'marketCap'
  | 'priceChange24h'
  | 'listed'
  | 'owners';

/**
 * Collection detail view with extended information
 */
export interface CollectionDetail extends ProcessedCollection {
  description?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  verified: boolean;
  totalSales: number;
  avgSalePrice: number;
  highestSale: number;
  lowestSale: number;
  royaltyPercentage?: number;
  createdAt: string;
  lastSaleAt?: string;
}

/**
 * Historical price point for charting
 */
export interface PriceHistoryPoint {
  timestamp: number;               // Unix timestamp
  price: number;                   // Price in BTC
  volume: number;                  // Volume at this point
}

/**
 * Chart data for collection price/volume history
 */
export interface CollectionChartData {
  collectionId: string;
  priceHistory: PriceHistoryPoint[];
  volumeHistory: PriceHistoryPoint[];
  interval: '1h' | '24h' | '7d' | '30d' | 'all';
}

/**
 * Live price update from WebSocket or polling
 */
export interface LivePriceUpdate {
  collectionId: string;
  floorPrice: number;
  volume24h: number;
  priceChange24h: number;
  timestamp: number;
}

/**
 * API response wrapper for collections endpoint
 */
export interface CollectionsResponse {
  success: boolean;
  data: ProcessedCollection[];
  metrics: MarketMetrics;
  timestamp: string;               // ISO timestamp
  source: 'hiro' | 'magiceden' | 'ordinals.com' | 'cache';
  error?: string;
}

/**
 * API response wrapper for collection detail endpoint
 */
export interface CollectionDetailResponse {
  success: boolean;
  data: CollectionDetail;
  chartData: CollectionChartData;
  timestamp: string;
  error?: string;
}

/**
 * User preferences for Ordinals dashboard
 */
export interface OrdinalsUserPreferences {
  favoriteCollections: string[];   // Array of collection IDs
  defaultSortBy: SortField;
  defaultSortOrder: 'asc' | 'desc';
  priceAlerts: PriceAlert[];
  hiddenCollections: string[];     // Collections user wants to hide
  refreshInterval: number;         // Auto-refresh interval in seconds
  showVolumeChart: boolean;        // Whether to show volume sparklines
}

/**
 * Pagination options for API requests
 */
export interface PaginationOptions {
  page: number;                    // Current page (1-indexed)
  limit: number;                   // Items per page
  offset?: number;                 // Alternative to page (0-indexed)
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;                 // Total number of items
    totalPages: number;            // Total number of pages
    hasNext: boolean;              // Whether there's a next page
    hasPrev: boolean;              // Whether there's a previous page
  };
  timestamp: string;
  error?: string;
}

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(
  response: { success: boolean; data?: T; error?: string }
): response is { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Type guard to check if a value is a valid SortField
 */
export function isValidSortField(value: string): value is SortField {
  return [
    'name',
    'floorPrice',
    'volume24h',
    'volume7d',
    'marketCap',
    'priceChange24h',
    'listed',
    'owners'
  ].includes(value);
}

/**
 * Constants for default values
 */
export const DEFAULT_ORDINALS_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_SORT_BY: 'volume24h' as SortField,
  DEFAULT_SORT_ORDER: 'desc' as const,
  MIN_REFRESH_INTERVAL: 10,       // Minimum refresh interval in seconds
  DEFAULT_REFRESH_INTERVAL: 30,   // Default refresh interval in seconds
  CHART_INTERVALS: ['1h', '24h', '7d', '30d', 'all'] as const,
  DEFAULT_CHART_INTERVAL: '24h' as const
} as const;
