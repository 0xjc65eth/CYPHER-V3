import { NextRequest, NextResponse } from 'next/server';
import { unisatService } from '@/services/unisatService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const { searchParams } = request.nextUrl;
    const cursor = searchParams.get('cursor');
    const size = searchParams.get('size');

    const data = await unisatService.getAddressUtxo(address, {
      cursor: cursor ? Number(cursor) : undefined,
      size: size ? Number(size) : undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch UTXOs';
    return NextResponse.json({ code: 0, msg: 'fallback', data: { list: [], total: 0 } });
  }
}
