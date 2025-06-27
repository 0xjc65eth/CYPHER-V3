/**
 * CYPHER ORDI FUTURE v3.1.0 - Runes Balance API
 * API robusta para buscar balances de Runes por endereço com múltiplos fallbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiCache, CacheKeys, CACHE_TTL, isValidBitcoinAddress, sanitizeAddress } from '@/lib/apiCache';
import { devLogger } from '@/lib/logger';

// Types
interface RuneBalance {
  rune: string;
  rune_id: string;
  symbol?: string;
  balance: string;
  decimal_balance: number;
  decimals: number;
  divisibility: number;
  spacers?: number;
  premine?: string;
  burned?: string;
  mints?: number;
  cap?: string;
  per_mint_amount?: string;
  start_height?: number;
  end_height?: number;
  mint_height?: number;
  timestamp?: number;
  location?: string;
  output?: string;
  number?: number;
  deployed_at?: {
    block_height: number;
    tx_id: string;
    timestamp: number;
  };
  market_data?: {
    floor_price?: number;
    market_cap?: number;
    volume_24h?: number;
    price_change_24h?: number;
    last_sale?: number;
    holders?: number;
  };
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
    website?: string;
    twitter?: string;
    discord?: string;
  };
}

interface RunesPortfolio {
  address: string;
  total_runes: number;
  total_value_btc?: number;
  total_value_usd?: number;
  balances: RuneBalance[];
  page: number;
  limit: number;
  has_more: boolean;
  last_updated: number;
}

interface RuneActivity {
  type: 'mint' | 'transfer' | 'etch' | 'burn';
  rune: string;
  amount: string;
  from_address?: string;
  to_address?: string;
  tx_id: string;
  block_height: number;
  timestamp: number;
  fee?: number;
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
 * Hiro API Client for Runes
 */
async function fetchFromHiro(address: string, page = 0, limit = 50): Promise<RunesPortfolio> {
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
  
  // Get runes balances for address
  const response = await fetch(
    `${baseUrl}/ordinals/v1/runes/balances/${address}?limit=${limit}&offset=${offset}`,
    {
      headers,
      next: { revalidate: 180 }
    }
  );

  if (!response.ok) {
    throw new Error(`Hiro Runes API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  const balances: RuneBalance[] = (data.results || []).map((rune: any) => {
    const balance = parseFloat(rune.balance || '0');
    const decimals = rune.rune?.divisibility || 0;
    const decimalBalance = balance / Math.pow(10, decimals);

    return {
      rune: rune.rune?.spaced_name || rune.rune?.name || rune.rune_id,
      rune_id: rune.rune_id,
      symbol: rune.rune?.symbol,
      balance: rune.balance,
      decimal_balance: decimalBalance,
      decimals: decimals,
      divisibility: decimals,
      spacers: rune.rune?.spacers,
      premine: rune.rune?.premine,
      burned: rune.rune?.burned,
      mints: rune.rune?.mints,
      cap: rune.rune?.cap,
      per_mint_amount: rune.rune?.per_mint_amount,
      start_height: rune.rune?.start_height,
      end_height: rune.rune?.end_height,
      mint_height: rune.rune?.mint_height,
      timestamp: rune.rune?.timestamp,
      location: rune.location,
      output: rune.output,
      number: rune.rune?.number,
      deployed_at: rune.rune?.deployed_at ? {
        block_height: rune.rune.deployed_at.block_height,
        tx_id: rune.rune.deployed_at.tx_id,
        timestamp: rune.rune.deployed_at.timestamp
      } : undefined
    };
  });

  return {
    address,
    total_runes: data.total || balances.length,
    balances,
    page,
    limit,
    has_more: (data.total || 0) > offset + limit,
    last_updated: Date.now()
  };
}

/**
 * OrdScan API Client for Runes
 */
async function fetchFromOrdScan(address: string, page = 0, limit = 50): Promise<RunesPortfolio> {
  const baseUrl = 'https://api.ordscan.io';
  
  const offset = page * limit;
  
  const response = await fetch(
    `${baseUrl}/v1/runes/balances/${address}?limit=${limit}&offset=${offset}`,
    {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CypherOrdi/1.0'
      },
      next: { revalidate: 180 }
    }
  );

  if (!response.ok) {
    throw new Error(`OrdScan Runes API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  const balances: RuneBalance[] = (data.balances || []).map((item: any) => {
    const balance = parseFloat(item.balance || '0');
    const decimals = item.divisibility || 0;
    const decimalBalance = balance / Math.pow(10, decimals);

    return {
      rune: item.rune_name || item.rune_id,
      rune_id: item.rune_id,
      symbol: item.symbol,
      balance: item.balance,
      decimal_balance: decimalBalance,
      decimals: decimals,
      divisibility: decimals,
      spacers: item.spacers,
      premine: item.premine,
      burned: item.burned,
      mints: item.mints,
      cap: item.cap,
      per_mint_amount: item.per_mint_amount,
      start_height: item.start_height,
      end_height: item.end_height,
      mint_height: item.mint_height,
      timestamp: item.timestamp,
      location: item.location,
      output: item.output,
      number: item.number,
      market_data: item.market_data ? {
        floor_price: item.market_data.floor_price,
        market_cap: item.market_data.market_cap,
        volume_24h: item.market_data.volume_24h,
        price_change_24h: item.market_data.price_change_24h,
        last_sale: item.market_data.last_sale,
        holders: item.market_data.holders
      } : undefined,
      metadata: item.metadata
    };
  });

  return {
    address,
    total_runes: data.total || balances.length,
    balances,
    page,
    limit,
    has_more: (data.total || balances.length) > offset + limit,
    last_updated: Date.now()
  };
}

/**
 * UniSat API Client for Runes
 */
async function fetchFromUniSat(address: string, page = 0, limit = 50): Promise<RunesPortfolio> {
  const baseUrl = 'https://open-api.unisat.io';
  const apiKey = process.env.UNISAT_API_KEY;
  
  if (!apiKey) {
    throw new Error('UniSat API key not configured');
  }

  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  const start = page * limit;
  
  const response = await fetch(
    `${baseUrl}/v1/indexer/address/${address}/runes-balance-list?start=${start}&limit=${limit}`,
    {
      headers,
      next: { revalidate: 180 }
    }
  );

  if (!response.ok) {
    throw new Error(`UniSat Runes API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.code === 0) {
    throw new Error(`UniSat API error: ${data.msg || 'Unknown error'}`);
  }

  const balances: RuneBalance[] = (data.data?.detail || []).map((item: any) => {
    const balance = parseFloat(item.amount || '0');
    const decimals = item.divisibility || 0;
    const decimalBalance = balance / Math.pow(10, decimals);

    return {
      rune: item.spacedRune || item.rune,
      rune_id: item.runeId,
      symbol: item.symbol,
      balance: item.amount,
      decimal_balance: decimalBalance,
      decimals: decimals,
      divisibility: decimals,
      spacers: item.spacers,
      number: item.runeNumber,
      deployed_at: item.etching ? {
        block_height: item.etching.block_height,
        tx_id: item.etching.txid,
        timestamp: item.etching.timestamp
      } : undefined
    };
  });

  return {
    address,
    total_runes: data.data?.total || balances.length,
    balances,
    page,
    limit,
    has_more: (data.data?.total || balances.length) > start + limit,
    last_updated: Date.now()
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
    const includeMarketData = searchParams.get('market') === 'true';

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

    devLogger.log('API', `Fetching runes balances for address: ${sanitizedAddress}, page: ${page}, limit: ${limit}`);

    // Cache key
    const cacheKey = CacheKeys.runesTokens(sanitizedAddress);

    try {
      const runesData = await apiCache.getWithFallback<RunesPortfolio>(
        cacheKey,
        [
          {
            name: 'hiro',
            endpoint: 'runes',
            fetchFn: () => fetchFromHiro(sanitizedAddress, page, limit)
          },
          {
            name: 'ordscan',
            endpoint: 'runes',
            fetchFn: () => fetchFromOrdScan(sanitizedAddress, page, limit)
          }
          // UniSat commented out as it requires API key
          // {
          //   name: 'unisat',
          //   endpoint: 'runes',
          //   fetchFn: () => fetchFromUniSat(sanitizedAddress, page, limit)
          // }
        ],
        CACHE_TTL.runes
      );

      const response: ApiResponse<RunesPortfolio> = {
        success: true,
        data: runesData,
        cached: !forceRefresh,
        pagination: {
          page: runesData.page,
          limit: runesData.limit,
          total: runesData.total_runes,
          hasMore: runesData.has_more
        }
      };

      devLogger.performance(`Runes Balance API`, Date.now() - startTime);
      return NextResponse.json(response);

    } catch (error) {
      devLogger.error(error as Error, 'Failed to fetch runes balances with fallback');
      
      // Return mock empty data when all providers fail
      const mockData: RunesPortfolio = {
        address: sanitizedAddress,
        total_runes: 0,
        balances: [],
        page,
        limit,
        has_more: false,
        last_updated: Date.now()
      };

      const response: ApiResponse<RunesPortfolio> = {
        success: true,
        data: mockData,
        cached: false,
        pagination: {
          page: mockData.page,
          limit: mockData.limit,
          total: mockData.total_runes,
          hasMore: mockData.has_more
        }
      };

      devLogger.log('API', `Returning mock data for runes due to provider failures`);
      devLogger.performance(`Runes Balance API (Mock)`, Date.now() - startTime);
      return NextResponse.json(response);
    }

  } catch (error) {
    devLogger.error(error as Error, 'Runes Balance API Error');
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * POST handler for batch runes balance requests
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { rune_ids } = body;

    if (!rune_ids || !Array.isArray(rune_ids)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'rune_ids array is required'
      }, { status: 400 });
    }

    if (rune_ids.length > 20) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Maximum 20 rune IDs allowed per batch request'
      }, { status: 400 });
    }

    const { address } = await params;
    const sanitizedAddress = sanitizeAddress(address);
    
    if (!isValidBitcoinAddress(sanitizedAddress)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid Bitcoin address format'
      }, { status: 400 });
    }

    devLogger.log('API', `Batch runes balance request for address: ${sanitizedAddress}, runes: ${rune_ids.length}`);

    // Get full portfolio first
    const cacheKey = CacheKeys.runesTokens(sanitizedAddress);
    
    const runesData = await apiCache.getWithFallback<RunesPortfolio>(
      cacheKey,
      [
        {
          name: 'hiro',
          endpoint: 'runes',
          fetchFn: () => fetchFromHiro(sanitizedAddress, 0, 100)
        },
        {
          name: 'ordscan',
          endpoint: 'runes',
          fetchFn: () => fetchFromOrdScan(sanitizedAddress, 0, 100)
        }
      ],
      CACHE_TTL.runes
    );

    // Filter by requested rune IDs
    const filteredBalances = runesData.balances.filter(balance => 
      rune_ids.includes(balance.rune_id) || rune_ids.includes(balance.rune)
    );

    const response: ApiResponse<{ balances: RuneBalance[] }> = {
      success: true,
      data: {
        balances: filteredBalances
      }
    };

    devLogger.performance(`Batch Runes Balance API`, Date.now() - startTime);
    return NextResponse.json(response);

  } catch (error) {
    devLogger.error(error as Error, 'Batch Runes Balance API Error');
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}