/**
 * RUNES REAL DATA SERVICE - PROFESSIONAL INTEGRATION
 * Real-time data from actual Runes protocols and DEXes
 * NO MOCK DATA - Only real API integrations
 */

import { RuneMarketData, RunesAnalytics } from '../runes';
import { runesMarketService } from '../runesMarketService';
import { unisatRunesService } from '../unisatRunesService';


interface HiroRunesResponse {
  results: Array<{
    id: string;
    number: number;
    name: string;
    spaced_name: string;
    divisibility: number;
    symbol: string;
    mint_terms?: {
      amount: string;
      cap: string;
      height_start: number;
      height_end: number;
    };
    supply: {
      current: string;
      total: string;
      minted: string;
      burned: string;
      premine: string;
      mintable: boolean;
      percentage_minted: number;
    };
    location?: {
      block_hash: string;
      block_height: number;
      tx_id: string;
      tx_index: number;
      timestamp: number;
    };
  }>;
  total: number;
  limit: number;
  offset: number;
}


export class RunesRealDataService {
  private static instance: RunesRealDataService;

  // API endpoints - Real APIs only
  private readonly HIRO_API = 'https://api.hiro.so/runes/v1';

  // Cache
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 60 * 1000; // 1 minute

  static getInstance(): RunesRealDataService {
    if (!RunesRealDataService.instance) {
      RunesRealDataService.instance = new RunesRealDataService();
    }
    return RunesRealDataService.instance;
  }

  /**
   * Fetch real market data from multiple sources
   * Returns empty array on failure - NO MOCK DATA
   */
  async getRealRunesMarketData(): Promise<RuneMarketData[]> {
    try {
      // Try multiple data sources in parallel
      const [hiroData, marketData, unisatData] = await Promise.allSettled([
        this.fetchHiroData(),
        this.fetchMarketData(),
        this.fetchUniSatRealData()
      ]);

      // Merge and process data from successful sources
      const mergedData = this.mergeDataSources(hiroData, marketData, unisatData);

      // Return empty array if no real data available - NO FALLBACK TO MOCK
      if (mergedData.length === 0) {
          return [];
      }

      return mergedData;
    } catch {
      return []; // Return empty array - NO MOCK DATA
    }
  }

  /**
   * Fetch from Hiro API
   */
  private async fetchHiroData(): Promise<RuneMarketData[]> {
    const cached = this.getCached('hiro');
    if (cached) return cached;

    try {
      const response = await fetch(`${this.HIRO_API}/etchings?limit=50&offset=0`, {
        headers: {
          'Accept': 'application/json',
          'X-API-Key': process.env.HIRO_API_KEY || ''
        }
      });

      if (!response.ok) throw new Error(`Hiro API error: ${response.status}`);

      const data: HiroRunesResponse = await response.json();
      const marketData = data.results.map(rune => this.transformHiroData(rune));
      
      this.setCache('hiro', marketData);
      return marketData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetch from UniSat API using the real service
   */
  private async fetchUniSatRealData(): Promise<RuneMarketData[]> {
    const cached = this.getCached('unisat');
    if (cached) return cached;

    try {
      const response = await unisatRunesService.getRunesInfoList({ start: 0, limit: 50 });
      const marketData = response.list.map(rune => this.transformUniSatServiceData(rune));

      this.setCache('unisat', marketData);
      return marketData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetch from Gamma.io API using the real service
   */
  private async fetchMarketData(): Promise<RuneMarketData[]> {
    const cached = this.getCached('gamma');
    if (cached) return cached;

    try {
      const response = await runesMarketService.getRuneCollectionStats({
        limit: 50,
        sortBy: 'marketCap',
        sortDirection: 'desc'
      });

      const marketData = response.runes.map(rune => this.transformOrdinalsData(rune));

      this.setCache('gamma', marketData);
      return marketData;
    } catch (error) {
      throw error;
    }
  }


  /**
   * Transform Hiro data to our format - REAL DATA ONLY
   */
  private transformHiroData(rune: HiroRunesResponse['results'][0]): RuneMarketData {
    const currentSupply = parseInt(rune.supply.current);
    const totalSupply = parseInt(rune.supply.total);

    return {
      id: rune.id,
      name: rune.spaced_name,
      symbol: rune.symbol || rune.name.replace(/[•\s]/g, ''),
      price: {
        current: 0, // Hiro doesn't provide price data
        change24h: 0,
        change7d: 0,
        high24h: 0,
        low24h: 0
      },
      marketCap: {
        current: 0,
        rank: 0,
        change24h: 0
      },
      volume: {
        volume24h: 0,
        change24h: 0,
        volumeRank: 0
      },
      supply: {
        circulating: currentSupply,
        total: totalSupply,
        max: totalSupply,
        percentage: (currentSupply / totalSupply) * 100
      },
      holders: 0, // Hiro doesn't provide holder count
      transactions: {
        transfers24h: 0,
        mints24h: rune.supply.mintable ? 1 : 0,
        burns24h: parseInt(rune.supply.burned) || 0
      },
      minting: {
        progress: rune.supply.percentage_minted || 100,
        remaining: parseInt(rune.supply.mintable ? (totalSupply - currentSupply).toString() : '0'),
        rate: 0
      }
    };
  }

  /**
   * Transform UniSat service data to our format - REAL DATA ONLY
   */
  private transformUniSatServiceData(rune: any): RuneMarketData {
    const circulating = parseInt(rune.mints || '0');
    const total = rune.terms?.cap ? parseInt(rune.terms.cap) : circulating;

    return {
      id: rune.runeid,
      name: rune.spacedRune || rune.rune,
      symbol: rune.symbol || rune.rune,
      price: {
        current: 0, // UniSat indexer doesn't provide price
        change24h: 0,
        change7d: 0,
        high24h: 0,
        low24h: 0
      },
      marketCap: {
        current: 0,
        rank: 0,
        change24h: 0
      },
      volume: {
        volume24h: 0,
        change24h: 0,
        volumeRank: 0
      },
      supply: {
        circulating,
        total,
        max: total,
        percentage: total > 0 ? (circulating / total) * 100 : 100
      },
      holders: rune.holders || 0,
      transactions: {
        transfers24h: rune.transactions || 0,
        mints24h: 0,
        burns24h: parseInt(rune.burned || '0')
      },
      minting: {
        progress: rune.mintable && total > 0 ? (circulating / total) * 100 : 100,
        remaining: parseInt(rune.remaining || '0'),
        rate: 0
      }
    };
  }

  /**
   * Transform Gamma.io data to our format - REAL DATA ONLY
   */
  private transformOrdinalsData(rune: any): RuneMarketData {
    const floorPrice = rune.floorUnitPrice?.value || 0;
    const marketCap = rune.marketCap || 0;
    const supply = rune.totalSupply ? parseFloat(rune.totalSupply) : 0;

    return {
      id: rune.rune,
      name: rune.spacedRune || rune.runeName || rune.rune,
      symbol: rune.symbol || rune.rune,
      price: {
        current: floorPrice,
        change24h: rune.priceChange24h || 0,
        change7d: 0, // Gamma.io doesn't provide 7d change
        high24h: 0,
        low24h: 0
      },
      marketCap: {
        current: marketCap,
        rank: 0,
        change24h: 0
      },
      volume: {
        volume24h: rune.volume || 0,
        change24h: rune.volumeChange || 0,
        volumeRank: 0
      },
      supply: {
        circulating: supply,
        total: supply,
        max: supply,
        percentage: rune.mintProgress || 100
      },
      holders: rune.holders || rune.ownerCount || 0,
      transactions: {
        transfers24h: rune.sales || 0,
        mints24h: 0,
        burns24h: 0
      },
      minting: {
        progress: rune.mintProgress || 100,
        remaining: 0,
        rate: 0
      }
    };
  }


  /**
   * Merge data from multiple sources - prioritize best data
   * Gamma.io has price/volume, UniSat has holders, Hiro has supply
   */
  private mergeDataSources(
    hiroResult: PromiseSettledResult<RuneMarketData[]>,
    gammaResult: PromiseSettledResult<RuneMarketData[]>,
    unisatResult: PromiseSettledResult<RuneMarketData[]>
  ): RuneMarketData[] {
    const dataMap = new Map<string, RuneMarketData>();

    // Start with Gamma.io data (best for price/volume/market data)
    if (gammaResult.status === 'fulfilled') {
      gammaResult.value.forEach(rune => {
        dataMap.set(rune.name.toLowerCase(), { ...rune });
      });
    }

    // Merge UniSat data (good for holders and supply)
    if (unisatResult.status === 'fulfilled') {
      unisatResult.value.forEach(rune => {
        const key = rune.name.toLowerCase();
        const existing = dataMap.get(key);

        if (existing) {
          // Merge: keep Gamma.io prices, add UniSat holders if missing
          existing.holders = existing.holders || rune.holders;
          existing.supply = rune.supply.circulating > 0 ? rune.supply : existing.supply;
        } else {
          dataMap.set(key, { ...rune });
        }
      });
    }

    // Merge Hiro data (good for supply details)
    if (hiroResult.status === 'fulfilled') {
      hiroResult.value.forEach(rune => {
        const key = rune.name.toLowerCase();
        const existing = dataMap.get(key);

        if (existing) {
          // Merge: keep existing price data, update supply if Hiro has better data
          if (rune.supply.circulating > 0 && existing.supply.circulating === 0) {
            existing.supply = rune.supply;
          }
        } else {
          dataMap.set(key, { ...rune });
        }
      });
    }

    const allData = Array.from(dataMap.values());

    // Sort by market cap and assign ranks
    allData.sort((a, b) => b.marketCap.current - a.marketCap.current);
    allData.forEach((rune, index) => {
      rune.marketCap.rank = index + 1;
    });

    // Sort by volume and assign volume ranks
    const volumeSorted = [...allData].sort((a, b) => b.volume.volume24h - a.volume.volume24h);
    volumeSorted.forEach((rune, index) => {
      const original = allData.find(r => r.id === rune.id);
      if (original) {
        original.volume.volumeRank = index + 1;
      }
    });

    return allData;
  }


  /**
   * Cache management
   */
  private getCached(key: string): RuneMarketData[] | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: RuneMarketData[]): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Get real-time analytics
   */
  async getRealRunesAnalytics(marketData: RuneMarketData[]): Promise<RunesAnalytics> {
    const totalMarketCap = marketData.reduce((sum, rune) => sum + rune.marketCap.current, 0);
    const totalVolume24h = marketData.reduce((sum, rune) => sum + rune.volume.volume24h, 0);
    const averageChange24h = marketData.reduce((sum, rune) => sum + rune.price.change24h, 0) / marketData.length;

    // Sort for top performers
    const sorted24h = [...marketData].sort((a, b) => b.price.change24h - a.price.change24h);
    const sortedVolume = [...marketData].sort((a, b) => b.volume.volume24h - a.volume.volume24h);

    return {
      marketOverview: {
        totalMarketCap,
        totalVolume24h,
        averageChange24h,
        activeRunes: marketData.length,
        newRunes24h: marketData.filter(r => r.minting.progress < 100).length,
        marketSentiment: averageChange24h > 2 ? 'bullish' : 
                        averageChange24h < -2 ? 'bearish' : 'neutral'
      },
      topPerformers: {
        gainers24h: sorted24h.slice(0, 5),
        losers24h: sorted24h.slice(-5).reverse(),
        volumeLeaders: sortedVolume.slice(0, 5)
      },
      crossChainMetrics: {
        bridgeVolume24h: 0, // No cross-chain bridge data available yet
        activeBridges: 0,
        averageBridgeTime: 0
      }
    };
  }
}

export const runesRealDataService = RunesRealDataService.getInstance();