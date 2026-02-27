-- ============================================================================
-- CYPHER V3 - Migration 006: Portfolios, Watchlists, Alerts, API Keys
-- ============================================================================

-- 1. PORTFOLIOS
CREATE TABLE IF NOT EXISTS portfolios (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address  TEXT        NOT NULL,
  name            VARCHAR(100) NOT NULL DEFAULT 'Default Portfolio',
  currency        VARCHAR(10) DEFAULT 'USD',
  is_default      BOOLEAN     DEFAULT FALSE,
  total_value_usd NUMERIC(18,2) DEFAULT 0,
  pnl_24h         NUMERIC(18,2) DEFAULT 0,
  pnl_total       NUMERIC(18,2) DEFAULT 0,
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ              -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_portfolios_wallet  ON portfolios(wallet_address);
CREATE INDEX IF NOT EXISTS idx_portfolios_active  ON portfolios(wallet_address) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_portfolios_default ON portfolios(wallet_address, is_default) WHERE is_default = TRUE;

-- 2. PORTFOLIO ASSETS
CREATE TABLE IF NOT EXISTS portfolio_assets (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id      UUID        NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  asset_type        VARCHAR(20) NOT NULL CHECK (asset_type IN ('btc','eth','sol','ordinal','rune','brc20','token')),
  asset_id          TEXT,
  symbol            VARCHAR(20),
  quantity          NUMERIC(28,8) NOT NULL DEFAULT 0,
  avg_cost_basis    NUMERIC(18,8),
  current_price     NUMERIC(18,8),
  current_value_usd NUMERIC(18,2),
  pnl_usd           NUMERIC(18,2),
  pnl_percent       NUMERIC(8,4),
  metadata          JSONB       DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_assets_portfolio ON portfolio_assets(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_type      ON portfolio_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_symbol    ON portfolio_assets(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_asset_id  ON portfolio_assets(asset_id) WHERE asset_id IS NOT NULL;

-- 3. WATCHLISTS
CREATE TABLE IF NOT EXISTS watchlists (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT        NOT NULL,
  name           VARCHAR(100) NOT NULL DEFAULT 'My Watchlist',
  items          JSONB       NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchlists_wallet    ON watchlists(wallet_address);
CREATE INDEX IF NOT EXISTS idx_watchlists_items_gin ON watchlists USING GIN(items);

-- 4. ALERTS
CREATE TABLE IF NOT EXISTS alerts (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address    TEXT        NOT NULL,
  alert_type        VARCHAR(30) NOT NULL CHECK (alert_type IN (
    'price_above','price_below','floor_price','rune_price',
    'fee_below','whale_alert','inscription_sold','portfolio_change'
  )),
  asset_type        VARCHAR(20),
  asset_id          TEXT,
  symbol            VARCHAR(20),
  condition         JSONB       NOT NULL,
  is_triggered      BOOLEAN     DEFAULT FALSE,
  is_active         BOOLEAN     DEFAULT TRUE,
  triggered_at      TIMESTAMPTZ,
  notification_sent BOOLEAN     DEFAULT FALSE,
  metadata          JSONB       DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_wallet  ON alerts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_alerts_active  ON alerts(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_alerts_type    ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_pending ON alerts(wallet_address, is_active, is_triggered)
  WHERE is_active = TRUE AND is_triggered = FALSE;

-- 5. API KEYS
CREATE TABLE IF NOT EXISTS api_keys (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT        NOT NULL,
  key_hash       VARCHAR(64) UNIQUE NOT NULL,
  name           VARCHAR(100) NOT NULL,
  permissions    JSONB       DEFAULT '["read"]',
  last_used_at   TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,
  is_active      BOOLEAN     DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_wallet ON api_keys(wallet_address);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash   ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(wallet_address) WHERE is_active = TRUE;

-- TRIGGERS
CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_assets_updated_at
  BEFORE UPDATE ON portfolio_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlists_updated_at
  BEFORE UPDATE ON watchlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE portfolios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists       ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on portfolios"       ON portfolios       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on portfolio_assets" ON portfolio_assets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on watchlists"       ON watchlists       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on alerts"           ON alerts           FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on api_keys"         ON api_keys         FOR ALL USING (auth.role() = 'service_role');
