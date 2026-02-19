-- ============================================================================
-- CYPHER V3 - Arbitrage & Performance Tracking Schema
-- Migration 002: Arbitrage Professional Terminal Tables
-- Run this after 001_initial_schema.sql
-- ============================================================================

-- Enable required extensions (may already be enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ARBITRAGE OPPORTUNITIES (live & historical)
-- ============================================================================
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('cex-dex', 'triangular', 'statistical')),
  buy_exchange TEXT NOT NULL,
  sell_exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  buy_price NUMERIC(18, 8) NOT NULL,
  sell_price NUMERIC(18, 8) NOT NULL,
  spread NUMERIC(18, 8) NOT NULL,
  spread_percent NUMERIC(8, 4) NOT NULL,
  estimated_profit NUMERIC(18, 2) NOT NULL,
  net_profit NUMERIC(18, 2) NOT NULL,
  fees JSONB NOT NULL DEFAULT '{"buy": 0, "sell": 0, "network": 0, "total": 0}',
  risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 1 AND 10),
  confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  execution_time INTEGER NOT NULL, -- seconds
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'executed', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes'
);

CREATE INDEX idx_arb_opp_type ON arbitrage_opportunities(type);
CREATE INDEX idx_arb_opp_symbol ON arbitrage_opportunities(symbol);
CREATE INDEX idx_arb_opp_status ON arbitrage_opportunities(status);
CREATE INDEX idx_arb_opp_created ON arbitrage_opportunities(created_at DESC);
CREATE INDEX idx_arb_opp_net_profit ON arbitrage_opportunities(net_profit DESC);
CREATE INDEX idx_arb_opp_spread ON arbitrage_opportunities(spread_percent DESC);

-- ============================================================================
-- 2. ARBITRAGE EXECUTIONS (trade execution log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS arbitrage_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES arbitrage_opportunities(id),
  user_wallet TEXT NOT NULL,
  amount NUMERIC(18, 8) NOT NULL,
  buy_tx_hash TEXT,
  sell_tx_hash TEXT,
  actual_profit NUMERIC(18, 2),
  slippage NUMERIC(8, 4),
  status TEXT NOT NULL CHECK (status IN ('pending', 'buy_submitted', 'buy_confirmed', 'sell_submitted', 'completed', 'failed')),
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_arb_exec_user ON arbitrage_executions(user_wallet);
CREATE INDEX idx_arb_exec_status ON arbitrage_executions(status);
CREATE INDEX idx_arb_exec_created ON arbitrage_executions(created_at DESC);
CREATE INDEX idx_arb_exec_opportunity ON arbitrage_executions(opportunity_id);

-- ============================================================================
-- 3. SMC SIGNALS (Smart Money Concepts indicators)
-- ============================================================================
CREATE TABLE IF NOT EXISTS smc_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('order_block', 'fair_value_gap', 'liquidity_zone', 'market_structure', 'breaker_block')),
  direction TEXT CHECK (direction IN ('bullish', 'bearish', 'neutral')),
  price NUMERIC(18, 8) NOT NULL,
  high NUMERIC(18, 8),
  low NUMERIC(18, 8),
  strength INTEGER CHECK (strength BETWEEN 1 AND 10),
  volume NUMERIC(18, 8),
  fill_probability INTEGER CHECK (fill_probability BETWEEN 0 AND 100),
  distance_percent NUMERIC(8, 4),
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_smc_asset ON smc_signals(asset);
CREATE INDEX idx_smc_type ON smc_signals(signal_type);
CREATE INDEX idx_smc_timeframe ON smc_signals(timeframe);
CREATE INDEX idx_smc_active ON smc_signals(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_smc_created ON smc_signals(created_at DESC);

-- ============================================================================
-- 4. PERFORMANCE METRICS (daily snapshots)
-- ============================================================================
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy TEXT NOT NULL,
  sharpe_ratio NUMERIC(8, 4),
  sortino_ratio NUMERIC(8, 4),
  calmar_ratio NUMERIC(8, 4),
  max_drawdown NUMERIC(8, 4),
  current_drawdown NUMERIC(8, 4),
  win_rate NUMERIC(8, 4),
  profit_factor NUMERIC(8, 4),
  avg_win NUMERIC(18, 2),
  avg_loss NUMERIC(18, 2),
  total_trades INTEGER,
  total_profit NUMERIC(18, 2),
  period TEXT NOT NULL, -- '24h', '7d', '30d', 'all'
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_perf_strategy ON performance_metrics(strategy);
CREATE INDEX idx_perf_period ON performance_metrics(period);
CREATE INDEX idx_perf_date ON performance_metrics(snapshot_date DESC);
CREATE UNIQUE INDEX idx_perf_unique ON performance_metrics(strategy, period, snapshot_date);

-- ============================================================================
-- 5. EXCHANGE PRICES (real-time price cache)
-- ============================================================================
CREATE TABLE IF NOT EXISTS exchange_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  bid NUMERIC(18, 8),
  ask NUMERIC(18, 8),
  last NUMERIC(18, 8),
  volume_24h NUMERIC(18, 2),
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exchange_prices_symbol ON exchange_prices(symbol, timestamp DESC);
CREATE INDEX idx_exchange_prices_exchange ON exchange_prices(exchange, timestamp DESC);
CREATE INDEX idx_exchange_prices_timestamp ON exchange_prices(timestamp DESC);

-- ============================================================================
-- 6. ORDER BOOK SNAPSHOTS (depth analysis)
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_book_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  bids JSONB NOT NULL DEFAULT '[]',
  asks JSONB NOT NULL DEFAULT '[]',
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orderbook_symbol ON order_book_snapshots(symbol, timestamp DESC);
CREATE INDEX idx_orderbook_exchange ON order_book_snapshots(exchange, timestamp DESC);

-- ============================================================================
-- 7. TRIANGULAR PATHS (detected triangular arbitrage paths)
-- ============================================================================
CREATE TABLE IF NOT EXISTS triangular_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_currency TEXT NOT NULL,
  path TEXT[] NOT NULL, -- e.g., ['USDT', 'BTC', 'ETH', 'USDT']
  exchanges TEXT[] NOT NULL,
  expected_profit NUMERIC(8, 4) NOT NULL,
  profit_amount NUMERIC(18, 2) NOT NULL,
  fees JSONB NOT NULL DEFAULT '{"trading": 0, "network": 0, "slippage": 0, "total": 0}',
  risk_level TEXT CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
  execution_time INTEGER, -- seconds
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'executed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '2 minutes'
);

CREATE INDEX idx_triangular_base ON triangular_paths(base_currency);
CREATE INDEX idx_triangular_status ON triangular_paths(status);
CREATE INDEX idx_triangular_profit ON triangular_paths(expected_profit DESC);
CREATE INDEX idx_triangular_created ON triangular_paths(created_at DESC);

-- ============================================================================
-- AUTO-CLEANUP FUNCTIONS (expire old opportunities)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_opportunities()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM arbitrage_opportunities
    WHERE expires_at < NOW() AND status = 'active'
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_triangular_paths()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM triangular_paths
    WHERE expires_at < NOW() AND status = 'active'
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE arbitrage_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE arbitrage_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE smc_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access on arbitrage_opportunities" ON arbitrage_opportunities
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on arbitrage_executions" ON arbitrage_executions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on smc_signals" ON smc_signals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on performance_metrics" ON performance_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- Public can read active opportunities and signals
CREATE POLICY "Public read on active opportunities" ON arbitrage_opportunities
  FOR SELECT USING (status = 'active');

CREATE POLICY "Public read on active smc signals" ON smc_signals
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public read on performance metrics" ON performance_metrics
  FOR SELECT USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE arbitrage_opportunities IS 'Real-time arbitrage opportunities detected across exchanges';
COMMENT ON TABLE arbitrage_executions IS 'Trade execution log for arbitrage strategies';
COMMENT ON TABLE smc_signals IS 'Smart Money Concepts indicators (Order Blocks, FVGs, Liquidity)';
COMMENT ON TABLE performance_metrics IS 'Professional trading metrics (Sharpe, Drawdown, Profit Factor)';
COMMENT ON TABLE exchange_prices IS 'Real-time price snapshots from multiple exchanges';
COMMENT ON TABLE order_book_snapshots IS 'Order book depth snapshots for liquidity analysis';
COMMENT ON TABLE triangular_paths IS 'Detected triangular arbitrage paths';
