'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '../../config/web3modal.config'

// Types
interface ChainData {
  id: number | string
  name: string
  currency: string
  balance: string
  usdValue: number
  connected: boolean
  explorerUrl: string
}

interface SolanaData {
  address: string | null
  balance: number
  connected: boolean
  publicKey: string | null
}

interface MultiChainContextType {
  // EVM Chains
  evmChains: ChainData[]
  currentEvmChain: ChainData | null
  
  // Solana
  solana: SolanaData
  
  // Portfolio
  totalPortfolioValue: number
  totalBalance: number
  
  // Connection states
  isAnyWalletConnected: boolean
  connectedWallets: string[]
  
  // Methods
  refreshBalances: () => Promise<void>
  switchNetwork: (chainId: number) => Promise<void>
  disconnectWallet: (walletType: 'evm' | 'solana') => Promise<void>
  
  // Real-time updates
  balanceUpdateInterval: number
  setBalanceUpdateInterval: (interval: number) => void
}

// Context
const MultiChainContext = createContext<MultiChainContextType | undefined>(undefined)

// Hook
export const useMultiChain = () => {
  const context = useContext(MultiChainContext)
  if (!context) {
    throw new Error('useMultiChain must be used within a MultiChainProvider')
  }
  return context
}

// Provider Props
interface MultiChainProviderProps {
  children: ReactNode
  enableRealTimeUpdates?: boolean
  updateInterval?: number
}

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
})

export const MultiChainProvider: React.FC<MultiChainProviderProps> = ({
  children,
  enableRealTimeUpdates = true,
  updateInterval = 30000 // 30 seconds
}) => {
  // State
  const [evmChains, setEvmChains] = useState<ChainData[]>([])
  const [currentEvmChain, setCurrentEvmChain] = useState<ChainData | null>(null)
  const [solana, setSolana] = useState<SolanaData>({
    address: null,
    balance: 0,
    connected: false,
    publicKey: null
  })
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0)
  const [totalBalance, setTotalBalance] = useState(0)
  const [isAnyWalletConnected, setIsAnyWalletConnected] = useState(false)
  const [connectedWallets, setConnectedWallets] = useState<string[]>([])
  const [balanceUpdateInterval, setBalanceUpdateInterval] = useState(updateInterval)
  
  // Refresh all balances
  const refreshBalances = async () => {
    try {
      // This will be implemented to fetch from all connected chains
      
      // Mock implementation - replace with actual API calls
      const mockEvmChains: ChainData[] = [
        {
          id: 1,
          name: 'Ethereum',
          currency: 'ETH',
          balance: '0.0000',
          usdValue: 0,
          connected: false,
          explorerUrl: 'https://etherscan.io'
        },
        {
          id: 42161,
          name: 'Arbitrum',
          currency: 'ETH',
          balance: '0.0000',
          usdValue: 0,
          connected: false,
          explorerUrl: 'https://arbiscan.io'
        },
        {
          id: 137,
          name: 'Polygon',
          currency: 'MATIC',
          balance: '0.0000',
          usdValue: 0,
          connected: false,
          explorerUrl: 'https://polygonscan.com'
        },
        {
          id: 10,
          name: 'Optimism',
          currency: 'ETH',
          balance: '0.0000',
          usdValue: 0,
          connected: false,
          explorerUrl: 'https://optimistic.etherscan.io'
        },
        {
          id: 8453,
          name: 'Base',
          currency: 'ETH',
          balance: '0.0000',
          usdValue: 0,
          connected: false,
          explorerUrl: 'https://basescan.org'
        }
      ]
      
      setEvmChains(mockEvmChains)
      
      // Calculate totals
      const totalValue = mockEvmChains.reduce((sum, chain) => sum + chain.usdValue, 0) + solana.balance
      setTotalPortfolioValue(totalValue)
      setTotalBalance(totalValue)
      
      // Update connection status
      const connectedChains = mockEvmChains.filter(chain => chain.connected)
      const walletList = []
      if (connectedChains.length > 0) walletList.push('EVM')
      if (solana.connected) walletList.push('Solana')
      
      setConnectedWallets(walletList)
      setIsAnyWalletConnected(walletList.length > 0)
      
    } catch (error) {
      console.error('Error refreshing balances:', error)
    }
  }
  
  // Switch network (EVM only)
  const switchNetwork = async (chainId: number) => {
    try {
      // This will use wagmi's switchChain
      
      // Update current chain
      const chain = evmChains.find(c => c.id === chainId)
      if (chain) {
        setCurrentEvmChain(chain)
      }
    } catch (error) {
      console.error('Error switching network:', error)
    }
  }
  
  // Disconnect wallet
  const disconnectWallet = async (walletType: 'evm' | 'solana') => {
    try {
      if (walletType === 'evm') {
        // Disconnect EVM wallets
        setEvmChains(prev => prev.map(chain => ({ ...chain, connected: false })))
        setCurrentEvmChain(null)
      } else if (walletType === 'solana') {
        // Disconnect Solana wallet
        setSolana({
          address: null,
          balance: 0,
          connected: false,
          publicKey: null
        })
      }
      
      await refreshBalances()
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
    }
  }
  
  // Real-time balance updates
  useEffect(() => {
    if (!enableRealTimeUpdates) return
    
    const interval = setInterval(() => {
      if (isAnyWalletConnected) {
        refreshBalances()
      }
    }, balanceUpdateInterval)
    
    return () => clearInterval(interval)
  }, [enableRealTimeUpdates, balanceUpdateInterval, isAnyWalletConnected])
  
  // Initial load
  useEffect(() => {
    refreshBalances()
  }, [])
  
  const contextValue: MultiChainContextType = {
    evmChains,
    currentEvmChain,
    solana,
    totalPortfolioValue,
    totalBalance,
    isAnyWalletConnected,
    connectedWallets,
    refreshBalances,
    switchNetwork,
    disconnectWallet,
    balanceUpdateInterval,
    setBalanceUpdateInterval
  }
  
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MultiChainContext.Provider value={contextValue}>
          {children}
        </MultiChainContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

// Export hook for easy access
export { MultiChainContext }

// Portfolio Analytics Hook
export const usePortfolioAnalytics = () => {
  const { evmChains, solana, totalPortfolioValue } = useMultiChain()
  
  const analytics = {
    totalValue: totalPortfolioValue,
    evmValue: evmChains.reduce((sum, chain) => sum + chain.usdValue, 0),
    solanaValue: solana.balance,
    chainDistribution: evmChains.map(chain => ({
      name: chain.name,
      value: chain.usdValue,
      percentage: totalPortfolioValue > 0 ? (chain.usdValue / totalPortfolioValue) * 100 : 0
    })),
    connectedNetworks: evmChains.filter(chain => chain.connected).length + (solana.connected ? 1 : 0),
    totalNetworks: evmChains.length + 1 // +1 for Solana
  }
  
  return analytics
}

// Balance Monitoring Hook
export const useBalanceMonitor = (threshold = 0.01) => {
  const { evmChains, solana, refreshBalances } = useMultiChain()
  const [lowBalanceAlerts, setLowBalanceAlerts] = useState<string[]>([])
  
  useEffect(() => {
    const alerts: string[] = []
    
    // Check EVM chains
    evmChains.forEach(chain => {
      if (chain.connected && parseFloat(chain.balance) < threshold) {
        alerts.push(`Low ${chain.currency} balance on ${chain.name}`)
      }
    })
    
    // Check Solana
    if (solana.connected && solana.balance < threshold) {
      alerts.push('Low SOL balance on Solana')
    }
    
    setLowBalanceAlerts(alerts)
  }, [evmChains, solana, threshold])
  
  return {
    lowBalanceAlerts,
    hasLowBalances: lowBalanceAlerts.length > 0,
    refreshBalances
  }
}

export default MultiChainProvider