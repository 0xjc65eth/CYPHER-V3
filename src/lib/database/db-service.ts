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

class DatabaseService {
  private fallback = new InMemoryStore()
  private _isConnected = false

  get isConnected(): boolean {
    return this._isConnected && isSupabaseConfigured()
  }

  private get db() {
    return getSupabaseServiceClient()
  }

  /**
   * Test the database connection
   */
  async testConnection(): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false
    }

    try {
      const { error } = await this.db.from('users').select('id').limit(1)
      if (error && error.code !== 'PGRST116') {
        // PGRST116 = table doesn't exist yet, which is OK
      }
      this._isConnected = true
      return true
    } catch (err) {
      this._isConnected = false
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
}

// Singleton export
export const dbService = new DatabaseService()
