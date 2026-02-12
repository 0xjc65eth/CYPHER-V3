import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;

    if (!ticker) {
      return NextResponse.json(
        { success: false, error: 'Ticker parameter is required' },
        { status: 400, headers: { 'Cache-Control': 'no-cache' } }
      );
    }

    const encodedTicker = encodeURIComponent(ticker);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://api.hiro.so/ordinals/v1/brc-20/tokens/${encodedTicker}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { success: false, error: `BRC-20 token "${ticker}" not found` },
          { status: 404, headers: { 'Cache-Control': 'no-cache' } }
        );
      }
      return NextResponse.json(
        { success: false, error: `Hiro API error: ${response.status} ${response.statusText}` },
        { status: response.status, headers: { 'Cache-Control': 'no-cache' } }
      );
    }

    const data = await response.json();

    // Also try to get holders info
    let holdersCount = null;
    try {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 10000);
      const holdersRes = await fetch(
        `https://api.hiro.so/ordinals/v1/brc-20/tokens/${encodedTicker}/holders?limit=1`,
        {
          headers: { 'Accept': 'application/json' },
          signal: controller2.signal,
        }
      );
      clearTimeout(timeout2);
      if (holdersRes.ok) {
        const holdersData = await holdersRes.json();
        holdersCount = holdersData.total || null;
      }
    } catch {
      // Non-critical
    }

    // Get recent activity
    let recentActivity = null;
    try {
      const controller3 = new AbortController();
      const timeout3 = setTimeout(() => controller3.abort(), 10000);
      const activityRes = await fetch(
        `https://api.hiro.so/ordinals/v1/brc-20/activity?ticker=${encodedTicker}&limit=10`,
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

    const token = data.token || data;

    return NextResponse.json(
      {
        success: true,
        data: {
          ticker: token.ticker,
          max_supply: token.max_supply ?? token.supply,
          total_minted: token.total_minted ?? token.minted,
          holders_count: holdersCount ?? token.holders_count,
          deploy_inscription_id: token.deploy_inscription_id,
          deployed_timestamp: token.deployed_timestamp,
          mint_limit: token.mint_limit,
          decimals: token.decimals,
          self_mint: token.self_mint,
          tx_count: token.tx_count,
          mint_progress: token.minted_supply_percentage ?? null,
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('BRC-20 token detail API error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch token details', message },
      { status: 500, headers: { 'Cache-Control': 'no-cache' } }
    );
  }
}
