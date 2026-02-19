import { NextRequest, NextResponse } from 'next/server';
import { bitcoinAddressSchema } from '@/lib/validation/schemas';
import { cacheInstances } from '@/lib/cache/advancedCache';
import { applyRateLimit, apiRateLimiters } from '@/lib/api/middleware/rateLimiter';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(request, apiRateLimiters.portfolio);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const timeframe = searchParams.get('timeframe') || '30D'; // '1D', '7D', '30D', '90D', '1Y', 'ALL'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // 'all', 'buy', 'sell', 'mint', etc.

    // If timeframe is provided, return portfolio value history (snapshots)
    if (timeframe && !type) {
      return getPortfolioValueHistory(request, address, timeframe);
    }

    if (!address) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Address parameter is required' 
        },
        { status: 400 }
      );
    }

    // Validate Bitcoin address
    const addressValidation = bitcoinAddressSchema.safeParse(address);
    if (!addressValidation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid Bitcoin address format' 
        },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `portfolio-history:${address}:${limit}:${offset}:${type || 'all'}`;
    let historyData = await cacheInstances.portfolio.get(cacheKey);

    if (!historyData) {
      historyData = await fetchPortfolioHistory(address, limit, offset, type);
      
      // Cache for 5 minutes
      await cacheInstances.portfolio.set(cacheKey, historyData, {
        ttl: 300,
        tags: ['portfolio', 'history', address]
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      address,
      data: historyData,
      pagination: {
        limit,
        offset,
        total: historyData.total,
        hasMore: (offset + limit) < historyData.total
      }
    });

  } catch (error) {
    console.error('Portfolio history API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch portfolio history',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function fetchPortfolioHistory(
  address: string, 
  limit: number, 
  offset: number, 
  type?: string | null
) {
  // Mock transaction history - in production, this would query the database
  const allTransactions = [
    {
      id: 'tx_001',
      type: 'buy',
      asset: 'BTC',
      assetType: 'bitcoin',
      amount: 0.5,
      price: 95000,
      value: 47500,
      fee: 25,
      timestamp: new Date('2024-01-15T10:30:00Z'),
      txHash: 'abc123def456...',
      status: 'confirmed',
      blockHeight: 825000,
      from: null,
      to: address,
      metadata: {
        exchange: 'binance',
        orderType: 'market'
      }
    },
    {
      id: 'tx_002',
      type: 'mint',
      asset: 'SATOSHI•NAKAMOTO',
      assetType: 'rune',
      amount: 1000000,
      price: 0.005,
      value: 5000,
      fee: 50,
      timestamp: new Date('2024-01-14T15:45:00Z'),
      txHash: 'def456ghi789...',
      status: 'confirmed',
      blockHeight: 824900,
      from: null,
      to: address,
      metadata: {
        runeId: '2:1',
        mintingBlock: 824900
      }
    },
    {
      id: 'tx_003',
      type: 'buy',
      asset: 'Bitcoin Punk #1234',
      assetType: 'ordinal',
      amount: 1,
      price: 15000,
      value: 15000,
      fee: 100,
      timestamp: new Date('2024-01-12T09:20:00Z'),
      txHash: 'ghi789jkl012...',
      status: 'confirmed',
      blockHeight: 824800,
      from: 'bc1qselleraddress...',
      to: address,
      metadata: {
        inscriptionId: 'abc123def456',
        marketplace: 'magiceden',
        collectionName: 'Bitcoin Punks'
      }
    },
    {
      id: 'tx_004',
      type: 'receive',
      asset: 'ORDI',
      assetType: 'brc20',
      amount: 500,
      price: 25,
      value: 12500,
      fee: 0,
      timestamp: new Date('2024-01-10T14:30:00Z'),
      txHash: 'jkl012mno345...',
      status: 'confirmed',
      blockHeight: 824700,
      from: 'bc1qsenderaddress...',
      to: address,
      metadata: {
        tokenStandard: 'BRC-20',
        transferReason: 'gift'
      }
    },
    {
      id: 'tx_005',
      type: 'sell',
      asset: 'PEPE',
      assetType: 'brc20',
      amount: 1000,
      price: 0.5,
      value: 500,
      fee: 15,
      timestamp: new Date('2024-01-08T11:15:00Z'),
      txHash: 'mno345pqr678...',
      status: 'confirmed',
      blockHeight: 824600,
      from: address,
      to: 'bc1qbuyeraddress...',
      metadata: {
        tokenStandard: 'BRC-20',
        marketplace: 'unisat'
      }
    }
  ];

  // Filter by type if specified
  let filteredTransactions = allTransactions;
  if (type && type !== 'all') {
    filteredTransactions = allTransactions.filter(tx => tx.type === type);
  }

  // Sort by timestamp (newest first)
  filteredTransactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Apply pagination
  const total = filteredTransactions.length;
  const paginatedTransactions = filteredTransactions.slice(offset, offset + limit);

  // Calculate summary statistics
  const summary = {
    totalTransactions: total,
    totalValue: filteredTransactions.reduce((sum, tx) => sum + tx.value, 0),
    totalFees: filteredTransactions.reduce((sum, tx) => sum + tx.fee, 0),
    typeDistribution: getTypeDistribution(filteredTransactions),
    assetDistribution: getAssetDistribution(filteredTransactions),
    timeRange: {
      earliest: filteredTransactions[filteredTransactions.length - 1]?.timestamp || null,
      latest: filteredTransactions[0]?.timestamp || null
    }
  };

  return {
    transactions: paginatedTransactions,
    total,
    summary
  };
}

function getTypeDistribution(transactions: any[]) {
  const distribution: Record<string, number> = {};
  transactions.forEach(tx => {
    distribution[tx.type] = (distribution[tx.type] || 0) + 1;
  });
  return distribution;
}

function getAssetDistribution(transactions: any[]) {
  const distribution: Record<string, { count: number; value: number }> = {};
  transactions.forEach(tx => {
    if (!distribution[tx.asset]) {
      distribution[tx.asset] = { count: 0, value: 0 };
    }
    distribution[tx.asset].count += 1;
    distribution[tx.asset].value += tx.value;
  });
  return distribution;
}

/**
 * Get portfolio value history (snapshots over time)
 */
async function getPortfolioValueHistory(
  request: NextRequest,
  address: string | null,
  timeframe: string
) {
  if (!address) {
    return NextResponse.json(
      { success: false, error: 'Address parameter is required' },
      { status: 400 }
    );
  }

  // Validate Bitcoin address
  const addressValidation = bitcoinAddressSchema.safeParse(address);
  if (!addressValidation.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid Bitcoin address format' },
      { status: 400 }
    );
  }

  // Check cache
  const cacheKey = `portfolio-value-history:${address}:${timeframe}`;
  let historyData = await cacheInstances.portfolio.get(cacheKey);

  if (!historyData) {
    historyData = await generatePortfolioValueHistory(address, timeframe);

    // Cache for 5 minutes
    await cacheInstances.portfolio.set(cacheKey, historyData, {
      ttl: 300,
      tags: ['portfolio', 'history', 'value', address]
    });
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    address,
    timeframe,
    data: historyData
  });
}

/**
 * Generate portfolio value snapshots over time
 */
async function generatePortfolioValueHistory(address: string, timeframe: string) {
  // Calculate time range
  const now = Date.now();
  const timeRanges: Record<string, number> = {
    '1D': 24 * 60 * 60 * 1000,
    '7D': 7 * 24 * 60 * 60 * 1000,
    '30D': 30 * 24 * 60 * 60 * 1000,
    '90D': 90 * 24 * 60 * 60 * 1000,
    '1Y': 365 * 24 * 60 * 60 * 1000,
    'ALL': 2 * 365 * 24 * 60 * 60 * 1000, // 2 years max
  };

  const timeRange = timeRanges[timeframe] || timeRanges['30D'];
  const startTime = now - timeRange;

  // Determine interval based on timeframe
  const intervals: Record<string, number> = {
    '1D': 60 * 60 * 1000, // 1 hour intervals
    '7D': 4 * 60 * 60 * 1000, // 4 hour intervals
    '30D': 24 * 60 * 60 * 1000, // 1 day intervals
    '90D': 24 * 60 * 60 * 1000, // 1 day intervals
    '1Y': 7 * 24 * 60 * 60 * 1000, // 1 week intervals
    'ALL': 7 * 24 * 60 * 60 * 1000, // 1 week intervals
  };

  const interval = intervals[timeframe] || intervals['30D'];

  // Generate snapshots
  const snapshots: any[] = [];
  const btcPriceBase = 97000; // Current BTC price (would fetch real price)

  for (let time = startTime; time <= now; time += interval) {
    // Simulate portfolio value growth with some volatility
    const daysSinceStart = (time - startTime) / (24 * 60 * 60 * 1000);
    const growthFactor = 1 + (daysSinceStart * 0.001); // 0.1% growth per day
    const volatility = 1 + (Math.sin(time / (24 * 60 * 60 * 1000)) * 0.05); // ±5% volatility

    const baseValue = 100000; // Starting portfolio value
    const btcPrice = btcPriceBase * volatility;

    const btcValue = (baseValue * 0.4) * growthFactor * volatility;
    const ordinalsValue = (baseValue * 0.3) * growthFactor * volatility * 1.2; // Ordinals growing faster
    const runesValue = (baseValue * 0.2) * growthFactor * volatility * 1.3; // Runes growing even faster
    const rareSatsValue = (baseValue * 0.1) * growthFactor * volatility;

    snapshots.push({
      timestamp: time,
      totalValue: btcValue + ordinalsValue + runesValue + rareSatsValue,
      btcValue,
      ordinalsValue,
      runesValue,
      rareSatsValue,
      btcPrice,
    });
  }

  // Calculate metrics
  const startValue = snapshots[0]?.totalValue || 0;
  const endValue = snapshots[snapshots.length - 1]?.totalValue || 0;
  const peak = Math.max(...snapshots.map(s => s.totalValue));
  const trough = Math.min(...snapshots.map(s => s.totalValue));

  const totalReturn = endValue - startValue;
  const totalReturnPercentage = startValue > 0 ? ((totalReturn / startValue) * 100) : 0;

  // Calculate volatility (standard deviation of returns)
  const returns = snapshots.slice(1).map((s, i) => {
    const prevValue = snapshots[i].totalValue;
    return ((s.totalValue - prevValue) / prevValue) * 100;
  });
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);

  return {
    snapshots,
    timeframe,
    totalReturn,
    totalReturnPercentage,
    startValue,
    endValue,
    peak,
    trough,
    volatility,
  };
}