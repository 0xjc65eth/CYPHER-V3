import { NextRequest, NextResponse } from 'next/server';
import { fetchAllExchangePrices, EXCHANGE_FEES, type ExchangePrice } from '@/lib/arbitrage/exchange-fetchers';
import { cache } from '@/lib/cache/redis.config';

const CACHE_TTL = 3; // seconds

interface Opportunity {
  buyFrom: string;
  sellTo: string;
  buyPrice: number;
  sellPrice: number;
  spreadPercent: number;
  buyFee: number;
  sellFee: number;
  netProfitPercent: number;
  estimatedProfitPer1BTC: number;
}

export async function GET(request: NextRequest) {
  try {
    const pair = request.nextUrl.searchParams.get('pair') || 'BTC/USDT';

    // ── Check Redis cache ──
    const cacheKey = `arb:prices:${pair}`;
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return NextResponse.json(parsed, {
          headers: { 'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=10' },
        });
      }
    } catch { /* cache miss */ }

    // ── Fetch from all 8 exchanges ──
    const exchanges = await fetchAllExchangePrices(pair);

    if (exchanges.length === 0) {
      return NextResponse.json(
        { error: 'All exchange fetches failed', pair },
        { status: 502 }
      );
    }

    // Find best bid (highest) and best ask (lowest)
    let bestBid = { exchange: '', price: 0 };
    let bestAsk = { exchange: '', price: Infinity };

    for (const ex of exchanges) {
      if (ex.bid > bestBid.price) {
        bestBid = { exchange: ex.exchange, price: ex.bid };
      }
      if (ex.ask > 0 && ex.ask < bestAsk.price) {
        bestAsk = { exchange: ex.exchange, price: ex.ask };
      }
    }

    // Calculate arbitrage opportunities (buy at lowest ask, sell at highest bid)
    const opportunities: Opportunity[] = [];

    for (const buyer of exchanges) {
      for (const seller of exchanges) {
        if (buyer.exchange === seller.exchange) continue;
        if (buyer.ask <= 0 || seller.bid <= 0) continue;

        const buyFee = EXCHANGE_FEES[buyer.exchange] || 0.002;
        const sellFee = EXCHANGE_FEES[seller.exchange] || 0.002;
        const grossSpread = ((seller.bid - buyer.ask) / buyer.ask) * 100;
        const netProfit = grossSpread - buyFee * 100 - sellFee * 100;

        if (grossSpread > 0) {
          opportunities.push({
            buyFrom: buyer.exchange,
            sellTo: seller.exchange,
            buyPrice: buyer.ask,
            sellPrice: seller.bid,
            spreadPercent: parseFloat(grossSpread.toFixed(4)),
            buyFee,
            sellFee,
            netProfitPercent: parseFloat(netProfit.toFixed(4)),
            estimatedProfitPer1BTC: parseFloat(
              (seller.bid * (1 - sellFee) - buyer.ask * (1 + buyFee)).toFixed(2)
            ),
          });
        }
      }
    }

    // Sort by net profit descending
    opportunities.sort((a, b) => b.netProfitPercent - a.netProfitPercent);

    const maxSpread = exchanges.length >= 2
      ? parseFloat((bestBid.price - bestAsk.price).toFixed(2))
      : 0;

    // Map exchange data to the format the frontend expects
    const exchangesFormatted = exchanges.map((ex) => {
      const spread = ex.ask - ex.bid;
      const spreadPercent = ex.bid > 0 ? ((ex.ask - ex.bid) / ex.bid) * 100 : 0;
      const fee = EXCHANGE_FEES[ex.exchange] || 0.002;
      return {
        name: ex.exchange,
        bid: ex.bid,
        ask: ex.ask,
        last: ex.last,
        spread: parseFloat(spread.toFixed(2)),
        spreadPercent: parseFloat(spreadPercent.toFixed(4)),
        volume24h: ex.volume > 0 ? ex.volume : null,
        fee,
        feePercent: `${(fee * 100).toFixed(2)}%`,
      };
    });

    const response = {
      pair,
      exchanges: exchangesFormatted,
      bestBid,
      bestAsk,
      maxSpread,
      maxSpreadPercent: bestAsk.price > 0
        ? parseFloat(((maxSpread / bestAsk.price) * 100).toFixed(4))
        : 0,
      opportunities: opportunities.slice(0, 20),
      fees: EXCHANGE_FEES,
      exchangeCount: exchanges.length,
      timestamp: Date.now(),
    };

    // ── Save to Redis cache ──
    try {
      await cache.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
    } catch { /* non-fatal */ }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=10' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to fetch arbitrage data: ${message}` }, { status: 500 });
  }
}
