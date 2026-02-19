import { useState, useEffect } from 'react';
import { NewsItem } from '@/app/api/crypto-news/route';

export function useCryptoNews(refreshInterval: number = 300000) { // Default refresh every 5 minutes
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/crypto-news/');
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.data && Array.isArray(data.data)) {
          setNews(data.data);
          setLastUpdated(new Date());
          setError(null);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch news immediately
    fetchNews();

    // Set up interval for refreshing news
    const intervalId = setInterval(fetchNews, refreshInterval);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  // Function to manually refresh news
  const refresh = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/crypto-news/');
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        setNews(data.data);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  return { news, isLoading, error, lastUpdated, refresh };
}
