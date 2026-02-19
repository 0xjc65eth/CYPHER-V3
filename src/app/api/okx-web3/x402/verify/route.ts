import { NextRequest, NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const chainIndex = params.get('chainIndex');
    const txHash = params.get('txHash');

    if (!chainIndex || !txHash) {
      return NextResponse.json(
        { error: 'Missing required parameters: chainIndex, txHash' },
        { status: 400 }
      );
    }

    const data = await okxWeb3Service.x402Verify({ chainIndex, txHash });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET /api/okx-web3/x402/verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify x402 payment' },
      { status: 500 }
    );
  }
}
