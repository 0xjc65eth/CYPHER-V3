// Professional API Configuration for CYPHER ORDI FUTURE V3
export const API_KEYS = {
  // OpenAI Configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  
  // Google Gemini Configuration
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  
  // Claude Configuration
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || '',
  
  // ElevenLabs TTS Configuration
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '',
  
  // Market Data APIs
  COINGECKO_API_KEY: process.env.COINGECKO_API_KEY || '',
  GLASSNODE_API_KEY: process.env.GLASSNODE_API_KEY || '',
  BINANCE_API_KEY: process.env.BINANCE_API_KEY || '',
  BINANCE_SECRET_KEY: process.env.BINANCE_SECRET_KEY || '',
  
  // Blockchain APIs
  MEMPOOL_SPACE_API: 'https://mempool.space/api',
  BLOCKSTREAM_API: 'https://blockstream.info/api',
  
  // Trading APIs
  ONE_INCH_API_KEY: process.env.ONE_INCH_API_KEY || '',
  PARASWAP_API_KEY: process.env.PARASWAP_API_KEY || '',
  
  // Social & News APIs
  TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN || '',
  REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID || '',
  REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET || ''
};

export const PROFESSIONAL_APIS = {
  // OpenAI Configuration
  OPENAI: {
    BASE_URL: 'https://api.openai.com/v1',
    models: {
      'gpt-4-turbo': 'gpt-4-1106-preview',
      'gpt-4': 'gpt-4',
      'gpt-3.5-turbo': 'gpt-3.5-turbo-1106'
    },
    maxTokens: {
      'gpt-4-turbo': 128000,
      'gpt-4': 8192,
      'gpt-3.5-turbo': 16385
    }
  },

  // OpenAI Configuration (legacy support)
  openai: {
    baseURL: 'https://api.openai.com/v1',
    models: {
      'gpt-4-turbo': 'gpt-4-1106-preview',
      'gpt-4': 'gpt-4',
      'gpt-3.5-turbo': 'gpt-3.5-turbo-1106'
    },
    maxTokens: {
      'gpt-4-turbo': 128000,
      'gpt-4': 8192,
      'gpt-3.5-turbo': 16385
    }
  },

  // Google Gemini Configuration
  gemini: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    models: {
      'gemini-pro': 'gemini-pro',
      'gemini-pro-vision': 'gemini-pro-vision'
    },
    maxTokens: {
      'gemini-pro': 30720,
      'gemini-pro-vision': 30720
    }
  },

  // Claude Configuration
  claude: {
    baseURL: 'https://api.anthropic.com/v1',
    models: {
      'claude-3-opus': 'claude-3-opus-20240229',
      'claude-3-sonnet': 'claude-3-sonnet-20240229',
      'claude-3-haiku': 'claude-3-haiku-20240307'
    },
    maxTokens: {
      'claude-3-opus': 200000,
      'claude-3-sonnet': 200000,
      'claude-3-haiku': 200000
    }
  },

  // Market Data Sources
  COINGECKO: {
    BASE_URL: 'https://api.coingecko.com/api/v3',
    PRO_URL: 'https://pro-api.coingecko.com/api/v3',
    endpoints: {
      price: '/simple/price',
      markets: '/coins/markets',
      history: '/coins/{id}/market_chart',
      trending: '/search/trending'
    }
  },

  // Mempool Space API
  MEMPOOL: {
    BASE_URL: 'https://mempool.space/api',
    endpoints: {
      fees: '/v1/fees/recommended',
      blocks: '/blocks',
      tx: '/tx/{txid}',
      address: '/address/{address}',
      statistics: '/v1/statistics'
    }
  },

  // Market Data Sources (legacy support)
  marketData: {
    coingecko: {
      baseURL: 'https://api.coingecko.com/api/v3',
      pro: 'https://pro-api.coingecko.com/api/v3',
      endpoints: {
        price: '/simple/price',
        markets: '/coins/markets',
        history: '/coins/{id}/market_chart',
        trending: '/search/trending'
      }
    },
    glassnode: {
      baseURL: 'https://api.glassnode.com/v1/metrics',
      endpoints: {
        price: '/market/price_usd_close',
        volume: '/transactions/volume_sum',
        supply: '/supply/current',
        addresses: '/addresses/active_count'
      }
    },
    binance: {
      baseURL: 'https://api.binance.com/api/v3',
      futures: 'https://fapi.binance.com/fapi/v1',
      endpoints: {
        ticker: '/ticker/24hr',
        klines: '/klines',
        orderbook: '/depth',
        trades: '/trades'
      }
    }
  },

  // DEX Aggregators
  dexAggregators: {
    oneInch: {
      baseURL: 'https://api.1inch.dev',
      endpoints: {
        quote: '/swap/v5.2/{chainId}/quote',
        swap: '/swap/v5.2/{chainId}/swap',
        approve: '/swap/v5.2/{chainId}/approve/transaction'
      }
    },
    paraswap: {
      baseURL: 'https://apiv5.paraswap.io',
      endpoints: {
        price: '/prices',
        transactions: '/transactions/{chainId}',
        tokens: '/tokens/{chainId}'
      }
    },
    jupiter: {
      baseURL: 'https://api.jup.ag/v6',
      endpoints: {
        quote: '/quote',
        swap: '/swap',
        price: '/price'
      }
    }
  },

  // Blockchain Data
  blockchain: {
    mempool: {
      baseURL: 'https://mempool.space/api',
      endpoints: {
        fees: '/v1/fees/recommended',
        blocks: '/blocks',
        tx: '/tx/{txid}',
        address: '/address/{address}'
      }
    },
    blockstream: {
      baseURL: 'https://blockstream.info/api',
      endpoints: {
        address: '/address/{address}',
        utxo: '/address/{address}/utxo',
        tx: '/tx/{txid}',
        blocks: '/blocks'
      }
    }
  },

  // AI Agent System
  aiAgents: [
    {
      id: 'market_analyst',
      name: 'Market Analyst',
      model: 'gpt-4-turbo',
      specialty: 'Technical Analysis & Price Predictions',
      confidence: 0.94,
      active: true
    },
    {
      id: 'opportunity_scanner',
      name: 'Opportunity Scanner',
      model: 'gemini-pro',
      specialty: 'Arbitrage & Trading Opportunities',
      confidence: 0.89,
      active: true
    },
    {
      id: 'risk_manager',
      name: 'Risk Manager',
      model: 'claude-3-sonnet',
      specialty: 'Portfolio Risk Assessment',
      confidence: 0.92,
      active: true
    },
    {
      id: 'sentiment_analyzer',
      name: 'Sentiment Analyzer',
      model: 'gpt-4',
      specialty: 'Social Media & News Sentiment',
      confidence: 0.87,
      active: true
    },
    {
      id: 'ordinals_expert',
      name: 'Ordinals Expert',
      model: 'claude-3-opus',
      specialty: 'Bitcoin NFTs & Ordinals Analysis',
      confidence: 0.91,
      active: true
    },
    {
      id: 'runes_specialist',
      name: 'Runes Specialist',
      model: 'gemini-pro',
      specialty: 'Runes Protocol & Token Analysis',
      confidence: 0.88,
      active: true
    }
  ],

  // Rate Limits & Quotas
  rateLimits: {
    openai: {
      requestsPerMinute: 60,
      tokensPerMinute: 150000
    },
    gemini: {
      requestsPerMinute: 60,
      requestsPerDay: 1000
    },
    claude: {
      requestsPerMinute: 50,
      tokensPerMinute: 200000
    },
    coingecko: {
      requestsPerMinute: 50,
      requestsPerMonth: 10000
    }
  }
};

// Professional Trading Configuration
export const TRADING_CONFIG = {
  // Supported Networks
  networks: [
    {
      id: 'ethereum',
      name: 'Ethereum',
      chainId: 1,
      symbol: 'ETH',
      rpc: 'https://cloudflare-eth.com',
      explorer: 'https://etherscan.io'
    },
    {
      id: 'arbitrum',
      name: 'Arbitrum',
      chainId: 42161,
      symbol: 'ETH',
      rpc: 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io'
    },
    {
      id: 'optimism',
      name: 'Optimism',
      chainId: 10,
      symbol: 'ETH',
      rpc: 'https://mainnet.optimism.io',
      explorer: 'https://optimistic.etherscan.io'
    },
    {
      id: 'polygon',
      name: 'Polygon',
      chainId: 137,
      symbol: 'MATIC',
      rpc: 'https://polygon-rpc.com',
      explorer: 'https://polygonscan.com'
    },
    {
      id: 'base',
      name: 'Base',
      chainId: 8453,
      symbol: 'ETH',
      rpc: 'https://mainnet.base.org',
      explorer: 'https://basescan.org'
    },
    {
      id: 'avalanche',
      name: 'Avalanche',
      chainId: 43114,
      symbol: 'AVAX',
      rpc: 'https://api.avax.network/ext/bc/C/rpc',
      explorer: 'https://snowtrace.io'
    },
    {
      id: 'bsc',
      name: 'BSC',
      chainId: 56,
      symbol: 'BNB',
      rpc: 'https://bsc-dataseed.binance.org',
      explorer: 'https://bscscan.com'
    },
    {
      id: 'solana',
      name: 'Solana',
      chainId: 'solana',
      symbol: 'SOL',
      rpc: 'https://api.mainnet-beta.solana.com',
      explorer: 'https://solscan.io'
    }
  ],

  // Fee Configuration
  fees: {
    serviceFeePercentage: 0.0034, // 0.34%
    maxServiceFeeUSD: 100,
    destinationWallets: {
      ethereum: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
      arbitrum: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
      optimism: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
      polygon: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
      base: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
      avalanche: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
      bsc: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
      solana: '4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH'
    }
  }
};

// Validation Functions
export function validateApiKey(service: string): boolean {
  const key = API_KEYS[service as keyof typeof API_KEYS];
  return Boolean(key && key.length > 0);
}

export function getApiConfig(service: string) {
  return PROFESSIONAL_APIS[service as keyof typeof PROFESSIONAL_APIS];
}

export function isServiceAvailable(service: string): boolean {
  return validateApiKey(service) && Boolean(getApiConfig(service));
}
