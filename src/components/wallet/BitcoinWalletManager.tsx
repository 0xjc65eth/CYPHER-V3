'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface WalletInfo {
  name: string
  id: string
  icon: string
  installed: boolean
  connected: boolean
  address?: string
  balance?: number
}

const BITCOIN_WALLETS: Omit<WalletInfo, 'installed' | 'connected'>[] = [
  {
    name: 'Xverse',
    id: 'xverse',
    icon: '🔵'
  },
  {
    name: 'Unisat',
    id: 'unisat', 
    icon: '🟡'
  },
  {
    name: 'Gamma.io',
    id: 'magiceden',
    icon: '🟢'
  },
  {
    name: 'OYL',
    id: 'oyl',
    icon: '⚡'
  },
  {
    name: 'Leather',
    id: 'leather',
    icon: '🔶'
  }
]

export function BitcoinWalletManager() {
  const [wallets, setWallets] = useState<WalletInfo[]>([])
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    detectWallets()
  }, [])

  const detectWallets = () => {
    const detectedWallets = BITCOIN_WALLETS.map(wallet => ({
      ...wallet,
      installed: checkWalletInstalled(wallet.id),
      connected: false
    }))
    setWallets(detectedWallets)
  }

  const checkWalletInstalled = (walletId: string): boolean => {
    if (typeof window === 'undefined') return false
    
    switch (walletId) {
      case 'xverse':
        return !!(window as any).XverseProviders?.BitcoinProvider
      case 'unisat':
        return !!(window as any).unisat
      case 'magiceden':
        return !!(window as any).magicEden
      case 'oyl':
        return !!(window as any).oyl
      case 'leather':
        return !!(window as any).btc || !!(window as any).LeatherProvider
      default:
        return false
    }
  }

  const connectWallet = async (walletId: string) => {
    setConnecting(walletId)
    
    try {
      let address: string | undefined
      let balance = 0

      switch (walletId) {
        case 'xverse':
          if ((window as any).XverseProviders?.BitcoinProvider) {
            const response = await (window as any).XverseProviders.BitcoinProvider.connect()
            address = response.addresses.payment
          }
          break
        case 'unisat':
          if ((window as any).unisat) {
            const accounts = await (window as any).unisat.requestAccounts()
            address = accounts[0]
            balance = await (window as any).unisat.getBalance()
          }
          break
        case 'magiceden':
          if ((window as any).magicEden) {
            const response = await (window as any).magicEden.bitcoin.connect()
            address = response.address
          }
          break
        case 'oyl':
          if ((window as any).oyl) {
            const response = await (window as any).oyl.connect()
            address = response.address
          }
          break
        case 'leather':
          if ((window as any).btc || (window as any).LeatherProvider) {
            const provider = (window as any).btc || (window as any).LeatherProvider
            const response = await provider.request('getAccounts')
            address = response.result.addresses.payment
          }
          break
      }

      if (address) {
        setWallets(prev => prev.map(wallet => 
          wallet.id === walletId 
            ? { ...wallet, connected: true, address, balance }
            : { ...wallet, connected: false }
        ))
      }
    } catch (error) {
      console.error(`Failed to connect ${walletId}:`, error)
    } finally {
      setConnecting(null)
    }
  }

  const disconnectWallet = (walletId: string) => {
    setWallets(prev => prev.map(wallet => 
      wallet.id === walletId 
        ? { ...wallet, connected: false, address: undefined, balance: 0 }
        : wallet
    ))
  }

  return (
    <Card className="w-full bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          ₿ Bitcoin Wallets
          <Badge variant="secondary" className="bg-orange-500/20 text-orange-400">
            {wallets.filter(w => w.connected).length} Connected
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {wallets.map((wallet) => (
          <div 
            key={wallet.id}
            className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{wallet.icon}</span>
              <div>
                <h3 className="font-medium text-white">{wallet.name}</h3>
                <div className="flex gap-2 mt-1">
                  <Badge 
                    variant={wallet.installed ? "default" : "destructive"}
                    className={wallet.installed ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}
                  >
                    {wallet.installed ? "Installed" : "Not Installed"}
                  </Badge>
                  {wallet.connected && (
                    <Badge className="bg-blue-500/20 text-blue-400">
                      Connected
                    </Badge>
                  )}
                </div>
                {wallet.connected && wallet.address && (
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              {wallet.installed && !wallet.connected && (
                <Button
                  onClick={() => connectWallet(wallet.id)}
                  disabled={connecting === wallet.id}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  size="sm"
                >
                  {connecting === wallet.id ? "Connecting..." : "Connect"}
                </Button>
              )}
              
              {wallet.connected && (
                <Button
                  onClick={() => disconnectWallet(wallet.id)}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  size="sm"
                >
                  Disconnect
                </Button>
              )}
              
              {!wallet.installed && (
                <Button
                  onClick={() => window.open(getWalletDownloadUrl(wallet.id), '_blank')}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  size="sm"
                >
                  Install
                </Button>
              )}
            </div>
          </div>
        ))}
        
        <div className="pt-4 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Total Connected:</span>
            <span className="text-sm font-medium text-white">
              {wallets.filter(w => w.connected).length} / {wallets.length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getWalletDownloadUrl(walletId: string): string {
  const urls = {
    xverse: 'https://www.xverse.app/',
    unisat: 'https://unisat.io/',
    magiceden: 'https://gamma.io',
    oyl: 'https://oyl.io/',
    leather: 'https://leather.io/'
  }
  return urls[walletId as keyof typeof urls] || '#'
}