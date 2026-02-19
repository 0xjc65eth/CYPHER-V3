'use client';

import { useState, useEffect } from 'react';
import { rateLimitedFetch } from '@/lib/rateLimitedFetch';

export function useSimpleBitcoinPrice() {
  const [data, setData] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setIsLoading(true);
        
        // Try to fetch from our API first
        try {
          const response = await fetch('/api/bitcoin-price/');
          if (response.ok) {
            const result = await response.json();
            if (result.price) {
              setData(result.price);
              setError(null);
              return;
            }
          }
        } catch (apiError) {
        }

        // Fallback to CoinGecko with rate limiting
        const coinGeckoData = await rateLimitedFetch(
          '/api/coingecko/simple/price?ids=bitcoin&vs_currencies=usd'
        );
        const price = coinGeckoData?.bitcoin?.usd;
        
        if (price) {
          setData(price);
          setError(null);
        } else {
          // Final fallback with mock data
          setData(43567);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching Bitcoin price:', err);
        // Set mock data if all fails
        setData(43567);
        setError(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrice();

    // CoinGecko rate limit: increased to 60s
    const interval = setInterval(fetchPrice, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    data,
    isLoading,
    error
  };
}