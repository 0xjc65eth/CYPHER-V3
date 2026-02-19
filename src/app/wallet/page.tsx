'use client'

import { useState } from 'react'
import WalletConnect from '@/components/wallet/WalletConnect'
import TransactionHistory from '@/components/wallet/TransactionHistory'
import BRC20Transfer from '@/components/wallet/BRC20Transfer'
import PSBTBuilder from '@/components/wallet/PSBTBuilder'
import { useWallet } from '@/contexts/WalletContext'

export default function WalletPage() {
  const { walletInfo, refreshBalance } = useWallet()
  const [activeTab, setActiveTab] = useState<'history' | 'transfer' | 'psbt'>('history')

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Bitcoin Wallet</h1>
              <p className="text-gray-400">
                Manage your Bitcoin, Ordinals, Runes, and BRC-20 tokens
              </p>
            </div>
            
            {/* Wallet Connect Button */}
            <WalletConnect />
          </div>

          {/* Balance Card (if connected) */}
          {walletInfo.connected && walletInfo.balance && (
            <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Total Balance</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-mono font-bold text-white">
                      {(walletInfo.balance.total / 1e8).toFixed(8)}
                    </span>
                    <span className="text-xl text-gray-400">BTC</span>
                  </div>
                  {walletInfo.balance.unconfirmed > 0 && (
                    <div className="mt-2 text-sm text-yellow-400">
                      {(walletInfo.balance.unconfirmed / 1e8).toFixed(8)} BTC pending
                    </div>
                  )}
                </div>

                <button
                  onClick={refreshBalance}
                  className="p-2 hover:bg-[#2a2a3e] rounded transition-colors"
                  title="Refresh balance"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {/* Address Info */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Payment Address</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-xs font-mono text-white truncate">
                      {walletInfo.paymentAddress?.address}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(walletInfo.paymentAddress!.address)}
                      className="p-2 hover:bg-[#2a2a3e] rounded transition-colors flex-shrink-0"
                      title="Copy address"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {walletInfo.ordinalsAddress && walletInfo.ordinalsAddress.address !== walletInfo.paymentAddress?.address && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Ordinals Address</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-xs font-mono text-white truncate">
                        {walletInfo.ordinalsAddress.address}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(walletInfo.ordinalsAddress!.address)}
                        className="p-2 hover:bg-[#2a2a3e] rounded transition-colors flex-shrink-0"
                        title="Copy address"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        {walletInfo.connected && (
          <div className="mb-6">
            <div className="flex gap-2 border-b border-[#2a2a3e]">
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-3 text-sm font-semibold transition-colors relative ${
                  activeTab === 'history'
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Transaction History
                {activeTab === 'history' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f59e0b]" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('transfer')}
                className={`px-4 py-3 text-sm font-semibold transition-colors relative ${
                  activeTab === 'transfer'
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                BRC-20 Transfer
                {activeTab === 'transfer' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f59e0b]" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('psbt')}
                className={`px-4 py-3 text-sm font-semibold transition-colors relative ${
                  activeTab === 'psbt'
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                PSBT Builder
                {activeTab === 'psbt' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f59e0b]" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="grid grid-cols-1 gap-6">
          {activeTab === 'history' && <TransactionHistory />}
          {activeTab === 'transfer' && (
            <BRC20Transfer 
              ticker="ORDI" 
              balance={1000}
              onSuccess={() => {}}
            />
          )}
          {activeTab === 'psbt' && (
            <PSBTBuilder 
              runeName="UNCOMMON•GOODS"
              onSuccess={(_txid) => {}}
            />
          )}
        </div>

        {/* Features Grid (if not connected) */}
        {!walletInfo.connected && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
              <div className="w-12 h-12 bg-[#f59e0b]/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Multi-Wallet Support</h3>
              <p className="text-sm text-gray-400">
                Connect with Xverse or UniSat wallets for full Bitcoin ecosystem access
              </p>
            </div>

            <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
              <div className="w-12 h-12 bg-[#f59e0b]/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">BRC-20 Transfers</h3>
              <p className="text-sm text-gray-400">
                Send and receive BRC-20 tokens with built-in inscription support
              </p>
            </div>

            <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
              <div className="w-12 h-12 bg-[#f59e0b]/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">PSBT Signing</h3>
              <p className="text-sm text-gray-400">
                Advanced PSBT builder for Runes and complex Bitcoin transactions
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
