import { NextRequest, NextResponse } from 'next/server';
import { OKXOrdinalsAPI } from '@/services/ordinals/integrations/OKXOrdinalsAPI';

const okxApi = new OKXOrdinalsAPI();

/**
 * Ordinals Collection Leaderboard API Route
 * GET /api/ordinals/leaderboard/[symbol]
 *
 * Returns top collectors/holders leaderboard for a collection
 * Data source: OKX (primary) → Magic Eden (fallback)
 */

interface RouteContext {
  params: Promise<{ symbol: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { symbol } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Collection symbol is required' },
        { status: 400 }
      );
    }

    // Get collection details — OKX primary, ME fallback
    let collectionName = symbol;
    let totalSupply = 0;
    let floorPrice = 0;
    let totalCollectorsFromStats = 0;

    try {
      const okxCollection = await okxApi.getCollection(symbol);
      if (okxCollection) {
        collectionName = okxCollection.name || symbol;
        totalSupply = okxCollection.totalSupply;
        floorPrice = parseFloat(okxCollection.floorPrice || '0');
        totalCollectorsFromStats = okxCollection.ownerCount;
      }
    } catch (error) {
      // OKX failed, will fall through to ME
    }

    // Fallback to Hiro if OKX didn't return data
    if (totalSupply === 0 && floorPrice === 0) {
      try {
        const hiroHeaders: Record<string, string> = { 'Accept': 'application/json' };
        const hiroApiKey = process.env.HIRO_API_KEY;
        if (hiroApiKey) hiroHeaders['x-hiro-api-key'] = hiroApiKey;

        const hiroResponse = await fetch(
          `https://api.hiro.so/ordinals/v1/collections/${symbol}`,
          { headers: hiroHeaders, next: { revalidate: 60 } }
        );

        if (hiroResponse.ok) {
          const hiroData = await hiroResponse.json();
          collectionName = hiroData.name || symbol;
          totalSupply = hiroData.inscription_count || 0;
          floorPrice = hiroData.floor_price ? parseInt(String(hiroData.floor_price)) / 1e8 : 0;
          totalCollectorsFromStats = hiroData.distinct_owner_count || 0;
        }
      } catch (error) {
        // Hiro failed, continue with defaults
      }
    }

    // Get holder data
    let topCollectors: any[] = [];
    let totalCollectors = 0;

    try {
      // Try to get holders from UniSat
      const unisatResponse = await fetch(
        `https://open-api.unisat.io/v1/indexer/collection/${symbol}/holders?limit=${limit}`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${process.env.UNISAT_API_KEY || ''}`
          },
          next: { revalidate: 300 }
        }
      );

      if (unisatResponse.ok) {
        const unisatData = await unisatResponse.json();

        if (unisatData.data?.holders) {
          totalCollectors = unisatData.data.total || unisatData.data.holders.length;

          topCollectors = unisatData.data.holders.slice(0, limit).map((holder: any, index: number) => {
            const inscriptionCount = holder.count || 0;
            const percentage = totalSupply > 0 ? (inscriptionCount / totalSupply) * 100 : 0;
            const estimatedValue = inscriptionCount * floorPrice;

            return {
              rank: index + 1,
              address: holder.address || 'unknown',
              inscriptionCount,
              percentage,
              estimatedValue,
              badges: getCollectorBadges(index + 1, inscriptionCount, percentage, totalSupply)
            };
          });
        }
      }
    } catch (error) {

      // Fallback: use owner count from stats as total collectors
      totalCollectors = totalCollectorsFromStats;
    }

    // If we don't have holder data, try OKX activities first, then ME as fallback
    if (topCollectors.length === 0) {
      let activities: any[] = [];

      // Try OKX first
      try {
        const okxResult = await okxApi.getCollectionActivity(symbol, undefined, 500);
        if (okxResult.activities && okxResult.activities.length > 0) {
          // Count inscriptions per address from OKX activities
          const addressCounts = new Map<string, number>();

          okxResult.activities.forEach((activity) => {
            const address = activity.type === 'BUY' ? activity.toAddress : activity.toAddress;
            if (address) {
              addressCounts.set(address, (addressCounts.get(address) || 0) + 1);
            }
          });

          topCollectors = Array.from(addressCounts.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([address, count], index) => {
              const percentage = totalSupply > 0 ? (count / totalSupply) * 100 : 0;
              const estimatedValue = count * floorPrice;

              return {
                rank: index + 1,
                address,
                inscriptionCount: count,
                percentage,
                estimatedValue,
                badges: getCollectorBadges(index + 1, count, percentage, totalSupply)
              };
            });
        }
      } catch (error) {
        // OKX activities failed, will fall through to ME
      }

      // Fallback to Hiro if OKX didn't produce results
      if (topCollectors.length === 0) {
        try {
          const hiroHeaders: Record<string, string> = { 'Accept': 'application/json' };
          const hiroApiKey = process.env.HIRO_API_KEY;
          if (hiroApiKey) hiroHeaders['x-hiro-api-key'] = hiroApiKey;

          const hiroRes = await fetch(
            `https://api.hiro.so/ordinals/v1/inscriptions?limit=60&order=desc&order_by=genesis_block_height`,
            { headers: hiroHeaders, next: { revalidate: 60 } }
          );

          if (hiroRes.ok) {
            const hiroData = await hiroRes.json();
            const inscriptions = hiroData.results || [];

            // Count inscriptions per address
            const addressCounts = new Map<string, number>();
            inscriptions.forEach((ins: any) => {
              const address = ins.address || ins.genesis_address;
              if (address) {
                addressCounts.set(address, (addressCounts.get(address) || 0) + 1);
              }
            });

            topCollectors = Array.from(addressCounts.entries())
              .sort(([, a], [, b]) => b - a)
              .slice(0, limit)
              .map(([address, count], index) => {
                const percentage = totalSupply > 0 ? (count / totalSupply) * 100 : 0;
                const estimatedValue = count * floorPrice;

                return {
                  rank: index + 1,
                  address,
                  inscriptionCount: count,
                  percentage,
                  estimatedValue,
                  badges: getCollectorBadges(index + 1, count, percentage, totalSupply)
                };
              });
          }
        } catch (error) {
          // Hiro fallback failed
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        collectionSymbol: symbol,
        collectionName,
        topCollectors,
        totalCollectors,
        lastUpdated: Date.now(),
        metadata: {
          totalSupply,
          floorPrice,
          averageHoldings: totalCollectors > 0 ? totalSupply / totalCollectors : 0
        }
      },
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch leaderboard',
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCollectorBadges(
  rank: number,
  inscriptionCount: number,
  percentage: number,
  totalSupply: number
): any[] {
  const badges: any[] = [];

  // Rank badges
  if (rank === 1) {
    badges.push({
      type: 'top10',
      label: '#1 Collector',
      icon: '👑'
    });
  } else if (rank <= 10) {
    badges.push({
      type: 'top10',
      label: 'Top 10',
      icon: '🏆'
    });
  } else if (rank <= 50) {
    badges.push({
      type: 'top50',
      label: 'Top 50',
      icon: '🥇'
    });
  }

  // Whale badges
  if (inscriptionCount >= 100) {
    badges.push({
      type: 'whale',
      label: 'Mega Whale',
      icon: '🐋'
    });
  } else if (inscriptionCount >= 50) {
    badges.push({
      type: 'whale',
      label: 'Whale',
      icon: '🐳'
    });
  }

  // Complete set badge (if holding 100% or very close)
  if (percentage >= 99) {
    badges.push({
      type: 'complete_set',
      label: 'Complete Set',
      icon: '💎'
    });
  } else if (percentage >= 50) {
    badges.push({
      type: 'complete_set',
      label: 'Majority Holder',
      icon: '💰'
    });
  }

  // Diamond hands (inferred from high holdings)
  if (percentage >= 10) {
    badges.push({
      type: 'diamond_hands',
      label: 'Diamond Hands',
      icon: '💎'
    });
  }

  // Early adopter (inferred from inscription numbers - this would need historical data)
  // For now, we'll skip this badge as we don't have acquisition date data

  return badges;
}
