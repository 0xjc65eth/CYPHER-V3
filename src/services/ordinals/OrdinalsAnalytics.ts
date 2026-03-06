/**
 * Advanced Ordinals Analytics Engine
 * Comprehensive analysis system for Bitcoin Ordinals marketplace data
 */

import {
  OrdinalsMarketplace,
  OrdinalsMarketplaceFactory,
  OrdinalsDataConverter,
  StandardizedCollection,
  StandardizedInscription,
  StandardizedActivity,
  StandardizedMarketStats
} from './integrations';

export interface RarityScore {
  rank: number;
  score: number;
  percentile: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  traits: Array<{
    traitType: string;
    value: string;
    frequency: number;
    rarity: number;
    contribution: number; // How much this trait contributes to overall rarity
  }>;
}

export interface MarketDepthData {
  bids: Array<{
    price: number;
    quantity: number;
    totalValue: number;
    cumulativeQuantity: number;
  }>;
  asks: Array<{
    price: number;
    quantity: number;
    totalValue: number;
    cumulativeQuantity: number;
  }>;
  spread: number;
  spreadPercentage: number;
  midPrice: number;
  liquidityScore: number;
  depthScore: number;
}

export interface CollectionAnalysis {
  collection: StandardizedCollection;
  priceAnalysis: {
    floorPrice: number;
    avgPrice: number;
    medianPrice: number;
    maxPrice: number;
    priceStandardDeviation: number;
    priceVolatility: number;
    supportLevels: number[];
    resistanceLevels: number[];
  };
  volumeAnalysis: {
    volume24h: number;
    volume7d: number;
    volume30d: number;
    volumeChange24h: number;
    volumeChange7d: number;
    volumeTrend: 'increasing' | 'decreasing' | 'stable';
    velocityScore: number; // How fast items are selling
  };
  holderAnalysis: {
    totalHolders: number;
    holderDistribution: {
      whales: number; // Holders with 100+ items
      large: number; // Holders with 10-99 items
      medium: number; // Holders with 5-9 items
      small: number; // Holders with 1-4 items
    };
    holderConcentration: number; // Gini coefficient
    uniqueHoldersPercentage: number;
    topHolderPercentage: number; // Percentage held by top 10 holders
  };
  liquidityAnalysis: {
    listedPercentage: number;
    turnoverRate: number; // Sales / Listed items
    liquidityScore: number;
    marketDepth: MarketDepthData;
    bidAskSpread: number;
  };
  trendAnalysis: {
    momentum: number; // Price momentum indicator
    sentiment: 'bullish' | 'bearish' | 'neutral';
    technicalScore: number; // Overall technical analysis score
    socialScore: number; // Based on social metrics
    fundamentalScore: number; // Based on utility, rarity, etc.
  };
  rarityAnalysis: {
    rarityDistribution: Record<string, number>;
    traitFrequencies: Record<string, Record<string, number>>;
    rarityFloor: Record<string, number>; // Floor price by rarity tier
    rarityPremium: Record<string, number>; // Premium over base floor by rarity
  };
  riskMetrics: {
    volatilityScore: number;
    liquidityRisk: number;
    concentrationRisk: number;
    marketRisk: number;
    overallRisk: 'low' | 'medium' | 'high';
  };
  opportunityScore: number; // Overall investment opportunity score (0-100)
  lastUpdated: number;
}

export interface TradingOpportunity {
  type: 'arbitrage' | 'undervalued' | 'momentum' | 'breakout' | 'mean_reversion';
  inscriptionId: string;
  inscriptionNumber: number;
  collectionId: string;
  currentPrice: number;
  targetPrice: number;
  expectedReturn: number;
  confidence: number; // 0-100
  timeframe: 'short' | 'medium' | 'long';
  reasoning: string[];
  riskLevel: 'low' | 'medium' | 'high';
  marketplace: OrdinalsMarketplace;
  discoveredAt: number;
  expiresAt?: number;
}

export interface PortfolioAnalytics {
  totalValue: number;
  totalCost: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalPnL: number;
  pnlPercentage: number;
  diversificationScore: number;
  riskScore: number;
  performanceMetrics: {
    sharpeRatio: number;
    maxDrawdown: number;
    volatility: number;
    beta: number; // Correlation with overall market
  };
  holdings: Array<{
    inscriptionId: string;
    collectionId: string;
    quantity: number;
    avgCost: number;
    currentValue: number;
    unrealizedPnL: number;
    pnlPercentage: number;
    allocation: number; // Percentage of portfolio
  }>;
  recommendations: Array<{
    action: 'buy' | 'sell' | 'hold';
    inscriptionId?: string;
    collectionId?: string;
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export class OrdinalsAnalytics {
  private clients: Record<OrdinalsMarketplace, any> | null = null;
  private config?: { uniSatApiKey?: string };
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private readonly DEFAULT_TTL = 300000; // 5 minutes
  private analysisResults: Map<string, CollectionAnalysis> = new Map();

  constructor(config?: { uniSatApiKey?: string }) {
    this.config = config;
  }

  private initializeClients() {
    if (!this.clients) {
      try {
        this.clients = OrdinalsMarketplaceFactory.getAllClients(this.config);
      } catch (error) {
        this.clients = {} as Record<OrdinalsMarketplace, any>;
      }
    }
    return this.clients;
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  /**
   * Comprehensive collection analysis
   */
  async analyzeCollection(collectionId: string, marketplace?: OrdinalsMarketplace): Promise<CollectionAnalysis> {
    const cacheKey = `collection-analysis-${collectionId}-${marketplace || 'all'}`;
    const cached = this.getCached<CollectionAnalysis>(cacheKey);
    if (cached) return cached;

    try {
      // Gather data from all marketplaces or specific one
      const marketplaces = marketplace ? [marketplace] : Object.values(OrdinalsMarketplace);
      const collectionData: StandardizedCollection[] = [];
      const inscriptionsData: StandardizedInscription[] = [];
      const activitiesData: StandardizedActivity[] = [];

      for (const mp of marketplaces) {
        try {
          const clients = this.initializeClients();
          const client = clients[mp];
          
          // Get collection info
          const collection = await this.getCollectionFromMarketplace(collectionId, mp, client);
          if (collection) {
            collectionData.push(OrdinalsDataConverter.convertCollection(collection, mp));
          }

          // Get inscriptions
          const inscriptions = await this.getInscriptionsFromMarketplace(collectionId, mp, client);
          inscriptionsData.push(...inscriptions.map((i: any) => this.convertInscription(i, mp)));

          // Get activities
          const activities = await this.getActivitiesFromMarketplace(collectionId, mp, client);
          activitiesData.push(...activities.map((a: any) => this.convertActivity(a, mp)));
        } catch (error) {
        }
      }

      if (collectionData.length === 0) {
        throw new Error(`No collection data found for ${collectionId}`);
      }

      // Use the most complete collection data
      const primaryCollection = collectionData.reduce((best, current) => 
        current.totalSupply > best.totalSupply ? current : best
      );

      const analysis = await this.performCollectionAnalysis(
        primaryCollection,
        inscriptionsData,
        activitiesData
      );

      this.setCache(cacheKey, analysis, 600000); // 10 minute cache for analysis
      this.analysisResults.set(collectionId, analysis);
      
      return analysis;
    } catch (error) {
      console.error(`Collection analysis failed for ${collectionId}:`, error);
      throw error;
    }
  }

  /**
   * Advanced rarity calculation using multiple algorithms
   */
  async calculateRarity(
    inscriptionId: string,
    collectionId: string,
    marketplace?: OrdinalsMarketplace
  ): Promise<RarityScore> {
    const cacheKey = `rarity-${inscriptionId}-${collectionId}`;
    const cached = this.getCached<RarityScore>(cacheKey);
    if (cached) return cached;

    try {
      // Get collection analysis for trait frequencies
      const analysis = await this.analyzeCollection(collectionId, marketplace);
      
      // Get specific inscription data
      const inscription = await this.getInscriptionDetails(inscriptionId, marketplace);
      if (!inscription || !inscription.rarity?.traits) {
        throw new Error('Inscription rarity data not available');
      }

      // Calculate rarity using multiple methods
      const traitRarity = this.calculateTraitRarity(
        inscription.rarity.traits,
        analysis.rarityAnalysis.traitFrequencies,
        analysis.collection.totalSupply
      );

      const statisticalRarity = this.calculateStatisticalRarity(
        inscription.rarity.traits,
        analysis.rarityAnalysis.traitFrequencies
      );

      const harmonicMeanRarity = this.calculateHarmonicMeanRarity(
        inscription.rarity.traits,
        analysis.rarityAnalysis.traitFrequencies
      );

      // Combine methods for final score
      const finalScore = (traitRarity * 0.4) + (statisticalRarity * 0.35) + (harmonicMeanRarity * 0.25);

      const rarityScore: RarityScore = {
        rank: inscription.rarity.rank || 0,
        score: finalScore,
        percentile: (1 - finalScore) * 100,
        rarity: this.categorizeRarity(finalScore),
        traits: inscription.rarity.traits.map(trait => ({
          traitType: trait.traitType,
          value: trait.value,
          frequency: analysis.rarityAnalysis.traitFrequencies[trait.traitType]?.[trait.value] || 0,
          rarity: trait.rarity,
          contribution: this.calculateTraitContribution(
            trait,
            analysis.rarityAnalysis.traitFrequencies,
            analysis.collection.totalSupply
          )
        }))
      };

      this.setCache(cacheKey, rarityScore, 3600000); // 1 hour cache
      return rarityScore;
    } catch (error) {
      console.error(`Rarity calculation failed for ${inscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Market depth analysis for liquidity assessment
   */
  async analyzeMarketDepth(collectionId: string): Promise<MarketDepthData> {
    const cacheKey = `market-depth-${collectionId}`;
    const cached = this.getCached<MarketDepthData>(cacheKey);
    if (cached) return cached;

    try {
      // Gather listings from all marketplaces
      const allListings: Array<{
        price: number;
        quantity: number;
        marketplace: OrdinalsMarketplace;
      }> = [];

      for (const [mp, client] of Object.entries(this.initializeClients())) {
        try {
          const listings = await this.getListingsFromMarketplace(collectionId, mp as OrdinalsMarketplace, client);
          allListings.push(...listings.map((l: any) => ({
            price: l.price,
            quantity: 1, // Each listing is typically for 1 NFT
            marketplace: mp as OrdinalsMarketplace
          })));
        } catch (error) {
        }
      }

      // Sort listings by price for orderbook
      allListings.sort((a, b) => a.price - b.price);

      // Build asks (sell orders)
      const asks = this.buildOrderBookSide(allListings, 'asks');
      
      // For NFTs, bids are harder to get - we'll estimate based on recent sales
      const recentSales = await this.getRecentSales(collectionId);
      const bids = this.estimateBids(recentSales, asks);

      const spread = asks.length > 0 && bids.length > 0 ? asks[0].price - bids[0].price : 0;
      const midPrice = asks.length > 0 && bids.length > 0 ? (asks[0].price + bids[0].price) / 2 : asks[0]?.price || 0;
      const spreadPercentage = midPrice > 0 ? (spread / midPrice) * 100 : 0;

      const marketDepth: MarketDepthData = {
        bids,
        asks,
        spread,
        spreadPercentage,
        midPrice,
        liquidityScore: this.calculateLiquidityScore(bids, asks),
        depthScore: this.calculateDepthScore(bids, asks)
      };

      this.setCache(cacheKey, marketDepth, 60000); // 1 minute cache
      return marketDepth;
    } catch (error) {
      console.error(`Market depth analysis failed for ${collectionId}:`, error);
      throw error;
    }
  }

  /**
   * Identify trading opportunities using various strategies
   */
  async findTradingOpportunities(
    collectionIds?: string[],
    strategies: Array<'arbitrage' | 'undervalued' | 'momentum' | 'breakout' | 'mean_reversion'> = ['arbitrage', 'undervalued']
  ): Promise<TradingOpportunity[]> {
    const cacheKey = `trading-opportunities-${collectionIds?.join(',') || 'all'}-${strategies.join(',')}`;
    const cached = this.getCached<TradingOpportunity[]>(cacheKey);
    if (cached) return cached;

    try {
      const opportunities: TradingOpportunity[] = [];
      const collections = collectionIds || await this.getTopCollections(50);

      for (const collectionId of collections) {
        try {
          const analysis = await this.analyzeCollection(collectionId);
          
          if (strategies.includes('arbitrage')) {
            const arbitrageOps = await this.findArbitrageOpportunities(collectionId, analysis);
            opportunities.push(...arbitrageOps);
          }

          if (strategies.includes('undervalued')) {
            const undervaluedOps = await this.findUndervaluedOpportunities(collectionId, analysis);
            opportunities.push(...undervaluedOps);
          }

          if (strategies.includes('momentum')) {
            const momentumOps = await this.findMomentumOpportunities(collectionId, analysis);
            opportunities.push(...momentumOps);
          }

          if (strategies.includes('breakout')) {
            const breakoutOps = await this.findBreakoutOpportunities(collectionId, analysis);
            opportunities.push(...breakoutOps);
          }

          if (strategies.includes('mean_reversion')) {
            const meanReversionOps = await this.findMeanReversionOpportunities(collectionId, analysis);
            opportunities.push(...meanReversionOps);
          }
        } catch (error) {
        }
      }

      // Sort by expected return and confidence
      opportunities.sort((a, b) => 
        (b.expectedReturn * b.confidence) - (a.expectedReturn * a.confidence)
      );

      this.setCache(cacheKey, opportunities, 180000); // 3 minute cache
      return opportunities;
    } catch (error) {
      console.error('Trading opportunities analysis failed:', error);
      return [];
    }
  }

  /**
   * Portfolio analytics and performance tracking
   */
  async analyzePortfolio(
    address: string,
    transactions?: Array<{
      inscriptionId: string;
      type: 'buy' | 'sell';
      price: number;
      timestamp: number;
    }>
  ): Promise<PortfolioAnalytics> {
    const cacheKey = `portfolio-analytics-${address}`;
    const cached = this.getCached<PortfolioAnalytics>(cacheKey);
    if (cached) return cached;

    try {
      // Get current holdings
      const holdings = await this.getPortfolioHoldings(address);
      
      // Calculate portfolio metrics
      const analytics = await this.calculatePortfolioMetrics(holdings, transactions);

      this.setCache(cacheKey, analytics, 120000); // 2 minute cache
      return analytics;
    } catch (error) {
      console.error(`Portfolio analysis failed for ${address}:`, error);
      throw error;
    }
  }

  // Private helper methods
  private async performCollectionAnalysis(
    collection: StandardizedCollection,
    inscriptions: StandardizedInscription[],
    activities: StandardizedActivity[]
  ): Promise<CollectionAnalysis> {
    // Implement comprehensive analysis logic
    const priceData = inscriptions
      .filter(i => i.listing?.price)
      .map(i => i.listing!.price)
      .sort((a, b) => a - b);

    const salesData = activities
      .filter(a => a.type === 'sale' && a.price)
      .map(a => ({ price: a.price!, timestamp: a.timestamp }));

    const analysis: CollectionAnalysis = {
      collection,
      priceAnalysis: this.analyzePrices(priceData, salesData),
      volumeAnalysis: this.analyzeVolume(activities),
      holderAnalysis: this.analyzeHolders(inscriptions),
      liquidityAnalysis: await this.analyzeLiquidity(collection.id, inscriptions),
      trendAnalysis: this.analyzeTrends(salesData, activities),
      rarityAnalysis: this.analyzeRarity(inscriptions),
      riskMetrics: this.calculateRiskMetrics(collection, salesData),
      opportunityScore: 0, // Will be calculated based on all factors
      lastUpdated: Date.now()
    };

    // Calculate overall opportunity score
    analysis.opportunityScore = this.calculateOpportunityScore(analysis);

    return analysis;
  }

  private analyzePrices(prices: number[], sales: Array<{ price: number; timestamp: number }>) {
    if (prices.length === 0) {
      return {
        floorPrice: 0,
        avgPrice: 0,
        medianPrice: 0,
        maxPrice: 0,
        priceStandardDeviation: 0,
        priceVolatility: 0,
        supportLevels: [],
        resistanceLevels: []
      };
    }

    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const median = prices[Math.floor(prices.length / 2)];
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    // Calculate volatility from recent sales
    const recentSales = sales.filter(s => Date.now() - s.timestamp < 7 * 24 * 60 * 60 * 1000); // Last 7 days
    const volatility = this.calculateVolatility(recentSales.map(s => s.price));

    return {
      floorPrice: min,
      avgPrice: avg,
      medianPrice: median,
      maxPrice: max,
      priceStandardDeviation: stdDev,
      priceVolatility: volatility,
      supportLevels: this.findSupportLevels(sales),
      resistanceLevels: this.findResistanceLevels(sales)
    };
  }

  private analyzeVolume(activities: StandardizedActivity[]) {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const week = 7 * day;
    const month = 30 * day;

    const sales24h = activities.filter(a => a.type === 'sale' && a.price && now - a.timestamp < day);
    const sales7d = activities.filter(a => a.type === 'sale' && a.price && now - a.timestamp < week);
    const sales30d = activities.filter(a => a.type === 'sale' && a.price && now - a.timestamp < month);

    const volume24h = sales24h.reduce((sum, s) => sum + (s.price || 0), 0);
    const volume7d = sales7d.reduce((sum, s) => sum + (s.price || 0), 0);
    const volume30d = sales30d.reduce((sum, s) => sum + (s.price || 0), 0);

    // Calculate volume changes
    const prevVolume24h = activities
      .filter(a => a.type === 'sale' && a.price && now - a.timestamp >= day && now - a.timestamp < 2 * day)
      .reduce((sum, s) => sum + (s.price || 0), 0);

    const prevVolume7d = activities
      .filter(a => a.type === 'sale' && a.price && now - a.timestamp >= week && now - a.timestamp < 2 * week)
      .reduce((sum, s) => sum + (s.price || 0), 0);

    const volumeChange24h = prevVolume24h > 0 ? ((volume24h - prevVolume24h) / prevVolume24h) * 100 : 0;
    const volumeChange7d = prevVolume7d > 0 ? ((volume7d - prevVolume7d) / prevVolume7d) * 100 : 0;

    return {
      volume24h,
      volume7d,
      volume30d,
      volumeChange24h,
      volumeChange7d,
      volumeTrend: volumeChange7d > 5 ? 'increasing' as const : volumeChange7d < -5 ? 'decreasing' as const : 'stable' as const,
      velocityScore: this.calculateVelocityScore(sales24h.length, volume24h)
    };
  }

  private analyzeHolders(inscriptions: StandardizedInscription[]) {
    const holderCounts = new Map<string, number>();
    
    inscriptions.forEach(inscription => {
      const owner = inscription.owner;
      holderCounts.set(owner, (holderCounts.get(owner) || 0) + 1);
    });

    const holders = Array.from(holderCounts.values());
    const totalHolders = holders.length;
    
    const distribution = {
      whales: holders.filter(count => count >= 100).length,
      large: holders.filter(count => count >= 10 && count < 100).length,
      medium: holders.filter(count => count >= 5 && count < 10).length,
      small: holders.filter(count => count < 5).length
    };

    const uniqueHolders = new Set(inscriptions.map(i => i.owner)).size;
    const uniqueHoldersPercentage = inscriptions.length > 0 ? (uniqueHolders / inscriptions.length) * 100 : 0;

    // Calculate concentration (simplified Gini coefficient)
    const sortedHolders = holders.sort((a, b) => a - b);
    const concentration = this.calculateGiniCoefficient(sortedHolders);

    // Top 10 holders percentage
    const topHolders = holders.sort((a, b) => b - a).slice(0, 10);
    const topHolderItems = topHolders.reduce((sum, count) => sum + count, 0);
    const topHolderPercentage = inscriptions.length > 0 ? (topHolderItems / inscriptions.length) * 100 : 0;

    return {
      totalHolders,
      holderDistribution: distribution,
      holderConcentration: concentration,
      uniqueHoldersPercentage,
      topHolderPercentage
    };
  }

  private async analyzeLiquidity(collectionId: string, inscriptions: StandardizedInscription[]) {
    const listed = inscriptions.filter(i => i.listing).length;
    const total = inscriptions.length;
    const listedPercentage = total > 0 ? (listed / total) * 100 : 0;

    const marketDepth = await this.analyzeMarketDepth(collectionId);
    
    return {
      listedPercentage,
      turnoverRate: this.calculateTurnoverRate(inscriptions),
      liquidityScore: marketDepth.liquidityScore,
      marketDepth,
      bidAskSpread: marketDepth.spreadPercentage
    };
  }

  private analyzeTrends(sales: Array<{ price: number; timestamp: number }>, activities: StandardizedActivity[]) {
    const momentum = this.calculateMomentum(sales);
    const sentiment = this.determineSentiment(momentum, activities);
    
    return {
      momentum,
      sentiment,
      technicalScore: this.calculateTechnicalScore(sales),
      socialScore: this.calculateSocialScore(activities),
      fundamentalScore: this.calculateFundamentalScore(activities)
    };
  }

  private analyzeRarity(inscriptions: StandardizedInscription[]) {
    const rarityDistribution: Record<string, number> = {};
    const traitFrequencies: Record<string, Record<string, number>> = {};

    inscriptions.forEach(inscription => {
      if (inscription.rarity) {
        const rarity = inscription.rarity.rarity;
        rarityDistribution[rarity] = (rarityDistribution[rarity] || 0) + 1;

        if (inscription.rarity.traits) {
          inscription.rarity.traits.forEach(trait => {
            if (!traitFrequencies[trait.traitType]) {
              traitFrequencies[trait.traitType] = {};
            }
            traitFrequencies[trait.traitType][trait.value] = 
              (traitFrequencies[trait.traitType][trait.value] || 0) + 1;
          });
        }
      }
    });

    // Calculate rarity floors and premiums
    const rarityFloor: Record<string, number> = {};
    const rarityPremium: Record<string, number> = {};

    Object.keys(rarityDistribution).forEach(rarity => {
      const rarityItems = inscriptions.filter(i => i.rarity?.rarity === rarity && i.listing?.price);
      if (rarityItems.length > 0) {
        const prices = rarityItems.map(i => i.listing!.price).sort((a, b) => a - b);
        rarityFloor[rarity] = prices[0];
      }
    });

    const baseFloor = Math.min(...Object.values(rarityFloor));
    Object.keys(rarityFloor).forEach(rarity => {
      rarityPremium[rarity] = baseFloor > 0 ? ((rarityFloor[rarity] - baseFloor) / baseFloor) * 100 : 0;
    });

    return {
      rarityDistribution,
      traitFrequencies,
      rarityFloor,
      rarityPremium
    };
  }

  private calculateRiskMetrics(collection: StandardizedCollection, sales: Array<{ price: number; timestamp: number }>) {
    const volatilityScore = this.calculateVolatility(sales.map(s => s.price));
    const liquidityRisk = collection.listedPercentage < 5 ? 80 : collection.listedPercentage < 10 ? 60 : 40;
    const concentrationRisk = collection.holdersCount < 100 ? 80 : collection.holdersCount < 500 ? 60 : 40;
    const marketRisk = this.calculateMarketRisk(sales);

    const overallRisk = (volatilityScore + liquidityRisk + concentrationRisk + marketRisk) / 4;

    return {
      volatilityScore,
      liquidityRisk,
      concentrationRisk,
      marketRisk,
      overallRisk: overallRisk > 70 ? 'high' as const : overallRisk > 40 ? 'medium' as const : 'low' as const
    };
  }

  private calculateOpportunityScore(analysis: CollectionAnalysis): number {
    // Weighted scoring system (0-100)
    const weights = {
      volume: 0.25,
      liquidity: 0.20,
      trend: 0.20,
      risk: 0.15,
      holder: 0.10,
      rarity: 0.10
    };

    const volumeScore = Math.min(analysis.volumeAnalysis.volume24h * 10, 100); // Higher volume = higher score
    const liquidityScore = analysis.liquidityAnalysis.liquidityScore;
    const trendScore = (analysis.trendAnalysis.technicalScore + analysis.trendAnalysis.socialScore) / 2;
    const riskScore = 100 - ((analysis.riskMetrics.volatilityScore + analysis.riskMetrics.liquidityRisk + analysis.riskMetrics.concentrationRisk + analysis.riskMetrics.marketRisk) / 4);
    const holderScore = Math.min(analysis.holderAnalysis.totalHolders / 10, 100); // More holders = higher score
    const rarityScore = Object.keys(analysis.rarityAnalysis.rarityDistribution).length * 10; // More rarity tiers = higher score

    return (
      volumeScore * weights.volume +
      liquidityScore * weights.liquidity +
      trendScore * weights.trend +
      riskScore * weights.risk +
      holderScore * weights.holder +
      rarityScore * weights.rarity
    );
  }

  // Helper methods for calculations
  private calculateTraitRarity(
    traits: Array<{ traitType: string; value: string; rarity: number }>,
    traitFreqs: Record<string, Record<string, number>>,
    totalSupply: number
  ): number {
    let rarityProduct = 1;
    
    traits.forEach(trait => {
      const frequency = traitFreqs[trait.traitType]?.[trait.value] || 1;
      const rarity = frequency / totalSupply;
      rarityProduct *= rarity;
    });

    return 1 / rarityProduct;
  }

  private calculateStatisticalRarity(
    traits: Array<{ traitType: string; value: string; rarity: number }>,
    traitFreqs: Record<string, Record<string, number>>
  ): number {
    // Use geometric mean of trait rarities
    const rarities = traits.map(trait => trait.rarity);
    const geometricMean = Math.pow(rarities.reduce((product, r) => product * r, 1), 1 / rarities.length);
    return 1 / geometricMean;
  }

  private calculateHarmonicMeanRarity(
    traits: Array<{ traitType: string; value: string; rarity: number }>,
    traitFreqs: Record<string, Record<string, number>>
  ): number {
    const rarities = traits.map(trait => trait.rarity);
    const harmonicMean = rarities.length / rarities.reduce((sum, r) => sum + (1 / r), 0);
    return 1 / harmonicMean;
  }

  private categorizeRarity(score: number): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic' {
    if (score > 1000000) return 'mythic';
    if (score > 100000) return 'legendary';
    if (score > 10000) return 'epic';
    if (score > 1000) return 'rare';
    if (score > 100) return 'uncommon';
    return 'common';
  }

  private calculateTraitContribution(
    trait: { traitType: string; value: string; rarity: number },
    traitFreqs: Record<string, Record<string, number>>,
    totalSupply: number
  ): number {
    const frequency = traitFreqs[trait.traitType]?.[trait.value] || 1;
    return (1 / (frequency / totalSupply)) / totalSupply;
  }

  private buildOrderBookSide(
    listings: Array<{ price: number; quantity: number }>,
    side: 'bids' | 'asks'
  ) {
    const grouped = new Map<number, number>();
    
    listings.forEach(listing => {
      grouped.set(listing.price, (grouped.get(listing.price) || 0) + listing.quantity);
    });

    const sorted = Array.from(grouped.entries()).sort((a, b) => 
      side === 'asks' ? a[0] - b[0] : b[0] - a[0]
    );

    let cumulativeQuantity = 0;
    
    return sorted.map(([price, quantity]) => {
      cumulativeQuantity += quantity;
      return {
        price,
        quantity,
        totalValue: price * quantity,
        cumulativeQuantity
      };
    });
  }

  private calculateLiquidityScore(bids: any[], asks: any[]): number {
    const totalBidVolume = bids.reduce((sum, bid) => sum + bid.totalValue, 0);
    const totalAskVolume = asks.reduce((sum, ask) => sum + ask.totalValue, 0);
    const totalVolume = totalBidVolume + totalAskVolume;
    
    // Normalize to 0-100 scale
    return Math.min(totalVolume / 10, 100);
  }

  private calculateDepthScore(bids: any[], asks: any[]): number {
    const bidCount = bids.length;
    const askCount = asks.length;
    const totalOrders = bidCount + askCount;
    
    // Score based on number of price levels
    return Math.min(totalOrders * 2, 100);
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const returns = prices.slice(1).map((price, i) => 
      Math.log(price / prices[i])
    );
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(365) * 100; // Annualized volatility in %
  }

  private calculateVelocityScore(salesCount: number, volume: number): number {
    return Math.min((salesCount * volume) / 1000, 100);
  }

  private calculateGiniCoefficient(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((sum, val) => sum + val, 0) / n;
    
    let gini = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        gini += Math.abs(sorted[i] - sorted[j]);
      }
    }
    
    return gini / (2 * n * n * mean);
  }

  private calculateTurnoverRate(inscriptions: StandardizedInscription[]): number {
    // Simplified: ratio of listed items to total items
    const listed = inscriptions.filter(i => i.listing).length;
    const total = inscriptions.length;
    return total > 0 ? (listed / total) * 100 : 0;
  }

  private calculateMomentum(sales: Array<{ price: number; timestamp: number }>): number {
    if (sales.length < 2) return 0;
    
    const recent = sales.slice(-10); // Last 10 sales
    const older = sales.slice(-20, -10); // Previous 10 sales
    
    if (recent.length === 0 || older.length === 0) return 0;
    
    const recentAvg = recent.reduce((sum, s) => sum + s.price, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.price, 0) / older.length;
    
    return olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
  }

  private determineSentiment(momentum: number, activities: StandardizedActivity[]): 'bullish' | 'bearish' | 'neutral' {
    const recent = activities.filter(a => Date.now() - a.timestamp < 24 * 60 * 60 * 1000);
    const listings = recent.filter(a => a.type === 'list').length;
    const sales = recent.filter(a => a.type === 'sale').length;
    
    const activityRatio = listings > 0 ? sales / listings : 0;
    
    if (momentum > 10 && activityRatio > 0.5) return 'bullish';
    if (momentum < -10 && activityRatio < 0.2) return 'bearish';
    return 'neutral';
  }

  private calculateTechnicalScore(sales: Array<{ price: number; timestamp: number }>): number {
    // Simplified technical analysis score
    const momentum = this.calculateMomentum(sales);
    const volatility = this.calculateVolatility(sales.map(s => s.price));
    
    // Score based on positive momentum and reasonable volatility
    let score = 50; // Base score
    score += Math.min(momentum, 20); // Add up to 20 for positive momentum
    score -= Math.min(volatility / 2, 20); // Subtract up to 20 for high volatility
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateSocialScore(activities: StandardizedActivity[]): number {
    // Simplified social score based on activity
    const recentActivity = activities.filter(a => Date.now() - a.timestamp < 24 * 60 * 60 * 1000);
    return Math.min(recentActivity.length * 2, 100);
  }

  private calculateFundamentalScore(activities: StandardizedActivity[]): number {
    // Simplified fundamental score
    return 50; // Placeholder - would analyze utility, team, roadmap, etc.
  }

  private calculateMarketRisk(sales: Array<{ price: number; timestamp: number }>): number {
    const volatility = this.calculateVolatility(sales.map(s => s.price));
    return Math.min(volatility, 100);
  }

  private findSupportLevels(sales: Array<{ price: number; timestamp: number }>): number[] {
    // Simplified support level detection
    const prices = sales.map(s => s.price).sort((a, b) => a - b);
    const levels: number[] = [];
    
    // Find price levels with high frequency
    const priceFreq = new Map<number, number>();
    prices.forEach(price => {
      const rounded = Math.round(price * 1000) / 1000; // Round to 3 decimal places
      priceFreq.set(rounded, (priceFreq.get(rounded) || 0) + 1);
    });
    
    const threshold = Math.max(2, prices.length * 0.05); // At least 5% of sales
    priceFreq.forEach((count, price) => {
      if (count >= threshold) {
        levels.push(price);
      }
    });
    
    return levels.sort((a, b) => a - b).slice(0, 5); // Top 5 support levels
  }

  private findResistanceLevels(sales: Array<{ price: number; timestamp: number }>): number[] {
    // Similar to support levels but focus on higher prices
    return this.findSupportLevels(sales).reverse(); // Simplified: just reverse support levels
  }

  // Marketplace-specific data fetching methods
  private async getCollectionFromMarketplace(collectionId: string, marketplace: OrdinalsMarketplace, client: any) {
    switch (marketplace) {
      case OrdinalsMarketplace.GAMMA:
        return await client.getCollection(collectionId);
      case OrdinalsMarketplace.OKX:
        return await client.getCollection(collectionId);
      case OrdinalsMarketplace.UNISAT:
        return await client.getCollection(collectionId);
      case OrdinalsMarketplace.HIRO:
        return await client.getCollectionInfo(collectionId);
      default:
        return null;
    }
  }

  private async getInscriptionsFromMarketplace(collectionId: string, marketplace: OrdinalsMarketplace, client: any) {
    switch (marketplace) {
      case OrdinalsMarketplace.GAMMA:
        return await client.getInscriptions(collectionId);
      case OrdinalsMarketplace.OKX:
        const result = await client.getInscriptions(collectionId);
        return result.inscriptions || [];
      case OrdinalsMarketplace.UNISAT:
        const uniResult = await client.getCollectionInscriptions(collectionId);
        return uniResult.list || [];
      case OrdinalsMarketplace.HIRO:
        return await client.getInscriptionsByCollection(collectionId);
      default:
        return [];
    }
  }

  private async getActivitiesFromMarketplace(collectionId: string, marketplace: OrdinalsMarketplace, client: any) {
    switch (marketplace) {
      case OrdinalsMarketplace.GAMMA:
        return await client.getCollectionActivity(collectionId);
      case OrdinalsMarketplace.OKX:
        const result = await client.getCollectionActivity(collectionId);
        return result.activities || [];
      case OrdinalsMarketplace.UNISAT:
        // UniSat doesn't have activity endpoint
        return [];
      case OrdinalsMarketplace.HIRO:
        // Hiro doesn't have activity endpoint
        return [];
      default:
        return [];
    }
  }

  private async getListingsFromMarketplace(collectionId: string, marketplace: OrdinalsMarketplace, client: any) {
    switch (marketplace) {
      case OrdinalsMarketplace.GAMMA:
        const inscriptions = await client.getInscriptions(collectionId);
        return inscriptions.filter((i: any) => i.listed).map((i: any) => ({
          price: i.listedPrice,
          inscriptionId: i.id
        }));
      case OrdinalsMarketplace.OKX:
        const okxResult = await client.getInscriptions(collectionId);
        return (okxResult.inscriptions || []).filter((i: any) => i.listingInfo).map((i: any) => ({
          price: parseFloat(i.listingInfo.price),
          inscriptionId: i.inscriptionId
        }));
      case OrdinalsMarketplace.UNISAT:
        const uniResult = await client.getMarketListings(collectionId);
        return (uniResult.list || []).map((l: any) => ({
          price: l.price / 100000000, // Convert sats to BTC
          inscriptionId: l.inscriptionId
        }));
      case OrdinalsMarketplace.HIRO:
        // Hiro doesn't have marketplace listings
        return [];
      default:
        return [];
    }
  }

  private convertInscription(inscription: any, marketplace: OrdinalsMarketplace): StandardizedInscription {
    // Convert marketplace-specific inscription format to standardized format
    // Implementation would depend on each marketplace's data structure
    return {
      id: inscription.inscriptionId || inscription.id,
      number: inscription.inscriptionNumber || inscription.number,
      address: inscription.address || inscription.owner,
      contentType: inscription.contentType || inscription.content_type,
      contentPreview: inscription.preview || inscription.contentPreviewURL,
      contentUrl: inscription.content,
      contentLength: inscription.contentLength || inscription.content_length,
      timestamp: inscription.timestamp || inscription.genesisTransactionBlockTime,
      genesisHeight: inscription.genesisHeight || inscription.genesis_height,
      genesisTransaction: inscription.genesisTransaction || inscription.genesis_transaction,
      location: inscription.location,
      satoshi: inscription.satoshi || inscription.sat,
      owner: inscription.owner || inscription.address,
      collection: inscription.collection,
      listing: inscription.listingInfo ? {
        price: parseFloat(inscription.listingInfo.price),
        marketplace,
        listedAt: new Date(inscription.listingInfo.listedAt).getTime(),
        seller: inscription.listingInfo.seller
      } : undefined,
      rarity: inscription.rarityInfo ? {
        rank: inscription.rarityInfo.rank,
        score: inscription.rarityInfo.score,
        rarity: inscription.rarityInfo.rarity,
        traits: inscription.traitInfo
      } : undefined,
      marketplace
    };
  }

  private convertActivity(activity: any, marketplace: OrdinalsMarketplace): StandardizedActivity {
    return {
      id: activity.activityId || activity.txid,
      type: activity.type.toLowerCase(),
      inscriptionId: activity.inscriptionId,
      inscriptionNumber: activity.inscriptionNumber,
      fromAddress: activity.fromAddress || activity.oldOwner,
      toAddress: activity.toAddress || activity.newOwner,
      price: activity.price ? parseFloat(activity.price) : undefined,
      timestamp: new Date(activity.timestamp || activity.blockTime).getTime(),
      txHash: activity.txHash || activity.txid,
      blockHeight: activity.blockHeight,
      marketplace,
      collection: activity.collectionInfo
    };
  }

  // Additional helper methods for opportunity detection
  private async findArbitrageOpportunities(collectionId: string, analysis: CollectionAnalysis): Promise<TradingOpportunity[]> {
    // Implementation for finding arbitrage opportunities between marketplaces
    return [];
  }

  private async findUndervaluedOpportunities(collectionId: string, analysis: CollectionAnalysis): Promise<TradingOpportunity[]> {
    // Implementation for finding undervalued items based on rarity and pricing
    return [];
  }

  private async findMomentumOpportunities(collectionId: string, analysis: CollectionAnalysis): Promise<TradingOpportunity[]> {
    // Implementation for finding momentum-based opportunities
    return [];
  }

  private async findBreakoutOpportunities(collectionId: string, analysis: CollectionAnalysis): Promise<TradingOpportunity[]> {
    // Implementation for finding breakout opportunities
    return [];
  }

  private async findMeanReversionOpportunities(collectionId: string, analysis: CollectionAnalysis): Promise<TradingOpportunity[]> {
    // Implementation for finding mean reversion opportunities
    return [];
  }

  private async getTopCollections(limit: number): Promise<string[]> {
    // Get top collections from all marketplaces
    const collections: string[] = [];
    
    try {
      const clients = this.initializeClients();
      const marketCollections = await clients[OrdinalsMarketplace.GAMMA].getCollections(limit);
      collections.push(...marketCollections.map((c: any) => c.symbol));
    } catch (error) {
    }

    return collections.slice(0, limit);
  }

  private async getInscriptionDetails(inscriptionId: string, marketplace?: OrdinalsMarketplace): Promise<StandardizedInscription | null> {
    const marketplaces = marketplace ? [marketplace] : Object.values(OrdinalsMarketplace);
    
    for (const mp of marketplaces) {
      try {
        const clients = this.initializeClients();
        const client = clients[mp];
        let inscription;
        
        switch (mp) {
          case OrdinalsMarketplace.GAMMA:
            inscription = await client.getInscription(inscriptionId);
            break;
          case OrdinalsMarketplace.OKX:
            inscription = await client.getInscription(inscriptionId);
            break;
          case OrdinalsMarketplace.UNISAT:
            inscription = await client.getInscription(inscriptionId);
            break;
          case OrdinalsMarketplace.HIRO:
            inscription = await client.getInscriptionDetails(inscriptionId);
            break;
        }
        
        if (inscription) {
          return this.convertInscription(inscription, mp);
        }
      } catch (error) {
      }
    }
    
    return null;
  }

  private async getRecentSales(collectionId: string): Promise<Array<{ price: number; timestamp: number }>> {
    // Get recent sales data for bid estimation
    const clients = this.initializeClients();
    const activities = await this.getActivitiesFromMarketplace(collectionId, OrdinalsMarketplace.GAMMA, clients[OrdinalsMarketplace.GAMMA]);
    return activities
      .filter((a: any) => a.type === 'sale' && a.price)
      .map((a: any) => ({ price: a.price, timestamp: a.timestamp }))
      .slice(0, 50); // Last 50 sales
  }

  private estimateBids(recentSales: Array<{ price: number; timestamp: number }>, asks: any[]): any[] {
    // Estimate bid levels based on recent sales and current asks
    if (recentSales.length === 0 || asks.length === 0) return [];
    
    const avgSalePrice = recentSales.reduce((sum, s) => sum + s.price, 0) / recentSales.length;
    const lowestAsk = asks[0].price;
    
    // Create estimated bid levels below the lowest ask
    const bids: Array<{ price: number; quantity: number; totalValue: number; cumulativeQuantity: number }> = [];
    for (let i = 1; i <= 5; i++) {
      const bidPrice = lowestAsk * (1 - (i * 0.02)); // 2% increments below lowest ask
      bids.push({
        price: bidPrice,
        quantity: Math.max(1, Math.floor(avgSalePrice / bidPrice)),
        totalValue: bidPrice * Math.max(1, Math.floor(avgSalePrice / bidPrice)),
        cumulativeQuantity: bids.reduce((sum: number, b) => sum + b.quantity, 0) + Math.max(1, Math.floor(avgSalePrice / bidPrice))
      });
    }
    
    return bids;
  }

  private async getPortfolioHoldings(address: string): Promise<Array<{
    inscriptionId: string;
    collectionId: string;
    currentValue: number;
  }>> {
    // Get user's current Ordinals holdings
    const holdings: Array<{
      inscriptionId: string;
      collectionId: string;
      currentValue: number;
    }> = [];
    
    // Fetch from all marketplaces
    for (const [mp, client] of Object.entries(this.initializeClients())) {
      try {
        let inscriptions: any[] = [];
        
        switch (mp as OrdinalsMarketplace) {
          case OrdinalsMarketplace.UNISAT:
            const uniResult = await client.getAddressInscriptions(address);
            inscriptions = uniResult.list || [];
            break;
          // Other marketplaces might not have address lookup
        }
        
        for (const inscription of inscriptions) {
          const standardized = this.convertInscription(inscription, mp as OrdinalsMarketplace);
          holdings.push({
            inscriptionId: standardized.id,
            collectionId: standardized.collection?.id || 'unknown',
            currentValue: standardized.listing?.price || 0
          });
        }
      } catch (error) {
      }
    }
    
    return holdings;
  }

  private async calculatePortfolioMetrics(
    holdings: Array<{
      inscriptionId: string;
      collectionId: string;
      currentValue: number;
    }>,
    transactions?: Array<{
      inscriptionId: string;
      type: 'buy' | 'sell';
      price: number;
      timestamp: number;
    }>
  ): Promise<PortfolioAnalytics> {
    // Calculate portfolio performance metrics
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    
    // If no transaction history provided, use simplified calculation
    if (!transactions) {
      return {
        totalValue,
        totalCost: totalValue, // Assume current value as cost
        unrealizedPnL: 0,
        realizedPnL: 0,
        totalPnL: 0,
        pnlPercentage: 0,
        diversificationScore: this.calculateDiversificationScore(holdings),
        riskScore: 50, // Default medium risk
        performanceMetrics: {
          sharpeRatio: 0,
          maxDrawdown: 0,
          volatility: 0,
          beta: 1
        },
        holdings: holdings.map(h => ({
          inscriptionId: h.inscriptionId,
          collectionId: h.collectionId,
          quantity: 1,
          avgCost: h.currentValue,
          currentValue: h.currentValue,
          unrealizedPnL: 0,
          pnlPercentage: 0,
          allocation: totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0
        })),
        recommendations: []
      };
    }

    // Calculate detailed metrics with transaction history
    const buys = transactions.filter(t => t.type === 'buy');
    const sells = transactions.filter(t => t.type === 'sell');
    
    const totalCost = buys.reduce((sum, t) => sum + t.price, 0);
    const realizedPnL = sells.reduce((sum, t) => sum + t.price, 0) - 
                       sells.reduce((sum, t) => {
                         const buyTx = buys.find(b => b.inscriptionId === t.inscriptionId);
                         return sum + (buyTx?.price || 0);
                       }, 0);
    
    const unrealizedPnL = totalValue - (totalCost - sells.reduce((sum, t) => sum + t.price, 0));
    const totalPnL = realizedPnL + unrealizedPnL;
    const pnlPercentage = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      unrealizedPnL,
      realizedPnL,
      totalPnL,
      pnlPercentage,
      diversificationScore: this.calculateDiversificationScore(holdings),
      riskScore: this.calculatePortfolioRisk(holdings),
      performanceMetrics: {
        sharpeRatio: this.calculateSharpeRatio(transactions),
        maxDrawdown: this.calculateMaxDrawdown(transactions),
        volatility: this.calculatePortfolioVolatility(transactions),
        beta: 1 // Would need market data to calculate properly
      },
      holdings: holdings.map(h => {
        const buyTx = buys.find(b => b.inscriptionId === h.inscriptionId);
        const avgCost = buyTx?.price || h.currentValue;
        const unrealizedPnL = h.currentValue - avgCost;
        const pnlPercentage = avgCost > 0 ? (unrealizedPnL / avgCost) * 100 : 0;
        
        return {
          inscriptionId: h.inscriptionId,
          collectionId: h.collectionId,
          quantity: 1,
          avgCost,
          currentValue: h.currentValue,
          unrealizedPnL,
          pnlPercentage,
          allocation: totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0
        };
      }),
      recommendations: [] // Would generate based on analysis
    };
  }

  private calculateDiversificationScore(holdings: Array<{ collectionId: string; currentValue: number }>): number {
    const collectionCounts = new Map<string, number>();
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    
    holdings.forEach(h => {
      collectionCounts.set(h.collectionId, (collectionCounts.get(h.collectionId) || 0) + h.currentValue);
    });
    
    // Calculate Herfindahl-Hirschman Index for diversification
    let hhi = 0;
    collectionCounts.forEach(value => {
      const share = value / totalValue;
      hhi += share * share;
    });
    
    // Convert to diversification score (0-100, higher is more diversified)
    return Math.max(0, (1 - hhi) * 100);
  }

  private calculatePortfolioRisk(holdings: Array<{ collectionId: string; currentValue: number }>): number {
    // Simplified risk calculation based on concentration
    const concentrationRisk = 100 - this.calculateDiversificationScore(holdings);
    return Math.min(100, Math.max(0, concentrationRisk));
  }

  private calculateSharpeRatio(transactions: Array<{ price: number; timestamp: number }>): number {
    if (transactions.length < 2) return 0;
    
    const returns = transactions.slice(1).map((t, i) => {
      const prevPrice = transactions[i].price;
      return prevPrice > 0 ? (t.price - prevPrice) / prevPrice : 0;
    });
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const returnStdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    
    return returnStdDev > 0 ? avgReturn / returnStdDev : 0;
  }

  private calculateMaxDrawdown(transactions: Array<{ price: number; timestamp: number }>): number {
    if (transactions.length < 2) return 0;
    
    let maxDrawdown = 0;
    let peak = transactions[0].price;
    
    transactions.forEach(t => {
      if (t.price > peak) {
        peak = t.price;
      } else {
        const drawdown = (peak - t.price) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    });
    
    return maxDrawdown * 100;
  }

  private calculatePortfolioVolatility(transactions: Array<{ price: number; timestamp: number }>): number {
    const prices = transactions.map(t => t.price);
    return this.calculateVolatility(prices);
  }
}

// Singleton instance
export const ordinalsAnalytics = new OrdinalsAnalytics();