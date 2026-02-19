import { NextRequest, NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const fromChainIndex = params.get('fromChainIndex');
    const toChainIndex = params.get('toChainIndex');
    const fromTokenAddress = params.get('fromTokenAddress');
    const toTokenAddress = params.get('toTokenAddress');
    const amount = params.get('amount');

    if (!fromChainIndex || !toChainIndex || !fromTokenAddress || !toTokenAddress || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: fromChainIndex, toChainIndex, fromTokenAddress, toTokenAddress, amount' },
        { status: 400 }
      );
    }

    const data = await okxWeb3Service.getCrossChainQuote({
      fromChainIndex,
      toChainIndex,
      fromTokenAddress,
      toTokenAddress,
      amount,
      slippagePercent: params.get('slippagePercent') || undefined,
      userWalletAddress: params.get('userWalletAddress') || undefined,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET /api/okx-web3/cross-chain/quote error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cross-chain quote' },
      { status: 500 }
    );
  }
}
