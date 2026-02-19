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

    const data = await okxWeb3Service.getRecentTrades(
      chainIndex,
      tokenContractAddress,
      params.get('limit') || undefined
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET /api/okx-web3/market/trades error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent trades' },
      { status: 500 }
    );
  }
}
