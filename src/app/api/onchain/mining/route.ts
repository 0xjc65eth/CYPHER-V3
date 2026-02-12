import { NextResponse } from 'next/server';

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  try {
    const [hashrateRes, difficultyRes, poolsRes] = await Promise.all([
      fetchWithTimeout('https://mempool.space/api/v1/mining/hashrate/3m'),
      fetchWithTimeout('https://mempool.space/api/v1/mining/difficulty-adjustments/25'),
      fetchWithTimeout('https://mempool.space/api/v1/mining/pools/1w'),
    ]);

    if (!hashrateRes.ok || !difficultyRes.ok || !poolsRes.ok) {
      const failed = [
        !hashrateRes.ok && `hashrate(${hashrateRes.status})`,
        !difficultyRes.ok && `difficulty(${difficultyRes.status})`,
        !poolsRes.ok && `pools(${poolsRes.status})`,
      ].filter(Boolean).join(', ');
      return NextResponse.json(
        { error: `Mempool.space API errors: ${failed}` },
        { status: 502 }
      );
    }

    const [hashrateData, difficultyData, poolsData] = await Promise.all([
      hashrateRes.json(),
      difficultyRes.json(),
      poolsRes.json(),
    ]);

    const hashrateHistory = hashrateData.hashrates || [];
    const currentHashrate = hashrateData.currentHashrate || (hashrateHistory.length > 0 ? hashrateHistory[hashrateHistory.length - 1].avgHashrate : 0);

    const difficultyAdjustments = Array.isArray(difficultyData)
      ? difficultyData.map((d: Record<string, unknown>) => ({
          height: d.height,
          difficulty: d.difficulty,
          difficultyChange: d.difficultyChange,
          time: d.time,
        }))
      : [];

    const currentDifficulty = difficultyAdjustments.length > 0 ? difficultyAdjustments[0].difficulty : 0;

    const totalBlocks = poolsData.blockCount || 1;
    const pools = (poolsData.pools || []).map((p: Record<string, unknown>) => ({
      name: p.name,
      share: Number(((Number(p.blockCount) / totalBlocks) * 100).toFixed(2)),
      blocks: p.blockCount,
      slug: p.slug,
    }));

    return NextResponse.json(
      {
        hashrate: {
          current: currentHashrate,
          history: hashrateHistory.slice(-90).map((h: Record<string, unknown>) => ({
            timestamp: h.timestamp,
            avgHashrate: h.avgHashrate,
          })),
        },
        difficulty: {
          current: currentDifficulty,
          adjustments: difficultyAdjustments,
        },
        pools,
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to fetch mining data: ${message}` }, { status: 500 });
  }
}
