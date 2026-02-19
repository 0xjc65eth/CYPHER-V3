import { NextRequest, NextResponse } from 'next/server';
import { unisatRunesService } from '@/services/unisatRunesService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runeid: string }> }
) {
  try {
    const { runeid } = await params;
    const { searchParams } = request.nextUrl;
    const start = searchParams.get('start');
    const limit = searchParams.get('limit');

    const data = await unisatRunesService.getRuneHistory(runeid, {
      start: start ? Number(start) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch rune history';
    return NextResponse.json({ code: 0, msg: 'fallback', data: { list: [], total: 0 } });
  }
}
