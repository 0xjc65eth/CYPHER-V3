import { NextRequest, NextResponse } from 'next/server';
import { unisatRunesService } from '@/services/unisatRunesService';
import { rateLimit, strictRateLimit } from '@/lib/middleware/rate-limiter';

export async function POST(request: NextRequest) {
  const rateLimitRes = await strictRateLimit(request, 10, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const body = await request.json();
    const { type } = body;

    if (type === 'bid') {
      const { auctionId, address, pubkey, bidPrice, psbt, signedPsbt } = body;
      if (!auctionId || !address || !pubkey || !bidPrice || !psbt || !signedPsbt) {
        return NextResponse.json(
          { error: 'Missing required fields: auctionId, address, pubkey, bidPrice, psbt, signedPsbt' },
          { status: 400 }
        );
      }
      const data = await unisatRunesService.createRunesBid({
        auctionId,
        address,
        pubkey,
        bidPrice,
        psbt,
        signedPsbt,
      });
      return NextResponse.json(data);
    }

    // Default: create sell listing
    const { runeid, amount, unitPrice, address, pubkey, psbt, signedPsbt } = body;
    if (!runeid || !amount || !unitPrice || !address || !pubkey || !psbt || !signedPsbt) {
      return NextResponse.json(
        { error: 'Missing required fields: runeid, amount, unitPrice, address, pubkey, psbt, signedPsbt' },
        { status: 400 }
      );
    }
    const data = await unisatRunesService.createRunesSellListing({
      runeid,
      amount,
      unitPrice,
      address,
      pubkey,
      psbt,
      signedPsbt,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create marketplace order';
    return NextResponse.json({ code: 0, msg: 'fallback', data: { list: [], total: 0 } });
  }
}
