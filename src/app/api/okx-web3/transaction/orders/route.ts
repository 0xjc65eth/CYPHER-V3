import { NextRequest, NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const data = await okxWeb3Service.getTransactionOrders({
      orderId: params.get('orderId') || undefined,
      chainIndex: params.get('chainIndex') || undefined,
      address: params.get('address') || undefined,
      limit: params.get('limit') || undefined,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET /api/okx-web3/transaction/orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction orders' },
      { status: 500 }
    );
  }
}
