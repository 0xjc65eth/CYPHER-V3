/**
 * Jupiter Fee Collector - Solana DEX Aggregator
 *
 * Uses Jupiter V6 API native platformFeeBps parameter.
 * Jupiter automatically deducts the fee from swap output and sends it
 * to the specified feeAccount (Associated Token Account of our wallet).
 *
 * Cost: FREE (no smart contract needed)
 * How it works:
 *   1. Request quote with &platformFeeBps=35
 *   2. Jupiter calculates fee from output amount
 *   3. On swap execution, fee is sent to feeAccount ATA
 *   4. We only need the ATA of our wallet for each output token
 *
 * ATA creation cost: ~0.002 SOL one-time per token (rent-exempt minimum)
 */

import { CYPHER_FEE_WALLETS, CYPHER_FEE_CONFIG } from '@/config/feeWallets';

// Jupiter V6 API base URL
const JUPITER_API_BASE = 'https://api.jup.ag/v6';

export interface JupiterQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: string; // in lamports/smallest unit
  slippageBps?: number;
  isPremium?: boolean;
}

export interface JupiterQuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot: number;
  timeTaken: number;
}

export interface JupiterSwapParams {
  quoteResponse: JupiterQuoteResponse;
  userPublicKey: string;
  feeAccount?: string; // ATA of CYPHER fee wallet for the output token
}

export interface JupiterSwapResponse {
  swapTransaction: string; // Base64 encoded transaction
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

/**
 * Get a Jupiter swap quote WITH platform fee
 *
 * The platformFeeBps parameter tells Jupiter to deduct a fee from the output.
 * Premium users get 0% fees.
 */
export async function getJupiterQuote(params: JupiterQuoteParams): Promise<JupiterQuoteResponse> {
  const { inputMint, outputMint, amount, slippageBps = 50, isPremium = false } = params;

  const feeBps = isPremium ? 0 : CYPHER_FEE_CONFIG.jupiterPlatformBps;

  const queryParams = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    slippageBps: slippageBps.toString(),
  });

  // Only add platformFeeBps if fee > 0
  if (feeBps > 0) {
    queryParams.set('platformFeeBps', feeBps.toString());
  }

  const response = await fetch(`${JUPITER_API_BASE}/quote?${queryParams.toString()}`, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jupiter quote failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Build Jupiter swap transaction WITH fee collection
 *
 * The feeAccount must be the Associated Token Account (ATA) of
 * CYPHER_FEE_WALLETS.solana for the OUTPUT token mint.
 *
 * If the ATA doesn't exist yet, Jupiter will create it in the transaction
 * (costs ~0.002 SOL in rent, paid by the user).
 */
export async function getJupiterSwapTransaction(params: JupiterSwapParams): Promise<JupiterSwapResponse> {
  const { quoteResponse, userPublicKey, feeAccount } = params;

  const body: Record<string, unknown> = {
    quoteResponse,
    userPublicKey,
    wrapAndUnwrapSol: true,
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: 'auto',
  };

  // Add fee account if platform fee is active
  if (feeAccount && quoteResponse.platformFee && parseInt(quoteResponse.platformFee.amount) > 0) {
    body.feeAccount = feeAccount;
  }

  const response = await fetch(`${JUPITER_API_BASE}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jupiter swap failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Derive the Associated Token Account (ATA) address for the fee wallet.
 *
 * In production, this should use @solana/spl-token's getAssociatedTokenAddress.
 * Here we provide the interface - the actual derivation needs the Solana SDK.
 *
 * Usage in frontend:
 * ```ts
 * import { getAssociatedTokenAddress } from '@solana/spl-token';
 * import { PublicKey } from '@solana/web3.js';
 *
 * const feeATA = await getAssociatedTokenAddress(
 *   new PublicKey(outputMint),           // token mint
 *   new PublicKey(CYPHER_FEE_WALLETS.solana) // fee wallet owner
 * );
 * ```
 */
export function getFeeWalletAddress(): string {
  return CYPHER_FEE_WALLETS.solana;
}

/**
 * Calculate the expected platform fee from a Jupiter quote
 */
export function calculateJupiterFee(quoteResponse: JupiterQuoteResponse): {
  feeAmount: string;
  feeBps: number;
  hasActiveFee: boolean;
} {
  if (quoteResponse.platformFee) {
    return {
      feeAmount: quoteResponse.platformFee.amount,
      feeBps: quoteResponse.platformFee.feeBps,
      hasActiveFee: parseInt(quoteResponse.platformFee.amount) > 0,
    };
  }

  return {
    feeAmount: '0',
    feeBps: 0,
    hasActiveFee: false,
  };
}

/**
 * Full Jupiter swap flow with fee collection
 *
 * 1. Get quote with platformFeeBps
 * 2. Derive fee ATA for output token
 * 3. Build swap transaction with feeAccount
 * 4. Return serialized transaction for wallet signing
 */
export async function executeJupiterSwapWithFee(params: {
  inputMint: string;
  outputMint: string;
  amount: string;
  userPublicKey: string;
  slippageBps?: number;
  isPremium?: boolean;
  feeAccountATA?: string; // Pre-derived ATA, or will be derived
}): Promise<{
  quote: JupiterQuoteResponse;
  swapTransaction: string;
  feeInfo: { feeAmount: string; feeBps: number; feeWallet: string };
}> {
  // Step 1: Get quote with platform fee
  const quote = await getJupiterQuote({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    slippageBps: params.slippageBps,
    isPremium: params.isPremium,
  });

  // Step 2: Build swap transaction
  const swapResult = await getJupiterSwapTransaction({
    quoteResponse: quote,
    userPublicKey: params.userPublicKey,
    feeAccount: params.feeAccountATA,
  });

  // Step 3: Return everything needed
  const feeInfo = calculateJupiterFee(quote);

  return {
    quote,
    swapTransaction: swapResult.swapTransaction,
    feeInfo: {
      feeAmount: feeInfo.feeAmount,
      feeBps: feeInfo.feeBps,
      feeWallet: CYPHER_FEE_WALLETS.solana,
    },
  };
}
