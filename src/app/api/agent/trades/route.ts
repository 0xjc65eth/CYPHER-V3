import { NextRequest, NextResponse } from 'next/server';

// Lazy require to avoid webpack async chunk splitting issues
function getModules() {
  const { getAgentPersistence } = require('@/agent/persistence') as any;
  const { getOrchestrator } = require('@/agent/core/AgentOrchestrator') as any;
  return { getAgentPersistence, getOrchestrator };
}

/**
 * GET /api/agent/trades
 *
 * Returns paginated trade history from the database.
 *
 * Query params:
 *   ?limit=50       - page size (default 50, max 200)
 *   ?offset=0       - pagination offset
 *   ?pair=BTC-PERP  - filter by pair
 *   ?strategy=scalp - filter by strategy (scalp, mm, lp, spot)
 *   ?status=open    - filter by status (open, closed, cancelled)
 *   ?exchange=hyperliquid - filter by exchange
 *   ?from=1700000000000   - start timestamp (ms)
 *   ?to=1700100000000     - end timestamp (ms)
 */
export async function GET(request: NextRequest) {
  try {
    const { getAgentPersistence, getOrchestrator } = getModules();
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const pair = url.searchParams.get('pair');
    const strategy = url.searchParams.get('strategy');
    const status = url.searchParams.get('status');
    const exchange = url.searchParams.get('exchange');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const persistence = getAgentPersistence();
    const orchestrator = getOrchestrator() as any;
    const configId = (orchestrator as any).configId;

    if (!configId) {
      // Return in-memory trade history if no DB config
      const inMemoryTrades = orchestrator.getTradeHistory();
      return NextResponse.json({
        success: true,
        trades: inMemoryTrades.slice(offset, offset + limit),
        total: inMemoryTrades.length,
        source: 'memory',
      });
    }

    // Get all trades for this config
    let trades = await persistence.getTradeHistory(configId, limit + offset);

    // Apply filters
    if (pair) {
      trades = trades.filter((t: any) => t.pair === pair);
    }
    if (strategy) {
      trades = trades.filter((t: any) => t.strategy === strategy);
    }
    if (status) {
      trades = trades.filter((t: any) => t.status === status);
    }
    if (exchange) {
      trades = trades.filter((t: any) => t.exchange === exchange);
    }
    if (from) {
      const fromTs = parseInt(from);
      trades = trades.filter((t: any) => new Date(t.created_at).getTime() >= fromTs);
    }
    if (to) {
      const toTs = parseInt(to);
      trades = trades.filter((t: any) => new Date(t.created_at).getTime() <= toTs);
    }

    // Paginate
    const paginatedTrades = trades.slice(offset, offset + limit);

    // Calculate summary stats
    const openTrades = trades.filter((t: any) => t.status === 'open');
    const closedTrades = trades.filter((t: any) => t.status === 'closed');
    const totalPnl = closedTrades.reduce((sum: number, t: any) => sum + (t.realized_pnl || 0), 0);
    const winCount = closedTrades.filter((t: any) => (t.realized_pnl || 0) > 0).length;

    return NextResponse.json({
      success: true,
      trades: paginatedTrades,
      pagination: {
        limit,
        offset,
        total: trades.length,
        hasMore: offset + limit < trades.length,
      },
      summary: {
        totalTrades: trades.length,
        openTrades: openTrades.length,
        closedTrades: closedTrades.length,
        totalPnl,
        winRate: closedTrades.length > 0 ? winCount / closedTrades.length : 0,
      },
      source: 'database',
    });
  } catch (error) {
    console.error('[Agent Trades API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get trade history' },
      { status: 500 }
    );
  }
}
