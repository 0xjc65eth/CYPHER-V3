/**
 * TRADING BOT STATUS API
 * Connects to real AgentOrchestrator when available.
 * Returns honest zeros when agent is offline.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withMiddleware,
  createSuccessResponse,
  createErrorResponse,
  corsHeaders
} from '@/lib/api-middleware';

// Try to get real agent state
async function getAgentStatus() {
  try {
    const { getOrchestrator } = await import('@/agent/core/AgentOrchestrator');
    const orchestrator = getOrchestrator('default');
    const state = orchestrator.getState();
    const perf = state.performance;

    return {
      isActive: state.status === 'active',
      totalTrades: perf.totalTrades,
      successfulTrades: perf.winningTrades,
      winRate: perf.winRate * 100, // convert to percentage
      totalProfit: perf.totalPnl > 0 ? perf.totalPnl : 0,
      totalLoss: perf.totalPnl < 0 ? Math.abs(perf.totalPnl) : 0,
      netProfit: perf.totalPnl,
      currentPositions: state.positions.map(p => ({
        id: `${p.pair}_${p.exchange}`,
        symbol: p.pair,
        side: p.direction === 'long' ? 'LONG' : 'SHORT',
        size: p.size,
        entryPrice: p.entryPrice,
        currentPrice: p.currentPrice,
        unrealizedPnl: p.unrealizedPnl,
        unrealizedPnlPercent: p.entryPrice > 0 ? (p.unrealizedPnl / (p.entryPrice * p.size)) * 100 : 0,
        timestamp: p.openedAt || Date.now(),
        strategy: p.strategy || 'unknown',
      })),
      dailyStats: {
        trades: 0,
        profit: perf.todayPnl,
        winRate: perf.todayPnlPercent * 100,
      },
      weeklyStats: {
        trades: 0,
        profit: perf.weekPnl,
        winRate: perf.weekPnlPercent * 100,
      },
      performance: {
        sharpeRatio: perf.sharpeRatio,
        maxDrawdown: perf.maxDrawdown * 100,
        averageReturn: perf.totalPnlPercent * 100,
        volatility: 0,
      },
      lastSignal: state.recentTrades.length > 0 ? {
        id: state.recentTrades[0].id,
        symbol: state.recentTrades[0].pair,
        action: state.recentTrades[0].direction === 'long' ? 'BUY' : 'SELL',
        confidence: state.recentTrades[0].confidence * 100,
        price: state.recentTrades[0].entry,
        target: state.recentTrades[0].takeProfit,
        stopLoss: state.recentTrades[0].stopLoss,
        reason: state.recentTrades[0].reason,
        timestamp: Date.now(),
        timeframe: '5m',
        strategy: state.recentTrades[0].strategy,
      } : null,
      systemHealth: {
        uptime: state.uptime || 0,
        cpuUsage: 0,
        memoryUsage: 0,
        latency: 0,
        errors: state.errors.length,
      },
      source: state.status === 'active' ? 'agent-orchestrator' : 'agent-idle',
    };
  } catch (err) {
    console.warn('[Trading Bot] Agent orchestrator not available:', err instanceof Error ? err.message : err);
  }

  // Return honest zeros when agent isn't running
  return {
    isActive: false,
    totalTrades: 0,
    successfulTrades: 0,
    winRate: 0,
    totalProfit: 0,
    totalLoss: 0,
    netProfit: 0,
    currentPositions: [],
    dailyStats: { trades: 0, profit: 0, winRate: 0 },
    weeklyStats: { trades: 0, profit: 0, winRate: 0 },
    performance: {
      sharpeRatio: 0,
      maxDrawdown: 0,
      averageReturn: 0,
      volatility: 0,
    },
    lastSignal: null,
    systemHealth: {
      uptime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      latency: 0,
      errors: 0,
    },
    source: 'offline',
  };
}

async function handleTradingBotStatus(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'start' || action === 'stop') {
      try {
        const { getOrchestrator } = await import('@/agent/core/AgentOrchestrator');
        const orchestrator = getOrchestrator('default');
        if (action === 'start') {
          await orchestrator.start();
        } else {
          await orchestrator.stop();
        }
        return NextResponse.json(
          createSuccessResponse({ status: action === 'start' ? 'started' : 'stopped' }),
          { headers: corsHeaders }
        );
      } catch (err) {
        return NextResponse.json(
          createErrorResponse('Agent not available'),
          { status: 503, headers: corsHeaders }
        );
      }
    }

    const status = await getAgentStatus();

    return NextResponse.json(
      createSuccessResponse({
        ...status,
        timestamp: Date.now(),
        version: '2.0.0',
      }, 'Trading bot status retrieved'),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Trading Bot] Status error:', error);
    return NextResponse.json(
      createErrorResponse('Failed to get trading bot status'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export const GET = withMiddleware(handleTradingBotStatus, {
  rateLimit: { windowMs: 60000, maxRequests: 120 },
  cache: { ttl: 5 },
});

export const POST = withMiddleware(handleTradingBotStatus, {
  rateLimit: { windowMs: 60000, maxRequests: 60 },
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
