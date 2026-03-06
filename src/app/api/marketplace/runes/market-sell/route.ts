import { NextRequest, NextResponse } from 'next/server';
import { runesMarketService } from '@/services/runesMarketService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'psbt': {
        const { rune, seller, amount, utxos, feeRate, minPrice } = body;

        if (!rune || !seller || !amount) {
          return NextResponse.json(
            { error: 'Missing required fields: rune, seller, amount' },
            { status: 400 }
          );
        }

        const data = await runesMarketService.getMarketSellPsbt({
          rune, seller, amount, utxos, feeRate, minPrice,
        });
        return NextResponse.json(data);
      }

      case 'submit': {
        const { psbt, signedPsbt, seller, matchedOrderIds } = body;

        if (!psbt || !seller || !matchedOrderIds) {
          return NextResponse.json(
            { error: 'Missing required fields: psbt, seller, matchedOrderIds' },
            { status: 400 }
          );
        }

        const data = await runesMarketService.submitMarketSell({
          psbt, signedPsbt, seller, matchedOrderIds,
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
    console.error('[API] POST /api/marketplace/runes/market-sell error:', error);
    return NextResponse.json(
      { error: 'Failed to process rune market sell' },
      { status: 500 }
    );
  }
}
