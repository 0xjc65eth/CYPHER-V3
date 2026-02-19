import { NextRequest, NextResponse } from 'next/server';
import { newsAPIService } from '@/services/newsapi/NewsAPIService';
import { getRedisClient } from '@/lib/cache/redis.config';

const CACHE_KEY = 'market:news';
const CACHE_TTL = 1800; // 30 minutes

// Fallback mock news data (used when NewsAPI is unavailable)
const newsTemplates = [
  {
    headline: 'Bitcoin ETF Sees Record $500M Daily Inflow',
    summary: 'Institutional investors continue to pour money into Bitcoin ETFs, marking the highest single-day inflow.',
    impact: 'high',
    sentiment: 'positive',
    source: 'Bloomberg',
    relatedAssets: ['BTC', 'ETH']
  },
  {
    headline: 'Ordinals Protocol Update Enhances Inscription Speed',
    summary: 'New protocol update reduces inscription time by 40%, making Ordinals more accessible.',
    impact: 'medium',
    sentiment: 'positive',
    source: 'Ordinals News',
    relatedAssets: ['ORDI', 'SATS']
  },
  {
    headline: 'Federal Reserve Signals Potential Rate Cut',
    summary: 'Fed Chair hints at possible rate cuts in Q2, crypto markets react positively.',
    impact: 'high',
    sentiment: 'positive',
    source: 'Reuters',
    relatedAssets: ['BTC', 'ETH', 'SOL']
  },
  {
    headline: 'Major Exchange Lists New Runes Token',
    summary: 'Binance announces listing of PUPS token, trading to begin next week.',
    impact: 'medium',
    sentiment: 'positive',
    source: 'CoinDesk',
    relatedAssets: ['PUPS', 'RSIC']
  },
  {
    headline: 'Whale Alert: 1000 BTC Moved to Cold Storage',
    summary: 'Large Bitcoin holder moves significant amount to cold storage, indicating long-term hold.',
    impact: 'low',
    sentiment: 'neutral',
    source: 'Whale Alert',
    relatedAssets: ['BTC']
  },
  {
    headline: 'DeFi TVL Reaches New All-Time High',
    summary: 'Total value locked in DeFi protocols surpasses $150 billion milestone.',
    impact: 'medium',
    sentiment: 'positive',
    source: 'DeFi Pulse',
    relatedAssets: ['ETH', 'SOL', 'AVAX']
  }
];

function getFallbackNews() {
  return newsTemplates.map((template, index) => ({
    id: `news-${Date.now()}-${index}`,
    title: template.headline,
    summary: template.summary,
    impact: template.impact,
    sentiment: template.sentiment === 'positive' ? 'bullish' :
              template.sentiment === 'negative' ? 'bearish' : 'neutral',
    source: template.source,
    relatedAssets: template.relatedAssets,
    timestamp: Date.now() - (index * 900000) // 15 minutes between each
  }));
}

export async function GET(request: NextRequest) {
  try {
    const redis = getRedisClient();

    // Check cache first
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return NextResponse.json(JSON.parse(cached as string), {
        headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' },
      });
    }

    // Try to fetch real news from NewsAPI
    let news: any[] = [];
    let usedFallback = false;

    try {
      const articles = await newsAPIService.getMarketNews();

      if (articles.length > 0) {
        news = articles.map((article, index) => ({
          id: `news-${Date.now()}-${index}`,
          title: article.title,
          summary: article.description,
          impact: 'medium',
          sentiment: 'neutral',
          source: article.source,
          relatedAssets: [],
          url: article.url,
          imageUrl: article.imageUrl,
          timestamp: new Date(article.publishedAt).getTime(),
        }));
      }
    } catch (err) {
      console.error('[news] NewsAPI fetch error:', err);
    }

    // Fall back to mock data if NewsAPI returned nothing
    if (news.length === 0) {
      news = getFallbackNews();
      usedFallback = true;
    }

    const data = {
      success: true,
      data: news,
      fallback: usedFallback,
      timestamp: Date.now(),
    };

    // Cache the result
    await redis.set(CACHE_KEY, JSON.stringify(data), 'EX', CACHE_TTL);

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' },
    });
  } catch (error) {
    console.error('[news] Route error:', error);
    // Even on error, return fallback data
    return NextResponse.json({
      success: true,
      data: getFallbackNews(),
      fallback: true,
      timestamp: Date.now(),
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  }
}
