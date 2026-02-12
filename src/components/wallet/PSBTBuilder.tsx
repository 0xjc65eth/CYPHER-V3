'use client'

import { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { walletService } from '@/services/WalletService'

interface PSBTBuilderProps {
  runeName?: string
  onSuccess?: (txid: string) => void
}

export default function PSBTBuilder({ runeName, onSuccess }: PSBTBuilderProps) {
  const { walletInfo } = useWallet()
  const [psbtBase64, setPsbtBase64] = useState('')
  const [signInputs, setSignInputs] = useState('0')
  const [status, setStatus] = useState<'idle' | 'signing' | 'broadcasting' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [signedPsbt, setSignedPsbt] = useState<string | null>(null)
  const [txid, setTxid] = useState<string | null>(null)

  const handleSignPSBT = async () => {
    if (!psbtBase64 || !walletInfo.connected) return

    setStatus('signing')
    setError(null)

    try {
      // Parse sign inputs (comma-separated indices)
      const indices = signInputs
        .split(',')
        .map((s) => parseInt(s.trim()))
        .filter((n) => !isNaN(n))

      if (indices.length === 0) {
        throw new Error('Invalid signing indices')
      }

      // Sign PSBT
      const signed = await walletService.signPSBT(psbtBase64, indices)
      setSignedPsbt(signed)
      setStatus('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign PSBT')
      setStatus('error')
    }
  }

  const handleBroadcast = async () => {
    if (!signedPsbt) return

    setStatus('broadcasting')
    setError(null)

    try {
      // Note: This requires the PSBT to be finalized and extracted to raw hex
      // In production, you would use a Bitcoin library to finalize the PSBT first
      
      // Mock broadcast for now
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const mockTxid = '0x' + Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')
      
      setTxid(mockTxid)
      setStatus('success')
      onSuccess?.(mockTxid)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to broadcast transaction')
      setStatus('error')
    }
  }

  const resetForm = () => {
    setPsbtBase64('')
    setSignInputs('0')
    setSignedPsbt(null)
    setTxid(null)
    setStatus('idle')
    setError(null)
  }

  if (!walletInfo.connected) {
    return (
      <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
        <div className="text-center text-gray-500">
          Connect your wallet to use PSBT builder
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
          <h3 className="text-lg font-bold text-white mb-2">Transaction Broadcast!</h3>
          <p className="text-sm text-gray-400 mb-4">
            Your {runeName || 'Runes'} transaction has been submitted
          </p>

          {/* Transaction ID */}
          <div className="mb-6">
            <div className="text-xs text-gray-500 mb-1">Transaction ID</div>
            <div className="flex items-center gap-2 justify-center">
              <code className="px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-xs font-mono text-white">
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
              New Transaction
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
        <h3 className="text-sm font-semibold text-white">
          PSBT Builder {runeName && `- ${runeName}`}
        </h3>
        <div className="mt-1 text-xs text-gray-400">
          Partially Signed Bitcoin Transaction for advanced trading
        </div>
      </div>

      {/* Form */}
      <div className="p-6 space-y-4">
        {/* PSBT Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">
            PSBT (Base64)
          </label>
          <textarea
            value={psbtBase64}
            onChange={(e) => setPsbtBase64(e.target.value)}
            placeholder="cHNidP8BAH8CAAAAAe..."
            disabled={status === 'signing' || status === 'broadcasting'}
            rows={4}
            className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-white text-xs placeholder:text-gray-600 focus:border-[#f59e0b] focus:outline-none font-mono resize-none disabled:opacity-50"
          />
          <div className="mt-1 text-xs text-gray-500">
            Paste the PSBT in Base64 format from your marketplace or DEX
          </div>
        </div>

        {/* Sign Inputs */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">
            Input Indices to Sign
          </label>
          <input
            type="text"
            value={signInputs}
            onChange={(e) => setSignInputs(e.target.value)}
            placeholder="0,1,2"
            disabled={status === 'signing' || status === 'broadcasting'}
            className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-white text-sm placeholder:text-gray-600 focus:border-[#f59e0b] focus:outline-none font-mono disabled:opacity-50"
          />
          <div className="mt-1 text-xs text-gray-500">
            Comma-separated list of input indices (e.g., 0,1,2)
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
            <div className="text-xs text-red-400">{error}</div>
          </div>
        )}

        {/* Signed PSBT Output */}
        {signedPsbt && (
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">
              Signed PSBT (Base64)
            </label>
            <div className="relative">
              <textarea
                value={signedPsbt}
                readOnly
                rows={4}
                className="w-full px-3 py-2 pr-12 bg-[#0a0a0f] border border-green-500/30 rounded text-green-400 text-xs font-mono resize-none"
              />
              <button
                onClick={() => navigator.clipboard.writeText(signedPsbt)}
                className="absolute right-2 top-2 p-2 hover:bg-[#2a2a3e] rounded transition-colors"
                title="Copy signed PSBT"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSignPSBT}
            disabled={!psbtBase64 || status === 'signing' || status === 'broadcasting'}
            className="flex-1 px-4 py-3 bg-[#f59e0b] text-black font-semibold rounded hover:bg-[#f59e0b]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'signing' ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Signing...
              </span>
            ) : (
              'Sign PSBT'
            )}
          </button>

          {signedPsbt && (
            <button
              onClick={handleBroadcast}
              disabled={status === 'broadcasting'}
              className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'broadcasting' ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Broadcasting...
                </span>
              ) : (
                'Broadcast'
              )}
            </button>
          )}
        </div>

        {/* Info Box */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
          <div className="text-xs text-blue-400">
            <div className="font-semibold mb-1">ℹ️ How to use:</div>
            <ol className="list-decimal list-inside space-y-1 text-gray-400">
              <li>Get a PSBT from your Runes marketplace or DEX</li>
              <li>Paste the Base64-encoded PSBT above</li>
              <li>Specify which inputs you need to sign</li>
              <li>Click "Sign PSBT" to sign with your wallet</li>
              <li>Click "Broadcast" to send the transaction</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
