'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Star,
  ExternalLink,
  Activity,
  Users,
  Flame,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Info
} from 'lucide-react';
import { RuneMarketData } from '@/services/runes';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip';

interface RunesMarketTableProps {
  data: RuneMarketData[];
  onSelectRune?: (rune: RuneMarketData) => void;
  favorites?: string[];
  onToggleFavorite?: (runeId: string) => void;
}

type SortField = 'rank' | 'name' | 'price' | 'change24h' | 'marketCap' | 'volume' | 'holders' | 'minting';
type SortOrder = 'asc' | 'desc';

interface TableColumn {
  field: SortField;
  label: string;
  width: string;
  format: (value: any, rune: RuneMarketData) => React.ReactNode;
}

export default function RunesMarketTable({
  data,
  onSelectRune,
  favorites = [],
  onToggleFavorite
}: RunesMarketTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('marketCap');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [selectedRuneId, setSelectedRuneId] = useState<string | null>(null);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(rune => 
        rune.name.toLowerCase().includes(search) ||
        rune.symbol.toLowerCase().includes(search)
      );
    }

    // Apply favorites filter
    if (showOnlyFavorites) {
      filtered = filtered.filter(rune => favorites.includes(rune.id));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'rank':
          aValue = a.marketCap.rank;
          bValue = b.marketCap.rank;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'price':
          aValue = a.price.current;
          bValue = b.price.current;
          break;
        case 'change24h':
          aValue = a.price.change24h;
          bValue = b.price.change24h;
          break;
        case 'marketCap':
          aValue = a.marketCap.current;
          bValue = b.marketCap.current;
          break;
        case 'volume':
          aValue = a.volume.volume24h;
          bValue = b.volume.volume24h;
          break;
        case 'holders':
          aValue = a.holders;
          bValue = b.holders;
          break;
        case 'minting':
          aValue = a.minting.progress;
          bValue = b.minting.progress;
          break;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [data, searchTerm, sortField, sortOrder, showOnlyFavorites, favorites]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Enhanced formatting functions for professional display
  const formatPrice = (price: number): string => {
    if (price < 0.00001) return price.toExponential(2);
    if (price < 0.01) return price.toFixed(8);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
  };

  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(decimals)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3" />;
    if (change < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-gray-900/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        )}
      </div>
    </TableHead>
  );

  return (
    <Card className="bg-black border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-400" />
            Runes Market Overview
            <Badge variant="outline" className="ml-2 text-xs bg-orange-900/20 border-orange-500/30 text-orange-400">
              {processedData.length} Active
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={showOnlyFavorites ? 'default' : 'outline'}
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className="h-8"
            >
              <Star className={`h-4 w-4 ${showOnlyFavorites ? 'fill-current' : ''}`} />
              <span className="ml-1">Favorites ({favorites.length})</span>
            </Button>
            
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search runes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 w-48 bg-gray-900 border-gray-700 text-white"
              />
            </div>
          </div>
        </div>

        {/* Market Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4 pt-4 border-t border-gray-800">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">TOTAL MCAP</p>
            <p className="text-lg font-bold text-white font-mono">
              ${formatNumber(processedData.reduce((sum, rune) => sum + rune.marketCap.current, 0))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">24H VOLUME</p>
            <p className="text-lg font-bold text-white font-mono">
              ${formatNumber(processedData.reduce((sum, rune) => sum + rune.volume.volume24h, 0))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">GAINERS</p>
            <p className="text-lg font-bold text-green-400">
              {processedData.filter(rune => rune.price.change24h > 0).length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">LOSERS</p>
            <p className="text-lg font-bold text-red-400">
              {processedData.filter(rune => rune.price.change24h < 0).length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">MINTING</p>
            <p className="text-lg font-bold text-orange-400">
              {processedData.filter(rune => rune.minting.progress < 100).length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">AVG CHANGE</p>
            <p className={`text-lg font-bold font-mono ${
              processedData.length > 0 ? 
                (processedData.reduce((sum, rune) => sum + rune.price.change24h, 0) / processedData.length >= 0 ? 'text-green-400' : 'text-red-400')
                : 'text-gray-400'
            }`}>
              {processedData.length > 0 ? 
                `${(processedData.reduce((sum, rune) => sum + rune.price.change24h, 0) / processedData.length >= 0 ? '+' : '')
                }${(processedData.reduce((sum, rune) => sum + rune.price.change24h, 0) / processedData.length).toFixed(1)}%`
                : '0.0%'
              }
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="border-gray-800 hover:bg-transparent">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="w-12"></TableHead>
                <SortHeader field="name">Name</SortHeader>
                <SortHeader field="price">Price</SortHeader>
                <SortHeader field="change24h">24h %</SortHeader>
                <SortHeader field="marketCap">Market Cap</SortHeader>
                <SortHeader field="volume">Volume (24h)</SortHeader>
                <SortHeader field="holders">Holders</SortHeader>
                <SortHeader field="minting">Minting</SortHeader>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {processedData.map((rune, index) => {
                  const isFavorite = favorites.includes(rune.id);
                  const isSelected = selectedRuneId === rune.id;
                  
                  return (
                    <motion.tr
                      key={rune.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className={`
                        border-gray-800 hover:bg-gray-900/50 cursor-pointer transition-all
                        ${isSelected ? 'bg-orange-900/20' : ''}
                      `}
                      onClick={() => {
                        setSelectedRuneId(rune.id);
                        onSelectRune?.(rune);
                      }}
                    >
                      <TableCell className="text-center font-mono text-gray-400">
                        {rune.marketCap.rank}
                      </TableCell>
                      
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite?.(rune.id);
                          }}
                        >
                          <Star 
                            className={`h-4 w-4 ${
                              isFavorite ? 'fill-orange-400 text-orange-400' : 'text-gray-400'
                            }`} 
                          />
                        </Button>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{rune.name}</p>
                          <p className="text-xs text-gray-400">{rune.symbol}</p>
                        </div>
                      </TableCell>
                      
                      <TableCell className="font-mono text-white">
                        ${formatPrice(rune.price.current)}
                      </TableCell>
                      
                      <TableCell>
                        <div className={`flex items-center gap-1 ${getPriceChangeColor(rune.price.change24h)}`}>
                          {getPriceChangeIcon(rune.price.change24h)}
                          <span className="font-mono">
                            {Math.abs(rune.price.change24h).toFixed(2)}%
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="font-mono text-white">
                        ${formatNumber(rune.marketCap.current)}
                      </TableCell>
                      
                      <TableCell className="font-mono text-white">
                        ${formatNumber(rune.volume.volume24h)}
                      </TableCell>
                      
                      <TableCell className="font-mono text-white">
                        {rune.holders.toLocaleString()}
                      </TableCell>
                      
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-800 rounded-full h-2 w-16 overflow-hidden">
                                  <div 
                                    className={`h-full transition-all ${
                                      rune.minting.progress === 100 
                                        ? 'bg-green-400' 
                                        : 'bg-orange-400'
                                    }`}
                                    style={{ width: `${rune.minting.progress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-400">
                                  {rune.minting.progress.toFixed(1)}%
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <p>Progress: {rune.minting.progress.toFixed(2)}%</p>
                                <p>Remaining: {formatNumber(rune.minting.remaining)}</p>
                                <p>Rate: {rune.minting.rate}/block</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open external link to explorer
                              window.open(`https://ordinals.com/rune/${rune.id}`, '_blank');
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Show more info
                            }}
                          >
                            <Info className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>

        {processedData.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Activity className="h-8 w-8 mx-auto mb-2 animate-pulse" />
            <p>No runes found matching your criteria</p>
          </div>
        )}

        {/* Market Summary Footer */}
        <div className="border-t border-gray-800 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Total Market Cap</p>
              <p className="text-white font-mono">
                ${formatNumber(processedData.reduce((sum, r) => sum + r.marketCap.current, 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Total Volume (24h)</p>
              <p className="text-white font-mono">
                ${formatNumber(processedData.reduce((sum, r) => sum + r.volume.volume24h, 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Active Runes</p>
              <p className="text-white font-mono">{processedData.length}</p>
            </div>
            <div>
              <p className="text-gray-400">Avg Change (24h)</p>
              <p className={`font-mono ${
                processedData.reduce((sum, r) => sum + r.price.change24h, 0) / processedData.length >= 0
                  ? 'text-green-400' : 'text-red-400'
              }`}>
                {(processedData.reduce((sum, r) => sum + r.price.change24h, 0) / processedData.length).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}