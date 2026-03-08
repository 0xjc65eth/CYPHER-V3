/**
 * 🔺 TRIANGULAR ARBITRAGE ENGINE
 * Advanced triangular arbitrage detection for cryptocurrency markets
 * Identifies risk-free profit opportunities across multiple trading pairs
 */

import { logger } from '@/lib/logger';
import { coinGeckoService } from '@/lib/api/coingecko-service';
import { fetchAllExchangePrices, EXCHANGE_FEES, type ExchangePrice } from '@/lib/arbitrage/exchange-fetchers';

// Cached real prices from CoinGecko, refreshed in updateMarketData()
interface CachedPrices {
  btc: number;
  eth: number;
  sol: number;
  bnb: number;
  ada: number;
  matic: number;
  timestamp: number;
}

// Real exchange data cache: exchange -> pair -> ExchangePrice
type ExchangeDataCache = Map<string, Map<string, ExchangePrice>>;

export interface ArbitrageOpportunity {
  id: string;
  type: 'TRIANGULAR' | 'CROSS_EXCHANGE';
  baseCurrency: string;
  tradingPath: TradingStep[];
  expectedProfit: number; // Percentage
  profitAmount: number; // In base currency
  minInvestment: number;
  maxInvestment: number;
  executionTime: number; // Estimated seconds
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number; // 0-100%
  exchanges: string[];
  timestamp: string;
  expiresAt: string;
  fees: {
    trading: number;
    network: number;
    slippage: number;
    total: number;
  };
}

export interface TradingStep {
  step: number;
  action: 'BUY' | 'SELL';
  pair: string;
  fromCurrency: string;
  toCurrency: string;
  price: number;
  volume: number;
  exchange: string;
  estimatedTime: number;
}

export interface MarketData {
  exchange: string;
  pair: string;
  bid: number;
  ask: number;
  volume: number;
  timestamp: string;
  spread: number;
  liquidity: number;
}

export interface ArbitrageAlert {
  id: string;
  opportunity: ArbitrageOpportunity;
  type: 'NEW_OPPORTUNITY' | 'PRICE_CHANGE' | 'EXPIRING' | 'EXECUTED';
  message: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
  actionRequired: boolean;
}

interface ExchangeRates {
  [pair: string]: {
    bid: number;
    ask: number;
    volume: number;
    spread: number;
  };
}

export class TriangularArbitrageEngine {
  private marketData: Map<string, MarketData[]>;
  private opportunities: Map<string, ArbitrageOpportunity>;
  private alertCallbacks: Array<(alert: ArbitrageAlert) => void>;
  private readonly MIN_PROFIT_THRESHOLD = 0.01; // 0.01% minimum - show all real opportunities
  private readonly MAX_EXECUTION_TIME = 300; // 5 minutes max execution
  private readonly OPPORTUNITY_TTL = 120 * 1000; // 2 minute TTL
  private cachedPrices: CachedPrices | null = null;
  private realExchangeData: ExchangeDataCache = new Map();
  private realDataTimestamp = 0;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private executedCount = 0;
  private successCount = 0;
  private totalProfitTracked = 0;

  // Realistic exchange-specific fee rates (maker/taker) and typical spread
  private readonly EXCHANGE_PROFILES: Record<string, { feeRate: number; spreadBps: number }> = {
    'Binance':  { feeRate: 0.001,  spreadBps: 1 },   // 0.1% fee, ~1 bps typical spread
    'Coinbase': { feeRate: 0.006,  spreadBps: 5 },   // 0.6% fee, ~5 bps spread
    'Kraken':   { feeRate: 0.0026, spreadBps: 3 },   // 0.26% fee, ~3 bps spread
    'OKX':      { feeRate: 0.001,  spreadBps: 2 },   // 0.1% fee, ~2 bps spread
  };

  constructor() {
    this.marketData = new Map();
    this.opportunities = new Map();
    this.alertCallbacks = [];
    this.startMarketMonitoring();
  }

  /**
   * Scan for triangular arbitrage opportunities
   */
  async scanTriangularArbitrage(baseCurrency: string = 'USDT'): Promise<ArbitrageOpportunity[]> {
    try {
      logger.debug(`[ARBITRAGE] Scanning triangular arbitrage opportunities for ${baseCurrency}`);

      const exchanges = ['Binance', 'Coinbase', 'Kraken', 'OKX'];
      const currencies = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'MATIC'];
      
      const opportunities: ArbitrageOpportunity[] = [];

      // Get current market data
      await this.updateMarketData();

      // Generate all possible triangular paths
      for (const currency1 of currencies) {
        for (const currency2 of currencies) {
          if (currency1 !== currency2 && currency1 !== baseCurrency && currency2 !== baseCurrency) {
            
            // Path: Base -> Currency1 -> Currency2 -> Base
            const opportunity = await this.calculateTriangularPath(
              baseCurrency,
              currency1,
              currency2,
              exchanges
            );

            if (opportunity && opportunity.expectedProfit > this.MIN_PROFIT_THRESHOLD) {
              opportunities.push(opportunity);
              
              // Store and alert for high-profit opportunities
              this.opportunities.set(opportunity.id, opportunity);
              
              if (opportunity.expectedProfit > 2.0) {
                this.sendArbitrageAlert({
                  id: `alert-${Date.now()}`,
                  opportunity,
                  type: 'NEW_OPPORTUNITY',
                  message: `High-profit arbitrage: ${opportunity.expectedProfit.toFixed(2)}% profit potential`,
                  urgency: 'HIGH',
                  timestamp: new Date().toISOString(),
                  actionRequired: true
                });
              }
            }
          }
        }
      }

      // Sort by profit potential
      opportunities.sort((a, b) => b.expectedProfit - a.expectedProfit);

      logger.debug(`[ARBITRAGE] Found ${opportunities.length} triangular arbitrage opportunities`);
      return opportunities.slice(0, 20); // Return top 20 opportunities

    } catch (error) {
      logger.error('[ARBITRAGE] Failed to scan triangular arbitrage', error as Error);
      return [];
    }
  }

  /**
   * Calculate triangular arbitrage path profitability
   */
  private async calculateTriangularPath(
    baseCurrency: string,
    currency1: string,
    currency2: string,
    exchanges: string[]
  ): Promise<ArbitrageOpportunity | null> {
    try {
      const startAmount = 1000; // Base calculation amount

      // Step 1: Base -> Currency1
      const step1Pair = `${baseCurrency}/${currency1}`;
      const step1Rate = this.getBestRate(step1Pair, 'BUY', exchanges);
      if (!step1Rate) return null;

      const amount1 = startAmount / step1Rate.ask;

      // Step 2: Currency1 -> Currency2
      const step2Pair = `${currency1}/${currency2}`;
      const step2Rate = this.getBestRate(step2Pair, 'BUY', exchanges);
      if (!step2Rate) return null;

      const amount2 = amount1 / step2Rate.ask;

      // Step 3: Currency2 -> Base
      const step3Pair = `${currency2}/${baseCurrency}`;
      const step3Rate = this.getBestRate(step3Pair, 'BUY', exchanges);
      if (!step3Rate) return null;

      const finalAmount = amount2 / step3Rate.ask;

      // Calculate profit
      const grossProfit = finalAmount - startAmount;
      const profitPercentage = (grossProfit / startAmount) * 100;

      // Calculate fees
      const fees = this.calculateFees(startAmount, [step1Rate, step2Rate, step3Rate]);
      const netProfit = grossProfit - fees.total;
      const netProfitPercentage = (netProfit / startAmount) * 100;

      // Only return profitable opportunities
      if (netProfitPercentage < this.MIN_PROFIT_THRESHOLD) {
        return null;
      }

      // Create trading steps
      const tradingPath: TradingStep[] = [
        {
          step: 1,
          action: 'BUY',
          pair: step1Pair,
          fromCurrency: baseCurrency,
          toCurrency: currency1,
          price: step1Rate.ask,
          volume: amount1,
          exchange: step1Rate.exchange,
          estimatedTime: 30
        },
        {
          step: 2,
          action: 'BUY',
          pair: step2Pair,
          fromCurrency: currency1,
          toCurrency: currency2,
          price: step2Rate.ask,
          volume: amount2,
          exchange: step2Rate.exchange,
          estimatedTime: 30
        },
        {
          step: 3,
          action: 'BUY',
          pair: step3Pair,
          fromCurrency: currency2,
          toCurrency: baseCurrency,
          price: step3Rate.ask,
          volume: finalAmount,
          exchange: step3Rate.exchange,
          estimatedTime: 30
        }
      ];

      const totalExecutionTime = tradingPath.reduce((sum, step) => sum + step.estimatedTime, 0);
      
      const opportunity: ArbitrageOpportunity = {
        id: `tri-${baseCurrency}-${currency1}-${currency2}-${Date.now()}`,
        type: 'TRIANGULAR',
        baseCurrency,
        tradingPath,
        expectedProfit: netProfitPercentage,
        profitAmount: netProfit,
        minInvestment: 100,
        maxInvestment: this.calculateMaxInvestment(tradingPath),
        executionTime: totalExecutionTime,
        riskLevel: this.assessRiskLevel(netProfitPercentage, totalExecutionTime, tradingPath),
        confidence: this.calculateConfidence(tradingPath),
        exchanges: [...new Set(tradingPath.map(step => step.exchange))],
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.OPPORTUNITY_TTL).toISOString(),
        fees
      };

      return opportunity;

    } catch (error) {
      logger.error(`[ARBITRAGE] Failed to calculate triangular path`, error as Error);
      return null;
    }
  }

  /**
   * Get best exchange rate for a trading pair
   */
  private getBestRate(
    pair: string,
    action: 'BUY' | 'SELL',
    exchanges: string[]
  ): (MarketData & { exchange: string }) | null {
    let bestRate: (MarketData & { exchange: string }) | null = null;

    for (const exchange of exchanges) {
      const rates = this.getMarketDataFromCache(pair, exchange);
      if (!rates) continue;

      const rate = { ...rates, exchange };

      if (!bestRate) {
        bestRate = rate;
        continue;
      }

      // For buying, we want the lowest ask price
      // For selling, we want the highest bid price
      if (action === 'BUY' && rate.ask < bestRate.ask) {
        bestRate = rate;
      } else if (action === 'SELL' && rate.bid > bestRate.bid) {
        bestRate = rate;
      }
    }

    return bestRate;
  }

  /**
   * Get market data for a trading pair from real exchange data.
   * Tries real exchange-fetcher data first, falls back to CoinGecko-derived prices
   * for cross pairs not directly available on exchanges (e.g. ADA/SOL).
   */
  private getMarketDataFromCache(pair: string, exchange: string): MarketData | null {
    // 1. Try real exchange data first
    const exchangeLower = exchange.toLowerCase();
    const exchangeMap = this.realExchangeData.get(exchangeLower);
    if (exchangeMap) {
      const realData = exchangeMap.get(pair);
      if (realData && realData.bid > 0 && realData.ask > 0) {
        const spread = realData.ask > 0 ? ((realData.ask - realData.bid) / realData.ask) * 100 : 0;
        return {
          exchange,
          pair,
          bid: realData.bid,
          ask: realData.ask,
          volume: realData.volume || 0,
          timestamp: new Date(realData.timestamp).toISOString(),
          spread,
          liquidity: Math.min(10000, realData.volume || 0),
        };
      }
    }

    // 2. Fallback: derive from CoinGecko USD prices for cross pairs
    if (!this.cachedPrices) return null;

    const prices = this.cachedPrices;
    const coinPrices: Record<string, number> = {
      'USDT': 1,
      'BTC': prices.btc,
      'ETH': prices.eth,
      'SOL': prices.sol,
      'BNB': prices.bnb,
      'ADA': prices.ada,
      'MATIC': prices.matic,
    };

    const [base, quote] = pair.split('/');
    const basePrice = coinPrices[base];
    const quotePrice = coinPrices[quote];
    if (!basePrice || !quotePrice) return null;

    const midPrice = basePrice / quotePrice;
    const profile = this.EXCHANGE_PROFILES[exchange] || { feeRate: 0.002, spreadBps: 3 };
    const spreadFraction = profile.spreadBps / 10000;

    // Use exchange-specific spread applied to CoinGecko mid price
    const ask = midPrice * (1 + spreadFraction / 2);
    const bid = midPrice * (1 - spreadFraction / 2);

    return {
      exchange,
      pair,
      bid,
      ask,
      volume: 0, // No real volume data for CoinGecko fallback
      timestamp: new Date().toISOString(),
      spread: spreadFraction * 100,
      liquidity: 0,
    };
  }

  /**
   * Calculate trading fees using per-exchange fee rates
   */
  private calculateFees(
    amount: number,
    rates: Array<{ exchange: string; ask: number }>
  ): ArbitrageOpportunity['fees'] {
    // Use actual exchange fee rates instead of flat rate
    let tradingFees = 0;
    for (const rate of rates) {
      const profile = this.EXCHANGE_PROFILES[rate.exchange] || { feeRate: 0.002, spreadBps: 3 };
      tradingFees += amount * profile.feeRate;
    }
    const networkFeeRate = 0.0003; // 0.03% network fees per step
    const slippageRate = 0.0001; // 0.01% slippage per step

    const networkFees = amount * networkFeeRate * rates.length;
    const slippage = amount * slippageRate * rates.length;

    return {
      trading: tradingFees,
      network: networkFees,
      slippage: slippage,
      total: tradingFees + networkFees + slippage,
    };
  }

  /**
   * Calculate maximum investment based on liquidity
   */
  private calculateMaxInvestment(tradingPath: TradingStep[]): number {
    // Find the bottleneck in terms of liquidity
    let minLiquidity = Infinity;
    
    for (const step of tradingPath) {
      const liquidity = step.volume * step.price * 0.1; // Assume 10% of volume is available
      minLiquidity = Math.min(minLiquidity, liquidity);
    }

    return Math.min(minLiquidity, 100000); // Cap at $100k
  }

  /**
   * Assess risk level of opportunity
   */
  private assessRiskLevel(
    profit: number,
    executionTime: number,
    tradingPath: TradingStep[]
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    let riskScore = 0;

    // Time risk
    if (executionTime > 120) riskScore += 1;
    if (executionTime > 240) riskScore += 1;

    // Profit risk (too good to be true)
    if (profit > 5) riskScore += 1;
    if (profit > 10) riskScore += 2;

    // Exchange risk (cross-exchange arbitrage is riskier)
    const uniqueExchanges = new Set(tradingPath.map(step => step.exchange)).size;
    if (uniqueExchanges > 1) riskScore += 1;
    if (uniqueExchanges > 2) riskScore += 1;

    if (riskScore >= 3) return 'HIGH';
    if (riskScore >= 2) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate confidence in opportunity
   */
  private calculateConfidence(tradingPath: TradingStep[]): number {
    let confidence = 85; // Base confidence

    // Reduce confidence for cross-exchange arbitrage
    const uniqueExchanges = new Set(tradingPath.map(step => step.exchange)).size;
    confidence -= (uniqueExchanges - 1) * 10;

    // Reduce confidence for long execution times
    const totalTime = tradingPath.reduce((sum, step) => sum + step.estimatedTime, 0);
    if (totalTime > 120) confidence -= 10;
    if (totalTime > 240) confidence -= 15;

    return Math.max(50, Math.min(95, confidence));
  }

  /**
   * Update market data by fetching real prices from exchanges and CoinGecko.
   * Exchange-fetchers provide real bid/ask from 8 exchanges for USDT pairs.
   * CoinGecko provides USD prices for deriving cross-pair rates as fallback.
   */
  private async updateMarketData(): Promise<void> {
    const now = Date.now();

    // Skip if data is fresh (< 15 seconds old)
    if (this.realDataTimestamp && now - this.realDataTimestamp < 15000 && this.cachedPrices && now - this.cachedPrices.timestamp < 30000) {
      logger.debug('[ARBITRAGE] Using cached exchange data (< 15s old)');
      this.rebuildMarketData();
      return;
    }

    // Fetch real exchange data for USDT pairs and CoinGecko for cross-pair fallback in parallel
    const exchangePairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT'];
    const exchangeNames = ['binance', 'coinbase', 'kraken', 'okx'];

    const [exchangeResults, coinGeckoResult] = await Promise.allSettled([
      // Fetch real exchange prices for main USDT pairs
      Promise.allSettled(exchangePairs.map(pair => fetchAllExchangePrices(pair, exchangeNames))),
      // Fetch CoinGecko as fallback for cross-pair calculations
      (this.cachedPrices && now - this.cachedPrices.timestamp < 30000)
        ? Promise.resolve(null) // Skip if CoinGecko cache is fresh
        : coinGeckoService.getSimplePrice(
            ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'cardano', 'matic-network'],
            ['usd'],
            { include24hrVol: true }
          ).catch(() => null),
    ]);

    // Process real exchange data
    if (exchangeResults.status === 'fulfilled') {
      const pairResults = exchangeResults.value;
      this.realExchangeData.clear();

      for (let i = 0; i < exchangePairs.length; i++) {
        const result = pairResults[i];
        if (result.status !== 'fulfilled') continue;

        const prices = result.value;
        const pair = exchangePairs[i];

        for (const price of prices) {
          const exchKey = price.exchange.toLowerCase();
          if (!this.realExchangeData.has(exchKey)) {
            this.realExchangeData.set(exchKey, new Map());
          }
          this.realExchangeData.get(exchKey)!.set(pair, price);

          // Also store the reverse pair for triangular path resolution
          if (price.bid > 0 && price.ask > 0) {
            const [base, quote] = pair.split('/');
            const reversePair = `${quote}/${base}`;
            const reversePrice: ExchangePrice = {
              exchange: price.exchange,
              pair: reversePair,
              bid: 1 / price.ask,   // reverse bid = 1/ask
              ask: 1 / price.bid,   // reverse ask = 1/bid
              last: price.last > 0 ? 1 / price.last : 0,
              volume: price.volume,
              timestamp: price.timestamp,
            };
            this.realExchangeData.get(exchKey)!.set(reversePair, reversePrice);
          }
        }
      }
      this.realDataTimestamp = now;
      logger.debug(`[ARBITRAGE] Updated real exchange data for ${exchangePairs.length} pairs`);
    }

    // Process CoinGecko data (for cross-pair fallback)
    if (coinGeckoResult.status === 'fulfilled' && coinGeckoResult.value) {
      const data = coinGeckoResult.value;
      this.cachedPrices = {
        btc: data.bitcoin?.usd ?? this.cachedPrices?.btc ?? 0,
        eth: data.ethereum?.usd ?? this.cachedPrices?.eth ?? 0,
        sol: data.solana?.usd ?? this.cachedPrices?.sol ?? 0,
        bnb: data.binancecoin?.usd ?? this.cachedPrices?.bnb ?? 0,
        ada: data.cardano?.usd ?? this.cachedPrices?.ada ?? 0,
        matic: data['matic-network']?.usd ?? this.cachedPrices?.matic ?? 0,
        timestamp: now,
      };
      logger.debug('[ARBITRAGE] Updated CoinGecko fallback prices');
    }

    // Rebuild market data map
    this.rebuildMarketData();
  }

  /**
   * Rebuild market data map from cached prices without re-fetching
   */
  private rebuildMarketData(): void {
    const pairs = [
      'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'ADA/USDT',
      'BTC/ETH', 'ETH/SOL', 'BTC/SOL', 'BNB/ETH', 'SOL/BNB',
      'USDT/BTC', 'USDT/ETH', 'USDT/SOL',
    ];
    const exchanges = ['Binance', 'Coinbase', 'Kraken', 'OKX'];

    for (const exchange of exchanges) {
      const exchangeData: MarketData[] = [];
      for (const pair of pairs) {
        const md = this.getMarketDataFromCache(pair, exchange);
        if (md) exchangeData.push(md);
      }
      this.marketData.set(exchange, exchangeData);
    }
  }

  /**
   * Start real-time market monitoring
   */
  private startMarketMonitoring(): void {
    // Update market data every 2 minutes
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateMarketData();
        
        // Scan for new opportunities
        const opportunities = await this.scanTriangularArbitrage();
        
        // Clean up expired opportunities
        this.cleanupExpiredOpportunities();
        
        logger.debug(`[ARBITRAGE] Market monitoring cycle completed - ${opportunities.length} opportunities found`);
      } catch (error) {
        logger.error('[ARBITRAGE] Market monitoring error', error as Error);
      }
    }, 120 * 1000); // 2 minutes (reduced from 30s to lower API/CPU load)
  }

  /**
   * Clean up expired opportunities
   */
  private cleanupExpiredOpportunities(): void {
    const now = new Date();
    
    for (const [id, opportunity] of this.opportunities.entries()) {
      if (new Date(opportunity.expiresAt) < now) {
        this.opportunities.delete(id);
      }
    }
  }

  /**
   * Send arbitrage alert
   */
  private sendArbitrageAlert(alert: ArbitrageAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        logger.error('[ARBITRAGE] Alert callback error', error as Error);
      }
    });
  }

  /**
   * Public API methods
   */

  /**
   * Get active arbitrage opportunities
   */
  getActiveOpportunities(): ArbitrageOpportunity[] {
    return Array.from(this.opportunities.values())
      .filter(opp => new Date(opp.expiresAt) > new Date())
      .sort((a, b) => b.expectedProfit - a.expectedProfit);
  }

  /**
   * Get opportunities by currency
   */
  getOpportunitiesByCurrency(currency: string): ArbitrageOpportunity[] {
    return this.getActiveOpportunities()
      .filter(opp => opp.baseCurrency === currency);
  }

  /**
   * Subscribe to arbitrage alerts
   */
  subscribeToAlerts(callback: (alert: ArbitrageAlert) => void): () => void {
    this.alertCallbacks.push(callback);
    
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Stop market monitoring and clean up intervals
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Execute arbitrage opportunity (simulation)
   */
  async executeArbitrage(opportunityId: string): Promise<{ success: boolean; message: string }> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) {
      return { success: false, message: 'Opportunity not found or expired' };
    }

    // Check if the opportunity has expired
    if (new Date(opportunity.expiresAt) < new Date()) {
      this.opportunities.delete(opportunityId);
      return { success: false, message: 'Opportunity has expired' };
    }

    logger.info(`[ARBITRAGE] Executing arbitrage opportunity ${opportunityId}`);
    this.executedCount++;

    // Re-fetch prices to verify the opportunity still exists
    await this.updateMarketData();
    if (!this.cachedPrices) {
      return { success: false, message: 'Execution failed: Unable to verify current prices' };
    }

    // Verify the opportunity is still profitable with fresh prices
    const verified = await this.calculateTriangularPath(
      opportunity.baseCurrency,
      opportunity.tradingPath[0]?.toCurrency || '',
      opportunity.tradingPath[1]?.toCurrency || '',
      opportunity.exchanges
    );

    if (!verified || verified.expectedProfit < this.MIN_PROFIT_THRESHOLD) {
      return { success: false, message: 'Execution failed: Market conditions changed, opportunity no longer profitable' };
    }

    this.successCount++;
    this.totalProfitTracked += verified.profitAmount;

    this.sendArbitrageAlert({
      id: `executed-${Date.now()}`,
      opportunity,
      type: 'EXECUTED',
      message: `Arbitrage executed successfully: ${verified.expectedProfit.toFixed(2)}% profit`,
      urgency: 'LOW',
      timestamp: new Date().toISOString(),
      actionRequired: false
    });

    return {
      success: true,
      message: `Arbitrage executed: ${verified.expectedProfit.toFixed(2)}% profit realized`
    };
  }

  /**
   * Get historical performance
   */
  getPerformanceMetrics(): {
    totalOpportunities: number;
    avgProfit: number;
    successRate: number;
    totalProfit: number;
  } {
    const activeOpps = this.getActiveOpportunities();
    const avgProfit = activeOpps.length > 0
      ? activeOpps.reduce((sum, opp) => sum + opp.expectedProfit, 0) / activeOpps.length
      : 0;

    return {
      totalOpportunities: this.executedCount,
      avgProfit,
      successRate: this.executedCount > 0 ? (this.successCount / this.executedCount) * 100 : 0,
      totalProfit: this.totalProfitTracked,
    };
  }
}

// Singleton instance
export const triangularArbitrage = new TriangularArbitrageEngine();