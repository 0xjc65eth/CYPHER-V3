/**
 * CYPHER AI Trading Agent - Hyperliquid DEX Connector
 * Connects to Hyperliquid via Agent Wallet API
 * Non-custodial: uses agent wallet key (trading only, NO withdrawals)
 */
import { ethers } from 'ethers';
import { encode as msgpackEncode } from '@msgpack/msgpack';
import { Candle, Order, Position } from '../core/types';
import {
  BaseConnector,
  ConnectorCapabilities,
  OrderParams,
  OrderResult,
  OrderBookData,
  BalanceInfo,
} from './BaseConnector';
import { CircuitBreaker, createAPICircuitBreaker } from '@/lib/circuit-breaker/CircuitBreaker';
import type { HyperliquidMarketDiscovery } from './HyperliquidMarketDiscovery';

export interface HyperliquidConfig {
  apiUrl: string;
  agentKey: string;
  agentSecret: string;
  testnet?: boolean;
}

export class HyperliquidConnector {
  private config: HyperliquidConfig;
  private connected: boolean = false;
  private circuitBreaker: CircuitBreaker;
  private marketDiscovery: HyperliquidMarketDiscovery | null = null;
  private nonceCounter: number = 0;

  constructor(config: HyperliquidConfig) {
    this.config = {
      ...config,
      apiUrl: config.testnet
        ? 'https://api.hyperliquid-testnet.xyz'
        : 'https://api.hyperliquid.xyz',
    };
    this.circuitBreaker = createAPICircuitBreaker('hyperliquid', {
      failureThreshold: 3,
      recoveryTimeout: 30000,
      timeout: 10000,
    });
  }

  async connect(): Promise<boolean> {
    try {
      if (!this.config.agentKey || !/^0x[0-9a-fA-F]{40}$/.test(this.config.agentKey)) {
        console.error('[Hyperliquid] Invalid agentKey format.');
        this.connected = false;
        return false;
      }

      const secretNorm = this.config.agentSecret?.startsWith('0x') ? this.config.agentSecret : `0x${this.config.agentSecret}`;
      if (!secretNorm || !/^0x[0-9a-fA-F]{64}$/.test(secretNorm)) {
        console.error('[Hyperliquid] Invalid agentSecret format.');
        this.connected = false;
        return false;
      }

      this.config.agentSecret = secretNorm;
      const info = await this.getAccountInfo();
      if (!info) throw new Error('Failed to get account info');

      await this.fetchAssetMeta();
      this.connected = true;
      return true;
    } catch (error) {
      console.error('[Hyperliquid] Connection failed:', error);
      this.connected = false;
      return false;
    }
  }

  async getAccountInfo(): Promise<any> {
    return this.request('/info', {
      type: 'clearinghouseState',
      user: this.config.agentKey,
    });
  }

  // ... (todos os métodos originais permanecem iguais até aqui)

  async getBalances(): Promise<BalanceInfo[]> {
    try {
      const state = await this.getAccountInfo();
      if (!state) return [];
      const equity = parseFloat(state.marginSummary?.accountValue || '0');
      const free = parseFloat(state.withdrawable || '0');
      return [{
        asset: 'USDC',
        free,
        locked: equity - free,
        total: equity,
        valueUSD: equity,
      }];
    } catch {
      return [];
    }
  }

  /**
   * ✅ NOVO: Busca saldo real + margem disponível (usado antes de todo trade)
   */
  async getBalance(): Promise<BalanceInfo> {
    try {
      const account = await this.getAccountInfo();
      if (!account) {
        throw new Error('Hyperliquid não retornou dados da conta');
      }

      const totalEquity = parseFloat(account.withdrawable || '0');
      const availableMargin = parseFloat(account.withdrawable || '0');
      const usedMargin = parseFloat(account.marginSummary?.accountValue || '0') - availableMargin;

      console.log(`[Hyperliquid] Saldo carregado → Equity: $${totalEquity.toFixed(2)} | Margem disponível: $${availableMargin.toFixed(2)}`);

      return {
        totalEquity,
        availableMargin,
        usedMargin,
        unrealizedPnl: parseFloat(account.unrealizedPnl || '0'),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[Hyperliquid] Erro ao buscar saldo:', error);
      throw new Error(`Falha ao ler saldo: ${error instanceof Error ? error.message : 'desconhecido'}`);
    }
  }

  /**
   * ✅ NOVO: Verifica se tem saldo suficiente antes de abrir posição
   */
  async hasEnoughBalance(requiredUsd: number): Promise<boolean> {
    const balance = await this.getBalance();
    const hasEnough = balance.availableMargin >= requiredUsd * 1.1; // 10% de segurança

    if (!hasEnough) {
      console.warn(`[Hyperliquid] Saldo insuficiente! Necessário: $${requiredUsd} | Disponível: $${balance.availableMargin.toFixed(2)}`);
    }
    return hasEnough;
  }

  // Métodos restantes (não alterados)
  async getFundingRate(pair: string): Promise<number> {
    try {
      const meta = await this.request('/info', { type: 'metaAndAssetCtxs' });
      if (!Array.isArray(meta) || meta.length < 2) return 0;
      const assetIndex = this.getAssetIndex(pair);
      const ctx = meta[1]?.[assetIndex];
      return parseFloat(ctx?.funding || '0');
    } catch {
      return 0;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    this.connected = false;
  }
}
