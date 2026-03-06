/**
 * Bitcoin Fee Collector - PSBT Output Method
 *
 * Collects fees on Bitcoin transactions (Ordinals, Runes, BRC-20 swaps)
 * by adding an extra output to the PSBT (Partially Signed Bitcoin Transaction).
 *
 * Cost: ZERO (no smart contract, no extra infrastructure)
 * How it works:
 *   1. When building a PSBT for an Ordinals/Runes trade:
 *      psbt.addOutput({ address: FEE_WALLET, value: feeSats })
 *   2. The fee is paid by the buyer as part of the transaction
 *   3. Minimum output is 546 sats (Bitcoin dust limit)
 *   4. Fee is 0.35% of trade amount in sats
 *
 * Integration points:
 *   - Gamma.io Ordinals/Runes trades
 *   - UniSat marketplace trades
 *   - OKX Web3 BRC-20 trades
 *   - Any custom PSBT construction
 */

import { CYPHER_FEE_WALLETS, CYPHER_FEE_CONFIG } from '@/config/feeWallets';

// ============================================================================
// Types
// ============================================================================

export interface BitcoinFeeParams {
  /** Trade amount in satoshis */
  tradeAmountSats: number;
  /** Whether the user is a premium (YHP) member */
  isPremium?: boolean;
}

export interface BitcoinFeeResult {
  /** Fee wallet address to add as PSBT output */
  feeAddress: string;
  /** Fee amount in satoshis */
  feeSats: number;
  /** Fee in BPS (basis points) */
  feeBps: number;
  /** Whether fee meets dust limit */
  isValid: boolean;
  /** Whether fee was waived (premium user) */
  isWaived: boolean;
  /** Human-readable fee description */
  description: string;
}

export interface PSBTFeeOutput {
  /** Bitcoin address to receive the fee */
  address: string;
  /** Amount in satoshis */
  value: number;
}

// ============================================================================
// Fee Calculation
// ============================================================================

/**
 * Calculate the Bitcoin fee for a trade
 *
 * Returns the fee amount in sats and the fee address.
 * The caller should add this as an output to the PSBT.
 *
 * Example PSBT construction:
 * ```ts
 * const feeResult = calculateBitcoinFee({ tradeAmountSats: 500000 });
 * if (feeResult.isValid && !feeResult.isWaived) {
 *   psbt.addOutput({
 *     address: feeResult.feeAddress,
 *     value: feeResult.feeSats,
 *   });
 * }
 * ```
 */
export function calculateBitcoinFee(params: BitcoinFeeParams): BitcoinFeeResult {
  const { tradeAmountSats, isPremium = false } = params;

  // Premium users pay 0% fees
  if (isPremium) {
    return {
      feeAddress: CYPHER_FEE_WALLETS.bitcoin,
      feeSats: 0,
      feeBps: 0,
      isValid: true,
      isWaived: true,
      description: 'Fee waived (YHP Premium)',
    };
  }

  const feeBps = CYPHER_FEE_CONFIG.bitcoinFeeBps; // 35 bps = 0.35%
  const rawFeeSats = Math.floor(tradeAmountSats * feeBps / 10000);
  const dustLimit = CYPHER_FEE_CONFIG.bitcoinDustLimitSats; // 546 sats

  // Fee must meet dust limit to be a valid Bitcoin output
  const feeSats = Math.max(rawFeeSats, dustLimit);

  // If trade amount is too small for meaningful fee
  const isValid = tradeAmountSats >= dustLimit * 3; // At least 1638 sats trade

  return {
    feeAddress: CYPHER_FEE_WALLETS.bitcoin,
    feeSats: isValid ? feeSats : 0,
    feeBps,
    isValid,
    isWaived: false,
    description: isValid
      ? `${feeSats} sats (${(feeBps / 100).toFixed(2)}%) to CYPHER`
      : 'Trade too small for fee collection',
  };
}

/**
 * Get the PSBT output object for fee collection
 *
 * Returns a ready-to-use output for psbt.addOutput()
 * Returns null if fee should not be collected (premium user or trade too small)
 *
 * Example:
 * ```ts
 * const feeOutput = getBitcoinFeeOutput({ tradeAmountSats: 1000000 });
 * if (feeOutput) {
 *   psbt.addOutput(feeOutput);
 * }
 * ```
 */
export function getBitcoinFeeOutput(params: BitcoinFeeParams): PSBTFeeOutput | null {
  const feeResult = calculateBitcoinFee(params);

  if (!feeResult.isValid || feeResult.isWaived || feeResult.feeSats === 0) {
    return null;
  }

  return {
    address: feeResult.feeAddress,
    value: feeResult.feeSats,
  };
}

/**
 * Validate that a PSBT includes the CYPHER fee output
 *
 * Used to verify that a PSBT constructed by the frontend
 * actually contains the expected fee output before signing.
 *
 * @param outputs - Array of PSBT outputs to check
 * @param expectedFeeSats - Expected minimum fee in sats
 * @returns Whether the fee output is present and valid
 */
export function validateFeeInPSBT(
  outputs: Array<{ address: string; value: number }>,
  expectedFeeSats: number
): {
  hasFeeOutput: boolean;
  feeOutputIndex: number;
  actualFeeSats: number;
  isCorrect: boolean;
} {
  const feeOutputIndex = outputs.findIndex(
    (output) => output.address === CYPHER_FEE_WALLETS.bitcoin
  );

  if (feeOutputIndex === -1) {
    return {
      hasFeeOutput: false,
      feeOutputIndex: -1,
      actualFeeSats: 0,
      isCorrect: false,
    };
  }

  const actualFeeSats = outputs[feeOutputIndex].value;

  return {
    hasFeeOutput: true,
    feeOutputIndex,
    actualFeeSats,
    isCorrect: actualFeeSats >= expectedFeeSats,
  };
}

/**
 * Get the Bitcoin fee wallet address
 */
export function getBitcoinFeeAddress(): string {
  return CYPHER_FEE_WALLETS.bitcoin;
}

/**
 * Estimate fee in USD given BTC price
 */
export function estimateFeeUSD(feeSats: number, btcPriceUSD: number): number {
  return (feeSats / 100_000_000) * btcPriceUSD;
}
