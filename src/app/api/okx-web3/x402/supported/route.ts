import { NextResponse } from 'next/server';
import { okxWeb3Service } from '@/services/okxWeb3Service';

export async function GET() {
  try {
    const data = await okxWeb3Service.x402GetSupported();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET /api/okx-web3/x402/supported error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch x402 supported tokens' },
      { status: 500 }
    );
  }
}
