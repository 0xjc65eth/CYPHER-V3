'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import type { Transaction } from '@/services/WalletService'

export default function TransactionHistory() {
  const { walletInfo, getTransactionHistory } = useWallet()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (walletInfo.connected) {
      loadTransactions()
    }
  }, [walletInfo.connected])

  const loadTransactions = async () => {
    setLoading(true)
    setError(null)

    try {
      const txs = await getTransactionHistory()
      setTransactions(txs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatValue = (sats: number) => {
    return (sats / 1e8).toFixed(8)
  }

  const shortenTxid = (txid: string) => {
    return `${txid.slice(0, 8)}...${txid.slice(-8)}`
  }

  if (!walletInfo.connected) {
    return (
      <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-8">
        <div className="text-center text-gray-500">
          Connect your wallet to view transaction history
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2a2a3e]">
        <h3 className="text-sm font-semibold text-white">Transaction History</h3>
        <button
          onClick={loadTransactions}
          disabled={loading}
          className="text-xs text-[#f59e0b] hover:text-[#f59e0b]/80 transition-colors disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Content */}
      <div className="divide-y divide-[#2a2a3e]">
        {loading && transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Loading transactions...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">{error}</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No transactions found</div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.txid} className="p-4 hover:bg-[#2a2a3e]/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                {/* Left: Type and Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Type Icon */}
                    {tx.type === 'receive' ? (
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    )}

                    {/* Type Label */}
                    <span className="text-sm font-semibold text-white capitalize">
                      {tx.type}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        tx.status === 'confirmed'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {tx.status === 'confirmed'
                        ? `${tx.confirmations} conf${tx.confirmations !== 1 ? 's' : ''}`
                        : 'Pending'}
                    </span>
                  </div>

                  {/* Transaction ID */}
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs font-mono text-gray-500">
                      {shortenTxid(tx.txid)}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(tx.txid)}
                      className="p-0.5 hover:bg-[#2a2a3e] rounded transition-colors"
                      title="Copy txid"
                    >
                      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <a
                      href={`https://mempool.space/tx/${tx.txid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-0.5 hover:bg-[#2a2a3e] rounded transition-colors"
                      title="View on Mempool"
                    >
                      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>

                  {/* Date */}
                  <div className="text-xs text-gray-500">
                    {formatDate(tx.timestamp)}
                  </div>
                </div>

                {/* Right: Amount */}
                <div className="text-right">
                  <div
                    className={`text-base font-mono font-bold ${
                      tx.type === 'receive' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {tx.type === 'receive' ? '+' : '-'}{formatValue(tx.value)} BTC
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Fee: {formatValue(tx.fee)} BTC
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {transactions.length > 0 && (
        <div className="p-4 border-t border-[#2a2a3e] text-center">
          <a
            href={`https://mempool.space/address/${walletInfo.paymentAddress?.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#f59e0b] hover:text-[#f59e0b]/80 transition-colors"
          >
            View all on Mempool.space →
          </a>
        </div>
      )}
    </div>
  )
}
