'use client';

// Local type definitions (WalletContext types are not exported)
export interface WalletBalance {
  bitcoin: number;
  usd: number;
  ordinals: number;
  runes: number;
}

export interface PortfolioData {
  totalValue: number;
  totalCost: number;
  totalPNL: number;
  totalPNLPercentage: number;
  bitcoin: {
    amount: number;
    currentValue: number;
    averageBuyPrice: number;
    realizedPNL: number;
    unrealizedPNL: number;
  };
  ordinals: Array<{ id: string; currentValue: number; cost: number }>;
  runes: Array<{ id: string; currentValue: number; cost: number }>;
  transactions: Array<{
    id: string;
    type: 'buy' | 'sell';
    amount: number;
    price: number;
    date: string;
    asset: string;
  }>;
}

export interface BitcoinPrice {
  usd: number;
  usd_24h_change: number;
  last_updated: string;
}

export interface OrdinalsData {
  inscriptions: Array<{
    id: string;
    number: number;
    content_type: string;
    content_length: number;
    fee: number;
    height: number;
    timestamp: string;
    sat: number;
    address: string;
    value: number;
  }>;
  total: number;
}

export interface RunesData {
  balances: Array<{
    rune: string;
    amount: string;
    symbol: string;
    divisibility: number;
    spacedRune: string;
  }>;
  total: number;
}

export interface TransactionData {
  txid: string;
  version: number;
  locktime: number;
  vin: Array<{
    txid: string;
    vout: number;
    prevout: {
      scriptpubkey: string;
      scriptpubkey_asm: string;
      scriptpubkey_type: string;
      scriptpubkey_address: string;
      value: number;
    };
  }>;
  vout: Array<{
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address: string;
    value: number;
  }>;
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
}

// Cache interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

// Professional wallet data service with caching and advanced calculations
export class EnhancedWalletDataService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_DURATION = {
    balance: 30 * 1000, // 30 seconds
    portfolio: 60 * 1000, // 1 minute
    transactions: 2 * 60 * 1000, // 2 minutes
    ordinals: 5 * 60 * 1000, // 5 minutes
    runes: 5 * 60 * 1000, // 5 minutes
    btcPrice: 30 * 1000, // 30 seconds
  };

  // Cache management
  private getCacheKey(type: string, address: string, params?: any): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${type}:${address}:${paramsStr}`;
  }

  private setCache<T>(key: string, data: T, duration: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + duration,
    });
  }

  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  // Bitcoin price fetching
  async getBitcoinPrice(): Promise<BitcoinPrice> {
    const cacheKey = 'btc-price';
    const cached = this.getCache<BitcoinPrice>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch('/api/bitcoin/price/');
      const data = await response.json();
      
      if (data.success) {
        const priceData: BitcoinPrice = {
          usd: data.data.usd || 42000,
          usd_24h_change: data.data.usd_24h_change || 0,
          last_updated: new Date().toISOString(),
        };
        
        this.setCache(cacheKey, priceData, this.CACHE_DURATION.btcPrice);
        return priceData;
      }
      
      throw new Error('Failed to fetch Bitcoin price');
    } catch (error) {
      console.error('Bitcoin price fetch error:', error);
      // Return fallback price
      return {
        usd: 42000,
        usd_24h_change: 0,
        last_updated: new Date().toISOString(),
      };
    }
  }

  // Wallet balance fetching
  async getWalletBalance(address: string): Promise<WalletBalance> {
    const cacheKey = this.getCacheKey('balance', address);
    const cached = this.getCache<WalletBalance>(cacheKey);
    if (cached) return cached;

    try {
      const btcPrice = await this.getBitcoinPrice();
      
      // Fetch Bitcoin balance
      const balanceResponse = await fetch(`/api/bitcoin/address/${address}/balance/`);
      const balanceData = await balanceResponse.json();
      
      const bitcoinBalance = balanceData.success ? balanceData.data.balance / 100000000 : 0;
      
      // Fetch Ordinals count
      const ordinalsCount = await this.getOrdinalsCount(address);
      
      // Fetch Runes count
      const runesCount = await this.getRunesCount(address);
      
      const balance: WalletBalance = {
        bitcoin: bitcoinBalance,
        usd: bitcoinBalance * btcPrice.usd,
        ordinals: ordinalsCount,
        runes: runesCount,
      };
      
      this.setCache(cacheKey, balance, this.CACHE_DURATION.balance);
      return balance;
      
    } catch (error) {
      console.error('Balance fetch error:', error);
      return {
        bitcoin: 0,
        usd: 0,
        ordinals: 0,
        runes: 0,
      };
    }
  }

  // Portfolio data with professional calculations
  async getPortfolioData(address: string): Promise<PortfolioData> {
    const cacheKey = this.getCacheKey('portfolio', address);
    const cached = this.getCache<PortfolioData>(cacheKey);
    if (cached) return cached;

    try {
      const [balance, transactions, btcPrice, ordinals, runes] = await Promise.all([
        this.getWalletBalance(address),
        this.getTransactionHistory(address),
        this.getBitcoinPrice(),
        this.getOrdinals(address),
        this.getRunes(address),
      ]);

      // Calculate portfolio metrics
      const portfolioCalculations = this.calculatePortfolioMetrics(
        balance,
        transactions,
        btcPrice.usd
      );

      const portfolioData: PortfolioData = {
        totalValue: balance.usd,
        totalCost: portfolioCalculations.totalCost,
        totalPNL: portfolioCalculations.totalPNL,
        totalPNLPercentage: portfolioCalculations.totalPNLPercentage,
        bitcoin: {
          amount: balance.bitcoin,
          currentValue: balance.usd,
          averageBuyPrice: portfolioCalculations.averageBuyPrice,
          realizedPNL: portfolioCalculations.realizedPNL,
          unrealizedPNL: portfolioCalculations.unrealizedPNL,
        },
        ordinals: ordinals.inscriptions.map((ord: any) => ({
          id: ord.id,
          currentValue: ord.value || 0,
          cost: ord.fee || 0,
        })),
        runes: runes.balances.map((rune: any) => ({
          id: rune.rune,
          currentValue: 0, // Would need market data
          cost: 0, // Would need transaction history
        })),
        transactions: transactions.map((tx: any) => ({
          id: tx.txid,
          type: this.determineTransactionType(tx, address),
          amount: this.calculateTransactionAmount(tx, address),
          price: btcPrice.usd,
          date: new Date(tx.status.block_time * 1000).toISOString(),
          asset: 'BTC',
        })),
      };

      this.setCache(cacheKey, portfolioData, this.CACHE_DURATION.portfolio);
      return portfolioData;
      
    } catch (error) {
      console.error('Portfolio fetch error:', error);
      throw error;
    }
  }

  // Advanced portfolio calculations
  private calculatePortfolioMetrics(
    balance: WalletBalance,
    transactions: TransactionData[],
    currentBtcPrice: number
  ) {
    let totalInvested = 0;
    let totalReceived = 0;
    let totalBtcBought = 0;
    let totalBtcSold = 0;
    let realizedPNL = 0;

    // Analyze transactions to calculate costs
    transactions.forEach(tx => {
      const isIncoming = tx.vout.some(vout => 
        vout.scriptpubkey_address === this.getAddressFromTransaction(tx)
      );
      
      const amount = this.calculateTransactionAmount(tx, this.getAddressFromTransaction(tx));
      
      if (isIncoming && amount > 0) {
        totalBtcBought += amount;
        totalInvested += amount * currentBtcPrice; // Estimate using current price
      } else if (!isIncoming && amount > 0) {
        totalBtcSold += amount;
        totalReceived += amount * currentBtcPrice; // Estimate using current price
        realizedPNL += (amount * currentBtcPrice) - (amount * (totalInvested / totalBtcBought));
      }
    });

    const averageBuyPrice = totalBtcBought > 0 ? totalInvested / totalBtcBought : currentBtcPrice;
    const currentValue = balance.bitcoin * currentBtcPrice;
    const unrealizedPNL = currentValue - (balance.bitcoin * averageBuyPrice);
    const totalPNL = realizedPNL + unrealizedPNL;
    const totalPNLPercentage = totalInvested > 0 ? (totalPNL / totalInvested) * 100 : 0;

    return {
      totalCost: totalInvested,
      totalPNL,
      totalPNLPercentage,
      averageBuyPrice,
      realizedPNL,
      unrealizedPNL,
    };
  }

  // Transaction history
  async getTransactionHistory(address: string, limit: number = 50): Promise<TransactionData[]> {
    const cacheKey = this.getCacheKey('transactions', address, { limit });
    const cached = this.getCache<TransactionData[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`/api/bitcoin/address/${address}/txs/?limit=${limit}`);
      const data = await response.json();
      
      if (data.success) {
        this.setCache(cacheKey, data.data.transactions, this.CACHE_DURATION.transactions);
        return data.data.transactions;
      }
      
      return [];
    } catch (error) {
      console.error('Transaction history fetch error:', error);
      return [];
    }
  }

  // Ordinals data
  async getOrdinals(address: string): Promise<OrdinalsData> {
    const cacheKey = this.getCacheKey('ordinals', address);
    const cached = this.getCache<OrdinalsData>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`/api/ordinals/address/${address}/`);
      const data = await response.json();
      
      if (data.success) {
        const ordinalsData: OrdinalsData = {
          inscriptions: data.data.inscriptions || [],
          total: data.data.total || 0,
        };
        
        this.setCache(cacheKey, ordinalsData, this.CACHE_DURATION.ordinals);
        return ordinalsData;
      }
      
      return { inscriptions: [], total: 0 };
    } catch (error) {
      console.error('Ordinals fetch error:', error);
      return { inscriptions: [], total: 0 };
    }
  }

  // Runes data
  async getRunes(address: string): Promise<RunesData> {
    const cacheKey = this.getCacheKey('runes', address);
    const cached = this.getCache<RunesData>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`/api/runes/address/${address}/`);
      const data = await response.json();
      
      if (data.success) {
        const runesData: RunesData = {
          balances: data.data.balances || [],
          total: data.data.total || 0,
        };
        
        this.setCache(cacheKey, runesData, this.CACHE_DURATION.runes);
        return runesData;
      }
      
      return { balances: [], total: 0 };
    } catch (error) {
      console.error('Runes fetch error:', error);
      return { balances: [], total: 0 };
    }
  }

  // Helper methods
  private async getOrdinalsCount(address: string): Promise<number> {
    try {
      const ordinals = await this.getOrdinals(address);
      return ordinals.total;
    } catch {
      return 0;
    }
  }

  private async getRunesCount(address: string): Promise<number> {
    try {
      const runes = await this.getRunes(address);
      return runes.balances.length;
    } catch {
      return 0;
    }
  }

  private determineTransactionType(tx: TransactionData, address: string): 'buy' | 'sell' {
    const isIncoming = tx.vout.some(vout => vout.scriptpubkey_address === address);
    return isIncoming ? 'buy' : 'sell';
  }

  private calculateTransactionAmount(tx: TransactionData, address: string): number {
    let amount = 0;
    
    // Calculate incoming amount
    tx.vout.forEach(vout => {
      if (vout.scriptpubkey_address === address) {
        amount += vout.value;
      }
    });
    
    // Calculate outgoing amount
    tx.vin.forEach(vin => {
      if (vin.prevout.scriptpubkey_address === address) {
        amount -= vin.prevout.value;
      }
    });
    
    return Math.abs(amount) / 100000000; // Convert satoshis to BTC
  }

  private getAddressFromTransaction(tx: TransactionData): string {
    // Return the first address found in outputs
    for (const vout of tx.vout) {
      if (vout.scriptpubkey_address) {
        return vout.scriptpubkey_address;
      }
    }
    return '';
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const walletDataService = new EnhancedWalletDataService();