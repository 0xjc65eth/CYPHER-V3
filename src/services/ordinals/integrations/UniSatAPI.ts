/**
 * UniSat Collection API Integration
 * Comprehensive Bitcoin Ordinals wallet and marketplace API
 */

export interface UniSatCollection {
  collectionId: string;
  name: string;
  symbol: string;
  description: string;
  icon: string;
  supply: number;
  mintHeight: number;
  holderTotal: number;
  inscriptionNumberStart: number;
  inscriptionNumberEnd: number;
  website?: string;
  twitter?: string;
  discord?: string;
  floorPrice: number;
  totalVolume: number;
  h24Volume: number;
  h24VolumeChange: number;
  floorPriceChange: number;
  listed: number;
  listedRatio: number;
  validListedCount: number;
  avgPrice24h: number;
  saleCount24h: number;
  royalty: number;
  createTime: number;
  updateTime: number;
}

export interface UniSatInscription {
  inscriptionId: string;
  inscriptionNumber: number;
  isBRC20: boolean;
  moved: number;
  offset: number;
  address: string;
  output: string;
  outputValue: number;
  preview: string;
  content: string;
  contentLength: number;
  contentType: string;
  contentBody: string;
  timestamp: number;
  genesisHeight: number;
  genesisTransaction: string;
  location: string;
  utxo: {
    txid: string;
    vout: number;
    satoshi: number;
    scriptType: string;
    scriptPk: string;
    codeType: number;
    address: string;
    height: number;
    idx: number;
    isOpInRBF: boolean;
    inscriptions: Array<{
      inscriptionId: string;
      inscriptionNumber: number;
      offset: number;
      moved: number;
    }>;
  };
  collection?: {
    collectionId: string;
    name: string;
    symbol: string;
  };
  brc20?: {
    tick: string;
    op: string;
    amt?: string;
    lim?: string;
    max?: string;
    dec?: number;
  };
}

export interface UniSatBRC20Token {
  tick: string;
  max: string;
  lim: string;
  dec: number;
  inscriptionId: string;
  inscriptionNumber: number;
  self: boolean;
  completedMinting: boolean;
  remainingSupply: string;
  totalMinted: string;
  mintProgress: number;
  holders: number;
  deployer: string;
  deployHeight: number;
  deployBlocktime: number;
  transferableCount: number;
  volume24h: number;
  volumeChange24h: number;
  floorPrice: number;
  floorPriceChange24h: number;
  marketCap: number;
  marketCapChange24h: number;
}

export interface UniSatAddressInfo {
  address: string;
  btcSatoshi: number;
  btcPendingSatoshi: number;
  btcDustSatoshi: number;
  utxoCount: number;
  brc20Count: number;
  inscriptionCount: number;
  appSummary: {
    totalSats: number;
    totalInscription: number;
    totalBrc20: number;
  };
}

export interface UniSatTransaction {
  txid: string;
  blockHeight: number;
  blocktime: number;
  fee: number;
  status: 1 | 0; // 1 confirmed, 0 unconfirmed
  inscriptions: Array<{
    action: 'inscribe' | 'transfer';
    inscriptionId: string;
    inscriptionNumber: number;
    from: string;
    to: string;
    oldSatpoint: string;
    newSatpoint: string;
  }>;
  brc20s: Array<{
    action: 'deploy' | 'mint' | 'transfer';
    tick: string;
    from: string;
    to: string;
    amount: string;
    inscriptionId: string;
    inscriptionNumber: number;
  }>;
}

export interface UniSatMarketListing {
  inscriptionId: string;
  inscriptionNumber: number;
  price: number;
  seller: string;
  listedAt: number;
  utxo: {
    txid: string;
    vout: number;
    satoshi: number;
  };
  collection?: {
    collectionId: string;
    name: string;
    symbol: string;
  };
}

export class UniSatAPI {
  private baseUrl = 'https://open-api.unisat.io';
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private rateLimiter: Map<string, number> = new Map();
  private readonly RATE_LIMIT_MS = 1000; // 1 second between requests
  private readonly DEFAULT_TTL = 60000; // 1 minute cache
  private readonly API_KEY: string;

  constructor(apiKey?: string) {
    this.API_KEY = apiKey || process.env.UNISAT_API_KEY || '';
  }

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
        'Authorization': `Bearer ${this.API_KEY}`,
        'User-Agent': 'CYPHER-ORDi-Future-V3',
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`UniSat API error: ${response.status} ${response.statusText}`);
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
    cursor: number = 0,
    size: number = 50,
    sort: 'volume' | 'floorPrice' | 'listed' | 'holders' = 'volume'
  ): Promise<{ list: UniSatCollection[]; total: number }> {
    const cacheKey = `collections-${cursor}-${size}-${sort}`;
    const cached = this.getCached<{ list: UniSatCollection[]; total: number }>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        cursor: cursor.toString(),
        size: size.toString(),
        sort
      });

      const response = await this.rateLimitedFetch(
        `${this.baseUrl}/v3/market/collection/list?${params.toString()}`
      );
      const data = await response.json();
      
      if (data.code === 0) {
        const result = {
          list: data.data?.list || [],
          total: data.data?.total || 0
        };
        this.setCache(cacheKey, result, 120000); // 2 minute cache
        return result;
      }
      
      throw new Error(data.msg || 'Unknown error');
    } catch (error) {
      console.error('UniSat getCollections error:', error);
      return { list: [], total: 0 };
    }
  }

  async getCollection(collectionId: string): Promise<UniSatCollection | null> {
    const cacheKey = `collection-${collectionId}`;
    const cached = this.getCached<UniSatCollection>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.rateLimitedFetch(
        `${this.baseUrl}/v3/market/collection/info?collectionId=${collectionId}`
      );
      const data = await response.json();
      
      if (data.code === 0) {
        this.setCache(cacheKey, data.data, 60000); // 1 minute cache
        return data.data;
      }
      
      throw new Error(data.msg || 'Unknown error');
    } catch (error) {
      console.error(`UniSat getCollection error for ${collectionId}:`, error);
      return null;
    }
  }

  // Inscriptions API
  async getInscriptions(
    cursor: number = 0,
    size: number = 50,
    order: 'asc' | 'desc' = 'desc'
  ): Promise<{ list: UniSatInscription[]; total: number }> {
    const cacheKey = `inscriptions-${cursor}-${size}-${order}`;
    const cached = this.getCached<{ list: UniSatInscription[]; total: number }>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        cursor: cursor.toString(),
        size: size.toString(),
        order
      });

      const response = await this.rateLimitedFetch(
        `${this.baseUrl}/v3/inscriptions?${params.toString()}`
      );
      const data = await response.json();
      
      if (data.code === 0) {
        const result = {
          list: data.data || [],
          total: data.data?.length || 0
        };
        this.setCache(cacheKey, result, 30000); // 30 second cache
        return result;
      }
      
      throw new Error(data.msg || 'Unknown error');
    } catch (error) {
      console.error('UniSat getInscriptions error:', error);
      return { list: [], total: 0 };
    }
  }

  async getInscription(inscriptionId: string): Promise<UniSatInscription | null> {
    const cacheKey = `inscription-${inscriptionId}`;
    const cached = this.getCached<UniSatInscription>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.rateLimitedFetch(
        `${this.baseUrl}/v3/inscription/info?inscriptionId=${inscriptionId}`
      );
      const data = await response.json();
      
      if (data.code === 0) {
        this.setCache(cacheKey, data.data, 60000); // 1 minute cache
        return data.data;
      }
      
      throw new Error(data.msg || 'Unknown error');
    } catch (error) {
      console.error(`UniSat getInscription error for ${inscriptionId}:`, error);
      return null;
    }
  }

  async getCollectionInscriptions(
    collectionId: string,
    cursor: number = 0,
    size: number = 50,
    order: 'number' | 'price' = 'number',
    direction: 'asc' | 'desc' = 'asc'
  ): Promise<{ list: UniSatInscription[]; total: number }> {
    const cacheKey = `collection-inscriptions-${collectionId}-${cursor}-${size}-${order}-${direction}`;
    const cached = this.getCached<{ list: UniSatInscription[]; total: number }>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        collectionId,
        cursor: cursor.toString(),
        size: size.toString(),
        order,
        direction
      });

      const response = await this.rateLimitedFetch(
        `${this.baseUrl}/v3/market/collection/inscriptions?${params.toString()}`
      );
      const data = await response.json();
      
      if (data.code === 0) {
        const result = {
          list: data.data?.list || [],
          total: data.data?.total || 0
        };
        this.setCache(cacheKey, result, 60000); // 1 minute cache
        return result;
      }
      
      throw new Error(data.msg || 'Unknown error');
    } catch (error) {
      console.error(`UniSat getCollectionInscriptions error for ${collectionId}:`, error);
      return { list: [], total: 0 };
    }
  }

  // BRC-20 API
  async getBRC20Tokens(
    cursor: number = 0,
    size: number = 50,
    sort: 'marketCap' | 'volume' | 'holders' = 'marketCap'
  ): Promise<{ list: UniSatBRC20Token[]; total: number }> {
    const cacheKey = `brc20-tokens-${cursor}-${size}-${sort}`;
    const cached = this.getCached<{ list: UniSatBRC20Token[]; total: number }>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        cursor: cursor.toString(),
        size: size.toString(),
        sort
      });

      const response = await this.rateLimitedFetch(
        `${this.baseUrl}/v3/market/brc20/list?${params.toString()}`
      );
      const data = await response.json();
      
      if (data.code === 0) {
        const result = {
          list: data.data?.list || [],
          total: data.data?.total || 0
        };
        this.setCache(cacheKey, result, 120000); // 2 minute cache
        return result;
      }
      
      throw new Error(data.msg || 'Unknown error');
    } catch (error) {
      console.error('UniSat getBRC20Tokens error:', error);
      return { list: [], total: 0 };
    }
  }

  async getBRC20Token(tick: string): Promise<UniSatBRC20Token | null> {
    const cacheKey = `brc20-token-${tick}`;
    const cached = this.getCached<UniSatBRC20Token>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.rateLimitedFetch(
        `${this.baseUrl}/v3/market/brc20/info?tick=${tick}`
      );
      const data = await response.json();
      
      if (data.code === 0) {
        this.setCache(cacheKey, data.data, 60000); // 1 minute cache
        return data.data;
      }
      
      throw new Error(data.msg || 'Unknown error');
    } catch (error) {
      console.error(`UniSat getBRC20Token error for ${tick}:`, error);
      return null;
    }
  }

  // Address API
  async getAddressInfo(address: string): Promise<UniSatAddressInfo | null> {
    const cacheKey = `address-info-${address}`;
    const cached = this.getCached<UniSatAddressInfo>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.rateLimitedFetch(
        `${this.baseUrl}/v3/address/info?address=${address}`
      );
      const data = await response.json();
      
      if (data.code === 0) {
        this.setCache(cacheKey, data.data, 30000); // 30 second cache
        return data.data;
      }
      
      throw new Error(data.msg || 'Unknown error');
    } catch (error) {
      console.error(`UniSat getAddressInfo error for ${address}:`, error);
      return null;
    }
  }

  async getAddressInscriptions(
    address: string,
    cursor: number = 0,
    size: number = 50
  ): Promise<{ list: UniSatInscription[]; total: number }> {
    const cacheKey = `address-inscriptions-${address}-${cursor}-${size}`;
    const cached = this.getCached<{ list: UniSatInscription[]; total: number }>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        address,
        cursor: cursor.toString(),
        size: size.toString()
      });

      const response = await this.rateLimitedFetch(
        `${this.baseUrl}/v3/address/inscriptions?${params.toString()}`
      );
      const data = await response.json();
      
      if (data.code === 0) {
        const result = {
          list: data.data || [],
          total: data.data?.length || 0
        };
        this.setCache(cacheKey, result, 60000); // 1 minute cache
        return result;
      }
      
      throw new Error(data.msg || 'Unknown error');
    } catch (error) {
      console.error(`UniSat getAddressInscriptions error for ${address}:`, error);
      return { list: [], total: 0 };
    }
  }

  async getAddressBRC20(
    address: string,
    cursor: number = 0,
    size: number = 50
  ): Promise<{ list: any[]; total: number }> {
    const cacheKey = `address-brc20-${address}-${cursor}-${size}`;
    const cached = this.getCached<{ list: any[]; total: number }>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        address,
        cursor: cursor.toString(),
        size: size.toString()
      });

      const response = await this.rateLimitedFetch(
        `${this.baseUrl}/v3/address/brc20?${params.toString()}`
      );
      const data = await response.json();
      
      if (data.code === 0) {
        const result = {
          list: data.data || [],
          total: data.data?.length || 0
        };
        this.setCache(cacheKey, result, 60000); // 1 minute cache
        return result;
      }
      
      throw new Error(data.msg || 'Unknown error');
    } catch (error) {
      console.error(`UniSat getAddressBRC20 error for ${address}:`, error);
      return { list: [], total: 0 };
    }
  }

  // Market API
  async getMarketListings(
    collectionId?: string,
    cursor: number = 0,
    size: number = 50,
    order: 'price' | 'listedAt' = 'price',
    direction: 'asc' | 'desc' = 'asc'
  ): Promise<{ list: UniSatMarketListing[]; total: number }> {
    const cacheKey = `market-listings-${collectionId || 'all'}-${cursor}-${size}-${order}-${direction}`;
    const cached = this.getCached<{ list: UniSatMarketListing[]; total: number }>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        cursor: cursor.toString(),
        size: size.toString(),
        order,
        direction
      });

      if (collectionId) params.append('collectionId', collectionId);

      const response = await this.rateLimitedFetch(
        `${this.baseUrl}/v3/market/inscriptions?${params.toString()}`
      );
      const data = await response.json();
      
      if (data.code === 0) {
        const result = {
          list: data.data?.list || [],
          total: data.data?.total || 0
        };
        this.setCache(cacheKey, result, 30000); // 30 second cache
        return result;
      }
      
      throw new Error(data.msg || 'Unknown error');
    } catch (error) {
      console.error('UniSat getMarketListings error:', error);
      return { list: [], total: 0 };
    }
  }

  // Utility methods
  async searchInscriptions(
    query: string,
    cursor: number = 0,
    size: number = 20
  ): Promise<{ list: UniSatInscription[]; total: number }> {
    try {
      // UniSat doesn't have a direct search API, so we'll search by inscription number
      if (/^\d+$/.test(query)) {
        const inscription = await this.getInscription(query);
        return inscription ? { list: [inscription], total: 1 } : { list: [], total: 0 };
      }
      
      // For other queries, return empty results
      return { list: [], total: 0 };
    } catch (error) {
      console.error('UniSat searchInscriptions error:', error);
      return { list: [], total: 0 };
    }
  }

  // No mock data - API errors return empty results
}

// Singleton instance
export const uniSatAPI = new UniSatAPI();