-- ============================================================================
-- CYPHER V3 - AI Trading Agent Schema
-- Migration 003: Agent configurations, trades, LP positions, session keys
-- ============================================================================

-- Agent configurations (persist between restarts)
CREATE TABLE IF NOT EXISTS agent_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_address TEXT NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_configs_user ON agent_configs(user_address);
CREATE INDEX IF NOT EXISTS idx_agent_configs_active ON agent_configs(is_active) WHERE is_active = TRUE;

-- Agent trades (full history with outcomes and consensus data)
CREATE TABLE IF NOT EXISTS agent_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_config_id UUID REFERENCES agent_configs(id),
  signal_id TEXT NOT NULL,
  pair TEXT NOT NULL,
  exchange TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
  strategy TEXT NOT NULL CHECK (strategy IN ('scalp', 'mm', 'lp')),
  asset_class TEXT DEFAULT 'crypto' CHECK (asset_class IN ('crypto', 'forex', 'stock', 'commodity')),
  entry_price NUMERIC(18, 8) NOT NULL,
  exit_price NUMERIC(18, 8),
  position_size_usd NUMERIC(18, 2) NOT NULL,
  leverage NUMERIC(6, 2) DEFAULT 1,
  stop_loss NUMERIC(18, 8),
  take_profit JSONB,
  realized_pnl NUMERIC(18, 2),
  fees_paid NUMERIC(18, 2) DEFAULT 0,
  confidence NUMERIC(5, 4),
  consensus_votes JSONB,
  reason TEXT,
  smc_context JSONB,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled', 'liquidated')),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  tx_hash_open TEXT,
  tx_hash_close TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_trades_pair ON agent_trades(pair);
CREATE INDEX IF NOT EXISTS idx_agent_trades_status ON agent_trades(status);
CREATE INDEX IF NOT EXISTS idx_agent_trades_opened ON agent_trades(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_trades_config ON agent_trades(agent_config_id);

-- Agent equity snapshots (for equity curve chart)
CREATE TABLE IF NOT EXISTS agent_equity_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_config_id UUID REFERENCES agent_configs(id),
  equity NUMERIC(18, 2) NOT NULL,
  realized_pnl NUMERIC(18, 2) DEFAULT 0,
  unrealized_pnl NUMERIC(18, 2) DEFAULT 0,
  positions_count INTEGER DEFAULT 0,
  drawdown NUMERIC(8, 6) DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equity_snapshots_time ON agent_equity_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_equity_snapshots_config ON agent_equity_snapshots(agent_config_id);

-- Agent LP positions (tracked separately with IL/fee data)
CREATE TABLE IF NOT EXISTS agent_lp_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_config_id UUID REFERENCES agent_configs(id),
  pair TEXT NOT NULL,
  protocol TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'evm',
  tick_lower NUMERIC(18, 8),
  tick_upper NUMERIC(18, 8),
  liquidity NUMERIC(28, 8),
  token0_amount NUMERIC(28, 8),
  token1_amount NUMERIC(28, 8),
  fee_tier NUMERIC(8, 6),
  value_usd NUMERIC(18, 2),
  impermanent_loss NUMERIC(8, 6) DEFAULT 0,
  total_fees_earned NUMERIC(18, 2) DEFAULT 0,
  in_range BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'rebalancing')),
  on_chain_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_rebalance TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lp_positions_config ON agent_lp_positions(agent_config_id);
CREATE INDEX IF NOT EXISTS idx_lp_positions_status ON agent_lp_positions(status) WHERE status = 'active';

-- Consensus decisions (audit trail)
CREATE TABLE IF NOT EXISTS agent_consensus_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_config_id UUID REFERENCES agent_configs(id),
  pair TEXT NOT NULL,
  proposal JSONB NOT NULL,
  votes JSONB NOT NULL,
  result JSONB NOT NULL,
  approved BOOLEAN NOT NULL,
  executed BOOLEAN DEFAULT FALSE,
  trade_id UUID REFERENCES agent_trades(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consensus_config ON agent_consensus_decisions(agent_config_id);
CREATE INDEX IF NOT EXISTS idx_consensus_created ON agent_consensus_decisions(created_at DESC);

-- Session keys for non-custodial autonomous signing
CREATE TABLE IF NOT EXISTS agent_session_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_address TEXT NOT NULL,
  chain TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  public_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  spend_limit_usd NUMERIC(18, 2) NOT NULL,
  spent_usd NUMERIC(18, 2) DEFAULT 0,
  allowed_pairs TEXT[] DEFAULT '{}',
  allowed_contracts TEXT[] DEFAULT '{}',
  call_count INTEGER DEFAULT 0,
  max_calls INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_session_keys_user ON agent_session_keys(user_address);
CREATE INDEX IF NOT EXISTS idx_session_keys_active ON agent_session_keys(is_active) WHERE is_active = TRUE;

-- Auto-compound history
CREATE TABLE IF NOT EXISTS agent_compound_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_config_id UUID REFERENCES agent_configs(id),
  total_compounded NUMERIC(18, 2) NOT NULL,
  lp_fees NUMERIC(18, 2) DEFAULT 0,
  mm_profits NUMERIC(18, 2) DEFAULT 0,
  scalp_pnl NUMERIC(18, 2) DEFAULT 0,
  distribution JSONB,
  gas_cost NUMERIC(18, 4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compound_config ON agent_compound_history(agent_config_id);
