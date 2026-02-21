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
  const [hasAccepted, setHasAccepted] = useState(() => {
    // Initialize synchronously from localStorage to avoid flash
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(STORAGE_KEY) === WHITEPAPER_VERSION
      } catch {
        return false
      }
    }
    return false
  })
  const [isLoading, setIsLoading] = useState(() => {
    // If we're on the client, we can resolve immediately
    return typeof window === 'undefined'
  })

  useEffect(() => {
    // Ensure loading resolves on client mount
    setIsLoading(false)
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
