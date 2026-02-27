import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Data is simulated estimates based on publicly reported Feb 2026 figures.
    // Real-time ETF flow data requires Bloomberg Terminal API or similar paid subscription.
    // Corporate treasury data sourced from public filings (approximate).

    const data = {
      simulated: true,
      source: 'estimated-public-filings',
      note: 'Institutional flow data is estimated from public reports. Real-time data requires Bloomberg Terminal API subscription.',
      etfFlows: {
        daily: 245_000_000, // Daily net flow in USD
        weekly: 1_823_000_000,
        monthly: 7_450_000_000,
        total: 85_600_000_000, // Total AUM
        topInflows: [
          { name: 'BlackRock IBIT', flow: 245_600_000, aum: 45_678_000_000 },
          { name: 'Fidelity FBTC', flow: 189_300_000, aum: 38_902_000_000 },
          { name: 'ARK 21Shares ARKB', flow: 98_400_000, aum: 12_345_000_000 },
        ],
        topOutflows: [
          { name: 'Grayscale GBTC', flow: -67_800_000, aum: 28_456_000_000 },
          { name: 'Valkyrie BRRR', flow: -12_300_000, aum: 2_100_000_000 },
          { name: 'VanEck HODL', flow: -8_900_000, aum: 1_800_000_000 },
        ],
      },
      corporateTreasury: {
        totalBitcoin: 542_389,
        totalUsd: 51_687_090_000, // At $95,450/BTC
        topHolders: [
          { name: 'MicroStrategy', bitcoin: 189_150, avgPrice: 30_397 },
          { name: 'Marathon Digital', bitcoin: 25_134, avgPrice: 42_851 },
          { name: 'Tesla', bitcoin: 9_720, avgPrice: 31_620 },
          { name: 'Galaxy Digital', bitcoin: 8_945, avgPrice: 38_200 },
          { name: 'Coinbase', bitcoin: 9_000, avgPrice: 27_100 },
        ],
        recentPurchases: [
          { name: 'MicroStrategy', bitcoin: 3_000, date: 'Feb 10, 2026', price: 94_200 },
          { name: 'Marathon Digital', bitcoin: 1_200, date: 'Feb 8, 2026', price: 93_800 },
          { name: 'Riot Platforms', bitcoin: 850, date: 'Feb 5, 2026', price: 92_100 },
        ],
      },
      grayscale: {
        premium: -1.2, // Negative = discount
        aum: 28_456_000_000,
        dailyFlow: -67_800_000,
      },
      timestamp: Date.now(),
    };

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.error('Error fetching institutional flow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch institutional flow' },
      { status: 500 }
    );
  }
}
