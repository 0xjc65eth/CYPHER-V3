// Professional Portfolio Types

export interface Transaction {
  id: string;
  txid: string;
  date: string;
  timestamp: number;
  type: 'buy' | 'sell' | 'transfer' | 'inscription' | 'swap' | 'stake' | 'unstake';
  asset: string;
  assetType: 'bitcoin' | 'ordinal' | 'rune' | 'brc20' | 'rare_sat';
  amount: number;
  price: number;
  totalValue: number;
  fee: number;
  feeUSD: number;
  exchange?: string;
  wallet?: string;
  from?: string;
  to?: string;
  confirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
  notes?: string;
  inscriptionId?: string;
  runeId?: string;
  collectionName?: string;
  tokenId?: string;
  rarity?: string;
  // For PNL calculation
  costBasis?: number;
  realizedPNL?: number;
  unrealizedPNL?: number;
}

export interface AssetPNL {
  asset: string;
  assetType: 'bitcoin' | 'ordinal' | 'rune' | 'brc20' | 'rare_sat';
  totalCost: number;
  currentValue: number;
  unrealizedPNL: number;
  unrealizedPNLPercentage: number;
  realizedPNL: number;
  totalPNL: number;
  totalPNLPercentage: number;
  dayChange: number;
  dayChangePercentage: number;
}

export interface AssetHolding {
  id: string;
  asset: string;
  assetType: 'bitcoin' | 'ordinal' | 'rune' | 'brc20' | 'rare_sat';
  // Quantities
  totalAmount: number;
  availableAmount: number;
  lockedAmount: number;
  // Pricing
  averageBuyPrice: number;
  currentPrice: number;
  marketPrice24hAgo: number;
  // Values
  totalCost: number;
  currentValue: number;
  // PNL
  unrealizedPNL: number;
  unrealizedPNLPercentage: number;
  realizedPNL: number;
  totalPNL: number;
  totalPNLPercentage: number;
  // Analytics
  dayChange: number;
  dayChangePercentage: number;
  weekChange: number;
  weekChangePercentage: number;
  monthChange: number;
  monthChangePercentage: number;
  // Ordinals/Runes specific
  collection?: string;
  tokenId?: string;
  inscriptionNumber?: number;
  contentType?: string;
  rarity?: string;
  floorPrice?: number;
  attributes?: any[];
  // Transaction history
  transactions: Transaction[];
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  lastSaleDate?: string;
  totalBought: number;
  totalSold: number;
  buyCount: number;
  sellCount: number;
  // Risk metrics
  volatility30d: number;
  sharpeRatio: number;
  beta: number;
}

export interface PortfolioMetrics {
  // Overview
  totalValue: number;
  totalCost: number;
  totalPNL: number;
  totalPNLPercentage: number;
  // Breakdown
  unrealizedPNL: number;
  unrealizedPNLPercentage: number;
  realizedPNL: number;
  realizedPNLPercentage: number;
  // Performance
  dayReturn: number;
  dayReturnPercentage: number;
  weekReturn: number;
  weekReturnPercentage: number;
  monthReturn: number;
  monthReturnPercentage: number;
  yearReturn: number;
  yearReturnPercentage: number;
  allTimeReturn: number;
  allTimeReturnPercentage: number;
  // Risk Metrics
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDate: string;
  currentDrawdown: number;
  beta: number;
  alpha: number;
  calmarRatio: number;
  // Analytics
  winRate: number;
  avgWinAmount: number;
  avgLossAmount: number;
  profitFactor: number;
  bestTrade: Transaction | null;
  worstTrade: Transaction | null;
  longestWinStreak: number;
  longestLossStreak: number;
  // Activity
  totalTransactions: number;
  totalBuys: number;
  totalSells: number;
  totalFees: number;
  avgHoldingPeriod: number;
  turnoverRate: number;
}

export interface PortfolioAllocation {
  asset: string;
  assetType: string;
  value: number;
  percentage: number;
  change24h: number;
  change24hPercentage: number;
}

export interface PerformanceHistory {
  date: string;
  timestamp: number;
  totalValue: number;
  totalCost: number;
  pnl: number;
  pnlPercentage: number;
  dayReturn: number;
  dayReturnPercentage: number;
  cumulativeReturn: number;
  allocations: PortfolioAllocation[];
}

export interface RiskAnalysis {
  overallRiskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  concentrationRisk: number;
  liquidityRisk: number;
  volatilityRisk: number;
  correlationRisk: number;
  marketRisk: number;
  recommendations: string[];
  alerts: RiskAlert[];
}

export interface RiskAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  type: string;
  message: string;
  timestamp: string;
  metadata?: any;
}

export interface AIInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'trend' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  actions?: AIAction[];
  metadata?: any;
  timestamp: string;
}

export interface AIAction {
  id: string;
  type: 'buy' | 'sell' | 'rebalance' | 'alert' | 'research';
  description: string;
  asset?: string;
  amount?: number;
  targetPrice?: number;
  urgency: 'low' | 'medium' | 'high';
}

export interface MarketContext {
  btcPrice: number;
  btcChange24h: number;
  btcDominance: number;
  marketCap: number;
  volume24h: number;
  fearGreedIndex: number;
  sentiment: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  trendingCollections: string[];
  whaleActivity: 'low' | 'normal' | 'high';
  onChainMetrics: {
    activeAddresses: number;
    transactionVolume: number;
    exchangeNetFlow: number;
    minerRevenue: number;
  };
}

export interface Portfolio {
  address: string;
  lastUpdated: string;
  metrics: PortfolioMetrics;
  holdings: AssetHolding[];
  transactions: Transaction[];
  performanceHistory: PerformanceHistory[];
  riskAnalysis: RiskAnalysis;
  aiInsights: AIInsight[];
  marketContext: MarketContext;
  settings: {
    costBasisMethod: 'FIFO' | 'LIFO' | 'HIFO' | 'WAC';
    baseCurrency: 'USD' | 'BTC' | 'EUR';
    timezone: string;
    taxCountry?: string;
  };
}