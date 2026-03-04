import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/api-middleware';

const consensusRateLimit = rateLimit({ windowMs: 60000, maxRequests: 20 });

// Lazy require to avoid webpack async chunk splitting issues
function getModules() {
  const { getConsensusEngine } = require('@/agent/consensus/ConsensusEngine') as any;
  const { getAgentPersistence } = require('@/agent/persistence') as any;
  const { getOrchestrator } = require('@/agent/core/AgentOrchestrator') as any;
  return { getConsensusEngine, getAgentPersistence, getOrchestrator };
}

/**
 * GET /api/agent/consensus
 *
 * Returns recent consensus decisions from the database.
 *
 * Query params:
 *   ?limit=20      - number of decisions (default 20, max 100)
 *   ?pair=BTC-PERP  - filter by pair
 *   ?approved=true  - filter by approval status
 */
export async function GET(request: NextRequest) {
  try {
    const rl = consensusRateLimit(request);
    if (rl) return rl;

    const { getAgentPersistence, getOrchestrator } = getModules();
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const pair = url.searchParams.get('pair');
    const approvedParam = url.searchParams.get('approved');

    const persistence = getAgentPersistence();
    const orchestrator = getOrchestrator();
    const configId = (orchestrator as any).configId;

    if (!configId) {
      return NextResponse.json({
        success: true,
        decisions: [],
        message: 'No agent config active',
      });
    }

    let decisions = await persistence.getRecentConsensusDecisions(configId, limit);

    // Apply filters
    if (pair) {
      decisions = decisions.filter((d: any) => d.pair === pair);
    }
    if (approvedParam !== null) {
      const approved = approvedParam === 'true';
      decisions = decisions.filter((d: any) => d.approved === approved);
    }

    return NextResponse.json({
      success: true,
      decisions,
      total: decisions.length,
    });
  } catch (error) {
    console.error('[Agent Consensus API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get consensus decisions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent/consensus
 *
 * Trigger a manual consensus evaluation for a given pair.
 *
 * Body:
 *   {
 *     pair: "BTC-PERP",
 *     exchange: "hyperliquid",
 *     direction: "long",
 *     entry: 65000,
 *     stopLoss: 64000,
 *     takeProfit: [67000, 68000],
 *     positionSizeUSD: 1000,
 *     leverage: 5,
 *     strategy: "scalp"
 *   }
 *
 * OR:
 *   { action: "set_weights", weights: { technical: 0.35, risk: 0.30, llm: 0.20, sentiment: 0.15 } }
 */
export async function POST(request: NextRequest) {
  try {
    const rl = consensusRateLimit(request);
    if (rl) return rl;

    const { getConsensusEngine, getOrchestrator } = getModules();
    const body = await request.json();

    if (body.action === 'set_weights') {
      const consensus = getConsensusEngine();
      consensus.updateConfig({ weights: body.weights });
      return NextResponse.json({
        success: true,
        message: 'Consensus weights updated',
        weights: body.weights,
      });
    }

    // Manual proposal evaluation
    const { pair, exchange, direction, entry, stopLoss, takeProfit, positionSizeUSD, leverage, strategy } = body;

    if (!pair || !direction || !entry) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: pair, direction, entry' },
        { status: 400 }
      );
    }

    const consensus = getConsensusEngine();
    const orchestrator = getOrchestrator();

    const proposal = {
      pair,
      exchange: exchange || 'hyperliquid',
      direction,
      entry,
      stopLoss: stopLoss || entry * (direction === 'long' ? 0.98 : 1.02),
      takeProfit: takeProfit || [entry * (direction === 'long' ? 1.03 : 0.97)],
      positionSizeUSD: positionSizeUSD || 1000,
      leverage: leverage || 1,
      strategy: strategy || 'scalp',
      confidence: 0.7,
    };

    // Fetch candles from the connector
    const connector = orchestrator.getConnector(proposal.exchange);
    let candles: any[] = [];
    if (connector) {
      candles = await (connector as any).getCandles(pair, '5m', 100);
    }

    const state = orchestrator.getState();
    const result = await consensus.evaluateProposal(
      proposal,
      candles,
      undefined,
      {
        totalEquity: state.performance.totalPnl + 10000,
        openPositions: state.positions,
        performance: state.performance,
        riskLimits: orchestrator.getConfig().riskLimits,
      }
    );

    return NextResponse.json({
      success: true,
      result: {
        approved: result.approved,
        confidence: result.confidence,
        direction: result.direction,
        positionSize: result.positionSize,
        reasoning: result.reasoning,
        votes: result.votes,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[Agent Consensus API] POST error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
