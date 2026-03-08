import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';
import { xverseAPI } from '@/lib/api/xverse';

/**
 * Ordinals Whale Tracker API Route
 * GET /api/ordinals/whales?collection={symbol}&limit={number}
 *
 * Data source: Xverse (primary) → Hiro + UniSat (fallback)
 */

export async function GET(request: NextRequest) {
  try {
    const rateLimitRes = await rateLimit(request, 30, 60);
    if (rateLimitRes) return rateLimitRes;

    const searchParams = request.nextUrl.searchParams;
    const collection = searchParams.get('collection');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection symbol is required' },
        { status: 400 }
      );
    }

    // Get collection stats — Xverse primary, Hiro fallback
    let totalSupply = 0;
    let floorPrice = 0;
    let totalHolders = 0;

    // 1. Try Xverse
    if (xverseAPI.isEnabled()) {
      try {
        const xverseDetail = await xverseAPI.getCollectionDetail(collection);
        if (xverseDetail) {
          totalSupply = xverseDetail.totalSupply || 0;
          floorPrice = xverseDetail.floorPrice ? xverseDetail.floorPrice / 1e8 : 0;
          totalHolders = xverseDetail.ownerCount || 0;
        }
      } catch {
        // Xverse failed, fall through
      }
    }

    // 2. Fallback to Hiro
    if (totalSupply === 0 && floorPrice === 0) {
      try {
        const hiroHeaders: Record<string, string> = { 'Accept': 'application/json' };
        const hiroApiKey = process.env.HIRO_API_KEY;
        if (hiroApiKey) hiroHeaders['x-hiro-api-key'] = hiroApiKey;

        const statsResponse = await fetch(
          `https://api.hiro.so/ordinals/v1/collections/${encodeURIComponent(collection)}`,
          { headers: hiroHeaders, signal: AbortSignal.timeout(8000) }
        );

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          totalSupply = statsData.inscription_count || 0;
          floorPrice = statsData.floor_price ? parseInt(String(statsData.floor_price)) / 1e8 : 0;
          totalHolders = statsData.distinct_owner_count || 0;
        }
      } catch {
        // Hiro failed
      }
    }

    // Get top holders (whales) — Xverse primary, UniSat fallback
    let whales: Array<{
      address: string; inscriptionCount: number; percentage: number;
      rank: number; estimatedValue: number; labels: string[];
    }> = [];

    // 3. Try Xverse holders
    if (xverseAPI.isEnabled()) {
      try {
        const xverseHolders = await xverseAPI.getCollectionHolders(collection, limit * 2);
        if (xverseHolders && xverseHolders.length > 0) {
          whales = xverseHolders
            .filter(h => (h.tokenCount || 0) >= 10)
            .slice(0, limit)
            .map((holder, index) => {
              const inscriptionCount = holder.tokenCount || 0;
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
      } catch {
        // Xverse holders failed
      }
    }

    // 4. Fallback to UniSat
    if (whales.length === 0) {
      try {
        const unisatResponse = await fetch(
          `https://open-api.unisat.io/v1/indexer/collection/${encodeURIComponent(collection)}/holders?limit=${limit}`,
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
            whales = unisatData.data.holders
              .filter((h: { count?: number }) => (h.count || 0) >= 10)
              .slice(0, limit)
              .map((holder: { address?: string; count?: number }, index: number) => {
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
      } catch {
        // UniSat fallback failed
      }
    }

    // Get recent whale activity from Hiro (Xverse doesn't expose individual trades)
    const recentActivity: Array<{
      id: string; address: string; type: string; collectionSymbol: string;
      inscriptionId?: string; inscriptionNumber?: number; price?: number;
      quantity: number; timestamp: number; txid?: string; impact: string;
    }> = [];
    const whaleAddresses = new Set(whales.map(w => w.address));

    try {
      const hiroHeaders: Record<string, string> = { 'Accept': 'application/json' };
      const hiroApiKey = process.env.HIRO_API_KEY;
      if (hiroApiKey) hiroHeaders['x-hiro-api-key'] = hiroApiKey;

      const hiroRes = await fetch(
        `https://api.hiro.so/ordinals/v1/inscriptions?limit=100&order=desc&order_by=genesis_block_height`,
        { headers: hiroHeaders, signal: AbortSignal.timeout(8000) }
      );

      if (hiroRes.ok) {
        const hiroData = await hiroRes.json();
        const inscriptions = hiroData.results || [];

        inscriptions
          .filter((ins: { address?: string; genesis_address?: string }) => {
            const address = ins.address || ins.genesis_address;
            return address ? whaleAddresses.has(address) : false;
          })
          .slice(0, 50)
          .forEach((ins: { address?: string; genesis_address?: string; tx_id?: string; id?: string; number?: number; genesis_fee?: string | number; genesis_timestamp?: number }) => {
            const address = (ins.address || ins.genesis_address) as string;
            recentActivity.push({
              id: ins.tx_id || ins.id || '',
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
    } catch {
      // Hiro activities fallback failed
    }

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
        error: 'Failed to fetch whale data',
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
  whales: Array<{ address: string; percentage: number }>,
  recentActivity: Array<{ address: string; type: string; collectionSymbol: string; price?: number; timestamp: number; txid?: string }>,
  floorPrice: number
): Array<{ id: string; type: string; address: string; collectionSymbol: string; message: string; quantity: number; totalValue: number; timestamp: number; severity: string }> {
  const alerts: Array<{ id: string; type: string; address: string; collectionSymbol: string; message: string; quantity: number; totalValue: number; timestamp: number; severity: string }> = [];
  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;

  const activityByAddress = new Map<string, typeof recentActivity>();
  recentActivity
    .filter(a => a.timestamp >= last24h)
    .forEach(activity => {
      const existing = activityByAddress.get(activity.address) || [];
      existing.push(activity);
      activityByAddress.set(activity.address, existing);
    });

  activityByAddress.forEach((activities, address) => {
    const whale = whales.find(w => w.address === address);
    if (!whale) return;

    const buys = activities.filter(a => a.type === 'buy');
    const sells = activities.filter(a => a.type === 'sell');

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

    const largeBuys = buys.filter(b => (b.price || 0) >= floorPrice * 1.5);
    largeBuys.forEach(buy => {
      alerts.push({
        id: `${address}-large-buy-${buy.txid}`,
        type: 'large_buy',
        address,
        collectionSymbol: buy.collectionSymbol,
        message: `Whale bought above floor (${((((buy.price || 0) / floorPrice) - 1) * 100).toFixed(0)}% premium)`,
        quantity: 1,
        totalValue: buy.price || 0,
        timestamp: buy.timestamp,
        severity: 'info'
      });
    });
  });

  return alerts.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
}
