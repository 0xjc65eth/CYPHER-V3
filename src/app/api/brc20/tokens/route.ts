import { NextResponse } from 'next/server';

const UNISAT_API_KEY = process.env.UNISAT_API_KEY || '';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch from Hiro and UniSat in parallel
    const [hiroResult, unisatResult] = await Promise.allSettled([
      fetchHiroBRC20(limit, offset),
      fetchUnisatBRC20(Math.min(limit, 20)),
    ]);

    const hiroTokens: Record<string, unknown>[] =
      hiroResult.status === 'fulfilled' ? hiroResult.value : [];
    const unisatTokens: Record<string, unknown>[] =
      unisatResult.status === 'fulfilled' ? unisatResult.value : [];

    if (hiroTokens.length === 0 && unisatTokens.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch BRC-20 tokens from all sources' },
        { status: 502, headers: { 'Cache-Control': 'no-cache' } }
      );
    }

    // Merge and deduplicate by ticker
    const tokenMap = new Map<string, Record<string, unknown>>();

    for (const token of hiroTokens) {
      const ticker = ((token.ticker as string) || '').toLowerCase();
      if (ticker) {
        // Extract deployed timestamp from various possible fields
        const deployedTime = token.deployed_timestamp ||
                            token.deploy_time ||
                            token.deploy_timestamp ||
                            token.genesis_timestamp ||
                            null;

        // Extract max supply
        const maxSupply = token.max_supply || token.supply || token.max || '0';
        const totalMinted = token.total_minted || token.minted || token.minted_supply || '0';

        // Calculate mint progress
        const maxNum = parseFloat(String(maxSupply)) || 0;
        const mintedNum = parseFloat(String(totalMinted)) || 0;
        const mintProgress = maxNum > 0 ? (mintedNum / maxNum) * 100 : 0;

        // Estimate holders based on transaction count (since Hiro doesn't provide direct holders count)
        const txCount = (token.tx_count as number) || 0;
        const estimatedHolders = Math.max(1, Math.floor(txCount * 0.3));

        tokenMap.set(ticker, {
          ticker: token.ticker,
          max_supply: maxSupply,
          total_minted: totalMinted,
          holders_count: token.holders_count ?? token.holders ?? estimatedHolders,
          deploy_inscription_id: token.deploy_inscription_id || token.inscription_id,
          deployed_timestamp: deployedTime,
          mint_limit: token.mint_limit || token.limit_per_mint || token.lim,
          decimals: token.decimals || token.dec || 18,
          self_mint: token.self_mint,
          mint_progress: token.minted_supply_percentage ?? mintProgress,
          source: 'hiro',
        });
      }
    }

    for (const token of unisatTokens) {
      const ticker = ((token.ticker as string) || (token.tick as string) || '').toLowerCase();
      if (ticker && !tokenMap.has(ticker)) {
        tokenMap.set(ticker, {
          ticker: token.ticker || token.tick,
          max_supply: token.max || token.max_supply,
          total_minted: token.totalMinted || token.total_minted,
          holders_count: token.holdersCount || token.holders || token.holders_count,
          deploy_inscription_id: token.inscriptionId || token.deploy_inscription_id,
          deployed_timestamp: token.deployTime || token.deployed_timestamp,
          mint_limit: token.lim || token.mint_limit,
          decimals: token.decimal || token.decimals,
          mint_progress: token.mintedPercent ?? null,
          source: 'unisat',
        });
      } else if (ticker && tokenMap.has(ticker)) {
        // Enrich hiro data with unisat data
        const existing = tokenMap.get(ticker)!;
        if (!existing.holders_count && (token.holdersCount || token.holders)) {
          existing.holders_count = token.holdersCount || token.holders;
        }
      }
    }

    const tokens = Array.from(tokenMap.values());

    return NextResponse.json(
      {
        success: true,
        data: tokens,
        total: tokens.length,
        sources: {
          hiro: hiroTokens.length,
          unisat: unisatTokens.length,
        },
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('BRC-20 tokens API error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch BRC-20 tokens', message },
      { status: 500, headers: { 'Cache-Control': 'no-cache' } }
    );
  }
}

async function fetchHiroBRC20(limit: number, offset: number): Promise<Record<string, unknown>[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(
      `https://api.hiro.so/ordinals/v1/brc-20/tokens?limit=${limit}&offset=${offset}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    );
    if (!res.ok) throw new Error(`Hiro ${res.status}`);
    const data = await res.json();
    return data.results || [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchUnisatBRC20(limit: number): Promise<Record<string, unknown>[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(
      `https://open-api.unisat.io/v1/indexer/brc20/list?start=0&limit=${limit}`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${UNISAT_API_KEY}`,
        },
        signal: controller.signal,
      }
    );
    if (!res.ok) throw new Error(`UniSat ${res.status}`);
    const data = await res.json();
    return data.data?.detail || data.data || data.results || [];
  } finally {
    clearTimeout(timeout);
  }
}
