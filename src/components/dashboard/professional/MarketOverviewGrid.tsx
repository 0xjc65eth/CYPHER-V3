'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Globe,
  ArrowUp,
  ArrowDown,
  Minus,
  Loader2
} from 'lucide-react';

interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  icon: string;
}

interface MarketStats {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  fearGreedIndex: number;
  altcoinSeason: boolean;
}

export function MarketOverviewGrid() {
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchMarketData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/data/');
      if (!mountedRef.current) return;

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const json = await res.json();
      const data = json.data || json;
      const tickers = data.tickers || [];
      const overview = data.overview || {};

      // Map top assets
      const iconMap: Record<string, string> = {
        BTC: '\u20BF', ETH: '\u039E', SOL: '\u25CE', ORDI: '\uD83D\uDFE0',
      };

      const topSymbols = ['BTC', 'ETH', 'SOL', 'ORDI'];
      const mapped: MarketAsset[] = topSymbols.map(sym => {
        const ticker = tickers.find((t: any) =>
          (t.symbol || '').toUpperCase() === sym ||
          (t.symbol || '').toUpperCase() === `${sym}USDT`
        );
        return {
          symbol: sym,
          name: ticker?.name || sym,
          price: ticker?.price || ticker?.lastPrice || 0,
          change24h: ticker?.change24h || ticker?.priceChangePercent24h || 0,
          volume24h: ticker?.volume24h || ticker?.quoteVolume || 0,
          marketCap: ticker?.marketCap || 0,
          icon: iconMap[sym] || sym.charAt(0),
        };
      }).filter(a => a.price > 0);

      setAssets(mapped);

      // Map market stats
      if (overview.totalMarketCap || tickers.length > 0) {
        setMarketStats({
          totalMarketCap: overview.totalMarketCap || 0,
          totalVolume24h: overview.totalVolume24h || 0,
          btcDominance: overview.btcDominance || 0,
          fearGreedIndex: overview.fearGreedIndex || 0,
          altcoinSeason: overview.altcoinSeason || false,
        });
      }

      setLoading(false);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('MarketOverviewGrid fetch error:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchMarketData();

    const interval = setInterval(fetchMarketData, 30000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchMarketData]);

  const formatNumber = (num: number): string => {
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const getFearGreedColor = (index: number): string => {
    if (index < 20) return 'text-red-500';
    if (index < 40) return 'text-orange-500';
    if (index < 60) return 'text-yellow-500';
    if (index < 80) return 'text-green-500';
    return 'text-emerald-500';
  };

  const getFearGreedLabel = (index: number): string => {
    if (index < 20) return 'Extreme Fear';
    if (index < 40) return 'Fear';
    if (index < 60) return 'Neutral';
    if (index < 80) return 'Greed';
    return 'Extreme Greed';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
        <span className="ml-2 text-sm text-gray-400">Loading market data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Market Stats Summary */}
      {marketStats && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 bg-gray-800/30 border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Market Cap</p>
                  <p className="text-lg font-bold">
                    {marketStats.totalMarketCap > 0 ? `$${formatNumber(marketStats.totalMarketCap)}` : '--'}
                  </p>
                </div>
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
            </Card>

            <Card className="p-3 bg-gray-800/30 border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">24h Volume</p>
                  <p className="text-lg font-bold">
                    {marketStats.totalVolume24h > 0 ? `$${formatNumber(marketStats.totalVolume24h)}` : '--'}
                  </p>
                </div>
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
            </Card>
          </div>

          {/* Fear & Greed Index */}
          {marketStats.fearGreedIndex > 0 && (
            <Card className="p-4 bg-gray-800/30 border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Fear & Greed Index</h4>
                <Badge className={`${getFearGreedColor(marketStats.fearGreedIndex)} bg-opacity-20`}>
                  {marketStats.fearGreedIndex}
                </Badge>
              </div>
              <Progress value={marketStats.fearGreedIndex} className="h-2 mb-2" />
              <p className={`text-xs ${getFearGreedColor(marketStats.fearGreedIndex)}`}>
                {getFearGreedLabel(marketStats.fearGreedIndex)}
              </p>
            </Card>
          )}

          {/* BTC Dominance */}
          {marketStats.btcDominance > 0 && (
            <Card className="p-3 bg-gray-800/30 border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{'\u20BF'}</span>
                  <div>
                    <p className="text-xs text-gray-400">BTC Dominance</p>
                    <p className="font-bold">{marketStats.btcDominance.toFixed(1)}%</p>
                  </div>
                </div>
                {marketStats.altcoinSeason && (
                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                    Alt Season
                  </Badge>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Top Assets */}
      {assets.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-400">Top Assets</h4>
          {assets.map((asset, index) => (
            <motion.div
              key={asset.symbol}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-3 bg-gray-800/30 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-700/50 rounded-lg flex items-center justify-center text-lg">
                      {asset.icon}
                    </div>
                    <div>
                      <p className="font-medium">{asset.symbol}</p>
                      <p className="text-xs text-gray-400">{asset.name}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-medium">${asset.price.toLocaleString()}</p>
                    <div className="flex items-center gap-1 justify-end">
                      {asset.change24h > 0 ? (
                        <ArrowUp className="w-3 h-3 text-green-400" />
                      ) : asset.change24h < 0 ? (
                        <ArrowDown className="w-3 h-3 text-red-400" />
                      ) : (
                        <Minus className="w-3 h-3 text-gray-400" />
                      )}
                      <span className={`text-xs ${
                        asset.change24h > 0 ? 'text-green-400' :
                        asset.change24h < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {Math.abs(asset.change24h).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                  {asset.volume24h > 0 && <span>Vol ${formatNumber(asset.volume24h)}</span>}
                  {asset.marketCap > 0 && <span>MCap ${formatNumber(asset.marketCap)}</span>}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Market data unavailable</p>
        </div>
      )}
    </div>
  );
}
