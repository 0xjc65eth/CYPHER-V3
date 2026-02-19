import { NextRequest, NextResponse } from 'next/server';
import { magicEdenRunesService } from '@/services/magicEdenRunesService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'psbt': {
        const { rune, buyer, orderIds, feeRate, fundingUtxos } = body;

        if (!rune || !buyer || !orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
          return NextResponse.json(
            { error: 'Missing required fields: rune, buyer, orderIds (non-empty array)' },
            { status: 400 }
          );
        }

        const data = await magicEdenRunesService.getSweepingPsbt({
          rune, buyer, orderIds, feeRate, fundingUtxos,
        });
        return NextResponse.json(data);
      }

      case 'submit': {
        const { psbt, signedPsbt, orderIds, buyer } = body;

        if (!psbt || !orderIds || !buyer) {
          return NextResponse.json(
            { error: 'Missing required fields: psbt, orderIds, buyer' },
            { status: 400 }
          );
        }

        const data = await magicEdenRunesService.submitSweeping({
          psbt, signedPsbt, orderIds, buyer,
        });
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "psbt" or "submit".' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] POST /api/magiceden/runes/sweep error:', error);
    return NextResponse.json(
      { error: 'Failed to process rune sweep' },
      { status: 500 }
    );
  }
}
