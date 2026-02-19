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

    const data = await okxWeb3Service.getTokenPriceInfo(chainIndex, tokenContractAddress);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET /api/okx-web3/market/price-info error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token price info' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be an array of { chainIndex, tokenContractAddress }' },
        { status: 400 }
      );
    }

    const data = await okxWeb3Service.getBatchTokenPriceInfo(body);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] POST /api/okx-web3/market/price-info error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch token price info' },
      { status: 500 }
    );
  }
}
