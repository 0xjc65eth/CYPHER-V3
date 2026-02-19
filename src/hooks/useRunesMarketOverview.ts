import { useQuery } from '@tanstack/react-query';

export interface EnrichedRune {
  // Core identity
  id: string;
  name: string;
  spaced_name: string;
  number: number;
  symbol: string;
  decimals: number;

  // Supply data
  supply: string;
  burned: string;
  premine: string;

  // Holder & listing data
  holders: number;
  listed: number;
  transactions: number;

  // Market data
  floorPrice: number;
  volume24h: number;
  volume7d: number;
  sales24h: number;
  marketCap: number;
  change24h: number;

  // Metadata
  turbo: boolean;
  mintable: boolean;
  image_uri: string | null;
  timestamp: string | null;

  // Etching info
  etching_tx_id: string | null;
  etching_block_height: number | null;
  mint_terms: any;
}

export interface MarketStats {
  totalRunes: number;
  totalHolders: number;
  totalVolume24h: number;
  totalMarketCap: number;
  turboRunes: number;
  activeListings: number;
}

export interface RunesMarketOverviewResponse {
  success: boolean;
  data: EnrichedRune[];
  stats: MarketStats;
  total: number;
  timestamp: number;
  source: 'magiceden' | 'hiro-fallback';
  error?: string;
  message?: string;
}

export interface UseRunesMarketOverviewOptions {
  limit?: number;
  refetchInterval?: number;
  enabled?: boolean;
}

export function useRunesMarketOverview(options: UseRunesMarketOverviewOptions = {}) {
  const { limit = 100, refetchInterval = 60000, enabled = true } = options;

  return useQuery<RunesMarketOverviewResponse>({
    queryKey: ['runes', 'market-overview', limit],
    queryFn: async () => {
      const response = await fetch(`/api/runes/market-overview/?limit=${limit}`);

      // ALWAYS return data on 200, even if it's mock data
      if (response.ok) {
        return response.json();
      }

      // On error, throw to trigger retry logic
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    },
    refetchInterval: false, // DISABLE auto-refresh to prevent loops (user can manually refresh)
    staleTime: 90_000, // Consider data stale after 90s (same as API cache)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    enabled,
    retry: 1, // Only retry once to prevent loops
    retryDelay: 5000, // Wait 5s before retry
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
}
