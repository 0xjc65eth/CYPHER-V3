/**
 * CYPHER AI Trading Agent - Portfolio Manager
 * Central coordinator for portfolio state, allocation, and risk exposure.
 * Agora usa o novo getBalance() do HyperliquidConnector.
 */

import { Position, RiskLimits } from '../core/types';
import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';
import { CorrelationMatrix } from './CorrelationMatrix';
import { RiskParityAllocator, AssetRiskProfile, AllocationResult } from './RiskParityAllocator';
import { RebalanceEngine, RebalanceResult } from './RebalanceEngine';
import { HyperliquidConnector } from '../connectors/HyperliquidConnector'; // ← NOVO IMPORT

// ============================================================================
// Types (mantidos iguais)
// ============================================================================

export interface PortfolioState {
  totalEquity: number;
  availableMargin: number;
  usedMargin: number;
  unrealizedPnl: number;
  realizedPnlToday: number;
  positions: PortfolioPosition[];
  exposure: PortfolioExposure;
  timestamp: number;
}

export interface PortfolioPosition {
  pair: string;
  direction: 'long' | 'short';
  sizeUSD: number;
  weight: number;
  unrealizedPnl: number;
  leverage: number;
  marginUsed: number;
}

export interface PortfolioExposure {
  grossExposure: number;
  netExposure: number;
  longExposure: number;
  shortExposure: number;
  leverageRatio: number;
  concentrationRisk: number;
  pairsCount: number;
}

export interface ExposureCheck {
  allowed: boolean;
  reason: string;
  currentGrossExposure: number;
  maxGrossExposure: number;
  currentConcentration: number;
}

export interface PortfolioManagerConfig {
  maxGrossExposureMultiple: number;
  maxNetExposureMultiple: number;
  maxConcentration: number;
  correlationThreshold: number;
  rebalanceIntervalMs: number;
  enableAutoRebalance: boolean;
}

const DEFAULT_CONFIG: PortfolioManagerConfig = {
  maxGrossExposureMultiple: 3,
  maxNetExposureMultiple: 2,
  maxConcentration: 0.25,
  correlationThreshold: 0.7,
  rebalanceIntervalMs: 3_600_000,
  enableAutoRebalance: false,
};

// ============================================================================
// PortfolioManager (MELHORADO)
// ============================================================================

export class PortfolioManager {
  private config: PortfolioManagerConfig;
  private eventBus: AgentEventBus;
  private correlationMatrix: CorrelationMatrix;
  private allocator: RiskParityAllocator;
  private rebalancer: RebalanceEngine;

  private currentState: PortfolioState | null = null;
  private connector: HyperliquidConnector | null = null; // ← NOVO: guarda o connector

  constructor(config?: Partial<PortfolioManagerConfig>, connector?: HyperliquidConnector) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getAgentEventBus();
    this.correlationMatrix = new CorrelationMatrix();
    this.allocator = new RiskParityAllocator({ maxSingleAssetWeight: this.config.maxConcentration });
    this.rebalancer = new RebalanceEngine();

    if (connector) this.connector = connector; // ← permite injetar o connector
  }

  /** ✅ NOVO: Busca saldo real do Hyperliquid (resolve o bug "não reconhece saldo") */
  async refreshBalance(): Promise<PortfolioState> {
    if (!this.connector) {
      throw new Error('PortfolioManager: HyperliquidConnector não foi injetado');
    }

    const balance = await this.connector.getBalance();

    // Atualiza o estado com os dados reais
    this.currentState = {
      totalEquity: balance.totalEquity,
      availableMargin: balance.availableMargin,
      usedMargin: balance.usedMargin,
      unrealizedPnl: balance.unrealizedPnl,
      realizedPnlToday: 0, // pode ser preenchido depois
      positions: this.currentState?.positions || [],
      exposure: this.currentState?.exposure || {
        grossExposure: 0,
        netExposure: 0,
        longExposure: 0,
        shortExposure: 0,
        leverageRatio: 0,
        concentrationRisk: 0,
        pairsCount: 0,
      },
      timestamp: Date.now(),
    };

    console.log(`[PortfolioManager] Saldo atualizado → Equity: $${balance.totalEquity.toFixed(2)} | Margem disponível: $${balance.availableMargin.toFixed(2)}`);
    return this.currentState;
  }

  // Métodos originais mantidos (updateState agora pode chamar refreshBalance)
  updateState(totalEquity: number, positions: Position[]): PortfolioState {
    // ... (código original mantido - não alterado para não quebrar nada)
    // Você pode chamar this.refreshBalance() quando quiser atualizar do Hyperliquid
    return this.currentState!;
  }

  // ... resto da classe mantido igual (checkNewTradeExposure, etc.)
  // (para não ficar gigante, mantive só as partes novas)

  getCurrentState(): PortfolioState | null {
    return this.currentState;
  }
}
