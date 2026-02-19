'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { usePremium } from '@/contexts/PremiumContext'
import { useClientOnly } from '@/hooks/useClientOnly'
import { getWalletAccessTier, hasPremiumAccess } from '@/config/vip-wallets'
import type { WalletType } from '@/services/WalletService'

export default function WalletConnect() {
  const isClient = useClientOnly()
  const { walletInfo, isConnecting, error, connect, disconnect } = useWallet()
  const { setAccessTier, setIsPremium, setPremiumCollection, accessTier } = usePremium()
  const [showMenu, setShowMenu] = useState(false)

  // Check VIP status when BTC wallet connects
  useEffect(() => {
    if (walletInfo.connected && walletInfo.paymentAddress) {
      const address = walletInfo.paymentAddress.address
      const tier = getWalletAccessTier(address)
      if (hasPremiumAccess(tier)) {
        setAccessTier(tier)
        setIsPremium(true)
        setPremiumCollection('VIP WALLET')
      }
    }
  }, [walletInfo.connected, walletInfo.paymentAddress, setAccessTier, setIsPremium, setPremiumCollection])

  const btcTier = getWalletAccessTier(walletInfo.paymentAddress?.address ?? null)

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatBalance = (sats: number) => {
    return (sats / 1e8).toFixed(8)
  }

  const handleConnect = async (walletType: WalletType) => {
    try {
      // Check if extension is available before trying to connect
      if (walletType === 'xverse' && isClient) {
        // Check for sats-connect compatible wallet (Xverse injects XverseProviders or BitcoinProvider)
        const hasXverse = !!(window as any).XverseProviders || !!(window as any).BitcoinProvider
        if (!hasXverse) {
          window.open('https://www.xverse.app/download', '_blank')
          return
        }
      }
      if (walletType === 'unisat' && isClient) {
        if (!(window as any).unisat) {
          window.open('https://unisat.io/download', '_blank')
          return
        }
      }
      await connect(walletType)
      setShowMenu(false)
    } catch (err) {
      console.error('Failed to connect:', err)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setAccessTier('free')
    setIsPremium(false)
    setPremiumCollection(null)
  }

  if (walletInfo.connected && walletInfo.paymentAddress) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg hover:border-[#f59e0b] transition-colors"
        >
          {/* Wallet Icon */}
          <svg
            className="w-5 h-5 text-[#f59e0b]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>

          {/* Verified Badge */}
          {walletInfo.verified && (
            <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 16.77l-6.18 3.25L7 13.14 2 8.27l6.91-1.01L12 1z"/>
            </svg>
          )}

          {/* Address and Balance */}
          <div className="flex flex-col items-start">
            <span className="text-xs font-mono text-gray-400">
              {formatAddress(walletInfo.paymentAddress.address)}
            </span>
            {walletInfo.balance && (
              <span className="text-xs font-mono font-bold text-white">
                {formatBalance(walletInfo.balance.total)} BTC
              </span>
            )}
          </div>

          {/* Dropdown Arrow */}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${
              showMenu ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg shadow-xl z-50">
            {/* Wallet Info */}
            <div className="p-4 border-b border-[#2a2a3e]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase">
                  {walletInfo.walletType} Wallet
                </span>
                <div className="flex items-center gap-2">
                  {walletInfo.verified && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded">
                      Verified
                    </span>
                  )}
                  {hasPremiumAccess(btcTier) && (
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                      btcTier === 'super_admin' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {btcTier === 'super_admin' ? 'ADMIN' : 'VIP'}
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-semibold rounded">
                    Connected
                  </span>
                </div>
              </div>

              {/* Payment Address */}
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-1">Payment Address</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-2 py-1 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-xs font-mono text-white break-all">
                    {walletInfo.paymentAddress.address}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(walletInfo.paymentAddress!.address)}
                    className="p-1 hover:bg-[#2a2a3e] rounded transition-colors"
                    title="Copy address"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Ordinals Address (if different) */}
              {walletInfo.ordinalsAddress && 
               walletInfo.ordinalsAddress.address !== walletInfo.paymentAddress.address && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Ordinals Address</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-2 py-1 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-xs font-mono text-white break-all">
                      {walletInfo.ordinalsAddress.address}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(walletInfo.ordinalsAddress!.address)}
                      className="p-1 hover:bg-[#2a2a3e] rounded transition-colors"
                      title="Copy address"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Balance */}
              {walletInfo.balance && (
                <div className="mt-3 p-3 bg-[#0a0a0f] border border-[#2a2a3e] rounded">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-gray-500">Total Balance</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-mono font-bold text-white">
                        {formatBalance(walletInfo.balance.total)}
                      </span>
                      <span className="text-xs text-gray-400">BTC</span>
                    </div>
                  </div>
                  {walletInfo.balance.unconfirmed > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      ({formatBalance(walletInfo.balance.unconfirmed)} BTC pending)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-2">
              <button
                onClick={() => {
                  handleDisconnect()
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded transition-colors"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        )}

        {/* Click outside to close */}
        {showMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isConnecting}
        className="px-4 py-2 bg-[#f59e0b] text-black font-semibold rounded-lg hover:bg-[#f59e0b]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {/* Wallet Selection Menu */}
      {showMenu && !walletInfo.connected && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg shadow-xl z-50">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
              Select Wallet
            </div>

            {/* Xverse */}
            <button
              onClick={() => handleConnect('xverse')}
              disabled={isConnecting}
              className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#2a2a3e] rounded transition-colors disabled:opacity-50"
            >
              <div className="w-8 h-8 bg-[#f59e0b] rounded flex items-center justify-center">
                <span className="text-black font-bold text-sm">X</span>
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-white">Xverse</div>
                <div className="text-xs text-gray-500">
                  {typeof window !== 'undefined' && ((window as any).XverseProviders || (window as any).BitcoinProvider)
                    ? 'Bitcoin & Ordinals'
                    : 'Click to install'}
                </div>
              </div>
              {typeof window !== 'undefined' && !(window as any).XverseProviders && !(window as any).BitcoinProvider && (
                <span className="text-[10px] text-orange-400/60">↗</span>
              )}
            </button>

            {/* UniSat */}
            <button
              onClick={() => handleConnect('unisat')}
              disabled={isConnecting}
              className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#2a2a3e] rounded transition-colors disabled:opacity-50"
            >
              <div className="w-8 h-8 bg-[#f59e0b] rounded flex items-center justify-center">
                <span className="text-black font-bold text-sm">U</span>
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-white">UniSat</div>
                <div className="text-xs text-gray-500">
                  {typeof window !== 'undefined' && (window as any).unisat
                    ? 'Bitcoin & BRC-20'
                    : 'Click to install'}
                </div>
              </div>
              {typeof window !== 'undefined' && !(window as any).unisat && (
                <span className="text-[10px] text-orange-400/60">↗</span>
              )}
            </button>
          </div>

          {error && (
            <div className="p-3 border-t border-[#2a2a3e]">
              <div className="text-xs text-red-400">{error}</div>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showMenu && !walletInfo.connected && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  )
}
