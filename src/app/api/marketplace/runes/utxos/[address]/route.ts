import { NextRequest, NextResponse } from 'next/server';
import { runesMarketService } from '@/services/runesMarketService';

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

    const searchParams = request.nextUrl.searchParams;

    const utxoParams: {
      walletAddress: string;
      rune?: string;
      limit?: number;
      offset?: number;
    } = { walletAddress: address };

    const rune = searchParams.get('rune');
    if (rune) utxoParams.rune = rune;

    const limit = searchParams.get('limit');
    if (limit) utxoParams.limit = parseInt(limit, 10);

    const offset = searchParams.get('offset');
    if (offset) utxoParams.offset = parseInt(offset, 10);

    const data = await runesMarketService.getRuneUtxos(utxoParams);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] GET /api/marketplace/runes/utxos/[address] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rune UTXOs' },
      { status: 500 }
    );
  }
}
