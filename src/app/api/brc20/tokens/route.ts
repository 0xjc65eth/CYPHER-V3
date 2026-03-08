import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';
import { xverseAPI } from '@/lib/api/xverse';

/**
 * /api/brc20/tokens
 *
 * Priority: Xverse (has floor price + volume) → Hiro + UniSat → empty
 */

const UNISAT_API_KEY = process.env.UNISAT_API_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const rateLimitRes = await rateLimit(request, 30, 60); if (rateLimitRes) return rateLimitRes;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch from Xverse, Hiro, and UniSat in parallel
    const [xverseResult, hiroResult, unisatResult] = await Promise.allSettled([
      fetchXverseBRC20(limit),
      fetchHiroBRC20(limit, offset),
      fetchUnisatBRC20(Math.min(limit, 20)),
    ]);

    const xverseTokens: Record<string, unknown> =
      xverseResult.status === 'fulfilled' ? xverseResult.value : {};
    const hiroTokens: Record<string, unknown>[] =
      hiroResult.status === 'fulfilled' ? hiroResult.value : [];
    const unisatTokens: Record<string, unknown>[] =
      unisatResult.status === 'fulfilled' ? unisatResult.value : [];

    const xverseCount = Object.keys(xverseTokens).length;

    if (xverseCount === 0 && hiroTokens.length === 0 && unisatTokens.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch BRC-20 tokens from all sources' },
        { status: 502, headers: { 'Cache-Control': 'no-cache' } }
      );
    }

    // Merge and deduplicate by ticker
    const tokenMap = new Map<string, Record<string, unknown>>();

    // Hiro first (base metadata)
    for (const token of hiroTokens) {
      const ticker = ((token.ticker as string) || '').toLowerCase();
      if (ticker) {
        const deployedTime = token.deployed_timestamp ||
                            token.deploy_time ||
                            token.deploy_timestamp ||
                            token.genesis_timestamp ||
                            null;
        const maxSupply = token.max_supply || token.supply || token.max || '0';
        const totalMinted = token.total_minted || token.minted || token.minted_supply || '0';
        const maxNum = parseFloat(String(maxSupply)) || 0;
        const mintedNum = parseFloat(String(totalMinted)) || 0;
        const mintProgress = maxNum > 0 ? (mintedNum / maxNum) * 100 : 0;
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

    // UniSat enrichment
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
        const existing = tokenMap.get(ticker)!;
        if (!existing.holders_count && (token.holdersCount || token.holders)) {
          existing.holders_count = token.holdersCount || token.holders;
        }
      }
    }

    // Xverse enrichment (adds floor_price, volume, last_sale_price)
    if (xverseCount > 0) {
      for (const [rawTicker, info] of Object.entries(xverseTokens)) {
        const ticker = rawTicker.toLowerCase();
        const xData = info as Record<string, unknown>;
        const existing = tokenMap.get(ticker);
        if (existing) {
          existing.floor_price = xData.floorPrice ?? existing.floor_price;
          existing.floor_price_usd = xData.floorPriceUsd ?? existing.floor_price_usd;
          existing.volume_24h = xData.volume24h ?? existing.volume_24h;
          existing.last_sale_price = xData.lastSalePrice ?? existing.last_sale_price;
          existing.marketplace_source = xData.marketplaceSource ?? existing.marketplace_source;
          if (existing.source === 'hiro' || existing.source === 'unisat') {
            existing.source = `${existing.source}+xverse`;
          }
        } else {
          tokenMap.set(ticker, {
            ticker: rawTicker,
            floor_price: xData.floorPrice || 0,
            floor_price_usd: xData.floorPriceUsd || 0,
            volume_24h: xData.volume24h || 0,
            last_sale_price: xData.lastSalePrice || 0,
            marketplace_source: xData.marketplaceSource || '',
            source: 'xverse',
          });
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
          xverse: xverseCount,
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
    console.error('[brc20/tokens] Error:', message);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-cache' } }
    );
  }
}

async function fetchXverseBRC20(limit: number): Promise<Record<string, unknown>> {
  // Xverse uses batch tickers — we need to know which tickers to look up.
  // First get top tickers from Hiro, then enrich with Xverse pricing.
  // If we don't have a list yet, try with well-known BRC-20 tickers.
  const wellKnown = ['ordi', 'sats', 'rats', 'PIZZA', 'PUPS', 'WZRD', 'MEME', 'PEPE', 'DOGE', 'CATS',
    'BTCs', 'OXBT', 'BANK', 'TRAC', 'VMPX', 'BISO', 'BRRR', 'NALS', 'HONK', 'OSHI'];

  const result = await xverseAPI.getBRC20BatchTickers(wellKnown.slice(0, limit));
  return (result || {}) as Record<string, unknown>;
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
