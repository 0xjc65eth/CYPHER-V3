import { useState, useEffect, useCallback, useRef } from 'react';

interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradingSignal {
  type: 'buy' | 'sell' | 'hold';
  strength: 'strong' | 'medium' | 'weak';
  indicator: string;
  price: number;
  timestamp: Date;
}

interface TechnicalIndicators {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  ema: {
    ema12: number;
    ema26: number;
    ema50: number;
    ema200: number;
  };
  volume: {
    current: number;
    average: number;
  };
}

interface TradingData {
  candles: OHLCV[];
  indicators: TechnicalIndicators;
  signals: TradingSignal[];
  supportLevels: number[];
  resistanceLevels: number[];
}

// --- Real Technical Indicator Calculations ---

function calcEMA(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50; // not enough data
  let avgGain = 0;
  let avgLoss = 0;

  // Initial average
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder's smoothing
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcMACD(closes: number[]): { value: number; signal: number; histogram: number } {
  if (closes.length < 26) return { value: 0, signal: 0, histogram: 0 };
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }
  const signalLine = calcEMA(macdLine, 9);
  const latest = closes.length - 1;
  const value = macdLine[latest];
  const signal = signalLine[latest];
  return { value, signal, histogram: value - signal };
}

function calcBollingerBands(closes: number[], period = 20, stdDevFactor = 2): { upper: number; middle: number; lower: number } {
  if (closes.length < period) {
    const last = closes[closes.length - 1] || 0;
    return { upper: last * 1.02, middle: last, lower: last * 0.98 };
  }
  const slice = closes.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    upper: sma + stdDevFactor * stdDev,
    middle: sma,
    lower: sma - stdDevFactor * stdDev,
  };
}

function getLatestEMA(closes: number[], period: number): number {
  const ema = calcEMA(closes, period);
  return ema[ema.length - 1] || 0;
}

function findSupportResistance(candles: OHLCV[]): { support: number[]; resistance: number[] } {
  if (candles.length === 0) return { support: [], resistance: [] };

  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const currentPrice = candles[candles.length - 1].close;

  // Find local minima and maxima using a window of 5
  const supports: number[] = [];
  const resistances: number[] = [];

  for (let i = 2; i < candles.length - 2; i++) {
    const isLocalMin = lows[i] < lows[i - 1] && lows[i] < lows[i - 2] && lows[i] < lows[i + 1] && lows[i] < lows[i + 2];
    const isLocalMax = highs[i] > highs[i - 1] && highs[i] > highs[i - 2] && highs[i] > highs[i + 1] && highs[i] > highs[i + 2];

    if (isLocalMin && lows[i] < currentPrice) supports.push(lows[i]);
    if (isLocalMax && highs[i] > currentPrice) resistances.push(highs[i]);
  }

  // Sort and take top 3
  supports.sort((a, b) => b - a); // highest support first
  resistances.sort((a, b) => a - b); // lowest resistance first

  return {
    support: supports.slice(0, 3),
    resistance: resistances.slice(0, 3),
  };
}

function generateSignals(indicators: TechnicalIndicators, currentPrice: number): TradingSignal[] {
  const signals: TradingSignal[] = [];

  // RSI signals
  if (indicators.rsi < 30) {
    signals.push({
      type: 'buy',
      strength: indicators.rsi < 20 ? 'strong' : 'medium',
      indicator: 'RSI Oversold',
      price: currentPrice,
      timestamp: new Date(),
    });
  } else if (indicators.rsi > 70) {
    signals.push({
      type: 'sell',
      strength: indicators.rsi > 80 ? 'strong' : 'medium',
      indicator: 'RSI Overbought',
      price: currentPrice,
      timestamp: new Date(),
    });
  }

  // MACD signals
  if (indicators.macd.histogram > 0 && indicators.macd.value > indicators.macd.signal) {
    signals.push({
      type: 'buy',
      strength: 'medium',
      indicator: 'MACD Bullish Cross',
      price: currentPrice,
      timestamp: new Date(),
    });
  } else if (indicators.macd.histogram < 0 && indicators.macd.value < indicators.macd.signal) {
    signals.push({
      type: 'sell',
      strength: 'medium',
      indicator: 'MACD Bearish Cross',
      price: currentPrice,
      timestamp: new Date(),
    });
  }

  // Bollinger Bands signals
  if (currentPrice < indicators.bollingerBands.lower) {
    signals.push({
      type: 'buy',
      strength: 'weak',
      indicator: 'Below Lower BB',
      price: currentPrice,
      timestamp: new Date(),
    });
  } else if (currentPrice > indicators.bollingerBands.upper) {
    signals.push({
      type: 'sell',
      strength: 'weak',
      indicator: 'Above Upper BB',
      price: currentPrice,
      timestamp: new Date(),
    });
  }

  // EMA crossover
  if (indicators.ema.ema12 > indicators.ema.ema26 && indicators.ema.ema26 > indicators.ema.ema50) {
    signals.push({
      type: 'buy',
      strength: 'medium',
      indicator: 'EMA Bullish Alignment',
      price: currentPrice,
      timestamp: new Date(),
    });
  }

  return signals;
}

function mapTimeframeToBinanceInterval(tf: string): string {
  const map: Record<string, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d',
  };
  return map[tf] || '1h';
}

export function useTradingData(symbol = 'BTCUSDT', timeframe = '1h') {
  const [data, setData] = useState<TradingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const interval = mapTimeframeToBinanceInterval(timeframe);
      // Fetch 200 candles for sufficient indicator calculation (EMA200 needs 200 points)
      const res = await fetch(
        `/api/charts/historical?symbol=${symbol}&interval=${interval}&limit=200`
      );

      if (!mountedRef.current) return;

      if (!res.ok) throw new Error(`Chart API returned ${res.status}`);

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error('No chart data available');
      }

      const candles: OHLCV[] = json.data.map((c: any) => ({
        timestamp: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }));

      if (candles.length === 0) {
        throw new Error('Empty candle data');
      }

      const closes = candles.map(c => c.close);
      const volumes = candles.map(c => c.volume);
      const currentPrice = closes[closes.length - 1];

      // Calculate real indicators
      const rsi = calcRSI(closes, 14);
      const macd = calcMACD(closes);
      const bollingerBands = calcBollingerBands(closes, 20, 2);
      const ema = {
        ema12: getLatestEMA(closes, 12),
        ema26: getLatestEMA(closes, 26),
        ema50: getLatestEMA(closes, 50),
        ema200: getLatestEMA(closes, 200),
      };
      const volume = {
        current: volumes[volumes.length - 1] || 0,
        average: volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0,
      };

      const indicators: TechnicalIndicators = { rsi, macd, bollingerBands, ema, volume };
      const signals = generateSignals(indicators, currentPrice);
      const { support, resistance } = findSupportResistance(candles);

      if (!mountedRef.current) return;

      setData({
        candles,
        indicators,
        signals,
        supportLevels: support,
        resistanceLevels: resistance,
      });
      setLoading(false);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('useTradingData error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trading data');
      setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    // Refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  return { data, loading, error };
}
