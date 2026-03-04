/**
 * Portfolio Service
 *
 * Serviço responsável por gerenciar dados de portfólio, incluindo ativos,
 * transações, métricas de desempenho e análises preditivas.
 */

import { walletConnector, WalletInfo } from './wallet-connector';
import { rateLimitedFetch } from '@/lib/rateLimitedFetch';

// Asset Type Enum
export enum AssetType {
  BITCOIN = 'bitcoin',
  ORDINAL = 'ordinal',
  RUNE = 'rune',
  OTHER = 'other'
}

// Define Asset and Transaction types
export interface Asset {
  asset: string;
  value: number;
  quantity: number;
  price: number;
  change24h: number;
  weight: number;
}

export interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'transfer';
  asset: string;
  amount: number;
  price: number;
  timestamp: string;
  fee: number;
  status: 'completed' | 'pending' | 'failed';
}
import { enhancedNeuralService } from './enhanced-neural-service';
import { cacheService, cacheConfigs } from '@/lib/cache';

// Tipos de dados para o portfólio
export interface PortfolioData {
  assets: Asset[];
  transactions: Transaction[];
  totalValue: number;
  btcPrice: number;
  lastUpdated: string;
  metrics: PortfolioMetrics;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalChange24h: number;
  totalChange7d: number;
  totalChange30d: number;
  btcDominance: number;
  ordinalsDominance: number;
  runesDominance: number;
  roi: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  bestDay: { date: string; change: number };
  worstDay: { date: string; change: number };
  
  // Additional properties used in PerformanceMetrics component
  allTimeReturnPct: number;
  allTimeReturnUsd: number;
  dailyChangePct: number;
  dailyChangeUsd: number;
  weeklyChangePct: number;
  weeklyChangeUsd: number;
  monthlyChangePct: number;
  monthlyChangeUsd: number;
  totalCostBasis: number;
  unrealizedProfitLoss: number;
  realizedProfitLoss: number;
  assetAllocation: {
    bitcoin: number;
    ordinals: number;
    runes: number;
  };
  riskScore: number;
  lastUpdated: string;
}

export interface PerformanceData {
  totalValue: number;
  totalChange: number;
  roi: number;
  btcComparison: number;
  startDate: string;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  bestDay: { date: string; change: number };
  worstDay: { date: string; change: number };
  predictedTrend?: 'up' | 'down' | 'neutral';
  confidenceScore?: number;
  aiInsights: {
    trendAnalysis: string;
    riskAssessment: string;
    recommendations: string[];
  };
}

export interface AssetAllocation {
  type: 'Bitcoin' | 'Ordinals' | 'Runes' | 'Other';
  value: number;
  percentage: number;
  color: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalChange24h: number;
  totalChange7d: number;
  totalChange30d: number;
  assets: Asset[];
  transactions: Transaction[];
  metrics: PortfolioMetrics;
  assetAllocation: AssetAllocation[];
  lastUpdated: string;
}

/**
 * Serviço de Portfólio
 */
class PortfolioService {
  private walletAddress: string | null = null;
  private portfolioData: PortfolioData | null = null;
  private isInitialized: boolean = false;
  private isLoading: boolean = false;
  private lastSyncTime: string | null = null;
  private historicalData: {
    date: string;
    totalValue: number;
    btcPrice: number;
    assets: { type: string; value: number }[];
  }[] = [];
  private listeners = new Map<string, Function[]>();

  /**
   * Register an event listener
   */
  on(event: string, callback: Function): void {
    const existing = this.listeners.get(event) || [];
    this.listeners.set(event, [...existing, callback]);
  }

  /**
   * Unregister an event listener
   */
  off(event: string, callback: Function): void {
    const existing = this.listeners.get(event) || [];
    this.listeners.set(event, existing.filter(cb => cb !== callback));
  }

  /**
   * Emit an event to all registered listeners
   */
  protected emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => {
      try {
        cb(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Inicializa o serviço de portfólio com o endereço da carteira
   */
  public async initialize(walletAddress: string): Promise<void> {
    if (this.isLoading) return;

    try {
      this.isLoading = true;
      this.walletAddress = walletAddress;
      this.emit('sync_started');

      // Tentar carregar dados do cache primeiro
      const cachedData = await cacheService.get(
        `portfolio_${walletAddress}`,
        async () => {
          // Se não houver cache, buscar dados da carteira
          return this.syncWalletData();
        },
        cacheConfigs.medium
      );

      if (cachedData) {
        this.portfolioData = cachedData;
        this.emit('portfolio_updated', cachedData);
      }

      this.isInitialized = true;
      this.lastSyncTime = new Date().toISOString();

      // Carregar dados históricos
      await this.loadHistoricalData();

      this.emit('sync_completed');
    } catch (error) {
      console.error('Failed to initialize portfolio service:', error);
      this.emit('portfolio_error', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Sincroniza dados da carteira
   */
  private async syncWalletData(): Promise<PortfolioData> {
    if (!this.walletAddress) {
      throw new Error('Wallet address not set');
    }
    
    try {
      // Obter preço atual do Bitcoin
      const btcPrice = await this.getBitcoinPrice();
      
      // Sincronizar ativos da carteira
      const assets = await this.syncWalletAssets(this.walletAddress);
      
      // Obter transações (simuladas por enquanto, já que walletConnector não tem este método)
      const transactions = await this.getSimulatedTransactions(this.walletAddress);
      
      // Calcular valor total
      const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
      
      // Calcular métricas
      const metrics = this.calculatePortfolioMetrics(assets, transactions, btcPrice);
      
      // Criar objeto de dados do portfólio
      const portfolioData: PortfolioData = {
        assets,
        transactions,
        totalValue,
        btcPrice,
        lastUpdated: new Date().toISOString(),
        metrics
      };
      
      // Atualizar cache
      await cacheService.set(
        `portfolio_${this.walletAddress}`,
        portfolioData,
        cacheConfigs.medium
      );

      // Emit update event
      this.emit('portfolio_updated', portfolioData);

      return portfolioData;
    } catch (error) {
      console.error('Failed to sync wallet data:', error);
      this.emit('portfolio_error', error);
      throw error;
    }
  }

  /**
   * Obtém o preço atual do Bitcoin de várias fontes
   */
  private async getBitcoinPrice(): Promise<number> {
    try {
      // Tentar obter preço do cache primeiro
      return (await cacheService.get(
        'bitcoin_price',
        async () => {
          // Tentar múltiplas fontes para maior confiabilidade
          const sources = [
            this.fetchBitcoinPriceFromCoinGecko,
            this.fetchBitcoinPriceFromCoinMarketCap,
            this.fetchBitcoinPriceFromBinance
          ];
          
          // Executar todas as requisições em paralelo
          const results = await Promise.allSettled(
            sources.map(source => source())
          );
          
          // Filtrar resultados bem-sucedidos
          const prices = results
            .filter((result): result is PromiseFulfilledResult<number> => 
              result.status === 'fulfilled' && result.value > 0
            )
            .map(result => result.value);
          
          if (prices.length === 0) {
            return 65000; // Valor de fallback
          }
          
          // Calcular média dos preços obtidos
          return prices.reduce((sum, price) => sum + price, 0) / prices.length;
        },
        {
          ttl: 5 * 60 * 1000, // 5 minutos
          staleWhileRevalidate: true
        }
      )) || 65000;
    } catch (error) {
      console.error('Error fetching Bitcoin price:', error);
      return 65000; // Valor de fallback
    }
  }

  /**
   * Busca preço do Bitcoin da API CoinGecko
   */
  private async fetchBitcoinPriceFromCoinGecko(): Promise<number> {
    try {
      const data = await rateLimitedFetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
      );

      return data.bitcoin.usd;
    } catch (error) {
      console.error('Error fetching from CoinGecko:', error);
      throw error;
    }
  }

  /**
   * Busca preço do Bitcoin da API CoinMarketCap
   */
  private async fetchBitcoinPriceFromCoinMarketCap(): Promise<number> {
    try {
      const apiKey = process.env.CMC_API_KEY;
      
      if (!apiKey) {
        throw new Error('CoinMarketCap API key not found');
      }
      
      const response = await fetch(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC',
        {
          headers: {
            'X-CMC_PRO_API_KEY': apiKey
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data.BTC.quote.USD.price;
    } catch (error) {
      console.error('Error fetching from CoinMarketCap:', error);
      throw error;
    }
  }

  /**
   * Busca preço do Bitcoin da API Binance
   */
  private async fetchBitcoinPriceFromBinance(): Promise<number> {
    try {
      const response = await fetch(
        'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return parseFloat(data.price);
    } catch (error) {
      console.error('Error fetching from Binance:', error);
      throw error;
    }
  }

  /**
   * Sincroniza ativos da carteira
   */
  private async syncWalletAssets(address: string): Promise<Asset[]> {
    // Implementação da sincronização de ativos da carteira
    // ...
    return [];
  }

  /**
   * Calcula as métricas do portfólio
   */
  private calculatePortfolioMetrics(
    assets: Asset[],
    transactions: Transaction[],
    btcPrice: number
  ): PortfolioMetrics {
    // Implementação do cálculo das métricas do portfólio
    // Valores simulados para demonstração
    const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0) || 100000;
    const totalCostBasis = totalValue * 0.8; // Simulado: 80% do valor atual
    
    // Calcular alocação de ativos
    const btcValue = totalValue * 0.6; // 60% em Bitcoin
    const ordiValue = totalValue * 0.25; // 25% em Ordinals
    const runeValue = totalValue * 0.15; // 15% em Runes
    
    // Calcular mudanças percentuais
    const dailyChangePct = Math.random() * 0.06 - 0.03; // -3% a +3%
    const weeklyChangePct = Math.random() * 0.15 - 0.05; // -5% a +10%
    const monthlyChangePct = Math.random() * 0.3 - 0.1; // -10% a +20%
    const allTimeReturnPct = Math.random() * 0.5 + 0.1; // +10% a +60%
    
    // Calcular mudanças em USD
    const dailyChangeUsd = totalValue * dailyChangePct;
    const weeklyChangeUsd = totalValue * weeklyChangePct;
    const monthlyChangeUsd = totalValue * monthlyChangePct;
    const allTimeReturnUsd = totalValue * allTimeReturnPct;
    
    // Calcular métricas de risco
    const volatility = Math.random() * 0.2 + 0.1; // 10% a 30%
    const sharpeRatio = Math.random() * 1.5 + 0.5; // 0.5 a 2.0
    const maxDrawdown = Math.random() * 0.3 + 0.05; // 5% a 35%
    const riskScore = Math.floor(Math.random() * 10) + 1; // 1 a 10
    
    return {
      totalValue,
      totalChange24h: dailyChangeUsd,
      totalChange7d: weeklyChangeUsd,
      totalChange30d: monthlyChangeUsd,
      btcDominance: 60, // 60%
      ordinalsDominance: 25, // 25%
      runesDominance: 15, // 15%
      roi: allTimeReturnPct,
      volatility,
      sharpeRatio,
      maxDrawdown,
      bestDay: { date: '2025-06-15', change: 0.12 }, // +12%
      worstDay: { date: '2025-05-20', change: -0.08 }, // -8%
      
      // Propriedades adicionais para o componente PerformanceMetrics
      allTimeReturnPct,
      allTimeReturnUsd,
      dailyChangePct,
      dailyChangeUsd,
      weeklyChangePct,
      weeklyChangeUsd,
      monthlyChangePct,
      monthlyChangeUsd,
      totalCostBasis,
      unrealizedProfitLoss: totalValue - totalCostBasis,
      realizedProfitLoss: totalValue * 0.05, // 5% do valor total
      assetAllocation: {
        bitcoin: 60, // 60%
        ordinals: 25, // 25%
        runes: 15 // 15%
      },
      riskScore,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Carrega dados históricos do portfólio
   */
  private async loadHistoricalData(): Promise<void> {
    // Implementação do carregamento de dados históricos
    // ...
  }

  /**
   * Gera transações simuladas para testes
   */
  private async getSimulatedTransactions(address: string): Promise<Transaction[]> {
    const transactions: Transaction[] = [];
    const assets = ['BTC', 'ORDI', 'RUNE'];
    const types: ('buy' | 'sell' | 'transfer')[] = ['buy', 'sell', 'transfer'];
    const statuses: ('completed' | 'pending' | 'failed')[] = ['completed', 'pending', 'failed'];
    
    // Gerar 10 transações aleatórias
    for (let i = 0; i < 10; i++) {
      const asset = assets[Math.floor(Math.random() * assets.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const amount = Math.random() * 10;
      const price = asset === 'BTC' ? 65000 + Math.random() * 5000 : 
                   asset === 'ORDI' ? 40 + Math.random() * 10 : 
                   15 + Math.random() * 5;
      
      transactions.push({
        id: `tx_${i}_${Date.now()}`,
        type,
        asset,
        amount,
        price,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        fee: Math.random() * 0.01,
        status
      });
    }
    
    return transactions;
  }

  /**
   * Retorna todos os ativos do portfólio
   */
  public getAssets(): Asset[] {
    return this.portfolioData?.assets || [];
  }
  
  /**
   * Retorna todas as transações do portfólio
   */
  public getTransactions(): Transaction[] {
    return this.portfolioData?.transactions || [];
  }
  
  /**
   * Retorna os dados de desempenho do portfólio
   */
  public getPerformanceData(): PerformanceData | null {
    if (!this.portfolioData) return null;
    
    // Criar um objeto PerformanceData a partir das métricas do portfólio
    const metrics = this.portfolioData.metrics;
    
    return {
      totalValue: metrics.totalValue,
      totalChange: metrics.totalChange24h,
      roi: metrics.roi,
      btcComparison: 0, // Calculado com base no desempenho do BTC
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      volatility: metrics.volatility,
      sharpeRatio: metrics.sharpeRatio,
      maxDrawdown: metrics.maxDrawdown,
      bestDay: metrics.bestDay,
      worstDay: metrics.worstDay,
      predictedTrend: 'neutral',
      confidenceScore: 0.5,
      aiInsights: {
        trendAnalysis: 'Análise de tendência baseada em dados históricos e previsões de IA.',
        riskAssessment: 'Avaliação de risco baseada em volatilidade e correlações de mercado.',
        recommendations: [
          'Considere diversificar seu portfólio para reduzir o risco.',
          'Monitore o mercado de Ordinals para oportunidades de curto prazo.',
          'Mantenha uma reserva de Bitcoin como hedge contra volatilidade.'
        ]
      }
    };
  }
  
  /**
   * Retorna o valor total do portfólio
   */
  public getTotalValue(): number {
    return this.portfolioData?.totalValue || 0;
  }

  /**
   * Sincroniza o portfólio manualmente
   */
  public async syncPortfolio(): Promise<void> {
    if (!this.walletAddress) {
      throw new Error('Wallet address not set. Call initialize() first.');
    }

    if (this.isLoading) {
      return; // Already syncing
    }

    try {
      this.isLoading = true;
      this.emit('sync_started');

      const portfolioData = await this.syncWalletData();
      this.portfolioData = portfolioData;
      this.lastSyncTime = new Date().toISOString();

      this.emit('sync_completed');
      this.emit('portfolio_updated', portfolioData);
    } catch (error) {
      console.error('Failed to sync portfolio:', error);
      this.emit('portfolio_error', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Retorna as métricas do portfólio
   */
  public getMetrics(): PortfolioMetrics | null {
    return this.portfolioData?.metrics || null;
  }

  /**
   * Verifica se o serviço está carregando
   */
  public isLoadingData(): boolean {
    return this.isLoading;
  }

  /**
   * Retorna o tempo da última sincronização
   */
  public getLastSyncTime(): string | null {
    return this.lastSyncTime;
  }

  /**
   * Retorna um resumo completo do portfólio
   */
  public getPortfolioSummary(): PortfolioSummary | null {
    if (!this.portfolioData) {
      return null;
    }

    const { assets, transactions, metrics, totalValue, lastUpdated } = this.portfolioData;

    // Calcular alocação de ativos
    const assetAllocation: AssetAllocation[] = [
      {
        type: 'Bitcoin',
        value: totalValue * (metrics.btcDominance / 100),
        percentage: metrics.btcDominance,
        color: '#F7931A'
      },
      {
        type: 'Ordinals',
        value: totalValue * (metrics.ordinalsDominance / 100),
        percentage: metrics.ordinalsDominance,
        color: '#FF6B35'
      },
      {
        type: 'Runes',
        value: totalValue * (metrics.runesDominance / 100),
        percentage: metrics.runesDominance,
        color: '#4ECDC4'
      }
    ];

    return {
      totalValue,
      totalChange24h: metrics.totalChange24h,
      totalChange7d: metrics.totalChange7d,
      totalChange30d: metrics.totalChange30d,
      assets,
      transactions,
      metrics,
      assetAllocation,
      lastUpdated
    };
  }
}

export const portfolioService = new PortfolioService();
