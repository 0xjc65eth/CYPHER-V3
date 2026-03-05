// API Configuration and Endpoints

export const API_CONFIG = {
  // CoinGecko API
  coingecko: {
    baseUrl: process.env.NEXT_PUBLIC_COINGECKO_API || 'https://api.coingecko.com/api/v3',
    endpoints: {
      price: '/simple/price',
      marketChart: '/coins/{id}/market_chart',
      trending: '/search/trending',
      coinInfo: '/coins/{id}',
    },
  },

  // Hiro API for Ordinals & Runes
  hiro: {
    baseUrl: process.env.HIRO_API_URL || 'https://api.hiro.so',
    endpoints: {
      ordinals: '/ordinals/v1/inscriptions',
      runes: '/runes/v1/tokens',
      stats: '/extended/v1/tx/stats',
      bns: '/v1/names',
    },
    apiKey: process.env.HIRO_API_KEY || '',
  },

  // Mempool.space API
  mempool: {
    baseUrl: process.env.NEXT_PUBLIC_MEMPOOL_API || 'https://mempool.space/api',
    endpoints: {
      fees: '/v1/fees/recommended',
      blocks: '/v1/blocks',
      mining: '/v1/mining/pools',
      hashrate: '/v1/mining/hashrate',
      difficulty: '/v1/mining/difficulty-adjustments',
      lightning: '/v1/lightning/statistics',
    },
  },

  // QuickNode Bitcoin RPC
  quicknode: {
    baseUrl: process.env.QUICKNODE_URL || '',
    apiKey: process.env.QUICKNODE_API_KEY || '',
    endpoints: {
      rpc: '', // RPC methods are called directly
    },
  },

  // Ordinals API (Hiro primary, replaces Magic Eden)
  magiceden: {
    baseUrl: process.env.HIRO_API_URL || 'https://api.hiro.so',
    apiKey: process.env.HIRO_API_KEY || '',
    endpoints: {
      collections: '/ordinals/v1/collections',
      tokens: '/ordinals/v1/inscriptions',
      activities: '/ordinals/v1/inscriptions',
      stats: '/ordinals/v1/stats',
      marketplace: '/ordinals/v1/inscriptions',
    },
  },

  // Glassnode API
  glassnode: {
    baseUrl: 'https://api.glassnode.com/v1',
    apiKey: 'free_tier_access',
    endpoints: {
      metrics: '/metrics',
      addresses: '/metrics/addresses',
      blockchain: '/metrics/blockchain',
      market: '/metrics/market',
      mining: '/metrics/mining',
      supply: '/metrics/supply',
      fees: '/metrics/fees',
    },
  },

  // Binance API
  binance: {
    baseUrl: 'https://api.binance.com/api/v3',
    wsBaseUrl: 'wss://stream.binance.com:9443/ws',
    apiKey: 'public_access', // Não requer API key para dados públicos
    endpoints: {
      ticker: '/ticker/24hr',
      klines: '/klines',
      depth: '/depth',
      trades: '/trades',
      exchangeInfo: '/exchangeInfo',
    },
  },

  // UniSat API (Pending Approval)
  unisat: {
    baseUrl: 'https://open-api.unisat.io',
    apiKey: 'pending_approval', // Aguardando aprovação
    endpoints: {
      address: '/v1/indexer/address',
      inscription: '/v1/indexer/inscription',
      brc20: '/v1/indexer/brc20',
      runes: '/v1/indexer/runes',
    },
  },

  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },

  // Rate limiting configuration
  rateLimit: {
    requestsPerMinute: 100,
    burstLimit: 20,
  },
} as const