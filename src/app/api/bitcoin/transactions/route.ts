/**
 * CYPHER ORDI FUTURE v3.1.0 - Bitcoin Transactions API
 * API robusta para buscar histórico de transações Bitcoin com múltiplos fallbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiCache, CacheKeys, CACHE_TTL, isValidBitcoinAddress, sanitizeAddress } from '@/lib/apiCache';
import { devLogger } from '@/lib/logger';

// Types
interface Transaction {
  txid: string;
  blockHeight?: number;
  blockTime?: number;
  confirmations?: number;
  fee?: number;
  size?: number;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  value: number;
  type: 'incoming' | 'outgoing' | 'internal';
  confirmed: boolean;
}

interface TransactionInput {
  txid: string;
  vout: number;
  scriptSig?: string;
  sequence?: number;
  addresses?: string[];
  value?: number;
}

interface TransactionOutput {
  value: number;
  n: number;
  scriptPubKey: {
    addresses?: string[];
    hex?: string;
    type?: string;
  };
  spent?: boolean;
}

interface TransactionHistory {
  address: string;
  transactions: Transaction[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
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
 * Hiro API Client for Transactions
 */
async function fetchFromHiro(address: string, page = 0, limit = 50): Promise<TransactionHistory> {
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
  const response = await fetch(
    `${baseUrl}/extended/v1/address/${address}/transactions?limit=${limit}&offset=${offset}`,
    {
      headers,
      next: { revalidate: 60 }
    }
  );

  if (!response.ok) {
    throw new Error(`Hiro API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  const transactions: Transaction[] = (data.results || []).map((tx: any) => {
    // Calculate transaction type and value for the address
    let value = 0;
    let type: 'incoming' | 'outgoing' | 'internal' = 'internal';
    
    // Check inputs for our address
    const isFromAddress = tx.tx.token_transfer || tx.tx.smart_contract || false;
    
    // Check outputs for our address
    const isToAddress = tx.tx.token_transfer || tx.tx.smart_contract || false;
    
    if (isFromAddress && isToAddress) {
      type = 'internal';
    } else if (isToAddress) {
      type = 'incoming';
      value = tx.tx.fee || 0;
    } else {
      type = 'outgoing';
      value = -(tx.tx.fee || 0);
    }

    return {
      txid: tx.tx.tx_id,
      blockHeight: tx.tx.block_height,
      blockTime: tx.tx.burn_block_time,
      confirmations: tx.tx.canonical ? 1 : 0,
      fee: tx.tx.fee,
      size: tx.tx.tx_size || 0,
      inputs: [], // Hiro doesn't provide detailed input/output data for Bitcoin
      outputs: [],
      value,
      type,
      confirmed: tx.tx.canonical
    };
  });

  return {
    address,
    transactions,
    totalCount: data.total || 0,
    page,
    limit,
    hasMore: (data.total || 0) > offset + limit
  };
}

/**
 * Mempool.space API Client for Transactions
 */
async function fetchFromMempool(address: string, page = 0, limit = 50): Promise<TransactionHistory> {
  const baseUrl = 'https://mempool.space/api';
  
  // Mempool.space doesn't support pagination in the same way, so we use after_txid
  let url = `${baseUrl}/address/${address}/txs`;
  
  const response = await fetch(url, {
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error(`Mempool API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // Apply client-side pagination
  const startIndex = page * limit;
  const endIndex = startIndex + limit;
  const paginatedTxs = data.slice(startIndex, endIndex);
  
  const transactions: Transaction[] = paginatedTxs.map((tx: any) => {
    // Calculate transaction type and value for the address
    let value = 0;
    let type: 'incoming' | 'outgoing' | 'internal' = 'internal';
    
    // Check if address is in inputs or outputs
    const inputAddresses = tx.vin?.flatMap((vin: any) => vin.prevout?.scriptpubkey_address ? [vin.prevout.scriptpubkey_address] : []) || [];
    const outputAddresses = tx.vout?.flatMap((vout: any) => vout.scriptpubkey_address ? [vout.scriptpubkey_address] : []) || [];
    
    const isFromAddress = inputAddresses.includes(address);
    const isToAddress = outputAddresses.includes(address);
    
    if (isFromAddress && isToAddress) {
      type = 'internal';
    } else if (isToAddress) {
      type = 'incoming';
      // Calculate incoming value
      value = tx.vout?.reduce((sum: number, vout: any) => {
        return vout.scriptpubkey_address === address ? sum + vout.value : sum;
      }, 0) || 0;
    } else if (isFromAddress) {
      type = 'outgoing';
      // Calculate outgoing value (negative)
      value = -(tx.vout?.reduce((sum: number, vout: any) => {
        return vout.scriptpubkey_address !== address ? sum + vout.value : sum;
      }, 0) || 0);
    }

    const inputs: TransactionInput[] = (tx.vin || []).map((vin: any) => ({
      txid: vin.txid,
      vout: vin.vout,
      addresses: vin.prevout?.scriptpubkey_address ? [vin.prevout.scriptpubkey_address] : [],
      value: vin.prevout?.value || 0
    }));

    const outputs: TransactionOutput[] = (tx.vout || []).map((vout: any) => ({
      value: vout.value,
      n: vout.n,
      scriptPubKey: {
        addresses: vout.scriptpubkey_address ? [vout.scriptpubkey_address] : [],
        hex: vout.scriptpubkey,
        type: vout.scriptpubkey_type
      }
    }));

    return {
      txid: tx.txid,
      blockHeight: tx.status?.block_height,
      blockTime: tx.status?.block_time,
      confirmations: tx.status?.confirmed ? 1 : 0,
      fee: tx.fee,
      size: tx.size,
      inputs,
      outputs,
      value,
      type,
      confirmed: tx.status?.confirmed || false
    };
  });

  return {
    address,
    transactions,
    totalCount: data.length,
    page,
    limit,
    hasMore: data.length > endIndex
  };
}

/**
 * Blockstream API Client for Transactions
 */
async function fetchFromBlockstream(address: string, page = 0, limit = 50): Promise<TransactionHistory> {
  const baseUrl = 'https://blockstream.info/api';
  
  const response = await fetch(`${baseUrl}/address/${address}/txs`, {
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error(`Blockstream API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // Apply client-side pagination
  const startIndex = page * limit;
  const endIndex = startIndex + limit;
  const paginatedTxs = data.slice(startIndex, endIndex);
  
  const transactions: Transaction[] = paginatedTxs.map((tx: any) => {
    // Similar processing to Mempool.space
    let value = 0;
    let type: 'incoming' | 'outgoing' | 'internal' = 'internal';
    
    const inputAddresses = tx.vin?.flatMap((vin: any) => vin.prevout?.scriptpubkey_address ? [vin.prevout.scriptpubkey_address] : []) || [];
    const outputAddresses = tx.vout?.flatMap((vout: any) => vout.scriptpubkey_address ? [vout.scriptpubkey_address] : []) || [];
    
    const isFromAddress = inputAddresses.includes(address);
    const isToAddress = outputAddresses.includes(address);
    
    if (isFromAddress && isToAddress) {
      type = 'internal';
    } else if (isToAddress) {
      type = 'incoming';
      value = tx.vout?.reduce((sum: number, vout: any) => {
        return vout.scriptpubkey_address === address ? sum + vout.value : sum;
      }, 0) || 0;
    } else if (isFromAddress) {
      type = 'outgoing';
      value = -(tx.vout?.reduce((sum: number, vout: any) => {
        return vout.scriptpubkey_address !== address ? sum + vout.value : sum;
      }, 0) || 0);
    }

    return {
      txid: tx.txid,
      blockHeight: tx.status?.block_height,
      blockTime: tx.status?.block_time,
      confirmations: tx.status?.confirmed ? 1 : 0,
      fee: tx.fee,
      size: tx.size,
      inputs: tx.vin || [],
      outputs: tx.vout || [],
      value,
      type,
      confirmed: tx.status?.confirmed || false
    };
  });

  return {
    address,
    transactions,
    totalCount: data.length,
    page,
    limit,
    hasMore: data.length > endIndex
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
    const page = parseInt(searchParams.get('page') || '0');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100
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

    if (page < 0 || limit < 1) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid pagination parameters'
      }, { status: 400 });
    }

    devLogger.log('API', `Fetching transactions for address: ${sanitizedAddress}, page: ${page}, limit: ${limit}`);

    // Cache key
    const cacheKey = CacheKeys.bitcoinTransactions(sanitizedAddress, page);

    try {
      const history = await apiCache.getWithFallback<TransactionHistory>(
        cacheKey,
        [
          {
            name: 'hiro',
            endpoint: 'transactions',
            fetchFn: () => fetchFromHiro(sanitizedAddress, page, limit)
          },
          {
            name: 'mempool',
            endpoint: 'transactions',
            fetchFn: () => fetchFromMempool(sanitizedAddress, page, limit)
          },
          {
            name: 'blockstream',
            endpoint: 'transactions',
            fetchFn: () => fetchFromBlockstream(sanitizedAddress, page, limit)
          }
        ],
        CACHE_TTL.transactions
      );

      const response: ApiResponse<TransactionHistory> = {
        success: true,
        data: history,
        cached: !forceRefresh,
        pagination: {
          page: history.page,
          limit: history.limit,
          total: history.totalCount,
          hasMore: history.hasMore
        }
      };

      devLogger.performance(`Transactions API`, Date.now() - startTime);
      return NextResponse.json(response);

    } catch (error) {
      devLogger.error(error as Error, 'Failed to fetch transactions with fallback');
      
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transaction data'
      }, { status: 500 });
    }

  } catch (error) {
    devLogger.error(error as Error, 'Bitcoin Transactions API Error');
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}