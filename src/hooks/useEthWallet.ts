'use client'

import { useState, useCallback, useEffect } from 'react'
import { BrowserProvider } from 'ethers'

interface EthWalletState {
  address: string | null
  isConnected: boolean
  chainId: number | null
  connecting: boolean
}

const STORAGE_KEY = 'cypher_eth_wallet'

export function useEthWallet() {
  const [state, setState] = useState<EthWalletState>({
    address: null,
    isConnected: false,
    chainId: null,
    connecting: false,
  })

  // Restore from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.address) {
          setState({
            address: parsed.address,
            isConnected: true,
            chainId: parsed.chainId ?? null,
            connecting: false,
          })
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  // Listen for account/chain changes from MetaMask
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return
    const eth = window.ethereum as {
      on: (event: string, handler: (...args: any[]) => void) => void
      removeListener: (event: string, handler: (...args: any[]) => void) => void
    }

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectEth()
      } else {
        const newAddress = accounts[0]
        setState(prev => ({ ...prev, address: newAddress }))
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ address: newAddress, chainId: state.chainId }))

        // Dispatch event so PremiumContext picks it up
        window.dispatchEvent(new CustomEvent('ethWalletConnected', {
          detail: { address: newAddress }
        }))
      }
    }

    const handleChainChanged = (chainIdHex: string) => {
      const chainId = parseInt(chainIdHex, 16)
      setState(prev => ({ ...prev, chainId }))
    }

    eth.on('accountsChanged', handleAccountsChanged)
    eth.on('chainChanged', handleChainChanged)

    return () => {
      eth.removeListener('accountsChanged', handleAccountsChanged)
      eth.removeListener('chainChanged', handleChainChanged)
    }
  }, [state.chainId])

  const connectEth = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask to connect your Ethereum wallet.')
    }

    setState(prev => ({ ...prev, connecting: true }))

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = new BrowserProvider(window.ethereum as any)
      const accounts = await provider.send('eth_requestAccounts', [])
      const address = accounts[0] as string
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)

      setState({
        address,
        isConnected: true,
        chainId,
        connecting: false,
      })

      localStorage.setItem(STORAGE_KEY, JSON.stringify({ address, chainId }))

      // Dispatch event for PremiumContext
      window.dispatchEvent(new CustomEvent('ethWalletConnected', {
        detail: { address }
      }))

      return address
    } catch (error) {
      setState(prev => ({ ...prev, connecting: false }))
      throw error
    }
  }, [])

  const disconnectEth = useCallback(() => {
    setState({
      address: null,
      isConnected: false,
      chainId: null,
      connecting: false,
    })

    localStorage.removeItem(STORAGE_KEY)

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ethWalletDisconnected'))
    }
  }, [])

  return {
    ...state,
    connectEth,
    disconnectEth,
  }
}
