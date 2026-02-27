import { NextRequest, NextResponse } from 'next/server';
import { arbitrageCore, type CrossExchangeOpportunity } from '@/services/arbitrage/ArbitrageCore';
import { cache } from '@/lib/cache/redis.config';

/**
 * Arbitrage History API
 *
 * Stores snapshots of top opportunities at each scan.
 * GET returns historical opportunities from the in-memory/Redis store.
 *
 * This is a lightweight approach: every time someone fetches opportunities,
 * we also snapshot the top 5 to a rolling history buffer.
 */

interface HistoryEntry {
  id: string;
  symbol: string;
  type: 'tokens';
  detectedAt: number;
  spread: number;
  potentialProfit: number;
  estimatedProfit: number;
  buySource: string;
  sellSource: string;
  status: 'active' | 'expired';
  expiresAt: number;
  baseCurrency: string;
  netProfitPercent: number;
}

// In-memory history buffer (up to 200 entries)
const MAX_HISTORY = 200;
let historyBuffer: HistoryEntry[] = [];

function snapshotOpportunities(opportunities: CrossExchangeOpportunity[]): void {
  const now = Date.now();

  // Mark old entries as expired
  historyBuffer = historyBuffer.map(entry => {
    if (entry.status === 'active' && now > entry.expiresAt) {
      return { ...entry, status: 'expired' as const };
    }
    return entry;
  });

  // Add top 5 new opportunities
  const top = opportunities.slice(0, 5);
  for (const opp of top) {
    // Avoid duplicates (same pair + exchanges within 10s)
    const isDuplicate = historyBuffer.some(
      h => h.buySource === opp.buyExchange &&
           h.sellSource === opp.sellExchange &&
           h.symbol === opp.pair &&
           now - h.detectedAt < 10_000
    );
    if (isDuplicate) continue;

    historyBuffer.unshift({
      id: opp.id,
      symbol: opp.pair,
      type: 'tokens',
      detectedAt: opp.timestamp,
      spread: opp.grossSpreadPercent,
      potentialProfit: opp.estimatedProfitPer1Unit,
      estimatedProfit: opp.estimatedProfitPer1Unit,
      buySource: opp.buyExchange,
      sellSource: opp.sellExchange,
      status: 'active',
      expiresAt: opp.timestamp + opp.ttl,
      baseCurrency: 'USD',
      netProfitPercent: opp.netProfitPercent,
    });
  }

  // Trim buffer
  if (historyBuffer.length > MAX_HISTORY) {
    historyBuffer = historyBuffer.slice(0, MAX_HISTORY);
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get('timeframe') || '24h';
    const pair = searchParams.get('pair') || null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    // Trigger a fresh scan and snapshot
    try {
      const opportunities = await arbitrageCore.detectOpportunities();
      snapshotOpportunities(opportunities);
    } catch {
      // Non-fatal: return whatever history we have
    }

    // Also try to load from Redis cache (persists across restarts if Redis is available)
    const cacheKey = 'arb:history:buffer';
    try {
      const cached = await cache.get(cacheKey);
      if (cached && historyBuffer.length === 0) {
        historyBuffer = typeof cached === 'string' ? JSON.parse(cached) : cached;
      }
      // Save current buffer to Redis
      if (historyBuffer.length > 0) {
        await cache.setex(cacheKey, 3600, JSON.stringify(historyBuffer)); // 1h TTL
      }
    } catch { /* non-fatal */ }

    // Filter by timeframe
    const now = Date.now();
    const timeframeMs: Record<string, number> = {
      '1h': 3600_000,
      '24h': 86400_000,
      '7d': 604800_000,
      '30d': 2592000_000,
    };
    const cutoff = now - (timeframeMs[timeframe] || timeframeMs['24h']);

    let filtered = historyBuffer.filter(h => h.detectedAt >= cutoff);

    // Filter by pair
    if (pair) {
      filtered = filtered.filter(h => h.symbol === pair);
    }

    // Mark expired
    filtered = filtered.map(h => ({
      ...h,
      status: (h.status === 'active' && now > h.expiresAt ? 'expired' : h.status) as 'active' | 'expired',
    }));

    const history = filtered.slice(0, limit);

    // Compute aggregate stats
    const totalOpportunities = history.length;
    const profitable = history.filter(h => h.netProfitPercent > 0);
    const totalProfit = profitable.reduce((sum, h) => sum + h.estimatedProfit, 0);
    const winRate = totalOpportunities > 0 ? (profitable.length / totalOpportunities) * 100 : 0;

    return NextResponse.json({
      success: true,
      history,
      stats: {
        totalOpportunities,
        profitable: profitable.length,
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        winRate: parseFloat(winRate.toFixed(1)),
        timeframe,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Arbitrage history API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch history', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
