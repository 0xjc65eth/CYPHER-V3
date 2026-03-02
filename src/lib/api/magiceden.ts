/**
 * Magic Eden API Service
 * Marketplace de Ordinals e NFTs Bitcoin
 */

import { apiClient } from './client';
import { API_CONFIG } from './config';
import { cacheService, cacheKeys, cacheTTL } from '@/lib/cache';
import { devLogger } from '@/lib/logger';

// Tipos para Magic Eden
export interface MECollection {
  symbol: string;
  name: string;
  description?: string;
  imageUri?: string;
  supply: number;
  floorPrice: number;
  listedCount: number;
  avgPrice24hr: number;
  volume24hr: number;
  volumeAll: number;
}

export interface METoken {
  id: string;
  collectionSymbol: string;
  collectionName: string;
  name: string;
  imageUri?: string;
  owner: string;
  price?: number;
  listedAt?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

export interface MEActivity {
  tokenId: string;
  collectionSymbol: string;
  type: 'listing' | 'sale' | 'bid' | 'transfer';
  price?: number;
  from: string;
  to: string;
  timestamp: string;
  txId: string;
}

export interface MEStats {
  symbol: string;
  floorPrice: number;
  listedCount: number;
  avgPrice24hr: number;
  volume24hr: number;
  volume7d: number;
  volume30d: number;
  volumeAll: number;
}

export interface MEMarketplace {
  bestOffer: number;
  floorPrice: number;
  lastSale: number;
  owners: number;
  totalSupply: number;
  totalVolume: number;
}

class MagicEdenService {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = API_CONFIG.magiceden.baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Fazer requisição à API
   */
  private async request<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return apiClient.fetch(url.toString(), { headers: this.headers });
  }

  /**
   * Obter coleções populares
   */
  async getPopularCollections(limit: number = 20): Promise<MECollection[]> {
    return cacheService.getOrCompute(
      (cacheKeys as any).magiceden(`popular-collections-${limit}`),
      async () => {
        devLogger.log('MAGIC_EDEN', `Fetching top ${limit} collections`);
        return await this.request<MECollection[]>(
          API_CONFIG.magiceden.endpoints.collections,
          { limit }
        );
      },
      (cacheTTL as any).collections
    );
  }

  /**
   * Obter detalhes de uma coleção
   */
  async getCollection(symbol: string): Promise<MECollection> {
    return cacheService.getOrCompute(
      (cacheKeys as any).magiceden(`collection-${symbol}`),
      async () => {
        devLogger.log('MAGIC_EDEN', `Fetching collection: ${symbol}`);
        return await this.request<MECollection>(
          `${API_CONFIG.magiceden.endpoints.collections}/${symbol}`
        );
      },
      (cacheTTL as any).collections
    );
  }

  /**
   * Obter tokens de uma coleção
   */
  async getCollectionTokens(
    symbol: string,
    offset: number = 0,
    limit: number = 20
  ): Promise<METoken[]> {
    return cacheService.getOrCompute(
      (cacheKeys as any).magiceden(`tokens-${symbol}-${offset}-${limit}`),
      async () => {
        devLogger.log('MAGIC_EDEN', `Fetching tokens for collection: ${symbol}`);
        return await this.request<METoken[]>(
          `${API_CONFIG.magiceden.endpoints.collections}/${symbol}/tokens`,
          { offset, limit }
        );
      },
      (cacheTTL as any).tokens
    );
  }

  /**
   * Obter token específico
   */
  async getToken(tokenId: string): Promise<METoken> {
    return cacheService.getOrCompute(
      (cacheKeys as any).magiceden(`token-${tokenId}`),
      async () => {
        devLogger.log('MAGIC_EDEN', `Fetching token: ${tokenId}`);
        return await this.request<METoken>(
          `${API_CONFIG.magiceden.endpoints.tokens}/${tokenId}`
        );
      },
      (cacheTTL as any).tokens
    );
  }

  /**
   * Obter atividades recentes
   */
  async getRecentActivities(
    collectionSymbol?: string,
    limit: number = 50
  ): Promise<MEActivity[]> {
    const cacheKey = collectionSymbol
      ? `activities-${collectionSymbol}-${limit}`
      : `activities-all-${limit}`;

    return cacheService.getOrCompute(
      (cacheKeys as any).magiceden(cacheKey),
      async () => {
        devLogger.log('MAGIC_EDEN', 'Fetching recent activities');
        const params: any = { limit };
        if (collectionSymbol) params.collectionSymbol = collectionSymbol;

        return await this.request<MEActivity[]>(
          API_CONFIG.magiceden.endpoints.activities,
          params
        );
      },
      (cacheTTL as any).activities
    );
  }

  /**
   * Obter estatísticas de uma coleção
   */
  async getCollectionStats(symbol: string): Promise<MEStats> {
    return cacheService.getOrCompute(
      (cacheKeys as any).magiceden(`stats-${symbol}`),
      async () => {
        devLogger.log('MAGIC_EDEN', `Fetching stats for: ${symbol}`);
        return await this.request<MEStats>(
          `${API_CONFIG.magiceden.endpoints.stats}/${symbol}`
        );
      },
      (cacheTTL as any).stats
    );
  }

  /**
   * Obter dados do marketplace
   */
  async getMarketplaceData(symbol: string): Promise<MEMarketplace> {
    return cacheService.getOrCompute(
      (cacheKeys as any).magiceden(`marketplace-${symbol}`),
      async () => {
        devLogger.log('MAGIC_EDEN', `Fetching marketplace data for: ${symbol}`);
        return await this.request<MEMarketplace>(
          `${API_CONFIG.magiceden.endpoints.marketplace}/${symbol}`
        );
      },
      (cacheTTL as any).marketplace
    );
  }

  /**
   * Buscar coleções
   */
  async searchCollections(query: string): Promise<MECollection[]> {
    return cacheService.getOrCompute(
      (cacheKeys as any).magiceden(`search-${query}`),
      async () => {
        devLogger.log('MAGIC_EDEN', `Searching collections: ${query}`);
        return await this.request<MECollection[]>(
          `${API_CONFIG.magiceden.endpoints.collections}/search`,
          { q: query }
        );
      },
      (cacheTTL as any).search
    );
  }

  /**
   * Obter tokens listados por endereço
   */
  async getListedTokensByOwner(address: string): Promise<METoken[]> {
    return cacheService.getOrCompute(
      (cacheKeys as any).magiceden(`owner-listings-${address}`),
      async () => {
        devLogger.log('MAGIC_EDEN', `Fetching listings for owner: ${address}`);
        return await this.request<METoken[]>(
          `${API_CONFIG.magiceden.endpoints.tokens}/owner/${address}`
        );
      },
      (cacheTTL as any).tokens
    );
  }

  /**
   * Obter ofertas de uma coleção
   */
  async getCollectionOffers(symbol: string): Promise<any[]> {
    return cacheService.getOrCompute(
      (cacheKeys as any).magiceden(`offers-${symbol}`),
      async () => {
        devLogger.log('MAGIC_EDEN', `Fetching offers for: ${symbol}`);
        return await this.request<any[]>(
          `${API_CONFIG.magiceden.endpoints.collections}/${symbol}/offers`
        );
      },
      (cacheTTL as any).offers
    );
  }
}

// Cache keys específicos para Magic Eden
(cacheKeys as any).magiceden = (key: string) => `magiceden:${key}`;

// Cache TTLs específicos
Object.assign(cacheTTL, {
  collections: 300,    // 5 minutos
  tokens: 120,        // 2 minutos
  activities: 60,     // 1 minuto
  stats: 180,         // 3 minutos
  marketplace: 120,   // 2 minutos
  search: 300,        // 5 minutos
  offers: 60,         // 1 minuto
});

// Exportar instância singleton
export const magicEdenService = new MagicEdenService();