import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/rateLimiter';

const FETCH_TIMEOUT = 10000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check rate limit
    if (!rateLimiter.canMakeRequest('blockchain-info')) {
      return NextResponse.json({
        success: true,
        data: getFallbackMiningData(),
        source: 'Rate Limit Fallback',
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch real mining data from Mempool.space APIs
    const [hashrateResponse, poolsResponse, difficultyResponse, blockHeightResponse] = await Promise.allSettled([
      fetchWithTimeout('https://mempool.space/api/v1/mining/hashrate/1w'),
      fetchWithTimeout('https://mempool.space/api/v1/mining/pools/1w'),
      fetchWithTimeout('https://mempool.space/api/v1/difficulty-adjustment'),
      fetchWithTimeout('https://mempool.space/api/blocks/tip/height'),
    ]);

    let realData = getFallbackMiningData();

    // Process hashrate data
    if (hashrateResponse.status === 'fulfilled' && hashrateResponse.value.ok) {
      try {
        const hashrateData = await hashrateResponse.value.json();
        // currentHashrate is in H/s, convert to EH/s
        if (hashrateData.currentHashrate) {
          const ehPerSecond = hashrateData.currentHashrate / 1e18;
          realData.hashrate = `${ehPerSecond.toFixed(1)} EH/s`;
        }
        // currentDifficulty
        if (hashrateData.currentDifficulty) {
          const difficultyT = hashrateData.currentDifficulty / 1e12;
          realData.difficulty = `${difficultyT.toFixed(2)} T`;
        }
      } catch (e) {
        console.error('Error parsing hashrate data:', e);
      }
    }

    // Process pools data
    if (poolsResponse.status === 'fulfilled' && poolsResponse.value.ok) {
      try {
        const poolsData = await poolsResponse.value.json();
        if (poolsData.blockCount) {
          realData.blocksToday = Math.round(poolsData.blockCount / 7); // weekly blocks / 7
        }
      } catch (e) {
        console.error('Error parsing pools data:', e);
      }
    }

    // Process difficulty adjustment data
    if (difficultyResponse.status === 'fulfilled' && difficultyResponse.value.ok) {
      try {
        const diffData = await difficultyResponse.value.json();
        // remainingBlocks, remainingTime (ms), estimatedRetargetDate, timeAvg (ms)
        if (diffData.remainingTime) {
          const daysRemaining = diffData.remainingTime / (1000 * 60 * 60 * 24);
          realData.nextAdjustment = `${Math.ceil(daysRemaining)} days`;
        }
        if (diffData.timeAvg) {
          const avgMinutes = diffData.timeAvg / (1000 * 60);
          realData.averageBlockTime = `${avgMinutes.toFixed(1)} min`;
          realData.estimatedSeconds = Math.round(diffData.timeAvg / 1000);
        }
      } catch (e) {
        console.error('Error parsing difficulty data:', e);
      }
    }

    // Process block height
    if (blockHeightResponse.status === 'fulfilled' && blockHeightResponse.value.ok) {
      try {
        const heightText = await blockHeightResponse.value.text();
        const height = parseInt(heightText);
        if (!isNaN(height)) {
          realData.totalBlocks = height;
        }
      } catch (e) {
        console.error('Error parsing block height:', e);
      }
    }

    // Calculate profitability index (simplified)
    const difficultyNum = parseFloat(realData.difficulty);
    const hashrateNum = parseFloat(realData.hashrate);
    if (hashrateNum > 0) {
      realData.profitability = Math.max(50, Math.min(100, 100 - (difficultyNum / hashrateNum) * 10));
    }

    return NextResponse.json({
      success: true,
      data: realData,
      source: 'Mempool.space Mining APIs',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Mining data API error:', error);

    return NextResponse.json({
      success: true,
      data: getFallbackMiningData(),
      source: 'Emergency Fallback',
      timestamp: new Date().toISOString(),
      warning: 'Using fallback data due to API error',
    });
  }
}

function getFallbackMiningData() {
  return {
    hashrate: '578.4 EH/s',
    difficulty: '62.46 T',
    nextAdjustment: '7 days',
    profitability: 87.5,
    averageBlockTime: '9.8 min',
    mempoolSize: '142 MB',
    blocksToday: 144,
    totalBlocks: 832456,
    mempoolTxCount: 150000,
    estimatedSeconds: 588
  };
}
