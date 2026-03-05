/**
 * RUNES MARKET DATA API - DEPRECATED
 *
 * ⚠️ WARNING: This endpoint contains incomplete data:
 * - Price data = 0 (not available from Hiro API)
 * - Volume data = 0 (not available from Hiro API)
 * - Market cap = 0 (not available from Hiro API)
 * - Technical analysis = hardcoded placeholders
 * - Sentiment = hardcoded placeholders
 *
 * ✅ USE INSTEAD: /api/runes/list (real Hiro data only)
 *
 * This endpoint is kept for backward compatibility but should NOT be used
 * for production features that require accurate market data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  withMiddleware,
  createSuccessResponse,
  createErrorResponse,
  corsHeaders
} from '@/lib/api-middleware';

// Request schema
const RunesRequestSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(50),
  sortBy: z.enum(['marketCap', 'volume', 'price', 'change24h']).optional().default('marketCap'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  includeAnalytics: z.boolean().optional().default(true)
});

interface RuneMarketData {
  id: string;
  name: string;
  symbol: string;
  price: {
    current: number;
    change24h: number;
    change7d: number;
    high24h: number;
    low24h: number;
  };
  marketCap: {
    current: number;
    rank: number;
    change24h: number;
  };
  volume: {
    volume24h: number;
    change24h: number;
    volumeRank: number;
  };
  supply: {
    circulating: number;
    total: number;
    max: number;
    percentage: number;
  };
  holders: number;
  transactions: {
    transfers24h: number;
    mints24h: number;
    burns24h: number;
  };
  minting: {
    progress: number;
    remaining: number;
    rate: number;
    estimatedCompletion: number;
  };
  liquidity: {
    pools: Array<{
      exchange: string;
      liquidity: number;
      apr: number;
    }>;
    totalLiquidity: number;
  };
  technicalAnalysis: {
    rsi: number;
    macd: number;
    bollinger: {
      upper: number;
      middle: number;
      lower: number;
    };
    support: number;
    resistance: number;
    trend: 'bullish' | 'bearish' | 'neutral';
  };
  sentiment: {
    score: number;
    mentions24h: number;
    bullishPercentage: number;
  };
  lastUpdate: number;
}

interface RunesAnalytics {
  marketOverview: {
    totalMarketCap: number;
    totalVolume24h: number;
    averageChange24h: number;
    activeRunes: number;
    newRunes24h: number;
    marketSentiment: 'bullish' | 'bearish' | 'neutral';
  };
  topPerformers: {
    gainers24h: RuneMarketData[];
    losers24h: RuneMarketData[];
    volumeLeaders: RuneMarketData[];
  };
  crossChainMetrics: {
    bridgeVolume24h: number;
    activeBridges: number;
    averageBridgeTime: number;
  };
  liquidityMetrics: {
    totalLiquidity: number;
    averageApr: number;
    topPools: Array<{
      name: string;
      liquidity: number;
      apr: number;
      volume24h: number;
    }>;
  };
}

const HIRO_API_BASE = 'https://api.hiro.so/runes/v1';
const FETCH_TIMEOUT = 10000;

// In-memory cache
let cachedRunesData: RuneMarketData[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 60 seconds

async function fetchWithTimeout(url: string, timeoutMs: number = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface HiroRuneEntry {
  id?: string;
  name: string;
  spaced_name?: string;
  number: number;
  supply?: {
    current?: string;
    minted?: string;
    mint_percentage?: string;
    mintable?: boolean;
    burned?: string;
    premine?: string;
    total_mints?: string;
    cap?: string;
  };
  turbo?: boolean;
  divisibility?: number;
  symbol?: string;
  timestamp?: number;
}

async function fetchRunesFromHiro(limit: number): Promise<RuneMarketData[]> {
  const listResponse = await fetchWithTimeout(`${HIRO_API_BASE}?offset=0&count=${Math.min(limit, 60)}`);
  if (!listResponse.ok) {
    throw new Error(`Hiro API returned ${listResponse.status}`);
  }

  const listData = await listResponse.json();
  const entries: HiroRuneEntry[] = listData?.results || [];

  // Fetch holder counts and activity in parallel for each rune (limited batch)
  const runeDetails = await Promise.allSettled(
    entries.slice(0, limit).map(async (entry, index) => {
      const encodedName = encodeURIComponent(entry?.spaced_name || entry?.name || '');

      let holders = 0;
      let activityCount = 0;
      try {
        const holdersRes = await fetchWithTimeout(`${HIRO_API_BASE}/${encodedName}/holders?offset=0&count=1`);
        if (holdersRes?.ok) {
          const holdersData = await holdersRes.json();
          holders = holdersData?.total || 0;
        }
      } catch { /* fallback to 0 */ }

      try {
        const activityRes = await fetchWithTimeout(`${HIRO_API_BASE}/${encodedName}/activity?offset=0&count=1`);
        if (activityRes?.ok) {
          const activityData = await activityRes.json();
          activityCount = activityData?.total || 0;
        }
      } catch { /* fallback to 0 */ }

      return mapHiroEntryToRuneMarketData(entry, index, holders, activityCount);
    })
  );

  return runeDetails
    .filter((r): r is PromiseFulfilledResult<RuneMarketData> => r.status === 'fulfilled')
    .map(r => r.value);
}

function mapHiroEntryToRuneMarketData(
  entry: HiroRuneEntry,
  index: number,
  holders: number,
  activityCount: number
): RuneMarketData {
  const currentSupply = parseInt(entry?.supply?.current || '0') / Math.pow(10, entry?.divisibility || 0);
  const maxSupply = parseInt(entry?.supply?.cap || '0') / Math.pow(10, entry?.divisibility || 0);
  const totalMints = parseInt(entry?.supply?.total_mints || '0');
  const mintPercentage = parseFloat(entry?.supply?.mint_percentage || '0');
  const burned = parseInt(entry?.supply?.burned || '0') / Math.pow(10, entry?.divisibility || 0);

  // We don't have price data from Hiro directly, so set to 0
  // Consumers should layer in price data from DEX APIs if needed
  const price = 0;
  const marketCap = 0;
  const volume24h = 0;

  return {
    id: entry?.id || `rune_${entry?.number || 0}`,
    name: entry?.spaced_name || entry?.name || 'Unknown',
    symbol: entry?.symbol || (entry?.name || 'UNK').replace(/[•\s]/g, '').substring(0, 8),
    price: {
      current: price,
      change24h: 0,
      change7d: 0,
      high24h: 0,
      low24h: 0
    },
    marketCap: {
      current: marketCap,
      rank: index + 1,
      change24h: 0
    },
    volume: {
      volume24h,
      change24h: 0,
      volumeRank: index + 1
    },
    supply: {
      circulating: currentSupply,
      total: currentSupply,
      max: maxSupply || currentSupply,
      percentage: mintPercentage
    },
    holders,
    transactions: {
      transfers24h: activityCount,
      mints24h: totalMints,
      burns24h: burned > 0 ? 1 : 0
    },
    minting: {
      progress: mintPercentage,
      remaining: maxSupply - currentSupply,
      rate: totalMints,
      estimatedCompletion: entry?.supply?.mintable ? Date.now() + 86400000 * 30 : 0
    },
    liquidity: {
      pools: [],
      totalLiquidity: 0
    },
    technicalAnalysis: {
      rsi: 50,
      macd: 0,
      bollinger: {
        upper: 0,
        middle: 0,
        lower: 0
      },
      support: 0,
      resistance: 0,
      trend: 'neutral'
    },
    sentiment: {
      score: 50,
      mentions24h: 0,
      bullishPercentage: 50
    },
    lastUpdate: Date.now()
  };
}

function buildAnalytics(runes: RuneMarketData[]): RunesAnalytics {
  const totalMarketCap = runes.reduce((sum, r) => sum + r.marketCap.current, 0);
  const totalVolume24h = runes.reduce((sum, r) => sum + r.volume.volume24h, 0);
  const averageChange24h = runes.length > 0
    ? runes.reduce((sum, r) => sum + r.price.change24h, 0) / runes.length
    : 0;

  const gainers = runes
    .filter(r => r.price.change24h > 0)
    .sort((a, b) => b.price.change24h - a.price.change24h)
    .slice(0, 5);

  const losers = runes
    .filter(r => r.price.change24h < 0)
    .sort((a, b) => a.price.change24h - b.price.change24h)
    .slice(0, 5);

  const volumeLeaders = [...runes]
    .sort((a, b) => b.volume.volume24h - a.volume.volume24h)
    .slice(0, 5);

  return {
    marketOverview: {
      totalMarketCap,
      totalVolume24h,
      averageChange24h,
      activeRunes: runes.length,
      newRunes24h: 0,
      marketSentiment: averageChange24h > 2 ? 'bullish' : averageChange24h < -2 ? 'bearish' : 'neutral'
    },
    topPerformers: {
      gainers24h: gainers,
      losers24h: losers,
      volumeLeaders
    },
    crossChainMetrics: {
      bridgeVolume24h: 0,
      activeBridges: 0,
      averageBridgeTime: 0
    },
    liquidityMetrics: {
      totalLiquidity: 0,
      averageApr: 0,
      topPools: []
    }
  };
}

// Handler function
async function handleRunesMarketData(request: NextRequest): Promise<NextResponse> {
  try {
    // Proxy to the real endpoint instead of redirect (redirects return HTML in Next.js)
    const origin = new URL(request.url).origin;
    const listUrl = `${origin}/api/runes/list/${new URL(request.url).search}`;
    try {
      const proxyRes = await fetch(listUrl, { headers: { 'Accept': 'application/json' } });
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        return NextResponse.json(proxyData, {
          headers: { ...corsHeaders, 'X-Deprecated': 'Use /api/runes/list/ instead' }
        });
      }
    } catch {
      // Proxy failed, fall through to local implementation
    }

    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());

    // Convert query params
    const processedParams = {
      ...searchParams,
      limit: searchParams.limit ? parseInt(searchParams.limit) : undefined,
      includeAnalytics: searchParams.includeAnalytics !== 'false'
    };

    // Validate request
    const validationResult = RunesRequestSchema.safeParse(processedParams);
    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse('Invalid request parameters', {
          errors: (validationResult as any).error?.errors || []
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const runesRequest = validationResult.data as NonNullable<typeof validationResult.data>;

    // Use cache if still fresh
    let runesData: RuneMarketData[];
    if (cachedRunesData.length > 0 && Date.now() - cacheTimestamp < CACHE_DURATION) {
      runesData = cachedRunesData;
    } else {
      try {
        runesData = await fetchRunesFromHiro(runesRequest.limit);
        cachedRunesData = runesData;
        cacheTimestamp = Date.now();
      } catch (error) {
        console.error('Hiro Runes API error, using cached data:', error);
        runesData = cachedRunesData.length > 0 ? cachedRunesData : [];
      }
    }

    // Sort data
    let sortedData = [...runesData];
    switch (runesRequest.sortBy) {
      case 'marketCap':
        sortedData.sort((a, b) => b.marketCap.current - a.marketCap.current);
        break;
      case 'volume':
        sortedData.sort((a, b) => b.volume.volume24h - a.volume.volume24h);
        break;
      case 'price':
        sortedData.sort((a, b) => b.price.current - a.price.current);
        break;
      case 'change24h':
        sortedData.sort((a, b) => b.price.change24h - a.price.change24h);
        break;
    }

    if (runesRequest.order === 'asc') {
      sortedData.reverse();
    }

    sortedData = sortedData.slice(0, runesRequest.limit);

    // Prepare response
    const responseData: Record<string, unknown> = {
      runes: sortedData,
      pagination: {
        limit: runesRequest.limit,
        total: sortedData.length,
        sortBy: runesRequest.sortBy,
        order: runesRequest.order
      },
      lastUpdate: Date.now()
    };

    // Include analytics if requested
    if (runesRequest.includeAnalytics) {
      responseData.analytics = buildAnalytics(sortedData);
    }

    return NextResponse.json(
      createSuccessResponse(responseData, 'Runes market data retrieved successfully'),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Runes market data error:', error);

    return NextResponse.json(
      createErrorResponse('Failed to retrieve runes market data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Export handlers
export const GET = withMiddleware(handleRunesMarketData, {
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
