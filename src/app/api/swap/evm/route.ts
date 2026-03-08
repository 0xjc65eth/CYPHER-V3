/**
 * EVM Swap API Route - 1inch & Paraswap Integration
 *
 * Fetches quotes from multiple EVM DEX aggregators and returns the best one.
 * Fees are collected natively by the aggregator protocols.
 *
 * Query params:
 *   chainId: number (1=ETH, 42161=ARB, 8453=BASE, 10=OP, 137=MATIC, 56=BSC)
 *   fromToken: string (token address, use 0xEEEE...EEEE for native)
 *   toToken: string (token address)
 *   amount: string (in wei/smallest unit)
 *   fromAddress: string (user wallet)
 *   slippage?: number (percentage, default 0.5)
 *   premium?: 'true'
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';
import { CYPHER_FEE_WALLETS, CYPHER_FEE_CONFIG } from '@/config/feeWallets';
import { REFERRAL_CODES } from '@/config/referralCodes';
import { recordFee } from '@/lib/feeCollector';

const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  42161: 'Arbitrum',
  8453: 'Base',
  10: 'Optimism',
  137: 'Polygon',
  56: 'BSC',
  43114: 'Avalanche',
};

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const params = request.nextUrl.searchParams;
    const chainId = parseInt(params.get('chainId') || '1');
    const fromToken = params.get('fromToken') || NATIVE_TOKEN;
    const toToken = params.get('toToken') || '';
    const amount = params.get('amount') || '';
    const fromAddress = params.get('fromAddress') || '';
    const slippage = parseFloat(params.get('slippage') || '0.5');
    const isPremium = params.get('premium') === 'true';

    if (!toToken || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: toToken, amount',
      }, { status: 400 });
    }

    // Validate amount is a valid positive number
    try {
      const amountBig = BigInt(amount);
      if (amountBig <= BigInt(0)) {
        return NextResponse.json({
          success: false,
          error: 'Amount must be a positive number (in wei)',
        }, { status: 400 });
      }
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid amount format. Must be a valid integer (in wei)',
      }, { status: 400 });
    }

    if (!CHAIN_NAMES[chainId]) {
      return NextResponse.json({
        success: false,
        error: `Unsupported chain ID: ${chainId}. Supported: ${Object.keys(CHAIN_NAMES).join(', ')}`,
      }, { status: 400 });
    }

    // Fetch quotes from multiple aggregators in parallel
    const feeBps = isPremium ? 0 : CYPHER_FEE_CONFIG.swapFeeBps;
    const quotes = await Promise.allSettled([
      fetch1inchQuote(chainId, fromToken, toToken, amount, isPremium),
      fetchParaswapQuote(chainId, fromToken, toToken, amount, isPremium),
    ]);

    const validQuotes = quotes
      .map((result, index) => {
        const provider = index === 0 ? '1inch' : 'paraswap';
        if (result.status === 'fulfilled') {
          return { provider, ...result.value };
        }
        return { provider, outputAmount: '0', error: result.reason?.message };
      })
      .filter(q => !q.error && q.outputAmount !== '0');

    if (validQuotes.length === 0) {
      const errors = quotes
        .map((r, i) => r.status === 'rejected' ? `${i === 0 ? '1inch' : 'paraswap'}: ${r.reason?.message}` : null)
        .filter(Boolean);

      return NextResponse.json({
        success: false,
        error: 'No DEX aggregator returned a valid quote',
        details: errors,
      }, { status: 502 });
    }

    // Filter out quotes with invalid outputAmount before sorting
    const sortableQuotes = validQuotes.filter(q => {
      try {
        BigInt(q.outputAmount);
        return true;
      } catch {
        return false;
      }
    });

    if (sortableQuotes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'All DEX quotes returned invalid output amounts',
      }, { status: 502 });
    }

    // Sort by best output (highest is best)
    sortableQuotes.sort((a, b) => {
      return BigInt(b.outputAmount) > BigInt(a.outputAmount) ? 1 : -1;
    });

    const best = sortableQuotes[0];

    // Record fee with proper error logging
    if (feeBps > 0) {
      const feeRecord = {
        id: `evm_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`,
        protocol: 'evm_dex' as const,
        timestamp: Date.now(),
        chain: CHAIN_NAMES[chainId],
        fromToken,
        toToken,
        tradeAmountUSD: 0,
        feeAmount: 0,
        feeToken: toToken,
        feeUSD: 0,
        feeBps,
        feeWallet: CYPHER_FEE_WALLETS.evm,
        userAddress: fromAddress || 'unknown',
        status: 'included' as const,
        metadata: { provider: best.provider, chainId },
      };
      await recordFee(feeRecord).catch((err) => {
        console.error('[EVM Swap] Fee recording failed:', err instanceof Error ? err.message : err);
      });
    }

    return NextResponse.json({
      success: true,
      chain: CHAIN_NAMES[chainId],
      chainId,
      bestProvider: best.provider,
      quote: {
        outputAmount: best.outputAmount,
        provider: best.provider,
      },
      fee: {
        feeBps,
        feeWallet: CYPHER_FEE_WALLETS.evm,
        isPremium,
        collection: 'native',
        description: feeBps > 0
          ? `${(feeBps / 100).toFixed(1)}% referrer fee via ${best.provider}`
          : 'No fee (Premium)',
      },
      allQuotes: sortableQuotes.map(q => ({
        provider: q.provider,
        outputAmount: q.outputAmount,
      })),
    });

  } catch (error) {
    console.error('[EVM Swap] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get EVM swap quote',
    }, { status: 500 });
  }
}

// ============================================================================
// 1inch Quote Fetcher
// ============================================================================

async function fetch1inchQuote(
  chainId: number,
  fromToken: string,
  toToken: string,
  amount: string,
  isPremium: boolean
): Promise<{ outputAmount: string }> {
  const queryParams = new URLSearchParams({
    src: fromToken,
    dst: toToken,
    amount,
  });

  if (!isPremium) {
    queryParams.set('fee', REFERRAL_CODES.oneInch.feePercent.toString());
    queryParams.set('referrerAddress', REFERRAL_CODES.oneInch.referrerAddress);
  }

  const headers: Record<string, string> = { 'Accept': 'application/json' };
  const apiKey = process.env.ONEINCH_API_KEY;
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const res = await fetch(
    `https://api.1inch.dev/swap/v6.0/${chainId}/quote?${queryParams.toString()}`,
    { headers, signal: AbortSignal.timeout(8000) }
  );

  if (!res.ok) {
    throw new Error(`1inch ${res.status}`);
  }

  const data = await res.json();
  return { outputAmount: data.toTokenAmount || data.dstAmount || '0' };
}

// ============================================================================
// Paraswap Quote Fetcher
// ============================================================================

async function fetchParaswapQuote(
  chainId: number,
  fromToken: string,
  toToken: string,
  amount: string,
  isPremium: boolean
): Promise<{ outputAmount: string }> {
  const queryParams = new URLSearchParams({
    srcToken: fromToken,
    destToken: toToken,
    amount,
    srcDecimals: '18',
    destDecimals: '18',
    side: 'SELL',
    network: chainId.toString(),
  });

  if (!isPremium) {
    queryParams.set('partner', REFERRAL_CODES.paraswap.partner);
    queryParams.set('partnerAddress', REFERRAL_CODES.paraswap.partnerAddress);
    queryParams.set('partnerFeeBps', REFERRAL_CODES.paraswap.partnerFeeBps.toString());
  }

  const res = await fetch(
    `https://apiv5.paraswap.io/prices?${queryParams.toString()}`,
    { signal: AbortSignal.timeout(8000) }
  );

  if (!res.ok) {
    throw new Error(`Paraswap ${res.status}`);
  }

  const data = await res.json();
  return { outputAmount: data.priceRoute?.destAmount || '0' };
}
