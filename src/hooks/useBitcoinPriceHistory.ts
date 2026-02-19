import { useState, useEffect } from 'react';

interface PricePoint {
  timestamp: number;
  price: number;
  volume: number;
}

interface BitcoinPriceHistoryData {
  data: PricePoint[];
  loading: boolean;
  error: string | null;
}

export function useBitcoinPriceHistory(timeframe: string = '24h') {
  const [data, setData] = useState<BitcoinPriceHistoryData>({
    data: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        // Map timeframe to CoinGecko days parameter
        let days = '1';
        switch (timeframe) {
          case '24h': days = '1'; break;
          case '7d': days = '7'; break;
          case '30d': days = '30'; break;
          case '1y': days = '365'; break;
        }

        const res = await fetch(
          '/api/coingecko?endpoint=/coins/bitcoin/market_chart&params=' +
            encodeURIComponent(`vs_currency=usd&days=${days}`)
        );

        if (res.ok) {
          const result = await res.json();
          const prices = result.prices || [];
          const volumes = result.total_volumes || [];

          const points: PricePoint[] = prices.map((p: [number, number], i: number) => ({
            timestamp: p[0],
            price: p[1],
            volume: volumes[i] ? volumes[i][1] : 0
          }));

          setData({ data: points, loading: false, error: null });
          return;
        }
      } catch {
        // API failed
      }

      // Fallback: empty data with error
      setData({
        data: [],
        loading: false,
        error: 'Failed to fetch Bitcoin price history'
      });
    };

    fetchHistoricalData();
  }, [timeframe]);

  return data;
}
