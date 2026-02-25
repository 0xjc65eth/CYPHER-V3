import { NextRequest, NextResponse } from 'next/server';

/**
 * Hyperliquid Trade API
 *
 * SECURITY: This endpoint previously accepted private keys over HTTP,
 * which is a critical security vulnerability. Trading must be done
 * client-side using the wallet connector (session keys or browser signing).
 *
 * The AI Trading Agent uses its own connector system (src/agent/connectors/)
 * with server-side environment variables, never accepting keys via HTTP.
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Direct trade execution via API is disabled for security. Use the Trading Agent UI or wallet connector.',
    documentation: 'Trading is handled client-side via wallet signing or through the AI Agent system.',
  }, { status: 403 });
}
