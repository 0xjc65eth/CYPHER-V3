import { useState, useEffect } from 'react';

export function useMarketSentiment() {
  const [data, setData] = useState<{ data: any[]; loading: boolean }>({
    data: [],
    loading: true
  });

  useEffect(() => {
    const fetchSentiment = async () => {
      try {
        // Use Fear & Greed Index history as sentiment proxy
        const response = await fetch('https://api.alternative.me/fng/?limit=31');
        const result = await response.json();

        if (result.data && result.data.length > 0) {
          const sentiment = result.data.reverse().map((item: any) => {
            const value = parseInt(item.value);
            // Map 0-100 Fear/Greed index to bullish/bearish percentages
            const bullish = value;
            const bearish = 100 - value;
            return {
              timestamp: parseInt(item.timestamp) * 1000,
              bullish,
              bearish,
              neutral: 0
            };
          });
          setData({ data: sentiment, loading: false });
          return;
        }
      } catch {
        // API failed
      }
      // No data available
      setData({ data: [], loading: false });
    };
    fetchSentiment();
  }, []);

  return data;
}