import { useState, useEffect, useCallback, useRef } from 'react';

interface Asset {
  symbol: string;
  name: string;
  amount: number;
  value: number;
  cost: number;
  pnl: number;
  pnlPercent: number;
  allocation: number;
}

interface RiskMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  beta: number;
  var95: number;
  expectedReturn: number;
}

interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  assets: Asset[];
  riskMetrics: RiskMetrics;
  performance: {
    day: number;
    week: number;
    month: number;
    year: number;
  };
}

function getWalletAddress(): string | null {
  // Try to read from zustand store or localStorage
  if (typeof window === 'undefined') return null;
  try {
    const store = localStorage.getItem('cypher-store');
    if (store) {
      const parsed = JSON.parse(store);
      const address = parsed?.state?.wallet?.address;
      if (address) return address;
    }
  } catch { /* ignore */ }
  return null;
}

const emptyMetrics: PortfolioMetrics = {
  totalValue: 0,
  totalCost: 0,
  totalPnL: 0,
  totalPnLPercent: 0,
  assets: [],
  riskMetrics: {
    sharpeRatio: 0,
    maxDrawdown: 0,
    volatility: 0,
    beta: 0,
    var95: 0,
    expectedReturn: 0,
  },
  performance: { day: 0, week: 0, month: 0, year: 0 },
};

export function usePortfolioMetrics() {
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchPortfolioData = useCallback(async () => {
    try {
      const address = getWalletAddress();

      if (!address) {
        // No wallet connected - show empty state
        if (!mountedRef.current) return;
        setMetrics(emptyMetrics);
        setLoading(false);
        setError(null);
        return;
      }

      const res = await fetch(`/api/portfolio/?address=${encodeURIComponent(address)}`);
      if (!mountedRef.current) return;

      if (!res.ok) {
        throw new Error(`Portfolio API returned ${res.status}`);
      }

      const json = await res.json();

      if (!json.success || !json.data) {
        // API returned error, show empty state
        setMetrics(emptyMetrics);
        setLoading(false);
        return;
      }

      const data = json.data;

      // Map API assets to the Asset interface
      // Cost basis not available from on-chain data alone — show 0 instead of fake multiplier
      const assets: Asset[] = (data.assets || []).map((a: any) => ({
        symbol: a.symbol || '',
        name: a.name || a.symbol || '',
        amount: a.balance || 0,
        value: a.value || 0,
        cost: a.costBasis || 0,
        pnl: a.costBasis ? (a.value || 0) - a.costBasis : 0,
        pnlPercent: a.change24h || 0,
        allocation: a.allocation || 0,
      }));

      const totalValue = data.totalValue || 0;
      const totalCost = data.totalCost || 0;
      const totalPnL = data.totalPnL || (totalCost > 0 ? totalValue - totalCost : 0);
      const totalPnLPercent = data.totalPnLPercent || (totalCost > 0 ? (totalPnL / totalCost) * 100 : 0);

      // Map performance from API format
      const perf = data.performance || {};
      const performance = {
        day: perf['24h'] || 0,
        week: perf['7d'] || 0,
        month: perf['30d'] || 0,
        year: perf['1y'] || 0,
      };

      // Risk metrics are not provided by the API yet, compute basic ones
      const riskMetrics: RiskMetrics = {
        sharpeRatio: 0,
        maxDrawdown: 0,
        volatility: 0,
        beta: 0,
        var95: 0,
        expectedReturn: totalPnLPercent,
      };

      setMetrics({
        totalValue,
        totalCost,
        totalPnL,
        totalPnLPercent,
        assets,
        riskMetrics,
        performance,
      });
      setLoading(false);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('usePortfolioMetrics error:', err);
      setError('Failed to fetch portfolio data');
      setMetrics(emptyMetrics);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchPortfolioData();

    // Refresh every 60 seconds
    const interval = setInterval(fetchPortfolioData, 60000);

    // Also listen for wallet changes via storage events
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'cypher-store') {
        fetchPortfolioData();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchPortfolioData]);

  return { metrics, loading, error };
}
