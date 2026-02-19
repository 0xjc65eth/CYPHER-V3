'use client';
import { useState, useEffect, useCallback } from 'react';

export interface NewsArticle {
  title: string;
  description: string;
  source: string;
  url: string;
  imageUrl: string;
  publishedAt: string;
  category: string;
}

export interface FinancialNewsData {
  articles: NewsArticle[];
  timestamp: number;
}

export function useFinancialNews(refreshInterval = 900000) {
  const [data, setData] = useState<FinancialNewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/financial-news/');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, refreshInterval);
    return () => clearInterval(id);
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
}
