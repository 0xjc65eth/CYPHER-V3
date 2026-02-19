-- ============================================================================
-- CYPHER V3 - Complete Database Schema
-- Migration 001: Initial Schema
-- Run this in Supabase SQL Editor or via psql
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS (wallet-based authentication)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  wallet_type TEXT NOT NULL DEFAULT 'unknown', -- xverse, unisat, leather, etc.
  chain TEXT NOT NULL DEFAULT 'bitcoin', -- bitcoin, ethereum, solana
  display_name TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_expires_at TIMESTAMPTZ,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'premium', 'admin', 'super_admin')),
  total_trades INTEGER DEFAULT 0,
  total_volume_usd NUMERIC(18, 2) DEFAULT 0,
  total_fees_paid_usd NUMERIC(18, 2) DEFAULT 0,
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_premium ON users(is_premium) WHERE is_premium = TRUE;

-- ============================================================================
-- 2. FEE RECORDS (revenue tracking - replaces in-memory array)
-- ============================================================================
CREATE TABLE IF NOT EXISTS fee_records (
  id TEXT PRIMARY KEY,
  protocol TEXT NOT NULL CHECK (protocol IN ('thorchain', 'jupiter', 'evm_dex', 'magiceden')),
  chain TEXT NOT NULL,
  from_token TEXT NOT NULL,
  to_token TEXT NOT NULL,
  trade_amount_usd NUMERIC(18, 2) NOT NULL,
  fee_amount NUMERIC(18, 8) NOT NULL,
  fee_token TEXT NOT NULL,
  fee_usd NUMERIC(18, 2) NOT NULL,
  fee_bps INTEGER NOT NULL,
  fee_wallet TEXT NOT NULL,
  user_address TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'included', 'confirmed', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_records_protocol ON fee_records(protocol);
CREATE INDEX idx_fee_records_status ON fee_records(status);
CREATE INDEX idx_fee_records_user ON fee_records(user_address);
CREATE INDEX idx_fee_records_created ON fee_records(created_at DESC);
CREATE INDEX idx_fee_records_chain ON fee_records(chain);

-- ============================================================================
-- 3. ADMIN SESSIONS (replaces in-memory Map)
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_sessions (
  session_id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_admin_sessions_admin ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_active ON admin_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);

-- ============================================================================
-- 4. ADMIN USERS (replaces in-memory Map)
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'system')),
  permissions TEXT[] DEFAULT '{}',
  mfa_secret TEXT,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMPTZ,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. TRANSACTION HISTORY (local backup of trade history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transaction_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_address TEXT NOT NULL,
  tx_hash TEXT,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('swap', 'transfer', 'inscription', 'rune_trade', 'ordinal_trade')),
  protocol TEXT,
  chain TEXT NOT NULL,
  from_token TEXT,
  to_token TEXT,
  from_amount NUMERIC(28, 8),
  to_amount NUMERIC(28, 8),
  price_usd NUMERIC(18, 2),
  fee_usd NUMERIC(18, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled')),
  block_number BIGINT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tx_history_user ON transaction_history(user_address);
CREATE INDEX idx_tx_history_hash ON transaction_history(tx_hash);
CREATE INDEX idx_tx_history_created ON transaction_history(created_at DESC);
CREATE INDEX idx_tx_history_type ON transaction_history(tx_type);
CREATE INDEX idx_tx_history_chain ON transaction_history(chain);

-- ============================================================================
-- 6. TRADING SIGNALS (AI-generated signals persistence)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trading_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_type TEXT NOT NULL CHECK (signal_type IN ('buy', 'sell', 'hold', 'alert')),
  asset TEXT NOT NULL,
  chain TEXT NOT NULL,
  confidence NUMERIC(5, 4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  price_at_signal NUMERIC(18, 2),
  target_price NUMERIC(18, 2),
  stop_loss NUMERIC(18, 2),
  source TEXT NOT NULL, -- 'neural', 'smc', 'sentiment', 'arbitrage'
  reasoning TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signals_asset ON trading_signals(asset);
CREATE INDEX idx_signals_active ON trading_signals(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_signals_created ON trading_signals(created_at DESC);

-- ============================================================================
-- 7. USER SETTINGS (persistent preferences)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark',
  default_chain TEXT DEFAULT 'bitcoin',
  default_slippage NUMERIC(5, 2) DEFAULT 0.5,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  favorite_tokens TEXT[] DEFAULT '{}',
  dashboard_layout JSONB DEFAULT '{}',
  trading_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_settings_wallet ON user_settings(wallet_address);

-- ============================================================================
-- 8. NEURAL MODELS (already partially in supabase-service, formalized here)
-- ============================================================================
CREATE TABLE IF NOT EXISTS neural_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  accuracy NUMERIC(5, 4) DEFAULT 0,
  last_training TIMESTAMPTZ,
  data_points INTEGER DEFAULT 0,
  weights JSONB DEFAULT '[]',
  biases JSONB DEFAULT '[]',
  features TEXT[] DEFAULT '{}',
  target_metric TEXT,
  prediction_history JSONB DEFAULT '[]',
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. MARKET DATA SNAPSHOTS (historical data backup)
-- ============================================================================
CREATE TABLE IF NOT EXISTS market_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset TEXT NOT NULL,
  price_usd NUMERIC(18, 2),
  volume_24h NUMERIC(18, 2),
  market_cap NUMERIC(18, 2),
  change_24h NUMERIC(8, 4),
  source TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_market_data_asset ON market_data(asset, timestamp DESC);
CREATE INDEX idx_market_data_timestamp ON market_data(timestamp DESC);

-- Partition market_data by month for better performance (optional, for large datasets)
-- CREATE INDEX idx_market_data_month ON market_data(date_trunc('month', timestamp));

-- ============================================================================
-- 10. NEURAL INSIGHTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS neural_insights (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  model_id TEXT REFERENCES neural_models(id),
  confidence NUMERIC(5, 4),
  type TEXT NOT NULL,
  prediction JSONB,
  explanation TEXT,
  related_metrics JSONB DEFAULT '{}',
  data_points JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insights_type ON neural_insights(type);
CREATE INDEX idx_insights_timestamp ON neural_insights(timestamp DESC);

-- ============================================================================
-- 11. MEMPOOL, ORDINAL, RUNE DATA (training data storage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mempool_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL,
  data JSONB NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ordinal_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL,
  data JSONB NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rune_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL,
  data JSONB NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 12. JOB QUEUE RECORDS (for tracking background jobs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  payload JSONB DEFAULT '{}',
  result JSONB,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_status ON job_records(status);
CREATE INDEX idx_jobs_type ON job_records(job_type);
CREATE INDEX idx_jobs_scheduled ON job_records(scheduled_at) WHERE status = 'pending';

-- ============================================================================
-- AUTO-UPDATE TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_records_updated_at BEFORE UPDATE ON fee_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_neural_models_updated_at BEFORE UPDATE ON neural_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access on users" ON users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on fee_records" ON fee_records
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on transaction_history" ON transaction_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on user_settings" ON user_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Anon can read public market data
CREATE POLICY "Public read on market_data" ON market_data
  FOR SELECT USING (true);

CREATE POLICY "Public read on trading_signals" ON trading_signals
  FOR SELECT USING (is_active = true);

-- ============================================================================
-- SEED: Default admin user (password should be changed immediately)
-- ============================================================================
INSERT INTO admin_users (id, username, password_hash, role, permissions)
VALUES (
  'admin_001',
  'cypher_admin',
  crypt('CypherAdmin2025!', gen_salt('bf', 12)),
  'super_admin',
  ARRAY['*']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO admin_users (id, username, password_hash, role, permissions)
VALUES (
  'system_001',
  'system',
  crypt('SystemPassword2025!', gen_salt('bf', 12)),
  'system',
  ARRAY['system:*', 'monitoring:*', 'services:*']
) ON CONFLICT (id) DO NOTHING;
