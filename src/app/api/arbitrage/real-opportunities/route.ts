/**
 * Real Arbitrage Opportunities API
 * Live arbitrage detection across 8 exchanges with real price data
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  withMiddleware,
  createSuccessResponse,
  createErrorResponse,
  corsHeaders
} from '@/lib/api-middleware';
import { fetchAllExchangePrices, EXCHANGE_FEES, ExchangePrice } from '@/lib/arbitrage/exchange-fetchers';

// Request schema
const ArbitrageRequestSchema = z.object({
  pairs: z.array(z.string()).optional().default(['BTC/USDT', 'ETH/USDT', 'SOL/USDT']),
  minProfitPercent: z.number().min(0).max(100).optional().default(0.5),
  maxPriceImpact: z.number().min(0).max(50).optional().default(2.0),
  exchanges: z.array(z.string()).optional().default(['binance', 'coinbase', 'kraken', 'bybit', 'okx', 'bitfinex', 'kucoin', 'gateio']),
  includeGasCosts: z.boolean().optional().default(true),
  timeWindow: z.number().min(1).max(3600).optional().default(300) // 5 minutes
});

interface RealArbitrageOpportunity {
  id: string;
  pair: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  profitPercent: number;
  profitUSD: number;
  volume24h: number;
  priceImpact: number;
  executionTime: number;
  gasEstimate?: {
    cost: number;
    currency: string;
  };
  risk: 'low' | 'medium' | 'high';
  confidence: number;
  timestamp: number;
  expiresAt: number;
  minTradeSize: number;
  maxTradeSize: number;
  fees: {
    buyFee: number;
    sellFee: number;
    totalFeePercent: number;
  };
}

interface ArbitrageMarketData {
  exchange: string;
  pair: string;
  price: number;
  volume: number;
  spread: number;
  depth: {
    bids: [number, number][];
    asks: [number, number][];
  };
  lastUpdate: number;
}

class RealArbitrageDetector {
  private exchangeData: Map<string, ArbitrageMarketData[]> = new Map();
  private lastUpdate = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  /**
   * Detect real arbitrage opportunities
   */
  async detectOpportunities(request: z.infer<typeof ArbitrageRequestSchema>): Promise<RealArbitrageOpportunity[]> {
    try {
      // Update market data if needed
      await this.updateMarketData(request.exchanges, request.pairs);
      
      const opportunities: RealArbitrageOpportunity[] = [];
      
      // Check each pair across all exchange combinations
      for (const pair of request.pairs) {
        const pairOpportunities = await this.findPairOpportunities(pair, request);
        opportunities.push(...pairOpportunities);
      }
      
      // Sort by profit potential
      return opportunities
        .filter(opp => opp.profitPercent >= request.minProfitPercent)
        .filter(opp => opp.priceImpact <= request.maxPriceImpact)
        .sort((a, b) => b.profitPercent - a.profitPercent)
        .slice(0, 20); // Top 20 opportunities
      
    } catch (error) {
      console.error('Arbitrage detection error:', error);
      return [];
    }
  }

  /**
   * Find arbitrage opportunities for a specific pair
   */
  private async findPairOpportunities(
    pair: string, 
    request: z.infer<typeof ArbitrageRequestSchema>
  ): Promise<RealArbitrageOpportunity[]> {
    const opportunities: RealArbitrageOpportunity[] = [];
    const exchanges = request.exchanges;
    
    // Get market data for all exchanges
    const marketData: ArbitrageMarketData[] = [];
    for (const exchange of exchanges) {
      const exchangeMarketData = this.exchangeData.get(exchange) || [];
      const pairData = exchangeMarketData.find(data => data.pair === pair);
      if (pairData) {
        marketData.push(pairData);
      }
    }
    
    // Compare all exchange pairs
    for (let i = 0; i < marketData.length; i++) {
      for (let j = i + 1; j < marketData.length; j++) {
        const buyMarket = marketData[i];
        const sellMarket = marketData[j];
        
        // Check both directions
        const opportunity1 = this.calculateOpportunity(buyMarket, sellMarket, request);
        const opportunity2 = this.calculateOpportunity(sellMarket, buyMarket, request);
        
        if (opportunity1) opportunities.push(opportunity1);
        if (opportunity2) opportunities.push(opportunity2);
      }
    }
    
    return opportunities;
  }

  /**
   * Calculate arbitrage opportunity between two markets
   */
  private calculateOpportunity(
    buyMarket: ArbitrageMarketData,
    sellMarket: ArbitrageMarketData,
    request: z.infer<typeof ArbitrageRequestSchema>
  ): RealArbitrageOpportunity | null {
    const buyPrice = buyMarket.price;
    const sellPrice = sellMarket.price;
    
    // Skip if no profit potential
    if (sellPrice <= buyPrice) return null;
    
    const grossProfitPercent = ((sellPrice - buyPrice) / buyPrice) * 100;
    
    // Calculate fees using real exchange fee table
    const buyFeeRate = EXCHANGE_FEES[buyMarket.exchange] || 0.002;
    const sellFeeRate = EXCHANGE_FEES[sellMarket.exchange] || 0.002;
    const buyFee = buyPrice * buyFeeRate;
    const sellFee = sellPrice * sellFeeRate;
    const totalFeePercent = (buyFeeRate + sellFeeRate) * 100;
    
    const netProfitPercent = grossProfitPercent - totalFeePercent;
    
    // Skip if not profitable enough
    if (netProfitPercent < request.minProfitPercent) return null;
    
    // Calculate trade size constraints
    const minTradeSize = Math.max(10, buyMarket.depth.asks[0]?.[1] || 0) * buyPrice;
    const maxTradeSize = Math.min(
      buyMarket.volume * 0.01, // Max 1% of daily volume
      sellMarket.volume * 0.01,
      100000 // Max $100k
    );
    
    // Calculate risk and confidence
    const risk = this.calculateRisk(buyMarket, sellMarket, netProfitPercent);
    const confidence = this.calculateConfidence(buyMarket, sellMarket);
    
    // Estimate execution time and price impact
    const executionTime = this.estimateExecutionTime(buyMarket.exchange, sellMarket.exchange);
    const priceImpact = this.calculatePriceImpact(minTradeSize, buyMarket, sellMarket);
    
    const opportunity: RealArbitrageOpportunity = {
      id: `arb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      pair: buyMarket.pair,
      buyExchange: buyMarket.exchange,
      sellExchange: sellMarket.exchange,
      buyPrice,
      sellPrice,
      profitPercent: netProfitPercent,
      profitUSD: (netProfitPercent / 100) * minTradeSize,
      volume24h: (buyMarket.volume + sellMarket.volume) / 2,
      priceImpact,
      executionTime,
      risk,
      confidence,
      timestamp: Date.now(),
      expiresAt: Date.now() + request.timeWindow * 1000,
      minTradeSize,
      maxTradeSize,
      fees: {
        buyFee,
        sellFee,
        totalFeePercent
      }
    };
    
    // Add gas estimate for DeFi trades
    if (request.includeGasCosts && this.isDeFiExchange(buyMarket.exchange)) {
      opportunity.gasEstimate = {
        cost: 50, // Estimated $50 gas cost
        currency: 'USD'
      };
      opportunity.profitUSD -= 50;
      opportunity.profitPercent = (opportunity.profitUSD / minTradeSize) * 100;
    }
    
    return opportunity;
  }

  /**
   * Update market data from real exchanges
   */
  private async updateMarketData(exchanges: string[], pairs: string[]): Promise<void> {
    const now = Date.now();

    // Skip if data is fresh
    if (now - this.lastUpdate < this.CACHE_DURATION) {
      return;
    }

    try {
      // Fetch real prices for all pairs in parallel
      const pairResults = await Promise.all(
        pairs.map((pair) => fetchAllExchangePrices(pair, exchanges))
      );

      // Clear old data
      for (const exchange of exchanges) {
        this.exchangeData.set(exchange, []);
      }

      // Organize fetched prices by exchange
      for (let i = 0; i < pairs.length; i++) {
        const prices = pairResults[i];
        for (const ep of prices) {
          const spread = ep.ask - ep.bid;
          const midPrice = (ep.bid + ep.ask) / 2;
          const marketData: ArbitrageMarketData = {
            exchange: ep.exchange,
            pair: ep.pair,
            price: midPrice,
            volume: ep.volume * midPrice, // approximate USD volume
            spread,
            depth: {
              bids: [[ep.bid, ep.volume * 0.1]],
              asks: [[ep.ask, ep.volume * 0.1]],
            },
            lastUpdate: ep.timestamp,
          };
          const existing = this.exchangeData.get(ep.exchange) || [];
          existing.push(marketData);
          this.exchangeData.set(ep.exchange, existing);
        }
      }

      this.lastUpdate = now;
    } catch (error) {
      console.error('Failed to update market data:', error);
    }
  }

  /**
   * Calculate risk level
   */
  private calculateRisk(
    buyMarket: ArbitrageMarketData,
    sellMarket: ArbitrageMarketData,
    profitPercent: number
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;
    
    // High profit usually means higher risk
    if (profitPercent > 5) riskScore += 2;
    else if (profitPercent > 2) riskScore += 1;
    
    // Low volume increases risk
    if (buyMarket.volume < 100000 || sellMarket.volume < 100000) riskScore += 2;
    
    // Large spreads increase risk
    if (buyMarket.spread > buyMarket.price * 0.005) riskScore += 1;
    if (sellMarket.spread > sellMarket.price * 0.005) riskScore += 1;
    
    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(buyMarket: ArbitrageMarketData, sellMarket: ArbitrageMarketData): number {
    let confidence = 100;
    
    // Reduce confidence for stale data
    const dataAge = Date.now() - Math.min(buyMarket.lastUpdate, sellMarket.lastUpdate);
    if (dataAge > 60000) confidence -= 20; // 1 minute
    if (dataAge > 300000) confidence -= 40; // 5 minutes
    
    // Reduce confidence for low volume
    if (buyMarket.volume < 500000) confidence -= 15;
    if (sellMarket.volume < 500000) confidence -= 15;
    
    // Reduce confidence for wide spreads
    if (buyMarket.spread > buyMarket.price * 0.01) confidence -= 20;
    if (sellMarket.spread > sellMarket.price * 0.01) confidence -= 20;
    
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Estimate execution time
   */
  private estimateExecutionTime(buyExchange: string, sellExchange: string): number {
    const exchangeTimes: { [key: string]: number } = {
      binance: 2000,
      coinbase: 3000,
      kraken: 4000,
      bybit: 2500,
      okx: 2500,
      bitfinex: 3500,
      kucoin: 3000,
      gateio: 3500,
    };
    
    const buyTime = exchangeTimes[buyExchange] || 5000;
    const sellTime = exchangeTimes[sellExchange] || 5000;
    
    return Math.max(buyTime, sellTime);
  }

  /**
   * Calculate price impact
   */
  private calculatePriceImpact(
    tradeSize: number,
    buyMarket: ArbitrageMarketData,
    sellMarket: ArbitrageMarketData
  ): number {
    // Simplified price impact calculation
    const volumeRatio = tradeSize / Math.min(buyMarket.volume, sellMarket.volume);
    return Math.min(50, volumeRatio * 100); // Max 50% impact
  }

  /**
   * Check if exchange is DeFi
   */
  private isDeFiExchange(exchange: string): boolean {
    return ['uniswap', 'sushiswap', 'curve', 'balancer'].includes(exchange);
  }
}

// Handler function
async function handleArbitrageOpportunities(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    
    // Convert query params
    const processedParams = {
      ...searchParams,
      pairs: searchParams.pairs ? searchParams.pairs.split(',') : undefined,
      exchanges: searchParams.exchanges ? searchParams.exchanges.split(',') : undefined,
      minProfitPercent: searchParams.minProfitPercent ? parseFloat(searchParams.minProfitPercent) : undefined,
      maxPriceImpact: searchParams.maxPriceImpact ? parseFloat(searchParams.maxPriceImpact) : undefined,
      includeGasCosts: searchParams.includeGasCosts !== 'false',
      timeWindow: searchParams.timeWindow ? parseInt(searchParams.timeWindow) : undefined
    };
    
    // Validate request
    const validationResult = ArbitrageRequestSchema.safeParse(processedParams);
    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse('Invalid arbitrage parameters', {
          errors: validationResult.error.errors
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const arbitrageRequest = validationResult.data;
    
    // Detect opportunities
    const detector = new RealArbitrageDetector();
    const opportunities = await detector.detectOpportunities(arbitrageRequest);
    
    return NextResponse.json(
      createSuccessResponse({
        opportunities,
        summary: {
          totalOpportunities: opportunities.length,
          averageProfit: opportunities.length > 0 
            ? opportunities.reduce((sum, opp) => sum + opp.profitPercent, 0) / opportunities.length 
            : 0,
          totalVolume: opportunities.reduce((sum, opp) => sum + opp.volume24h, 0),
          exchanges: [...new Set([
            ...opportunities.map(opp => opp.buyExchange),
            ...opportunities.map(opp => opp.sellExchange)
          ])],
          pairs: [...new Set(opportunities.map(opp => opp.pair))],
          lastUpdate: Date.now()
        }
      }, 'Real arbitrage opportunities detected'),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Arbitrage opportunities error:', error);
    
    return NextResponse.json(
      createErrorResponse('Failed to detect arbitrage opportunities', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Export handlers
export const GET = withMiddleware(handleArbitrageOpportunities, {
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 60, // 1 request per second
  },
  cache: {
    ttl: 30, // 30 seconds cache
  }
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
}