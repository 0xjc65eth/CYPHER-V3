/**
 * CollectionComparison Component
 * Side-by-side comparison of multiple Ordinals collections
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Users, Layers, DollarSign, X } from 'lucide-react';
import { useTradingMetrics } from '@/hooks/ordinals/useTradingMetrics';
import { useMarketDepth } from '@/hooks/ordinals/useMarketDepth';
import { useOrderBook } from '@/hooks/ordinals/useOrderBook';
import { ExportButton } from '@/components/common/ExportButton';

interface CollectionComparisonProps {
  initialCollections?: string[];
}

interface ComparisonMetric {
  symbol: string;
  name: string;
  floor: number;
  volume24h: number;
  spread: number;
  liquidity: number;
  vwap24h: number;
  trades24h: number;
  uniqueBuyers: number;
}

function CollectionMetrics({ symbol }: { symbol: string }) {
  const { metrics } = useTradingMetrics({ symbol });
  const { depthAnalysis } = useMarketDepth({ symbol });
  const { orderBook } = useOrderBook({ symbol });

  if (!metrics || !depthAnalysis || !orderBook) {
    return null;
  }

  return {
    floor: metrics.currentFloor,
    volume24h: metrics.volume.volume24h,
    spread: orderBook.spreadPercentage,
    liquidity: depthAnalysis.liquidity.liquidityScore,
    vwap24h: metrics.vwap24h,
    trades24h: metrics.trades.trades24h,
    uniqueBuyers: metrics.trades.uniqueBuyers24h
  };
}

export default function CollectionComparison({ initialCollections = [] }: CollectionComparisonProps) {
  const [collections, setCollections] = useState<string[]>(initialCollections);
  const [newCollection, setNewCollection] = useState('');
  const [collectionData, setCollectionData] = useState<ComparisonMetric[]>([]);

  const addCollection = () => {
    if (newCollection && !collections.includes(newCollection) && collections.length < 5) {
      setCollections([...collections, newCollection]);
      setNewCollection('');
    }
  };

  const removeCollection = (symbol: string) => {
    setCollections(collections.filter(c => c !== symbol));
  };

  const popularCollections = [
    { symbol: 'nodemonkes', name: 'NodeMonkes' },
    { symbol: 'bitcoin-puppets', name: 'Bitcoin Puppets' },
    { symbol: 'runestones', name: 'Runestones' },
    { symbol: 'quantum-cats', name: 'Quantum Cats' },
    { symbol: 'bitcoin-frogs', name: 'Bitcoin Frogs' }
  ];

  return (
    <Card className="bg-[#0d0d1a] border-[#1a1a2e]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Collection Comparison</CardTitle>
          <div className="flex items-center gap-2">
            <ExportButton
              type="custom"
              data={collectionData}
              columns={[
                { key: 'symbol', label: 'Symbol' },
                { key: 'name', label: 'Name' },
                { key: 'floor', label: 'Floor (BTC)' },
                { key: 'volume24h', label: 'Volume 24h (BTC)' },
                { key: 'vwap24h', label: 'VWAP 24h (BTC)' },
                { key: 'spread', label: 'Spread %' },
                { key: 'liquidity', label: 'Liquidity Score' },
                { key: 'trades24h', label: 'Trades 24h' },
              ]}
              title="Collection Comparison"
              filename="collection-comparison"
              size="sm"
              variant="outline"
              disabled={collectionData.length === 0}
            />
            <Badge variant="outline" className="text-xs">
              {collections.length}/5 Collections
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Collection Selector */}
        <div className="mb-4">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newCollection}
              onChange={(e) => setNewCollection(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCollection()}
              placeholder="Enter collection symbol..."
              className="flex-1 bg-[#1a1a2e] border border-[#2a2a3e] text-white text-sm px-3 py-2 rounded-lg font-mono focus:border-[#F7931A] focus:outline-none"
              disabled={collections.length >= 5}
            />
            <button
              onClick={addCollection}
              disabled={!newCollection || collections.length >= 5}
              className="px-4 py-2 bg-[#F7931A] hover:bg-[#F7931A]/80 text-black text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {/* Quick Add Popular Collections */}
          <div className="flex flex-wrap gap-2">
            {popularCollections
              .filter(c => !collections.includes(c.symbol))
              .map(collection => (
                <button
                  key={collection.symbol}
                  onClick={() => {
                    if (collections.length < 5) {
                      setCollections([...collections, collection.symbol]);
                    }
                  }}
                  disabled={collections.length >= 5}
                  className="px-3 py-1 bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white text-xs rounded-lg transition-colors border border-[#2a2a3e] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + {collection.name}
                </button>
              ))}
          </div>
        </div>

        {/* Comparison Table */}
        {collections.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a3e]">
                  <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase">Collection</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground uppercase">Floor</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground uppercase">Volume 24h</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground uppercase">VWAP 24h</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground uppercase">Spread</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground uppercase">Liquidity</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground uppercase">Trades</th>
                  <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground uppercase"></th>
                </tr>
              </thead>
              <tbody>
                {collections.map((symbol, index) => (
                  <CollectionRow
                    key={symbol}
                    symbol={symbol}
                    onRemove={() => removeCollection(symbol)}
                    isLast={index === collections.length - 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">No collections selected</p>
            <p className="text-xs text-muted-foreground">Add collections to compare their metrics</p>
          </div>
        )}

        {/* Comparison Insights */}
        {collections.length >= 2 && (
          <div className="mt-4 pt-4 border-t border-[#2a2a3e]">
            <h4 className="text-xs font-medium text-white mb-2">Comparison Insights</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• Compare floor prices, volume, and liquidity across {collections.length} collections</p>
              <p>• Identify relative value opportunities and market leaders</p>
              <p>• Analyze spread tightness and trading activity differences</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CollectionRow({ symbol, onRemove, isLast }: { symbol: string; onRemove: () => void; isLast: boolean }) {
  const { metrics, isLoading: metricsLoading } = useTradingMetrics({ symbol });
  const { depthAnalysis, isLoading: depthLoading } = useMarketDepth({ symbol });
  const { orderBook, isLoading: orderBookLoading } = useOrderBook({ symbol });

  const isLoading = metricsLoading || depthLoading || orderBookLoading;

  if (isLoading) {
    return (
      <tr className={`${!isLast ? 'border-b border-[#2a2a3e]' : ''}`}>
        <td colSpan={8} className="py-4 px-2 text-center text-xs text-muted-foreground">
          Loading {symbol}...
        </td>
      </tr>
    );
  }

  if (!metrics || !depthAnalysis || !orderBook) {
    return (
      <tr className={`${!isLast ? 'border-b border-[#2a2a3e]' : ''}`}>
        <td colSpan={8} className="py-4 px-2 text-center text-xs text-red-400">
          Failed to load {symbol}
        </td>
      </tr>
    );
  }

  const floorVsVwap = metrics.floorVsVwapPercentage;

  return (
    <tr className={`hover:bg-[#1a1a2e] transition-colors ${!isLast ? 'border-b border-[#2a2a3e]' : ''}`}>
      <td className="py-3 px-2">
        <span className="font-mono font-medium text-white">{symbol}</span>
      </td>
      <td className="py-3 px-2 text-right">
        <div className="font-mono text-white">{metrics.currentFloor.toFixed(6)}</div>
        <div className="text-xs text-muted-foreground">BTC</div>
      </td>
      <td className="py-3 px-2 text-right">
        <div className="font-mono text-white">{metrics.volume.volume24h.toFixed(2)}</div>
        <div className="text-xs text-muted-foreground">BTC</div>
      </td>
      <td className="py-3 px-2 text-right">
        <div className="font-mono text-white">{metrics.vwap24h.toFixed(6)}</div>
        <div className={`text-xs flex items-center justify-end gap-1 ${
          floorVsVwap > 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          {floorVsVwap > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(floorVsVwap).toFixed(1)}%
        </div>
      </td>
      <td className="py-3 px-2 text-right">
        <div className={`font-mono ${
          orderBook.spreadPercentage < 1 ? 'text-green-400' :
          orderBook.spreadPercentage < 2 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {orderBook.spreadPercentage.toFixed(2)}%
        </div>
      </td>
      <td className="py-3 px-2 text-right">
        <div className={`font-mono ${
          depthAnalysis.liquidity.liquidityScore >= 70 ? 'text-green-400' :
          depthAnalysis.liquidity.liquidityScore >= 40 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {depthAnalysis.liquidity.liquidityScore.toFixed(0)}
        </div>
      </td>
      <td className="py-3 px-2 text-right">
        <div className="font-mono text-white">{metrics.trades.trades24h}</div>
        <div className="text-xs text-muted-foreground">{metrics.trades.uniqueBuyers24h} buyers</div>
      </td>
      <td className="py-3 px-2 text-center">
        <button
          onClick={onRemove}
          className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
