import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/api-middleware';

const lpRateLimit = rateLimit({ windowMs: 60000, maxRequests: 20 });

// Lazy dynamic import for ESM compatibility
async function getModules() {
  const [persistenceMod, orchestratorMod] = await Promise.all([
    import('@/agent/persistence'),
    import('@/agent/core/AgentOrchestrator'),
  ]);
  return {
    getAgentPersistence: persistenceMod.getAgentPersistence,
    getOrchestrator: orchestratorMod.getOrchestrator,
  };
}

/**
 * GET /api/agent/lp-positions
 *
 * Returns LP positions (on-chain + persisted).
 *
 * Query params:
 *   ?active=true   - only active positions (default true)
 *   ?protocol=raydium - filter by protocol
 */
export async function GET(request: NextRequest) {
  try {
    const rl = lpRateLimit(request);
    if (rl) return rl;

    const { getAgentPersistence, getOrchestrator } = await getModules();
    const url = new URL(request.url);
    const walletAddress = url.searchParams.get('walletAddress') || 'default';
    const activeOnly = url.searchParams.get('active') !== 'false';
    const protocol = url.searchParams.get('protocol');

    const orchestrator = getOrchestrator(walletAddress);
    const persistence = getAgentPersistence();
    const configId = (orchestrator as any).configId;

    // Get in-memory LP positions from orchestrator state
    const state = orchestrator.getState();
    let positions = [...state.lpPositions];

    // Also get persisted LP positions from DB
    if (configId) {
      try {
        const dbPositions = await persistence.getActiveLPPositions(configId);
        // Merge: prefer in-memory for active, DB for history
        for (const dbPos of dbPositions) {
          const exists = positions.find(
            (p: any) => p.pair === dbPos.pair && p.protocol === dbPos.protocol
          );
          if (!exists) {
            positions.push(dbPos as any);
          }
        }
      } catch {
        // DB fetch is optional
      }
    }

    // Apply filters
    if (activeOnly) {
      positions = positions.filter((p: any) => p.inRange !== false);
    }
    if (protocol) {
      positions = positions.filter((p: any) => p.protocol === protocol);
    }

    // Calculate aggregated LP stats
    const totalValueUSD = positions.reduce((sum: number, p: any) => sum + (p.valueUSD || 0), 0);
    const totalFeesEarned = positions.reduce((sum: number, p: any) => sum + (p.feesEarnedUSD || 0), 0);
    const totalIL = positions.reduce((sum: number, p: any) => sum + (p.impermanentLoss || 0), 0);

    return NextResponse.json({
      success: true,
      positions,
      total: positions.length,
      stats: {
        totalValueUSD,
        totalFeesEarned,
        totalImpermanentLoss: totalIL,
        netPnl: totalFeesEarned - Math.abs(totalIL),
      },
    });
  } catch (error) {
    console.error('[Agent LP Positions API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get LP positions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent/lp-positions
 *
 * Create a new LP position (triggers connector to deploy liquidity on-chain).
 *
 * Body:
 *   {
 *     pair: "SOL/USDC",
 *     protocol: "raydium",
 *     exchange: "jupiter",
 *     amountUSD: 5000,
 *     rangeWidth: 0.05,      // 5% range width
 *     feeTier: 0.003          // 30bps
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const rl = lpRateLimit(request);
    if (rl) return rl;

    const { getAgentPersistence, getOrchestrator } = await getModules();
    const body = await request.json();
    const { pair, protocol, exchange, amountUSD, feeTier, walletAddress } = body;

    if (!pair || !protocol || !amountUSD) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: pair, protocol, amountUSD' },
        { status: 400 }
      );
    }

    const orchestrator = getOrchestrator(walletAddress || 'default');
    const connector = orchestrator.getConnector(exchange || protocol);

    if (!connector || !('createLPPosition' in connector)) {
      return NextResponse.json(
        { success: false, error: `LP not supported on ${exchange || protocol}` },
        { status: 400 }
      );
    }

    // Create LP position via the connector
    const result = await (connector as any).createLPPosition({
      pair,
      amountA: amountUSD / 2,
      amountB: amountUSD / 2,
      priceLower: 0, // Will be calculated by connector based on current price + rangeWidth
      priceUpper: 0,
      feeTier: feeTier || 0.003,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create LP position' },
        { status: 500 }
      );
    }

    // Persist to database
    const persistence = getAgentPersistence();
    const configId = (orchestrator as any).configId;
    if (configId) {
      await persistence.saveLPPosition({
        agent_config_id: configId,
        pair,
        protocol,
        chain: exchange || protocol,
        on_chain_id: result.positionId || '',
        token0_amount: amountUSD / 2,
        token1_amount: amountUSD / 2,
        tick_lower: result.tickLower || 0,
        tick_upper: result.tickUpper || 0,
        fee_tier: feeTier || 0.003,
        status: 'active',
      });
    }

    return NextResponse.json({
      success: true,
      position: {
        positionId: result.positionId,
        pair,
        protocol,
        amountUSD,
        txHash: result.txHash,
      },
      message: 'LP position created successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[Agent LP Positions API] POST error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agent/lp-positions
 *
 * Close/remove an LP position.
 *
 * Body:
 *   { positionId: "...", exchange: "jupiter" }
 */
export async function DELETE(request: NextRequest) {
  try {
    const rl = lpRateLimit(request);
    if (rl) return rl;

    const { getAgentPersistence, getOrchestrator } = await getModules();
    const body = await request.json();
    const { positionId, exchange, walletAddress } = body;

    if (!positionId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: positionId' },
        { status: 400 }
      );
    }

    const orchestrator = getOrchestrator(walletAddress || 'default');
    const connector = orchestrator.getConnector(exchange || 'jupiter');

    if (connector && 'closeLPPosition' in connector) {
      const result = await (connector as any).closeLPPosition(positionId);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'Failed to close LP position' },
          { status: 500 }
        );
      }
    }

    // Update in database
    const persistence = getAgentPersistence();
    const configId = (orchestrator as any).configId;
    if (configId) {
      await persistence.updateLPPosition(positionId, { status: 'closed' });
    }

    return NextResponse.json({
      success: true,
      message: `LP position ${positionId} closed`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[Agent LP Positions API] DELETE error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
