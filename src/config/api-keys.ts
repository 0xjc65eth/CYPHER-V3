// Arquivo de configuração para chaves de API e outras configurações

// Chave da API do CoinMarketCap
export const COINMARKETCAP_API_KEY = process.env.CMC_API_KEY;

// Chave da API do Ordiscan
export const ORDISCAN_API_KEY = process.env.ORDISCAN_API_KEY;

// Configurações de cache
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos em milissegundos

// URLs de API
export const API_URLS = {
  coinmarketcap: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
  ordiscan: 'https://api.ordiscan.com/v1',
  // Adicione outras URLs de API conforme necessário
};

// Configurações de fallback - Preços aproximados de Fev 2026
// IMPORTANTE: Estes valores são usados APENAS quando TODAS as APIs falham.
// Devem ser atualizados periodicamente para refletir o mercado.
// Última atualização: 2026-02-24
export const FALLBACK_PRICES: { [key: string]: number } = {
  'BTC': 63500,
  'ETH': 1850,
  'BNB': 590,
  'SOL': 78,
  'XRP': 0.55,
  'ADA': 0.35,
  'AVAX': 20,
  'DOGE': 0.10,
  'DOT': 4.50,
  'MATIC': 0.30,
  'LINK': 12,
  'UNI': 7,
  'ARB': 0.35,
  'ORDI': 8,
  'RUNE': 2.50,
};

// Dados fallback de market cap e volume (Fev 2026)
export const FALLBACK_MARKET_DATA: { [key: string]: { marketCap: number; volume24h: number } } = {
  'BTC': { marketCap: 1250000000000, volume24h: 25000000000 },
  'ETH': { marketCap: 223000000000, volume24h: 12000000000 },
  'BNB': { marketCap: 86000000000, volume24h: 1800000000 },
  'SOL': { marketCap: 38000000000, volume24h: 4900000000 },
};

// Flag para indicar que dados são fallback
export const FALLBACK_WARNING = '⚠️ Dados de fallback - APIs indisponíveis. Preços podem estar desatualizados.';
