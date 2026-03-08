import { NextRequest, NextResponse } from 'next/server';
import { fetchAllExchangePrices, EXCHANGE_FEES } from '@/lib/arbitrage/exchange-fetchers';
import { scanSpotPerpArbitrage } from '@/services/arbitrage/SpotPerpArbitrage';
import { triangularArbitrage } from '@/services/arbitrage/TriangularArbitrage';
import { ordinalsArbitrageService } from '@/services/ordinals/OrdinalsArbitrageService';
import { runesArbitrageService } from '@/services/runes-arbitrage-service';
import { brc20ArbitrageService } from '@/services/brc20-arbitrage-service';
import { cache } from '@/lib/cache/redis.config';

const CACHE_KEY = 'arb:unified';
const CACHE_TTL = 3; // 3 seconds

export interface UnifiedOpportunity {
  id: string;
  arbType: 'cex-cex' | 'spot-perp' | 'triangular' | 'ordinals' | 'runes' | 'brc20';
  asset: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spreadPercent: number;
  netProfitPercent: number;
  estimatedProfitUSD: number;
  fees: { trading: number; network: number; total: number };
  liquidity: number;       // 0-100
  confidence: number;      // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  try {
    const typeFilter = request.nextUrl.searchParams.get('type') || 'all';

    // Check cache
    const cacheKey = `${CACHE_KEY}:${typeFilter}`;
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return NextResponse.json(parsed, {
          headers: { 'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=10' },
        });
      }
    } catch { /* cache miss */ }

    const allOpportunities: UnifiedOpportunity[] = [];
    const arbTypes = typeFilter === 'all'
      ? ['cex-cex', 'spot-perp', 'triangular', 'ordinals', 'runes', 'brc20']
      : [typeFilter];

    // Fetch all types in parallel
    const promises: Promise<void>[] = [];

    // 1. CEX↔CEX
    if (arbTypes.includes('cex-cex')) {
      promises.push((async () => {
        try {
          const pairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
          const pairResults = await Promise.allSettled(
            pairs.map(pair => fetchAllExchangePrices(pair))
          );

          for (let p = 0; p < pairs.length; p++) {
            const result = pairResults[p];
            if (result.status !== 'fulfilled' || result.value.length < 2) continue;
            const exchanges = result.value;
            const pair = pairs[p];
            const asset = pair.split('/')[0];

            for (const buyer of exchanges) {
              for (const seller of exchanges) {
                if (buyer.exchange === seller.exchange) continue;
                if (buyer.ask <= 0 || seller.bid <= 0) continue;

                const buyFee = EXCHANGE_FEES[buyer.exchange] || 0.002;
                const sellFee = EXCHANGE_FEES[seller.exchange] || 0.002;
                const grossSpread = ((seller.bid - buyer.ask) / buyer.ask) * 100;
                const netProfit = grossSpread - buyFee * 100 - sellFee * 100;

                if (grossSpread > 0) {
                  allOpportunities.push({
                    id: `cex-${asset}-${buyer.exchange}-${seller.exchange}`,
                    arbType: 'cex-cex',
                    asset,
                    buyExchange: buyer.exchange,
                    sellExchange: seller.exchange,
                    buyPrice: buyer.ask,
                    sellPrice: seller.bid,
                    spreadPercent: parseFloat(grossSpread.toFixed(4)),
                    netProfitPercent: parseFloat(netProfit.toFixed(4)),
                    estimatedProfitUSD: parseFloat((seller.bid * (1 - sellFee) - buyer.ask * (1 + buyFee)).toFixed(2)),
                    fees: {
                      trading: parseFloat(((buyFee + sellFee) * buyer.ask).toFixed(2)),
                      network: 0,
                      total: parseFloat(((buyFee + sellFee) * buyer.ask).toFixed(2)),
                    },
                    liquidity: Math.min(100, Math.round((buyer.volume + seller.volume) / 100)),
                    confidence: 85,
                    riskLevel: 'low',
                    timestamp: Date.now(),
                  });
                }
              }
            }
          }
        } catch (error) {
          // CEX-CEX scan failed, continue with other types
        }
      })());
    }

    // 2. Spot↔Perp
    if (arbTypes.includes('spot-perp')) {
      promises.push((async () => {
        try {
          const spotPerpOpps = await scanSpotPerpArbitrage();
          for (const opp of spotPerpOpps) {
            allOpportunities.push({
              id: opp.id,
              arbType: 'spot-perp',
              asset: opp.asset,
              buyExchange: opp.direction === 'short-perp-long-spot' ? opp.spotExchange : 'Hyperliquid',
              sellExchange: opp.direction === 'short-perp-long-spot' ? 'Hyperliquid' : opp.spotExchange,
              buyPrice: opp.direction === 'short-perp-long-spot' ? opp.spotPrice : opp.perpPrice,
              sellPrice: opp.direction === 'short-perp-long-spot' ? opp.perpPrice : opp.spotPrice,
              spreadPercent: Math.abs(opp.basisPercent),
              netProfitPercent: opp.estimatedProfitPercent,
              estimatedProfitUSD: parseFloat((Math.abs(opp.basisPercent) / 100 * opp.spotPrice).toFixed(2)),
              fees: { trading: 0, network: 0, total: 0 },
              liquidity: 75,
              confidence: opp.confidence,
              riskLevel: opp.riskLevel,
              timestamp: opp.timestamp,
              metadata: {
                fundingRate: opp.fundingRate,
                annualizedFunding: opp.annualizedFunding,
                direction: opp.direction,
              },
            });
          }
        } catch (error) {
          // Spot-perp scan failed
        }
      })());
    }

    // 3. Triangular
    if (arbTypes.includes('triangular')) {
      promises.push((async () => {
        try {
          const triOpps = await triangularArbitrage.scanTriangularArbitrage('USDT');
          for (const opp of triOpps) {
            const path = opp.tradingPath;
            allOpportunities.push({
              id: opp.id,
              arbType: 'triangular',
              asset: `${path[0]?.toCurrency || '?'}→${path[1]?.toCurrency || '?'}→${opp.baseCurrency}`,
              buyExchange: opp.exchanges.join(', '),
              sellExchange: opp.exchanges.join(', '),
              buyPrice: path[0]?.price || 0,
              sellPrice: path[path.length - 1]?.price || 0,
              spreadPercent: opp.expectedProfit,
              netProfitPercent: opp.expectedProfit,
              estimatedProfitUSD: opp.profitAmount,
              fees: {
                trading: opp.fees.trading,
                network: opp.fees.network,
                total: opp.fees.total,
              },
              liquidity: Math.min(100, Math.round(opp.confidence)),
              confidence: opp.confidence,
              riskLevel: opp.riskLevel.toLowerCase() as 'low' | 'medium' | 'high',
              timestamp: Date.now(),
              metadata: {
                tradingPath: opp.tradingPath.map(s => `${s.fromCurrency}→${s.toCurrency}`),
                executionTime: opp.executionTime,
              },
            });
          }
        } catch (error) {
          // Triangular scan failed
        }
      })());
    }

    // 4. Ordinals NFT Arbitrage
    if (arbTypes.includes('ordinals')) {
      promises.push((async () => {
        try {
          const ordOpps = await ordinalsArbitrageService.scanOpportunities({
            minProfitPercentage: 0,
            limit: 20,
          });
          for (const opp of ordOpps) {
            allOpportunities.push({
              id: `ord-${opp.collectionId}-${opp.buyMarketplace}-${opp.sellMarketplace}`,
              arbType: 'ordinals',
              asset: opp.collectionName || opp.collectionId,
              buyExchange: opp.buyMarketplace,
              sellExchange: opp.sellMarketplace,
              buyPrice: opp.buyPrice,
              sellPrice: opp.sellPrice,
              spreadPercent: parseFloat(opp.grossProfitPercentage.toFixed(4)),
              netProfitPercent: parseFloat(opp.netProfitPercentage.toFixed(4)),
              estimatedProfitUSD: 0, // Ordinals priced in BTC
              fees: {
                trading: opp.fees.buyMarketplaceFee + opp.fees.sellMarketplaceFee,
                network: opp.fees.networkFee,
                total: opp.fees.totalFees,
              },
              liquidity: opp.liquidityScore,
              confidence: opp.confidence,
              riskLevel: opp.riskScore,
              timestamp: opp.lastUpdated,
              metadata: {
                collectionId: opp.collectionId,
                collectionSlug: opp.collectionSlug,
                imageUrl: opp.imageUrl,
                netProfitBTC: opp.netProfit,
                grossProfitBTC: opp.grossProfit,
                priceAge: opp.priceAge,
                warnings: opp.warnings,
              },
            });
          }
        } catch {
          // Ordinals scan failed, continue with other types
        }
      })());
    }

    // 5. Runes Arbitrage
    if (arbTypes.includes('runes')) {
      promises.push((async () => {
        try {
          const runeInsights = runesArbitrageService.getRunesArbitrageInsights();
          for (const insight of runeInsights) {
            const pred = insight.prediction;
            const netProfitPct = parseFloat(pred.profitPercent);

            allOpportunities.push({
              id: insight.id,
              arbType: 'runes',
              asset: pred.asset.replace('Rune/', ''),
              buyExchange: pred.sourceExchange,
              sellExchange: pred.targetExchange,
              buyPrice: pred.sourceBuyPrice,
              sellPrice: pred.targetSellPrice,
              spreadPercent: parseFloat((((pred.targetSellPrice - pred.sourceBuyPrice) / pred.sourceBuyPrice) * 100).toFixed(4)),
              netProfitPercent: parseFloat(netProfitPct.toFixed(4)),
              estimatedProfitUSD: pred.estimatedProfit,
              fees: { trading: 0, network: 0, total: 0 }, // fees already accounted in net profit
              liquidity: Math.min(100, Math.round(insight.dataPoints / 10)),
              confidence: insight.confidence,
              riskLevel: netProfitPct > 10 ? 'medium' : netProfitPct > 5 ? 'low' : 'low',
              timestamp: new Date(insight.timestamp).getTime(),
              metadata: {
                explanation: insight.explanation,
                relatedMetrics: insight.relatedMetrics,
                dataPoints: insight.dataPoints,
              },
            });
          }
        } catch {
          // Runes scan failed, continue with other types
        }
      })());
    }

    // 6. BRC-20 Arbitrage
    if (arbTypes.includes('brc20')) {
      promises.push((async () => {
        try {
          const brcInsights = brc20ArbitrageService.getInsights();
          for (const insight of brcInsights) {
            const pred = insight.prediction;
            const netProfitPct = parseFloat(pred.profitPercent);

            allOpportunities.push({
              id: insight.id,
              arbType: 'brc20',
              asset: pred.asset.replace('BRC20/', ''),
              buyExchange: pred.sourceExchange,
              sellExchange: pred.targetExchange,
              buyPrice: pred.sourceBuyPrice,
              sellPrice: pred.targetSellPrice,
              spreadPercent: parseFloat((((pred.targetSellPrice - pred.sourceBuyPrice) / pred.sourceBuyPrice) * 100).toFixed(4)),
              netProfitPercent: parseFloat(netProfitPct.toFixed(4)),
              estimatedProfitUSD: pred.estimatedProfit,
              fees: { trading: 0, network: 0, total: 0 },
              liquidity: Math.min(100, Math.round(insight.dataPoints / 10)),
              confidence: insight.confidence,
              riskLevel: netProfitPct > 10 ? 'medium' : 'low',
              timestamp: new Date(insight.timestamp).getTime(),
              metadata: {
                explanation: insight.explanation,
                dataPoints: insight.dataPoints,
              },
            });
          }
        } catch {
          // BRC-20 scan failed, continue with other types
        }
      })());
    }

    await Promise.allSettled(promises);

    // Sort by net profit descending
    allOpportunities.sort((a, b) => b.netProfitPercent - a.netProfitPercent);

    // Count by type
    const typeCounts: Record<string, number> = {};
    for (const opp of allOpportunities) {
      typeCounts[opp.arbType] = (typeCounts[opp.arbType] || 0) + 1;
    }

    const response = {
      opportunities: allOpportunities.slice(0, 50),
      typeCounts,
      totalCount: allOpportunities.length,
      bestNetProfit: allOpportunities[0]?.netProfitPercent || 0,
      timestamp: Date.now(),
    };

    // Cache
    try {
      await cache.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
    } catch { /* non-fatal */ }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=10' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Unified arbitrage scan failed: ${message}` }, { status: 500 });
  }
}
