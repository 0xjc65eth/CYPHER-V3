/**
 * 🎨 ORDINALS DATA API
 * Real-time Ordinals market data and collections
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  withMiddleware,
  createSuccessResponse,
  createErrorResponse,
  corsHeaders
} from '@/lib/api-middleware';

interface OrdinalInscription {
  id: string;
  inscriptionId: string;
  number: number;
  title: string;
  contentType: string;
  contentLength: number;
  timestamp: number;
  genesis: string;
  location: string;
  output: string;
  offset: number;
  sat: number;
  value: number;
  preview: string;
  collection?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface OrdinalCollection {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  floorPrice: number;
  totalVolume: number;
  owners: number;
  listed: number;
  totalSupply: number;
  change24h: number;
  sales24h: number;
  volume24h: number;
  topSale: number;
  lastSale: number;
  verified: boolean;
  createdAt: number;
}

interface OrdinalsMarketData {
  totalInscriptions: number;
  totalVolume24h: number;
  totalSales24h: number;
  averagePrice: number;
  topCollections: OrdinalCollection[];
  recentInscriptions: OrdinalInscription[];
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  lastUpdate: number;
}

class OrdinalsEngine {
  private static instance: OrdinalsEngine;

  static getInstance(): OrdinalsEngine {
    if (!OrdinalsEngine.instance) {
      OrdinalsEngine.instance = new OrdinalsEngine();
    }
    return OrdinalsEngine.instance;
  }

  getOrdinalsData(): OrdinalsMarketData {
    const topCollections: OrdinalCollection[] = [
      {
        id: 'bitcoin-punks',
        name: 'Bitcoin Punks',
        description: 'The first 10k profile picture collection on Bitcoin via Ordinals',
        imageUrl: '/images/bitcoin-punks.png',
        floorPrice: 0.05,
        totalVolume: 2500,
        owners: 3200,
        listed: 145,
        totalSupply: 10000,
        change24h: 12.5,
        sales24h: 23,
        volume24h: 125.5,
        topSale: 15.8,
        lastSale: 0.12,
        verified: true,
        createdAt: Date.now() - 86400000 * 90
      },
      {
        id: 'ordinal-rocks',
        name: 'Ordinal Rocks',
        description: 'Digital rocks on Bitcoin blockchain via Ordinals protocol',
        imageUrl: '/images/ordinal-rocks.png',
        floorPrice: 0.03,
        totalVolume: 1800,
        owners: 2100,
        listed: 89,
        totalSupply: 5000,
        change24h: -5.2,
        sales24h: 18,
        volume24h: 95.2,
        topSale: 8.5,
        lastSale: 0.08,
        verified: true,
        createdAt: Date.now() - 86400000 * 75
      },
      {
        id: 'satoshi-nakamoto-cards',
        name: 'Satoshi Nakamoto Cards',
        description: 'Trading cards commemorating Bitcoin history',
        imageUrl: '/images/satoshi-cards.png',
        floorPrice: 0.015,
        totalVolume: 950,
        owners: 1580,
        listed: 67,
        totalSupply: 2100,
        change24h: 8.7,
        sales24h: 12,
        volume24h: 45.8,
        topSale: 5.2,
        lastSale: 0.025,
        verified: true,
        createdAt: Date.now() - 86400000 * 60
      },
      {
        id: 'genesis-ordinals',
        name: 'Genesis Ordinals',
        description: 'Historical Bitcoin moments inscribed as Ordinals',
        imageUrl: '/images/genesis-ordinals.png',
        floorPrice: 0.08,
        totalVolume: 3200,
        owners: 890,
        listed: 34,
        totalSupply: 1000,
        change24h: 25.3,
        sales24h: 8,
        volume24h: 180.5,
        topSale: 45.2,
        lastSale: 0.15,
        verified: true,
        createdAt: Date.now() - 86400000 * 45
      },
      {
        id: 'pixel-pepes',
        name: 'Pixel Pepes',
        description: 'Rare pixel art Pepes on Bitcoin',
        imageUrl: '/images/pixel-pepes.png',
        floorPrice: 0.02,
        totalVolume: 680,
        owners: 1200,
        listed: 156,
        totalSupply: 4444,
        change24h: -8.1,
        sales24h: 15,
        volume24h: 38.5,
        topSale: 3.8,
        lastSale: 0.035,
        verified: false,
        createdAt: Date.now() - 86400000 * 30
      }
    ];

    const recentInscriptions: OrdinalInscription[] = [
      {
        id: 'inscription_1',
        inscriptionId: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567bcd890efg123',
        number: 45892341,
        title: 'Rare Bitcoin Art #1',
        contentType: 'image/png',
        contentLength: 25600,
        timestamp: Date.now() - 3600000,
        genesis: 'bc1q...abc123',
        location: '45892341:0:0',
        output: 'bc1q...def456',
        offset: 0,
        sat: 1920845792341,
        value: 546,
        preview: '/api/inscriptions/abc123def456/preview',
        collection: 'bitcoin-punks',
        rarity: 'rare',
        attributes: [
          { trait_type: 'Background', value: 'Blue' },
          { trait_type: 'Type', value: 'Human' },
          { trait_type: 'Accessory', value: 'Glasses' }
        ]
      },
      {
        id: 'inscription_2',
        inscriptionId: 'def456ghi789jkl012mno345pqr678stu901vwx234yza567bcd890efg123hij456',
        number: 45892342,
        title: 'Digital Rock #4422',
        contentType: 'image/svg+xml',
        contentLength: 1200,
        timestamp: Date.now() - 7200000,
        genesis: 'bc1q...ghi789',
        location: '45892342:0:0',
        output: 'bc1q...jkl012',
        offset: 0,
        sat: 1920845792342,
        value: 546,
        preview: '/api/inscriptions/def456ghi789/preview',
        collection: 'ordinal-rocks',
        rarity: 'common'
      },
      {
        id: 'inscription_3',
        inscriptionId: 'ghi789jkl012mno345pqr678stu901vwx234yza567bcd890efg123hij456klm789',
        number: 45892343,
        title: 'Genesis Block Art',
        contentType: 'text/html',
        contentLength: 5400,
        timestamp: Date.now() - 10800000,
        genesis: 'bc1q...mno345',
        location: '45892343:0:0',
        output: 'bc1q...pqr678',
        offset: 0,
        sat: 1920845792343,
        value: 546,
        preview: '/api/inscriptions/ghi789jkl012/preview',
        collection: 'genesis-ordinals',
        rarity: 'legendary'
      }
    ];

    const totalVolume24h = topCollections.reduce((sum, col) => sum + col.volume24h, 0);
    const totalSales24h = topCollections.reduce((sum, col) => sum + col.sales24h, 0);
    const averageChange = topCollections.reduce((sum, col) => sum + col.change24h, 0) / topCollections.length;

    return {
      totalInscriptions: 45892343,
      totalVolume24h,
      totalSales24h,
      averagePrice: totalVolume24h / totalSales24h,
      topCollections,
      recentInscriptions,
      marketSentiment: averageChange > 5 ? 'bullish' : averageChange < -5 ? 'bearish' : 'neutral',
      lastUpdate: Date.now()
    };
  }

  getCollectionDetails(collectionId: string): OrdinalCollection | null {
    const data = this.getOrdinalsData();
    return data.topCollections.find(col => col.id === collectionId) || null;
  }

  getInscriptionDetails(inscriptionId: string): OrdinalInscription | null {
    const data = this.getOrdinalsData();
    return data.recentInscriptions.find(ins => ins.inscriptionId === inscriptionId) || null;
  }
}

async function handleOrdinalsData(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const collectionId = url.searchParams.get('collection');
    const inscriptionId = url.searchParams.get('inscription');
    
    const engine = OrdinalsEngine.getInstance();

    if (collectionId) {
      const collection = engine.getCollectionDetails(collectionId);
      if (!collection) {
        return NextResponse.json(
          createErrorResponse('Collection not found'),
          { status: 404, headers: corsHeaders }
        );
      }
      return NextResponse.json(
        createSuccessResponse({ collection }, 'Collection details retrieved successfully'),
        { headers: corsHeaders }
      );
    }

    if (inscriptionId) {
      const inscription = engine.getInscriptionDetails(inscriptionId);
      if (!inscription) {
        return NextResponse.json(
          createErrorResponse('Inscription not found'),
          { status: 404, headers: corsHeaders }
        );
      }
      return NextResponse.json(
        createSuccessResponse({ inscription }, 'Inscription details retrieved successfully'),
        { headers: corsHeaders }
      );
    }

    const ordinalsData = engine.getOrdinalsData();

    // NOTA: Dados são mock/fallback - integrar com Magic Eden/Hiro API para dados reais
    return NextResponse.json(
      createSuccessResponse(
        { ...ordinalsData, isMockData: true },
        'Ordinals data retrieved (fallback - real API integration pending)'
      ),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Ordinals data error:', error);
    
    return NextResponse.json(
      createErrorResponse('Failed to retrieve ordinals data', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export const GET = withMiddleware(handleOrdinalsData, {
  rateLimit: {
    windowMs: 60000,
    maxRequests: 120,
  },
  cache: {
    ttl: 30,
  }
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
}