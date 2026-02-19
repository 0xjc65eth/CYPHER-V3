import useSWR from 'swr';
import { useState, useEffect, useMemo } from 'react';

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

// Types for arbitrage data
export interface ArbitrageOpportunity {
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
  liquidity: number; // 0-100 scale
  confidence: number; // 0-100 scale
  lastUpdated: number;
  marketCap?: number;
  aiAnalysis?: string;
  // New fields for advanced features
  riskScore: 'low' | 'medium' | 'high';
  trustScore: number; // 0-100
  estimatedFees: {
    network: number;
    platform: number;
    bridge?: number;
    total: number;
  };
  executionTime: number; // seconds
  historicalSuccess?: number; // success rate percentage
  priceConsistency?: number; // 0-100
  discoveryTime?: number; // timestamp when first detected
}

export interface ArbitrageStats {
  totalOpportunities: number;
  totalSpread: number;
  avgSpread: number;
  highValueOpportunities: number;
  lastScan: number;
}

// Main hook for arbitrage detection
export function useArbitrage(minSpread: number = 5, assetType: string = 'all') {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [stats, setStats] = useState<ArbitrageStats | null>(null);

  // Fetch aggregated price data from our API
  const { data, error, mutate } = useSWR(
    `/api/arbitrage/opportunities?minSpread=${minSpread}&type=${assetType}`,
    fetcher,
    {
      refreshInterval: 3000, // Refresh every 3 seconds
      revalidateOnFocus: true,
      dedupingInterval: 1000
    }
  );

  // Process and filter opportunities
  const processedOpportunities = useMemo(() => {
    if (!data?.opportunities) return [];

    return data.opportunities
      .filter((opp: any) => opp.spread >= minSpread)
      .filter((opp: any) => assetType === 'all' || opp.type === assetType)
      .sort((a: any, b: any) => b.spread - a.spread); // Sort by highest spread first
  }, [data, minSpread, assetType]);

  // Calculate statistics
  const calculatedStats = useMemo(() => {
    if (!processedOpportunities.length) return null;

    const totalSpread = processedOpportunities.reduce((sum, opp) => sum + opp.spread, 0);
    const avgSpread = totalSpread / processedOpportunities.length;
    const highValueOpportunities = processedOpportunities.filter(opp => opp.spread >= 10).length;

    return {
      totalOpportunities: processedOpportunities.length,
      totalSpread,
      avgSpread,
      highValueOpportunities,
      lastScan: Date.now()
    };
  }, [processedOpportunities]);

  // Update state when data changes
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
    error: error?.message || (data?.error ? data.error : null),
    lastUpdate: data?.timestamp,
    totalSpread: stats?.totalSpread,
    avgSpread: stats?.avgSpread,
    refresh: mutate
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
      // Fetch real scan results from the arbitrage API
      setScanProgress(25);
      const response = await fetch('/api/arbitrage/opportunities/?type=all&minSpread=1');
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
    startScan
  };
}

// Hook for individual opportunity analysis
export function useOpportunityAnalysis(opportunity: ArbitrageOpportunity | null) {
  const { data, error } = useSWR(
    opportunity ? `/api/arbitrage/analyze?symbol=${opportunity.symbol}&buySource=${opportunity.buySource}&sellSource=${opportunity.sellSource}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000 // Cache for 1 minute
    }
  );

  return {
    analysis: data?.analysis,
    risks: data?.risks,
    recommendations: data?.recommendations,
    aiExplanation: data?.aiExplanation,
    loading: !data && !error && opportunity !== null,
    error: error?.message
  };
}

// Hook for market depth and liquidity analysis
export function useMarketDepthAnalysis(symbol: string, sources: string[]) {
  const { data, error } = useSWR(
    symbol && sources.length > 0 ? `/api/arbitrage/depth?symbol=${symbol}&sources=${sources.join(',')}` : null,
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true
    }
  );

  const depthAnalysis = useMemo(() => {
    if (!data?.depth) return null;

    const totalBuyVolume = data.depth.reduce((sum: number, source: any) => 
      sum + (source.bids?.reduce((bidSum: number, bid: any) => bidSum + bid.amount, 0) || 0), 0
    );

    const totalSellVolume = data.depth.reduce((sum: number, source: any) => 
      sum + (source.asks?.reduce((askSum: number, ask: any) => askSum + ask.amount, 0) || 0), 0
    );

    const imbalance = totalBuyVolume > 0 && totalSellVolume > 0 
      ? (totalBuyVolume - totalSellVolume) / (totalBuyVolume + totalSellVolume) 
      : 0;

    return {
      totalBuyVolume,
      totalSellVolume,
      imbalance,
      liquidityScore: Math.min(100, (totalBuyVolume + totalSellVolume) / 1000 * 100),
      sources: data.depth
    };
  }, [data]);

  return {
    depthAnalysis,
    loading: !data && !error,
    error: error?.message
  };
}

// Hook for historical arbitrage performance
export function useArbitrageHistory(timeframe: string = '24h') {
  const { data, error } = useSWR(
    `/api/arbitrage/history?timeframe=${timeframe}`,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: false
    }
  );

  const historyAnalysis = useMemo(() => {
    if (!data?.history) return null;

    const opportunities = data.history;
    const successfulArbs = opportunities.filter((opp: any) => opp.executed && opp.profit > 0);
    const totalProfit = successfulArbs.reduce((sum: number, arb: any) => sum + arb.profit, 0);
    const successRate = opportunities.length > 0 ? successfulArbs.length / opportunities.length * 100 : 0;

    return {
      totalOpportunities: opportunities.length,
      successfulArbitrages: successfulArbs.length,
      totalProfit,
      successRate,
      avgProfit: successfulArbs.length > 0 ? totalProfit / successfulArbs.length : 0,
      bestOpportunity: opportunities.reduce((best: any, current: any) => 
        current.spread > (best?.spread || 0) ? current : best, null
      )
    };
  }, [data]);

  return {
    history: data?.history || [],
    analysis: historyAnalysis,
    loading: !data && !error,
    error: error?.message
  };
}