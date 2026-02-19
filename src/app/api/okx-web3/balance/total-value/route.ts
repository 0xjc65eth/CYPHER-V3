import { NextRequest, NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const address = params.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Missing required parameter: address' },
        { status: 400 }
      );
    }

    const data = await okxWeb3Service.getTotalValue(
      address,
      params.get('chains') || undefined
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET /api/okx-web3/balance/total-value error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch total value' },
      { status: 500 }
    );
  }
}
