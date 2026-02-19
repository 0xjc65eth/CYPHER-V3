/**
 * CYPHER V3 - Database Service
 * Persistent storage for fee records with in-memory fallback.
 *
 * In production, connect to Supabase or another database.
 * For now, uses an in-memory store so the app runs without external dependencies.
 */

// ============================================================================
// Types
// ============================================================================

export interface DBFeeRecord {
  id: string;
  protocol: string;
  chain: string;
  from_token: string;
  to_token: string;
  trade_amount_usd: number;
  fee_amount: number;
  fee_token: string;
  fee_usd: number;
  fee_bps: number;
  fee_wallet: string;
  user_address: string;
  tx_hash?: string;
  status: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

// ============================================================================
// In-Memory Database (fallback when no Supabase configured)
// ============================================================================

class InMemoryDB {
  private records: DBFeeRecord[] = [];

  async insertFeeRecord(record: DBFeeRecord): Promise<void> {
    this.records.push({
      ...record,
      created_at: record.created_at || new Date().toISOString(),
    });
  }

  async updateFeeStatus(id: string, status: string, txHash?: string): Promise<boolean> {
    const record = this.records.find(r => r.id === id);
    if (!record) return false;
    record.status = status;
    if (txHash) record.tx_hash = txHash;
    return true;
  }

  async getFeeStats(): Promise<{
    totalCollected: number;
    totalPending: number;
    byProtocol: Record<string, { count: number; totalUSD: number }>;
    recentFees: DBFeeRecord[];
  }> {
    let totalCollected = 0;
    let totalPending = 0;
    const byProtocol: Record<string, { count: number; totalUSD: number }> = {};

    for (const record of this.records) {
      if (record.status === 'confirmed') {
        totalCollected += record.fee_usd;
      } else if (record.status === 'pending' || record.status === 'included') {
        totalPending += record.fee_usd;
      }

      if (!byProtocol[record.protocol]) {
        byProtocol[record.protocol] = { count: 0, totalUSD: 0 };
      }
      byProtocol[record.protocol].count++;
      byProtocol[record.protocol].totalUSD += record.fee_usd;
    }

    return {
      totalCollected,
      totalPending,
      byProtocol,
      recentFees: this.records.slice(-20),
    };
  }

  async getAllFeeRecords(limit = 100): Promise<DBFeeRecord[]> {
    return this.records.slice(-limit);
  }
}

// ============================================================================
// Database Service (singleton)
// ============================================================================

class DatabaseService {
  private db: InMemoryDB;

  constructor() {
    // In production, check for SUPABASE_URL and use Supabase client instead
    this.db = new InMemoryDB();

    if (!process.env.SUPABASE_URL) {
    }
  }

  async insertFeeRecord(record: DBFeeRecord): Promise<void> {
    return this.db.insertFeeRecord(record);
  }

  async updateFeeStatus(id: string, status: string, txHash?: string): Promise<boolean> {
    return this.db.updateFeeStatus(id, status, txHash);
  }

  async getFeeStats() {
    return this.db.getFeeStats();
  }

  async getAllFeeRecords(limit = 100): Promise<DBFeeRecord[]> {
    return this.db.getAllFeeRecords(limit);
  }
}

export const dbService = new DatabaseService();
