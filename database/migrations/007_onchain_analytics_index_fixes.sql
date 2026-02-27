-- ============================================================================
-- CYPHER V3 - Migration 007: On-Chain Analytics + Performance Index Fixes
-- ============================================================================

-- 1. NETWORK METRICS (snapshots históricos)
CREATE TABLE IF NOT EXISTS network_metrics (
  id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  hashrate               NUMERIC(20,2),
  difficulty             NUMERIC(20,2),
  block_height           BIGINT,
  mempool_tx_count       INTEGER,
  mempool_size_bytes     BIGINT,
  mempool_total_fees     NUMERIC(18,8),
  avg_fee_rate           NUMERIC(10,2),     -- sat/vB
  median_fee_rate        NUMERIC(10,2),
  next_difficulty_change NUMERIC(8,4),
  timestamp              TIMESTAMPTZ NOT NULL,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_metrics_timestamp ON network_metrics(timestamp DESC);

-- Auto-cleanup: manter apenas últimos 30 dias
CREATE OR REPLACE FUNCTION cleanup_old_network_metrics()
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM network_metrics
    WHERE timestamp < NOW() - INTERVAL '30 days'
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 2. FEE ESTIMATES HISTORY (actual current → Redis)
CREATE TABLE IF NOT EXISTS fee_estimates_history (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  low        NUMERIC(10,2) NOT NULL,    -- sat/vB
  medium     NUMERIC(10,2) NOT NULL,
  high       NUMERIC(10,2) NOT NULL,
  urgent     NUMERIC(10,2) NOT NULL,
  source     VARCHAR(30) DEFAULT 'mempool.space',
  timestamp  TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_history_timestamp ON fee_estimates_history(timestamp DESC);

-- 3. ADDRESS ANALYTICS (cache de lookups)
CREATE TABLE IF NOT EXISTS address_analytics (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  address         VARCHAR(62) UNIQUE NOT NULL,
  balance         BIGINT      DEFAULT 0,    -- satoshis
  total_received  BIGINT      DEFAULT 0,
  total_sent      BIGINT      DEFAULT 0,
  tx_count        INTEGER     DEFAULT 0,
  first_seen      TIMESTAMPTZ,
  last_seen       TIMESTAMPTZ,
  labels          TEXT[],                    -- exchange, whale, miner, etc.
  is_exchange     BOOLEAN     DEFAULT FALSE,
  is_whale        BOOLEAN     DEFAULT FALSE,
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_address_analytics_address  ON address_analytics(address);
CREATE INDEX IF NOT EXISTS idx_address_analytics_balance  ON address_analytics(balance DESC);
CREATE INDEX IF NOT EXISTS idx_address_analytics_whale    ON address_analytics(is_whale) WHERE is_whale = TRUE;
CREATE INDEX IF NOT EXISTS idx_address_analytics_exchange ON address_analytics(is_exchange) WHERE is_exchange = TRUE;

-- 4. PERFORMANCE INDEX FIXES (tabelas existentes)

-- fee_records: queries por user ordenadas por data
CREATE INDEX IF NOT EXISTS idx_fee_user_created
  ON fee_records(user_address, created_at DESC);

-- trading_signals: filtro comum por asset+chain+ativo
CREATE INDEX IF NOT EXISTS idx_signals_asset_chain_active
  ON trading_signals(asset, chain) WHERE is_active = TRUE;

-- transaction_history: filtro por user+tipo+data
CREATE INDEX IF NOT EXISTS idx_tx_user_type_created
  ON transaction_history(user_address, tx_type, created_at DESC);

-- GIN indexes para campos JSONB
CREATE INDEX IF NOT EXISTS idx_users_settings_gin
  ON users USING GIN(settings);

CREATE INDEX IF NOT EXISTS idx_orderbook_bids_gin
  ON order_book_snapshots USING GIN(bids);

CREATE INDEX IF NOT EXISTS idx_orderbook_asks_gin
  ON order_book_snapshots USING GIN(asks);

-- 5. ADICIONAR CAMPOS FALTANTES

-- transaction_history estava sem updated_at
ALTER TABLE transaction_history
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TRIGGER update_transaction_history_updated_at
  BEFORE UPDATE ON transaction_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. CLEANUP para exchange_prices (manter apenas últimas 24h)
CREATE OR REPLACE FUNCTION cleanup_old_exchange_prices()
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM exchange_prices
    WHERE timestamp < NOW() - INTERVAL '24 hours'
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS
CREATE TRIGGER update_address_analytics_updated_at
  BEFORE UPDATE ON address_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE network_metrics      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_estimates_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE address_analytics    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read network_metrics"         ON network_metrics        FOR SELECT USING (true);
CREATE POLICY "Service write network_metrics"       ON network_metrics        FOR ALL    USING (auth.role() = 'service_role');
CREATE POLICY "Public read fee_estimates_history"   ON fee_estimates_history  FOR SELECT USING (true);
CREATE POLICY "Service write fee_estimates_history" ON fee_estimates_history  FOR ALL    USING (auth.role() = 'service_role');
CREATE POLICY "Public read address_analytics"       ON address_analytics      FOR SELECT USING (true);
CREATE POLICY "Service write address_analytics"     ON address_analytics      FOR ALL    USING (auth.role() = 'service_role');
