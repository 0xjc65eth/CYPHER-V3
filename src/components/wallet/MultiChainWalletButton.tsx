'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'
import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi'
import { formatEther } from 'viem'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { useToast } from '../ui/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  Wallet,
  ChevronDown,
  Copy,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Power,
  Settings,
  History,
  Network,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  WifiOff
} from 'lucide-react'
import { SUPPORTED_EVM_CHAINS, SUPPORTED_SOLANA_CHAINS } from '../../services/MultiChainWallet.js'

interface MultiChainWalletButtonProps {
  variant?: 'default' | 'compact' | 'minimal' | 'full'
  showBalance?: boolean
  showChainSwitcher?: boolean
  showNetworkStatus?: boolean
  className?: string
  onBalanceUpdate?: (balance: number) => void
  onNetworkChange?: (chainId: number | string) => void
}

interface ChainBalance {
  chainId: number | string
  chainName: string
  balance: string
  formattedBalance: string
  currency: string
  explorerUrl: string
  icon?: string
  color?: string
  coingeckoId?: string
  usdValue?: number
}

interface NetworkStatus {
  connected: boolean
  latency?: number
  blockHeight?: number
  lastUpdate?: number
}

export const MultiChainWalletButton: React.FC<MultiChainWalletButtonProps> = ({
  variant = 'default',
  showBalance = true,
  showChainSwitcher = true,
  showNetworkStatus = true,
  className = '',
  onBalanceUpdate,
  onNetworkChange
}) => {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { caipNetwork } = useAppKitNetwork()
  const { toast } = useToast()

  // Wagmi hooks for EVM chains
  const { address: wagmiAddress } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  // State management
  const [balances, setBalances] = useState<ChainBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({ connected: false })
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0)
  const [portfolioChange, setPortfolioChange] = useState(0)
  const [hideBalance, setHideBalance] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval>>()

  // Get current chain information
  const getCurrentChain = () => {
    if ((caipNetwork as any)?.chainNamespace === 'eip155') {
      return SUPPORTED_EVM_CHAINS.find(chain => chain.id === chainId)
    } else if ((caipNetwork as any)?.chainNamespace === 'solana') {
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

  // Fetch all balances across chains
  const fetchAllBalances = async () => {
    const walletAddress = address || wagmiAddress
    if (!walletAddress) return

    setLoading(true)
    try {
      // Build balances from current EVM balance since the service doesn't expose getAllBalances
      const currentBalances: ChainBalance[] = []

      if (evmBalance && currentChain) {
        currentBalances.push({
          chainId: chainId,
          chainName: (currentChain as any).name || 'Unknown',
          balance: evmBalance.value.toString(),
          formattedBalance: formatEther(evmBalance.value),
          currency: (currentChain as any).currency || 'ETH',
          explorerUrl: (currentChain as any).explorerUrl || '',
          usdValue: 0
        })
      }

      setBalances(currentBalances)

      // Calculate simple portfolio value
      const totalValue = currentBalances.reduce((sum, b) => sum + (b.usdValue || 0), 0)
      setTotalPortfolioValue(totalValue)
      setPortfolioChange(0)

      onBalanceUpdate?.(totalValue)

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

  // Refresh balances
  const refreshBalances = async () => {
    setRefreshing(true)
    await fetchAllBalances()
    await refetchBalance?.()
    setRefreshing(false)

    toast({
      title: 'Balances updated',
      description: 'Wallet balances have been refreshed',
    })
  }

  // Monitor network status
  const checkNetworkStatus = async () => {
    if (!currentChain) return

    try {
      const start = Date.now()
      const response = await fetch((currentChain as any).rpcUrl || '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      })

      const latency = Date.now() - start
      const data = await response.json()

      setNetworkStatus({
        connected: response.ok,
        latency,
        blockHeight: data.result ? parseInt(data.result, 16) : undefined,
        lastUpdate: Date.now()
      })
    } catch (error) {
      setNetworkStatus({ connected: false, lastUpdate: Date.now() })
    }
  }

  // Switch network handler
  const handleNetworkSwitch = async (newChainId: number) => {
    if (!switchChain) return

    try {
      await switchChain({ chainId: newChainId })
      onNetworkChange?.(newChainId)

      toast({
        title: 'Network switched',
        description: `Switched to ${SUPPORTED_EVM_CHAINS.find(c => c.id === newChainId)?.name}`,
      })
    } catch (error) {
      console.error('Error switching network:', error)
      toast({
        title: 'Network switch failed',
        description: 'Failed to switch network. Please try again.',
        variant: 'destructive'
      })
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

  // Open blockchain explorer
  const openExplorer = () => {
    if (currentChain && (address || wagmiAddress)) {
      const addressToShow = address || wagmiAddress
      window.open(`${(currentChain as any).explorerUrl}/address/${addressToShow}`, '_blank')
    }
  }

  // Disconnect wallet
  const handleDisconnect = async () => {
    try {
      await open({ view: 'Account' })
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
    }
  }

  // Format balance display
  const formatBalance = (balance: string, hideValue = false) => {
    if (hideValue) return '••••••'
    const num = parseFloat(balance)
    if (num === 0) return '0'
    if (num < 0.001) return '<0.001'
    if (num < 1) return num.toFixed(4)
    if (num < 1000) return num.toFixed(3)
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`
    return `${(num / 1000000).toFixed(1)}M`
  }

  // Format USD value
  const formatUSDValue = (value: number, hideValue = false) => {
    if (hideValue) return '••••••'
    if (value === 0) return '$0'
    if (value < 0.01) return '<$0.01'
    if (value < 1000) return `$${value.toFixed(2)}`
    if (value < 1000000) return `$${(value / 1000).toFixed(1)}K`
    return `$${(value / 1000000).toFixed(1)}M`
  }

  // Effects
  useEffect(() => {
    if (isConnected && (address || wagmiAddress)) {
      fetchAllBalances()

      // Set up periodic refresh
      refreshIntervalRef.current = setInterval(fetchAllBalances, 30000) // 30 seconds

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
      }
    }
  }, [isConnected, address, wagmiAddress, chainId])

  useEffect(() => {
    if (showNetworkStatus && currentChain) {
      checkNetworkStatus()
      const statusInterval = setInterval(checkNetworkStatus, 15000) // 15 seconds

      return () => clearInterval(statusInterval)
    }
  }, [currentChain, showNetworkStatus])

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Render disconnected state
  if (!isConnected) {
    return (
      <Button
        onClick={() => open()}
        className={`${className} flex items-center space-x-2`}
        variant={variant === 'minimal' ? 'outline' : 'default'}
      >
        <Wallet className="h-4 w-4" />
        <span>Connect Wallet</span>
      </Button>
    )
  }

  // Render minimal variant
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showNetworkStatus && (
          <div className={`w-2 h-2 rounded-full ${networkStatus.connected ? 'bg-green-500' : 'bg-red-500'}`} />
        )}
        <Button variant="outline" size="sm" onClick={() => open()}>
          <Wallet className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Render compact variant
  if (variant === 'compact') {
    return (
      <div ref={dropdownRef} className={`relative ${className}`}>
        <Button
          variant="outline"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-2"
        >
          {showNetworkStatus && (
            <div className={`w-2 h-2 rounded-full ${networkStatus.connected ? 'bg-green-500' : 'bg-red-500'}`} />
          )}
          {currentChain && (
            <Badge variant="secondary" className="text-xs">
              {(currentChain as any).name}
            </Badge>
          )}
          {showBalance && evmBalance && (
            <span className="text-sm font-medium">
              {formatBalance(formatEther(evmBalance.value), hideBalance)} {(currentChain as any)?.currency}
            </span>
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>

        {showDropdown && (
          <Card className="absolute top-full mt-1 right-0 z-50 w-80">
            <CardContent className="p-4">
              {/* Quick actions */}
              <div className="flex justify-between items-center mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHideBalance(!hideBalance)}
                >
                  {hideBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshBalances}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={copyAddress}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={openExplorer}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Portfolio summary */}
              <div className="text-center mb-4">
                <p className="text-2xl font-bold">
                  {formatUSDValue(totalPortfolioValue, hideBalance)}
                </p>
                <div className="flex items-center justify-center space-x-1">
                  {portfolioChange >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm ${portfolioChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {portfolioChange.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Chain switcher */}
              {showChainSwitcher && (
                <>
                  <Separator className="my-3" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Switch Network</p>
                    <div className="grid grid-cols-2 gap-2">
                      {SUPPORTED_EVM_CHAINS.slice(0, 4).map((chain) => (
                        <Button
                          key={chain.id}
                          variant={chain.id === chainId ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleNetworkSwitch(chain.id)}
                          disabled={isSwitching}
                          className="text-xs"
                        >
                          {chain.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator className="my-3" />

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => open({ view: 'Account' })}>
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </Button>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  <Power className="h-4 w-4 mr-1" />
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Render full variant (default)
  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Multi-Chain Wallet</span>
            {showNetworkStatus && (
              <div className="flex items-center space-x-1">
                {networkStatus.connected ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                {networkStatus.latency && (
                  <span className="text-xs text-muted-foreground">
                    {networkStatus.latency}ms
                  </span>
                )}
              </div>
            )}
          </CardTitle>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHideBalance(!hideBalance)}
            >
              {hideBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshBalances}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current network info */}
        {currentChain && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: (currentChain as any).color }}
              />
              <div>
                <p className="font-medium">{(currentChain as any).name}</p>
                <p className="text-sm text-muted-foreground">Active Network</p>
              </div>
            </div>
            {evmBalance && (
              <div className="text-right">
                <p className="font-bold">
                  {formatBalance(formatEther(evmBalance.value), hideBalance)} {(currentChain as any).currency}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatUSDValue(0, hideBalance)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Portfolio summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted rounded-lg text-center">
            <DollarSign className="h-4 w-4 mx-auto mb-1 text-green-600" />
            <p className="text-sm font-medium">Total Value</p>
            <p className="text-lg font-bold">
              {formatUSDValue(totalPortfolioValue, hideBalance)}
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg text-center">
            {portfolioChange >= 0 ? (
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 mx-auto mb-1 text-red-600" />
            )}
            <p className="text-sm font-medium">24h Change</p>
            <p className={`text-lg font-bold ${portfolioChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {hideBalance ? '••••••' : `${portfolioChange.toFixed(2)}%`}
            </p>
          </div>
        </div>

        <Separator />

        {/* Chain switcher */}
        {showChainSwitcher && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center">
              <Network className="h-4 w-4 mr-1" />
              Switch Network
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {SUPPORTED_EVM_CHAINS.map((chain) => (
                <Button
                  key={chain.id}
                  variant={chain.id === chainId ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleNetworkSwitch(chain.id)}
                  disabled={isSwitching}
                  className="flex items-center space-x-2"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: (chain as any).color }}
                  />
                  <span className="text-xs">{chain.name}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Wallet address */}
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

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => open({ view: 'Account' })}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => open({ view: 'AllWallets' })}>
            <History className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleDisconnect}>
            <Power className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default MultiChainWalletButton