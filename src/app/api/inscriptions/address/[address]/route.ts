import { NextRequest, NextResponse } from 'next/server';
import { bitcoinAddressSchema, inscriptionSchema } from '@/lib/validation/schemas';
import { cacheInstances } from '@/lib/cache/advancedCache';
import { applyRateLimit, apiRateLimiters } from '@/lib/api/middleware/rateLimiter';
import { hiroAPI } from '@/lib/api/hiro';

interface RouteParams {
  params: Promise<{
    address: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(request, apiRateLimiters.standard);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const { address } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const validSorts = ['number', 'timestamp', 'value'];
    const sortBy = validSorts.includes(searchParams.get('sort') || '') ? searchParams.get('sort')! : 'number';
    const validOrders = ['asc', 'desc'];
    const order = validOrders.includes(searchParams.get('order') || '') ? searchParams.get('order')! : 'desc';
    const contentType = searchParams.get('content_type'); // filter by content type
    const rarity = searchParams.get('rarity'); // filter by sat rarity

    // Validate Bitcoin address
    const addressValidation = bitcoinAddressSchema.safeParse(address);
    if (!addressValidation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid Bitcoin address format',
          message: 'Please provide a valid Bitcoin address'
        },
        { status: 400 }
      );
    }

    // Build cache key with all parameters
    const cacheKey = `inscriptions:${address}:${limit}:${offset}:${sortBy}:${order}:${contentType || 'all'}:${rarity || 'all'}`;
    
    // Check cache first
    let inscriptionsData = await cacheInstances.blockchain.get(cacheKey);

    if (!inscriptionsData) {
      // Fetch fresh data
      inscriptionsData = await fetchInscriptionsByAddress(address, {
        limit,
        offset,
        sortBy,
        order,
        contentType,
        rarity
      });
      
      // Cache for 10 minutes
      await cacheInstances.blockchain.set(cacheKey, inscriptionsData, {
        ttl: 600,
        tags: ['inscriptions', 'blockchain', address]
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      address,
      data: inscriptionsData,
      pagination: {
        limit,
        offset,
        total: inscriptionsData.total,
        hasMore: (offset + limit) < inscriptionsData.total
      },
      filters: {
        sortBy,
        order,
        contentType,
        rarity
      }
    });

  } catch (error) {
    console.error('Inscriptions by address API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch inscriptions'
      },
      { status: 500 }
    );
  }
}

async function fetchInscriptionsByAddress(
  address: string, 
  options: {
    limit: number;
    offset: number;
    sortBy: string;
    order: string;
    contentType?: string | null;
    rarity?: string | null;
  }
) {
  try {
    // First try to get data from Hiro API
    let hiroData = null;
    try {
      hiroData = await hiroAPI.ordinals.getInscriptionsByAddress(address, {
        limit: options.limit,
        offset: options.offset
      });
    } catch (error) {
    }

    // If Hiro API fails, throw error - NO MOCK DATA
    if (!hiroData) {
      throw new Error('Failed to fetch real inscriptions data from Hiro API');
    }

    // Process and enrich the inscription data
    const enrichedInscriptions = await enrichInscriptionData(hiroData.results);

    // Apply filters
    let filteredInscriptions = enrichedInscriptions;
    
    if (options.contentType) {
      filteredInscriptions = filteredInscriptions.filter(
        inscription => inscription.contentType.includes(options.contentType!)
      );
    }
    
    if (options.rarity) {
      filteredInscriptions = filteredInscriptions.filter(
        inscription => inscription.satRarity === options.rarity
      );
    }

    // Apply sorting
    filteredInscriptions.sort((a, b) => {
      let aValue, bValue;
      
      switch (options.sortBy) {
        case 'number':
          aValue = a.number;
          bValue = b.number;
          break;
        case 'timestamp':
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case 'value':
          aValue = a.value || 0;
          bValue = b.value || 0;
          break;
        default:
          aValue = a.number;
          bValue = b.number;
      }
      
      return options.order === 'desc' ? bValue - aValue : aValue - bValue;
    });

    // Calculate collection statistics
    const statistics = calculateInscriptionStatistics(filteredInscriptions);

    return {
      inscriptions: filteredInscriptions.slice(options.offset, options.offset + options.limit),
      total: filteredInscriptions.length,
      statistics
    };

  } catch (error) {
    console.error('Error fetching inscriptions by address:', error);
    throw new Error('Failed to fetch inscriptions data');
  }
}

// REMOVIDO: generateMockInscriptionsData - Não geramos inscriptions falsas
// Apenas dados reais da Hiro API ou retorna erro

async function enrichInscriptionData(inscriptions: any[]) {
  return Promise.all(inscriptions.map(async (inscription) => {
    // Estimate inscription value based on rarity and content type
    const baseValue = estimateInscriptionValue(inscription);
    
    // Get collection information if available
    const collectionInfo = await getCollectionInfo(inscription);
    
    // Get market data
    const marketData = await getInscriptionMarketData(inscription.id);

    return {
      ...inscription,
      value: baseValue,
      estimatedPrice: baseValue,
      collection: collectionInfo,
      marketData,
      metadata: {
        isCollection: !!collectionInfo,
        verified: false,
        featured: false,
        trending: false
      }
    };
  }));
}

function estimateInscriptionValue(inscription: any): number {
  let baseValue = 1000; // Base value in sats
  
  // Rarity multiplier
  const rarityMultipliers: Record<string, number> = {
    'common': 1,
    'uncommon': 2,
    'rare': 5,
    'epic': 20,
    'legendary': 100,
    'mythic': 500
  };
  
  baseValue *= rarityMultipliers[inscription.satRarity] || 1;
  
  // Content type multiplier
  if (inscription.contentType.startsWith('image/')) {
    baseValue *= 2;
  } else if (inscription.contentType === 'text/plain') {
    baseValue *= 0.5;
  }
  
  // Size penalty for very large inscriptions
  if (inscription.contentLength > 50000) {
    baseValue *= 0.8;
  }
  
  return Math.floor(baseValue);
}

async function getCollectionInfo(_inscription: any) {
  // No fake collection data - return null until real collection lookup is implemented
  return null;
}

async function getInscriptionMarketData(_inscriptionId: string) {
  return {
    lastSale: null,
    listings: 0,
    offers: 0,
    priceHistory: [],
    volume24h: 0,
    volume7d: 0
  };
}

function generatePriceHistory(): Array<{ price: number; timestamp: Date }> {
  const history = [];
  let currentPrice = Math.floor(Math.random() * 50000) + 10000;
  
  for (let i = 30; i >= 0; i--) {
    const change = (Math.random() - 0.5) * 0.2; // ±10% daily change
    currentPrice *= (1 + change);
    
    history.push({
      price: Math.floor(currentPrice),
      timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    });
  }
  
  return history;
}

function calculateInscriptionStatistics(inscriptions: any[]) {
  const totalValue = inscriptions.reduce((sum, inscription) => sum + (inscription.value || 0), 0);
  const avgValue = totalValue / inscriptions.length;
  
  const contentTypeDistribution: Record<string, number> = {};
  const rarityDistribution: Record<string, number> = {};
  
  inscriptions.forEach(inscription => {
    const contentType = inscription.contentType.split('/')[0]; // image, text, etc.
    contentTypeDistribution[contentType] = (contentTypeDistribution[contentType] || 0) + 1;
    
    rarityDistribution[inscription.satRarity] = (rarityDistribution[inscription.satRarity] || 0) + 1;
  });
  
  const collectionCount = inscriptions.filter(i => i.collection).length;
  
  return {
    totalInscriptions: inscriptions.length,
    totalValue,
    averageValue: Math.floor(avgValue),
    collectionPercentage: (collectionCount / inscriptions.length) * 100,
    contentTypeDistribution,
    rarityDistribution,
    oldestInscription: Math.min(...inscriptions.map(i => i.number)),
    newestInscription: Math.max(...inscriptions.map(i => i.number))
  };
}