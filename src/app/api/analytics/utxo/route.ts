import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

// Mempool.space API endpoints for real on-chain data
const MEMPOOL_API = 'https://mempool.space/api';

interface MempoolStats {
  count: number;
  vsize: number;
  total_fee: number;
  fee_histogram: number[][];
}

async function fetchRealData() {
  const [mempoolRes, hashrateRes, priceRes] = await Promise.all([
    fetch(`${MEMPOOL_API}/mempool`),
    fetch(`${MEMPOOL_API}/v1/mining/hashrate/3m`),
    fetch(`${MEMPOOL_API}/v1/prices`),
  ]);

  if (!mempoolRes.ok) throw new Error(`Mempool API error: ${mempoolRes.status}`);

  const mempool: MempoolStats = await mempoolRes.json();
  const priceData = priceRes.ok ? await priceRes.json() : { USD: 95000 };
  const currentPrice = priceData.USD || 95000;

  // Mempool.space doesn't expose full UTXO set data directly.
  // We use mempool stats to derive transaction-level estimates and
  // clearly label fields that are estimated vs real.
  const mempoolTxCount = mempool.count;
  const mempoolVsize = mempool.vsize;
  const totalFee = mempool.total_fee;
  const feeHistogram = mempool.fee_histogram || [];

  // Build UTXO-like distribution from fee histogram buckets
  // Each bucket: [fee_rate, vsize] - we use these as proxy for activity distribution
  const outputs = feeHistogram.slice(0, 50).map((bucket, i) => {
    const feeRate = bucket[0];
    const vsize = bucket[1];
    const estimatedValue = (vsize / 250) * 0.001; // rough BTC estimate per typical tx
    return {
      value: estimatedValue,
      createdPrice: currentPrice,
      age: 0, // mempool txs are unconfirmed
      isSpent: false,
      feeRate,
      vsize,
      estimated: true,
    };
  });

  return {
    outputs,
    mempoolStats: {
      txCount: mempoolTxCount,
      vsize: mempoolVsize,
      totalFee,
      feeHistogramBuckets: feeHistogram.length,
    },
    totalSupply: 21000000,
    circulatingSupply: 19800000,
    currentPrice,
    timestamp: new Date().toISOString(),
    simulated: false,
    source: 'mempool.space',
    note: 'UTXO distribution estimated from mempool fee histogram. Full UTXO set requires a full node.',
  };
}

function generateFallbackData() {
  // Simulated fallback data - clearly labeled
  const outputs = [];
  const currentPrice = 95000;

  for (let i = 0; i < 100; i++) {
    const age = (i * 3) % 365;
    const createdPrice = currentPrice * (0.5 + (i % 80) * 0.01);
    const value = (i % 10) * 1.0 + 0.1;
    const isSpent = i % 3 === 0;

    outputs.push({
      value,
      createdPrice,
      spentPrice: isSpent ? currentPrice * 0.95 : undefined,
      age,
      isSpent,
      estimated: true,
    });
  }

  return {
    outputs,
    totalSupply: 21000000,
    circulatingSupply: 19800000,
    timestamp: new Date().toISOString(),
    simulated: true,
    source: 'fallback',
  };
}

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const data = await fetchRealData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching real UTXO data, using fallback:', error);
    const fallback = generateFallbackData();
    return NextResponse.json(fallback);
  }
}
