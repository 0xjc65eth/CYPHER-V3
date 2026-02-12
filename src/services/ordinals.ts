/**
 * Ordinals Service
 * Provides Ordinals market data and analytics using Hiro API
 */

export interface OrdinalsAnalytics {
  totalInscriptions: number | string;
  totalVolume24h: number | string;
  totalSales24h: number | string;
  averagePrice: number | string;
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  trends: {
    inscriptionsGrowth: number | string;
    volumeGrowth: number | string;
  };
  topCollections: Array<{
    id: string;
    name: string;
    floorPrice: number;
    volume24h: number;
    change24h: number;
  }>;
}

class OrdinalsService {
  private static instance: OrdinalsService;

  static getInstance(): OrdinalsService {
    if (!OrdinalsService.instance) {
      OrdinalsService.instance = new OrdinalsService();
    }
    return OrdinalsService.instance;
  }

  /**
   * Fetch Ordinals stats from Hiro API using Promise.allSettled
   * Falls back to "--" if API fails to prevent UI breakage
   */
  async fetchOrdinalsStats(): Promise<OrdinalsAnalytics> {
    try {
      const results = await Promise.allSettled([
        fetch('https://api.hiro.so/ordinals/v1/inscriptions?limit=1'),
        fetch('https://api.hiro.so/ordinals/v1/stats/inscriptions')
      ]);

      let totalInscriptions: number | string = '--';
      let statsData: any = null;

      // Process inscriptions count
      if (results[0].status === 'fulfilled' && results[0].value.ok) {
        try {
          const inscData = await results[0].value.json();
          if (inscData.total !== undefined) {
            totalInscriptions = inscData.total;
          }
        } catch (e) {
          console.warn('Failed to parse inscriptions data:', e);
        }
      }

      // Process stats data
      if (results[1].status === 'fulfilled' && results[1].value.ok) {
        try {
          statsData = await results[1].value.json();
        } catch (e) {
          console.warn('Failed to parse stats data:', e);
        }
      }

      // Map stats or use fallback values
      const totalVolume24h = statsData?.results?.volume_24h ?? '--';
      const totalSales24h = statsData?.results?.count_24h ?? '--';
      const averagePrice = statsData?.results?.average_inscription_fee ?? '--';

      // Calculate trends with fallback
      const inscriptionsGrowth = statsData?.results?.inscriptions_growth_7d ?? '--';
      const volumeGrowth = statsData?.results?.volume_growth_7d ?? '--';

      // Mock top collections (would need marketplace API for real data)
      const topCollections = [
        {
          id: 'bitcoin-punks',
          name: 'Bitcoin Punks',
          floorPrice: 0.05,
          volume24h: 125.5,
          change24h: 12.5
        },
        {
          id: 'ordinal-rocks',
          name: 'Ordinal Rocks',
          floorPrice: 0.03,
          volume24h: 95.2,
          change24h: -5.2
        },
        {
          id: 'satoshi-cards',
          name: 'Satoshi Nakamoto Cards',
          floorPrice: 0.015,
          volume24h: 45.8,
          change24h: 8.7
        }
      ];

      // Determine market sentiment
      let marketSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (typeof volumeGrowth === 'number') {
        marketSentiment = volumeGrowth > 5 ? 'bullish' : volumeGrowth < -5 ? 'bearish' : 'neutral';
      }

      return {
        totalInscriptions,
        totalVolume24h,
        totalSales24h,
        averagePrice,
        marketSentiment,
        trends: {
          inscriptionsGrowth,
          volumeGrowth
        },
        topCollections
      };
    } catch (error) {
      console.error('Failed to fetch ordinals stats:', error);

      // Return fallback data if everything fails
      return {
        totalInscriptions: '--',
        totalVolume24h: '--',
        totalSales24h: '--',
        averagePrice: '--',
        marketSentiment: 'neutral',
        trends: {
          inscriptionsGrowth: '--',
          volumeGrowth: '--'
        },
        topCollections: []
      };
    }
  }

  // Legacy method for backwards compatibility
  async getOrdinalsStats(): Promise<OrdinalsAnalytics> {
    return this.fetchOrdinalsStats();
  }
}

export const ordinalsService = OrdinalsService.getInstance();