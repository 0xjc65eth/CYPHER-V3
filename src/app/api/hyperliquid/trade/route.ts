import { NextRequest, NextResponse } from 'next/server';
import { HyperliquidTrader } from '@/services/hyperliquidTrader';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privateKey, coin, isBuy, size, price, leverage, stopLoss, takeProfit, testnet } = body;

    if (!privateKey) {
      return NextResponse.json({ success: false, error: 'Private key required for trading' }, { status: 400 });
    }

    const trader = new HyperliquidTrader({
      privateKey,
      testnet: testnet ?? true, // Default testnet
    });

    await trader.connect();

    const result = await trader.placeOrder({
      coin: coin || 'BTC-PERP',
      isBuy: isBuy ?? true,
      size: size || 0.001,
      price,
      leverage: leverage || 1,
      stopLoss,
      takeProfit,
    });

    await trader.disconnect();

    return NextResponse.json({ success: true, order: result });
  } catch (error) {
    console.error('[Hyperliquid Trade] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Trade failed',
    }, { status: 500 });
  }
}
