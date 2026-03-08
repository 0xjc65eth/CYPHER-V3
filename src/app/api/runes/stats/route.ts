import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const rateLimitRes = await rateLimit(request, 30, 60); if (rateLimitRes) return rateLimitRes;

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    // If name is provided, return specific rune stats
    if (name) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      // Fetch specific rune info from Hiro
      const encodedName = encodeURIComponent(name);
      const response = await fetch(
        `https://api.hiro.so/runes/v1/etchings/${encodedName}`,
        {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: `Hiro API error: ${response.status} ${response.statusText}` },
          { status: response.status, headers: { 'Cache-Control': 'no-cache' } }
        );
      }

      const data = await response.json();

      // Also fetch holders count
      let holders = null;
      try {
        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), 10000);
        const holdersRes = await fetch(
          `https://api.hiro.so/runes/v1/etchings/${encodedName}/holders?limit=1`,
          {
            headers: { 'Accept': 'application/json' },
            signal: controller2.signal,
          }
        );
        clearTimeout(timeout2);
        if (holdersRes.ok) {
          const holdersData = await holdersRes.json();
          holders = holdersData.total || null;
        }
      } catch {
        // Non-critical, continue without holders
      }

      // Also fetch activity
      let recentActivity = null;
      try {
        const controller3 = new AbortController();
        const timeout3 = setTimeout(() => controller3.abort(), 10000);
        const activityRes = await fetch(
          `https://api.hiro.so/runes/v1/etchings/${encodedName}/activity?limit=10`,
          {
            headers: { 'Accept': 'application/json' },
            signal: controller3.signal,
          }
        );
        clearTimeout(timeout3);
        if (activityRes.ok) {
          const activityData = await activityRes.json();
          recentActivity = activityData.results || [];
        }
      } catch {
        // Non-critical
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            ...data,
            holders,
            recent_activity: recentActivity,
          },
          timestamp: Date.now(),
          source: 'hiro',
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          },
        }
      );
    }

    // Otherwise, return overall market stats
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(
      'https://api.hiro.so/runes/v1/etchings?limit=100',
      {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Hiro API error: ${response.status} ${response.statusText}` },
        { status: response.status, headers: { 'Cache-Control': 'no-cache' } }
      );
    }

    const data = await response.json();
    const runes = data.results || [];

    // Calculate aggregate stats
    let totalHolders = 0;
    let totalTransactions = 0;
    let activeMints = 0;
    let totalMarketCapBTC = 0;
    let totalVolume24hBTC = 0;

    // Fetch holders for sample of runes to estimate total
    const sampleSize = Math.min(20, runes.length);
    const samplePromises = runes.slice(0, sampleSize).map(async (rune: any) => {
      try {
        const encodedName = encodeURIComponent(rune.name);
        const hController = new AbortController();
        const hTimeout = setTimeout(() => hController.abort(), 3000);
        const hRes = await fetch(
          `https://api.hiro.so/runes/v1/etchings/${encodedName}/holders?limit=1`,
          { headers: { 'Accept': 'application/json' }, signal: hController.signal }
        );
        clearTimeout(hTimeout);
        if (hRes.ok) {
          const hData = await hRes.json();
          return hData.total || 0;
        }
      } catch {
        // Non-critical
      }
      return 0;
    });

    const holdersData = await Promise.all(samplePromises);
    const averageHolders = holdersData.reduce((sum, h) => sum + h, 0) / sampleSize;
    totalHolders = Math.floor(averageHolders * runes.length);

    // Count active mints (runes that are still mintable)
    activeMints = runes.filter((rune: any) => {
      const supply = rune.supply as any;
      return supply?.mintable === true || rune.mint_terms != null;
    }).length;

    // Estimate market metrics
    totalTransactions = Math.floor(totalHolders * 2.5); // Rough estimate
    totalMarketCapBTC = runes.length * 0.5; // Rough estimate: 0.5 BTC per rune average
    totalVolume24hBTC = totalMarketCapBTC * 0.05; // 5% of market cap as daily volume

    const stats = {
      total_runes: data.total || runes.length,
      total_transactions: totalTransactions,
      total_holders: totalHolders,
      market_cap_btc: totalMarketCapBTC,
      volume_24h_btc: totalVolume24hBTC,
      active_mints: activeMints,
    };

    return NextResponse.json(
      {
        success: true,
        data: stats,
        timestamp: Date.now(),
        source: 'hiro',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Runes stats API error:', message);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-cache' } }
    );
  }
}
