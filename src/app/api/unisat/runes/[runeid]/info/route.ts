import { NextRequest, NextResponse } from 'next/server';
import { unisatRunesService } from '@/services/unisatRunesService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runeid: string }> }
) {
  try {
    const { runeid } = await params;
    const data = await unisatRunesService.getRuneInfo(runeid);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch rune info';
    return NextResponse.json({ code: 0, msg: 'fallback', data: { list: [], total: 0 } });
  }
}
