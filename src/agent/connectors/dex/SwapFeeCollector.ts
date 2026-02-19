/**
 * EVM Swap Fee Collector - 1inch & Paraswap Integration
 *
 * Collects fees on EVM chains (Ethereum, Arbitrum, Base, Optimism, Polygon, BSC, Avalanche)
 * using NATIVE fee mechanisms built into DEX aggregators - NO smart contracts needed.
 *
 * Methods:
 * 1. 1inch: referrerAddress + fee parameter (0.3%)
 * 2. Paraswap: partner + partnerAddress + partnerFeeBps (30 bps)
 * 3. Fallback: Universal Router PAY_PORTION command (advanced)
 *
 * All fees are deducted from the swap output by the aggregator protocol
 * and sent directly to our EVM fee wallet.
 */

import { CYPHER_FEE_WALLETS, CYPHER_FEE_CONFIG } from '@/config/feeWallets';
import { REFERRAL_CODES } from '@/config/referralCodes';

// ============================================================================
// Types
// ============================================================================

export interface EVMSwapQuoteParams {
  chainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string; // in wei/smallest unit
  fromAddress: string;
  slippage?: number; // percentage, e.g. 0.5 for 0.5%
  isPremium?: boolean;
}

export interface OneInchQuoteResponse {
  fromToken: { symbol: string; decimals: number; address: string };
  toToken: { symbol: string; decimals: number; address: string };
  fromTokenAmount: string;
  toTokenAmount: string;
  protocols: Array<Array<Array<{
    name: string;
    part: number;
    fromTokenAddress: string;
    toTokenAddress: string;
  }>>>;
  estimatedGas: number;
}

export interface OneInchSwapResponse {
  fromToken: { symbol: string; decimals: number; address: string };
  toToken: { symbol: string; decimals: number; address: string };
  fromTokenAmount: string;
  toTokenAmount: string;
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gasPrice: string;
    gas: number;
  };
}

export interface ParaswapPriceResponse {
  priceRoute: {
    srcAmount: string;
    destAmount: string;
    gasCost: string;
    gasCostUSD: string;
    bestRoute: Array<{
      percent: number;
      swaps: Array<{
        srcToken: string;
        destToken: string;
        swapExchanges: Array<{
          exchange: string;
          srcAmount: string;
          destAmount: string;
          percent: number;
        }>;
      }>;
    }>;
    side: string;
    contractAddress: string;
    tokenTransferProxy: string;
    partner: string;
    partnerFee: number;
  };
}

// ============================================================================
// 1inch Integration
// ============================================================================

const ONEINCH_API_BASE = 'https://api.1inch.dev/swap/v6.0';
const ONEINCH_API_KEY = process.env.ONEINCH_API_KEY || '';

/**
 * Get 1inch swap quote WITH referrer fee
 *
 * The fee parameter tells 1inch to deduct a percentage from the output
 * and send it to the referrerAddress.
 */
export async function get1inchQuote(params: EVMSwapQuoteParams): Promise<OneInchQuoteResponse> {
  const { chainId, fromTokenAddress, toTokenAddress, amount, isPremium = false } = params;

  const queryParams = new URLSearchParams({
    src: fromTokenAddress,
    dst: toTokenAddress,
    amount,
  });

  // Add referrer fee for non-premium users
  if (!isPremium) {
    queryParams.set('fee', REFERRAL_CODES.oneInch.feePercent.toString());
    queryParams.set('referrerAddress', REFERRAL_CODES.oneInch.referrerAddress);
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (ONEINCH_API_KEY) {
    headers['Authorization'] = `Bearer ${ONEINCH_API_KEY}`;
  }

  const response = await fetch(
    `${ONEINCH_API_BASE}/${chainId}/quote?${queryParams.toString()}`,
    { headers, signal: AbortSignal.timeout(10000) }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`1inch quote failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get 1inch swap transaction WITH referrer fee
 */
export async function get1inchSwap(params: EVMSwapQuoteParams): Promise<OneInchSwapResponse> {
  const { chainId, fromTokenAddress, toTokenAddress, amount, fromAddress, slippage = 0.5, isPremium = false } = params;

  const queryParams = new URLSearchParams({
    src: fromTokenAddress,
    dst: toTokenAddress,
    amount,
    from: fromAddress,
    slippage: slippage.toString(),
    disableEstimate: 'true',
  });

  // Add referrer fee
  if (!isPremium) {
    queryParams.set('fee', REFERRAL_CODES.oneInch.feePercent.toString());
    queryParams.set('referrerAddress', REFERRAL_CODES.oneInch.referrerAddress);
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (ONEINCH_API_KEY) {
    headers['Authorization'] = `Bearer ${ONEINCH_API_KEY}`;
  }

  const response = await fetch(
    `${ONEINCH_API_BASE}/${chainId}/swap?${queryParams.toString()}`,
    { headers, signal: AbortSignal.timeout(15000) }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`1inch swap failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ============================================================================
// Paraswap Integration
// ============================================================================

const PARASWAP_API_BASE = 'https://apiv5.paraswap.io';

/**
 * Get Paraswap price quote WITH partner fee
 */
export async function getParaswapPrice(params: EVMSwapQuoteParams): Promise<ParaswapPriceResponse> {
  const { chainId, fromTokenAddress, toTokenAddress, amount, isPremium = false } = params;

  const queryParams = new URLSearchParams({
    srcToken: fromTokenAddress,
    destToken: toTokenAddress,
    amount,
    srcDecimals: '18',
    destDecimals: '18',
    side: 'SELL',
    network: chainId.toString(),
  });

  // Add partner fee
  if (!isPremium) {
    queryParams.set('partner', REFERRAL_CODES.paraswap.partner);
    queryParams.set('partnerAddress', REFERRAL_CODES.paraswap.partnerAddress);
    queryParams.set('partnerFeeBps', REFERRAL_CODES.paraswap.partnerFeeBps.toString());
  }

  const response = await fetch(
    `${PARASWAP_API_BASE}/prices?${queryParams.toString()}`,
    { signal: AbortSignal.timeout(10000) }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Paraswap price failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Build Paraswap swap transaction WITH partner fee
 */
export async function getParaswapSwapTx(params: {
  chainId: number;
  priceRoute: ParaswapPriceResponse['priceRoute'];
  userAddress: string;
  isPremium?: boolean;
}): Promise<{ to: string; data: string; value: string; gasPrice: string }> {
  const { chainId, priceRoute, userAddress, isPremium = false } = params;

  const body: Record<string, unknown> = {
    srcToken: priceRoute.bestRoute[0]?.swaps[0]?.srcToken,
    destToken: priceRoute.bestRoute[0]?.swaps[priceRoute.bestRoute[0].swaps.length - 1]?.destToken,
    srcAmount: priceRoute.srcAmount,
    destAmount: priceRoute.destAmount,
    priceRoute,
    userAddress,
    txOrigin: userAddress,
  };

  if (!isPremium) {
    body.partner = REFERRAL_CODES.paraswap.partner;
    body.partnerAddress = REFERRAL_CODES.paraswap.partnerAddress;
    body.partnerFeeBps = REFERRAL_CODES.paraswap.partnerFeeBps;
  }

  const response = await fetch(
    `${PARASWAP_API_BASE}/transactions/${chainId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Paraswap swap tx failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ============================================================================
// Unified EVM Fee Collector
// ============================================================================

/**
 * Get the best EVM swap quote across multiple aggregators
 * Returns quotes from both 1inch and Paraswap, sorted by best output
 */
export async function getBestEVMQuote(params: EVMSwapQuoteParams): Promise<{
  bestProvider: '1inch' | 'paraswap';
  quote: {
    outputAmount: string;
    estimatedGas: string;
    feeAmount: string;
    feeBps: number;
    feeWallet: string;
    provider: string;
  };
  allQuotes: Array<{
    provider: string;
    outputAmount: string;
    error?: string;
  }>;
}> {
  const results = await Promise.allSettled([
    get1inchQuote(params).then(q => ({
      provider: '1inch' as const,
      outputAmount: q.toTokenAmount,
      estimatedGas: q.estimatedGas.toString(),
    })),
    getParaswapPrice(params).then(q => ({
      provider: 'paraswap' as const,
      outputAmount: q.priceRoute.destAmount,
      estimatedGas: q.priceRoute.gasCost,
    })),
  ]);

  const quotes = results
    .map((result, index) => {
      const provider = index === 0 ? '1inch' : 'paraswap';
      if (result.status === 'fulfilled') {
        return { ...result.value, error: undefined };
      }
      return {
        provider,
        outputAmount: '0',
        estimatedGas: '0',
        error: result.reason?.message || 'Unknown error',
      };
    })
    .filter(q => !q.error)
    .sort((a, b) => {
      // Compare output amounts (higher is better)
      const aOut = BigInt(a.outputAmount || '0');
      const bOut = BigInt(b.outputAmount || '0');
      return aOut > bOut ? -1 : aOut < bOut ? 1 : 0;
    });

  if (quotes.length === 0) {
    throw new Error('No EVM DEX aggregator returned a valid quote');
  }

  const best = quotes[0];
  const feeBps = params.isPremium ? 0 : CYPHER_FEE_CONFIG.swapFeeBps;

  return {
    bestProvider: best.provider as '1inch' | 'paraswap',
    quote: {
      outputAmount: best.outputAmount,
      estimatedGas: best.estimatedGas || '0',
      feeAmount: calculateFeeFromOutput(best.outputAmount, feeBps),
      feeBps,
      feeWallet: CYPHER_FEE_WALLETS.evm,
      provider: best.provider,
    },
    allQuotes: results.map((result, index) => {
      const provider = index === 0 ? '1inch' : 'paraswap';
      if (result.status === 'fulfilled') {
        return { provider, outputAmount: result.value.outputAmount };
      }
      return { provider, outputAmount: '0', error: result.reason?.message };
    }),
  };
}

/**
 * Calculate fee amount from output amount and fee BPS
 */
function calculateFeeFromOutput(outputAmount: string, feeBps: number): string {
  if (feeBps === 0) return '0';
  try {
    const output = BigInt(outputAmount);
    const fee = (output * BigInt(feeBps)) / BigInt(10000);
    return fee.toString();
  } catch {
    return '0';
  }
}

/**
 * Get the EVM fee wallet address
 */
export function getEVMFeeWallet(): string {
  return CYPHER_FEE_WALLETS.evm;
}

/**
 * Supported EVM chain IDs
 */
export const SUPPORTED_EVM_CHAINS: Record<number, string> = {
  1: 'Ethereum',
  42161: 'Arbitrum',
  8453: 'Base',
  10: 'Optimism',
  137: 'Polygon',
  56: 'BSC',
  43114: 'Avalanche',
};
