// Configuração central para as APIs Hiro Runes
export const HIRO_RUNES_CONFIG = {
  API_KEY: process.env.HIRO_API_KEY || '',
  BASE_URL: 'https://api.hiro.so/runes/v1',
  
  // Cache TTL por tipo de dados
  CACHE_TTL: {
    ETCHINGS: 5 * 60 * 1000,      // 5 minutos - dados menos voláteis
    HOLDERS: 5 * 60 * 1000,       // 5 minutos - dados menos voláteis  
    ACTIVITY: 2 * 60 * 1000,      // 2 minutos - dados mais voláteis
    PRICE_DATA: 1 * 60 * 1000,    // 1 minuto - dados muito voláteis
  },
  
  // Rate limiting
  RATE_LIMITS: {
    DEFAULT: 60,          // requests per minute
    PRICE_DATA: 100,      // requests per minute (mais permissivo)
    WINDOW: 60 * 1000,    // 1 minuto
  },
  
  // Timeouts
  TIMEOUTS: {
    DEFAULT: 30000,       // 30 segundos
    PRICE_DATA: 20000,    // 20 segundos para dados de preço
    INDIVIDUAL: 15000,    // 15 segundos para requests individuais
  },
  
  // Limits
  LIMITS: {
    MAX_ETCHINGS: 1000,
    MAX_HOLDERS: 1000, 
    MAX_ACTIVITY: 500,
    MAX_PRICE_DATA: 1000,
    MIN_LIMIT: 1,
  },
  
  // Validação
  VALIDATION: {
    RUNE_NAME_REGEX: /^[A-Z•]+$/,
    MIN_RUNE_LENGTH: 1,
    MAX_RUNE_LENGTH: 28,
    VALID_INTERVALS: ['1m', '5m', '15m', '1h', '4h', '1d'],
    VALID_PERIODS: ['1h', '4h', '24h', '7d', '30d'],
    VALID_ORDERS: ['asc', 'desc'],
    VALID_ORDER_BY: {
      ETCHINGS: ['timestamp', 'symbol', 'total_supply', 'holders'],
      HOLDERS: ['balance', 'timestamp', 'address'],
      ACTIVITY: ['timestamp', 'amount', 'block_height'],
      PRICE_DATA: ['price', 'volume', 'market_cap', 'timestamp']
    }
  }
};

// Headers padrão para requests
export const getHiroHeaders = () => ({
  'X-API-Key': HIRO_RUNES_CONFIG.API_KEY,
  'Accept': 'application/json',
  'User-Agent': 'CYPHER-ORDI-FUTURE-V3'
});

// Estrutura de resposta padrão
export interface HiroApiResponse<T = any> {
  success: boolean;
  data: T;
  source: string;
  timestamp: string;
  cached?: boolean;
  responseTime?: number;
  error?: string;
}

// Tipos para os dados retornados
export interface RuneEtching {
  id: string;
  symbol: string;
  name: string;
  timestamp: string;
  block_height: number;
  tx_id: string;
  terms?: {
    amount: string;
    cap: string;
    divisibility: number;
    premine: string;
  };
  total_supply?: string;
  holders?: number;
  market_cap_usd?: number;
  price_usd?: number;
  last_activity?: string;
}

export interface RuneHolder {
  address: string;
  balance: string;
  balance_formatted?: string;
  balance_percentage?: string;
  rank?: number;
  address_short?: string;
  timestamp?: string;
  last_activity?: string;
}

export interface RuneActivity {
  tx_id: string;
  operation: 'transfer' | 'mint' | 'burn' | 'etch';
  operation_type?: string;
  amount: string;
  amount_formatted?: string;
  from_address?: string;
  to_address?: string;
  from_short?: string;
  to_short?: string;
  timestamp: string;
  time_ago?: string;
  block_height?: number;
  confirmations?: number;
  usd_value?: string;
  tx_short?: string;
  price_usd?: number;
}

export interface RunePriceData {
  etching: string;
  symbol: string;
  price_usd: string;
  price_btc: string;
  volume_24h: string;
  volume_24h_formatted?: string;
  market_cap: string;
  market_cap_formatted?: string;
  price_change_24h?: number;
  price_change_percentage_24h?: number;
  last_updated: string;
  price_trend?: 'bullish' | 'bearish' | 'neutral';
  support_level?: number;
  resistance_level?: number;
  price_history?: Array<{
    timestamp: string;
    price: string;
    volume: string;
  }>;
}

// Tipos para responses das APIs
export interface EtchingsResponse {
  limit: number;
  offset: number;
  total: number;
  results: RuneEtching[];
}

export interface HoldersResponse {
  etching: string;
  limit: number;
  offset: number;
  total: number;
  total_supply?: string;
  results: RuneHolder[];
}

export interface ActivityResponse {
  etching: string;
  limit: number;
  offset: number;
  total: number;
  results: RuneActivity[];
}

export interface PriceDataResponse {
  interval: string;
  period: string;
  total_runes: number;
  requested_symbols?: string[];
  results: RunePriceData[] | Array<{
    symbol: string;
    data: RunePriceData | null;
    error: string | null;
  }>;
}

// Utility functions
export function validateRuneName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  if (name.length < HIRO_RUNES_CONFIG.VALIDATION.MIN_RUNE_LENGTH || 
      name.length > HIRO_RUNES_CONFIG.VALIDATION.MAX_RUNE_LENGTH) return false;
  return HIRO_RUNES_CONFIG.VALIDATION.RUNE_NAME_REGEX.test(name);
}

export function validateInterval(interval: string): boolean {
  return HIRO_RUNES_CONFIG.VALIDATION.VALID_INTERVALS.includes(interval);
}

export function validatePeriod(period: string): boolean {
  return HIRO_RUNES_CONFIG.VALIDATION.VALID_PERIODS.includes(period);
}

export function validateLimit(limit: number, maxLimit: number): boolean {
  return !isNaN(limit) && limit >= HIRO_RUNES_CONFIG.LIMITS.MIN_LIMIT && limit <= maxLimit;
}

export function validateOffset(offset: number): boolean {
  return !isNaN(offset) && offset >= 0;
}

export function validateOrder(order: string): boolean {
  return HIRO_RUNES_CONFIG.VALIDATION.VALID_ORDERS.includes(order);
}

export function validateOrderBy(orderBy: string, endpoint: keyof typeof HIRO_RUNES_CONFIG.VALIDATION.VALID_ORDER_BY): boolean {
  return HIRO_RUNES_CONFIG.VALIDATION.VALID_ORDER_BY[endpoint].includes(orderBy);
}