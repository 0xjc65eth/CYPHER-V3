'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ExternalLink,
  Eye,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface WhaleTransaction {
  id: string;
  address: string;
  type: 'buy' | 'sell' | 'transfer';
  amount: number;
  asset: string;
  valueUSD: number;
  timestamp: Date;
  exchange?: string;
  toAddress?: string;
}

export function WhaleTracker() {
  const [transactions, setTransactions] = useState<WhaleTransaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'transfer'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchWhaleData = useCallback(async () => {
    try {
      // Fetch recent large transactions from mempool.space
      const res = await fetch('/api/mempool/?endpoint=/mempool/recent');
      if (!mountedRef.current) return;

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        // Filter for large transactions (whale-sized)
        const whaleThreshold = 1_000_000; // 1M sats = 0.01 BTC

        const whaleTxs: WhaleTransaction[] = data
          .filter((tx: any) => {
            const totalOut = (tx.vout || []).reduce((sum: number, out: any) => sum + (out.value || 0), 0);
            return totalOut >= whaleThreshold;
          })
          .slice(0, 10)
          .map((tx: any, i: number) => {
            const totalOut = (tx.vout || []).reduce((sum: number, out: any) => sum + (out.value || 0), 0);
            const btcAmount = totalOut / 100_000_000;
            // Estimate USD value (approximate - would need real BTC price)
            const estimatedBtcPrice = 100000; // Will be imprecise but honest
            const valueUSD = btcAmount * estimatedBtcPrice;

            return {
              id: tx.txid || String(i),
              address: tx.vin?.[0]?.prevout?.scriptpubkey_address || 'Unknown',
              type: 'transfer' as const,
              amount: btcAmount,
              asset: 'BTC',
              valueUSD,
              timestamp: new Date(tx.firstSeen ? tx.firstSeen * 1000 : Date.now()),
              toAddress: tx.vout?.[0]?.scriptpubkey_address || undefined,
            };
          });

        setTransactions(whaleTxs);
        setError(null);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('WhaleTracker fetch error:', err);
      setError('Failed to fetch whale data');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchWhaleData();

    const interval = setInterval(fetchWhaleData, 30000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchWhaleData]);

  const getTransactionIcon = (type: WhaleTransaction['type']) => {
    switch (type) {
      case 'buy':
        return <ArrowUpRight className="w-4 h-4 text-green-400" />;
      case 'sell':
        return <ArrowDownLeft className="w-4 h-4 text-red-400" />;
      case 'transfer':
        return <TrendingUp className="w-4 h-4 text-blue-400" />;
    }
  };

  const getTransactionColor = (type: WhaleTransaction['type']): string => {
    switch (type) {
      case 'buy':
        return 'border-l-green-500 bg-green-500/5';
      case 'sell':
        return 'border-l-red-500 bg-red-500/5';
      case 'transfer':
        return 'border-l-blue-500 bg-blue-500/5';
    }
  };

  const formatAddress = (address: string): string => {
    if (address.length < 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatValue = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatTimeAgo = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const filteredTransactions = filter === 'all' ?
    transactions : transactions.filter(tx => tx.type === filter);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          <h4 className="text-sm font-medium">Whale Activity</h4>
        </div>
        <Badge className="bg-blue-500/20 text-blue-400 text-xs">
          {loading ? 'Loading' : 'Live'}
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex gap-1">
        {['all', 'transfer'].map((filterType) => (
          <Button
            key={filterType}
            variant={filter === filterType ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter(filterType as any)}
            className="h-6 px-2 text-xs capitalize"
          >
            {filterType}
          </Button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          <span className="ml-2 text-sm text-gray-400">Scanning mempool...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-300">{error}</span>
        </div>
      )}

      {/* No Data */}
      {!loading && !error && filteredTransactions.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No whale transactions detected</p>
          <p className="text-xs text-gray-500 mt-1">Monitoring mempool for large transfers</p>
        </div>
      )}

      {/* Transactions List */}
      {!loading && filteredTransactions.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredTransactions.map((tx, index) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-3 rounded-lg border-l-4 ${getTransactionColor(tx.type)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getTransactionIcon(tx.type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gray-700/50 text-gray-300 text-xs">
                        {tx.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {formatAddress(tx.address)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-medium text-sm">
                    {tx.amount.toFixed(4)} {tx.asset}
                  </p>
                  <p className="text-xs text-gray-400">
                    ~{formatValue(tx.valueUSD)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-400">
                    {formatTimeAgo(tx.timestamp)}
                  </span>
                  {tx.toAddress && (
                    <>
                      <span className="text-gray-500">-&gt;</span>
                      <span className="text-gray-400">
                        {formatAddress(tx.toAddress)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {!loading && transactions.length > 0 && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-800/30 rounded p-2">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-gray-400">Total Volume</span>
            </div>
            <p className="font-medium">
              {transactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)} BTC
            </p>
          </div>

          <div className="bg-gray-800/30 rounded p-2">
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className="w-3 h-3 text-blue-400" />
              <span className="text-gray-400">Transactions</span>
            </div>
            <p className="font-medium">{transactions.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}
