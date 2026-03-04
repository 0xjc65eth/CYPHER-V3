/**
 * 📊 MARKET ANALYZER - CYPHER AI v3.0
 * Analisador de mercado em tempo real com indicadores técnicos
 */

import { TradingEngine } from './trading-engine';

interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  high24h: number;
  low24h: number;
  change24h: number;
  bid: number;
  ask: number;
  indicators?: TechnicalIndicators;
}

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    signal: number;
    histogram: number;
  };
  bb: {
    upper: number;
    middle: number;
    lower: number;
  };
  ema: {
    ema9: number;
    ema21: number;
    ema50: number;
  };
  atr: number;
  volatility: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  momentum: number;
}

export class MarketAnalyzer {
  private cache: Map<string, { data: MarketData; timestamp: number }> = new Map();
  private cacheExpiry = 30000; // 30 segundos

  constructor(private exchanges: TradingEngine[]) {}

  async analyze(symbol: string, timeframes: string[]): Promise<MarketData> {
    // Verificar cache
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    // Obter dados de múltiplas exchanges
    const marketData = await this.aggregateMarketData(symbol);
    
    // Calcular indicadores técnicos
    const candles = await this.getHistoricalData(symbol, '1h', 100);
    const indicators = this.calculateIndicators(candles);
    
    // Combinar dados
    const result = {
      ...marketData,
      indicators
    } as MarketData;

    // Cachear resultado
    this.cache.set(symbol, { data: result, timestamp: Date.now() });

    return result;
  }

  private async aggregateMarketData(symbol: string): Promise<Partial<MarketData>> {
    const prices: number[] = [];
    const volumes: number[] = [];
    const bids: number[] = [];
    const asks: number[] = [];

    // Coletar dados de todas as exchanges
    await Promise.all(
      this.exchanges.map(async (exchange) => {
        try {
          const ticker = await (exchange as any).getTicker(symbol);
          if (ticker) {
            prices.push(ticker.last);
            volumes.push(ticker.volume);
            bids.push(ticker.bid);
            asks.push(ticker.ask);
          }
        } catch (error) {
          console.error(`Error fetching ticker from ${(exchange as any).exchange}:`, error);
        }
      })
    );

    // Calcular médias
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const totalVolume = volumes.reduce((a, b) => a + b, 0);
    const avgBid = bids.reduce((a, b) => a + b, 0) / bids.length;
    const avgAsk = asks.reduce((a, b) => a + b, 0) / asks.length;

    // Obter dados 24h
    const stats24h = await this.get24hStats(symbol);

    return {
      symbol,
      price: avgPrice,
      volume: totalVolume,
      high24h: stats24h.high,
      low24h: stats24h.low,
      change24h: stats24h.changePercent,
      bid: avgBid,
      ask: avgAsk
    };
  }

  private async getHistoricalData(symbol: string, timeframe: string, limit: number): Promise<OHLCV[]> {
    // Usar a primeira exchange disponível para dados históricos
    const exchange = this.exchanges[0];
    
    try {
      const candles = await (exchange as any).getOHLCV(symbol, timeframe, limit);
      return candles.map((c: any) => ({
        timestamp: c[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5]
      }));
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }
  }

  private calculateIndicators(candles: OHLCV[]): TechnicalIndicators {
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);

    return {
      rsi: this.calculateRSI(closes, 14),
      macd: this.calculateMACD(closes),
      bb: this.calculateBollingerBands(closes, 20, 2),
      ema: {
        ema9: this.calculateEMA(closes, 9),
        ema21: this.calculateEMA(closes, 21),
        ema50: this.calculateEMA(closes, 50)
      },
      atr: this.calculateATR(highs, lows, closes, 14),
      volatility: this.calculateVolatility(closes),
      trend: this.identifyTrend(closes),
      momentum: this.calculateMomentum(closes)
    };
  }

  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    // Calcular ganhos e perdas iniciais
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calcular médias móveis para o resto dos períodos
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
      }
    }

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  }

  private calculateMACD(prices: number[]): { signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    
    const macdLine = ema12 - ema26;
    
    // Signal line é EMA de 9 períodos da linha MACD
    const macdValues = [];
    for (let i = 26; i < prices.length; i++) {
      const ema12Val = this.calculateEMAPoint(prices.slice(0, i + 1), 12);
      const ema26Val = this.calculateEMAPoint(prices.slice(0, i + 1), 26);
      macdValues.push(ema12Val - ema26Val);
    }
    
    const signalLine = this.calculateEMAPoint(macdValues, 9);
    const histogram = macdLine - signalLine;
    
    return {
      signal: signalLine,
      histogram
    };
  }

  private calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number } {
    const sma = this.calculateSMA(prices, period);
    const standardDeviation = this.calculateStandardDeviation(prices.slice(-period), sma);
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  }

  private calculateEMA(prices: number[], period: number): number {
    return this.calculateEMAPoint(prices, period);
  }

  private calculateEMAPoint(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(prices.slice(0, period), period);
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  private calculateSMA(prices: number[], period: number): number {
    const relevantPrices = prices.slice(-period);
    return relevantPrices.reduce((a, b) => a + b, 0) / relevantPrices.length;
  }

  private calculateStandardDeviation(prices: number[], mean: number): number {
    const squaredDifferences = prices.map(price => Math.pow(price - mean, 2));
    const avgSquaredDiff = squaredDifferences.reduce((a, b) => a + b, 0) / prices.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    const trueRanges: number[] = [];
    
    for (let i = 1; i < highs.length; i++) {
      const highLow = highs[i] - lows[i];
      const highClose = Math.abs(highs[i] - closes[i - 1]);
      const lowClose = Math.abs(lows[i] - closes[i - 1]);
      
      trueRanges.push(Math.max(highLow, highClose, lowClose));
    }
    
    // Primeira ATR é média simples
    let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    // Depois usa média móvel exponencial
    for (let i = period; i < trueRanges.length; i++) {
      atr = ((atr * (period - 1)) + trueRanges[i]) / period;
    }
    
    return atr;
  }

  private calculateVolatility(prices: number[]): number {
    const returns: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private identifyTrend(prices: number[]): 'bullish' | 'bearish' | 'neutral' {
    const ema9 = this.calculateEMA(prices, 9);
    const ema21 = this.calculateEMA(prices, 21);
    const ema50 = this.calculateEMA(prices, 50);
    
    const currentPrice = prices[prices.length - 1];
    
    // Trend forte de alta
    if (currentPrice > ema9 && ema9 > ema21 && ema21 > ema50) {
      return 'bullish';
    }
    
    // Trend forte de baixa
    if (currentPrice < ema9 && ema9 < ema21 && ema21 < ema50) {
      return 'bearish';
    }
    
    return 'neutral';
  }

  private calculateMomentum(prices: number[], period: number = 10): number {
    if (prices.length < period + 1) return 0;
    
    const currentPrice = prices[prices.length - 1];
    const pastPrice = prices[prices.length - period - 1];
    
    return ((currentPrice - pastPrice) / pastPrice) * 100;
  }

  private async get24hStats(symbol: string): Promise<{ high: number; low: number; changePercent: number }> {
    // Obter dados de 24h atrás
    const candles24h = await this.getHistoricalData(symbol, '1h', 24);
    
    if (candles24h.length === 0) {
      return { high: 0, low: 0, changePercent: 0 };
    }
    
    const high = Math.max(...candles24h.map(c => c.high));
    const low = Math.min(...candles24h.map(c => c.low));
    const open24h = candles24h[0].open;
    const currentPrice = candles24h[candles24h.length - 1].close;
    const changePercent = ((currentPrice - open24h) / open24h) * 100;
    
    return { high, low, changePercent };
  }

  // Métodos públicos adicionais

  public clearCache(): void {
    this.cache.clear();
  }

  public setCacheExpiry(ms: number): void {
    this.cacheExpiry = ms;
  }

  public async getOrderBook(symbol: string, limit: number = 10): Promise<{ bids: any[]; asks: any[] }> {
    const exchange = this.exchanges[0];
    return await (exchange as any).getOrderBook(symbol, limit);
  }

  public async getRecentTrades(symbol: string, limit: number = 50): Promise<any[]> {
    const exchange = this.exchanges[0];
    return await (exchange as any).getRecentTrades(symbol, limit);
  }
}