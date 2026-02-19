/**
 * Runes Service
 * Provides Runes market data and analytics via API routes (server-side proxied)
 */

export interface RuneMarketData {
  id: string;
  name: string;
  symbol: string;
  price: {
    current: number;
    change24h: number;
    change7d: number;
    high24h: number;
    low24h: number;
  };
  marketCap: {
    current: number;
    rank: number;
    change24h: number;
  };
  volume: {
    volume24h: number;
    change24h: number;
    volumeRank: number;
  };
  supply: {
    circulating: number;
    total: number;
    max: number;
    percentage: number;
  };
  holders: number;
  transactions: {
    transfers24h: number;
    mints24h: number;
    burns24h: number;
  };
  minting: {
    progress: number;
    remaining: number;
    rate: number;
  };
}

export interface RunesAnalytics {
  marketOverview: {
    totalMarketCap: number;
    totalVolume24h: number;
    averageChange24h: number;
    activeRunes: number;
    newRunes24h: number;
    marketSentiment: 'bullish' | 'bearish' | 'neutral';
  };
  topPerformers: {
    gainers24h: RuneMarketData[];
    losers24h: RuneMarketData[];
    volumeLeaders: RuneMarketData[];
  };
  crossChainMetrics: {
    bridgeVolume24h: number;
    activeBridges: number;
    averageBridgeTime: number;
  };
}

class RunesService {
  private static instance: RunesService;

  static getInstance(): RunesService {
    if (!RunesService.instance) {
      RunesService.instance = new RunesService();
    }
    return RunesService.instance;
  }

  /**
   * Fetch runes market data via the server-side API route
   * which handles API keys and multi-source fallback
   */
  async getRunesMarketData(): Promise<RuneMarketData[]> {
    try {
      const response = await fetch('/api/runes/market-overview/?limit=50');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.data || result.data.length === 0) {
        return [];
      }

      // Transform API route response to RuneMarketData format
      return result.data.map((r: any, index: number) => ({
        id: r.id || `rune-${index}`,
        name: r.spaced_name || r.name || '',
        symbol: r.symbol || '◆',
        price: {
          current: r.floorPrice || 0,
          change24h: r.change24h || 0,
          change7d: 0,
          high24h: 0,
          low24h: 0,
        },
        marketCap: {
          current: r.marketCap || 0,
          rank: index + 1,
          change24h: 0,
        },
        volume: {
          volume24h: r.volume24h || 0,
          change24h: 0,
          volumeRank: 0,
        },
        supply: {
          circulating: parseFloat(r.supply || '0'),
          total: parseFloat(r.supply || '0'),
          max: parseFloat(r.supply || '0'),
          percentage: r.mintable ? 0 : 100,
        },
        holders: r.holders || 0,
        transactions: {
          transfers24h: r.transactions || r.sales24h || 0,
          mints24h: 0,
          burns24h: parseInt(r.burned || '0'),
        },
        minting: {
          progress: r.mintable ? 50 : 100,
          remaining: 0,
          rate: 0,
        },
      }));
    } catch {
      return [];
    }
  }

  async getRunesAnalytics(): Promise<RunesAnalytics> {
    const marketData = await this.getRunesMarketData();

    if (!marketData || marketData.length === 0) {
      return {
        marketOverview: {
          totalMarketCap: 0,
          totalVolume24h: 0,
          averageChange24h: 0,
          activeRunes: 0,
          newRunes24h: 0,
          marketSentiment: 'neutral'
        },
        topPerformers: {
          gainers24h: [],
          losers24h: [],
          volumeLeaders: []
        },
        crossChainMetrics: {
          bridgeVolume24h: 0,
          activeBridges: 0,
          averageBridgeTime: 0
        }
      };
    }

    const totalMarketCap = marketData.reduce((sum, rune) => sum + rune.marketCap.current, 0);
    const totalVolume24h = marketData.reduce((sum, rune) => sum + rune.volume.volume24h, 0);
    const averageChange24h = marketData.reduce((sum, rune) => sum + rune.price.change24h, 0) / marketData.length;

    const gainers = marketData
      .filter(rune => rune.price.change24h > 0)
      .sort((a, b) => b.price.change24h - a.price.change24h)
      .slice(0, 3);

    const losers = marketData
      .filter(rune => rune.price.change24h < 0)
      .sort((a, b) => a.price.change24h - b.price.change24h)
      .slice(0, 3);

    const volumeLeaders = [...marketData]
      .sort((a, b) => b.volume.volume24h - a.volume.volume24h)
      .slice(0, 3);

    const newRunes24h = marketData.filter(r => r.minting.progress < 100).length;

    return {
      marketOverview: {
        totalMarketCap,
        totalVolume24h,
        averageChange24h,
        activeRunes: marketData.length,
        newRunes24h,
        marketSentiment: averageChange24h > 2 ? 'bullish' : averageChange24h < -2 ? 'bearish' : 'neutral'
      },
      topPerformers: {
        gainers24h: gainers,
        losers24h: losers,
        volumeLeaders
      },
      crossChainMetrics: {
        bridgeVolume24h: 0, // No cross-chain bridge data available yet
        activeBridges: 0,
        averageBridgeTime: 0
      }
    };
  }

  subscribeToRunesPrices(callback: (updates: any[]) => void): () => void {
    const interval = setInterval(async () => {
      try {
        const marketData = await this.getRunesMarketData();
        if (marketData && marketData.length > 0) {
          callback(marketData);
        }
      } catch {
        // Price update fetch failed - will retry on next interval
      }
    }, 30000);

    return () => clearInterval(interval);
  }
}

export const runesService = RunesService.getInstance();
