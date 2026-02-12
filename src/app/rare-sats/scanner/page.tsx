'use client'

import { useState } from 'react'
import WalletScanner from '@/components/rare-sats/WalletScanner'
import SocialShare from '@/components/rare-sats/SocialShare'
import RarityGuide from '@/components/rare-sats/RarityGuide'
import WalletConnect from '@/components/wallet/WalletConnect'
import { useWallet } from '@/contexts/WalletContext'
import type { ScanResult } from '@/services/rare-sats/RareSatsService'

export default function RareSatsScanner() {
  const { walletInfo } = useWallet()
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Hero Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-full mb-4">
            <span className="animate-pulse">🔥</span>
            <span className="text-xs font-bold text-[#f59e0b] uppercase">Killer Feature</span>
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-4">
            Scan My Wallet
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-6">
            Discover hidden rare satoshis in your Bitcoin wallet. 
            Find uncommon, rare, epic, legendary, and even <strong className="text-red-400">mythic</strong> sats!
          </p>

          <div className="flex items-center justify-center gap-4">
            <WalletConnect />
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg">
            <div className="w-12 h-12 bg-[#f59e0b]/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Deep UTXO Scan</h3>
            <p className="text-sm text-gray-400">
              Analyzes every UTXO in your wallet to identify rare satoshis based on Ordinal Theory
            </p>
          </div>

          <div className="p-6 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Value Estimation</h3>
            <p className="text-sm text-gray-400">
              Get real-time USD estimates for your rare sat discoveries based on market data
            </p>
          </div>

          <div className="p-6 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Social Sharing</h3>
            <p className="text-sm text-gray-400">
              Share your rare sat discoveries on Twitter and join the collector community
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Scanner (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            <WalletScanner />

            {/* Social Share - only show after scan */}
            {scanResult && walletInfo.paymentAddress && (
              <SocialShare 
                scanResult={scanResult} 
                walletAddress={walletInfo.paymentAddress.address}
              />
            )}
          </div>

          {/* Right: Rarity Guide (1 column) */}
          <div>
            <RarityGuide />
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mt-12 p-6 bg-gradient-to-r from-[#f59e0b]/10 to-purple-500/10 border border-[#f59e0b]/30 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-white mb-1">2.1Q</div>
              <div className="text-xs text-gray-400">Total Satoshis</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400 mb-1">6.9M</div>
              <div className="text-xs text-gray-400">Uncommon Sats</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400 mb-1">32</div>
              <div className="text-xs text-gray-400">Epic Sats</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-400 mb-1">1</div>
              <div className="text-xs text-gray-400">Mythic Sat</div>
            </div>
          </div>
        </div>

        {/* CTA Footer */}
        <div className="mt-12 text-center">
          <div className="inline-block p-6 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg">
            <h3 className="text-xl font-bold text-white mb-2">
              Want to learn more about Ordinals?
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Explore our comprehensive guides and start collecting rare sats today
            </p>
            <div className="flex gap-3 justify-center">
              <a
                href="/ordinals"
                className="px-4 py-2 bg-[#f59e0b] text-black font-semibold rounded-lg hover:bg-[#f59e0b]/90 transition-colors"
              >
                View Ordinals Marketplace
              </a>
              <a
                href="https://docs.ordinals.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#2a2a3e] text-white font-semibold rounded-lg hover:bg-[#3a3a4e] transition-colors"
              >
                Read Documentation
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
