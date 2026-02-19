import { NextRequest, NextResponse } from 'next/server';
import { magicEdenRunesService } from '@/services/magicEdenRunesService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create-psbt': {
        const { side, rune, maker, amount, unitPrice, expiresAt, utxos, feeRate } = body;

        if (!side || !rune || !maker || !amount || !unitPrice) {
          return NextResponse.json(
            { error: 'Missing required fields: side, rune, maker, amount, unitPrice' },
            { status: 400 }
          );
        }

        const data = await magicEdenRunesService.createOrderPsbt({
          side, rune, maker, amount, unitPrice, expiresAt, utxos, feeRate,
        });
        return NextResponse.json(data);
      }

      case 'submit': {
        const { orderId, psbt, signedPsbt } = body;

        if (!orderId || !psbt) {
          return NextResponse.json(
            { error: 'Missing required fields: orderId, psbt' },
            { status: 400 }
          );
        }

        const data = await magicEdenRunesService.submitOrder({
          orderId, psbt, signedPsbt,
        });
        return NextResponse.json(data);
      }

      case 'cancel-psbt': {
        const { orderId, maker } = body;

        if (!orderId || !maker) {
          return NextResponse.json(
            { error: 'Missing required fields: orderId, maker' },
            { status: 400 }
          );
        }

        const data = await magicEdenRunesService.cancelOrderPsbt({
          orderId, maker,
        });
        return NextResponse.json(data);
      }

      case 'cancel': {
        const { orderId, signedMessage, maker } = body;

        if (!orderId || !signedMessage || !maker) {
          return NextResponse.json(
            { error: 'Missing required fields: orderId, signedMessage, maker' },
            { status: 400 }
          );
        }

        const data = await magicEdenRunesService.cancelOrder({
          orderId, signedMessage, maker,
        });
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "create-psbt", "submit", "cancel-psbt", or "cancel".' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] POST /api/magiceden/runes/order error:', error);
    return NextResponse.json(
      { error: 'Failed to process rune order' },
      { status: 500 }
    );
  }
}
