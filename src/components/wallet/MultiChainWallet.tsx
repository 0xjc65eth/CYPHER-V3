'use client'

import React, { useState, useEffect } from 'react'
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'
import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi'
import { formatEther } from 'viem'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { useToast } from '../ui/use-toast'
import { 
  Wallet, 
  ChevronDown, 
  Copy, 
  ExternalLink, 
  RefreshCw,
  TrendingUp,
  DollarSign,
  Zap
} from 'lucide-react'
import { SUPPORTED_EVM_CHAINS, SUPPORTED_SOLANA_CHAINS } from '../../config/web3modal.config'
// Stub for multiChainWalletService - original import was removed due to issues
const multiChainWalletService: any = {
  getAllBalances: async (_address: string) => [],
  getPrice: (_id: string) => ({ price: 0 }),
  calculatePortfolioValue: (_balances: any[]) => ({ totalValue: 0 }),
};

interface ChainBalance {
  chainId: number | string
  chainName: string
  balance: string
  formattedBalance: string
  currency: string
  usdValue?: number
  explorerUrl: string
}

interface MultiChainWalletProps {
  showPortfolio?: boolean
  compact?: boolean
  onBalanceUpdate?: (totalBalance: number) => void
}

export const MultiChainWallet: React.FC<MultiChainWalletProps> = ({
  showPortfolio = true,
  compact = false,
  onBalanceUpdate
}) => {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { caipNetwork } = useAppKitNetwork()
  const { toast } = useToast()
  
  // Wagmi hooks for EVM chains
  const { address: wagmiAddress } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  
  // State
  const [balances, setBalances] = useState<ChainBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [showAllChains, setShowAllChains] = useState(false)
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0)
  
  // Get current chain info
  const getCurrentChain = () => {
    if (caipNetwork?.chainNamespace === 'eip155') {
      return SUPPORTED_EVM_CHAINS.find(chain => chain.id === chainId)
    } else if (caipNetwork?.chainNamespace === 'solana') {
      return SUPPORTED_SOLANA_CHAINS[0]
    }
    return null
  }
  
  const currentChain = getCurrentChain()
  
  // Get balance for current EVM chain
  const { data: evmBalance, refetch: refetchBalance } = useBalance({
    address: wagmiAddress,
    chainId: chainId,
  })
  
  // Fetch balances for all supported chains
  const fetchAllBalances = async () => {
    const walletAddress = address || wagmiAddress
    if (!walletAddress) return
    
    setLoading(true)
    try {
      // Use the new service to fetch all balances
      const allBalances = await multiChainWalletService.getAllBalances(walletAddress)
      
      // Calculate USD values using the service
      const balancesWithUSD = allBalances.map((balance: any) => {
        const price = multiChainWalletService.getPrice(balance.coingeckoId || '')
        const usdValue = parseFloat(balance.formattedBalance) * price.price
        return {
          ...balance,
          usdValue
        }
      })

      setBalances(balancesWithUSD)
      
      // Calculate portfolio metrics using the service
      const portfolio = multiChainWalletService.calculatePortfolioValue(balancesWithUSD)
      setTotalPortfolioValue(portfolio.totalValue)
      onBalanceUpdate?.(portfolio.totalValue)
      
    } catch (error) {
      console.error('Error fetching balances:', error)
      toast({
        title: 'Error fetching balances',
        description: 'Failed to load wallet balances. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Copy address to clipboard
  const copyAddress = async () => {
    const addressToCopy = address || wagmiAddress
    if (addressToCopy) {
      await navigator.clipboard.writeText(addressToCopy)
      toast({
        title: 'Address copied',
        description: 'Wallet address copied to clipboard'
      })
    }
  }
  
  // Switch network
  const handleNetworkSwitch = (chainId: number) => {
    if (switchChain) {
      switchChain({ chainId })
    }
  }
  
  // Open explorer
  const openExplorer = () => {
    if (currentChain && (address || wagmiAddress)) {
      const addressToShow = address || wagmiAddress
      const explorerUrl = (currentChain as any).explorerUrl || (currentChain as any).blockExplorers?.default?.url || '';
      window.open(`${explorerUrl}/address/${addressToShow}`, '_blank')
    }
  }
  
  // Effects
  useEffect(() => {
    if (isConnected && (address || wagmiAddress)) {
      fetchAllBalances()
    }
  }, [isConnected, address, wagmiAddress, chainId, evmBalance])
  
  // Render disconnected state
  if (!isConnected) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connect to access multi-chain portfolio and trading features
          </p>
          <Button onClick={() => open()} className="w-full">
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
    )
  }
  
  // Render compact view
  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span>{currentChain?.name || 'Unknown'}</span>
        </Badge>
        <Button variant="outline" size="sm" onClick={() => open()}>
          <Wallet className="h-4 w-4" />
        </Button>
      </div>
    )
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Multi-Chain Wallet</span>
            {currentChain && (
              <Badge variant="secondary">{currentChain.name}</Badge>
            )}
          </CardTitle>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAllBalances}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => open()}>
              Settings
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Wallet Address */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Connected Address</p>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {address || wagmiAddress}
            </p>
          </div>
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" onClick={copyAddress}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={openExplorer}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Portfolio Summary */}
        {showPortfolio && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded-lg text-center">
              <DollarSign className="h-4 w-4 mx-auto mb-1 text-green-600" />
              <p className="text-sm font-medium">Total Value</p>
              <p className="text-lg font-bold">${totalPortfolioValue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-blue-600" />
              <p className="text-sm font-medium">Networks</p>
              <p className="text-lg font-bold">{balances.length}</p>
            </div>
          </div>
        )}
        
        <Separator />
        
        {/* Current Chain Balance */}
        {currentChain && evmBalance && (
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{currentChain.name}</p>
                  <p className="text-sm text-muted-foreground">Primary Chain</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">
                  {parseFloat(formatEther(evmBalance.value)).toFixed(4)} {(currentChain as any).currency || (currentChain as any).nativeCurrency?.symbol || ''}
                </p>
                <p className="text-sm text-muted-foreground">
                  ${(parseFloat(formatEther(evmBalance.value)) * 3000).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* All Chain Balances */}
        {showAllChains && balances.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">All Network Balances</h4>
            {balances.map((balance) => (
              <div key={balance.chainId} className="flex items-center justify-between p-2 rounded border">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-muted rounded-full" />
                  <span className="text-sm">{balance.chainName}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {balance.formattedBalance} {balance.currency}
                  </p>
                  {balance.usdValue && (
                    <p className="text-xs text-muted-foreground">
                      ${balance.usdValue.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Toggle All Chains */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowAllChains(!showAllChains)}
        >
          <ChevronDown className={`h-4 w-4 mr-2 transform transition-transform ${showAllChains ? 'rotate-180' : ''}`} />
          {showAllChains ? 'Hide' : 'Show'} All Networks
        </Button>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => open({ view: 'Networks' })}>
            Switch Network
          </Button>
          <Button variant="outline" size="sm" onClick={() => open({ view: 'Account' })}>
            Account Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default MultiChainWallet