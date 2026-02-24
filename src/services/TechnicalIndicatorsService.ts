/**
 * CYPHER V3 - Technical Indicators Service
 * Pure functions for calculating real technical indicators from candle data.
 * Used by ProfessionalMarketService and market/indicators API.
 */

export interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time?: number;
}

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  percentB: number;
}

export interface StochasticResult {
  k: number;
  d: number;
}

/**
 * Calculate Exponential Moving Average
 */
export function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) return [];

  const multiplier = 2 / (period + 1);
  const ema: number[] = [];

  // SMA for first value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  ema.push(sum / period);

  // EMA for rest
  for (let i = period; i < data.length; i++) {
    ema.push((data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
  }

  return ema;
}

/**
 * Calculate Simple Moving Average
 */
export function calculateSMA(data: number[], period: number): number[] {
  if (data.length < period) return [];

  const sma: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j];
    }
    sma.push(sum / period);
  }
  return sma;
}

/**
 * Calculate RSI (Relative Strength Index)
 * Standard period: 14
 */
export function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50; // neutral fallback

  let avgGain = 0;
  let avgLoss = 0;

  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  // Smooth with Wilder's method
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
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
  return 100 - (100 / (1 + rs));
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * Standard: fast=12, slow=26, signal=9
 */
export function calculateMACD(closes: number[], fast: number = 12, slow: number = 26, signalPeriod: number = 9): MACDResult {
  if (closes.length < slow + signalPeriod) {
    return { macd: 0, signal: 0, histogram: 0 };
  }

  const emaFast = calculateEMA(closes, fast);
  const emaSlow = calculateEMA(closes, slow);

  // Align arrays - emaFast starts at index (fast-1), emaSlow starts at index (slow-1)
  const offset = slow - fast;
  const macdLine: number[] = [];
  for (let i = 0; i < emaSlow.length; i++) {
    macdLine.push(emaFast[i + offset] - emaSlow[i]);
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);

  if (signalLine.length === 0) {
    return { macd: 0, signal: 0, histogram: 0 };
  }

  const lastMacd = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];

  return {
    macd: lastMacd,
    signal: lastSignal,
    histogram: lastMacd - lastSignal,
  };
}

/**
 * Calculate Bollinger Bands
 * Standard: period=20, stdDev=2
 */
export function calculateBollingerBands(closes: number[], period: number = 20, stdDev: number = 2): BollingerBandsResult {
  if (closes.length < period) {
    return { upper: 0, middle: 0, lower: 0, bandwidth: 0, percentB: 50 };
  }

  const recentCloses = closes.slice(-period);
  const middle = recentCloses.reduce((a, b) => a + b, 0) / period;

  const variance = recentCloses.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
  const sd = Math.sqrt(variance);

  const upper = middle + stdDev * sd;
  const lower = middle - stdDev * sd;
  const currentPrice = closes[closes.length - 1];
  const bandwidth = upper - lower;
  const percentB = bandwidth > 0 ? ((currentPrice - lower) / bandwidth) * 100 : 50;

  return { upper, middle, lower, bandwidth, percentB };
}

/**
 * Calculate Volume Weighted Average Price
 */
export function calculateVWAP(candles: OHLCV[]): number {
  if (candles.length === 0) return 0;

  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (const candle of candles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeTPV += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;
  }

  return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : 0;
}

/**
 * Calculate Stochastic Oscillator
 * Standard: period=14, smoothK=3
 */
export function calculateStochastic(highs: number[], lows: number[], closes: number[], period: number = 14, smoothK: number = 3): StochasticResult {
  if (closes.length < period + smoothK) {
    return { k: 50, d: 50 };
  }

  const rawK: number[] = [];

  for (let i = period - 1; i < closes.length; i++) {
    const periodHighs = highs.slice(i - period + 1, i + 1);
    const periodLows = lows.slice(i - period + 1, i + 1);

    const highest = Math.max(...periodHighs);
    const lowest = Math.min(...periodLows);
    const range = highest - lowest;

    rawK.push(range > 0 ? ((closes[i] - lowest) / range) * 100 : 50);
  }

  // Smooth %K
  const smoothedK = calculateSMA(rawK, smoothK);
  // %D is SMA of smoothed %K
  const dValues = calculateSMA(smoothedK, smoothK);

  return {
    k: smoothedK.length > 0 ? smoothedK[smoothedK.length - 1] : 50,
    d: dValues.length > 0 ? dValues[dValues.length - 1] : 50,
  };
}

/**
 * Calculate Williams %R
 * Standard: period=14
 */
export function calculateWilliamsR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (closes.length < period) return -50;

  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  const currentClose = closes[closes.length - 1];

  const highest = Math.max(...recentHighs);
  const lowest = Math.min(...recentLows);
  const range = highest - lowest;

  return range > 0 ? ((highest - currentClose) / range) * -100 : -50;
}

/**
 * Derive trading signal from RSI
 */
export function getRSISignal(rsi: number): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (rsi >= 70) return 'BEARISH'; // Overbought
  if (rsi <= 30) return 'BULLISH'; // Oversold
  if (rsi >= 60) return 'BULLISH';
  if (rsi <= 40) return 'BEARISH';
  return 'NEUTRAL';
}

/**
 * Derive trading signal from MACD
 */
export function getMACDSignal(macd: MACDResult): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (macd.histogram > 0 && macd.macd > 0) return 'BULLISH';
  if (macd.histogram < 0 && macd.macd < 0) return 'BEARISH';
  return 'NEUTRAL';
}

/**
 * Derive trading signal from Bollinger Bands %B
 */
export function getBollingerSignal(bb: BollingerBandsResult): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (bb.percentB > 80) return 'BEARISH'; // Near upper band
  if (bb.percentB < 20) return 'BULLISH'; // Near lower band
  if (bb.percentB > 60) return 'BULLISH';
  if (bb.percentB < 40) return 'BEARISH';
  return 'NEUTRAL';
}

/**
 * Fetch Binance klines (candles) for a symbol
 */
export async function fetchBinanceKlines(
  symbol: string = 'BTCUSDT',
  interval: string = '1h',
  limit: number = 500
): Promise<OHLCV[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      { signal: controller.signal }
    );

    if (!response.ok) throw new Error(`Binance klines ${response.status}`);

    const data = await response.json();
    return data.map((k: any[]) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Calculate all indicators from candles at once
 */
export function calculateAllIndicators(candles: OHLCV[]) {
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const bb = calculateBollingerBands(closes);
  const vwap = calculateVWAP(candles);
  const stoch = calculateStochastic(highs, lows, closes);
  const williamsR = calculateWilliamsR(highs, lows, closes);

  return {
    rsi,
    macd,
    bollingerBands: bb,
    vwap,
    stochastic: stoch,
    williamsR,
    signals: {
      rsi: getRSISignal(rsi),
      macd: getMACDSignal(macd),
      bollinger: getBollingerSignal(bb),
    },
  };
}
