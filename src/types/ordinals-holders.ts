/**
 * Ordinals Holder Analytics Types
 *
 * TypeScript definitions for holder metrics, distribution analysis,
 * whale tracking, and holder dynamics for CYPHER V3 Bloomberg Terminal
 */

// ============================================================================
// BASIC HOLDER METRICS
// ============================================================================

export interface HolderMetrics {
  collectionSymbol: string;
  collectionName: string;
  totalHolders: number;
  totalSupply: number;
  holdersPercentage: number; // (totalHolders / totalSupply) * 100
  uniqueAddresses: number;
  averageHoldingsPerAddress: number;
  timestamp: number;
}

export interface HolderGrowth {
  date: string;
  timestamp: number;
  holderCount: number;
  change: number; // Change from previous day
  changePercentage: number;
  newHolders: number;
  exitedHolders: number;
}

export interface HolderSnapshot {
  collectionSymbol: string;
  date: string;
  timestamp: number;
  totalHolders: number;
  totalSupply: number;
  topHolders: TopHolder[];
  distribution: HolderDistribution;
}

// ============================================================================
// HOLDER DISTRIBUTION
// ============================================================================

export interface HolderDistribution {
  whales: HolderTier; // >100 inscriptions
  largeHolders: HolderTier; // 10-100
  mediumHolders: HolderTier; // 2-9
  smallHolders: HolderTier; // 1
  concentrated: boolean; // True if top 10 hold >50%
}

export interface HolderTier {
  count: number; // Number of addresses in tier
  totalInscriptions: number; // Total inscriptions held by tier
  percentage: number; // % of total supply
  averageHoldings: number; // Average per address in tier
}

export interface ConcentrationMetrics {
  collectionSymbol: string;
  giniCoefficient: number; // 0 = perfect equality, 1 = one holder owns all
  herfindahlIndex: number; // HHI: sum of squared market shares
  top10Concentration: number; // % held by top 10
  top50Concentration: number; // % held by top 50
  top100Concentration: number; // % held by top 100
  concentrationRating: 'Low' | 'Medium' | 'High' | 'Very High';
  timestamp: number;
}

// ============================================================================
// WHALE TRACKING
// ============================================================================

export interface TopHolder {
  address: string;
  inscriptionCount: number;
  percentage: number; // % of total supply
  rank: number;
  estimatedValue?: number; // Based on floor price
  firstSeen?: number; // Timestamp of first acquisition
  lastActivity?: number; // Timestamp of last transaction
  labels?: string[]; // e.g., ['whale', 'early_adopter', 'diamond_hands']
}

export interface WhaleProfile {
  address: string;
  totalInscriptions: number;
  collections: WhaleCollection[];
  totalValue: number; // Estimated total portfolio value
  activityScore: number; // 0-100 based on trading frequency
  holderType: 'Accumulator' | 'Trader' | 'Diamond Hands' | 'Flipper';
  firstSeen: number;
  lastActivity: number;
}

export interface WhaleCollection {
  symbol: string;
  name: string;
  inscriptionCount: number;
  percentage: number; // % of collection supply
  rank: number;
  averageAcquisitionPrice?: number;
  estimatedCurrentValue?: number;
  unrealizedPnL?: number;
}

export interface WhaleActivity {
  id: string;
  address: string;
  type: 'buy' | 'sell' | 'transfer_in' | 'transfer_out';
  collectionSymbol: string;
  inscriptionId: string;
  inscriptionNumber: number;
  price?: number;
  quantity: number;
  timestamp: number;
  txid: string;
  impact: 'Low' | 'Medium' | 'High'; // Based on quantity relative to daily volume
}

export interface WhaleAlert {
  id: string;
  type: 'accumulation' | 'distribution' | 'entry' | 'exit' | 'large_buy' | 'large_sell';
  address: string;
  collectionSymbol: string;
  message: string;
  quantity: number;
  totalValue?: number;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical';
}

// ============================================================================
// HOLDER DYNAMICS
// ============================================================================

export interface HolderVelocity {
  collectionSymbol: string;
  averageHoldingPeriod: number; // Average days inscriptions are held
  churnRate: number; // % of holders who exited in last 30 days
  retentionRate: number; // % of holders who stayed in last 30 days
  transferFrequency: number; // Average transfers per inscription per month
  diamondHandsPercentage: number; // % holding >90 days without selling
  timestamp: number;
}

export interface HolderCohort {
  cohortName: string;
  acquisitionPeriod: {
    start: number;
    end: number;
  };
  holderCount: number;
  totalInscriptions: number;
  averageHoldingPeriod: number;
  activeHolders: number; // Still holding
  exitedHolders: number;
  retentionRate: number;
  averageAcquisitionPrice?: number;
  currentFloorPrice?: number;
  unrealizedPnL?: number;
  performance: 'Outperforming' | 'At Market' | 'Underperforming';
}

export interface NewVsExistingHolders {
  date: string;
  timestamp: number;
  newHolders: number; // First-time buyers of collection
  existingAccumulating: number; // Existing holders buying more
  existingReducing: number; // Existing holders selling
  totalVolume: number;
  newHolderVolume: number;
  existingHolderVolume: number;
}

// ============================================================================
// COLLECTION LEADERBOARD
// ============================================================================

export interface CollectionLeaderboard {
  collectionSymbol: string;
  collectionName: string;
  topCollectors: LeaderboardEntry[];
  totalCollectors: number;
  lastUpdated: number;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  inscriptionCount: number;
  percentage: number; // % of total supply
  totalSpent?: number;
  estimatedValue?: number;
  profitLoss?: number;
  badges?: LeaderboardBadge[];
  joinedDate?: number;
}

export interface LeaderboardBadge {
  type: 'whale' | 'top10' | 'top50' | 'early_adopter' | 'diamond_hands' | 'complete_set';
  label: string;
  icon?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface HolderMetricsResponse {
  success: boolean;
  data: HolderMetrics;
  timestamp: number;
}

export interface HolderDistributionResponse {
  success: boolean;
  data: {
    distribution: HolderDistribution;
    topHolders: TopHolder[];
    concentrationMetrics: ConcentrationMetrics;
  };
  timestamp: number;
}

export interface WhaleTrackerResponse {
  success: boolean;
  data: {
    whales: TopHolder[];
    recentActivity: WhaleActivity[];
    alerts: WhaleAlert[];
  };
  timestamp: number;
}

export interface HolderDynamicsResponse {
  success: boolean;
  data: {
    velocity: HolderVelocity;
    cohorts: HolderCohort[];
    newVsExisting: NewVsExistingHolders[];
  };
  timestamp: number;
}

export interface LeaderboardResponse {
  success: boolean;
  data: CollectionLeaderboard;
  timestamp: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type HolderAnalyticsPeriod = '24h' | '7d' | '30d' | '90d' | 'all';

export type HolderSortBy = 'holdings' | 'value' | 'activity' | 'age' | 'pnl';

export interface HolderAnalyticsFilters {
  period?: HolderAnalyticsPeriod;
  minHoldings?: number;
  maxHoldings?: number;
  sortBy?: HolderSortBy;
  includeWhalesOnly?: boolean;
}
