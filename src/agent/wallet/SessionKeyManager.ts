/**
 * CYPHER AI Trading Agent - Session Key Manager
 * Creates, validates, and manages ephemeral signing keys
 * Session keys have:
 *   - Time limits (auto-expire)
 *   - Spend limits (max USD per session)
 *   - Pair restrictions (only trade allowed pairs)
 *   - Call limits (max number of transactions)
 *
 * Non-custodial: user's main private key is never stored or accessed
 */

import { ChainType, SessionKeyConfig } from '../core/types';
import { SecureKeyStore, getSecureKeyStore, EncryptedKey } from './SecureKeyStore';
import { getAgentPersistence } from '../persistence';

export interface CreateSessionKeyParams {
  chain: ChainType;
  userWalletAddress: string;
  expiresInHours: number;
  spendLimitUSD: number;
  allowedPairs: string[];
  allowedContracts?: string[];
  maxCalls?: number;
}

export interface SessionKeyInfo {
  id: string;
  chain: ChainType;
  publicAddress: string;
  expiresAt: number;
  spendLimitUSD: number;
  spentUSD: number;
  callCount: number;
  maxCalls: number;
  allowedPairs: string[];
  isActive: boolean;
  createdAt: number;
}

export class SessionKeyManager {
  private keyStore: SecureKeyStore;
  private activeKeys: Map<string, {
    config: SessionKeyConfig;
    decryptedKey: string;
    publicAddress: string;
    userAddress: string;
    callCount: number;
    maxCalls: number;
    allowedPairs: string[];
  }> = new Map();

  constructor() {
    this.keyStore = getSecureKeyStore();
  }

  /**
   * Create a new session key for autonomous trading
   * Returns the session key ID (never the private key itself)
   */
  async createSessionKey(params: CreateSessionKeyParams): Promise<SessionKeyInfo> {
    const {
      chain,
      userWalletAddress,
      expiresInHours,
      spendLimitUSD,
      allowedPairs,
      allowedContracts = [],
      maxCalls = 1000,
    } = params;

    // Generate ephemeral key based on chain
    let privateKey: string;
    let publicAddress: string;

    switch (chain) {
      case 'evm':
        privateKey = this.keyStore.generateEVMKey();
        // In production: publicAddress = new ethers.Wallet(privateKey).address;
        publicAddress = `0x${privateKey.slice(4, 44)}`;
        break;

      case 'solana':
        privateKey = this.keyStore.generateSolanaKey();
        // In production: publicAddress = Keypair.fromSecretKey(Buffer.from(privateKey, 'hex')).publicKey.toBase58();
        publicAddress = `sol_${privateKey.slice(0, 32)}`;
        break;

      case 'hyperliquid':
        // Hyperliquid uses API agent wallet - user provides key during setup
        privateKey = this.keyStore.generateApiSessionToken();
        publicAddress = `hl_agent_${privateKey.slice(0, 16)}`;
        break;

      case 'tradfi':
        // TradFi uses API keys (Alpaca) - not a crypto private key
        privateKey = this.keyStore.generateApiSessionToken();
        publicAddress = `api_${chain}_${privateKey.slice(0, 16)}`;
        break;

      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }

    const expiresAt = Date.now() + expiresInHours * 3600_000;
    const sessionId = `sk_${chain}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Encrypt and store
    const encrypted = this.keyStore.encrypt(privateKey);

    // Persist to database
    const persistence = getAgentPersistence();
    try {
      // Store encrypted key in Supabase (if available)
      await this.persistSessionKey(sessionId, {
        userAddress: userWalletAddress,
        chain,
        encrypted,
        publicAddress,
        expiresAt,
        spendLimitUSD,
        allowedPairs,
        allowedContracts,
        maxCalls,
      });
    } catch (error) {
      console.error('[SessionKeyManager] Failed to persist session key:', error);
    }

    // Keep in memory for fast access during trading
    const config: SessionKeyConfig = {
      id: sessionId,
      chain,
      expiresAt,
      spendLimitUSD,
      spentUSD: 0,
      allowedPairs,
      isActive: true,
    };

    this.activeKeys.set(sessionId, {
      config,
      decryptedKey: privateKey,
      publicAddress,
      userAddress: userWalletAddress,
      callCount: 0,
      maxCalls,
      allowedPairs,
    });

    return {
      id: sessionId,
      chain,
      publicAddress,
      expiresAt,
      spendLimitUSD,
      spentUSD: 0,
      callCount: 0,
      maxCalls,
      allowedPairs,
      isActive: true,
      createdAt: Date.now(),
    };
  }

  /**
   * Get the decrypted private key for signing (internal use only)
   * Never expose this via API
   */
  getSigningKey(sessionId: string): string | null {
    const session = this.activeKeys.get(sessionId);
    if (!session) return null;
    if (!this.isValid(sessionId)) return null;
    return session.decryptedKey;
  }

  /**
   * Get the public address for a session key
   */
  getPublicAddress(sessionId: string): string | null {
    return this.activeKeys.get(sessionId)?.publicAddress || null;
  }

  /**
   * Validate a session key is still usable
   */
  isValid(sessionId: string): boolean {
    const session = this.activeKeys.get(sessionId);
    if (!session) return false;

    const { config } = session;

    // Check expiry
    if (Date.now() > config.expiresAt) {
      this.revokeSessionKey(sessionId);
      return false;
    }

    // Check active status
    if (!config.isActive) return false;

    // Check call limit
    if (session.callCount >= session.maxCalls) {
      this.revokeSessionKey(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Check if a trade is within session limits
   */
  async checkTradeAllowed(sessionId: string, pair: string, amountUSD: number): Promise<{ allowed: boolean; reason?: string }> {
    const session = this.activeKeys.get(sessionId);
    if (!session) return { allowed: false, reason: 'Session key not found' };

    if (!this.isValid(sessionId)) {
      return { allowed: false, reason: 'Session key expired or revoked' };
    }

    // Check pair allowlist
    if (session.allowedPairs.length > 0 && !session.allowedPairs.includes(pair)) {
      return { allowed: false, reason: `Pair ${pair} not allowed for this session` };
    }

    // Check spend limit
    if (session.config.spentUSD + amountUSD > session.config.spendLimitUSD) {
      return {
        allowed: false,
        reason: `Spend limit exceeded: $${session.config.spentUSD.toFixed(2)} + $${amountUSD.toFixed(2)} > $${session.config.spendLimitUSD.toFixed(2)}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record a spend against a session key
   */
  async recordSpend(sessionId: string, amountUSD: number): Promise<void> {
    const session = this.activeKeys.get(sessionId);
    if (!session) return;

    session.config.spentUSD += amountUSD;
    session.callCount += 1;

    // Persist spend update
    await this.updateSessionKeySpend(sessionId, session.config.spentUSD, session.callCount);
  }

  /**
   * Revoke a session key
   */
  async revokeSessionKey(sessionId: string): Promise<void> {
    const session = this.activeKeys.get(sessionId);
    if (session) {
      session.config.isActive = false;
      session.decryptedKey = ''; // Clear from memory
    }
    this.activeKeys.delete(sessionId);

    // Update database
    await this.deactivateSessionKeyInDB(sessionId);

  }

  /**
   * Revoke all expired keys (called periodically by job scheduler)
   */
  async revokeExpiredKeys(): Promise<number> {
    let revoked = 0;
    const now = Date.now();

    for (const [id, session] of this.activeKeys) {
      if (now > session.config.expiresAt || session.callCount >= session.maxCalls) {
        await this.revokeSessionKey(id);
        revoked++;
      }
    }

    return revoked;
  }

  /**
   * List active session keys for a user (without private key data)
   */
  getActiveKeys(userAddress: string): SessionKeyInfo[] {
    const keys: SessionKeyInfo[] = [];

    for (const [id, session] of this.activeKeys) {
      if (session.userAddress === userAddress && session.config.isActive) {
        keys.push({
          id,
          chain: session.config.chain,
          publicAddress: session.publicAddress,
          expiresAt: session.config.expiresAt,
          spendLimitUSD: session.config.spendLimitUSD,
          spentUSD: session.config.spentUSD,
          callCount: session.callCount,
          maxCalls: session.maxCalls,
          allowedPairs: session.allowedPairs,
          isActive: session.config.isActive,
          createdAt: 0, // Set from DB if needed
        });
      }
    }

    return keys;
  }

  // ============================================================================
  // Private: Database persistence
  // ============================================================================

  private async persistSessionKey(id: string, data: {
    userAddress: string;
    chain: ChainType;
    encrypted: EncryptedKey;
    publicAddress: string;
    expiresAt: number;
    spendLimitUSD: number;
    allowedPairs: string[];
    allowedContracts: string[];
    maxCalls: number;
  }): Promise<void> {
    try {
      const { isSupabaseConfigured, getSupabaseServiceClient } = await import('@/lib/database/supabase-client');
      if (!isSupabaseConfigured()) return;

      const supabase = getSupabaseServiceClient();
      await supabase.from('agent_session_keys').insert({
        id,
        user_address: data.userAddress,
        chain: data.chain,
        encrypted_key: data.encrypted.encrypted,
        iv: data.encrypted.iv,
        auth_tag: data.encrypted.authTag,
        public_address: data.publicAddress,
        expires_at: new Date(data.expiresAt).toISOString(),
        spend_limit_usd: data.spendLimitUSD,
        spent_usd: 0,
        allowed_pairs: data.allowedPairs,
        allowed_contracts: data.allowedContracts,
        max_calls: data.maxCalls,
        is_active: true,
      });
    } catch (error) {
      console.error('[SessionKeyManager] DB persist error:', error);
    }
  }

  private async updateSessionKeySpend(id: string, spentUSD: number, callCount: number): Promise<void> {
    try {
      const { isSupabaseConfigured, getSupabaseServiceClient } = await import('@/lib/database/supabase-client');
      if (!isSupabaseConfigured()) return;

      const supabase = getSupabaseServiceClient();
      await supabase.from('agent_session_keys').update({
        spent_usd: spentUSD,
        call_count: callCount,
        last_used: new Date().toISOString(),
      }).eq('id', id);
    } catch {
      // Non-critical, in-memory state is authoritative
    }
  }

  private async deactivateSessionKeyInDB(id: string): Promise<void> {
    try {
      const { isSupabaseConfigured, getSupabaseServiceClient } = await import('@/lib/database/supabase-client');
      if (!isSupabaseConfigured()) return;

      const supabase = getSupabaseServiceClient();
      await supabase.from('agent_session_keys').update({ is_active: false }).eq('id', id);
    } catch {
      // Non-critical
    }
  }
}

// Singleton
let sessionKeyManagerInstance: SessionKeyManager | null = null;

export function getSessionKeyManager(): SessionKeyManager {
  if (!sessionKeyManagerInstance) {
    sessionKeyManagerInstance = new SessionKeyManager();
  }
  return sessionKeyManagerInstance;
}
