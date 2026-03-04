/**
 * Transaction List Component
 * 
 * This component displays a list of transactions in the user's portfolio
 * with details like type, amount, date, and status.
 */

import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  Badge
} from '@/components/ui';
import { Transaction } from '@/services/wallet-connector';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  XCircle,
  FileText,
  Send
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    const timeA = (a as any).timestamp || 0;
    const timeB = (b as any).timestamp || 0;
    return (typeof timeB === 'number' ? timeB : new Date(timeB).getTime()) -
           (typeof timeA === 'number' ? timeA : new Date(timeA).getTime());
  });

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'failed') {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    
    switch (type) {
      case 'send':
        return <ArrowUpRight className="h-5 w-5 text-orange-500" />;
      case 'receive':
        return <ArrowDownLeft className="h-5 w-5 text-green-500" />;
      case 'inscribe':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'transfer_ordinal':
      case 'transfer_rune':
        return <Send className="h-5 w-5 text-purple-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'confirmed':
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getTransactionLabel = (tx: Transaction) => {
    const txData = tx as any; // Type assertion for wallet-connector Transaction
    switch (txData.type) {
      case 'send':
        return `Sent Bitcoin${txData.to?.[0] ? ` to ${txData.to[0].substring(0, 8)}...` : ''}`;
      case 'receive':
        return `Received Bitcoin${txData.from?.[0] ? ` from ${txData.from[0].substring(0, 8)}...` : ''}`;
      case 'inscribe':
      case 'inscription':
        return 'Inscribed Ordinal';
      case 'transfer_ordinal':
        return `Sent Ordinal${txData.to?.[0] ? ` to ${txData.to[0].substring(0, 8)}...` : ''}`;
      case 'transfer_rune':
      case 'rune-mint':
      case 'brc20-transfer':
        return `Sent Rune${txData.to?.[0] ? ` to ${txData.to[0].substring(0, 8)}...` : ''}`;
      default:
        return 'Transaction';
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Transactions</h2>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Transaction</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTransactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-12">
                <div className="flex flex-col items-center gap-3">
                  <FileText className="h-10 w-10 text-[#666] opacity-50" />
                  <p className="text-sm font-medium text-[#888]">No transactions yet</p>
                  <p className="text-xs text-[#555]">Connect your wallet and make a trade to see your history</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            sortedTransactions.map((tx) => {
              const txData = tx as any;
              const txId = txData.id || txData.txid || 'unknown';
              const txTimestamp = typeof txData.timestamp === 'number'
                ? txData.timestamp
                : new Date(txData.timestamp).getTime();
              const txStatus = txData.status || 'confirmed';

              return (
              <TableRow key={txId}>
                <TableCell>
                  {getTransactionIcon(txData.type, txStatus)}
                </TableCell>
                <TableCell className="font-medium">
                  <div>{getTransactionLabel(tx)}</div>
                  <div className="text-xs text-muted-foreground">
                    {txId.substring(0, 10)}...
                  </div>
                </TableCell>
                <TableCell>
                  {formatDate(txTimestamp)}
                </TableCell>
                <TableCell>
                  {txData.amount ? formatCurrency(txData.amount) : '-'}
                  {txData.runeAmount && (
                    <div className="text-xs text-muted-foreground">
                      {txData.runeAmount} {txData.runeId?.substring(0, 4)}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {getStatusBadge(txStatus)}
                  {txData.confirmations && txData.confirmations > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {txData.confirmations} confirmations
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )})
          )}
        </TableBody>
      </Table>
    </div>
  );
}
