/**
 * 🟡 BRC-20 TOKEN LIST COMPONENT
 * Professional token listing with real-time data and trading integration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { HiroBRC20API } from '@/lib/api/hiro/brc20';
import type { BRC20Token } from '@/lib/api/hiro/types';
import { 
  TrendingUp, 
  TrendingDown, 
  ExternalLink, 
  Eye, 
  Star,
  Search,
  Filter,
  BarChart3,
  Users,
  Activity,
  CheckCircle
} from 'lucide-react';

// Inline helper for trading platforms
const brc20Service = {
  getBRC20TradingPlatforms: (ticker: string) => [
    { name: 'UniSat', url: `https://unisat.io/market/brc20?q=${ticker}` },
    { name: 'OKX', url: `https://www.okx.com/web3/marketplace/ordinals/brc20/${ticker}` },
  ]
};

const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleDateString();
};

interface BRC20TokenListProps {
  onTokenSelect?: (token: BRC20Token) => void;
  showPortfolioOnly?: boolean;
  userAddress?: string;
}

// Extended token interface with computed fields
interface ExtendedBRC20Token extends BRC20Token {
  name?: string;
  progress: number;
  verified: boolean;
  mintable: boolean;
}

export function BRC20TokenList({ onTokenSelect, showPortfolioOnly = false, userAddress }: BRC20TokenListProps) {
  const [tokens, setTokens] = useState<ExtendedBRC20Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'holder_count' | 'tx_count' | 'minted_supply' | 'deploy_timestamp'>('holder_count');
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterMintable, setFilterMintable] = useState(false);

  const hiroAPI = new HiroBRC20API();

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      setLoading(true);
      const response = await hiroAPI.getTokens({
        limit: 100,
        sort_by: 'holders',
        order: 'desc'
      });

      // Transform Hiro API data to extended format
      const results = Array.isArray(response.results) ? response.results : [];
      const extendedTokens: ExtendedBRC20Token[] = results.map((token) => {
        const maxSupply = parseFloat(token.max_supply) || 0;
        const mintedSupply = parseFloat(token.minted_supply) || 0;
        const progress = maxSupply > 0 ? (mintedSupply / maxSupply) * 100 : 100;
        const mintable = progress < 100;

        return {
          ...token,
          progress,
          verified: isVerifiedToken(token.ticker),
          mintable
        };
      });

      setTokens(extendedTokens);
    } catch (error) {
      console.error('Failed to load BRC-20 tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const isVerifiedToken = (ticker: string): boolean => {
    const verifiedTokens = ['ordi', 'sats', 'rats', 'meme', 'pepe'];
    return verifiedTokens.includes(ticker?.toLowerCase());
  };

  const filteredAndSortedTokens = tokens
    .filter(token => {
      const matchesSearch = token.ticker.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesVerified = !filterVerified || token.verified;
      const matchesMintable = !filterMintable || token.mintable;

      return matchesSearch && matchesVerified && matchesMintable;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'holder_count':
          return b.holder_count - a.holder_count;
        case 'tx_count':
          return b.tx_count - a.tx_count;
        case 'minted_supply':
          return parseFloat(b.minted_supply) - parseFloat(a.minted_supply);
        case 'deploy_timestamp':
          return b.deploy_timestamp - a.deploy_timestamp;
        default:
          return 0;
      }
    });

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

  const handleTrade = (token: BRC20Token) => {
    const platforms = brc20Service.getBRC20TradingPlatforms(token.ticker);
    window.open(platforms[0].url, '_blank');
  };

  const handleViewDetails = (token: BRC20Token) => {
    window.open(`https://ordiscan.com/brc20/${token.ticker}`, '_blank');
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-700 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-700">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-500" />
            BRC-20 Tokens ({filteredAndSortedTokens.length})
          </h3>
          
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 bg-gray-800 border-gray-600"
              />
            </div>
            
            {/* Filters */}
            <div className="flex items-center gap-2">
              <Button
                variant={filterVerified ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterVerified(!filterVerified)}
                className="text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Button>
              <Button
                variant={filterMintable ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterMintable(!filterMintable)}
                className="text-xs"
              >
                <Activity className="h-3 w-3 mr-1" />
                Mintable
              </Button>
            </div>
            
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-600 focus:border-orange-500 focus:outline-none cursor-pointer"
            >
              <option value="marketCap">Market Cap</option>
              <option value="volume24h">Volume 24h</option>
              <option value="price">Price</option>
              <option value="holders">Holders</option>
              <option value="priceChange24h">24h Change</option>
            </select>
          </div>
        </div>

        {/* Token Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-700">
              <tr className="text-left text-gray-400 text-sm">
                <th className="pb-3 font-medium">#</th>
                <th className="pb-3 font-medium">Token</th>
                <th className="pb-3 font-medium text-right">Price</th>
                <th className="pb-3 font-medium text-right">24h Change</th>
                <th className="pb-3 font-medium text-right">Market Cap</th>
                <th className="pb-3 font-medium text-right">Volume (24h)</th>
                <th className="pb-3 font-medium text-right">Holders</th>
                <th className="pb-3 font-medium text-right">Progress</th>
                <th className="pb-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedTokens.map((token, index) => (
                <TokenRow 
                  key={token.ticker} 
                  token={token} 
                  rank={index + 1}
                  onTrade={() => handleTrade(token)}
                  onViewDetails={() => handleViewDetails(token)}
                  onSelect={() => onTokenSelect?.(token)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {filteredAndSortedTokens.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tokens found matching your criteria</p>
          </div>
        )}
      </div>
    </Card>
  );
}

interface TokenRowProps {
  token: ExtendedBRC20Token;
  rank: number;
  onTrade: () => void;
  onViewDetails: () => void;
  onSelect?: () => void;
}

function TokenRow({ token, rank, onTrade, onViewDetails, onSelect }: TokenRowProps) {
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

  return (
    <tr 
      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer"
      onClick={onSelect}
    >
      <td className="py-4 text-gray-400 font-mono">{rank}</td>
      
      <td className="py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs uppercase">
              {token.ticker.slice(0, 2)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white uppercase font-mono">{token.ticker}</span>
              {token.verified && (
                <CheckCircle className="h-4 w-4 text-green-400" />
              )}
              {token.mintable && (
                <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-400 border-green-500/20">
                  Mintable
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-400">{token.name}</div>
          </div>
        </div>
      </td>
      
      <td className="py-4 text-right">
        <div className="font-mono text-white">{formatNumber(Number(token.minted_supply), true)}</div>
      </td>

      <td className="py-4 text-right">
        <div className="font-mono text-white">{formatNumber(Number(token.max_supply), true)}</div>
      </td>

      <td className="py-4 text-right">
        <div className="text-white">{formatNumber(token.holder_count, true)}</div>
      </td>

      <td className="py-4 text-right">
        <div className="text-white">{formatNumber(token.tx_count)}</div>
      </td>
      
      <td className="py-4 text-right">
        <div className="space-y-1">
          <div className="text-white text-sm">
            {token.progress.toFixed(1)}%
          </div>
          <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden ml-auto">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
              style={{ width: `${Math.min(token.progress, 100)}%` }}
            />
          </div>
        </div>
      </td>

      <td className="py-4 text-right">
        <div className="text-sm text-gray-400">
          {formatDate(token.deploy_timestamp)}
        </div>
      </td>

      <td className="py-4">
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            className="border-gray-600 hover:border-gray-500"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onTrade();
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}