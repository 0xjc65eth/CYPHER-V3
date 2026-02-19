import { NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';

export async function GET() {
  try {
    const data = await okxWeb3Service.getSupportedChains();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET /api/okx-web3/aggregator/chains error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supported chains' },
      { status: 500 }
    );
  }
}
