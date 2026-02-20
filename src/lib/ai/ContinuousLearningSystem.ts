/**
 * 🧠 CONTINUOUS LEARNING SYSTEM - CYPHER AI v3.0
 * Sistema de aprendizado contínuo e adaptativo
 */

import * as tf from '@tensorflow/tfjs-node';

export interface Experience {
  state: number[];
  action: number; // 0: hold, 1: buy, 2: sell
  reward: number;
  nextState: number[];
  done: boolean;
}

export interface TrainingBatch {
  states: tf.Tensor2D;
  actions: tf.Tensor1D;
  rewards: tf.Tensor1D;
  nextStates: tf.Tensor2D;
  dones: tf.Tensor1D;
}

export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  avgProfit: number;
  sharpeRatio: number;
  maxDrawdown: number;
  lastUpdated: Date;
}

export class ExperienceBuffer {
  private buffer: Experience[] = [];
  private maxSize: number;
  private pointer: number = 0;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  add(experience: Experience): void {
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(experience);
    } else {
      this.buffer[this.pointer] = experience;
      this.pointer = (this.pointer + 1) % this.maxSize;
    }
  }

  sample(batchSize: number): Experience[] {
    const indices = Array.from({ length: batchSize }, () => 
      Math.floor(Math.random() * this.buffer.length)
    );
    return indices.map(i => this.buffer[i]);
  }

  isFull(): boolean {
    return this.buffer.length >= this.maxSize;
  }

  size(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer = [];
    this.pointer = 0;
  }
}

export class PerformanceTracker {
  private metrics: PerformanceMetrics = {
    totalTrades: 0,
    winRate: 0,
    avgProfit: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    lastUpdated: new Date()
  };

  private trades: Array<{ profit: number; timestamp: Date }> = [];
  private equityCurve: number[] = [10000]; // Starting balance

  update(trade: { profit: number }): void {
    this.trades.push({ profit: trade.profit, timestamp: new Date() });
    this.metrics.totalTrades++;
    
    // Update equity curve
    const lastEquity = this.equityCurve[this.equityCurve.length - 1];
    this.equityCurve.push(lastEquity + trade.profit);
    
    // Calculate metrics
    this.calculateWinRate();
    this.calculateAvgProfit();
    this.calculateSharpeRatio();
    this.calculateMaxDrawdown();
    
    this.metrics.lastUpdated = new Date();
  }

  private calculateWinRate(): void {
    const winningTrades = this.trades.filter(t => t.profit > 0).length;
    this.metrics.winRate = this.trades.length > 0 
      ? winningTrades / this.trades.length 
      : 0;
  }

  private calculateAvgProfit(): void {
    const totalProfit = this.trades.reduce((sum, t) => sum + t.profit, 0);
    this.metrics.avgProfit = this.trades.length > 0 
      ? totalProfit / this.trades.length 
      : 0;
  }

  private calculateSharpeRatio(): void {
    if (this.trades.length < 2) {
      this.metrics.sharpeRatio = 0;
      return;
    }

    const returns = this.trades.map(t => t.profit / 10000); // Normalized returns
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    
    const variance = returns.reduce((sum, ret) => 
      sum + Math.pow(ret - avgReturn, 2), 0
    ) / returns.length;
    
    const stdDev = Math.sqrt(variance);
    
    // Annualized Sharpe (assuming 252 trading days)
    this.metrics.sharpeRatio = stdDev > 0 
      ? (avgReturn / stdDev) * Math.sqrt(252) 
      : 0;
  }

  private calculateMaxDrawdown(): void {
    let maxDrawdown = 0;
    let peak = this.equityCurve[0];
    
    for (const equity of this.equityCurve) {
      if (equity > peak) {
        peak = equity;
      }
      const drawdown = (peak - equity) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    this.metrics.maxDrawdown = maxDrawdown;
  }

  shouldAdjust(): boolean {
    // Ajustar se:
    // 1. Win rate < 45% após 50 trades
    // 2. Sharpe ratio < 0.5 após 100 trades
    // 3. Max drawdown > 20%
    
    if (this.metrics.totalTrades > 50 && this.metrics.winRate < 0.45) {
      return true;
    }
    
    if (this.metrics.totalTrades > 100 && this.metrics.sharpeRatio < 0.5) {
      return true;
    }
    
    if (this.metrics.maxDrawdown > 0.20) {
      return true;
    }
    
    return false;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
}

export class ContinuousLearningSystem {
  private model: tf.Sequential;
  private targetModel: tf.Sequential;
  private experienceReplay: ExperienceBuffer;
  private performanceMetrics: PerformanceTracker;
  private epsilon: number = 1.0; // Exploration rate
  private epsilonMin: number = 0.01;
  private epsilonDecay: number = 0.995;
  private learningRate: number = 0.001;
  private gamma: number = 0.95; // Discount factor
  private updateTargetEvery: number = 100;
  private trainSteps: number = 0;

  constructor(
    private stateSize: number = 15,
    private actionSize: number = 3,
    private modelArchitecture?: tf.Sequential
  ) {
    this.model = modelArchitecture || this.createModel();
    this.targetModel = this.createModel();
    this.experienceReplay = new ExperienceBuffer();
    this.performanceMetrics = new PerformanceTracker();
    
    // Copy weights to target model
    this.updateTargetModel();
  }

  private createModel(): tf.Sequential {
    const model = tf.sequential({
      layers: [
        // Input layer
        tf.layers.dense({
          inputShape: [this.stateSize],
          units: 256,
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        
        // Batch normalization
        tf.layers.batchNormalization(),
        
        // Hidden layers with dropout
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        
        // Output layer
        tf.layers.dense({
          units: this.actionSize,
          activation: 'linear'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(this.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mse']
    });

    return model;
  }

  async predict(state: number[]): Promise<number> {
    // Epsilon-greedy policy
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * this.actionSize);
    }

    const stateTensor = tf.tensor2d([state]);
    const prediction = this.model.predict(stateTensor) as tf.Tensor;
    const actionValues = await prediction.array() as number[][];
    
    stateTensor.dispose();
    prediction.dispose();
    
    // Return action with highest Q-value
    return actionValues[0].indexOf(Math.max(...actionValues[0]));
  }

  async learnFromTrade(trade: {
    marketState: number[];
    action: string;
    profit: number;
    exitMarketState: number[];
  }): Promise<void> {
    // Convert action string to number
    const actionMap: Record<string, number> = {
      'hold': 0,
      'buy': 1,
      'sell': 2
    };
    
    const action = actionMap[trade.action] || 0;
    
    // Calculate reward
    const reward = this.calculateReward(trade.profit);
    
    // Add to experience replay
    this.experienceReplay.add({
      state: trade.marketState,
      action,
      reward,
      nextState: trade.exitMarketState,
      done: true
    });
    
    // Update performance metrics
    this.performanceMetrics.update({ profit: trade.profit });
    
    // Train if buffer has enough experiences
    if (this.experienceReplay.size() >= 32) {
      await this.train(32);
    }
    
    // Adjust hyperparameters if needed
    if (this.performanceMetrics.shouldAdjust()) {
      await this.adjustHyperparameters();
    }
  }

  private calculateReward(profit: number): number {
    // Reward shaping to encourage good behavior
    let reward = profit; // Base reward is profit
    
    // Penalty for losses
    if (profit < 0) {
      reward *= 1.5; // Losses hurt more
    }
    
    // Bonus for significant profits
    if (profit > 100) {
      reward += 50; // Bonus for big wins
    }
    
    // Normalize reward
    return reward / 1000;
  }

  private async train(batchSize: number): Promise<void> {
    const batch = this.experienceReplay.sample(batchSize);
    
    // Prepare tensors
    const states = tf.tensor2d(batch.map(e => e.state));
    const nextStates = tf.tensor2d(batch.map(e => e.nextState));
    
    // Get current Q values
    const currentQs = this.model.predict(states) as tf.Tensor;
    
    // Get next Q values from target model
    const nextQs = this.targetModel.predict(nextStates) as tf.Tensor;
    const maxNextQs = nextQs.max(1);
    
    // Calculate target Q values
    const targetQsData = await currentQs.array() as number[][];
    const maxNextQsData = await maxNextQs.array() as number[];
    
    for (let i = 0; i < batch.length; i++) {
      const experience = batch[i];
      let target = experience.reward;
      
      if (!experience.done) {
        target = experience.reward + this.gamma * maxNextQsData[i];
      }
      
      targetQsData[i][experience.action] = target;
    }
    
    const targetQs = tf.tensor2d(targetQsData);
    
    // Train model
    await this.model.fit(states, targetQs, {
      epochs: 1,
      verbose: 0,
      callbacks: {
        onEpochEnd: () => {
          this.trainSteps++;
          
          // Update target model periodically
          if (this.trainSteps % this.updateTargetEvery === 0) {
            this.updateTargetModel();
          }
          
          // Decay epsilon
          if (this.epsilon > this.epsilonMin) {
            this.epsilon *= this.epsilonDecay;
          }
        }
      }
    });
    
    // Clean up tensors
    states.dispose();
    nextStates.dispose();
    currentQs.dispose();
    nextQs.dispose();
    maxNextQs.dispose();
    targetQs.dispose();
  }

  private updateTargetModel(): void {
    // Copy weights from main model to target model
    const weights = this.model.getWeights();
    this.targetModel.setWeights(weights);
  }

  private async adjustHyperparameters(): Promise<void> {
    const metrics = this.performanceMetrics.getMetrics();
    
    // Adjust learning rate based on performance
    if (metrics.winRate < 0.45) {
      this.learningRate *= 0.9; // Reduce learning rate
    } else if (metrics.winRate > 0.60) {
      this.learningRate *= 1.1; // Increase learning rate
    }
    
    // Adjust exploration rate
    if (metrics.sharpeRatio < 0.5) {
      this.epsilon = Math.min(this.epsilon * 1.2, 0.3); // More exploration
    }
    
    // Recompile model with new learning rate
    this.model.compile({
      optimizer: tf.train.adam(this.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mse']
    });
    
    console.log('Hyperparameters adjusted:', {
      learningRate: this.learningRate,
      epsilon: this.epsilon,
      metrics
    });
  }

  // Public methods

  async save(path: string = 'indexeddb://cypher-ai-continuous-learning'): Promise<void> {
    await this.model.save(path);
    
    // Save metadata
    const metadata = {
      epsilon: this.epsilon,
      learningRate: this.learningRate,
      trainSteps: this.trainSteps,
      metrics: this.performanceMetrics.getMetrics()
    };
    
    localStorage.setItem('cypher-ai-metadata', JSON.stringify(metadata));
  }

  async load(path: string = 'indexeddb://cypher-ai-continuous-learning'): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(path);
      this.updateTargetModel();
      
      // Load metadata
      const metadataStr = localStorage.getItem('cypher-ai-metadata');
      if (metadataStr) {
        const metadata = JSON.parse(metadataStr);
        this.epsilon = metadata.epsilon || this.epsilon;
        this.learningRate = metadata.learningRate || this.learningRate;
        this.trainSteps = metadata.trainSteps || 0;
      }
    } catch (error) {
      console.error('Failed to load model:', error);
    }
  }

  getMetrics(): PerformanceMetrics {
    return this.performanceMetrics.getMetrics();
  }

  getExplorationRate(): number {
    return this.epsilon;
  }

  getBufferSize(): number {
    return this.experienceReplay.size();
  }

  reset(): void {
    this.experienceReplay.clear();
    this.epsilon = 1.0;
    this.trainSteps = 0;
    this.performanceMetrics = new PerformanceTracker();
  }
}