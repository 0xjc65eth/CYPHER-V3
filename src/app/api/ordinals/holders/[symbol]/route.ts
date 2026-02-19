import { NextRequest, NextResponse } from 'next/server';

/**
 * Ordinals Holder Metrics API Route
 * GET /api/ordinals/holders/[symbol]
 *
 * Returns comprehensive holder metrics for a collection including:
 * - Basic holder counts
 * - Holder distribution
 * - Top holders
 * - Concentration metrics
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

    if (!symbol) {
      return NextResponse.json(
        { error: 'Collection symbol is required' },
        { status: 400 }
      );
    }

    // Get Magic Eden stats for basic holder count
    const magicEdenResponse = await fetch(
      `https://api-mainnet.magiceden.dev/v2/ord/btc/stat?collectionSymbol=${symbol}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CYPHER-ORDi-Future-V3'
        },
        next: { revalidate: 60 } // Cache for 1 minute
      }
    );

    if (!magicEdenResponse.ok) {
      throw new Error(`Magic Eden API error: ${magicEdenResponse.status}`);
    }

    const magicEdenData = await magicEdenResponse.json();

    // Parse holder data from Magic Eden
    const totalHolders = parseInt(magicEdenData.owners || '0');
    const totalSupply = parseInt(magicEdenData.supply || '0');
    const totalListed = parseInt(magicEdenData.totalListed || '0');

    // Calculate basic metrics
    const holderMetrics = {
      collectionSymbol: symbol,
      collectionName: symbol, // Will be enriched from collection details
      totalHolders,
      totalSupply,
      holdersPercentage: totalSupply > 0 ? (totalHolders / totalSupply) * 100 : 0,
      uniqueAddresses: totalHolders,
      averageHoldingsPerAddress: totalHolders > 0 ? totalSupply / totalHolders : 0,
      timestamp: Date.now()
    };

    // Try to get holder list from UniSat (if available)
    let topHolders: any[] = [];
    let distribution = null;
    let concentrationMetrics = null;

    try {
      // Note: This endpoint may not exist - needs verification
      const unisatHoldersResponse = await fetch(
        `https://open-api.unisat.io/v1/indexer/collection/${symbol}/holders?limit=100`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${process.env.UNISAT_API_KEY || ''}`
          },
          next: { revalidate: 300 } // Cache for 5 minutes
        }
      );

      if (unisatHoldersResponse.ok) {
        const unisatData = await unisatHoldersResponse.json();

        if (unisatData.data?.holders) {
          topHolders = unisatData.data.holders.slice(0, 20).map((holder: any, index: number) => ({
            address: holder.address || 'unknown',
            inscriptionCount: holder.count || 0,
            percentage: totalSupply > 0 ? ((holder.count || 0) / totalSupply) * 100 : 0,
            rank: index + 1
          }));

          // Calculate holder distribution
          const holders = unisatData.data.holders;
          const whales = holders.filter((h: any) => (h.count || 0) > 100);
          const large = holders.filter((h: any) => (h.count || 0) >= 10 && (h.count || 0) <= 100);
          const medium = holders.filter((h: any) => (h.count || 0) >= 2 && (h.count || 0) < 10);
          const small = holders.filter((h: any) => (h.count || 0) === 1);

          distribution = {
            whales: {
              count: whales.length,
              totalInscriptions: whales.reduce((sum: number, h: any) => sum + (h.count || 0), 0),
              percentage: 0,
              averageHoldings: 0
            },
            largeHolders: {
              count: large.length,
              totalInscriptions: large.reduce((sum: number, h: any) => sum + (h.count || 0), 0),
              percentage: 0,
              averageHoldings: 0
            },
            mediumHolders: {
              count: medium.length,
              totalInscriptions: medium.reduce((sum: number, h: any) => sum + (h.count || 0), 0),
              percentage: 0,
              averageHoldings: 0
            },
            smallHolders: {
              count: small.length,
              totalInscriptions: small.reduce((sum: number, h: any) => sum + (h.count || 0), 0),
              percentage: 0,
              averageHoldings: 0
            },
            concentrated: false
          };

          // Calculate percentages
          if (totalSupply > 0) {
            distribution.whales.percentage = (distribution.whales.totalInscriptions / totalSupply) * 100;
            distribution.largeHolders.percentage = (distribution.largeHolders.totalInscriptions / totalSupply) * 100;
            distribution.mediumHolders.percentage = (distribution.mediumHolders.totalInscriptions / totalSupply) * 100;
            distribution.smallHolders.percentage = (distribution.smallHolders.totalInscriptions / totalSupply) * 100;
          }

          // Calculate averages
          distribution.whales.averageHoldings = distribution.whales.count > 0
            ? distribution.whales.totalInscriptions / distribution.whales.count : 0;
          distribution.largeHolders.averageHoldings = distribution.largeHolders.count > 0
            ? distribution.largeHolders.totalInscriptions / distribution.largeHolders.count : 0;
          distribution.mediumHolders.averageHoldings = distribution.mediumHolders.count > 0
            ? distribution.mediumHolders.totalInscriptions / distribution.mediumHolders.count : 0;
          distribution.smallHolders.averageHoldings = distribution.smallHolders.count > 0
            ? distribution.smallHolders.totalInscriptions / distribution.smallHolders.count : 0;

          // Calculate concentration metrics
          const top10Holdings = topHolders.slice(0, 10).reduce((sum, h) => sum + h.inscriptionCount, 0);
          const top50Holdings = topHolders.slice(0, 50).reduce((sum, h) => sum + h.inscriptionCount, 0);
          const top100Holdings = topHolders.slice(0, 100).reduce((sum, h) => sum + h.inscriptionCount, 0);

          const top10Concentration = totalSupply > 0 ? (top10Holdings / totalSupply) * 100 : 0;

          distribution.concentrated = top10Concentration > 50;

          concentrationMetrics = {
            collectionSymbol: symbol,
            giniCoefficient: calculateGini(holders.map((h: any) => h.count || 0)),
            herfindahlIndex: calculateHHI(holders.map((h: any) => h.count || 0), totalSupply),
            top10Concentration,
            top50Concentration: totalSupply > 0 ? (top50Holdings / totalSupply) * 100 : 0,
            top100Concentration: totalSupply > 0 ? (top100Holdings / totalSupply) * 100 : 0,
            concentrationRating: getConcentrationRating(top10Concentration),
            timestamp: Date.now()
          };
        }
      }
    } catch (unisatError) {
      // Continue with basic metrics from Magic Eden
    }

    return NextResponse.json({
      success: true,
      data: {
        metrics: holderMetrics,
        topHolders,
        distribution,
        concentrationMetrics
      },
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Holder metrics API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch holder metrics',
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate Gini Coefficient
 * Measures inequality in holder distribution
 * 0 = perfect equality, 1 = one holder owns everything
 */
function calculateGini(holdings: number[]): number {
  if (holdings.length === 0) return 0;

  const sortedHoldings = [...holdings].sort((a, b) => a - b);
  const n = sortedHoldings.length;
  const totalHoldings = sortedHoldings.reduce((sum, val) => sum + val, 0);

  if (totalHoldings === 0) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (2 * (i + 1) - n - 1) * sortedHoldings[i];
  }

  return sum / (n * totalHoldings);
}

/**
 * Calculate Herfindahl-Hirschman Index (HHI)
 * Measures market concentration
 * Higher values indicate more concentration
 */
function calculateHHI(holdings: number[], totalSupply: number): number {
  if (totalSupply === 0) return 0;

  const marketShares = holdings.map(h => h / totalSupply);
  const hhi = marketShares.reduce((sum, share) => sum + (share * share * 10000), 0);

  return hhi;
}

/**
 * Get concentration rating based on top 10 holder percentage
 */
function getConcentrationRating(top10Percentage: number): 'Low' | 'Medium' | 'High' | 'Very High' {
  if (top10Percentage >= 75) return 'Very High';
  if (top10Percentage >= 50) return 'High';
  if (top10Percentage >= 25) return 'Medium';
  return 'Low';
}
