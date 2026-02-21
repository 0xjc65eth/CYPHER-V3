'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  Star,
  TrendingUp,
  ArrowUpDown,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Zap,
  Bitcoin,
  Clock,
  RefreshCw,
  Loader2
} from 'lucide-react'

import { Token, Network } from '@/types/quickTrade'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAssetManagement } from '@/hooks/useAssetManagement'

// Extended token interface with additional metadata
interface ExtendedToken extends Token {
  price?: number
  priceChange24h?: number
  volume24h?: number
  marketCap?: number
  tvl?: string
  isPopular?: boolean
  isFavorite?: boolean
  lastTraded?: number
  verified?: boolean
  description?: string
  website?: string
  tags?: string[]
}

interface EnhancedTokenSelectorProps {
  isOpen: boolean
  onClose: () => void
  onTokenSelect: (token: Token) => void
  selectedNetwork: Network
  selectedToken?: Token | null
  excludeToken?: Token | null
  title?: string
  recentTokens?: Token[]
  favoriteTokens?: Token[]
  autoRefresh?: boolean
}

// Enhanced token data with real-time prices
const getEnhancedTokenData = (assetPrices: Record<string, any>): ExtendedToken[] => [
  // Ethereum Tokens
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoUri: '/icons/ethereum.png',
    chainId: 1,
    isNative: true,
    price: assetPrices['ETH']?.price || 0,
    priceChange24h: assetPrices['ETH']?.priceChange24h || 0,
    volume24h: assetPrices['ETH']?.volume24h || 0,
    marketCap: assetPrices['ETH']?.marketCap || 0,
    isPopular: true,
    verified: true,
    description: 'Native Ethereum token',
    tags: ['native', 'layer1']
  },
  {
    address: '0xA0b86a33E6F8b16dcE3d16b0e4f3b8De1A9e1C6C',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoUri: '/icons/usdc.png',
    chainId: 1,
    price: assetPrices['USDC']?.price || 0,
    priceChange24h: assetPrices['USDC']?.priceChange24h || 0,
    volume24h: assetPrices['USDC']?.volume24h || 0,
    marketCap: assetPrices['USDC']?.marketCap || 0,
    isPopular: true,
    verified: true,
    description: 'Fully reserved stablecoin',
    tags: ['stablecoin', 'usdc']
  },
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoUri: '/icons/usdt.png',
    chainId: 1,
    price: assetPrices['USDT']?.price || 0,
    priceChange24h: assetPrices['USDT']?.priceChange24h || 0,
    volume24h: assetPrices['USDT']?.volume24h || 0,
    marketCap: assetPrices['USDT']?.marketCap || 0,
    isPopular: true,
    verified: true,
    description: 'Most traded stablecoin',
    tags: ['stablecoin', 'tether']
  },
  // Solana Tokens
  {
    address: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    logoUri: '/icons/solana.png',
    chainId: 101,
    isNative: true,
    price: assetPrices['SOL']?.price || 0,
    priceChange24h: assetPrices['SOL']?.priceChange24h || 0,
    volume24h: assetPrices['SOL']?.volume24h || 0,
    marketCap: assetPrices['SOL']?.marketCap || 0,
    isPopular: true,
    verified: true,
    description: 'High-performance blockchain',
    tags: ['native', 'layer1', 'fast']
  },
  {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin (Solana)',
    decimals: 6,
    logoUri: '/icons/usdc.png',
    chainId: 101,
    price: assetPrices['USDC']?.price || 0,
    priceChange24h: assetPrices['USDC']?.priceChange24h || 0,
    volume24h: 0,
    isPopular: true,
    verified: true,
    description: 'USDC on Solana',
    tags: ['stablecoin', 'solana']
  },
  // Bitcoin/Runes tokens (fallback data)
  {
    address: 'UNCOMMON•GOODS',
    symbol: 'GOODS',
    name: 'Uncommon Goods',
    decimals: 0,
    logoUri: '/icons/runes.png',
    chainId: 0, // Bitcoin
    price: assetPrices['GOODS']?.price || 0,
    priceChange24h: assetPrices['GOODS']?.priceChange24h || 0,
    volume24h: 0,
    isPopular: true,
    verified: true,
    description: 'Popular Bitcoin Rune',
    tags: ['runes', 'bitcoin', 'collectible']
  }
]

const EnhancedTokenSelector: React.FC<EnhancedTokenSelectorProps> = ({
  isOpen,
  onClose,
  onTokenSelect,
  selectedNetwork,
  selectedToken,
  excludeToken,
  title = 'Select Token',
  recentTokens = [],
  favoriteTokens = [],
  autoRefresh = true
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'popular' | 'all' | 'favorites' | 'recent'>('popular')
  const [sortBy, setSortBy] = useState<'marketcap' | 'volume' | 'price' | 'name'>('marketcap')
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  // Use asset management hook
  const {
    assetPrices,
    isLoadingAssetData,
    refreshAllAssets,
    getAssetDisplayPrice,
    isDataStale
  } = useAssetManagement()

  // Get enhanced token data with live prices
  const enhancedTokenData = useMemo(() => 
    getEnhancedTokenData(assetPrices), 
    [assetPrices]
  )

  // Filter tokens by network and search
  const filteredTokens = useMemo(() => {
    let tokens = enhancedTokenData.filter(token => {
      // Filter by network
      if (selectedNetwork.chainId !== token.chainId) return false
      
      // Exclude selected token
      if (excludeToken && token.address === excludeToken.address) return false
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          token.symbol.toLowerCase().includes(query) ||
          token.name.toLowerCase().includes(query) ||
          token.address.toLowerCase().includes(query) ||
          token.tags?.some(tag => tag.toLowerCase().includes(query))
        )
      }
      
      return true
    })

    // Sort tokens
    tokens.sort((a, b) => {
      switch (sortBy) {
        case 'marketcap':
          return (b.marketCap || 0) - (a.marketCap || 0)
        case 'volume':
          return (b.volume24h || 0) - (a.volume24h || 0)
        case 'price':
          return (b.price || 0) - (a.price || 0)
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    return tokens
  }, [enhancedTokenData, selectedNetwork.chainId, excludeToken, searchQuery, sortBy])

  // Get tokens by category
  const getTokensByCategory = (category: string) => {
    switch (category) {
      case 'popular':
        return filteredTokens.filter(token => token.isPopular)
      case 'favorites':
        return filteredTokens.filter(token => 
          favoriteTokens.some(fav => fav.address === token.address)
        )
      case 'recent':
        return filteredTokens.filter(token => 
          recentTokens.some(recent => recent.address === token.address)
        )
      default:
        return filteredTokens
    }
  }

  // Format price
  const formatPrice = (price?: number) => {
    if (!price) return '$0.00'
    if (price < 0.01) return `$${price.toFixed(6)}`
    if (price < 1) return `$${price.toFixed(4)}`
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Format volume/market cap
  const formatLargeNumber = (num?: number) => {
    if (!num) return '$0'
    if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`
    return `$${num.toFixed(0)}`
  }

  // Get price change color
  const getPriceChangeColor = (change?: number) => {
    if (!change) return 'text-slate-400'
    return change >= 0 ? 'text-green-400' : 'text-red-400'
  }

  // Get network icon
  const getNetworkIcon = (chainId: number) => {
    const icons: Record<number, React.ReactNode> = {
      1: <Zap className="w-4 h-4 text-blue-400" />,
      42161: <Zap className="w-4 h-4 text-blue-400" />,
      101: <div className="w-4 h-4 bg-purple-500 rounded" />,
      0: <Bitcoin className="w-4 h-4 text-orange-400" />
    }
    return icons[chainId] || <Zap className="w-4 h-4" />
  }

  // Handle token selection with asset switching
  const handleTokenSelect = async (token: ExtendedToken) => {
    try {
      onTokenSelect(token)
      onClose()
    } catch (error) {
      console.error('Error selecting token:', error)
    }
  }

  // Clear search
  const clearSearch = () => {
    setSearchQuery('')
  }

  // Manual refresh
  const handleRefresh = async () => {
    await refreshAllAssets()
    setLastRefresh(Date.now())
  }

  // Auto refresh effect
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshAllAssets()
      setLastRefresh(Date.now())
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, refreshAllAssets])

  if (!isOpen) return null

  const tokensToShow = getTokensByCategory(activeTab)
  const hasStaleData = tokensToShow.some(token => isDataStale(token.symbol))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg mx-4 max-h-[90vh] flex flex-col"
      >
        <Card className="border-cyan-500/20 bg-gradient-to-br from-slate-900 to-slate-800 flex-1">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  {getNetworkIcon(selectedNetwork.chainId)}
                </div>
                <div>
                  <CardTitle className="text-cyan-400">{title}</CardTitle>
                  <p className="text-sm text-slate-400 mt-1">
                    {selectedNetwork.name} • {tokensToShow.length} tokens
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoadingAssetData}
                  className="text-slate-400 hover:text-slate-300"
                >
                  {isLoadingAssetData ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Data freshness indicator */}
            {hasStaleData && (
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg">
                <Clock className="w-3 h-3" />
                <span>Some price data may be outdated</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  className="ml-auto h-auto p-1 text-amber-400 hover:text-amber-300"
                >
                  Refresh
                </Button>
              </div>
            )}

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search tokens by name, symbol, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 bg-slate-800 border-slate-700"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Sort by:</span>
              <div className="flex items-center gap-1">
                {['marketcap', 'volume', 'price', 'name'].map((sort) => (
                  <Button
                    key={sort}
                    variant={sortBy === sort ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSortBy(sort as any)}
                    className="h-7 text-xs"
                  >
                    {sort.charAt(0).toUpperCase() + sort.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="grid w-full grid-cols-4 bg-slate-800 mb-4">
                <TabsTrigger value="popular">Popular</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="recent">Recent</TabsTrigger>
                <TabsTrigger value="favorites">Favorites</TabsTrigger>
              </TabsList>

              <div className="overflow-y-auto max-h-[400px] space-y-2">
                <AnimatePresence mode="wait">
                  {tokensToShow.map((token, index) => (
                    <motion.div
                      key={token.address}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-cyan-500/50 ${
                        selectedToken?.address === token.address
                          ? 'border-cyan-500/30 bg-cyan-500/5'
                          : 'border-slate-700 hover:bg-slate-800/50'
                      } ${isDataStale(token.symbol) ? 'opacity-75' : ''}`}
                      onClick={() => handleTokenSelect(token)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                              {token.logoUri ? (
                                <img 
                                  src={token.logoUri} 
                                  alt={token.symbol}
                                  className="w-8 h-8 rounded-full"
                                />
                              ) : (
                                <span className="text-sm font-bold text-slate-300">
                                  {token.symbol.slice(0, 2)}
                                </span>
                              )}
                            </div>
                            {token.verified && (
                              <CheckCircle className="absolute -bottom-1 -right-1 w-4 h-4 text-green-400 bg-slate-900 rounded-full" />
                            )}
                            {isDataStale(token.symbol) && (
                              <Clock className="absolute -top-1 -right-1 w-3 h-3 text-amber-400" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-200">{token.symbol}</span>
                              {token.isPopular && (
                                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              )}
                              {token.tags?.map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-sm text-slate-400">{token.name}</p>
                            {token.description && (
                              <p className="text-xs text-slate-500 mt-1">{token.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-semibold text-slate-200">
                            {formatPrice(token.price)}
                          </div>
                          {token.priceChange24h !== undefined && (
                            <div className={`text-sm flex items-center gap-1 ${getPriceChangeColor(token.priceChange24h)}`}>
                              {token.priceChange24h >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingUp className="w-3 h-3 rotate-180" />
                              )}
                              {token.priceChange24h.toFixed(2)}%
                            </div>
                          )}
                          <div className="text-xs text-slate-500 mt-1">
                            {token.volume24h && `Vol: ${formatLargeNumber(token.volume24h)}`}
                          </div>
                        </div>
                      </div>

                      {/* Additional token info */}
                      {token.marketCap && (
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <span>Market Cap: {formatLargeNumber(token.marketCap)}</span>
                          {token.tvl && <span>TVL: {token.tvl}</span>}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {tokensToShow.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-400">
                      {searchQuery ? 'No tokens found matching your search' : 'No tokens available'}
                    </p>
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSearch}
                        className="mt-2 text-cyan-400"
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Tabs>
          </CardContent>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span>Powered by Live Data</span>
                <button
                  onClick={() => window.open('https://docs.uniswap.org/concepts/protocol/token-list', '_blank')}
                  className="hover:text-cyan-400 flex items-center gap-1"
                >
                  Add Token
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3 h-3" />
                <span>Updated {Math.floor((Date.now() - lastRefresh) / 1000)}s ago</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

export default EnhancedTokenSelector