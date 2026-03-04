// Agent Data Fetchers — shared functions that agents call for real-time context

export async function fetchBTCPrice(): Promise<string> {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
    const data = await res.json();
    return [
      `[BTC Market Data]`,
      `Price: $${parseFloat(data.lastPrice).toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
      `24h Change: ${parseFloat(data.priceChangePercent).toFixed(2)}%`,
      `24h High: $${parseFloat(data.highPrice).toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
      `24h Low: $${parseFloat(data.lowPrice).toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
      `24h Volume: ${parseFloat(data.volume).toLocaleString('en-US', { maximumFractionDigits: 0 })} BTC`,
      `24h Quote Volume: $${parseFloat(data.quoteVolume).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
    ].join('\n');
  } catch (err) {
    console.error('fetchBTCPrice error:', err);
    return '[BTC price data unavailable]';
  }
}

export async function fetchMempoolStats(): Promise<string> {
  try {
    const [feesRes, mempoolRes] = await Promise.all([
      fetch('https://mempool.space/api/v1/fees/recommended', { next: { revalidate: 60 } }),
      fetch('https://mempool.space/api/mempool', { next: { revalidate: 60 } }),
    ]);

    if (!feesRes.ok) throw new Error(`Mempool fees HTTP ${feesRes.status}`);
    const fees = await feesRes.json();
    const mempool = mempoolRes.ok ? await mempoolRes.json() : null;

    const lines = [
      `[Mempool & Fee Data]`,
      `Fastest Fee: ${fees.fastestFee} sat/vB`,
      `Half-Hour Fee: ${fees.halfHourFee} sat/vB`,
      `Hour Fee: ${fees.hourFee} sat/vB`,
      `Economy Fee: ${fees.economyFee} sat/vB`,
      `Minimum Fee: ${fees.minimumFee} sat/vB`,
    ];
    if (mempool) {
      lines.push(`Mempool Size: ${mempool.count?.toLocaleString() ?? 'N/A'} txs`);
      lines.push(`Mempool vSize: ${((mempool.vsize ?? 0) / 1_000_000).toFixed(2)} MvB`);
    }
    return lines.join('\n');
  } catch (err) {
    console.error('fetchMempoolStats error:', err);
    return '[Mempool data unavailable]';
  }
}

export async function fetchFearGreed(): Promise<string> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1', {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`FearGreed HTTP ${res.status}`);
    const data = await res.json();
    const entry = data.data?.[0];
    if (!entry) return '[Fear & Greed data unavailable]';
    return [
      `[Fear & Greed Index]`,
      `Value: ${entry.value}/100`,
      `Classification: ${entry.value_classification}`,
      `Updated: ${new Date(parseInt(entry.timestamp) * 1000).toUTCString()}`,
    ].join('\n');
  } catch (err) {
    console.error('fetchFearGreed error:', err);
    return '[Fear & Greed data unavailable]';
  }
}

export async function fetchNewsHeadlines(): Promise<string> {
  try {
    const res = await fetch(
      'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC,Bitcoin&excludeCategories=Sponsored',
      { next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error(`CryptoCompare News HTTP ${res.status}`);
    const data = await res.json();
    const articles = data.Data ?? [];
    const top = articles.slice(0, 6);
    if (top.length === 0) return '[No recent news available]';
    const lines = ['[Latest Crypto News]'];
    for (const a of top) {
      const title = a.title ?? 'Untitled';
      const source = a.source ?? '';
      lines.push(`- ${title}${source ? ` (${source})` : ''}`);
    }
    return lines.join('\n');
  } catch (err) {
    console.error('fetchNewsHeadlines error:', err);
    return '[News data unavailable]';
  }
}

export async function fetchDerivatives(): Promise<string> {
  try {
    const [fundingRes, oiRes, lsRes] = await Promise.all([
      fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT', { next: { revalidate: 60 } }),
      fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT', { next: { revalidate: 60 } }),
      fetch('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1h&limit=1', { next: { revalidate: 300 } }),
    ]);

    const lines = ['[BTC Derivatives Data]'];

    if (fundingRes.ok) {
      const funding = await fundingRes.json();
      const rate = parseFloat(funding.lastFundingRate);
      lines.push(`Funding Rate: ${(rate * 100).toFixed(4)}%`);
      lines.push(`Mark Price: $${parseFloat(funding.markPrice).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
      lines.push(`Index Price: $${parseFloat(funding.indexPrice).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
    }

    if (oiRes.ok) {
      const oi = await oiRes.json();
      lines.push(`Open Interest: ${parseFloat(oi.openInterest).toLocaleString('en-US', { maximumFractionDigits: 2 })} BTC`);
    }

    if (lsRes.ok) {
      const lsData = await lsRes.json();
      if (Array.isArray(lsData) && lsData.length > 0) {
        const ls = lsData[0];
        lines.push(`Long/Short Ratio: ${parseFloat(ls.longShortRatio).toFixed(4)}`);
        lines.push(`Longs: ${(parseFloat(ls.longAccount) * 100).toFixed(2)}% | Shorts: ${(parseFloat(ls.shortAccount) * 100).toFixed(2)}%`);
      }
    }

    return lines.length > 1 ? lines.join('\n') : '[Derivatives data unavailable]';
  } catch (err) {
    console.error('fetchDerivatives error:', err);
    return '[Derivatives data unavailable]';
  }
}

export async function fetchOrdinalsMarketData(): Promise<string> {
  try {
    const UNISAT_API_KEY = process.env.UNISAT_API_KEY;
    const lines: string[] = [];

    // Fetch BRC-20 data from UniSat (works well!)
    if (UNISAT_API_KEY) {
      try {
        const brc20ListRes = await fetch('https://open-api.unisat.io/v1/indexer/brc20/list?start=0&limit=10', {
          next: { revalidate: 300 },
          headers: {
            'Authorization': `Bearer ${UNISAT_API_KEY}`,
            'Accept': 'application/json',
          }
        });

        if (brc20ListRes.ok) {
          const brc20Data = await brc20ListRes.json();
          if (brc20Data.code === 0 && brc20Data.data?.detail) {
            lines.push('[Live BRC-20 Tokens from UniSat]');

            // Get details for top tokens
            const topTokens = brc20Data.data.detail.slice(0, 6);
            for (const ticker of topTokens) {
              try {
                const infoRes = await fetch(`https://open-api.unisat.io/v1/indexer/brc20/${ticker}/info`, {
                  next: { revalidate: 300 },
                  headers: {
                    'Authorization': `Bearer ${UNISAT_API_KEY}`,
                    'Accept': 'application/json',
                  }
                });

                if (infoRes.ok) {
                  const info = await infoRes.json();
                  if (info.code === 0 && info.data) {
                    const d = info.data;
                    const holders = d.holdersCount?.toLocaleString() || 'N/A';
                    const supply = d.totalMinted || d.max || 'N/A';
                    lines.push(`• ${ticker.toUpperCase()}: ${holders} holders | Supply: ${supply}`);
                  }
                }
              } catch (err) {
                console.error(`Error fetching ${ticker}:`, err);
              }
            }
          }
        }
      } catch (unisatErr) {
        console.error('UniSat fetch error:', unisatErr);
      }
    }

    // Try OKX for Ordinals NFT collections
    try {
      const okxRes = await fetch('https://www.okx.com/api/v5/mktplace/nft/ordinals/collections?sortBy=volume&limit=10', {
        next: { revalidate: 600 },
        headers: { 'Accept': 'application/json' }
      });

      if (okxRes.ok) {
        const okxData = await okxRes.json();
        if (okxData.data && Array.isArray(okxData.data)) {
          if (lines.length > 0) lines.push('');
          lines.push('[Live Ordinals Collections from OKX]');

          for (const col of okxData.data.slice(0, 8)) {
            const name = col.collectionName || col.name || 'Unknown';
            const floorBTC = col.floorPrice || col.floor;
            const volume24h = col.volume24h || col.vol24h;
            lines.push(`• ${name}: Floor ${floorBTC ? floorBTC + ' BTC' : 'N/A'} | 24h Vol: ${volume24h ? volume24h + ' BTC' : 'N/A'}`);
          }
        }
      }
    } catch (okxErr) {
      console.error('OKX fetch error:', okxErr);
    }

    // Return data if we got any
    if (lines.length > 0) {
      return lines.join('\n');
    }

    // Fallback to general market context
    return `[Ordinals Market Context]
Note: Real-time floor prices not available (API rate limits).

General Market Reference Points (approximate ranges):
• Top Tier (0.10-0.30 BTC): NodeMonkes, Bitcoin Puppets, Quantum Cats
• Mid Tier (0.02-0.10 BTC): Bitcoin Frogs, OMB, Runestone
• Emerging (<0.02 BTC): Various newer collections

For exact current prices, check:
- Gamma.io: gamma.io/ordinals
- OKX Marketplace: okx.com/web3/marketplace/ordinals
- UniSat: unisat.io/market`;

  } catch (err) {
    console.error('fetchOrdinalsMarketData error:', err);
    return `[Ordinals Market Data]
Real-time data temporarily unavailable. Using general market knowledge and historical context for analysis.

For current floor prices and volume, please check:
• Gamma.io: gamma.io/ordinals
• OKX: okx.com/web3/marketplace/ordinals`;
  }
}

// Map of fetcher names to functions for agent config references
export const dataFetcherMap: Record<string, () => Promise<string>> = {
  fetchBTCPrice,
  fetchMempoolStats,
  fetchFearGreed,
  fetchNewsHeadlines,
  fetchDerivatives,
  fetchOrdinalsMarketData,
};
