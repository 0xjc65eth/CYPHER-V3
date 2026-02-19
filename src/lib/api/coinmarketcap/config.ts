// CoinMarketCap API Configuration
export const CMC_CONFIG = {
  API_KEY: process.env.CMC_API_KEY || '',
  BASE_URL: 'https://pro-api.coinmarketcap.com',
  SANDBOX_URL: 'https://sandbox-api.coinmarketcap.com',
  VERSION: 'v1',
  DEFAULT_CURRENCY: 'USD',
  DEFAULT_LIMIT: 100,
  MAX_LIMIT: 5000,
  RATE_LIMIT: {
    MINUTE: 30,
    DAILY: 333,
    MONTHLY: 10000,
  },
  CACHE_TTL: {
    LISTINGS: 300, // 5 minutes
    QUOTES: 60, // 1 minute
    GLOBAL_METRICS: 300, // 5 minutes
    TRENDING: 600, // 10 minutes
    HISTORICAL: 3600, // 1 hour
    MARKET_PAIRS: 300, // 5 minutes
    PRICE_PERFORMANCE: 300, // 5 minutes
    FEAR_GREED: 3600, // 1 hour
    ALTCOIN_SEASON: 3600, // 1 hour
  },
  ENDPOINTS: {
    // Cryptocurrency Endpoints
    LISTINGS_LATEST: '/cryptocurrency/listings/latest',
    QUOTES_LATEST: '/cryptocurrency/quotes/latest',
    QUOTES_HISTORICAL: '/cryptocurrency/quotes/historical',
    MARKET_PAIRS_LATEST: '/cryptocurrency/market-pairs/latest',
    OHLCV_LATEST: '/cryptocurrency/ohlcv/latest',
    OHLCV_HISTORICAL: '/cryptocurrency/ohlcv/historical',
    PRICE_PERFORMANCE_LATEST: '/cryptocurrency/price-performance-stats/latest',
    TRENDING_LATEST: '/cryptocurrency/trending/latest',
    TRENDING_GAINERS_LOSERS: '/cryptocurrency/trending/gainers-losers',
    TRENDING_MOST_VISITED: '/cryptocurrency/trending/most-visited',
    
    // Global Metrics
    GLOBAL_METRICS_LATEST: '/global-metrics/quotes/latest',
    GLOBAL_METRICS_HISTORICAL: '/global-metrics/quotes/historical',
    
    // Tools
    PRICE_CONVERSION: '/tools/price-conversion',
    
    // Exchange Endpoints
    EXCHANGE_LISTINGS_LATEST: '/exchange/listings/latest',
    EXCHANGE_QUOTES_LATEST: '/exchange/quotes/latest',
    
    // Fiat Endpoints
    FIAT_MAP: '/fiat/map',
    
    // Key Info
    KEY_INFO: '/key/info',
  },
  HEADERS: {
    'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY || '',
    'Accept': 'application/json',
    'Accept-Encoding': 'deflate, gzip',
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 1000,
    MAX_DELAY: 10000,
    MULTIPLIER: 2,
  },
  ERROR_CODES: {
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    503: 'Service Unavailable',
  },
} as const;

// Helper function to build full endpoint URL
export function buildEndpointUrl(endpoint: string, sandbox = false): string {
  const baseUrl = sandbox ? CMC_CONFIG.SANDBOX_URL : CMC_CONFIG.BASE_URL;
  return `${baseUrl}/${CMC_CONFIG.VERSION}${endpoint}`;
}

// Helper function to get cache key
export function getCacheKey(endpoint: string, params?: Record<string, any>): string {
  const paramStr = params ? JSON.stringify(params) : '';
  return `cmc:${endpoint}:${paramStr}`;
}

// Helper function to get cache TTL for endpoint
export function getCacheTTL(endpoint: string): number {
  switch (endpoint) {
    case CMC_CONFIG.ENDPOINTS.LISTINGS_LATEST:
      return CMC_CONFIG.CACHE_TTL.LISTINGS;
    case CMC_CONFIG.ENDPOINTS.QUOTES_LATEST:
      return CMC_CONFIG.CACHE_TTL.QUOTES;
    case CMC_CONFIG.ENDPOINTS.GLOBAL_METRICS_LATEST:
      return CMC_CONFIG.CACHE_TTL.GLOBAL_METRICS;
    case CMC_CONFIG.ENDPOINTS.TRENDING_LATEST:
    case CMC_CONFIG.ENDPOINTS.TRENDING_GAINERS_LOSERS:
    case CMC_CONFIG.ENDPOINTS.TRENDING_MOST_VISITED:
      return CMC_CONFIG.CACHE_TTL.TRENDING;
    case CMC_CONFIG.ENDPOINTS.OHLCV_HISTORICAL:
    case CMC_CONFIG.ENDPOINTS.QUOTES_HISTORICAL:
      return CMC_CONFIG.CACHE_TTL.HISTORICAL;
    case CMC_CONFIG.ENDPOINTS.MARKET_PAIRS_LATEST:
      return CMC_CONFIG.CACHE_TTL.MARKET_PAIRS;
    case CMC_CONFIG.ENDPOINTS.PRICE_PERFORMANCE_LATEST:
      return CMC_CONFIG.CACHE_TTL.PRICE_PERFORMANCE;
    default:
      return 300; // Default 5 minutes
  }
}