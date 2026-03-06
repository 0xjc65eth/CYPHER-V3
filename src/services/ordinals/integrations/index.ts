/**
 * Unified Ordinals Marketplace Integrations
 * Exports all marketplace APIs with standardized interfaces
 */

import { OKXOrdinalsAPI as _OKXOrdinalsAPI, okxOrdinalsAPI as _okxOrdinalsAPI } from './OKXOrdinalsAPI';
import { UniSatAPI as _UniSatAPI, uniSatAPI as _uniSatAPI } from './UniSatAPI';
import { HiroOrdinalsService as _HiroOrdinalsService, hiroOrdinalsService as _hiroOrdinalsService } from '../../HiroOrdinalsService';

export { _OKXOrdinalsAPI as OKXOrdinalsAPI, _okxOrdinalsAPI as okxOrdinalsAPI };
export { _UniSatAPI as UniSatAPI, _uniSatAPI as uniSatAPI };
export { _HiroOrdinalsService as HiroOrdinalsService, _hiroOrdinalsService as hiroOrdinalsService };

// Re-export all types for easier imports
export type {
  OKXCollection,
  OKXInscription,
  OKXMarketActivity,
  OKXMarketStats,
  OKXTrendingCollection
} from './OKXOrdinalsAPI';

export type {
  UniSatCollection,
  UniSatInscription,
  UniSatBRC20Token,
  UniSatAddressInfo,
  UniSatTransaction,
  UniSatMarketListing
} from './UniSatAPI';

// Unified marketplace enum
export enum OrdinalsMarketplace {
  OKX = 'okx',
  UNISAT = 'unisat',
  HIRO = 'hiro',
  BESTINSLOT = 'bestinslot',
  GAMMA = 'gamma'
}

// Standardized interfaces for cross-marketplace compatibility
export interface StandardizedCollection {
  id: string;
  name: string;
  symbol?: string;
  description: string;
  image: string;
  totalSupply: number;
  floorPrice: number; // Always in BTC
  volume24h: number; // Always in BTC
  volume7d?: number; // Always in BTC
  volume30d?: number; // Always in BTC
  holdersCount: number;
  listedCount: number;
  listedPercentage: number;
  marketplace: OrdinalsMarketplace;
  verified?: boolean;
  website?: string;
  twitter?: string;
  discord?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StandardizedInscription {
  id: string;
  number: number;
  address: string;
  contentType: string;
  contentPreview?: string;
  contentUrl?: string;
  contentLength: number;
  timestamp: number;
  genesisHeight: number;
  genesisTransaction: string;
  location: string;
  satoshi?: number;
  owner: string;
  collection?: {
    id: string;
    name: string;
    symbol?: string;
  };
  listing?: {
    price: number; // Always in BTC
    marketplace: OrdinalsMarketplace;
    listedAt: number;
    seller: string;
  };
  rarity?: {
    rank: number;
    score: number;
    rarity: string;
    traits?: Array<{
      traitType: string;
      value: string;
      rarity: number;
    }>;
  };
  marketplace: OrdinalsMarketplace;
}

export interface StandardizedActivity {
  id: string;
  type: 'mint' | 'list' | 'delist' | 'sale' | 'transfer';
  inscriptionId: string;
  inscriptionNumber: number;
  fromAddress?: string;
  toAddress?: string;
  price?: number; // Always in BTC
  timestamp: number;
  txHash: string;
  blockHeight?: number;
  marketplace: OrdinalsMarketplace;
  collection?: {
    id: string;
    name: string;
  };
}

export interface StandardizedMarketStats {
  totalVolume: number; // Always in BTC
  totalSales: number;
  totalListings: number;
  avgPrice: number; // Always in BTC
  floorPrice: number; // Always in BTC
  marketCap: number; // Always in BTC
  ownersCount: number;
  itemsCount: number;
  volume24h: number; // Always in BTC
  volume7d: number; // Always in BTC
  volume30d: number; // Always in BTC
  sales24h: number;
  sales7d: number;
  sales30d: number;
  change24h: number; // Percentage
  change7d: number; // Percentage
  change30d: number; // Percentage
}

/**
 * Utility functions for converting between marketplace-specific formats
 */
export class OrdinalsDataConverter {
  private static readonly SATS_PER_BTC = 100000000;

  // Convert satoshis to BTC
  static satsToBTC(sats: number | string): number {
    const satoshis = typeof sats === 'string' ? parseInt(sats) : sats;
    return satoshis / this.SATS_PER_BTC;
  }

  // Convert BTC to satoshis
  static btcToSats(btc: number): number {
    return Math.round(btc * this.SATS_PER_BTC);
  }

  // Convert OKX collection to standardized format
  static convertOKXCollection(collection: any, marketplace: OrdinalsMarketplace): StandardizedCollection {
    return {
      id: collection.collectionId,
      name: collection.name,
      symbol: collection.symbol,
      description: collection.description || '',
      image: collection.logoUrl || '',
      totalSupply: collection.totalSupply || 0,
      floorPrice: parseFloat(collection.floorPrice || '0'),
      volume24h: parseFloat(collection.volume24h || '0'),
      volume7d: parseFloat(collection.volume7d || '0'),
      volume30d: parseFloat(collection.volume30d || '0'),
      holdersCount: collection.ownerCount || 0,
      listedCount: collection.listedCount || 0,
      listedPercentage: parseFloat(collection.listedRate || '0'),
      marketplace,
      verified: collection.isVerified,
      website: collection.websiteUrl,
      twitter: collection.twitterUrl,
      discord: collection.discordUrl,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt
    };
  }

  // Convert UniSat collection to standardized format
  static convertUniSatCollection(collection: any, marketplace: OrdinalsMarketplace): StandardizedCollection {
    return {
      id: collection.collectionId,
      name: collection.name,
      symbol: collection.symbol,
      description: collection.description || '',
      image: collection.icon || '',
      totalSupply: collection.supply || 0,
      floorPrice: this.satsToBTC(collection.floorPrice || 0),
      volume24h: this.satsToBTC(collection.h24Volume || 0),
      volume7d: undefined, // UniSat doesn't provide 7d volume
      volume30d: undefined, // UniSat doesn't provide 30d volume
      holdersCount: collection.holderTotal || 0,
      listedCount: collection.listed || 0,
      listedPercentage: collection.listedRatio || 0,
      marketplace,
      verified: undefined, // UniSat doesn't have verification status
      website: collection.website,
      twitter: collection.twitter,
      discord: collection.discord,
      createdAt: collection.createTime ? new Date(collection.createTime).toISOString() : undefined,
      updatedAt: collection.updateTime ? new Date(collection.updateTime).toISOString() : undefined
    };
  }

  // Convert Hiro collection to standardized format
  static convertHiroCollection(collection: any, marketplace: OrdinalsMarketplace): StandardizedCollection {
    return {
      id: collection.id,
      name: collection.name,
      symbol: collection.symbol || collection.id,
      description: collection.description || '',
      image: collection.imageURI || '',
      totalSupply: collection.total_supply || collection.supply || 0,
      floorPrice: collection.floor_price || collection.floorPrice || 0,
      volume24h: collection.volume_24h || collection.volume24h || 0,
      volume7d: collection.volume_7d || collection.volume7d,
      volume30d: collection.volume_30d || collection.volume30d,
      holdersCount: collection.holders_count || collection.owners || 0,
      listedCount: collection.listed_count || collection.listedCount || 0,
      listedPercentage: collection.listed_percentage || (collection.listed_count / collection.total_supply * 100) || 0,
      marketplace,
      verified: undefined, // Hiro doesn't have verification status
      website: undefined,
      twitter: undefined,
      discord: undefined,
      createdAt: undefined,
      updatedAt: undefined
    };
  }

  static convertBestInSlotCollection(collection: any, marketplace: OrdinalsMarketplace): StandardizedCollection {
    return {
      id: collection.slug || collection.id || '',
      name: collection.name || collection.slug || '',
      symbol: collection.slug,
      description: collection.description || '',
      image: collection.image_url || collection.inscription_icon || '',
      totalSupply: collection.supply || 0,
      floorPrice: collection.floor_price ? collection.floor_price / 1e8 : 0,
      volume24h: collection.volume_24h ? collection.volume_24h / 1e8 : 0,
      listedCount: collection.listed || 0,
      holdersCount: collection.owners || 0,
      listedPercentage: collection.supply ? ((collection.listed || 0) / collection.supply) * 100 : 0,
      marketplace,
      verified: true,
      website: undefined,
      twitter: undefined,
      discord: undefined,
      createdAt: undefined,
      updatedAt: undefined
    };
  }

  // Generic converter that detects marketplace and converts accordingly
  static convertCollection(collection: any, marketplace: OrdinalsMarketplace): StandardizedCollection {
    switch (marketplace) {
      case OrdinalsMarketplace.OKX:
        return this.convertOKXCollection(collection, marketplace);
      case OrdinalsMarketplace.UNISAT:
        return this.convertUniSatCollection(collection, marketplace);
      case OrdinalsMarketplace.HIRO:
        return this.convertHiroCollection(collection, marketplace);
      case OrdinalsMarketplace.BESTINSLOT:
        return this.convertBestInSlotCollection(collection, marketplace);
      default:
        throw new Error(`Unsupported marketplace: ${marketplace}`);
    }
  }
}

/**
 * Data domain for marketplace selection
 */
export type OrdinalsDataDomain = 'collections' | 'inscriptions' | 'activities' | 'stats' | 'runes' | 'brc20';

/**
 * Unified marketplace client factory
 */
export class OrdinalsMarketplaceFactory {
  /**
   * Returns the preferred marketplace priority for a given data domain.
   * Post-ME deprecation: OKX primary for Ordinals, UniSat/Hiro for Runes/BRC-20.
   */
  static getPreferredOrder(domain: OrdinalsDataDomain = 'collections'): OrdinalsMarketplace[] {
    switch (domain) {
      case 'runes':
        return [OrdinalsMarketplace.UNISAT, OrdinalsMarketplace.HIRO];
      case 'brc20':
        return [OrdinalsMarketplace.UNISAT, OrdinalsMarketplace.HIRO];
      case 'collections':
      case 'inscriptions':
      case 'activities':
      case 'stats':
      default:
        return [
          OrdinalsMarketplace.OKX,
          OrdinalsMarketplace.BESTINSLOT,
          OrdinalsMarketplace.UNISAT,
          OrdinalsMarketplace.HIRO,
        ];
    }
  }

  /**
   * Returns the preferred client for a given data domain with fallback support.
   * Tries clients in priority order, returns the first available one.
   */
  static getPreferredClient(domain: OrdinalsDataDomain = 'collections', config?: { uniSatApiKey?: string }) {
    const order = this.getPreferredOrder(domain);
    for (const marketplace of order) {
      try {
        const client = this.createClient(marketplace, config);
        if (client) return { client, marketplace };
      } catch {
        continue;
      }
    }
    throw new Error(`No available marketplace client for domain: ${domain}`);
  }

  static createClient(marketplace: OrdinalsMarketplace, config?: any) {
    switch (marketplace) {
      case OrdinalsMarketplace.OKX:
        return _okxOrdinalsAPI;
      case OrdinalsMarketplace.UNISAT:
        return new _UniSatAPI(config?.apiKey);
      case OrdinalsMarketplace.HIRO:
        return _hiroOrdinalsService;
      default:
        throw new Error(`Unsupported marketplace: ${marketplace}`);
    }
  }

  static getAllClients(config?: { uniSatApiKey?: string }) {
    const clients: Record<string, any> = {};

    try {
      const { okxOrdinalsAPI } = require('./OKXOrdinalsAPI');
      clients[OrdinalsMarketplace.OKX] = okxOrdinalsAPI;
    } catch (error) {
      console.warn('[OrdinalsMarketplaceFactory] Failed to load OKXOrdinalsAPI:', error instanceof Error ? error.message : error);
      clients[OrdinalsMarketplace.OKX] = null;
    }

    try {
      // Import UniSatAPI lazily
      const { UniSatAPI } = require('./UniSatAPI');
      clients[OrdinalsMarketplace.UNISAT] = new UniSatAPI(config?.uniSatApiKey);
    } catch (error) {
      console.warn('[OrdinalsMarketplaceFactory] Failed to load UniSatAPI:', error instanceof Error ? error.message : error);
      clients[OrdinalsMarketplace.UNISAT] = null;
    }

    try {
      // Import hiroOrdinalsService lazily
      const { hiroOrdinalsService } = require('../../HiroOrdinalsService');
      clients[OrdinalsMarketplace.HIRO] = hiroOrdinalsService;
    } catch (error) {
      console.warn('[OrdinalsMarketplaceFactory] Failed to load HiroOrdinalsService:', error instanceof Error ? error.message : error);
      clients[OrdinalsMarketplace.HIRO] = null;
    }

    try {
      const { bestInSlotAPI } = require('./BestInSlotAPI');
      clients[OrdinalsMarketplace.BESTINSLOT] = bestInSlotAPI;
    } catch (error) {
      console.warn('[OrdinalsMarketplaceFactory] Failed to load BestInSlotAPI:', error instanceof Error ? error.message : error);
      clients[OrdinalsMarketplace.BESTINSLOT] = null;
    }

    return clients;
  }
}