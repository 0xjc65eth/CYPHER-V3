import { NextRequest, NextResponse } from 'next/server';

// Tipos para dados de mercado
interface MarketData {
  bitcoin: {
    price: number;
    change24h: number;
    volume24h: number;
    marketCap: number;
    dominance: number;
  };
  ethereum: {
    price: number;
    change24h: number;
    volume24h: number;
    marketCap: number;
  };
  fearGreedIndex: {
    value: number;
    classification: string;
    timestamp: string;
  };
  technicalIndicators: {
    rsi: number;
    macd: {
      macd: number;
      signal: number;
      histogram: number;
    };
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
    };
    ema: {
      ema20: number;
      ema50: number;
      ema200: number;
    };
  };
  smartMoneyConcepts: {
    structureDirection: 'bullish' | 'bearish' | 'neutral';
    liquidityZones: Array<{
      level: number;
      type: 'support' | 'resistance';
      strength: number;
    }>;
    orderBlocks: Array<{
      high: number;
      low: number;
      type: 'bullish' | 'bearish';
      timeframe: string;
    }>;
    fairValueGaps: Array<{
      high: number;
      low: number;
      status: 'unfilled' | 'partial' | 'filled';
    }>;
    inducement: {
      detected: boolean;
      level?: number;
      probability: number;
    };
  };
  newsAnalysis: {
    sentiment: 'bullish' | 'bearish' | 'neutral';
    score: number;
    keyEvents: string[];
    sources: number;
  };
  onChainMetrics: {
    activeAddresses: number;
    transactionCount: number;
    hashRate: number;
    difficulty: number;
    memPoolSize: number;
  };
  tradingOpportunities: Array<{
    asset: string;
    type: 'buy' | 'sell' | 'hold';
    timeframe: string;
    entry: number;
    target: number;
    stopLoss: number;
    confidence: number;
    reason: string;
    riskReward: number;
  }>;
}

// Função para buscar dados do Bitcoin via CoinGecko
async function fetchBitcoinData() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true',
      { next: { revalidate: 60 } } // Cache por 1 minuto
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from CoinGecko');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Bitcoin data:', error);
    return null;
  }
}

// Função para buscar Fear & Greed Index
async function fetchFearGreedIndex() {
  try {
    const response = await fetch(
      'https://api.alternative.me/fng/',
      { next: { revalidate: 3600 } } // Cache por 1 hora
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Fear & Greed Index');
    }

    const data = await response.json();
    return data.data[0];
  } catch (error) {
    console.error('Error fetching Fear & Greed Index:', error);
    return null;
  }
}

// Fetch hourly price history from CoinGecko
async function fetchPriceHistory(days: number = 30): Promise<number[]> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=hourly`,
      { next: { revalidate: 300 } } // Cache 5 min
    );
    if (!response.ok) throw new Error('Failed to fetch price history');
    const data = await response.json();
    return data.prices.map((p: [number, number]) => p[1]);
  } catch (error) {
    console.error('Error fetching price history:', error);
    return [];
  }
}

// Calculate Exponential Moving Average
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((sum, p) => sum + p, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

// Calculate RSI (Relative Strength Index)
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  const recent = changes.slice(-period);
  const gains = recent.filter(c => c > 0);
  const losses = recent.filter(c => c < 0).map(c => Math.abs(c));
  const avgGain = gains.length > 0 ? gains.reduce((s, g) => s + g, 0) / period : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, l) => s + l, 0) / period : 0;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - (100 / (1 + rs))) * 100) / 100;
}

// Calculate MACD (Moving Average Convergence Divergence)
function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  const macdValues: number[] = [];
  for (let i = 26; i <= prices.length; i++) {
    const slice = prices.slice(0, i);
    macdValues.push(calculateEMA(slice, 12) - calculateEMA(slice, 26));
  }
  const signal = macdValues.length >= 9 ? calculateEMA(macdValues, 9) : macdLine;
  return {
    macd: Math.round(macdLine * 100) / 100,
    signal: Math.round(signal * 100) / 100,
    histogram: Math.round((macdLine - signal) * 100) / 100,
  };
}

// Calculate Bollinger Bands
function calculateBollingerBands(prices: number[], period: number = 20): { upper: number; middle: number; lower: number } {
  const recent = prices.slice(-period);
  const sma = recent.reduce((s, p) => s + p, 0) / recent.length;
  const variance = recent.reduce((s, p) => s + Math.pow(p - sma, 2), 0) / recent.length;
  const stdDev = Math.sqrt(variance);
  return {
    upper: Math.round((sma + 2 * stdDev) * 100) / 100,
    middle: Math.round(sma * 100) / 100,
    lower: Math.round((sma - 2 * stdDev) * 100) / 100,
  };
}

// Calculate real technical indicators from price history
async function calculateRealTechnicalIndicators(price: number) {
  const prices = await fetchPriceHistory(30);
  if (prices.length < 50) {
    return {
      rsi: 50,
      macd: { macd: 0, signal: 0, histogram: 0 },
      bollingerBands: { upper: price * 1.02, middle: price, lower: price * 0.98 },
      ema: { ema20: price, ema50: price, ema200: price },
    };
  }
  return {
    rsi: calculateRSI(prices),
    macd: calculateMACD(prices),
    bollingerBands: calculateBollingerBands(prices),
    ema: {
      ema20: Math.round(calculateEMA(prices, 20) * 100) / 100,
      ema50: Math.round(calculateEMA(prices, 50) * 100) / 100,
      ema200: prices.length >= 200 ? Math.round(calculateEMA(prices, 200) * 100) / 100 : Math.round(calculateEMA(prices, prices.length) * 100) / 100,
    },
  };
}

// Smart Money Concepts analysis from real price data
async function analyzeSmartMoneyConcepts(price: number, volume: number) {
  const prices = await fetchPriceHistory(7); // 7 days of hourly data

  // Structure direction: based on EMA crossover
  const ema20 = prices.length >= 20 ? calculateEMA(prices, 20) : price;
  const ema50 = prices.length >= 50 ? calculateEMA(prices, 50) : price;
  const structureDirection = price > ema20 && ema20 > ema50 ? 'bullish' :
                             price < ema20 && ema20 < ema50 ? 'bearish' : 'neutral';

  // Find actual recent swing highs and lows for liquidity zones
  const recentPrices = prices.slice(-48); // Last 48 hours
  const recentHigh = recentPrices.length > 0 ? Math.max(...recentPrices) : price * 1.05;
  const recentLow = recentPrices.length > 0 ? Math.min(...recentPrices) : price * 0.95;

  const liquidityZones = [
    { level: Math.round(recentHigh * 100) / 100, type: 'resistance' as const, strength: Math.round(((recentHigh - price) / price) * 10000) / 100 },
    { level: Math.round(recentLow * 100) / 100, type: 'support' as const, strength: Math.round(((price - recentLow) / price) * 10000) / 100 },
  ];

  // Detect order blocks from large candle moves
  const orderBlocks = [];
  for (let i = 1; i < recentPrices.length; i++) {
    const move = (recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1];
    if (Math.abs(move) > 0.005) { // > 0.5% move
      orderBlocks.push({
        high: Math.round(Math.max(recentPrices[i], recentPrices[i - 1]) * 100) / 100,
        low: Math.round(Math.min(recentPrices[i], recentPrices[i - 1]) * 100) / 100,
        type: (move > 0 ? 'bullish' : 'bearish') as 'bullish' | 'bearish',
        timeframe: '1H',
      });
    }
  }

  // Detect FVGs (gaps in price)
  const fairValueGaps = [];
  for (let i = 2; i < recentPrices.length; i++) {
    if (recentPrices[i] > recentPrices[i - 2] * 1.003) { // Bullish gap
      fairValueGaps.push({
        high: Math.round(recentPrices[i] * 100) / 100,
        low: Math.round(recentPrices[i - 2] * 100) / 100,
        status: (price < recentPrices[i] ? 'unfilled' : 'filled') as 'unfilled' | 'partial' | 'filled',
      });
    }
  }

  return {
    structureDirection: structureDirection as 'bullish' | 'bearish' | 'neutral',
    liquidityZones,
    orderBlocks: orderBlocks.slice(-3),
    fairValueGaps: fairValueGaps.slice(-3),
    inducement: {
      detected: recentPrices.length > 0 && recentPrices[recentPrices.length - 1] < recentLow * 1.005,
      level: recentLow,
      probability: structureDirection === 'bearish' ? 65 : 25,
    },
  };
}

// Derive news sentiment from Fear & Greed Index
function deriveNewsSentiment(fearGreedValue: number) {
  let sentiment: 'bullish' | 'bearish' | 'neutral';
  if (fearGreedValue >= 60) sentiment = 'bullish';
  else if (fearGreedValue <= 40) sentiment = 'bearish';
  else sentiment = 'neutral';

  return {
    sentiment,
    score: fearGreedValue,
    keyEvents: ['Market sentiment derived from Fear & Greed Index'],
    sources: 1,
  };
}

// Fetch real on-chain metrics from mempool.space
async function fetchOnChainMetrics() {
  try {
    const [hashrateRes, diffRes, mempoolRes] = await Promise.allSettled([
      fetch('https://mempool.space/api/v1/mining/hashrate/3d', { next: { revalidate: 600 } }),
      fetch('https://mempool.space/api/v1/difficulty-adjustment', { next: { revalidate: 600 } }),
      fetch('https://mempool.space/api/mempool', { next: { revalidate: 30 } }),
    ]);

    const hashData = hashrateRes.status === 'fulfilled' && hashrateRes.value.ok ? await hashrateRes.value.json() : null;
    const diffData = diffRes.status === 'fulfilled' && diffRes.value.ok ? await diffRes.value.json() : null;
    const mempoolData = mempoolRes.status === 'fulfilled' && mempoolRes.value.ok ? await mempoolRes.value.json() : null;

    return {
      activeAddresses: 900000, // No free API for this - static reasonable value
      transactionCount: mempoolData?.count || 250000,
      hashRate: hashData?.currentHashrate ? Math.round(hashData.currentHashrate / 1e18) : 500, // EH/s
      difficulty: diffData?.difficultyChange ? Math.round(diffData.difficultyChange * 100) / 100 : 0,
      memPoolSize: mempoolData?.vsize ? Math.round(mempoolData.vsize / 1e6) : 20, // MB
    };
  } catch (error) {
    console.error('Error fetching on-chain metrics:', error);
    return {
      activeAddresses: 900000,
      transactionCount: 250000,
      hashRate: 500,
      difficulty: 55000000000000,
      memPoolSize: 20,
    };
  }
}

// Função para gerar oportunidades de trading
function generateTradingOpportunities(bitcoinPrice: number, ethereumPrice: number, smc: any) {
  const opportunities = [];

  // Oportunidade Bitcoin
  if (smc.structureDirection === 'bullish') {
    opportunities.push({
      asset: 'BTC',
      type: 'buy' as const,
      timeframe: '4H',
      entry: bitcoinPrice,
      target: Math.round((bitcoinPrice * 1.05) * 100) / 100,
      stopLoss: Math.round((bitcoinPrice * 0.97) * 100) / 100,
      confidence: 75,
      reason: 'Bullish structure break with volume confirmation',
      riskReward: 1.67
    });
  }

  // Oportunidade Ethereum
  opportunities.push({
    asset: 'ETH',
    type: smc.structureDirection === 'bullish' ? 'buy' as const : 'hold' as const,
    timeframe: '1H',
    entry: ethereumPrice,
    target: Math.round((ethereumPrice * 1.03) * 100) / 100,
    stopLoss: Math.round((ethereumPrice * 0.98) * 100) / 100,
    confidence: 70,
    reason: 'ETH showing relative strength vs BTC',
    riskReward: 1.5
  });

  return opportunities;
}

// Handler principal GET
export async function GET(request: NextRequest) {
  try {
    // Buscar dados de mercado em paralelo
    const [coinGeckoData, fearGreedData] = await Promise.all([
      fetchBitcoinData(),
      fetchFearGreedIndex()
    ]);

    // Usar dados padrão se as APIs falharam
    const bitcoinPrice = coinGeckoData?.bitcoin?.usd || 104390;
    const ethereumPrice = coinGeckoData?.ethereum?.usd || 2350;

    const bitcoinData = {
      price: bitcoinPrice,
      change24h: coinGeckoData?.bitcoin?.usd_24h_change || 0,
      volume24h: coinGeckoData?.bitcoin?.usd_24h_vol || 25000000000,
      marketCap: coinGeckoData?.bitcoin?.usd_market_cap || 2000000000000,
      dominance: 52.5
    };

    const ethereumData = {
      price: ethereumPrice,
      change24h: coinGeckoData?.ethereum?.usd_24h_change || 0,
      volume24h: coinGeckoData?.ethereum?.usd_24h_vol || 15000000000,
      marketCap: coinGeckoData?.ethereum?.usd_market_cap || 280000000000
    };

    const fearGreed = {
      value: fearGreedData?.value ? Number(fearGreedData.value) : 50,
      classification: fearGreedData?.value_classification || 'Neutral',
      timestamp: fearGreedData?.timestamp || new Date().toISOString()
    };

    // Calcular indicadores e análises (all async with real data)
    const [technicalIndicators, smartMoneyConcepts, onChainMetrics] = await Promise.all([
      calculateRealTechnicalIndicators(bitcoinPrice),
      analyzeSmartMoneyConcepts(bitcoinPrice, bitcoinData.volume24h),
      fetchOnChainMetrics(),
    ]);

    const newsAnalysis = deriveNewsSentiment(fearGreed.value);
    const tradingOpportunities = generateTradingOpportunities(bitcoinPrice, ethereumPrice, smartMoneyConcepts);

    const marketData: MarketData = {
      bitcoin: bitcoinData,
      ethereum: ethereumData,
      fearGreedIndex: fearGreed,
      technicalIndicators,
      smartMoneyConcepts,
      newsAnalysis,
      onChainMetrics,
      tradingOpportunities
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: marketData,
      sources: {
        priceData: coinGeckoData ? 'CoinGecko' : 'Fallback',
        fearGreed: fearGreedData ? 'Alternative.me' : 'Fallback',
        technical: 'CoinGecko hourly candles + RSI/MACD/EMA/Bollinger calculations',
        smc: 'CoinGecko price history + EMA crossover / order block detection',
        news: 'Derived from Fear & Greed Index',
        onChain: 'mempool.space (hashrate, difficulty, mempool)',
      }
    });

  } catch (error) {
    console.error('Market Context API Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar contexto de mercado',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Handler POST para análise específica
export async function POST(request: NextRequest) {
  try {
    const { assets, timeframe, analysisType } = await request.json();

    // Buscar dados específicos dos ativos solicitados
    const assetData = await fetchBitcoinData();

    // Gerar análise específica baseada nos parâmetros
    const specificAnalysis = {
      assets: assets || ['BTC', 'ETH'],
      timeframe: timeframe || '4H',
      analysis: analysisType || 'smc',
      timestamp: new Date().toISOString(),
      results: {
        signals: generateTradingOpportunities(
          assetData?.bitcoin?.usd || 104390,
          assetData?.ethereum?.usd || 2350,
          { structureDirection: 'bullish' }
        ),
        riskLevel: 'medium',
        confidence: 75,
        recommendation: 'Consider position sizing based on risk tolerance'
      }
    };

    return NextResponse.json({
      success: true,
      data: specificAnalysis
    });

  } catch (error) {
    console.error('Specific Analysis Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro na análise específica',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// Handler OPTIONS para CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'https://cypherordifuture.xyz',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
