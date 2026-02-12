import { useState, useEffect } from 'react';
import { coinGeckoService } from '@/lib/api/coingecko-service';

interface CoinGeckoPrice {
  usd: number;
  usd_24h_change: number;
  usd_24h_vol: number;
  usd_market_cap: number;
}

interface PriceData {
  bitcoin?: CoinGeckoPrice;
  ethereum?: CoinGeckoPrice;
  solana?: CoinGeckoPrice;
}

export function useCoinGeckoPrice() {
  const [prices, setPrices] = useState<PriceData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const data = await coinGeckoService.getSimplePrice(
          ['bitcoin', 'ethereum', 'solana'],
          ['usd'],
          {
            include24hrChange: true,
            include24hrVol: true,
            includeMarketCap: true,
          }
        );

        setPrices(data);
        setError(null);
      } catch (err) {
        console.error('CoinGecko API Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch prices');

        // Fallback prices
        setPrices({
          bitcoin: { usd: 105847, usd_24h_change: 2.85, usd_24h_vol: 34567000000, usd_market_cap: 2075000000000 },
          ethereum: { usd: 3345, usd_24h_change: 3.42, usd_24h_vol: 18234000000, usd_market_cap: 402000000000 },
          solana: { usd: 188.5, usd_24h_change: -1.23, usd_24h_vol: 3456000000, usd_market_cap: 84000000000 }
        });
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchPrices();

    // Update every minute (service handles rate limiting internally)
    const interval = setInterval(fetchPrices, 60000);

    return () => clearInterval(interval);
  }, []);

  return { prices, loading, error };
}