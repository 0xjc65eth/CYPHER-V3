import { NextRequest, NextResponse } from 'next/server';
import { unisatService } from '@/services/unisatService';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const { address } = await params;
    const data = await unisatService.getAddressBalance(address);
    return NextResponse.json(data);
  } catch (error) {
    console.error('UniSat balance error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { code: -1, msg: 'Internal server error', data: null },
      { status: 502 }
    );
  }
}
