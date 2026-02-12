'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { walletService, type WalletInfo, type WalletType, type Transaction } from '@/services/WalletService'

interface WalletContextValue {
  walletInfo: WalletInfo
  isConnecting: boolean
  error: string | null
  connect: (walletType?: WalletType) => Promise<void>
  disconnect: () => void
  refreshBalance: () => Promise<void>
  getTransactionHistory: () => Promise<Transaction[]>
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletInfo, setWalletInfo] = useState<WalletInfo>(walletService.getWalletInfo())
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to wallet changes
  useEffect(() => {
    const unsubscribe = walletService.subscribe((info) => {
      setWalletInfo(info)
    })

    return unsubscribe
  }, [])

  const connect = useCallback(async (walletType?: WalletType) => {
    setIsConnecting(true)
    setError(null)

    try {
      await walletService.connect(walletType)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet'
      setError(message)
      throw err
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    walletService.disconnect()
    setError(null)
  }, [])

  const refreshBalance = useCallback(async () => {
    try {
      await walletService.updateBalance()
    } catch (err) {
      console.error('Failed to refresh balance:', err)
    }
  }, [])

  const getTransactionHistory = useCallback(async () => {
    try {
      return await walletService.getTransactionHistory()
    } catch (err) {
      console.error('Failed to fetch transaction history:', err)
      return []
    }
  }, [])

  const value: WalletContextValue = {
    walletInfo,
    isConnecting,
    error,
    connect,
    disconnect,
    refreshBalance,
    getTransactionHistory,
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return context
}
