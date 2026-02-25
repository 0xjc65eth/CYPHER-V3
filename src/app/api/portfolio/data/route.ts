/**
 * PORTFOLIO DATA API
 * Returns portfolio data for a connected wallet.
 * Real balance data comes from /api/portfolio/balance (Blockstream API).
 * This endpoint returns an empty portfolio when no wallet is connected.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withMiddleware,
  createSuccessResponse,
  createErrorResponse,
  corsHeaders
} from '@/lib/api-middleware';

interface PortfolioPosition {
  id: string;
  symbol: string;
  name: string;
  type: 'bitcoin' | 'ordinal' | 'rune' | 'brc20';
  balance: number;
  value: number;
  price: number;
  change24h: number;
  allocation: number;
  avgCost: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  lastUpdate: number;
}

interface PortfolioData {
  positions: PortfolioPosition[];
  metrics: {
    totalValue: number;
    totalPnL: number;
    totalPnLPercent: number;
    dailyChange: number;
    dailyChangePercent: number;
  };
  summary: {
    totalAssets: number;
    totalValue: number;
    bestPerformer: string | null;
    worstPerformer: string | null;
    totalGainLoss: number;
  };
  message?: string;
}

function emptyPortfolio(message: string): PortfolioData {
  return {
    positions: [],
    metrics: {
      totalValue: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
      dailyChange: 0,
      dailyChangePercent: 0
    },
    summary: {
      totalAssets: 0,
      totalValue: 0,
      bestPerformer: null,
      worstPerformer: null,
      totalGainLoss: 0
    },
    message
  };
}

async function handlePortfolioData(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address') || searchParams.get('wallet');

    if (!address) {
      const portfolioData = emptyPortfolio('Connect wallet to view portfolio');
      return NextResponse.json(
        createSuccessResponse(portfolioData, 'No wallet connected'),
        { headers: corsHeaders }
      );
    }

    // When a wallet address is provided, try to fetch real balance from Blockstream
    try {
      const balanceRes = await fetch(`https://blockstream.info/api/address/${address}`);
      if (!balanceRes.ok) {
        const portfolioData = emptyPortfolio('Unable to fetch wallet data. Check address and try again.');
        return NextResponse.json(
          createSuccessResponse(portfolioData, 'Failed to fetch balance'),
          { headers: corsHeaders }
        );
      }

      const balanceData = await balanceRes.json();
      const funded = balanceData.chain_stats?.funded_txo_sum || 0;
      const spent = balanceData.chain_stats?.spent_txo_sum || 0;
      const balanceSats = funded - spent;
      const balanceBTC = balanceSats / 100_000_000;

      // Get current BTC price from CoinGecko via internal proxy
      let btcPrice = 0;
      try {
        const baseUrl = request.nextUrl.origin;
        const priceRes = await fetch(`${baseUrl}/api/coingecko/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`);
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          btcPrice = priceData?.bitcoin?.usd || 0;
        }
      } catch {
        // Price fetch failed; proceed without price data
      }

      const btcValue = balanceBTC * btcPrice;

      const positions: PortfolioPosition[] = balanceBTC > 0 ? [{
        id: 'btc',
        symbol: 'BTC',
        name: 'Bitcoin',
        type: 'bitcoin',
        balance: balanceBTC,
        value: btcValue,
        price: btcPrice,
        change24h: 0,
        allocation: 100,
        avgCost: 0,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        lastUpdate: Date.now()
      }] : [];

      const portfolioData: PortfolioData = {
        positions,
        metrics: {
          totalValue: btcValue,
          totalPnL: 0,
          totalPnLPercent: 0,
          dailyChange: 0,
          dailyChangePercent: 0
        },
        summary: {
          totalAssets: positions.length,
          totalValue: btcValue,
          bestPerformer: positions.length > 0 ? 'BTC' : null,
          worstPerformer: positions.length > 0 ? 'BTC' : null,
          totalGainLoss: 0
        },
        message: btcPrice === 0 ? 'Balance loaded. Price data temporarily unavailable.' : undefined
      };

      return NextResponse.json(
        createSuccessResponse(portfolioData, 'Portfolio data retrieved successfully'),
        { headers: corsHeaders }
      );
    } catch (fetchError) {
      const portfolioData = emptyPortfolio('Unable to reach blockchain API. Try again later.');
      return NextResponse.json(
        createSuccessResponse(portfolioData, 'Blockchain API unavailable'),
        { headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Portfolio data error:', error);

    return NextResponse.json(
      createErrorResponse('Failed to retrieve portfolio data', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export const GET = withMiddleware(handlePortfolioData, {
  rateLimit: {
    windowMs: 60000,
    maxRequests: 120,
  },
  cache: {
    ttl: 30,
  }
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
}
