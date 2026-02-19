/**
 * Solana Swap API Route - Jupiter Integration
 *
 * Proxies Jupiter V6 API with platform fee collection.
 * Fee is deducted from output by Jupiter and sent to our fee ATA.
 *
 * Query params:
 *   inputMint: string (token mint address)
 *   outputMint: string (token mint address)
 *   amount: string (in lamports/smallest unit)
 *   slippageBps?: number (default 50 = 0.5%)
 *   premium?: 'true' (YHP holders get 0% fee)
 */

import { NextRequest, NextResponse } from 'next/server';
import { CYPHER_FEE_WALLETS, CYPHER_FEE_CONFIG } from '@/config/feeWallets';
import { recordFee } from '@/lib/feeCollector';

const JUPITER_API = 'https://api.jup.ag/v6';

// Common Solana token mints
const TOKEN_INFO: Record<string, { symbol: string; decimals: number; coingeckoId: string }> = {
  'So11111111111111111111111111111111111111112': { symbol: 'SOL', decimals: 9, coingeckoId: 'solana' },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', decimals: 6, coingeckoId: 'tether' },
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL', decimals: 9, coingeckoId: 'msol' },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', decimals: 5, coingeckoId: 'bonk' },
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { symbol: 'JUP', decimals: 6, coingeckoId: 'jupiter-exchange-solana' },
};

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const inputMint = params.get('inputMint');
    const outputMint = params.get('outputMint');
    const amount = params.get('amount');
    const slippageBps = params.get('slippageBps') || '50';
    const isPremium = params.get('premium') === 'true';

    if (!inputMint || !outputMint || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: inputMint, outputMint, amount',
      }, { status: 400 });
    }

    // Build Jupiter quote URL with platform fee
    const feeBps = isPremium ? 0 : CYPHER_FEE_CONFIG.jupiterPlatformBps;

    const quoteParams = new URLSearchParams({
      inputMint,
      outputMint,
      amount,
      slippageBps,
    });

    if (feeBps > 0) {
      quoteParams.set('platformFeeBps', feeBps.toString());
    }

    const quoteUrl = `${JUPITER_API}/quote?${quoteParams.toString()}`;

    const quoteRes = await fetch(quoteUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!quoteRes.ok) {
      const errorText = await quoteRes.text();
      // Sanitize error: don't expose raw API responses to frontend
      let safeError = 'Jupiter quote failed. Please try again.';
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error) safeError = `Jupiter: ${parsed.error}`;
        else if (parsed.message) safeError = `Jupiter: ${parsed.message}`;
      } catch {
        if (errorText.includes('insufficient')) safeError = 'Insufficient amount for this swap.';
        else if (errorText.includes('not found')) safeError = 'Token pair not found on Jupiter.';
      }
      console.error('[Solana Swap] Jupiter error:', errorText);
      return NextResponse.json({
        success: false,
        error: safeError,
      }, { status: quoteRes.status >= 500 ? 502 : 400 });
    }

    const quoteData = await quoteRes.json();

    // Parse fee info
    const platformFee = quoteData.platformFee || { amount: '0', feeBps: 0 };
    const inputInfo = TOKEN_INFO[inputMint] || { symbol: 'Unknown', decimals: 9, coingeckoId: '' };
    const outputInfo = TOKEN_INFO[outputMint] || { symbol: 'Unknown', decimals: 9, coingeckoId: '' };

    // Record fee for tracking
    if (feeBps > 0 && parseInt(platformFee.amount) > 0) {
      const feeRecord = {
        id: `jup_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`,
        protocol: 'jupiter' as const,
        timestamp: Date.now(),
        chain: 'solana',
        fromToken: inputInfo.symbol,
        toToken: outputInfo.symbol,
        tradeAmountUSD: 0, // Will be calculated by caller
        feeAmount: parseInt(platformFee.amount) / Math.pow(10, outputInfo.decimals),
        feeToken: outputInfo.symbol,
        feeUSD: 0,
        feeBps,
        feeWallet: CYPHER_FEE_WALLETS.solana,
        userAddress: 'pending',
        status: 'included' as const,
        metadata: { jupiter: true, platformFee },
      };
      await recordFee(feeRecord).catch((err) => {
        console.error('[Solana Swap] Fee recording failed:', err instanceof Error ? err.message : err);
      });
    }

    return NextResponse.json({
      success: true,
      chain: 'solana',
      provider: 'jupiter',
      quote: quoteData,
      fee: {
        feeBps,
        feeAmount: platformFee.amount,
        feeWallet: CYPHER_FEE_WALLETS.solana,
        isPremium,
        collection: 'native',
        description: feeBps > 0
          ? `${(feeBps / 100).toFixed(2)}% platform fee deducted by Jupiter`
          : 'No platform fee (Premium)',
      },
      tokens: {
        input: inputInfo,
        output: outputInfo,
      },
    });

  } catch (error) {
    console.error('[Solana Swap] Error:', error);

    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({
        success: false,
        error: 'Jupiter API request timed out',
      }, { status: 504 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to get Solana swap quote',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
