import { NextRequest, NextResponse } from 'next/server';
import { magicEdenService } from '@/services/magicEdenService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { error: 'Missing required parameter: address' },
        { status: 400 }
      );
    }

    const data = await magicEdenService.getRareSatsByWallet(address);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] GET /api/magiceden/raresats/wallet/[address] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet rare sats' },
      { status: 500 }
    );
  }
}
