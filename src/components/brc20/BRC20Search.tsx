/**
 * 🔍 BRC-20 SEARCH COMPONENT
 * Advanced search and filtering for BRC-20 tokens
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { brc20Service, type BRC20Token } from '@/services/BRC20Service';
import { 
  Search,
  Filter,
  X,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Activity,
  DollarSign,
  Users,
  Clock,
  Star,
  Zap
} from 'lucide-react';
import { formatUSD, formatPct, formatCompactNumber } from '@/utils/formatters';

interface BRC20SearchProps {
  onResults?: (tokens: BRC20Token[]) => void;
  onTokenSelect?: (token: BRC20Token) => void;
  className?: string;
}

interface SearchFilters {
  verified: boolean;
  mintable: boolean;
  priceRange: {
    min: number;
    max: number;
  };
  marketCapRange: {
    min: number;
    max: number;
  };
  volumeRange: {
    min: number;
    max: number;
  };
  holdersRange: {
    min: number;
    max: number;
  };
  priceChange: 'all' | 'gainers' | 'losers';
  sortBy: 'marketCap' | 'volume24h' | 'price' | 'holders' | 'priceChange24h' | 'deployedAt';
  sortOrder: 'desc' | 'asc';
}

const defaultFilters: SearchFilters = {
  verified: false,
  mintable: false,
  priceRange: { min: 0, max: Infinity },
  marketCapRange: { min: 0, max: Infinity },
  volumeRange: { min: 0, max: Infinity },
  holdersRange: { min: 0, max: Infinity },
  priceChange: 'all',
  sortBy: 'marketCap',
  sortOrder: 'desc'
};

export function BRC20Search({ onResults, onTokenSelect, className }: BRC20SearchProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tokens, setTokens] = useState<BRC20Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    loadTokens();
  }, []);

  useEffect(() => {
    const results = searchAndFilter();
    onResults?.(results);
  }, [query, filters, tokens]);

  const loadTokens = async () => {
    try {
      setLoading(true);
      const tokenData = await brc20Service.getBRC20Tokens(200);
      setTokens(tokenData);
      
      // Generate suggestions from token tickers and names
      const suggestionSet = new Set<string>();
      tokenData.forEach(token => {
        suggestionSet.add(token.ticker.toLowerCase());
        suggestionSet.add(token.name.toLowerCase());
        // Add partial matches
        if (token.ticker.length > 2) {
          for (let i = 2; i <= token.ticker.length; i++) {
            suggestionSet.add(token.ticker.substring(0, i).toLowerCase());
          }
        }
      });
      setSuggestions(Array.from(suggestionSet).sort());
    } catch (error) {
      console.error('Failed to load tokens for search:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchAndFilter = useMemo(() => {
    return () => {
      let results = tokens;

      // Text search
      if (query.trim()) {
        const searchTerm = query.toLowerCase().trim();
        results = results.filter(token =>
          token.ticker.toLowerCase().includes(searchTerm) ||
          token.name.toLowerCase().includes(searchTerm) ||
          token.description?.toLowerCase().includes(searchTerm)
        );
      }

      // Apply filters
      if (filters.verified) {
        results = results.filter(token => token.verified);
      }

      if (filters.mintable) {
        results = results.filter(token => token.mintable);
      }

      // Price range
      if (filters.priceRange.min > 0 || filters.priceRange.max < Infinity) {
        results = results.filter(token =>
          token.price >= filters.priceRange.min &&
          token.price <= filters.priceRange.max
        );
      }

      // Market cap range
      if (filters.marketCapRange.min > 0 || filters.marketCapRange.max < Infinity) {
        results = results.filter(token =>
          token.marketCap >= filters.marketCapRange.min &&
          token.marketCap <= filters.marketCapRange.max
        );
      }

      // Volume range
      if (filters.volumeRange.min > 0 || filters.volumeRange.max < Infinity) {
        results = results.filter(token =>
          token.volume24h >= filters.volumeRange.min &&
          token.volume24h <= filters.volumeRange.max
        );
      }

      // Holders range
      if (filters.holdersRange.min > 0 || filters.holdersRange.max < Infinity) {
        results = results.filter(token =>
          token.holders >= filters.holdersRange.min &&
          token.holders <= filters.holdersRange.max
        );
      }

      // Price change filter
      if (filters.priceChange === 'gainers') {
        results = results.filter(token => token.priceChange24h > 0);
      } else if (filters.priceChange === 'losers') {
        results = results.filter(token => token.priceChange24h < 0);
      }

      // Sort results
      results.sort((a, b) => {
        let comparison = 0;
        
        switch (filters.sortBy) {
          case 'marketCap':
            comparison = b.marketCap - a.marketCap;
            break;
          case 'volume24h':
            comparison = b.volume24h - a.volume24h;
            break;
          case 'price':
            comparison = b.price - a.price;
            break;
          case 'holders':
            comparison = b.holders - a.holders;
            break;
          case 'priceChange24h':
            comparison = b.priceChange24h - a.priceChange24h;
            break;
          case 'deployedAt':
            comparison = new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime();
            break;
          default:
            comparison = 0;
        }

        return filters.sortOrder === 'desc' ? comparison : -comparison;
      });

      return results;
    };
  }, [tokens, query, filters]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setQuery('');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.verified) count++;
    if (filters.mintable) count++;
    if (filters.priceRange.min > 0 || filters.priceRange.max < Infinity) count++;
    if (filters.marketCapRange.min > 0 || filters.marketCapRange.max < Infinity) count++;
    if (filters.volumeRange.min > 0 || filters.volumeRange.max < Infinity) count++;
    if (filters.holdersRange.min > 0 || filters.holdersRange.max < Infinity) count++;
    if (filters.priceChange !== 'all') count++;
    return count;
  };

  const formatNumber = (num: number, compact = false) => {
    if (compact) return formatCompactNumber(num, 1);
    return num.toLocaleString();
  };

  const results = searchAndFilter();
  const activeFilterCount = getActiveFilterCount();

  return (
    <Card className={`bg-gray-900 border-gray-700 ${className}`}>
      <div className="p-6">
        {/* Main Search */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search BRC-20 tokens by ticker, name, or description..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 focus:border-orange-500"
            />
            {query && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <Button
            variant={showAdvanced ? "default" : "outline"}
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-1 bg-orange-500 text-white px-1 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="text-gray-400 hover:text-white"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-6 mb-6 p-4 bg-gray-800 rounded-lg">
            {/* Quick Filters */}
            <div>
              <h4 className="text-white font-medium mb-3">Quick Filters</h4>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  size="sm"
                  variant={filters.verified ? "default" : "outline"}
                  onClick={() => updateFilter('verified', !filters.verified)}
                  className="flex items-center gap-1"
                >
                  <CheckCircle className="h-3 w-3" />
                  Verified Only
                </Button>
                
                <Button
                  size="sm"
                  variant={filters.mintable ? "default" : "outline"}
                  onClick={() => updateFilter('mintable', !filters.mintable)}
                  className="flex items-center gap-1"
                >
                  <Activity className="h-3 w-3" />
                  Mintable Only
                </Button>
                
                <select
                  value={filters.priceChange}
                  onChange={(e) => updateFilter('priceChange', e.target.value)}
                  className="bg-gray-700 text-white text-sm rounded px-3 py-1 border border-gray-600"
                >
                  <option value="all">All Tokens</option>
                  <option value="gainers">Gainers Only</option>
                  <option value="losers">Losers Only</option>
                </select>
              </div>
            </div>

            {/* Range Filters */}
            <div>
              <h4 className="text-white font-medium mb-3">Range Filters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Price Range ($)</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.priceRange.min || ''}
                      onChange={(e) => updateFilter('priceRange', {
                        ...filters.priceRange,
                        min: parseFloat(e.target.value) || 0
                      })}
                      className="bg-gray-700 border-gray-600 text-sm"
                    />
                    <span className="text-gray-400">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.priceRange.max === Infinity ? '' : filters.priceRange.max}
                      onChange={(e) => updateFilter('priceRange', {
                        ...filters.priceRange,
                        max: parseFloat(e.target.value) || Infinity
                      })}
                      className="bg-gray-700 border-gray-600 text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Holders Range</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.holdersRange.min || ''}
                      onChange={(e) => updateFilter('holdersRange', {
                        ...filters.holdersRange,
                        min: parseInt(e.target.value) || 0
                      })}
                      className="bg-gray-700 border-gray-600 text-sm"
                    />
                    <span className="text-gray-400">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.holdersRange.max === Infinity ? '' : filters.holdersRange.max}
                      onChange={(e) => updateFilter('holdersRange', {
                        ...filters.holdersRange,
                        max: parseInt(e.target.value) || Infinity
                      })}
                      className="bg-gray-700 border-gray-600 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sorting */}
            <div>
              <h4 className="text-white font-medium mb-3">Sorting</h4>
              <div className="flex items-center gap-3">
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilter('sortBy', e.target.value)}
                  className="bg-gray-700 text-white text-sm rounded px-3 py-2 border border-gray-600"
                >
                  <option value="marketCap">Market Cap</option>
                  <option value="volume24h">Volume 24h</option>
                  <option value="price">Price</option>
                  <option value="holders">Holders</option>
                  <option value="priceChange24h">24h Change</option>
                  <option value="deployedAt">Deploy Date</option>
                </select>
                
                <select
                  value={filters.sortOrder}
                  onChange={(e) => updateFilter('sortOrder', e.target.value)}
                  className="bg-gray-700 text-white text-sm rounded px-3 py-2 border border-gray-600"
                >
                  <option value="desc">High to Low</option>
                  <option value="asc">Low to High</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-400">
            {loading ? 'Loading...' : `${results.length} tokens found`}
            {query && ` for "${query}"`}
          </div>
          
          {results.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Sorted by {filters.sortBy}</span>
              {filters.sortOrder === 'desc' ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            </div>
          )}
        </div>

        {/* Quick Results Preview */}
        {results.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.slice(0, 5).map((token) => (
              <div
                key={token.ticker}
                onClick={() => onTokenSelect?.(token)}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs uppercase">
                      {token.ticker.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white uppercase font-mono">{token.ticker}</span>
                      {token.verified && <CheckCircle className="h-3 w-3 text-green-400" />}
                      {token.mintable && <Zap className="h-3 w-3 text-yellow-400" />}
                    </div>
                    <div className="text-xs text-gray-400">{token.name}</div>
                  </div>
                </div>
                
                <div className="text-right text-sm">
                  <div className="text-white font-mono">
                    {formatUSD(token.price)}
                  </div>
                  <div className={`text-xs ${
                    token.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatPct(token.priceChange24h)}
                  </div>
                </div>
              </div>
            ))}
            
            {results.length > 5 && (
              <div className="text-center py-2 text-gray-400 text-sm">
                And {results.length - 5} more tokens...
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {!loading && results.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">No tokens found</p>
            <p className="text-sm">Try adjusting your search criteria or filters</p>
          </div>
        )}
      </div>
    </Card>
  );
}