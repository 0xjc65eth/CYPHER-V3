import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/api-middleware';

// Secure in-memory credential storage (never pollute process.env with user secrets)
const secureCredentials = new Map<string, Record<string, string>>();

// Rate limit: 10 actions per minute for agent control
const agentRateLimit = rateLimit({ windowMs: 60000, maxRequests: 10 });

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
    // If the orchestrator module fails to load or agent isn't configured, return a useful default
    const isModuleError = error instanceof Error && (
      error.message.includes('Cannot find module') ||
      error.message.includes('is not a function') ||
      error.message.includes('getState')
    );
    return NextResponse.json(
      {
        success: false,
        error: isModuleError
          ? 'Agent not configured. Complete the setup wizard to initialize the trading agent.'
          : 'Failed to get agent state',
        state: {
          status: 'stopped',
          uptime: 0,
          startedAt: null,
          positions: [],
          lpPositions: [],
          openOrders: [],
          recentTrades: [],
          errors: [],
          lastCompound: null,
        },
        performance: null,
        config: null,
      },
      { status: isModuleError ? 200 : 500 }
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
    // Rate limit check
    const rateLimitResult = agentRateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    // Validate request origin
    if (!validateOrigin(request)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: invalid origin' },
        { status: 403 }
      );
    }

    const { getOrchestrator, resetOrchestrator } = getOrchestratorModule();
    const body = await request.json();
    const { action, config, credentials } = body;

    // Validate action is a known string
    const VALID_ACTIONS = ['start', 'stop', 'pause', 'resume', 'emergency_stop', 'config', 'reset', 'status'];
    if (typeof action !== 'string' || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use: start, stop, pause, resume, emergency_stop, config, reset, status' },
        { status: 400 }
      );
    }

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
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Agent API] POST error:', error instanceof Error ? error.message : 'Unknown');
    const isModuleError = error instanceof Error && (
      error.message.includes('Cannot find module') ||
      error.message.includes('is not a function')
    );
    return NextResponse.json(
      {
        success: false,
        error: isModuleError
          ? 'Agent not configured. Complete the setup wizard first.'
          : 'Internal server error',
      },
      { status: isModuleError ? 400 : 500 }
    );
  }
}

function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  const allowedOrigins = [
    'https://cypherordifuture.xyz',
    'http://localhost:4444',
    'https://localhost:4444',
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean) as string[];

  if (origin) {
    return allowedOrigins.includes(origin);
  }

  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return allowedOrigins.includes(refererOrigin);
    } catch {
      return false;
    }
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  return fetchSite === 'same-origin' || fetchSite === 'none';
}
