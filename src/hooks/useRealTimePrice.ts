import { useState, useEffect } from 'react';
import { intervalManager } from '@/lib/api/interval-manager';
import { requestDeduplicator } from '@/lib/api/request-deduplicator';

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdate: Date;
}

export function useRealTimePrice(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Add abort controller to prevent memory leaks from cancelled requests
    const abortController = new AbortController();
    let isMounted = true;
    const intervalKey = `price-fetch-${symbols.join(',')}`;

    const fetchPrices = async () => {
      const symbolsParam = symbols.join(',');
      const requestKey = `prices-${symbolsParam}`;
      
      try {
        // Use request deduplicator to prevent duplicate API calls
        const data = await requestDeduplicator.dedupe(requestKey, async () => {
          const response = await fetch(`/api/realtime-prices/?symbols=${symbolsParam}`, {
            signal: abortController.signal // Cancel request if component unmounts
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch prices');
          }

          return response.json();
        });
        
        // Only update state if component is still mounted
        if (!isMounted) return;
        
        if (data.success && data.data) {
          const formattedPrices: Record<string, PriceData> = {};

          symbols.forEach(symbol => {
            if (data.data[symbol]) {
              formattedPrices[symbol] = {
                symbol,
                price: data.data[symbol].price,
                change24h: data.data[symbol].change24h,
                volume24h: data.data[symbol].volume24h,
                marketCap: data.data[symbol].marketCap,
                lastUpdate: new Date(data.data[symbol].lastUpdated)
              };
            }
          });

          setPrices(formattedPrices);
          setError(null);
        }
      } catch (err) {
        // Don't log errors if request was aborted (component unmounted)
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        
        if (isMounted) {
          console.error('Error fetching prices:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch prices');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Fetch immediately
    fetchPrices();

    // Use interval manager to prevent overlapping intervals
    intervalManager.register(intervalKey, () => {
      if (isMounted) {
        fetchPrices();
      }
    }, 120000); // Increased to 2 minutes to reduce server load

    // Cleanup function prevents memory leaks
    return () => {
      isMounted = false;
      abortController.abort(); // Cancel any pending requests
      intervalManager.clear(intervalKey); // Clear managed interval
    };
  }, [symbols.join(',')]);

  return { prices, loading, error };
}

// Hook específico para Bitcoin
export function useBitcoinRealTimePrice() {
  const { prices, loading, error } = useRealTimePrice(['BTC']);
  
  return {
    btcPrice: prices.BTC?.price || 0,
    btcChange24h: prices.BTC?.change24h || 0,
    btcVolume24h: prices.BTC?.volume24h || 0,
    btcMarketCap: prices.BTC?.marketCap || 0,
    lastUpdate: prices.BTC?.lastUpdate || new Date(),
    loading,
    error
  };
}

// Hook para múltiplas criptomoedas
export function useMultiCryptoRealTimePrice() {
  const symbols = ['BTC', 'ETH', 'ORDI', 'RUNE', 'SOL', 'MATIC'];
  return useRealTimePrice(symbols);
}