import { NextRequest, NextResponse } from 'next/server';
import { unisatService } from '@/services/unisatService';

export async function GET(_request: NextRequest) {
  try {
    const data = await unisatService.getLatestBlock();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch latest block';
    return NextResponse.json({ code: 0, msg: 'fallback', data: { list: [], total: 0 } });
  }
}
