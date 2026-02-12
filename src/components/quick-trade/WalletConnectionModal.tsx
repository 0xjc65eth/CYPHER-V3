'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  X,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Download,
  RefreshCw,
  ChevronRight,
  Bitcoin,
  Zap
} from 'lucide-react'

import {
  MultichainWalletManager,
  WalletInfo,
  MultiWalletState,
  detectAvailableWallets,
  isWalletInstalled,
  getWalletDownloadLink
} from '@/lib/wallets/multichain'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface WalletOption {
  id: string
  name: string
  icon: React.ReactNode
  chainType: 'evm' | 'solana' | 'bitcoin'
  description: string
  isInstalled: boolean
  downloadUrl: string
  supportedNetworks: string[]
}

interface WalletConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  onWalletConnected: (walletInfo: WalletInfo) => void
  preferredChainType?: 'evm' | 'solana' | 'bitcoin'
}

const WalletConnectionModal: React.FC<WalletConnectionModalProps> = ({
  isOpen,
  onClose,
  onWalletConnected,
  preferredChainType
}) => {
  const [walletManager] = useState(() => new MultichainWalletManager())
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectedWallets, setConnectedWallets] = useState<MultiWalletState>({
    evm: null,
    solana: null,
    bitcoin: null,
    isAnyConnected: false,
    supportedChains: []
  })

  // Available wallet options
  const walletOptions: WalletOption[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: <Wallet className="w-6 h-6" />,
      chainType: 'evm',
      description: 'Ethereum, Arbitrum, Optimism, Base',
      isInstalled: isWalletInstalled('metamask'),
      downloadUrl: getWalletDownloadLink('metamask'),
      supportedNetworks: ['Ethereum', 'Arbitrum', 'Optimism', 'Base', 'Polygon']
    },
    {
      id: 'phantom',
      name: 'Phantom',
      icon: <div className="w-6 h-6 bg-purple-500 rounded" />,
      chainType: 'solana',
      description: 'Solana ecosystem',
      isInstalled: isWalletInstalled('phantom'),
      downloadUrl: getWalletDownloadLink('phantom'),
      supportedNetworks: ['Solana']
    },
    {
      id: 'unisat',
      name: 'Unisat',
      icon: <Bitcoin className="w-6 h-6" />,
      chainType: 'bitcoin',
      description: 'Bitcoin, Ordinals, Runes',
      isInstalled: isWalletInstalled('unisat'),
      downloadUrl: getWalletDownloadLink('unisat'),
      supportedNetworks: ['Bitcoin']
    },
    {
      id: 'xverse',
      name: 'Xverse',
      icon: <Bitcoin className="w-6 h-6" />,
      chainType: 'bitcoin',
      description: 'Bitcoin, Stacks, Ordinals',
      isInstalled: isWalletInstalled('xverse'),
      downloadUrl: getWalletDownloadLink('xverse'),
      supportedNetworks: ['Bitcoin', 'Stacks']
    }
  ]

  // Connect to specific wallet
  const connectWallet = async (walletOption: WalletOption) => {
    if (!walletOption.isInstalled) {
      window.open(walletOption.downloadUrl, '_blank')
      return
    }

    setConnecting(walletOption.id)
    setError(null)

    try {
      let walletInfo: WalletInfo | null = null

      switch (walletOption.chainType) {
        case 'evm':
          walletInfo = await walletManager.connectEVM()
          break
        case 'solana':
          walletInfo = await walletManager.connectSolana()
          break
        case 'bitcoin':
          walletInfo = await walletManager.connectBitcoin()
          break
      }

      if (walletInfo) {
        setConnectedWallets(prev => ({
          ...prev,
          [walletOption.chainType]: walletInfo,
          isAnyConnected: true
        }))
        onWalletConnected(walletInfo)
      } else {
        setError(`Failed to connect to ${walletOption.name}`)
      }
    } catch (error: any) {
      setError(error.message || `Failed to connect to ${walletOption.name}`)
    } finally {
      setConnecting(null)
    }
  }

  // Disconnect wallet
  const disconnectWallet = async (chainType: 'evm' | 'solana' | 'bitcoin') => {
    try {
      await walletManager.disconnectAll()
      setConnectedWallets(prev => ({
        ...prev,
        [chainType]: null,
        isAnyConnected: Object.values(prev).some(w => w && w !== prev[chainType])
      }))
    } catch (error) {
      console.error('Disconnect failed:', error)
    }
  }

  // Check available wallets on mount
  useEffect(() => {
    if (isOpen) {
      detectAvailableWallets()
    }
  }, [isOpen])

  // Auto-focus preferred chain type
  const sortedWallets = React.useMemo(() => {
    if (!preferredChainType) return walletOptions
    
    return walletOptions.sort((a, b) => {
      if (a.chainType === preferredChainType && b.chainType !== preferredChainType) return -1
      if (b.chainType === preferredChainType && a.chainType !== preferredChainType) return 1
      return 0
    })
  }, [preferredChainType])

  // Get chain type color
  const getChainColor = (chainType: 'evm' | 'solana' | 'bitcoin') => {
    const colors = {
      evm: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
      solana: 'text-purple-400 border-purple-500/20 bg-purple-500/10',
      bitcoin: 'text-orange-400 border-orange-500/20 bg-orange-500/10'
    }
    return colors[chainType] || colors.evm
  }

  const getChainIcon = (chainType: 'evm' | 'solana' | 'bitcoin') => {
    const icons = {
      evm: <Zap className="w-4 h-4" />,
      solana: <div className="w-4 h-4 bg-purple-500 rounded" />,
      bitcoin: <Bitcoin className="w-4 h-4" />
    }
    return icons[chainType]
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md mx-4"
      >
        <Card className="border-cyan-500/20 bg-gradient-to-br from-slate-900 to-slate-800">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <Wallet className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <CardTitle className="text-cyan-400">Connect Wallet</CardTitle>
                  <p className="text-sm text-slate-400 mt-1">
                    Choose your preferred wallet to start trading
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Connected Wallets Summary */}
            {connectedWallets.isAnyConnected && (
              <Card className="border-green-500/20 bg-green-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Connected Wallets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(connectedWallets).map(([chainType, wallet]) => {
                    if (!wallet || chainType === 'isAnyConnected' || chainType === 'supportedChains') return null
                    
                    return (
                      <div key={chainType} className="flex items-center justify-between p-2 bg-green-500/10 rounded">
                        <div className="flex items-center gap-2">
                          {getChainIcon(chainType as any)}
                          <div>
                            <div className="text-sm font-medium text-green-400">
                              {chainType.toUpperCase()}
                            </div>
                            <div className="text-xs text-green-300">
                              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => disconnectWallet(chainType as any)}
                          className="text-green-400 hover:text-green-300"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Preferred Chain Highlight */}
            {preferredChainType && (
              <Alert className="border-cyan-500/20 bg-cyan-500/5">
                <Zap className="w-4 h-4 text-cyan-400" />
                <AlertDescription className="text-cyan-400">
                  We recommend connecting a {preferredChainType.toUpperCase()} wallet for this trade
                </AlertDescription>
              </Alert>
            )}

            {/* Error Display */}
            {error && (
              <Alert className="border-red-500/20 bg-red-500/5">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <AlertDescription className="text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Wallet Options */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Available Wallets</h3>
              
              {sortedWallets.map((wallet) => (
                <motion.div
                  key={wallet.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-cyan-500/50 ${
                    wallet.chainType === preferredChainType
                      ? 'border-cyan-500/30 bg-cyan-500/5'
                      : 'border-slate-700 hover:bg-slate-800/50'
                  }`}
                  onClick={() => connectWallet(wallet)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-800 rounded-lg">
                        {wallet.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-200">{wallet.name}</span>
                          <Badge variant="outline" className={getChainColor(wallet.chainType)}>
                            {wallet.chainType.toUpperCase()}
                          </Badge>
                          {wallet.chainType === preferredChainType && (
                            <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{wallet.description}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {wallet.supportedNetworks.slice(0, 3).map((network, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {network}
                            </Badge>
                          ))}
                          {wallet.supportedNetworks.length > 3 && (
                            <span className="text-xs text-slate-500">
                              +{wallet.supportedNetworks.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!wallet.isInstalled ? (
                        <div className="flex items-center gap-1 text-orange-400">
                          <Download className="w-4 h-4" />
                          <span className="text-xs">Install</span>
                        </div>
                      ) : connecting === wallet.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <Separator className="bg-slate-700" />

            {/* Footer */}
            <div className="text-center space-y-2">
              <p className="text-xs text-slate-500">
                By connecting a wallet, you agree to our Terms of Service
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                <button
                  onClick={() => window.open('/docs/security', '_blank')}
                  className="hover:text-cyan-400 flex items-center gap-1"
                >
                  Security Guide
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  onClick={() => window.open('/docs/wallets', '_blank')}
                  className="hover:text-cyan-400 flex items-center gap-1"
                >
                  Supported Wallets
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default WalletConnectionModal