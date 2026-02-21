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
  const [hasAccepted, setHasAccepted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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
