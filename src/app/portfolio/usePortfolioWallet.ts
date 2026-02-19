'use client'

import { useLaserEyes, XVERSE, UNISAT, OYL } from '@/providers/SimpleLaserEyesProvider'
import { useCallback, useState } from 'react'

export type WalletType = 'xverse' | 'unisat' | 'oyl'

export function usePortfolioWallet() {
  const { connect, disconnect, connected, address, balance, connecting } = useLaserEyes()
  const [error, setError] = useState<string | null>(null)

  const connectWallet = useCallback(async (walletType: WalletType) => {
    setError(null)
    
    try {
      let provider
      
      switch (walletType) {
        case 'xverse':
          provider = XVERSE
          break
        case 'unisat':
          provider = UNISAT
          break
        case 'oyl':
          provider = OYL
          break
        default:
          throw new Error('Unsupported wallet type')
      }

      await connect(provider)
      return true
    } catch (err) {
      console.error('Failed to connect wallet:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
      return false
    }
  }, [connect])

  const disconnectWallet = useCallback(async () => {
    try {
      await disconnect()
      setError(null)
    } catch (err) {
      console.error('Failed to disconnect:', err)
      setError(err instanceof Error ? err.message : 'Failed to disconnect')
    }
  }, [disconnect])

  return {
    connectWallet,
    disconnectWallet,
    connected,
    address,
    balance,
    connecting,
    error
  }
}