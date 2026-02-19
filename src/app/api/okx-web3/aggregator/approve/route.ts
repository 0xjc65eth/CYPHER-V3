import { NextRequest, NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const chainIndex = params.get('chainIndex');
    const tokenContractAddress = params.get('tokenContractAddress');
    const approveAmount = params.get('approveAmount');

    if (!chainIndex || !tokenContractAddress || !approveAmount) {
      return NextResponse.json(
        { error: 'Missing required parameters: chainIndex, tokenContractAddress, approveAmount' },
        { status: 400 }
      );
    }

    const data = await okxWeb3Service.getApproveTransaction({
      chainIndex,
      tokenContractAddress,
      approveAmount,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET /api/okx-web3/aggregator/approve error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approve transaction' },
      { status: 500 }
    );
  }
}
