import { useQuery } from '@tanstack/react-query';
import type { CollectionLeaderboard } from '@/types/ordinals-holders';

/**
 * Hook to fetch collection leaderboard (top collectors)
 */
export function useCollectionLeaderboard(
  collectionSymbol: string | null,
  limit: number = 50,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['collection-leaderboard', collectionSymbol, limit],
    queryFn: async () => {
      if (!collectionSymbol) {
        throw new Error('Collection symbol is required');
      }

      const params = new URLSearchParams({
        limit: limit.toString()
      });

      const response = await fetch(`/api/ordinals/leaderboard/${collectionSymbol}/?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch leaderboard');
      }

      return result.data as CollectionLeaderboard & {
        metadata: {
          totalSupply: number;
          floorPrice: number;
          averageHoldings: number;
        };
      };
    },
    enabled: enabled && !!collectionSymbol,
    staleTime: 300000, // 5 minutes (leaderboard changes slowly)
    refetchInterval: 600000, // Refetch every 10 minutes
    retry: 2
  });
}
