/**
 * NewsAPI Service
 * Provides financial and crypto news headlines
 * https://newsapi.org/docs
 */

// --- Types ---

export interface NewsArticle {
  title: string;
  description: string;
  source: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  category: 'crypto' | 'business' | 'market';
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: Array<{
    source: { id: string | null; name: string };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string | null;
  }>;
}

// --- Cache entry ---

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// --- Constants ---

const BASE_URL = 'https://newsapi.org/v2';
const CACHE_TTL_SECONDS = 1800; // 30 minutes
const REQUEST_TIMEOUT_MS = 15000;

const MARKET_QUERY = '(bitcoin OR crypto OR "federal reserve" OR "interest rate" OR stocks)';
const CRYPTO_QUERY = '(bitcoin OR ethereum OR crypto OR blockchain OR "digital assets")';

const DEBUG = process.env.NODE_ENV === 'development';

function log(...args: unknown[]) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
  }
}

function logError(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.error('[NewsAPI]', ...args);
}

// --- Service ---

class NewsAPIService {
  private static instance: NewsAPIService;
  private apiKey: string;
  private cache = new Map<string, CacheEntry<unknown>>();

  private constructor() {
    this.apiKey = process.env.NEWSAPI_KEY || '';
  }

  static getInstance(): NewsAPIService {
    if (!NewsAPIService.instance) {
      NewsAPIService.instance = new NewsAPIService();
    }
    return NewsAPIService.instance;
  }

  // --- Public methods ---

  async getMarketNews(): Promise<NewsArticle[]> {
    const cacheKey = 'marketNews';
    const cached = this.getFromCache<NewsArticle[]>(cacheKey);
    if (cached) return cached;

    if (!this.apiKey) {
      log('No NewsAPI key configured');
      return [];
    }

    try {
      const [financialNews, cryptoNews] = await Promise.all([
        this.fetchEverything(MARKET_QUERY, 15),
        this.fetchEverything(CRYPTO_QUERY, 10),
      ]);

      // Merge and deduplicate by URL
      const seen = new Set<string>();
      const combined: NewsArticle[] = [];

      for (const article of [...financialNews, ...cryptoNews]) {
        if (!seen.has(article.url)) {
          seen.add(article.url);
          combined.push(article);
        }
      }

      // Sort by publishedAt descending
      combined.sort((a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

      this.setCache(cacheKey, combined);
      return combined;
    } catch (error) {
      logError('Failed to fetch market news:', error);
      return [];
    }
  }

  async getCryptoNews(): Promise<NewsArticle[]> {
    const cacheKey = 'cryptoNews';
    const cached = this.getFromCache<NewsArticle[]>(cacheKey);
    if (cached) return cached;

    if (!this.apiKey) {
      log('No NewsAPI key configured');
      return [];
    }

    try {
      const articles = await this.fetchEverything(CRYPTO_QUERY, 25);

      const result = articles.map((a) => ({ ...a, category: 'crypto' as const }));

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logError('Failed to fetch crypto news:', error);
      return [];
    }
  }

  async getBusinessHeadlines(): Promise<NewsArticle[]> {
    const cacheKey = 'businessHeadlines';
    const cached = this.getFromCache<NewsArticle[]>(cacheKey);
    if (cached) return cached;

    if (!this.apiKey) {
      log('No NewsAPI key configured');
      return [];
    }

    try {
      const params = new URLSearchParams({
        category: 'business',
        country: 'us',
        pageSize: '15',
        apiKey: this.apiKey,
      });

      const url = `${BASE_URL}/top-headlines?${params.toString()}`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        logError(`Headlines API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data: NewsAPIResponse = await response.json();

      if (data.status !== 'ok') {
        logError('Headlines API returned non-ok status:', data.status);
        return [];
      }

      const articles = this.mapArticles(data.articles, 'business');

      this.setCache(cacheKey, articles);
      return articles;
    } catch (error) {
      logError('Failed to fetch business headlines:', error);
      return [];
    }
  }

  // --- Private helpers ---

  private async fetchEverything(query: string, pageSize: number): Promise<NewsArticle[]> {
    const params = new URLSearchParams({
      q: query,
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: String(pageSize),
      apiKey: this.apiKey,
    });

    const url = `${BASE_URL}/everything?${params.toString()}`;
    const response = await this.fetchWithTimeout(url);

    if (!response.ok) {
      logError(`Everything API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: NewsAPIResponse = await response.json();

    if (data.status !== 'ok') {
      logError('Everything API returned non-ok status:', data.status);
      return [];
    }

    return this.mapArticles(data.articles, 'market');
  }

  private mapArticles(
    articles: NewsAPIResponse['articles'],
    category: NewsArticle['category']
  ): NewsArticle[] {
    return articles
      .filter((a) => a.title && a.title !== '[Removed]')
      .map((a) => ({
        title: a.title,
        description: a.description || '',
        source: a.source?.name || 'Unknown',
        url: a.url,
        imageUrl: a.urlToImage || null,
        publishedAt: a.publishedAt,
        category,
      }));
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttlSeconds: number = CACHE_TTL_SECONDS): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const newsAPIService = NewsAPIService.getInstance();
