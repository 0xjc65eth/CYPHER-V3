'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingUp, Search } from 'lucide-react';
import type {
  OrdinalsArbitrageOpportunity,
  ArbitrageFilters,
  ArbitrageOpportunitiesResponse
} from '@/types/ordinals-arbitrage';
import OpportunityCard from './arbitrage/OpportunityCard';
import FilterPanel from './arbitrage/FilterPanel';
import StatsHeader from './arbitrage/StatsHeader';
import { useUniSat } from '@/hooks/ordinals/useUniSat';

/**
 * Main Ordinals Arbitrage Scanner Component
 * Orchestrates the entire arbitrage scanning feature
 */
export default function OrdinalsArbitrageScanner() {
  // Use UniSat hook for real BTC price
  const unisat = useUniSat();

  // State management
  const [opportunities, setOpportunities] = useState<OrdinalsArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  // BTC price from hook, fallback to 50000
  const btcPrice = useMemo(() => {
    if (unisat.btcPrice.data) {
      return Number(unisat.btcPrice.data) || 50000;
    }
    return 50000;
  }, [unisat.btcPrice.data]);

  // Filter state with defaults
  const [filters, setFilters] = useState<ArbitrageFilters>({
    minProfitPercentage: 5,
    maxRisk: undefined,
    collections: [],
    marketplaces: [],
    minLiquidity: 0,
    minConfidence: 50,
    maxPriceAge: 60,
    limit: 20
  });

  /**
   * Fetch arbitrage opportunities from API
   */
  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        assetClass: 'ordinals',
        minSpread: filters.minProfitPercentage?.toString() || '5',
        limit: filters.limit?.toString() || '20'
      });

      if (filters.minConfidence) {
        params.append('minConfidence', filters.minConfidence.toString());
      }

      if (filters.collections && filters.collections.length > 0) {
        params.append('collections', filters.collections.join(','));
      }

      if (filters.marketplaces && filters.marketplaces.length > 0) {
        params.append('marketplaces', filters.marketplaces.join(','));
      }

      // Fetch from API
      const response = await fetch(`/api/arbitrage/opportunities/?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data: ArbitrageOpportunitiesResponse = await response.json();

      if (data.success && data.opportunities) {
        setOpportunities(data.opportunities);
        setLastUpdated(Date.now());
      } else {
        throw new Error(data.error || 'Failed to fetch opportunities');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch arbitrage opportunities';
      setError(errorMessage);
      console.error('Error fetching opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  /**
   * Auto-refresh every 30 seconds when enabled
   */
  useEffect(() => {
    if (!autoRefresh) return;

    // BTC price now comes from useUniSat hook (auto-refreshes)
    const interval = setInterval(() => {
      fetchOpportunities();
    }, 60000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchOpportunities]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback((newFilters: ArbitrageFilters) => {
    setFilters(newFilters);
  }, []);

  /**
   * Handle auto-refresh toggle
   */
  const handleAutoRefreshToggle = useCallback(() => {
    setAutoRefresh(prev => !prev);
  }, []);

  /**
   * Filter and sort opportunities
   */
  const filteredAndSortedOpportunities = useMemo(() => {
    let filtered = [...opportunities];

    // Apply risk filter
    if (filters.maxRisk) {
      const riskLevels = { low: 1, medium: 2, high: 3 };
      const maxRiskLevel = riskLevels[filters.maxRisk];
      filtered = filtered.filter(opp => riskLevels[opp.riskScore] <= maxRiskLevel);
    }

    // Apply liquidity filter
    if (filters.minLiquidity && filters.minLiquidity > 0) {
      filtered = filtered.filter(opp => opp.liquidityScore >= filters.minLiquidity!);
    }

    // Sort by net profit percentage (highest first)
    filtered.sort((a, b) => b.netProfitPercentage - a.netProfitPercentage);

    return filtered;
  }, [opportunities, filters]);

  /**
   * Reset filters to defaults
   */
  const handleResetFilters = useCallback(() => {
    setFilters({
      minProfitPercentage: 5,
      maxRisk: undefined,
      collections: [],
      marketplaces: [],
      minLiquidity: 0,
      minConfidence: 50,
      maxPriceAge: 60,
      limit: 20
    });
  }, []);

  /**
   * Extract available collections from opportunities
   */
  const availableCollections = useMemo(() => {
    const collections = new Set<string>();
    opportunities.forEach(opp => {
      if (opp.collectionName) {
        collections.add(opp.collectionName);
      }
    });
    return Array.from(collections);
  }, [opportunities]);

  return (
    <div className="space-y-6 pb-8">
      {/* Stats Header */}
      <StatsHeader
        opportunities={filteredAndSortedOpportunities}
        lastUpdated={lastUpdated}
        autoRefresh={autoRefresh}
        onAutoRefreshToggle={handleAutoRefreshToggle}
      />

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        availableCollections={availableCollections}
      />

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-200">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && opportunities.length === 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6 bg-[#1a1a2e] border-gray-800">
              <Skeleton className="h-48 w-full bg-gray-800" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredAndSortedOpportunities.length === 0 && (
        <Card className="p-12 bg-[#1a1a2e] border-gray-800 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-gray-800 p-6">
              <Search className="h-12 w-12 text-gray-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white">No Opportunities Found</h3>
              <p className="text-gray-400 max-w-md">
                {error
                  ? 'Unable to fetch arbitrage opportunities. Please try again later.'
                  : opportunities.length === 0
                  ? 'No arbitrage opportunities found. This is normal - Ordinals markets are efficient. Opportunities appear briefly and are captured quickly by traders.'
                  : 'No arbitrage opportunities match your current filters. Try adjusting your criteria or check back later.'}
              </p>
            </div>
            {filters.minProfitPercentage && filters.minProfitPercentage > 5 && (
              <p className="text-sm text-gray-500">
                Try lowering the minimum profit percentage filter
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Opportunities Grid */}
      {!loading && filteredAndSortedOpportunities.length > 0 && (
        <div className="space-y-4">
          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {filteredAndSortedOpportunities.length} opportunit{filteredAndSortedOpportunities.length === 1 ? 'y' : 'ies'}
            </p>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent" />
                Refreshing...
              </div>
            )}
          </div>

          {/* Opportunities grid */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredAndSortedOpportunities.map((opportunity) => (
              <OpportunityCard
                key={`${opportunity.collectionId}-${opportunity.buyMarketplace}-${opportunity.sellMarketplace}`}
                opportunity={opportunity}
              />
            ))}
          </div>
        </div>
      )}

      {/* High-value opportunities callout */}
      {!loading && filteredAndSortedOpportunities.filter(o => o.netProfitPercentage > 15).length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-orange-900/20 to-red-900/20 border-orange-800/50">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-orange-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-orange-400">
                High-Value Opportunities Detected
              </h4>
              <p className="text-sm text-gray-300 mt-1">
                {filteredAndSortedOpportunities.filter(o => o.netProfitPercentage > 15).length} opportunit
                {filteredAndSortedOpportunities.filter(o => o.netProfitPercentage > 15).length === 1 ? 'y' : 'ies'} with
                over 15% net profit available. Act quickly as these may be claimed fast.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
