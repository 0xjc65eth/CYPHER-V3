import { NextRequest, NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const params = request.nextUrl.searchParams;
    const chainIndex = params.get('chainIndex');
    const amount = params.get('amount');
    const fromTokenAddress = params.get('fromTokenAddress');
    const toTokenAddress = params.get('toTokenAddress');
    const slippagePercent = params.get('slippagePercent');
    const userWalletAddress = params.get('userWalletAddress');

    if (!chainIndex || !amount || !fromTokenAddress || !toTokenAddress || !slippagePercent || !userWalletAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters: chainIndex, amount, fromTokenAddress, toTokenAddress, slippagePercent, userWalletAddress' },
        { status: 400 }
      );
    }

    const data = await okxWeb3Service.getSwap({
      chainIndex,
      amount,
      fromTokenAddress,
      toTokenAddress,
      slippagePercent,
      userWalletAddress,
      swapMode: (params.get('swapMode') as 'exactIn' | 'exactOut') || undefined,
      approveTransaction: params.get('approveTransaction') === 'true' ? true : undefined,
      approveAmount: params.get('approveAmount') || undefined,
      swapReceiverAddress: params.get('swapReceiverAddress') || undefined,
      feePercent: params.get('feePercent') || undefined,
      priceImpactProtectionPercent: params.get('priceImpactProtectionPercent') || undefined,
      dexIds: params.get('dexIds') || undefined,
      excludeDexIds: params.get('excludeDexIds') || undefined,
      gasLimit: params.get('gasLimit') || undefined,
      gasLevel: (params.get('gasLevel') as 'slow' | 'average' | 'fast') || undefined,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET /api/okx-web3/aggregator/swap error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch swap data' },
      { status: 500 }
    );
  }
}
