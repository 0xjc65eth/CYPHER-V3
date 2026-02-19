'use client';

import { useState, useEffect } from 'react';

interface HotMint {
  id: string;
  name: string;
  category: string;
  mintRate: number;
  uniqueMinters: number;
  mintPrice: number;
  supply: number;
  remaining: number;
  progress: number;
  estimatedCompletion: string;
}

interface TrendingMint {
  id: string;
  name: string;
  trendScore: number;
  startTime: string;
  mintPrice: number;
  mintRateIncrease: number;
}

interface RecentMint {
  id: string;
  name: string;
  launchTime: string;
  mintPrice: number;
  supply: number;
  earlyMinters: number;
}

interface HotMintsData {
  hotMints: HotMint[];
  trendingMints: TrendingMint[];
  recentMints: RecentMint[];
  loading: boolean;
}

export function useHotMints(): HotMintsData {
  const [data, setData] = useState<HotMintsData>({
    hotMints: [],
    trendingMints: [],
    recentMints: [],
    loading: true
  });

  useEffect(() => {
    const fetchHotMints = async () => {
      try {
        // Attempt to fetch from ordinals/minting API
        const res = await fetch('/api/ordinals/activity/');
        if (res.ok) {
          const result = await res.json();
          // Map API data to HotMint format if available
          if (result.hotMints || result.data) {
            setData({
              hotMints: result.hotMints || [],
              trendingMints: result.trendingMints || [],
              recentMints: result.recentMints || [],
              loading: false
            });
            return;
          }
        }
      } catch {
        // API not available
      }

      // No real data available - show empty state
      setData({
        hotMints: [],
        trendingMints: [],
        recentMints: [],
        loading: false
      });
    };

    fetchHotMints();

    // Refresh every 2 minutes
    const interval = setInterval(fetchHotMints, 120000);
    return () => clearInterval(interval);
  }, []);

  return data;
}
