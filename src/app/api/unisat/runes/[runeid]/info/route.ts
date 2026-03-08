import { NextRequest, NextResponse } from 'next/server';
import { unisatRunesService } from '@/services/unisatRunesService';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runeid: string }> }
) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const { runeid } = await params;
    const data = await unisatRunesService.getRuneInfo(runeid);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch rune info';
    return NextResponse.json({ code: 0, msg: 'fallback', data: { list: [], total: 0 } });
  }
}
