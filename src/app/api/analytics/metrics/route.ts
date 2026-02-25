import { NextRequest, NextResponse } from 'next/server';
import { rateLimitedFetch } from '@/lib/rateLimitedFetch';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get('timeframe') || '24h';
    const metrics = searchParams.get('metrics')?.split(',') || ['all'];

    const result: Record<string, any> = {};

    // Fetch real price and market data from CoinGecko
    if (metrics.includes('all') || metrics.includes('price') || metrics.includes('market')) {
      try {
        const coinData = await rateLimitedFetch(
          'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false'
        );

        if (coinData) {
          if (metrics.includes('all') || metrics.includes('price')) {
            result.price = {
              current: coinData.market_data?.current_price?.usd ?? null,
              change24h: coinData.market_data?.price_change_percentage_24h ?? null,
              change7d: coinData.market_data?.price_change_percentage_7d ?? null,
              ath: coinData.market_data?.ath?.usd ?? null,
              atl: coinData.market_data?.atl?.usd ?? null,
            };
          }

          if (metrics.includes('all') || metrics.includes('market')) {
            result.market = {
              cap: coinData.market_data?.market_cap?.usd ?? null,
              volume24h: coinData.market_data?.total_volume?.usd ?? null,
              circulatingSupply: coinData.market_data?.circulating_supply ?? null,
              maxSupply: coinData.market_data?.max_supply ?? 21000000,
            };
          }
        }
      } catch {
        // CoinGecko unavailable; omit price/market sections
      }
    }

    // Fetch real on-chain data from mempool.space
    if (metrics.includes('all') || metrics.includes('onChain')) {
      try {
        const [hashrate, difficulty, blockHeight, mempoolInfo] = await Promise.all([
          fetch('https://mempool.space/api/v1/mining/hashrate/1d').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('https://mempool.space/api/v1/difficulty-adjustment').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('https://mempool.space/api/blocks/tip/height').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('https://mempool.space/api/mempool').then(r => r.ok ? r.json() : null).catch(() => null),
        ]);

        const onChain: Record<string, any> = {};
        if (hashrate?.currentHashrate) onChain.hashRate = hashrate.currentHashrate / 1e18; // EH/s
        if (difficulty?.difficultyChange !== undefined) onChain.difficultyChange = difficulty.difficultyChange;
        if (typeof blockHeight === 'number') onChain.blockHeight = blockHeight;
        if (mempoolInfo?.count) onChain.mempoolTxCount = mempoolInfo.count;
        if (mempoolInfo?.vsize) onChain.mempoolSize = Math.round(mempoolInfo.vsize / 1_000_000); // MB

        if (Object.keys(onChain).length > 0) {
          result.onChain = onChain;
        }
      } catch {
        // Mempool.space unavailable; omit on-chain section
      }
    }

    // Technical indicators are NOT included - they require historical OHLCV data
    // and proper calculation. Omitting them is more honest than faking them.
    if (metrics.includes('all') || metrics.includes('technical')) {
      result.technical = {
        message: 'Technical indicators require historical OHLCV data and are available through the TechnicalIndicatorsService when configured.'
      };
    }

    // Sentiment - only include fear/greed index if available from a real source
    if (metrics.includes('all') || metrics.includes('sentiment')) {
      try {
        const fgRes = await fetch('https://api.alternative.me/fng/?limit=1');
        if (fgRes.ok) {
          const fgData = await fgRes.json();
          if (fgData?.data?.[0]) {
            result.sentiment = {
              fearGreedIndex: parseInt(fgData.data[0].value, 10),
              fearGreedLabel: fgData.data[0].value_classification,
            };
          }
        }
      } catch {
        // Fear & Greed API unavailable; omit sentiment section
      }
    }

    const hasData = Object.keys(result).some(k => result[k] && typeof result[k] === 'object' && !result[k].message);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      timeframe,
      data: result,
      ...(hasData ? {} : { message: 'Some data sources may be temporarily unavailable' })
    });

  } catch (error) {
    console.error('Analytics metrics API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
