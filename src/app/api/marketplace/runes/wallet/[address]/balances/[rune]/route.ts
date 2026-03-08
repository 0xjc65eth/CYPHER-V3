import { NextRequest, NextResponse } from 'next/server';
import { runesMarketService } from '@/services/runesMarketService';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string; rune: string }> }
) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const { address, rune } = await params;

    if (!address || !rune) {
      return NextResponse.json(
        { error: 'Missing required parameters: address, rune' },
        { status: 400 }
      );
    }

    const data = await runesMarketService.getWalletRuneBalances({
      address,
      rune,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] GET /api/marketplace/runes/wallet/[address]/balances/[rune] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet rune balances' },
      { status: 500 }
    );
  }
}
