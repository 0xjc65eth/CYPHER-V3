/**
 * TradeExecutor - DEX-based arbitrage trade execution engine
 *
 * Architecture: CEX = Price Oracle, DEX = Execution
 *
 * Execution targets (live mode):
 * - Jupiter (Solana) for SOL/BTC swaps (~0.3% fee)
 * - Uniswap V3 (Ethereum) for ETH pairs (0.3% pool fee + gas)
 * - 1inch (multi-chain) as fallback aggregator (variable fee)
 *
 * Paper trading: simulates execution using real CEX oracle prices
 *
 * Risk management: position limits, daily loss limits, cooldowns
 */

import { logger } from '@/lib/logger';
import {
  arbitrageCore,
  CrossExchangeOpportunity,
  type ExecutionVenue,
} from './ArbitrageCore';
import { EXCHANGE_FEES } from '@/lib/arbitrage/exchange-fetchers';

export type TradingMode = 'paper' | 'live';
export type TradeStatus =
  | 'pending'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TradeExecution {
  id: string;
  opportunityId: string;
  mode: TradingMode;
  pair: string;
  buyExchange: string; // CEX oracle source
  sellExchange: string; // CEX oracle source
  executionVenue: ExecutionVenue; // DEX where trade executes
  buyPrice: number;
  sellPrice: number;
  amount: number; // in base currency units
  amountUSD: number;
  grossProfit: number;
  fees: {
    buyFee: number;
    sellFee: number;
    dexFee: number; // DEX swap fee
    gasFee: number; // blockchain gas cost
    networkFee: number;
    total: number;
  };
  netProfit: number;
  netProfitPercent: number;
  status: TradeStatus;
  error?: string;
  txHash?: string; // DEX transaction hash
  startedAt: number;
  completedAt?: number;
}

export interface RiskConfig {
  maxPositionUSD: number; // max per trade (default $1000)
  dailyLossLimitUSD: number; // max daily loss (default $100)
  minProfitPercent: number; // min net profit to execute (default 0.1%)
  maxConcurrentTrades: number; // max simultaneous trades (default 3)
  cooldownMs: number; // cooldown between trades (default 30s)
}

export interface AutoTraderState {
  running: boolean;
  mode: TradingMode;
  config: RiskConfig;
  activeTrades: number;
  todayPnL: number;
  todayTradeCount: number;
  lastTradeAt: number;
  history: TradeExecution[];
}

// DEX fee estimates (conservative)
const DEX_FEES: Record<ExecutionVenue, { swapFee: number; gasFeeUSD: number }> = {
  jupiter: { swapFee: 0.003, gasFeeUSD: 0.01 }, // ~0.3% + ~$0.01 Solana tx
  uniswap_v3: { swapFee: 0.003, gasFeeUSD: 5.00 }, // 0.3% pool + ~$5 gas
  '1inch': { swapFee: 0.005, gasFeeUSD: 3.00 }, // ~0.5% variable + gas
  paper: { swapFee: 0, gasFeeUSD: 0 }, // no fees in paper mode
};

const DEFAULT_CONFIG: RiskConfig = {
  maxPositionUSD: 1000,
  dailyLossLimitUSD: 100,
  minProfitPercent: 0.1,
  maxConcurrentTrades: 3,
  cooldownMs: 30_000,
};

class TradeExecutorEngine {
  private state: AutoTraderState;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private dayStart: number = this.getDayStart();

  constructor() {
    this.state = {
      running: false,
      mode: 'paper',
      config: { ...DEFAULT_CONFIG },
      activeTrades: 0,
      todayPnL: 0,
      todayTradeCount: 0,
      lastTradeAt: 0,
      history: [],
    };
  }

  getState(): AutoTraderState {
    this.resetDailyIfNeeded();
    return { ...this.state };
  }

  /**
   * Start the auto-trader.
   */
  start(mode: TradingMode, config?: Partial<RiskConfig>): void {
    if (this.state.running) return;

    if (mode === 'live') {
      // Live DEX trading requires wallet configuration
      const hasWallet =
        process.env.SOLANA_PRIVATE_KEY ||
        process.env.ETH_PRIVATE_KEY;
      if (!hasWallet) {
        throw new Error(
          'Live DEX trading requires SOLANA_PRIVATE_KEY or ETH_PRIVATE_KEY in environment'
        );
      }
    }

    this.state.running = true;
    this.state.mode = mode;
    if (config) {
      this.state.config = { ...this.state.config, ...config };
    }

    logger.info(
      `[TRADE_EXECUTOR] Started in ${mode} mode (DEX execution) with config: ${JSON.stringify(this.state.config)}`
    );

    // Poll for opportunities every 5 seconds
    this.pollingInterval = setInterval(() => this.pollAndExecute(), 5000);
  }

  /**
   * Stop the auto-trader.
   */
  stop(): void {
    this.state.running = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    logger.info('[TRADE_EXECUTOR] Stopped');
  }

  /**
   * Execute a single opportunity manually.
   */
  async executeTrade(
    opportunity: CrossExchangeOpportunity,
    amountUSD?: number
  ): Promise<TradeExecution> {
    const amount =
      amountUSD ||
      Math.min(this.state.config.maxPositionUSD, 1000);

    return this.doExecute(opportunity, amount);
  }

  /**
   * Get recent trade history.
   */
  getHistory(limit: number = 50): TradeExecution[] {
    return this.state.history.slice(-limit);
  }

  // --- Private methods ---

  private async pollAndExecute(): Promise<void> {
    if (!this.state.running) return;

    this.resetDailyIfNeeded();

    // Check daily loss limit
    if (
      this.state.todayPnL < 0 &&
      Math.abs(this.state.todayPnL) >= this.state.config.dailyLossLimitUSD
    ) {
      logger.warn(
        '[TRADE_EXECUTOR] Daily loss limit reached, pausing'
      );
      return;
    }

    // Check cooldown
    if (
      Date.now() - this.state.lastTradeAt <
      this.state.config.cooldownMs
    ) {
      return;
    }

    // Check concurrent limit
    if (
      this.state.activeTrades >=
      this.state.config.maxConcurrentTrades
    ) {
      return;
    }

    try {
      const opportunities = await arbitrageCore.detectOpportunities();

      // Find profitable opportunities
      for (const opp of opportunities) {
        if (opp.netProfitPercent < this.state.config.minProfitPercent)
          continue;
        if (opp.riskLevel === 'HIGH') continue;

        await this.doExecute(opp, this.state.config.maxPositionUSD);
        break; // One trade per poll cycle
      }
    } catch (error) {
      logger.error(
        '[TRADE_EXECUTOR] Poll error',
        error as Error
      );
    }
  }

  private async doExecute(
    opportunity: CrossExchangeOpportunity,
    amountUSD: number
  ): Promise<TradeExecution> {
    const venue: ExecutionVenue = this.state.mode === 'paper'
      ? 'paper'
      : opportunity.executionVenue;

    const dexFees = DEX_FEES[venue];
    const dexFeeAmount = amountUSD * dexFees.swapFee;
    const gasFeeAmount = dexFees.gasFeeUSD;

    const trade: TradeExecution = {
      id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      opportunityId: opportunity.id,
      mode: this.state.mode,
      pair: opportunity.pair,
      buyExchange: opportunity.buyExchange,
      sellExchange: opportunity.sellExchange,
      executionVenue: venue,
      buyPrice: opportunity.buyPrice,
      sellPrice: opportunity.sellPrice,
      amount: amountUSD / opportunity.buyPrice,
      amountUSD,
      grossProfit:
        (opportunity.grossSpreadPercent / 100) * amountUSD,
      fees: {
        buyFee: opportunity.buyFee * amountUSD,
        sellFee: opportunity.sellFee * amountUSD,
        dexFee: dexFeeAmount,
        gasFee: gasFeeAmount,
        networkFee:
          (opportunity.networkFeePercent / 100) * amountUSD,
        total:
          (opportunity.buyFee +
            opportunity.sellFee +
            opportunity.networkFeePercent / 100 +
            opportunity.slippagePercent / 100) *
          amountUSD + dexFeeAmount + gasFeeAmount,
      },
      netProfit: (opportunity.netProfitPercent / 100) * amountUSD - dexFeeAmount - gasFeeAmount,
      netProfitPercent: opportunity.netProfitPercent - (dexFees.swapFee * 100) - (gasFeeAmount / amountUSD * 100),
      status: 'executing',
      startedAt: Date.now(),
    };

    this.state.activeTrades++;

    try {
      if (this.state.mode === 'paper') {
        await this.simulatePaperTrade(trade);
      } else {
        await this.executeDEXTrade(trade);
      }

      trade.status = 'completed';
      trade.completedAt = Date.now();
      this.state.todayPnL += trade.netProfit;
      this.state.todayTradeCount++;
      this.state.lastTradeAt = Date.now();

      logger.info(
        `[TRADE_EXECUTOR] ${trade.mode} trade via ${trade.executionVenue}: ${trade.pair} ${trade.buyExchange}->${trade.sellExchange} profit=$${trade.netProfit.toFixed(2)} (${trade.netProfitPercent.toFixed(4)}%)`
      );
    } catch (error) {
      trade.status = 'failed';
      trade.error =
        error instanceof Error ? error.message : 'Unknown error';
      trade.completedAt = Date.now();

      logger.error(
        `[TRADE_EXECUTOR] Trade failed: ${trade.error}`
      );
    } finally {
      this.state.activeTrades--;
      this.state.history.push(trade);

      // Keep history manageable
      if (this.state.history.length > 500) {
        this.state.history = this.state.history.slice(-200);
      }
    }

    return trade;
  }

  /**
   * Paper trading: simulate with real CEX oracle prices
   */
  private async simulatePaperTrade(
    trade: TradeExecution
  ): Promise<void> {
    // Simulate DEX execution latency
    await new Promise((r) => setTimeout(r, 200));

    // Verify prices haven't moved too much (using CEX oracles)
    const snapshot = await arbitrageCore.getPrices(
      trade.pair as 'BTC/USDT' | 'ETH/USDT'
    );
    const buyEx = snapshot.exchanges.find(
      (e) => e.exchange === trade.buyExchange
    );
    const sellEx = snapshot.exchanges.find(
      (e) => e.exchange === trade.sellExchange
    );

    if (!buyEx || !sellEx) {
      throw new Error('Exchange price not available for verification');
    }

    // Check if opportunity still exists (prices within 0.5% of original)
    const buySlippage =
      Math.abs(buyEx.ask - trade.buyPrice) / trade.buyPrice;
    const sellSlippage =
      Math.abs(sellEx.bid - trade.sellPrice) / trade.sellPrice;

    if (buySlippage > 0.005 || sellSlippage > 0.005) {
      throw new Error(
        `Price moved too much: buy slippage ${(buySlippage * 100).toFixed(2)}%, sell slippage ${(sellSlippage * 100).toFixed(2)}%`
      );
    }
  }

  /**
   * Live DEX trade execution
   * Routes to the appropriate DEX based on executionVenue
   */
  private async executeDEXTrade(
    trade: TradeExecution
  ): Promise<void> {
    switch (trade.executionVenue) {
      case 'jupiter':
        await this.executeJupiterSwap(trade);
        break;
      case 'uniswap_v3':
        await this.executeUniswapSwap(trade);
        break;
      case '1inch':
        await this.execute1inchSwap(trade);
        break;
      default:
        throw new Error(`Unknown execution venue: ${trade.executionVenue}`);
    }
  }

  /**
   * Jupiter (Solana) swap execution
   * Uses Jupiter Aggregator API v6
   */
  private async executeJupiterSwap(
    trade: TradeExecution
  ): Promise<void> {
    // Jupiter V6 API: https://station.jup.ag/api-v6/post-swap
    // Requires: SOLANA_PRIVATE_KEY, SOLANA_RPC_URL
    if (!process.env.SOLANA_PRIVATE_KEY) {
      throw new Error('Jupiter swap requires SOLANA_PRIVATE_KEY');
    }

    logger.info(
      `[JUPITER] Executing swap: ${trade.pair} $${trade.amountUSD}`
    );

    // In production, this would:
    // 1. GET /quote from Jupiter API with inputMint, outputMint, amount
    // 2. POST /swap with the quote + user keypair
    // 3. Sign and send the transaction
    // 4. Wait for confirmation
    throw new Error(
      'Jupiter live execution requires @solana/web3.js integration. Use paper mode for testing.'
    );
  }

  /**
   * Uniswap V3 (Ethereum) swap execution
   * Uses Uniswap Smart Order Router
   */
  private async executeUniswapSwap(
    trade: TradeExecution
  ): Promise<void> {
    if (!process.env.ETH_PRIVATE_KEY) {
      throw new Error('Uniswap swap requires ETH_PRIVATE_KEY');
    }

    logger.info(
      `[UNISWAP_V3] Executing swap: ${trade.pair} $${trade.amountUSD}`
    );

    // In production, this would:
    // 1. Use @uniswap/smart-order-router to get optimal route
    // 2. Build swap transaction with exact input/output
    // 3. Sign with ethers.js wallet
    // 4. Submit and wait for receipt
    throw new Error(
      'Uniswap V3 live execution requires ethers.js integration. Use paper mode for testing.'
    );
  }

  /**
   * 1inch (multi-chain) swap execution
   * Uses 1inch Aggregation Router API
   */
  private async execute1inchSwap(
    trade: TradeExecution
  ): Promise<void> {
    logger.info(
      `[1INCH] Executing swap: ${trade.pair} $${trade.amountUSD}`
    );

    // In production, this would:
    // 1. GET /swap from 1inch API with fromToken, toToken, amount
    // 2. Sign the transaction data
    // 3. Submit to blockchain
    throw new Error(
      '1inch live execution requires web3 integration. Use paper mode for testing.'
    );
  }

  private getDayStart(): number {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  private resetDailyIfNeeded(): void {
    const currentDayStart = this.getDayStart();
    if (currentDayStart > this.dayStart) {
      this.dayStart = currentDayStart;
      this.state.todayPnL = 0;
      this.state.todayTradeCount = 0;
    }
  }
}

export const tradeExecutor = new TradeExecutorEngine();
