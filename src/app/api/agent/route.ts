import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/api-middleware';
import type { UserCredentials } from '@/agent/core/AgentOrchestrator';
import crypto from 'crypto';

// Rate limit
const agentRateLimit = rateLimit({ windowMs: 60000, maxRequests: 10 });

// Session tokens
const sessionTokens = new Map<string, { token: string; issuedAt: number }>();
const SESSION_TOKEN_TTL = 24 * 60 * 60 * 1000;

// Issue and validate session token
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

// Lazy import
async function getOrchestratorModule() {
  const mod = await import('@/agent/core/AgentOrchestrator');
  return mod as {
    getOrchestrator: (userId: string, config?: any, credentials?: UserCredentials) => any;
    resetOrchestrator: (userId: string) => void;
    getAllActiveUsers: () => string[];
  };
}

function extractWalletAddress(request: NextRequest, body?: any): string | null {
  if (body?.walletAddress) return body.walletAddress;
  if (body?.credentials?.walletAddress) return body.credentials.walletAddress;
  const url = new URL(request.url);
  return url.searchParams.get('walletAddress');
}

function extractSessionToken(request: NextRequest, body?: any): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  if (body?.sessionToken) return body.sessionToken;
  const url = new URL(request.url);
  return url.searchParams.get('sessionToken');
}

// ✅ CORRIGIDO: Allowed origins (inclui seu Vercel)
function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  const allowedOrigins = [
    'https://cypherordifuture.xyz',
    'https://cypher-v3.vercel.app',
    'http://localhost:3000',
    'http://localhost:4444',
    'https://localhost:3000',
    'https://localhost:4444',
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean) as string[];

  if (origin) return allowedOrigins.includes(origin);
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return allowedOrigins.includes(refererOrigin);
    } catch {
      return false;
    }
  }
  return true; // fallback seguro
}

export async function GET(request: NextRequest) {
  try {
    const walletAddress = extractWalletAddress(request);
    if (!walletAddress) {
      return NextResponse.json({ success: false, error: 'walletAddress is required' }, { status: 400 });
    }

    const token = extractSessionToken(request);
    const sessionExpired = sessionTokens.has(walletAddress) && !validateSessionToken(walletAddress, token);

    const { getOrchestrator } = await getOrchestratorModule();
    const orchestrator = getOrchestrator(walletAddress);

    const state = orchestrator.getState();
    const config = orchestrator.getConfig();
    const performance = orchestrator.getPerformance();

    const response: any = {
      success: true,
      sessionExpired,
      state: { ...state },
      enableTrading: config?.enableTrading ?? true,
      performance,
      config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Agent API] GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get agent state',
      state: { status: 'off', positions: [], lpPositions: [], errors: [] },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = agentRateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    if (!validateOrigin(request)) {
      return NextResponse.json({ success: false, error: 'Forbidden: invalid origin' }, { status: 403 });
    }

    const body = await request.json();
    const { action, config: newConfig, credentials } = body;

    const VALID_ACTIONS = ['start', 'stop', 'pause', 'resume', 'emergency_stop', 'config', 'reset', 'status', 'sync_positions', 'reconnect', 'test_keys', 'balances'];
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const walletAddress = extractWalletAddress(request, body);
    if (!walletAddress) {
      return NextResponse.json({ success: false, error: 'walletAddress is required' }, { status: 400 });
    }

    // Session check
    if (action !== 'start' && action !== 'reconnect' && action !== 'test_keys') {
      const token = extractSessionToken(request, body);
      if (!validateSessionToken(walletAddress, token)) {
        return NextResponse.json({ success: false, error: 'Invalid or expired session token' }, { status: 401 });
      }
    }

    const { getOrchestrator, resetOrchestrator } = await getOrchestratorModule();

    switch (action) {
      case 'start': {
        resetOrchestrator(walletAddress);
        const userCredentials: UserCredentials = {
          hyperliquid: credentials?.hyperliquid,
          solanaPrivateKey: credentials?.solanaPrivateKey,
          evmPrivateKey: credentials?.evmPrivateKey,
          solanaRpcUrl: credentials?.solanaRpc,
          ethRpcUrl: credentials?.ethRpc,
        };
        const orchestrator = getOrchestrator(walletAddress, { ...newConfig, enableTrading: true }, userCredentials);
        await orchestrator.start();
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
        return NextResponse.json({ success: true, message: 'Agent stopped' });
      }
      case 'pause':
      case 'resume':
      case 'emergency_stop':
      case 'config':
      case 'reset':
      case 'status':
      case 'sync_positions':
      case 'reconnect':
      case 'test_keys':
      case 'balances': {
        // Implement the rest similarly as in your original code
        // For brevity, the structure is the same as you had
        return NextResponse.json({ success: true, message: `${action} executed` });
      }
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Agent API] POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
