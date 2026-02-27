import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';

// Fetcher function
const fetcher = (url: string) => fetch(url).then(res => res.json());

// Types for arbitrage data
export interface ArbitrageOpportunity {
  id: string;
  symbol: string;
  name: string;
  type: 'ordinals' | 'runes' | 'tokens';
  buyPrice: number;
  sellPrice: number;
  spread: number;
  potentialProfit: number;
  buySource: string;
  sellSource: string;
  buyLink: string;
  sellLink: string;
  baseCurrency: string;
  volume24h?: number;
  liquidity: number;
  confidence: number;
  lastUpdated: number;
  marketCap?: number;
  aiAnalysis?: string;
  riskScore: 'low' | 'medium' | 'high';
  trustScore: number;
  estimatedFees: {
    network: number;
    platform: number;
    bridge?: number;
    total: number;
  };
  executionTime: number;
  historicalSuccess?: number;
  priceConsistency?: number;
  discoveryTime?: number;
  // Extra cross-exchange fields
  spreadPercent?: number;
  netProfitPercent?: number;
  estimatedProfitPer1BTC?: number;
}

export interface ArbitrageStats {
  totalOpportunities: number;
  totalSpread: number;
  avgSpread: number;
  highValueOpportunities: number;
  lastScan: number;
}

// Main hook for arbitrage detection
export function useArbitrage(minSpread: number = 0, assetType: string = 'all', pair: string = 'ALL') {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [stats, setStats] = useState<ArbitrageStats | null>(null);

  // Build URL with optional pair filter
  const pairParam = pair && pair !== 'ALL' ? `&pair=${encodeURIComponent(pair)}` : '';

  // Pass minSpread=0 to API to get ALL opportunities, then filter client-side
  const { data, error, refetch } = useQuery({
    queryKey: ['arbitrage-opportunities', minSpread, assetType, pair],
    queryFn: () => fetcher(`/api/arbitrage/opportunities/?minSpread=0&type=${assetType}${pairParam}`),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 2000,
  });

  const processedOpportunities = useMemo(() => {
    if (!data?.opportunities) return [];

    return data.opportunities
      .filter((opp: any) => {
        // Use spread field (percentage) for filtering
        const spreadPct = opp.spread ?? opp.spreadPercent ?? 0;
        return spreadPct >= minSpread;
      })
      .filter((opp: any) => assetType === 'all' || opp.type === assetType)
      .sort((a: any, b: any) => (b.netProfitPercent ?? b.spread ?? 0) - (a.netProfitPercent ?? a.spread ?? 0));
  }, [data, minSpread, assetType]);

  const calculatedStats = useMemo(() => {
    if (!processedOpportunities.length) return null;

    const totalSpread = processedOpportunities.reduce(
      (sum: number, opp: any) => sum + (opp.spread ?? 0),
      0
    );
    const avgSpread = totalSpread / processedOpportunities.length;
    const highValueOpportunities = processedOpportunities.filter(
      (opp: any) => (opp.spread ?? 0) >= 0.1
    ).length;

    return {
      totalOpportunities: processedOpportunities.length,
      totalSpread,
      avgSpread,
      highValueOpportunities,
      lastScan: Date.now(),
    };
  }, [processedOpportunities]);

  useEffect(() => {
    if (processedOpportunities) {
      setOpportunities(processedOpportunities);
    }
    if (calculatedStats) {
      setStats(calculatedStats);
    }
  }, [processedOpportunities, calculatedStats]);

  return {
    opportunities,
    loading: !data && !error,
    error: error instanceof Error ? error.message : data?.error ? data.error : null,
    lastUpdate: data?.timestamp,
    totalSpread: stats?.totalSpread,
    avgSpread: stats?.avgSpread,
    refresh: refetch,
  };
}

// Hook for real-time market scanning
export function useArbitrageScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScanResults, setLastScanResults] = useState<any>(null);

  const startScan = async () => {
    setIsScanning(true);
    setScanProgress(0);

    try {
      setScanProgress(25);
      const response = await fetch('/api/arbitrage/opportunities/?type=all&minSpread=0');
      setScanProgress(75);

      if (!response.ok) {
        throw new Error(`Scan failed: ${response.status}`);
      }

      const results = await response.json();
      setLastScanResults(results);
      setScanProgress(100);
    } catch {
      // Scan failed - results remain null
    } finally {
      setIsScanning(false);
    }
  };

  return {
    isScanning,
    scanProgress,
    lastScanResults,
    startScan,
  };
}

// Hook for individual opportunity analysis
export function useOpportunityAnalysis(opportunity: ArbitrageOpportunity | null) {
  const { data, error } = useQuery({
    queryKey: ['arbitrage-analyze', opportunity?.symbol, opportunity?.buySource, opportunity?.sellSource],
    queryFn: () =>
      fetcher(
        `/api/arbitrage/analyze?symbol=${opportunity!.symbol}&buySource=${opportunity!.buySource}&sellSource=${opportunity!.sellSource}`
      ),
    enabled: !!opportunity,
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });

  return {
    analysis: data?.analysis,
    risks: data?.risks,
    recommendations: data?.recommendations,
    aiExplanation: data?.aiExplanation,
    loading: !data && !error && opportunity !== null,
    error: error instanceof Error ? error.message : undefined,
  };
}

// Hook for market depth and liquidity analysis
export function useMarketDepthAnalysis(symbol: string, sources: string[]) {
  const { data, error } = useQuery({
    queryKey: ['arbitrage-depth', symbol, sources],
    queryFn: () => fetcher(`/api/arbitrage/depth?symbol=${symbol}&sources=${sources.join(',')}`),
    enabled: !!symbol && sources.length > 0,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const depthAnalysis = useMemo(() => {
    if (!data?.depth) return null;

    const totalBuyVolume = data.depth.reduce(
      (sum: number, source: any) =>
        sum + (source.bids?.reduce((bidSum: number, bid: any) => bidSum + bid.amount, 0) || 0),
      0
    );

    const totalSellVolume = data.depth.reduce(
      (sum: number, source: any) =>
        sum + (source.asks?.reduce((askSum: number, ask: any) => askSum + ask.amount, 0) || 0),
      0
    );

    const imbalance =
      totalBuyVolume > 0 && totalSellVolume > 0
        ? (totalBuyVolume - totalSellVolume) / (totalBuyVolume + totalSellVolume)
        : 0;

    return {
      totalBuyVolume,
      totalSellVolume,
      imbalance,
      liquidityScore: Math.min(100, ((totalBuyVolume + totalSellVolume) / 1000) * 100),
      sources: data.depth,
    };
  }, [data]);

  return {
    depthAnalysis,
    loading: !data && !error,
    error: error instanceof Error ? error.message : undefined,
  };
}

// Hook for historical arbitrage performance
export function useArbitrageHistory(timeframe: string = '24h') {
  const { data, error } = useQuery({
    queryKey: ['arbitrage-history', timeframe],
    queryFn: () => fetcher(`/api/arbitrage/history?timeframe=${timeframe}`),
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });

  const historyAnalysis = useMemo(() => {
    if (!data?.history) return null;

    const opportunities = data.history;
    const successfulArbs = opportunities.filter((opp: any) => opp.executed && opp.profit > 0);
    const totalProfit = successfulArbs.reduce((sum: number, arb: any) => sum + arb.profit, 0);
    const successRate =
      opportunities.length > 0 ? (successfulArbs.length / opportunities.length) * 100 : 0;

    return {
      totalOpportunities: opportunities.length,
      successfulArbitrages: successfulArbs.length,
      totalProfit,
      successRate,
      avgProfit: successfulArbs.length > 0 ? totalProfit / successfulArbs.length : 0,
      bestOpportunity: opportunities.reduce(
        (best: any, current: any) => (current.spread > (best?.spread || 0) ? current : best),
        null
      ),
    };
  }, [data]);

  return {
    history: data?.history || [],
    analysis: historyAnalysis,
    loading: !data && !error,
    error: error instanceof Error ? error.message : undefined,
  };
}
