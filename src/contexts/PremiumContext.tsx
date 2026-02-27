'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { getWalletAccessTier, hasPremiumAccess, type AccessTier } from '@/config/vip-wallets'
import { useClientOnly } from '@/hooks/useClientOnly'
import { type SubscriptionTier, tierHasFeature } from '@/lib/stripe/config'

interface SubscriptionData {
  subscriptionTier: SubscriptionTier
  subscriptionStatus: string
  subscriptionEndDate: string | null
  isSubscriptionActive: boolean
}

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
  /** Stripe subscription tier */
  subscriptionTier: SubscriptionTier
  /** Stripe subscription status (active, canceled, past_due, etc.) */
  subscriptionStatus: string
  /** End date of current billing period */
  subscriptionEndDate: string | null
  /** Whether the subscription is currently active */
  isSubscriptionActive: boolean
  /** Check if user's effective tier includes a specific feature */
  hasFeature: (feature: string) => boolean
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined)

const PREMIUM_STORAGE_KEY = 'cypher_premium_status'
const SUBSCRIPTION_CACHE_KEY = 'cypher_subscription_cache'
const SUBSCRIPTION_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCachedSubscription(): SubscriptionData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (Date.now() - cached._ts > SUBSCRIPTION_CACHE_TTL) {
      localStorage.removeItem(SUBSCRIPTION_CACHE_KEY)
      return null
    }
    return {
      subscriptionTier: cached.subscriptionTier,
      subscriptionStatus: cached.subscriptionStatus,
      subscriptionEndDate: cached.subscriptionEndDate,
      isSubscriptionActive: cached.isSubscriptionActive,
    }
  } catch {
    return null
  }
}

function setCachedSubscription(data: SubscriptionData) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify({ ...data, _ts: Date.now() }))
  } catch { /* ignore quota errors */ }
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const isClient = useClientOnly()
  const [isPremium, setIsPremiumRaw] = useState(false)
  const [premiumCollection, setPremiumCollection] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [ethAddress, setEthAddress] = useState<string | null>(null)
  const [accessTier, setAccessTier] = useState<AccessTier>('free')

  // Subscription state
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free')
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('none')
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null)
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false)

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

  // Fetch subscription status from API
  const fetchSubscriptionStatus = useCallback(async (walletAddress: string) => {
    // Try cache first
    const cached = getCachedSubscription()
    if (cached) {
      setSubscriptionTier(cached.subscriptionTier)
      setSubscriptionStatus(cached.subscriptionStatus)
      setSubscriptionEndDate(cached.subscriptionEndDate)
      setIsSubscriptionActive(cached.isSubscriptionActive)
      return
    }

    try {
      const res = await fetch(`/api/subscription/status?wallet=${encodeURIComponent(walletAddress)}`)
      if (res.ok) {
        const data = await res.json()
        const subData: SubscriptionData = {
          subscriptionTier: data.tier || 'free',
          subscriptionStatus: data.status || 'none',
          subscriptionEndDate: data.currentPeriodEnd || null,
          isSubscriptionActive: data.status === 'active' || data.status === 'trialing',
        }
        setSubscriptionTier(subData.subscriptionTier)
        setSubscriptionStatus(subData.subscriptionStatus)
        setSubscriptionEndDate(subData.subscriptionEndDate)
        setIsSubscriptionActive(subData.isSubscriptionActive)
        setCachedSubscription(subData)
      }
    } catch {
      // Silently fail - subscription features will default to free tier
    }
  }, [])

  // Restore subscription cache on mount
  useEffect(() => {
    if (!isClient) return
    const cached = getCachedSubscription()
    if (cached) {
      setSubscriptionTier(cached.subscriptionTier)
      setSubscriptionStatus(cached.subscriptionStatus)
      setSubscriptionEndDate(cached.subscriptionEndDate)
      setIsSubscriptionActive(cached.isSubscriptionActive)
    }
  }, [isClient])

  // Determine effective tier: VIP/NFT wallets get hacker_yields override
  const effectiveSubscriptionTier: SubscriptionTier = (() => {
    if (hasPremiumAccess(accessTier)) return 'hacker_yields'
    return subscriptionTier
  })()

  // hasFeature uses the effective tier
  const hasFeature = useCallback(
    (feature: string) => tierHasFeature(effectiveSubscriptionTier, feature),
    [effectiveSubscriptionTier]
  )

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
          // VIP wallets get hacker_yields automatically, but still fetch subscription
          fetchSubscriptionStatus(btcAddr)
          return
        }
      }

      // Fetch subscription status for any connected wallet
      if (btcAddr) {
        fetchSubscriptionStatus(btcAddr)
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
      // Reset subscription state
      setSubscriptionTier('free')
      setSubscriptionStatus('none')
      setSubscriptionEndDate(null)
      setIsSubscriptionActive(false)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(SUBSCRIPTION_CACHE_KEY)
      }
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
  }, [premiumCollection, accessTier, fetchSubscriptionStatus])

  return (
    <PremiumContext.Provider
      value={{
        isPremium: isPremium || hasPremiumAccess(accessTier) || isSubscriptionActive,
        setIsPremium,
        premiumCollection,
        setPremiumCollection,
        isVerifying,
        setIsVerifying,
        ethAddress,
        accessTier,
        setAccessTier,
        subscriptionTier: effectiveSubscriptionTier,
        subscriptionStatus,
        subscriptionEndDate,
        isSubscriptionActive,
        hasFeature,
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
