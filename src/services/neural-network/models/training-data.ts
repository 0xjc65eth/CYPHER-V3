/**
 * Neural Network Training Data Utilities
 * 
 * This file contains utilities for generating and managing training data for neural networks.
 */

import { loggerService } from '@/lib/logger';
const databaseService: any = null; // TODO: replace with actual database service
import { TrainingData } from './interfaces';

/**
 * Get training data for a specific symbol
 */
export async function getTrainingData(symbol: string): Promise<TrainingData[]> {
  try {
    // Check if we have stored training data
    const storedData = await databaseService.getCollection('training_data')
      .find({ symbol })
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();
    
    if (storedData && storedData.length > 0) {
      // Convert MongoDB documents to TrainingData objects
      return storedData.map((doc: any) => ({
        id: doc.id || doc._id.toString(),
        symbol: doc.symbol,
        timestamp: doc.timestamp,
        features: doc.features || {},
        target: doc.target || { price: 0, trend: 'neutral' }
      })) as TrainingData[];
    }
    
    // If no stored data, generate some simulated data
    return generateSimulatedTrainingData(symbol);
  } catch (error) {
    loggerService.error(`Error getting training data for ${symbol}`, error);
    return [];
  }
}

/**
 * Generate simulated training data
 */
export async function generateSimulatedTrainingData(symbol: string): Promise<TrainingData[]> {
  const data: TrainingData[] = [];
  const now = Date.now();
  
  // Generate data for the past 100 days
  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(now - i * 86400000).toISOString(); // 86400000 ms = 1 day
    
    // Generate deterministic features using index-based sin-wave offsets
    const features: Record<string, number> = {};

    // Price features - deterministic offset based on day index
    const basePrice = getBasePrice(symbol);
    const sinOffset = Math.sin(i * 0.1) * 0.1; // ±10% deterministic wave
    const price = basePrice * (1 + sinOffset);

    features.price_1d = price;
    features.price_3d = price * 0.97;
    features.price_7d = price * 0.95;
    features.price_14d = price * 0.93;
    features.price_30d = price * 0.90;

    // Volume features
    const baseVolume = getBaseVolume(symbol);
    features.volume_1d = baseVolume * 0.9;
    features.volume_7d = baseVolume * 0.85;

    // Technical indicators - deterministic based on price
    features.sma_20 = price * 0.99;
    features.sma_50 = price * 0.97;
    features.sma_200 = price * 0.95;
    features.ema_12 = price * 0.99;
    features.ema_26 = price * 0.97;
    features.rsi_14 = 50 + Math.sin(i * 0.2) * 15; // 35-65 deterministic range
    features.macd = Math.sin(i * 0.15) * 50;
    features.macd_signal = Math.sin(i * 0.15 + 0.5) * 50;
    features.bollinger_upper = price * 1.05;
    features.bollinger_lower = price * 0.95;
    features.stochastic_k = 50 + Math.sin(i * 0.3) * 30;
    features.stochastic_d = 50 + Math.sin(i * 0.3 + 0.3) * 30;
    features.obv = 500000 + i * 5000;

    // Market features
    features.market_cap = price * getCirculatingSupply(symbol);
    features.btc_dominance = 50 + Math.sin(i * 0.05) * 5; // 45-55% deterministic
    features.fear_greed_index = Math.floor(50 + Math.sin(i * 0.1) * 25);

    // Price changes - deterministic based on sin wave
    features.price_change_1d = Math.sin(i * 0.2) * 3;
    features.price_change_7d = Math.sin(i * 0.1) * 6;
    features.volume_change_1d = Math.sin(i * 0.25) * 10;
    features.volume_change_7d = Math.sin(i * 0.15) * 15;

    // Social and developer metrics - deterministic
    features.social_sentiment = Math.sin(i * 0.12) * 0.5;
    features.social_volume = 5000 + i * 50;
    features.news_sentiment = Math.sin(i * 0.08) * 0.4;
    features.developer_activity = 50 + Math.sin(i * 0.1) * 20;
    features.github_stars = 500 + i * 5;
    features.github_commits = 50 + (i % 20);

    // Platform-specific sentiment - deterministic
    features.twitter_sentiment = Math.sin(i * 0.11) * 0.5;
    features.reddit_sentiment = Math.sin(i * 0.13) * 0.4;
    features.discord_sentiment = Math.sin(i * 0.09) * 0.3;
    features.telegram_sentiment = Math.sin(i * 0.14) * 0.35;

    // Target values - deterministic
    const futurePrice = price * (1 + Math.sin(i * 0.2) * 0.05); // ±5% deterministic
    let trend: 'bullish' | 'bearish' | 'neutral';
    
    if (futurePrice > price * 1.03) {
      trend = 'bullish';
    } else if (futurePrice < price * 0.97) {
      trend = 'bearish';
    } else {
      trend = 'neutral';
    }
    
    data.push({
      id: `${symbol.replace(':', '_')}_${timestamp}`,
      symbol,
      timestamp,
      features,
      target: {
        price: futurePrice,
        trend
      }
    });
  }
  
  // Store the generated data
  await databaseService.getCollection('training_data').insertMany(data);
  
  return data;
}

/**
 * Get base price for a symbol
 */
export function getBasePrice(symbol: string): number {
  switch (symbol) {
    case 'BTC:USD':
      return 95000;
    case 'ORDI:USD':
      return 42.5;
    case 'RUNE:USD':
      return 18.75;
    default:
      return 100;
  }
}

/**
 * Get base volume for a symbol
 */
export function getBaseVolume(symbol: string): number {
  switch (symbol) {
    case 'BTC:USD':
      return 45000000000; // $45 billion
    case 'ORDI:USD':
      return 120000000; // $120 million
    case 'RUNE:USD':
      return 85000000; // $85 million
    default:
      return 10000000; // $10 million
  }
}

/**
 * Get circulating supply for a symbol
 */
export function getCirculatingSupply(symbol: string): number {
  switch (symbol) {
    case 'BTC:USD':
      return 19460000; // 19.46 million BTC
    case 'ORDI:USD':
      return 21000000; // 21 million ORDI
    case 'RUNE:USD':
      return 20000000; // 20 million RUNE
    default:
      return 10000000;
  }
}
