/**
 * CYPHER V3 - Database Module Index
 * Re-exports all database services and types
 */

// New persistent database service
export { dbService } from './db-service'
export type {
  DBUser,
  DBFeeRecord,
  DBAdminSession,
  DBTransaction,
  DBTradingSignal,
} from './db-service'

export { getSupabaseClient, getSupabaseServiceClient, isSupabaseConfigured } from './supabase-client'

// Legacy exports (backwards compatibility)
export { databaseService, logFeeToDatabase, getFeeReportFromDatabase, clearOldBitcoinPriceCache } from './legacy-database'
