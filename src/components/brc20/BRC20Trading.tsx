/**
 * 🟡 BRC-20 TRADING COMPONENT
 * Professional trading interface with market data and platform integration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MintPlatformGrid } from '@/components/ui/MintPlatform';
import { brc20Service, type BRC20Token, type BRC20MarketData } from '@/services/BRC20Service';
import { 
  TrendingUp, 
  TrendingDown, 
  ExternalLink,
  Search,
  Star,
  BarChart3,
  DollarSign,
  Activity,
  Clock,
  Users,
  Zap,
  Shield,
  Target,
  Globe
} from 'lucide-react';

export function BRC20Trading() {
  const [tokens, setTokens] = useState<BRC20Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<BRC20Token | null>(null);
  const [marketData, setMarketData] = useState<BRC20MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'volume24h' | 'priceChange24h' | 'marketCap' | 'liquidity'>('volume24h');

  useEffect(() => {
    loadTradingData();
  }, []);

  useEffect(() => {
    if (selectedToken) {
      loadMarketData(selectedToken.ticker);
    }
  }, [selectedToken]);

  const loadTradingData = async () => {
    try {
      setLoading(true);
      const tokenData = await brc20Service.getBRC20Tokens(100);
      setTokens(tokenData);
      
      // Auto-select ORDI as default
      const ordiToken = tokenData.find(t => t.ticker.toLowerCase() === 'ordi');
      if (ordiToken) {
        setSelectedToken(ordiToken);
      } else if (tokenData.length > 0) {
        setSelectedToken(tokenData[0]);
      }
    } catch (error) {
      console.error('Failed to load trading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMarketData = async (ticker: string) => {
    try {
      const data = await brc20Service.getBRC20MarketData(ticker);
      setMarketData(data);
    } catch (error) {
      console.error('Failed to load market data:', error);
    }
  };

  const filteredAndSortedTokens = tokens
    .filter(token => 
      token.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'volume24h':
          return b.volume24h - a.volume24h;
        case 'priceChange24h':
          return b.priceChange24h - a.priceChange24h;
        case 'marketCap':
          return b.marketCap - a.marketCap;
        case 'liquidity':
          return b.holders - a.holders; // Proxy for liquidity
        default:
          return 0;
      }
    })
    .slice(0, 20);

  const formatPrice = (price: number) => {
    if (price < 0.000001) {
      return `$${price.toExponential(2)}`;
    }
    if (price < 0.01) {
      return `$${price.toFixed(6)}`;
    }
    return `$${price.toFixed(2)}`;
  };

  const formatNumber = (num: number, compact = false) => {
    if (compact && num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)}B`;
    }
    if (compact && num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (compact && num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const getTradingPlatforms = (ticker: string) => {
    return brc20Service.getBRC20TradingPlatforms(ticker);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 h-96 bg-gray-700 rounded"></div>
            <div className="lg:col-span-2 h-96 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-orange-500" />
            BRC-20 Trading Hub
          </h2>
          <p className="text-gray-400 mt-1">
            Professional trading tools and market analysis for BRC-20 tokens
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token List */}
        <Card className="lg:col-span-1 bg-gray-900 border-gray-700">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Trading Pairs</h3>
              <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                {filteredAndSortedTokens.length} Active
              </Badge>
            </div>
            
            {/* Search and Sort */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tokens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-600"
                />
              </div>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-600 focus:border-orange-500 focus:outline-none cursor-pointer"
              >
                <option value="volume24h">Volume 24h</option>
                <option value="priceChange24h">24h Change</option>
                <option value="marketCap">Market Cap</option>
                <option value="liquidity">Liquidity</option>
              </select>
            </div>

            {/* Token List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAndSortedTokens.map((token) => (
                <div
                  key={token.ticker}
                  onClick={() => setSelectedToken(token)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedToken?.ticker === token.ticker
                      ? 'bg-orange-500/20 border border-orange-500/30'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white uppercase font-mono text-sm">
                        {token.ticker}
                      </span>
                      {token.verified && (
                        <Shield className="h-3 w-3 text-green-400" />
                      )}
                    </div>
                    <div className={`text-xs ${
                      token.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{formatPrice(token.price)}</span>
                    <span>Vol: ${formatNumber(token.volume24h, true)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Trading Interface */}
        <Card className="lg:col-span-2 bg-gray-900 border-gray-700">
          <div className="p-6">
            {selectedToken ? (
              <div className="space-y-6">
                {/* Token Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold uppercase">
                        {selectedToken.ticker.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-bold text-white uppercase font-mono">
                          {selectedToken.ticker}
                        </h3>
                        {selectedToken.verified && (
                          <Shield className="h-5 w-5 text-green-400" />
                        )}
                        {selectedToken.mintable && (
                          <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                            Mintable
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-400">{selectedToken.name}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white font-mono">
                      {formatPrice(selectedToken.price)}
                    </div>
                    <div className={`flex items-center gap-1 ${
                      selectedToken.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {selectedToken.priceChange24h >= 0 ? 
                        <TrendingUp className="w-4 h-4" /> : 
                        <TrendingDown className="w-4 h-4" />
                      }
                      <span className="font-medium">
                        {selectedToken.priceChange24h >= 0 ? '+' : ''}{selectedToken.priceChange24h.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Market Stats */}
                {marketData && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-gray-400">Market Cap</span>
                      </div>
                      <div className="font-bold text-white">
                        ${formatNumber(marketData.marketCap, true)}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <span className="text-xs text-gray-400">24h Volume</span>
                      </div>
                      <div className="font-bold text-white">
                        ${formatNumber(marketData.volume24h, true)}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-purple-500" />
                        <span className="text-xs text-gray-400">Holders</span>
                      </div>
                      <div className="font-bold text-white">
                        {formatNumber(marketData.holders, true)}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span className="text-xs text-gray-400">Liquidity Score</span>
                      </div>
                      <div className="font-bold text-white">
                        {marketData.liquidityScore}/100
                      </div>
                    </div>
                  </div>
                )}

                {/* Trading Platforms */}
                <div>
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-cyan-500" />
                    Trading Platforms
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getTradingPlatforms(selectedToken.ticker).map((platform) => (
                      <Card key={platform.name} className="bg-gray-800 border-gray-700 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h5 className="font-bold text-white">{platform.name}</h5>
                            <p className="text-xs text-gray-400 capitalize">{platform.type}</p>
                          </div>
                          <Badge className={`text-xs ${
                            platform.liquidity === 'very_high' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            platform.liquidity === 'high' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            platform.liquidity === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                            'bg-gray-500/10 text-gray-400 border-gray-500/20'
                          }`}>
                            {platform.liquidity.replace('_', ' ')} liquidity
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Fee: {platform.fee}</span>
                          <Button
                            size="sm"
                            onClick={() => window.open(platform.url, '_blank')}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Trade
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Token Details */}
                <Card className="bg-gray-800 border-gray-700 p-4">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-500" />
                    Token Details
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Deploy Block:</span>
                      <div className="font-mono text-white">{selectedToken.deployBlock.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Max Supply:</span>
                      <div className="font-mono text-white">{formatNumber(selectedToken.maxSupply)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Limit per Mint:</span>
                      <div className="font-mono text-white">{formatNumber(selectedToken.limitPerMint)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Progress:</span>
                      <div className="text-white">{selectedToken.progress.toFixed(1)}% minted</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Total Transfers:</span>
                      <div className="text-white">{formatNumber(selectedToken.transfers)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Deployer:</span>
                      <div className="font-mono text-white text-xs">{selectedToken.deployer}</div>
                    </div>
                  </div>
                  
                  {selectedToken.description && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <span className="text-gray-400">Description:</span>
                      <p className="text-white mt-1">{selectedToken.description}</p>
                    </div>
                  )}
                </Card>
              </div>
            ) : (
              <div className="text-center py-16">
                <BarChart3 className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Select a Token</h3>
                <p className="text-gray-400">Choose a token from the list to view trading information</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Popular Trading Platforms */}
      <Card className="bg-gray-900 border-gray-700 p-6">
        <MintPlatformGrid
          tokenType="brc20"
          title="Professional BRC-20 Trading Platforms"
        />
      </Card>
    </div>
  );
}