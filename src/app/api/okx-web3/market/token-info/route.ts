import { NextRequest, NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainIndex, tokenContractAddress } = body;

    if (!chainIndex || !tokenContractAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: chainIndex, tokenContractAddress' },
        { status: 400 }
      );
    }

    const data = await okxWeb3Service.getTokenBasicInfo(chainIndex, tokenContractAddress);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] POST /api/okx-web3/market/token-info error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token basic info' },
      { status: 500 }
    );
  }
}
