/**
 * CYPHER AI Trading Agent - Core Types
 * Non-custodial autonomous trading agent
 */

// ============================================================================
// Agent Configuration
// ============================================================================

export interface AgentConfig {
  enabled: boolean;
  mode: 'manual' | 'delegated'; // manual = approve each trade, delegated = autonomous
  /** Per-user opt-in for autonomous trade execution (set by wizard Step 5).
   *  When true, consensus-approved trades execute automatically.
   *  When false or undefined, trades are logged but NOT executed. */
  enableTrading?: boolean;
  capitalAllocation: {
    total: number; // USD
    lp: number; // percentage (0-1)
    mm: number; // percentage (0-1)
    scalp: number; // percentage (0-1)
  };
  riskLimits: RiskLimits;
  autoCompound: AutoCompoundConfig;
  markets: MarketConfig[];
  notifications: NotificationConfig;
}

export interface RiskLimits {
  maxPositionSize: number; // USD
  maxLeverage: number;
  maxDailyDrawdown: number; // percentage (0-1)
  maxTotalDrawdown: number; // percentage (0-1)
  emergencyStopLoss: number; // percentage (0-1)
  pauseOnDrawdown: number; // percentage threshold to pause
  closeAllOnDrawdown: number; // percentage threshold to close all
  shutdownOnDrawdown: number; // percentage threshold to shutdown
}

export interface AutoCompoundConfig {
  enabled: boolean;
  intervalMs: number;
  minAmountUSD: number;
  distribution: {
    lp: number;
    mm: number;
    scalp: number;
  };
  gasOptimization: boolean;
  maxGasCostPercent: number;
}

export type ExchangeType = 'hyperliquid' | 'jupiter' | 'raydium' | 'uniswap' | 'ccxt';
export type ChainType = 'evm' | 'solana' | 'bitcoin' | 'hyperliquid' | 'tradfi';
export type AssetClass = 'crypto' | 'forex' | 'stock' | 'commodity';

export interface MarketConfig {
  pair: string;
  exchange: ExchangeType | string;
  type: 'perp' | 'spot' | 'lp';
  enabled: boolean;
  chain?: ChainType;
  assetClass?: AssetClass;
  maxPositionUSD?: number;
}

export interface SessionKeyConfig {
  id: string;
  chain: ChainType;
  expiresAt: number;
  spendLimitUSD: number;
  spentUSD: number;
  allowedContracts?: string[];
  allowedPairs?: string[];
  isActive: boolean;
}

export interface ConsensusVote {
  agent: string;
  direction: 'long' | 'short' | 'neutral' | 'abstain';
  confidence: number;
  positionSize?: number;
  reasoning: string;
  timestamp: number;
}

export interface ConsensusResult {
  approved: boolean;
  direction: 'long' | 'short';
  confidence: number;
  positionSize: number;
  votes: ConsensusVote[];
  reasoning: string;
  timestamp: number;
}

export interface NotificationConfig {
  telegram: { enabled: boolean; chatId?: string; botToken?: string };
  email: { enabled: boolean; address?: string };
  discord: { enabled: boolean; webhookUrl?: string };
  events: ('trade_executed' | 'tp_sl_hit' | 'error' | 'compound' | 'rebalance')[];
}

// ============================================================================
// Trading Types
// ============================================================================

export interface TradeSignal {
  id: string;
  direction: 'long' | 'short';
  pair: string;
  exchange: string;
  entry: number;
  stopLoss: number;
  takeProfit: number[];
  confidence: number; // 0-1
  positionSize: number; // USD
  leverage: number;
  strategy: 'scalp' | 'mm' | 'lp';
  reason: string;
  timestamp: number;
  smcContext?: SMCContext;
}

export interface Position {
  id: string;
  pair: string;
  exchange: string;
  direction: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  size: number;
  leverage: number;
  marginUsed: number;
  unrealizedPnl: number;
  realizedPnl: number;
  stopLoss: number;
  takeProfit: number[];
  strategy: 'scalp' | 'mm' | 'lp';
  openedAt: number;
  lastUpdated: number;
}

export interface LPPosition {
  id: string;
  pair: string;
  protocol: 'uniswap-v4' | 'raydium' | 'orca';
  tickLower: number;
  tickUpper: number;
  liquidity: number;
  token0Amount: number;
  token1Amount: number;
  feeTier: number;
  unclaimedFees: { token0: number; token1: number };
  valueUSD: number;
  impermanentLoss: number;
  inRange: boolean;
  createdAt: number;
  lastRebalance: number;
}

export interface Order {
  id: string;
  pair: string;
  exchange: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market' | 'stop';
  price: number;
  size: number;
  filled: number;
  status: 'pending' | 'open' | 'filled' | 'cancelled' | 'expired';
  clientId: string;
  createdAt: number;
}

// ============================================================================
// Smart Money Concepts (SMC)
// ============================================================================

export interface SMCContext {
  structureDirection: 'bullish' | 'bearish' | 'neutral';
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  liquidityGrabs: LiquidityGrab[];
  breakOfStructure: BreakOfStructure | null;
}

export interface OrderBlock {
  type: 'bullish' | 'bearish';
  high: number;
  low: number;
  strength: number;
  timestamp: number;
  mitigated: boolean;
}

export interface FairValueGap {
  type: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  midpoint: number;
  filled: boolean;
}

export interface LiquidityGrab {
  type: 'bullish_grab' | 'bearish_grab';
  grabLevel: number;
  recoveryPrice: number;
  strength: number;
  timestamp: number;
}

export interface BreakOfStructure {
  type: 'bullish' | 'bearish';
  brokenLevel: number;
  timestamp: number;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================================================
// Performance & PnL
// ============================================================================

export interface AgentPerformance {
  totalPnl: number;
  totalPnlPercent: number;
  todayPnl: number;
  todayPnlPercent: number;
  weekPnl: number;
  weekPnlPercent: number;
  monthPnl: number;
  monthPnlPercent: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  sharpeRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  uptime: number; // ms
  startedAt: number;
}

export interface CompoundResult {
  skipped: boolean;
  reason?: string;
  pending?: number;
  totalCompounded?: number;
  breakdown?: { lpFees: number; mmProfits: number; scalpPnl: number };
  distribution?: { lpAlloc: number; mmAlloc: number; scalpAlloc: number };
  gasCost?: number;
  timestamp: number;
}

// ============================================================================
// Wallet & Connection
// ============================================================================

export interface AgentWallet {
  type: 'hyperliquid' | 'solana' | 'evm';
  name: string;
  apiKey?: string;
  apiSecret?: string;
  address?: string;
  permissions: string[];
  connected: boolean;
  lastActivity: number;
}

export interface WalletSetupStep {
  step: number;
  title: string;
  description: string;
  completed: boolean;
  data?: Record<string, any>;
}

// ============================================================================
// Agent State
// ============================================================================

export type AgentStatus = 'off' | 'configuring' | 'active' | 'paused' | 'error' | 'emergency_stop';

export interface AgentState {
  status: AgentStatus;
  config: AgentConfig;
  wallets: AgentWallet[];
  positions: Position[];
  lpPositions: LPPosition[];
  openOrders: Order[];
  performance: AgentPerformance;
  lastCompound: CompoundResult | null;
  recentTrades: TradeSignal[];
  errors: Array<{ message: string; timestamp: number; source: string }>;
  startedAt: number | null;
  uptime: number;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  enabled: true,
  mode: 'delegated',
  enableTrading: true,
  capitalAllocation: {
    total: 5000,
    lp: 0.50,
    mm: 0.25,
    scalp: 0.25,
  },
  riskLimits: {
    maxPositionSize: 250,
    maxLeverage: 5,
    maxDailyDrawdown: 0.03,
    maxTotalDrawdown: 0.10,
    emergencyStopLoss: 0.30,
    pauseOnDrawdown: 0.10,
    closeAllOnDrawdown: 0.20,
    shutdownOnDrawdown: 0.30,
  },
  autoCompound: {
    enabled: true,
    intervalMs: 4 * 60 * 60 * 1000, // 4 hours
    minAmountUSD: 10,
    distribution: { lp: 0.50, mm: 0.25, scalp: 0.25 },
    gasOptimization: true,
    maxGasCostPercent: 0.02,
  },
  markets: [
    // Crypto Perps (Hyperliquid - no KYC)
    { pair: 'BTC-PERP', exchange: 'hyperliquid', type: 'perp', enabled: true, chain: 'hyperliquid', assetClass: 'crypto' },
    { pair: 'ETH-PERP', exchange: 'hyperliquid', type: 'perp', enabled: true, chain: 'hyperliquid', assetClass: 'crypto' },
    { pair: 'SOL-PERP', exchange: 'hyperliquid', type: 'perp', enabled: true, chain: 'hyperliquid', assetClass: 'crypto' },
    { pair: 'ARB-PERP', exchange: 'hyperliquid', type: 'perp', enabled: false, chain: 'hyperliquid', assetClass: 'crypto' },
    // Crypto LP (Solana + EVM - no KYC)
    { pair: 'SOL/USDC', exchange: 'jupiter', type: 'lp', enabled: true, chain: 'solana', assetClass: 'crypto' },
    { pair: 'ETH/USDC', exchange: 'uniswap', type: 'lp', enabled: true, chain: 'evm', assetClass: 'crypto' },
    // Synthetic Stock Perps (Hyperliquid - no KYC, 24/7)
    { pair: 'AAPL-PERP', exchange: 'hyperliquid', type: 'perp', enabled: false, chain: 'hyperliquid', assetClass: 'stock' },
    { pair: 'TSLA-PERP', exchange: 'hyperliquid', type: 'perp', enabled: false, chain: 'hyperliquid', assetClass: 'stock' },
    { pair: 'NVDA-PERP', exchange: 'hyperliquid', type: 'perp', enabled: false, chain: 'hyperliquid', assetClass: 'stock' },
    { pair: 'SPY-PERP', exchange: 'hyperliquid', type: 'perp', enabled: false, chain: 'hyperliquid', assetClass: 'stock' },
    // Forex Synth Perps (Hyperliquid - no KYC, 24/7)
    { pair: 'EUR/USD-PERP', exchange: 'hyperliquid', type: 'perp', enabled: false, chain: 'hyperliquid', assetClass: 'forex' },
    { pair: 'GBP/USD-PERP', exchange: 'hyperliquid', type: 'perp', enabled: false, chain: 'hyperliquid', assetClass: 'forex' },
    { pair: 'USD/JPY-PERP', exchange: 'hyperliquid', type: 'perp', enabled: false, chain: 'hyperliquid', assetClass: 'forex' },
    // Commodity Synth Perps (Hyperliquid - no KYC, 24/7)
    { pair: 'GOLD-PERP', exchange: 'hyperliquid', type: 'perp', enabled: false, chain: 'hyperliquid', assetClass: 'commodity' },
    { pair: 'SILVER-PERP', exchange: 'hyperliquid', type: 'perp', enabled: false, chain: 'hyperliquid', assetClass: 'commodity' },
    { pair: 'OIL-PERP', exchange: 'hyperliquid', type: 'perp', enabled: false, chain: 'hyperliquid', assetClass: 'commodity' },
  ],
  notifications: {
    telegram: { enabled: false },
    email: { enabled: false },
    discord: { enabled: false },
    events: ['trade_executed', 'tp_sl_hit', 'error'],
  },
};
