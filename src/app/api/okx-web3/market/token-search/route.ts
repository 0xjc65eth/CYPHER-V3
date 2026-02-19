import { NextRequest, NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const chains = params.get('chains');
    const search = params.get('search');

    if (!chains || !search) {
      return NextResponse.json(
        { error: 'Missing required parameters: chains, search' },
        { status: 400 }
      );
    }

    const data = await okxWeb3Service.searchTokens(chains, search);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET /api/okx-web3/market/token-search error:', error);
    return NextResponse.json(
      { error: 'Failed to search tokens' },
      { status: 500 }
    );
  }
}
