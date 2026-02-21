import { NextRequest, NextResponse } from 'next/server';
import { hyperliquidTradingService } from '@/services/HyperliquidTradingService';

export async function GET(request: NextRequest) {
  try {
    const coin = request.nextUrl.searchParams.get('coin');

    if (coin) {
      const [orderBook, marketData] = await Promise.allSettled([
        hyperliquidTradingService.getOrderBook(coin),
        hyperliquidTradingService.getMarketData(coin),
      ]);
      return NextResponse.json({
        success: true,
        orderBook: orderBook.status === 'fulfilled' ? orderBook.value : null,
        marketData: marketData.status === 'fulfilled' ? marketData.value : null,
      });
    }

    // Return market data for default assets
    const result = await hyperliquidTradingService.getMultipleMarketPrices(['BTC', 'ETH', 'SOL']);
    return NextResponse.json({ success: true, prices: result.data || {} });
  } catch (error) {
    console.error('[Hyperliquid Market] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch market data', prices: {} }, { status: 500 });
  }
}
