/**
 * Arbitrage System Health Check Endpoint
 * Checks CCXT exchanges, WebSocket aggregator, and database connectivity
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      services: {}
    };

    // Check CCXT Integration
    try {
      const { ccxtIntegration } = await import('@/services/arbitrage/CCXTIntegration');
      const exchangeHealth = await ccxtIntegration.healthCheck();
      const exchanges = ccxtIntegration.getExchanges();

      results.services.ccxt = {
        status: 'operational',
        totalExchanges: exchanges.length,
        onlineExchanges: Object.values(exchangeHealth).filter(Boolean).length,
        health: exchangeHealth
      };
    } catch (error) {
      results.services.ccxt = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Check WebSocket Aggregator
    try {
      const { wsAggregator } = await import('@/services/arbitrage/WebSocketAggregator');
      const wsHealth = await wsAggregator.healthCheck();

      results.services.websocket = {
        status: wsHealth.connected > 0 ? 'operational' : 'degraded',
        connected: wsHealth.connected,
        total: wsHealth.total,
        exchanges: wsHealth.exchanges
      };
    } catch (error) {
      results.services.websocket = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Check Redis Cache
    try {
      const { cache } = await import('@/lib/cache/redis.config');
      await cache.ping();
      results.services.redis = {
        status: 'operational',
        type: cache.constructor.name
      };
    } catch (error) {
      results.services.redis = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Check Database
    try {
      const { dbService } = await import('@/lib/database/db-service');
      const db = await dbService.getClient();
      const result = await (db as any).query('SELECT COUNT(*) FROM arbitrage_opportunities WHERE status = $1', ['active']);

      results.services.database = {
        status: 'operational',
        activeOpportunities: parseInt(result.rows[0].count)
      };
    } catch (error) {
      results.services.database = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Overall health status
    const allOperational = Object.values(results.services).every(
      (service: any) => service.status === 'operational'
    );
    const someOperational = Object.values(results.services).some(
      (service: any) => service.status === 'operational'
    );

    results.overall = allOperational ? 'healthy' : someOperational ? 'degraded' : 'unhealthy';

    return NextResponse.json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    return NextResponse.json(
      {
        success: false,
        overall: 'unhealthy',
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
