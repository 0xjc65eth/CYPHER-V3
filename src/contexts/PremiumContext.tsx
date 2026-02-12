'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface PremiumContextType {
  isPremium: boolean
  setIsPremium: (value: boolean) => void
  premiumCollection: string | null
  setPremiumCollection: (value: string | null) => void
  isVerifying: boolean
  setIsVerifying: (value: boolean) => void
  ethAddress: string | null
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined)

const PREMIUM_STORAGE_KEY = 'cypher_premium_status'

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false)
  const [premiumCollection, setPremiumCollection] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [ethAddress, setEthAddress] = useState<string | null>(null)

  // Restore premium status from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem(PREMIUM_STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.isPremium) {
          setIsPremium(true)
          setPremiumCollection(parsed.premiumCollection ?? null)
          setEthAddress(parsed.ethAddress ?? null)
        }
      } catch {
        localStorage.removeItem(PREMIUM_STORAGE_KEY)
      }
    }
  }, [])

  // Persist premium status whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isPremium) {
      localStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify({
        isPremium: true,
        premiumCollection,
        ethAddress,
      }))
    } else {
      localStorage.removeItem(PREMIUM_STORAGE_KEY)
    }
  }, [isPremium, premiumCollection, ethAddress])

  // Listen for wallet events (BTC + ETH)
  useEffect(() => {
    const handleWalletConnected = (event: CustomEvent) => {
      if (event.detail?.isPremium) {
        setIsPremium(true)
        if (event.detail?.premiumCollection) {
          setPremiumCollection(event.detail.premiumCollection)
        }
      }
    }

    const handleWalletDisconnected = () => {
      setIsPremium(false)
      setPremiumCollection(null)
    }

    const handleEthWalletConnected = (event: CustomEvent) => {
      if (event.detail?.address) {
        setEthAddress(event.detail.address)
      }
    }

    const handleEthWalletDisconnected = () => {
      setEthAddress(null)
      // Only clear premium if it came from ETH wallet
      if (premiumCollection === 'YIELD HACKER PASS') {
        setIsPremium(false)
        setPremiumCollection(null)
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
  }, [premiumCollection])

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        setIsPremium,
        premiumCollection,
        setPremiumCollection,
        isVerifying,
        setIsVerifying,
        ethAddress,
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
