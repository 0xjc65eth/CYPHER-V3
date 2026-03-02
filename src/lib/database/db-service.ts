/**
 * CYPHER V3 - Database Service Layer
 * Persistent storage for users, fees, sessions, transactions, and signals.
 * Uses Supabase (PostgreSQL) with graceful fallback to in-memory for dev.
 */

import { getSupabaseServiceClient, isSupabaseConfigured } from './supabase-client'

// ============================================================================
// Types
// ============================================================================

export interface DBUser {
  id?: string
  wallet_address: string
  wallet_type: string
  chain: string
  display_name?: string
  is_premium: boolean
  role: string
  total_trades: number
  total_volume_usd: number
  total_fees_paid_usd: number
  settings: Record<string, unknown>
  metadata: Record<string, unknown>
  last_seen_at?: string
  created_at?: string
  updated_at?: string
}

export interface DBFeeRecord {
  id: string
  protocol: string
  chain: string
  from_token: string
  to_token: string
  trade_amount_usd: number
  fee_amount: number
  fee_token: string
  fee_usd: number
  fee_bps: number
  fee_wallet: string
  user_address: string
  tx_hash?: string
  status: string
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface DBAdminSession {
  session_id: string
  admin_id: string
  ip_address: string
  user_agent: string
  is_active: boolean
  created_at?: string
  last_activity?: string
  expires_at: string
}

export interface DBTransaction {
  id?: string
  user_address: string
  tx_hash?: string
  tx_type: string
  protocol?: string
  chain: string
  from_token?: string
  to_token?: string
  from_amount?: number
  to_amount?: number
  price_usd?: number
  fee_usd?: number
  status: string
  block_number?: number
  metadata?: Record<string, unknown>
  created_at?: string
}

export interface DBTradingSignal {
  id?: string
  signal_type: string
  asset: string
  chain: string
  confidence: number
  price_at_signal?: number
  target_price?: number
  stop_loss?: number
  source: string
  reasoning?: string
  metadata?: Record<string, unknown>
  is_active: boolean
  created_at?: string
}

export interface DBSubscription {
  id?: string
  user_id?: string
  wallet_address: string
  stripe_subscription_id: string
  stripe_customer_id: string
  tier: string
  status: string
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end?: boolean
  canceled_at?: string
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface DBSubscriptionEvent {
  id?: string
  subscription_id?: string
  wallet_address: string
  event_type: string
  stripe_event_id?: string
  data?: Record<string, unknown>
  created_at?: string
}

// ---- Migration 005: Ordinals, Runes, BRC-20, Rare Sats ----

export interface DBInscription {
  id?: string
  inscription_id: string
  inscription_number?: number
  block_height: number
  tx_hash: string
  sat?: number
  content_type?: string
  content_size?: number
  address?: string
  genesis_address?: string
  value?: number
  offset?: number
  collection_id?: string
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface DBInscriptionTransfer {
  id?: string
  inscription_id: string
  from_address: string
  to_address: string
  tx_hash: string
  block_height: number
  value?: number
  timestamp: string
  created_at?: string
}

export interface DBOrdinalCollection {
  id?: string
  name: string
  slug: string
  description?: string
  supply?: number
  floor_price?: number
  volume_24h?: number
  volume_total?: number
  holders_count?: number
  image_url?: string
  verified?: boolean
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface DBRune {
  id?: string
  rune_id: string
  name: string
  spaced_name?: string
  symbol?: string
  divisibility: number
  supply: string   // NUMERIC(38,0) → string to avoid precision loss
  minted_supply?: string
  burned?: string
  premine?: string
  per_mint_amount?: string
  mint_start?: number
  mint_end?: number
  etcher?: string
  tx_hash: string
  block_height: number
  floor_price?: number
  volume_24h?: number
  holders_count?: number
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface DBRuneBalance {
  id?: string
  rune_id: string
  address: string
  balance: string
  updated_at?: string
}

export interface DBBRC20Token {
  id?: string
  tick: string
  max_supply: string
  mint_limit?: string
  total_minted?: string
  holders_count?: number
  deployer_address?: string
  deploy_inscription_id?: string
  floor_price?: number
  volume_24h?: number
  deployed_at?: string
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface DBBRC20Balance {
  id?: string
  tick: string
  address: string
  available_balance: string
  transferable_balance: string
  updated_at?: string
}

export interface DBRareSat {
  id?: string
  sat_number: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'
  sat_type?: string
  block_height?: number
  coinbase_position?: number
  utxo_tx_hash?: string
  utxo_vout?: number
  current_address?: string
  estimated_value_btc?: number
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

// ---- Migration 006: Portfolios, Watchlists, Alerts, API Keys ----

export interface DBPortfolio {
  id?: string
  wallet_address: string
  name: string
  currency?: string
  is_default?: boolean
  total_value_usd?: number
  pnl_24h?: number
  pnl_total?: number
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface DBPortfolioAsset {
  id?: string
  portfolio_id: string
  asset_type: string
  asset_id?: string
  symbol?: string
  quantity: number
  avg_cost_basis?: number
  current_price?: number
  current_value_usd?: number
  pnl_usd?: number
  pnl_percent?: number
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface DBWatchlist {
  id?: string
  wallet_address: string
  name: string
  items: unknown[]
  created_at?: string
  updated_at?: string
}

export interface DBAlert {
  id?: string
  wallet_address: string
  alert_type: string
  asset_type?: string
  asset_id?: string
  symbol?: string
  condition: Record<string, unknown>
  is_triggered?: boolean
  is_active?: boolean
  triggered_at?: string
  notification_sent?: boolean
  metadata?: Record<string, unknown>
  created_at?: string
}

export interface DBApiKey {
  id?: string
  wallet_address: string
  key_hash: string
  name: string
  permissions?: unknown[]
  last_used_at?: string
  expires_at?: string
  is_active?: boolean
  created_at?: string
}

// ---- Migration 007: On-Chain Analytics ----

export interface DBNetworkMetrics {
  id?: string
  hashrate?: number
  difficulty?: number
  block_height?: number
  mempool_tx_count?: number
  mempool_size_bytes?: number
  mempool_total_fees?: number
  avg_fee_rate?: number
  median_fee_rate?: number
  next_difficulty_change?: number
  timestamp: string
  created_at?: string
}

export interface DBFeeEstimateHistory {
  id?: string
  low: number
  medium: number
  high: number
  urgent: number
  source?: string
  timestamp: string
  created_at?: string
}

export interface DBAddressAnalytics {
  id?: string
  address: string
  balance?: number
  total_received?: number
  total_sent?: number
  tx_count?: number
  first_seen?: string
  last_seen?: string
  labels?: string[]
  is_exchange?: boolean
  is_whale?: boolean
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

// ============================================================================
// In-Memory Fallback Store (for dev without Supabase)
// ============================================================================

class InMemoryStore {
  private stores: Map<string, Map<string, any>> = new Map()

  private getStore(table: string): Map<string, any> {
    if (!this.stores.has(table)) {
      this.stores.set(table, new Map())
    }
    return this.stores.get(table)!
  }

  async insert(table: string, record: any): Promise<any> {
    const store = this.getStore(table)
    const id = record.id || record.session_id || crypto.randomUUID()
    const doc = { ...record, id: record.id || id, created_at: new Date().toISOString() }
    store.set(id, doc)
    return doc
  }

  async upsert(table: string, record: any, key: string): Promise<any> {
    const store = this.getStore(table)
    const keyVal = record[key]
    const existing = Array.from(store.values()).find(r => r[key] === keyVal)
    if (existing) {
      const updated = { ...existing, ...record, updated_at: new Date().toISOString() }
      store.set(existing.id || existing.session_id, updated)
      return updated
    }
    return this.insert(table, record)
  }

  async findOne(table: string, filters: Record<string, any>): Promise<any | null> {
    const store = this.getStore(table)
    for (const doc of store.values()) {
      const matches = Object.entries(filters).every(([k, v]) => doc[k] === v)
      if (matches) return doc
    }
    return null
  }

  async findMany(table: string, filters: Record<string, any> = {}, options?: { limit?: number; orderBy?: string; ascending?: boolean }): Promise<any[]> {
    const store = this.getStore(table)
    let results = Array.from(store.values())

    // Apply filters
    if (Object.keys(filters).length > 0) {
      results = results.filter(doc =>
        Object.entries(filters).every(([k, v]) => doc[k] === v)
      )
    }

    // Sort
    if (options?.orderBy) {
      results.sort((a, b) => {
        const aVal = a[options.orderBy!]
        const bVal = b[options.orderBy!]
        return options.ascending ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
      })
    }

    // Limit
    if (options?.limit) {
      results = results.slice(0, options.limit)
    }

    return results
  }

  async update(table: string, id: string, updates: Record<string, any>): Promise<any | null> {
    const store = this.getStore(table)
    const doc = store.get(id)
    if (!doc) return null
    const updated = { ...doc, ...updates, updated_at: new Date().toISOString() }
    store.set(id, updated)
    return updated
  }

  async delete(table: string, id: string): Promise<boolean> {
    const store = this.getStore(table)
    return store.delete(id)
  }

  async count(table: string, filters: Record<string, any> = {}): Promise<number> {
    const results = await this.findMany(table, filters)
    return results.length
  }

  async aggregate(table: string, field: string, filters: Record<string, any> = {}): Promise<number> {
    const results = await this.findMany(table, filters)
    return results.reduce((sum, r) => sum + (Number(r[field]) || 0), 0)
  }
}

// ============================================================================
// Database Service
// ============================================================================

export class DatabaseService {
  private fallback = new InMemoryStore()
  private _isConnected = false
  private _connectionTested = false
  private _connectionPromise: Promise<boolean> | null = null

  get isConnected(): boolean {
    return this._isConnected && isSupabaseConfigured()
  }

  private get db() {
    return getSupabaseServiceClient()
  }

  /**
   * Auto-initialize: test connection on first use (lazy, singleton promise)
   */
  private async ensureConnection(): Promise<boolean> {
    if (this._connectionTested) return this._isConnected
    if (this._connectionPromise) return this._connectionPromise

    this._connectionPromise = this.testConnection().finally(() => {
      this._connectionTested = true
      this._connectionPromise = null
    })
    return this._connectionPromise
  }

  /**
   * Test the database connection
   */
  async testConnection(): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('[DB] Supabase not configured: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing')
      this._connectionTested = true
      return false
    }

    try {
      const { error } = await this.db.from('users').select('id').limit(1)
      if (error && error.code !== 'PGRST116') {
        console.warn(`[DB] Supabase connection test warning: ${error.message} (code: ${error.code})`)
      }
      this._isConnected = true
      this._connectionTested = true
      console.log('[DB] Supabase connected successfully')
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[DB] Supabase connection failed: ${msg}. Using in-memory fallback.`)
      this._isConnected = false
      this._connectionTested = true
      return false
    }
  }

  // ========================================================================
  // USERS
  // ========================================================================

  async upsertUser(user: Partial<DBUser> & { wallet_address: string }): Promise<DBUser | null> {
    if (!this.isConnected) {
      return this.fallback.upsert('users', {
        ...user,
        is_premium: user.is_premium ?? false,
        role: user.role ?? 'user',
        total_trades: user.total_trades ?? 0,
        total_volume_usd: user.total_volume_usd ?? 0,
        total_fees_paid_usd: user.total_fees_paid_usd ?? 0,
        settings: user.settings ?? {},
        metadata: user.metadata ?? {},
        last_seen_at: new Date().toISOString(),
      }, 'wallet_address')
    }

    const { data, error } = await this.db
      .from('users')
      .upsert({
        ...user,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: 'wallet_address' })
      .select()
      .single()

    if (error) {
      console.error('[DB] upsertUser error:', error.message)
      return null
    }
    return data
  }

  async getUserByWallet(walletAddress: string): Promise<DBUser | null> {
    if (!this.isConnected) {
      return this.fallback.findOne('users', { wallet_address: walletAddress })
    }

    const { data, error } = await this.db
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (error) return null
    return data
  }

  // ========================================================================
  // FEE RECORDS
  // ========================================================================

  async insertFeeRecord(record: DBFeeRecord): Promise<DBFeeRecord | null> {
    if (!this.isConnected) {
      return this.fallback.insert('fee_records', record)
    }

    const { data, error } = await this.db
      .from('fee_records')
      .insert(record)
      .select()
      .single()

    if (error) {
      console.error('[DB] insertFeeRecord error:', error.message)
      // Fallback to memory so we don't lose fee data
      return this.fallback.insert('fee_records', record)
    }
    return data
  }

  async updateFeeStatus(feeId: string, status: string, txHash?: string): Promise<boolean> {
    const updates: Record<string, any> = { status }
    if (txHash) updates.tx_hash = txHash

    if (!this.isConnected) {
      const result = await this.fallback.update('fee_records', feeId, updates)
      return result !== null
    }

    const { error } = await this.db
      .from('fee_records')
      .update(updates)
      .eq('id', feeId)

    if (error) {
      console.error('[DB] updateFeeStatus error:', error.message)
      return false
    }
    return true
  }

  async getFeeStats(): Promise<{
    totalCollected: number
    totalPending: number
    byProtocol: Record<string, { count: number; totalUSD: number }>
    recentFees: DBFeeRecord[]
  }> {
    if (!this.isConnected) {
      const all = await this.fallback.findMany('fee_records', {}, { orderBy: 'created_at', ascending: false })
      return this.computeFeeStats(all)
    }

    const { data, error } = await this.db
      .from('fee_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('[DB] getFeeStats error:', error.message)
      return { totalCollected: 0, totalPending: 0, byProtocol: {}, recentFees: [] }
    }

    return this.computeFeeStats(data || [])
  }

  private computeFeeStats(records: DBFeeRecord[]) {
    const stats = {
      totalCollected: 0,
      totalPending: 0,
      byProtocol: {} as Record<string, { count: number; totalUSD: number }>,
      recentFees: records.slice(0, 20),
    }

    for (const record of records) {
      if (record.status === 'confirmed') {
        stats.totalCollected += Number(record.fee_usd)
      } else if (record.status === 'pending' || record.status === 'included') {
        stats.totalPending += Number(record.fee_usd)
      }

      if (!stats.byProtocol[record.protocol]) {
        stats.byProtocol[record.protocol] = { count: 0, totalUSD: 0 }
      }
      stats.byProtocol[record.protocol].count++
      stats.byProtocol[record.protocol].totalUSD += Number(record.fee_usd)
    }

    return stats
  }

  async getAllFeeRecords(limit = 100): Promise<DBFeeRecord[]> {
    if (!this.isConnected) {
      return this.fallback.findMany('fee_records', {}, { limit, orderBy: 'created_at', ascending: false })
    }

    const { data, error } = await this.db
      .from('fee_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[DB] getAllFeeRecords error:', error.message)
      return []
    }
    return data || []
  }

  // ========================================================================
  // ADMIN SESSIONS
  // ========================================================================

  async createAdminSession(session: DBAdminSession): Promise<DBAdminSession | null> {
    if (!this.isConnected) {
      return this.fallback.insert('admin_sessions', session)
    }

    const { data, error } = await this.db
      .from('admin_sessions')
      .insert(session)
      .select()
      .single()

    if (error) {
      console.error('[DB] createAdminSession error:', error.message)
      return this.fallback.insert('admin_sessions', session)
    }
    return data
  }

  async getAdminSession(sessionId: string): Promise<DBAdminSession | null> {
    if (!this.isConnected) {
      return this.fallback.findOne('admin_sessions', { session_id: sessionId, is_active: true })
    }

    const { data, error } = await this.db
      .from('admin_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .single()

    if (error) return null
    return data
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    if (!this.isConnected) {
      await this.fallback.update('admin_sessions', sessionId, { last_activity: new Date().toISOString() })
      return
    }

    await this.db
      .from('admin_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('session_id', sessionId)
  }

  async deactivateSession(sessionId: string): Promise<void> {
    if (!this.isConnected) {
      await this.fallback.update('admin_sessions', sessionId, { is_active: false })
      return
    }

    await this.db
      .from('admin_sessions')
      .update({ is_active: false })
      .eq('session_id', sessionId)
  }

  async cleanExpiredSessions(): Promise<number> {
    if (!this.isConnected) return 0

    const { data, error } = await this.db
      .from('admin_sessions')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true)
      .select('session_id')

    if (error) return 0
    return data?.length || 0
  }

  // ========================================================================
  // ADMIN USERS
  // ========================================================================

  async getAdminByUsername(username: string): Promise<any | null> {
    if (!this.isConnected) {
      return this.fallback.findOne('admin_users', { username })
    }

    const { data, error } = await this.db
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .single()

    if (error) return null
    return data
  }

  async getAdminById(adminId: string): Promise<any | null> {
    if (!this.isConnected) {
      return this.fallback.findOne('admin_users', { id: adminId })
    }

    const { data, error } = await this.db
      .from('admin_users')
      .select('*')
      .eq('id', adminId)
      .single()

    if (error) return null
    return data
  }

  // ========================================================================
  // TRANSACTION HISTORY
  // ========================================================================

  async insertTransaction(tx: DBTransaction): Promise<DBTransaction | null> {
    if (!this.isConnected) {
      return this.fallback.insert('transaction_history', tx)
    }

    const { data, error } = await this.db
      .from('transaction_history')
      .insert(tx)
      .select()
      .single()

    if (error) {
      console.error('[DB] insertTransaction error:', error.message)
      return null
    }
    return data
  }

  async getTransactionsByUser(walletAddress: string, limit = 50): Promise<DBTransaction[]> {
    if (!this.isConnected) {
      return this.fallback.findMany('transaction_history', { user_address: walletAddress }, { limit, orderBy: 'created_at', ascending: false })
    }

    const { data, error } = await this.db
      .from('transaction_history')
      .select('*')
      .eq('user_address', walletAddress)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return []
    return data || []
  }

  // ========================================================================
  // TRADING SIGNALS
  // ========================================================================

  async insertSignal(signal: DBTradingSignal): Promise<DBTradingSignal | null> {
    if (!this.isConnected) {
      return this.fallback.insert('trading_signals', signal)
    }

    const { data, error } = await this.db
      .from('trading_signals')
      .insert(signal)
      .select()
      .single()

    if (error) {
      console.error('[DB] insertSignal error:', error.message)
      return null
    }
    return data
  }

  async getActiveSignals(limit = 20): Promise<DBTradingSignal[]> {
    if (!this.isConnected) {
      return this.fallback.findMany('trading_signals', { is_active: true }, { limit, orderBy: 'created_at', ascending: false })
    }

    const { data, error } = await this.db
      .from('trading_signals')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return []
    return data || []
  }

  // ========================================================================
  // JOB RECORDS
  // ========================================================================

  async insertJobRecord(job: { job_name: string; job_type: string; payload?: any; scheduled_at?: string }): Promise<any> {
    if (!this.isConnected) {
      return this.fallback.insert('job_records', { ...job, status: 'pending', attempts: 0 })
    }

    const { data, error } = await this.db
      .from('job_records')
      .insert({ ...job, status: 'pending', attempts: 0 })
      .select()
      .single()

    if (error) {
      console.error('[DB] insertJobRecord error:', error.message)
      return null
    }
    return data
  }

  async updateJobStatus(jobId: string, status: string, result?: any, error?: string): Promise<void> {
    const updates: Record<string, any> = { status }
    if (result) updates.result = result
    if (error) updates.error = error
    if (status === 'running') updates.started_at = new Date().toISOString()
    if (status === 'completed' || status === 'failed') updates.completed_at = new Date().toISOString()

    if (!this.isConnected) {
      await this.fallback.update('job_records', jobId, updates)
      return
    }

    await this.db.from('job_records').update(updates).eq('id', jobId)
  }

  // ========================================================================
  // SUBSCRIPTIONS
  // ========================================================================

  async createSubscription(sub: Omit<DBSubscription, 'id' | 'created_at' | 'updated_at'>): Promise<DBSubscription | null> {
    if (!this.isConnected) {
      return this.fallback.insert('subscriptions', sub)
    }

    const { data, error } = await this.db
      .from('subscriptions')
      .insert(sub)
      .select()
      .single()

    if (error) {
      console.error('[DB] createSubscription error:', error.message)
      return this.fallback.insert('subscriptions', sub)
    }
    return data
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<DBSubscription | null> {
    if (!this.isConnected) {
      return this.fallback.findOne('subscriptions', { stripe_subscription_id: stripeSubscriptionId })
    }

    const { data, error } = await this.db
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single()

    if (error) return null
    return data
  }

  async getActiveSubscriptionByWallet(walletAddress: string): Promise<DBSubscription | null> {
    if (!this.isConnected) {
      const all = await this.fallback.findMany('subscriptions', { wallet_address: walletAddress })
      return all.find((s: DBSubscription) => s.status === 'active' || s.status === 'trialing') || null
    }

    const { data, error } = await this.db
      .from('subscriptions')
      .select('*')
      .eq('wallet_address', walletAddress)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) return null
    return data
  }

  async updateSubscriptionByStripeId(
    stripeSubscriptionId: string,
    updates: Partial<DBSubscription>
  ): Promise<boolean> {
    if (!this.isConnected) {
      const existing = await this.fallback.findOne('subscriptions', { stripe_subscription_id: stripeSubscriptionId })
      if (!existing) return false
      await this.fallback.update('subscriptions', existing.id, updates)
      return true
    }

    const { error } = await this.db
      .from('subscriptions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', stripeSubscriptionId)

    if (error) {
      console.error('[DB] updateSubscriptionByStripeId error:', error.message)
      return false
    }
    return true
  }

  async updateUserSubscription(
    walletAddress: string,
    updates: { subscription_tier?: string; subscription_status?: string; stripe_customer_id?: string }
  ): Promise<boolean> {
    if (!this.isConnected) {
      const user = await this.fallback.findOne('users', { wallet_address: walletAddress })
      if (user) {
        await this.fallback.update('users', user.id, updates)
      } else {
        await this.fallback.insert('users', {
          wallet_address: walletAddress,
          wallet_type: 'unknown',
          chain: 'btc',
          is_premium: (updates.subscription_tier && updates.subscription_tier !== 'free') || false,
          role: 'user',
          total_trades: 0,
          total_volume_usd: 0,
          total_fees_paid_usd: 0,
          settings: {},
          metadata: {},
          ...updates,
        })
      }
      return true
    }

    const { error } = await this.db
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('wallet_address', walletAddress)

    if (error) {
      console.error('[DB] updateUserSubscription error:', error.message)
      return false
    }
    return true
  }

  // ========================================================================
  // SUBSCRIPTION EVENTS
  // ========================================================================

  async insertSubscriptionEvent(event: Omit<DBSubscriptionEvent, 'id' | 'created_at'>): Promise<DBSubscriptionEvent | null> {
    if (!this.isConnected) {
      return this.fallback.insert('subscription_events', event)
    }

    const { data, error } = await this.db
      .from('subscription_events')
      .insert(event)
      .select()
      .single()

    if (error) {
      console.error('[DB] insertSubscriptionEvent error:', error.message)
      return this.fallback.insert('subscription_events', event)
    }
    return data
  }

  // ========================================================================
  // SUPABASE CLIENT ACCESSOR
  // ========================================================================

  getClient() {
    return this.db
  }

  // ========================================================================
  // INSCRIPTIONS (Migration 005)
  // ========================================================================

  async upsertInscription(ins: DBInscription): Promise<DBInscription | null> {
    if (!this.isConnected) {
      return this.fallback.upsert('inscriptions', ins, 'inscription_id')
    }

    const { data, error } = await this.db
      .from('inscriptions')
      .upsert(ins, { onConflict: 'inscription_id' })
      .select()
      .single()

    if (error) {
      console.error('[DB] upsertInscription error:', error.message)
      return this.fallback.upsert('inscriptions', ins, 'inscription_id')
    }
    return data
  }

  async getInscriptionsByAddress(address: string, limit = 50): Promise<DBInscription[]> {
    if (!this.isConnected) {
      return this.fallback.findMany('inscriptions', { address }, { limit, orderBy: 'created_at', ascending: false })
    }

    const { data, error } = await this.db
      .from('inscriptions')
      .select('*')
      .eq('address', address)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return []
    return data || []
  }

  async getInscriptionById(inscriptionId: string): Promise<DBInscription | null> {
    if (!this.isConnected) {
      return this.fallback.findOne('inscriptions', { inscription_id: inscriptionId })
    }

    const { data, error } = await this.db
      .from('inscriptions')
      .select('*')
      .eq('inscription_id', inscriptionId)
      .single()

    if (error) return null
    return data
  }

  async insertInscriptionTransfer(transfer: DBInscriptionTransfer): Promise<DBInscriptionTransfer | null> {
    if (!this.isConnected) {
      return this.fallback.insert('inscription_transfers', transfer)
    }

    const { data, error } = await this.db
      .from('inscription_transfers')
      .insert(transfer)
      .select()
      .single()

    if (error) {
      console.error('[DB] insertInscriptionTransfer error:', error.message)
      return null
    }
    return data
  }

  // ========================================================================
  // ORDINAL COLLECTIONS (Migration 005)
  // ========================================================================

  async upsertCollection(col: DBOrdinalCollection): Promise<DBOrdinalCollection | null> {
    if (!this.isConnected) {
      return this.fallback.upsert('ordinal_collections', col, 'slug')
    }

    const { data, error } = await this.db
      .from('ordinal_collections')
      .upsert(col, { onConflict: 'slug' })
      .select()
      .single()

    if (error) {
      console.error('[DB] upsertCollection error:', error.message)
      return null
    }
    return data
  }

  async getCollections(limit = 50): Promise<DBOrdinalCollection[]> {
    if (!this.isConnected) {
      return this.fallback.findMany('ordinal_collections', {}, { limit, orderBy: 'volume_24h', ascending: false })
    }

    const { data, error } = await this.db
      .from('ordinal_collections')
      .select('*')
      .order('volume_24h', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) return []
    return data || []
  }

  // ========================================================================
  // RUNES (Migration 005)
  // ========================================================================

  async upsertRune(rune: DBRune): Promise<DBRune | null> {
    if (!this.isConnected) {
      return this.fallback.upsert('runes', rune, 'rune_id')
    }

    const { data, error } = await this.db
      .from('runes')
      .upsert(rune, { onConflict: 'rune_id' })
      .select()
      .single()

    if (error) {
      console.error('[DB] upsertRune error:', error.message)
      return this.fallback.upsert('runes', rune, 'rune_id')
    }
    return data
  }

  async getRuneById(runeId: string): Promise<DBRune | null> {
    if (!this.isConnected) {
      return this.fallback.findOne('runes', { rune_id: runeId })
    }

    const { data, error } = await this.db
      .from('runes')
      .select('*')
      .eq('rune_id', runeId)
      .single()

    if (error) return null
    return data
  }

  async getTopRunes(limit = 50): Promise<DBRune[]> {
    if (!this.isConnected) {
      return this.fallback.findMany('runes', {}, { limit, orderBy: 'volume_24h', ascending: false })
    }

    const { data, error } = await this.db
      .from('runes')
      .select('*')
      .order('volume_24h', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) return []
    return data || []
  }

  async getRuneBalancesByAddress(address: string): Promise<DBRuneBalance[]> {
    if (!this.isConnected) {
      return this.fallback.findMany('rune_balances', { address })
    }

    const { data, error } = await this.db
      .from('rune_balances')
      .select('*')
      .eq('address', address)

    if (error) return []
    return data || []
  }

  async upsertRuneBalance(balance: DBRuneBalance): Promise<DBRuneBalance | null> {
    if (!this.isConnected) {
      return this.fallback.upsert('rune_balances', balance, 'rune_id')
    }

    const { data, error } = await this.db
      .from('rune_balances')
      .upsert(balance, { onConflict: 'rune_id,address' })
      .select()
      .single()

    if (error) {
      console.error('[DB] upsertRuneBalance error:', error.message)
      return null
    }
    return data
  }

  // ========================================================================
  // BRC-20 (Migration 005)
  // ========================================================================

  async upsertBRC20Token(token: DBBRC20Token): Promise<DBBRC20Token | null> {
    if (!this.isConnected) {
      return this.fallback.upsert('brc20_tokens', token, 'tick')
    }

    const { data, error } = await this.db
      .from('brc20_tokens')
      .upsert(token, { onConflict: 'tick' })
      .select()
      .single()

    if (error) {
      console.error('[DB] upsertBRC20Token error:', error.message)
      return null
    }
    return data
  }

  async getTopBRC20Tokens(limit = 50): Promise<DBBRC20Token[]> {
    if (!this.isConnected) {
      return this.fallback.findMany('brc20_tokens', {}, { limit, orderBy: 'volume_24h', ascending: false })
    }

    const { data, error } = await this.db
      .from('brc20_tokens')
      .select('*')
      .order('volume_24h', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) return []
    return data || []
  }

  async getBRC20BalancesByAddress(address: string): Promise<DBBRC20Balance[]> {
    if (!this.isConnected) {
      return this.fallback.findMany('brc20_balances', { address })
    }

    const { data, error } = await this.db
      .from('brc20_balances')
      .select('*')
      .eq('address', address)

    if (error) return []
    return data || []
  }

  async upsertBRC20Balance(balance: DBBRC20Balance): Promise<DBBRC20Balance | null> {
    if (!this.isConnected) {
      return this.fallback.upsert('brc20_balances', balance, 'tick')
    }

    const { data, error } = await this.db
      .from('brc20_balances')
      .upsert(balance, { onConflict: 'tick,address' })
      .select()
      .single()

    if (error) {
      console.error('[DB] upsertBRC20Balance error:', error.message)
      return null
    }
    return data
  }

  // ========================================================================
  // RARE SATS (Migration 005)
  // ========================================================================

  async upsertRareSat(sat: DBRareSat): Promise<DBRareSat | null> {
    if (!this.isConnected) {
      return this.fallback.upsert('rare_sats', sat, 'sat_number')
    }

    const { data, error } = await this.db
      .from('rare_sats')
      .upsert(sat, { onConflict: 'sat_number' })
      .select()
      .single()

    if (error) {
      console.error('[DB] upsertRareSat error:', error.message)
      return null
    }
    return data
  }

  async getRareSatsByAddress(address: string): Promise<DBRareSat[]> {
    if (!this.isConnected) {
      return this.fallback.findMany('rare_sats', { current_address: address })
    }

    const { data, error } = await this.db
      .from('rare_sats')
      .select('*')
      .eq('current_address', address)
      .order('estimated_value_btc', { ascending: false, nullsFirst: false })

    if (error) return []
    return data || []
  }

  async getRareSatsByRarity(rarity: string, limit = 50): Promise<DBRareSat[]> {
    if (!this.isConnected) {
      return this.fallback.findMany('rare_sats', { rarity }, { limit, orderBy: 'estimated_value_btc', ascending: false })
    }

    const { data, error } = await this.db
      .from('rare_sats')
      .select('*')
      .eq('rarity', rarity)
      .order('estimated_value_btc', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) return []
    return data || []
  }

  // ========================================================================
  // PORTFOLIOS (Migration 006)
  // ========================================================================

  async createPortfolio(portfolio: Omit<DBPortfolio, 'id' | 'created_at' | 'updated_at'>): Promise<DBPortfolio | null> {
    if (!this.isConnected) {
      return this.fallback.insert('portfolios', portfolio)
    }

    const { data, error } = await this.db
      .from('portfolios')
      .insert(portfolio)
      .select()
      .single()

    if (error) {
      console.error('[DB] createPortfolio error:', error.message)
      return this.fallback.insert('portfolios', portfolio)
    }
    return data
  }

  async getPortfoliosByWallet(walletAddress: string): Promise<DBPortfolio[]> {
    if (!this.isConnected) {
      const all = await this.fallback.findMany('portfolios', { wallet_address: walletAddress })
      return all.filter((p: DBPortfolio) => !p.deleted_at)
    }

    const { data, error } = await this.db
      .from('portfolios')
      .select('*')
      .eq('wallet_address', walletAddress)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async updatePortfolio(portfolioId: string, updates: Partial<DBPortfolio>): Promise<boolean> {
    if (!this.isConnected) {
      const result = await this.fallback.update('portfolios', portfolioId, updates)
      return result !== null
    }

    const { error } = await this.db
      .from('portfolios')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', portfolioId)

    if (error) {
      console.error('[DB] updatePortfolio error:', error.message)
      return false
    }
    return true
  }

  async softDeletePortfolio(portfolioId: string): Promise<boolean> {
    return this.updatePortfolio(portfolioId, { deleted_at: new Date().toISOString() })
  }

  // ========================================================================
  // PORTFOLIO ASSETS (Migration 006)
  // ========================================================================

  async upsertPortfolioAsset(asset: DBPortfolioAsset): Promise<DBPortfolioAsset | null> {
    if (!this.isConnected) {
      return this.fallback.upsert('portfolio_assets', asset, 'id')
    }

    const { data, error } = await this.db
      .from('portfolio_assets')
      .upsert(asset)
      .select()
      .single()

    if (error) {
      console.error('[DB] upsertPortfolioAsset error:', error.message)
      return null
    }
    return data
  }

  async getPortfolioAssets(portfolioId: string): Promise<DBPortfolioAsset[]> {
    if (!this.isConnected) {
      return this.fallback.findMany('portfolio_assets', { portfolio_id: portfolioId })
    }

    const { data, error } = await this.db
      .from('portfolio_assets')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('current_value_usd', { ascending: false, nullsFirst: false })

    if (error) return []
    return data || []
  }

  async deletePortfolioAsset(assetId: string): Promise<boolean> {
    if (!this.isConnected) {
      return this.fallback.delete('portfolio_assets', assetId)
    }

    const { error } = await this.db
      .from('portfolio_assets')
      .delete()
      .eq('id', assetId)

    if (error) {
      console.error('[DB] deletePortfolioAsset error:', error.message)
      return false
    }
    return true
  }

  // ========================================================================
  // WATCHLISTS (Migration 006)
  // ========================================================================

  async createWatchlist(watchlist: Omit<DBWatchlist, 'id' | 'created_at' | 'updated_at'>): Promise<DBWatchlist | null> {
    if (!this.isConnected) {
      return this.fallback.insert('watchlists', watchlist)
    }

    const { data, error } = await this.db
      .from('watchlists')
      .insert(watchlist)
      .select()
      .single()

    if (error) {
      console.error('[DB] createWatchlist error:', error.message)
      return this.fallback.insert('watchlists', watchlist)
    }
    return data
  }

  async getWatchlistsByWallet(walletAddress: string): Promise<DBWatchlist[]> {
    if (!this.isConnected) {
      return this.fallback.findMany('watchlists', { wallet_address: walletAddress })
    }

    const { data, error } = await this.db
      .from('watchlists')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async updateWatchlist(watchlistId: string, updates: Partial<DBWatchlist>): Promise<boolean> {
    if (!this.isConnected) {
      const result = await this.fallback.update('watchlists', watchlistId, updates)
      return result !== null
    }

    const { error } = await this.db
      .from('watchlists')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', watchlistId)

    if (error) {
      console.error('[DB] updateWatchlist error:', error.message)
      return false
    }
    return true
  }

  async deleteWatchlist(watchlistId: string): Promise<boolean> {
    if (!this.isConnected) {
      return this.fallback.delete('watchlists', watchlistId)
    }

    const { error } = await this.db
      .from('watchlists')
      .delete()
      .eq('id', watchlistId)

    if (error) {
      console.error('[DB] deleteWatchlist error:', error.message)
      return false
    }
    return true
  }

  // ========================================================================
  // ALERTS (Migration 006)
  // ========================================================================

  async createAlert(alert: Omit<DBAlert, 'id' | 'created_at'>): Promise<DBAlert | null> {
    if (!this.isConnected) {
      return this.fallback.insert('alerts', alert)
    }

    const { data, error } = await this.db
      .from('alerts')
      .insert(alert)
      .select()
      .single()

    if (error) {
      console.error('[DB] createAlert error:', error.message)
      return this.fallback.insert('alerts', alert)
    }
    return data
  }

  async getActiveAlertsByWallet(walletAddress: string): Promise<DBAlert[]> {
    if (!this.isConnected) {
      const all = await this.fallback.findMany('alerts', { wallet_address: walletAddress })
      return all.filter((a: DBAlert) => a.is_active && !a.is_triggered)
    }

    const { data, error } = await this.db
      .from('alerts')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('is_active', true)
      .eq('is_triggered', false)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async triggerAlert(alertId: string): Promise<boolean> {
    const updates = {
      is_triggered: true,
      triggered_at: new Date().toISOString(),
    }

    if (!this.isConnected) {
      const result = await this.fallback.update('alerts', alertId, updates)
      return result !== null
    }

    const { error } = await this.db
      .from('alerts')
      .update(updates)
      .eq('id', alertId)

    if (error) {
      console.error('[DB] triggerAlert error:', error.message)
      return false
    }
    return true
  }

  async deactivateAlert(alertId: string): Promise<boolean> {
    if (!this.isConnected) {
      const result = await this.fallback.update('alerts', alertId, { is_active: false })
      return result !== null
    }

    const { error } = await this.db
      .from('alerts')
      .update({ is_active: false })
      .eq('id', alertId)

    if (error) {
      console.error('[DB] deactivateAlert error:', error.message)
      return false
    }
    return true
  }

  // ========================================================================
  // NETWORK METRICS (Migration 007)
  // ========================================================================

  async insertNetworkMetrics(metrics: Omit<DBNetworkMetrics, 'id' | 'created_at'>): Promise<DBNetworkMetrics | null> {
    if (!this.isConnected) {
      return this.fallback.insert('network_metrics', metrics)
    }

    const { data, error } = await this.db
      .from('network_metrics')
      .insert(metrics)
      .select()
      .single()

    if (error) {
      console.error('[DB] insertNetworkMetrics error:', error.message)
      return this.fallback.insert('network_metrics', metrics)
    }
    return data
  }

  async getLatestNetworkMetrics(limit = 10): Promise<DBNetworkMetrics[]> {
    if (!this.isConnected) {
      return this.fallback.findMany('network_metrics', {}, { limit, orderBy: 'timestamp', ascending: false })
    }

    const { data, error } = await this.db
      .from('network_metrics')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) return []
    return data || []
  }

  // ========================================================================
  // FEE ESTIMATES HISTORY (Migration 007)
  // ========================================================================

  async insertFeeEstimate(estimate: Omit<DBFeeEstimateHistory, 'id' | 'created_at'>): Promise<DBFeeEstimateHistory | null> {
    if (!this.isConnected) {
      return this.fallback.insert('fee_estimates_history', estimate)
    }

    const { data, error } = await this.db
      .from('fee_estimates_history')
      .insert(estimate)
      .select()
      .single()

    if (error) {
      console.error('[DB] insertFeeEstimate error:', error.message)
      return this.fallback.insert('fee_estimates_history', estimate)
    }
    return data
  }

  async getFeeEstimateHistory(limit = 100): Promise<DBFeeEstimateHistory[]> {
    if (!this.isConnected) {
      return this.fallback.findMany('fee_estimates_history', {}, { limit, orderBy: 'timestamp', ascending: false })
    }

    const { data, error } = await this.db
      .from('fee_estimates_history')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) return []
    return data || []
  }

  // ========================================================================
  // ADDRESS ANALYTICS (Migration 007)
  // ========================================================================

  async upsertAddressAnalytics(analytics: DBAddressAnalytics): Promise<DBAddressAnalytics | null> {
    if (!this.isConnected) {
      return this.fallback.upsert('address_analytics', analytics, 'address')
    }

    const { data, error } = await this.db
      .from('address_analytics')
      .upsert(analytics, { onConflict: 'address' })
      .select()
      .single()

    if (error) {
      console.error('[DB] upsertAddressAnalytics error:', error.message)
      return null
    }
    return data
  }

  async getAddressAnalytics(address: string): Promise<DBAddressAnalytics | null> {
    if (!this.isConnected) {
      return this.fallback.findOne('address_analytics', { address })
    }

    const { data, error } = await this.db
      .from('address_analytics')
      .select('*')
      .eq('address', address)
      .single()

    if (error) return null
    return data
  }

  async getWhaleAddresses(limit = 50): Promise<DBAddressAnalytics[]> {
    if (!this.isConnected) {
      return this.fallback.findMany('address_analytics', { is_whale: true }, { limit, orderBy: 'balance', ascending: false })
    }

    const { data, error } = await this.db
      .from('address_analytics')
      .select('*')
      .eq('is_whale', true)
      .order('balance', { ascending: false })
      .limit(limit)

    if (error) return []
    return data || []
  }
}

// Singleton export
export const dbService: DatabaseService = new DatabaseService()

// Auto-test connection on module load (async, non-blocking)
// This ensures _isConnected is set before the first DB operation
if (typeof globalThis !== 'undefined') {
  dbService.testConnection().catch(() => {
    // Silently fall back to in-memory - error already logged in testConnection()
  })
}
