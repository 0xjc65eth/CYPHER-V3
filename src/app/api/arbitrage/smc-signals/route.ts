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

    // Build query
    let query = `
      SELECT * FROM smc_signals
      WHERE asset = $1 AND timeframe = $2
    `;
    const params: any[] = [asset, timeframe];

    if (signalType) {
      params.push(signalType);
      query += ` AND signal_type = $${params.length}`;
    }

    if (activeOnly) {
      query += ` AND is_active = true`;
      query += ` AND (expires_at IS NULL OR expires_at > NOW())`;
    }

    query += ` ORDER BY created_at DESC LIMIT 100`;

    // Check cache first
    const cacheKey = `smc:${asset}:${timeframe}:${signalType || 'all'}:${activeOnly}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      try {
        return NextResponse.json(JSON.parse(cached));
      } catch (e) {
        // Invalid cache, continue to DB
      }
    }

    // Query database
    let result = await dbService.query(query, params);

    // If no results, fetch candles and detect signals in real-time
    if (result.rows.length === 0) {
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
            order_block: orderBlocks.map((ob: any) => ({
              id: ob.id,
              asset: ob.asset,
              timeframe: ob.timeframe,
              type: 'order_block',
              direction: ob.type,
              price: ob.price,
              high: ob.high,
              low: ob.low,
              strength: ob.strength,
              volume: ob.volume,
              fillProbability: ob.fillProbability,
              distancePercent: ob.distancePercent,
              isActive: true,
              createdAt: new Date(ob.timestamp).toISOString(),
              expiresAt: new Date(ob.expiresAt).toISOString(),
              metadata: null
            })),
            fair_value_gap: fairValueGaps.map((fvg: any) => ({
              id: fvg.id,
              asset: fvg.asset,
              timeframe: fvg.timeframe,
              type: 'fair_value_gap',
              direction: fvg.type,
              price: (fvg.high + fvg.low) / 2,
              high: fvg.high,
              low: fvg.low,
              strength: null,
              volume: null,
              fillProbability: fvg.fillProbability,
              distancePercent: null,
              isActive: true,
              createdAt: new Date(fvg.timestamp).toISOString(),
              expiresAt: null,
              metadata: { gapSize: fvg.gapSize, fillPercentage: fvg.fillPercentage }
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
            createdAt: new Date(ob.timestamp).toISOString(),
            expiresAt: new Date(ob.expiresAt).toISOString()
          })),
          fairValueGaps: fairValueGaps,
          liquidityZones: [],
          marketStructure: [],
          breakerBlocks: [],
          totalSignals: orderBlocks.length + fairValueGaps.length,
          timestamp: Date.now(),
          source: 'real-time-detection'
        };

        // Cache for 60 seconds
        await cache.setex(cacheKey, 60, JSON.stringify(response));

        return NextResponse.json(response);
      } catch (detectionError) {
        console.error('Real-time SMC detection failed:', detectionError);
        // Fall through to return empty result from database
      }
    }

    // Group by signal type
    const grouped = result.rows.reduce((acc: any, signal: any) => {
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
      totalSignals: result.rows.length,
      timestamp: Date.now()
    };

    // Cache for 60 seconds
    await cache.setex(cacheKey, 60, JSON.stringify(response));

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
