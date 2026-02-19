import { NextRequest, NextResponse } from 'next/server';
import { twelveDataService } from '@/services/twelvedata/TwelveDataService';
import { getRedisClient } from '@/lib/cache/redis.config';

const CACHE_KEY = 'market:multi-asset';
const CACHE_TTL = 300; // 5 minutes
const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=true&price_change_percentage=1h,24h,7d';

export async function GET(request: NextRequest) {
  try {
    const redis = getRedisClient();

    // Check cache first
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return NextResponse.json(JSON.parse(cached as string), {
        headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
      });
    }

    // Fetch crypto data from CoinGecko
    let crypto: Array<{
      symbol: string;
      name: string;
      price: number;
      change1h: number;
      change24h: number;
      change7d: number;
      marketCap: number;
      volume24h: number;
      image: string;
      sparkline7d: number[];
    }> = [];

    try {
      const cgRes = await fetch(COINGECKO_URL, {
        signal: AbortSignal.timeout(10000),
        headers: { Accept: 'application/json' },
      });

      if (cgRes.ok) {
        const cgData = await cgRes.json();
        crypto = cgData.map((coin: any) => ({
          symbol: (coin.symbol || '').toUpperCase(),
          name: coin.name || '',
          price: coin.current_price || 0,
          change1h: coin.price_change_percentage_1h_in_currency || 0,
          change24h: coin.price_change_percentage_24h_in_currency || coin.price_change_percentage_24h || 0,
          change7d: coin.price_change_percentage_7d_in_currency || 0,
          marketCap: coin.market_cap || 0,
          volume24h: coin.total_volume || 0,
          image: coin.image || '',
          sparkline7d: coin.sparkline_in_7d?.price || [],
        }));
      }
    } catch (err) {
      console.error('[multi-asset] CoinGecko fetch error:', err);
    }

    // Fetch forex/commodities/indices/stocks from TwelveData
    let forex: Array<{ pair: string; price: number; change: number; changePercent: number; previousClose: number }> = [];
    let commodities: Array<{ symbol: string; name: string; price: number; change: number; changePercent: number; unit: string }> = [];
    let indices: Array<{ symbol: string; name: string; price: number; change: number; changePercent: number }> = [];
    let stocks: Array<{ symbol: string; name: string; price: number; change: number; changePercent: number; volume: number }> = [];

    try {
      const tdData = await twelveDataService.getAllMarketData();

      if (tdData.available) {
        forex = tdData.forex.map((f) => ({
          pair: f.symbol,
          price: f.price,
          change: f.change,
          changePercent: f.changePercent,
          previousClose: f.price - f.change,
        }));

        commodities = tdData.commodities.map((c) => ({
          symbol: c.symbol,
          name: c.name,
          price: c.price,
          change: c.change,
          changePercent: c.changePercent,
          unit: c.symbol.includes('XAU') || c.symbol.includes('XAG') ? 'oz' : c.symbol === 'CL' ? 'bbl' : 'unit',
        }));

        indices = tdData.indices.map((i) => ({
          symbol: i.symbol,
          name: i.name,
          price: i.price,
          change: i.change,
          changePercent: i.changePercent,
        }));

        stocks = tdData.stocks.map((s) => ({
          symbol: s.symbol,
          name: s.name,
          price: s.price,
          change: s.change,
          changePercent: s.changePercent,
          volume: s.volume,
        }));
      }
    } catch (err) {
      console.error('[multi-asset] TwelveData fetch error:', err);
    }

    const data = {
      crypto,
      forex,
      commodities,
      indices,
      stocks,
      timestamp: Date.now(),
    };

    // Cache the result
    await redis.set(CACHE_KEY, JSON.stringify(data), 'EX', CACHE_TTL);

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('[multi-asset] Route error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
