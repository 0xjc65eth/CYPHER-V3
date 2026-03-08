import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

const HIRO_API_KEY = process.env.HIRO_API_KEY || '';
const HIRO_BASE_URL = 'https://api.hiro.so/runes/v1';

// Cache com TTL de 5 minutos
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

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
  console.error(`[RUNES API ERROR - ${context}] ${new Date().toISOString()}:`, {
    message: error.message,
    stack: error.stack,
    context
  });
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let apiResponse = null;

  try {
    const rateLimitRes = await rateLimit(request, 30, 60); if (rateLimitRes) return rateLimitRes;

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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '100';
    const offset = searchParams.get('offset') || '0';
    const order = searchParams.get('order') || 'desc';
    const orderBy = searchParams.get('order_by') || 'timestamp';
    
    // Validação de parâmetros
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid limit parameter. Must be between 1 and 1000.',
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
    const cacheKey = `etchings_${limit}_${offset}_${order}_${orderBy}`;
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
    const url = new URL(`${HIRO_BASE_URL}/etchings`);
    url.searchParams.set('limit', limit);
    url.searchParams.set('offset', offset);
    url.searchParams.set('order', order);
    url.searchParams.set('order_by', orderBy);

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
        error: `Hiro API returned ${apiResponse.status}: ${apiResponse.statusText}. No real data available.`,
        responseTime: Date.now() - startTime
      }, { status: apiResponse.status });
    }

    const data = await apiResponse.json();
    
    // Cache successful response
    setCachedData(cacheKey, data);

    // Transform data if needed
    const transformedData = {
      ...data,
      results: data.results?.map((etching: any) => ({
        ...etching,
        // Adicionar campos calculados se necessário
        market_cap_usd: etching.terms?.amount && etching.terms?.amount > 0 ? 
          parseFloat(etching.terms.amount) * (etching.price_usd || 0) : null,
        holders_count: etching.holders || 0,
        last_activity: etching.timestamp || null
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
      limit: 100,
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