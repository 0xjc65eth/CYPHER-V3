'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowUpDown, Settings, Info, Zap, TrendingUp } from 'lucide-react'

interface Token {
  symbol: string
  name: string
  address: string
  decimals: number
  price: number
  icon: string
  chain: 'ethereum' | 'bitcoin' | 'solana'
}

interface SwapRoute {
  dex: string
  inputAmount: string
  outputAmount: string
  priceImpact: number
  fee: number
  gasEstimate: number
  route: string[]
}

const TOKENS: Token[] = [
  { symbol: 'BTC', name: 'Bitcoin', address: '0x', decimals: 8, price: 45000, icon: '₿', chain: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', address: '0x', decimals: 18, price: 2800, icon: 'Ξ', chain: 'ethereum' },
  { symbol: 'SOL', name: 'Solana', address: '0x', decimals: 9, price: 98, icon: '◎', chain: 'solana' },
  { symbol: 'USDC', name: 'USD Coin', address: '0x', decimals: 6, price: 1, icon: '$', chain: 'ethereum' },
  { symbol: 'USDT', name: 'Tether', address: '0x', decimals: 6, price: 1, icon: '₮', chain: 'ethereum' },
  { symbol: 'ORDI', name: 'Ordinals', address: '0x', decimals: 18, price: 45, icon: '🔶', chain: 'bitcoin' },
]

const DEXS = [
  { name: '1inch', icon: '🦄', chains: ['ethereum'] },
  { name: 'Jupiter', icon: '🪐', chains: ['solana'] },
  { name: 'RunesDEX', icon: '🔮', chains: ['bitcoin'] },
  { name: 'Uniswap', icon: '🦄', chains: ['ethereum'] },
  { name: 'PancakeSwap', icon: '🥞', chains: ['ethereum'] }
]

export function SwapInterface() {
  const [fromToken, setFromToken] = useState<Token>(TOKENS[0])
  const [toToken, setToToken] = useState<Token>(TOKENS[1])
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [slippage, setSlippage] = useState(1.0)
  const [routes, setRoutes] = useState<SwapRoute[]>([])
  const [selectedRoute, setSelectedRoute] = useState<SwapRoute | null>(null)
  const [loading, setLoading] = useState(false)
  const [priceLoading, setPriceLoading] = useState(false)

  useEffect(() => {
    if (fromAmount && fromToken && toToken) {
      fetchRoutes()
    }
  }, [fromAmount, fromToken, toToken])

  const fetchRoutes = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return
    
    setPriceLoading(true)
    try {
      // Simulate API call to DEX aggregators
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockRoutes: SwapRoute[] = [
        {
          dex: '1inch',
          inputAmount: fromAmount,
          outputAmount: (parseFloat(fromAmount) * fromToken.price / toToken.price * 0.997).toFixed(6),
          priceImpact: 0.12,
          fee: 0.3,
          gasEstimate: 0.008,
          route: [fromToken.symbol, toToken.symbol]
        },
        {
          dex: 'Jupiter',
          inputAmount: fromAmount,
          outputAmount: (parseFloat(fromAmount) * fromToken.price / toToken.price * 0.995).toFixed(6),
          priceImpact: 0.18,
          fee: 0.25,
          gasEstimate: 0.006,
          route: [fromToken.symbol, 'USDC', toToken.symbol]
        },
        {
          dex: 'RunesDEX',
          inputAmount: fromAmount,
          outputAmount: (parseFloat(fromAmount) * fromToken.price / toToken.price * 0.998).toFixed(6),
          priceImpact: 0.08,
          fee: 0.33,
          gasEstimate: 0.012,
          route: [fromToken.symbol, toToken.symbol]
        }
      ]
      
      setRoutes(mockRoutes)
      setSelectedRoute(mockRoutes[0])
      setToAmount(mockRoutes[0].outputAmount)
    } catch (error) {
      console.error('Error fetching routes:', error)
    } finally {
      setPriceLoading(false)
    }
  }

  const executeSwap = async () => {
    if (!selectedRoute || !fromAmount) return
    
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Show success message
      alert(`Swap executed successfully!\n${fromAmount} ${fromToken.symbol} → ${selectedRoute.outputAmount} ${toToken.symbol}`)
      
      // Reset form
      setFromAmount('')
      setToAmount('')
      setRoutes([])
      setSelectedRoute(null)
    } catch (error) {
      console.error('Swap failed:', error)
      alert('Swap failed: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const swapTokens = () => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)
    setFromAmount(toAmount)
    setToAmount('')
  }

  return (
    <Card className="w-full bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Zap className="h-6 w-6 text-blue-500" />
          DEX Aggregation Swap
          <Badge className="bg-green-500/20 text-green-400">
            0.33% Fee
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* From Token */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400">From</label>
          <div className="flex gap-2">
            <select
              value={fromToken.symbol}
              onChange={(e) => {
                const token = TOKENS.find(t => t.symbol === e.target.value)
                if (token) setFromToken(token)
              }}
              className="w-32 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
            >
              {TOKENS.map(token => (
                <option key={token.symbol} value={token.symbol}>
                  {token.icon} {token.symbol}
                </option>
              ))}
            </select>
            <Input
              type="number"
              placeholder="0.0"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="flex-1 bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div className="text-sm text-gray-400">
            Balance: 0.0 {fromToken.symbol} (${fromToken.price.toLocaleString()}/token)
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            onClick={swapTokens}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {/* To Token */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400">To</label>
          <div className="flex gap-2">
            <select
              value={toToken.symbol}
              onChange={(e) => {
                const token = TOKENS.find(t => t.symbol === e.target.value)
                if (token) setToToken(token)
              }}
              className="w-32 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
            >
              {TOKENS.map(token => (
                <option key={token.symbol} value={token.symbol}>
                  {token.icon} {token.symbol}
                </option>
              ))}
            </select>
            <Input
              type="number"
              placeholder="0.0"
              value={toAmount}
              readOnly
              className="flex-1 bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div className="text-sm text-gray-400">
            Balance: 0.0 {toToken.symbol} (${toToken.price.toLocaleString()}/token)
          </div>
        </div>

        {/* Settings */}
        <div className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg">
          <Settings className="h-4 w-4 text-gray-400" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Slippage:</span>
            <Input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(parseFloat(e.target.value) || 1)}
              className="w-20 h-8 bg-gray-700 border-gray-600 text-white"
              step="0.1"
              min="0.1"
              max="10"
            />
            <span className="text-sm text-gray-400">%</span>
          </div>
        </div>

        {/* Route Options */}
        {routes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Best Routes:</h3>
            {routes.map((route, index) => (
              <div
                key={index}
                onClick={() => {
                  setSelectedRoute(route)
                  setToAmount(route.outputAmount)
                }}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedRoute === route
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{route.dex}</span>
                    <Badge className="bg-green-500/20 text-green-400 text-xs">
                      Best Rate
                    </Badge>
                  </div>
                  <span className="text-white font-semibold">
                    {route.outputAmount} {toToken.symbol}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Price Impact:</span>
                    <p className="text-white">{route.priceImpact}%</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Fee:</span>
                    <p className="text-white">{route.fee}%</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Gas:</span>
                    <p className="text-white">{route.gasEstimate} ETH</p>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-gray-400 text-xs">Route: </span>
                  <span className="text-white text-xs">
                    {route.route.join(' → ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Price Loading */}
        {priceLoading && (
          <div className="p-4 bg-gray-800 rounded-lg text-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-400">Finding best routes...</p>
          </div>
        )}

        {/* Swap Info */}
        {selectedRoute && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 font-medium">Swap Summary</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Rate:</span>
                <span className="text-white">
                  1 {fromToken.symbol} = {(parseFloat(selectedRoute.outputAmount) / parseFloat(selectedRoute.inputAmount)).toFixed(6)} {toToken.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Minimum Received:</span>
                <span className="text-white">
                  {(parseFloat(selectedRoute.outputAmount) * (100 - slippage) / 100).toFixed(6)} {toToken.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Fee:</span>
                <span className="text-white">
                  ${((parseFloat(selectedRoute.inputAmount) * fromToken.price * selectedRoute.fee) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <Button
          onClick={executeSwap}
          disabled={!selectedRoute || !fromAmount || loading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              Swapping...
            </div>
          ) : selectedRoute ? (
            `Swap via ${selectedRoute.dex}`
          ) : (
            'Enter Amount to Swap'
          )}
        </Button>

        {/* Supported DEXs */}
        <div className="pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Supported DEXs:</h4>
          <div className="flex flex-wrap gap-2">
            {DEXS.map(dex => (
              <Badge key={dex.name} variant="outline" className="border-gray-600 text-gray-300">
                {dex.icon} {dex.name}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}