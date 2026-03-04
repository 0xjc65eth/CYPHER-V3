/**
 * 📊 Backtesting Engine
 * Testa estratégias de trading com dados históricos
 */

export interface BacktestConfig {
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  strategy: TradingStrategy;
  slippage: number; // %
  commission: number; // %
}

export interface TradingStrategy {
  name: string;
  entryRules: EntryRule[];
  exitRules: ExitRule[];
  positionSizing: PositionSizingMethod;
  riskManagement: RiskManagementRules;
}

export interface EntryRule {
  indicator: string;
  condition: 'above' | 'below' | 'crosses_above' | 'crosses_below';
  value: number;
}

export interface ExitRule {
  type: 'stop_loss' | 'take_profit' | 'trailing_stop' | 'indicator';
  value: number;
  indicator?: string;
}

export type PositionSizingMethod = 
  | { type: 'fixed'; amount: number }
  | { type: 'percentage'; value: number }
  | { type: 'kelly'; factor: number }
  | { type: 'volatility'; atrMultiplier: number };

export interface RiskManagementRules {
  maxDrawdown: number;
  maxPositionSize: number;
  maxDailyLoss: number;
  maxOpenPositions: number;
}

export interface BacktestResult {
  metrics: PerformanceMetrics;
  trades: TradeResult[];
  equityCurve: EquityPoint[];
  drawdownCurve: DrawdownPoint[];
  statistics: Statistics;
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export interface TradeResult {
  id: string;
  entryDate: Date;
  exitDate: Date;
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  duration: number;
}

export interface EquityPoint {
  date: Date;
  value: number;
  drawdown: number;
}

export interface DrawdownPoint {
  date: Date;
  drawdown: number;
  peak: number;
  trough: number;
}

export interface Statistics {
  averageTradesPerDay: number;
  averageHoldingPeriod: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  expectancy: number;
  recoveryFactor: number;
}