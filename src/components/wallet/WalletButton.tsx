'use client'

import React, { useState } from 'react'
import { useWallet } from '@/components/wallet/WalletProvider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import {
  Wallet, Bitcoin, Shield, Key, Copy, Check, ExternalLink,
  RefreshCw, LogOut, Activity, Zap, ArrowUpRight, ArrowDownLeft,
  QrCode, History, Crown, Gem
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Define wallet names mapping
const WALLET_NAMES: Record<string, string> = {
  xverse: 'Xverse',
  unisat: 'Unisat',
  okx: 'OKX',
  leather: 'Leather',
}

// Define wallet info for UI
const WALLET_INFO = {
  Xverse: {
    icon: Bitcoin,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    features: ['Ordinals', 'BRC-20', 'Runes', 'Taproot']
  },
  Unisat: {
    icon: Wallet,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    features: ['Ordinals', 'BRC-20', 'Atomicals']
  },
  OKX: {
    icon: Shield,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    features: ['Multi-chain', 'DeFi', 'NFTs']
  },
  Leather: {
    icon: Key,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    features: ['Stacks', 'Bitcoin', 'Ordinals']
  }
}

export default function WalletButton() {
  const { activeWallet, connectWallet, disconnectWallet, isConnecting, error } = useWallet()
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // Adapter for the old wallet interface
  const wallet = {
    isConnected: !!activeWallet,
    address: activeWallet?.addresses?.payment,
    balance: activeWallet?.wallet?.balance || 0,
    network: activeWallet?.network || 'mainnet',
    isConnecting,
    connect: connectWallet,
    disconnect: disconnectWallet
  }

  const handleConnect = async (walletName: string) => {
    try {
      const walletId = walletName.toLowerCase()
      await connectWallet(walletId)
      toast({
        title: "Wallet Connected",
        description: `Successfully connected to ${walletName}`,
      })
      setIsOpen(false)
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive"
      })
    }
  }

  const handleDisconnect = async () => {
    try {
      disconnectWallet()
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected",
      })
    } catch (error) {
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect wallet",
        variant: "destructive"
      })
    }
  }

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({
      title: "Address Copied",
      description: "Address copied to clipboard",
    })
  }

  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatBTC = (sats: number | undefined) => {
    if (!sats) return '0.00000000'
    return (sats / 100000000).toFixed(8)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {wallet.isConnected && wallet.address ? (
          <Button
            variant="outline"
            className="gap-2 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <Wallet className="w-4 h-4" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">{formatAddress(wallet.address)}</div>
                <div className="text-xs text-gray-400">
                  {formatBTC(wallet.balance)} BTC
                </div>
              </div>
            </div>
          </Button>
        ) : (
          <Button variant="default" className="gap-2">
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {wallet.isConnected ? 'Wallet Management' : 'Connect Wallet'}
          </DialogTitle>
          <DialogDescription>
            {wallet.isConnected
              ? 'Manage your wallet and view your assets'
              : 'Connect your Bitcoin wallet to access all features'
            }
          </DialogDescription>
        </DialogHeader>

        {wallet.isConnected ? (
          <ConnectedWalletView
            wallet={wallet}
            onDisconnect={handleDisconnect}
            onCopyAddress={copyAddress}
            copied={copied}
          />
        ) : (
          <WalletSelectionView
            onConnect={handleConnect}
            isConnecting={wallet.isConnecting}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

// Wallet Selection View
function WalletSelectionView({ onConnect, isConnecting }: {
  onConnect: (walletName: string) => void
  isConnecting: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(WALLET_NAMES).map(([key, name]: [string, string]) => {
          const info = WALLET_INFO[name as keyof typeof WALLET_INFO]
          if (!info) return null
          const Icon = info.icon

          return (
            <Card
              key={key}
              className={cn(
                "relative cursor-pointer transition-all",
                "hover:border-orange-500/50"
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", info.bgColor)}>
                      <Icon className={cn("w-6 h-6", info.color)} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{name}</h3>
                      <p className="text-sm text-gray-400">Bitcoin Wallet</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {info.features.map((feature: string) => (
                    <Badge key={feature} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>

                <Button
                  className="w-full"
                  onClick={() => onConnect(name)}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// Connected Wallet View
function ConnectedWalletView({
  wallet,
  onDisconnect,
  onCopyAddress,
  copied
}: {
  wallet: any
  onDisconnect: () => void
  onCopyAddress: (address: string) => void
  copied: boolean
}) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="addresses">Addresses</TabsTrigger>
        <TabsTrigger value="assets">Assets</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Connected Wallet</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                      Connected
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {wallet.network || 'mainnet'}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button variant="destructive" onClick={onDisconnect}>
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>

            {/* Balance Display */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-900 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Bitcoin Balance</span>
                  <Bitcoin className="w-4 h-4 text-orange-500" />
                </div>
                <div className="text-2xl font-bold">
                  {wallet.balance ? (wallet.balance / 100000000).toFixed(8) : '0.00000000'} BTC
                </div>
                <div className="text-sm text-gray-400">
                  ${wallet.balance ? ((wallet.balance / 100000000) * 109658).toFixed(2) : '0.00'}
                </div>
              </div>
              <div className="p-4 bg-gray-900 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Network</span>
                  <Activity className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold capitalize">
                  {wallet.network || 'Mainnet'}
                </div>
                <div className="text-sm text-gray-400">Bitcoin Network</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-3">
            <Button variant="outline" className="flex-col h-auto py-4">
              <ArrowUpRight className="w-5 h-5 mb-2" />
              <span className="text-xs">Send</span>
            </Button>
            <Button variant="outline" className="flex-col h-auto py-4">
              <ArrowDownLeft className="w-5 h-5 mb-2" />
              <span className="text-xs">Receive</span>
            </Button>
            <Button variant="outline" className="flex-col h-auto py-4">
              <QrCode className="w-5 h-5 mb-2" />
              <span className="text-xs">QR Code</span>
            </Button>
            <Button variant="outline" className="flex-col h-auto py-4">
              <History className="w-5 h-5 mb-2" />
              <span className="text-xs">History</span>
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="addresses" className="space-y-6">
        {wallet.paymentAddress && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-mono text-sm bg-gray-900 p-3 rounded-lg break-all">
                    {wallet.paymentAddress}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCopyAddress(wallet.paymentAddress)}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {wallet.ordinalsAddress && (
          <Card>
            <CardHeader>
              <CardTitle>Ordinals Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-mono text-sm bg-gray-900 p-3 rounded-lg break-all">
                    {wallet.ordinalsAddress}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCopyAddress(wallet.ordinalsAddress)}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="assets" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Digital Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-900 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Ordinals</span>
                  <Crown className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold">
                  {wallet.inscriptions?.length || 0}
                </div>
                <div className="text-sm text-gray-400">Inscriptions</div>
              </div>
              <div className="p-4 bg-gray-900 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Runes</span>
                  <Gem className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold">0</div>
                <div className="text-sm text-gray-400">Tokens</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}