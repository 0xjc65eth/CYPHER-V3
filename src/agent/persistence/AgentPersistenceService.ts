/**
 * CYPHER AI Trading Agent - Persistence Service
 * Persists agent state, trades, LP positions, and consensus decisions to Supabase
 * Falls back to in-memory storage when Supabase is unavailable
 */

import { AgentConfig, ConsensusResult, CompoundResult, LPPosition } from '../core/types';

// ============================================================================
// Types
// ============================================================================

export interface AgentConfigRecord {
  id?: string;
  user_address: string;
  config: AgentConfig;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AgentTradeRecord {
  id?: string;
  agent_config_id: string;
  signal_id: string;
  pair: string;
  exchange: string;
  direction: 'long' | 'short';
  strategy: 'scalp' | 'mm' | 'lp';
  asset_class?: 'crypto' | 'forex' | 'stock' | 'commodity';
  entry_price: number;
  exit_price?: number;
  position_size_usd: number;
  leverage?: number;
  stop_loss?: number;
  take_profit?: number[];
  realized_pnl?: number;
  fees_paid?: number;
  confidence?: number;
  consensus_votes?: any;
  reason?: string;
  smc_context?: any;
  status: 'open' | 'closed' | 'cancelled' | 'liquidated';
  opened_at?: string;
  closed_at?: string;
  tx_hash_open?: string;
  tx_hash_close?: string;
}

export interface EquitySnapshot {
  equity: number;
  realized_pnl: number;
  unrealized_pnl: number;
  positions_count: number;
  drawdown: number;
  timestamp?: string;
}

export interface AgentLPRecord {
  id?: string;
  agent_config_id: string;
  pair: string;
  protocol: string;
  chain: string;
  tick_lower?: number;
  tick_upper?: number;
  liquidity?: number;
  token0_amount?: number;
  token1_amount?: number;
  fee_tier?: number;
  value_usd?: number;
  impermanent_loss?: number;
  total_fees_earned?: number;
  in_range?: boolean;
  status: 'active' | 'closed' | 'rebalancing';
  on_chain_id?: string;
  last_rebalance?: string;
  closed_at?: string;
}

export interface ConsensusDecisionRecord {
  agent_config_id: string;
  pair: string;
  proposal: any;
  votes: any;
  result: any;
  approved: boolean;
  executed: boolean;
  trade_id?: string;
}

// ============================================================================
// In-Memory Fallback Store
// ============================================================================

class InMemoryAgentStore {
  configs: Map<string, AgentConfigRecord> = new Map();
  trades: AgentTradeRecord[] = [];
  equitySnapshots: EquitySnapshot[] = [];
  lpPositions: Map<string, AgentLPRecord> = new Map();
  consensusDecisions: ConsensusDecisionRecord[] = [];
  compoundHistory: CompoundResult[] = [];
}

// ============================================================================
// AgentPersistenceService
// ============================================================================

export class AgentPersistenceService {
  private supabase: any = null;
  private useSupabase: boolean = false;
  private memStore: InMemoryAgentStore = new InMemoryAgentStore();

  constructor() {
    this.initSupabase();
  }

  private async initSupabase(): Promise<void> {
    try {
      const { isSupabaseConfigured, getSupabaseServiceClient } = await import('@/lib/database/supabase-client');
      if (isSupabaseConfigured()) {
        this.supabase = getSupabaseServiceClient();
        this.useSupabase = true;
      }
    } catch {
      // Falls back to in-memory storage
    }
  }

  // ============================================================================
  // Agent Config
  // ============================================================================

  async saveConfig(config: AgentConfig, userAddress: string): Promise<string> {
    const record: AgentConfigRecord = {
      user_address: userAddress,
      config,
      is_active: config.enabled,
    };

    if (this.useSupabase && this.supabase) {
      const { data, error } = await this.supabase
        .from('agent_configs')
        .upsert({
          ...record,
          config: JSON.stringify(config),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_address' })
        .select('id')
        .single();

      if (error) console.error('[AgentPersistence] saveConfig error:', error);
      return data?.id || '';
    }

    const id = `config_${userAddress}_${Date.now()}`;
    record.id = id;
    this.memStore.configs.set(userAddress, record);
    return id;
  }

  async loadConfig(configId: string): Promise<AgentConfig | null> {
    if (this.useSupabase && this.supabase) {
      const { data } = await this.supabase
        .from('agent_configs')
        .select('config')
        .eq('id', configId)
        .single();

      if (data?.config) {
        return typeof data.config === 'string' ? JSON.parse(data.config) : data.config;
      }
      return null;
    }

    for (const record of this.memStore.configs.values()) {
      if (record.id === configId) return record.config;
    }
    return null;
  }

  async getActiveConfig(userAddress: string): Promise<AgentConfigRecord | null> {
    if (this.useSupabase && this.supabase) {
      const { data } = await this.supabase
        .from('agent_configs')
        .select('*')
        .eq('user_address', userAddress)
        .eq('is_active', true)
        .single();

      if (data) {
        data.config = typeof data.config === 'string' ? JSON.parse(data.config) : data.config;
      }
      return data || null;
    }

    return this.memStore.configs.get(userAddress) || null;
  }

  // ============================================================================
  // Trades
  // ============================================================================

  async recordTrade(trade: AgentTradeRecord): Promise<string> {
    if (this.useSupabase && this.supabase) {
      const { data, error } = await this.supabase
        .from('agent_trades')
        .insert({
          ...trade,
          take_profit: trade.take_profit ? JSON.stringify(trade.take_profit) : null,
          consensus_votes: trade.consensus_votes ? JSON.stringify(trade.consensus_votes) : null,
          smc_context: trade.smc_context ? JSON.stringify(trade.smc_context) : null,
          opened_at: trade.opened_at || new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) console.error('[AgentPersistence] recordTrade error:', error);
      return data?.id || '';
    }

    const id = `trade_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    trade.id = id;
    this.memStore.trades.push(trade);
    return id;
  }

  async updateTradeClose(tradeId: string, exitPrice: number, pnl: number, txHash?: string): Promise<void> {
    if (this.useSupabase && this.supabase) {
      const { error } = await this.supabase
        .from('agent_trades')
        .update({
          exit_price: exitPrice,
          realized_pnl: pnl,
          status: 'closed',
          closed_at: new Date().toISOString(),
          tx_hash_close: txHash,
        })
        .eq('id', tradeId);

      if (error) console.error('[AgentPersistence] updateTradeClose error:', error);
      return;
    }

    const trade = this.memStore.trades.find(t => t.id === tradeId);
    if (trade) {
      trade.exit_price = exitPrice;
      trade.realized_pnl = pnl;
      trade.status = 'closed';
      trade.closed_at = new Date().toISOString();
      trade.tx_hash_close = txHash;
    }
  }

  async getTradeHistory(configId: string, limit: number = 100): Promise<AgentTradeRecord[]> {
    if (this.useSupabase && this.supabase) {
      const { data } = await this.supabase
        .from('agent_trades')
        .select('*')
        .eq('agent_config_id', configId)
        .order('opened_at', { ascending: false })
        .limit(limit);

      return data || [];
    }

    return this.memStore.trades
      .filter(t => t.agent_config_id === configId)
      .slice(-limit)
      .reverse();
  }

  async getOpenTrades(configId: string): Promise<AgentTradeRecord[]> {
    if (this.useSupabase && this.supabase) {
      const { data } = await this.supabase
        .from('agent_trades')
        .select('*')
        .eq('agent_config_id', configId)
        .eq('status', 'open');

      return data || [];
    }

    return this.memStore.trades.filter(t => t.agent_config_id === configId && t.status === 'open');
  }

  // ============================================================================
  // Equity Snapshots
  // ============================================================================

  async saveEquitySnapshot(configId: string, snapshot: EquitySnapshot): Promise<void> {
    if (this.useSupabase && this.supabase) {
      const { error } = await this.supabase
        .from('agent_equity_snapshots')
        .insert({
          agent_config_id: configId,
          ...snapshot,
          timestamp: new Date().toISOString(),
        });

      if (error) console.error('[AgentPersistence] saveEquitySnapshot error:', error);
      return;
    }

    snapshot.timestamp = new Date().toISOString();
    this.memStore.equitySnapshots.push(snapshot);
  }

  async getEquityHistory(configId: string, since?: Date): Promise<EquitySnapshot[]> {
    if (this.useSupabase && this.supabase) {
      let query = this.supabase
        .from('agent_equity_snapshots')
        .select('*')
        .eq('agent_config_id', configId)
        .order('timestamp', { ascending: true });

      if (since) {
        query = query.gte('timestamp', since.toISOString());
      }

      const { data } = await query.limit(1000);
      return data || [];
    }

    let snapshots = this.memStore.equitySnapshots;
    if (since) {
      snapshots = snapshots.filter(s => new Date(s.timestamp || 0) >= since);
    }
    return snapshots;
  }

  // ============================================================================
  // LP Positions
  // ============================================================================

  async saveLPPosition(position: AgentLPRecord): Promise<string> {
    if (this.useSupabase && this.supabase) {
      const { data, error } = await this.supabase
        .from('agent_lp_positions')
        .insert(position)
        .select('id')
        .single();

      if (error) console.error('[AgentPersistence] saveLPPosition error:', error);
      return data?.id || '';
    }

    const id = `lp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    position.id = id;
    this.memStore.lpPositions.set(id, position);
    return id;
  }

  async updateLPPosition(positionId: string, updates: Partial<AgentLPRecord>): Promise<void> {
    if (this.useSupabase && this.supabase) {
      const { error } = await this.supabase
        .from('agent_lp_positions')
        .update(updates)
        .eq('id', positionId);

      if (error) console.error('[AgentPersistence] updateLPPosition error:', error);
      return;
    }

    const existing = this.memStore.lpPositions.get(positionId);
    if (existing) {
      this.memStore.lpPositions.set(positionId, { ...existing, ...updates });
    }
  }

  async getActiveLPPositions(configId: string): Promise<AgentLPRecord[]> {
    if (this.useSupabase && this.supabase) {
      const { data } = await this.supabase
        .from('agent_lp_positions')
        .select('*')
        .eq('agent_config_id', configId)
        .eq('status', 'active');

      return data || [];
    }

    return Array.from(this.memStore.lpPositions.values()).filter(
      p => p.agent_config_id === configId && p.status === 'active'
    );
  }

  // ============================================================================
  // Consensus Decisions
  // ============================================================================

  async recordConsensusDecision(decision: ConsensusDecisionRecord): Promise<string> {
    if (this.useSupabase && this.supabase) {
      const { data, error } = await this.supabase
        .from('agent_consensus_decisions')
        .insert({
          ...decision,
          proposal: JSON.stringify(decision.proposal),
          votes: JSON.stringify(decision.votes),
          result: JSON.stringify(decision.result),
        })
        .select('id')
        .single();

      if (error) console.error('[AgentPersistence] recordConsensusDecision error:', error);
      return data?.id || '';
    }

    this.memStore.consensusDecisions.push(decision);
    return `consensus_${Date.now()}`;
  }

  async getRecentConsensusDecisions(configId: string, limit: number = 50): Promise<ConsensusDecisionRecord[]> {
    if (this.useSupabase && this.supabase) {
      const { data } = await this.supabase
        .from('agent_consensus_decisions')
        .select('*')
        .eq('agent_config_id', configId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return data || [];
    }

    return this.memStore.consensusDecisions
      .filter(d => d.agent_config_id === configId)
      .slice(-limit)
      .reverse();
  }

  // ============================================================================
  // Compound History
  // ============================================================================

  async recordCompound(configId: string, result: CompoundResult): Promise<void> {
    if (result.skipped) return;

    if (this.useSupabase && this.supabase) {
      const { error } = await this.supabase
        .from('agent_compound_history')
        .insert({
          agent_config_id: configId,
          total_compounded: result.totalCompounded || 0,
          lp_fees: result.breakdown?.lpFees || 0,
          mm_profits: result.breakdown?.mmProfits || 0,
          scalp_pnl: result.breakdown?.scalpPnl || 0,
          distribution: JSON.stringify(result.distribution),
          gas_cost: result.gasCost || 0,
        });

      if (error) console.error('[AgentPersistence] recordCompound error:', error);
      return;
    }

    this.memStore.compoundHistory.push(result);
  }
}

// Singleton
let persistenceInstance: AgentPersistenceService | null = null;

export function getAgentPersistence(): AgentPersistenceService {
  if (!persistenceInstance) {
    persistenceInstance = new AgentPersistenceService();
  }
  return persistenceInstance;
}
