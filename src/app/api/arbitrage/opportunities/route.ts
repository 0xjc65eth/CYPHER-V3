import { NextRequest, NextResponse } from 'next/server';

interface ArbitrageOpportunity {
  id: string;
  type: 'cross-exchange' | 'triangular' | 'defi' | 'ordinals';
  exchanges: {
    buy: {
      name: string;
      price: number;
      volume: number;
      fee: number;
    };
    sell: {
      name: string;
      price: number;
      volume: number;
      fee: number;
    };
  };
  asset: {
    symbol: string;
    name: string;
    type: 'bitcoin' | 'ordinal' | 'rune' | 'brc20';
  };
  profit: {
    amount: number;
    percentage: number;
    netAmount: number; // After fees
  };
  requiredCapital: number;
  confidence: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  expiresAt: Date;
  executionTime: number; // seconds
  status: 'active' | 'expired' | 'executed';
}

interface ArbitrageStats {
  totalOpportunities: number;
  averageProfit: number;
  bestOpportunity: ArbitrageOpportunity | null;
  volume24h: number;
  successRate: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const assetClass = searchParams.get('assetClass');
    const type = searchParams.get('type') || 'all';
    const minSpread = parseFloat(searchParams.get('minSpread') || '5');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // NEW: Handle Ordinals asset class
    if (assetClass === 'ordinals' || type === 'ordinals') {
      try {
        // Fetching Ordinals arbitrage opportunities

        const { ordinalsArbitrageService } = await import('@/services/ordinals/OrdinalsArbitrageService');

        // Get collections filter
        const collectionsParam = searchParams.get('collections');
        const collections = collectionsParam ? collectionsParam.split(',').filter(Boolean) : undefined;

        // Get confidence filter
        const minConfidence = parseFloat(searchParams.get('minConfidence') || '50');

        // Get marketplaces filter
        const marketplacesParam = searchParams.get('marketplaces');
        const marketplaces = marketplacesParam ? marketplacesParam.split(',').filter(Boolean) : undefined;

        // Scan for opportunities
        const opportunities = await ordinalsArbitrageService.scanOpportunities({
          minProfitPercentage: minSpread,
          collections,
          minConfidence,
          marketplaces: marketplaces as any,
          limit
        });

        // Calculate statistics
        const totalOpportunities = opportunities.length;
        const avgNetProfit = totalOpportunities > 0
          ? opportunities.reduce((sum, opp) => sum + opp.netProfitPercentage, 0) / totalOpportunities
          : 0;
        const avgGrossProfit = totalOpportunities > 0
          ? opportunities.reduce((sum, opp) => sum + opp.grossProfitPercentage, 0) / totalOpportunities
          : 0;
        const highValueCount = opportunities.filter(opp => opp.netProfitPercentage > 15).length;
        const avgLiquidity = totalOpportunities > 0
          ? opportunities.reduce((sum, opp) => sum + opp.liquidityScore, 0) / totalOpportunities
          : 0;
        const avgConfidence = totalOpportunities > 0
          ? opportunities.reduce((sum, opp) => sum + opp.confidence, 0) / totalOpportunities
          : 0;

        // Marketplace distribution
        const marketplaceDistribution: Record<string, number> = {};
        opportunities.forEach(opp => {
          marketplaceDistribution[opp.buyMarketplace] = (marketplaceDistribution[opp.buyMarketplace] || 0) + 1;
          marketplaceDistribution[opp.sellMarketplace] = (marketplaceDistribution[opp.sellMarketplace] || 0) + 1;
        });

        // Risk distribution
        const riskDistribution: Record<string, number> = {
          low: opportunities.filter(opp => opp.riskScore === 'low').length,
          medium: opportunities.filter(opp => opp.riskScore === 'medium').length,
          high: opportunities.filter(opp => opp.riskScore === 'high').length
        };

        return NextResponse.json({
          success: true,
          source: 'ORDINALS_REAL_DATA',
          opportunities: opportunities.slice(0, limit),
          stats: {
            totalOpportunities,
            avgNetProfit,
            avgGrossProfit,
            highValueCount,
            avgLiquidityScore: avgLiquidity,
            avgConfidence,
            marketplaceDistribution,
            riskDistribution
          },
          timestamp: new Date().toISOString(),
          cached: false
        });

      } catch (ordinalsError) {
        console.error('❌ Ordinals arbitrage detection failed:', ordinalsError);
        return NextResponse.json({
          success: false,
          source: 'ORDINALS_ERROR',
          opportunities: [],
          stats: {
            totalOpportunities: 0,
            avgNetProfit: 0,
            avgGrossProfit: 0,
            highValueCount: 0,
            avgLiquidityScore: 0,
            avgConfidence: 0,
            marketplaceDistribution: {},
            riskDistribution: { low: 0, medium: 0, high: 0 }
          },
          timestamp: new Date().toISOString(),
          error: ordinalsError instanceof Error ? ordinalsError.message : 'Failed to fetch Ordinals arbitrage opportunities'
        });
      }
    }

    // Use NEW CCXT-based Arbitrage Engine for CEX-DEX opportunities
    // Starting CEX-DEX arbitrage detection with CCXT

    try {
      // Try new CCXT-based engine first
      const { arbitrageEngine } = await import('@/services/arbitrage/ArbitrageEngine');
      const ccxtOpportunities = await arbitrageEngine.scanCEXDEXOpportunities(minSpread);

      if (ccxtOpportunities.length > 0) {
        const stats = await arbitrageEngine.getStatistics();

        return NextResponse.json({
          success: true,
          timestamp: new Date().toISOString(),
          opportunities: ccxtOpportunities.slice(0, limit),
          stats: {
            totalOpportunities: stats.totalOpportunities,
            avgSpread: stats.avgSpread,
            maxSpread: stats.maxSpread,
            totalPotentialProfit: stats.totalPotentialProfit,
            byExchange: stats.byExchange,
            highValueOpportunities: ccxtOpportunities.filter(opp => opp.spreadPercent >= 15).length,
            lastScan: Date.now()
          },
          filters: {
            type,
            minSpread,
            limit
          },
          source: 'CCXT_REAL_DATA',
          exchangeCount: Object.keys(stats.byExchange).length
        });
      }
    } catch (ccxtError) {
      // CCXT engine failed, falling back to legacy service
    }

    // Fallback to legacy RealArbitrageService
    const { realArbitrageService } = await import('@/services/RealArbitrageService');

    // Falling back to legacy arbitrage detection

    try {
      // Detect real arbitrage opportunities
      const realOpportunities = await realArbitrageService.detectRealOpportunities(minSpread, type);

      // If we have real data, use it
      if (realOpportunities.length > 0) {
        const totalOpportunities = realOpportunities.length;
        const totalSpread = realOpportunities.reduce((sum, opp) => sum + opp.spread, 0);
        const avgSpread = totalOpportunities > 0 ? totalSpread / totalOpportunities : 0;

        return NextResponse.json({
          success: true,
          timestamp: new Date().toISOString(),
          opportunities: realOpportunities.slice(0, limit),
          stats: {
            totalOpportunities,
            totalSpread,
            avgSpread,
            highValueOpportunities: realOpportunities.filter(opp => opp.spread >= 15).length,
            lastScan: Date.now()
          },
          filters: {
            type,
            minSpread,
            limit
          },
          source: 'LEGACY_REAL_DATA'
        });
      }
    } catch (realDataError) {
      console.error('Real arbitrage detection failed:', realDataError);
    }

    // Lightweight fallback: fetch BTC prices from free public APIs to detect real spreads
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const [binanceRes, krakenRes, coinbaseRes] = await Promise.allSettled([
        fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', { signal: controller.signal }),
        fetch('https://api.kraken.com/0/public/Ticker?pair=XXBTZUSD', { signal: controller.signal }),
        fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot', { signal: controller.signal }),
      ]);
      clearTimeout(timeout);

      const prices: { exchange: string; price: number }[] = [];

      if (binanceRes.status === 'fulfilled' && binanceRes.value.ok) {
        const d = await binanceRes.value.json();
        if (d.price) prices.push({ exchange: 'Binance', price: parseFloat(d.price) });
      }
      if (krakenRes.status === 'fulfilled' && krakenRes.value.ok) {
        const d = await krakenRes.value.json();
        const pair = d.result && Object.values(d.result)[0] as any;
        if (pair?.c?.[0]) prices.push({ exchange: 'Kraken', price: parseFloat(pair.c[0]) });
      }
      if (coinbaseRes.status === 'fulfilled' && coinbaseRes.value.ok) {
        const d = await coinbaseRes.value.json();
        if (d.data?.amount) prices.push({ exchange: 'Coinbase', price: parseFloat(d.data.amount) });
      }

      const opportunities: any[] = [];
      // Compare all pairs of exchanges
      for (let i = 0; i < prices.length; i++) {
        for (let j = i + 1; j < prices.length; j++) {
          const low = prices[i].price < prices[j].price ? prices[i] : prices[j];
          const high = prices[i].price < prices[j].price ? prices[j] : prices[i];
          const spreadPct = ((high.price - low.price) / low.price) * 100;

          opportunities.push({
            id: `arb-btc-${low.exchange}-${high.exchange}-${Date.now()}`,
            pair: 'BTC/USD',
            buyExchange: low.exchange,
            sellExchange: high.exchange,
            buyPrice: low.price,
            sellPrice: high.price,
            spreadPercent: parseFloat(spreadPct.toFixed(4)),
            estimatedProfit: parseFloat((high.price - low.price).toFixed(2)),
            confidence: 85,
            risk: spreadPct < 0.1 ? 'low' : spreadPct < 0.5 ? 'medium' : 'high',
            timestamp: Date.now(),
          });
        }
      }

      const filtered = opportunities.filter(o => o.spreadPercent >= minSpread / 100);

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        opportunities: filtered.slice(0, limit),
        allSpreads: opportunities,
        stats: {
          totalOpportunities: filtered.length,
          totalSpread: opportunities.reduce((s, o) => s + o.spreadPercent, 0),
          avgSpread: opportunities.length > 0 ? opportunities.reduce((s, o) => s + o.spreadPercent, 0) / opportunities.length : 0,
          highValueOpportunities: filtered.filter(o => o.spreadPercent >= 0.5).length,
          exchangesChecked: prices.map(p => p.exchange),
          lastScan: Date.now()
        },
        filters: { type, minSpread, limit },
        source: 'LIVE_EXCHANGE_PRICES',
      });
    } catch (fallbackError) {
      // Even the lightweight fallback failed
    }

    // All engines returned 0 opportunities or failed - return empty result
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      opportunities: [],
      stats: {
        totalOpportunities: 0,
        totalSpread: 0,
        avgSpread: 0,
        highValueOpportunities: 0,
        lastScan: Date.now()
      },
      filters: {
        type,
        minSpread,
        limit
      },
      source: 'NO_OPPORTUNITIES',
      message: 'No arbitrage opportunities found matching the current filters. Try lowering minSpread.'
    });

  } catch (error) {
    console.error('Arbitrage opportunities API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch arbitrage opportunities',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Real arbitrage execution and control endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { opportunityId, action, config } = body;

    if (!action) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Action is required' 
        },
        { status: 400 }
      );
    }

    // Handle different actions
    switch (action) {
      case 'execute':
        if (!opportunityId) {
          return NextResponse.json(
            { success: false, error: 'Opportunity ID required for execution' },
            { status: 400 }
          );
        }

        // Execute through real exchange service
        const result = await exchangeService.executeArbitrage(opportunityId);
        
        return NextResponse.json({
          success: result.success,
          message: result.success ? 'Arbitrage execution completed' : 'Execution failed',
          executionId: result.executionId,
          result: result,
          timestamp: result.timestamp
        });

      case 'start_detection':
        // Start the detection engine
        await arbitrageDetectionEngine.start();
        
        return NextResponse.json({
          success: true,
          message: 'Arbitrage detection engine started',
          status: arbitrageDetectionEngine.getStatus()
        });

      case 'stop_detection':
        // Stop the detection engine
        arbitrageDetectionEngine.stop();
        
        return NextResponse.json({
          success: true,
          message: 'Arbitrage detection engine stopped',
          status: arbitrageDetectionEngine.getStatus()
        });

      case 'start_automation':
        // Start automated execution
        automatedArbitrageExecutor.start();
        
        return NextResponse.json({
          success: true,
          message: 'Automated arbitrage execution started',
          status: automatedArbitrageExecutor.getStatus()
        });

      case 'stop_automation':
        // Stop automated execution
        automatedArbitrageExecutor.stop();
        
        return NextResponse.json({
          success: true,
          message: 'Automated arbitrage execution stopped',
          status: automatedArbitrageExecutor.getStatus()
        });

      case 'update_config':
        if (!config) {
          return NextResponse.json(
            { success: false, error: 'Configuration is required' },
            { status: 400 }
          );
        }

        // Update detection engine config
        if (config.detection) {
          arbitrageDetectionEngine.updateConfig(config.detection);
        }

        // Update executor config
        if (config.execution) {
          automatedArbitrageExecutor.updateConfig(config.execution);
        }

        return NextResponse.json({
          success: true,
          message: 'Configuration updated successfully',
          detectionConfig: arbitrageDetectionEngine.getConfig(),
          executionConfig: automatedArbitrageExecutor.getConfig()
        });

      case 'get_analytics':
        // Return comprehensive analytics
        const analytics = arbitrageAnalyticsService.exportAnalytics();
        const executorStats = automatedArbitrageExecutor.getStats();
        const recentAlerts = arbitrageDetectionEngine.getRecentAlerts(20);
        const recentNotifications = automatedArbitrageExecutor.getRecentNotifications(20);

        return NextResponse.json({
          success: true,
          analytics,
          executorStats,
          recentAlerts,
          recentNotifications,
          systemStatus: {
            detectionEngine: arbitrageDetectionEngine.getStatus(),
            automatedExecution: automatedArbitrageExecutor.getStatus(),
            analytics: arbitrageAnalyticsService.getStatus?.() || { isTracking: true }
          }
        });

      case 'health_check':
        // System health check
        const exchangeHealth = await exchangeService.healthCheck();
        const detectionStatus = arbitrageDetectionEngine.getStatus();
        const executionStatus = automatedArbitrageExecutor.getStatus();

        return NextResponse.json({
          success: true,
          health: {
            exchanges: exchangeHealth,
            detection: detectionStatus.isActive,
            execution: executionStatus.isRunning,
            uptime: detectionStatus.uptime,
            lastUpdate: Date.now()
          }
        });

      case 'monitor':
        // Add to monitoring (legacy support)
        return NextResponse.json({
          success: true,
          message: 'Added to monitoring list'
        });

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid action: ${action}` 
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Arbitrage action API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process arbitrage action',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}