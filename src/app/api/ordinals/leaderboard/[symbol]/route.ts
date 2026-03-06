import { NextRequest, NextResponse } from 'next/server';
import { xverseAPI } from '@/lib/api/xverse';

/**
 * Ordinals Collection Leaderboard API Route
 * GET /api/ordinals/leaderboard/[symbol]
 *
 * Data source: Xverse (primary) → Hiro + UniSat (fallback)
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

    // Get collection details — Xverse primary, Hiro fallback
    let collectionName = symbol;
    let totalSupply = 0;
    let floorPrice = 0;
    let totalCollectorsFromStats = 0;

    // 1. Try Xverse
    if (xverseAPI.isEnabled()) {
      try {
        const xverseDetail = await xverseAPI.getCollectionDetail(symbol);
        if (xverseDetail) {
          collectionName = xverseDetail.name || symbol;
          totalSupply = xverseDetail.totalSupply || 0;
          floorPrice = xverseDetail.floorPrice ? xverseDetail.floorPrice / 1e8 : 0;
          totalCollectorsFromStats = xverseDetail.ownerCount || 0;
        }
      } catch {
        // Xverse failed, fall through to Hiro
      }
    }

    // 2. Fallback to Hiro
    if (totalSupply === 0 && floorPrice === 0) {
      try {
        const hiroHeaders: Record<string, string> = { 'Accept': 'application/json' };
        const hiroApiKey = process.env.HIRO_API_KEY;
        if (hiroApiKey) hiroHeaders['x-hiro-api-key'] = hiroApiKey;

        const hiroResponse = await fetch(
          `https://api.hiro.so/ordinals/v1/collections/${encodeURIComponent(symbol)}`,
          { headers: hiroHeaders, signal: AbortSignal.timeout(8000) }
        );

        if (hiroResponse.ok) {
          const hiroData = await hiroResponse.json();
          collectionName = hiroData.name || symbol;
          totalSupply = hiroData.inscription_count || 0;
          floorPrice = hiroData.floor_price ? parseInt(String(hiroData.floor_price)) / 1e8 : 0;
          totalCollectorsFromStats = hiroData.distinct_owner_count || 0;
        }
      } catch {
        // Hiro failed, continue with defaults
      }
    }

    // Get holder data — Xverse primary, UniSat fallback, Hiro last resort
    let topCollectors: Array<{
      rank: number; address: string; inscriptionCount: number;
      percentage: number; estimatedValue: number; badges: Array<{ type: string; label: string; icon: string }>;
    }> = [];
    let totalCollectors = 0;

    // 3. Try Xverse holders
    if (xverseAPI.isEnabled()) {
      try {
        const xverseHolders = await xverseAPI.getCollectionHolders(symbol, limit);
        if (xverseHolders && xverseHolders.length > 0) {
          totalCollectors = xverseHolders.length;

          topCollectors = xverseHolders.slice(0, limit).map((holder, index) => {
            const inscriptionCount = holder.tokenCount || 0;
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
      } catch {
        // Xverse holders failed, try UniSat
      }
    }

    // 4. Fallback to UniSat
    if (topCollectors.length === 0) {
      try {
        const unisatResponse = await fetch(
          `https://open-api.unisat.io/v1/indexer/collection/${encodeURIComponent(symbol)}/holders?limit=${limit}`,
          {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${process.env.UNISAT_API_KEY || ''}`
            },
            signal: AbortSignal.timeout(8000)
          }
        );

        if (unisatResponse.ok) {
          const unisatData = await unisatResponse.json();

          if (unisatData.data?.holders) {
            totalCollectors = unisatData.data.total || unisatData.data.holders.length;

            topCollectors = unisatData.data.holders.slice(0, limit).map((holder: { address?: string; count?: number }, index: number) => {
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
      } catch {
        totalCollectors = totalCollectorsFromStats;
      }
    }

    // 5. Last resort: Hiro inscriptions
    if (topCollectors.length === 0) {
      try {
        const hiroHeaders: Record<string, string> = { 'Accept': 'application/json' };
        const hiroApiKey = process.env.HIRO_API_KEY;
        if (hiroApiKey) hiroHeaders['x-hiro-api-key'] = hiroApiKey;

        const hiroRes = await fetch(
          `https://api.hiro.so/ordinals/v1/inscriptions?limit=60&order=desc&order_by=genesis_block_height`,
          { headers: hiroHeaders, signal: AbortSignal.timeout(8000) }
        );

        if (hiroRes.ok) {
          const hiroData = await hiroRes.json();
          const inscriptions = hiroData.results || [];

          const addressCounts = new Map<string, number>();
          inscriptions.forEach((ins: { address?: string; genesis_address?: string }) => {
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
      } catch {
        // Hiro fallback failed
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
  _totalSupply: number
): Array<{ type: string; label: string; icon: string }> {
  const badges: Array<{ type: string; label: string; icon: string }> = [];

  if (rank === 1) {
    badges.push({ type: 'top10', label: '#1 Collector', icon: '👑' });
  } else if (rank <= 10) {
    badges.push({ type: 'top10', label: 'Top 10', icon: '🏆' });
  } else if (rank <= 50) {
    badges.push({ type: 'top50', label: 'Top 50', icon: '🥇' });
  }

  if (inscriptionCount >= 100) {
    badges.push({ type: 'whale', label: 'Mega Whale', icon: '🐋' });
  } else if (inscriptionCount >= 50) {
    badges.push({ type: 'whale', label: 'Whale', icon: '🐳' });
  }

  if (percentage >= 99) {
    badges.push({ type: 'complete_set', label: 'Complete Set', icon: '💎' });
  } else if (percentage >= 50) {
    badges.push({ type: 'complete_set', label: 'Majority Holder', icon: '💰' });
  }

  if (percentage >= 10) {
    badges.push({ type: 'diamond_hands', label: 'Diamond Hands', icon: '💎' });
  }

  return badges;
}
