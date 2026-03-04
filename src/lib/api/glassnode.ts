/**
 * Glassnode API Service
 * Analytics on-chain avançados para Bitcoin
 */

import { apiClient } from './client';
import { API_CONFIG } from './config';
import { cacheService, cacheKeys, cacheTTL } from '@/lib/cache';
import { devLogger } from '@/lib/logger';

// Tipos para Glassnode
export interface GlassnodeMetric {
  timestamp: number;
  value: number;
}

export interface GlassnodeResponse {
  data: GlassnodeMetric[];
  next_page_token?: string;
}

export interface AddressMetrics {
  active: number;
  sending: number;
  receiving: number;
  new: number;
  nonZeroBalance: number;
  profitableCount: number;
  lossCount: number;
}

export interface MarketMetrics {
  price: number;
  marketCap: number;
  realizedCap: number;
  thermoCap: number;
  mvrv: number;
  nvt: number;
  velocity: number;
}

export interface BlockchainMetrics {
  blockHeight: number;
  blockSize: number;
  transactionCount: number;
  transactionVolume: number;
  utxoCount: number;
  utxoVolume: number;
}

export interface MiningMetrics {
  hashrate: number;
  difficulty: number;
  minerRevenue: number;
  minerRevenueUsd: number;
  blockSubsidy: number;
  feeTotal: number;
}

export interface SupplyMetrics {
  current: number;
  issued: number;
  inflation: number;
  burned: number;
  lostCoins: number;
  liquidSupply: number;
  illiquidSupply: number;
}

// Parâmetros de consulta
interface GlassnodeParams {
  asset?: string;
  since?: number;
  until?: number;
  interval?: '1h' | '24h' | '10m' | '1w' | '1month';
  format?: 'json' | 'csv';
  timestamp_format?: 'unix' | 'humanized';
}

class GlassnodeService {
  private baseUrl: string;
  private apiKey: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = API_CONFIG.glassnode.baseUrl;
    this.apiKey = API_CONFIG.glassnode.apiKey;
    this.headers = {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fazer requisição à API
   */
  private async request<T>(
    endpoint: string, 
    params: GlassnodeParams = {}
  ): Promise<T> {
    const defaultParams: GlassnodeParams = {
      asset: 'BTC',
      interval: '24h',
      format: 'json',
      timestamp_format: 'unix',
      ...params
    };

    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    Object.entries(defaultParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    return apiClient.fetch(url.toString(), { headers: this.headers });
  }

  /**
   * Obter métricas de endereços
   */
  async getAddressMetrics(
    interval: GlassnodeParams['interval'] = '24h'
  ): Promise<AddressMetrics> {
    return cacheService.getOrCompute(
      cacheKeys.glassnode(`addresses-${interval}`),
      async () => {
        devLogger.log('GLASSNODE', 'Fetching address metrics');
        
        const [active, sending, receiving, newAddresses, nonZero] = await Promise.all([
          this.request<GlassnodeResponse>('/metrics/addresses/active_count', { interval }),
          this.request<GlassnodeResponse>('/metrics/addresses/sending_count', { interval }),
          this.request<GlassnodeResponse>('/metrics/addresses/receiving_count', { interval }),
          this.request<GlassnodeResponse>('/metrics/addresses/new_count', { interval }),
          this.request<GlassnodeResponse>('/metrics/addresses/non_zero_count', { interval }),
        ]);

        return {
          active: active.data[0]?.value || 0,
          sending: sending.data[0]?.value || 0,
          receiving: receiving.data[0]?.value || 0,
          new: newAddresses.data[0]?.value || 0,
          nonZeroBalance: nonZero.data[0]?.value || 0,
          profitableCount: 0, // Requer plano pago
          lossCount: 0, // Requer plano pago
        };
      },
      (cacheTTL as any).analytics
    );
  }

  /**
   * Obter métricas de mercado
   */
  async getMarketMetrics(): Promise<MarketMetrics> {
    return cacheService.getOrCompute(
      cacheKeys.glassnode('market-metrics'),
      async () => {
        devLogger.log('GLASSNODE', 'Fetching market metrics');
        
        const [price, marketCap, realizedCap, mvrv] = await Promise.all([
          this.request<GlassnodeResponse>('/metrics/market/price_usd_close'),
          this.request<GlassnodeResponse>('/metrics/market/marketcap_usd'),
          this.request<GlassnodeResponse>('/metrics/market/marketcap_realized_usd'),
          this.request<GlassnodeResponse>('/metrics/market/mvrv'),
        ]);

        return {
          price: price.data[0]?.value || 0,
          marketCap: marketCap.data[0]?.value || 0,
          realizedCap: realizedCap.data[0]?.value || 0,
          thermoCap: 0, // Requer plano pago
          mvrv: mvrv.data[0]?.value || 0,
          nvt: 0, // Requer plano pago
          velocity: 0, // Requer plano pago
        };
      },
      (cacheTTL as any).market
    );
  }

  /**
   * Obter métricas da blockchain
   */
  async getBlockchainMetrics(): Promise<BlockchainMetrics> {
    return cacheService.getOrCompute(
      cacheKeys.glassnode('blockchain-metrics'),
      async () => {
        devLogger.log('GLASSNODE', 'Fetching blockchain metrics');
        
        const [height, txCount, utxoCount] = await Promise.all([
          this.request<GlassnodeResponse>('/metrics/blockchain/block_height'),
          this.request<GlassnodeResponse>('/metrics/blockchain/tx_count'),
          this.request<GlassnodeResponse>('/metrics/blockchain/utxo_count'),
        ]);

        return {
          blockHeight: height.data[0]?.value || 0,
          blockSize: 0, // Requer dados adicionais
          transactionCount: txCount.data[0]?.value || 0,
          transactionVolume: 0, // Requer plano pago
          utxoCount: utxoCount.data[0]?.value || 0,
          utxoVolume: 0, // Requer plano pago
        };
      },
      (cacheTTL as any).blockchain
    );
  }

  /**
   * Obter métricas de mineração
   */
  async getMiningMetrics(): Promise<MiningMetrics> {
    return cacheService.getOrCompute(
      cacheKeys.glassnode('mining-metrics'),
      async () => {
        devLogger.log('GLASSNODE', 'Fetching mining metrics');
        
        const [hashrate, difficulty, revenue] = await Promise.all([
          this.request<GlassnodeResponse>('/metrics/mining/hash_rate_mean'),
          this.request<GlassnodeResponse>('/metrics/mining/difficulty_latest'),
          this.request<GlassnodeResponse>('/metrics/mining/revenue_sum'),
        ]);

        return {
          hashrate: hashrate.data[0]?.value || 0,
          difficulty: difficulty.data[0]?.value || 0,
          minerRevenue: revenue.data[0]?.value || 0,
          minerRevenueUsd: 0, // Requer conversão
          blockSubsidy: 6.25, // Bitcoin halving atual
          feeTotal: 0, // Requer plano pago
        };
      },
      (cacheTTL as any).mining
    );
  }

  /**
   * Obter métricas de supply
   */
  async getSupplyMetrics(): Promise<SupplyMetrics> {
    return cacheService.getOrCompute(
      cacheKeys.glassnode('supply-metrics'),
      async () => {
        devLogger.log('GLASSNODE', 'Fetching supply metrics');
        
        const [current, issued] = await Promise.all([
          this.request<GlassnodeResponse>('/metrics/supply/current'),
          this.request<GlassnodeResponse>('/metrics/supply/issued'),
        ]);

        return {
          current: current.data[0]?.value || 0,
          issued: issued.data[0]?.value || 0,
          inflation: 0, // Requer cálculo
          burned: 0, // Bitcoin não tem queima
          lostCoins: 0, // Estimativa
          liquidSupply: 0, // Requer plano pago
          illiquidSupply: 0, // Requer plano pago
        };
      },
      (cacheTTL as any).supply
    );
  }

  /**
   * Obter série temporal de uma métrica
   */
  async getMetricTimeSeries(
    metric: string,
    params: GlassnodeParams = {}
  ): Promise<GlassnodeMetric[]> {
    const cacheKey = `timeseries-${metric}-${JSON.stringify(params)}`;
    
    return cacheService.getOrCompute(
      cacheKeys.glassnode(cacheKey),
      async () => {
        devLogger.log('GLASSNODE', `Fetching time series for: ${metric}`);
        const response = await this.request<GlassnodeResponse>(metric, params);
        return response.data;
      },
      (cacheTTL as any).timeseries
    );
  }

  /**
   * Obter indicadores on-chain personalizados
   */
  async getOnChainIndicators() {
    return cacheService.getOrCompute(
      cacheKeys.glassnode('indicators'),
      async () => {
        devLogger.log('GLASSNODE', 'Fetching on-chain indicators');
        
        const [sopr, puell, rhodl] = await Promise.all([
          this.request<GlassnodeResponse>('/metrics/indicators/sopr'),
          this.request<GlassnodeResponse>('/metrics/indicators/puell_multiple'),
          this.request<GlassnodeResponse>('/metrics/indicators/rhodl_ratio'),
        ].map(p => p.catch(() => ({ data: [] }))));

        return {
          sopr: sopr.data[0]?.value || 0,
          puellMultiple: puell.data[0]?.value || 0,
          rhodlRatio: rhodl.data[0]?.value || 0,
        };
      },
      (cacheTTL as any).indicators
    );
  }
}

// Cache keys específicos para Glassnode
cacheKeys.glassnode = (key: string) => `glassnode:${key}`;

// Cache TTLs específicos
Object.assign(cacheTTL, {
  analytics: 900,     // 15 minutos
  market: 300,        // 5 minutos
  blockchain: 600,    // 10 minutos
  supply: 3600,       // 1 hora
  timeseries: 1800,   // 30 minutos
  indicators: 600,    // 10 minutos
});

// Exportar instância singleton
export const glassnodeService = new GlassnodeService();