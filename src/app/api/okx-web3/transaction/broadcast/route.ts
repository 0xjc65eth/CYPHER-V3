import { NextRequest, NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainIndex, signedTx } = body;

    if (!chainIndex || !signedTx) {
      return NextResponse.json(
        { error: 'Missing required fields: chainIndex, signedTx' },
        { status: 400 }
      );
    }

    const data = await okxWeb3Service.broadcastTransaction(chainIndex, signedTx);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] POST /api/okx-web3/transaction/broadcast error:', error);
    return NextResponse.json(
      { error: 'Failed to broadcast transaction' },
      { status: 500 }
    );
  }
}
