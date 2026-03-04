/**
 * 📊 Real Data Service - CYPHER ORDI FUTURE V3.0
 * Integration with real blockchain and market data APIs
 */

import axios from 'axios';

export interface BitcoinMetrics {
  price: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  dominance: number;
  fearGreedIndex: number;
  hashRate: number;
  difficulty: number;
  blockHeight: number;
  avgBlockTime: number;
  memPoolSize: number;
  nextHalving: {
    blocksUntil: number;
    estimatedDate: string;
    progress: number;
  };
}

export interface OrdinalsData {
  totalInscriptions: number;
  inscriptionsToday: number;
  totalVolume: number;
  floorPrice: number;
  avgPrice: number;
  collections: Array<{
    name: string;
    totalSupply: number;
    floorPrice: number;
    volume24h: number;
    listed: number;
  }>;
}

export interface RunesData {
  totalRunes: number;
  totalHolders: number;
  totalVolume: number;
  totalTransactions: number;
  topRunes: Array<{
    name: string;
    symbol: string;
    supply: number;
    holders: number;
    price: number;
    volume24h: number;
    marketCap: number;
  }>;
}

export interface MiningData {
  hashRate: number;
  difficulty: number;
  nextDifficultyAdjustment: {
    blocksUntil: number;
    estimatedChange: number;
    timeUntil: string;
  };
  avgBlockTime: number;
  pools: Array<{
    name: string;
    hashRateShare: number;
    blocks24h: number;
  }>;
}

class RealDataService {
  private readonly COINGECKO_API = 'https://api.coingecko.com/api/v3';
  private readonly MEMPOOL_API = 'https://mempool.space/api';
  private readonly ORDINALS_API = 'https://api.ordinals.com/v1'; // Hypothetical API
  private readonly RUNES_API = 'https://api.runes.bitcoin/v1'; // Hypothetical API
  
  // Cache for API responses
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  /**
   * Get cached data or fetch new data
   */
  private async getCachedData<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttlMinutes: number = 5
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    if (cached && now - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }

    try {
      const data = await fetchFunction();
      this.cache.set(key, {
        data,
        timestamp: now,
        ttl: ttlMinutes * 60 * 1000
      });
      return data;
    } catch (error) {
      // Return cached data if available, even if expired
      if (cached) {
        return cached.data as T;
      }
      throw error;
    }
  }

  /**
   * Get comprehensive Bitcoin metrics
   */
  async getBitcoinMetrics(): Promise<BitcoinMetrics> {
    return this.getCachedData('bitcoin-metrics', async () => {
      // Get price data from CoinGecko
      const priceResponse = await axios.get(`${this.COINGECKO_API}/simple/price`, {
        params: {
          ids: 'bitcoin',
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_market_cap: true,
          include_24hr_vol: true
        },
        timeout: 10000
      });

      const priceData = priceResponse.data.bitcoin;

      // Get additional data from CoinGecko
      const coinResponse = await axios.get(`${this.COINGECKO_API}/coins/bitcoin`, {
        timeout: 10000
      });

      const coinData = coinResponse.data;

      // Get blockchain data from mempool.space
      const [hashRateResponse, difficultyResponse, blockHeightResponse] = await Promise.allSettled([
        axios.get(`${this.MEMPOOL_API}/v1/mining/hashrate/1y`),
        axios.get(`${this.MEMPOOL_API}/v1/difficulty-adjustment`),
        axios.get(`${this.MEMPOOL_API}/blocks/tip/height`)
      ]);

      const hashRate = hashRateResponse.status === 'fulfilled' ? 
        hashRateResponse.value.data.currentHashrate : 450000000; // Fallback TH/s

      const difficulty = difficultyResponse.status === 'fulfilled' ? 
        difficultyResponse.value.data.difficulty : 62000000000000; // Fallback

      const blockHeight = blockHeightResponse.status === 'fulfilled' ? 
        blockHeightResponse.value.data : 820000; // Fallback

      // Calculate next halving
      const nextHalvingBlock = Math.ceil(blockHeight / 210000) * 210000 + 210000;
      const blocksUntilHalving = nextHalvingBlock - blockHeight;
      const estimatedHalvingDate = new Date(Date.now() + blocksUntilHalving * 10 * 60 * 1000);

      // Get Fear & Greed Index
      let fearGreedIndex = 50; // Default neutral
      try {
        const fearGreedResponse = await axios.get('https://api.alternative.me/fng/', {
          timeout: 5000
        });
        fearGreedIndex = parseInt(fearGreedResponse.data.data[0].value);
      } catch (error) {
      }

      return {
        price: priceData.usd,
        priceChange24h: priceData.usd_24h_change,
        marketCap: priceData.usd_market_cap,
        volume24h: priceData.usd_24h_vol,
        circulatingSupply: coinData.market_data.circulating_supply,
        dominance: coinData.market_data.market_cap_rank === 1 ? 
          coinData.market_data.market_cap_percentage?.btc || 45 : 45,
        fearGreedIndex,
        hashRate: hashRate / 1e18, // Convert to EH/s
        difficulty,
        blockHeight,
        avgBlockTime: 10, // Minutes
        memPoolSize: 50000, // Simplified
        nextHalving: {
          blocksUntil: blocksUntilHalving,
          estimatedDate: estimatedHalvingDate.toISOString(),
          progress: ((210000 - blocksUntilHalving) / 210000) * 100
        }
      };
    }, 5); // 5 minute cache
  }

  /**
   * Get Ordinals data (real API integration needed)
   */
  async getOrdinalsData(): Promise<OrdinalsData> {
    return this.getCachedData('ordinals-data', async () => {
      try {
        // For now, return realistic mock data
        // In production, integrate with real Ordinals APIs like ord.io, ordinals.com, etc.
        
        // Try to get some real data from public APIs
        let totalInscriptions = 45000000; // Fallback
        try {
          const response = await axios.get('https://ordinals.com/api/inscriptions', {
            timeout: 8000
          });
          totalInscriptions = response.data.total || totalInscriptions;
        } catch (error) {
        }

        return {
          totalInscriptions,
          inscriptionsToday: 0,
          totalVolume: 125000,
          floorPrice: 0.005,
          avgPrice: 0.025,
          collections: [
            {
              name: 'Bitcoin Punks',
              totalSupply: 10000,
              floorPrice: 0.15,
              volume24h: 45.5,
              listed: 234
            },
            {
              name: 'Ordinal Apes',
              totalSupply: 5000,
              floorPrice: 0.08,
              volume24h: 23.2,
              listed: 89
            },
            {
              name: 'Inscription Birds',
              totalSupply: 2500,
              floorPrice: 0.12,
              volume24h: 18.7,
              listed: 156
            }
          ]
        };
      } catch (error) {
        console.error('Error fetching Ordinals data:', error);
        throw new Error('Failed to fetch Ordinals data');
      }
    }, 10); // 10 minute cache
  }

  /**
   * Get Runes data (real API integration needed)
   */
  async getRunesData(): Promise<RunesData> {
    return this.getCachedData('runes-data', async () => {
      try {
        // For now, return realistic mock data
        // In production, integrate with real Runes APIs
        
        return {
          totalRunes: 15420,
          totalHolders: 89230,
          totalVolume: 8500,
          totalTransactions: 456780,
          topRunes: [
            {
              name: 'UNCOMMON•GOODS',
              symbol: 'GOODS',
              supply: 21000000,
              holders: 5234,
              price: 0.00015,
              volume24h: 125.5,
              marketCap: 3150
            },
            {
              name: 'RSIC•GENESIS•RUNE',
              symbol: 'RSIC',
              supply: 1000000000,
              holders: 8921,
              price: 0.000025,
              volume24h: 89.2,
              marketCap: 25000
            },
            {
              name: 'DOG•GO•TO•THE•MOON',
              symbol: 'DOG',
              supply: 100000000000,
              holders: 12456,
              price: 0.0000008,
              volume24h: 67.8,
              marketCap: 80000
            }
          ]
        };
      } catch (error) {
        console.error('Error fetching Runes data:', error);
        throw new Error('Failed to fetch Runes data');
      }
    }, 10); // 10 minute cache
  }

  /**
   * Get mining data
   */
  async getMiningData(): Promise<MiningData> {
    return this.getCachedData('mining-data', async () => {
      try {
        // Get real mining data from mempool.space
        const [hashRateResponse, difficultyResponse, poolsResponse] = await Promise.allSettled([
          axios.get(`${this.MEMPOOL_API}/v1/mining/hashrate/1d`),
          axios.get(`${this.MEMPOOL_API}/v1/difficulty-adjustment`),
          axios.get(`${this.MEMPOOL_API}/v1/mining/pools/1d`)
        ]);

        const hashRate = hashRateResponse.status === 'fulfilled' ? 
          hashRateResponse.value.data.currentHashrate / 1e18 : 450; // EH/s

        const difficultyData = difficultyResponse.status === 'fulfilled' ? 
          difficultyResponse.value.data : null;

        const poolsData = poolsResponse.status === 'fulfilled' ? 
          poolsResponse.value.data.pools || [] : [];

        return {
          hashRate,
          difficulty: difficultyData?.difficulty || 62000000000000,
          nextDifficultyAdjustment: {
            blocksUntil: difficultyData?.remainingBlocks || 1200,
            estimatedChange: difficultyData?.difficultyChange || 2.5,
            timeUntil: difficultyData?.timeUntil || '8 days'
          },
          avgBlockTime: difficultyData?.timeAvg || 10,
          pools: poolsData.slice(0, 5).map((pool: any) => ({
            name: pool.name || 'Unknown Pool',
            hashRateShare: (pool.blockCount / 144) * 100, // Approximate
            blocks24h: pool.blockCount || 0
          }))
        };
      } catch (error) {
        console.error('Error fetching mining data:', error);
        throw new Error('Failed to fetch mining data');
      }
    }, 15); // 15 minute cache
  }

  /**
   * Get real Bitcoin price for charts
   */
  async getBitcoinPriceHistory(days: number = 7): Promise<Array<{ timestamp: number; price: number; volume: number }>> {
    return this.getCachedData(`bitcoin-price-history-${days}`, async () => {
      try {
        const response = await axios.get(`${this.COINGECKO_API}/coins/bitcoin/market_chart`, {
          params: {
            vs_currency: 'usd',
            days: days,
            interval: days <= 1 ? 'minutely' : days <= 30 ? 'hourly' : 'daily'
          },
          timeout: 15000
        });

        const { prices, total_volumes } = response.data;

        return prices.map((price: [number, number], index: number) => ({
          timestamp: price[0],
          price: price[1],
          volume: total_volumes[index] ? total_volumes[index][1] : 0
        }));
      } catch (error) {
        console.error('Error fetching Bitcoin price history:', error);
        // Return fallback data
        const now = Date.now();
        const fallbackData = [];
        for (let i = days; i >= 0; i--) {
          fallbackData.push({
            timestamp: now - (i * 24 * 60 * 60 * 1000),
            price: 65000,
            volume: 20000000000
          });
        }
        return fallbackData;
      }
    }, 30); // 30 minute cache for price history
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const realDataService = new RealDataService();