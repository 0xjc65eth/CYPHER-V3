'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { walletService } from '@/services/WalletService'
import type { WalletType } from '@/services/WalletService'

// LaserEyes-compatible context interface (proxied to WalletContext)
interface LaserEyesContextType {
  connect: (provider: string) => Promise<void>
  disconnect: () => Promise<void>
  connected: boolean
  connecting: boolean
  address: string | null
  ordinalsAddress: string | null
  balance: { confirmed: number; unconfirmed: number; total: number } | null
  provider: string | null
  signature: string | null
  verified: boolean
  getOrdinals: (address: string) => Promise<any[]>
  getInscriptions: () => Promise<any[]>
}

const LaserEyesContext = createContext<LaserEyesContextType | null>(null)

// Map LaserEyes wallet provider constants to WalletService types
function mapProviderToWalletType(provider: string): WalletType | null {
  const normalized = String(provider).toLowerCase()
  if (normalized === 'unisat') return 'unisat'
  if (normalized === 'xverse') return 'xverse'
  // Magic Eden, OYL, Leather, Wizz, Phantom, Orange all use sats-connect (xverse path)
  if (['magic eden', 'magic-eden', 'oyl', 'leather', 'wizz', 'phantom', 'orange'].includes(normalized)) {
    return 'xverse'
  }
  return null
}

export function LaserEyesProvider({ children }: { children: ReactNode }) {
  // Read wallet state from WalletContext (single subscription)
  const { walletInfo, isConnecting, connect: walletConnect, disconnect: walletDisconnect } = useWallet()
  const [localConnecting, setLocalConnecting] = useState(false)

  const connect = useCallback(async (provider: string) => {
    setLocalConnecting(true)
    try {
      const walletType = mapProviderToWalletType(provider)
      if (!walletType) {
        throw new Error(`Unsupported wallet provider: ${provider}`)
      }
      await walletConnect(walletType)
    } finally {
      setLocalConnecting(false)
    }
  }, [walletConnect])

  const disconnect = useCallback(async () => {
    walletDisconnect()
  }, [walletDisconnect])

  const getOrdinals = useCallback(async (addr: string) => {
    if (!addr) return [];
    try {
      const baseUrl = process.env.NEXT_PUBLIC_HIRO_API_URL || 'https://api.hiro.so';
      const res = await fetch(
        `${baseUrl}/ordinals/v1/inscriptions?address=${encodeURIComponent(addr)}&limit=60`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
        }
      );
      if (!res.ok) return [];
      const data = await res.json();
      // Map Hiro response to the shape expected by premium verification
      return (data.results || []).map((ins: any) => ({
        id: ins.id,
        number: ins.number,
        content_type: ins.content_type,
        collection: ins.metadata?.collection?.name || '',
      }));
    } catch {
      return [];
    }
  }, [])

  const getInscriptions = useCallback(async () => {
    // Use the connected ordinals address
    const addr = walletInfo.ordinalsAddress?.address;
    if (!addr) return [];
    return getOrdinals(addr);
  }, [getOrdinals, walletInfo.ordinalsAddress?.address])

  const value: LaserEyesContextType = {
    connect,
    disconnect,
    connected: walletInfo.connected,
    connecting: localConnecting || isConnecting,
    address: walletInfo.paymentAddress?.address ?? null,
    ordinalsAddress: walletInfo.ordinalsAddress?.address ?? null,
    balance: walletInfo.balance,
    provider: walletInfo.walletType,
    signature: walletInfo.signature,
    verified: walletInfo.verified,
    getOrdinals,
    getInscriptions,
  }

  return (
    <LaserEyesContext.Provider value={value}>
      {children}
    </LaserEyesContext.Provider>
  )
}

export function useLaserEyes() {
  const context = useContext(LaserEyesContext)
  if (!context) {
    throw new Error('useLaserEyes must be used within a LaserEyesProvider')
  }
  return context
}

// Re-export wallet provider constants so consumers don't need @omnisat/lasereyes-core
export const UNISAT = 'unisat'
export const XVERSE = 'xverse'
export const MAGIC_EDEN = 'magic eden'
export const OYL = 'oyl'
export const LEATHER = 'leather'
export const WIZZ = 'wizz'
export const PHANTOM = 'phantom'
export const ORANGE = 'orange'
