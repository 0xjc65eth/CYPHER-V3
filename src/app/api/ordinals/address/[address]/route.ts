/**
 * CYPHER ORDI FUTURE v3.1.0 - Ordinals Address API
 * API robusta para buscar Ordinals por endereço com múltiplos fallbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiCache, CacheKeys, CACHE_TTL, isValidBitcoinAddress, sanitizeAddress } from '@/lib/apiCache';
import { devLogger } from '@/lib/logger';

// Types
interface Inscription {
  id: string;
  number: number;
  address: string;
  content_type?: string;
  content_length?: number;
  content_encoding?: string;
  content?: string;
  preview?: string;
  title?: string;
  sat?: number;
  satpoint?: string;
  location?: string;
  output?: string;
  output_value?: number;
  timestamp?: number;
  genesis_height?: number;
  genesis_fee?: number;
  genesis_transaction?: string;
  collection?: {
    id: string;
    name: string;
    slug: string;
    symbol?: string;
    description?: string;
    total_supply?: number;
    floor_price?: number;
  };
  rarity?: {
    rank: number;
    score: number;
    category: string;
  };
  metadata?: Record<string, any>;
  traits?: Array<{
    trait_type: string;
    value: string;
    rarity_percentage?: number;
  }>;
}

interface OrdinalsBalance {
  address: string;
  total_inscriptions: number;
  inscriptions: Inscription[];
  collections: Array<{
    id: string;
    name: string;
    count: number;
    floor_price?: number;
    total_value?: number;
  }>;
  total_value?: number;
  page: number;
  limit: number;
  has_more: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  source?: string;
  cached?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Hiro API Client for Ordinals
 */
async function fetchFromHiro(address: string, page = 0, limit = 50): Promise<OrdinalsBalance> {
  const baseUrl = process.env.HIRO_API_URL || 'https://api.hiro.so';
  const apiKey = process.env.HIRO_API_KEY;
  
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const offset = page * limit;
  
  // Get inscriptions for address
  const response = await fetch(
    `${baseUrl}/ordinals/v1/inscriptions?address=${address}&limit=${limit}&offset=${offset}`,
    {
      headers,
      next: { revalidate: 300 }
    }
  );

  if (!response.ok) {
    throw new Error(`Hiro Ordinals API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  const inscriptions: Inscription[] = (data.results || []).map((inscription: any) => {
    return {
      id: inscription.id,
      number: inscription.number,
      address: inscription.address || address,
      content_type: inscription.content_type,
      content_length: inscription.content_length,
      content_encoding: inscription.content_encoding,
      sat: inscription.sat,
      satpoint: inscription.satpoint,
      location: inscription.location,
      output: inscription.output,
      output_value: inscription.output_value,
      timestamp: inscription.timestamp,
      genesis_height: inscription.genesis_height,
      genesis_fee: inscription.genesis_fee,
      genesis_transaction: inscription.genesis_tx_id,
      metadata: inscription.metadata
    };
  });

  // Group by collections
  const collectionsMap = new Map<string, any>();
  
  inscriptions.forEach(inscription => {
    if (inscription.collection) {
      const collectionId = inscription.collection.id;
      if (!collectionsMap.has(collectionId)) {
        collectionsMap.set(collectionId, {
          id: collectionId,
          name: inscription.collection.name,
          count: 0,
          floor_price: inscription.collection.floor_price
        });
      }
      collectionsMap.get(collectionId).count++;
    }
  });

  return {
    address,
    total_inscriptions: data.total || 0,
    inscriptions,
    collections: Array.from(collectionsMap.values()),
    page,
    limit,
    has_more: (data.total || 0) > offset + limit
  };
}

/**
 * OrdScan API Client
 */
async function fetchFromOrdScan(address: string, page = 0, limit = 50): Promise<OrdinalsBalance> {
  const baseUrl = 'https://api.ordscan.io';
  
  const offset = page * limit;
  
  const response = await fetch(
    `${baseUrl}/v1/inscriptions/address/${address}?limit=${limit}&offset=${offset}`,
    {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CypherOrdi/1.0'
      },
      next: { revalidate: 300 }
    }
  );

  if (!response.ok) {
    throw new Error(`OrdScan API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  const inscriptions: Inscription[] = (data.inscriptions || []).map((item: any) => {
    return {
      id: item.inscription_id,
      number: item.inscription_number,
      address,
      content_type: item.content_type,
      content_length: item.content_length,
      sat: item.sat,
      satpoint: item.satpoint,
      location: item.location,
      output: item.output,
      output_value: item.output_value,
      timestamp: item.timestamp,
      genesis_height: item.genesis_height,
      genesis_fee: item.genesis_fee,
      genesis_transaction: item.genesis_tx_id,
      collection: item.collection ? {
        id: item.collection.id,
        name: item.collection.name,
        slug: item.collection.slug,
        symbol: item.collection.symbol,
        description: item.collection.description,
        total_supply: item.collection.total_supply,
        floor_price: item.collection.floor_price
      } : undefined,
      traits: item.traits
    };
  });

  // Group by collections
  const collectionsMap = new Map<string, any>();
  
  inscriptions.forEach(inscription => {
    if (inscription.collection) {
      const collectionId = inscription.collection.id;
      if (!collectionsMap.has(collectionId)) {
        collectionsMap.set(collectionId, {
          id: collectionId,
          name: inscription.collection.name,
          count: 0,
          floor_price: inscription.collection.floor_price
        });
      }
      collectionsMap.get(collectionId).count++;
    }
  });

  return {
    address,
    total_inscriptions: data.total || inscriptions.length,
    inscriptions,
    collections: Array.from(collectionsMap.values()),
    page,
    limit,
    has_more: (data.total || inscriptions.length) > offset + limit
  };
}

/**
 * Magic Eden API Client
 */
async function fetchFromMagicEden(address: string, page = 0, limit = 50): Promise<OrdinalsBalance> {
  const baseUrl = 'https://api-mainnet.magiceden.io/v2';
  
  const offset = page * limit;
  
  const response = await fetch(
    `${baseUrl}/ord/btc/tokens?ownerAddress=${address}&limit=${limit}&offset=${offset}`,
    {
      headers: {
        'Accept': 'application/json'
      },
      next: { revalidate: 300 }
    }
  );

  if (!response.ok) {
    throw new Error(`Magic Eden API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  const inscriptions: Inscription[] = (data.tokens || []).map((token: any) => {
    return {
      id: token.id,
      number: token.inscriptionNumber,
      address,
      content_type: token.contentType,
      sat: token.sat,
      location: token.location,
      output: token.output,
      output_value: token.outputValue,
      collection: token.collectionSymbol ? {
        id: token.collectionSymbol,
        name: token.collectionName || token.collectionSymbol,
        slug: token.collectionSymbol
      } : undefined,
      metadata: {
        name: token.meta?.name,
        description: token.meta?.description,
        attributes: token.meta?.attributes
      }
    };
  });

  // Group by collections
  const collectionsMap = new Map<string, any>();
  
  inscriptions.forEach(inscription => {
    if (inscription.collection) {
      const collectionId = inscription.collection.id;
      if (!collectionsMap.has(collectionId)) {
        collectionsMap.set(collectionId, {
          id: collectionId,
          name: inscription.collection.name,
          count: 0
        });
      }
      collectionsMap.get(collectionId).count++;
    }
  });

  return {
    address,
    total_inscriptions: data.total || inscriptions.length,
    inscriptions,
    collections: Array.from(collectionsMap.values()),
    page,
    limit,
    has_more: inscriptions.length === limit // Estimate based on response size
  };
}

/**
 * Main API Handler
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const startTime = Date.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '0');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100
    const forceRefresh = searchParams.get('refresh') === 'true';
    const includeMetadata = searchParams.get('metadata') === 'true';

    const { address } = await params;

    // Validation
    if (!address) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Address parameter is required'
      }, { status: 400 });
    }

    const sanitizedAddress = sanitizeAddress(address);
    
    if (!isValidBitcoinAddress(sanitizedAddress)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid Bitcoin address format'
      }, { status: 400 });
    }

    if (page < 0 || limit < 1) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid pagination parameters'
      }, { status: 400 });
    }

    devLogger.log('API', `Fetching ordinals for address: ${sanitizedAddress}, page: ${page}, limit: ${limit}`);

    // Cache key
    const cacheKey = CacheKeys.ordinalsInscriptions(sanitizedAddress, page);

    try {
      const ordinalsData = await apiCache.getWithFallback<OrdinalsBalance>(
        cacheKey,
        [
          {
            name: 'hiro',
            endpoint: 'ordinals',
            fetchFn: () => fetchFromHiro(sanitizedAddress, page, limit)
          },
          {
            name: 'ordscan',
            endpoint: 'inscriptions',
            fetchFn: () => fetchFromOrdScan(sanitizedAddress, page, limit)
          }
          // Magic Eden commented out as it may have stricter rate limits
          // {
          //   name: 'magiceden',
          //   endpoint: 'tokens',
          //   fetchFn: () => fetchFromMagicEden(sanitizedAddress, page, limit)
          // }
        ],
        CACHE_TTL.ordinals
      );

      const response: ApiResponse<OrdinalsBalance> = {
        success: true,
        data: ordinalsData,
        cached: !forceRefresh,
        pagination: {
          page: ordinalsData.page,
          limit: ordinalsData.limit,
          total: ordinalsData.total_inscriptions,
          hasMore: ordinalsData.has_more
        }
      };

      devLogger.performance(`Ordinals API`, Date.now() - startTime);
      return NextResponse.json(response);

    } catch (error) {
      devLogger.error(error as Error, 'Failed to fetch ordinals with fallback');
      
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch ordinals data'
      }, { status: 500 });
    }

  } catch (error) {
    devLogger.error(error as Error, 'Ordinals Address API Error');
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}