import { NextRequest, NextResponse } from 'next/server';
import { runesMarketService } from '@/services/runesMarketService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string; rune: string }> }
) {
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
