import { NextRequest, NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainIndex, tokenContractAddress, amount, payerAddress, payeeAddress } = body;

    if (!chainIndex || !tokenContractAddress || !amount || !payerAddress || !payeeAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: chainIndex, tokenContractAddress, amount, payerAddress, payeeAddress' },
        { status: 400 }
      );
    }

    const data = await okxWeb3Service.x402Settle({
      chainIndex,
      tokenContractAddress,
      amount,
      payerAddress,
      payeeAddress,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] POST /api/okx-web3/x402/settle error:', error);
    return NextResponse.json(
      { error: 'Failed to settle x402 payment' },
      { status: 500 }
    );
  }
}
