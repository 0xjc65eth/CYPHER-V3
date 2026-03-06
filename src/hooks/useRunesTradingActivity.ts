import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface TradingActivity {
  timestamp: number;
  totalVolume: number;
  transactionCount: number;
  uniqueTraders: number;
  averageTransactionSize: number;
  mintingVolume: number;
  tradingVolume: number;
  fees: number;
}

interface MintingActivity {
  timestamp: number;
  mintingVolume: number;
  mintCount: number;
  uniqueMiners: number;
  averageMintSize: number;
}

// Top runes to fetch activity for when aggregating
const TOP_RUNES = [
  'UNCOMMON•GOODS',
  'DOG•GO•TO•THE•MOON',
  'RSIC•GENESIS•RUNE',
  'SATOSHI•NAKAMOTO',
  'BILLION•DOLLAR•CAT',
];

export function useRunesTradingActivity(
  timeframe: '1d' | '7d' | '30d' | '90d' | '1y' | 'all' = '7d',
  runeId?: string
) {
  const [activity, setActivity] = useState<TradingActivity[]>([]);
  const [mintingActivity, setMintingActivity] = useState<MintingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTradingActivity = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine which runes to fetch activity for
      const runesToFetch = runeId && runeId !== 'all'
        ? [runeId]
        : TOP_RUNES;

      // Fetch real activities from Gamma.io API
      const allActivities: any[] = [];

      await Promise.all(
        runesToFetch.map(async (rune) => {
          try {
            const encodedRune = encodeURIComponent(rune);
            const response = await fetch(
              `/api/marketplace/runes/activities/${encodedRune}?limit=50`
            );
            if (response.ok) {
              const data = await response.json();
              const activities = data?.activities || [];
              allActivities.push(...activities);
            }
          } catch (err) {
            logger.warn(`Failed to fetch activity for ${rune}:`, err);
          }
        })
      );

      // If we got no data, return empty arrays
      if (allActivities.length === 0) {
        setActivity([]);
        setMintingActivity([]);
        setLoading(false);
        return;
      }

      // Calculate time range for bucketing
      const now = Date.now();
      const periods = timeframe === '1d' ? 24 : timeframe === '7d' ? 7 * 24 : timeframe === '30d' ? 30 : 90;
      const interval = timeframe === '1d' ? 3600000 : timeframe === '7d' ? 3600000 : 86400000;

      // Process activities into time-based buckets
      const activityBuckets = new Map<number, {
        volume: number;
        fees: number;
        txCount: number;
        uniqueAddresses: Set<string>;
        mintVolume: number;
        mintCount: number;
        mintAddresses: Set<string>;
        tradeVolume: number;
      }>();

      // Initialize buckets
      for (let i = 0; i < periods; i++) {
        const bucketTime = now - (i * interval);
        const roundedTime = Math.floor(bucketTime / interval) * interval;
        activityBuckets.set(roundedTime, {
          volume: 0,
          fees: 0,
          txCount: 0,
          uniqueAddresses: new Set(),
          mintVolume: 0,
          mintCount: 0,
          mintAddresses: new Set(),
          tradeVolume: 0,
        });
      }

      // Classify and bucket each activity
      allActivities.forEach((act) => {
        const ts = act.timestamp || act.createdAt;
        if (!ts) return;

        const activityTime = typeof ts === 'string' ? new Date(ts).getTime() : ts * 1000;
        const bucketTime = Math.floor(activityTime / interval) * interval;
        const bucket = activityBuckets.get(bucketTime);
        if (!bucket) return;

        const totalPrice = act.totalPrice?.value || 0;
        bucket.volume += totalPrice;
        bucket.txCount += 1;

        if (act.from) bucket.uniqueAddresses.add(act.from);
        if (act.to) bucket.uniqueAddresses.add(act.to);

        if (act.type === 'mint') {
          const amount = parseFloat(act.amount || act.formattedAmount || '0');
          bucket.mintVolume += amount;
          bucket.mintCount += 1;
          if (act.to) bucket.mintAddresses.add(act.to);
        } else {
          bucket.tradeVolume += totalPrice;
        }
      });

      // Convert buckets to arrays
      const tradingActivity: TradingActivity[] = [];
      const mintingActivityData: MintingActivity[] = [];

      Array.from(activityBuckets.entries())
        .sort(([a], [b]) => a - b)
        .forEach(([timestamp, bucket]) => {
          tradingActivity.push({
            timestamp,
            totalVolume: bucket.volume,
            transactionCount: bucket.txCount,
            uniqueTraders: bucket.uniqueAddresses.size,
            averageTransactionSize: bucket.txCount > 0 ? bucket.volume / bucket.txCount : 0,
            mintingVolume: bucket.mintVolume,
            tradingVolume: bucket.tradeVolume,
            fees: bucket.fees,
          });

          if (bucket.mintCount > 0) {
            mintingActivityData.push({
              timestamp,
              mintingVolume: bucket.mintVolume,
              mintCount: bucket.mintCount,
              uniqueMiners: bucket.mintAddresses.size,
              averageMintSize: bucket.mintVolume / bucket.mintCount,
            });
          }
        });

      setActivity(tradingActivity);
      setMintingActivity(mintingActivityData);
      setLoading(false);
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Error fetching trading activity:');
      setError(error instanceof Error ? error.message : 'Failed to fetch trading activity');
      setLoading(false);
    }
  }, [timeframe, runeId]);

  useEffect(() => {
    fetchTradingActivity();

    // Refresh every minute
    const interval = setInterval(fetchTradingActivity, 60000);

    return () => clearInterval(interval);
  }, [fetchTradingActivity]);

  return {
    activity,
    mintingActivity,
    loading,
    error,
    refetch: fetchTradingActivity
  };
}
