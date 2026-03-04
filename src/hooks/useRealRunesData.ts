'use client';

import { useEffect, useState } from 'react';
import { useTradingStore } from '@/stores/trading-store';
import { OrdiscanClient } from '@/services/api/ordiscan-client';

interface UseRealRunesDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useRealRunesData = (options: UseRealRunesDataOptions = {}) => {
  const { autoRefresh = true, refreshInterval = 30000 } = options;
  const { addRune, addAlert } = useTradingStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const ordiscanClient = new OrdiscanClient();

  const fetchRunesData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch runes list from Ordiscan
      const runesResponse = await ordiscanClient.getRunesList(50, 0);
      
      if (runesResponse?.runes) {
        for (const rune of runesResponse.runes) {
          const formattedRune = {
            id: rune.id || `${rune.name}-${Date.now()}`,
            name: rune.name,
            symbol: rune.symbol || rune.name.substring(0, 4).toUpperCase(),
            divisibility: rune.divisibility || 0,
            cap: rune.cap || null,
            amount: rune.amount || null,
            burned: rune.burned || null,
            mints: rune.mints || 0,
            etching: rune.etching_txid || rune.etching || '',
            terms: rune.terms || null,
            timestamp: rune.created_at ? new Date(rune.created_at).getTime() : Date.now()
          };

          addRune(formattedRune);

          // Alert for new runes or significant events
          if (rune.mints === 1 || (rune.cap && rune.mints >= rune.cap)) {
            addAlert({
              type: 'rune',
              title: rune.mints === 1 ? 'New Rune Etched' : 'Rune Fully Minted',
              message: `${rune.name} - ${rune.mints === 1 ? 'First mint completed' : 'All tokens minted'}`,
              severity: 'success',
            });
          }
        }
      }

      // Fetch individual rune details for top runes
      const topRunes = runesResponse?.runes?.slice(0, 10) || [];
      for (const rune of topRunes) {
        try {
          const runeDetails = await ordiscanClient.getRune(rune.name);
          const runeActivity = await ordiscanClient.getRuneActivity(rune.name, 10);
          
          // Process activity data
          if (runeActivity?.activity) {
            for (const activity of runeActivity.activity) {
              if (activity.type === 'mint' || activity.type === 'transfer') {
                addAlert({
                  type: 'rune',
                  title: `${rune.name} Activity`,
                  message: `${activity.type}: ${activity.amount || 'N/A'} tokens`,
                  severity: 'info',
                    });
              }
            }
          }
        } catch (detailError) {
        }
      }

    } catch (err) {
      console.error('Error fetching runes data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch runes data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRuneHolders = async (runeName: string) => {
    try {
      const holders = await ordiscanClient.getRuneHolders(runeName, 50);
      return holders;
    } catch (err) {
      console.error(`Error fetching holders for ${runeName}:`, err);
      return null;
    }
  };

  const fetchRuneActivity = async (runeName: string) => {
    try {
      const activity = await ordiscanClient.getRuneActivity(runeName, 20);
      return activity;
    } catch (err) {
      console.error(`Error fetching activity for ${runeName}:`, err);
      return null;
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchRunesData();

    // Setup refresh interval if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchRunesData, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  return {
    isLoading,
    error,
    refetch: fetchRunesData,
    fetchRuneHolders,
    fetchRuneActivity
  };
};