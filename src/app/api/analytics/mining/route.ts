import { NextRequest, NextResponse } from 'next/server';

const MEMPOOL_API = 'https://mempool.space/api';

interface DifficultyAdjustment {
  progressPercent: number;
  difficultyChange: number;
  estimatedRetargetDate: number;
  remainingBlocks: number;
  remainingTime: number;
  previousRetarget: number;
  nextRetargetHeight: number;
  timeAvg: number;
  timeOffset: number;
}

interface HashrateData {
  hashrates: Array<{ timestamp: number; avgHashrate: number }>;
  difficulty: Array<{ timestamp: number; difficulty: number; height: number }>;
  currentHashrate: number;
  currentDifficulty: number;
}

interface PoolStats {
  pools: Array<{
    poolId: number;
    name: string;
    slug: string;
    blockCount: number;
    emptyBlocks: number;
    rank: number;
  }>;
  blockCount: number;
  lastEstimatedHashrate: number;
}

async function fetchRealMiningData() {
  const [hashrateRes, poolsRes, difficultyRes, mempoolRes, priceRes] = await Promise.all([
    fetch(`${MEMPOOL_API}/v1/mining/hashrate/3m`),
    fetch(`${MEMPOOL_API}/v1/mining/pools/1w`),
    fetch(`${MEMPOOL_API}/v1/difficulty-adjustment`),
    fetch(`${MEMPOOL_API}/mempool`),
    fetch(`${MEMPOOL_API}/v1/prices`),
  ]);

  if (!hashrateRes.ok) throw new Error(`Hashrate API error: ${hashrateRes.status}`);
  if (!difficultyRes.ok) throw new Error(`Difficulty API error: ${difficultyRes.status}`);

  const hashrateData: HashrateData = await hashrateRes.json();
  const difficultyData: DifficultyAdjustment = await difficultyRes.json();
  const poolsData: PoolStats = poolsRes.ok ? await poolsRes.json() : null;
  const mempoolData = mempoolRes.ok ? await mempoolRes.json() : null;
  const priceData = priceRes.ok ? await priceRes.json() : { USD: 95000 };

  const currentHashrate = hashrateData.currentHashrate;
  const currentDifficulty = hashrateData.currentDifficulty;
  const btcPrice = priceData.USD || 95000;
  const blockReward = 3.125; // Post-April 2024 halving
  const blocksPerDay = 144;
  const dailyBtcMined = blockReward * blocksPerDay;
  const dailyRevenue = dailyBtcMined * btcPrice;

  // Calculate 90-day MA from real hashrate history
  const hashrates = hashrateData.hashrates || [];
  const revenueHistory = hashrates.map(h => {
    // Approximate daily revenue at each hashrate point
    return dailyBtcMined * btcPrice * (h.avgHashrate / (currentHashrate || 1));
  });
  const minerRevenue90MA = revenueHistory.length > 0
    ? revenueHistory.reduce((a, b) => a + b, 0) / revenueHistory.length
    : dailyRevenue;

  // Top mining pools from real data
  const topPools = poolsData?.pools?.slice(0, 5).map(p => ({
    name: p.name,
    blocksFound: p.blockCount,
    rank: p.rank,
  })) || [];

  return {
    hashrate: currentHashrate,
    difficulty: currentDifficulty,
    blockReward,
    minerRevenue: dailyRevenue,
    minerRevenue90MA,
    totalMinedCoins: 19800000,
    blocksFound: blocksPerDay,
    difficultyAdjustment: {
      progressPercent: difficultyData.progressPercent,
      estimatedChange: difficultyData.difficultyChange,
      remainingBlocks: difficultyData.remainingBlocks,
      estimatedRetargetDate: new Date(difficultyData.estimatedRetargetDate).toISOString(),
      avgBlockTime: difficultyData.timeAvg / 1000, // ms to seconds
    },
    topPools,
    networkStats: {
      blocksToday: poolsData?.blockCount || blocksPerDay,
      avgBlockTime: difficultyData.timeAvg ? difficultyData.timeAvg / 1000 : 600,
      mempoolSize: mempoolData?.count || 0,
      mempoolVsize: mempoolData?.vsize || 0,
      feeRate: mempoolData?.fee_histogram?.[0]?.[0] || 0,
    },
    btcPrice,
    timestamp: new Date().toISOString(),
    simulated: false,
    source: 'mempool.space',
  };
}

function generateFallbackData() {
  const blockReward = 3.125;
  const btcPrice = 95000;
  const blocksPerDay = 144;
  const dailyBtcMined = blockReward * blocksPerDay;
  const dailyRevenue = dailyBtcMined * btcPrice;

  return {
    hashrate: 750e18,
    difficulty: 110e12,
    blockReward,
    minerRevenue: dailyRevenue,
    minerRevenue90MA: dailyRevenue * 0.9,
    totalMinedCoins: 19800000,
    blocksFound: blocksPerDay,
    networkStats: {
      blocksToday: 140,
      avgBlockTime: 600,
      mempoolSize: 35000,
      feeRate: 35,
    },
    timestamp: new Date().toISOString(),
    simulated: true,
    source: 'fallback',
  };
}

export async function GET(request: NextRequest) {
  try {
    const data = await fetchRealMiningData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching real mining data, using fallback:', error);
    const fallback = generateFallbackData();
    return NextResponse.json(fallback);
  }
}
