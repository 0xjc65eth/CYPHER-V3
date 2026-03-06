'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { getWalletAccessTier, hasPremiumAccess, isSuperAdmin, isVIPEthWallet, type AccessTier } from '@/config/vip-wallets'
import { YHP_CONTRACT_ADDRESS } from '@/config/premium-collections'
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
  /** BTCPay subscription tier */
  subscriptionTier: SubscriptionTier
  /** Subscription status (active, expired, etc.) */
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
const PREMIUM_CACHE_TTL = 5 * 60 * 1000 // 5 minutes — premium localStorage cache lifetime (NEVER trust longer)
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

  // Whether we are re-verifying a cached premium claim
  const [isReverifying, setIsReverifying] = useState(false)

  // Restore premium status from localStorage on mount — with TTL guard
  // SECURITY: localStorage is ONLY a display hint. isPremium stays false until server-side
  // re-verification completes. NEVER trust super_admin from client-side cache.
  useEffect(() => {
    if (!isClient) return
    const saved = localStorage.getItem(PREMIUM_STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const age = Date.now() - (parsed._ts ?? 0)

        // If cache is expired or has no timestamp, clear and stay free
        if (!parsed._ts || age > PREMIUM_CACHE_TTL) {
          localStorage.removeItem(PREMIUM_STORAGE_KEY)
          return
        }

        // SECURITY: NEVER restore super_admin from localStorage — must come from
        // server-side verification (isSuperAdmin check against known ETH addresses)
        const cachedTier = parsed.accessTier as AccessTier | undefined
        if (cachedTier === 'super_admin') {
          localStorage.removeItem(PREMIUM_STORAGE_KEY)
          return
        }

        if (parsed.isPremium) {
          // Do NOT set isPremium=true from cache. Only store the hint data
          // and trigger re-verification. isPremium stays false until verified.
          setPremiumCollection(parsed.premiumCollection ?? null)
          setEthAddress(parsed.ethAddress ?? null)
          // Cap restored tier at 'premium' (never 'super_admin' or 'vip' from cache)
          setAccessTier(cachedTier === 'vip' ? 'premium' : cachedTier ?? 'premium')
          setIsReverifying(true)
        }
      } catch {
        localStorage.removeItem(PREMIUM_STORAGE_KEY)
      }
    }
  }, [isClient])

  // Re-verify cached premium claim against on-chain / VIP data
  // SECURITY: isPremium is false by default. Only set to true HERE after verification.
  useEffect(() => {
    if (!isReverifying || !isClient) return

    const reverify = async () => {
      setIsVerifying(true)
      try {
        let verified = false
        let verifiedTier: AccessTier = 'free'

        // For 'premium' tier, try on-chain YHP NFT verification if we have ethAddress
        if (ethAddress) {
          // First check ETH VIP list (server-side known addresses)
          if (isSuperAdmin(ethAddress)) {
            verified = true
            verifiedTier = 'super_admin'
          } else if (isVIPEthWallet(ethAddress)) {
            verified = true
            verifiedTier = 'vip'
          } else {
            // On-chain YHP NFT check
            try {
              const { JsonRpcProvider, Contract } = await import('ethers')
              const provider = new JsonRpcProvider('https://cloudflare-eth.com')
              const contract = new Contract(
                YHP_CONTRACT_ADDRESS,
                ['function balanceOf(address owner) view returns (uint256)'],
                provider
              )
              const bal = await contract.balanceOf(ethAddress)
              if (Number(bal) > 0) {
                verified = true
                verifiedTier = 'premium'
              }
            } catch {
              // RPC failure — revoke to be safe
              verified = false
            }
          }
        }

        if (verified) {
          // Server-side / on-chain verification succeeded — NOW set isPremium
          setIsPremiumRaw(true)
          setAccessTier(verifiedTier)
        } else {
          // Verification failed — revoke everything
          setIsPremiumRaw(false)
          setPremiumCollection(null)
          setAccessTier('free')
          localStorage.removeItem(PREMIUM_STORAGE_KEY)
        }
      } finally {
        setIsVerifying(false)
        setIsReverifying(false)
      }
    }

    reverify()
  // Only run once when isReverifying becomes true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReverifying, isClient])

  // Persist premium status whenever it changes (with timestamp for TTL)
  useEffect(() => {
    if (!isClient) return
    if (isPremium || hasPremiumAccess(accessTier)) {
      localStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify({
        isPremium: true,
        premiumCollection,
        ethAddress,
        accessTier,
        _ts: Date.now(),
      }))
    } else {
      localStorage.removeItem(PREMIUM_STORAGE_KEY)
    }
  }, [isPremium, premiumCollection, ethAddress, accessTier, isClient])

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

  // Auto-fetch subscription when a wallet address becomes available
  // (handles auto-reconnect from localStorage where no walletConnected event fires)
  const lastFetchedWallet = useRef<string | null>(null)
  useEffect(() => {
    if (!isClient) return
    // Detect wallet address from localStorage (BTC or ETH)
    const btcWallet = localStorage.getItem('wallet-address') || null
    const ethWallet = (() => {
      try {
        const raw = localStorage.getItem('cypher_eth_wallet')
        if (raw) return JSON.parse(raw).address || null
      } catch { /* ignore */ }
      return null
    })()
    const walletAddr = ethWallet || btcWallet
    if (walletAddr && walletAddr !== lastFetchedWallet.current) {
      lastFetchedWallet.current = walletAddr
      fetchSubscriptionStatus(walletAddr)
    }
  }, [isClient, fetchSubscriptionStatus])

  // Determine effective tier: VIP/NFT wallets get elite override
  // But only trust accessTier if we are NOT currently re-verifying a stale cache
  const effectiveSubscriptionTier: SubscriptionTier = (() => {
    if (!isReverifying && hasPremiumAccess(accessTier)) return 'elite'
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
      // SECURITY: Never accept super_admin/vip tier from client events.
      // Those tiers can only be set by server-side verification (isSuperAdmin/isVIPEthWallet).
      if (walletPremium) {
        setIsPremiumRaw(true)
        if (collection) setPremiumCollection(collection)
        if (accessTier === 'free') {
          setAccessTier('premium')
        }
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
        // Also fetch subscription status for ETH wallet
        fetchSubscriptionStatus(event.detail.address)
      }
    }

    const handleEthWalletDisconnected = () => {
      setEthAddress(null)
      // Clear premium if it came from ETH wallet (YHP or SUPER ADMIN)
      if (premiumCollection === 'YIELD HACKER PASS' || premiumCollection === 'SUPER ADMIN') {
        setIsPremiumRaw(false)
        setPremiumCollection(null)
        setAccessTier('free')
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
