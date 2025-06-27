/**
 * CYPHER ORDI FUTURE v3.1.0 - Bitcoin Balance API
 * API robusta para buscar balance Bitcoin com múltiplos fallbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiCache, CacheKeys, CACHE_TTL, isValidBitcoinAddress, sanitizeAddress } from '@/lib/apiCache';
import { devLogger } from '@/lib/logger';

// Types
interface BitcoinBalance {
  address: string;
  confirmed: number;
  unconfirmed: number;
  total: number;
  utxoCount?: number;
  lastActivity?: string;
}

interface UTXOData {
  txid: string;
  vout: number;
  value: number;
  confirmed: boolean;
  block_height?: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  source?: string;
  cached?: boolean;
  rateLimited?: boolean;
}

/**
 * Hiro API Client
 */
async function fetchFromHiro(address: string): Promise<BitcoinBalance> {
  const baseUrl = process.env.HIRO_API_URL || 'https://api.hiro.so';
  const apiKey = process.env.HIRO_API_KEY;
  
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  // Get UTXO data from Hiro
  const utxoResponse = await fetch(`${baseUrl}/extended/v1/address/${address}/utxo`, {
    headers,
    next: { revalidate: 30 }
  });

  if (!utxoResponse.ok) {
    throw new Error(`Hiro API error: ${utxoResponse.status} ${utxoResponse.statusText}`);
  }

  const utxoData = await utxoResponse.json();
  
  // Calculate balance from UTXOs
  let confirmed = 0;
  let unconfirmed = 0;
  let utxoCount = 0;

  if (utxoData.results && Array.isArray(utxoData.results)) {
    utxoData.results.forEach((utxo: any) => {
      const value = parseInt(utxo.value) || 0;
      utxoCount++;
      
      if (utxo.block_height > 0) {
        confirmed += value;
      } else {
        unconfirmed += value;
      }
    });
  }

  return {
    address,
    confirmed,
    unconfirmed,
    total: confirmed + unconfirmed,
    utxoCount
  };
}

/**
 * Mempool.space API Client
 */
async function fetchFromMempool(address: string): Promise<BitcoinBalance> {
  const baseUrl = 'https://mempool.space/api';
  
  const response = await fetch(`${baseUrl}/address/${address}`, {
    next: { revalidate: 30 }
  });

  if (!response.ok) {
    throw new Error(`Mempool API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    address,
    confirmed: data.chain_stats?.funded_txo_sum || 0,
    unconfirmed: data.mempool_stats?.funded_txo_sum || 0,
    total: (data.chain_stats?.funded_txo_sum || 0) + (data.mempool_stats?.funded_txo_sum || 0)
  };
}

/**
 * Blockstream API Client
 */
async function fetchFromBlockstream(address: string): Promise<BitcoinBalance> {
  const baseUrl = 'https://blockstream.info/api';
  
  const response = await fetch(`${baseUrl}/address/${address}`, {
    next: { revalidate: 30 }
  });

  if (!response.ok) {
    throw new Error(`Blockstream API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    address,
    confirmed: data.chain_stats?.funded_txo_sum || 0,
    unconfirmed: data.mempool_stats?.funded_txo_sum || 0,
    total: (data.chain_stats?.funded_txo_sum || 0) + (data.mempool_stats?.funded_txo_sum || 0)
  };
}

/**
 * Main API Handler
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const forceRefresh = searchParams.get('refresh') === 'true';

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

    devLogger.log('API', `Fetching balance for address: ${sanitizedAddress}`);

    // Cache key
    const cacheKey = CacheKeys.bitcoinBalance(sanitizedAddress);

    // Try cache first (unless force refresh)
    if (!forceRefresh) {
      try {
        const cached = await apiCache.getWithFallback<BitcoinBalance>(
          cacheKey,
          [
            {
              name: 'hiro',
              endpoint: 'balance',
              fetchFn: () => fetchFromHiro(sanitizedAddress)
            },
            {
              name: 'mempool',
              endpoint: 'balance',
              fetchFn: () => fetchFromMempool(sanitizedAddress)
            },
            {
              name: 'blockstream',
              endpoint: 'balance',
              fetchFn: () => fetchFromBlockstream(sanitizedAddress)
            }
          ],
          CACHE_TTL.balance
        );

        const response: ApiResponse<BitcoinBalance> = {
          success: true,
          data: cached,
          cached: true
        };

        devLogger.performance(`Balance API (Cached)`, Date.now() - startTime);
        return NextResponse.json(response);

      } catch (error) {
        devLogger.error(error as Error, 'Failed to fetch balance with fallback');
        
        return NextResponse.json<ApiResponse>({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch balance data'
        }, { status: 500 });
      }
    }

    // Force refresh - try providers directly
    let lastError: Error | null = null;
    const providers = [
      { name: 'Hiro', fn: () => fetchFromHiro(sanitizedAddress) },
      { name: 'Mempool', fn: () => fetchFromMempool(sanitizedAddress) },
      { name: 'Blockstream', fn: () => fetchFromBlockstream(sanitizedAddress) }
    ];

    for (const provider of providers) {
      try {
        devLogger.log('API', `Trying ${provider.name} for address: ${sanitizedAddress}`);
        
        const balance = await provider.fn();
        
        // Cache the result
        await apiCache.clearCache(cacheKey);
        // Note: Direct caching would need cache service access
        
        const response: ApiResponse<BitcoinBalance> = {
          success: true,
          data: balance,
          source: provider.name,
          cached: false
        };

        devLogger.performance(`Balance API (${provider.name})`, Date.now() - startTime);
        return NextResponse.json(response);

      } catch (error) {
        lastError = error as Error;
        devLogger.error(lastError, `${provider.name} API failed`);
        continue;
      }
    }

    // All providers failed
    throw lastError || new Error('All balance providers failed');

  } catch (error) {
    devLogger.error(error as Error, 'Bitcoin Balance API Error');
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * POST handler for batch balance requests
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { addresses } = body;

    if (!addresses || !Array.isArray(addresses)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'addresses array is required'
      }, { status: 400 });
    }

    if (addresses.length > 10) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Maximum 10 addresses allowed per batch request'
      }, { status: 400 });
    }

    devLogger.log('API', `Batch balance request for ${addresses.length} addresses`);

    // Process addresses in parallel
    const results = await Promise.allSettled(
      addresses.map(async (address: string) => {
        try {
          const sanitizedAddress = sanitizeAddress(address);
          
          if (!isValidBitcoinAddress(sanitizedAddress)) {
            throw new Error(`Invalid address: ${address}`);
          }

          const cacheKey = CacheKeys.bitcoinBalance(sanitizedAddress);
          
          const balance = await apiCache.getWithFallback<BitcoinBalance>(
            cacheKey,
            [
              {
                name: 'hiro',
                endpoint: 'balance',
                fetchFn: () => fetchFromHiro(sanitizedAddress)
              },
              {
                name: 'mempool',
                endpoint: 'balance', 
                fetchFn: () => fetchFromMempool(sanitizedAddress)
              },
              {
                name: 'blockstream',
                endpoint: 'balance',
                fetchFn: () => fetchFromBlockstream(sanitizedAddress)
              }
            ],
            CACHE_TTL.balance
          );

          return { address: sanitizedAddress, balance, success: true };
        } catch (error) {
          return { 
            address, 
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false 
          };
        }
      })
    );

    const response: ApiResponse<any[]> = {
      success: true,
      data: results.map(result => 
        result.status === 'fulfilled' ? result.value : result.reason
      )
    };

    devLogger.performance(`Batch Balance API`, Date.now() - startTime);
    return NextResponse.json(response);

  } catch (error) {
    devLogger.error(error as Error, 'Batch Balance API Error');
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}