import { NextRequest, NextResponse } from 'next/server';

// Proxy para API do Mempool.space para resolver problemas de CORS
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || '/mempool';
  
  try {
    const mempoolUrl = `https://mempool.space/api${endpoint}`;
    
    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(mempoolUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CYPHER-ORDi-Future/3.0',
      },
      signal: controller.signal,
      next: {
        revalidate: 30, // Cache for 30 seconds
      },
    });
    clearTimeout(fetchTimeout);

    if (!response.ok) {
      throw new Error(`Mempool API error: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // Some mempool.space endpoints return plain text - wrap it
      const text = await response.text();
      const data = text.trim();
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(data);
        return NextResponse.json(parsed, {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          },
        });
      } catch {
        // Return as wrapped text
        return NextResponse.json({ value: data }, {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          },
        });
      }
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4444',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Mempool proxy error:', error);
    
    // Retornar dados de fallback baseados no endpoint
    const fallbackData = getFallbackData(endpoint);
    
    return NextResponse.json(fallbackData, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4444',
        'X-Fallback-Data': 'true',
      },
    });
  }
}

function getFallbackData(endpoint: string) {
  const fallbackMap: Record<string, any> = {
    '/mempool': {
      count: 12543,
      vsize: 8234567,
      total_fee: 125430000,
      fee_histogram: [
        [1, 234],
        [2, 567],
        [5, 890],
        [10, 1234],
        [20, 1567],
        [50, 890],
        [100, 345],
        [200, 123],
        [500, 45],
        [1000, 12]
      ]
    },
    '/v1/fees/recommended': {
      fastestFee: 25,
      halfHourFee: 20,
      hourFee: 15,
      economyFee: 8,
      minimumFee: 1
    },
    '/mempool/fees': [
      [1, 234],
      [2, 567],
      [5, 890],
      [10, 1234],
      [20, 1567],
      [50, 890],
      [100, 345],
      [200, 123],
      [500, 45],
      [1000, 12]
    ],
    '/v1/blocks': [
      {
        id: "00000000000000000002c5d7e8e29e8cf12b9c4b0e5a9b8c7d6e5f4a3b2c1d0e9f",
        height: 820000,
        version: 536870912,
        timestamp: Math.floor((Date.now() - 600000) / 1000),
        tx_count: 3456,
        size: 1234567,
        weight: 3456789,
        merkle_root: "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef123",
        previousblockhash: "00000000000000000001b4c3e7f8d9a2b5c6e9f0a3b4c7d0e3f6a9b2c5d8e1f4a7",
        mediantime: Math.floor((Date.now() - 3600000) / 1000),
        nonce: 123456789,
        bits: 386089497,
        difficulty: 68177349387402.49,
        extras: {
          coinbaseRaw: "03404c0c04b9e7f366...",
          orphans: [],
          coinbaseAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
          coinbaseSignature: "",
          coinbaseSignatureAscii: "",
          avgFee: 15432,
          avgFeeRate: 25.5,
          feeRange: [1, 5, 10, 20, 30, 50, 100],
          reward: 625000000,
          totalFees: 53456789,
          avgTxSize: 357,
          totalInputs: 8765,
          totalOutputs: 9876,
          totalOutputAmt: 123456789012,
          medianFee: 12345,
          feePercentiles: [1, 5, 10, 20, 30, 50, 100],
          medianFeeAmt: 12345,
          utxoSetChange: 1234,
          utxoSetSize: 987654321,
          virtualSize: 1234567,
          segwitTotalTxs: 3000,
          segwitTotalSize: 1000000,
          segwitTotalWeight: 3000000,
          header: "00000020...",
          feeSpan: [1, 1000],
          pool: {
            id: 1,
            name: "Unknown",
            slug: "unknown"
          }
        }
      }
    ],
    '/v1/difficulty-adjustment': {
      progressPercent: 65.4,
      difficultyChange: 2.5,
      estimatedRetargetDate: Date.now() + (7 * 24 * 60 * 60 * 1000),
      remainingBlocks: 743,
      remainingTime: 7 * 24 * 60 * 60 * 1000
    },
    '/v1/mining/hashrate/1w': {
      currentHashrate: 650000000000000000000,
      currentDifficulty: 68177349387402.49,
      hashrates: [],
      difficulty: []
    }
  };

  return fallbackMap[endpoint] || { error: 'No fallback data available', endpoint };
}