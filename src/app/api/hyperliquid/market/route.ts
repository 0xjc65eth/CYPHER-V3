import { NextRequest, NextResponse } from 'next/server';
import { getHyperliquidReader } from '@/services/hyperliquidTrader';

export async function GET(request: NextRequest) {
  try {
    const reader = getHyperliquidReader();
    const coin = request.nextUrl.searchParams.get('coin');

    if (coin) {
      const [orderBook, recentTrades] = await Promise.allSettled([
        reader.getOrderBook(coin),
        reader.getRecentTrades(coin),
      ]);
      return NextResponse.json({
        success: true,
        orderBook: orderBook.status === 'fulfilled' ? orderBook.value : null,
        recentTrades: recentTrades.status === 'fulfilled' ? recentTrades.value : [],
      });
    }

    const prices = await reader.getMarketPrices();
    return NextResponse.json({ success: true, prices });
  } catch (error) {
    console.error('[Hyperliquid Market] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch market data', prices: {} }, { status: 500 });
  }
}
