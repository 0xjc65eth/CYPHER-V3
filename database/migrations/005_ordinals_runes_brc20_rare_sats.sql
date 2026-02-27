-- ============================================================================
-- CYPHER V3 - Migration 005: Ordinals, Runes, BRC-20, Rare Sats
-- PRIORIDADE: CRÍTICA
-- Execute no Supabase SQL Editor ou via supabase db push
-- ============================================================================

-- 1. INSCRIPTIONS (structured ordinals data)
CREATE TABLE IF NOT EXISTS inscriptions (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  inscription_id    VARCHAR(100) UNIQUE NOT NULL,     -- {txhash}i{vout}
  inscription_number BIGINT,
  block_height      BIGINT      NOT NULL,
  tx_hash           VARCHAR(64) NOT NULL,
  sat               BIGINT,                            -- satoshi number (até ~2.1 quadrilhão)
  content_type      VARCHAR(100),                      -- text/plain, image/png, etc.
  content_size      INTEGER,
  address           VARCHAR(62),                       -- holder atual (Taproot max 62 chars)
  genesis_address   VARCHAR(62),                       -- minter original
  value             BIGINT,                            -- valor em satoshis
  "offset"          BIGINT,                            -- posição no UTXO
  collection_id     UUID,
  metadata          JSONB       DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inscriptions_inscription_id ON inscriptions(inscription_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_address        ON inscriptions(address);
CREATE INDEX IF NOT EXISTS idx_inscriptions_block          ON inscriptions(block_height DESC);
CREATE INDEX IF NOT EXISTS idx_inscriptions_sat            ON inscriptions(sat) WHERE sat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inscriptions_content_type   ON inscriptions(content_type);
CREATE INDEX IF NOT EXISTS idx_inscriptions_collection     ON inscriptions(collection_id) WHERE collection_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inscriptions_created        ON inscriptions(created_at DESC);

-- 2. INSCRIPTION TRANSFERS
CREATE TABLE IF NOT EXISTS inscription_transfers (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  inscription_id  VARCHAR(100) NOT NULL,
  from_address    VARCHAR(62) NOT NULL,
  to_address      VARCHAR(62) NOT NULL,
  tx_hash         VARCHAR(64) NOT NULL,
  block_height    BIGINT      NOT NULL,
  value           BIGINT,
  timestamp       TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insc_transfers_inscription ON inscription_transfers(inscription_id);
CREATE INDEX IF NOT EXISTS idx_insc_transfers_from        ON inscription_transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_insc_transfers_to          ON inscription_transfers(to_address);
CREATE INDEX IF NOT EXISTS idx_insc_transfers_block       ON inscription_transfers(block_height DESC);

-- 3. ORDINAL COLLECTIONS
CREATE TABLE IF NOT EXISTS ordinal_collections (
  id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT          NOT NULL,
  slug           VARCHAR(100)  UNIQUE NOT NULL,
  description    TEXT,
  supply         INTEGER,
  floor_price    NUMERIC(18,8),          -- em BTC
  volume_24h     NUMERIC(18,8),
  volume_total   NUMERIC(18,8),
  holders_count  INTEGER,
  image_url      TEXT,
  verified       BOOLEAN       DEFAULT FALSE,
  metadata       JSONB         DEFAULT '{}',
  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collections_slug   ON ordinal_collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_floor  ON ordinal_collections(floor_price DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_collections_volume ON ordinal_collections(volume_24h DESC NULLS LAST);

-- 4. COLLECTION ITEMS
CREATE TABLE IF NOT EXISTS collection_items (
  id             UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id  UUID    NOT NULL REFERENCES ordinal_collections(id) ON DELETE CASCADE,
  inscription_id VARCHAR(100) NOT NULL,
  rank           INTEGER,
  rarity_score   NUMERIC(10,4),
  traits         JSONB   DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collection_items_collection  ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_inscription ON collection_items(inscription_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_rank        ON collection_items(collection_id, rank);
CREATE INDEX IF NOT EXISTS idx_collection_items_traits_gin  ON collection_items USING GIN(traits);

-- 5. RUNES (token registry)
CREATE TABLE IF NOT EXISTS runes (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  rune_id          VARCHAR(30)  UNIQUE NOT NULL,    -- formato: {block}:{tx}
  name             VARCHAR(100) NOT NULL,
  spaced_name      VARCHAR(130),                    -- ex: "DOG•GO•TO•THE•MOON"
  symbol           VARCHAR(10),
  divisibility     SMALLINT     NOT NULL DEFAULT 0,
  supply           NUMERIC(38,0) NOT NULL,
  minted_supply    NUMERIC(38,0) DEFAULT 0,
  burned           NUMERIC(38,0) DEFAULT 0,
  premine          NUMERIC(38,0) DEFAULT 0,
  per_mint_amount  NUMERIC(38,0),
  mint_start       BIGINT,                          -- block height
  mint_end         BIGINT,
  etcher           VARCHAR(62),                     -- endereço
  tx_hash          VARCHAR(64)  NOT NULL,
  block_height     BIGINT       NOT NULL,
  floor_price      NUMERIC(18,8),                   -- em BTC (denormalizado para velocidade)
  volume_24h       NUMERIC(18,8),
  holders_count    INTEGER      DEFAULT 0,
  metadata         JSONB        DEFAULT '{}',
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_runes_rune_id ON runes(rune_id);
CREATE INDEX IF NOT EXISTS idx_runes_name    ON runes(name);
CREATE INDEX IF NOT EXISTS idx_runes_floor   ON runes(floor_price DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_runes_volume  ON runes(volume_24h DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_runes_block   ON runes(block_height DESC);

-- 6. RUNE BALANCES
CREATE TABLE IF NOT EXISTS rune_balances (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  rune_id    VARCHAR(30)  NOT NULL REFERENCES runes(rune_id) ON DELETE CASCADE,
  address    VARCHAR(62)  NOT NULL,
  balance    NUMERIC(38,0) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rune_balances_unique  ON rune_balances(rune_id, address);
CREATE INDEX IF NOT EXISTS idx_rune_balances_address        ON rune_balances(address);
CREATE INDEX IF NOT EXISTS idx_rune_balances_rune           ON rune_balances(rune_id);

-- 7. RUNE TRANSFERS
CREATE TABLE IF NOT EXISTS rune_transfers (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  rune_id      VARCHAR(30)  NOT NULL,
  from_address VARCHAR(62)  NOT NULL,
  to_address   VARCHAR(62)  NOT NULL,
  amount       NUMERIC(38,0) NOT NULL,
  tx_hash      VARCHAR(64)  NOT NULL,
  block_height BIGINT       NOT NULL,
  timestamp    TIMESTAMPTZ  NOT NULL,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rune_transfers_rune  ON rune_transfers(rune_id);
CREATE INDEX IF NOT EXISTS idx_rune_transfers_from  ON rune_transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_rune_transfers_to    ON rune_transfers(to_address);
CREATE INDEX IF NOT EXISTS idx_rune_transfers_block ON rune_transfers(block_height DESC);

-- 8. RUNE MINTS
CREATE TABLE IF NOT EXISTS rune_mints (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  rune_id         VARCHAR(30) NOT NULL,
  minter_address  VARCHAR(62) NOT NULL,
  amount          NUMERIC(38,0) NOT NULL,
  tx_hash         VARCHAR(64) NOT NULL,
  block_height    BIGINT      NOT NULL,
  timestamp       TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rune_mints_rune    ON rune_mints(rune_id);
CREATE INDEX IF NOT EXISTS idx_rune_mints_minter  ON rune_mints(minter_address);
CREATE INDEX IF NOT EXISTS idx_rune_mints_block   ON rune_mints(block_height DESC);

-- 9. BRC-20 TOKENS
CREATE TABLE IF NOT EXISTS brc20_tokens (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tick                  VARCHAR(4)  UNIQUE NOT NULL,
  max_supply            NUMERIC(38,0) NOT NULL,
  mint_limit            NUMERIC(38,0),
  total_minted          NUMERIC(38,0) DEFAULT 0,
  holders_count         INTEGER     DEFAULT 0,
  deployer_address      VARCHAR(62),
  deploy_inscription_id VARCHAR(100),
  floor_price           NUMERIC(18,8),
  volume_24h            NUMERIC(18,8),
  deployed_at           TIMESTAMPTZ,
  metadata              JSONB       DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_brc20_tick    ON brc20_tokens(tick);
CREATE INDEX IF NOT EXISTS idx_brc20_volume         ON brc20_tokens(volume_24h DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_brc20_holders        ON brc20_tokens(holders_count DESC);

-- 10. BRC-20 OPERATIONS
CREATE TABLE IF NOT EXISTS brc20_operations (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tick           VARCHAR(4)  NOT NULL,
  operation      VARCHAR(10) NOT NULL CHECK (operation IN ('deploy', 'mint', 'transfer')),
  from_address   VARCHAR(62),
  to_address     VARCHAR(62),
  amount         NUMERIC(38,0),
  inscription_id VARCHAR(100),
  block_height   BIGINT      NOT NULL,
  timestamp      TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brc20_ops_tick      ON brc20_operations(tick);
CREATE INDEX IF NOT EXISTS idx_brc20_ops_operation ON brc20_operations(operation);
CREATE INDEX IF NOT EXISTS idx_brc20_ops_block     ON brc20_operations(block_height DESC);
CREATE INDEX IF NOT EXISTS idx_brc20_ops_from      ON brc20_operations(from_address) WHERE from_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brc20_ops_to        ON brc20_operations(to_address) WHERE to_address IS NOT NULL;

-- 11. BRC-20 BALANCES
CREATE TABLE IF NOT EXISTS brc20_balances (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tick                 VARCHAR(4)  NOT NULL,
  address              VARCHAR(62) NOT NULL,
  available_balance    NUMERIC(38,0) DEFAULT 0,
  transferable_balance NUMERIC(38,0) DEFAULT 0,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_brc20_balances_unique   ON brc20_balances(tick, address);
CREATE INDEX IF NOT EXISTS idx_brc20_balances_address         ON brc20_balances(address);
CREATE INDEX IF NOT EXISTS idx_brc20_balances_tick            ON brc20_balances(tick);

-- 12. RARE SATS
CREATE TABLE IF NOT EXISTS rare_sats (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  sat_number          BIGINT      UNIQUE NOT NULL,
  rarity              VARCHAR(20) NOT NULL CHECK (rarity IN ('common','uncommon','rare','epic','legendary','mythic')),
  sat_type            VARCHAR(30),
  block_height        BIGINT,
  coinbase_position   INTEGER,
  utxo_tx_hash        VARCHAR(64),
  utxo_vout           INTEGER,
  current_address     VARCHAR(62),
  estimated_value_btc NUMERIC(18,8),
  metadata            JSONB       DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rare_sats_number  ON rare_sats(sat_number);
CREATE INDEX IF NOT EXISTS idx_rare_sats_rarity         ON rare_sats(rarity);
CREATE INDEX IF NOT EXISTS idx_rare_sats_type           ON rare_sats(sat_type);
CREATE INDEX IF NOT EXISTS idx_rare_sats_address        ON rare_sats(current_address);
CREATE INDEX IF NOT EXISTS idx_rare_sats_value          ON rare_sats(estimated_value_btc DESC NULLS LAST);

-- 13. RARE SAT TYPES (catálogo)
CREATE TABLE IF NOT EXISTS rare_sat_types (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(30) UNIQUE NOT NULL,
  description TEXT,
  total_count BIGINT,
  criteria    JSONB   DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir tipos conhecidos
INSERT INTO rare_sat_types (name, description, total_count) VALUES
  ('pizza',          'Sats da Pizza Transaction (bloco 57043)', 10000000000),
  ('block_9',        'Sats do bloco 9 (Satoshi''s first block)', 5000000000),
  ('vintage',        'Sats pré-2010', NULL),
  ('nakamoto',       'Sats minerados por Satoshi (blocos 1-99)', NULL),
  ('black_uncommon', 'Uncommon sat na posição 0 de bloco', NULL),
  ('epic',           'Primeiro sat de cada halving', 4),
  ('legendary',      'Primeiro sat de cada ciclo (6 halvings)', 1),
  ('mythic',         'Primeiro sat ever — bloco genesis', 1),
  ('rodarmor',       'Sats especiais nomeados por Casey Rodarmor', NULL)
ON CONFLICT (name) DO NOTHING;

-- TRIGGERS para updated_at
CREATE TRIGGER update_inscriptions_updated_at
  BEFORE UPDATE ON inscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON ordinal_collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_runes_updated_at
  BEFORE UPDATE ON runes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brc20_tokens_updated_at
  BEFORE UPDATE ON brc20_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rare_sats_updated_at
  BEFORE UPDATE ON rare_sats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE inscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordinal_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE runes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_balances       ENABLE ROW LEVEL SECURITY;
ALTER TABLE brc20_tokens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE brc20_balances      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rare_sats           ENABLE ROW LEVEL SECURITY;

-- Leitura pública, escrita apenas service_role
CREATE POLICY "Public read inscriptions"   ON inscriptions        FOR SELECT USING (true);
CREATE POLICY "Service write inscriptions" ON inscriptions        FOR ALL    USING (auth.role() = 'service_role');
CREATE POLICY "Public read collections"    ON ordinal_collections FOR SELECT USING (true);
CREATE POLICY "Service write collections"  ON ordinal_collections FOR ALL    USING (auth.role() = 'service_role');
CREATE POLICY "Public read runes"          ON runes               FOR SELECT USING (true);
CREATE POLICY "Service write runes"        ON runes               FOR ALL    USING (auth.role() = 'service_role');
CREATE POLICY "Public read rune_balances"  ON rune_balances       FOR SELECT USING (true);
CREATE POLICY "Service write rune_balances" ON rune_balances      FOR ALL    USING (auth.role() = 'service_role');
CREATE POLICY "Public read brc20_tokens"   ON brc20_tokens        FOR SELECT USING (true);
CREATE POLICY "Service write brc20_tokens" ON brc20_tokens        FOR ALL    USING (auth.role() = 'service_role');
CREATE POLICY "Public read brc20_balances" ON brc20_balances      FOR SELECT USING (true);
CREATE POLICY "Service write brc20_balances" ON brc20_balances    FOR ALL    USING (auth.role() = 'service_role');
CREATE POLICY "Public read rare_sats"      ON rare_sats           FOR SELECT USING (true);
CREATE POLICY "Service write rare_sats"    ON rare_sats           FOR ALL    USING (auth.role() = 'service_role');
