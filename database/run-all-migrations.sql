-- ============================================================================
-- CYPHER V3 - COMBINED MIGRATIONS (all 7 files)
-- ============================================================================
-- Copy/paste this entire file into Supabase SQL Editor and run once.
-- Safe to re-run: all statements use IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- ============================================================================

-- ===== MIGRATION 001: Initial Schema =====
\ir migrations/001_initial_schema.sql

-- ===== MIGRATION 002: Arbitrage Schema =====
\ir migrations/002_arbitrage_schema.sql

-- ===== MIGRATION 003: Agent Schema =====
\ir migrations/003_agent_schema.sql

-- ===== MIGRATION 004: Subscriptions =====
\ir migrations/004_subscriptions.sql

-- ===== MIGRATION 005: Ordinals, Runes, BRC-20, Rare Sats =====
\ir migrations/005_ordinals_runes_brc20_rare_sats.sql

-- ===== MIGRATION 006: Portfolios, Watchlists, Alerts =====
\ir migrations/006_portfolios_watchlists_alerts.sql

-- ===== MIGRATION 007: On-Chain Analytics + Index Fixes =====
\ir migrations/007_onchain_analytics_index_fixes.sql

-- ============================================================================
-- DONE! Verify with: SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- ============================================================================
