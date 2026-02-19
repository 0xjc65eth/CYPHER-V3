import { NextRequest, NextResponse } from 'next/server';
import { unisatService } from '@/services/unisatService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const data = await unisatService.getAddressBalance(address);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch address balance';
    console.error('UniSat balance error:', message);
    return NextResponse.json(
      { code: -1, msg: message, data: null },
      { status: 502 }
    );
  }
}
