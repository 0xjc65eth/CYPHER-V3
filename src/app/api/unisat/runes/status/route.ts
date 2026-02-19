import { NextRequest, NextResponse } from 'next/server';
import { unisatRunesService } from '@/services/unisatRunesService';

export async function GET(_request: NextRequest) {
  try {
    const data = await unisatRunesService.getRunesIndexerStatus();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch runes status';
    return NextResponse.json({ code: 0, msg: 'fallback', data: { list: [], total: 0 } });
  }
}
