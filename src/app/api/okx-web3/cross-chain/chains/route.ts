import { NextRequest, NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const data = await okxWeb3Service.getCrossChainSupportedChains();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET /api/okx-web3/cross-chain/chains error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cross-chain supported chains' },
      { status: 500 }
    );
  }
}
