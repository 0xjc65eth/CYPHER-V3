import { NextRequest, NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const chainIndex = params.get('chainIndex');
    const amount = params.get('amount');
    const fromTokenAddress = params.get('fromTokenAddress');
    const toTokenAddress = params.get('toTokenAddress');

    if (!chainIndex || !amount || !fromTokenAddress || !toTokenAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters: chainIndex, amount, fromTokenAddress, toTokenAddress' },
        { status: 400 }
      );
    }

    const data = await okxWeb3Service.getQuote({
      chainIndex,
      amount,
      fromTokenAddress,
      toTokenAddress,
      swapMode: (params.get('swapMode') as 'exactIn' | 'exactOut') || undefined,
      dexIds: params.get('dexIds') || undefined,
      directRoute: params.get('directRoute') === 'true' ? true : undefined,
      priceImpactProtectionPercent: params.get('priceImpactProtectionPercent') || undefined,
      feePercent: params.get('feePercent') || undefined,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET /api/okx-web3/aggregator/quote error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    );
  }
}
