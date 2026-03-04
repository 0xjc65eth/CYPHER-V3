'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  Users,
  Zap,
  Activity,
  Crown,
  Flame,
  BarChart3,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ProfessionalTable,
  TableColumn,
  formatters,
  MetricsCard,
  MetricsGrid,
  VolumeChart,
  VolumeDataPoint,
  TechnicalAnalysisPanel,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands
} from '@/components/ui/professional';
import { ExportButton } from '@/components/common/ExportButton';
import { magicEdenRunesService } from '@/services/magicEdenRunesService';

interface RuneAnalytics {
  id: string;
  name: string;
  spaced_name: string;
  symbol: string;
  holders: number | null;
  supply: string;
  turbo: boolean;
  timestamp: string | null;
  // Calculated fields
  holderRank?: number;
  supplyRank?: number;
  ageInDays?: number;
}

export default function AnalyticsPro() {
  const [runes, setRunes] = useState<RuneAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'holders' | 'supply' | 'turbo'>('holders');
  const [volumeData, setVolumeData] = useState<VolumeDataPoint[]>([]);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);

  // Fetch runes data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/runes/popular/?limit=100&offset=0');
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();

      const dataItems = Array.isArray(data?.data) ? data.data : [];
      if (data.success && dataItems.length > 0) {
        const enriched = dataItems.map((r: any, index: number) => {
          const ageInDays = r.timestamp
            ? Math.floor((Date.now() - new Date(r.timestamp).getTime()) / (1000 * 60 * 60 * 24))
            : null;

          return {
            ...r,
            holderRank: index + 1,
            ageInDays
          };
        });

        setRunes(enriched);
      } else {
        throw new Error('Invalid API response');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch analytics data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fetch volume and price data for top runes
  useEffect(() => {
    const fetchVolumeAndPriceData = async () => {
      if (runes.length === 0) return;

      try {
        // Get top 5 runes by holders for volume analysis
        const topRunes = runes.slice(0, 5);

        // Fetch activities for the top runes to calculate volume
        const activitiesPromises = topRunes.map(async (rune) => {
          try {
            const activities = await magicEdenRunesService.getRuneActivities({
              rune: rune.spaced_name || rune.name,
              limit: 100
            });
            return { rune: rune.spaced_name || rune.name, activities: activities.activities || [] };
          } catch (err) {
            return { rune: rune.spaced_name || rune.name, activities: [] };
          }
        });

        const results = await Promise.all(activitiesPromises);

        // Calculate 24h volume per hour for chart
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        const hourlyVolumes: Record<string, { buy: number; sell: number; total: number }> = {};

        // Initialize 24 hours
        for (let i = 0; i < 24; i++) {
          const hourTimestamp = oneDayAgo + i * 60 * 60 * 1000;
          const hourKey = new Date(hourTimestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
          hourlyVolumes[hourKey] = { buy: 0, sell: 0, total: 0 };
        }

        // Aggregate activities into hourly buckets
        const allPrices: number[] = [];

        results.forEach(({ activities }) => {
          activities.forEach((activity: any) => {
            const timestamp = new Date(activity.createdAt).getTime();
            if (timestamp < oneDayAgo) return;

            const hourKey = new Date(timestamp).toISOString().slice(0, 13);
            const price = parseFloat(activity.listedPrice || activity.totalPrice || '0');
            const isBuy = activity.type?.toLowerCase().includes('buy');
            const isSell = activity.type?.toLowerCase().includes('sell') || activity.type?.toLowerCase().includes('list');

            if (price > 0) {
              allPrices.push(price);

              if (hourlyVolumes[hourKey]) {
                if (isBuy) {
                  hourlyVolumes[hourKey].buy += price;
                } else if (isSell) {
                  hourlyVolumes[hourKey].sell += price;
                }
                hourlyVolumes[hourKey].total += price;
              }
            }
          });
        });

        // Convert to VolumeDataPoint array
        const volumeChartData = Object.entries(hourlyVolumes)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([timestamp, volumes]) => ({
            time: new Date(timestamp).getTime(),
            volume: volumes.total / 100_000_000,
            isPositive: volumes.buy >= volumes.sell,
            buyVolume: volumes.buy / 100_000_000,
            sellVolume: volumes.sell / 100_000_000,
            totalVolume: volumes.total / 100_000_000
          })) as VolumeDataPoint[];

        setVolumeData(volumeChartData);

        // Use last 30 prices for technical analysis
        if (allPrices.length > 0) {
          setPriceHistory(allPrices.slice(-30));
        }

      } catch {
        // Volume/price data fetch failed - charts will show empty state
      }
    };

    fetchVolumeAndPriceData();
  }, [runes]);

  // Calculate stats
  const stats = useMemo(() => {
    if (runes.length === 0) return null;

    const totalHolders = runes.reduce((sum, r) => sum + (r.holders || 0), 0);
    const turboCount = runes.filter(r => r.turbo).length;
    const avgHolders = Math.round(totalHolders / runes.length);
    const top10Holders = runes.slice(0, 10).reduce((sum, r) => sum + (r.holders || 0), 0);
    const concVal = totalHolders > 0 ? (top10Holders / totalHolders) * 100 : 0;
    const holderConcentration = (typeof concVal === 'number' && !isNaN(concVal)) ? concVal.toFixed(1) : '0.0';

    const turboPctVal = runes.length > 0 ? (turboCount / runes.length) * 100 : 0;

    return {
      totalHolders,
      avgHolders,
      turboCount,
      turboPercent: (typeof turboPctVal === 'number' && !isNaN(turboPctVal)) ? turboPctVal.toFixed(1) : '0.0',
      holderConcentration
    };
  }, [runes]);

  // Top by holders
  const topByHolders: TableColumn<RuneAnalytics>[] = [
    {
      key: 'holderRank',
      label: 'RANK',
      sortable: true,
      width: '60px',
      align: 'center',
      format: (value) => (
        <span className="font-mono font-bold text-orange-400">#{value}</span>
      )
    },
    {
      key: 'spaced_name',
      label: 'NAME',
      sortable: true,
      filterable: true,
      width: '200px',
      format: (value, row) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{value}</span>
          {row.turbo && <Zap className="h-3 w-3 text-yellow-400" />}
        </div>
      )
    },
    {
      key: 'holders',
      label: 'HOLDERS',
      sortable: true,
      width: '120px',
      align: 'right',
      format: (value) => (
        <div className="flex items-center justify-end gap-1.5">
          <Users className="h-3 w-3 text-blue-400" />
          <span className="font-mono font-semibold text-blue-400">
            {value != null ? formatters.number(value) : '—'}
          </span>
        </div>
      )
    },
    {
      key: 'supply',
      label: 'SUPPLY',
      sortable: true,
      width: '140px',
      align: 'right',
      format: (value) => (
        <span className="font-mono text-gray-300">
          {formatters.compact(parseFloat(value) || 0)}
        </span>
      )
    },
    {
      key: 'ageInDays',
      label: 'AGE',
      sortable: true,
      width: '100px',
      align: 'right',
      format: (value) => {
        if (!value) return <span className="text-gray-600">—</span>;
        return (
          <span className="font-mono text-gray-400">
            {value === 0 ? 'Today' : `${value}d`}
          </span>
        );
      }
    }
  ];

  // Calculate technical analysis from real price history
  const technicalData = useMemo(() => {
    if (priceHistory.length === 0) {
      return {
        rsi: 50,
        macd: { macd: 0, signal: 0, histogram: 0 },
        bollingerBands: { upper: 0, middle: 0, lower: 0 },
        currentPrice: 0
      };
    }

    const rsi = calculateRSI(priceHistory);
    const macd = calculateMACD(priceHistory);
    const bollingerBands = calculateBollingerBands(priceHistory);

    return {
      rsi,
      macd,
      bollingerBands,
      currentPrice: priceHistory[priceHistory.length - 1]
    };
  }, [priceHistory]);

  if (error && runes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-black p-4">
        <div className="flex flex-col items-center gap-3 p-6 bg-gray-900 border border-red-500/50 rounded-lg">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <span className="text-red-400 text-sm">{error}</span>
          <Button variant="outline" size="sm" onClick={fetchData} className="border-gray-700 text-gray-300 hover:bg-gray-800">
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top Metrics */}
      <MetricsGrid columns={6}>
        <MetricsCard
          title="Total Holders"
          value={stats ? formatters.compact(stats.totalHolders) : '—'}
          icon={Users}
          iconColor="text-blue-400"
          subtitle="Across all runes"
          loading={loading}
        />
        <MetricsCard
          title="Avg Holders"
          value={stats ? formatters.number(stats.avgHolders) : '—'}
          icon={BarChart3}
          iconColor="text-purple-400"
          subtitle="Per rune"
          loading={loading}
        />
        <MetricsCard
          title="Turbo Runes"
          value={stats ? stats.turboCount : '—'}
          icon={Zap}
          iconColor="text-yellow-400"
          subtitle={stats ? `${stats.turboPercent}% of total` : '—'}
          loading={loading}
        />
        <MetricsCard
          title="Top 10 Concentration"
          value={stats ? `${stats.holderConcentration}%` : '—'}
          icon={Crown}
          iconColor="text-orange-400"
          subtitle="Of total holders"
          loading={loading}
        />
        <MetricsCard
          title="Active Runes"
          value={runes.length}
          icon={Activity}
          iconColor="text-green-400"
          subtitle="With holder data"
          loading={loading}
        />
        <MetricsCard
          title="Market Depth"
          value="DEEP"
          icon={Flame}
          iconColor="text-red-400"
          subtitle="High liquidity"
          loading={loading}
        />
      </MetricsGrid>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Runes Table - 2/3 width */}
        <div className="lg:col-span-2">
          <div className="bg-gray-900/40 border border-gray-800 rounded-terminal p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider">
                  Top Runes by Holders
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Most widely distributed runes in the ecosystem
                </p>
              </div>
              <ExportButton
                type="custom"
                data={runes.slice(0, 50)}
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'symbol', label: 'Symbol' },
                  { key: 'holders', label: 'Holders' },
                  { key: 'supply', label: 'Supply' },
                  { key: 'turbo', label: 'Turbo' },
                  { key: 'ageInDays', label: 'Age (days)' },
                ]}
                title="Top Runes by Holders"
                filename="top-runes-by-holders"
                size="sm"
                variant="outline"
              />
            </div>

            <ProfessionalTable
              columns={topByHolders}
              data={runes.slice(0, 50)}
              keyField="id"
              loading={loading}
              dense
              striped
              hoverEffect
              pagination={{
                enabled: true,
                pageSize: 25
              }}
            />
          </div>
        </div>

        {/* Right Sidebar - 1/3 width */}
        <div className="space-y-6">
          {/* Volume Chart */}
          <VolumeChart
            data={volumeData}
            height={200}
            showLegend={true}
          />

          {/* Technical Analysis */}
          <TechnicalAnalysisPanel data={technicalData as any} />
        </div>
      </div>

      {/* Turbo Runes Section */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-terminal p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">
              Turbo Runes
            </h3>
            <span className="text-xs text-gray-500">
              ({stats?.turboCount || 0} runes)
            </span>
          </div>
          <ExportButton
            type="custom"
            data={runes.filter(r => r.turbo)}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'symbol', label: 'Symbol' },
              { key: 'holders', label: 'Holders' },
              { key: 'supply', label: 'Supply' },
              { key: 'ageInDays', label: 'Age (days)' },
            ]}
            title="Turbo Runes"
            filename="turbo-runes"
            size="sm"
            variant="outline"
          />
        </div>

        <ProfessionalTable
          columns={topByHolders}
          data={runes.filter(r => r.turbo)}
          keyField="id"
          loading={loading}
          dense
          striped
          hoverEffect
          searchable
          emptyMessage="No turbo runes found"
        />
      </div>
    </div>
  );
}
