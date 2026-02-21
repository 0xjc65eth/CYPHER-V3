import { NextRequest, NextResponse } from 'next/server';

// Secure in-memory credential storage (never pollute process.env with user secrets)
const secureCredentials = new Map<string, Record<string, string>>();

// Lazy require to avoid webpack async chunk splitting issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
function getOrchestratorModule() {
  return require('@/agent/core/AgentOrchestrator') as {
    getOrchestrator: (config?: any) => any;
    resetOrchestrator: () => void;
  };
}

/**
 * GET /api/agent
 *
 * Returns agent state, positions, PnL, config, and optionally trade history.
 *
 * Query params:
 *   ?include=trades  - include full trade history
 */
export async function GET(request: NextRequest) {
  try {
    const { getOrchestrator } = getOrchestratorModule();
    const orchestrator = getOrchestrator();
    const state = orchestrator.getState();
    const config = orchestrator.getConfig();
    const performance = orchestrator.getPerformance();

    const url = new URL(request.url);
    const include = url.searchParams.get('include');

    const response: Record<string, any> = {
      success: true,
      state: {
        status: state.status,
        uptime: state.uptime,
        startedAt: state.startedAt,
        positions: state.positions,
        lpPositions: state.lpPositions,
        openOrders: state.openOrders,
        recentTrades: state.recentTrades.slice(0, 20),
        errors: state.errors.slice(-10),
        lastCompound: state.lastCompound,
      },
      performance,
      config,
    };

    if (include === 'trades') {
      response.tradeHistory = orchestrator.getTradeHistory();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Agent API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get agent state' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent
 *
 * Actions:
 *   { action: 'start', config?: Partial<AgentConfig>, credentials?: {...} }
 *   { action: 'stop' }
 *   { action: 'pause' }
 *   { action: 'resume' }
 *   { action: 'emergency_stop' }
 *   { action: 'config', config: Partial<AgentConfig> }
 *   { action: 'status' }
 */
export async function POST(request: NextRequest) {
  try {
    const { getOrchestrator, resetOrchestrator } = getOrchestratorModule();
    const body = await request.json();
    const { action, config, credentials } = body;
    const orchestrator = getOrchestrator();

    switch (action) {
      case 'start': {
        // Store credentials securely in memory (never in process.env)
        if (credentials?.hyperliquid) {
          secureCredentials.set('hyperliquid', {
            agentKey: credentials.hyperliquid.agentKey,
            agentSecret: credentials.hyperliquid.agentSecret,
            testnet: credentials.hyperliquid.testnet ? 'true' : 'false',
          });
        }
        if (credentials?.solanaRpc) {
          secureCredentials.set('solana', { rpcUrl: credentials.solanaRpc });
        }
        if (credentials?.ethRpc) {
          secureCredentials.set('ethereum', { rpcUrl: credentials.ethRpc });
        }

        if (config) {
          orchestrator.updateConfig(config as any);
        }
        await orchestrator.start();
        return NextResponse.json({
          success: true,
          message: 'Agent started',
          state: orchestrator.getState(),
        });
      }

      case 'stop': {
        await orchestrator.stop();
        return NextResponse.json({
          success: true,
          message: 'Agent stopped',
          state: orchestrator.getState(),
        });
      }

      case 'pause': {
        await orchestrator.pause();
        return NextResponse.json({
          success: true,
          message: 'Agent paused',
          state: orchestrator.getState(),
        });
      }

      case 'resume': {
        await orchestrator.resume();
        return NextResponse.json({
          success: true,
          message: 'Agent resumed',
          state: orchestrator.getState(),
        });
      }

      case 'emergency_stop': {
        await orchestrator.emergencyStop();
        return NextResponse.json({
          success: true,
          message: 'Emergency stop executed - all positions closed',
          state: orchestrator.getState(),
        });
      }

      case 'config': {
        if (!config) {
          return NextResponse.json(
            { success: false, error: 'Config object required for config action' },
            { status: 400 }
          );
        }
        orchestrator.updateConfig(config as any);
        return NextResponse.json({
          success: true,
          message: 'Config updated',
          config: orchestrator.getConfig(),
        });
      }

      case 'reset': {
        resetOrchestrator();
        return NextResponse.json({
          success: true,
          message: 'Agent reset - new instance will be created on next call',
        });
      }

      case 'status': {
        return NextResponse.json({
          success: true,
          state: orchestrator.getState(),
          performance: orchestrator.getPerformance(),
          config: orchestrator.getConfig(),
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown action: ${action}. Use: start, stop, pause, resume, emergency_stop, config, reset, status`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[Agent API] POST error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
