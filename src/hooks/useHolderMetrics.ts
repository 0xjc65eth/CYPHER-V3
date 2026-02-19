import { useQuery } from '@tanstack/react-query';
import type {
  HolderMetrics,
  HolderDistribution,
  TopHolder,
  ConcentrationMetrics
} from '@/types/ordinals-holders';

/**
 * Hook to fetch comprehensive holder metrics for a collection
 */
export function useHolderMetrics(collectionSymbol: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['holder-metrics', collectionSymbol],
    queryFn: async () => {
      if (!collectionSymbol) {
        throw new Error('Collection symbol is required');
      }

      const response = await fetch(`/api/ordinals/holders/${collectionSymbol}/`);

      if (!response.ok) {
        throw new Error(`Failed to fetch holder metrics: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch holder metrics');
      }

      return result.data as {
        metrics: HolderMetrics;
        topHolders: TopHolder[];
        distribution: HolderDistribution | null;
        concentrationMetrics: ConcentrationMetrics | null;
      };
    },
    enabled: enabled && !!collectionSymbol,
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // Refetch every 5 minutes
    retry: 2
  });
}

/**
 * Hook to fetch holder metrics for multiple collections
 */
export function useMultipleHolderMetrics(collectionSymbols: string[], enabled: boolean = true) {
  return useQuery({
    queryKey: ['holder-metrics-multi', ...collectionSymbols],
    queryFn: async () => {
      const promises = collectionSymbols.map(async (symbol) => {
        try {
          const response = await fetch(`/api/ordinals/holders/${symbol}/`);
          if (!response.ok) return null;
          const result = await response.json();
          return result.success ? { symbol, ...result.data } : null;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(promises);
      return results.filter((r): r is NonNullable<typeof r> => r !== null);
    },
    enabled: enabled && collectionSymbols.length > 0,
    staleTime: 60000,
    refetchInterval: 300000,
    retry: 1
  });
}
