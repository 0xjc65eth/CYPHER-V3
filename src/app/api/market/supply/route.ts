import { NextResponse } from 'next/server';

async function fetchWithTimeout(url: string, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

const MAX_SUPPLY = 21_000_000;
const NEXT_HALVING_BLOCK = 1_050_000;
const CURRENT_BLOCK_REWARD = 3.125;
const BLOCKS_PER_DAY = 144;

export async function GET() {
  try {
    const [cgRes, blockRes] = await Promise.allSettled([
      fetchWithTimeout('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false'),
      fetchWithTimeout('https://mempool.space/api/blocks/tip/height'),
    ]);

    let circulatingSupply: number | null = null;
    let currentPrice: number | null = null;
    if (cgRes.status === 'fulfilled' && cgRes.value.ok) {
      const data = await cgRes.value.json();
      circulatingSupply = data.market_data?.circulating_supply ?? null;
      currentPrice = data.market_data?.current_price?.usd ?? null;
    }

    let blockHeight: number | null = null;
    if (blockRes.status === 'fulfilled' && blockRes.value.ok) {
      const text = await blockRes.value.text();
      blockHeight = parseInt(text, 10);
    }

    let blocksUntilHalving: number | null = null;
    let estimatedHalvingDate: string | null = null;
    if (blockHeight !== null) {
      blocksUntilHalving = NEXT_HALVING_BLOCK - blockHeight;
      if (blocksUntilHalving > 0) {
        const daysUntilHalving = blocksUntilHalving / BLOCKS_PER_DAY;
        const halvingDate = new Date(Date.now() + daysUntilHalving * 24 * 60 * 60 * 1000);
        estimatedHalvingDate = halvingDate.toISOString().split('T')[0];
      } else {
        blocksUntilHalving = 0;
        estimatedHalvingDate = 'Already passed';
      }
    }

    const minedPercentage = circulatingSupply ? (circulatingSupply / MAX_SUPPLY) * 100 : null;
    const annualIssuance = CURRENT_BLOCK_REWARD * BLOCKS_PER_DAY * 365;
    const inflationRate = circulatingSupply ? (annualIssuance / circulatingSupply) * 100 : null;

    return NextResponse.json(
      {
        circulatingSupply,
        maxSupply: MAX_SUPPLY,
        minedPercentage,
        blockHeight,
        blockReward: CURRENT_BLOCK_REWARD,
        blocksUntilHalving,
        estimatedHalvingDate,
        annualIssuance,
        inflationRate,
        currentPrice,
        timestamp: Date.now(),
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
