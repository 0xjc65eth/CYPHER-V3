import { NextRequest, NextResponse } from 'next/server';
import { unisatService } from '@/services/unisatService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ txid: string }> }
) {
  try {
    const { txid } = await params;
    const data = await unisatService.getTransaction(txid);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transaction';
    return NextResponse.json({ code: 0, msg: 'fallback', data: { list: [], total: 0 } });
  }
}
