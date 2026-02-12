'use client'

import { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'

interface BRC20TransferProps {
  ticker: string
  balance?: number
  onSuccess?: () => void
}

export default function BRC20Transfer({ ticker, balance = 0, onSuccess }: BRC20TransferProps) {
  const { walletInfo } = useWallet()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<'idle' | 'building' | 'signing' | 'broadcasting' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txid, setTxid] = useState<string | null>(null)

  const handleTransfer = async () => {
    if (!walletInfo.connected || !recipient || !amount) return

    setStatus('building')
    setError(null)

    try {
      // Validate recipient address
      if (!recipient.match(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,87}$/)) {
        throw new Error('Invalid Bitcoin address')
      }

      // Validate amount
      const amountNum = parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0 || amountNum > balance) {
        throw new Error('Invalid amount')
      }

      // TODO: Implement actual BRC20 transfer using inscription
      // For now, this is a placeholder that shows the flow

      setStatus('signing')
      
      // Simulate signing delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      setStatus('broadcasting')
      
      // Simulate broadcast delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Mock txid
      const mockTxid = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
      setTxid(mockTxid)
      setStatus('success')

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed')
      setStatus('error')
    }
  }

  const resetForm = () => {
    setRecipient('')
    setAmount('')
    setStatus('idle')
    setError(null)
    setTxid(null)
  }

  if (!walletInfo.connected) {
    return (
      <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
        <div className="text-center text-gray-500">
          Connect your wallet to transfer {ticker}
        </div>
      </div>
    )
  }

  if (status === 'success' && txid) {
    return (
      <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
        <div className="text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h3 className="text-lg font-bold text-white mb-2">Transfer Submitted!</h3>
          <p className="text-sm text-gray-400 mb-4">
            Your {ticker} transfer has been broadcast to the network
          </p>

          {/* Transaction ID */}
          <div className="mb-6">
            <div className="text-xs text-gray-500 mb-1">Transaction ID</div>
            <div className="flex items-center gap-2 justify-center">
              <code className="px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-xs font-mono text-white break-all">
                {txid.slice(0, 16)}...{txid.slice(-16)}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(txid)}
                className="p-2 hover:bg-[#2a2a3e] rounded transition-colors"
                title="Copy txid"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <a
              href={`https://mempool.space/tx/${txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#2a2a3e] text-white text-sm font-semibold rounded hover:bg-[#3a3a4e] transition-colors"
            >
              View on Explorer
            </a>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-[#f59e0b] text-black text-sm font-semibold rounded hover:bg-[#f59e0b]/90 transition-colors"
            >
              New Transfer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#2a2a3e]">
        <h3 className="text-sm font-semibold text-white">Transfer {ticker}</h3>
        <div className="mt-1 text-xs text-gray-400">
          Available: <span className="font-mono text-white">{balance.toLocaleString()} {ticker}</span>
        </div>
      </div>

      {/* Form */}
      <div className="p-6 space-y-4">
        {/* Recipient Address */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="bc1..."
            disabled={status !== 'idle' && status !== 'error'}
            className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-white text-sm placeholder:text-gray-600 focus:border-[#f59e0b] focus:outline-none font-mono disabled:opacity-50"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">
            Amount
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={status !== 'idle' && status !== 'error'}
              className="w-full px-3 py-2 pr-16 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-white text-sm placeholder:text-gray-600 focus:border-[#f59e0b] focus:outline-none font-mono disabled:opacity-50"
              step="any"
            />
            <button
              onClick={() => setAmount(balance.toString())}
              disabled={status !== 'idle' && status !== 'error'}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#2a2a3e] text-xs text-white rounded hover:bg-[#3a3a4e] transition-colors disabled:opacity-50"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
            <div className="text-xs text-red-400">{error}</div>
          </div>
        )}

        {/* Status Message */}
        {status !== 'idle' && status !== 'error' && status !== 'success' && (
          <div className="p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
              <div className="text-xs text-[#f59e0b]">
                {status === 'building' && 'Building transaction...'}
                {status === 'signing' && 'Waiting for signature...'}
                {status === 'broadcasting' && 'Broadcasting transaction...'}
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleTransfer}
          disabled={!recipient || !amount || (status !== 'idle' && status !== 'error')}
          className="w-full px-4 py-3 bg-[#f59e0b] text-black font-semibold rounded hover:bg-[#f59e0b]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'idle' || status === 'error' ? 'Transfer' : 'Processing...'}
        </button>

        {/* Warning */}
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
          <div className="text-xs text-yellow-400">
            ⚠️ BRC-20 transfers require inscription. Make sure you have enough BTC for fees (~$5-10).
          </div>
        </div>
      </div>
    </div>
  )
}
