import { NextRequest, NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const chainIndex = params.get('chainIndex');
    const tokenContractAddress = params.get('tokenContractAddress');
    const type = params.get('type') || 'top'; // 'count' or 'top'

    if (!chainIndex || !tokenContractAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters: chainIndex, tokenContractAddress' },
        { status: 400 }
      );
    }

    if (type === 'count') {
      const data = await okxWeb3Service.getTokenHolderCount(chainIndex, tokenContractAddress);
      return NextResponse.json({ success: true, data });
    }

    const data = await okxWeb3Service.getTopTokenHolders(
      chainIndex,
      tokenContractAddress,
      params.get('limit') || undefined
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET /api/okx-web3/market/holders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holder data' },
      { status: 500 }
    );
  }
}
