import { STANDARD_DEX_FEE_RATE, MAX_FEE_USD } from '@/config/fee-config';

// Quick Trade System Types
export interface Token {
  address: string
  symbol: string
  name: string
  decimals: number
  logoUri?: string
  chainId: number
  coingeckoId?: string
  isNative?: boolean
}

export interface Network {
  chainId: number
  name: string
  symbol: string
  logoUri: string
  rpcUrl: string
  explorerUrl: string
  isTestnet?: boolean
  supportedDEXs: DEXType[]
  nativeToken: Token
}

export enum DEXType {
  UNISWAP_V2 = 'uniswap_v2',
  UNISWAP_V3 = 'uniswap_v3',
  SUSHISWAP = 'sushiswap',
  PANCAKESWAP = 'pancakeswap',
  JUPITER = 'jupiter',
  ORCA = 'orca',
  RUNESDEX = 'runesdex',
  LHMA_SWAP = 'lhma_swap',
  ONEINCH = '1inch',
  PARASWAP = 'paraswap',
  // V3.0.0 Additional DEXs
  CURVE = 'curve',
  BALANCER = 'balancer',
  VELODROME = 'velodrome',
  CAMELOT = 'camelot',
  QUICKSWAP = 'quickswap',
  AERODROME = 'aerodrome',
  TRADER_JOE = 'trader_joe',
  PANGOLIN = 'pangolin',
  BISWAP = 'biswap',
  APESWAP = 'apeswap',
  RAYDIUM = 'raydium',
  LIFINITY = 'lifinity',
  MARINADE = 'marinade',
  METEORA = 'meteora',
  PHOENIX = 'phoenix'
}

export interface DEXConfig {
  type: DEXType
  name: string
  logoUri: string
  factoryAddress?: string
  routerAddress?: string
  feeNumerator: number // fee in basis points (100 = 1%)
  supportedNetworks: number[]
  isActive: boolean
  apiEndpoint?: string
  swapUrl?: string
}

export interface Quote {
  dex: DEXType
  inputAmount: string
  outputAmount: string
  priceImpact: number
  estimatedGas: string
  route: RouteStep[]
  fee: string
  slippage: number
  executionTime: number // estimated time in seconds
  confidence: number // 0-100 confidence score
  timestamp: number
}

export interface RouteStep {
  dex: DEXType
  tokenIn: Token
  tokenOut: Token
  amountIn: string
  amountOut: string
  poolAddress?: string
  fee?: number
  priceImpact: number
}

export interface SwapParams {
  tokenIn: Token
  tokenOut: Token
  amountIn: string
  slippageTolerance: number
  recipient: string
  deadline?: number
  referrer?: string
}

export interface SwapTransaction {
  to: string
  data: string
  value: string
  gasLimit: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
}

export interface SwapResult {
  transaction: SwapTransaction
  quote: Quote
  txHash?: string
  status: 'pending' | 'success' | 'failed'
  error?: string
}

export interface PriceComparison {
  bestQuote: Quote
  allQuotes: Quote[]
  savings: {
    amount: string
    percentage: number
    vsWorstQuote: boolean
  }
  recommendation: {
    dex: DEXType
    reason: string
    riskLevel: 'low' | 'medium' | 'high'
  }
}

export interface AggregatorSettings {
  maxSlippage: number
  gasOptimization: boolean
  includeGasCosts: boolean
  prioritizeSpeed: boolean
  minAmountUSD: number // $10 minimum
  cypherFeeRate: number // From fee-config.ts
  maxFeeUSD: number // From fee-config.ts
  enabledDEXs: DEXType[]
  enabledNetworks: number[]
}

export interface FeeStructure {
  cypherFee: string
  gasFee: string
  dexFee: string
  totalFee: string
  feeInUSD: string
  feeRecipient: string
}

export interface MarketData {
  tokenAddress: string
  price: number
  priceChange24h: number
  volume24h: number
  marketCap: number
  liquidity: number
  lastUpdated: number
}

export interface LiquidityPool {
  address: string
  dex: DEXType
  token0: Token
  token1: Token
  reserve0: string
  reserve1: string
  fee: number
  apy: number
  volume24h: string
  tvl: string
}

export interface ArbitrageOpportunity {
  tokenPair: [Token, Token]
  buyDEX: DEXType
  sellDEX: DEXType
  buyPrice: number
  sellPrice: number
  profitMargin: number
  requiredAmount: string
  estimatedProfit: string
  riskScore: number
  timestamp: number
}

export interface RoutingConfig {
  maxHops: number
  maxRoutes: number
  timeout: number // milliseconds
  useMultiPath: boolean
  optimizeFor: 'price' | 'gas' | 'speed' | 'balanced'
  includeStablecoinRoutes: boolean
  minLiquidityUSD: number
}

export interface NetworkGasConfig {
  chainId: number
  gasToken: Token
  gasPrice: {
    slow: string
    standard: string
    fast: string
  }
  estimatedConfirmationTime: {
    slow: number
    standard: number
    fast: number
  }
}

export interface QuickTradeState {
  tokenIn: Token | null
  tokenOut: Token | null
  amountIn: string
  quotes: Quote[]
  selectedQuote: Quote | null
  isLoading: boolean
  error: string | null
  priceComparison: PriceComparison | null
  settings: AggregatorSettings
}

export interface DEXApiResponse {
  success: boolean
  data?: any
  error?: string
  timestamp: number
}

export interface HealthCheck {
  dex: DEXType
  network: number
  isHealthy: boolean
  latency: number
  lastCheck: number
  errorCount: number
}

// Supported Networks Configuration
export const SUPPORTED_NETWORKS: Network[] = [
  {
    chainId: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    logoUri: '/icons/ethereum.png',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
    explorerUrl: 'https://etherscan.io',
    supportedDEXs: [DEXType.UNISWAP_V2, DEXType.UNISWAP_V3, DEXType.SUSHISWAP, DEXType.ONEINCH],
    nativeToken: {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      chainId: 1,
      isNative: true
    }
  },
  {
    chainId: 42161,
    name: 'Arbitrum',
    symbol: 'ARB',
    logoUri: '/icons/arbitrum.png',
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/',
    explorerUrl: 'https://arbiscan.io',
    supportedDEXs: [DEXType.LHMA_SWAP, DEXType.SUSHISWAP, DEXType.UNISWAP_V3],
    nativeToken: {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      chainId: 42161,
      isNative: true
    }
  },
  {
    chainId: 101, // Solana
    name: 'Solana',
    symbol: 'SOL',
    logoUri: '/icons/solana.png',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://solscan.io',
    supportedDEXs: [DEXType.JUPITER, DEXType.ORCA],
    nativeToken: {
      address: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      name: 'Solana',
      decimals: 9,
      chainId: 101,
      isNative: true
    }
  }
]

// Default Settings
export const DEFAULT_SETTINGS: AggregatorSettings = {
  maxSlippage: 1.0, // 1%
  gasOptimization: true,
  includeGasCosts: true,
  prioritizeSpeed: false,
  minAmountUSD: 10,
  cypherFeeRate: STANDARD_DEX_FEE_RATE,
  maxFeeUSD: MAX_FEE_USD,
  enabledDEXs: [
    DEXType.UNISWAP_V3,
    DEXType.JUPITER,
    DEXType.RUNESDEX,
    DEXType.LHMA_SWAP
  ],
  enabledNetworks: [1, 42161, 101]
}

// V3.0.0 Enhanced Types
export interface QuickTradeV3Transaction {
  id: string
  userId: string
  chainId: number | string
  tokenIn: Token
  tokenOut: Token
  amountIn: string
  amountOut: string
  amountInUSD: number
  amountOutUSD: number
  route: Quote
  serviceFee: ServiceFeeV3
  status: TransactionStatus
  hash?: string
  timestamp: number
  completedAt?: number
  error?: string
  metadata?: {
    walletAddress: string
    slippage: number
    gasSpeed: 'slow' | 'standard' | 'fast'
    referrer?: string
  }
}

export interface ServiceFeeV3 {
  amount: string
  amountUSD: number
  percentage: number
  recipient: string
  collected: boolean
  cappedAt?: number // Fee cap applied
  transactionHash?: string
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export interface RevenueDataV3 {
  totalCollected: {
    [chainId: string]: {
      native: string
      usd: number
      tokenSymbol: string
    }
  }
  totalUSD: number
  transactionCount: number
  averageFeeUSD: number
  successRate: number
  lastUpdated: number
  dailyRevenue: DailyRevenueV3[]
  topTraders: TopTrader[]
}

export interface DailyRevenueV3 {
  date: string
  revenueUSD: number
  transactionCount: number
  uniqueUsers: number
  chains: {
    [chainId: string]: {
      revenueUSD: number
      transactionCount: number
      avgTransactionSize: number
    }
  }
  topDEXs: Array<{
    dex: DEXType
    volume: number
    feeCollected: number
  }>
}

export interface TopTrader {
  address: string
  totalVolumeUSD: number
  totalFeesUSD: number
  transactionCount: number
  favoriteChain: string
  favoriteDEX: DEXType
}

export interface QuickTradeAnalyticsV3 {
  totalVolume24h: number
  totalFees24h: number
  activeUsers24h: number
  topTokenPairs: Array<{
    tokenIn: Token
    tokenOut: Token
    volume: number
    transactions: number
  }>
  dexMarketShare: Array<{
    dex: DEXType
    marketShare: number
    volume: number
  }>
  chainDistribution: Array<{
    chainId: number
    volume: number
    percentage: number
  }>
}