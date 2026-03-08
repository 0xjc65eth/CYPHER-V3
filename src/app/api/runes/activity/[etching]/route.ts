import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

const HIRO_API_KEY = process.env.HIRO_API_KEY || '';
const HIRO_BASE_URL = 'https://api.hiro.so/runes/v1';

// Cache com TTL de 2 minutos (dados mais voláteis)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos para atividade

// Rate limiting
const requestTracker = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minuto

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const tracker = requestTracker.get(ip);
  
  if (!tracker || now > tracker.resetTime) {
    requestTracker.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (tracker.count >= RATE_LIMIT) {
    return false;
  }
  
  tracker.count++;
  return true;
}

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

function logError(error: any, context: string) {
  console.error(`[RUNES ACTIVITY API ERROR - ${context}] ${new Date().toISOString()}:`, {
    message: error.message,
    stack: error.stack,
    context
  });
}

function validateEtchingName(etching: string): boolean {
  // Validações básicas para nome do rune
  if (!etching || typeof etching !== 'string') return false;
  if (etching.length < 1 || etching.length > 28) return false;
  // Runes devem seguir certas regras de formatação
  return /^[A-Z•]+$/.test(etching);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ etching: string }> }
) {
  const startTime = Date.now();
  let apiResponse = null;
  
  try {
    const rateLimitRes = await rateLimit(request, 30, 60); if (rateLimitRes) return rateLimitRes;

    // Await params in Next.js 15
    const { etching } = await params;

    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          source: 'hiro-runes-api',
          timestamp: new Date().toISOString()
        },
        { status: 429 }
      );
    }
    
    // Validate etching parameter
    if (!validateEtchingName(etching)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid etching name format. Must be a valid rune name.',
          source: 'hiro-runes-api',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';
    const order = searchParams.get('order') || 'desc';
    const orderBy = searchParams.get('order_by') || 'timestamp';
    const operation = searchParams.get('operation'); // transfer, mint, burn
    const fromBlock = searchParams.get('from_block');
    const toBlock = searchParams.get('to_block');
    
    // Validação de parâmetros
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid limit parameter. Must be between 1 and 500.',
          source: 'hiro-runes-api',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }
    
    if (isNaN(offsetNum) || offsetNum < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid offset parameter. Must be >= 0.',
          source: 'hiro-runes-api',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `activity_${etching}_${limit}_${offset}_${order}_${orderBy}_${operation || 'all'}_${fromBlock || ''}_${toBlock || ''}`;
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        source: 'hiro-runes-api-cached',
        timestamp: new Date().toISOString(),
        cached: true,
        responseTime: Date.now() - startTime
      });
    }

    // Build URL with parameters
    const url = new URL(`${HIRO_BASE_URL}/etchings/${encodeURIComponent(etching)}/activity`);
    url.searchParams.set('limit', limit);
    url.searchParams.set('offset', offset);
    url.searchParams.set('order', order);
    url.searchParams.set('order_by', orderBy);
    
    if (operation) url.searchParams.set('operation', operation);
    if (fromBlock) url.searchParams.set('from_block', fromBlock);
    if (toBlock) url.searchParams.set('to_block', toBlock);

    // Make API request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

    apiResponse = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-Key': HIRO_API_KEY,
        'Accept': 'application/json',
        'User-Agent': 'CYPHER-ORDI-FUTURE-V3'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      logError(
        { status: apiResponse.status, statusText: apiResponse.statusText, body: errorText },
        'API_REQUEST_FAILED'
      );
      
      // Retornar erro real - SEM DADOS MOCK
      return NextResponse.json({
        success: false,
        data: null,
        source: 'hiro-runes-api',
        timestamp: new Date().toISOString(),
        error: `Hiro API returned ${apiResponse.status}: ${apiResponse.statusText}. No real activity data available.`,
        responseTime: Date.now() - startTime
      }, { status: apiResponse.status });
    }

    const data = await apiResponse.json();
    
    // Cache successful response (shorter TTL for activity data)
    setCachedData(cacheKey, data);

    // Transform and enrich data
    const transformedData = {
      ...data,
      etching: etching,
      results: data.results?.map((activity: any) => ({
        ...activity,
        // Adicionar campos calculados
        operation_type: getOperationType(activity.operation),
        amount_formatted: formatAmount(activity.amount),
        usd_value: calculateUSDValue(activity.amount, activity.price_usd),
        time_ago: getTimeAgo(activity.timestamp),
        tx_short: activity.tx_id ? 
          `${activity.tx_id.slice(0, 8)}...${activity.tx_id.slice(-8)}` : '',
        from_short: activity.from_address ? 
          `${activity.from_address.slice(0, 6)}...${activity.from_address.slice(-4)}` : '',
        to_short: activity.to_address ? 
          `${activity.to_address.slice(0, 6)}...${activity.to_address.slice(-4)}` : '',
        block_height: activity.block_height || null,
        confirmations: activity.confirmations || 0
      })) || []
    };

    return NextResponse.json({
      success: true,
      data: transformedData,
      source: 'hiro-runes-api',
      timestamp: new Date().toISOString(),
      cached: false,
      responseTime: Date.now() - startTime
    });

  } catch (error: any) {
    logError(error, 'GENERAL_ERROR');
    
    // Network or timeout error fallback
    if (error.name === 'AbortError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Request timeout. Please try again.',
          source: 'hiro-runes-api',
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime
        },
        { status: 408 }
      );
    }
    
    // Generic fallback data
    const fallbackData = {
      etching: 'unknown',
      limit: 50,
      offset: 0,
      total: 0,
      results: [],
      error: 'Service temporarily unavailable'
    };

    return NextResponse.json(
      {
        success: false,
        data: fallbackData,
        source: 'hiro-runes-api-fallback',
        timestamp: new Date().toISOString(),
        error: 'Internal server error',
        responseTime: Date.now() - startTime
      },
      { status: 500 }
    );
  } finally {
    // Cleanup
    if (apiResponse) {
      try {
        await apiResponse.body?.cancel();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

function getOperationType(operation: string): string {
  const operationMap: { [key: string]: string } = {
    'transfer': 'Transfer',
    'mint': 'Mint',
    'burn': 'Burn',
    'etch': 'Etch'
  };
  return operationMap[operation] || operation || 'Unknown';
}

function formatAmount(amount: string | number): string {
  if (!amount) return '0';
  
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`;
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`;
  } else if (num >= 1e3) {
    return `${(num / 1e3).toFixed(2)}K`;
  } else {
    return num.toLocaleString();
  }
}

function calculateUSDValue(amount: string | number, priceUSD: string | number): string | null {
  if (!amount || !priceUSD) return null;
  
  const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
  const priceNum = typeof priceUSD === 'string' ? parseFloat(priceUSD) : priceUSD;
  
  if (isNaN(amountNum) || isNaN(priceNum)) return null;
  
  const value = amountNum * priceNum;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getTimeAgo(timestamp: string | number): string {
  if (!timestamp) return 'Unknown';
  
  const now = Date.now();
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const diff = now - time;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}