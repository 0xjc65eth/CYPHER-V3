'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getWalletAccessTier, hasPremiumAccess, type AccessTier } from '@/config/vip-wallets'
import { useClientOnly } from '@/hooks/useClientOnly'

interface PremiumContextType {
  isPremium: boolean
  setIsPremium: (value: boolean) => void
  premiumCollection: string | null
  setPremiumCollection: (value: string | null) => void
  isVerifying: boolean
  setIsVerifying: (value: boolean) => void
  ethAddress: string | null
  /** Access tier derived from BTC VIP list + YHP NFT verification */
  accessTier: AccessTier
  setAccessTier: (tier: AccessTier) => void
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined)

const PREMIUM_STORAGE_KEY = 'cypher_premium_status'

export function PremiumProvider({ children }: { children: ReactNode }) {
  const isClient = useClientOnly()
  const [isPremium, setIsPremiumRaw] = useState(false)
  const [premiumCollection, setPremiumCollection] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [ethAddress, setEthAddress] = useState<string | null>(null)
  const [accessTier, setAccessTier] = useState<AccessTier>('free')

  // Wrapper that keeps accessTier in sync when isPremium changes directly
  const setIsPremium = (value: boolean) => {
    setIsPremiumRaw(value)
    if (!value && accessTier === 'premium') {
      setAccessTier('free')
    }
  }

  // Restore premium status from localStorage on mount
  useEffect(() => {
    if (!isClient) return
    const saved = localStorage.getItem(PREMIUM_STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.isPremium) {
          setIsPremiumRaw(true)
          setPremiumCollection(parsed.premiumCollection ?? null)
          setEthAddress(parsed.ethAddress ?? null)
          setAccessTier((parsed.accessTier as AccessTier) ?? 'premium')
        }
      } catch {
        localStorage.removeItem(PREMIUM_STORAGE_KEY)
      }
    }
  }, [isClient])

  // Persist premium status whenever it changes
  useEffect(() => {
    if (!isClient) return
    if (isPremium || hasPremiumAccess(accessTier)) {
      localStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify({
        isPremium: true,
        premiumCollection,
        ethAddress,
        accessTier,
      }))
    } else {
      localStorage.removeItem(PREMIUM_STORAGE_KEY)
    }
  }, [isPremium, premiumCollection, ethAddress, accessTier])

  // Listen for wallet events (BTC + ETH)
  useEffect(() => {
    const handleWalletConnected = (event: CustomEvent) => {
      const { address: btcAddr, isPremium: walletPremium, premiumCollection: collection } = event.detail ?? {}

      // Check BTC VIP list first
      if (btcAddr) {
        const tier = getWalletAccessTier(btcAddr)
        if (hasPremiumAccess(tier)) {
          setAccessTier(tier)
          setIsPremiumRaw(true)
          setPremiumCollection(tier === 'vip' || tier === 'super_admin' ? 'VIP WALLET' : collection ?? null)
          return
        }
      }

      // Fallback: event says premium (e.g. YHP holder)
      if (walletPremium) {
        setIsPremiumRaw(true)
        if (collection) setPremiumCollection(collection)
        if (accessTier === 'free') setAccessTier('premium')
      }
    }

    const handleWalletDisconnected = () => {
      setIsPremiumRaw(false)
      setPremiumCollection(null)
      setAccessTier('free')
    }

    const handleEthWalletConnected = (event: CustomEvent) => {
      if (event.detail?.address) {
        setEthAddress(event.detail.address)
      }
    }

    const handleEthWalletDisconnected = () => {
      setEthAddress(null)
      // Only clear premium if it came from ETH wallet (YHP)
      if (premiumCollection === 'YIELD HACKER PASS') {
        setIsPremiumRaw(false)
        setPremiumCollection(null)
        if (accessTier === 'premium') setAccessTier('free')
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('walletConnected', handleWalletConnected as EventListener)
      window.addEventListener('walletDisconnected', handleWalletDisconnected as EventListener)
      window.addEventListener('ethWalletConnected', handleEthWalletConnected as EventListener)
      window.addEventListener('ethWalletDisconnected', handleEthWalletDisconnected as EventListener)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('walletConnected', handleWalletConnected as EventListener)
        window.removeEventListener('walletDisconnected', handleWalletDisconnected as EventListener)
        window.removeEventListener('ethWalletConnected', handleEthWalletConnected as EventListener)
        window.removeEventListener('ethWalletDisconnected', handleEthWalletDisconnected as EventListener)
      }
    }
  }, [premiumCollection, accessTier])

  return (
    <PremiumContext.Provider
      value={{
        isPremium: isPremium || hasPremiumAccess(accessTier),
        setIsPremium,
        premiumCollection,
        setPremiumCollection,
        isVerifying,
        setIsVerifying,
        ethAddress,
        accessTier,
        setAccessTier,
      }}
    >
      {children}
    </PremiumContext.Provider>
  )
}

export function usePremium() {
  const context = useContext(PremiumContext)
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider')
  }
  return context
}
