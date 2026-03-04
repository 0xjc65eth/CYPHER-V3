'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Treemap
} from 'recharts';
import {
  Hash,
  TrendingUp,
  TrendingDown,
  Image,
  Zap,
  Eye,
  Star,
  Crown,
  Gem,
  Activity,
  Target,
  Layers,
  Maximize2,
  Download,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrdinalsActivity } from '@/hooks/useOrdinalsActivity';
import { useOrdinalsFloorPrices } from '@/hooks/useOrdinalsFloorPrices';

// Types
export interface OrdinalsCollection {
  id: string;
  name: string;
  symbol: string;
  floorPrice: number;
  volume24h: number;
  volumeChange24h: number;
  marketCap: number;
  totalSupply: number;
  owners: number;
  listedCount: number;
  averagePrice: number;
  lastSale: number;
  royalty: number;
  verified: boolean;
  category: string;
  blockchain: 'bitcoin' | 'ethereum';
  image?: string;
}

export interface OrdinalsInscription {
  id: string;
  number: number;
  collectionId?: string;
  owner: string;
  contentType: string;
  contentLength: number;
  fee: number;
  height: number;
  timestamp: number;
  sat: number;
  output: string;
  address: string;
  value: number;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  attributes?: Array<{
    trait_type: string;
    value: string;
    rarity: number;
  }>;
}

export interface OrdinalsMetrics {
  totalInscriptions: number;
  totalVolume24h: number;
  averageInscriptionFee: number;
  totalCollections: number;
  activeTraders: number;
  floorPriceChange24h: number;
  inscriptionGrowthRate: number;
  marketCapTotal: number;
}

export interface OrdinalsChartProps {
  collection?: string;
  timeframe?: '1d' | '7d' | '30d' | '90d' | '1y' | 'all';
  showVolume?: boolean;
  showFloorPrice?: boolean;
  showInscriptions?: boolean;
  category?: string;
  height?: number;
  allowFullscreen?: boolean;
}

// Custom Tooltip Components
const CollectionTooltip = ({ active, payload, label }: { active?: boolean; payload?: any; label?: any }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border max-w-xs">
        <p className="font-semibold mb-2">{data.name}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Floor Price:</span>
            <span className="font-medium">{data.floorPrice} BTC</span>
          </div>
          <div className="flex justify-between">
            <span>24h Volume:</span>
            <span className="font-medium">{data.volume24h.toLocaleString()} BTC</span>
          </div>
          <div className="flex justify-between">
            <span>Market Cap:</span>
            <span className="font-medium">{data.marketCap.toLocaleString()} BTC</span>
          </div>
          <div className="flex justify-between">
            <span>Owners:</span>
            <span className="font-medium">{data.owners.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Supply:</span>
            <span className="font-medium">{data.totalSupply.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const InscriptionTooltip = ({ active, payload, label }: { active?: boolean; payload?: any; label?: any }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border max-w-xs">
        <p className="font-semibold mb-2">Inscription #{data.number}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Type:</span>
            <span className="font-medium">{data.contentType}</span>
          </div>
          <div className="flex justify-between">
            <span>Size:</span>
            <span className="font-medium">{data.contentLength} bytes</span>
          </div>
          <div className="flex justify-between">
            <span>Fee:</span>
            <span className="font-medium">{data.fee} sats</span>
          </div>
          <div className="flex justify-between">
            <span>Block:</span>
            <span className="font-medium">{data.height}</span>
          </div>
          {data.rarity && (
            <div className="flex justify-between">
              <span>Rarity:</span>
              <Badge variant={data.rarity === 'mythic' ? 'destructive' : 'default'}>
                {data.rarity}
              </Badge>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// Color schemes
const RARITY_COLORS = {
  common: '#6B7280',
  uncommon: '#10B981',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
  mythic: '#EF4444'
};

const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

export const OrdinalsChart: React.FC<OrdinalsChartProps> = ({
  collection,
  timeframe = '7d',
  showVolume = true,
  showFloorPrice = true,
  showInscriptions = true,
  category,
  height = 400,
  allowFullscreen = true
}) => {
  // State
  const [selectedCollection, setSelectedCollection] = useState(collection || 'all');
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [activeTab, setActiveTab] = useState<'overview' | 'collections' | 'inscriptions' | 'analytics'>('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(category || 'all');
  const [sortBy, setSortBy] = useState<'volume' | 'floor' | 'marketcap' | 'growth'>('volume');
  const [rarityFilter, setRarityFilter] = useState<string>('all');

  // Hooks
  const ordinalsActivityData = useOrdinalsActivity() as any;
  const {
    collections,
    inscriptions,
    metrics,
    activity,
    loading,
    error,
    refetch
  } = ordinalsActivityData;

  const floorPricesData = useOrdinalsFloorPrices() as any;
  const {
    floorPrices,
    priceHistory,
    loading: floorLoading
  } = floorPricesData;

  // Process collections data
  const processedCollections = useMemo(() => {
    if (!collections) return [];
    
    let filtered = collections;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((c: any) => c.category === selectedCategory);
    }
    
    // Sort collections
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'volume':
          return b.volume24h - a.volume24h;
        case 'floor':
          return b.floorPrice - a.floorPrice;
        case 'marketcap':
          return b.marketCap - a.marketCap;
        case 'growth':
          return b.volumeChange24h - a.volumeChange24h;
        default:
          return b.volume24h - a.volume24h;
      }
    });

    return filtered.map((collection: any, index: number) => ({
      ...collection,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    }));
  }, [collections, selectedCategory, sortBy]);

  // Process inscriptions data
  const processedInscriptions = useMemo(() => {
    if (!inscriptions) return [];
    
    let filtered = inscriptions;
    
    if (rarityFilter !== 'all') {
      filtered = filtered.filter((i: any) => i.rarity === rarityFilter);
    }

    return filtered.sort((a: any, b: any) => b.timestamp - a.timestamp);
  }, [inscriptions, rarityFilter]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    if (!collections) return [];
    
    const categories = collections.reduce((acc: Record<string, any>, collection: any) => {
      const cat = collection.category || 'Other';
      if (!acc[cat]) {
        acc[cat] = { name: cat, count: 0, volume: 0, marketCap: 0 };
      }
      acc[cat].count++;
      acc[cat].volume += collection.volume24h;
      acc[cat].marketCap += collection.marketCap;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(categories).map((cat: any, index: number) => ({
      ...cat,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    }));
  }, [collections]);

  // Rarity distribution
  const rarityDistribution = useMemo(() => {
    if (!inscriptions) return [];

    const rarities = inscriptions.reduce((acc: Record<string, number>, inscription: any) => {
      const rarity = inscription.rarity || 'common';
      acc[rarity] = (acc[rarity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(rarities).map(([rarity, count]) => ({
      name: rarity,
      value: count,
      color: RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] || '#6B7280'
    }));
  }, [inscriptions]);

  // Fee analysis data
  const feeAnalysis = useMemo(() => {
    if (!inscriptions) return [];
    
    const feeRanges = {
      'Low (0-1000)': inscriptions.filter((i: any) => i.fee < 1000).length,
      'Medium (1000-10000)': inscriptions.filter((i: any) => i.fee >= 1000 && i.fee < 10000).length,
      'High (10000-50000)': inscriptions.filter((i: any) => i.fee >= 10000 && i.fee < 50000).length,
      'Very High (50000+)': inscriptions.filter((i: any) => i.fee >= 50000).length
    };

    return Object.entries(feeRanges).map(([range, count]: [string, number], index: number) => ({
      name: range,
      value: count,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    }));
  }, [inscriptions]);

  // Timeframe options
  const timeframes = [
    { value: '1d', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
    { value: '1y', label: '1Y' },
    { value: 'all', label: 'All' }
  ];

  // Categories
  const categories = ['all', 'art', 'pfp', 'gaming', 'utility', 'meme', 'music', 'other'];

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Loading state
  if (loading || floorLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-6 w-48 rounded" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-md" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="w-full border-red-200 dark:border-red-800">
        <CardContent className="py-8">
          <div className="text-center">
            <Hash className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <div className="text-red-500 mb-2">Ordinals Data Error</div>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button onClick={refetch} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-4' : ''}`}
    >
      <Card className="w-full h-full">
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Ordinals Analytics
              </CardTitle>
              
              {metrics && (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="flex items-center gap-1">
                    <Image className="w-3 h-3" />
                    {metrics.totalInscriptions.toLocaleString()}
                  </Badge>
                  <Badge variant="outline">
                    {metrics.totalVolume24h.toFixed(2)} BTC
                  </Badge>
                  <Badge variant="outline" className={
                    metrics.floorPriceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                  }>
                    {metrics.floorPriceChange24h >= 0 ? '+' : ''}{metrics.floorPriceChange24h.toFixed(2)}%
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Collection Selector */}
              <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Collections</SelectItem>
                  {processedCollections.slice(0, 10).map((collection: any) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Timeframe Selector */}
              <Select value={selectedTimeframe} onValueChange={(v) => setSelectedTimeframe(v as any)}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeframes.map((tf) => (
                    <SelectItem key={tf.value} value={tf.value}>
                      {tf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" onClick={refetch}>
                <RefreshCw className="w-4 h-4" />
              </Button>

              {allowFullscreen && (
                <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                  <Maximize2 className="w-4 h-4" />
                </Button>
              )}

              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Total Inscriptions</div>
                <div className="text-lg font-bold">{metrics.totalInscriptions.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">24h Volume</div>
                <div className="text-lg font-bold">{metrics.totalVolume24h.toFixed(2)} BTC</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Collections</div>
                <div className="text-lg font-bold">{metrics.totalCollections}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Active Traders</div>
                <div className="text-lg font-bold">{metrics.activeTraders.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Avg Fee</div>
                <div className="text-lg font-bold">{metrics.averageInscriptionFee.toLocaleString()} sats</div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="collections">Collections</TabsTrigger>
              <TabsTrigger value="inscriptions">Inscriptions</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <div className="p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <TabsContent value="overview" className="mt-0">
                    <div className="space-y-6">
                      {/* Volume and Floor Price Chart */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3">Volume Trend</h4>
                          <ResponsiveContainer width="100%" height={height}>
                            <AreaChart data={activity}>
                              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                              <XAxis dataKey="timestamp" className="text-xs" />
                              <YAxis className="text-xs" />
                              <Tooltip />
                              <Area
                                type="monotone"
                                dataKey="volume"
                                stroke="#3B82F6"
                                fill="#3B82F6"
                                fillOpacity={0.3}
                                name="Volume (BTC)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3">Floor Price History</h4>
                          <ResponsiveContainer width="100%" height={height}>
                            <LineChart data={priceHistory}>
                              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                              <XAxis dataKey="timestamp" className="text-xs" />
                              <YAxis className="text-xs" />
                              <Tooltip />
                              <Line
                                type="monotone"
                                dataKey="floorPrice"
                                stroke="#10B981"
                                strokeWidth={2}
                                name="Floor Price (BTC)"
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Category Breakdown */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3">Category Distribution</h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={categoryBreakdown}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                                label={({ name, count }: any) => `${name}: ${count}`}
                              >
                                {categoryBreakdown.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3">Top Collections by Volume</h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={processedCollections.slice(0, 8)}>
                              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                              <XAxis dataKey="symbol" className="text-xs" />
                              <YAxis className="text-xs" />
                              <Tooltip content={<CollectionTooltip />} />
                              <Bar dataKey="volume24h" fill="#3B82F6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="collections" className="mt-0">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold">Collection Rankings</h4>
                        <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="volume">Volume</SelectItem>
                            <SelectItem value="floor">Floor Price</SelectItem>
                            <SelectItem value="marketcap">Market Cap</SelectItem>
                            <SelectItem value="growth">Growth</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Collections Chart */}
                      <ResponsiveContainer width="100%" height={height}>
                        <ScatterChart data={processedCollections}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis 
                            dataKey="floorPrice" 
                            name="Floor Price"
                            className="text-xs"
                            label={{ value: 'Floor Price (BTC)', position: 'insideBottom', offset: -10 }}
                          />
                          <YAxis 
                            dataKey="volume24h" 
                            name="Volume"
                            className="text-xs"
                            label={{ value: 'Volume (BTC)', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip content={<CollectionTooltip />} />
                          <Scatter dataKey="volume24h" fill="#3B82F6" fillOpacity={0.7} />
                        </ScatterChart>
                      </ResponsiveContainer>

                      {/* Collections Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Collection</th>
                              <th className="text-right p-2">Floor Price</th>
                              <th className="text-right p-2">24h Volume</th>
                              <th className="text-right p-2">Market Cap</th>
                              <th className="text-right p-2">Owners</th>
                              <th className="text-right p-2">Supply</th>
                              <th className="text-center p-2">Verified</th>
                            </tr>
                          </thead>
                          <tbody>
                            {processedCollections.slice(0, 15).map((collection: any) => (
                              <tr key={collection.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="p-2">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: collection.color }}
                                    />
                                    <div>
                                      <div className="font-medium">{collection.name}</div>
                                      <div className="text-xs text-gray-500">{collection.symbol}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="text-right p-2 font-medium">
                                  {collection.floorPrice.toFixed(4)} BTC
                                </td>
                                <td className="text-right p-2">
                                  {collection.volume24h.toFixed(2)} BTC
                                </td>
                                <td className="text-right p-2">
                                  {collection.marketCap.toFixed(2)} BTC
                                </td>
                                <td className="text-right p-2">
                                  {collection.owners.toLocaleString()}
                                </td>
                                <td className="text-right p-2">
                                  {collection.totalSupply.toLocaleString()}
                                </td>
                                <td className="text-center p-2">
                                  {collection.verified ? (
                                    <Badge variant="default" className="text-xs">
                                      <Crown className="w-3 h-3" />
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="inscriptions" className="mt-0">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold">Recent Inscriptions</h4>
                        <Select value={rarityFilter} onValueChange={setRarityFilter}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Rarities</SelectItem>
                            <SelectItem value="common">Common</SelectItem>
                            <SelectItem value="uncommon">Uncommon</SelectItem>
                            <SelectItem value="rare">Rare</SelectItem>
                            <SelectItem value="epic">Epic</SelectItem>
                            <SelectItem value="legendary">Legendary</SelectItem>
                            <SelectItem value="mythic">Mythic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Rarity Distribution */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-medium mb-3">Rarity Distribution</h5>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={rarityDistribution}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, value }: any) => `${name}: ${value}`}
                              >
                                {rarityDistribution.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div>
                          <h5 className="font-medium mb-3">Fee Distribution</h5>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={feeAnalysis}>
                              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                              <XAxis dataKey="name" className="text-xs" />
                              <YAxis className="text-xs" />
                              <Tooltip />
                              <Bar dataKey="value">
                                {feeAnalysis.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Inscriptions List */}
                      <div className="space-y-3">
                        <h5 className="font-medium">Latest Inscriptions</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                          {processedInscriptions.slice(0, 20).map((inscription: any) => (
                            <div 
                              key={inscription.id} 
                              className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">#{inscription.number}</span>
                                {inscription.rarity && (
                                  <Badge 
                                    variant={inscription.rarity === 'mythic' ? 'destructive' : 'default'}
                                    className="text-xs"
                                    style={{ 
                                      backgroundColor: RARITY_COLORS[inscription.rarity as keyof typeof RARITY_COLORS],
                                      color: 'white'
                                    }}
                                  >
                                    {inscription.rarity}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Type:</span>
                                  <span>{inscription.contentType}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Size:</span>
                                  <span>{inscription.contentLength} bytes</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Fee:</span>
                                  <span>{inscription.fee.toLocaleString()} sats</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Block:</span>
                                  <span>{inscription.height}</span>
                                </div>
                              </div>

                              {inscription.attributes && inscription.attributes.length > 0 && (
                                <div className="mt-3">
                                  <div className="text-xs text-gray-500 mb-1">Attributes:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {inscription.attributes.slice(0, 3).map((attr: any, index: number) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {attr.trait_type}: {attr.value}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="analytics" className="mt-0">
                    <div className="space-y-6">
                      <h4 className="font-semibold">Advanced Analytics</h4>
                      
                      {/* Growth Metrics */}
                      {metrics && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-blue-700 dark:text-blue-300">Inscription Growth</div>
                                <div className="text-2xl font-bold text-blue-600">
                                  +{metrics.inscriptionGrowthRate.toFixed(1)}%
                                </div>
                                <div className="text-xs text-blue-600">Daily rate</div>
                              </div>
                              <Activity className="w-8 h-8 text-blue-500" />
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-green-700 dark:text-green-300">Total Market Cap</div>
                                <div className="text-2xl font-bold text-green-600">
                                  {metrics.marketCapTotal.toFixed(0)} BTC
                                </div>
                                <div className="text-xs text-green-600">All collections</div>
                              </div>
                              <Target className="w-8 h-8 text-green-500" />
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-purple-700 dark:text-purple-300">Active Traders</div>
                                <div className="text-2xl font-bold text-purple-600">
                                  {metrics.activeTraders.toLocaleString()}
                                </div>
                                <div className="text-xs text-purple-600">24h period</div>
                              </div>
                              <Zap className="w-8 h-8 text-purple-500" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Volume Analysis */}
                      <div>
                        <h5 className="font-medium mb-3">Volume Analysis by Collection</h5>
                        <ResponsiveContainer width="100%" height={height}>
                          <Treemap
                            data={processedCollections.slice(0, 20).map((c: any) => ({
                              name: c.symbol,
                              size: c.volume24h,
                              fill: c.color
                            })) as any}
                            dataKey="size"
                            {...{ ratio: 4/3 } as any}
                            stroke="#fff"
                            fill="#8884d8"
                          />
                        </ResponsiveContainer>
                      </div>

                      {/* Market Analysis */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
                          <h5 className="font-medium mb-4">Market Health Score</h5>
                          <div className="flex items-center gap-4">
                            <div className="text-3xl font-bold text-blue-600">
                              {(() => {
                                if (!metrics) return '0.0';
                                const score = Math.min(10, Math.max(0,
                                  (metrics.totalVolume24h / 100) +
                                  (metrics.inscriptionGrowthRate / 10) +
                                  (metrics.activeTraders / 1000) +
                                  ((100 + metrics.floorPriceChange24h) / 20)
                                ));
                                return score.toFixed(1);
                              })()}/10
                            </div>
                            <div className="flex-1">
                              <div className="text-sm text-gray-600 mb-1">
                                Based on volume, growth, activity, and price trends
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${metrics ? Math.min(100, Math.max(0,
                                      ((metrics.totalVolume24h / 100) +
                                       (metrics.inscriptionGrowthRate / 10) +
                                       (metrics.activeTraders / 1000) +
                                       ((100 + metrics.floorPriceChange24h) / 20)) * 10
                                    )) : 0}%`
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
                          <h5 className="font-medium mb-4">Key Insights</h5>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Gem className="w-4 h-4 text-blue-500" />
                              <span>Most active category: {categoryBreakdown[0]?.name || 'Art'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span>Highest rarity: {String(rarityDistribution.find(r => r.name === 'mythic')?.value || 0)} mythic inscriptions</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-green-500" />
                              <span>Growth trend: {metrics && metrics.inscriptionGrowthRate > 0 ? 'Increasing' : 'Stable'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4 text-purple-500" />
                              <span>Total collections: {metrics?.totalCollections || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default OrdinalsChart;