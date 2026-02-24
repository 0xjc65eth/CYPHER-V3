import { NextRequest, NextResponse } from 'next/server';
import { coinGeckoService } from '@/lib/api/coingecko-service';

// Proxy para API do CoinGecko usando centralized rate-limited service
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || '/simple/price';
  const params = searchParams.get('params') || '';

  try {
    let data: any;

    // Parse params string into object
    const paramsObj: Record<string, string> = {};
    if (params) {
      const urlParams = new URLSearchParams(params);
      urlParams.forEach((value, key) => {
        paramsObj[key] = value;
      });
    }

    // Route to appropriate service method based on endpoint
    if (endpoint === '/simple/price') {
      const ids = paramsObj.ids?.split(',') || ['bitcoin'];
      const vsCurrencies = paramsObj.vs_currencies?.split(',') || ['usd'];

      data = await coinGeckoService.getSimplePrice(ids, vsCurrencies, {
        include24hrChange: paramsObj.include_24hr_change === 'true',
        include24hrVol: paramsObj.include_24hr_vol === 'true',
        includeMarketCap: paramsObj.include_market_cap === 'true',
      });
    } else if (endpoint === '/coins/markets') {
      data = await coinGeckoService.getCoinsMarkets(paramsObj.vs_currency || 'usd', {
        perPage: parseInt(paramsObj.per_page || '20'),
        page: parseInt(paramsObj.page || '1'),
        ids: paramsObj.ids?.split(','),
      });
    } else if (endpoint === '/global') {
      data = await coinGeckoService.getGlobal();
    } else {
      // For other endpoints, return fallback
      data = getFallbackData(endpoint);
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=90',
        'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'https://cypherordifuture.xyz',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('CoinGecko proxy error:', error);

    // Retornar dados de fallback
    const fallbackData = getFallbackData(endpoint);

    return NextResponse.json(fallbackData, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'https://cypherordifuture.xyz',
        'X-Fallback-Data': 'true',
      },
    });
  }
}

function getFallbackData(endpoint: string) {
  const fallbackMap: Record<string, any> = {
    '/simple/price': {
      bitcoin: {
        usd: 67500,
        eur: 62000,
        gbp: 53000,
        cad: 92000,
        chf: 60000,
        aud: 102000,
        jpy: 10200000
      },
      ethereum: {
        usd: 3850,
        eur: 3540,
        gbp: 3020,
        cad: 5250,
        chf: 3430,
        aud: 5820,
        jpy: 582000
      },
      solana: {
        usd: 185,
        eur: 170,
        gbp: 145,
        cad: 252,
        chf: 165,
        aud: 280,
        jpy: 28000
      }
    },
    '/coins/markets': [
      {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
        current_price: 67500,
        market_cap: 1330000000000,
        market_cap_rank: 1,
        fully_diluted_valuation: 1416000000000,
        total_volume: 18500000000,
        high_24h: 68200,
        low_24h: 66800,
        price_change_24h: 750,
        price_change_percentage_24h: 1.12,
        market_cap_change_24h: 14800000000,
        market_cap_change_percentage_24h: 1.13,
        circulating_supply: 19700000,
        total_supply: 21000000,
        max_supply: 21000000,
        ath: 73750,
        ath_change_percentage: -8.47,
        ath_date: '2024-03-14T07:10:36.635Z',
        atl: 67.81,
        atl_change_percentage: 99400.45,
        atl_date: '2013-07-06T00:00:00.000Z',
        roi: null,
        last_updated: new Date().toISOString()
      }
    ],
    '/global': {
      data: {
        active_cryptocurrencies: 9500,
        upcoming_icos: 0,
        ongoing_icos: 49,
        ended_icos: 3738,
        markets: 750,
        total_market_cap: {
          btc: 38500000,
          eth: 680000000,
          ltc: 29000000000,
          bch: 5100000000,
          bnb: 4850000000,
          eos: 3850000000000,
          xrp: 4320000000000,
          xlm: 22500000000000,
          link: 158000000000,
          dot: 246000000000,
          yfi: 385000000,
          usd: 2600000000000,
          aed: 9540000000000,
          ars: 2300000000000000,
          aud: 3950000000000,
          bdt: 312000000000000,
          bhd: 980000000000,
          bmd: 2600000000000,
          brl: 14400000000000,
          cad: 3550000000000,
          chf: 2320000000000,
          clp: 2550000000000000,
          cny: 18900000000000,
          czk: 60700000000000,
          dkk: 17800000000000,
          eur: 2390000000000,
          gbp: 2050000000000,
          hkd: 20400000000000,
          huf: 943000000000000,
          idr: 41300000000000000,
          ils: 9650000000000,
          inr: 217000000000000,
          jpy: 393000000000000,
          krw: 3490000000000000,
          kwd: 800000000000,
          lkr: 778000000000000,
          mmk: 5460000000000000,
          mxn: 43800000000000,
          myr: 12300000000000,
          ngn: 4130000000000000,
          nok: 28000000000000,
          nzd: 4320000000000,
          php: 147000000000000,
          pkr: 723000000000000,
          pln: 10200000000000,
          rub: 251000000000000,
          sar: 9760000000000,
          sek: 27600000000000,
          sgd: 3490000000000,
          thb: 93000000000000,
          try: 84900000000000,
          twd: 84200000000000,
          uah: 107000000000000,
          vef: 260000000000,
          vnd: 64300000000000000,
          zar: 47100000000000,
          xdr: 1960000000000
        },
        total_volume: {
          btc: 1650000,
          eth: 29000000,
          ltc: 1240000000,
          bch: 218000000,
          bnb: 207000000,
          eos: 164000000000,
          xrp: 184000000000,
          xlm: 962000000000,
          link: 6750000000,
          dot: 10500000000,
          yfi: 16450000,
          usd: 111000000000,
          aed: 408000000000,
          ars: 98300000000000,
          aud: 169000000000,
          bdt: 13300000000000,
          bhd: 41900000000,
          bmd: 111000000000,
          brl: 615000000000,
          cad: 152000000000,
          chf: 99200000000,
          clp: 109000000000000,
          cny: 807000000000,
          czk: 2590000000000,
          dkk: 760000000000,
          eur: 102000000000,
          gbp: 87600000000,
          hkd: 872000000000,
          huf: 40300000000000,
          idr: 1760000000000000,
          ils: 412000000000,
          inr: 9270000000000,
          jpy: 16800000000000,
          krw: 149000000000000,
          kwd: 34200000000,
          lkr: 33200000000000,
          mmk: 233000000000000,
          mxn: 1870000000000,
          myr: 525000000000,
          ngn: 176000000000000,
          nok: 1200000000000,
          nzd: 184000000000,
          php: 6280000000000,
          pkr: 30900000000000,
          pln: 436000000000,
          rub: 10700000000000,
          sar: 417000000000,
          sek: 1180000000000,
          sgd: 149000000000,
          thb: 3970000000000,
          try: 3630000000000,
          twd: 3600000000000,
          uah: 4570000000000,
          vef: 11100000000,
          vnd: 2750000000000000,
          zar: 2010000000000,
          xdr: 83700000000
        },
        market_cap_percentage: {
          btc: 51.2,
          eth: 14.8,
          usdt: 4.3,
          bnb: 3.4,
          sol: 2.8,
          usdc: 1.2,
          steth: 1.1,
          xrp: 1.5,
          ton: 0.8,
          doge: 0.7
        },
        market_cap_change_percentage_24h_usd: 1.23,
        updated_at: Math.floor(Date.now() / 1000)
      }
    }
  };

  return fallbackMap[endpoint] || { error: 'No fallback data available', endpoint };
}