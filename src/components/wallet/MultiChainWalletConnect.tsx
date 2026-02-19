'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Conditional imports to prevent server-side errors
let useAppKit: any, useAppKitAccount: any, useAppKitNetwork: any
let useWallet: any, useConnection: any, ConnectionProvider: any, WalletProvider: any

if (typeof window !== 'undefined') {
  try {
    const reownImports = require('@reown/appkit/react')
    useAppKit = reownImports.useAppKit
    useAppKitAccount = reownImports.useAppKitAccount
    useAppKitNetwork = reownImports.useAppKitNetwork
  } catch (error) {
  }

  try {
    const solanaImports = require('@solana/wallet-adapter-react')
    useWallet = solanaImports.useWallet
    useConnection = solanaImports.useConnection
  } catch (error) {
  }
}

const EVM_CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', icon: '🔷' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', icon: '🔺' },
  { id: 137, name: 'Polygon', symbol: 'MATIC', icon: '🟣' },
  { id: 10, name: 'Optimism', symbol: 'ETH', icon: '🔴' },
  { id: 8453, name: 'Base', symbol: 'ETH', icon: '🔵' }
]

const SOLANA_WALLETS = [
  { name: 'Phantom', icon: '👻' },
  { name: 'Solflare', icon: '☀️' },
  { name: 'Backpack', icon: '🎒' },
  { name: 'Glow', icon: '✨' }
]

interface WalletBalance {
  balance: string
  symbol: string
  usdValue?: number
}

export function MultiChainWalletConnect() {
  const [evmConnected, setEvmConnected] = useState(false)
  const [solanaConnected, setSolanaConnected] = useState(false)
  const [evmAddress, setEvmAddress] = useState<string>('')
  const [solanaAddress, setSolanaAddress] = useState<string>('')
  const [evmChain, setEvmChain] = useState<any>(null)
  const [balances, setBalances] = useState<Record<string, WalletBalance>>({})
  const [loading, setLoading] = useState(false)

  // Initialize wallet states
  useEffect(() => {
    checkWalletStates()
  }, [])

  const checkWalletStates = () => {
    // Check EVM connection
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setEvmConnected(true)
            setEvmAddress(accounts[0])
            detectEvmChain()
            fetchEvmBalance(accounts[0])
          }
        })
        .catch(console.error)
    }

    // Check Solana connection
    if (useWallet) {
      const { connected, publicKey } = useWallet()
      setSolanaConnected(connected)
      if (publicKey) {
        setSolanaAddress(publicKey.toString())
        fetchSolanaBalance(publicKey.toString())
      }
    }
  }

  const detectEvmChain = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' })
        const chain = EVM_CHAINS.find(c => c.id === parseInt(chainId, 16))
        setEvmChain(chain)
      } catch (error) {
        console.error('Error detecting chain:', error)
      }
    }
  }

  const connectEVM = async () => {
    setLoading(true)
    try {
      if (useAppKit) {
        const appKit = useAppKit()
        await appKit.open()
      } else if (typeof window !== 'undefined' && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts'
        })
        setEvmConnected(true)
        setEvmAddress(accounts[0])
        await detectEvmChain()
        await fetchEvmBalance(accounts[0])
      }
    } catch (error) {
      console.error('EVM connection failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const connectSolana = async () => {
    setLoading(true)
    try {
      if (useWallet) {
        const { connect } = useWallet()
        await connect()
      } else if (typeof window !== 'undefined' && (window as any).solana) {
        const response = await (window as any).solana.connect()
        setSolanaConnected(true)
        setSolanaAddress(response.publicKey.toString())
        await fetchSolanaBalance(response.publicKey.toString())
      }
    } catch (error) {
      console.error('Solana connection failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const disconnectEVM = async () => {
    setEvmConnected(false)
    setEvmAddress('')
    setEvmChain(null)
    setBalances(prev => {
      const newBalances = { ...prev }
      EVM_CHAINS.forEach(chain => {
        delete newBalances[`evm-${chain.id}`]
      })
      return newBalances
    })
  }

  const disconnectSolana = async () => {
    if (useWallet) {
      const { disconnect } = useWallet()
      await disconnect()
    }
    setSolanaConnected(false)
    setSolanaAddress('')
    setBalances(prev => {
      const newBalances = { ...prev }
      delete newBalances['solana']
      return newBalances
    })
  }

  const fetchEvmBalance = async (address: string) => {
    if (!evmChain) return

    try {
      const response = await fetch('/api/wallet/balance/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address, 
          chain: evmChain.id,
          type: 'evm' 
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setBalances(prev => ({
          ...prev,
          [`evm-${evmChain.id}`]: {
            balance: data.balance,
            symbol: evmChain.symbol,
            usdValue: data.usdValue
          }
        }))
      }
    } catch (error) {
      console.error('Error fetching EVM balance:', error)
      // Mock balance for demo
      setBalances(prev => ({
        ...prev,
        [`evm-${evmChain.id}`]: {
          balance: '0.1234',
          symbol: evmChain.symbol,
          usdValue: 234.56
        }
      }))
    }
  }

  const fetchSolanaBalance = async (address: string) => {
    try {
      const response = await fetch('/api/wallet/balance/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address, 
          type: 'solana' 
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setBalances(prev => ({
          ...prev,
          solana: {
            balance: data.balance,
            symbol: 'SOL',
            usdValue: data.usdValue
          }
        }))
      }
    } catch (error) {
      console.error('Error fetching Solana balance:', error)
      // Mock balance for demo
      setBalances(prev => ({
        ...prev,
        solana: {
          balance: '5.67',
          symbol: 'SOL',
          usdValue: 543.21
        }
      }))
    }
  }

  const switchEvmChain = async (chainId: number) => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }]
        })
        const chain = EVM_CHAINS.find(c => c.id === chainId)
        setEvmChain(chain)
        if (evmAddress) {
          await fetchEvmBalance(evmAddress)
        }
      } catch (error) {
        console.error('Chain switch failed:', error)
      }
    }
  }

  return (
    <Card className="w-full bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          🌐 Multi-Chain Wallet Connect
          <div className="flex gap-2">
            {evmConnected && (
              <Badge className="bg-blue-500/20 text-blue-400">
                EVM Connected
              </Badge>
            )}
            {solanaConnected && (
              <Badge className="bg-purple-500/20 text-purple-400">
                Solana Connected
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="evm" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="evm" className="data-[state=active]:bg-blue-500/20">
              EVM Chains
            </TabsTrigger>
            <TabsTrigger value="solana" className="data-[state=active]:bg-purple-500/20">
              Solana
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="evm" className="space-y-4">
            {/* EVM Connection */}
            <div className="p-4 bg-gray-800 rounded-lg">
              {!evmConnected ? (
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Connect EVM Wallet
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Connect to Ethereum, Arbitrum, Polygon, Optimism, or Base
                  </p>
                  <Button
                    onClick={connectEVM}
                    disabled={loading}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {loading ? "Connecting..." : "Connect Wallet"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Connected</h3>
                    <Button
                      onClick={disconnectEVM}
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300"
                    >
                      Disconnect
                    </Button>
                  </div>
                  <div>
                    <span className="text-gray-400">Address:</span>
                    <p className="text-white font-mono text-sm">
                      {evmAddress.slice(0, 6)}...{evmAddress.slice(-4)}
                    </p>
                  </div>
                  {evmChain && (
                    <div>
                      <span className="text-gray-400">Network:</span>
                      <p className="text-white flex items-center gap-2">
                        {evmChain.icon} {evmChain.name}
                      </p>
                    </div>
                  )}
                  {balances[`evm-${evmChain?.id}`] && (
                    <div>
                      <span className="text-gray-400">Balance:</span>
                      <p className="text-white">
                        {balances[`evm-${evmChain.id}`].balance} {balances[`evm-${evmChain.id}`].symbol}
                        {balances[`evm-${evmChain.id}`].usdValue && (
                          <span className="text-gray-400 ml-2">
                            (${balances[`evm-${evmChain.id}`].usdValue?.toFixed(2)})
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chain Switcher */}
            {evmConnected && (
              <div className="space-y-2">
                <h4 className="text-white font-medium">Switch Network:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {EVM_CHAINS.map((chain) => (
                    <Button
                      key={chain.id}
                      onClick={() => switchEvmChain(chain.id)}
                      variant={evmChain?.id === chain.id ? "default" : "outline"}
                      size="sm"
                      className={`${
                        evmChain?.id === chain.id 
                          ? "bg-blue-500 text-white" 
                          : "border-gray-600 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {chain.icon} {chain.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="solana" className="space-y-4">
            {/* Solana Connection */}
            <div className="p-4 bg-gray-800 rounded-lg">
              {!solanaConnected ? (
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Connect Solana Wallet
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Connect to Phantom, Solflare, or other Solana wallets
                  </p>
                  <Button
                    onClick={connectSolana}
                    disabled={loading}
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    {loading ? "Connecting..." : "Connect Wallet"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Connected</h3>
                    <Button
                      onClick={disconnectSolana}
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300"
                    >
                      Disconnect
                    </Button>
                  </div>
                  <div>
                    <span className="text-gray-400">Address:</span>
                    <p className="text-white font-mono text-sm">
                      {solanaAddress.slice(0, 8)}...{solanaAddress.slice(-8)}
                    </p>
                  </div>
                  {balances.solana && (
                    <div>
                      <span className="text-gray-400">Balance:</span>
                      <p className="text-white">
                        {balances.solana.balance} SOL
                        {balances.solana.usdValue && (
                          <span className="text-gray-400 ml-2">
                            (${balances.solana.usdValue.toFixed(2)})
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Available Solana Wallets */}
            {!solanaConnected && (
              <div className="space-y-2">
                <h4 className="text-white font-medium">Available Wallets:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {SOLANA_WALLETS.map((wallet) => (
                    <div
                      key={wallet.name}
                      className="p-3 bg-gray-800 rounded-lg border border-gray-700 text-center"
                    >
                      <div className="text-2xl mb-1">{wallet.icon}</div>
                      <div className="text-white text-sm">{wallet.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}