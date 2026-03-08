import { NextRequest, NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const chainIndex = request.nextUrl.searchParams.get('chainIndex');
    if (!chainIndex) {
      return NextResponse.json(
        { error: 'Missing required parameter: chainIndex' },
        { status: 400 }
      );
    }

    const data = await okxWeb3Service.getAllTokens(chainIndex);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET /api/okx-web3/aggregator/tokens error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}
