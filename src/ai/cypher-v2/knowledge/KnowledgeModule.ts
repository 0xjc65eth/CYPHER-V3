// CYPHER AI v2 - Knowledge Module
// Centralized knowledge management and market data aggregation

import EventEmitter from 'events';
import type { 
  CypherAIConfig, 
  MarketData, 
  Intent 
} from '../types';

export class KnowledgeModule extends EventEmitter {
  private config: CypherAIConfig;
  private marketDataCache: MarketData | null = null;
  private lastUpdate: Date | null = null;
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: CypherAIConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize market data fetching
      await this.fetchMarketData();
      
      // Set up periodic updates
      this.startPeriodicUpdates();
      
      this.emit('initialized');
    } catch (error) {
      console.error('Erro ao inicializar KnowledgeModule:', error);
      throw error;
    }
  }

  private startPeriodicUpdates(): void {
    // Prevent double intervals (memory leak)
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    // Update market data every 30 seconds
    this.updateInterval = setInterval(async () => {
      try {
        await this.fetchMarketData();
      } catch (error) {
        console.error('Erro ao atualizar dados de mercado:', error);
      }
    }, 30000);
  }

  async getMarketContext(entities: Record<string, any>): Promise<MarketData> {
    // If we have recent data, return it
    if (this.marketDataCache && this.isDataFresh()) {
      return this.marketDataCache;
    }

    // Otherwise fetch fresh data
    await this.fetchMarketData();
    return this.marketDataCache!;
  }

  async getMarketData(): Promise<MarketData> {
    if (!this.marketDataCache || !this.isDataFresh()) {
      await this.fetchMarketData();
    }
    return this.marketDataCache!;
  }

  private async fetchMarketData(): Promise<void> {
    try {
      // Try CoinMarketCap first, then fallback to other sources
      const marketResponse = await this.fetchBitcoinData();
      
      // If CoinMarketCap returns both BTC and ETH data, use it
      if (marketResponse.bitcoin && marketResponse.ethereum) {
        this.marketDataCache = {
          bitcoin: marketResponse.bitcoin,
          ethereum: marketResponse.ethereum,
          market: await this.fetchMarketOverview(),
          ordinals: await this.fetchOrdinalsData(),
          runes: await this.fetchRunesData()
        };
      } else {
        // Fallback to individual calls
        const bitcoinData = marketResponse;
        const ethereumData = await this.fetchEthereumData();
        const marketOverview = await this.fetchMarketOverview();
        const ordinalsData = await this.fetchOrdinalsData();
        const runesData = await this.fetchRunesData();

        this.marketDataCache = {
          bitcoin: bitcoinData,
          ethereum: ethereumData,
          market: marketOverview,
          ordinals: ordinalsData,
          runes: runesData
        };
      }

      this.lastUpdate = new Date();
      this.emit('marketUpdate', this.marketDataCache);
    } catch (error) {
      console.error('Erro ao buscar dados de mercado:', error);
      
      // If we don't have any cached data, provide enhanced fallback
      if (!this.marketDataCache) {
        this.marketDataCache = this.getEnhancedFallbackMarketData();
      }
    }
  }

  private async fetchBitcoinData(): Promise<any> {
    try {
      // Try sources in order of preference
      const sourceAttempts = [
        { name: 'CoinMarketCap', fn: () => this.fetchFromCoinMarketCap() },
        { name: 'Mempool', fn: () => this.fetchFromMempool() },
        { name: 'Blockstream', fn: () => this.fetchFromBlockstream() },
        { name: 'CoinGecko', fn: () => this.fetchFromCoinGecko() },
        { name: 'DEX', fn: () => this.fetchFromDEXAggregator() }
      ];

      for (const source of sourceAttempts) {
        try {
          console.debug(`Tentando buscar dados do ${source.name}...`);
          const result = await source.fn();
          console.debug(`✅ Dados obtidos com sucesso do ${source.name}`);
          return result;
        } catch (error) {
          console.debug(`⚠️ ${source.name} falhou:`, error instanceof Error ? error.message : 'Unknown error');
          // Continue to next source
        }
      }

      // All sources failed, use simulated data
      return this.getSimulatedBitcoinData();
    } catch (error) {
      console.error('Erro crítico ao buscar dados do Bitcoin:', error);
      return this.getSimulatedBitcoinData();
    }
  }

  private async fetchFromCoinMarketCap(): Promise<any> {
    // CoinMarketCap requires server-side proxy due to CORS
    // Skip for now and use alternative sources
    console.debug('CoinMarketCap: Skipping due to CORS restrictions in browser');
    throw new Error('CoinMarketCap requires server-side proxy');
  }
  
  private getSimulatedEthereumData(): any {
    return {
      price: null,
      change24h: null,
      volume24h: null,
      marketCap: null,
      source: 'unavailable',
      note: 'ETH data fetch failed'
    };
  }

  private async fetchFromMempool(): Promise<any> {
    // Mempool.space is a reliable decentralized source (price only, no 24h change)
    const response = await fetch('https://mempool.space/api/v1/prices');
    const data = await response.json();

    return {
      price: Math.round(data.USD),
      change24h: null, // mempool.space does not provide 24h change
      volume24h: null, // mempool.space does not provide volume
      marketCap: Math.round(data.USD * 19700000),
      dominance: null, // not available from this source
      source: 'mempool.space'
    };
  }

  private async fetchFromBlockstream(): Promise<any> {
    // Blockstream only provides block data, not price — skip as a price source
    throw new Error('Blockstream does not provide price data');
  }

  private async fetchFromCoinGecko(): Promise<any> {
    // CoinGecko como backup com melhor tratamento de erro
    const apiKey = this.config.apiKeys?.coingecko;
    
    // Skip CoinGecko if using invalid demo key
    if (apiKey === 'your_coingecko_api_key' || !apiKey) {
      console.debug('CoinGecko: Invalid or missing API key, skipping');
      throw new Error('Invalid CoinGecko API key');
    }
    
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&x_cg_demo_api_key=${apiKey}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CypherAI/3.0'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('CoinGecko API unauthorized');
        }
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.bitcoin) {
        throw new Error('Invalid CoinGecko response format');
      }
      
      return {
        price: Math.round(data.bitcoin.usd),
        change24h: +(data.bitcoin.usd_24h_change || 0).toFixed(2),
        volume24h: null, // CoinGecko simple/price endpoint does not return volume
        marketCap: Math.round(data.bitcoin.usd * 19700000),
        dominance: null, // not available from this endpoint
        source: 'coingecko',
        lastUpdated: new Date()
      };
    } catch (error) {
      console.debug('CoinGecko fetch failed:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async fetchFromDEXAggregator(): Promise<any> {
    // No real DEX aggregator integration configured
    throw new Error('DEX aggregator not configured');
  }

  private getSimulatedBitcoinData(): any {
    return {
      price: null,
      change24h: null,
      volume24h: null,
      marketCap: null,
      dominance: null,
      source: 'unavailable',
      note: 'All BTC price sources failed'
    };
  }

  private async fetchEthereumData(): Promise<any> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Binance API error: ${response.status}`);
      const data = await response.json();

      return {
        price: Math.round(parseFloat(data.lastPrice)),
        change24h: +parseFloat(data.priceChangePercent).toFixed(2),
        volume24h: Math.round(parseFloat(data.quoteVolume)),
        marketCap: Math.round(parseFloat(data.lastPrice) * 120000000),
        source: 'binance'
      };
    } catch (error) {
      console.error('ETH data fetch failed:', error instanceof Error ? error.message : 'Unknown');
      return this.getSimulatedEthereumData();
    }
  }

  private async fetchMarketOverview(): Promise<any> {
    const result: any = {
      totalMarketCap: null,
      totalVolume: null,
      fearGreedIndex: null,
      activeCryptocurrencies: null,
      source: 'partial'
    };

    // Fetch Fear & Greed Index from alternative.me
    try {
      const controller1 = new AbortController();
      const t1 = setTimeout(() => controller1.abort(), 5000);
      const fgResponse = await fetch('https://api.alternative.me/fng/?limit=1', { signal: controller1.signal });
      clearTimeout(t1);
      if (fgResponse.ok) {
        const fgData = await fgResponse.json();
        if (fgData?.data?.[0]) {
          result.fearGreedIndex = parseInt(fgData.data[0].value, 10);
        }
      }
    } catch (error) {
      console.debug('Fear & Greed fetch failed:', error instanceof Error ? error.message : 'Unknown');
    }

    // Fetch global market data from CoinGecko proxy
    try {
      const controller2 = new AbortController();
      const t2 = setTimeout(() => controller2.abort(), 5000);
      const globalResponse = await fetch('/api/coingecko/global', { signal: controller2.signal });
      clearTimeout(t2);
      if (globalResponse.ok) {
        const globalData = await globalResponse.json();
        if (globalData?.data) {
          result.totalMarketCap = Math.round(globalData.data.total_market_cap?.usd || 0);
          result.totalVolume = Math.round(globalData.data.total_volume?.usd || 0);
          result.activeCryptocurrencies = globalData.data.active_cryptocurrencies || null;
        }
      }
    } catch (error) {
      console.debug('CoinGecko global data fetch failed:', error instanceof Error ? error.message : 'Unknown');
    }

    return result;
  }

  private async fetchOrdinalsData(): Promise<any> {
    return {
      source: 'unavailable',
      note: 'Real-time ordinals data requires API subscription'
    };
  }

  private async fetchRunesData(): Promise<any> {
    return {
      source: 'unavailable',
      note: 'Real-time runes data requires API subscription'
    };
  }

  private getFallbackMarketData(): MarketData {
    return this.getEnhancedFallbackMarketData();
  }
  
  private getEnhancedFallbackMarketData(): MarketData {
    // Return null values instead of random data when all sources fail
    return {
      bitcoin: {
        price: null,
        change24h: null,
        volume24h: null,
        marketCap: null,
        dominance: null,
        source: 'unavailable',
        lastUpdated: new Date()
      },
      ethereum: {
        price: null,
        change24h: null,
        volume24h: null,
        marketCap: null,
        source: 'unavailable',
        lastUpdated: new Date()
      },
      market: {
        totalMarketCap: null,
        totalVolume: null,
        fearGreedIndex: null,
        activeCryptocurrencies: null,
        source: 'unavailable'
      },
      ordinals: {
        source: 'unavailable',
        note: 'Real-time ordinals data requires API subscription'
      },
      runes: {
        source: 'unavailable',
        note: 'Real-time runes data requires API subscription'
      }
    };
  }

  private isDataFresh(): boolean {
    if (!this.lastUpdate) return false;
    const now = new Date();
    const diffMs = now.getTime() - this.lastUpdate.getTime();
    return diffMs < 60000; // Data is fresh for 1 minute
  }

  async analyzeMarket(asset: string): Promise<any> {
    const marketData = await this.getMarketData();
    
    // Simple market analysis
    const analysis = {
      asset,
      price: marketData.bitcoin?.price || 0,
      trend: this.determineTrend(marketData.bitcoin?.change24h || 0),
      sentiment: this.determineSentiment(marketData.market?.fearGreedIndex || 50),
      support: this.calculateSupport(marketData.bitcoin?.price || 0),
      resistance: this.calculateResistance(marketData.bitcoin?.price || 0),
      recommendation: 'HOLD' as 'BUY' | 'SELL' | 'HOLD'
    };

    // Determine recommendation
    if (marketData.bitcoin?.change24h && marketData.bitcoin.change24h > 3) {
      analysis.recommendation = 'BUY';
    } else if (marketData.bitcoin?.change24h && marketData.bitcoin.change24h < -3) {
      analysis.recommendation = 'SELL';
    }

    return analysis;
  }

  private determineTrend(change24h: number): 'bullish' | 'bearish' | 'sideways' {
    if (change24h > 2) return 'bullish';
    if (change24h < -2) return 'bearish';
    return 'sideways';
  }

  private determineSentiment(fearGreedIndex: number): 'fear' | 'greed' | 'neutral' {
    if (fearGreedIndex < 40) return 'fear';
    if (fearGreedIndex > 60) return 'greed';
    return 'neutral';
  }

  private calculateSupport(price: number): number {
    // Simple support calculation (2% below current price)
    return Math.round(price * 0.98);
  }

  private calculateResistance(price: number): number {
    // Simple resistance calculation (3% above current price)
    return Math.round(price * 1.03);
  }

  get currentMarketData(): MarketData | null {
    return this.marketDataCache;
  }

  async destroy(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.removeAllListeners();
  }
}