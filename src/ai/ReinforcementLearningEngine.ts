/**
 * 🎮 REINFORCEMENT LEARNING ENGINE v3.0
 * Deep Q-Network (DQN) + Proximal Policy Optimization (PPO) Implementation
 * 
 * RESEARCH-BASED:
 * - DQN: "Human-level control through deep reinforcement learning" (Mnih et al., 2015)
 * - PPO: "Proximal Policy Optimization Algorithms" (Schulman et al., 2017)
 * - Rainbow DQN: "Rainbow: Combining Improvements in Deep Reinforcement Learning" (2018)
 * - A3C: "Asynchronous Methods for Deep Reinforcement Learning" (Mnih et al., 2016)
 */

import * as tf from '@tensorflow/tfjs-node';
import { EventEmitter } from 'events';

// Type-safe TensorFlow operations
const tfOps = tf as any;

// Environment and Action Spaces
export interface TradingEnvironment {
  state: TradingState;
  action: TradingAction;
  reward: number;
  done: boolean;
  info: { [key: string]: any };
}

export interface TradingState {
  // Price features (normalized)
  priceFeatures: number[]; // [open, high, low, close, volume] for last N periods
  returns: number[]; // Log returns
  volatility: number; // Rolling volatility
  
  // Technical indicators
  technicalIndicators: {
    rsi: number;
    macd: number;
    macdSignal: number;
    bbands: { upper: number; middle: number; lower: number };
    atr: number;
    adx: number;
    stochastic: { k: number; d: number };
  };
  
  // Market microstructure
  orderBook: {
    bidVolume: number;
    askVolume: number;
    spread: number;
    imbalance: number;
  };
  
  // Portfolio state
  portfolio: {
    position: number; // Current position size
    avgEntryPrice: number;
    unrealizedPnL: number;
    realizedPnL: number;
    drawdown: number;
    sharpeRatio: number;
  };
  
  // Market regime
  regime: {
    trend: number; // -1 to 1 (bearish to bullish)
    volatilityRegime: 'low' | 'medium' | 'high';
    liquidityLevel: number;
  };
}

export interface TradingAction {
  type: 'market' | 'limit' | 'stop';
  side: 'buy' | 'sell' | 'hold';
  size: number; // Position size as percentage of portfolio
  price?: number; // For limit orders
  stopLoss?: number;
  takeProfit?: number;
  confidence: number; // 0-1
}

export interface ReplayBuffer {
  states: any[];
  actions: number[];
  rewards: number[];
  nextStates: any[];
  dones: boolean[];
  capacity: number;
  size: number;
  pointer: number;
}

/**
 * 🧠 Deep Q-Network Implementation
 */
export class DQNAgent {
  private qNetwork: any;
  private targetNetwork: any;
  private optimizer: any;
  private replayBuffer: ReplayBuffer;
  
  private epsilon: number = 1.0; // Exploration rate
  private epsilonMin: number = 0.01;
  private epsilonDecay: number = 0.995;
  private gamma: number = 0.99; // Discount factor
  private learningRate: number = 0.001;
  private batchSize: number = 32;
  private updateTargetEvery: number = 1000;
  private steps: number = 0;
  
  // Double DQN
  private useDoubleDQN: boolean = true;
  
  // Prioritized Experience Replay
  private usePER: boolean = true;
  private priorities: number[] = [];
  private alpha: number = 0.6; // Prioritization exponent
  private beta: number = 0.4; // Importance sampling
  private betaIncrease: number = 0.001;
  
  constructor(
    stateSize: number,
    actionSize: number,
    config?: Partial<{
      epsilon: number;
      gamma: number;
      learningRate: number;
      batchSize: number;
      replayBufferSize: number;
    }>
  ) {
    this.epsilon = config?.epsilon || this.epsilon;
    this.gamma = config?.gamma || this.gamma;
    this.learningRate = config?.learningRate || this.learningRate;
    this.batchSize = config?.batchSize || this.batchSize;
    
    // Initialize networks
    this.qNetwork = this.buildNetwork(stateSize, actionSize);
    this.targetNetwork = this.buildNetwork(stateSize, actionSize);
    this.updateTargetNetwork();
    
    // Initialize optimizer
    this.optimizer = tf.train.adam(this.learningRate);
    
    // Initialize replay buffer
    this.replayBuffer = {
      states: [],
      actions: [],
      rewards: [],
      nextStates: [],
      dones: [],
      capacity: config?.replayBufferSize || 10000,
      size: 0,
      pointer: 0
    };
  }
  
  /**
   * Build neural network architecture
   */
  private buildNetwork(inputSize: number, outputSize: number): any {
    const model = tf.sequential({
      layers: [
        // Input layer
        tf.layers.dense({
          inputShape: [inputSize],
          units: 256,
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        
        // Batch normalization
        tf.layers.batchNormalization(),
        
        // Hidden layers with dropout
        tf.layers.dense({
          units: 256,
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        
        // Dueling DQN architecture
        // Value stream
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          name: 'value_hidden'
        }),
        
        // Output layer
        tf.layers.dense({
          units: outputSize,
          activation: 'linear',
          kernelInitializer: 'glorotUniform'
        })
      ]
    });
    
    model.compile({
      optimizer: this.optimizer,
      loss: 'meanSquaredError',
      metrics: ['mse']
    });
    
    return model;
  }
  
  /**
   * Select action using epsilon-greedy strategy
   */
  async selectAction(state: number[], training: boolean = true): Promise<number> {
    if (training && Math.random() < this.epsilon) {
      // Exploration: random action
      return Math.floor(Math.random() * 3); // 0: Hold, 1: Buy, 2: Sell
    }
    
    // Exploitation: use Q-network
    const stateTensor = tf.tensor([state]);
    const qValues = this.qNetwork.predict(stateTensor) as any;
    const action = qValues.argMax(1).dataSync()[0];
    
    stateTensor.dispose();
    qValues.dispose();
    
    return action;
  }
  
  /**
   * Store experience in replay buffer
   */
  remember(
    state: number[],
    action: number,
    reward: number,
    nextState: number[],
    done: boolean
  ): void {
    const idx = this.replayBuffer.pointer;
    
    // Convert to tensors
    const stateTensor = tf.tensor(state);
    const nextStateTensor = tf.tensor(nextState);
    
    // Store in buffer
    if (this.replayBuffer.size < this.replayBuffer.capacity) {
      this.replayBuffer.states.push(stateTensor);
      this.replayBuffer.actions.push(action);
      this.replayBuffer.rewards.push(reward);
      this.replayBuffer.nextStates.push(nextStateTensor);
      this.replayBuffer.dones.push(done);
      this.replayBuffer.size++;
      
      if (this.usePER) {
        this.priorities.push(1.0); // Max priority for new experiences
      }
    } else {
      // Replace old experience
      this.replayBuffer.states[idx].dispose();
      this.replayBuffer.nextStates[idx].dispose();
      
      this.replayBuffer.states[idx] = stateTensor;
      this.replayBuffer.actions[idx] = action;
      this.replayBuffer.rewards[idx] = reward;
      this.replayBuffer.nextStates[idx] = nextStateTensor;
      this.replayBuffer.dones[idx] = done;
      
      if (this.usePER) {
        this.priorities[idx] = 1.0;
      }
    }
    
    this.replayBuffer.pointer = (this.replayBuffer.pointer + 1) % this.replayBuffer.capacity;
  }
  
  /**
   * Train the Q-network
   */
  async train(): Promise<number> {
    if (this.replayBuffer.size < this.batchSize) {
      return 0;
    }
    
    // Sample batch
    const { indices, weights } = this.sampleBatch();
    
    // Prepare batch tensors
    const states: number[][] = [];
    const nextStates: number[][] = [];
    const actions: number[] = [];
    const rewards: number[] = [];
    const dones: boolean[] = [];
    
    for (const idx of indices) {
      states.push(await this.replayBuffer.states[idx].array() as number[]);
      nextStates.push(await this.replayBuffer.nextStates[idx].array() as number[]);
      actions.push(this.replayBuffer.actions[idx]);
      rewards.push(this.replayBuffer.rewards[idx]);
      dones.push(this.replayBuffer.dones[idx]);
    }
    
    // Convert to tensors
    const statesTensor = tf.tensor(states);
    const nextStatesTensor = tf.tensor(nextStates);
    const actionsTensor = tf.tensor(actions, [actions.length], 'int32');
    const rewardsTensor = tf.tensor(rewards);
    const donesTensor = tf.tensor(dones.map(d => d ? 0 : 1));
    const weightsTensor = tf.tensor(weights);
    
    // Calculate loss and update
    const loss = await this.optimizer.minimize(() => {
      // Current Q values
      const qValues = this.qNetwork.predict(statesTensor) as any;
      const currentQValues = qValues.gather(actionsTensor, 1);
      
      // Target Q values
      let targetQValues: any;
      
      if (this.useDoubleDQN) {
        // Double DQN: use online network to select action, target network to evaluate
        const nextQValues = this.qNetwork.predict(nextStatesTensor) as any;
        const nextActions = nextQValues.argMax(1);
        const targetNextQValues = this.targetNetwork.predict(nextStatesTensor) as any;
        const selectedQValues = targetNextQValues.gather(nextActions, 1);
        targetQValues = rewardsTensor.add(
          selectedQValues.mul(donesTensor).mul(this.gamma)
        );
      } else {
        // Standard DQN
        const nextQValues = this.targetNetwork.predict(nextStatesTensor) as any;
        const maxNextQValues = nextQValues.max(1);
        targetQValues = rewardsTensor.add(
          maxNextQValues.mul(donesTensor).mul(this.gamma)
        );
      }
      
      // Calculate TD error for PER
      const tdErrors = targetQValues.sub(currentQValues).abs();
      
      // Update priorities if using PER
      if (this.usePER) {
        const errors = tdErrors.dataSync();
        for (let i = 0; i < indices.length; i++) {
          this.priorities[indices[i]] = Math.pow(errors[i] + 0.01, this.alpha);
        }
      }
      
      // Weighted MSE loss
      const squaredError = targetQValues.sub(currentQValues).square();
      const weightedLoss = squaredError.mul(weightsTensor);
      
      return weightedLoss.mean();
    });
    
    // Cleanup tensors
    statesTensor.dispose();
    nextStatesTensor.dispose();
    actionsTensor.dispose();
    rewardsTensor.dispose();
    donesTensor.dispose();
    weightsTensor.dispose();
    
    // Update target network
    this.steps++;
    if (this.steps % this.updateTargetEvery === 0) {
      this.updateTargetNetwork();
    }
    
    // Decay epsilon
    if (this.epsilon > this.epsilonMin) {
      this.epsilon *= this.epsilonDecay;
    }
    
    // Increase beta for PER
    if (this.usePER && this.beta < 1.0) {
      this.beta = Math.min(1.0, this.beta + this.betaIncrease);
    }
    
    return (loss as any).dataSync()[0];
  }
  
  /**
   * Sample batch with prioritized experience replay
   */
  private sampleBatch(): { indices: number[]; weights: number[] } {
    const indices: number[] = [];
    const weights: number[] = [];
    
    if (this.usePER) {
      // Prioritized sampling
      const prioritySum = this.priorities.reduce((a, b) => a + b, 0);
      const segment = prioritySum / this.batchSize;
      
      for (let i = 0; i < this.batchSize; i++) {
        const a = segment * i;
        const b = segment * (i + 1);
        const cumsum = Math.random() * (b - a) + a;
        
        let sum = 0;
        for (let j = 0; j < this.replayBuffer.size; j++) {
          sum += this.priorities[j];
          if (sum >= cumsum) {
            indices.push(j);
            
            // Calculate importance sampling weight
            const prob = this.priorities[j] / prioritySum;
            const weight = Math.pow(this.replayBuffer.size * prob, -this.beta);
            weights.push(weight);
            break;
          }
        }
      }
      
      // Normalize weights
      const maxWeight = Math.max(...weights);
      for (let i = 0; i < weights.length; i++) {
        weights[i] /= maxWeight;
      }
    } else {
      // Uniform sampling
      for (let i = 0; i < this.batchSize; i++) {
        indices.push(Math.floor(Math.random() * this.replayBuffer.size));
        weights.push(1.0);
      }
    }
    
    return { indices, weights };
  }
  
  /**
   * Update target network weights
   */
  private updateTargetNetwork(): void {
    const weights = this.qNetwork.getWeights();
    this.targetNetwork.setWeights(weights);
  }
  
  /**
   * Save model
   */
  async save(path: string): Promise<void> {
    await this.qNetwork.save(path);
  }
  
  /**
   * Load model
   */
  async load(path: string): Promise<void> {
    this.qNetwork = await tf.loadLayersModel(path);
    this.updateTargetNetwork();
  }
}

/**
 * 🎯 Proximal Policy Optimization (PPO) Agent
 */
export class PPOAgent {
  private actor: any;
  private critic: any;
  private oldActor: any;
  
  private optimizer: any;
  private gamma: number = 0.99;
  private lambda: number = 0.95; // GAE lambda
  private clipRatio: number = 0.2;
  private learningRate: number = 0.0003;
  private epochs: number = 10;
  private miniBatchSize: number = 64;
  private entropyCoeff: number = 0.01;
  private valueCoeff: number = 0.5;
  
  // Buffer for trajectory collection
  private trajectoryBuffer: {
    states: any[];
    actions: number[];
    rewards: number[];
    values: number[];
    logProbs: number[];
    dones: boolean[];
  };
  
  constructor(
    stateSize: number,
    actionSize: number,
    config?: Partial<{
      gamma: number;
      lambda: number;
      clipRatio: number;
      learningRate: number;
    }>
  ) {
    this.gamma = config?.gamma || this.gamma;
    this.lambda = config?.lambda || this.lambda;
    this.clipRatio = config?.clipRatio || this.clipRatio;
    this.learningRate = config?.learningRate || this.learningRate;
    
    // Initialize networks
    this.actor = this.buildActorNetwork(stateSize, actionSize);
    this.critic = this.buildCriticNetwork(stateSize);
    this.oldActor = this.buildActorNetwork(stateSize, actionSize);
    this.updateOldPolicy();
    
    // Initialize optimizer
    this.optimizer = tf.train.adam(this.learningRate);
    
    // Initialize trajectory buffer
    this.trajectoryBuffer = {
      states: [],
      actions: [],
      rewards: [],
      values: [],
      logProbs: [],
      dones: []
    };
  }
  
  /**
   * Build actor network (policy)
   */
  private buildActorNetwork(inputSize: number, outputSize: number): any {
    const input = tfOps.input({ shape: [inputSize] });
    
    let x = tf.layers.dense({
      units: 256,
      activation: 'tanh',
      kernelInitializer: 'glorotUniform'
    }).apply(input) as any;
    
    x = tf.layers.dense({
      units: 256,
      activation: 'tanh',
      kernelInitializer: 'glorotUniform'
    }).apply(x) as any;
    
    // Output layer with softmax for action probabilities
    const output = tf.layers.dense({
      units: outputSize,
      activation: 'softmax',
      kernelInitializer: 'glorotUniform'
    }).apply(x) as any;

    const model = tfOps.model({ inputs: input, outputs: output });
    
    return model;
  }
  
  /**
   * Build critic network (value function)
   */
  private buildCriticNetwork(inputSize: number): any {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [inputSize],
          units: 256,
          activation: 'tanh',
          kernelInitializer: 'glorotUniform'
        }),
        tf.layers.dense({
          units: 256,
          activation: 'tanh',
          kernelInitializer: 'glorotUniform'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'linear',
          kernelInitializer: 'glorotUniform'
        })
      ]
    });
    
    return model;
  }
  
  /**
   * Select action from policy
   */
  async selectAction(state: number[]): Promise<{ action: number; logProb: number; value: number }> {
    const stateTensor = tf.tensor([state]);
    
    // Get action probabilities from actor
    const actionProbs = this.actor.predict(stateTensor) as any;
    const probs = await actionProbs.array() as number[][];
    
    // Sample action from probability distribution
    const action = this.sampleFromDistribution(probs[0]);
    
    // Calculate log probability
    const logProb = Math.log(probs[0][action] + 1e-8);
    
    // Get value estimate from critic
    const valueTensor = this.critic.predict(stateTensor) as any;
    const value = (await valueTensor.array() as number[][])[0][0];
    
    // Cleanup
    stateTensor.dispose();
    actionProbs.dispose();
    valueTensor.dispose();
    
    return { action, logProb, value };
  }
  
  /**
   * Store trajectory
   */
  storeTrajectory(
    state: number[],
    action: number,
    reward: number,
    value: number,
    logProb: number,
    done: boolean
  ): void {
    this.trajectoryBuffer.states.push(tf.tensor(state));
    this.trajectoryBuffer.actions.push(action);
    this.trajectoryBuffer.rewards.push(reward);
    this.trajectoryBuffer.values.push(value);
    this.trajectoryBuffer.logProbs.push(logProb);
    this.trajectoryBuffer.dones.push(done);
  }
  
  /**
   * Train PPO agent
   */
  async train(): Promise<{ policyLoss: number; valueLoss: number }> {
    if (this.trajectoryBuffer.states.length === 0) {
      return { policyLoss: 0, valueLoss: 0 };
    }
    
    // Calculate advantages using GAE
    const advantages = await this.calculateGAE();
    const returns = this.calculateReturns();
    
    // Convert trajectory to tensors
    const states = tfOps.stack(this.trajectoryBuffer.states);
    const actions = tf.tensor(this.trajectoryBuffer.actions, [this.trajectoryBuffer.actions.length], 'int32');
    const oldLogProbs = tf.tensor(this.trajectoryBuffer.logProbs);
    const advantagesTensor = tf.tensor(advantages);
    const returnsTensor = tf.tensor(returns);
    
    let totalPolicyLoss = 0;
    let totalValueLoss = 0;
    
    // PPO epochs
    for (let epoch = 0; epoch < this.epochs; epoch++) {
      // Generate mini-batches
      const indices = this.createShuffledIndices(this.trajectoryBuffer.states.length);
      
      for (let i = 0; i < indices.length; i += this.miniBatchSize) {
        const batchIndices = indices.slice(i, Math.min(i + this.miniBatchSize, indices.length));
        const batchSize = batchIndices.length;
        
        // Get batch data
        const batchStates = states.gather(batchIndices);
        const batchActions = actions.gather(batchIndices);
        const batchOldLogProbs = oldLogProbs.gather(batchIndices);
        const batchAdvantages = advantagesTensor.gather(batchIndices);
        const batchReturns = returnsTensor.gather(batchIndices);
        
        // Normalize advantages
        const advMean = batchAdvantages.mean();
        const advStd = tfOps.sqrt(tfOps.moments(batchAdvantages).variance).add(1e-8);
        const normalizedAdvantages = batchAdvantages.sub(advMean).div(advStd);
        
        // Calculate losses
        const losses = await this.optimizer.minimize(() => {
          // Actor loss (PPO-Clip)
          const actionProbs = this.actor.predict(batchStates) as any;
          const indices = tfOps.range(0, batchSize, 1, 'int32');
          const gatheredProbs = actionProbs.gather(batchActions, 1);
          const newLogProbs = tfOps.log(gatheredProbs.add(1e-8));

          const ratio = newLogProbs.sub(batchOldLogProbs).exp();
          const clippedRatio = tfOps.clipByValue(ratio, 1 - this.clipRatio, 1 + this.clipRatio);

          const policyLoss = tfOps.minimum(
              ratio.mul(normalizedAdvantages),
              clippedRatio.mul(normalizedAdvantages)
            ).mean().neg();

          // Entropy bonus
          const entropy = tfOps.sum(actionProbs.mul(tfOps.log(actionProbs.add(1e-8))), 1)
            .mean().neg();

          // Value loss
          const values = tfOps.squeeze(this.critic.predict(batchStates) as any);
          const valueLoss = batchReturns.sub(values).square().mean();
          
          // Total loss
          const totalLoss = policyLoss.add(valueLoss.mul(this.valueCoeff))
            .add(entropy.mul(-this.entropyCoeff));
          
          totalPolicyLoss += (policyLoss as any).dataSync()[0];
          totalValueLoss += (valueLoss as any).dataSync()[0];
          
          return totalLoss;
        });
        
        // Cleanup batch tensors
        batchStates.dispose();
        batchActions.dispose();
        batchOldLogProbs.dispose();
        batchAdvantages.dispose();
        batchReturns.dispose();
        advMean.dispose();
        advStd.dispose();
        normalizedAdvantages.dispose();
      }
    }
    
    // Update old policy
    this.updateOldPolicy();
    
    // Clear trajectory buffer
    this.clearTrajectory();
    
    // Cleanup
    states.dispose();
    actions.dispose();
    oldLogProbs.dispose();
    advantagesTensor.dispose();
    returnsTensor.dispose();
    
    return {
      policyLoss: totalPolicyLoss / (this.epochs * Math.ceil(this.trajectoryBuffer.states.length / this.miniBatchSize)),
      valueLoss: totalValueLoss / (this.epochs * Math.ceil(this.trajectoryBuffer.states.length / this.miniBatchSize))
    };
  }
  
  /**
   * Calculate Generalized Advantage Estimation (GAE)
   */
  private async calculateGAE(): Promise<number[]> {
    const advantages: number[] = [];
    let lastAdvantage = 0;
    
    // Get final value estimate
    const lastState = this.trajectoryBuffer.states[this.trajectoryBuffer.states.length - 1];
    const lastValueTensor = this.critic.predict(tfOps.expandDims(lastState, 0)) as any;
    const lastValue = (await lastValueTensor.array() as number[][])[0][0];
    lastValueTensor.dispose();
    
    // Calculate advantages backwards
    for (let t = this.trajectoryBuffer.rewards.length - 1; t >= 0; t--) {
      const nextValue = t === this.trajectoryBuffer.rewards.length - 1 ? lastValue : this.trajectoryBuffer.values[t + 1];
      const done = this.trajectoryBuffer.dones[t];
      
      const delta = this.trajectoryBuffer.rewards[t] + 
                   (done ? 0 : this.gamma * nextValue) - 
                   this.trajectoryBuffer.values[t];
      
      lastAdvantage = delta + (done ? 0 : this.gamma * this.lambda * lastAdvantage);
      advantages.unshift(lastAdvantage);
    }
    
    return advantages;
  }
  
  /**
   * Calculate discounted returns
   */
  private calculateReturns(): number[] {
    const returns: number[] = [];
    let discountedReturn = 0;
    
    for (let t = this.trajectoryBuffer.rewards.length - 1; t >= 0; t--) {
      discountedReturn = this.trajectoryBuffer.rewards[t] + 
                        (this.trajectoryBuffer.dones[t] ? 0 : this.gamma * discountedReturn);
      returns.unshift(discountedReturn);
    }
    
    return returns;
  }
  
  /**
   * Create shuffled indices array
   */
  private createShuffledIndices(length: number): number[] {
    const indices = Array.from({ length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }

  /**
   * Sample from probability distribution
   */
  private sampleFromDistribution(probs: number[]): number {
    const cumsum = probs.reduce((acc, val, i) => {
      acc.push((acc[i - 1] || 0) + val);
      return acc;
    }, [] as number[]);
    
    const random = Math.random();
    for (let i = 0; i < cumsum.length; i++) {
      if (random < cumsum[i]) {
        return i;
      }
    }
    
    return probs.length - 1;
  }
  
  /**
   * Update old policy network
   */
  private updateOldPolicy(): void {
    const weights = this.actor.getWeights();
    this.oldActor.setWeights(weights);
  }
  
  /**
   * Clear trajectory buffer
   */
  private clearTrajectory(): void {
    // Dispose tensors
    this.trajectoryBuffer.states.forEach(tensor => tensor.dispose());
    
    // Reset buffer
    this.trajectoryBuffer = {
      states: [],
      actions: [],
      rewards: [],
      values: [],
      logProbs: [],
      dones: []
    };
  }
}

/**
 * 🎮 Reinforcement Learning Trading Engine
 */
export class ReinforcementLearningEngine extends EventEmitter {
  private dqnAgent: DQNAgent;
  private ppoAgent: PPOAgent;
  private currentAgent: 'dqn' | 'ppo';
  
  private stateProcessor: StateProcessor;
  private rewardCalculator: RewardCalculator;
  private actionMapper: ActionMapper;
  
  private trainingMode: boolean = false;
  private episodeCount: number = 0;
  private stepCount: number = 0;
  private episodeRewards: number[] = [];
  
  constructor(config: {
    stateSize: number;
    actionSize: number;
    agent?: 'dqn' | 'ppo' | 'both';
    rewardFunction?: 'sharpe' | 'profit' | 'risk-adjusted';
  }) {
    super();
    
    // Initialize agents
    this.dqnAgent = new DQNAgent(config.stateSize, config.actionSize);
    this.ppoAgent = new PPOAgent(config.stateSize, config.actionSize);
    this.currentAgent = config.agent === 'ppo' ? 'ppo' : 'dqn';
    
    // Initialize components
    this.stateProcessor = new StateProcessor();
    this.rewardCalculator = new RewardCalculator(config.rewardFunction || 'risk-adjusted');
    this.actionMapper = new ActionMapper();
    
    this.emit('engine_initialized', { agent: this.currentAgent });
  }
  
  /**
   * Process market data and select trading action
   */
  async selectAction(marketData: TradingState): Promise<TradingAction> {
    try {
      // Process state
      const processedState = this.stateProcessor.process(marketData);
      
      // Select action based on current agent
      let actionIndex: number;
      let confidence: number;
      
      if (this.currentAgent === 'dqn') {
        actionIndex = await this.dqnAgent.selectAction(processedState, this.trainingMode);
        confidence = 0.8; // Simplified confidence
      } else {
        const result = await this.ppoAgent.selectAction(processedState);
        actionIndex = result.action;
        confidence = Math.exp(result.logProb); // Convert log prob to confidence
      }
      
      // Map to trading action
      const action = this.actionMapper.mapToTradingAction(actionIndex, marketData, confidence);
      
      this.emit('action_selected', {
        agent: this.currentAgent,
        action,
        state: marketData,
        confidence
      });
      
      return action;
      
    } catch (error) {
      this.emit('action_error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
  
  /**
   * Train agents with experience
   */
  async train(
    experience: {
      state: TradingState;
      action: TradingAction;
      reward: number;
      nextState: TradingState;
      done: boolean;
    }
  ): Promise<void> {
    if (!this.trainingMode) return;
    
    try {
      // Process states
      const state = this.stateProcessor.process(experience.state);
      const nextState = this.stateProcessor.process(experience.nextState);
      const actionIndex = this.actionMapper.actionToIndex(experience.action);
      
      // Store experience and train
      if (this.currentAgent === 'dqn') {
        this.dqnAgent.remember(state, actionIndex, experience.reward, nextState, experience.done);
        const loss = await this.dqnAgent.train();
        
        this.emit('training_step', {
          agent: 'dqn',
          loss,
          step: this.stepCount
        });
      } else {
        // PPO stores trajectory
        const { value, logProb } = await this.ppoAgent.selectAction(state);
        this.ppoAgent.storeTrajectory(
          state,
          actionIndex,
          experience.reward,
          value,
          logProb,
          experience.done
        );
        
        // Train at episode end
        if (experience.done) {
          const { policyLoss, valueLoss } = await this.ppoAgent.train();
          
          this.emit('training_step', {
            agent: 'ppo',
            policyLoss,
            valueLoss,
            episode: this.episodeCount
          });
        }
      }
      
      // Update counters
      this.stepCount++;
      if (experience.done) {
        this.episodeCount++;
        this.episodeRewards.push(experience.reward);
        
        this.emit('episode_complete', {
          episode: this.episodeCount,
          totalReward: this.episodeRewards[this.episodeRewards.length - 1],
          avgReward: this.episodeRewards.slice(-100).reduce((a, b) => a + b, 0) / 
                    Math.min(100, this.episodeRewards.length)
        });
      }
      
    } catch (error) {
      this.emit('training_error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
  
  /**
   * Switch between agents
   */
  switchAgent(agent: 'dqn' | 'ppo'): void {
    this.currentAgent = agent;
    this.emit('agent_switched', { agent });
  }
  
  /**
   * Enable/disable training mode
   */
  setTrainingMode(enabled: boolean): void {
    this.trainingMode = enabled;
    this.emit('training_mode_changed', { enabled });
  }
  
  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): {
    episodeCount: number;
    stepCount: number;
    avgReward: number;
    maxReward: number;
    minReward: number;
    winRate: number;
  } {
    const rewards = this.episodeRewards.slice(-100);
    
    return {
      episodeCount: this.episodeCount,
      stepCount: this.stepCount,
      avgReward: rewards.length > 0 ? rewards.reduce((a, b) => a + b, 0) / rewards.length : 0,
      maxReward: rewards.length > 0 ? Math.max(...rewards) : 0,
      minReward: rewards.length > 0 ? Math.min(...rewards) : 0,
      winRate: rewards.length > 0 ? rewards.filter(r => r > 0).length / rewards.length : 0
    };
  }
  
  /**
   * Save models
   */
  async saveModels(path: string): Promise<void> {
    await this.dqnAgent.save(`${path}/dqn`);
    // PPO save would be implemented similarly
    this.emit('models_saved', { path });
  }
  
  /**
   * Load models
   */
  async loadModels(path: string): Promise<void> {
    await this.dqnAgent.load(`${path}/dqn`);
    // PPO load would be implemented similarly
    this.emit('models_loaded', { path });
  }
}

/**
 * 🔧 State Processor
 */
class StateProcessor {
  private normalizers: Map<string, { mean: number; std: number }> = new Map();
  
  process(state: TradingState): number[] {
    const features: number[] = [];
    
    // Price features
    features.push(...this.normalizePriceFeatures(state.priceFeatures));
    features.push(...this.normalizeReturns(state.returns));
    features.push(this.normalizeValue(state.volatility, 'volatility'));
    
    // Technical indicators
    features.push(this.normalizeValue(state.technicalIndicators.rsi, 'rsi', 0, 100));
    features.push(this.normalizeValue(state.technicalIndicators.macd, 'macd'));
    features.push(this.normalizeValue(state.technicalIndicators.macdSignal, 'macdSignal'));
    features.push(this.normalizeValue(state.technicalIndicators.adx, 'adx', 0, 100));
    features.push(this.normalizeValue(state.technicalIndicators.atr, 'atr'));
    
    // Order book features
    features.push(this.normalizeValue(state.orderBook.imbalance, 'imbalance', -1, 1));
    features.push(this.normalizeValue(state.orderBook.spread, 'spread'));
    
    // Portfolio features
    features.push(this.normalizeValue(state.portfolio.position, 'position', -1, 1));
    features.push(this.normalizeValue(state.portfolio.unrealizedPnL, 'unrealizedPnL'));
    features.push(this.normalizeValue(state.portfolio.drawdown, 'drawdown', -1, 0));
    
    // Market regime
    features.push(state.regime.trend);
    features.push(state.regime.volatilityRegime === 'low' ? -1 : 
                  state.regime.volatilityRegime === 'medium' ? 0 : 1);
    features.push(this.normalizeValue(state.regime.liquidityLevel, 'liquidity', 0, 1));
    
    return features;
  }
  
  private normalizePriceFeatures(prices: number[]): number[] {
    // Use log returns for better stationarity
    const logPrices = prices.map(p => Math.log(p));
    const normalized: number[] = [];
    
    for (let i = 1; i < logPrices.length; i++) {
      normalized.push(logPrices[i] - logPrices[i - 1]);
    }
    
    return normalized;
  }
  
  private normalizeReturns(returns: number[]): number[] {
    // Clip extreme values and normalize
    return returns.map(r => Math.max(-0.1, Math.min(0.1, r)) * 10);
  }
  
  private normalizeValue(
    value: number,
    key: string,
    minVal?: number,
    maxVal?: number
  ): number {
    if (minVal !== undefined && maxVal !== undefined) {
      // Min-max normalization
      return (value - minVal) / (maxVal - minVal) * 2 - 1;
    }
    
    // Z-score normalization
    if (!this.normalizers.has(key)) {
      this.normalizers.set(key, { mean: value, std: 0.1 });
    }
    
    const normalizer = this.normalizers.get(key)!;
    normalizer.mean = normalizer.mean * 0.99 + value * 0.01; // Exponential moving average
    normalizer.std = Math.sqrt(normalizer.std * normalizer.std * 0.99 + 
                               Math.pow(value - normalizer.mean, 2) * 0.01);
    
    return (value - normalizer.mean) / (normalizer.std + 1e-8);
  }
}

/**
 * 💰 Reward Calculator
 */
class RewardCalculator {
  private rewardFunction: string;
  private returnHistory: number[] = [];
  
  constructor(rewardFunction: string) {
    this.rewardFunction = rewardFunction;
  }
  
  calculate(
    previousState: TradingState,
    action: TradingAction,
    currentState: TradingState
  ): number {
    switch (this.rewardFunction) {
      case 'profit':
        return this.profitReward(previousState, currentState);
        
      case 'sharpe':
        return this.sharpeReward(previousState, currentState);
        
      case 'risk-adjusted':
      default:
        return this.riskAdjustedReward(previousState, action, currentState);
    }
  }
  
  private profitReward(previousState: TradingState, currentState: TradingState): number {
    const pnlChange = currentState.portfolio.unrealizedPnL - previousState.portfolio.unrealizedPnL;
    return pnlChange;
  }
  
  private sharpeReward(previousState: TradingState, currentState: TradingState): number {
    const returns = currentState.portfolio.unrealizedPnL - previousState.portfolio.unrealizedPnL;
    this.returnHistory.push(returns);
    
    if (this.returnHistory.length < 20) {
      return returns; // Not enough data for Sharpe
    }
    
    // Keep only recent history
    if (this.returnHistory.length > 100) {
      this.returnHistory.shift();
    }
    
    // Calculate Sharpe ratio
    const mean = this.returnHistory.reduce((a, b) => a + b, 0) / this.returnHistory.length;
    const variance = this.returnHistory.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / 
                     this.returnHistory.length;
    const sharpe = mean / (Math.sqrt(variance) + 1e-8);
    
    return sharpe * 0.1; // Scale down
  }
  
  private riskAdjustedReward(
    previousState: TradingState,
    action: TradingAction,
    currentState: TradingState
  ): number {
    let reward = 0;
    
    // Profit component
    const pnlChange = currentState.portfolio.unrealizedPnL - previousState.portfolio.unrealizedPnL;
    reward += pnlChange;
    
    // Risk penalty
    const riskPenalty = Math.abs(currentState.portfolio.position) * currentState.volatility * 0.1;
    reward -= riskPenalty;
    
    // Drawdown penalty
    if (currentState.portfolio.drawdown < previousState.portfolio.drawdown) {
      reward += (currentState.portfolio.drawdown - previousState.portfolio.drawdown) * 2;
    }
    
    // Transaction cost
    if (action.side !== 'hold') {
      reward -= 0.001; // 0.1% transaction cost
    }
    
    // Encourage profitable trades
    if (action.side === 'sell' && currentState.portfolio.position < previousState.portfolio.position) {
      if (pnlChange > 0) {
        reward += 0.01; // Bonus for profitable exit
      }
    }
    
    return reward;
  }
}

/**
 * 🎯 Action Mapper
 */
class ActionMapper {
  private actionSpace = ['hold', 'buy', 'sell'];
  
  mapToTradingAction(
    actionIndex: number,
    state: TradingState,
    confidence: number
  ): TradingAction {
    const action = this.actionSpace[actionIndex];
    
    // Calculate position size based on confidence and risk
    const maxPositionSize = 0.1; // 10% of portfolio
    const riskAdjustedSize = maxPositionSize * confidence * (1 - state.volatility);
    const positionSize = Math.max(0.01, Math.min(maxPositionSize, riskAdjustedSize));
    
    // Calculate stop loss and take profit
    const atr = state.technicalIndicators.atr;
    const stopLossDistance = atr * 2;
    const takeProfitDistance = atr * 3;
    
    return {
      type: 'market',
      side: action as 'buy' | 'sell' | 'hold',
      size: positionSize,
      stopLoss: action === 'buy' ? 
        state.priceFeatures[state.priceFeatures.length - 1] - stopLossDistance :
        state.priceFeatures[state.priceFeatures.length - 1] + stopLossDistance,
      takeProfit: action === 'buy' ?
        state.priceFeatures[state.priceFeatures.length - 1] + takeProfitDistance :
        state.priceFeatures[state.priceFeatures.length - 1] - takeProfitDistance,
      confidence
    };
  }
  
  actionToIndex(action: TradingAction): number {
    return this.actionSpace.indexOf(action.side);
  }
}

export default ReinforcementLearningEngine;