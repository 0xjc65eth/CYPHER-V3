/**
 * 🎨 Ordinals & Runes API Integration
 * Conecta com marketplaces e APIs de Ordinals/Runes
 */

export interface OrdinalCollection {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  floorPrice: number;
  totalVolume: number;
  itemCount: number;
  ownerCount: number;
  listed: number;
  marketCap: number;
  change24h: number;
}

export interface RuneToken {
  id: string;
  name: string;
  symbol: string;
  totalSupply: string;
  holders: number;
  marketCap: number;
  price: number;
  change24h: number;
  volume24h: number;
}

export interface OrdinalInscription {
  id: string;
  number: number;
  contentType: string;
  contentUrl: string;
  owner: string;
  satPoint: string;
  genesisHeight: number;
  genesisTransaction: string;
  listed: boolean;
  price?: number;
}

class OrdinalsAPI {
  private baseUrl: string;
  
  constructor() {
    // In production, use real API endpoints
    this.baseUrl = 'https://api.ordinals.com/v1';
  }

  async getTrendingCollections(): Promise<OrdinalCollection[]> {
    // Mock data - in production, fetch from real APIs
    return [
      {
        id: 'bitcoin-frogs',
        name: 'Bitcoin Frogs',
        slug: 'bitcoin-frogs',
        imageUrl: '/ordinals/bitcoin-frogs.png',
        floorPrice: 0.015,
        totalVolume: 234.5,
        itemCount: 10000,
        ownerCount: 3456,
        listed: 234,
        marketCap: 150,
        change24h: 5.6
      },
      {
        id: 'ordinal-punks',
        name: 'Ordinal Punks',
        slug: 'ordinal-punks',
        imageUrl: '/ordinals/ordinal-punks.png',
        floorPrice: 0.089,
        totalVolume: 567.8,
        itemCount: 100,
        ownerCount: 89,
        listed: 12,
        marketCap: 8.9,
        change24h: -2.3
      },
      {
        id: 'bitcoin-puppets',
        name: 'Bitcoin Puppets',
        slug: 'bitcoin-puppets',
        imageUrl: '/ordinals/bitcoin-puppets.png',
        floorPrice: 0.025,
        totalVolume: 123.4,
        itemCount: 5000,
        ownerCount: 2100,
        listed: 145,
        marketCap: 125,
        change24h: 12.4
      }
    ];
  }

  async getRuneTokens(): Promise<RuneToken[]> {
    // Mock data
    return [
      {
        id: 'PUPS',
        name: 'PUPS•WORLD•PEACE',
        symbol: 'PUPS',
        totalSupply: '1000000000',
        holders: 5678,
        marketCap: 45000000,
        price: 0.045,
        change24h: 8.9,
        volume24h: 2345678
      },
      {
        id: 'RSIC',
        name: 'RSIC•GENESIS•RUNE',
        symbol: 'RSIC',
        totalSupply: '21000000',
        holders: 3421,
        marketCap: 32000000,
        price: 1.52,
        change24h: -3.2,
        volume24h: 1234567
      },
      {
        id: 'SATOSHI',
        name: 'SATOSHI•NAKAMOTO',
        symbol: 'SATOSHI',
        totalSupply: '21000000000',
        holders: 8901,
        marketCap: 12000000,
        price: 0.00057,
        change24h: 15.3,
        volume24h: 567890
      }
    ];
  }

  async getInscriptionById(id: string): Promise<OrdinalInscription | null> {
    // Mock implementation
    return {
      id,
      number: 0,
      contentType: 'image/png',
      contentUrl: `https://ordinals.com/content/${id}`,
      owner: 'bc1p...',
      satPoint: `${id}:0:0`,
      genesisHeight: 700000,
      genesisTransaction: id,
      listed: false,
      price: undefined
    };
  }

  async getCollectionStats(slug: string): Promise<any> {
    // Mock stats
    return {
      floorPrice: 0.05,
      listedCount: 234,
      volumeAll: 1234.5,
      volume24h: 23.4,
      volume7d: 156.7,
      salesAll: 5678,
      sales24h: 45,
      sales7d: 312,
      averagePrice24h: 0.052,
      averagePrice7d: 0.048
    };
  }
}

// Singleton instance
let apiInstance: OrdinalsAPI | null = null;

export function getOrdinalsAPI(): OrdinalsAPI {
  if (!apiInstance) {
    apiInstance = new OrdinalsAPI();
  }
  return apiInstance;
}