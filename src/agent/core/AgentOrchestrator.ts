/**
 * CYPHER AI Trading Agent - Agent Orchestrator
 * Coordinates all strategies, risk management, and auto-compound.
 *
 * Wiring:
 *   HyperliquidConnector  ->  candles / mid prices / positions / orders
 *   ScalpingEngine         <-  candles  ->  TradeSignal
 *   MMStrategyEngine       <-  mid price + volatility  ->  Quotes
 *   LPStrategyEngine       <-  LP positions + price    ->  rebalance decisions
 *   MaxDrawdownProtection  <-  equity snapshots        ->  kill-switch
 *   AutoCompoundEngine     <-  profit collection       ->  CompoundResult
 */

import {
  AgentConfig,
  AgentState,
  AgentStatus,
  AgentPerformance,
  Position,
  MarketConfig,
  TradeSignal,
  CompoundResult,
  Candle,
  ExchangeType,
  DEFAULT_AGENT_CONFIG,
} from './types';
import { AutoCompoundEngine } from './AutoCompoundEngine';
import { BaseConnector } from '../connectors/BaseConnector';
import { HyperliquidConnector, HyperliquidConfig } from '../connectors/HyperliquidConnector';
import { JupiterConnector } from '../connectors/JupiterConnector';
import { UniswapConnector } from '../connectors/UniswapConnector';
// AlpacaConnector removed (requires KYC) - all assets via Hyperliquid synth perps
import { CCXTConnector } from '../connectors/CCXTConnector';
import { ScalpingEngine } from '../strategies/scalping/ScalpingEngine';
import { MMStrategyEngine } from '../strategies/market-maker/MMStrategyEngine';
import { LPStrategyEngine } from '../strategies/liquidity-pool/LPStrategyEngine';
import { LPExecutionEngine } from '../strategies/liquidity-pool/LPExecutionEngine';
import { MaxDrawdownProtection } from '../risk/MaxDrawdownProtection';
import { LiquidationGuard } from '../risk/LiquidationGuard';
import { MEVProtection } from '../risk/MEVProtection';
import { ConsensusEngine } from '../consensus/ConsensusEngine';
import { TradeProposal } from '../consensus/RiskManagerAgent';
import { getAgentPersistence, AgentPersistenceService } from '../persistence';
import { getSessionKeyManager, SessionKeyManager } from '../wallet';
import { getAgentEventBus, AgentEventBus } from '../consensus/AgentEventBus';
import { HyperliquidMarketDiscovery } from '../connectors/HyperliquidMarketDiscovery';
import { HyperliquidWSBridge } from '../connectors/HyperliquidWSBridge';
import { PairRegistrationService } from './PairRegistrationService';
import { IPOStrategyEngine } from '../strategies/ipo/IPOStrategyEngine';

// Quant engines
import { MarketDataService, getMarketDataService } from '../data/MarketDataService';
import { OrderbookAggregator, getOrderbookAggregator } from '../data/OrderbookAggregator';
import { FundingRateTracker, getFundingRateTracker } from '../data/FundingRateTracker';
import { LiquidationTracker, getLiquidationTracker } from '../data/LiquidationTracker';
import { CandleStore, getCandleStore } from '../data/CandleStore';
import { MarketRegimeDetector, getMarketRegimeDetector } from '../regime/MarketRegimeDetector';
import { FundingArbitrageAlpha } from '../alpha/FundingArbitrageAlpha';
import { LiquidationCascadeAlpha } from '../alpha/LiquidationCascadeAlpha';
import { OrderFlowImbalanceAlpha } from '../alpha/OrderFlowImbalanceAlpha';
import { PortfolioManager, getPortfolioManager } from '../portfolio/PortfolioManager';
import { OrderExecutionService, getOrderExecutionService } from '../execution/OrderExecutionService';

export interface UserCredentials {
  hyperliquid?: { agentKey: string; agentSecret: string; testnet?: boolean };
  solanaPrivateKey?: string;
  evmPrivateKey?: string;
  solanaRpcUrl?: string;
  ethRpcUrl?: string;
  oneInchApiKey?: string;
}

export class AgentOrchestrator {
  private userId: string;
  private config: AgentConfig;
  private state: AgentState;
  private isRunning: boolean = false;
  private mainLoopInterval: ReturnType<typeof setInterval> | null = null;
  private compoundInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  // Sub-systems
  private connectors: Map<string, BaseConnector | HyperliquidConnector> = new Map();
  private connector: HyperliquidConnector; // Legacy: default perp connector
  private scalpingEngines: Map<string, ScalpingEngine> = new Map();
  private mmEngines: Map<string, MMStrategyEngine> = new Map();
  private lpEngine: LPStrategyEngine;
  private drawdownGuard: MaxDrawdownProtection;
  private liquidationGuard: LiquidationGuard;
  private mevProtection: MEVProtection;
  private compounder: AutoCompoundEngine;
  private consensus: ConsensusEngine;
  private persistence: AgentPersistenceService;
  private sessionKeyManager: SessionKeyManager;
  private eventBus: AgentEventBus;
  private credentials: UserCredentials;
  private configId: string | null = null;

  // LP execution
  private lpExecutor: LPExecutionEngine | null = null;

  // Dynamic pair discovery
  private discovery: HyperliquidMarketDiscovery | null = null;
  private wsBridge: HyperliquidWSBridge | null = null;
  private pairRegistration: PairRegistrationService | null = null;
  private ipoEngines: Map<string, IPOStrategyEngine> = new Map();

  // Quant engines
  private marketDataService: MarketDataService;
  private orderbookAggregator: OrderbookAggregator;
  private fundingTracker: FundingRateTracker;
  private liquidationTracker: LiquidationTracker;
  private candleStore: CandleStore;
  private regimeDetector: MarketRegimeDetector;
  private alphaFunding: FundingArbitrageAlpha;
  private alphaCascade: LiquidationCascadeAlpha;
  private alphaOrderFlow: OrderFlowImbalanceAlpha;
  private portfolioManager: PortfolioManager;
  private executionService: OrderExecutionService;

  // Trade history (persists across cycles)
  private tradeHistory: Array<TradeSignal & { executedAt: number; result?: string }> = [];
  private realizedPnl: number = 0;
  private mmPnl: number = 0;
  private equitySnapshotCounter: number = 0;

  // Order dedup cache: prevents double-execution (signalId -> timestamp)
  private orderDedupCache: Map<string, number> = new Map();
  private mmActiveOrders: Map<string, string[]> = new Map();
  private readonly DEDUP_WINDOW_MS = 30000; // 30 seconds dedup window

  // SECURITY FIX: Execution mutex prevents race conditions.
  // Without this, two identical signals arriving within the same event loop tick
  // could both pass the dedup check before either writes to the cache.
  private executionLock: Map<string, Promise<void>> = new Map();

  constructor(userId: string, config?: Partial<AgentConfig>, credentials?: UserCredentials, persistenceId?: string) {
    this.userId = userId;
    this.credentials = credentials || {};
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
    this.state = this.createInitialState();

    // Initialize Hyperliquid connector (default perp connector)
    const isTestnet = this.credentials.hyperliquid?.testnet === true;
    const hlConfig: HyperliquidConfig = {
      apiUrl: isTestnet ? 'https://api.hyperliquid-testnet.xyz' : 'https://api.hyperliquid.xyz',
      agentKey: this.credentials.hyperliquid?.agentKey || process.env.HYPERLIQUID_AGENT_KEY || '',
      agentSecret: this.credentials.hyperliquid?.agentSecret || process.env.HYPERLIQUID_AGENT_SECRET || '',
      testnet: isTestnet,
    };
    this.connector = new HyperliquidConnector(hlConfig);
    this.connectors.set('hyperliquid', this.connector);

    // Initialize multi-exchange connectors
    this.initializeConnectors();

    // Initialize drawdown protection
    this.drawdownGuard = new MaxDrawdownProtection(this.config.capitalAllocation.total);
    this.liquidationGuard = new LiquidationGuard();
    this.mevProtection = new MEVProtection();

    // Initialize auto-compound engine
    this.compounder = new AutoCompoundEngine(this.config.autoCompound);

    // Initialize consensus engine (per-orchestrator instance, not singleton)
    // Each user gets their own consensus engine to prevent config bleed
    this.consensus = new ConsensusEngine({
      enableTrading: this.config.enableTrading,
    });

    // Initialize persistence layer (Supabase + in-memory fallback)
    this.persistence = getAgentPersistence();

    // Initialize session key manager (non-custodial signing)
    this.sessionKeyManager = getSessionKeyManager();

    // Initialize event bus
    this.eventBus = getAgentEventBus();

    // Initialize quant engines (singletons)
    this.marketDataService = getMarketDataService();
    this.orderbookAggregator = getOrderbookAggregator();
    this.fundingTracker = getFundingRateTracker();
    this.liquidationTracker = getLiquidationTracker();
    this.candleStore = getCandleStore();
    this.regimeDetector = getMarketRegimeDetector();
    this.alphaFunding = new FundingArbitrageAlpha();
    this.alphaCascade = new LiquidationCascadeAlpha();
    this.alphaOrderFlow = new OrderFlowImbalanceAlpha();
    this.portfolioManager = getPortfolioManager();
    this.executionService = getOrderExecutionService();

    // Initialize LP engine with defaults
    this.lpEngine = new LPStrategyEngine({
      protocol: 'raydium',
      pair: 'SOL/USDC',
      rangeWidth: 0.05,
      rebalanceThreshold: 0.15,
      feeTier: 0.003,
      maxImpermanentLoss: 0.05,
    });

    // Pre-create strategy engines for configured perp markets
    for (const market of this.config.markets) {
      if (market.type === 'perp' && market.enabled) {
        this.getOrCreateScalpingEngine(market);
        this.getOrCreateMMEngine(market);
      }
    }

    // Load persisted state if resuming
    if (persistenceId) {
      this.configId = persistenceId;
      this.loadPersistedState(persistenceId);
    }
  }

  /**
   * Initialize connectors for all configured exchanges
   */
  private initializeConnectors(): void {
    const exchanges = new Set(this.config.markets.filter(m => m.enabled).map(m => m.exchange));

    for (const exchange of exchanges) {
      if (this.connectors.has(exchange)) continue;

      try {
        const connector = this.createConnector(exchange);
        if (connector) {
          this.connectors.set(exchange, connector);
        }
      } catch {
        // Connector init failure is non-critical
      }
    }
  }

  private createConnector(exchange: string): BaseConnector | null {
    switch (exchange) {
      case 'jupiter':
      case 'raydium':
        return new JupiterConnector({
          name: exchange,
          chain: 'solana',
          testnet: false,
          rpcUrl: this.credentials.solanaRpcUrl || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
          sessionPrivateKey: this.credentials.solanaPrivateKey || process.env.SOLANA_PRIVATE_KEY || undefined,
        });

      case 'uniswap':
        return new UniswapConnector({
          name: 'uniswap',
          chain: 'evm',
          testnet: false,
          rpcUrl: this.credentials.ethRpcUrl || process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
          chainId: parseInt(process.env.ETH_CHAIN_ID || '1'),
          sessionPrivateKey: this.credentials.evmPrivateKey || process.env.EVM_PRIVATE_KEY || undefined,
          oneInchApiKey: this.credentials.oneInchApiKey || process.env.ONEINCH_API_KEY,
        });

      // Alpaca removed (KYC required) - stocks/forex/commodities trade as synth perps on Hyperliquid

      case 'ccxt':
        return null; // Requires specific exchange ID during setup

      default:
        return null;
    }
  }

  /**
   * Get connector for a specific exchange
   */
  getConnector(exchange: string): BaseConnector | HyperliquidConnector | null {
    return this.connectors.get(exchange) || null;
  }

  /**
   * Load state from database for restart recovery
   */
  private async loadPersistedState(configId: string): Promise<void> {
    try {
      const config = await this.persistence.loadConfig(configId);
      if (config) {
        this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
        this.state.config = this.config;
      }

      // Load open trades
      await this.persistence.getOpenTrades(configId);
    } catch (error) {
      console.error('[AgentPersistence] Failed to load persisted state:', error);
    }
  }

  // ========================================================================
  // Lifecycle
  // ========================================================================

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Agent is already running');
    }

    try {
      // Validate configuration
      this.validateConfig();

      // P1: Scale maxPositionSize to 5% of total capital (instead of fixed $250)
      if (this.config.capitalAllocation.total > 0) {
        const scaledMaxPosition = this.config.capitalAllocation.total * 0.05;
        if (scaledMaxPosition > this.config.riskLimits.maxPositionSize) {
          this.config.riskLimits.maxPositionSize = scaledMaxPosition;
        }
      }

      // Connect all configured exchange connectors
      // Validate at least the primary connector (Hyperliquid) connects successfully
      const connectionResults: Array<{ name: string; success: boolean }> = [];
      for (const [name, conn] of this.connectors) {
        try {
          const result = await (conn as any).connect();
          connectionResults.push({ name, success: result !== false });
        } catch {
          connectionResults.push({ name, success: false });
        }
      }

      // If the primary connector (hyperliquid) failed, abort start
      const primaryResult = connectionResults.find(r => r.name === 'hyperliquid');
      if (primaryResult && !primaryResult.success) {
        this.updateStatus('error');
        throw new Error('Failed to connect to Hyperliquid. Check your API credentials (Agent Key / Agent Secret).');
      }

      // Initialize LP execution engine
      this.lpExecutor = new LPExecutionEngine(
        this.connectors as Map<string, BaseConnector>,
        this.lpEngine,
        this.eventBus,
        { maxPositionPct: 0.25, maxILPct: 0.05, maxOutOfRangeMinutes: 120 },
      );

      // Wire LP executor into auto-compound engine
      this.compounder.setLPExecutor(this.lpExecutor);

      // Validate wallet balances against capital allocation
      await this.validateWalletBalances();

      // Wire execution service to primary connector
      this.executionService.setConnectorExecutor(
        async (pair: string, side: 'buy' | 'sell', sizeUSD: number, limitPrice: number) => {
          const coin = pair.replace('-PERP', '').split('/')[0];
          const price = limitPrice > 0 ? limitPrice : await this.connector.getMidPrice(coin);
          if (price <= 0) return { success: false, fillPrice: 0, filledSize: 0, feePaid: 0, latencyMs: 0, error: 'No price available' };
          const coinSize = sizeUSD / price;
          const start = Date.now();
          const result = await this.connector.placeOrder({
            pair, side, price, size: coinSize, type: 'limit',
            clientId: `cypher_exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          });
          return { success: result.success, fillPrice: price, filledSize: result.success ? coinSize : 0, feePaid: 0, latencyMs: Date.now() - start, error: result.error };
        }
      );
      this.executionService.setMidPriceProvider(
        async (pair: string) => {
          const coin = pair.replace('-PERP', '').split('/')[0];
          return this.connector.getMidPrice(coin);
        }
      );

      // Initialize dynamic pair discovery (non-blocking)
      await this.initializeDiscovery();

      // Save config to database
      if (!this.configId) {
        this.configId = await this.persistence.saveConfig(this.config, this.userId);
      }

      // Reconcile positions: check exchange for orphaned positions from previous session
      await this.reconcilePositions();

      // Initialize LP positions for configured LP markets with no existing positions
      await this.initializeLPPositions();

      this.updateStatus('active');
      this.isRunning = true;
      this.state.startedAt = Date.now();

      // Start main trading loop (every 5 seconds)
      this.mainLoopInterval = setInterval(() => this.mainLoop(), 5000);

      // Start auto-compound if enabled
      if (this.config.autoCompound.enabled) {
        this.compoundInterval = setInterval(
          () => this.runAutoCompound(),
          this.config.autoCompound.intervalMs
        );
      }

      this.emit('agent_started', { timestamp: Date.now() });
    } catch (error) {
      this.updateStatus('error');
      this.addError('Failed to start agent', 'orchestrator');
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.updateStatus('off');

    if (this.mainLoopInterval) {
      clearInterval(this.mainLoopInterval);
      this.mainLoopInterval = null;
    }

    if (this.compoundInterval) {
      clearInterval(this.compoundInterval);
      this.compoundInterval = null;
    }

    // Cleanup discovery and WS bridge
    if (this.discovery) {
      this.discovery.stop();
      this.discovery = null;
    }
    if (this.wsBridge) {
      this.wsBridge.disconnect();
      this.wsBridge = null;
    }

    // Close all open positions and cancel pending orders on stop
    try {
      await this.closeAllPositions('agent_stopped');
      await this.cancelAllOrders();
    } catch (error) {
      this.addError(`Failed to close positions on stop: ${error instanceof Error ? error.message : 'Unknown'}`, 'orchestrator');
    }

    // Cleanup quant engines: cancel active TWAP/VWAP orders
    this.executionService.stop();

    this.emit('agent_stopped', { timestamp: Date.now() });
  }

  async pause(): Promise<void> {
    this.isRunning = false;
    this.updateStatus('paused');
    this.emit('agent_paused', { timestamp: Date.now() });
  }

  async resume(): Promise<void> {
    if (this.state.status !== 'paused') {
      throw new Error('Agent is not paused');
    }
    this.isRunning = true;
    this.updateStatus('active');
    this.emit('agent_resumed', { timestamp: Date.now() });
  }

  async emergencyStop(): Promise<void> {
    this.isRunning = false;
    this.updateStatus('emergency_stop');

    // Audit log: emergency stop
    await this.persistence.recordAuditEvent('EMERGENCY_STOP', {
      openPositions: this.state.positions.length,
      positions: this.state.positions.map(p => ({ pair: p.pair, size: p.size, direction: p.direction })),
    });

    // Close all positions via connector
    await this.closeAllPositions('emergency_stop');

    // Cancel all open orders via connector
    await this.cancelAllOrders();

    this.emit('emergency_stop', { timestamp: Date.now() });
  }

  // ========================================================================
  // Main Loop
  // ========================================================================

  private async mainLoop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // 1. Update positions and PnL from exchange
      await this.updatePositions();

      // 2. Feed quant engines with market data
      await this.feedQuantEngines();

      // 2b. Update drawdown guard with current equity
      const equity = this.calculateCurrentEquity();
      this.drawdownGuard.updateEquity(equity);

      // 2c. Update portfolio manager with positions and equity
      this.portfolioManager.updateState(equity, this.state.positions);

      // 3. Check risk limits
      const riskCheck = await this.checkRiskLimits();
      if (riskCheck.shouldShutdown) {
        await this.emergencyStop();
        return;
      }
      if (riskCheck.shouldCloseAll) {
        await this.closeAllPositions('drawdown_limit');
        return;
      }
      if (riskCheck.shouldPause) {
        await this.pause();
        this.emit('risk_pause', riskCheck);
        return;
      }

      // 3b. Check positions for liquidation risk
      if (this.state.positions.length > 0) {
        const liqResults = await this.liquidationGuard.checkPositions(this.state.positions);
        for (const result of liqResults) {
          if (result.action === 'close') {
            this.addError(`LIQUIDATION GUARD: Emergency close ${result.position.pair} - ${result.message}`, 'liquidation_guard');
            await this.closePosition(result.position, 'liquidation_risk');
          } else if (result.action === 'reduce') {
            this.addError(`LIQUIDATION GUARD: Reducing ${result.position.pair} - ${result.message}`, 'liquidation_guard');
            await this.reducePosition(result.position, 0.5, 'liquidation_risk');
          }
        }
      }

      // 4. Run strategies
      await this.runStrategies();

      // 5. Update performance metrics
      this.updatePerformance();

      // 6. Save equity snapshot every ~60 cycles (5 minutes)
      this.equitySnapshotCounter++;
      if (this.equitySnapshotCounter >= 60 && this.configId) {
        this.equitySnapshotCounter = 0;
        const equity = this.calculateCurrentEquity();
        const unrealizedPnl = this.state.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
        await this.persistence.saveEquitySnapshot(this.configId, {
          equity,
          realized_pnl: this.realizedPnl,
          unrealized_pnl: unrealizedPnl,
          positions_count: this.state.positions.length,
          drawdown: this.drawdownGuard.getCurrentDrawdown(),
        });
      }

      // 7. Update uptime
      if (this.state.startedAt) {
        this.state.uptime = Date.now() - this.state.startedAt;
      }
    } catch (error) {
      console.error('[AgentOrchestrator] Main loop error:', error);
      this.addError(
        error instanceof Error ? error.message : 'Unknown main loop error',
        'main_loop'
      );
    }
  }

  // ========================================================================
  // Strategy Execution
  // ========================================================================

  private async runStrategies(): Promise<void> {
    // Run alpha signal generation across all markets
    await this.runAlphaSignals();

    // Snapshot enabled markets to avoid mutation during iteration
    const enabledMarkets = [...this.config.markets.filter(m => m.enabled)];

    for (const market of enabledMarkets) {
      try {
        // Concentration check: skip new trades if > 20% of portfolio in this pair
        if (this.isOverConcentrated(market.pair)) continue;

        switch (market.type) {
          case 'lp':
            await this.runLPStrategy(market);
            break;
          case 'perp':
            await this.runScalpingStrategy(market);
            await this.runMMStrategy(market);
            // Run IPO strategy on newly listed perps (< 24h old)
            if (market.discoveredAt && (Date.now() - market.discoveredAt) < 24 * 3_600_000) {
              await this.runIPOStrategy(market);
            }
            break;
          case 'spot':
            await this.runSpotStrategy(market);
            break;
        }
      } catch (error) {
        console.error(`[AgentOrchestrator] Strategy error for ${market.pair}:`, error);
        this.addError(
          `Strategy error for ${market.pair}: ${error instanceof Error ? error.message : 'Unknown'}`,
          'strategy'
        );
      }
    }
  }

  /**
   * Check if portfolio is over-concentrated in a single pair.
   * Uses PortfolioManager for correlation-aware concentration limits.
   */
  private isOverConcentrated(pair: string): boolean {
    const equity = this.calculateCurrentEquity();
    if (equity <= 0) return false;

    // Use portfolio manager's state if available
    const portfolioState = this.portfolioManager.getState();
    if (portfolioState) {
      const pairPosition = portfolioState.positions.find(p => p.pair === pair);
      if (pairPosition) {
        return pairPosition.weight > 0.20; // 20% max per-pair
      }
    }

    // Fallback: simple notional check
    const pairExposure = this.state.positions
      .filter(p => p.pair === pair)
      .reduce((sum, p) => sum + Math.abs(p.size * p.currentPrice), 0);

    return pairExposure / equity > 0.20;
  }

  /**
   * Scalping: Fetch candles, run SMC analysis, submit to consensus engine,
   * execute only if approved by multi-agent vote.
   */
  private async runScalpingStrategy(market: MarketConfig): Promise<void> {
    const engine = this.getOrCreateScalpingEngine(market);
    const connector = this.connectors.get(market.exchange) || this.connector;

    // Fetch real candle data from the market's exchange
    const candles = await (connector as any).getCandles(market.pair, '5m', 100);
    if (candles.length < 30) {
      return; // Not enough data for analysis
    }

    const signal = await engine.scanForEntry(candles);
    if (!signal) return;

    // Only submit high-confidence signals to consensus
    if (signal.confidence < 0.60) return;

    // Check if we already have a position in this pair for this strategy
    const existingPosition = this.state.positions.find(
      p => p.pair === market.pair && p.strategy === 'scalp'
    );
    if (existingPosition) return;

    // Submit to consensus engine for multi-agent evaluation
    const proposal: TradeProposal = {
      pair: signal.pair,
      exchange: market.exchange,
      direction: signal.direction,
      entry: signal.entry,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      positionSizeUSD: Math.min(signal.positionSize, this.config.riskLimits.maxPositionSize),
      leverage: Math.min(signal.leverage, this.config.riskLimits.maxLeverage),
      strategy: 'scalp',
      confidence: signal.confidence,
    };

    const consensusResult = await this.consensus.evaluateProposal(
      proposal,
      candles,
      signal.smcContext,
      {
        totalEquity: this.calculateCurrentEquity(),
        openPositions: this.state.positions,
        performance: this.state.performance,
        riskLimits: this.config.riskLimits,
      }
    );

    if (!consensusResult.approved) {
      this.emit('consensus_rejected', {
        pair: market.pair,
        reason: consensusResult.reasoning,
        votes: consensusResult.votes,
        timestamp: Date.now(),
      });
      // Persist rejected decisions (observation mode visibility)
      if (this.configId) {
        this.persistence.recordConsensusDecision({
          agent_config_id: this.configId,
          pair: market.pair,
          proposal,
          votes: consensusResult.votes,
          result: consensusResult,
          approved: false,
          executed: false,
        }).catch(() => {}); // non-critical
      }
      return;
    }

    // Update signal with consensus-adjusted size
    signal.positionSize = consensusResult.positionSize;

    // Execute the trade
    await this.executeSignal(signal, connector);

    // Persist approved consensus decision
    if (this.configId) {
      this.persistence.recordConsensusDecision({
        agent_config_id: this.configId,
        pair: market.pair,
        proposal,
        votes: consensusResult.votes,
        result: consensusResult,
        approved: true,
        executed: true,
      }).catch(() => {}); // non-critical
    }
  }

  /**
   * Market Making: Fetch mid price, calculate volatility from recent candles,
   * generate quotes, and place bid/ask orders.
   */
  private async runMMStrategy(market: MarketConfig): Promise<void> {
    const engine = this.getOrCreateMMEngine(market);
    const connector = this.connectors.get(market.exchange) || this.connector;
    const coin = market.pair.replace('-PERP', '');

    // Fetch mid price from the market's exchange connector
    const midPrice = await (connector as any).getMidPrice(coin);
    if (midPrice <= 0) return;

    // Fetch recent candles to estimate volatility
    const candles = await (connector as any).getCandles(market.pair, '5m', 20);
    const volatility = this.estimateVolatility(candles);

    // Generate quotes
    const quote = engine.generateQuotes(midPrice, volatility);

    // Check inventory skew and rebalance if needed
    if (engine.shouldRebalance()) {
      engine.resetInventory();
    }

    // Emit quote events
    this.emit('mm_quotes', {
      pair: market.pair,
      exchange: market.exchange,
      bid: quote.bidPrice,
      ask: quote.askPrice,
      bidSize: quote.bidSize,
      askSize: quote.askSize,
      spread: ((quote.askPrice - quote.bidPrice) / midPrice * 10000).toFixed(1) + 'bps',
      timestamp: Date.now(),
    });

    // Place the actual orders if connector is connected
    const isConnected = 'isConnected' in connector
      ? (connector as HyperliquidConnector).isConnected()
      : true; // BaseConnector subclasses are connected after connect()

    if (isConnected) {
      // Cancel previous MM orders before placing new ones to prevent order leak
      const prevOrders = this.mmActiveOrders.get(market.pair);
      if (prevOrders && prevOrders.length > 0 && 'cancelOrder' in connector) {
        for (const oid of prevOrders) {
          try {
            await (connector as any).cancelOrder(market.pair, oid);
          } catch { /* best effort cancel */ }
        }
      }
      const newOrderIds: string[] = [];

      // Place bid
      const bidResult = await (connector as any).placeOrder({
        pair: market.pair,
        side: 'buy',
        price: quote.bidPrice,
        size: quote.bidSize / midPrice, // convert USD to coin size
        type: 'limit',
        postOnly: true,
        clientId: `cypher_mm_bid_${market.pair}_${Date.now()}`,
      });
      if (bidResult.success) {
        if (bidResult.orderId) newOrderIds.push(bidResult.orderId);
      }

      // Place ask
      const askResult = await (connector as any).placeOrder({
        pair: market.pair,
        side: 'sell',
        price: quote.askPrice,
        size: quote.askSize / midPrice,
        type: 'limit',
        postOnly: true,
        clientId: `cypher_mm_ask_${market.pair}_${Date.now()}`,
      });
      if (askResult.success) {
        if (askResult.orderId) newOrderIds.push(askResult.orderId);
      }

      // Track active MM orders for next cycle cancellation
      this.mmActiveOrders.set(market.pair, newOrderIds);
    }
  }

  /**
   * Spot/Synth Strategy: For stocks, forex, commodities as synth perps on Hyperliquid.
   * Uses same consensus engine as scalping but with specific parameters per asset class.
   */
  private async runSpotStrategy(market: MarketConfig): Promise<void> {
    // All assets now route through Hyperliquid synth perps (no KYC)
    const connector = this.connectors.get(market.exchange) || this.connectors.get('hyperliquid');
    if (!connector) return;

    // Use the scalping engine for analysis (same TA logic)
    const engine = this.getOrCreateScalpingEngine(market);
    const candles = await (connector as any).getCandles(market.pair, '1h', 100);
    if (candles.length < 30) return;

    const signal = await engine.scanForEntry(candles);
    if (!signal || signal.confidence < 0.65) return;

    // Synth perps can use leverage (lower for non-crypto)
    signal.leverage = market.assetClass === 'crypto' ? this.config.riskLimits.maxLeverage : Math.min(3, this.config.riskLimits.maxLeverage);
    signal.exchange = market.exchange;

    const proposal: TradeProposal = {
      pair: signal.pair,
      exchange: market.exchange,
      direction: signal.direction,
      entry: signal.entry,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      positionSizeUSD: Math.min(signal.positionSize, market.maxPositionUSD || this.config.riskLimits.maxPositionSize),
      leverage: Math.min(signal.leverage, this.config.riskLimits.maxLeverage),
      strategy: 'scalp',
      confidence: signal.confidence,
    };

    const consensusResult = await this.consensus.evaluateProposal(
      proposal, candles, signal.smcContext,
      {
        totalEquity: this.calculateCurrentEquity(),
        openPositions: this.state.positions,
        performance: this.state.performance,
        riskLimits: this.config.riskLimits,
      }
    );

    if (!consensusResult.approved) {
      // Persist rejected decisions for observation mode visibility
      if (this.configId) {
        this.persistence.recordConsensusDecision({
          agent_config_id: this.configId,
          pair: market.pair,
          proposal,
          votes: consensusResult.votes,
          result: consensusResult,
          approved: false,
          executed: false,
        }).catch(() => {}); // non-critical
      }
      return;
    }
    signal.positionSize = consensusResult.positionSize;

    await this.executeSignal(signal, connector as any);

    // Persist approved consensus decision
    if (this.configId) {
      this.persistence.recordConsensusDecision({
        agent_config_id: this.configId,
        pair: market.pair,
        proposal,
        votes: consensusResult.votes,
        result: consensusResult,
        approved: true,
        executed: true,
      }).catch(() => {}); // non-critical
    }
  }

  /**
   * LP Strategy: Monitor existing LP positions and execute rebalance/withdraw/compound.
   */
  private async runLPStrategy(market: MarketConfig): Promise<void> {
    const connector = this.connectors.get(market.exchange) || this.connector;
    const coin = market.pair.split('/')[0]; // e.g. SOL from SOL/USDC

    // Get current price from the LP pair's exchange
    const midPrice = await (connector as any).getMidPrice(coin);
    if (midPrice <= 0) return;

    // Monitor each LP position and execute actions
    const positionsToRemove: string[] = [];

    for (const lpPos of this.state.lpPositions) {
      if (lpPos.pair !== market.pair) continue;

      const result = this.lpEngine.monitorPosition(lpPos, midPrice);

      this.emit('lp_monitor', {
        pair: market.pair,
        exchange: market.exchange,
        action: result.action,
        reason: result.reason,
        currentPrice: midPrice,
        timestamp: Date.now(),
      });

      // Update in-range status
      lpPos.inRange = midPrice >= lpPos.tickLower && midPrice <= lpPos.tickUpper;

      // Check risk-based closure
      if (this.lpExecutor) {
        const riskCheck = this.lpExecutor.shouldClosePosition(lpPos, midPrice);
        if (riskCheck.close) {
          const closed = await this.lpExecutor.closePosition(lpPos, riskCheck.reason);
          if (closed) positionsToRemove.push(lpPos.id);
          continue;
        }
      }

      if (result.action === 'rebalance' && this.lpExecutor) {
        const candles = await (connector as any).getCandles(market.pair, '1h', 50);
        const vol = this.estimateVolatility(candles);

        const newPosition = await this.lpExecutor.rebalancePosition(
          lpPos,
          { pair: market.pair, exchange: market.exchange },
          midPrice,
          vol,
        );

        if (newPosition) {
          positionsToRemove.push(lpPos.id);
          this.state.lpPositions.push(newPosition);
        }
      } else if (result.action === 'withdraw' && this.lpExecutor) {
        const closed = await this.lpExecutor.closePosition(lpPos, result.reason);
        if (closed) positionsToRemove.push(lpPos.id);
      } else if (result.action === 'compound' && this.lpExecutor) {
        await this.lpExecutor.reinvestFees(lpPos);
      }
    }

    // Remove closed/rebalanced positions from state
    if (positionsToRemove.length > 0) {
      this.state.lpPositions = this.state.lpPositions.filter(
        lp => !positionsToRemove.includes(lp.id)
      );
    }

    // Sync on-chain LP positions with state
    if ('getLPPositions' in connector) {
      try {
        const onChainPositions = await (connector as any).getLPPositions();
        for (const onChainPos of onChainPositions || []) {
          const exists = this.state.lpPositions.find(lp => lp.id === onChainPos.id);
          if (!exists) {
            this.state.lpPositions.push(onChainPos);
          }
        }
      } catch {
        // LP position fetching is optional
      }
    }
  }

  // ========================================================================
  // Trade Execution
  // ========================================================================

  private async executeSignal(signal: TradeSignal, connector?: BaseConnector | HyperliquidConnector): Promise<void> {
    // Idempotency check: prevent duplicate execution of same signal
    const dedupKey = `${signal.pair}_${signal.direction}_${signal.strategy}_${signal.id || Date.now().toString(36)}`;

    // SECURITY FIX: Acquire execution lock (mutex) to prevent race conditions.
    // Two identical signals in the same event loop tick would both pass dedup without this.
    const existingLock = this.executionLock.get(dedupKey);
    if (existingLock) {
      await existingLock; // Wait for previous execution to complete
    }

    // Check dedup AFTER acquiring lock
    const lastExecution = this.orderDedupCache.get(dedupKey);
    if (lastExecution && Date.now() - lastExecution < this.DEDUP_WINDOW_MS) {
      this.addError(`Dedup: Signal ${dedupKey} already executed ${Math.floor((Date.now() - lastExecution) / 1000)}s ago, skipping`, 'execution');
      return;
    }

    // Create lock promise for this execution
    let releaseLock: () => void;
    const lockPromise = new Promise<void>(resolve => { releaseLock = resolve; });
    this.executionLock.set(dedupKey, lockPromise);

    try {
      this.orderDedupCache.set(dedupKey, Date.now());

    // Clean expired dedup entries (also clean execution locks)
    if (this.orderDedupCache.size > 500) {
      const now = Date.now();
      for (const [key, ts] of this.orderDedupCache) {
        if (now - ts > this.DEDUP_WINDOW_MS) {
          this.orderDedupCache.delete(key);
          this.executionLock.delete(key);
        }
      }
    }

    const activeConnector = connector || this.connectors.get(signal.exchange) || this.connector;
    // Check session key permissions if using delegated mode
    if (this.config.mode === 'delegated') {
      const sessionKeys = this.sessionKeyManager.getActiveKeys('');
      if (sessionKeys.length > 0) {
        const check = await this.sessionKeyManager.checkTradeAllowed(
          sessionKeys[0].id,
          signal.pair,
          signal.positionSize
        );
        if (!check.allowed) {
          this.addError(`Session key rejected: ${check.reason}`, 'execution');
          return;
        }
      }
    }

    // Set leverage before placing order (only for perps)
    if ('setLeverage' in activeConnector) {
      await (activeConnector as HyperliquidConnector).setLeverage(
        signal.pair,
        Math.min(signal.leverage, this.config.riskLimits.maxLeverage)
      );
    }

    const coin = signal.pair.replace('-PERP', '').split('/')[0];
    const midPrice = await (activeConnector as any).getMidPrice(coin);
    if (midPrice <= 0) {
      this.addError(`Cannot execute signal: no mid price for ${signal.pair}`, 'execution');
      return;
    }

    const coinSize = signal.positionSize / midPrice;
    const baseClientId = `cypher_${signal.strategy}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // MEV Protection: check if order needs splitting for large orders on DEX chains
    const network = signal.exchange === 'jupiter' ? 'solana'
      : signal.exchange === 'uniswap' ? 'ethereum'
      : signal.exchange;
    const orderForMEV = { id: baseClientId, pair: signal.pair, size: coinSize, price: midPrice, side: signal.direction === 'long' ? 'buy' as const : 'sell' as const, clientId: baseClientId };
    const mevStrategy = this.mevProtection.getExecutionStrategy(signal.positionSize, network);

    let result: any;
    if (mevStrategy.chunks > 1) {
      // Split large order into chunks with delay between them
      const chunks = this.mevProtection.splitLargeOrder(orderForMEV as any);
      this.emit('mev_protection', { pair: signal.pair, chunks: chunks.length, strategy: mevStrategy.method });

      result = { success: true }; // Track overall success
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkResult = await (activeConnector as any).placeOrder({
          pair: signal.pair,
          side: signal.direction === 'long' ? 'buy' : 'sell',
          price: midPrice,
          size: chunk.size,
          type: 'limit',
          clientId: `${baseClientId}_chunk_${i}`,
        });
        if (!chunkResult.success) {
          result = chunkResult;
          this.addError(`MEV chunk ${i + 1}/${chunks.length} failed for ${signal.pair}: ${chunkResult.error}`, 'execution');
          break;
        }
        // Delay between chunks to avoid detection
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, mevStrategy.delayMs));
        }
      }
    } else {
      // Single order - no MEV splitting needed
      result = await (activeConnector as any).placeOrder({
        pair: signal.pair,
        side: signal.direction === 'long' ? 'buy' : 'sell',
        price: midPrice,
        size: coinSize,
        type: 'limit',
        clientId: baseClientId,
      });
    }

    if (result.success) {
      // Place stop-loss order on exchange (CRITICAL: actual risk protection)
      // SECURITY FIX: Using 'stop' type instead of 'limit'.
      // Limit stop-loss orders do NOT trigger in gap-down scenarios (flash crash).
      // Stop orders trigger at market when stop price is hit, ensuring execution.
      if (signal.stopLoss && signal.stopLoss > 0) {
        try {
          const slSide = signal.direction === 'long' ? 'sell' : 'buy';
          const slClientId = `cypher_sl_${Date.now()}_${require('crypto').randomBytes(4).toString('hex')}`;

          // Try stop-market order first (best for crash protection)
          try {
            await (activeConnector as any).placeOrder({
              pair: signal.pair,
              side: slSide,
              price: signal.stopLoss,
              size: coinSize,
              type: 'stop',       // STOP order - triggers at market when price hits stopLoss
              triggerPrice: signal.stopLoss,
              reduceOnly: true,
              clientId: slClientId,
            });
          } catch (stopErr) {
            // Fallback: some connectors may not support 'stop' type - use 'stop_limit'
            console.warn(`[AgentOrchestrator] Stop-market not supported, falling back to stop-limit: ${(stopErr as Error).message}`);
            await (activeConnector as any).placeOrder({
              pair: signal.pair,
              side: slSide,
              price: signal.stopLoss,
              size: coinSize,
              type: 'stop_limit',
              triggerPrice: signal.stopLoss,
              reduceOnly: true,
              clientId: slClientId,
            });
          }

          this.emit('stop_loss_placed', { pair: signal.pair, stopLoss: signal.stopLoss, orderType: 'stop' });
        } catch (slError) {
          this.addError(`CRITICAL: Failed to place stop-loss for ${signal.pair} at ${signal.stopLoss}: ${slError instanceof Error ? slError.message : 'Unknown'}`, 'execution');
          // Emit critical alert - position has NO stop-loss protection
          this.emit('stop_loss_failed', { pair: signal.pair, stopLoss: signal.stopLoss, error: slError });
        }
      }

      // Place take-profit order on exchange
      if (signal.takeProfit) {
        const tpTargets = Array.isArray(signal.takeProfit) ? signal.takeProfit : [signal.takeProfit];
        const tpSide = signal.direction === 'long' ? 'sell' : 'buy';
        const tpSizePerTarget = coinSize / tpTargets.length;
        for (const tp of tpTargets) {
          if (tp && tp > 0) {
            try {
              await (activeConnector as any).placeOrder({
                pair: signal.pair,
                side: tpSide,
                price: tp,
                size: tpSizePerTarget,
                type: 'limit',
                reduceOnly: true,
                clientId: `cypher_tp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              });
            } catch (tpError) {
              this.addError(`Failed to place take-profit for ${signal.pair} at ${tp}: ${tpError instanceof Error ? tpError.message : 'Unknown'}`, 'execution');
            }
          }
        }
      }

      // Add to recent trades
      this.state.recentTrades.unshift(signal);
      if (this.state.recentTrades.length > 50) {
        this.state.recentTrades = this.state.recentTrades.slice(0, 50);
      }

      // Track in trade history (bounded to last 1000 trades)
      this.tradeHistory.push({ ...signal, executedAt: Date.now() });
      if (this.tradeHistory.length > 1000) {
        this.tradeHistory = this.tradeHistory.slice(-1000);
      }

      // Audit log: trade execution
      await this.persistence.recordAuditEvent('TRADE_EXECUTED', {
        pair: signal.pair, exchange: signal.exchange, direction: signal.direction,
        strategy: signal.strategy, entryPrice: midPrice, positionSize: signal.positionSize,
        leverage: signal.leverage, stopLoss: signal.stopLoss,
        mevChunks: mevStrategy.chunks, mevMethod: mevStrategy.method,
        txHash: result.txHash || result.orderId,
      });

      // Persist trade to database
      if (this.configId) {
        await this.persistence.recordTrade({
          agent_config_id: this.configId,
          signal_id: signal.id,
          pair: signal.pair,
          exchange: signal.exchange,
          direction: signal.direction,
          strategy: signal.strategy,
          entry_price: midPrice,
          position_size_usd: signal.positionSize,
          leverage: signal.leverage,
          stop_loss: signal.stopLoss,
          take_profit: signal.takeProfit,
          confidence: signal.confidence,
          reason: signal.reason,
          smc_context: signal.smcContext,
          status: 'open',
          tx_hash_open: result.txHash || result.orderId,
        });
      }

      // Record spend against session key
      if (this.config.mode === 'delegated') {
        const sessionKeys = this.sessionKeyManager.getActiveKeys('');
        if (sessionKeys.length > 0) {
          await this.sessionKeyManager.recordSpend(sessionKeys[0].id, signal.positionSize);
        }
      }

      // Update performance stats
      this.state.performance.totalTrades++;

      // Emit via both legacy event system and new event bus
      this.emit('trade_executed', {
        signal,
        orderId: result.orderId,
        txHash: result.txHash,
        timestamp: Date.now(),
      });

      this.eventBus.publish({
        type: 'execution_report',
        source: 'AgentOrchestrator',
        data: { signal, orderId: result.orderId, txHash: result.txHash },
        timestamp: Date.now(),
        priority: 'high',
      });
    } else {
      // Audit log: trade failure
      await this.persistence.recordAuditEvent('TRADE_FAILED', {
        pair: signal.pair, exchange: signal.exchange, direction: signal.direction,
        strategy: signal.strategy, positionSize: signal.positionSize,
        error: result.error || 'Unknown',
      });
      this.addError(
        `Order failed for ${signal.pair}: ${result.error}`,
        'execution'
      );
    }
    } finally {
      // ALWAYS release the execution lock — AFTER all execution is complete
      releaseLock!();
      this.executionLock.delete(dedupKey);
    }
  }

  // ========================================================================
  // Risk Management
  // ========================================================================

  private async checkRiskLimits(): Promise<{
    shouldPause: boolean;
    shouldCloseAll: boolean;
    shouldShutdown: boolean;
    currentDrawdown: number;
    reason?: string;
  }> {
    const { riskLimits } = this.config;
    const currentDrawdown = this.drawdownGuard.getCurrentDrawdown();

    // Also check daily loss
    const dailyPnl = this.drawdownGuard.getDailyPnL();
    const totalCapital = this.config.capitalAllocation.total;
    const dailyLossPercent = totalCapital > 0 ? Math.abs(Math.min(0, dailyPnl)) / totalCapital : 0;

    if (currentDrawdown >= riskLimits.shutdownOnDrawdown) {
      return {
        shouldPause: false,
        shouldCloseAll: true,
        shouldShutdown: true,
        currentDrawdown,
        reason: `Drawdown ${(currentDrawdown * 100).toFixed(1)}% exceeds shutdown threshold ${(riskLimits.shutdownOnDrawdown * 100).toFixed(1)}%`,
      };
    }

    if (currentDrawdown >= riskLimits.closeAllOnDrawdown) {
      return {
        shouldPause: false,
        shouldCloseAll: true,
        shouldShutdown: false,
        currentDrawdown,
        reason: `Drawdown ${(currentDrawdown * 100).toFixed(1)}% exceeds close-all threshold`,
      };
    }

    if (currentDrawdown >= riskLimits.pauseOnDrawdown || dailyLossPercent >= riskLimits.maxDailyDrawdown) {
      return {
        shouldPause: true,
        shouldCloseAll: false,
        shouldShutdown: false,
        currentDrawdown,
        reason: dailyLossPercent >= riskLimits.maxDailyDrawdown
          ? `Daily loss ${(dailyLossPercent * 100).toFixed(1)}% exceeds daily limit`
          : `Drawdown ${(currentDrawdown * 100).toFixed(1)}% exceeds pause threshold`,
      };
    }

    return {
      shouldPause: false,
      shouldCloseAll: false,
      shouldShutdown: false,
      currentDrawdown,
    };
  }

  // ========================================================================
  // Position Management
  // ========================================================================

  private async updatePositions(): Promise<void> {
    try {
      const allPositions: Position[] = [];

      // Fetch positions from all connected exchanges
      for (const [name, conn] of this.connectors) {
        try {
          const positions = await (conn as any).getPositions();
          if (Array.isArray(positions)) {
            // Tag each position with its exchange
            for (const pos of positions) {
              pos.exchange = pos.exchange || name;
            }
            allPositions.push(...positions);
          }
        } catch (error) {
          console.error(`[AgentOrchestrator] Failed to update positions from ${name}:`, error);
        }
      }

      this.state.positions = allPositions;
    } catch (error) {
      console.error('[AgentOrchestrator] Failed to update positions:', error);
    }
  }

  /**
   * Reconcile positions on startup: check exchange for orphaned positions
   * and re-apply stop-loss orders if missing.
   */
  private async reconcilePositions(): Promise<void> {
    try {
      // Fetch actual positions from each connected exchange
      for (const [name, conn] of this.connectors) {
        try {
          const exchangePositions = await (conn as any).getPositions();
          if (!Array.isArray(exchangePositions) || exchangePositions.length === 0) continue;

          // Fetch open orders ONCE per connector (not per position)
          const openOrders = await (conn as any).getOpenOrders?.() || [];

          for (const pos of exchangePositions) {
            // Check if we already track this position
            const tracked = this.state.positions.find(
              p => p.pair === pos.pair && p.exchange === name
            );

            if (!tracked) {
              // Orphaned position found - add to state and log warning
              this.addError(
                `RECONCILIATION: Found orphaned position ${pos.pair} on ${name} (size: ${pos.size}). Adding to tracking.`,
                'reconciliation'
              );
              this.state.positions.push({ ...pos, exchange: name });
            }

            // Check if position has stop-loss protection
            // Detect SL by: clientId pattern (cypher_sl_ or cypher_recovery_sl_) OR stop/stop_limit order type on same pair
            const hasSL = openOrders.some(
              (o: any) => o.pair === pos.pair && (
                (o.clientId && (o.clientId.startsWith('cypher_sl_') || o.clientId.startsWith('cypher_recovery_sl_'))) ||
                (o.type === 'stop' || o.type === 'stop_limit' || o.type === 'stop-market')
              )
            );

            if (!hasSL && pos.size > 0) {
              // No stop-loss found - place emergency SL at 5% from current price
              const midPrice = await (conn as any).getMidPrice(
                pos.pair.replace('-PERP', '').split('/')[0]
              );
              if (midPrice > 0) {
                const emergencySL = pos.direction === 'long'
                  ? midPrice * 0.95  // 5% below for longs
                  : midPrice * 1.05; // 5% above for shorts
                const slSide = pos.direction === 'long' ? 'sell' : 'buy';
                try {
                  try {
                    await (conn as any).placeOrder({
                      pair: pos.pair,
                      side: slSide,
                      price: emergencySL,
                      size: pos.size,
                      type: 'stop',
                      triggerPrice: emergencySL,
                      reduceOnly: true,
                      clientId: `cypher_recovery_sl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    });
                  } catch {
                    // Fallback to stop_limit if connector doesn't support stop-market
                    await (conn as any).placeOrder({
                      pair: pos.pair,
                      side: slSide,
                      price: emergencySL,
                      size: pos.size,
                      type: 'stop_limit',
                      triggerPrice: emergencySL,
                      reduceOnly: true,
                      clientId: `cypher_recovery_sl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    });
                  }
                  this.addError(
                    `RECONCILIATION: Placed emergency SL for ${pos.pair} at ${emergencySL.toFixed(2)}`,
                    'reconciliation'
                  );
                } catch (slErr) {
                  this.addError(
                    `RECONCILIATION CRITICAL: Failed to place emergency SL for ${pos.pair}`,
                    'reconciliation'
                  );
                }
              }
            }
          }
        } catch (err) {
          console.error(`[AgentOrchestrator] Reconciliation failed for ${name}:`, err);
        }
      }
    } catch (error) {
      console.error('[AgentOrchestrator] Position reconciliation error:', error);
      this.addError('Position reconciliation failed on startup', 'reconciliation');
    }
  }

  /**
   * Initialize LP positions for configured LP markets that have no existing positions.
   * Called once at agent start.
   */
  private async initializeLPPositions(): Promise<void> {
    if (!this.lpExecutor) return;

    const lpMarkets = this.config.markets.filter(m => m.type === 'lp' && m.enabled);
    if (lpMarkets.length === 0) return;

    const { capitalAllocation } = this.config;
    const totalLPCapital = capitalAllocation.total * capitalAllocation.lp;
    if (totalLPCapital <= 0) return;

    for (const market of lpMarkets) {
      try {
        // Skip if we already have a position for this pair
        const existingPos = this.state.lpPositions.find(lp => lp.pair === market.pair);
        if (existingPos) continue;

        const connector = this.connectors.get(market.exchange);
        if (!connector) continue;

        const coin = market.pair.split('/')[0];
        const midPrice = await (connector as any).getMidPrice(coin);
        if (midPrice <= 0) continue;

        const candles = await (connector as any).getCandles(market.pair, '1h', 50);
        const volatility = this.estimateVolatility(candles);

        const positionSize = this.lpExecutor.calculatePositionSize(
          totalLPCapital,
          this.state.lpPositions,
        );
        if (positionSize < 10) continue; // min $10

        const newPosition = await this.lpExecutor.openPosition(
          { pair: market.pair, exchange: market.exchange },
          positionSize,
          midPrice,
          volatility,
        );

        if (newPosition) {
          this.state.lpPositions.push(newPosition);
          this.emit('lp_position_initialized', {
            pair: market.pair,
            positionId: newPosition.id,
            capitalUSD: positionSize,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error(`[AgentOrchestrator] Failed to initialize LP for ${market.pair}:`, error);
      }
    }
  }

  private async closePosition(position: Position, reason: string): Promise<void> {
    try {
      const connector = this.connectors.get(position.exchange) || this.connector;
      await (connector as any).closePosition(position.pair, position.size, position.direction);
      this.state.positions = this.state.positions.filter(p => p.pair !== position.pair || p.exchange !== position.exchange);
      this.emit('position_closed', { pair: position.pair, reason, timestamp: Date.now() });
    } catch (error) {
      console.error(`[AgentOrchestrator] Failed to close position ${position.pair}:`, error);
      this.addError(`Failed to close ${position.pair}: ${error instanceof Error ? error.message : 'Unknown'}`, 'liquidation_guard');
    }
  }

  private async reducePosition(position: Position, reduceBy: number, reason: string): Promise<void> {
    try {
      const connector = this.connectors.get(position.exchange) || this.connector;
      const reduceSize = position.size * reduceBy;
      const side = position.direction === 'long' ? 'sell' : 'buy';
      const midPrice = await (connector as any).getMidPrice(position.pair.replace('-PERP', '').split('/')[0]);
      if (midPrice > 0) {
        await (connector as any).placeOrder({
          pair: position.pair,
          side,
          price: midPrice,
          size: reduceSize,
          type: 'limit',
          reduceOnly: true,
          clientId: `cypher_reduce_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        });
        this.emit('position_reduced', { pair: position.pair, reduceBy, reason, timestamp: Date.now() });
      }
    } catch (error) {
      console.error(`[AgentOrchestrator] Failed to reduce position ${position.pair}:`, error);
      this.addError(`Failed to reduce ${position.pair}: ${error instanceof Error ? error.message : 'Unknown'}`, 'liquidation_guard');
    }
  }

  private async closeAllPositions(reason: string): Promise<void> {
    // Close each perp/spot position via its exchange's connector
    for (const pos of this.state.positions) {
      try {
        const connector = this.connectors.get(pos.exchange) || this.connector;
        await (connector as any).closePosition(pos.pair, pos.size, pos.direction);
      } catch (error) {
        console.error(`[AgentOrchestrator] Failed to close position ${pos.pair} on ${pos.exchange}:`, error);
      }
    }

    // Close all LP positions
    if (this.lpExecutor) {
      for (const lpPos of this.state.lpPositions) {
        try {
          await this.lpExecutor.closePosition(lpPos, reason);
        } catch (error) {
          console.error(`[AgentOrchestrator] Failed to close LP ${lpPos.pair}:`, error);
        }
      }
      this.state.lpPositions = [];
    }

    // Cancel all orders on all exchanges
    await this.cancelAllOrders();

    this.state.positions = [];
    this.state.openOrders = [];
    this.emit('positions_closed', { reason, timestamp: Date.now() });
  }

  private async cancelAllOrders(): Promise<void> {
    for (const [name, conn] of this.connectors) {
      try {
        await (conn as any).cancelAllOrders();
      } catch (error) {
        console.error(`[AgentOrchestrator] Failed to cancel orders on ${name}:`, error);
      }
    }
    this.state.openOrders = [];
    this.mmActiveOrders.clear();
  }

  // ========================================================================
  // Dynamic Pair Discovery
  // ========================================================================

  /**
   * Initialize dynamic pair discovery for Hyperliquid.
   * Discovers all available pairs and auto-registers qualifying ones.
   */
  private async initializeDiscovery(): Promise<void> {
    try {
      const discoveryApiUrl = this.credentials.hyperliquid?.testnet
        ? 'https://api.hyperliquid-testnet.xyz'
        : 'https://api.hyperliquid.xyz';
      this.discovery = new HyperliquidMarketDiscovery({
        apiUrl: discoveryApiUrl,
        pollIntervalMs: 60_000,
        contextPollIntervalMs: 30_000,
      });

      this.pairRegistration = new PairRegistrationService(
        {
          autoEnableClasses: ['crypto_perp'],
          globalRiskLimits: this.config.riskLimits,
          maxAutoEnabled: 30,
        },
        this.eventBus,
      );

      // Wire market discovery to connector for dynamic asset index resolution
      this.connector.setMarketDiscovery(this.discovery);

      // Run initial discovery
      const allPairs = await this.discovery.discoverPairs();
      const perpCount = allPairs.filter(p => !p.isSpot).length;

      // Evaluate and register qualifying pairs
      const existingPairs = new Set(this.config.markets.map(m => m.pair));
      const newPairs = allPairs.filter(p => !existingPairs.has(p.pair));
      await this.handleNewPairDiscovered(newPairs);

      this.emit('discovery_initialized', {
        totalPairs: allPairs.length,
        perpPairs: perpCount,
        registeredMarkets: this.config.markets.length,
        timestamp: Date.now(),
      });

      // Subscribe to EventBus for future discovery events
      this.eventBus.subscribe('market_update', async (event) => {
        if (event.source === 'HyperliquidMarketDiscovery' && event.data?.newPairs) {
          await this.handleNewPairDiscovered(event.data.newPairs);
        }
      });

      // Start periodic polling
      await this.discovery.start();

      // Optionally start WS bridge for real-time price feed
      try {
        this.wsBridge = new HyperliquidWSBridge();
        await this.wsBridge.connect();
        await this.wsBridge.subscribeAllMids(() => {
          // Price cache updates happen inside the bridge
        });
      } catch (wsError) {
        // WS bridge is optional — REST polling is the fallback
        console.error('[AgentOrchestrator] WS bridge failed (non-critical):', wsError);
        this.wsBridge = null;
      }
    } catch (error) {
      console.error('[AgentOrchestrator] Discovery initialization failed (non-critical):', error);
      // Discovery failure is non-critical — agent continues with static markets
    }
  }

  /**
   * Handle newly discovered pairs: evaluate and register qualifying ones.
   */
  private async handleNewPairDiscovered(pairs: import('../core/types').HyperliquidPairMeta[]): Promise<void> {
    if (!this.pairRegistration || pairs.length === 0) return;

    try {
      this.pairRegistration.resetEnabledCount(
        this.config.markets.filter(m => m.enabled && m.exchange === 'hyperliquid').length,
      );

      const newMarkets = await this.pairRegistration.evaluateNewPairs(pairs);

      for (const market of newMarkets) {
        // Avoid duplicates
        if (this.config.markets.some(m => m.pair === market.pair)) continue;

        this.config.markets.push(market);

        // Lazy-create strategy engines for new perps
        if (market.type === 'perp' && market.enabled) {
          this.getOrCreateScalpingEngine(market);
          this.getOrCreateMMEngine(market);
        }

        this.emit('market_added', {
          pair: market.pair,
          classification: market.assetClass,
          volume24h: market.volume24h,
          timestamp: Date.now(),
        });
      }

      if (newMarkets.length > 0) {
        this.state.config = this.config; // Sync state
      }
    } catch (error) {
      console.error('[AgentOrchestrator] handleNewPairDiscovered error:', error);
    }
  }

  /**
   * IPO Strategy: Run on newly listed pairs (< 24h old) with high volatility.
   * Uses 1-minute candles for faster signal detection.
   */
  private async runIPOStrategy(market: MarketConfig): Promise<void> {
    if (!this.discovery) return;

    const meta = this.discovery.getPairMeta(market.pair);
    if (!meta) return;

    // Only run on pairs < 24h old
    const ageHours = (Date.now() - meta.discoveredAt) / 3_600_000;
    if (ageHours > 24) return;

    // Get or create IPO engine
    if (!this.ipoEngines.has(market.pair)) {
      const capital = this.config.capitalAllocation.total * this.config.capitalAllocation.scalp;
      this.ipoEngines.set(market.pair, new IPOStrategyEngine({
        pair: market.pair,
        exchange: market.exchange,
        maxPositionSize: market.maxPositionUSD || this.config.riskLimits.maxPositionSize * 0.5,
        accountBalance: capital,
      }));
    }

    const engine = this.ipoEngines.get(market.pair)!;
    const connector = this.connectors.get(market.exchange) || this.connector;

    // Fetch 1-minute candles for IPO
    const candles = await (connector as any).getCandles(market.pair, '1m', 60);
    if (candles.length < 5) return;

    // Check if we already have a position in this pair
    const existingPosition = this.state.positions.find(
      p => p.pair === market.pair && p.strategy === 'ipo'
    );
    if (existingPosition) return;

    const signal = await engine.scanForEntry(candles, meta);
    if (!signal || signal.confidence < 0.55) return;

    // Submit to consensus
    const proposal: TradeProposal = {
      pair: signal.pair,
      exchange: market.exchange,
      direction: signal.direction,
      entry: signal.entry,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      positionSizeUSD: Math.min(signal.positionSize, market.maxPositionUSD || this.config.riskLimits.maxPositionSize),
      leverage: Math.min(signal.leverage, this.config.riskLimits.maxLeverage),
      strategy: 'ipo',
      confidence: signal.confidence,
    };

    const consensusResult = await this.consensus.evaluateProposal(
      proposal, candles, signal.smcContext,
      {
        totalEquity: this.calculateCurrentEquity(),
        openPositions: this.state.positions,
        performance: this.state.performance,
        riskLimits: this.config.riskLimits,
      },
    );

    if (!consensusResult.approved) {
      if (this.configId) {
        this.persistence.recordConsensusDecision({
          agent_config_id: this.configId,
          pair: market.pair,
          proposal,
          votes: consensusResult.votes,
          result: consensusResult,
          approved: false,
          executed: false,
        }).catch(() => {});
      }
      return;
    }

    signal.positionSize = consensusResult.positionSize;
    await this.executeSignal(signal, connector);

    if (this.configId) {
      this.persistence.recordConsensusDecision({
        agent_config_id: this.configId,
        pair: market.pair,
        proposal,
        votes: consensusResult.votes,
        result: consensusResult,
        approved: true,
        executed: true,
      }).catch(() => {});
    }
  }

  /**
   * Get the market discovery instance (used by MCP tools).
   */
  getMarketDiscovery(): HyperliquidMarketDiscovery | null {
    return this.discovery;
  }

  // ========================================================================
  // Auto-Compound
  // ========================================================================

  private async runAutoCompound(): Promise<void> {
    if (!this.isRunning || !this.config.autoCompound.enabled) return;

    try {
      // Inject current state before compound cycle
      this.compounder.setContext({
        connectors: this.connectors,
        lpPositions: this.state.lpPositions,
        realizedPnl: this.realizedPnl,
        mmPnl: this.mmPnl,
      });
      const result = await this.compounder.runCompoundCycle();
      this.state.lastCompound = result;
      this.emit('compound_cycle', result);
    } catch (error) {
      console.error('[AgentOrchestrator] Auto-compound error:', error);
      this.addError(
        error instanceof Error ? error.message : 'Auto-compound error',
        'auto_compound'
      );
    }
  }

  // ========================================================================
  // Performance Tracking
  // ========================================================================

  private calculateCurrentEquity(): number {
    const totalCapital = this.config.capitalAllocation.total;
    const unrealizedPnl = this.state.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const equity = totalCapital + this.realizedPnl + unrealizedPnl;
    return isFinite(equity) ? equity : totalCapital;
  }

  private updatePerformance(): void {
    const positions = this.state.positions;
    const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const totalCapital = this.config.capitalAllocation.total;
    const totalPnl = totalUnrealizedPnl + this.realizedPnl;
    const equity = totalCapital + totalPnl;

    // Win rate from trade history
    const wins = this.tradeHistory.filter(t => t.result === 'win').length;
    const losses = this.tradeHistory.filter(t => t.result === 'loss').length;
    const total = wins + losses;

    this.state.performance = {
      ...this.state.performance,
      totalPnl,
      totalPnlPercent: totalCapital > 0 ? totalPnl / totalCapital : 0,
      todayPnl: this.drawdownGuard.getDailyPnL(),
      todayPnlPercent: totalCapital > 0 ? this.drawdownGuard.getDailyPnL() / totalCapital : 0,
      weekPnl: this.drawdownGuard.getWeeklyPnL(),
      weekPnlPercent: totalCapital > 0 ? this.drawdownGuard.getWeeklyPnL() / totalCapital : 0,
      winRate: total > 0 ? wins / total : 0,
      totalTrades: this.tradeHistory.length,
      winningTrades: wins,
      losingTrades: losses,
      maxDrawdown: this.drawdownGuard.getMaxDrawdown(),
      currentDrawdown: this.drawdownGuard.getCurrentDrawdown(),
      uptime: this.state.startedAt ? Date.now() - this.state.startedAt : 0,
      startedAt: this.state.startedAt || 0,
    };
  }

  // ========================================================================
  // Configuration & Getters
  // ========================================================================

  updateConfig(newConfig: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.state.config = this.config;
    this.emit('config_updated', this.config);
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  getState(): AgentState {
    return { ...this.state };
  }

  getPerformance(): AgentPerformance {
    return { ...this.state.performance };
  }

  getTradeHistory(): Array<TradeSignal & { executedAt: number; result?: string }> {
    return [...this.tradeHistory];
  }

  getUserId(): string {
    return this.userId;
  }

  // ========================================================================
  // Event System
  // ========================================================================

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(event, callbacks.filter(cb => cb !== callback));
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try { cb(data); } catch (e) { console.error(`[Event:${event}] Listener error:`, e); }
      });
    }
  }

  // ========================================================================
  // Wallet Balance Validation
  // ========================================================================

  /**
   * Validate that wallet balances cover the configured capital allocation.
   * Called during start() — emits warnings if balances are insufficient.
   * Does NOT block start (user may be depositing funds).
   */
  private async validateWalletBalances(): Promise<void> {
    const { capitalAllocation } = this.config;
    const warnings: string[] = [];

    // Check Hyperliquid balance
    const hlAlloc = capitalAllocation.hyperliquid ?? (capitalAllocation.total * (capitalAllocation.mm + capitalAllocation.scalp));
    if (hlAlloc > 0) {
      try {
        const hlBalances = await this.connector.getBalances();
        const hlBalance = hlBalances.reduce((sum, b) => sum + b.valueUSD, 0);
        if (hlBalance < hlAlloc) {
          warnings.push(
            `Hyperliquid: configured $${hlAlloc.toLocaleString()} but wallet has $${hlBalance.toFixed(2)}. ` +
            `Deposit $${(hlAlloc - hlBalance).toFixed(2)} or reduce allocation.`
          );
        }
      } catch {
        warnings.push('Hyperliquid: could not fetch wallet balance for validation.');
      }
    }

    // Check Solana LP balance
    const solAlloc = capitalAllocation.lpSolana ?? 0;
    if (solAlloc > 0) {
      const solConnector = this.connectors.get('jupiter') || this.connectors.get('raydium');
      if (solConnector) {
        try {
          const solBalances = await (solConnector as any).getBalances();
          const solBalance = (solBalances as any[]).reduce((sum: number, b: any) => sum + (b.valueUSD || 0), 0);
          if (solBalance < solAlloc) {
            warnings.push(
              `Solana LP: configured $${solAlloc.toLocaleString()} but wallet has $${solBalance.toFixed(2)}. ` +
              `Deposit $${(solAlloc - solBalance).toFixed(2)} or reduce allocation.`
            );
          }
        } catch {
          warnings.push('Solana: could not fetch wallet balance for validation.');
        }
      } else {
        warnings.push('Solana LP: $' + solAlloc.toLocaleString() + ' allocated but no Solana connector configured.');
      }
    }

    // Check EVM LP balance
    const evmAlloc = capitalAllocation.lpEvm ?? 0;
    if (evmAlloc > 0) {
      const evmConnector = this.connectors.get('uniswap');
      if (evmConnector) {
        try {
          const evmBalances = await (evmConnector as any).getBalances();
          const evmBalance = (evmBalances as any[]).reduce((sum: number, b: any) => sum + (b.valueUSD || 0), 0);
          if (evmBalance < evmAlloc) {
            warnings.push(
              `EVM LP: configured $${evmAlloc.toLocaleString()} but wallet has $${evmBalance.toFixed(2)}. ` +
              `Deposit $${(evmAlloc - evmBalance).toFixed(2)} or reduce allocation.`
            );
          }
        } catch {
          warnings.push('EVM: could not fetch wallet balance for validation.');
        }
      } else {
        warnings.push('EVM LP: $' + evmAlloc.toLocaleString() + ' allocated but no EVM connector configured.');
      }
    }

    // Separate hard errors (balance confirmed insufficient) from soft warnings (fetch failed)
    const hardErrors = warnings.filter(w => w.includes('but wallet has $'));
    const softWarnings = warnings.filter(w => !w.includes('but wallet has $'));

    // Hard errors: block startup — wallet definitely doesn't have enough
    if (hardErrors.length > 0) {
      const msg = `Insufficient balance: ${hardErrors.join(' | ')}`;
      this.addError(msg, 'wallet_validation');
      throw new Error(msg);
    }

    // Soft warnings (fetch failed, no connector): emit but don't block
    for (const warning of softWarnings) {
      this.addError(`BALANCE WARNING: ${warning}`, 'wallet_validation');
      this.emit('balance_warning', { message: warning, timestamp: Date.now() });
    }

    // Publish summary to event bus
    if (softWarnings.length > 0) {
      this.eventBus.publish({
        type: 'risk_alert' as any,
        source: 'AgentOrchestrator',
        data: { type: 'insufficient_balance', warnings: softWarnings, count: softWarnings.length },
        timestamp: Date.now(),
        priority: 'high',
      });
    }
  }

  /**
   * Get real-time wallet balances across all connected exchanges.
   * Used by API route to show balances in the wizard UI.
   */
  async getWalletBalances(): Promise<{
    hyperliquid: { balances: any[]; totalUSD: number };
    solana: { balances: any[]; totalUSD: number };
    evm: { balances: any[]; totalUSD: number };
    total: number;
    allocation: {
      hyperliquid: { configured: number; available: number; sufficient: boolean };
      lpSolana: { configured: number; available: number; sufficient: boolean };
      lpEvm: { configured: number; available: number; sufficient: boolean };
    };
  }> {
    const { capitalAllocation } = this.config;

    // Fetch balances in parallel
    const [hlResult, solResult, evmResult] = await Promise.allSettled([
      this.connector.getBalances(),
      (this.connectors.get('jupiter') || this.connectors.get('raydium'))
        ? (this.connectors.get('jupiter') || this.connectors.get('raydium') as any).getBalances()
        : Promise.resolve([]),
      this.connectors.get('uniswap')
        ? (this.connectors.get('uniswap') as any).getBalances()
        : Promise.resolve([]),
    ]);

    const hlBalances = hlResult.status === 'fulfilled' ? hlResult.value : [];
    const solBalances = solResult.status === 'fulfilled' ? solResult.value : [];
    const evmBalances = evmResult.status === 'fulfilled' ? evmResult.value : [];

    const hlTotal = (hlBalances as any[]).reduce((s: number, b: any) => s + (b.valueUSD || 0), 0);
    const solTotal = (solBalances as any[]).reduce((s: number, b: any) => s + (b.valueUSD || 0), 0);
    const evmTotal = (evmBalances as any[]).reduce((s: number, b: any) => s + (b.valueUSD || 0), 0);

    const hlConfigured = capitalAllocation.hyperliquid ?? (capitalAllocation.total * (capitalAllocation.mm + capitalAllocation.scalp));
    const solConfigured = capitalAllocation.lpSolana ?? 0;
    const evmConfigured = capitalAllocation.lpEvm ?? 0;

    return {
      hyperliquid: { balances: hlBalances as any[], totalUSD: hlTotal },
      solana: { balances: solBalances as any[], totalUSD: solTotal },
      evm: { balances: evmBalances as any[], totalUSD: evmTotal },
      total: hlTotal + solTotal + evmTotal,
      allocation: {
        hyperliquid: { configured: hlConfigured, available: hlTotal, sufficient: hlTotal >= hlConfigured },
        lpSolana: { configured: solConfigured, available: solTotal, sufficient: solTotal >= solConfigured },
        lpEvm: { configured: evmConfigured, available: evmTotal, sufficient: evmTotal >= evmConfigured },
      },
    };
  }

  // ========================================================================
  // Quant Engine Integration
  // ========================================================================

  /**
   * Feed market data into quant engines each cycle.
   * Ingests candles, funding rates, and orderbook snapshots.
   */
  private async feedQuantEngines(): Promise<void> {
    const enabledPerps = this.config.markets.filter(m => m.enabled && m.type === 'perp');

    // Feed candle data into CandleStore and run regime analysis (sample up to 10 markets per cycle)
    const marketsToFeed = enabledPerps.slice(0, 10);
    for (const market of marketsToFeed) {
      try {
        const connector = this.connectors.get(market.exchange) || this.connector;
        const candles = await (connector as any).getCandles(market.pair, '5m', 20);
        if (candles && candles.length > 0) {
          // Feed latest candle into store
          const latest = candles[candles.length - 1];
          this.candleStore.appendCandle(market.pair, '5m', latest);

          // Feed mid price into MarketDataService
          const coin = market.pair.replace('-PERP', '').split('/')[0];
          const midPrice = await (connector as any).getMidPrice(coin);
          if (midPrice > 0) {
            this.marketDataService.ingestPrice(market.pair, midPrice, midPrice * 0.999, midPrice * 1.001, latest.volume);
          }

          // Update regime detector with candle history
          if (candles.length >= 10) {
            this.regimeDetector.analyze(market.pair, candles);
          }
        }
      } catch {
        // Non-critical: data feed failure doesn't stop the loop
      }
    }

    // Feed funding rates (sample top 5 by volume)
    const topMarkets = enabledPerps.slice(0, 5);
    for (const market of topMarkets) {
      try {
        const coin = market.pair.replace('-PERP', '');
        const connector = this.connectors.get(market.exchange) || this.connector;
        if ('getFundingRate' in connector) {
          const funding = await (connector as any).getFundingRate(coin);
          if (funding !== undefined && funding !== null) {
            this.fundingTracker.recordRate(market.pair, market.exchange, funding, Date.now() + 8 * 3_600_000);
          }
        }
      } catch {
        // Non-critical
      }
    }
  }

  /**
   * Run alpha signal generation engines.
   * Alpha signals are published to EventBus for consensus to incorporate.
   */
  private async runAlphaSignals(): Promise<void> {
    const enabledPerps = this.config.markets.filter(m => m.enabled && m.type === 'perp');
    const pairs = enabledPerps.slice(0, 10).map(m => m.pair);
    if (pairs.length === 0) return;

    try {
      // Funding arbitrage alpha — scan all pairs at once
      const fundingSignals = this.alphaFunding.scan(this.fundingTracker, this.marketDataService, pairs);
      for (const signal of fundingSignals) {
        if (signal.confidence >= 0.5) {
          this.eventBus.publish({
            type: 'alpha.signal' as any,
            source: 'FundingArbitrageAlpha',
            data: { pair: signal.pair, signal },
            timestamp: Date.now(),
            priority: signal.confidence > 0.8 ? 'high' : 'medium',
          });
        }
      }

      // Liquidation cascade alpha
      const liqSignals = this.alphaCascade.scan(this.liquidationTracker, this.marketDataService, pairs);
      for (const signal of liqSignals) {
        if (signal.confidence >= 0.6) {
          this.eventBus.publish({
            type: 'alpha.signal' as any,
            source: 'LiquidationCascadeAlpha',
            data: { pair: signal.pair, signal },
            timestamp: Date.now(),
            priority: signal.confidence > 0.8 ? 'high' : 'medium',
          });
        }
      }

      // Order flow imbalance alpha
      const flowSignals = this.alphaOrderFlow.scan(this.orderbookAggregator, pairs);
      for (const signal of flowSignals) {
        if (signal.confidence >= 0.5) {
          this.eventBus.publish({
            type: 'alpha.signal' as any,
            source: 'OrderFlowImbalanceAlpha',
            data: { pair: signal.pair, signal },
            timestamp: Date.now(),
            priority: signal.confidence > 0.8 ? 'high' : 'medium',
          });
        }
      }
    } catch {
      // Alpha signal failure is non-critical
    }
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  private getOrCreateScalpingEngine(market: MarketConfig): ScalpingEngine {
    if (!this.scalpingEngines.has(market.pair)) {
      const capital = this.config.capitalAllocation.total * this.config.capitalAllocation.scalp;
      this.scalpingEngines.set(market.pair, new ScalpingEngine({
        pair: market.pair,
        exchange: market.exchange,
        maxPositionSize: this.config.riskLimits.maxPositionSize,
        riskPerTrade: 0.01, // 1% risk per trade
        accountBalance: capital,
      }));
    }
    return this.scalpingEngines.get(market.pair)!;
  }

  private getOrCreateMMEngine(market: MarketConfig): MMStrategyEngine {
    if (!this.mmEngines.has(market.pair)) {
      const capital = this.config.capitalAllocation.total * this.config.capitalAllocation.mm;
      this.mmEngines.set(market.pair, new MMStrategyEngine({
        pair: market.pair,
        exchange: market.exchange,
        baseSpread: 10, // 10 bps base spread
        maxInventorySkew: 0.3,
        orderSize: capital * 0.1, // 10% of MM capital per side
        accountBalance: capital,
      }));
    }
    return this.mmEngines.get(market.pair)!;
  }

  /**
   * Estimate annualized volatility from recent candle closes.
   * Uses standard deviation of log returns.
   */
  private estimateVolatility(candles: Candle[]): number {
    if (candles.length < 2) return 0.01; // default 1%

    const returns: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      if (candles[i - 1].close > 0) {
        returns.push(Math.log(candles[i].close / candles[i - 1].close));
      }
    }

    if (returns.length === 0) return 0.01;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
    return Math.sqrt(variance); // per-period volatility
  }

  private createInitialState(): AgentState {
    return {
      status: 'off',
      config: this.config,
      wallets: [],
      positions: [],
      lpPositions: [],
      openOrders: [],
      performance: {
        totalPnl: 0,
        totalPnlPercent: 0,
        todayPnl: 0,
        todayPnlPercent: 0,
        weekPnl: 0,
        weekPnlPercent: 0,
        monthPnl: 0,
        monthPnlPercent: 0,
        winRate: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        currentDrawdown: 0,
        uptime: 0,
        startedAt: 0,
      },
      lastCompound: null,
      recentTrades: [],
      errors: [],
      startedAt: null,
      uptime: 0,
    };
  }

  private validateConfig(): void {
    const { capitalAllocation, riskLimits } = this.config;

    // If chain-specific allocations are set, recompute total and percentages
    if (capitalAllocation.hyperliquid !== undefined || capitalAllocation.lpSolana !== undefined || capitalAllocation.lpEvm !== undefined) {
      const hl = capitalAllocation.hyperliquid ?? 0;
      const lpSol = capitalAllocation.lpSolana ?? 0;
      const lpEvm = capitalAllocation.lpEvm ?? 0;
      const total = hl + lpSol + lpEvm;
      if (total <= 0) {
        throw new Error('Total capital allocation must be greater than 0');
      }
      // Recompute percentage fields for backward compatibility
      capitalAllocation.total = total;
      capitalAllocation.lp = (lpSol + lpEvm) / total;
      capitalAllocation.mm = (hl * 0.5) / total; // 50% of HL capital to MM
      capitalAllocation.scalp = (hl * 0.5) / total; // 50% of HL capital to Scalp
    } else {
      const totalAlloc = capitalAllocation.lp + capitalAllocation.mm + capitalAllocation.scalp;
      if (Math.abs(totalAlloc - 1) > 0.01) {
        throw new Error(`Capital allocation must sum to 100%, got ${(totalAlloc * 100).toFixed(1)}%`);
      }
    }

    if (riskLimits.maxLeverage < 1 || riskLimits.maxLeverage > 100) {
      throw new Error('Max leverage must be between 1x and 100x');
    }
  }

  private updateStatus(status: AgentStatus): void {
    this.state.status = status;
    this.emit('status_change', { status, timestamp: Date.now() });
  }

  private addError(message: string, source: string): void {
    this.state.errors.push({ message, timestamp: Date.now(), source });
    if (this.state.errors.length > 100) {
      this.state.errors = this.state.errors.slice(-100);
    }
  }
}

// Per-user registry (replaces singleton)
const orchestratorRegistry = new Map<string, AgentOrchestrator>();

export function getOrchestrator(userId: string, config?: Partial<AgentConfig>, credentials?: UserCredentials): AgentOrchestrator {
  let instance = orchestratorRegistry.get(userId);
  if (!instance) {
    instance = new AgentOrchestrator(userId, config, credentials);
    orchestratorRegistry.set(userId, instance);
  }
  return instance;
}

export function resetOrchestrator(userId: string): void {
  const instance = orchestratorRegistry.get(userId);
  if (instance) {
    instance.stop().catch(() => {});
    orchestratorRegistry.delete(userId);
  }
}

export function getAllActiveUsers(): string[] {
  return Array.from(orchestratorRegistry.keys());
}
