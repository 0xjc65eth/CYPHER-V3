/**
 * Ordinals Service
 * Provides Ordinals market data and analytics.
 * Primary: Xverse API (has pricing data)
 * Fallback: Hiro API (metadata only)
 */

import { xverseAPI } from '@/lib/api/xverse';

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
    image?: string | null;
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
   * Fetch Ordinals stats from Xverse (primary) and Hiro (fallback).
   * Falls back to "--" if all APIs fail to prevent UI breakage.
   */
  async fetchOrdinalsStats(): Promise<OrdinalsAnalytics> {
    try {
      // Fetch Xverse top collections + Hiro inscription count in parallel
      const [xverseCollections, hiroInscriptions, hiroStats] = await Promise.allSettled([
        xverseAPI.getTopCollections({ limit: 10, timePeriod: '24h' }),
        fetch('https://api.hiro.so/ordinals/v1/inscriptions?limit=1'),
        fetch('https://api.hiro.so/ordinals/v1/stats/inscriptions')
      ]);

      let totalInscriptions: number | string = '--';
      let statsData: { results?: { volume_24h?: number; count_24h?: number; average_inscription_fee?: number; inscriptions_growth_7d?: number; volume_growth_7d?: number } } | null = null;

      // Process Hiro inscriptions count
      if (hiroInscriptions.status === 'fulfilled' && hiroInscriptions.value.ok) {
        try {
          const inscData = await hiroInscriptions.value.json();
          if (inscData.total !== undefined) {
            totalInscriptions = inscData.total;
          }
        } catch { /* ignore */ }
      }

      // Process Hiro stats
      if (hiroStats.status === 'fulfilled' && hiroStats.value.ok) {
        try {
          statsData = await hiroStats.value.json();
        } catch { /* ignore */ }
      }

      const totalVolume24h: number | string = statsData?.results?.volume_24h ?? '--';
      const totalSales24h: number | string = statsData?.results?.count_24h ?? '--';
      const averagePrice: number | string = statsData?.results?.average_inscription_fee ?? '--';
      const inscriptionsGrowth: number | string = statsData?.results?.inscriptions_growth_7d ?? '--';
      const volumeGrowth: number | string = statsData?.results?.volume_growth_7d ?? '--';

      // Build topCollections from Xverse (real data with prices)
      let topCollections: OrdinalsAnalytics['topCollections'] = [];

      if (xverseCollections.status === 'fulfilled' && xverseCollections.value && xverseCollections.value.length > 0) {
        topCollections = xverseCollections.value.map(c => ({
          id: c.collectionId || c.name.toLowerCase().replace(/\s+/g, '-'),
          name: c.name,
          floorPrice: c.floorPrice || 0,
          volume24h: c.volume || 0,
          change24h: c.volumePercentChange || 0,
          image: c.imageUrl,
        }));
      }

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
      console.error('[OrdinalsService] Failed to fetch stats:', error);

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