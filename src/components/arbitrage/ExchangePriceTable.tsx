'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, RefreshCw } from 'lucide-react';

interface ExchangeData {
  name: string;
  bid: number;
  ask: number;
  last: number;
  spread: number;
  spreadPercent: number;
  volume24h: number | null;
  fee: number;
  feePercent: string;
}

interface ExchangePriceTableNewProps {
  exchanges: ExchangeData[];
  loading?: boolean;
  bestBid?: { exchange: string; price: number };
  bestAsk?: { exchange: string; price: number };
}

// Legacy props support
interface ExchangePriceTableLegacyProps {
  prices: Array<{
    exchange: string;
    pair: string;
    bid: number;
    ask: number;
    last: number;
    volume: number;
    timestamp: number;
  }>;
  loading?: boolean;
  selectedPair?: string;
}

type ExchangePriceTableProps = ExchangePriceTableNewProps | ExchangePriceTableLegacyProps;

function isNewProps(props: ExchangePriceTableProps): props is ExchangePriceTableNewProps {
  return 'exchanges' in props;
}

function formatPrice(value: number): string {
  return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatVolume(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export default function ExchangePriceTable(props: ExchangePriceTableProps) {
  if (isNewProps(props)) {
    return <NewTable {...props} />;
  }
  return <LegacyTable {...props} />;
}

function NewTable({ exchanges, loading, bestBid, bestAsk }: ExchangePriceTableNewProps) {
  const sorted = useMemo(() => {
    return [...exchanges].sort((a, b) => a.ask - b.ask);
  }, [exchanges]);

  const lowestAsk = bestAsk?.price || (sorted.length > 0 ? sorted[0].ask : 0);
  const highestBid = bestBid?.price || (sorted.length > 0 ? Math.max(...sorted.map(e => e.bid)) : 0);

  return (
    <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
      <CardHeader className="pb-3">
        <CardTitle className="text-orange-400 flex items-center gap-2 font-mono text-base">
          <Activity className="h-4 w-4" />
          Exchange Prices - BTC/USDT
          <Badge className="bg-orange-500/20 border-orange-500/30 text-orange-400 border ml-2 text-[10px]">
            {exchanges.length} Exchanges
          </Badge>
          {loading && <RefreshCw className="h-3 w-3 animate-spin text-gray-400 ml-auto" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 font-mono">
            {loading ? (
              <div className="text-center">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading exchange prices...</p>
              </div>
            ) : (
              <p className="text-sm">No price data available</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] font-mono">
              <thead>
                <tr className="border-b border-[#2a2a3e]">
                  <th className="text-left p-3 text-gray-500 text-xs uppercase tracking-wider">Exchange</th>
                  <th className="text-right p-3 text-gray-500 text-xs uppercase tracking-wider">Bid</th>
                  <th className="text-right p-3 text-gray-500 text-xs uppercase tracking-wider">Ask</th>
                  <th className="text-right p-3 text-gray-500 text-xs uppercase tracking-wider">Spread</th>
                  <th className="text-right p-3 text-gray-500 text-xs uppercase tracking-wider">Volume 24h</th>
                  <th className="text-right p-3 text-gray-500 text-xs uppercase tracking-wider">Fee %</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((ex, index) => {
                  const isBestBid = ex.bid === highestBid;
                  const isBestAsk = ex.ask === lowestAsk;

                  return (
                    <motion.tr
                      key={ex.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="border-b border-[#2a2a3e]/50 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-3">
                        <span className="text-white font-medium text-sm">{ex.name}</span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`text-sm ${isBestBid ? 'text-green-400 font-bold' : 'text-gray-300'}`}>
                          {formatPrice(ex.bid)}
                        </span>
                        {isBestBid && (
                          <span className="ml-1.5 text-[9px] text-green-500 bg-green-500/10 px-1 py-0.5 rounded">BEST</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`text-sm ${isBestAsk ? 'text-red-400 font-bold' : 'text-gray-300'}`}>
                          {formatPrice(ex.ask)}
                        </span>
                        {isBestAsk && (
                          <span className="ml-1.5 text-[9px] text-red-500 bg-red-500/10 px-1 py-0.5 rounded">BEST</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`text-sm ${
                          ex.spreadPercent > 0.1 ? 'text-yellow-400' : 'text-gray-400'
                        }`}>
                          {ex.spreadPercent.toFixed(4)}%
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-gray-400 text-sm">
                          {ex.volume24h != null ? formatVolume(ex.volume24h) : '--'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-gray-400 text-sm">
                          {ex.feePercent}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LegacyTable({ prices, loading, selectedPair }: ExchangePriceTableLegacyProps) {
  const filtered = useMemo(() => {
    const data = selectedPair ? prices.filter((p) => p.pair === selectedPair) : prices;
    return data.sort((a, b) => a.ask - b.ask);
  }, [prices, selectedPair]);

  const lowestAsk = filtered.length > 0 ? Math.min(...filtered.map((p) => p.ask)) : 0;
  const highestBid = filtered.length > 0 ? Math.max(...filtered.map((p) => p.bid)) : 0;

  const EXCHANGE_LABELS: Record<string, string> = {
    binance: 'Binance', coinbase: 'Coinbase', kraken: 'Kraken', bybit: 'Bybit',
    okx: 'OKX', bitfinex: 'Bitfinex', kucoin: 'KuCoin', gateio: 'Gate.io',
  };

  return (
    <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
      <CardHeader className="pb-3">
        <CardTitle className="text-orange-400 flex items-center gap-2 font-mono text-base">
          <Activity className="h-4 w-4" />
          Exchange Prices
          {selectedPair && <Badge className="bg-orange-500/20 border-orange-500/30 text-orange-400 border ml-2 text-[10px]">{selectedPair}</Badge>}
          {loading && <RefreshCw className="h-3 w-3 animate-spin text-gray-400 ml-auto" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 font-mono">
            {loading ? (
              <div className="text-center">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading exchange prices...</p>
              </div>
            ) : (
              <p className="text-sm">No price data available</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] font-mono">
              <thead>
                <tr className="border-b border-[#2a2a3e]">
                  <th className="text-left p-3 text-gray-500 text-xs uppercase">Exchange</th>
                  <th className="text-right p-3 text-gray-500 text-xs uppercase">Bid</th>
                  <th className="text-right p-3 text-gray-500 text-xs uppercase">Ask</th>
                  <th className="text-right p-3 text-gray-500 text-xs uppercase">Spread</th>
                  <th className="text-right p-3 text-gray-500 text-xs uppercase">Volume</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((price, index) => {
                  const spread = price.ask - price.bid;
                  const spreadPct = price.bid > 0 ? (spread / price.bid) * 100 : 0;
                  const isBestAsk = price.ask === lowestAsk;
                  const isBestBid = price.bid === highestBid;

                  return (
                    <motion.tr
                      key={`${price.exchange}-${price.pair}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-[#2a2a3e]/50 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-3">
                        <span className="text-white font-medium text-sm">
                          {EXCHANGE_LABELS[price.exchange] || price.exchange}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`text-sm ${isBestBid ? 'text-green-400 font-bold' : 'text-gray-300'}`}>
                          {formatPrice(price.bid)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`text-sm ${isBestAsk ? 'text-red-400 font-bold' : 'text-gray-300'}`}>
                          {formatPrice(price.ask)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`text-sm ${
                          spreadPct > 0.5 ? 'text-red-400' : spreadPct > 0.2 ? 'text-yellow-400' : 'text-gray-400'
                        }`}>
                          {spreadPct.toFixed(3)}%
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-gray-400 text-sm">
                          {price.volume > 0 ? formatVolume(price.volume) : '--'}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
