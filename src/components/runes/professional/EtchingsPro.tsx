'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ProfessionalTable,
  MetricsCard,
  MetricsGrid,
  TableSkeleton,
  type TableColumn,
} from '@/components/ui/professional';
import { ExportButton } from '@/components/common/ExportButton';
import {
  RefreshCw,
  AlertTriangle,
  Hash,
  Zap,
  TrendingUp,
  BarChart3,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface MintTerms {
  amount: string | null;
  cap: string | null;
  height_start: number | null;
  height_end: number | null;
  offset_start: number | null;
  offset_end: number | null;
}

interface RuneEntry {
  id: string;
  name: string;
  spaced_name: string;
  number: number;
  symbol: string;
  supply: string;
  burned: string;
  premine: string;
  mint_terms: MintTerms;
  turbo: boolean;
  timestamp: string | null;
  etching_tx_id: string | null;
  etching_block_height: number | null;
  holders: number | null;
  decimals?: number;
}

import { formatSupply, timeAgoFromString as timeAgo, truncateTxId } from '@/lib/utils/runes-formatters';

const safeFixed = (value: any, decimals = 2): string =>
  (typeof value === 'number' && !isNaN(value)) ? value.toFixed(decimals) : '0';

function isOpenMint(rune: RuneEntry): boolean {
  return !!(
    rune.mint_terms &&
    rune.mint_terms.cap !== null &&
    rune.mint_terms.amount !== null
  );
}

function getMintProgress(rune: RuneEntry): number {
  if (!isOpenMint(rune)) return 0;
  const supply = parseFloat(rune.supply);
  const premine = parseFloat(rune.premine);
  const minted = supply - premine;
  const cap = parseFloat(rune.mint_terms.cap || '0');
  const amountPerMint = parseFloat(rune.mint_terms.amount || '0');
  if (cap <= 0 || amountPerMint <= 0) return 0;
  const totalMintable = cap * amountPerMint;
  if (totalMintable <= 0) return 0;
  return Math.min(100, (minted / totalMintable) * 100);
}

function getPreminePercent(rune: RuneEntry): number {
  const supply = parseFloat(rune.supply);
  const premine = parseFloat(rune.premine);
  if (supply <= 0) return 0;
  return (premine / supply) * 100;
}

export default function EtchingsPro() {
  const [runes, setRunes] = useState<RuneEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRunes = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/runes/list/?limit=60&offset=0');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const results: RuneEntry[] = data.results || data.data || data || [];
      setRunes(Array.isArray(results) ? results : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch runes';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRunes();
    const interval = setInterval(fetchRunes, 45000);
    return () => clearInterval(interval);
  }, [fetchRunes]);

  // Stats
  const stats = useMemo(() => {
    const total = runes.length;
    const openMints = runes.filter(isOpenMint).length;
    const avgPremine =
      total > 0
        ? runes.reduce((sum, r) => sum + getPreminePercent(r), 0) / total
        : 0;
    const turboCount = runes.filter((r) => r.turbo).length;
    return { total, openMints, avgPremine, turboCount };
  }, [runes]);

  // Table columns configuration
  // FIX: format signature is (cellValue, row, index) not (row)!
  const columns: TableColumn<RuneEntry>[] = [
    {
      key: 'number',
      label: '#',
      sortable: true,
      format: (_value, rune) => (
        <span className="text-gray-500 text-xs font-mono">{rune.number}</span>
      ),
    },
    {
      key: 'spaced_name',
      label: 'Rune',
      sortable: true,
      filterable: true,
      format: (_value, rune) => (
        <div className="flex items-center gap-2">
          <span className="text-lg" title={rune.symbol}>
            {rune.symbol}
          </span>
          <div className="flex flex-col">
            <span className="text-white text-sm font-semibold">
              {rune.spaced_name}
            </span>
            <div className="flex items-center gap-1">
              {rune.turbo && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] px-1.5 py-0">
                  <Zap className="h-2.5 w-2.5 mr-0.5" />
                  TURBO
                </Badge>
              )}
              {rune.decimals != null && !isNaN(rune.decimals) && (
                <span className="text-[10px] text-gray-500">
                  {rune.decimals} dec
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'supply',
      label: 'Supply',
      sortable: true,
      format: (_value, rune) => (
        <span className="text-gray-300 text-xs font-mono">
          {formatSupply(rune.supply)}
        </span>
      ),
    },
    {
      key: 'premine',
      label: 'Premine',
      sortable: true,
      format: (_value, rune) => {
        const premineP = getPreminePercent(rune);
        return (
          <span
            className={`text-xs font-mono ${
              premineP >= 100
                ? 'text-red-400'
                : premineP >= 50
                ? 'text-orange-400'
                : 'text-gray-300'
            }`}
          >
            {safeFixed(premineP, 1)}%
          </span>
        );
      },
    },
    {
      key: 'mint_status',
      label: 'Mint Status',
      format: (_value, rune) => {
        const open = isOpenMint(rune);
        const progress = getMintProgress(rune);
        return open ? (
          <div className="flex flex-col gap-1 min-w-[100px]">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0 w-fit">
              OPEN
            </Badge>
            <div className="flex items-center gap-1.5">
              <Progress value={progress} className="h-1.5 w-16 bg-gray-700" />
              <span className="text-[10px] text-gray-500">
                {safeFixed(progress, 0)}%
              </span>
            </div>
          </div>
        ) : (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0">
            CLOSED
          </Badge>
        );
      },
    },
    {
      key: 'etching_block_height',
      label: 'Block',
      sortable: true,
      format: (_value, rune) => (
        <span className="text-gray-400 text-xs font-mono">
          {rune.etching_block_height?.toLocaleString() || '---'}
        </span>
      ),
    },
    {
      key: 'etching_tx_id',
      label: 'Tx ID',
      format: (_value, rune) =>
        rune.etching_tx_id ? (
          <a
            href={`https://mempool.space/tx/${rune.etching_tx_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-300 text-xs font-mono flex items-center gap-1"
          >
            {truncateTxId(rune.etching_tx_id)}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-gray-600 text-xs">---</span>
        ),
    },
    {
      key: 'timestamp',
      label: 'Age',
      sortable: true,
      format: (_value, rune) => (
        <span className="text-gray-400 text-xs">{timeAgo(rune.timestamp)}</span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4 bg-black p-4">
        <MetricsGrid columns={4}>
          <MetricsCard title="Total Etchings" value="..." icon={Hash} loading />
          <MetricsCard title="Open Mints" value="..." icon={TrendingUp} loading />
          <MetricsCard title="Avg Premine" value="..." icon={BarChart3} loading />
          <MetricsCard title="Turbo" value="..." icon={Zap} loading />
        </MetricsGrid>
        <TableSkeleton rows={10} columns={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-black">
        <div className="flex flex-col items-center gap-3 p-6 bg-gray-900 border border-red-500/50 rounded-lg">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <span className="text-red-400 text-sm">{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              fetchRunes();
            }}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-black p-4">
      {/* Professional Stats - MetricsGrid */}
      <MetricsGrid columns={4}>
        <MetricsCard
          title="Total Etchings"
          value={stats.total.toString()}
          icon={Hash}
          iconColor="text-orange-500"
        />
        <MetricsCard
          title="Open Mints"
          value={stats.openMints.toString()}
          icon={TrendingUp}
          iconColor="text-green-500"
        />
        <MetricsCard
          title="Avg Premine"
          value={`${safeFixed(stats.avgPremine, 1)}%`}
          icon={BarChart3}
          iconColor="text-orange-400"
        />
        <MetricsCard
          title="Turbo"
          value={stats.turboCount.toString()}
          icon={Zap}
          iconColor="text-yellow-500"
        />
      </MetricsGrid>

      {/* Professional Table */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-terminal overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider">
              Recent Etchings
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Latest Runes created on the Bitcoin network
            </p>
          </div>
          <div className="flex gap-2">
            <ExportButton
              type="custom"
              data={runes}
              columns={[
                { key: 'number', label: 'Rune #' },
                { key: 'spaced_name', label: 'Name' },
                { key: 'symbol', label: 'Symbol' },
                { key: 'supply', label: 'Supply' },
                { key: 'holders', label: 'Holders' },
                { key: 'turbo', label: 'Turbo' },
                { key: 'timestamp', label: 'Etched' },
              ]}
              title="Runes Etchings Pro"
              filename="runes-etchings-pro"
              size="sm"
              variant="outline"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                fetchRunes();
              }}
              className="border-gray-700 text-gray-400 hover:bg-gray-800 h-8 gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
          </div>
        </div>
        <ProfessionalTable
          data={runes}
          columns={columns}
          keyField="id"
          searchable
          exportable
          pagination={{
            enabled: true,
            pageSize: 20,
            showPageSizeSelector: true
          }}
          dense
          emptyMessage="No runes found"
        />
      </div>
    </div>
  );
}
