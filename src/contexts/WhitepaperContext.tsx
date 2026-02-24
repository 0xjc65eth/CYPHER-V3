'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface WhitepaperContextType {
  hasAccepted: boolean
  isLoading: boolean
  acceptWhitepaper: () => void
}

const WhitepaperContext = createContext<WhitepaperContextType>({
  hasAccepted: false,
  isLoading: true,
  acceptWhitepaper: () => {},
})

const STORAGE_KEY = 'cypher_whitepaper_accepted'
const WHITEPAPER_VERSION = '2.0'

export function WhitepaperProvider({ children }: { children: React.ReactNode }) {
  // Start with consistent values for SSR and hydration (both false/true)
  const [hasAccepted, setHasAccepted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Read localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === WHITEPAPER_VERSION) {
        setHasAccepted(true)
      }
    } catch {
      // localStorage unavailable
    }
    setIsLoading(false)
  }, [])

  // Safety timeout — if useEffect somehow never fires, unblock after 3s
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) console.warn('[CYPHER] WhitepaperProvider: safety timeout triggered')
        return false
      })
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  const acceptWhitepaper = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, WHITEPAPER_VERSION)
    } catch {
      // localStorage unavailable
    }
    setHasAccepted(true)
  }, [])

  return (
    <WhitepaperContext.Provider value={{ hasAccepted, isLoading, acceptWhitepaper }}>
      {children}
    </WhitepaperContext.Provider>
  )
}

export function useWhitepaper() {
  return useContext(WhitepaperContext)
}
