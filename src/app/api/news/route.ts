import { NextResponse } from 'next/server';

interface NewsArticle {
  title: string;
  body: string;
  url: string;
  source: string;
  imageUrl: string;
  publishedAt: number;
  categories: string;
  sentiment: string;
}

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

function parseSentiment(title: string, body: string): string {
  const text = `${title} ${body}`.toLowerCase();
  const bullish = ['surge', 'rally', 'bull', 'soar', 'gain', 'rise', 'high', 'record', 'breakout', 'adoption', 'approval', 'positive', 'growth', 'profit', 'boom'];
  const bearish = ['crash', 'drop', 'bear', 'plunge', 'fall', 'decline', 'low', 'sell', 'fear', 'ban', 'hack', 'scam', 'fraud', 'loss', 'bust', 'collapse'];

  let score = 0;
  for (const word of bullish) {
    if (text.includes(word)) score++;
  }
  for (const word of bearish) {
    if (text.includes(word)) score--;
  }

  if (score > 1) return 'very_bullish';
  if (score > 0) return 'bullish';
  if (score < -1) return 'very_bearish';
  if (score < 0) return 'bearish';
  return 'neutral';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'BTC';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    let data: Record<string, unknown> | null = null;

    // Try BTC-specific first
    try {
      const res = await fetchWithTimeout(
        `https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=${encodeURIComponent(category)}&sortOrder=latest`
      );
      if (res.ok) {
        data = await res.json();
      }
    } catch {
      // Fall through to fallback
    }

    // Fallback: general crypto news
    if (!data || data.Response === 'Error') {
      const res = await fetchWithTimeout(
        'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest'
      );
      if (!res.ok) {
        return NextResponse.json(
          { error: `CryptoCompare API returned ${res.status}` },
          { status: res.status }
        );
      }
      data = await res.json();
    }

    const rawArticles = (data as Record<string, unknown>).Data;
    if (!Array.isArray(rawArticles)) {
      return NextResponse.json(
        { error: 'Unexpected API response format' },
        { status: 502 }
      );
    }

    const articles: NewsArticle[] = rawArticles.slice(0, limit).map((article: Record<string, unknown>) => ({
      title: article.title as string,
      body: (article.body as string || '').slice(0, 500),
      url: article.url as string,
      source: article.source_info
        ? (article.source_info as Record<string, unknown>).name as string
        : (article.source as string),
      imageUrl: article.imageurl as string,
      publishedAt: article.published_on as number,
      categories: article.categories as string,
      sentiment: parseSentiment(article.title as string, article.body as string || ''),
    }));

    // Aggregate sentiment
    const sentimentCounts = { very_bullish: 0, bullish: 0, neutral: 0, bearish: 0, very_bearish: 0 };
    for (const article of articles) {
      const key = article.sentiment as keyof typeof sentimentCounts;
      if (key in sentimentCounts) sentimentCounts[key]++;
    }

    return NextResponse.json(
      {
        articles,
        count: articles.length,
        sentiment: sentimentCounts,
        category,
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to fetch news: ${message}` }, { status: 500 });
  }
}
