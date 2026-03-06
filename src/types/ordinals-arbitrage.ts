/**
 * TypeScript Type Definitions for Ordinals Arbitrage Scanner
 * CYPHER V3 - Task #8: Ordinals Arbitrage Scanner
 */

/**
 * Supported Ordinals marketplaces
 */
export type OrdinalsMarketplace = 'gamma' | 'unisat' | 'okx' | 'hiro' | 'bestinslot';

/**
 * Risk score levels for arbitrage opportunities
 */
export type RiskScore = 'low' | 'medium' | 'high';

/**
 * Confidence level (0-100)
 */
export type ConfidenceScore = number; // 0-100

/**
 * Detailed fee breakdown for an arbitrage opportunity
 */
export interface FeeBreakdown {
  buyMarketplaceFee: number;      // Fee charged by buy marketplace (BTC)
  sellMarketplaceFee: number;     // Fee charged by sell marketplace (BTC)
  networkFee: number;             // Bitcoin network transaction fee (BTC)
  platformFee: number;            // CYPHER platform fee 0.35% (BTC)
  totalFees: number;              // Sum of all fees (BTC)
}

/**
 * Liquidity validation result for a collection
 */
export interface LiquidityValidation {
  isLiquid: boolean;              // Whether collection has sufficient liquidity
  listedCount: number;            // Number of items currently listed
  dailyVolume: number;            // 24h trading volume (BTC)
  liquidityScore: number;         // Calculated score 0-100
  lastUpdated: number;            // Timestamp when liquidity was checked
}

/**
 * Complete arbitrage opportunity data structure
 */
export interface OrdinalsArbitrageOpportunity {
  // Collection/Inscription Info
  collectionId: string;
  collectionName: string;
  inscriptionId?: string;         // Optional specific inscription
  collectionSlug?: string;
  imageUrl?: string;

  // Price Data
  buyPrice: number;               // Price to buy (BTC)
  sellPrice: number;              // Price to sell (BTC)
  buyMarketplace: OrdinalsMarketplace;
  sellMarketplace: OrdinalsMarketplace;

  // Profitability
  grossProfit: number;            // Profit before fees (BTC)
  grossProfitPercentage: number;  // Gross profit %
  fees: FeeBreakdown;             // Detailed fee breakdown
  netProfit: number;              // Profit after ALL fees (BTC)
  netProfitPercentage: number;    // Net profit % (ROI)

  // Risk & Confidence
  riskScore: RiskScore;           // Risk assessment
  confidence: ConfidenceScore;    // Confidence in opportunity (0-100)
  liquidityScore: number;         // Liquidity score (0-100)

  // Metadata
  lastUpdated: number;            // Timestamp of price data
  priceAge: number;               // Age of price data in seconds
  estimatedExecutionTime?: number; // Estimated time to execute (seconds)

  // Marketplace Links
  buyUrl?: string;                // Direct link to buy
  sellUrl?: string;               // Direct link to sell listing

  // Warnings
  warnings?: string[];            // Array of warning messages
}

/**
 * Filters for arbitrage opportunity scanning
 */
export interface ArbitrageFilters {
  minProfitPercentage?: number;   // Minimum net profit % (default: 5)
  maxRisk?: RiskScore;            // Maximum risk level to show
  collections?: string[];         // Filter by specific collections
  marketplaces?: OrdinalsMarketplace[]; // Include only these marketplaces
  minLiquidity?: number;          // Minimum liquidity score (0-100)
  minConfidence?: number;         // Minimum confidence score (0-100)
  maxPriceAge?: number;           // Max age of price data in seconds (default: 60)
  limit?: number;                 // Max number of results
}

/**
 * Statistics for the arbitrage scanner
 */
export interface ArbitrageStatistics {
  totalOpportunities: number;
  avgNetProfit: number;           // Average net profit %
  avgGrossProfit: number;         // Average gross profit %
  highValueCount: number;         // Count of opportunities > 15% profit
  avgLiquidityScore: number;
  avgConfidence: number;
  marketplaceDistribution: Record<OrdinalsMarketplace, number>; // Count by marketplace
  riskDistribution: Record<RiskScore, number>; // Count by risk level
}

/**
 * API response for arbitrage opportunities endpoint
 */
export interface ArbitrageOpportunitiesResponse {
  success: boolean;
  source: 'ORDINALS_REAL_DATA' | 'CACHE' | 'FALLBACK';
  opportunities: OrdinalsArbitrageOpportunity[];
  stats: ArbitrageStatistics;
  timestamp: string;              // ISO timestamp
  error?: string;                 // Error message if any
  cached?: boolean;               // Whether response is from cache
  cacheAge?: number;              // Age of cached data in seconds
}

/**
 * Marketplace fee configuration
 */
export interface MarketplaceFeeConfig {
  marketplace: OrdinalsMarketplace;
  feePercentage: number;          // Fee as decimal (e.g., 0.025 for 2.5%)
  minFee?: number;                // Minimum fee in BTC
  maxFee?: number;                // Maximum fee in BTC
}

/**
 * Network fee estimation from mempool.space
 */
export interface NetworkFeeEstimate {
  fastestFee: number;             // sats/vB
  halfHourFee: number;            // sats/vB (recommended)
  hourFee: number;                // sats/vB
  economyFee: number;             // sats/vB
  minimumFee: number;             // sats/vB
  estimatedBytes: number;         // Estimated transaction size
  estimatedFeeBTC: number;        // Estimated fee in BTC
  timestamp: number;              // When estimate was fetched
}

/**
 * Marketplace price data point
 */
export interface MarketplacePriceData {
  marketplace: OrdinalsMarketplace;
  price: number;                  // BTC
  listedCount: number;
  volume24h: number;              // BTC
  timestamp: number;
  available: boolean;
}

/**
 * Collection arbitrage analysis
 */
export interface CollectionArbitrageAnalysis {
  collectionId: string;
  collectionName: string;
  priceData: MarketplacePriceData[];
  bestBuyPrice: number;
  bestBuyMarketplace: OrdinalsMarketplace;
  bestSellPrice: number;
  bestSellMarketplace: OrdinalsMarketplace;
  opportunities: OrdinalsArbitrageOpportunity[];
  liquidity: LiquidityValidation;
  lastAnalyzed: number;
}

/**
 * Scan options for the arbitrage service
 */
export interface ScanOptions {
  filters: ArbitrageFilters;
  enableCache?: boolean;          // Use cached data if available
  cacheTTL?: number;              // Cache time-to-live in seconds
  parallel?: boolean;             // Scan marketplaces in parallel
  timeout?: number;               // Request timeout in ms
}

/**
 * Error types specific to arbitrage scanning
 */
export enum ArbitrageErrorType {
  STALE_PRICE = 'STALE_PRICE',
  LOW_LIQUIDITY = 'LOW_LIQUIDITY',
  API_FAILURE = 'API_FAILURE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_DATA = 'INVALID_DATA',
  RATE_LIMITED = 'RATE_LIMITED',
  MARKETPLACE_UNAVAILABLE = 'MARKETPLACE_UNAVAILABLE'
}

/**
 * Arbitrage error with context
 */
export interface ArbitrageError {
  type: ArbitrageErrorType;
  message: string;
  marketplace?: OrdinalsMarketplace;
  collectionId?: string;
  timestamp: number;
  recoverable: boolean;           // Whether error is recoverable
}

/**
 * Constants for marketplace fees (as percentages in decimal form)
 */
export const MARKETPLACE_FEES: Record<OrdinalsMarketplace, number> = {
  gamma: 0.025,         // 2.5%
  unisat: 0.02,         // 2%
  okx: 0.02,            // 2%
  hiro: 0.015,          // 1.5%
  bestinslot: 0.02      // 2% (marketplace aggregator)
};

/**
 * Platform fee constant (0.35%)
 */
export const PLATFORM_FEE_PERCENTAGE = 0.0035;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  MIN_PROFIT_PERCENTAGE: 5,
  MAX_PRICE_AGE_SECONDS: 60,
  CACHE_TTL_SECONDS: 30,
  REQUEST_TIMEOUT_MS: 5000,
  MIN_LIQUIDITY_SCORE: 30,
  MIN_CONFIDENCE_SCORE: 50,
  ESTIMATED_TX_BYTES: 250,
  DEFAULT_LIMIT: 20
} as const;

/**
 * Marketplace display names
 */
export const MARKETPLACE_NAMES: Record<OrdinalsMarketplace, string> = {
  gamma: 'Gamma.io',
  unisat: 'UniSat',
  okx: 'OKX',
  hiro: 'Hiro/Ordiscan',
  bestinslot: 'BestInSlot'
};

/**
 * Marketplace URLs
 */
export const MARKETPLACE_URLS: Record<OrdinalsMarketplace, string> = {
  gamma: 'https://gamma.io/ordinals',
  unisat: 'https://unisat.io/market',
  okx: 'https://www.okx.com/web3/marketplace/ordinals',
  hiro: 'https://ordinals.hiro.so',
  bestinslot: 'https://bestinslot.xyz'
};

/**
 * Type guard to check if a string is a valid OrdinalsMarketplace
 */
export function isValidMarketplace(value: string): value is OrdinalsMarketplace {
  return ['gamma', 'unisat', 'okx', 'hiro', 'bestinslot'].includes(value);
}

/**
 * Type guard to check if a string is a valid RiskScore
 */
export function isValidRiskScore(value: string): value is RiskScore {
  return ['low', 'medium', 'high'].includes(value);
}
