'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useBalance, useChainId } from 'wagmi'
import { useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'
import { formatEther, parseEther } from 'viem'
import { SUPPORTED_EVM_CHAINS, SUPPORTED_SOLANA_CHAINS } from '../../config/web3modal.config'

// Types
interface ChainBalance {
  chainId: number | string
  chainName: string
  symbol: string
  balance: string
  formattedBalance: string
  usdValue: number
  lastUpdated: Date
  error?: string
}

interface BalanceState {
  balances: ChainBalance[]
  totalValue: number
  isLoading: boolean
  error: string | null
  lastRefresh: Date | null
}

interface UseMultiChainBalanceOptions {
  enableRealTime?: boolean
  updateInterval?: number
  enablePriceData?: boolean
  onBalanceChange?: (balances: ChainBalance[]) => void
  onError?: (error: string) => void
}

// FALLBACK: Static placeholder prices used for USD value estimation.
// Replace with real price feed from CoinGecko /api/coingecko/simple/price
const FALLBACK_PRICES: Record<string, number> = {
  ETH: 0,
  MATIC: 0,
  SOL: 0,
  BTC: 0
}

export const useMultiChainBalance = (options: UseMultiChainBalanceOptions = {}) => {
  const {
    enableRealTime = true,
    updateInterval = 30000, // 30 seconds
    enablePriceData = true,
    onBalanceChange,
    onError
  } = options

  // Wagmi hooks for EVM
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()
  const chainId = useChainId()
  const { data: currentBalance, refetch: refetchCurrentBalance } = useBalance({
    address: wagmiAddress,
    query: { enabled: !!wagmiAddress }
  })

  // AppKit hooks for multi-chain
  const { address: appKitAddress, isConnected: appKitConnected } = useAppKitAccount()
  const { caipNetwork } = useAppKitNetwork()

  // State
  const [balanceState, setBalanceState] = useState<BalanceState>({
    balances: [],
    totalValue: 0,
    isLoading: false,
    error: null,
    lastRefresh: null
  })

  // Refs for managing intervals
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchRef = useRef<Date | null>(null)

  // Get current address
  const currentAddress = wagmiAddress || appKitAddress

  // Fetch balance for a specific EVM chain
  const fetchEVMBalance = async (chain: typeof SUPPORTED_EVM_CHAINS[0], address: string): Promise<ChainBalance | null> => {
    try {
      // For current chain, use wagmi data if available
      if (chain.id === chainId && currentBalance) {
        const formatted = formatEther(currentBalance.value)
        const usdValue = enablePriceData ? parseFloat(formatted) * (FALLBACK_PRICES[chain.currency] || 0) : 0
        
        return {
          chainId: chain.id,
          chainName: chain.name,
          symbol: chain.currency,
          balance: currentBalance.value.toString(),
          formattedBalance: parseFloat(formatted).toFixed(6),
          usdValue,
          lastUpdated: new Date()
        }
      }

      // For other chains, we would need to make RPC calls
      // This is a simplified implementation
      return {
        chainId: chain.id,
        chainName: chain.name,
        symbol: chain.currency,
        balance: '0',
        formattedBalance: '0.000000',
        usdValue: 0,
        lastUpdated: new Date()
      }
    } catch (error) {
      console.error(`Error fetching balance for ${chain.name}:`, error)
      return {
        chainId: chain.id,
        chainName: chain.name,
        symbol: chain.currency,
        balance: '0',
        formattedBalance: '0.000000',
        usdValue: 0,
        lastUpdated: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Fetch Solana balance
  const fetchSolanaBalance = async (address: string): Promise<ChainBalance | null> => {
    try {
      // FALLBACK: Replace with real @solana/web3.js balance fetch
      // Returns zero balance until Solana integration is complete
      return {
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        chainName: 'Solana',
        symbol: 'SOL',
        balance: '0',
        formattedBalance: '0.000000',
        usdValue: 0,
        lastUpdated: new Date()
      }
    } catch (error) {
      console.error('Error fetching Solana balance:', error)
      return {
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        chainName: 'Solana',
        symbol: 'SOL',
        balance: '0',
        formattedBalance: '0.000000',
        usdValue: 0,
        lastUpdated: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Fetch all balances
  const fetchAllBalances = useCallback(async () => {
    if (!currentAddress) {
      setBalanceState(prev => ({
        ...prev,
        balances: [],
        totalValue: 0,
        isLoading: false,
        error: null
      }))
      return
    }

    setBalanceState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const newBalances: ChainBalance[] = []

      // Fetch EVM balances
      for (const chain of SUPPORTED_EVM_CHAINS) {
        const balance = await fetchEVMBalance(chain, currentAddress)
        if (balance) {
          newBalances.push(balance)
        }
      }

      // Fetch Solana balance if connected to Solana
      if (caipNetwork?.chainNamespace === 'solana' || appKitConnected) {
        const solanaBalance = await fetchSolanaBalance(currentAddress)
        if (solanaBalance) {
          newBalances.push(solanaBalance)
        }
      }

      // Calculate total value
      const totalValue = newBalances.reduce((sum, balance) => sum + balance.usdValue, 0)

      const newState = {
        balances: newBalances,
        totalValue,
        isLoading: false,
        error: null,
        lastRefresh: new Date()
      }

      setBalanceState(newState)
      lastFetchRef.current = new Date()

      // Trigger callbacks
      onBalanceChange?.(newBalances)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch balances'
      setBalanceState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
      onError?.(errorMessage)
    }
  }, [currentAddress, chainId, currentBalance, caipNetwork, enablePriceData, onBalanceChange, onError])

  // Manual refresh function
  const refresh = useCallback(() => {
    return fetchAllBalances()
  }, [fetchAllBalances])

  // Force refresh with loading state
  const forceRefresh = useCallback(async () => {
    setBalanceState(prev => ({ ...prev, isLoading: true }))
    await fetchAllBalances()
  }, [fetchAllBalances])

  // Get balance for specific chain
  const getChainBalance = useCallback((chainId: number | string) => {
    return balanceState.balances.find(balance => balance.chainId === chainId)
  }, [balanceState.balances])

  // Get balances by type
  const getEVMBalances = useCallback(() => {
    return balanceState.balances.filter(balance => typeof balance.chainId === 'number')
  }, [balanceState.balances])

  const getSolanaBalance = useCallback(() => {
    return balanceState.balances.find(balance => typeof balance.chainId === 'string' && balance.chainId.includes('solana'))
  }, [balanceState.balances])

  // Setup real-time updates
  useEffect(() => {
    if (!enableRealTime) return

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Set up new interval
    if (currentAddress) {
      intervalRef.current = setInterval(() => {
        fetchAllBalances()
      }, updateInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enableRealTime, updateInterval, currentAddress, fetchAllBalances])

  // Initial fetch when address changes
  useEffect(() => {
    if (currentAddress) {
      fetchAllBalances()
    }
  }, [currentAddress, fetchAllBalances])

  // Refetch when current balance updates (from wagmi)
  useEffect(() => {
    if (currentBalance && wagmiConnected) {
      fetchAllBalances()
    }
  }, [currentBalance, wagmiConnected, fetchAllBalances])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    // State
    balances: balanceState.balances,
    totalValue: balanceState.totalValue,
    isLoading: balanceState.isLoading,
    error: balanceState.error,
    lastRefresh: balanceState.lastRefresh,

    // Methods
    refresh,
    forceRefresh,
    getChainBalance,
    getEVMBalances,
    getSolanaBalance,

    // Connection states
    isConnected: !!(wagmiConnected || appKitConnected),
    currentAddress,
    currentChainId: chainId,
    
    // Real-time status
    isRealTimeEnabled: enableRealTime,
    updateInterval
  }
}

// Specialized hook for portfolio tracking
export const usePortfolioBalance = (options?: UseMultiChainBalanceOptions) => {
  const balance = useMultiChainBalance({
    enablePriceData: true,
    enableRealTime: true,
    updateInterval: 15000, // 15 seconds for portfolio
    ...options
  })

  // Calculate portfolio metrics
  const portfolioMetrics = {
    totalValue: balance.totalValue,
    evmValue: balance.getEVMBalances().reduce((sum, b) => sum + b.usdValue, 0),
    solanaValue: balance.getSolanaBalance()?.usdValue || 0,
    chainCount: balance.balances.length,
    nonZeroBalances: balance.balances.filter(b => parseFloat(b.formattedBalance) > 0),
    distribution: balance.balances.map(b => ({
      name: b.chainName,
      value: b.usdValue,
      percentage: balance.totalValue > 0 ? (b.usdValue / balance.totalValue) * 100 : 0
    }))
  }

  return {
    ...balance,
    portfolioMetrics
  }
}

export default useMultiChainBalance