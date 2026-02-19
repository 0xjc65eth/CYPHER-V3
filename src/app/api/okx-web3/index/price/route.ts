import { NextRequest, NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be an array of { chainIndex, tokenContractAddress }' },
        { status: 400 }
      );
    }

    const data = await okxWeb3Service.getIndexPrices(body);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] POST /api/okx-web3/index/price error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch index prices' },
      { status: 500 }
    );
  }
}
