import { useState, useEffect, useCallback, useRef } from 'react';

interface NetworkStats {
  hashrate: number;
  difficulty: string;
  nextAdjustment: number;
  blocksToAdjustment: number;
  blockHeight: number;
  blockTime: number;
  mempoolSize: number;
  mempoolFees: {
    fast: number;
    medium: number;
    slow: number;
  };
  lastBlock: {
    height: number;
    hash: string;
    time: Date;
    size: number;
    weight: number;
    txCount: number;
    miner: string;
  };
  networkHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

function determineNetworkHealth(
  blockTime: number,
  mempoolSize: number,
  fastFee: number
): 'excellent' | 'good' | 'fair' | 'poor' {
  // Block time near 10 min is ideal; mempool under 20MB and fees under 50 sat/vB is good
  if (blockTime <= 12 && mempoolSize < 50 && fastFee < 30) return 'excellent';
  if (blockTime <= 15 && mempoolSize < 150 && fastFee < 80) return 'good';
  if (blockTime <= 20 && mempoolSize < 300 && fastFee < 200) return 'fair';
  return 'poor';
}

export function useNetworkStats() {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchNetworkStats = useCallback(async () => {
    try {
      // Fetch from mempool.space proxy in parallel
      const [feesRes, blocksRes, mempoolRes, diffRes, hashrateRes] = await Promise.allSettled([
        fetch('/api/mempool/?endpoint=/v1/fees/recommended'),
        fetch('/api/mempool/?endpoint=/v1/blocks'),
        fetch('/api/mempool/?endpoint=/mempool'),
        fetch('/api/mempool/?endpoint=/v1/difficulty-adjustment'),
        fetch('/api/mempool/?endpoint=/v1/mining/hashrate/3d'),
      ]);

      if (!mountedRef.current) return;

      // Parse fees
      let mempoolFees = { fast: 0, medium: 0, slow: 0 };
      if (feesRes.status === 'fulfilled' && feesRes.value.ok) {
        const fees = await feesRes.value.json();
        mempoolFees = {
          fast: fees.fastestFee || 0,
          medium: fees.halfHourFee || 0,
          slow: fees.hourFee || 0,
        };
      }

      // Parse blocks
      let lastBlock = {
        height: 0,
        hash: '',
        time: new Date(),
        size: 0,
        weight: 0,
        txCount: 0,
        miner: 'Unknown',
      };
      let blockHeight = 0;
      let blockTime = 10; // default

      if (blocksRes.status === 'fulfilled' && blocksRes.value.ok) {
        const blocks = await blocksRes.value.json();
        if (Array.isArray(blocks) && blocks.length > 0) {
          const b = blocks[0];
          blockHeight = b.height || 0;
          lastBlock = {
            height: b.height || 0,
            hash: b.id || '',
            time: new Date((b.timestamp || 0) * 1000),
            size: b.size || 0,
            weight: b.weight || 0,
            txCount: b.tx_count || 0,
            miner: b.extras?.pool?.name || 'Unknown',
          };

          // Calculate avg block time from recent blocks
          if (blocks.length >= 2) {
            const timeDiffs: number[] = [];
            for (let i = 0; i < Math.min(blocks.length - 1, 5); i++) {
              const diff = (blocks[i].timestamp - blocks[i + 1].timestamp);
              timeDiffs.push(diff);
            }
            blockTime = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length / 60; // in minutes
          }
        }
      }

      // Parse mempool
      let mempoolSize = 0;
      if (mempoolRes.status === 'fulfilled' && mempoolRes.value.ok) {
        const mempool = await mempoolRes.value.json();
        // vsize is in vbytes, convert to MB for display
        mempoolSize = (mempool.vsize || 0) / (1024 * 1024);
      }

      // Parse difficulty adjustment
      let nextAdjustment = 0;
      let blocksToAdjustment = 0;
      let difficulty = '0';
      if (diffRes.status === 'fulfilled' && diffRes.value.ok) {
        const diff = await diffRes.value.json();
        nextAdjustment = diff.difficultyChange || 0;
        blocksToAdjustment = diff.remainingBlocks || 0;
      }

      // Parse hashrate
      let hashrate = 0;
      if (hashrateRes.status === 'fulfilled' && hashrateRes.value.ok) {
        const hrData = await hashrateRes.value.json();
        // mempool.space returns hashrates array; use the latest value
        if (hrData.hashrates && Array.isArray(hrData.hashrates) && hrData.hashrates.length > 0) {
          const latest = hrData.hashrates[hrData.hashrates.length - 1];
          // Convert from H/s to EH/s
          hashrate = (latest.avgHashrate || 0) / 1e18;
        }
        if (hrData.difficulty) {
          // Format difficulty as T (trillions)
          difficulty = (hrData.difficulty / 1e12).toFixed(2) + 'T';
        } else if (hrData.currentDifficulty) {
          difficulty = (hrData.currentDifficulty / 1e12).toFixed(2) + 'T';
        }
      }

      const networkHealth = determineNetworkHealth(blockTime, mempoolSize, mempoolFees.fast);

      if (!mountedRef.current) return;

      const newStats: NetworkStats = {
        hashrate,
        difficulty,
        nextAdjustment,
        blocksToAdjustment,
        blockHeight,
        blockTime,
        mempoolSize,
        mempoolFees,
        lastBlock,
        networkHealth,
      };

      setStats(newStats);
      setLoading(false);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('useNetworkStats fetch error:', err);
      setError('Failed to fetch network stats');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchNetworkStats();

    // Refresh every 30 seconds
    const interval = setInterval(fetchNetworkStats, 30000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchNetworkStats]);

  return { stats, loading, error };
}
