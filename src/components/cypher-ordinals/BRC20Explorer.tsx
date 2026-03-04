'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Bitcoin, 
  Users, 
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Star,
  Eye,
  Activity
} from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

interface BRC20ExplorerProps {
  searchQuery: string
}

interface BRC20Token {
  symbol: string
  name: string
  totalSupply: string
  maxSupply: string
  limitPerMint: string
  holders: number
  transactions: number
  deployer: string
  deployTime: number
  price?: number
  marketCap?: number
  volume24h?: number
  change24h?: number
  priceHistory: Array<{ time: string; price: number }>
}

export function BRC20Explorer({ searchQuery }: BRC20ExplorerProps) {
  const [tokens, setTokens] = useState<BRC20Token[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // FALLBACK: Replace with real BRC-20 API data from Hiro/UniSat
  // Currently no API integration - tokens list will be empty until connected
  useEffect(() => {
    const fetchBRC20Tokens = async () => {
      try {
        const response = await fetch('/api/brc20/tokens/')
        if (response.ok) {
          const result = await response.json()
          if (result.tokens?.length) {
            setTokens(result.tokens)
            setIsLoading(false)
            return
          }
        }
      } catch (error) {
        console.warn('[BRC20Explorer] API unavailable, showing empty state:', error)
      }
      // No data available
      setTokens([])
      setIsLoading(false)
    }

    fetchBRC20Tokens()
  }, [])

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
    return num.toString()
  }

  const formatPrice = (price: number) => {
    if (price < 0.001) return price.toFixed(6)
    if (price < 1) return price.toFixed(4)
    return price.toFixed(2)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="h-32 bg-gray-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tokens BRC-20</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-400 border-blue-400">
            {tokens.length} Tokens
          </Badge>
        </div>
      </div>

      {/* Token Cards */}
      <div className="space-y-4">
        {tokens.map((token) => (
          <Card key={token.symbol} className="group hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Token Info */}
                <div className="lg:col-span-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {token.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{token.symbol}</h3>
                      <p className="text-sm text-muted-foreground">{token.name}</p>
                    </div>
                  </div>

                  {token.price && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">${formatPrice(token.price)}</span>
                        <div className={`flex items-center gap-1 text-sm ${(token.change24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {(token.change24h ?? 0) >= 0 ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                          {Math.abs(token.change24h ?? 0)}%
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        MCap: ${formatNumber(token.marketCap || 0)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Price Chart */}
                <div className="lg:col-span-1">
                  <h4 className="font-medium mb-2">Preço (24h)</h4>
                  <div className="h-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={token.priceHistory}>
                        <Line 
                          type="monotone" 
                          dataKey="price" 
                          stroke={(token.change24h ?? 0) >= 0 ? "#10B981" : "#EF4444"}
                          strokeWidth={2}
                          dot={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Token Stats */}
                <div className="lg:col-span-1">
                  <h4 className="font-medium mb-3">Estatísticas</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Holders:</span>
                      <span className="font-medium">{token.holders.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transações:</span>
                      <span className="font-medium">{formatNumber(token.transactions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Supply:</span>
                      <span className="font-medium">{formatNumber(parseInt(token.totalSupply))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Limit/Mint:</span>
                      <span className="font-medium">{formatNumber(parseInt(token.limitPerMint))}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="lg:col-span-1">
                  <h4 className="font-medium mb-3">Ações</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                    <Button variant="outline" className="w-full" size="sm">
                      <Activity className="h-4 w-4 mr-2" />
                      Histórico
                    </Button>
                    <Button variant="outline" className="w-full" size="sm">
                      <Users className="h-4 w-4 mr-2" />
                      Top Holders
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-6 pt-4 border-t border-muted/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Deployer:</span>
                    <p className="font-medium">{token.deployer.slice(0, 12)}...</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deploy Date:</span>
                    <p className="font-medium">{new Date(token.deployTime).toLocaleDateString()}</p>
                  </div>
                  {token.volume24h && (
                    <div>
                      <span className="text-muted-foreground">Volume 24h:</span>
                      <p className="font-medium">${formatNumber(token.volume24h)}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Progress:</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded">
                        <div 
                          className="h-full bg-blue-500 rounded"
                          style={{ 
                            width: `${(parseInt(token.totalSupply) / parseInt(token.maxSupply)) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-xs">
                        {((parseInt(token.totalSupply) / parseInt(token.maxSupply)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More */}
      <div className="text-center">
        <Button variant="outline" className="w-full max-w-md">
          Carregar Mais Tokens
        </Button>
      </div>
    </div>
  )
}