'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';

// Technical indicator calculation utilities

export interface RSIData {
  value: number;
  signal: 'overbought' | 'oversold' | 'neutral';
}

export interface MACDData {
  macd: number;
  signal: number;
  histogram: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface BollingerBandsData {
  upper: number;
  middle: number;
  lower: number;
  position: 'above' | 'below' | 'middle';
}

// RSI Calculator (Relative Strength Index)
export function calculateRSI(prices: number[], period: number = 14): RSIData {
  if (prices.length < period + 1) {
    return { value: 50, signal: 'neutral' };
  }

  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const gains = changes.slice(-period).map(c => c > 0 ? c : 0);
  const losses = changes.slice(-period).map(c => c < 0 ? -c : 0);

  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;

  if (avgLoss === 0) return { value: 100, signal: 'overbought' };

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  const signal = rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral';

  return { value: rsi, signal };
}

// MACD Calculator (Moving Average Convergence Divergence)
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDData {
  if (prices.length < slowPeriod) {
    return { macd: 0, signal: 0, histogram: 0, trend: 'neutral' };
  }

  const emaFast = calculateEMA(prices, fastPeriod);
  const emaSlow = calculateEMA(prices, slowPeriod);
  const macd = emaFast - emaSlow;

  // Calculate signal line (EMA of MACD)
  const macdHistory = [macd]; // Simplified - should use historical MACD values
  const signal = calculateEMA(macdHistory, signalPeriod);

  const histogram = macd - signal;
  const trend = histogram > 0 ? 'bullish' : histogram < 0 ? 'bearish' : 'neutral';

  return { macd, signal, histogram, trend };
}

// Bollinger Bands Calculator
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsData {
  if (prices.length < period) {
    const current = prices[prices.length - 1] || 0;
    return { upper: current, middle: current, lower: current, position: 'middle' };
  }

  const relevantPrices = prices.slice(-period);
  const sma = relevantPrices.reduce((a, b) => a + b, 0) / period;

  // Calculate standard deviation
  const squaredDiffs = relevantPrices.map(price => Math.pow(price - sma, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const standardDeviation = Math.sqrt(variance);

  const upper = sma + (stdDev * standardDeviation);
  const lower = sma - (stdDev * standardDeviation);
  const middle = sma;

  const currentPrice = prices[prices.length - 1];
  const position = currentPrice > upper ? 'above' : currentPrice < lower ? 'below' : 'middle';

  return { upper, middle, lower, position };
}

// Helper: Calculate EMA (Exponential Moving Average)
function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length < period) return prices[prices.length - 1];

  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * k) + (ema * (1 - k));
  }

  return ema;
}

// RSI Indicator Component
export function RSIIndicator({ data }: { data: RSIData }) {
  const getColor = () => {
    if (data.signal === 'overbought') return 'text-red-400';
    if (data.signal === 'oversold') return 'text-green-400';
    return 'text-gray-400';
  };

  const getBgColor = () => {
    if (data.signal === 'overbought') return 'bg-red-500/20';
    if (data.signal === 'oversold') return 'bg-green-500/20';
    return 'bg-gray-500/20';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase text-gray-500 font-semibold">RSI (14)</span>
          <span className={`text-sm font-bold font-mono ${getColor()}`}>
            {data.value.toFixed(1)}
          </span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${getBgColor()} transition-all duration-300`}
            style={{ width: `${data.value}%` }}
          />
        </div>
        {data.signal !== 'neutral' && (
          <div className="flex items-center gap-1 mt-1">
            <AlertTriangle className={`h-3 w-3 ${getColor()}`} />
            <span className={`text-[10px] ${getColor()} uppercase font-semibold`}>
              {data.signal}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// MACD Indicator Component
export function MACDIndicator({ data }: { data: MACDData }) {
  const Icon = data.trend === 'bullish' ? TrendingUp : data.trend === 'bearish' ? TrendingDown : Activity;
  const color = data.trend === 'bullish' ? 'text-green-400' : data.trend === 'bearish' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase text-gray-500 font-semibold">MACD</span>
        <div className="flex items-center gap-1">
          <Icon className={`h-3 w-3 ${color}`} />
          <span className={`text-xs uppercase font-semibold ${color}`}>
            {data.trend}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
        <div>
          <div className="text-[10px] text-gray-600 uppercase">MACD</div>
          <div className="text-white font-semibold">{data.macd.toFixed(4)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-600 uppercase">Signal</div>
          <div className="text-white font-semibold">{data.signal.toFixed(4)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-600 uppercase">Hist</div>
          <div className={`font-semibold ${color}`}>{data.histogram.toFixed(4)}</div>
        </div>
      </div>
    </div>
  );
}

// Bollinger Bands Indicator Component
export function BollingerBandsIndicator({ data, currentPrice }: { data: BollingerBandsData; currentPrice: number }) {
  const getPositionColor = () => {
    if (data.position === 'above') return 'text-red-400';
    if (data.position === 'below') return 'text-green-400';
    return 'text-gray-400';
  };

  const percentage = ((currentPrice - data.lower) / (data.upper - data.lower)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase text-gray-500 font-semibold">Bollinger Bands</span>
        <span className={`text-xs uppercase font-semibold ${getPositionColor()}`}>
          {data.position}
        </span>
      </div>
      <div className="relative h-12 bg-gray-800/50 rounded">
        {/* Upper band */}
        <div className="absolute top-0 left-0 right-0 h-px bg-red-500/50" />
        <div className="absolute top-0.5 left-2 text-[9px] text-red-400 font-mono">
          {data.upper.toFixed(8)}
        </div>

        {/* Middle band */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-orange-500/50 -translate-y-1/2" />
        <div className="absolute top-1/2 left-2 -translate-y-1/2 text-[9px] text-orange-400 font-mono">
          {data.middle.toFixed(8)}
        </div>

        {/* Lower band */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-green-500/50" />
        <div className="absolute bottom-0.5 left-2 text-[9px] text-green-400 font-mono">
          {data.lower.toFixed(8)}
        </div>

        {/* Current price indicator */}
        <div
          className="absolute left-0 right-0 h-1 bg-white/80 rounded-full transition-all duration-300"
          style={{ top: `${100 - percentage}%` }}
        >
          <div className="absolute right-2 -top-3 text-[10px] text-white font-mono font-bold">
            {currentPrice.toFixed(8)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Combined Technical Analysis Panel
export interface TechnicalAnalysisData {
  rsi: RSIData;
  macd: MACDData;
  bollingerBands: BollingerBandsData;
  currentPrice: number;
}

export function TechnicalAnalysisPanel({ data }: { data: TechnicalAnalysisData }) {
  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-terminal p-4 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-3">
          Technical Indicators
        </h3>
      </div>

      <div className="space-y-4">
        <RSIIndicator data={data.rsi} />
        <div className="border-t border-gray-800" />
        <MACDIndicator data={data.macd} />
        <div className="border-t border-gray-800" />
        <BollingerBandsIndicator data={data.bollingerBands} currentPrice={data.currentPrice} />
      </div>
    </div>
  );
}
