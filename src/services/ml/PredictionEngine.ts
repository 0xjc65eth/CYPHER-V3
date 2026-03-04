/**
 * Machine Learning Prediction Engine for CYPHER ORDi Future V3
 * Advanced price prediction using multiple ML models and real-time data
 */

import { EventEmitter } from 'events';
import { EnhancedLogger } from '@/lib/enhanced-logger';
// Lazy load TensorFlow to avoid bundle bloat
let _tf: any = null;
async function getTf() {
  if (!_tf) {
    try { _tf = await import('@tensorflow/tfjs-node'); }
    catch { try { _tf = require('@tensorflow/tfjs'); } catch { _tf = null; } }
  }
  return _tf;
}

// ML Types
export interface MarketFeatures {
  timestamp: number;
  price: number;
  volume: number;
  volatility: number;
  rsi: number;
  macd: number;
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  sentiment: number;
  orderBookImbalance: number;
  networkActivity: number;
  socialMentions: number;
  fearGreedIndex: number;
  correlationBTC: number;
}

export interface PredictionResult {
  symbol: string;
  timestamp: number;
  currentPrice: number;
  predictions: {
    '1h': PricePrediction;
    '4h': PricePrediction;
    '24h': PricePrediction;
    '7d': PricePrediction;
    '30d': PricePrediction;
  };
  confidence: number;
  accuracy: number;
  modelUsed: string;
  features: MarketFeatures;
}

export interface PricePrediction {
  price: number;
  direction: 'up' | 'down' | 'neutral';
  probability: number;
  priceRange: {
    min: number;
    max: number;
  };
  volatilityPrediction: number;
  supportLevels: number[];
  resistanceLevels: number[];
}

export interface ModelConfig {
  name: string;
  type: 'lstm' | 'gru' | 'transformer' | 'random_forest' | 'svm' | 'ensemble';
  sequenceLength: number;
  features: string[];
  updateFrequency: number; // minutes
  hyperparameters: Record<string, any>;
}

export interface TrainingData {
  features: number[][];
  targets: number[];
  timestamps: number[];
  symbols: string[];
}

export class PredictionEngine extends EventEmitter {
  private models: Map<string, any> = new Map();
  private modelConfigs: Map<string, ModelConfig> = new Map();
  private featureScalers: Map<string, { mean: number[]; std: number[] }> = new Map();
  private trainingData: Map<string, TrainingData> = new Map();
  private predictionCache: Map<string, { prediction: PredictionResult; timestamp: number }> = new Map();
  private isTraining: boolean = false;

  // Pre-configured models
  private readonly MODEL_CONFIGS: ModelConfig[] = [
    {
      name: 'btc-lstm-primary',
      type: 'lstm',
      sequenceLength: 168, // 7 days of hourly data
      features: ['price', 'volume', 'volatility', 'rsi', 'macd', 'sentiment'],
      updateFrequency: 60,
      hyperparameters: {
        units: 128,
        dropout: 0.2,
        learningRate: 0.001,
        batchSize: 32,
        epochs: 100
      }
    },
    {
      name: 'eth-transformer',
      type: 'transformer',
      sequenceLength: 96, // 4 days of hourly data
      features: ['price', 'volume', 'volatility', 'rsi', 'macd', 'correlationBTC'],
      updateFrequency: 30,
      hyperparameters: {
        dModel: 64,
        numHeads: 8,
        numLayers: 4,
        dropout: 0.1,
        learningRate: 0.0005
      }
    },
    {
      name: 'multi-asset-ensemble',
      type: 'ensemble',
      sequenceLength: 72,
      features: ['price', 'volume', 'volatility', 'rsi', 'macd', 'sentiment', 'fearGreedIndex'],
      updateFrequency: 15,
      hyperparameters: {
        models: ['lstm', 'gru', 'transformer'],
        weights: [0.4, 0.3, 0.3],
        votingStrategy: 'weighted'
      }
    }
  ];

  constructor() {
    super();
    EnhancedLogger.info('ML Prediction Engine initialized', {
      component: 'PredictionEngine',
      modelsConfigured: this.MODEL_CONFIGS.length
    });
  }

  /**
   * Initialize ML models and load pre-trained weights
   */
  async initialize(): Promise<void> {
    try {
      // Initialize TensorFlow backend
      const tf = await getTf();
      await (tf as any).ready();

      // Load model configurations
      for (const config of this.MODEL_CONFIGS) {
        this.modelConfigs.set(config.name, config);
        
        // Create or load model
        const model = await this.createModel(config);
        this.models.set(config.name, model);
        
        // Initialize feature scaler
        this.initializeScaler(config.name);
      }

      // Load historical data for training
      await this.loadHistoricalData();

      // Start model update scheduler
      this.startModelUpdateScheduler();

      EnhancedLogger.info('ML Prediction Engine initialized successfully');
      this.emit('initialized');

    } catch (error) {
      EnhancedLogger.error('Failed to initialize ML Prediction Engine:', error);
      throw error;
    }
  }

  /**
   * Generate price predictions for a symbol
   */
  async predict(symbol: string, features: MarketFeatures): Promise<PredictionResult> {
    try {
      // Check cache first
      const cacheKey = `${symbol}-${Math.floor(Date.now() / 60000)}`;
      const cached = this.predictionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60000) {
        return cached.prediction;
      }

      // Select best model for symbol
      const modelName = this.selectBestModel(symbol);
      const model = this.models.get(modelName);
      const config = this.modelConfigs.get(modelName);

      if (!model || !config) {
        throw new Error(`Model ${modelName} not found`);
      }

      // Prepare features
      const normalizedFeatures = this.normalizeFeatures(features, modelName);
      const sequenceData = await this.prepareSequenceData(symbol, normalizedFeatures, config.sequenceLength);

      // Generate predictions for different timeframes
      const predictions = await this.generateMultiTimeframePredictions(
        model,
        sequenceData,
        symbol
      );

      // Calculate confidence and accuracy
      const confidence = this.calculateConfidence(predictions, symbol);
      const accuracy = await this.getModelAccuracy(modelName);

      const result: PredictionResult = {
        symbol,
        timestamp: Date.now(),
        currentPrice: features.price,
        predictions,
        confidence,
        accuracy,
        modelUsed: modelName,
        features
      };

      // Cache result
      this.predictionCache.set(cacheKey, { prediction: result, timestamp: Date.now() });

      EnhancedLogger.info('Prediction generated', {
        symbol,
        modelUsed: modelName,
        confidence,
        predictions: Object.keys(predictions)
      });

      this.emit('predictionGenerated', result);
      return result;

    } catch (error) {
      EnhancedLogger.error('Failed to generate prediction:', error);
      throw error;
    }
  }

  /**
   * Train or retrain a model with new data
   */
  async trainModel(modelName: string, newData?: TrainingData): Promise<void> {
    if (this.isTraining) {
      EnhancedLogger.warn('Training already in progress');
      return;
    }

    try {
      this.isTraining = true;
      EnhancedLogger.info('Starting model training', { modelName });

      const config = this.modelConfigs.get(modelName);
      const model = this.models.get(modelName);

      if (!config || !model) {
        throw new Error(`Model ${modelName} not found`);
      }

      // Prepare training data
      const trainingData = newData || this.trainingData.get(modelName);
      if (!trainingData) {
        throw new Error(`No training data available for ${modelName}`);
      }

      // Convert to tensors
      const tf = await getTf();
      const xTrain = tf.tensor3d(trainingData.features);
      const yTrain = tf.tensor2d(trainingData.targets, [trainingData.targets.length, 1]);

      // Configure training
      const optimizer = tf.train.adam(config.hyperparameters.learningRate);
      model.compile({
        optimizer,
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      // Train model
      const history = await model.fit(xTrain, yTrain, {
        epochs: config.hyperparameters.epochs,
        batchSize: config.hyperparameters.batchSize,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch: any, logs: any) => {
            if (epoch % 10 === 0) {
              EnhancedLogger.info('Training progress', {
                modelName,
                epoch,
                loss: logs?.loss,
                valLoss: logs?.val_loss
              });
            }
          }
        }
      });

      // Clean up tensors
      xTrain.dispose();
      yTrain.dispose();

      // Save model
      await this.saveModel(modelName, model);

      // Update accuracy metrics
      await this.updateModelAccuracy(modelName, history);

      EnhancedLogger.info('Model training completed', {
        modelName,
        finalLoss: history.history.loss[history.history.loss.length - 1]
      });

      this.emit('modelTrained', { modelName, history });

    } catch (error) {
      EnhancedLogger.error('Model training failed:', error);
      throw error;
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Update model with new market data
   */
  async updateWithMarketData(symbol: string, marketData: MarketFeatures[]): Promise<void> {
    try {
      // Convert market data to training format
      const trainingData = this.convertMarketDataToTraining(symbol, marketData);
      
      // Add to existing training data
      const existing = this.trainingData.get(symbol) || {
        features: [],
        targets: [],
        timestamps: [],
        symbols: []
      };

      existing.features.push(...trainingData.features);
      existing.targets.push(...trainingData.targets);
      existing.timestamps.push(...trainingData.timestamps);
      existing.symbols.push(...trainingData.symbols);

      // Keep only recent data (last 30 days)
      const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const validIndices = existing.timestamps
        .map((timestamp, index) => ({ timestamp, index }))
        .filter(item => item.timestamp > cutoffTime)
        .map(item => item.index);

      existing.features = validIndices.map(i => existing.features[i]);
      existing.targets = validIndices.map(i => existing.targets[i]);
      existing.timestamps = validIndices.map(i => existing.timestamps[i]);
      existing.symbols = validIndices.map(i => existing.symbols[i]);

      this.trainingData.set(symbol, existing);

      EnhancedLogger.info('Market data updated', {
        symbol,
        newDataPoints: marketData.length,
        totalDataPoints: existing.features.length
      });

    } catch (error) {
      EnhancedLogger.error('Failed to update market data:', error);
    }
  }

  /**
   * Get model performance metrics
   * FALLBACK: Returns zero-value metrics until real training data is available.
   * In production, calculate from actual prediction vs outcome comparisons.
   */
  async getModelMetrics(modelName: string): Promise<{
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    mse: number;
    mae: number;
    lastTrained: number;
    predictions: number;
  }> {
    return {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      mse: 0,
      mae: 0,
      lastTrained: 0,
      predictions: 0
    };
  }

  /**
   * Private methods
   */

  private async createModel(config: ModelConfig): Promise<any> {
    switch (config.type) {
      case 'lstm':
        return this.createLSTMModel(config);
      case 'gru':
        return this.createGRUModel(config);
      case 'transformer':
        return this.createTransformerModel(config);
      case 'ensemble':
        return this.createEnsembleModel(config);
      default:
        throw new Error(`Unsupported model type: ${config.type}`);
    }
  }

  private async createLSTMModel(config: ModelConfig): Promise<any> {
    const tf = await getTf();
    const model = tf.sequential();

    // Input layer
    model.add(tf.layers.lstm({
      units: config.hyperparameters.units,
      returnSequences: true,
      inputShape: [config.sequenceLength, config.features.length],
      dropout: config.hyperparameters.dropout
    }));

    // Hidden LSTM layers
    model.add(tf.layers.lstm({
      units: config.hyperparameters.units / 2,
      returnSequences: false,
      dropout: config.hyperparameters.dropout
    }));

    // Dense layers
    model.add(tf.layers.dense({ units: 50, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

    return model;
  }

  private async createGRUModel(config: ModelConfig): Promise<any> {
    const tf = await getTf();
    const model = tf.sequential();

    model.add(tf.layers.gru({
      units: config.hyperparameters.units || 128,
      returnSequences: true,
      inputShape: [config.sequenceLength, config.features.length],
      dropout: config.hyperparameters.dropout || 0.2
    }));

    model.add(tf.layers.gru({
      units: 64,
      returnSequences: false,
      dropout: 0.2
    }));

    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

    return model;
  }

  private async createTransformerModel(config: ModelConfig): Promise<any> {
    const tf = await getTf();
    // Simplified transformer implementation
    const model = tf.sequential();

    // Multi-head attention simulation with dense layers
    model.add(tf.layers.dense({
      units: config.hyperparameters.dModel || 64,
      inputShape: [config.sequenceLength, config.features.length],
      activation: 'relu'
    }));

    model.add(tf.layers.dense({
      units: config.hyperparameters.dModel || 64,
      activation: 'relu'
    }));

    model.add(tf.layers.globalAveragePooling1d());
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

    return model;
  }

  private async createEnsembleModel(config: ModelConfig): Promise<any> {
    // Simplified ensemble - in production would combine multiple models
    return this.createLSTMModel(config);
  }

  private normalizeFeatures(features: MarketFeatures, modelName: string): number[] {
    const scaler = this.featureScalers.get(modelName);
    if (!scaler) {
      throw new Error(`No scaler found for model ${modelName}`);
    }

    const featureArray = [
      features.price,
      features.volume,
      features.volatility,
      features.rsi,
      features.macd,
      features.sentiment
    ];

    return featureArray.map((value, index) => {
      return (value - scaler.mean[index]) / scaler.std[index];
    });
  }

  private async prepareSequenceData(
    symbol: string,
    features: number[],
    sequenceLength: number
  ): Promise<number[][]> {
    // Get historical features for sequence
    const historicalData = this.trainingData.get(symbol);
    if (!historicalData || historicalData.features.length < sequenceLength) {
      // If not enough historical data, pad with current features
      const sequence: number[][] = [];
      for (let i = 0; i < sequenceLength; i++) {
        sequence.push([...features]);
      }
      return sequence;
    }

    // Use last sequenceLength data points
    return historicalData.features.slice(-sequenceLength);
  }

  private async generateMultiTimeframePredictions(
    model: tf.LayersModel,
    sequenceData: number[][],
    symbol: string
  ): Promise<PredictionResult['predictions']> {
    const input = tf.tensor3d([sequenceData]);
    const prediction = model.predict(input) as tf.Tensor;
    const predictionValue = await prediction.data();

    // Clean up tensors
    input.dispose();
    prediction.dispose();

    const basePrediction = predictionValue[0];
    const currentPrice = sequenceData[sequenceData.length - 1][0]; // Assuming price is first feature

    // Generate predictions for different timeframes
    return {
      '1h': this.generateTimeframePrediction(currentPrice, basePrediction, 0.1),
      '4h': this.generateTimeframePrediction(currentPrice, basePrediction, 0.3),
      '24h': this.generateTimeframePrediction(currentPrice, basePrediction, 1.0),
      '7d': this.generateTimeframePrediction(currentPrice, basePrediction, 2.5),
      '30d': this.generateTimeframePrediction(currentPrice, basePrediction, 5.0)
    };
  }

  private generateTimeframePrediction(
    currentPrice: number,
    basePrediction: number,
    timeMultiplier: number
  ): PricePrediction {
    const predictedPrice = currentPrice * (1 + basePrediction * timeMultiplier);
    const direction = predictedPrice > currentPrice ? 'up' : 
                     predictedPrice < currentPrice ? 'down' : 'neutral';
    
    const volatility = Math.abs(basePrediction) * timeMultiplier * 0.5;
    
    return {
      price: predictedPrice,
      direction,
      probability: Math.min(0.95, 0.5 + Math.abs(basePrediction) * 2),
      priceRange: {
        min: predictedPrice * (1 - volatility),
        max: predictedPrice * (1 + volatility)
      },
      volatilityPrediction: volatility,
      supportLevels: [
        currentPrice * 0.95,
        currentPrice * 0.90,
        currentPrice * 0.85
      ],
      resistanceLevels: [
        currentPrice * 1.05,
        currentPrice * 1.10,
        currentPrice * 1.15
      ]
    };
  }

  private selectBestModel(symbol: string): string {
    // Simple model selection - in production would use more sophisticated logic
    if (symbol === 'BTC') return 'btc-lstm-primary';
    if (symbol === 'ETH') return 'eth-transformer';
    return 'multi-asset-ensemble';
  }

  private calculateConfidence(predictions: PredictionResult['predictions'], symbol: string): number {
    // Calculate confidence based on prediction consistency across timeframes
    const prices = Object.values(predictions).map(p => p.price);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
    
    // Lower variance = higher confidence
    return Math.max(0.1, Math.min(0.95, 1 - (variance / (avgPrice * avgPrice))));
  }

  private async getModelAccuracy(modelName: string): Promise<number> {
    // FALLBACK: Returns 0 until real prediction tracking is implemented.
    // In production, calculate from recent predictions vs actual outcomes.
    return 0;
  }

  private initializeScaler(modelName: string): void {
    // Initialize with default mean and std - would be calculated from training data
    this.featureScalers.set(modelName, {
      mean: [45000, 1000000, 0.02, 50, 0, 0.5], // Default values for BTC
      std: [5000, 500000, 0.01, 20, 100, 0.2]
    });
  }

  private async loadHistoricalData(): Promise<void> {
    // FALLBACK: No historical data loaded. In production, fetch from database
    // or market data API to populate training data for each symbol.
    // this.trainingData.set('BTC', realDataFromDB);
    EnhancedLogger.info('No historical training data loaded - awaiting real market data');
  }

  private convertMarketDataToTraining(symbol: string, marketData: MarketFeatures[]): TrainingData {
    const features: number[][] = [];
    const targets: number[] = [];
    const timestamps: number[] = [];
    const symbols: string[] = [];

    for (let i = 0; i < marketData.length - 1; i++) {
      const current = marketData[i];
      const next = marketData[i + 1];

      features.push([
        current.price,
        current.volume,
        current.volatility,
        current.rsi,
        current.macd,
        current.sentiment
      ]);

      // Target is the price change percentage
      targets.push((next.price - current.price) / current.price);
      timestamps.push(current.timestamp);
      symbols.push(symbol);
    }

    return { features, targets, timestamps, symbols };
  }

  private startModelUpdateScheduler(): void {
    // Update models periodically based on their configuration
    setInterval(() => {
      if (this.isTraining) return;

      for (const [modelName, config] of this.modelConfigs) {
        // Check if model needs updating
        const updateInterval = config.updateFrequency * 60 * 1000; // Convert to ms
        const lastUpdate = Date.now(); // Would track real last update time
        
        if (Date.now() - lastUpdate > updateInterval) {
          this.trainModel(modelName).catch(error => {
            EnhancedLogger.error(`Scheduled training failed for ${modelName}:`, error);
          });
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private async saveModel(modelName: string, model: tf.LayersModel): Promise<void> {
    try {
      await model.save(`file://./models/${modelName}`);
      EnhancedLogger.info('Model saved', { modelName });
    } catch (error) {
      EnhancedLogger.error('Failed to save model:', error);
    }
  }

  private async updateModelAccuracy(modelName: string, history: any): Promise<void> {
    // Update model accuracy metrics based on training history
    const finalLoss = history.history.loss[history.history.loss.length - 1];
    const accuracy = Math.max(0, 1 - finalLoss); // Simple accuracy calculation
    
    EnhancedLogger.info('Model accuracy updated', {
      modelName,
      accuracy,
      finalLoss
    });
  }
}

// Singleton instance
export const predictionEngine = new PredictionEngine();

// Export utility functions
export const MLUtils = {
  /**
   * Calculate technical indicators for ML features
   */
  calculateTechnicalIndicators(prices: number[], volumes: number[]): Partial<MarketFeatures> {
    const rsi = this.calculateRSI(prices, 14);
    const macd = this.calculateMACD(prices);
    const bollinger = this.calculateBollingerBands(prices, 20);
    const volatility = this.calculateVolatility(prices, 24);

    return {
      rsi,
      macd,
      bollinger,
      volatility
    };
  },

  calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;

    return 100 - (100 / (1 + rs));
  },

  calculateMACD(prices: number[]): number {
    if (prices.length < 26) return 0;

    const ema12 = this.calculateEMA(prices.slice(-12), 12);
    const ema26 = this.calculateEMA(prices.slice(-26), 26);

    return ema12 - ema26;
  },

  calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  },

  calculateBollingerBands(prices: number[], period: number = 20): MarketFeatures['bollinger'] {
    if (prices.length < period) {
      const price = prices[prices.length - 1] || 0;
      return { upper: price * 1.02, middle: price, lower: price * 0.98 };
    }

    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      upper: sma + (stdDev * 2),
      middle: sma,
      lower: sma - (stdDev * 2)
    };
  },

  calculateVolatility(prices: number[], period: number = 24): number {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < Math.min(prices.length, period + 1); i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;

    return Math.sqrt(variance * 365); // Annualized volatility
  },

  /**
   * Prepare market data for ML model input
   */
  prepareModelInput(marketData: MarketFeatures[], sequenceLength: number): number[][][] {
    const sequences: number[][][] = [];
    
    for (let i = sequenceLength; i < marketData.length; i++) {
      const sequence: number[][] = [];
      
      for (let j = i - sequenceLength; j < i; j++) {
        const data = marketData[j];
        sequence.push([
          data.price,
          data.volume,
          data.volatility,
          data.rsi,
          data.macd,
          data.sentiment || 0
        ]);
      }
      
      sequences.push(sequence);
    }
    
    return sequences;
  }
};