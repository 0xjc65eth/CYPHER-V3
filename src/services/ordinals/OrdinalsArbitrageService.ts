/**
 * Ordinals Arbitrage Service - CYPHER V3
 * Core service for scanning and analyzing arbitrage opportunities across Ordinals marketplaces
 *
 * Features:
 * - Multi-marketplace price scanning
 * - Comprehensive fee calculations (marketplace + network + platform)
 * - Real-time network fee estimation via mempool.space API
 * - Liquidity validation and scoring
 * - Risk assessment with stale price detection
 */

import {
  OrdinalsArbitrageOpportunity,
  OrdinalsMarketplace,
  FeeBreakdown,
  RiskScore,
  LiquidityValidation,
  NetworkFeeEstimate,
  ArbitrageFilters,
  ArbitrageStatistics,
  ArbitrageError,
  ArbitrageErrorType,
  MARKETPLACE_FEES,
  PLATFORM_FEE_PERCENTAGE,
  DEFAULT_CONFIG,
  MarketplacePriceData,
  CollectionArbitrageAnalysis
} from '../../types/ordinals-arbitrage';
import { OrdinalsDataAggregator, AggregatedCollectionData } from './DataAggregator';
import { EnhancedLogger } from '../../lib/enhanced-logger';
import { ErrorReporter } from '../../lib/ErrorReporter';

/**
 * Main Ordinals Arbitrage Service
 */
export class OrdinalsArbitrageService {
  private dataAggregator: OrdinalsDataAggregator;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private networkFeeCache: NetworkFeeEstimate | null = null;
  private networkFeeCacheTimestamp: number = 0;
  private readonly NETWORK_FEE_CACHE_TTL = 60000; // 60 seconds

  constructor(dataAggregator: OrdinalsDataAggregator) {
    this.dataAggregator = dataAggregator;
  }

  /**
   * Main method to scan for arbitrage opportunities
   *
   * @param filters - Filters to apply to opportunities
   * @returns Array of validated arbitrage opportunities
   */
  async scanOpportunities(
    filters: ArbitrageFilters = {}
  ): Promise<OrdinalsArbitrageOpportunity[]> {
    try {
      EnhancedLogger.info('Starting arbitrage scan', {
        component: 'OrdinalsArbitrageService',
        filters
      });

      // Apply default filters
      const appliedFilters: ArbitrageFilters = {
        minProfitPercentage: filters.minProfitPercentage ?? DEFAULT_CONFIG.MIN_PROFIT_PERCENTAGE,
        maxPriceAge: filters.maxPriceAge ?? DEFAULT_CONFIG.MAX_PRICE_AGE_SECONDS,
        minLiquidity: filters.minLiquidity ?? DEFAULT_CONFIG.MIN_LIQUIDITY_SCORE,
        minConfidence: filters.minConfidence ?? DEFAULT_CONFIG.MIN_CONFIDENCE_SCORE,
        limit: filters.limit ?? DEFAULT_CONFIG.DEFAULT_LIMIT,
        maxRisk: filters.maxRisk,
        collections: filters.collections,
        marketplaces: filters.marketplaces
      };

      // Get raw arbitrage opportunities from data aggregator
      const rawOpportunities = await this.dataAggregator.findArbitrageOpportunities(
        appliedFilters.collections,
        0 // Get all opportunities, we'll filter by profit later
      );

      EnhancedLogger.info(`Found ${rawOpportunities.length} raw opportunities`, {
        component: 'OrdinalsArbitrageService'
      });

      // Fetch network fee once for all opportunities
      const networkFee = await this.estimateNetworkFee();

      // Process each opportunity with full fee calculations
      const processedOpportunities: OrdinalsArbitrageOpportunity[] = [];

      for (const raw of rawOpportunities) {
        try {
          // Get collection data for liquidity validation
          const collectionData = await this.dataAggregator.getAggregatedCollection(raw.collectionId);

          if (!collectionData) {
            continue;
          }

          // Get marketplace price data
          const buyMarketplaceData = collectionData.marketplaceData[raw.buyMarketplace];
          const sellMarketplaceData = collectionData.marketplaceData[raw.sellMarketplace];

          if (!buyMarketplaceData?.available || !sellMarketplaceData?.available) {
            continue;
          }

          const buyPrice = buyMarketplaceData.floorPrice;
          const sellPrice = sellMarketplaceData.floorPrice;

          // Calculate fees
          const fees = this.calculateNetProfit(
            buyPrice,
            sellPrice,
            raw.buyMarketplace,
            raw.sellMarketplace,
            networkFee.estimatedFeeBTC
          );

          const netProfit = fees.netProfit;
          const netProfitPercentage = fees.netProfitPercentage;

          // Validate liquidity
          const liquidity = this.validateLiquidity(collectionData);

          // Assess risk
          const riskScore = this.assessRisk(
            buyPrice,
            sellPrice,
            liquidity,
            buyMarketplaceData.lastUpdated,
            sellMarketplaceData.lastUpdated
          );

          // Calculate price age
          const priceAge = Math.max(
            (Date.now() - buyMarketplaceData.lastUpdated) / 1000,
            (Date.now() - sellMarketplaceData.lastUpdated) / 1000
          );

          // Detect stale prices
          const warnings: string[] = [];
          if (priceAge > (appliedFilters.maxPriceAge || 60)) {
            warnings.push(`Stale price data (${Math.round(priceAge)}s old)`);
          }

          // Check if low liquidity
          if (!liquidity.isLiquid) {
            warnings.push('Low liquidity collection');
          }

          // Calculate confidence score
          const confidence = this.calculateConfidence(
            liquidity,
            riskScore,
            priceAge,
            collectionData
          );

          const opportunity: OrdinalsArbitrageOpportunity = {
            collectionId: raw.collectionId,
            collectionName: collectionData.collection.name,
            collectionSlug: (collectionData.collection as any).slug,
            imageUrl: (collectionData.collection as any).imageUrl,
            buyPrice,
            sellPrice,
            buyMarketplace: raw.buyMarketplace,
            sellMarketplace: raw.sellMarketplace,
            grossProfit: sellPrice - buyPrice,
            grossProfitPercentage: ((sellPrice - buyPrice) / buyPrice) * 100,
            fees: fees.fees,
            netProfit,
            netProfitPercentage,
            riskScore,
            confidence,
            liquidityScore: liquidity.liquidityScore,
            lastUpdated: Date.now(),
            priceAge,
            warnings: warnings.length > 0 ? warnings : undefined,
            estimatedExecutionTime: this.estimateExecutionTime(riskScore)
          };

          processedOpportunities.push(opportunity);
        } catch (error) {
          EnhancedLogger.warn('Error processing opportunity', {
            component: 'OrdinalsArbitrageService',
            collectionId: raw.collectionId,
            error
          });
        }
      }

      // Apply filters
      let filtered = this.applyFilters(processedOpportunities, appliedFilters);

      // Sort by net profit percentage (descending)
      filtered.sort((a, b) => b.netProfitPercentage - a.netProfitPercentage);

      // Apply limit
      if (appliedFilters.limit) {
        filtered = filtered.slice(0, appliedFilters.limit);
      }

      EnhancedLogger.info(`Scan complete: ${filtered.length} opportunities found`, {
        component: 'OrdinalsArbitrageService',
        total: filtered.length
      });

      return filtered;
    } catch (error) {
      ErrorReporter.report(error as Error, {
        component: 'OrdinalsArbitrageService',
        action: 'scanOpportunities',
        filters
      });

      throw new Error('Failed to scan arbitrage opportunities');
    }
  }

  /**
   * Calculate net profit after ALL fees
   *
   * Fee breakdown:
   * 1. Buy marketplace fee (1.5-2.5%)
   * 2. Sell marketplace fee (1.5-2.5%)
   * 3. Network fee (from mempool.space API)
   * 4. Platform fee (0.35% CYPHER fee)
   *
   * Net profit = (sellPrice - sellFee) - (buyPrice + buyFee + networkFee + platformFee)
   */
  calculateNetProfit(
    buyPrice: number,
    sellPrice: number,
    buyMarketplace: OrdinalsMarketplace,
    sellMarketplace: OrdinalsMarketplace,
    networkFee: number
  ): {
    netProfit: number;
    netProfitPercentage: number;
    fees: FeeBreakdown;
  } {
    try {
      // Get marketplace fee percentages
      const buyFeePercentage = MARKETPLACE_FEES[buyMarketplace];
      const sellFeePercentage = MARKETPLACE_FEES[sellMarketplace];

      // Calculate marketplace fees
      const buyMarketplaceFee = buyPrice * buyFeePercentage;
      const sellMarketplaceFee = sellPrice * sellFeePercentage;

      // Calculate platform fee (0.35% on total transaction value)
      const platformFee = (buyPrice + sellPrice) * PLATFORM_FEE_PERCENTAGE;

      // Total fees
      const totalFees = buyMarketplaceFee + sellMarketplaceFee + networkFee + platformFee;

      const fees: FeeBreakdown = {
        buyMarketplaceFee,
        sellMarketplaceFee,
        networkFee,
        platformFee,
        totalFees
      };

      // Calculate net profit
      // Net = (Sell - SellFee) - (Buy + BuyFee + NetworkFee + PlatformFee)
      const netProfit = (sellPrice - sellMarketplaceFee) - (buyPrice + buyMarketplaceFee + networkFee + platformFee);

      // Calculate net profit percentage (ROI)
      const totalCost = buyPrice + buyMarketplaceFee + networkFee + platformFee;
      const netProfitPercentage = (netProfit / totalCost) * 100;

      EnhancedLogger.info('Net profit calculated', {
        component: 'OrdinalsArbitrageService',
        buyPrice,
        sellPrice,
        netProfit,
        netProfitPercentage,
        fees
      });

      return {
        netProfit,
        netProfitPercentage,
        fees
      };
    } catch (error) {
      ErrorReporter.report(error as Error, {
        component: 'OrdinalsArbitrageService',
        action: 'calculateNetProfit',
        buyPrice,
        sellPrice
      });

      throw new Error('Failed to calculate net profit');
    }
  }

  /**
   * Validate collection liquidity and assign score
   *
   * Liquidity factors:
   * - Number of listed items
   * - 24h trading volume
   * - Collection verified status
   * - Total holders
   */
  validateLiquidity(collectionData: AggregatedCollectionData): LiquidityValidation {
    try {
      const { consolidatedMetrics, collection } = collectionData;

      const listedCount = consolidatedMetrics.totalListedCount;
      const dailyVolume = consolidatedMetrics.totalVolume24h;

      // Calculate liquidity score (0-100)
      let liquidityScore = 0;

      // Listed count factor (max 30 points)
      if (listedCount >= 100) {
        liquidityScore += 30;
      } else if (listedCount >= 50) {
        liquidityScore += 20;
      } else if (listedCount >= 20) {
        liquidityScore += 10;
      } else if (listedCount >= 10) {
        liquidityScore += 5;
      }

      // Volume factor (max 40 points)
      if (dailyVolume >= 10) {
        liquidityScore += 40;
      } else if (dailyVolume >= 5) {
        liquidityScore += 30;
      } else if (dailyVolume >= 1) {
        liquidityScore += 20;
      } else if (dailyVolume >= 0.5) {
        liquidityScore += 10;
      }

      // Verified collection bonus (20 points)
      if (collection.verified) {
        liquidityScore += 20;
      }

      // Holders factor (max 10 points)
      if (collection.holdersCount >= 1000) {
        liquidityScore += 10;
      } else if (collection.holdersCount >= 500) {
        liquidityScore += 5;
      }

      // Determine if liquid (score >= 30)
      const isLiquid = liquidityScore >= DEFAULT_CONFIG.MIN_LIQUIDITY_SCORE;

      const validation: LiquidityValidation = {
        isLiquid,
        listedCount,
        dailyVolume,
        liquidityScore: Math.min(100, liquidityScore),
        lastUpdated: Date.now()
      };

      return validation;
    } catch (error) {
      ErrorReporter.report(error as Error, {
        component: 'OrdinalsArbitrageService',
        action: 'validateLiquidity'
      });

      // Return default low liquidity
      return {
        isLiquid: false,
        listedCount: 0,
        dailyVolume: 0,
        liquidityScore: 0,
        lastUpdated: Date.now()
      };
    }
  }

  /**
   * Estimate Bitcoin network fee using mempool.space API
   *
   * @returns Network fee estimate with recommended fee rate
   */
  async estimateNetworkFee(): Promise<NetworkFeeEstimate> {
    try {
      // Check cache first
      if (
        this.networkFeeCache &&
        Date.now() - this.networkFeeCacheTimestamp < this.NETWORK_FEE_CACHE_TTL
      ) {
        return this.networkFeeCache;
      }

      // Fetch from mempool.space API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_CONFIG.REQUEST_TIMEOUT_MS);

      const response = await fetch('https://mempool.space/api/v1/fees/recommended', {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Mempool API error: ${response.status}`);
      }

      const feeData = await response.json();

      // Use half-hour fee as recommended (good balance of speed and cost)
      const recommendedFeeRate = feeData.halfHourFee || feeData.hourFee || 10;

      // Estimate transaction size (typical ordinals transfer is ~250 bytes)
      const estimatedBytes = DEFAULT_CONFIG.ESTIMATED_TX_BYTES;

      // Calculate fee in satoshis
      const feeInSatoshis = recommendedFeeRate * estimatedBytes;

      // Convert to BTC (1 BTC = 100,000,000 satoshis)
      const estimatedFeeBTC = feeInSatoshis / 100000000;

      const estimate: NetworkFeeEstimate = {
        fastestFee: feeData.fastestFee || recommendedFeeRate,
        halfHourFee: feeData.halfHourFee || recommendedFeeRate,
        hourFee: feeData.hourFee || recommendedFeeRate,
        economyFee: feeData.economyFee || recommendedFeeRate,
        minimumFee: feeData.minimumFee || 1,
        estimatedBytes,
        estimatedFeeBTC,
        timestamp: Date.now()
      };

      // Cache the result
      this.networkFeeCache = estimate;
      this.networkFeeCacheTimestamp = Date.now();

      EnhancedLogger.info('Network fee estimated', {
        component: 'OrdinalsArbitrageService',
        recommendedFeeRate,
        estimatedFeeBTC,
        estimatedBytes
      });

      return estimate;
    } catch (error) {
      // Handle API failure gracefully with fallback
      EnhancedLogger.warn('Failed to fetch network fee, using fallback', {
        component: 'OrdinalsArbitrageService',
        error
      });

      // Fallback to conservative estimate (20 sats/vB)
      const fallbackFeeRate = 20;
      const estimatedBytes = DEFAULT_CONFIG.ESTIMATED_TX_BYTES;
      const feeInSatoshis = fallbackFeeRate * estimatedBytes;
      const estimatedFeeBTC = feeInSatoshis / 100000000;

      const fallbackEstimate: NetworkFeeEstimate = {
        fastestFee: 30,
        halfHourFee: fallbackFeeRate,
        hourFee: 15,
        economyFee: 10,
        minimumFee: 1,
        estimatedBytes,
        estimatedFeeBTC,
        timestamp: Date.now()
      };

      return fallbackEstimate;
    }
  }

  /**
   * Assess risk score based on liquidity and price spread
   *
   * Risk factors:
   * - Liquidity score
   * - Price spread percentage
   * - Price data freshness
   * - Collection verification
   */
  assessRisk(
    buyPrice: number,
    sellPrice: number,
    liquidity: LiquidityValidation,
    buyPriceTimestamp: number,
    sellPriceTimestamp: number
  ): RiskScore {
    try {
      let riskPoints = 0;

      // Liquidity risk
      if (liquidity.liquidityScore < 30) {
        riskPoints += 3; // High risk
      } else if (liquidity.liquidityScore < 50) {
        riskPoints += 2; // Medium risk
      } else if (liquidity.liquidityScore < 70) {
        riskPoints += 1; // Low risk
      }

      // Price spread risk (very high spreads can indicate illiquidity or stale data)
      const priceSpread = ((sellPrice - buyPrice) / buyPrice) * 100;
      if (priceSpread > 30) {
        riskPoints += 2; // Suspiciously high spread
      } else if (priceSpread > 20) {
        riskPoints += 1;
      }

      // Price freshness risk (stale prices are risky)
      const maxAge = Math.max(
        (Date.now() - buyPriceTimestamp) / 1000,
        (Date.now() - sellPriceTimestamp) / 1000
      );

      if (maxAge > 120) {
        riskPoints += 3; // Very stale (>2 minutes)
      } else if (maxAge > 60) {
        riskPoints += 2; // Stale (>1 minute)
      } else if (maxAge > 30) {
        riskPoints += 1; // Somewhat fresh
      }

      // Low volume risk
      if (liquidity.dailyVolume < 0.5) {
        riskPoints += 2;
      } else if (liquidity.dailyVolume < 1) {
        riskPoints += 1;
      }

      // Determine risk score
      if (riskPoints >= 6) {
        return 'high';
      } else if (riskPoints >= 3) {
        return 'medium';
      } else {
        return 'low';
      }
    } catch (error) {
      ErrorReporter.report(error as Error, {
        component: 'OrdinalsArbitrageService',
        action: 'assessRisk'
      });

      // Default to high risk on error
      return 'high';
    }
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidence(
    liquidity: LiquidityValidation,
    riskScore: RiskScore,
    priceAge: number,
    collectionData: AggregatedCollectionData
  ): number {
    let confidence = 50; // Base confidence

    // Liquidity factor
    confidence += (liquidity.liquidityScore - 50) * 0.4;

    // Risk factor
    if (riskScore === 'low') {
      confidence += 20;
    } else if (riskScore === 'medium') {
      confidence += 5;
    } else {
      confidence -= 15;
    }

    // Price freshness
    if (priceAge < 30) {
      confidence += 15;
    } else if (priceAge < 60) {
      confidence += 5;
    } else {
      confidence -= 10;
    }

    // Collection verification
    if (collectionData.collection.verified) {
      confidence += 10;
    }

    // Volume factor
    if (liquidity.dailyVolume > 5) {
      confidence += 10;
    } else if (liquidity.dailyVolume > 1) {
      confidence += 5;
    }

    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  /**
   * Estimate execution time in seconds based on risk
   */
  private estimateExecutionTime(riskScore: RiskScore): number {
    switch (riskScore) {
      case 'low':
        return 300; // 5 minutes
      case 'medium':
        return 600; // 10 minutes
      case 'high':
        return 1800; // 30 minutes
      default:
        return 600;
    }
  }

  /**
   * Apply filters to opportunities
   */
  private applyFilters(
    opportunities: OrdinalsArbitrageOpportunity[],
    filters: ArbitrageFilters
  ): OrdinalsArbitrageOpportunity[] {
    return opportunities.filter(opp => {
      // Min profit percentage
      if (filters.minProfitPercentage !== undefined && opp.netProfitPercentage < filters.minProfitPercentage) {
        return false;
      }

      // Max risk
      if (filters.maxRisk !== undefined) {
        const riskLevels: Record<RiskScore, number> = { low: 1, medium: 2, high: 3 };
        if (riskLevels[opp.riskScore] > riskLevels[filters.maxRisk]) {
          return false;
        }
      }

      // Min liquidity
      if (filters.minLiquidity !== undefined && opp.liquidityScore < filters.minLiquidity) {
        return false;
      }

      // Min confidence
      if (filters.minConfidence !== undefined && opp.confidence < filters.minConfidence) {
        return false;
      }

      // Max price age
      if (filters.maxPriceAge !== undefined && opp.priceAge > filters.maxPriceAge) {
        return false;
      }

      // Marketplace filter
      if (filters.marketplaces !== undefined && filters.marketplaces.length > 0) {
        if (!filters.marketplaces.includes(opp.buyMarketplace) &&
            !filters.marketplaces.includes(opp.sellMarketplace)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Calculate statistics for opportunities
   */
  calculateStatistics(opportunities: OrdinalsArbitrageOpportunity[]): ArbitrageStatistics {
    if (opportunities.length === 0) {
      return {
        totalOpportunities: 0,
        avgNetProfit: 0,
        avgGrossProfit: 0,
        highValueCount: 0,
        avgLiquidityScore: 0,
        avgConfidence: 0,
        marketplaceDistribution: {
          gamma: 0,
          unisat: 0,
          okx: 0,
          hiro: 0,
          bestinslot: 0
        },
        riskDistribution: {
          low: 0,
          medium: 0,
          high: 0
        }
      };
    }

    const avgNetProfit = opportunities.reduce((sum, opp) => sum + opp.netProfitPercentage, 0) / opportunities.length;
    const avgGrossProfit = opportunities.reduce((sum, opp) => sum + opp.grossProfitPercentage, 0) / opportunities.length;
    const highValueCount = opportunities.filter(opp => opp.netProfitPercentage > 15).length;
    const avgLiquidityScore = opportunities.reduce((sum, opp) => sum + opp.liquidityScore, 0) / opportunities.length;
    const avgConfidence = opportunities.reduce((sum, opp) => sum + opp.confidence, 0) / opportunities.length;

    const marketplaceDistribution: Record<OrdinalsMarketplace, number> = {
      gamma: 0,
      unisat: 0,
      okx: 0,
      hiro: 0,
      bestinslot: 0
    };

    const riskDistribution: Record<RiskScore, number> = {
      low: 0,
      medium: 0,
      high: 0
    };

    opportunities.forEach(opp => {
      marketplaceDistribution[opp.buyMarketplace]++;
      marketplaceDistribution[opp.sellMarketplace]++;
      riskDistribution[opp.riskScore]++;
    });

    return {
      totalOpportunities: opportunities.length,
      avgNetProfit,
      avgGrossProfit,
      highValueCount,
      avgLiquidityScore,
      avgConfidence,
      marketplaceDistribution,
      riskDistribution
    };
  }

  /**
   * Get cached data if available and not expired
   */
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set data in cache with TTL
   */
  private setCache(key: string, data: any, ttl: number = DEFAULT_CONFIG.CACHE_TTL_SECONDS * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
}

// Export singleton instance
export const ordinalsArbitrageService = new OrdinalsArbitrageService(
  new OrdinalsDataAggregator()
);
