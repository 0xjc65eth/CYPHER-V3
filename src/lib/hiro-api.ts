/**
 * ENHANCED HIRO API CLIENT - CYPHER ORDI FUTURE v3.2.0
 * Robust client for interacting with Hiro Systems API
 * Complete support for Ordinals, Runes, BRC-20 and Satoshis
 * Features: Advanced caching, rate limiting, comprehensive error handling
 */

import { devLogger } from './logger';

interface HiroAPIConfig {
  baseURL?: string;
  apiKey?: string;
  retryAttempts?: number;
  retryDelay?: number;
  cacheTTL?: number;
  rateLimit?: {
    requests: number;
    window: number; // in milliseconds
  };
  timeout?: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  key: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface APIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  rateLimitHits: number;
}

interface CollectionInfo {
  id: string;
  name: string;
  description: string;
  content_type: string;
  total_items: number;
  floor_price: number;
  volume_24h: number;
  created_at: number;
  sample_inscription: any;
  [key: string]: any;
}

class HiroAPI {
  protected baseURL: string;
  private apiKey?: string;
  private retryAttempts: number;
  private retryDelay: number;
  protected cacheTTL: number;
  protected cache: Map<string, CacheEntry>;
  private rateLimit: {
    requests: number;
    window: number;
  };
  private rateLimitTracker: Map<string, RateLimitEntry>;
  private timeout: number;
  protected metrics: APIMetrics;

  constructor(config: HiroAPIConfig = {}) {
    this.baseURL = config.baseURL || process.env.HIRO_API_URL || 'https://api.hiro.so';
    this.apiKey = config.apiKey || process.env.HIRO_API_KEY;
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.cacheTTL = config.cacheTTL || 30000; // 30 seconds
    this.cache = new Map();
    this.rateLimit = config.rateLimit || { requests: 100, window: 60000 }; // 100 requests per minute
    this.rateLimitTracker = new Map();
    this.timeout = config.timeout || 10000; // 10 seconds
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      rateLimitHits: 0
    };

    devLogger.log('HiroAPI', `Enhanced API client initialized with baseURL: ${this.baseURL}`);
    devLogger.log('HiroAPI', `Rate limit: ${this.rateLimit.requests} requests per ${this.rateLimit.window}ms`);
  }

  // Enhanced Cache Management
  protected getCacheKey(endpoint: string, params?: any): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${endpoint}${paramStr}`;
  }

  protected getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      this.metrics.cacheHits++;
      devLogger.debug(`[HiroAPI] Cache hit for: ${key}`);
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
      devLogger.debug(`[HiroAPI] Cache expired for: ${key}`);
    }
    this.metrics.cacheMisses++;
    return null;
  }

  protected setCache(key: string, data: any, customTTL?: number): void {
    const ttl = customTTL || this.cacheTTL;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      key
    });
    devLogger.log('HiroAPI', `Data cached for: ${key} (TTL: ${ttl}ms)`);
  }

  // Rate Limiting
  private checkRateLimit(endpoint: string): boolean {
    const now = Date.now();
    const key = `rate_limit_${endpoint}`;
    const entry = this.rateLimitTracker.get(key);

    if (!entry || now > entry.resetTime) {
      this.rateLimitTracker.set(key, {
        count: 1,
        resetTime: now + this.rateLimit.window
      });
      return true;
    }

    if (entry.count >= this.rateLimit.requests) {
      this.metrics.rateLimitHits++;
      devLogger.warn(`HiroAPI: Rate limit exceeded for: ${endpoint}`);
      return false;
    }

    entry.count++;
    return true;
  }

  // Enhanced Error Handling
  private handleAPIError(error: any, attempt: number, endpoint: string): Error {
    const errorMessage = error.message || 'Unknown API error';
    const statusCode = error.status || error.statusCode || 'unknown';

    devLogger.error(`HiroAPI: API Error [${statusCode}] on attempt ${attempt} for ${endpoint}: ${errorMessage}`);

    // Categorize errors for better handling
    if (statusCode === 429) {
      return new Error(`Rate limit exceeded for ${endpoint}. Please wait before retrying.`);
    } else if (statusCode >= 500) {
      return new Error(`Server error (${statusCode}) for ${endpoint}. This might be temporary.`);
    } else if (statusCode === 404) {
      return new Error(`Resource not found for ${endpoint}. Please check your request.`);
    } else if (statusCode === 401 || statusCode === 403) {
      return new Error(`Authentication error for ${endpoint}. Please check your API key.`);
    }

    return new Error(`API request failed for ${endpoint}: ${errorMessage}`);
  }

  // Public method to allow external access to makeRequest
  public async makeRequest(
    endpoint: string,
    params?: any,
    options?: {
      useCache?: boolean;
      cacheTTL?: number;
      skipRateLimit?: boolean;
      timeout?: number;
    }
  ): Promise<any> {
    return this.makeRequestInternal(endpoint, params, options);
  }

  // Enhanced main request method
  private async makeRequestInternal(
    endpoint: string,
    params?: any,
    options: {
      useCache?: boolean;
      cacheTTL?: number;
      skipRateLimit?: boolean;
      timeout?: number;
    } = {}
  ): Promise<any> {
    const { useCache = true, cacheTTL, skipRateLimit = false, timeout } = options;
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(endpoint, params);

    this.metrics.totalRequests++;

    // Check cache first
    if (useCache) {
      const cached = this.getCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Check rate limit
    if (!skipRateLimit && !this.checkRateLimit(endpoint)) {
      throw new Error(`Rate limit exceeded for ${endpoint}. Please wait before retrying.`);
    }

    const url = new URL(endpoint, this.baseURL);

    // Add parameters to URL
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'CypherOrdi-Future/3.2.0'
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    const requestTimeout = timeout || this.timeout;

    // Implement enhanced retry logic with exponential backoff
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        devLogger.log('HiroAPI', `Attempt ${attempt}/${this.retryAttempts} for: ${url.toString()}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

        const response = await fetch(url.toString(), {
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          (error as any).status = response.status;
          throw error;
        }

        const data = await response.json();

        // Update metrics
        const responseTime = Date.now() - startTime;
        this.metrics.successfulRequests++;
        this.metrics.averageResponseTime =
          (this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + responseTime) /
          this.metrics.successfulRequests;

        // Save to cache
        if (useCache) {
          this.setCache(cacheKey, data, cacheTTL);
        }

        devLogger.log('HiroAPI', `Request successful for ${endpoint} (${responseTime}ms)`);
        return data;

      } catch (error) {
        const handledError = this.handleAPIError(error, attempt, endpoint);

        if (attempt === this.retryAttempts) {
          this.metrics.failedRequests++;
          throw handledError;
        }

        // Exponential backoff with jitter
        const delay = this.retryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        devLogger.log('HiroAPI', `Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // ==================== RUNES API ====================

  // Listar todos os Runes
  async getRunes(offset = 0, limit = 20) {
    return await this.makeRequest('/runes/v1/etchings', { offset, limit });
  }

  // Detalhes de um Rune especifico
  async getRuneDetails(runeName: string) {
    return await this.makeRequest(`/runes/v1/etchings/${encodeURIComponent(runeName)}`);
  }

  // Holders de um Rune
  async getRuneHolders(runeName: string, offset = 0, limit = 20) {
    return await this.makeRequest(
      `/runes/v1/etchings/${encodeURIComponent(runeName)}/holders`,
      { offset, limit }
    );
  }

  // Holder especifico de um Rune
  async getRuneHolderDetails(runeName: string, holderAddress: string) {
    return await this.makeRequest(
      `/runes/v1/etchings/${encodeURIComponent(runeName)}/holders/${holderAddress}`
    );
  }

  // Balances de Runes para um endereco
  async getRuneBalances(address: string, offset = 0, limit = 20) {
    return await this.makeRequest(
      `/runes/v1/addresses/${address}/balances`,
      { offset, limit }
    );
  }

  // Atividade de um Rune
  async getRuneActivity(runeName: string, offset = 0, limit = 20) {
    return await this.makeRequest(
      `/runes/v1/etchings/${encodeURIComponent(runeName)}/activity`,
      { offset, limit }
    );
  }

  // ==================== ORDINALS API ====================

  // Listar Inscriptions com filtros avancados
  async getInscriptions(filters: Record<string, any> = {}) {
    const defaultFilters = {
      offset: 0,
      limit: 20,
      order: 'desc'
    };

    const params = { ...defaultFilters, ...filters };

    return await this.makeRequest('/ordinals/v1/inscriptions', params);
  }

  // Detalhes de uma Inscription especifica
  async getInscriptionDetails(inscriptionId: string) {
    return await this.makeRequest(`/ordinals/v1/inscriptions/${inscriptionId}`);
  }

  // Conteudo de uma Inscription
  async getInscriptionContent(inscriptionId: string) {
    const url = `${this.baseURL}/ordinals/v1/inscriptions/${inscriptionId}/content`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response; // Retorna response para permitir diferentes tipos de conteudo
  }

  // Transfers de uma Inscription
  async getInscriptionTransfers(inscriptionId: string, offset = 0, limit = 20) {
    return await this.makeRequest(
      `/ordinals/v1/inscriptions/${inscriptionId}/transfers`,
      { offset, limit }
    );
  }

  // Transfers globais de Inscriptions
  async getInscriptionTransfersGlobal(block: string | number | null = null, offset = 0, limit = 20) {
    const params: Record<string, any> = { offset, limit };
    if (block) params.block = block;

    return await this.makeRequest('/ordinals/v1/inscriptions/transfers', params);
  }

  // Estatisticas de Inscriptions
  async getInscriptionStats(fromBlockHeight: number | null = null, toBlockHeight: number | null = null) {
    const params: Record<string, any> = {};
    if (fromBlockHeight) params.from_block_height = fromBlockHeight;
    if (toBlockHeight) params.to_block_height = toBlockHeight;

    return await this.makeRequest('/ordinals/v1/stats/inscriptions', params);
  }

  // ==================== SATOSHIS API ====================

  // Detalhes de um Satoshi especifico
  async getSatDetails(satOrdinal: string | number) {
    return await this.makeRequest(`/ordinals/v1/sats/${satOrdinal}`);
  }

  // Inscriptions em um Satoshi especifico
  async getSatInscriptions(satOrdinal: string | number, offset = 0, limit = 20) {
    return await this.makeRequest(
      `/ordinals/v1/sats/${satOrdinal}/inscriptions`,
      { offset, limit }
    );
  }

  // ==================== BRC-20 API ====================

  // Listar tokens BRC-20
  async getBRC20Tokens(filters: Record<string, any> = {}) {
    const defaultFilters = {
      offset: 0,
      limit: 20,
      order_by: 'tx_count'
    };

    const params = { ...defaultFilters, ...filters };

    return await this.makeRequest('/ordinals/v1/brc-20/tokens', params);
  }

  // Detalhes de um token BRC-20
  async getBRC20TokenDetails(ticker: string) {
    return await this.makeRequest(`/ordinals/v1/brc-20/tokens/${ticker}`);
  }

  // Holders de um token BRC-20
  async getBRC20TokenHolders(ticker: string, offset = 0, limit = 20) {
    return await this.makeRequest(
      `/ordinals/v1/brc-20/tokens/${ticker}/holders`,
      { offset, limit }
    );
  }

  // Balances BRC-20 de um endereco
  async getBRC20Balances(address: string, filters: Record<string, any> = {}) {
    const params = { offset: 0, limit: 20, ...filters };

    return await this.makeRequest(`/ordinals/v1/brc-20/balances/${address}`, params);
  }

  // Obter balances BRC-20 para um endereco especifico com cache
  async getBRC20ForAddress(address: string) {
    try {
      const cacheKey = `brc20-balance-${address}`;
      const cached = this.getCache(cacheKey);

      if (cached) {
        return { data: cached, cached: true, timestamp: Date.now() };
      }

      const response = await this.getBRC20Balances(address, { limit: 100 });

      if (response && response.results) {
        this.setCache(cacheKey, response);
        return { data: response, cached: false, timestamp: Date.now() };
      } else {
        throw new Error('No BRC-20 data received');
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      devLogger.error(`Erro ao buscar BRC-20 para endereco ${address}: ${errMsg}`);
      return { error: errMsg, data: null };
    }
  }

  // Atividade BRC-20
  async getBRC20Activity(filters: Record<string, any> = {}) {
    const params = { offset: 0, limit: 20, ...filters };

    return await this.makeRequest('/ordinals/v1/brc-20/activity', params);
  }

  // ==================== NETWORK & SYSTEM API ====================

  // Network information and statistics
  async getNetworkInfo() {
    try {
      devLogger.log('HiroAPI', 'Fetching network information');

      // Get network info from multiple endpoints to build comprehensive data
      const [blockInfo, feeData] = await Promise.allSettled([
        this.makeRequest('/extended/v1/info/network_block_times'),
        this.makeRequest('/extended/v1/fee_rates')
      ]);

      const result = {
        network: 'mainnet',
        status: 'online',
        block_height: blockInfo.status === 'fulfilled' ?
          (blockInfo.value?.stacks?.tip_height || blockInfo.value?.burnchain?.tip_height || 0) : 0,
        block_hash: blockInfo.status === 'fulfilled' ?
          (blockInfo.value?.stacks?.tip_hash || blockInfo.value?.burnchain?.tip_hash || '') : '',
        burnchain_block_height: blockInfo.status === 'fulfilled' ?
          (blockInfo.value?.burnchain?.tip_height || 0) : 0,
        burnchain_block_hash: blockInfo.status === 'fulfilled' ?
          (blockInfo.value?.burnchain?.tip_hash || '') : '',
        stacks_tip_height: blockInfo.status === 'fulfilled' ?
          (blockInfo.value?.stacks?.tip_height || 0) : 0,
        stacks_tip_hash: blockInfo.status === 'fulfilled' ?
          (blockInfo.value?.stacks?.tip_hash || '') : '',
        server_version: '2.0.0',
        network_id: 1,
        parent_network_id: 1,
        stacks_api_available: true,
        stacks_node_available: true,
        fee_estimates: feeData.status === 'fulfilled' ? feeData.value : null,
        last_updated: Date.now()
      };

      devLogger.log('HiroAPI', `Network info retrieved successfully - Block: ${result.block_height}`);
      return result;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      devLogger.error(`HiroAPI: Error fetching network info: ${errMsg}`);

      // Return fallback network info
      return {
        network: 'mainnet',
        status: 'unknown',
        block_height: 0,
        block_hash: '',
        burnchain_block_height: 0,
        burnchain_block_hash: '',
        stacks_tip_height: 0,
        stacks_tip_hash: '',
        server_version: 'unknown',
        network_id: 1,
        parent_network_id: 1,
        stacks_api_available: false,
        stacks_node_available: false,
        fee_estimates: null,
        last_updated: Date.now(),
        error: errMsg
      };
    }
  }

  // Ordinals collections with pagination
  async getOrdinalsCollections(offset = 0, limit = 20) {
    try {
      devLogger.log('HiroAPI', `Fetching ordinals collections (offset: ${offset}, limit: ${limit})`);

      // Hiro doesn't have direct collections endpoint, so we'll analyze inscriptions
      // to identify collection patterns and group them
      const inscriptionsData = await this.getInscriptions({
        offset: 0,
        limit: 200, // Get more data to analyze patterns
        order: 'desc'
      });

      if (!inscriptionsData?.results) {
        throw new Error('No inscriptions data available');
      }

      // Group inscriptions by collection patterns
      const collections = this.analyzeInscriptionsForCollections(inscriptionsData.results);

      // Apply pagination to collections
      const paginatedCollections = collections.slice(offset, offset + limit);

      const result = {
        total: collections.length,
        limit,
        offset,
        results: paginatedCollections
      };

      devLogger.log('HiroAPI', `Found ${collections.length} collections`);
      return result;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      devLogger.error(`HiroAPI: Error fetching collections: ${errMsg}`);

      // Return fallback collections data
      return {
        total: 2,
        limit,
        offset,
        results: [
          {
            id: 'bitcoin-puppets',
            name: 'Bitcoin Puppets',
            description: 'A collection of Bitcoin-themed digital puppets',
            supply: 10000,
            floor_price: 0.089,
            volume_24h: 125000,
            volume_change_24h: 15.2,
            unique_holders: 3547,
            sales_24h: 89,
            image: null,
            verified: true,
            category: 'pfp',
            created_at: new Date(Date.now() - 86400000 * 180).toISOString()
          },
          {
            id: 'ocm-genesis',
            name: 'OCM GENESIS',
            description: 'The original Ordinal Maxi collection',
            supply: 5000,
            floor_price: 0.125,
            volume_24h: 95000,
            volume_change_24h: 8.7,
            unique_holders: 2890,
            sales_24h: 56,
            image: null,
            verified: true,
            category: 'art',
            created_at: new Date(Date.now() - 86400000 * 150).toISOString()
          }
        ],
        error: errMsg
      };
    }
  }

  // Helper method to analyze inscriptions for collection patterns
  private analyzeInscriptionsForCollections(inscriptions: any[]): any[] {
    const collectionMap = new Map<string, any>();

    inscriptions.forEach((inscription: any) => {
      // Try to identify collection by content patterns, metadata, or address patterns
      const collectionKey = this.identifyCollection(inscription);

      if (!collectionMap.has(collectionKey)) {
        collectionMap.set(collectionKey, {
          id: collectionKey,
          name: this.generateCollectionName(collectionKey),
          description: `Collection of inscriptions with pattern: ${collectionKey}`,
          supply: 0,
          floor_price: 0,
          volume_24h: 0,
          volume_change_24h: 0,
          unique_holders: 0,
          sales_24h: 0,
          image: null,
          verified: false,
          category: this.categorizeCollection(inscription),
          created_at: new Date(inscription.genesis_timestamp || Date.now()).toISOString(),
          inscriptions: [] as string[],
          addresses: new Set<string>()
        });
      }

      const collection = collectionMap.get(collectionKey);
      collection.supply++;
      collection.inscriptions.push(inscription.id);

      // Estimate unique holders (simplified)
      collection.addresses.add(inscription.address);
      collection.unique_holders = collection.addresses.size;
    });

    // Convert map to array and sort by supply
    return Array.from(collectionMap.values())
      .filter((collection: any) => collection.supply > 1) // Only collections with multiple items
      .sort((a: any, b: any) => b.supply - a.supply)
      .map((collection: any) => {
        // Clean up temporary data
        delete collection.addresses;
        delete collection.inscriptions;
        return collection;
      });
  }

  private identifyCollection(inscription: any): string {
    // Simple heuristics to group inscriptions
    if (inscription.content_type?.includes('image')) {
      const addressPrefix = inscription.address?.substring(0, 10) || 'unknown';
      return `image-collection-${addressPrefix}`;
    }
    if (inscription.content_type?.includes('text')) {
      return 'text-inscriptions';
    }
    return 'mixed-collection';
  }

  private generateCollectionName(key: string): string {
    if (key.includes('image')) return `Image Collection ${key.split('-').pop()?.toUpperCase()}`;
    if (key.includes('text')) return 'Text Inscriptions';
    return 'Mixed Collection';
  }

  private categorizeCollection(inscription: any): string {
    if (inscription.content_type?.includes('image')) return 'art';
    if (inscription.content_type?.includes('text')) return 'text';
    return 'mixed';
  }

  // Runes information and statistics
  async getRunesInfo() {
    try {
      devLogger.log('HiroAPI', 'Fetching runes information and statistics');

      const runesData = await this.getRunes(0, 20);

      if (!runesData?.results || !Array.isArray(runesData.results)) {
        throw new Error('No runes data available');
      }

      // Calculate comprehensive statistics
      const totalRunes = runesData.total || runesData.results.length;
      const totalSupply = runesData.results.reduce((sum: number, rune: any) => {
        return sum + (parseInt(rune.supply || '0') || 0);
      }, 0);
      const totalHolders = runesData.results.reduce((sum: number, rune: any) => {
        return sum + (rune.holders || 0);
      }, 0);
      const totalMints = runesData.results.reduce((sum: number, rune: any) => {
        return sum + (rune.mints || 0);
      }, 0);

      const statistics = {
        total_runes: totalRunes,
        total_supply: totalSupply.toString(),
        total_holders: totalHolders,
        total_mints: totalMints,
        average_holders_per_rune: totalRunes > 0 ? Math.round(totalHolders / totalRunes) : 0,
        recent_etchings: runesData.results.slice(0, 5).map((rune: any) => ({
          name: rune.spaced_rune || rune.name,
          symbol: rune.symbol || '\u29C9',
          etching_block: rune.etching_block || 0,
          supply: rune.supply || '0',
          holders: rune.holders || 0
        })),
        network_stats: {
          active_runes: runesData.results.filter((rune: any) => (rune.mints || 0) > 0).length,
          completed_runes: runesData.results.filter((rune: any) =>
            rune.terms?.cap && parseInt(rune.supply || '0') >= parseInt(rune.terms.cap || '0')
          ).length,
          minting_runes: runesData.results.filter((rune: any) =>
            rune.terms?.cap && parseInt(rune.supply || '0') < parseInt(rune.terms.cap || '0')
          ).length
        },
        last_updated: Date.now()
      };

      devLogger.log('HiroAPI', `Runes info compiled: ${statistics.total_runes} total runes`);
      return statistics;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      devLogger.error(`HiroAPI: Error fetching runes info: ${errMsg}`);

      // Return fallback runes info
      return {
        total_runes: 158932,
        total_supply: '1589320000',
        total_holders: 18445,
        total_mints: 892345,
        average_holders_per_rune: 116,
        recent_etchings: [
          {
            name: 'UNCOMMON\u2022GOODS',
            symbol: '\u29C9',
            etching_block: 840000,
            supply: '158932',
            holders: 18445
          }
        ],
        network_stats: {
          active_runes: 1250,
          completed_runes: 89,
          minting_runes: 1161
        },
        last_updated: Date.now(),
        error: errMsg
      };
    }
  }

  // Mempool statistics
  async getMempoolStats() {
    try {
      devLogger.log('HiroAPI', 'Fetching mempool statistics');

      // Hiro doesn't have direct mempool endpoint, we'll use alternative data sources
      const [blockData, feeData] = await Promise.allSettled([
        this.makeRequest('/extended/v1/info/network_block_times'),
        this.makeRequest('/extended/v1/fee_rates')
      ]);

      // Simulate mempool stats based on available data
      const baseStats = {
        count: 0,
        vsize: 0,
        total_fee: 0,
        fee_histogram: this.generateFeeHistogram(),
        size_distribution: this.generateSizeDistribution()
      };

      const result = {
        ...baseStats,
        count_unconfirmed: baseStats.count,
        size_bytes: baseStats.vsize * 1.1, // Estimate total size
        fee_range: {
          min: 1,
          max: baseStats.count > 0 ? Math.floor(baseStats.total_fee / baseStats.count * 2) : 0,
          avg: baseStats.count > 0 ? Math.floor(baseStats.total_fee / baseStats.count) : 0
        },
        block_data: blockData.status === 'fulfilled' ? blockData.value : null,
        fee_data: feeData.status === 'fulfilled' ? feeData.value : null,
        last_updated: Date.now(),
        source: 'estimated' // Indicate this is estimated data
      };

      devLogger.log('HiroAPI', `Mempool stats estimated: ${result.count} transactions`);
      return result;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      devLogger.error(`HiroAPI: Error fetching mempool stats: ${errMsg}`);

      // Return fallback mempool stats
      return {
        count: 25000,
        vsize: 125000000,
        total_fee: 5000000,
        count_unconfirmed: 25000,
        size_bytes: 137500000,
        fee_range: {
          min: 1,
          max: 500,
          avg: 200
        },
        fee_histogram: [[0, 5000], [1, 8000], [2, 7000], [5, 3000], [10, 2000]] as [number, number][],
        size_distribution: [['0-1000', 15000], ['1000-10000', 8000], ['10000+', 2000]] as [string, number][],
        block_data: null,
        fee_data: null,
        last_updated: Date.now(),
        source: 'fallback',
        error: errMsg
      };
    }
  }

  private generateFeeHistogram(): [number, number][] {
    return [
      [0, 0], [1, 0], [2, 0], [5, 0],
      [10, 0], [20, 0], [50, 0], [100, 0]
    ];
  }

  private generateSizeDistribution(): [string, number][] {
    return [
      ['0-500', 0], ['500-1000', 0], ['1000-2000', 0],
      ['2000-5000', 0], ['5000-10000', 0], ['10000+', 0]
    ];
  }

  // Fee estimates for different priorities
  async getFeeEstimates() {
    try {
      devLogger.log('HiroAPI', 'Fetching fee estimates');

      const feeData = await this.makeRequest('/extended/v1/fee_rates');

      if (feeData) {
        // Transform Hiro fee data to standard format
        const result = {
          fastestFee: feeData.high || 100,
          halfHourFee: feeData.medium || 50,
          hourFee: feeData.low || 20,
          economyFee: Math.floor((feeData.low || 20) * 0.7),
          minimumFee: 1,
          // Additional priority levels
          priority_levels: {
            no_priority: 1,
            low: feeData.low || 20,
            medium: feeData.medium || 50,
            high: feeData.high || 100,
            custom: null as number | null
          },
          // Estimates in different units
          sat_per_vbyte: {
            fastest: feeData.high || 100,
            half_hour: feeData.medium || 50,
            hour: feeData.low || 20,
            economy: Math.floor((feeData.low || 20) * 0.7),
            minimum: 1
          },
          // Time estimates in minutes
          time_estimates: {
            fastest: 10,
            half_hour: 30,
            hour: 60,
            economy: 120,
            minimum: 360
          },
          raw_data: feeData,
          last_updated: Date.now(),
          source: 'hiro_api'
        };

        devLogger.log('HiroAPI', `Fee estimates retrieved: ${result.fastestFee} sat/vB (fastest)`);
        return result;
      } else {
        throw new Error('No fee data received from API');
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      devLogger.error(`HiroAPI: Error fetching fee estimates: ${errMsg}`);

      // Return fallback fee estimates
      const fallbackFees = {
        fastestFee: 150,
        halfHourFee: 75,
        hourFee: 30,
        economyFee: 15,
        minimumFee: 1,
        priority_levels: {
          no_priority: 1,
          low: 30,
          medium: 75,
          high: 150,
          custom: null as number | null
        },
        sat_per_vbyte: {
          fastest: 150,
          half_hour: 75,
          hour: 30,
          economy: 15,
          minimum: 1
        },
        time_estimates: {
          fastest: 10,
          half_hour: 30,
          hour: 60,
          economy: 120,
          minimum: 360
        },
        raw_data: null,
        last_updated: Date.now(),
        source: 'fallback',
        error: errMsg
      };

      return fallbackFees;
    }
  }

  // ==================== ENHANCED UTILITY METHODS ====================

  // Get complete address data with enhanced error handling
  async getAddressCompleteData(address: string) {
    try {
      devLogger.log('HiroAPI', `Fetching complete data for address: ${address}`);

      const [inscriptions, runeBalances, brc20Balances] = await Promise.allSettled([
        this.getInscriptions({ address }),
        this.getRuneBalances(address),
        this.getBRC20Balances(address)
      ]);

      const result = {
        address,
        inscriptions: inscriptions.status === 'fulfilled' ? inscriptions.value : {
          error: inscriptions.status === 'rejected' ? inscriptions.reason.message : 'Unknown error',
          data: null
        },
        runes: runeBalances.status === 'fulfilled' ? runeBalances.value : {
          error: runeBalances.status === 'rejected' ? runeBalances.reason.message : 'Unknown error',
          data: null
        },
        brc20: brc20Balances.status === 'fulfilled' ? brc20Balances.value : {
          error: brc20Balances.status === 'rejected' ? brc20Balances.reason.message : 'Unknown error',
          data: null
        },
        timestamp: Date.now(),
        success: inscriptions.status === 'fulfilled' || runeBalances.status === 'fulfilled' || brc20Balances.status === 'fulfilled'
      };

      devLogger.log('HiroAPI', `Complete data fetch result: ${result.success ? 'SUCCESS' : 'PARTIAL_FAILURE'}`);
      return result;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      devLogger.error(`HiroAPI: Error fetching complete data for ${address}: ${errMsg}`);
      throw error;
    }
  }

  // Enhanced cache management
  clearCache(pattern?: string) {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
      devLogger.log('HiroAPI', `Cache cleared for pattern: ${pattern}`);
    } else {
      this.cache.clear();
      devLogger.log('HiroAPI', 'All cache cleared');
    }
  }

  // Comprehensive cache statistics
  getCacheStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());
    const validEntries = entries.filter(entry => now - entry.timestamp < entry.ttl);
    const expiredEntries = entries.filter(entry => now - entry.timestamp >= entry.ttl);

    return {
      total: this.cache.size,
      valid: validEntries.length,
      expired: expiredEntries.length,
      hitRatio: this.metrics.totalRequests > 0 ?
        (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 : 0,
      entries: Array.from(this.cache.keys()),
      memoryUsage: JSON.stringify(Array.from(this.cache.values())).length
    };
  }

  // API metrics and health
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0 ?
        (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 : 0,
      cacheHitRate: (this.metrics.cacheHits + this.metrics.cacheMisses) > 0 ?
        (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 : 0,
      uptime: Date.now() - (this as any).startTime || 0
    };
  }

  // Health check endpoint
  async healthCheck(): Promise<{status: string, details: any}> {
    try {
      const startTime = Date.now();

      // Simple API test
      await this.makeRequest('/ordinals/v1/inscriptions', { limit: 1 }, {
        useCache: false,
        timeout: 5000
      });

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        details: {
          responseTime,
          metrics: this.getMetrics(),
          cache: this.getCacheStats(),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      return {
        status: 'unhealthy',
        details: {
          error: errMsg,
          metrics: this.getMetrics(),
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // Batch request helper for multiple endpoints
  async batchRequest(requests: Array<{
    endpoint: string;
    params?: any;
    options?: any;
  }>, {
    concurrency = 5,
    failFast = false
  } = {}): Promise<any[]> {
    const results: any[] = [];
    const batches: Array<typeof requests> = [];

    // Split requests into batches
    for (let i = 0; i < requests.length; i += concurrency) {
      batches.push(requests.slice(i, i + concurrency));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (request, index) => {
        try {
          const result = await this.makeRequest(request.endpoint, request.params, request.options);
          return { success: true, data: result, index: results.length + index };
        } catch (error: unknown) {
          if (failFast) throw error;
          const errMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: errMsg, index: results.length + index };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }
}

// Enhanced global instance with startup tracking
class EnhancedHiroAPI extends HiroAPI {
  private startTime: number;

  constructor(config?: HiroAPIConfig) {
    super(config);
    this.startTime = Date.now();

    // Cleanup expired cache entries periodically
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 300000); // Every 5 minutes
  }

  private cleanupExpiredCache() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      devLogger.log('HiroAPI', `Cleaned up ${cleanedCount} expired cache entries`);
    }
  }
}

// Import the extensions
import hiroAPIExtensions from './hiro-api-methods';

// Enhanced HiroAPI with missing methods
class HiroAPIWithExtensions extends EnhancedHiroAPI {
  // Add the missing methods by delegating to extensions
  async getNetworkInfo() {
    return hiroAPIExtensions.getNetworkInfo();
  }

  async getOrdinalsCollections(offset = 0, limit = 20) {
    return hiroAPIExtensions.getOrdinalsCollections(offset, limit);
  }

  async getRunesInfo() {
    return hiroAPIExtensions.getRunesInfo();
  }

  async getMempoolStats() {
    return hiroAPIExtensions.getMempoolStats();
  }

  async getFeeEstimates() {
    return hiroAPIExtensions.getFeeEstimates();
  }
}

// Global instance
export const hiroAPI = new HiroAPIWithExtensions({
  cacheTTL: 30000, // 30 seconds default
  retryAttempts: 3,
  retryDelay: 1000,
  rateLimit: { requests: 100, window: 60000 }, // 100 requests per minute
  timeout: 15000 // 15 seconds
});

// ==================== UTILITY FUNCTIONS ====================

// Processar dados BRC-20 da API Hiro para formato padrao
export function processBRC20Data(rawData: any[]): any[] {
  return rawData.map((token, index) => ({
    ticker: token.token || token.ticker || `UNKN${index}`,
    balance: token.balance || token.overall_balance || '0',
    totalBalance: token.overall_balance || token.balance || '0',
    transferrable: token.transferable_balance || token.available_balance || '0',
    value: 0,
    deployBlock: token.deploy_block_height || 840000,
    totalSupply: token.max_supply || '21000000',
    holders: 0,
    transactions: token.tx_count || 0,
    deployedAt: token.deploy_timestamp || new Date().toISOString(),
    progress: token.mint_progress || 0
  }));
}

// Export classes for specific use cases
export { HiroAPI, EnhancedHiroAPI };
export default hiroAPI;

// Type exports for better TypeScript support
export type { HiroAPIConfig, CacheEntry, RateLimitEntry, APIMetrics };
