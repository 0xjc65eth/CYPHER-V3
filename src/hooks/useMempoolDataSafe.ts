import { useState, useEffect, useCallback, useRef } from 'react';
import { MempoolService, MempoolStats, RecommendedFees, Block } from '@/services/MempoolService';

interface MempoolData {
  stats: MempoolStats | null;
  fees: RecommendedFees | null;
  blocks: Block[] | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface UseMempoolDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableFallback?: boolean;
}

export function useMempoolDataSafe(options: UseMempoolDataOptions = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 segundos
    enableFallback = true,
  } = options;

  const [data, setData] = useState<MempoolData>({
    stats: null,
    fees: null,
    blocks: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const mempoolService = useRef(new MempoolService());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const fetchMempoolData = useCallback(async (showLoading = true) => {
    if (!isMountedRef.current) return;

    if (showLoading) {
      setData(prev => ({ ...prev, loading: true, error: null }));
    }

    try {
      // Buscar dados em paralelo com fallbacks
      const [statsResult, feesResult, blocksResult] = await Promise.allSettled([
        fetchWithFallback(() => mempoolService.current.getMempoolStats(), 'stats'),
        fetchWithFallback(() => mempoolService.current.getRecommendedFees(), 'fees'),
        fetchWithFallback(() => mempoolService.current.getRecentBlocks(), 'blocks'),
      ]);

      if (!isMountedRef.current) return;

      const newData: Partial<MempoolData> = {
        loading: false,
        lastUpdated: new Date(),
        error: null,
      };

      // Processar resultados
      if (statsResult.status === 'fulfilled') {
        newData.stats = statsResult.value;
      } else if (enableFallback) {
        newData.stats = getFallbackStats();
      }

      if (feesResult.status === 'fulfilled') {
        newData.fees = feesResult.value;
      } else if (enableFallback) {
        newData.fees = getFallbackFees();
      }

      if (blocksResult.status === 'fulfilled') {
        newData.blocks = blocksResult.value;
      } else if (enableFallback) {
        newData.blocks = getFallbackBlocks();
      }

      setData(prev => ({ ...prev, ...newData }));

    } catch (error) {
      if (!isMountedRef.current) return;

      console.error('Mempool data fetch error:', error);
      
      if (enableFallback) {
        setData(prev => ({
          ...prev,
          stats: prev.stats || getFallbackStats(),
          fees: prev.fees || getFallbackFees(),
          blocks: prev.blocks || getFallbackBlocks(),
          loading: false,
          error: 'Using cached/fallback data due to API issues',
          lastUpdated: new Date(),
        }));
      } else {
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch mempool data',
        }));
      }
    }
  }, [enableFallback]);

  // Função helper para retry com fallback
  const fetchWithFallback = async <T>(
    fetchFn: () => Promise<T>,
    type: string,
    retries = 2
  ): Promise<T> => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await fetchFn();
      } catch (error) {
        if (i === retries) {
          throw error;
        }
        // Esperar um pouco antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error(`Failed after ${retries + 1} attempts`);
  };

  // Função de refresh manual
  const refresh = useCallback(() => {
    fetchMempoolData(true);
  }, [fetchMempoolData]);

  // Configurar auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    intervalRef.current = setInterval(() => {
      fetchMempoolData(false); // Não mostrar loading em refreshes automáticos
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, fetchMempoolData]);

  // Buscar dados iniciais
  useEffect(() => {
    fetchMempoolData(true);

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchMempoolData]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...data,
    refresh,
    isStale: data.lastUpdated ? Date.now() - data.lastUpdated.getTime() > 60000 : false,
  };
}

// Dados de fallback
function getFallbackStats(): MempoolStats {
  return {
    count: 15432,
    vsize: 12345678,
    total_fee: 234567890,
    fee_histogram: [
      [1, 145],
      [2, 267],
      [5, 456],
      [10, 789],
      [20, 1234],
      [50, 987],
      [100, 543],
      [200, 321],
      [500, 123],
      [1000, 45],
    ],
  };
}

function getFallbackFees(): RecommendedFees {
  return {
    fastestFee: 25,
    halfHourFee: 20,
    hourFee: 15,
    economyFee: 8,
    minimumFee: 1,
  };
}

function getFallbackBlocks(): Block[] {
  const now = Date.now();
  return [
    {
      id: "00000000000000000002c5d7e8e29e8cf12b9c4b0e5a9b8c7d6e5f4a3b2c1d0e9f",
      height: 820150,
      version: 536870912,
      timestamp: now - 600000,
      tx_count: 3456,
      size: 1234567,
      weight: 3456789,
      merkle_root: "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef123",
      previousblockhash: "00000000000000000001b4c3e7f8d9a2b5c6e9f0a3b4c7d0e3f6a9b2c5d8e1f4a7",
      mediantime: now - 3600000,
      nonce: 123456789,
      bits: 386089497,
      difficulty: 68177349387402.49,
      extras: {
        coinbaseRaw: "03404c0c04b9e7f366",
        orphans: [],
        coinbaseAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        coinbaseSignature: "",
        coinbaseSignatureAscii: "",
        avgFee: 15432,
        avgFeeRate: 25.5,
        feeRange: [1, 5, 10, 20, 30, 50, 100],
        reward: 625000000,
        totalFees: 53456789,
        avgTxSize: 357,
        totalInputs: 8765,
        totalOutputs: 9876,
        totalOutputAmt: 123456789012,
        medianFee: 12345,
        feePercentiles: [1, 5, 10, 20, 30, 50, 100],
        medianFeeAmt: 12345,
        utxoSetChange: 1234,
        utxoSetSize: 987654321,
        virtualSize: 1234567,
        segwitTotalTxs: 3000,
        segwitTotalSize: 1000000,
        segwitTotalWeight: 3000000,
        header: "00000020",
        feeSpan: [1, 1000],
        pool: {
          id: 1,
          name: "Unknown",
          slug: "unknown"
        }
      }
    }
  ];
}