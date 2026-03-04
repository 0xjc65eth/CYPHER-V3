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
    
    // Generate random features
    const features: Record<string, number> = {};
    
    // Price features
    const basePrice = getBasePrice(symbol);
    const randomFactor = 1 + (Math.random() * 0.4 - 0.2); // ±20%
    const price = basePrice * randomFactor;
    
    features.price_1d = price;
    features.price_3d = price * (1 + (Math.random() * 0.1 - 0.05));
    features.price_7d = price * (1 + (Math.random() * 0.2 - 0.1));
    features.price_14d = price * (1 + (Math.random() * 0.3 - 0.15));
    features.price_30d = price * (1 + (Math.random() * 0.4 - 0.2));
    
    // Volume features
    const baseVolume = getBaseVolume(symbol);
    features.volume_1d = baseVolume * (1 + (Math.random() * 0.6 - 0.3));
    features.volume_7d = baseVolume * (1 + (Math.random() * 0.4 - 0.2));
    
    // Technical indicators
    features.sma_20 = price * (1 + (Math.random() * 0.05 - 0.025));
    features.sma_50 = price * (1 + (Math.random() * 0.1 - 0.05));
    features.sma_200 = price * (1 + (Math.random() * 0.2 - 0.1));
    features.ema_12 = price * (1 + (Math.random() * 0.05 - 0.025));
    features.ema_26 = price * (1 + (Math.random() * 0.1 - 0.05));
    features.rsi_14 = 30 + Math.random() * 40; // 30-70 range
    features.macd = Math.random() * 200 - 100;
    features.macd_signal = Math.random() * 200 - 100;
    features.bollinger_upper = price * 1.05;
    features.bollinger_lower = price * 0.95;
    features.stochastic_k = Math.random() * 100;
    features.stochastic_d = Math.random() * 100;
    features.obv = Math.random() * 1000000;
    
    // Market features
    features.market_cap = price * getCirculatingSupply(symbol);
    features.btc_dominance = 40 + Math.random() * 20; // 40-60% range
    features.fear_greed_index = Math.floor(Math.random() * 100);
    
    // Price changes
    features.price_change_1d = Math.random() * 10 - 5; // ±5%
    features.price_change_7d = Math.random() * 20 - 10; // ±10%
    features.volume_change_1d = Math.random() * 30 - 15; // ±15%
    features.volume_change_7d = Math.random() * 40 - 20; // ±20%
    
    // Social and developer metrics
    features.social_sentiment = Math.random() * 2 - 1; // -1 to 1
    features.social_volume = Math.random() * 10000;
    features.news_sentiment = Math.random() * 2 - 1; // -1 to 1
    features.developer_activity = Math.random() * 100;
    features.github_stars = Math.random() * 1000;
    features.github_commits = Math.random() * 100;
    
    // Platform-specific sentiment
    features.twitter_sentiment = Math.random() * 2 - 1; // -1 to 1
    features.reddit_sentiment = Math.random() * 2 - 1; // -1 to 1
    features.discord_sentiment = Math.random() * 2 - 1; // -1 to 1
    features.telegram_sentiment = Math.random() * 2 - 1; // -1 to 1
    
    // Target values
    const futurePrice = price * (1 + (Math.random() * 0.2 - 0.1)); // ±10%
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
