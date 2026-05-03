/**
 * CYPHER AI Trading Agent - Agent Orchestrator
 * Coordinates all strategies, risk management, and auto-compound.
 * ✅ CORRIGIDO: saldo real agora é verificado antes de todo trade
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
  private connector: HyperliquidConnector;
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

  private lpExecutor: LPExecutionEngine | null = null;

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

  private tradeHistory: Array<TradeSignal & { executedAt: number; result?: string }> = [];
  private realizedPnl: number = 0;
  private mmPnl: number = 0;
  private equitySnapshotCounter: number = 0;

  private orderDedupCache: Map<string, number> = new Map();
  private mmActiveOrders: Map<string, string[]> = new Map();
  private readonly DEDUP_WINDOW_MS = 30000;
  private executionLock: Map<string, Promise<void>> = new Map();

  constructor(userId: string, config?: Partial<AgentConfig>, credentials?: UserCredentials, persistenceId?: string) {
    this.userId = userId;
    this.credentials = credentials || {};
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
    this.state = this.createInitialState();

    // Initialize Hyperliquid connector
    const isTestnet = this.credentials.hyperliquid?.testnet === true;
    const hlConfig: HyperliquidConfig = {
      apiUrl: isTestnet ? 'https://api.hyperliquid-testnet.xyz' : 'https://api.hyperliquid.xyz',
      agentKey: this.credentials.hyperliquid?.agentKey || process.env.HYPERLIQUID_AGENT_KEY || '',
      agentSecret: this.credentials.hyperliquid?.agentSecret || process.env.HYPERLIQUID_AGENT_SECRET || '',
      testnet: isTestnet,
    };
    this.connector = new HyperliquidConnector(hlConfig);
    this.connectors.set('hyperliquid', this.connector);

    // ✅ INJEÇÃO DO CONNECTOR NO PORTFOLIO MANAGER (resolve saldo)
    this.portfolioManager = getPortfolioManager(undefined, this.connector);

    this.initializeConnectors();

    this.drawdownGuard = new MaxDrawdownProtection(this.config.capitalAllocation.total);
    this.liquidationGuard = new LiquidationGuard();
    this.mevProtection = new MEVProtection();
    this.compounder = new AutoCompoundEngine(this.config.autoCompound);
    this.consensus = new ConsensusEngine({ enableTrading: this.config.enableTrading });
    this.persistence = getAgentPersistence();
    this.sessionKeyManager = getSessionKeyManager();
    this.eventBus = getAgentEventBus();

    this.marketDataService = getMarketDataService();
    this.orderbookAggregator = getOrderbookAggregator();
    this.fundingTracker = getFundingRateTracker();
    this.liquidationTracker = getLiquidationTracker();
    this.candleStore = getCandleStore();
    this.regimeDetector = getMarketRegimeDetector();
    this.alphaFunding = new FundingArbitrageAlpha();
    this.alphaCascade = new LiquidationCascadeAlpha();
    this.alphaOrderFlow = new OrderFlowImbalanceAlpha();
    this.executionService = getOrderExecutionService();

    this.lpEngine = new LPStrategyEngine({ /* ... defaults */ });

    if (persistenceId) {
      this.configId = persistenceId;
      this.loadPersistedState(persistenceId);
    }
  }

  // ... (todos os métodos anteriores permanecem iguais até executeSignal)

  private async executeSignal(signal: TradeSignal, connector?: BaseConnector | HyperliquidConnector): Promise<void> {
    const dedupKey = `${signal.pair}_${signal.direction}_${signal.strategy}_${signal.id || Date.now().toString(36)}`;

    const existingLock = this.executionLock.get(dedupKey);
    if (existingLock) await existingLock;

    const lastExecution = this.orderDedupCache.get(dedupKey);
    if (lastExecution && Date.now() - lastExecution < this.DEDUP_WINDOW_MS) return;

    let releaseLock: () => void;
    const lockPromise = new Promise<void>(resolve => { releaseLock = resolve; });
    this.executionLock.set(dedupKey, lockPromise);

    try {
      this.orderDedupCache.set(dedupKey, Date.now());

      const activeConnector = connector || this.connector;

      // ✅ CHECAGEM DE SALDO ANTES DE QUALQUER TRADE
      await this.portfolioManager.refreshBalance();

      const midPrice = await (activeConnector as any).getMidPrice(
        signal.pair.replace('-PERP', '').split('/')[0]
      );
      const requiredUsd = signal.positionSize * 1.1; // 10% de margem extra

      const hasBalance = await (activeConnector as HyperliquidConnector).hasEnoughBalance(requiredUsd);

      if (!hasBalance) {
        console.warn(`[AgentOrchestrator] ❌ TRADE BLOQUEADO - Saldo insuficiente para ${signal.pair}`);
        this.eventBus.publish({
          type: 'tradeSkipped',
          source: 'AgentOrchestrator',
          data: { pair: signal.pair, reason: 'insufficient_balance', required: requiredUsd },
          timestamp: Date.now(),
          priority: 'high',
        });
        this.addError(`Saldo insuficiente para abrir ${signal.pair}`, 'execution');
        return;
      }

      // ... (resto do código de executeSignal permanece igual - só adicionei a checagem acima)

      // (o resto do método continua exatamente como estava)

    } finally {
      releaseLock!();
      this.executionLock.delete(dedupKey);
    }
  }

  // ... resto do arquivo permanece igual (mainLoop, runStrategies, etc.)

  async getWalletBalances() {
    // já estava bom, mantido
    return { /* ... */ };
  }

  // ... resto do arquivo (não alterado)
}

// Per-user registry
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
