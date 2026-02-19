/**
 * Advanced Ordinals Data Aggregator
 * Multi-marketplace data consolidation and real-time tracking system
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
import {
  OrdinalsArbitrageOpportunity,
  FeeBreakdown,
  RiskScore,
  MARKETPLACE_FEES,
  PLATFORM_FEE_PERCENTAGE,
  DEFAULT_CONFIG
} from '../../types/ordinals-arbitrage';
import { EventEmitter } from 'events';

export interface AggregatedCollectionData {
  collection: StandardizedCollection;
  marketplaceData: Record<OrdinalsMarketplace, {
    floorPrice: number;
    volume24h: number;
    listedCount: number;
    lastUpdated: number;
    available: boolean;
  }>;
  consolidatedMetrics: {
    bestFloorPrice: number;
    bestFloorMarketplace: OrdinalsMarketplace;
    totalVolume24h: number;
    totalListedCount: number;
    priceSpread: number; // Difference between highest and lowest floor prices
    arbitrageOpportunity: {
      exists: boolean;
      buyMarketplace?: OrdinalsMarketplace;
      sellMarketplace?: OrdinalsMarketplace;
      profit?: number;
      profitPercentage?: number;
      fees?: FeeBreakdown;
      netProfit?: number;
      netProfitPercentage?: number;
      confidence?: number;
      riskScore?: RiskScore;
      liquidityScore?: number;
      lastUpdated?: number;
    };
  };
  lastUpdated: number;
}

export interface AggregatedInscriptionData {
  inscription: StandardizedInscription;
  marketplaceListings: Array<{
    marketplace: OrdinalsMarketplace;
    price: number;
    seller: string;
    listedAt: number;
    available: boolean;
  }>;
  bestListing: {
    marketplace: OrdinalsMarketplace;
    price: number;
    seller: string;
  } | null;
  priceHistory: Array<{
    timestamp: number;
    price: number;
    marketplace: OrdinalsMarketplace;
    type: 'list' | 'sale';
  }>;
  analytics: {
    avgPrice7d: number;
    priceChange24h: number;
    priceVolatility: number;
    liquidityScore: number;
    rarityScore: number;
  };
}

export interface MarketOverview {
  totalMarketCap: number;
  totalVolume24h: number;
  totalSales24h: number;
  totalListings: number;
  averageFloorPrice: number;
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  topCollections: AggregatedCollectionData[];
  trendingCollections: AggregatedCollectionData[];
  arbitrageOpportunities: Array<{
    collectionId: string;
    inscriptionId?: string;
    buyMarketplace: OrdinalsMarketplace;
    sellMarketplace: OrdinalsMarketplace;
    profit: number;
    profitPercentage: number;
    confidence: number;
  }>;
  lastUpdated: number;
}

export interface DataFeedConfig {
  updateInterval: number; // in milliseconds
  enabledMarketplaces: OrdinalsMarketplace[];
  collectionsToTrack: string[];
  enableWebSocket: boolean;
  cacheSettings: {
    ttl: number;
    maxSize: number;
  };
  filters: {
    minFloorPrice?: number;
    maxFloorPrice?: number;
    minVolume24h?: number;
    verified?: boolean;
  };
}

export interface DataSubscription {
  id: string;
  type: 'collection' | 'inscription' | 'market_overview' | 'arbitrage';
  target?: string; // collection ID or inscription ID
  callback: (data: any) => void;
  filters?: Record<string, any>;
  active: boolean;
}

export class OrdinalsDataAggregator extends EventEmitter {
  private clients: Record<OrdinalsMarketplace, any>;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private subscriptions: Map<string, DataSubscription> = new Map();
  private updateIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private config: DataFeedConfig;
  private isRunning: boolean = false;

  constructor(config: Partial<DataFeedConfig> = {}, apiConfig?: { uniSatApiKey?: string }) {
    super();
    
    this.clients = OrdinalsMarketplaceFactory.getAllClients(apiConfig);
    
    this.config = {
      updateInterval: config.updateInterval || 30000, // 30 seconds
      enabledMarketplaces: config.enabledMarketplaces || Object.values(OrdinalsMarketplace),
      collectionsToTrack: config.collectionsToTrack || [],
      enableWebSocket: config.enableWebSocket || false,
      cacheSettings: {
        ttl: config.cacheSettings?.ttl || 60000, // 1 minute
        maxSize: config.cacheSettings?.maxSize || 1000
      },
      filters: config.filters || {}
    };
  }

  /**
   * Start the data aggregation service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Start periodic updates
    this.startPeriodicUpdates();

    // Initialize WebSocket connections if enabled
    if (this.config.enableWebSocket) {
      await this.initializeWebSockets();
    }

    // Perform initial data load
    await this.performInitialDataLoad();

    this.emit('started');
  }

  /**
   * Stop the data aggregation service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear all intervals
    this.updateIntervals.forEach(interval => clearInterval(interval));
    this.updateIntervals.clear();

    // Close WebSocket connections
    await this.closeWebSockets();

    // Clear subscriptions
    this.subscriptions.clear();

    this.emit('stopped');
  }

  /**
   * Get aggregated collection data
   */
  async getAggregatedCollection(collectionId: string, forceRefresh: boolean = false): Promise<AggregatedCollectionData | null> {
    const cacheKey = `aggregated-collection-${collectionId}`;
    
    if (!forceRefresh) {
      const cached = this.getCached<AggregatedCollectionData>(cacheKey);
      if (cached) return cached;
    }

    try {
      const aggregatedData = await this.aggregateCollectionData(collectionId);
      
      if (aggregatedData) {
        this.setCache(cacheKey, aggregatedData);
        this.emit('collection_updated', aggregatedData);
      }

      return aggregatedData;
    } catch (error) {
      console.error(`Error aggregating collection data for ${collectionId}:`, error);
      return null;
    }
  }

  /**
   * Get aggregated inscription data
   */
  async getAggregatedInscription(inscriptionId: string, forceRefresh: boolean = false): Promise<AggregatedInscriptionData | null> {
    const cacheKey = `aggregated-inscription-${inscriptionId}`;
    
    if (!forceRefresh) {
      const cached = this.getCached<AggregatedInscriptionData>(cacheKey);
      if (cached) return cached;
    }

    try {
      const aggregatedData = await this.aggregateInscriptionData(inscriptionId);
      
      if (aggregatedData) {
        this.setCache(cacheKey, aggregatedData);
        this.emit('inscription_updated', aggregatedData);
      }

      return aggregatedData;
    } catch (error) {
      console.error(`Error aggregating inscription data for ${inscriptionId}:`, error);
      return null;
    }
  }

  /**
   * Get market overview
   */
  async getMarketOverview(forceRefresh: boolean = false): Promise<MarketOverview> {
    const cacheKey = 'market-overview';
    
    if (!forceRefresh) {
      const cached = this.getCached<MarketOverview>(cacheKey);
      if (cached) return cached;
    }

    try {
      const overview = await this.aggregateMarketOverview();
      
      this.setCache(cacheKey, overview, 120000); // 2 minute cache for overview
      this.emit('market_overview_updated', overview);

      return overview;
    } catch (error) {
      console.error('Error aggregating market overview:', error);
      return this.getEmptyMarketOverview();
    }
  }

  /**
   * Find arbitrage opportunities across marketplaces
   * Enhanced with stale price detection, market depth scoring, and fee-adjusted profit calculations
   */
  async findArbitrageOpportunities(
    collections?: string[],
    minProfitPercentage: number = 2
  ): Promise<Array<{
    collectionId: string;
    inscriptionId?: string;
    buyMarketplace: OrdinalsMarketplace;
    sellMarketplace: OrdinalsMarketplace;
    profit: number;
    profitPercentage: number;
    confidence: number;
    fees: FeeBreakdown;
    netProfit: number;
    netProfitPercentage: number;
    riskScore: RiskScore;
    liquidityScore: number;
    lastUpdated: number;
  }>> {
    const opportunities: Array<{
      collectionId: string;
      inscriptionId?: string;
      buyMarketplace: OrdinalsMarketplace;
      sellMarketplace: OrdinalsMarketplace;
      profit: number;
      profitPercentage: number;
      confidence: number;
      fees: FeeBreakdown;
      netProfit: number;
      netProfitPercentage: number;
      riskScore: RiskScore;
      liquidityScore: number;
      lastUpdated: number;
    }> = [];

    try {
      // Default collections to scan for arbitrage opportunities
      const DEFAULT_COLLECTIONS = [
        'bitcoin-puppets',
        'nodemonkeys',
        'runestone',
        'quantum-cats',
        'bitcoin-frogs',
        'ordinal-maxi-biz'
      ];

      // If no collections specified and none tracked, use defaults then fetch top collections
      let collectionsToCheck = collections || this.config.collectionsToTrack.slice(0, 20);

      if (collectionsToCheck.length === 0) {
        collectionsToCheck = DEFAULT_COLLECTIONS;

        // Also try to fetch top collections from API to supplement defaults
        try {
          const topCollections = await this.getTopCollections(20);
          const topCollectionIds = topCollections.map(c => c.id || c.slug).filter(Boolean);
          // Merge defaults with API results, avoiding duplicates
          collectionsToCheck = [...new Set([...collectionsToCheck, ...topCollectionIds])];
        } catch (error) {
        }
      }

      const now = Date.now();

      for (const collectionId of collectionsToCheck) {
        try {
          const collectionData = await this.getAggregatedCollection(collectionId);

          if (!collectionData) {
            continue;
          }

          if (!collectionData.consolidatedMetrics.arbitrageOpportunity.exists) {
            continue;
          }

          const arb = collectionData.consolidatedMetrics.arbitrageOpportunity;

          // ENHANCEMENT 1: Stale price detection - reject if timestamp > 60s old
          const priceAge = (now - collectionData.lastUpdated) / 1000; // in seconds
          if (priceAge > DEFAULT_CONFIG.MAX_PRICE_AGE_SECONDS) {
            continue;
          }

          // Validate required fields exist (fees, netProfit, etc.)
          if (!arb.netProfit || !arb.netProfitPercentage || !arb.fees) {
            continue;
          }

          // ENHANCEMENT 2: Use fee-adjusted profit (netProfitPercentage) for filtering
          if (arb.netProfitPercentage < minProfitPercentage) {
            continue;
          }

          // Double-check net profit is actually positive
          if (arb.netProfit <= 0) {
            continue;
          }

          const buyPrice = collectionData.consolidatedMetrics.bestFloorPrice;
          const sellPrice = buyPrice + arb.profit!;

          // Validate prices are realistic
          if (buyPrice <= 0 || sellPrice <= 0) {
            continue;
          }

          // Validate sell price is higher than buy price
          if (sellPrice <= buyPrice) {
            continue;
          }

          // Calculate confidence score based on collection metrics
          const confidence = this.calculateArbitrageConfidence(collectionData);

          // ENHANCEMENT 3: Market depth score based on listedCount
          const liquidityScore = this.calculateLiquidityScore(
            collectionData.consolidatedMetrics.totalListedCount
          );

          // Calculate risk score using netProfitPercentage, liquidityScore, and priceAge
          const riskScore = this.calculateRiskScore(
            arb.netProfitPercentage,
            liquidityScore,
            priceAge
          );


          // ENHANCEMENT 4: Return object includes fees, netProfit, netProfitPercentage, liquidityScore
          opportunities.push({
            collectionId,
            buyMarketplace: arb.buyMarketplace!,
            sellMarketplace: arb.sellMarketplace!,
            profit: arb.profit!,
            profitPercentage: arb.profitPercentage!,
            fees: arb.fees,
            netProfit: arb.netProfit,
            netProfitPercentage: arb.netProfitPercentage,
            confidence,
            riskScore,
            liquidityScore,
            lastUpdated: collectionData.lastUpdated
          });
        } catch (error) {
          console.error(`❌ ${collectionId}: Error processing arbitrage opportunity:`, error);
          continue;
        }
      }

      // Sort by net profit percentage (fee-adjusted) descending
      opportunities.sort((a, b) => b.netProfitPercentage - a.netProfitPercentage);

      return opportunities;
    } catch (error) {
      console.error('Error finding arbitrage opportunities:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time data updates
   */
  subscribe(
    type: 'collection' | 'inscription' | 'market_overview' | 'arbitrage',
    callback: (data: any) => void,
    target?: string,
    filters?: Record<string, any>
  ): string {
    const subscriptionId = `sub_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`;
    
    const subscription: DataSubscription = {
      id: subscriptionId,
      type,
      target,
      callback,
      filters,
      active: true
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Start tracking this specific target if needed
    if (target && (type === 'collection' || type === 'inscription')) {
      this.startTargetTracking(type, target);
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from data updates
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.active = false;
      this.subscriptions.delete(subscriptionId);
    }
  }

  /**
   * Get top collections by volume
   */
  async getTopCollections(limit: number = 50): Promise<StandardizedCollection[]> {
    const cacheKey = `top-collections-${limit}`;
    const cached = this.getCached<StandardizedCollection[]>(cacheKey);
    if (cached) return cached;

    try {
      const allCollections: StandardizedCollection[] = [];

      // Fetch from all enabled marketplaces
      for (const marketplace of this.config.enabledMarketplaces) {
        try {
          const client = this.clients[marketplace];
          let collections: any[] = [];

          switch (marketplace) {
            case OrdinalsMarketplace.MAGIC_EDEN:
              collections = await client.getCollections(limit);
              break;
            case OrdinalsMarketplace.OKX:
              const okxResult = await client.getCollections(limit);
              collections = okxResult.collections || [];
              break;
            case OrdinalsMarketplace.UNISAT:
              const uniResult = await client.getCollections(0, limit, 'volume');
              collections = uniResult.list || [];
              break;
            case OrdinalsMarketplace.HIRO:
              collections = await client.getCollections() || [];
              break;
          }

          // Convert to standardized format
          const standardized = collections.map(c => 
            OrdinalsDataConverter.convertCollection(c, marketplace)
          );

          allCollections.push(...standardized);
        } catch (error) {
        }
      }

      // Deduplicate and merge collections by name/symbol
      const merged = this.mergeCollections(allCollections);

      // Sort by volume and apply filters
      const filtered = merged
        .filter(c => this.applyCollectionFilters(c))
        .sort((a, b) => b.volume24h - a.volume24h)
        .slice(0, limit);

      this.setCache(cacheKey, filtered, 300000); // 5 minute cache
      return filtered;
    } catch (error) {
      console.error('Error fetching top collections:', error);
      return [];
    }
  }

  /**
   * Get real-time price data for inscriptions
   */
  async getRealTimePrices(inscriptionIds: string[]): Promise<Record<string, {
    price: number;
    marketplace: OrdinalsMarketplace;
    lastUpdated: number;
  }>> {
    const prices: Record<string, {
      price: number;
      marketplace: OrdinalsMarketplace;
      lastUpdated: number;
    }> = {};

    const fetchPromises = inscriptionIds.map(async (inscriptionId) => {
      try {
        const aggregatedData = await this.getAggregatedInscription(inscriptionId);
        if (aggregatedData?.bestListing) {
          prices[inscriptionId] = {
            price: aggregatedData.bestListing.price,
            marketplace: aggregatedData.bestListing.marketplace,
            lastUpdated: Date.now()
          };
        }
      } catch (error) {
      }
    });

    await Promise.allSettled(fetchPromises);
    return prices;
  }

  /**
   * Private methods
   */

  private async aggregateCollectionData(collectionId: string): Promise<AggregatedCollectionData | null> {
    const marketplaceData: Record<OrdinalsMarketplace, any> = {} as any;
    let primaryCollection: StandardizedCollection | null = null;

    // Fetch data from all enabled marketplaces with individual error handling
    for (const marketplace of this.config.enabledMarketplaces) {
      try {
        const client = this.clients[marketplace];

        if (!client) {
          marketplaceData[marketplace] = {
            floorPrice: 0,
            volume24h: 0,
            listedCount: 0,
            lastUpdated: Date.now(),
            available: false,
            error: 'Client not initialized'
          };
          continue;
        }

        let collection: any = null;
        const startTime = Date.now();

        try {
          // Add timeout to prevent hanging API calls
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('API timeout')), 10000)
          );

          switch (marketplace) {
            case OrdinalsMarketplace.MAGIC_EDEN:
              collection = await Promise.race([
                client.getCollection(collectionId),
                timeoutPromise
              ]);
              break;
            case OrdinalsMarketplace.OKX:
              collection = await Promise.race([
                client.getCollection(collectionId),
                timeoutPromise
              ]);
              break;
            case OrdinalsMarketplace.UNISAT:
              collection = await Promise.race([
                client.getCollection(collectionId),
                timeoutPromise
              ]);
              break;
            case OrdinalsMarketplace.HIRO:
              collection = await Promise.race([
                client.getCollectionInfo(collectionId),
                timeoutPromise
              ]);
              break;
          }

          const responseTime = Date.now() - startTime;

        } catch (apiError) {
          const responseTime = Date.now() - startTime;
          console.error(`❌ ${marketplace}: Failed after ${responseTime}ms`, apiError);

          marketplaceData[marketplace] = {
            floorPrice: 0,
            volume24h: 0,
            listedCount: 0,
            lastUpdated: Date.now(),
            available: false,
            error: apiError instanceof Error ? apiError.message : 'API request failed'
          };
          continue;
        }

        if (collection && collection.floorPrice > 0) {
          const standardized = OrdinalsDataConverter.convertCollection(collection, marketplace);

          // Validate data quality
          if (standardized.floorPrice <= 0) {
            marketplaceData[marketplace] = {
              floorPrice: 0,
              volume24h: 0,
              listedCount: 0,
              lastUpdated: Date.now(),
              available: false,
              error: 'Invalid floor price'
            };
            continue;
          }

          if (!primaryCollection || standardized.totalSupply > primaryCollection.totalSupply) {
            primaryCollection = standardized;
          }

          marketplaceData[marketplace] = {
            floorPrice: standardized.floorPrice,
            volume24h: standardized.volume24h,
            listedCount: standardized.listedCount,
            lastUpdated: Date.now(),
            available: true
          };

        } else {
          marketplaceData[marketplace] = {
            floorPrice: 0,
            volume24h: 0,
            listedCount: 0,
            lastUpdated: Date.now(),
            available: false,
            error: 'No collection data or zero floor price'
          };
        }
      } catch (error) {
        console.error(`❌ ${marketplace}: Exception while fetching collection ${collectionId}:`, error);
        marketplaceData[marketplace] = {
          floorPrice: 0,
          volume24h: 0,
          listedCount: 0,
          lastUpdated: Date.now(),
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    if (!primaryCollection) {
      return null;
    }

    // Calculate consolidated metrics
    const consolidatedMetrics = this.calculateConsolidatedMetrics(marketplaceData);

    return {
      collection: primaryCollection,
      marketplaceData,
      consolidatedMetrics,
      lastUpdated: Date.now()
    };
  }

  private async aggregateInscriptionData(inscriptionId: string): Promise<AggregatedInscriptionData | null> {
    let primaryInscription: StandardizedInscription | null = null;
    const marketplaceListings: Array<{
      marketplace: OrdinalsMarketplace;
      price: number;
      seller: string;
      listedAt: number;
      available: boolean;
    }> = [];

    // Fetch from all enabled marketplaces
    for (const marketplace of this.config.enabledMarketplaces) {
      try {
        const client = this.clients[marketplace];
        let inscription: any = null;

        switch (marketplace) {
          case OrdinalsMarketplace.MAGIC_EDEN:
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
          const standardized = this.convertInscriptionToStandardized(inscription, marketplace);
          
          if (!primaryInscription) {
            primaryInscription = standardized;
          }

          // Add listing if available
          if (standardized.listing) {
            marketplaceListings.push({
              marketplace,
              price: standardized.listing.price,
              seller: standardized.listing.seller,
              listedAt: standardized.listing.listedAt,
              available: true
            });
          }
        }
      } catch (error) {
      }
    }

    if (!primaryInscription) {
      return null;
    }

    // Find best listing
    const bestListing = marketplaceListings.length > 0 
      ? marketplaceListings.reduce((best, current) => 
          current.price < best.price ? current : best
        )
      : null;

    // Calculate analytics
    const analytics = await this.calculateInscriptionAnalytics(inscriptionId, marketplaceListings);

    return {
      inscription: primaryInscription,
      marketplaceListings,
      bestListing: bestListing ? {
        marketplace: bestListing.marketplace,
        price: bestListing.price,
        seller: bestListing.seller
      } : null,
      priceHistory: [], // Would need to implement historical data collection
      analytics
    };
  }

  private async aggregateMarketOverview(): Promise<MarketOverview> {
    try {
      const topCollections = await this.getTopCollections(100);
      const aggregatedCollections = await Promise.all(
        topCollections.slice(0, 20).map(c => this.getAggregatedCollection(c.id))
      );

      const validCollections = aggregatedCollections.filter(Boolean) as AggregatedCollectionData[];

      const totalMarketCap = validCollections.reduce((sum, c) => 
        sum + (c.collection.floorPrice * c.collection.totalSupply), 0
      );

      const totalVolume24h = validCollections.reduce((sum, c) => 
        sum + c.consolidatedMetrics.totalVolume24h, 0
      );

      const totalListings = validCollections.reduce((sum, c) => 
        sum + c.consolidatedMetrics.totalListedCount, 0
      );

      const averageFloorPrice = validCollections.length > 0
        ? validCollections.reduce((sum, c) => sum + c.consolidatedMetrics.bestFloorPrice, 0) / validCollections.length
        : 0;

      // Find arbitrage opportunities
      const arbitrageOpportunities = await this.findArbitrageOpportunities(
        validCollections.map(c => c.collection.id),
        1 // 1% minimum profit
      );

      return {
        totalMarketCap,
        totalVolume24h,
        totalSales24h: 0, // Would need to calculate from activity data
        totalListings,
        averageFloorPrice,
        marketSentiment: this.calculateMarketSentiment(validCollections),
        topCollections: validCollections.slice(0, 10),
        trendingCollections: validCollections
          .sort((a, b) => b.collection.volume24h - a.collection.volume24h)
          .slice(0, 10),
        arbitrageOpportunities,
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Error aggregating market overview:', error);
      return this.getEmptyMarketOverview();
    }
  }

  private calculateConsolidatedMetrics(marketplaceData: Record<OrdinalsMarketplace, any>) {
    const availableData = Object.entries(marketplaceData)
      .filter(([_, data]) => data.available && data.floorPrice > 0);

    if (availableData.length === 0) {
      return {
        bestFloorPrice: 0,
        bestFloorMarketplace: OrdinalsMarketplace.MAGIC_EDEN,
        totalVolume24h: 0,
        totalListedCount: 0,
        priceSpread: 0,
        arbitrageOpportunity: { exists: false }
      };
    }

    // Need at least 2 marketplaces for arbitrage
    if (availableData.length < 2) {
      return {
        bestFloorPrice: availableData[0][1].floorPrice,
        bestFloorMarketplace: availableData[0][0] as OrdinalsMarketplace,
        totalVolume24h: availableData[0][1].volume24h,
        totalListedCount: availableData[0][1].listedCount,
        priceSpread: 0,
        arbitrageOpportunity: { exists: false }
      };
    }

    const prices = availableData.map(([_, data]) => data.floorPrice);
    const bestFloorPrice = Math.min(...prices);
    const highestFloorPrice = Math.max(...prices);
    const bestFloorMarketplace = availableData.find(([_, data]) =>
      data.floorPrice === bestFloorPrice
    )![0] as OrdinalsMarketplace;

    const totalVolume24h = availableData.reduce((sum, [_, data]) => sum + data.volume24h, 0);
    const totalListedCount = availableData.reduce((sum, [_, data]) => sum + data.listedCount, 0);
    const priceSpread = highestFloorPrice - bestFloorPrice;

    // Check for arbitrage opportunity with STRICT validation
    const grossProfitPercentage = bestFloorPrice > 0 ? (priceSpread / bestFloorPrice) * 100 : 0;

    let arbitrageOpportunity: any;

    // Need at least some profit before calculating fees
    if (grossProfitPercentage > 0.5 && priceSpread > 0) {
      const sellMarketplace = availableData.find(([_, data]) =>
        data.floorPrice === highestFloorPrice
      )![0] as OrdinalsMarketplace;

      // Calculate fees for the opportunity
      const fees = this.calculateFees(
        bestFloorPrice,
        highestFloorPrice,
        bestFloorMarketplace,
        sellMarketplace
      );

      // Calculate net profit AFTER fees
      const netProfit = priceSpread - fees.totalFees;
      const netProfitPercentage = (netProfit / bestFloorPrice) * 100;


      // CRITICAL: Only mark as opportunity if NET profit is positive
      if (netProfit > 0 && netProfitPercentage > 0.5) {
        // Calculate liquidity score
        const liquidityScore = this.calculateLiquidityScore(totalListedCount);

        // Calculate risk score
        const riskScore = this.calculateRiskScore(
          netProfitPercentage,
          liquidityScore,
          0 // Price age is 0 for fresh data
        );


        arbitrageOpportunity = {
          exists: true,
          buyMarketplace: bestFloorMarketplace,
          sellMarketplace,
          profit: priceSpread,
          profitPercentage: grossProfitPercentage,
          fees,
          netProfit,
          netProfitPercentage,
          confidence: 50, // Base confidence, will be refined in findArbitrageOpportunities
          riskScore,
          liquidityScore,
          lastUpdated: Date.now()
        };
      } else {
        arbitrageOpportunity = { exists: false };
      }
    } else {
      arbitrageOpportunity = { exists: false };
    }

    return {
      bestFloorPrice,
      bestFloorMarketplace,
      totalVolume24h,
      totalListedCount,
      priceSpread,
      arbitrageOpportunity
    };
  }

  private calculateArbitrageConfidence(collectionData: AggregatedCollectionData): number {
    let confidence = 50; // Base confidence

    // Increase confidence based on volume
    if (collectionData.consolidatedMetrics.totalVolume24h > 10) {
      confidence += 20;
    }

    // Increase confidence based on listing count
    if (collectionData.consolidatedMetrics.totalListedCount > 50) {
      confidence += 15;
    }

    // Increase confidence if collection is verified
    if (collectionData.collection.verified) {
      confidence += 10;
    }

    // Decrease confidence if price spread is too high (might indicate illiquidity)
    const spreadPercentage = collectionData.consolidatedMetrics.priceSpread /
      collectionData.consolidatedMetrics.bestFloorPrice * 100;

    if (spreadPercentage > 20) {
      confidence -= 20;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Calculate detailed fee breakdown for an arbitrage opportunity
   */
  private calculateFees(
    buyPrice: number,
    sellPrice: number,
    buyMarketplace: OrdinalsMarketplace,
    sellMarketplace: OrdinalsMarketplace
  ): FeeBreakdown {
    // Calculate marketplace fees
    const buyMarketplaceFee = buyPrice * MARKETPLACE_FEES[buyMarketplace];
    const sellMarketplaceFee = sellPrice * MARKETPLACE_FEES[sellMarketplace];

    // Estimate network fee (Bitcoin transaction fee)
    // Using default tx bytes from config (250 bytes @ ~50 sat/vB = ~0.0000125 BTC)
    const networkFee = (DEFAULT_CONFIG.ESTIMATED_TX_BYTES * 50) / 100000000;

    // Calculate platform fee (0.35%)
    const platformFee = (buyPrice + sellPrice) * PLATFORM_FEE_PERCENTAGE;

    // Total fees
    const totalFees = buyMarketplaceFee + sellMarketplaceFee + networkFee + platformFee;

    return {
      buyMarketplaceFee,
      sellMarketplaceFee,
      networkFee,
      platformFee,
      totalFees
    };
  }

  /**
   * Calculate liquidity score based on listed count
   */
  private calculateLiquidityScore(listedCount: number): number {
    // Score based on listing availability
    // 0-10 listings: low (0-30)
    // 10-50 listings: medium (30-70)
    // 50+ listings: high (70-100)

    if (listedCount >= 100) return 100;
    if (listedCount >= 50) return 70 + ((listedCount - 50) / 50) * 30;
    if (listedCount >= 10) return 30 + ((listedCount - 10) / 40) * 40;
    return Math.min(30, (listedCount / 10) * 30);
  }

  /**
   * Calculate risk score based on multiple factors
   */
  private calculateRiskScore(
    netProfitPercentage: number,
    liquidityScore: number,
    priceAge: number
  ): RiskScore {
    let riskPoints = 0;

    // Higher profit = lower risk (assuming legitimate opportunity)
    if (netProfitPercentage < 5) riskPoints += 2;
    else if (netProfitPercentage < 10) riskPoints += 1;

    // Lower liquidity = higher risk
    if (liquidityScore < 30) riskPoints += 2;
    else if (liquidityScore < 60) riskPoints += 1;

    // Older price data = higher risk
    if (priceAge > 45) riskPoints += 2;
    else if (priceAge > 30) riskPoints += 1;

    // Determine risk level
    if (riskPoints >= 4) return 'high';
    if (riskPoints >= 2) return 'medium';
    return 'low';
  }

  private async calculateInscriptionAnalytics(
    inscriptionId: string,
    listings: Array<{ price: number; marketplace: OrdinalsMarketplace }>
  ) {
    // Simplified analytics calculation
    const prices = listings.map(l => l.price);
    const avgPrice7d = prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0;
    
    return {
      avgPrice7d,
      priceChange24h: 0, // Would need historical data
      priceVolatility: 0, // Would need historical data
      liquidityScore: Math.min(listings.length * 20, 100),
      rarityScore: 50 // Would need rarity calculation
    };
  }

  private calculateMarketSentiment(collections: AggregatedCollectionData[]): 'bullish' | 'bearish' | 'neutral' {
    if (collections.length === 0) return 'neutral';

    // Use actual collection data to determine sentiment
    const volumeChanges = collections.map(c => {
      // Use real volume and floor price data when available
      if (c.volume24h > 0 && c.floorPrice > 0) {
        // Positive volume with stable/rising floor = bullish signal
        return c.volume24h > 10 ? 10 : 0;
      }
      return 0;
    });

    const avgVolumeChange = volumeChanges.reduce((sum, change) => sum + change, 0) / volumeChanges.length;

    if (avgVolumeChange > 5) return 'bullish';
    if (avgVolumeChange < -5) return 'bearish';
    return 'neutral';
  }

  private mergeCollections(collections: StandardizedCollection[]): StandardizedCollection[] {
    const merged = new Map<string, StandardizedCollection>();

    collections.forEach(collection => {
      const key = collection.name.toLowerCase().replace(/\s+/g, '');
      const existing = merged.get(key);

      if (!existing || collection.totalSupply > existing.totalSupply) {
        merged.set(key, collection);
      } else {
        // Merge data from multiple marketplaces
        existing.volume24h = Math.max(existing.volume24h, collection.volume24h);
        existing.holdersCount = Math.max(existing.holdersCount, collection.holdersCount);
        existing.listedCount += collection.listedCount;
      }
    });

    return Array.from(merged.values());
  }

  private applyCollectionFilters(collection: StandardizedCollection): boolean {
    const filters = this.config.filters;

    if (filters.minFloorPrice && collection.floorPrice < filters.minFloorPrice) {
      return false;
    }

    if (filters.maxFloorPrice && collection.floorPrice > filters.maxFloorPrice) {
      return false;
    }

    if (filters.minVolume24h && collection.volume24h < filters.minVolume24h) {
      return false;
    }

    if (filters.verified !== undefined && collection.verified !== filters.verified) {
      return false;
    }

    return true;
  }

  private convertInscriptionToStandardized(inscription: any, marketplace: OrdinalsMarketplace): StandardizedInscription {
    // Convert marketplace-specific format to standardized format
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
      marketplace
    };
  }

  private startPeriodicUpdates(): void {
    // Update market overview
    const overviewInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.getMarketOverview(true);
      }
    }, this.config.updateInterval * 2); // Update overview less frequently

    this.updateIntervals.set('market_overview', overviewInterval);

    // Update tracked collections
    const collectionsInterval = setInterval(async () => {
      if (this.isRunning) {
        for (const collectionId of this.config.collectionsToTrack) {
          await this.getAggregatedCollection(collectionId, true);
        }
      }
    }, this.config.updateInterval);

    this.updateIntervals.set('collections', collectionsInterval);
  }

  private async performInitialDataLoad(): Promise<void> {

    try {
      // Load top collections
      await this.getTopCollections(50);

      // Load market overview
      await this.getMarketOverview();

    } catch (error) {
      console.error('Error during initial data load:', error);
    }
  }

  private async initializeWebSockets(): Promise<void> {
    // Placeholder for WebSocket implementation
    // Would connect to marketplace WebSocket feeds for real-time updates
  }

  private async closeWebSockets(): Promise<void> {
    // Placeholder for WebSocket cleanup
  }

  private startTargetTracking(type: 'collection' | 'inscription', target: string): void {
    const intervalKey = `${type}_${target}`;
    
    if (this.updateIntervals.has(intervalKey)) {
      return; // Already tracking
    }

    const interval = setInterval(async () => {
      if (this.isRunning) {
        try {
          let data;
          if (type === 'collection') {
            data = await this.getAggregatedCollection(target, true);
          } else {
            data = await this.getAggregatedInscription(target, true);
          }

          // Notify subscribers
          this.notifySubscribers(type, target, data);
        } catch (error) {
          console.error(`Error tracking ${type} ${target}:`, error);
        }
      }
    }, this.config.updateInterval);

    this.updateIntervals.set(intervalKey, interval);
  }

  private notifySubscribers(type: string, target: string | undefined, data: any): void {
    this.subscriptions.forEach(subscription => {
      if (subscription.active && subscription.type === type) {
        if (!target || subscription.target === target) {
          try {
            subscription.callback(data);
          } catch (error) {
            console.error(`Error in subscription callback:`, error);
          }
        }
      }
    });
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl?: number): void {
    // Clean cache if it's getting too large
    if (this.cache.size >= this.config.cacheSettings.maxSize) {
      this.cleanCache();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheSettings.ttl
    });
  }

  private cleanCache(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.cache.forEach((value, key) => {
      if (now - value.timestamp > value.ttl) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => this.cache.delete(key));

    // If still too large, remove oldest entries
    if (this.cache.size >= this.config.cacheSettings.maxSize) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, Math.floor(this.config.cacheSettings.maxSize * 0.2));
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  private getEmptyMarketOverview(): MarketOverview {
    return {
      totalMarketCap: 0,
      totalVolume24h: 0,
      totalSales24h: 0,
      totalListings: 0,
      averageFloorPrice: 0,
      marketSentiment: 'neutral',
      topCollections: [],
      trendingCollections: [],
      arbitrageOpportunities: [],
      lastUpdated: Date.now()
    };
  }
}

// Singleton instance
export const ordinalsDataAggregator = new OrdinalsDataAggregator();