import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/api-middleware';
import type { UserCredentials } from '@/agent/core/AgentOrchestrator';
import crypto from 'crypto';

// Rate limit: 10 actions per minute for agent control
const agentRateLimit = rateLimit({ windowMs: 60000, maxRequests: 10 });

// SEC-02: Session tokens — issued on 'start', required for all subsequent calls.
// Prevents unauthorized access to another user's agent instance.
const sessionTokens = new Map<string, { token: string; issuedAt: number }>();
const SESSION_TOKEN_TTL = 24 * 60 * 60 * 1000; // 24h

function issueSessionToken(walletAddress: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  sessionTokens.set(walletAddress, { token, issuedAt: Date.now() });
  return token;
}

function validateSessionToken(walletAddress: string, token: string | null): boolean {
  if (!token) return false;
  const entry = sessionTokens.get(walletAddress);
  if (!entry) return false;
  if (Date.now() - entry.issuedAt > SESSION_TOKEN_TTL) {
    sessionTokens.delete(walletAddress);
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(entry.token, 'hex'),
    Buffer.from(token, 'hex')
  );
}

function revokeSessionToken(walletAddress: string): void {
  sessionTokens.delete(walletAddress);
}

// Lazy dynamic import for ESM compatibility with webpack
async function getOrchestratorModule() {
  const mod = await import('@/agent/core/AgentOrchestrator');
  return mod as {
    getOrchestrator: (userId: string, config?: any, credentials?: UserCredentials) => any;
    resetOrchestrator: (userId: string) => void;
    getAllActiveUsers: () => string[];
  };
}

/**
 * Extract walletAddress from request (body for POST, query param for GET)
 */
function extractWalletAddress(request: NextRequest, body?: any): string | null {
  // POST: from body
  if (body?.walletAddress) return body.walletAddress;
  if (body?.credentials?.walletAddress) return body.credentials.walletAddress;
  // GET: from query param
  const url = new URL(request.url);
  return url.searchParams.get('walletAddress');
}

/**
 * Extract session token from request headers or query/body
 */
function extractSessionToken(request: NextRequest, body?: any): string | null {
  // Header: Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // Body or query param fallback
  if (body?.sessionToken) return body.sessionToken;
  const url = new URL(request.url);
  return url.searchParams.get('sessionToken');
}

/**
 * GET /api/agent
 *
 * Returns agent state, positions, PnL, config, and optionally trade history.
 * Requires sessionToken for authenticated access.
 *
 * Query params:
 *   ?walletAddress=...&sessionToken=...
 *   ?include=trades  - include full trade history
 */
export async function GET(request: NextRequest) {
  try {
    const walletAddress = extractWalletAddress(request);
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'walletAddress query parameter is required' },
        { status: 400 }
      );
    }

    // SEC-02: Validate session token (if one exists for this wallet)
    const token = extractSessionToken(request);
    const hasActiveSession = sessionTokens.has(walletAddress);
    if (hasActiveSession && !validateSessionToken(walletAddress, token)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session token' },
        { status: 401 }
      );
    }

    const { getOrchestrator } = await getOrchestratorModule();
    const orchestrator = getOrchestrator(walletAddress);
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
      enableTrading: config?.enableTrading ?? false,
      performance,
      config,
    };

    if (include === 'trades') {
      response.tradeHistory = orchestrator.getTradeHistory();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Agent API] GET error:', error);
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
 *   { action: 'start', config?, credentials?, walletAddress } → returns sessionToken
 *   { action: 'stop', walletAddress, sessionToken }
 *   { action: 'pause', walletAddress, sessionToken }
 *   { action: 'resume', walletAddress, sessionToken }
 *   { action: 'emergency_stop', walletAddress, sessionToken }
 *   { action: 'config', config, walletAddress, sessionToken }
 *   { action: 'status', walletAddress, sessionToken }
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

    const { getOrchestrator, resetOrchestrator } = await getOrchestratorModule();
    const body = await request.json();
    const { action, config, credentials } = body;

    // Validate action is a known string
    const VALID_ACTIONS = ['start', 'stop', 'pause', 'resume', 'emergency_stop', 'config', 'reset', 'status', 'sync_positions'];
    if (typeof action !== 'string' || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use: start, stop, pause, resume, emergency_stop, config, reset, status' },
        { status: 400 }
      );
    }

    // Extract walletAddress (required for user isolation)
    const walletAddress = extractWalletAddress(request, body);
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'walletAddress is required' },
        { status: 400 }
      );
    }

    // SEC-02: For non-start actions, require a valid session token
    if (action !== 'start') {
      const token = extractSessionToken(request, body);
      const hasActiveSession = sessionTokens.has(walletAddress);
      if (hasActiveSession && !validateSessionToken(walletAddress, token)) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired session token. Restart the agent.' },
          { status: 401 }
        );
      }
    }

    switch (action) {
      case 'start': {
        // Build per-user credentials from request body
        const userCredentials: UserCredentials = {};
        if (credentials?.hyperliquid) {
          userCredentials.hyperliquid = {
            agentKey: credentials.hyperliquid.agentKey,
            agentSecret: credentials.hyperliquid.agentSecret,
          };
        }
        if (credentials?.solanaPrivateKey) userCredentials.solanaPrivateKey = credentials.solanaPrivateKey;
        if (credentials?.evmPrivateKey) userCredentials.evmPrivateKey = credentials.evmPrivateKey;
        if (credentials?.solanaRpc) userCredentials.solanaRpcUrl = credentials.solanaRpc;
        if (credentials?.ethRpc) userCredentials.ethRpcUrl = credentials.ethRpc;

        // CRITICAL FIX: Always reset before start to apply fresh credentials.
        resetOrchestrator(walletAddress);

        // Merge enableTrading into config so ConsensusEngine can use it
        const mergedConfig = {
          ...config,
          enableTrading: config?.enableTrading ?? true,
        };

        const orchestrator = getOrchestrator(walletAddress, mergedConfig, userCredentials);
        await orchestrator.start();

        // SEC-02: Issue session token — client must include this in all subsequent requests
        const sessionToken = issueSessionToken(walletAddress);

        return NextResponse.json({
          success: true,
          message: 'Agent started',
          sessionToken,
          state: orchestrator.getState(),
        });
      }

      case 'stop': {
        const orchestrator = getOrchestrator(walletAddress);
        await orchestrator.stop();
        revokeSessionToken(walletAddress);
        return NextResponse.json({
          success: true,
          message: 'Agent stopped',
          state: orchestrator.getState(),
        });
      }

      case 'pause': {
        const orchestrator = getOrchestrator(walletAddress);
        await orchestrator.pause();
        return NextResponse.json({
          success: true,
          message: 'Agent paused',
          state: orchestrator.getState(),
        });
      }

      case 'resume': {
        const orchestrator = getOrchestrator(walletAddress);
        await orchestrator.resume();
        return NextResponse.json({
          success: true,
          message: 'Agent resumed',
          state: orchestrator.getState(),
        });
      }

      case 'emergency_stop': {
        const orchestrator = getOrchestrator(walletAddress);
        await orchestrator.emergencyStop();
        revokeSessionToken(walletAddress);
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
        const orchestrator = getOrchestrator(walletAddress);
        orchestrator.updateConfig(config as any);
        return NextResponse.json({
          success: true,
          message: 'Config updated',
          config: orchestrator.getConfig(),
        });
      }

      case 'reset': {
        resetOrchestrator(walletAddress);
        revokeSessionToken(walletAddress);
        return NextResponse.json({
          success: true,
          message: 'Agent reset - new instance will be created on next call',
        });
      }

      case 'status': {
        const orchestrator = getOrchestrator(walletAddress);
        return NextResponse.json({
          success: true,
          state: orchestrator.getState(),
          performance: orchestrator.getPerformance(),
          config: orchestrator.getConfig(),
        });
      }

      case 'sync_positions': {
        const orchestrator = getOrchestrator(walletAddress);
        const state = orchestrator.getState();
        return NextResponse.json({
          success: true,
          message: 'Positions synced from exchange',
          positions: state.positions,
          lpPositions: state.lpPositions,
          openOrders: state.openOrders,
          syncedAt: Date.now(),
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
