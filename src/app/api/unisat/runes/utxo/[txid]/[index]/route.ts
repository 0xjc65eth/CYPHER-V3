import { NextRequest, NextResponse } from 'next/server';
import { unisatRunesService } from '@/services/unisatRunesService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ txid: string; index: string }> }
) {
  try {
    const { txid, index } = await params;
    const data = await unisatRunesService.getUtxoRuneBalance(txid, Number(index));
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch UTXO rune balance';
    return NextResponse.json({ code: 0, msg: 'fallback', data: { list: [], total: 0 } });
  }
}
