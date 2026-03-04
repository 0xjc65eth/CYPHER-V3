/**
 * OKX Wallet WaaS Ordinals API Integration
 * Advanced Bitcoin NFT marketplace with comprehensive trading features
 */

export interface OKXCollection {
  collectionId: string;
  symbol: string;
  name: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  websiteUrl?: string;
  twitterUrl?: string;
  discordUrl?: string;
  totalSupply: number;
  ownerCount: number;
  floorPrice: string;
  floorPriceSymbol: string;
  royaltyFee: string;
  listedRate: string;
  volume24h: string;
  volume7d: string;
  volume30d: string;
  volumeTotal: string;
  change24h: string;
  change7d: string;
  change30d: string;
  salesCount24h: number;
  avgPrice24h: string;
  marketCap: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OKXInscription {
  inscriptionId: string;
  inscriptionNumber: string;
  address: string;
  outputValue: string;
  preview: string;
  content: string;
  contentLength: string;
  contentType: string;
  timestamp: string;
  genesisHeight: string;
  genesisTransaction: string;
  location: string;
  offset: string;
  satoshi: string;
  contentBody: string;
  utxo: {
    txId: string;
    index: number;
    satoshi: string;
    scriptPk: string;
    addressType: number;
    address: string;
    height: number;
    isOpInRBF: boolean;
  };
  collectionInfo?: {
    collectionId: string;
    name: string;
    logoUrl: string;
  };
  rarityInfo?: {
    rank: number;
    score: number;
    rarity: string;
    totalSupply: number;
  };
  listingInfo?: {
    price: string;
    priceSymbol: string;
    listedAt: string;
    seller: string;
    marketplace: string;
  };
  traitInfo?: Array<{
    traitType: string;
    value: string;
    rarity: number;
    frequency: number;
  }>;
}

export interface OKXMarketActivity {
  activityId: string;
  type: 'MINT' | 'LIST' | 'BUY' | 'CANCEL_LIST' | 'TRANSFER';
  inscriptionId: string;
  inscriptionNumber: string;
  fromAddress: string;
  toAddress: string;
  price?: string;
  priceSymbol?: string;
  quantity: string;
  timestamp: string;
  txHash: string;
  blockHeight: string;
  marketplace?: string;
  collectionInfo?: {
    collectionId: string;
    name: string;
  };
}

export interface OKXMarketStats {
  totalVolume: string;
  totalSales: number;
  totalListings: number;
  avgPrice: string;
  floorPrice: string;
  marketCap: string;
  ownerCount: number;
  itemCount: number;
  listedCount: number;
  volume24h: string;
  volume7d: string;
  volume30d: string;
  sales24h: number;
  sales7d: number;
  sales30d: number;
  change24h: string;
  change7d: string;
  change30d: string;
}

export interface OKXTrendingCollection {
  collectionId: string;
  name: string;
  logoUrl: string;
  floorPrice: string;
  change24h: string;
  volume24h: string;
  rank: number;
  trendingType: 'VOLUME' | 'SALES' | 'FLOOR_PRICE' | 'NEW';
}

export class OKXOrdinalsAPI {
  private baseUrl = 'https://www.okx.com/api/v5/mktdata/nft';
  private ordinalsUrl = 'https://www.okx.com/api/v5/mktdata/nft/ordinals';
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private rateLimiter: Map<string, number> = new Map();
  private readonly RATE_LIMIT_MS = 500; // 500ms between requests (OKX allows higher frequency)
  private readonly DEFAULT_TTL = 30000; // 30 seconds cache

  private async rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
    const now = Date.now();
    const lastRequest = this.rateLimiter.get('global') || 0;
    const timeSinceLastRequest = now - lastRequest;

    if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_MS - timeSinceLastRequest));
    }

    this.rateLimiter.set('global', Date.now());
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'CYPHER-ORDi-Future-V3',
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`OKX API error: ${response.status} ${response.statusText}`);
    }

    return response;
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

  // Collections API
  async getCollections(
    limit: number = 50,
    cursor?: string,
    sortBy: 'volume24h' | 'floorPrice' | 'createdAt' = 'volume24h'
  ): Promise<{ collections: OKXCollection[]; nextCursor?: string }> {
    const cacheKey = `collections-${limit}-${cursor || 'start'}-${sortBy}`;
    const cached = this.getCached<{ collections: OKXCollection[]; nextCursor?: string }>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        sortBy,
        blockchain: 'BITCOIN'
      });

      if (cursor) params.append('cursor', cursor);

      const response = await this.rateLimitedFetch(
        `${this.ordinalsUrl}/collections?${params.toString()}`
      );
      const data = await response.json();
      
      const result = {
        collections: data.data?.collections || [],
        nextCursor: data.data?.nextCursor
      };
      
      this.setCache(cacheKey, result, 120000); // 2 minute cache
      return result;
    } catch (error) {
      console.error('OKX getCollections error:', error);
      return { collections: [] };
    }
  }

  async getCollection(collectionId: string): Promise<OKXCollection | null> {
    const cacheKey = `collection-${collectionId}`;
    const cached = this.getCached<OKXCollection>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.rateLimitedFetch(
        `${this.ordinalsUrl}/collections/${collectionId}`
      );
      const data = await response.json();
      
      this.setCache(cacheKey, data.data, 60000); // 1 minute cache
      return data.data;
    } catch (error) {
      console.error(`OKX getCollection error for ${collectionId}:`, error);
      return null;
    }
  }

  async getTrendingCollections(
    timeframe: '24h' | '7d' | '30d' = '24h',
    type: 'VOLUME' | 'SALES' | 'FLOOR_PRICE' | 'NEW' = 'VOLUME',
    limit: number = 20
  ): Promise<OKXTrendingCollection[]> {
    const cacheKey = `trending-${timeframe}-${type}-${limit}`;
    const cached = this.getCached<OKXTrendingCollection[]>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        timeframe,
        type,
        limit: limit.toString(),
        blockchain: 'BITCOIN'
      });

      const response = await this.rateLimitedFetch(
        `${this.ordinalsUrl}/trending?${params.toString()}`
      );
      const data = await response.json();
      
      this.setCache(cacheKey, data.data?.collections || [], 180000); // 3 minute cache
      return data.data?.collections || [];
    } catch (error) {
      console.error('OKX getTrendingCollections error:', error);
      return [];
    }
  }

  // Inscriptions API
  async getInscriptions(
    collectionId?: string,
    traits?: Record<string, string[]>,
    priceRange?: { min: string; max: string },
    rarityRange?: { min: number; max: number },
    sortBy: 'priceAsc' | 'priceDesc' | 'rarityAsc' | 'rarityDesc' | 'newest' = 'priceAsc',
    limit: number = 50,
    cursor?: string
  ): Promise<{ inscriptions: OKXInscription[]; nextCursor?: string }> {
    const cacheKey = `inscriptions-${collectionId || 'all'}-${JSON.stringify(traits)}-${JSON.stringify(priceRange)}-${JSON.stringify(rarityRange)}-${sortBy}-${limit}-${cursor || 'start'}`;
    const cached = this.getCached<{ inscriptions: OKXInscription[]; nextCursor?: string }>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        sortBy,
        blockchain: 'BITCOIN'
      });

      if (cursor) params.append('cursor', cursor);
      if (collectionId) params.append('collectionId', collectionId);
      
      if (priceRange) {
        params.append('minPrice', priceRange.min);
        params.append('maxPrice', priceRange.max);
      }
      
      if (rarityRange) {
        params.append('minRarity', rarityRange.min.toString());
        params.append('maxRarity', rarityRange.max.toString());
      }

      if (traits) {
        Object.entries(traits).forEach(([traitType, values]) => {
          values.forEach(value => {
            params.append(`traits[${traitType}]`, value);
          });
        });
      }

      const response = await this.rateLimitedFetch(
        `${this.ordinalsUrl}/inscriptions?${params.toString()}`
      );
      const data = await response.json();
      
      const result = {
        inscriptions: data.data?.inscriptions || [],
        nextCursor: data.data?.nextCursor
      };
      
      this.setCache(cacheKey, result, 30000); // 30 second cache
      return result;
    } catch (error) {
      console.error('OKX getInscriptions error:', error);
      return { inscriptions: [] };
    }
  }

  async getInscription(inscriptionId: string): Promise<OKXInscription | null> {
    const cacheKey = `inscription-${inscriptionId}`;
    const cached = this.getCached<OKXInscription>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.rateLimitedFetch(
        `${this.ordinalsUrl}/inscriptions/${inscriptionId}`
      );
      const data = await response.json();
      
      this.setCache(cacheKey, data.data, 60000); // 1 minute cache
      return data.data;
    } catch (error) {
      console.error(`OKX getInscription error for ${inscriptionId}:`, error);
      return null;
    }
  }

  // Market Activity API
  async getCollectionActivity(
    collectionId: string,
    types?: Array<'MINT' | 'LIST' | 'BUY' | 'CANCEL_LIST' | 'TRANSFER'>,
    limit: number = 100,
    cursor?: string
  ): Promise<{ activities: OKXMarketActivity[]; nextCursor?: string }> {
    const cacheKey = `activity-${collectionId}-${types?.join(',') || 'all'}-${limit}-${cursor || 'start'}`;
    const cached = this.getCached<{ activities: OKXMarketActivity[]; nextCursor?: string }>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        collectionId,
        limit: limit.toString(),
        blockchain: 'BITCOIN'
      });

      if (cursor) params.append('cursor', cursor);
      if (types && types.length > 0) {
        types.forEach(type => params.append('type', type));
      }

      const response = await this.rateLimitedFetch(
        `${this.ordinalsUrl}/activities?${params.toString()}`
      );
      const data = await response.json();
      
      const result = {
        activities: data.data?.activities || [],
        nextCursor: data.data?.nextCursor
      };
      
      this.setCache(cacheKey, result, 15000); // 15 second cache for activities
      return result;
    } catch (error) {
      console.error(`OKX getCollectionActivity error for ${collectionId}:`, error);
      return { activities: [] };
    }
  }

  async getInscriptionActivity(inscriptionId: string): Promise<OKXMarketActivity[]> {
    const cacheKey = `inscription-activity-${inscriptionId}`;
    const cached = this.getCached<OKXMarketActivity[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.rateLimitedFetch(
        `${this.ordinalsUrl}/inscriptions/${inscriptionId}/activities`
      );
      const data = await response.json();
      
      this.setCache(cacheKey, data.data?.activities || [], 30000); // 30 second cache
      return data.data?.activities || [];
    } catch (error) {
      console.error(`OKX getInscriptionActivity error for ${inscriptionId}:`, error);
      return [];
    }
  }

  // Market Statistics API
  async getMarketStats(timeframe: '24h' | '7d' | '30d' | 'all' = '24h'): Promise<OKXMarketStats | null> {
    const cacheKey = `market-stats-${timeframe}`;
    const cached = this.getCached<OKXMarketStats>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.rateLimitedFetch(
        `${this.ordinalsUrl}/stats?timeframe=${timeframe}&blockchain=BITCOIN`
      );
      const data = await response.json();
      
      this.setCache(cacheKey, data.data, 60000); // 1 minute cache
      return data.data;
    } catch (error) {
      console.error('OKX getMarketStats error:', error);
      return null;
    }
  }

  async getCollectionStats(collectionId: string, timeframe: '24h' | '7d' | '30d' | 'all' = 'all'): Promise<OKXMarketStats | null> {
    const cacheKey = `collection-stats-${collectionId}-${timeframe}`;
    const cached = this.getCached<OKXMarketStats>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.rateLimitedFetch(
        `${this.ordinalsUrl}/collections/${collectionId}/stats?timeframe=${timeframe}`
      );
      const data = await response.json();
      
      this.setCache(cacheKey, data.data, 60000); // 1 minute cache
      return data.data;
    } catch (error) {
      console.error(`OKX getCollectionStats error for ${collectionId}:`, error);
      return null;
    }
  }

  // Advanced Analytics
  async getFloorPriceHistory(
    collectionId: string,
    timeframe: '24h' | '7d' | '30d' | '90d' = '7d',
    interval: '1h' | '4h' | '1d' = '1h'
  ): Promise<Array<{ timestamp: number; price: string; volume: string }>> {
    const cacheKey = `floor-history-${collectionId}-${timeframe}-${interval}`;
    const cached = this.getCached<Array<{ timestamp: number; price: string; volume: string }>>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        timeframe,
        interval,
        collectionId
      });

      const response = await this.rateLimitedFetch(
        `${this.ordinalsUrl}/collections/${collectionId}/floor-history?${params.toString()}`
      );
      const data = await response.json();
      
      this.setCache(cacheKey, data.data?.history || [], 300000); // 5 minute cache
      return data.data?.history || [];
    } catch (error) {
      console.error(`OKX getFloorPriceHistory error for ${collectionId}:`, error);
      return [];
    }
  }

  async getTraitRarities(collectionId: string): Promise<Record<string, Record<string, { count: number; rarity: number }>>> {
    const cacheKey = `trait-rarities-${collectionId}`;
    const cached = this.getCached<Record<string, Record<string, { count: number; rarity: number }>>>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.rateLimitedFetch(
        `${this.ordinalsUrl}/collections/${collectionId}/traits`
      );
      const data = await response.json();
      
      this.setCache(cacheKey, data.data?.traits || {}, 600000); // 10 minute cache
      return data.data?.traits || {};
    } catch (error) {
      console.error(`OKX getTraitRarities error for ${collectionId}:`, error);
      return {};
    }
  }

  // Utility methods
  async searchCollections(query: string): Promise<OKXCollection[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: '50',
        blockchain: 'BITCOIN'
      });

      const response = await this.rateLimitedFetch(
        `${this.ordinalsUrl}/search/collections?${params.toString()}`
      );
      const data = await response.json();
      
      return data.data?.collections || [];
    } catch (error) {
      console.error('OKX searchCollections error:', error);
      return [];
    }
  }

  // No mock data - API errors return empty results
}

// Singleton instance
export const okxOrdinalsAPI = new OKXOrdinalsAPI();