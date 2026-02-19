import { NextRequest, NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const chainIndex = params.get('chainIndex');
    const tokenContractAddress = params.get('tokenContractAddress');

    if (!chainIndex || !tokenContractAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters: chainIndex, tokenContractAddress' },
        { status: 400 }
      );
    }

    const data = await okxWeb3Service.getCandles({
      chainIndex,
      tokenContractAddress,
      after: params.get('after') || undefined,
      before: params.get('before') || undefined,
      bar: (params.get('bar') as '1s' | '1m' | '3m' | '5m' | '15m' | '30m' | '1H' | '2H' | '4H') || undefined,
      limit: params.get('limit') || undefined,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET /api/okx-web3/market/candles error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candlestick data' },
      { status: 500 }
    );
  }
}
