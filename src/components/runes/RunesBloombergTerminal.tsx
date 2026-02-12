'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign,
  Users,
  BarChart3,
  Clock,
  Bell,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Target,
  Flame
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamic imports for charts (SSR safe)
const CandlestickChart = dynamic(() => import('./charts/RunesCandlestickChart'), { 
  ssr: false,
  loading: () => <div className="h-96 bg-gray-900/50 animate-pulse rounded-lg flex items-center justify-center">
    <RefreshCw className="h-8 w-8 text-orange-400 animate-spin" />
  </div>
});

const MarketHeatmap = dynamic(() => import('./widgets/RunesMarketHeatmap'), { 
  ssr: false,
  loading: () => <div className="h-64 bg-gray-900/50 animate-pulse rounded-lg" />
});

const OrderBookWidget = dynamic(() => import('./widgets/RunesOrderBook'), { 
  ssr: false,
  loading: () => <div className="h-96 bg-gray-900/50 animate-pulse rounded-lg" />
});

// Types
interface RuneData {
  name: string;
  symbol: string;
  price_btc: number;
  price_usd: number;
  change_24h: number;
  volume_24h: number;
  market_cap: number;
  holders: number;
  supply: number;
  tvl: number;
}

interface MarketAlert {
  id: string;
  type: 'whale' | 'volatility' | 'pattern' | 'volume';
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
  rune: string;
}

export default function RunesBloombergTerminal() {
  const [allRunes, setAllRunes] = useState<RuneData[]>([]);
  const [selectedRune, setSelectedRune] = useState<RuneData | null>(null);
  const [topGainers, setTopGainers] = useState<RuneData[]>([]);
  const [topLosers, setTopLosers] = useState<RuneData[]>([]);
  const [marketAlerts, setMarketAlerts] = useState<MarketAlert[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchRunesData = async () => {
      try {
        const res = await fetch('/api/runes/market-data?limit=20&includeAnalytics=true', {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const json = await res.json();
        const runesRaw = json.data?.runes || json.runes || [];

        const mapped: RuneData[] = runesRaw.map((r: any) => ({
          name: r.name || 'Unknown',
          symbol: r.symbol || r.name?.split('•')[0] || '?',
          price_btc: r.price?.current || 0,
          price_usd: (r.price?.current || 0) * 95000,
          change_24h: r.price?.change24h || 0,
          volume_24h: r.volume?.volume24h || 0,
          market_cap: r.marketCap?.current || 0,
          holders: r.holders || 0,
          supply: r.supply?.circulating || 0,
          tvl: r.liquidity?.totalLiquidity || 0,
        }));

        setAllRunes(mapped);

        const sorted = [...mapped].sort((a, b) => b.holders - a.holders);
        setTopGainers(sorted.slice(0, 5));
        setTopLosers(sorted.slice(-5).reverse());

        if (!selectedRune && mapped.length > 0) {
          setSelectedRune(mapped[0]);
        }

        // Build alerts from top runes by holder count
        const alerts: MarketAlert[] = mapped.slice(0, 3).map((r: RuneData, i: number) => ({
          id: `alert-${i}`,
          type: 'volume' as const,
          message: `${r.name}: ${r.holders.toLocaleString()} holders, ${r.supply.toLocaleString()} supply`,
          timestamp: new Date().toLocaleTimeString(),
          severity: r.holders > 5000 ? 'high' as const : r.holders > 1000 ? 'medium' as const : 'low' as const,
          rune: r.name,
        }));
        setMarketAlerts(alerts);
        setLastUpdate(new Date());
        setIsLive(true);
        setError(null);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch runes data:', err);
          setError('Failed to load runes data');
          setIsLive(false);
        }
      }
    };

    fetchRunesData();
    const interval = setInterval(fetchRunesData, 60000); // CoinGecko rate limit: increased to 60s
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  const formatPrice = (price: number, currency: 'BTC' | 'USD' = 'USD') => {
    if (currency === 'BTC') {
      return `₿${price.toFixed(8)}`;
    }
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatChange = (change: number) => {
    const isPositive = change >= 0;
    return (
      <span className={`flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </span>
    );
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-500 bg-red-500/10 text-red-400';
      case 'medium': return 'border-orange-500 bg-orange-500/10 text-orange-400';
      default: return 'border-blue-500 bg-blue-500/10 text-blue-400';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Terminal Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Target className="h-8 w-8 text-orange-500" />
              <div>
                <h1 className="text-3xl font-bold text-white">
                  RUNES <span className="text-orange-500">TERMINAL</span>
                </h1>
                <p className="text-sm text-gray-400">Bloomberg-Style Professional Trading Interface</p>
              </div>
            </div>
            <Badge className={`${isLive ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-red-500/20 border-red-500 text-red-400'} border`}>
              <div className={`w-2 h-2 ${isLive ? 'bg-green-400' : 'bg-red-400'} rounded-full mr-2 ${isLive ? 'animate-pulse' : ''}`} />
              {isLive ? 'LIVE' : 'OFFLINE'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-400">Last Update</div>
              <div className="text-sm text-white font-mono">{lastUpdate.toLocaleTimeString()}</div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-orange-500/50 hover:border-orange-500"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Selected Rune Header */}
        {selectedRune && (
          <Card className="bg-gray-900/50 border-orange-500/30">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                <div className="md:col-span-2">
                  <h2 className="text-2xl font-bold text-orange-400 mb-2">{selectedRune.name}</h2>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-white">
                      {selectedRune.supply > 0 ? `${(selectedRune.supply / 1_000_000).toFixed(1)}M supply` : '--'}
                    </div>
                    <div className="text-lg text-gray-400">
                      {selectedRune.holders.toLocaleString()} holders
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:col-span-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Total Supply</div>
                    <div className="text-lg font-bold text-white">
                      {selectedRune.supply > 0 ? `${(selectedRune.supply / 1_000_000).toFixed(1)}M` : '--'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Transfers</div>
                    <div className="text-lg font-bold text-white">
                      {selectedRune.volume_24h > 0 ? selectedRune.volume_24h.toLocaleString() : '--'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Holders</div>
                    <div className="text-lg font-bold text-white">
                      {selectedRune.holders.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Symbol</div>
                    <div className="text-lg font-bold text-white">
                      {selectedRune.symbol}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Price Chart - Takes 2 columns on large screens */}
        <Card className="lg:col-span-2 bg-black/50 border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-orange-400 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Price Chart - {selectedRune?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CandlestickChart rune={selectedRune} />
          </CardContent>
        </Card>

        {/* Order Book */}
        <Card className="bg-black/50 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-blue-400 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Order Book
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OrderBookWidget rune={selectedRune} />
          </CardContent>
        </Card>
      </div>

      {/* Secondary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Top Gainers */}
        <Card className="bg-black/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Runes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topGainers.map((rune, index) => (
                <div 
                  key={rune.name}
                  className="flex items-center justify-between p-2 hover:bg-gray-800/50 rounded cursor-pointer transition-colors"
                  onClick={() => setSelectedRune(rune)}
                >
                  <div>
                    <div className="font-bold text-white text-sm">{rune.symbol}</div>
                    <div className="text-xs text-gray-400">{rune.holders.toLocaleString()} holders</div>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    {rune.supply > 0 ? `${(rune.supply / 1_000_000).toFixed(1)}M` : '--'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Losers */}
        <Card className="bg-black/50 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              More Runes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topLosers.map((rune, index) => (
                <div 
                  key={rune.name}
                  className="flex items-center justify-between p-2 hover:bg-gray-800/50 rounded cursor-pointer transition-colors"
                  onClick={() => setSelectedRune(rune)}
                >
                  <div>
                    <div className="font-bold text-white text-sm">{rune.symbol}</div>
                    <div className="text-xs text-gray-400">{rune.holders.toLocaleString()} holders</div>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    {rune.supply > 0 ? `${(rune.supply / 1_000_000).toFixed(1)}M` : '--'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Market Alerts */}
        <Card className="bg-black/50 border-yellow-500/30">
          <CardHeader>
            <CardTitle className="text-yellow-400 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Live Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {marketAlerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-3 rounded border ${getAlertColor(alert.severity)}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-xs font-bold uppercase">{alert.type}</span>
                  </div>
                  <div className="text-xs">{alert.message}</div>
                  <div className="text-xs opacity-70 mt-1">{alert.timestamp}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-black/50 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-purple-400 flex items-center gap-2">
              <Flame className="h-5 w-5" />
              Quick Trade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedRune && (
                <>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-1">Selected</div>
                    <div className="font-bold text-white">{selectedRune.symbol}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <Link 
                      href={`https://app.runesdex.com/swap?base=BTC&quote=${selectedRune.name}&utm_source=terminal&utm_medium=dashboard&utm_campaign=trade`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Buy on RunesDEX
                      </Button>
                    </Link>
                    
                    <Link 
                      href={`https://unisat.io/market/brc20?tick=${selectedRune.symbol}&utm_source=terminal&utm_medium=dashboard&utm_campaign=trade`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="w-full border-orange-500/50 hover:border-orange-500">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Trade on UniSat
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card className="bg-black/50 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Market Heatmap - Liquidity & Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MarketHeatmap />
        </CardContent>
      </Card>
    </div>
  );
}