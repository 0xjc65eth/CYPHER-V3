/**
 * Unified Ordinals Marketplace Integrations
 * Exports all marketplace APIs with standardized interfaces
 */

export { MagicEdenAPI, magicEdenAPI } from './MagicEdenAPI';
export { OKXOrdinalsAPI, okxOrdinalsAPI } from './OKXOrdinalsAPI';
export { UniSatAPI, uniSatAPI } from './UniSatAPI';

// Import existing Hiro service
export { HiroOrdinalsService, hiroOrdinalsService } from '../../HiroOrdinalsService';

// Re-export all types for easier imports
export type {
  MagicEdenCollection,
  MagicEdenInscription,
  MagicEdenActivity,
  MagicEdenStats
} from './MagicEdenAPI';

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
  MAGIC_EDEN = 'magic_eden',
  OKX = 'okx',
  UNISAT = 'unisat',
  HIRO = 'hiro'
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

  // Convert Magic Eden collection to standardized format
  static convertMagicEdenCollection(collection: any, marketplace: OrdinalsMarketplace): StandardizedCollection {
    return {
      id: collection.symbol,
      name: collection.name,
      symbol: collection.symbol,
      description: collection.description || '',
      image: collection.image || '',
      totalSupply: collection.totalItems || collection.supply || 0,
      floorPrice: collection.floorPrice || 0,
      volume24h: collection.volume24h || 0,
      volume7d: collection.volume7d,
      volume30d: collection.volume30d,
      holdersCount: collection.owners || collection.ownerCount || 0,
      listedCount: collection.listedCount || collection.listed || 0,
      listedPercentage: collection.listedRatio || (collection.listedCount / collection.totalItems * 100) || 0,
      marketplace,
      verified: collection.verified,
      website: collection.website,
      twitter: collection.twitter,
      discord: collection.discord,
      createdAt: collection.createTime ? new Date(collection.createTime).toISOString() : undefined,
      updatedAt: collection.updateTime ? new Date(collection.updateTime).toISOString() : undefined
    };
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

  // Generic converter that detects marketplace and converts accordingly
  static convertCollection(collection: any, marketplace: OrdinalsMarketplace): StandardizedCollection {
    switch (marketplace) {
      case OrdinalsMarketplace.MAGIC_EDEN:
        return this.convertMagicEdenCollection(collection, marketplace);
      case OrdinalsMarketplace.OKX:
        return this.convertOKXCollection(collection, marketplace);
      case OrdinalsMarketplace.UNISAT:
        return this.convertUniSatCollection(collection, marketplace);
      case OrdinalsMarketplace.HIRO:
        return this.convertHiroCollection(collection, marketplace);
      default:
        throw new Error(`Unsupported marketplace: ${marketplace}`);
    }
  }
}

/**
 * Unified marketplace client factory
 */
export class OrdinalsMarketplaceFactory {
  static createClient(marketplace: OrdinalsMarketplace, config?: any) {
    switch (marketplace) {
      case OrdinalsMarketplace.MAGIC_EDEN:
        return magicEdenAPI;
      case OrdinalsMarketplace.OKX:
        return okxOrdinalsAPI;
      case OrdinalsMarketplace.UNISAT:
        return new UniSatAPI(config?.apiKey);
      case OrdinalsMarketplace.HIRO:
        return hiroOrdinalsService;
      default:
        throw new Error(`Unsupported marketplace: ${marketplace}`);
    }
  }

  static getAllClients(config?: { uniSatApiKey?: string }) {
    // Lazy initialization to avoid circular dependency issues
    const clients: Record<string, any> = {};

    try {
      // Import magicEdenAPI lazily
      const { magicEdenAPI } = require('./MagicEdenAPI');
      clients[OrdinalsMarketplace.MAGIC_EDEN] = magicEdenAPI;
    } catch (error) {
      clients[OrdinalsMarketplace.MAGIC_EDEN] = null;
    }

    try {
      // Import okxOrdinalsAPI lazily
      const { okxOrdinalsAPI } = require('./OKXOrdinalsAPI');
      clients[OrdinalsMarketplace.OKX] = okxOrdinalsAPI;
    } catch (error) {
      clients[OrdinalsMarketplace.OKX] = null;
    }

    try {
      // Import UniSatAPI lazily
      const { UniSatAPI } = require('./UniSatAPI');
      clients[OrdinalsMarketplace.UNISAT] = new UniSatAPI(config?.uniSatApiKey);
    } catch (error) {
      clients[OrdinalsMarketplace.UNISAT] = null;
    }

    try {
      // Import hiroOrdinalsService lazily
      const { hiroOrdinalsService } = require('../../HiroOrdinalsService');
      clients[OrdinalsMarketplace.HIRO] = hiroOrdinalsService;
    } catch (error) {
      clients[OrdinalsMarketplace.HIRO] = null;
    }

    return clients;
  }
}