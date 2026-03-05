import { NextRequest, NextResponse } from 'next/server';
import { OKXOrdinalsAPI } from '@/services/ordinals/integrations/OKXOrdinalsAPI';

const okxApi = new OKXOrdinalsAPI();

/**
 * Ordinals Whale Tracker API Route
 * GET /api/ordinals/whales?collection={symbol}&limit={number}
 *
 * Returns whale (large holder) data and recent whale activity
 * Data source: OKX (primary) → Magic Eden (fallback)
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const collection = searchParams.get('collection');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection symbol is required' },
        { status: 400 }
      );
    }

    // Get collection stats for context — OKX primary, ME fallback
    let totalSupply = 0;
    let floorPrice = 0;
    let totalHolders = 0;

    try {
      const okxStats = await okxApi.getCollectionStats(collection);
      if (okxStats) {
        totalSupply = okxStats.itemCount;
        floorPrice = parseFloat(okxStats.floorPrice || '0');
        totalHolders = okxStats.ownerCount;
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

        const statsResponse = await fetch(
          `https://api.hiro.so/ordinals/v1/collections/${collection}`,
          { headers: hiroHeaders, next: { revalidate: 60 } }
        );

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          totalSupply = statsData.inscription_count || 0;
          floorPrice = statsData.floor_price ? parseInt(String(statsData.floor_price)) / 1e8 : 0;
          totalHolders = statsData.distinct_owner_count || 0;
        }
      } catch (error) {
        // Hiro failed, continue with zeros
      }
    }

    // Get top holders (whales)
    let whales: any[] = [];

    try {
      // Try UniSat for holder data
      const unisatResponse = await fetch(
        `https://open-api.unisat.io/v1/indexer/collection/${collection}/holders?limit=${limit}`,
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
          whales = unisatData.data.holders
            .filter((h: any) => (h.count || 0) >= 10) // Only holders with 10+ inscriptions
            .slice(0, limit)
            .map((holder: any, index: number) => {
              const inscriptionCount = holder.count || 0;
              const percentage = totalSupply > 0 ? (inscriptionCount / totalSupply) * 100 : 0;
              const estimatedValue = inscriptionCount * floorPrice;

              return {
                address: holder.address || 'unknown',
                inscriptionCount,
                percentage,
                rank: index + 1,
                estimatedValue,
                labels: getWhaleLabels(inscriptionCount, percentage)
              };
            });
        }
      }
    } catch (error) {
    }

    // Get recent whale activity — OKX primary, ME fallback
    const recentActivity: any[] = [];
    const whaleAddresses = new Set(whales.map(w => w.address));

    try {
      // Try OKX first for activities
      const okxResult = await okxApi.getCollectionActivity(collection, undefined, 100);

      if (okxResult.activities && okxResult.activities.length > 0) {
        okxResult.activities
          .filter((activity) => {
            const address = activity.toAddress || activity.fromAddress;
            return whaleAddresses.has(address);
          })
          .slice(0, 50)
          .forEach((activity) => {
            const address = activity.toAddress || activity.fromAddress;
            const type = activity.type === 'BUY' ? 'buy' :
                        activity.type === 'LIST' ? 'sell' :
                        activity.type === 'TRANSFER' ? 'transfer_in' : 'transfer_out';

            recentActivity.push({
              id: activity.txHash || activity.activityId,
              address,
              type,
              collectionSymbol: collection,
              inscriptionId: activity.inscriptionId,
              inscriptionNumber: activity.inscriptionNumber,
              price: activity.price ? parseFloat(activity.price) : undefined,
              quantity: 1,
              timestamp: activity.timestamp ? new Date(activity.timestamp).getTime() : Date.now(),
              txid: activity.txHash,
              impact: getActivityImpact(1, totalSupply)
            });
          });
      }
    } catch (error) {
      // OKX activities failed, will fall through to ME
    }

    // Fallback to Hiro if OKX didn't return activities
    if (recentActivity.length === 0) {
      try {
        const hiroHeaders: Record<string, string> = { 'Accept': 'application/json' };
        const hiroApiKey = process.env.HIRO_API_KEY;
        if (hiroApiKey) hiroHeaders['x-hiro-api-key'] = hiroApiKey;

        const hiroRes = await fetch(
          `https://api.hiro.so/ordinals/v1/inscriptions?limit=100&order=desc&order_by=genesis_block_height`,
          { headers: hiroHeaders, next: { revalidate: 30 } }
        );

        if (hiroRes.ok) {
          const hiroData = await hiroRes.json();
          const inscriptions = hiroData.results || [];

          inscriptions
            .filter((ins: any) => {
              const address = ins.address || ins.genesis_address;
              return whaleAddresses.has(address);
            })
            .slice(0, 50)
            .forEach((ins: any) => {
              const address = ins.address || ins.genesis_address;
              recentActivity.push({
                id: ins.tx_id || ins.id,
                address,
                type: 'transfer_in',
                collectionSymbol: collection,
                inscriptionId: ins.id,
                inscriptionNumber: ins.number,
                price: ins.genesis_fee ? parseInt(String(ins.genesis_fee)) : undefined,
                quantity: 1,
                timestamp: ins.genesis_timestamp
                  ? (ins.genesis_timestamp < 1e12 ? ins.genesis_timestamp * 1000 : ins.genesis_timestamp)
                  : Date.now(),
                txid: ins.tx_id,
                impact: getActivityImpact(1, totalSupply)
              });
            });
        }
      } catch (error) {
        // Hiro activities fallback failed
      }
    }

    // Generate whale alerts
    const alerts = generateWhaleAlerts(whales, recentActivity, floorPrice);

    return NextResponse.json({
      success: true,
      data: {
        whales,
        recentActivity,
        alerts,
        metadata: {
          totalSupply,
          floorPrice,
          totalWhales: whales.length,
          whaleConcentration: whales.reduce((sum, w) => sum + w.percentage, 0)
        }
      },
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Whale tracker API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch whale data',
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getWhaleLabels(inscriptionCount: number, percentage: number): string[] {
  const labels: string[] = [];

  if (inscriptionCount >= 100) labels.push('mega_whale');
  else if (inscriptionCount >= 50) labels.push('whale');
  else if (inscriptionCount >= 10) labels.push('large_holder');

  if (percentage >= 10) labels.push('dominant_holder');
  else if (percentage >= 5) labels.push('major_holder');

  return labels;
}

function getActivityImpact(quantity: number, totalSupply: number): 'Low' | 'Medium' | 'High' {
  const percentage = totalSupply > 0 ? (quantity / totalSupply) * 100 : 0;

  if (percentage >= 1) return 'High';
  if (percentage >= 0.1) return 'Medium';
  return 'Low';
}

function generateWhaleAlerts(
  whales: any[],
  recentActivity: any[],
  floorPrice: number
): any[] {
  const alerts: any[] = [];
  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;

  // Group activity by address
  const activityByAddress = new Map<string, any[]>();
  recentActivity
    .filter(a => a.timestamp >= last24h)
    .forEach(activity => {
      const existing = activityByAddress.get(activity.address) || [];
      existing.push(activity);
      activityByAddress.set(activity.address, existing);
    });

  // Generate alerts for each whale
  activityByAddress.forEach((activities, address) => {
    const whale = whales.find(w => w.address === address);
    if (!whale) return;

    const buys = activities.filter(a => a.type === 'buy');
    const sells = activities.filter(a => a.type === 'sell');

    // Accumulation alert
    if (buys.length >= 3) {
      alerts.push({
        id: `${address}-accumulation-${now}`,
        type: 'accumulation',
        address,
        collectionSymbol: activities[0].collectionSymbol,
        message: `Whale accumulated ${buys.length} inscriptions in 24h`,
        quantity: buys.length,
        totalValue: buys.reduce((sum, b) => sum + (b.price || floorPrice), 0),
        timestamp: now,
        severity: buys.length >= 5 ? 'critical' : 'warning'
      });
    }

    // Distribution alert
    if (sells.length >= 3) {
      alerts.push({
        id: `${address}-distribution-${now}`,
        type: 'distribution',
        address,
        collectionSymbol: activities[0].collectionSymbol,
        message: `Whale distributed ${sells.length} inscriptions in 24h`,
        quantity: sells.length,
        totalValue: sells.reduce((sum, s) => sum + (s.price || floorPrice), 0),
        timestamp: now,
        severity: sells.length >= 5 ? 'critical' : 'warning'
      });
    }

    // Large buy alert
    const largeBuys = buys.filter(b => (b.price || 0) >= floorPrice * 1.5);
    if (largeBuys.length > 0) {
      largeBuys.forEach(buy => {
        alerts.push({
          id: `${address}-large-buy-${buy.txid}`,
          type: 'large_buy',
          address,
          collectionSymbol: buy.collectionSymbol,
          message: `Whale bought above floor (${((buy.price / floorPrice - 1) * 100).toFixed(0)}% premium)`,
          quantity: 1,
          totalValue: buy.price,
          timestamp: buy.timestamp,
          severity: 'info'
        });
      });
    }
  });

  return alerts.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
}
