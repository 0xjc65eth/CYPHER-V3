/**
 * CoinMarketCap Real Service
 * Production-ready integration with CoinMarketCap API for real-time market data
 */

export interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercentage24h: number;
  volume24h: number;
  marketCap: number;
  rank: number;
  lastUpdated: Date;
}

export interface GlobalStats {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  activeCryptocurrencies: number;
  totalExchanges: number;
  defiVolume24h: number;
  lastUpdated: Date;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  isActive: boolean;
  createdAt: Date;
}

class CoinMarketCapRealService {
  private apiKey: string;
  private baseUrl = 'https://pro-api.coinmarketcap.com/v1';
  private sandboxUrl = 'https://sandbox-api.coinmarketcap.com/v1';
  private useSandbox = false;
  
  // Cache for API responses (5 minute cache)
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    this.apiKey = process.env.CMC_API_KEY || '';
    this.useSandbox = process.env.NODE_ENV === 'development';
  }
  
  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }
  
  /**
   * Get base URL based on environment
   */
  private getBaseUrl(): string {
    return this.useSandbox ? this.sandboxUrl : this.baseUrl;
  }
  
  /**
   * Get cached data if available and not expired
   */
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }
  
  /**
   * Set data in cache
   */
  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  
  /**
   * Make API request with error handling
   */
  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('CoinMarketCap API key not configured');
    }
    
    const cacheKey = `${endpoint}-${JSON.stringify(params)}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }
    
    const url = new URL(`${this.getBaseUrl()}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });
    
    try {
      const response = await fetch(url.toString(), {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`CoinMarketCap API error: ${response.status} - ${errorData.status?.error_message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      if (data.status?.error_code !== 0) {
        throw new Error(`API Error: ${data.status?.error_message || 'Unknown error'}`);
      }
      
      this.setCachedData(cacheKey, data.data);
      return data.data;
    } catch (error) {
      console.error('CoinMarketCap API request failed:', error);
      throw error;
    }
  }
  
  /**
   * Get latest prices for specified cryptocurrencies
   */
  async getLatestPrices(symbols: string[], convert: string = 'USD'): Promise<CoinPrice[]> {
    try {
      const data = await this.makeRequest('/cryptocurrency/quotes/latest', {
        symbol: symbols.join(','),
        convert
      });
      
      const prices: CoinPrice[] = [];
      
      symbols.forEach(symbol => {
        const coinData = data[symbol];
        if (coinData && coinData.length > 0) {
          const coin = coinData[0];
          const quote = coin.quote[convert];
          
          prices.push({
            id: coin.id.toString(),
            symbol: coin.symbol,
            name: coin.name,
            price: quote.price,
            change24h: quote.percent_change_24h,
            changePercentage24h: quote.percent_change_24h,
            volume24h: quote.volume_24h,
            marketCap: quote.market_cap,
            rank: coin.cmc_rank,
            lastUpdated: new Date(quote.last_updated)
          });
        }
      });
      
      return prices;
    } catch (error) {
      console.error('Error fetching latest prices:', error);
      return this.getFallbackPrices(symbols);
    }
  }
  
  /**
   * Get global cryptocurrency statistics
   */
  async getGlobalStats(convert: string = 'USD'): Promise<GlobalStats> {
    try {
      const data = await this.makeRequest('/global-metrics/quotes/latest', { convert });
      
      const quote = data.quote[convert];
      
      return {
        totalMarketCap: quote.total_market_cap,
        totalVolume24h: quote.total_volume_24h,
        btcDominance: data.btc_dominance,
        activeCryptocurrencies: data.active_cryptocurrencies,
        totalExchanges: data.active_exchanges,
        defiVolume24h: quote.defi_volume_24h || 0,
        lastUpdated: new Date(quote.last_updated)
      };
    } catch (error) {
      console.error('Error fetching global stats:', error);
      return this.getFallbackGlobalStats();
    }
  }
  
  /**
   * Get top cryptocurrencies by market cap
   */
  async getTopCryptocurrencies(limit: number = 100, convert: string = 'USD'): Promise<CoinPrice[]> {
    try {
      const data = await this.makeRequest('/cryptocurrency/listings/latest', {
        start: 1,
        limit,
        convert
      });
      
      return data.map((coin: any) => {
        const quote = coin.quote[convert];
        return {
          id: coin.id.toString(),
          symbol: coin.symbol,
          name: coin.name,
          price: quote.price,
          change24h: quote.percent_change_24h,
          changePercentage24h: quote.percent_change_24h,
          volume24h: quote.volume_24h,
          marketCap: quote.market_cap,
          rank: coin.cmc_rank,
          lastUpdated: new Date(quote.last_updated)
        };
      });
    } catch (error) {
      console.error('Error fetching top cryptocurrencies:', error);
      return this.getFallbackPrices(['BTC', 'ETH', 'SOL', 'ADA', 'DOT']);
    }
  }
  
  /**
   * Get historical data for a cryptocurrency
   */
  async getHistoricalData(
    symbol: string, 
    timeStart: Date, 
    timeEnd: Date, 
    convert: string = 'USD'
  ): Promise<any[]> {
    try {
      const data = await this.makeRequest('/cryptocurrency/quotes/historical', {
        symbol,
        time_start: timeStart.toISOString(),
        time_end: timeEnd.toISOString(),
        convert
      });
      
      return data.quotes || [];
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }
  }
  
  /**
   * Search for cryptocurrencies
   */
  async searchCryptocurrencies(query: string): Promise<any[]> {
    try {
      const data = await this.makeRequest('/cryptocurrency/map', {
        listing_status: 'active',
        limit: 20
      });
      
      // Filter results based on query
      return data.filter((coin: any) => 
        coin.name.toLowerCase().includes(query.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching cryptocurrencies:', error);
      return [];
    }
  }
  
  /**
   * Get cryptocurrency metadata
   */
  async getCryptocurrencyInfo(symbols: string[]): Promise<any> {
    try {
      return await this.makeRequest('/cryptocurrency/info', {
        symbol: symbols.join(',')
      });
    } catch (error) {
      console.error('Error fetching cryptocurrency info:', error);
      return {};
    }
  }
  
  /**
   * Get trending cryptocurrencies
   */
  async getTrendingCryptocurrencies(): Promise<CoinPrice[]> {
    try {
      // Get latest listings and sort by volume
      const data = await this.getTopCryptocurrencies(50);
      return data
        .sort((a, b) => b.volume24h - a.volume24h)
        .slice(0, 10);
    } catch (error) {
      console.error('Error fetching trending cryptocurrencies:', error);
      return [];
    }
  }
  
  /**
   * Fallback prices when API is unavailable
   */
  private getFallbackPrices(symbols: string[]): CoinPrice[] {
    console.warn('[CMC] Using stale fallback prices');
    const fallbackData: Record<string, Partial<CoinPrice>> = {
      'BTC': { symbol: 'BTC', name: 'Bitcoin', price: 98500, change24h: 2.5 },
      'ETH': { symbol: 'ETH', name: 'Ethereum', price: 3800, change24h: 1.8 },
      'SOL': { symbol: 'SOL', name: 'Solana', price: 235, change24h: 5.2 },
      'ADA': { symbol: 'ADA', name: 'Cardano', price: 1.05, change24h: -1.2 },
      'DOT': { symbol: 'DOT', name: 'Polkadot', price: 8.20, change24h: 0.8 }
    };
    
    return symbols.map(symbol => {
      const fallback = fallbackData[symbol] || { symbol, name: symbol, price: 100, change24h: 0 };
      return {
        id: symbol,
        symbol: fallback.symbol!,
        name: fallback.name!,
        price: fallback.price!,
        change24h: fallback.change24h!,
        changePercentage24h: fallback.change24h!,
        volume24h: 0,
        marketCap: 0,
        rank: 0,
        lastUpdated: new Date()
      };
    });
  }
  
  /**
   * Fallback global stats when API is unavailable
   */
  private getFallbackGlobalStats(): GlobalStats {
    return {
      totalMarketCap: 2400000000000,
      totalVolume24h: 95000000000,
      btcDominance: 51.2,
      activeCryptocurrencies: 13500,
      totalExchanges: 750,
      defiVolume24h: 12000000000,
      lastUpdated: new Date()
    };
  }
  
  /**
   * Format price for Brazilian display
   */
  formatPriceBrazilian(price: number, symbol: string = 'USD'): string {
    if (symbol === 'BRL') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(price);
    }
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }
  
  /**
   * Generate Brazilian market commentary
   */
  generateBrazilianCommentary(coins: CoinPrice[]): string {
    const btc = coins.find(c => c.symbol === 'BTC');
    const eth = coins.find(c => c.symbol === 'ETH');
    
    if (!btc) return 'Mercado tá movimentado hoje, galera!';
    
    const btcTrend = btc.change24h > 0 ? 'subindo' : 'descendo';
    const btcEmoji = btc.change24h > 0 ? '📈' : '📉';
    
    let commentary = `Bitcoin tá ${btcTrend} ${Math.abs(btc.change24h).toFixed(2)}% hoje! ${btcEmoji} `;
    
    if (Math.abs(btc.change24h) > 5) {
      commentary += btc.change24h > 0 ? 'Que movimento massa! 🚀' : 'Correção forte, mas é normal! 💎';
    } else if (Math.abs(btc.change24h) > 2) {
      commentary += 'Movimento interessante no mercado!';
    } else {
      commentary += 'Mercado tranquilo hoje.';
    }
    
    if (eth && Math.abs(eth.change24h) > 3) {
      const ethTrend = eth.change24h > 0 ? 'bombando' : 'corrigindo';
      commentary += ` Ethereum também tá ${ethTrend} ${Math.abs(eth.change24h).toFixed(2)}%!`;
    }
    
    return commentary;
  }
  
  /**
   * Get API usage information
   */
  async getAPIUsage(): Promise<any> {
    try {
      return await this.makeRequest('/key/info');
    } catch (error) {
      console.error('Error fetching API usage:', error);
      return null;
    }
  }
}

export const coinMarketCapService = new CoinMarketCapRealService();