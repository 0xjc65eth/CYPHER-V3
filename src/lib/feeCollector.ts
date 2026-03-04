/**
 * CYPHER V3 - Centralized Fee Collection Service
 * Handles fee tracking, logging, and collection across all protocols:
 * - THORChain (affiliate fees - collected natively by THORChain)
 * - Jupiter/Solana (platform fees - collected natively by Jupiter)
 * - EVM DEXs via 1inch/Paraswap (referrer fees - collected natively by aggregators)
 * - Magic Eden/Runes (fee output in PSBT - collected via Bitcoin transaction)
 *
 * NOW WITH PERSISTENT STORAGE via Supabase (with in-memory fallback)
 */

import { CYPHER_FEE_WALLETS, CYPHER_FEE_CONFIG, getFeeWalletForChain, getFeeBps } from '@/config/feeWallets';
import { dbService, DBFeeRecord } from '@/lib/database';

// ============================================================================
// Types
// ============================================================================

export type FeeProtocol = 'thorchain' | 'jupiter' | 'evm_dex' | 'magiceden';
export type FeeStatus = 'pending' | 'included' | 'confirmed' | 'failed';

export interface FeeRecord {
  id: string;
  protocol: FeeProtocol;
  timestamp: number;
  chain: string;
  fromToken: string;
  toToken: string;
  tradeAmountUSD: number;
  feeAmount: number;
  feeToken: string;
  feeUSD: number;
  feeBps: number;
  feeWallet: string;
  userAddress: string;
  txHash?: string;
  status: FeeStatus;
  metadata?: Record<string, unknown>;
}

export interface FeeParams {
  protocol: FeeProtocol;
  chain: string;
  fromToken: string;
  toToken: string;
  tradeAmountUSD: number;
  userAddress: string;
  isPremium?: boolean;
}

export interface FeeResult {
  feeAmount: number;
  feeToken: string;
  feeUSD: number;
  feeBps: number;
  feeWallet: string;
  isCapped: boolean;
  isPremium: boolean;
  record: FeeRecord;
}

// ============================================================================
// Fee Collector Service
// ============================================================================

/**
 * Generate unique fee record ID
 */
function generateFeeId(protocol: FeeProtocol): string {
  return `fee_${protocol}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Get the fee wallet address for a given chain
 * Delegates to centralized getFeeWalletForChain from feeWallets.ts
 */
export function getFeeWallet(chain: string): string {
  return getFeeWalletForChain(chain);
}

/**
 * Calculate the fee for a trade based on protocol and amount
 */
export function calculateFee(params: FeeParams): FeeResult {
  const { protocol, chain, fromToken, toToken, tradeAmountUSD, userAddress, isPremium } = params;

  // Premium users pay 0% fees
  if (isPremium) {
    const record: FeeRecord = {
      id: generateFeeId(protocol),
      protocol,
      timestamp: Date.now(),
      chain,
      fromToken,
      toToken,
      tradeAmountUSD,
      feeAmount: 0,
      feeToken: toToken,
      feeUSD: 0,
      feeBps: 0,
      feeWallet: getFeeWallet(chain),
      userAddress,
      status: 'confirmed',
      metadata: { premium: true },
    };

    return {
      feeAmount: 0,
      feeToken: toToken,
      feeUSD: 0,
      feeBps: 0,
      feeWallet: getFeeWallet(chain),
      isCapped: false,
      isPremium: true,
      record,
    };
  }

  // Calculate fee using centralized config (single source of truth)
  const protocolMap: Record<FeeProtocol, 'thorchain' | 'jupiter' | 'evm' | 'bitcoin'> = {
    thorchain: 'thorchain',
    jupiter: 'jupiter',
    evm_dex: 'evm',
    magiceden: 'bitcoin',
  };
  const feeBps = getFeeBps(protocolMap[protocol] || 'evm', false);

  let feeUSD = tradeAmountUSD * (feeBps / 10000);

  // Apply min/max caps from centralized config
  feeUSD = Math.max(feeUSD, CYPHER_FEE_CONFIG.minFeeUSD);
  const isCapped = feeUSD > CYPHER_FEE_CONFIG.maxFeeUSD;
  feeUSD = Math.min(feeUSD, CYPHER_FEE_CONFIG.maxFeeUSD);

  const feeWallet = getFeeWallet(chain);

  const record: FeeRecord = {
    id: generateFeeId(protocol),
    protocol,
    timestamp: Date.now(),
    chain,
    fromToken,
    toToken,
    tradeAmountUSD,
    feeAmount: feeUSD, // Will be converted to token amount by caller
    feeToken: toToken,
    feeUSD,
    feeBps,
    feeWallet,
    userAddress,
    status: 'pending',
  };

  return {
    feeAmount: feeUSD,
    feeToken: toToken,
    feeUSD,
    feeBps,
    feeWallet,
    isCapped,
    isPremium: false,
    record,
  };
}

// ============================================================================
// Helper: Convert FeeRecord to DB format
// ============================================================================

function toDBRecord(record: FeeRecord): DBFeeRecord {
  return {
    id: record.id,
    protocol: record.protocol,
    chain: record.chain,
    from_token: record.fromToken,
    to_token: record.toToken,
    trade_amount_usd: record.tradeAmountUSD,
    fee_amount: record.feeAmount,
    fee_token: record.feeToken,
    fee_usd: record.feeUSD,
    fee_bps: record.feeBps,
    fee_wallet: record.feeWallet,
    user_address: record.userAddress,
    tx_hash: record.txHash,
    status: record.status,
    metadata: record.metadata,
  };
}

/**
 * Record a fee collection event (NOW PERSISTED TO DATABASE)
 */
export async function recordFee(record: FeeRecord): Promise<void> {
  // Persist to Supabase (or in-memory fallback)
  await dbService.insertFeeRecord(toDBRecord(record));
}

/**
 * Get all fee records (delegates to dbService)
 */
export async function getAllFeeRecords(limit: number = 20): Promise<DBFeeRecord[]> {
  return dbService.getAllFeeRecords(limit);
}

/**
 * Get fee stats (delegates to dbService)
 */
export async function getFeeStats() {
  return dbService.getFeeStats();
}
