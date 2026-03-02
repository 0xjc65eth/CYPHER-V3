'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  ExternalLink,
  Copy,
  Filter,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { Transaction } from '@/types/portfolio';
import { safe } from '@/lib/utils/SafeDataAccess';

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetType: string;
  assetId?: string;
  assetName: string;
  transactions: Transaction[];
}

export function TransactionHistoryModal({
  isOpen,
  onClose,
  assetType,
  assetId,
  assetName,
  transactions
}: TransactionHistoryModalProps) {
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'value'>('date');

  const filteredTransactions = transactions
    .filter(tx => {
      if (filter === 'all') return true;
      return tx.type === filter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return safe.date(b.date).getTime() - safe.date(a.date).getTime();
        case 'amount':
          return b.amount - a.amount;
        case 'value':
          return b.totalValue - a.totalValue;
        default:
          return 0;
      }
    });

  const copyTxHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
  };

  const openTxInExplorer = (hash: string) => {
    window.open(`https://mempool.space/tx/${hash}`, '_blank');
  };

  const exportTransactions = () => {
    const csv = [
      ['Date', 'Type', 'Amount', 'Price', 'Total Value', 'Fee', 'TX Hash'].join(','),
      ...filteredTransactions.map(tx => [
        safe.formatDate(tx.date, 'en-US', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }),
        tx.type,
        tx.amount,
        tx.price,
        tx.totalValue,
        tx.feeUSD,
        tx.txHash
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assetName}-transactions-${format(safe.date(new Date()), 'yyyyMMdd')}.csv`;
    a.click();
  };

  const calculateStats = () => {
    const buys = transactions.filter(tx => tx.type === 'buy');
    const sells = transactions.filter(tx => tx.type === 'sell');
    
    const totalBought = buys.reduce((sum, tx) => sum + tx.amount, 0);
    const totalSold = sells.reduce((sum, tx) => sum + tx.amount, 0);
    const totalBoughtValue = buys.reduce((sum, tx) => sum + tx.totalValue, 0);
    const totalSoldValue = sells.reduce((sum, tx) => sum + tx.totalValue, 0);
    
    const avgBuyPrice = totalBought > 0 ? totalBoughtValue / totalBought : 0;
    const avgSellPrice = totalSold > 0 ? totalSoldValue / totalSold : 0;
    
    return {
      totalBought,
      totalSold,
      avgBuyPrice,
      avgSellPrice,
      totalFees: transactions.reduce((sum, tx) => sum + tx.feeUSD, 0)
    };
  };

  const stats = calculateStats();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <span>{assetName} Transaction History</span>
            <Button
              variant="outline"
              size="sm"
              onClick={exportTransactions}
              className="text-gray-400 border-gray-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-800 rounded-lg">
          <div>
            <p className="text-xs text-gray-500">Total Bought</p>
            <p className="font-medium text-white">{stats.totalBought.toFixed(8)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Sold</p>
            <p className="font-medium text-white">{stats.totalSold.toFixed(8)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Avg Buy Price</p>
            <p className="font-medium text-white">${stats.avgBuyPrice.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Avg Sell Price</p>
            <p className="font-medium text-white">${stats.avgSellPrice.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Fees</p>
            <p className="font-medium text-white">${stats.totalFees.toFixed(2)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="border-gray-600"
            >
              All ({transactions.length})
            </Button>
            <Button
              variant={filter === 'buy' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('buy')}
              className="border-gray-600"
            >
              Buys ({transactions.filter(tx => tx.type === 'buy').length})
            </Button>
            <Button
              variant={filter === 'sell' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('sell')}
              className="border-gray-600"
            >
              Sells ({transactions.filter(tx => tx.type === 'sell').length})
            </Button>
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 text-sm"
          >
            <option value="date">Sort by Date</option>
            <option value="amount">Sort by Amount</option>
            <option value="value">Sort by Value</option>
          </select>
        </div>

        {/* Transactions List */}
        <div className="overflow-y-auto max-h-[400px] space-y-3">
          {filteredTransactions.map((tx) => (
            <Card key={tx.id} className="bg-gray-800 border-gray-700 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    tx.type === 'buy' ? 'bg-green-900/50' : 'bg-red-900/50'
                  }`}>
                    {tx.type === 'buy' ? 
                      <ArrowDownLeft className="w-4 h-4 text-green-500" /> : 
                      <ArrowUpRight className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={tx.type === 'buy' ? 'default' : 'destructive'}>
                        {tx.type.toUpperCase()}
                      </Badge>
                      <span className="font-medium text-white">
                        {tx.amount.toFixed(assetType === 'bitcoin' ? 8 : 0)} {assetType === 'bitcoin' ? 'BTC' : 'units'}
                      </span>
                      <span className="text-gray-400">@</span>
                      <span className="text-gray-300">${tx.price.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {(() => {
                          try {
                            const safeDate = safe.date(tx.date);
                            return format(safeDate, 'MMM d, yyyy');
                          } catch {
                            return 'Invalid date';
                          }
                        })()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {(() => {
                          try {
                            const safeDate = safe.date(tx.date);
                            return format(safeDate, 'HH:mm:ss');
                          } catch {
                            return '--:--:--';
                          }
                        })()}
                      </span>
                      {tx.status === 'confirmed' && (
                        <Badge variant="outline" className="text-xs border-green-700 text-green-400">
                          {tx.confirmations} confirmations
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-white mb-1">
                    ${tx.totalValue.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Fee: ${tx.feeUSD.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between">
                <code className="text-xs text-gray-400">
                  {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-8)}
                </code>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyTxHash(tx.txHash)}
                    className="h-7 w-7 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openTxInExplorer(tx.txHash)}
                    className="h-7 w-7 p-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}