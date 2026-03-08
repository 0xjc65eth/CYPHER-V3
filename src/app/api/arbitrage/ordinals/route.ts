/**
 * Ordinals Arbitrage Scanner
 * Uses OrdinalsArbitrageService to scan real cross-marketplace opportunities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ordinalsArbitrageService } from '@/services/ordinals/OrdinalsArbitrageService';
import { fetchBTCPrice } from '@/lib/price-apis';
import { EnhancedLogger } from '@/lib/enhanced-logger';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10);
    const minProfit = parseFloat(request.nextUrl.searchParams.get('minProfit') || '0');

    const [opportunities, btcPriceUSD] = await Promise.all([
      ordinalsArbitrageService.scanOpportunities({
        minProfitPercentage: minProfit,
        limit,
      }),
      fetchBTCPrice(),
    ]);

    const mapped = opportunities.map(opp => ({
      collectionId: opp.collectionId,
      collectionName: opp.collectionName || opp.collectionId,
      buyMarketplace: opp.buyMarketplace,
      sellMarketplace: opp.sellMarketplace,
      buyPrice: opp.buyPrice,
      sellPrice: opp.sellPrice,
      grossProfitPercentage: opp.grossProfitPercentage,
      netProfitPercentage: opp.netProfitPercentage,
      netProfitBTC: opp.netProfit,
      estimatedProfitUSD: parseFloat((opp.netProfit * btcPriceUSD).toFixed(2)),
      fees: opp.fees,
      confidence: opp.confidence,
      riskScore: opp.riskScore,
      liquidityScore: opp.liquidityScore,
      lastUpdated: opp.lastUpdated,
      imageUrl: opp.imageUrl,
      warnings: opp.warnings,
    }));

    mapped.sort((a, b) => b.netProfitPercentage - a.netProfitPercentage);

    return NextResponse.json({
      success: true,
      opportunities: mapped,
      scannedCollections: mapped.length,
      btcPriceUSD,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    EnhancedLogger.error('[Ordinals Arbitrage] Scan failed', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, opportunities: [], scannedCollections: 0, error: 'Ordinals arbitrage scan failed' },
      { status: 500 }
    );
  }
}
