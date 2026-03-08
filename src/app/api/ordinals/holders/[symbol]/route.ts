import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';
import { xverseAPI } from '@/lib/api/xverse';

/**
 * Ordinals Holder Metrics API Route
 * GET /api/ordinals/holders/[symbol]
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
    const rateLimitRes = await rateLimit(request, 30, 60);
    if (rateLimitRes) return rateLimitRes;

    const { symbol } = await context.params;

    if (!symbol) {
      return NextResponse.json(
        { error: 'Collection symbol is required' },
        { status: 400 }
      );
    }

    let totalHolders = 0;
    let totalSupply = 0;
    let totalListed = 0;

    // 1. Try Xverse for collection stats
    if (xverseAPI.isEnabled()) {
      try {
        const xverseDetail = await xverseAPI.getCollectionDetail(symbol);
        if (xverseDetail) {
          totalHolders = xverseDetail.ownerCount || 0;
          totalSupply = xverseDetail.totalSupply || 0;
          totalListed = xverseDetail.listedCount || 0;
        }
      } catch {
        // Xverse failed, continue to fallback
      }
    }

    // 2. Fallback to Hiro
    if (totalHolders === 0 && totalSupply === 0) {
      const hiroHeaders: Record<string, string> = { 'Accept': 'application/json' };
      const hiroApiKey = process.env.HIRO_API_KEY;
      if (hiroApiKey) hiroHeaders['x-hiro-api-key'] = hiroApiKey;

      try {
        const hiroResponse = await fetch(
          `https://api.hiro.so/ordinals/v1/collections/${encodeURIComponent(symbol)}`,
          { headers: hiroHeaders, signal: AbortSignal.timeout(8000) }
        );

        if (hiroResponse.ok) {
          const hiroData = await hiroResponse.json();
          totalHolders = hiroData.distinct_owner_count || 0;
          totalSupply = hiroData.inscription_count || 0;
          totalListed = hiroData.listed_count || 0;
        }
      } catch {
        // Hiro failed, continue with zeros
      }
    }

    const holderMetrics = {
      collectionSymbol: symbol,
      collectionName: symbol,
      totalHolders,
      totalSupply,
      holdersPercentage: totalSupply > 0 ? (totalHolders / totalSupply) * 100 : 0,
      uniqueAddresses: totalHolders,
      averageHoldingsPerAddress: totalHolders > 0 ? totalSupply / totalHolders : 0,
      timestamp: Date.now()
    };

    // 3. Try Xverse for holder list
    let topHolders: Array<{ address: string; inscriptionCount: number; percentage: number; rank: number }> = [];
    let distribution = null;
    let concentrationMetrics = null;

    if (xverseAPI.isEnabled()) {
      try {
        const xverseHolders = await xverseAPI.getCollectionHolders(symbol, 100);
        if (xverseHolders && xverseHolders.length > 0) {
          topHolders = xverseHolders.slice(0, 20).map((holder, index) => ({
            address: holder.address || 'unknown',
            inscriptionCount: holder.tokenCount || 0,
            percentage: totalSupply > 0 ? ((holder.tokenCount || 0) / totalSupply) * 100 : 0,
            rank: index + 1
          }));

          // Calculate distribution from Xverse holders
          const whales = xverseHolders.filter(h => (h.tokenCount || 0) > 100);
          const large = xverseHolders.filter(h => (h.tokenCount || 0) >= 10 && (h.tokenCount || 0) <= 100);
          const medium = xverseHolders.filter(h => (h.tokenCount || 0) >= 2 && (h.tokenCount || 0) < 10);
          const small = xverseHolders.filter(h => (h.tokenCount || 0) === 1);

          distribution = {
            whales: { count: whales.length, totalInscriptions: whales.reduce((sum, h) => sum + (h.tokenCount || 0), 0), percentage: 0, averageHoldings: 0 },
            largeHolders: { count: large.length, totalInscriptions: large.reduce((sum, h) => sum + (h.tokenCount || 0), 0), percentage: 0, averageHoldings: 0 },
            mediumHolders: { count: medium.length, totalInscriptions: medium.reduce((sum, h) => sum + (h.tokenCount || 0), 0), percentage: 0, averageHoldings: 0 },
            smallHolders: { count: small.length, totalInscriptions: small.reduce((sum, h) => sum + (h.tokenCount || 0), 0), percentage: 0, averageHoldings: 0 },
            concentrated: false
          };

          if (totalSupply > 0) {
            distribution.whales.percentage = (distribution.whales.totalInscriptions / totalSupply) * 100;
            distribution.largeHolders.percentage = (distribution.largeHolders.totalInscriptions / totalSupply) * 100;
            distribution.mediumHolders.percentage = (distribution.mediumHolders.totalInscriptions / totalSupply) * 100;
            distribution.smallHolders.percentage = (distribution.smallHolders.totalInscriptions / totalSupply) * 100;
          }

          distribution.whales.averageHoldings = distribution.whales.count > 0 ? distribution.whales.totalInscriptions / distribution.whales.count : 0;
          distribution.largeHolders.averageHoldings = distribution.largeHolders.count > 0 ? distribution.largeHolders.totalInscriptions / distribution.largeHolders.count : 0;
          distribution.mediumHolders.averageHoldings = distribution.mediumHolders.count > 0 ? distribution.mediumHolders.totalInscriptions / distribution.mediumHolders.count : 0;
          distribution.smallHolders.averageHoldings = distribution.smallHolders.count > 0 ? distribution.smallHolders.totalInscriptions / distribution.smallHolders.count : 0;

          const top10Holdings = topHolders.slice(0, 10).reduce((sum, h) => sum + h.inscriptionCount, 0);
          const top50Holdings = topHolders.slice(0, 50).reduce((sum, h) => sum + h.inscriptionCount, 0);
          const top100Holdings = topHolders.slice(0, 100).reduce((sum, h) => sum + h.inscriptionCount, 0);
          const top10Concentration = totalSupply > 0 ? (top10Holdings / totalSupply) * 100 : 0;

          distribution.concentrated = top10Concentration > 50;

          concentrationMetrics = {
            collectionSymbol: symbol,
            giniCoefficient: calculateGini(xverseHolders.map(h => h.tokenCount || 0)),
            herfindahlIndex: calculateHHI(xverseHolders.map(h => h.tokenCount || 0), totalSupply),
            top10Concentration,
            top50Concentration: totalSupply > 0 ? (top50Holdings / totalSupply) * 100 : 0,
            top100Concentration: totalSupply > 0 ? (top100Holdings / totalSupply) * 100 : 0,
            concentrationRating: getConcentrationRating(top10Concentration),
            timestamp: Date.now()
          };
        }
      } catch {
        // Xverse holders failed, try UniSat
      }
    }

    // 4. Fallback to UniSat for holder list
    if (topHolders.length === 0) {
      try {
        const unisatHoldersResponse = await fetch(
          `https://open-api.unisat.io/v1/indexer/collection/${encodeURIComponent(symbol)}/holders?limit=100`,
          {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${process.env.UNISAT_API_KEY || ''}`
            },
            signal: AbortSignal.timeout(8000)
          }
        );

        if (unisatHoldersResponse.ok) {
          const unisatData = await unisatHoldersResponse.json();

          if (unisatData.data?.holders) {
            topHolders = unisatData.data.holders.slice(0, 20).map((holder: { address?: string; count?: number }, index: number) => ({
              address: holder.address || 'unknown',
              inscriptionCount: holder.count || 0,
              percentage: totalSupply > 0 ? ((holder.count || 0) / totalSupply) * 100 : 0,
              rank: index + 1
            }));

            const holders = unisatData.data.holders;
            const whales = holders.filter((h: { count?: number }) => (h.count || 0) > 100);
            const large = holders.filter((h: { count?: number }) => (h.count || 0) >= 10 && (h.count || 0) <= 100);
            const medium = holders.filter((h: { count?: number }) => (h.count || 0) >= 2 && (h.count || 0) < 10);
            const small = holders.filter((h: { count?: number }) => (h.count || 0) === 1);

            distribution = {
              whales: { count: whales.length, totalInscriptions: whales.reduce((sum: number, h: { count?: number }) => sum + (h.count || 0), 0), percentage: 0, averageHoldings: 0 },
              largeHolders: { count: large.length, totalInscriptions: large.reduce((sum: number, h: { count?: number }) => sum + (h.count || 0), 0), percentage: 0, averageHoldings: 0 },
              mediumHolders: { count: medium.length, totalInscriptions: medium.reduce((sum: number, h: { count?: number }) => sum + (h.count || 0), 0), percentage: 0, averageHoldings: 0 },
              smallHolders: { count: small.length, totalInscriptions: small.reduce((sum: number, h: { count?: number }) => sum + (h.count || 0), 0), percentage: 0, averageHoldings: 0 },
              concentrated: false
            };

            if (totalSupply > 0) {
              distribution.whales.percentage = (distribution.whales.totalInscriptions / totalSupply) * 100;
              distribution.largeHolders.percentage = (distribution.largeHolders.totalInscriptions / totalSupply) * 100;
              distribution.mediumHolders.percentage = (distribution.mediumHolders.totalInscriptions / totalSupply) * 100;
              distribution.smallHolders.percentage = (distribution.smallHolders.totalInscriptions / totalSupply) * 100;
            }

            distribution.whales.averageHoldings = distribution.whales.count > 0 ? distribution.whales.totalInscriptions / distribution.whales.count : 0;
            distribution.largeHolders.averageHoldings = distribution.largeHolders.count > 0 ? distribution.largeHolders.totalInscriptions / distribution.largeHolders.count : 0;
            distribution.mediumHolders.averageHoldings = distribution.mediumHolders.count > 0 ? distribution.mediumHolders.totalInscriptions / distribution.mediumHolders.count : 0;
            distribution.smallHolders.averageHoldings = distribution.smallHolders.count > 0 ? distribution.smallHolders.totalInscriptions / distribution.smallHolders.count : 0;

            const top10Holdings = topHolders.slice(0, 10).reduce((sum, h) => sum + h.inscriptionCount, 0);
            const top50Holdings = topHolders.slice(0, 50).reduce((sum, h) => sum + h.inscriptionCount, 0);
            const top100Holdings = topHolders.slice(0, 100).reduce((sum, h) => sum + h.inscriptionCount, 0);
            const top10Concentration = totalSupply > 0 ? (top10Holdings / totalSupply) * 100 : 0;

            distribution.concentrated = top10Concentration > 50;

            concentrationMetrics = {
              collectionSymbol: symbol,
              giniCoefficient: calculateGini(holders.map((h: { count?: number }) => h.count || 0)),
              herfindahlIndex: calculateHHI(holders.map((h: { count?: number }) => h.count || 0), totalSupply),
              top10Concentration,
              top50Concentration: totalSupply > 0 ? (top50Holdings / totalSupply) * 100 : 0,
              top100Concentration: totalSupply > 0 ? (top100Holdings / totalSupply) * 100 : 0,
              concentrationRating: getConcentrationRating(top10Concentration),
              timestamp: Date.now()
            };
          }
        }
      } catch {
        // UniSat fallback failed
      }
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
        error: 'Failed to fetch holder metrics',
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

function calculateHHI(holdings: number[], totalSupply: number): number {
  if (totalSupply === 0) return 0;
  const marketShares = holdings.map(h => h / totalSupply);
  return marketShares.reduce((sum, share) => sum + (share * share * 10000), 0);
}

function getConcentrationRating(top10Percentage: number): 'Low' | 'Medium' | 'High' | 'Very High' {
  if (top10Percentage >= 75) return 'Very High';
  if (top10Percentage >= 50) return 'High';
  if (top10Percentage >= 25) return 'Medium';
  return 'Low';
}
