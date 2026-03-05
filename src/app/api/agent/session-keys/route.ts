import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/api-middleware';

const sessionKeysRateLimit = rateLimit({ windowMs: 60000, maxRequests: 10 });

// Lazy dynamic import for ESM compatibility
async function getModules() {
  const walletMod = await import('@/agent/wallet');
  return { getSessionKeyManager: walletMod.getSessionKeyManager };
}

/**
 * GET /api/agent/session-keys
 *
 * List active session keys (redacted - no private key material).
 *
 * Query params:
 *   ?chain=evm     - filter by chain type
 *   ?active=true   - only active (non-expired, non-revoked)
 */
export async function GET(request: NextRequest) {
  try {
    const rl = sessionKeysRateLimit(request);
    if (rl) return rl;

    const url = new URL(request.url);
    const chain = url.searchParams.get('chain') || '';
    const activeOnly = url.searchParams.get('active') !== 'false';

    const { getSessionKeyManager } = await getModules();
    const manager = getSessionKeyManager();
    let keys = manager.getActiveKeys(chain);

    if (activeOnly) {
      const now = Date.now();
      keys = keys.filter((k: any) => k.isActive && k.expiresAt > now);
    }

    // Redact sensitive fields
    const safeKeys = keys.map((k: any) => ({
      id: k.id,
      chain: k.chain,
      publicAddress: k.publicAddress,
      allowedPairs: k.allowedPairs,
      maxSpendUSD: k.spendLimitUSD,
      spentUSD: k.spentUSD,
      remainingUSD: k.spendLimitUSD - k.spentUSD,
      expiresAt: k.expiresAt,
      expiresIn: k.expiresAt - Date.now(),
      createdAt: k.createdAt,
      callCount: k.callCount,
      maxCalls: k.maxCalls,
      isActive: k.isActive,
    }));

    return NextResponse.json({
      success: true,
      keys: safeKeys,
      total: safeKeys.length,
    });
  } catch (error) {
    console.error('[Agent Session Keys API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get session keys' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent/session-keys
 *
 * Create a new session key.
 *
 * Body:
 *   {
 *     chain: "evm" | "solana" | "hyperliquid" | "tradfi",
 *     exchange: "uniswap",
 *     allowedPairs: ["ETH/USDC", "SOL/USDC"],
 *     maxSpendUSD: 5000,
 *     ttlMs: 86400000,   // 24 hours
 *     walletSignature?: "0x..."  // optional proof of authorization
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const rl = sessionKeysRateLimit(request);
    if (rl) return rl;

    const body = await request.json();
    const { chain, exchange, allowedPairs, maxSpendUSD, ttlMs, walletSignature } = body;

    if (!chain || !exchange) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: chain, exchange' },
        { status: 400 }
      );
    }

    const { getSessionKeyManager } = await getModules();
    const manager = getSessionKeyManager();

    const ttlHours = (ttlMs || 24 * 60 * 60 * 1000) / 3600_000;

    const key = await manager.createSessionKey({
      chain,
      userWalletAddress: walletSignature || 'api',
      expiresInHours: ttlHours,
      spendLimitUSD: maxSpendUSD || 10000,
      allowedPairs: allowedPairs || ['*'],
    });

    return NextResponse.json({
      success: true,
      key: {
        id: key.id,
        chain: key.chain,
        publicAddress: key.publicAddress,
        allowedPairs: key.allowedPairs,
        maxSpendUSD: key.spendLimitUSD,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
      },
      message: 'Session key created. Private key material is stored encrypted.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[Agent Session Keys API] POST error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agent/session-keys
 *
 * Revoke a session key.
 *
 * Body:
 *   { id: "session-key-id" }
 *   OR
 *   { action: "revoke_all" }
 *   OR
 *   { action: "cleanup_expired" }
 */
export async function DELETE(request: NextRequest) {
  try {
    const rl = sessionKeysRateLimit(request);
    if (rl) return rl;

    const body = await request.json();
    const { getSessionKeyManager } = await getModules();
    const manager = getSessionKeyManager();

    if (body.action === 'revoke_all') {
      const keys = manager.getActiveKeys('');
      let revoked = 0;
      for (const key of keys) {
        await manager.revokeSessionKey(key.id);
        revoked++;
      }
      return NextResponse.json({
        success: true,
        message: `Revoked ${revoked} session keys`,
      });
    }

    if (body.action === 'cleanup_expired') {
      const revoked = await manager.revokeExpiredKeys();
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${revoked} expired session keys`,
      });
    }

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    await manager.revokeSessionKey(body.id);

    return NextResponse.json({
      success: true,
      message: `Session key ${body.id} revoked`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[Agent Session Keys API] DELETE error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
