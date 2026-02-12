'use client';

import React, { useState, useEffect } from 'react';
import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { NoSSRWrapper } from '@/components/ui/NoSSRWrapper';
import { MintPlatformGrid } from '@/components/ui/MintPlatform';
import { BRC20TokenList } from '@/components/brc20/BRC20TokenList';
import { BRC20Portfolio } from '@/components/brc20/BRC20Portfolio';
import { BRC20Analytics } from '@/components/brc20/BRC20Analytics';
import { BRC20Trading } from '@/components/brc20/BRC20Trading';
import { BRC20MintTracker } from '@/components/brc20/BRC20MintTracker';
import { BRC20DEXActivity } from '@/components/brc20/BRC20DEXActivity';
import { brc20Service, type BRC20Token } from '@/services/BRC20Service';
import { useLaserEyes } from '@omnisat/lasereyes';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Activity,
  Coins,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Timer,
  Shield,
  Zap,
  BarChart3,
  FileText,
  Wallet,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketStats {
  totalMarketCap: number;
  volume24h: number;
  totalTokens: number;
  activeTraders: number;
  change24h: number;
  dominance: number;
}

const BRC20Page = () => {
  const { address } = useLaserEyes();
  const [activeTab, setActiveTab] = useState('market');
  const [brc20Tokens, setBrc20Tokens] = useState<BRC20Token[]>([]);
  const [marketStats, setMarketStats] = useState<MarketStats>({
    totalMarketCap: 0,
    volume24h: 0,
    totalTokens: 0,
    activeTraders: 0,
    change24h: 0,
    dominance: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState<BRC20Token | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load BRC-20 tokens
  useEffect(() => {
    const loadTokens = async () => {
      try {
        setLoading(true);
        const tokens = await brc20Service.getBRC20Tokens();
        setBrc20Tokens(tokens);
        
        // Calculate market stats
        const stats = calculateMarketStats(tokens);
        setMarketStats(stats);
      } catch (error) {
        console.error('Failed to load BRC-20 tokens:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTokens();
  }, []);

  // Price subscriptions removed - Hiro API provides static snapshots, not streams

  const calculateMarketStats = (tokens: BRC20Token[]): MarketStats => {
    const totalMarketCap = tokens.reduce((acc, token) => {
      return acc + (token.marketCap || 0);
    }, 0);

    const volume24h = tokens.reduce((acc, token) => {
      return acc + (token.volume24h || 0);
    }, 0);

    const avgChange = tokens.reduce((acc, token) => {
      return acc + (token.change24h || 0);
    }, 0) / tokens.length;

    return {
      totalMarketCap,
      volume24h,
      totalTokens: tokens.length,
      activeTraders: Math.floor(volume24h / 1000), // Estimate
      change24h: avgChange,
      dominance: totalMarketCap / 1000000000 * 0.089 // Estimate of BTC dominance
    };
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const tokens = await brc20Service.getBRC20Tokens();
      setBrc20Tokens(tokens);
      const stats = calculateMarketStats(tokens);
      setMarketStats(stats);
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredTokens = brc20Tokens.filter(token =>
    token.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <TopNavLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              BRC-20 Tokens
            </h1>
            <p className="text-gray-400 mt-2">Trade and manage Bitcoin token standards</p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-900/50 border-gray-800">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Market Cap</span>
                <DollarSign className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                ${(marketStats.totalMarketCap / 1000000).toFixed(2)}M
              </div>
              <div className={cn(
                "flex items-center text-xs mt-1",
                marketStats.change24h >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {marketStats.change24h >= 0 ? (
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 mr-1" />
                )}
                {Math.abs(marketStats.change24h).toFixed(2)}%
              </div>
            </div>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">24h Volume</span>
                <Activity className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                ${(marketStats.volume24h / 1000000).toFixed(2)}M
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {marketStats.activeTraders.toLocaleString()} traders
              </div>
            </div>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Total Tokens</span>
                <Coins className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {marketStats.totalTokens.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Active BRC-20s
              </div>
            </div>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">BTC Dominance</span>
                <BarChart3 className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {(marketStats.dominance * 100).toFixed(3)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Of Bitcoin market
              </div>
            </div>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search BRC-20 tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-900/50 border-gray-800 text-white"
          />
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-gray-900/50 border-gray-800">
            <TabsTrigger value="market" className="data-[state=active]:bg-orange-500/20">
              <TrendingUp className="w-4 h-4 mr-2" />
              Market
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="data-[state=active]:bg-orange-500/20">
              <Wallet className="w-4 h-4 mr-2" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="minttracker" className="data-[state=active]:bg-orange-500/20">
              <Activity className="w-4 h-4 mr-2" />
              Mint Tracker
            </TabsTrigger>
            <TabsTrigger value="dex" className="data-[state=active]:bg-orange-500/20">
              <BarChart3 className="w-4 h-4 mr-2" />
              DEX Activity
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-orange-500/20">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="trading" className="data-[state=active]:bg-orange-500/20">
              <Zap className="w-4 h-4 mr-2" />
              Trading
            </TabsTrigger>
            <TabsTrigger value="mint" className="data-[state=active]:bg-orange-500/20">
              <FileText className="w-4 h-4 mr-2" />
              Mint/Deploy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="market" className="space-y-4">
            <BRC20TokenList
              tokens={filteredTokens}
              loading={loading}
              onSelectToken={setSelectedToken}
            />
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-4">
            <NoSSRWrapper>
              <BRC20Portfolio
                address={address}
                tokens={brc20Tokens}
              />
            </NoSSRWrapper>
          </TabsContent>

          <TabsContent value="minttracker" className="space-y-4">
            <BRC20MintTracker limit={50} />
          </TabsContent>

          <TabsContent value="dex" className="space-y-4">
            <BRC20DEXActivity limit={50} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <BRC20Analytics
              tokens={brc20Tokens}
              marketStats={marketStats}
            />
          </TabsContent>

          <TabsContent value="trading" className="space-y-4">
            <BRC20Trading
              selectedToken={selectedToken}
              tokens={brc20Tokens}
              onSelectToken={setSelectedToken}
            />
          </TabsContent>

          <TabsContent value="mint" className="space-y-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">
                  BRC-20 Minting Platforms
                </h3>
                <p className="text-gray-400 mb-6">
                  Deploy and mint BRC-20 tokens on trusted platforms
                </p>
                <MintPlatformGrid type="brc20" />
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Features Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gray-900/50 border-gray-800">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Shield className="w-8 h-8 text-orange-500 mr-3" />
                <h3 className="text-lg font-semibold text-white">Secure Trading</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Trade BRC-20 tokens with confidence using our secure, decentralized platform
              </p>
            </div>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Timer className="w-8 h-8 text-orange-500 mr-3" />
                <h3 className="text-lg font-semibold text-white">Real-Time Data</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Get live price updates and market data for all BRC-20 tokens
              </p>
            </div>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <BarChart3 className="w-8 h-8 text-orange-500 mr-3" />
                <h3 className="text-lg font-semibold text-white">Advanced Analytics</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Deep insights and analytics to make informed trading decisions
              </p>
            </div>
          </Card>
        </div>
      </div>
    </TopNavLayout>
  );
};

export default BRC20Page;