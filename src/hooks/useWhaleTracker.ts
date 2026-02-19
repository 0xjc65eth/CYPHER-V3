import { useQuery } from '@tanstack/react-query';
import type { TopHolder, WhaleActivity, WhaleAlert } from '@/types/ordinals-holders';

/**
 * Hook to fetch whale (large holder) data and activity
 */
export function useWhaleTracker(
  collectionSymbol: string | null,
  limit: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['whale-tracker', collectionSymbol, limit],
    queryFn: async () => {
      if (!collectionSymbol) {
        throw new Error('Collection symbol is required');
      }

      const params = new URLSearchParams({
        collection: collectionSymbol,
        limit: limit.toString()
      });

      const response = await fetch(`/api/ordinals/whales/?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch whale data: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch whale data');
      }

      return result.data as {
        whales: TopHolder[];
        recentActivity: WhaleActivity[];
        alerts: WhaleAlert[];
        metadata: {
          totalSupply: number;
          floorPrice: number;
          totalWhales: number;
          whaleConcentration: number;
        };
      };
    },
    enabled: enabled && !!collectionSymbol,
    staleTime: 30000, // 30 seconds (whales need fresher data)
    refetchInterval: 60000, // Refetch every minute
    retry: 2
  });
}

/**
 * Hook to get whale alerts across multiple collections
 */
export function useWhaleAlerts(collectionSymbols: string[], enabled: boolean = true) {
  return useQuery({
    queryKey: ['whale-alerts-multi', ...collectionSymbols],
    queryFn: async () => {
      const promises = collectionSymbols.map(async (symbol) => {
        try {
          const params = new URLSearchParams({
            collection: symbol,
            limit: '10'
          });
          const response = await fetch(`/api/ordinals/whales/?${params}`);
          if (!response.ok) return null;
          const result = await response.json();
          return result.success ? result.data.alerts : null;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(promises);
      const allAlerts = results
        .filter((r): r is WhaleAlert[] => r !== null)
        .flat();

      // Sort by timestamp and severity
      return allAlerts.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        if (a.severity !== b.severity) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return b.timestamp - a.timestamp;
      });
    },
    enabled: enabled && collectionSymbols.length > 0,
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1
  });
}
