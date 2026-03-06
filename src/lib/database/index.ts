/**
 * CYPHER V3 - Database Module Index
 * Re-exports all database services and types
 */

// New persistent database service
export { dbService, DatabaseService } from './db-service'
export type {
  // Core (Migration 001)
  DBUser,
  DBFeeRecord,
  DBAdminSession,
  DBTransaction,
  DBTradingSignal,
  DBSubscription,
  DBSubscriptionEvent,
  // Bitcoin Assets (Migration 005)
  DBInscription,
  DBInscriptionTransfer,
  DBOrdinalCollection,
  DBRune,
  DBRuneBalance,
  DBBRC20Token,
  DBBRC20Balance,
  DBRareSat,
  // Portfolios, Watchlists, Alerts (Migration 006)
  DBPortfolio,
  DBPortfolioAsset,
  DBWatchlist,
  DBAlert,
  DBApiKey,
  // On-Chain Analytics (Migration 007)
  DBNetworkMetrics,
  DBFeeEstimateHistory,
  DBAddressAnalytics,
} from './db-service'

export { getSupabaseClient, getSupabaseServiceClient, isSupabaseConfigured } from './supabase-client'

// Legacy exports (backwards compatibility)
export { databaseService, logFeeToDatabase, getFeeReportFromDatabase, clearOldBitcoinPriceCache } from './legacy-database'
