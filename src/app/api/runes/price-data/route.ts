import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

const HIRO_API_KEY = process.env.HIRO_API_KEY || '';
const HIRO_BASE_URL = 'https://api.hiro.so/runes/v1';

// Cache com TTL de 1 minuto para dados de preço (muito voláteis)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1 * 60 * 1000; // 1 minuto para preços

// Rate limiting
const requestTracker = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per minute (mais permissivo para preços)
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
  console.error(`[RUNES PRICE API ERROR - ${context}] ${new Date().toISOString()}:`, {
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
    const symbols = searchParams.get('symbols'); // comma-separated list of rune names
    const interval = searchParams.get('interval') || '1h'; // 1m, 5m, 15m, 1h, 4h, 1d
    const limit = searchParams.get('limit') || '100';
    const period = searchParams.get('period') || '24h'; // 1h, 4h, 24h, 7d, 30d
    
    // Validação de parâmetros
    const limitNum = parseInt(limit);
    
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

    // Validate interval
    const validIntervals = ['1m', '5m', '15m', '1h', '4h', '1d'];
    if (!validIntervals.includes(interval)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid interval. Must be one of: ${validIntervals.join(', ')}`,
          source: 'hiro-runes-api',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `price_data_${symbols || 'all'}_${interval}_${period}_${limit}`;
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

    // Se símbolos específicos foram fornecidos, buscar dados individuais
    if (symbols) {
      const symbolList = symbols.split(',').map(s => s.trim()).filter(s => s.length > 0);
      const priceData = await fetchMultipleRunePrices(symbolList, interval, period, limitNum);
      
      setCachedData(cacheKey, priceData);
      
      return NextResponse.json({
        success: true,
        data: priceData,
        source: 'hiro-runes-api',
        timestamp: new Date().toISOString(),
        cached: false,
        responseTime: Date.now() - startTime
      });
    }

    // Buscar dados gerais de preços de mercado
    const url = new URL(`${HIRO_BASE_URL}/market/prices`);
    url.searchParams.set('interval', interval);
    url.searchParams.set('period', period);
    url.searchParams.set('limit', limit);

    // Make API request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds timeout for price data

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
        error: `Hiro API request failed with status ${apiResponse.status}. No real data available.`,
        responseTime: Date.now() - startTime
      }, { status: apiResponse.status });
    }

    const data = await apiResponse.json();
    
    // Cache successful response (short TTL for price data)
    setCachedData(cacheKey, data);

    // Transform and enrich price data
    const transformedData = {
      ...data,
      interval: interval,
      period: period,
      total_runes: data.results?.length || 0,
      results: data.results?.map((priceInfo: any) => ({
        ...priceInfo,
        // Adicionar campos calculados
        price_change_24h: calculatePriceChange(priceInfo.price_history),
        price_change_percentage_24h: calculatePriceChangePercentage(priceInfo.price_history),
        volume_24h_formatted: formatAmount(priceInfo.volume_24h),
        market_cap_formatted: formatAmount(priceInfo.market_cap),
        last_updated: new Date().toISOString(),
        price_trend: analyzePriceTrend(priceInfo.price_history),
        support_level: calculateSupportLevel(priceInfo.price_history),
        resistance_level: calculateResistanceLevel(priceInfo.price_history)
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
    
    // Retornar erro real - SEM DADOS MOCK
    return NextResponse.json(
      {
        success: false,
        data: null,
        source: 'hiro-runes-api',
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

async function fetchMultipleRunePrices(symbols: string[], interval: string, period: string, limit: number) {
  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const url = new URL(`${HIRO_BASE_URL}/etchings/${encodeURIComponent(symbol)}/prices`);
      url.searchParams.set('interval', interval);
      url.searchParams.set('period', period);
      url.searchParams.set('limit', limit.toString());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'X-API-Key': HIRO_API_KEY,
            'Accept': 'application/json',
            'User-Agent': 'CYPHER-ORDI-FUTURE-V3'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return { symbol, error: `HTTP ${response.status}`, data: null };
        }

        const data = await response.json();
        return { symbol, data, error: null };
      } catch (error: any) {
        clearTimeout(timeoutId);
        return { symbol, error: error.message, data: null };
      }
    })
  );

  return {
    interval,
    period,
    requested_symbols: symbols,
    results: results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          symbol: symbols[index],
          error: result.reason?.message || 'Failed to fetch',
          data: null
        };
      }
    })
  };
}

// REMOVIDO: generateMockPriceData - Não usamos dados MOCK/FAKE
// Todas as falhas de API retornam erro apropriado

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

function calculatePriceChange(priceHistory: any[]): number {
  if (!priceHistory || priceHistory.length < 2) return 0;
  
  const latest = priceHistory[priceHistory.length - 1];
  const previous = priceHistory[0];
  
  return parseFloat(latest.price) - parseFloat(previous.price);
}

function calculatePriceChangePercentage(priceHistory: any[]): number {
  if (!priceHistory || priceHistory.length < 2) return 0;
  
  const latest = priceHistory[priceHistory.length - 1];
  const previous = priceHistory[0];
  
  const change = parseFloat(latest.price) - parseFloat(previous.price);
  return (change / parseFloat(previous.price)) * 100;
}

function analyzePriceTrend(priceHistory: any[]): string {
  if (!priceHistory || priceHistory.length < 3) return 'neutral';
  
  const recent = priceHistory.slice(-5);
  let upCount = 0;
  let downCount = 0;
  
  for (let i = 1; i < recent.length; i++) {
    if (parseFloat(recent[i].price) > parseFloat(recent[i-1].price)) {
      upCount++;
    } else if (parseFloat(recent[i].price) < parseFloat(recent[i-1].price)) {
      downCount++;
    }
  }
  
  if (upCount > downCount) return 'bullish';
  if (downCount > upCount) return 'bearish';
  return 'neutral';
}

function calculateSupportLevel(priceHistory: any[]): number | null {
  if (!priceHistory || priceHistory.length < 10) return null;
  
  const prices = priceHistory.map(p => parseFloat(p.price));
  return Math.min(...prices);
}

function calculateResistanceLevel(priceHistory: any[]): number | null {
  if (!priceHistory || priceHistory.length < 10) return null;
  
  const prices = priceHistory.map(p => parseFloat(p.price));
  return Math.max(...prices);
}