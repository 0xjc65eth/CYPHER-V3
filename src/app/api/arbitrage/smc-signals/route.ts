/**
 * SMC Signals API
 * Fetch Smart Money Concepts signals (Order Blocks, Fair Value Gaps, etc.)
 * GET /api/arbitrage/smc-signals?asset=BTC/USDT&timeframe=1h&type=order_block
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/database/db-service';
import { cache } from '@/lib/cache/redis.config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const asset = searchParams.get('asset') || 'BTC/USDT';
    const timeframe = searchParams.get('timeframe') || '1h';
    const signalType = searchParams.get('type'); // 'order_block', 'fair_value_gap', etc.
    const activeOnly = searchParams.get('active') !== 'false'; // Default true

    // Check cache first
    const cacheKey = `smc:${asset}:${timeframe}:${signalType || 'all'}:${activeOnly}`;
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        try {
          return NextResponse.json(JSON.parse(cached));
        } catch (e) {
          // Invalid cache, continue to DB
        }
      }
    } catch {
      // Cache unavailable, continue without cache
    }

    // Query database using Supabase client (gracefully handle missing table)
    let dbRows: any[] = [];
    try {
      const client = dbService.getClient();
      let queryBuilder = client
        .from('smc_signals')
        .select('*')
        .eq('asset', asset)
        .eq('timeframe', timeframe)
        .order('created_at', { ascending: false })
        .limit(100);

      if (signalType) {
        queryBuilder = queryBuilder.eq('signal_type', signalType);
      }

      if (activeOnly) {
        queryBuilder = queryBuilder.eq('is_active', true).or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
      }

      const { data, error: dbError } = await queryBuilder;
      if (!dbError && data) {
        dbRows = data;
      }
    } catch (dbError) {
      // Table might not exist - fall through to real-time detection
    }

    // If no results, fetch candles and detect signals in real-time
    if (dbRows.length === 0) {
      try {
        // No SMC signals in DB - fetch candlesticks and detect in real-time

        // Fetch candlesticks from Binance
        const binanceSymbol = asset.replace('/', '');
        const intervalMap: Record<string, string> = {
          '1m': '1m', '5m': '5m', '15m': '15m',
          '1h': '1h', '4h': '4h', '1d': '1d'
        };
        const interval = intervalMap[timeframe] || '1h';

        const binanceRes = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=100`,
          { signal: AbortSignal.timeout(10000) }
        );

        if (!binanceRes.ok) throw new Error('Failed to fetch candlesticks');

        const klines = await binanceRes.json();
        const candles = klines.map((k: any) => ({
          timestamp: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5])
        }));

        // Import and run SMC detector
        const { smcDetector } = await import('@/services/arbitrage/SMCDetector');
        const orderBlocks = smcDetector.detectOrderBlocks(candles, asset, timeframe);
        const fairValueGaps = smcDetector.detectFairValueGaps(candles, asset, timeframe);

        // Save to database (async, don't wait)
        smcDetector.saveSignals(orderBlocks, fairValueGaps).catch(console.error);

        // Return detected signals immediately
        const response = {
          asset,
          timeframe,
          signals: {
            order_block: (orderBlocks || []).map((ob: any) => ({
              id: ob.id,
              asset: ob.asset,
              timeframe: ob.timeframe,
              type: 'order_block',
              direction: ob.type,
              price: ob.price ?? 0,
              high: ob.high ?? 0,
              low: ob.low ?? 0,
              strength: ob.strength ?? 0,
              volume: ob.volume ?? 0,
              fillProbability: ob.fillProbability ?? 0,
              distancePercent: ob.distancePercent ?? 0,
              isActive: true,
              createdAt: ob.timestamp ? new Date(ob.timestamp).toISOString() : new Date().toISOString(),
              expiresAt: ob.expiresAt ? new Date(ob.expiresAt).toISOString() : null,
              metadata: null
            })),
            fair_value_gap: (fairValueGaps || []).map((fvg: any) => ({
              id: fvg.id,
              asset: fvg.asset,
              timeframe: fvg.timeframe,
              type: 'fair_value_gap',
              direction: fvg.type,
              price: ((fvg.high ?? 0) + (fvg.low ?? 0)) / 2,
              high: fvg.high ?? 0,
              low: fvg.low ?? 0,
              strength: null,
              volume: null,
              fillProbability: fvg.fillProbability ?? 0,
              distancePercent: null,
              isActive: true,
              createdAt: fvg.timestamp ? new Date(fvg.timestamp).toISOString() : new Date().toISOString(),
              expiresAt: null,
              metadata: { gapSize: fvg.gapSize ?? 0, fillPercentage: fvg.fillPercentage ?? 0 }
            }))
          },
          orderBlocks: orderBlocks.map((ob: any) => ({
            id: ob.id,
            asset: ob.asset,
            timeframe: ob.timeframe,
            type: ob.type,
            price: ob.price,
            high: ob.high,
            low: ob.low,
            strength: ob.strength,
            volume: ob.volume,
            fillProbability: ob.fillProbability,
            distancePercent: ob.distancePercent,
            createdAt: ob.timestamp ? new Date(ob.timestamp).toISOString() : new Date().toISOString(),
            expiresAt: ob.expiresAt ? new Date(ob.expiresAt).toISOString() : null
          })),
          fairValueGaps: fairValueGaps || [],
          liquidityZones: [],
          marketStructure: [],
          breakerBlocks: [],
          totalSignals: (orderBlocks?.length || 0) + (fairValueGaps?.length || 0),
          timestamp: Date.now(),
          source: 'real-time-detection'
        };

        // Cache for 60 seconds (non-blocking)
        cache.setex(cacheKey, 60, JSON.stringify(response)).catch(() => {});

        return NextResponse.json(response);
      } catch (detectionError) {
        console.error('Real-time SMC detection failed:', detectionError);
        // Fall through to return empty result from database
      }
    }

    // Group by signal type
    const grouped = dbRows.reduce((acc: any, signal: any) => {
      const type = signal.signal_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push({
        id: signal.id,
        asset: signal.asset,
        timeframe: signal.timeframe,
        type: signal.signal_type,
        direction: signal.direction,
        price: parseFloat(signal.price),
        high: signal.high ? parseFloat(signal.high) : null,
        low: signal.low ? parseFloat(signal.low) : null,
        strength: signal.strength,
        volume: signal.volume ? parseFloat(signal.volume) : null,
        fillProbability: signal.fill_probability,
        distancePercent: signal.distance_percent ? parseFloat(signal.distance_percent) : null,
        isActive: signal.is_active,
        createdAt: signal.created_at,
        expiresAt: signal.expires_at,
        metadata: signal.metadata
      });
      return acc;
    }, {});

    const response = {
      asset,
      timeframe,
      signals: grouped,
      orderBlocks: grouped.order_block || [],
      fairValueGaps: grouped.fair_value_gap || [],
      liquidityZones: grouped.liquidity_zone || [],
      marketStructure: grouped.market_structure || [],
      breakerBlocks: grouped.breaker_block || [],
      totalSignals: dbRows.length,
      timestamp: Date.now()
    };

    // Cache for 60 seconds (non-blocking)
    cache.setex(cacheKey, 60, JSON.stringify(response)).catch(() => {});

    return NextResponse.json(response);

  } catch (error) {
    console.error('SMC Signals API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST: Manually trigger SMC detection (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { asset, timeframe, candles } = body;

    if (!asset || !timeframe || !candles || !Array.isArray(candles)) {
      return NextResponse.json(
        { error: 'Missing required fields: asset, timeframe, candles' },
        { status: 400 }
      );
    }

    // Import SMC detector
    const { smcDetector } = await import('@/services/arbitrage/SMCDetector');

    // Detect signals
    const orderBlocks = smcDetector.detectOrderBlocks(candles, asset, timeframe);
    const fairValueGaps = smcDetector.detectFairValueGaps(candles, asset, timeframe);
    const marketStructure = smcDetector.detectMarketStructure(candles);

    // Save to database
    await smcDetector.saveSignals(orderBlocks, fairValueGaps);

    // Invalidate cache
    const cacheKey = `smc:${asset}:${timeframe}:*`;
    // Note: Would need a wildcard delete function for Redis

    return NextResponse.json({
      success: true,
      detected: {
        orderBlocks: orderBlocks.length,
        fairValueGaps: fairValueGaps.length,
        marketStructure
      },
      signals: {
        orderBlocks,
        fairValueGaps,
        marketStructure
      }
    });

  } catch (error) {
    console.error('SMC detection error:', error);
    return NextResponse.json(
      {
        error: 'Failed to detect SMC signals',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
