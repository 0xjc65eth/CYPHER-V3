/**
 * MarketDepthHeatmap Component
 * Visualizes liquidity distribution and buy/sell wall detection
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, AlertTriangle, Shield, TrendingUp } from 'lucide-react';
import { useMarketDepth } from '@/hooks/ordinals/useMarketDepth';

interface MarketDepthHeatmapProps {
  symbol: string;
}

export default function MarketDepthHeatmap({ symbol }: MarketDepthHeatmapProps) {
  const { depthAnalysis, isLoading } = useMarketDepth({ symbol });

  if (isLoading || !depthAnalysis) {
    return (
      <Card className="bg-[#0d0d1a] border-[#1a1a2e]">
        <CardHeader>
          <CardTitle className="text-sm">Market Depth Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground">Loading market depth...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { liquidity, walls, supportResistance, marketMaking } = depthAnalysis;

  // Color coding for liquidity score
  const liquidityColor = liquidity.liquidityScore >= 70 ? 'text-green-500' :
                        liquidity.liquidityScore >= 40 ? 'text-yellow-500' : 'text-red-500';

  const liquidityBg = liquidity.liquidityScore >= 70 ? 'bg-green-500' :
                      liquidity.liquidityScore >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-4">
      {/* Liquidity Overview */}
      <Card className="bg-[#0d0d1a] border-[#1a1a2e]">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-400" />
            Liquidity Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Listed</p>
              <p className="text-xl font-mono text-white">{liquidity.totalItemsListed}</p>
              <p className="text-xs text-muted-foreground">items</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Value</p>
              <p className="text-xl font-mono text-white">{liquidity.totalBTCAvailable.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">BTC</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Liquidity Score</p>
              <p className={`text-xl font-mono font-bold ${liquidityColor}`}>
                {liquidity.liquidityScore.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">out of 100</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Concentration</p>
              <p className="text-xl font-mono text-white capitalize">{liquidity.liquidityConcentration}</p>
              <p className="text-xs text-muted-foreground">pattern</p>
            </div>
          </div>

          {/* Liquidity Score Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Liquidity Depth</span>
              <span>{liquidity.liquidityScore.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-[#2a2a3e] rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${liquidityBg}`}
                style={{ width: `${liquidity.liquidityScore}%` }}
              />
            </div>
          </div>

          {/* Depth Distribution */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-[#1a1a2e] border border-[#2a2a3e]">
              <p className="text-xs text-muted-foreground mb-1">Within ±10% of Floor</p>
              <p className="text-2xl font-mono text-blue-400">{liquidity.depthAt10Percent}</p>
              <p className="text-xs text-muted-foreground">items available</p>
            </div>

            <div className="p-3 rounded-lg bg-[#1a1a2e] border border-[#2a2a3e]">
              <p className="text-xs text-muted-foreground mb-1">Within ±20% of Floor</p>
              <p className="text-2xl font-mono text-purple-400">{liquidity.depthAt20Percent}</p>
              <p className="text-xs text-muted-foreground">items available</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buy/Sell Walls */}
      <Card className="bg-[#0d0d1a] border-[#1a1a2e]">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-orange-400" />
            Order Book Walls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Sell Walls */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <h4 className="text-xs font-medium text-white">Sell Walls (Resistance)</h4>
              </div>

              <div className="space-y-2">
                {walls.sellWalls.length > 0 ? (
                  walls.sellWalls.map((wall, index) => (
                    <div key={index} className="p-2 rounded bg-red-500/10 border border-red-500/30">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-mono text-red-400">{wall.price.toFixed(6)} BTC</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          wall.strength === 'strong' ? 'bg-red-500/20 text-red-300' :
                          wall.strength === 'moderate' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {wall.strength}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-[#2a2a3e] rounded-full h-1.5">
                          <div
                            className="bg-red-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, (wall.volume / 50) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{wall.volume} items</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No significant sell walls detected</p>
                )}
              </div>
            </div>

            {/* Buy Walls */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <h4 className="text-xs font-medium text-white">Buy Walls (Support)</h4>
              </div>

              <div className="space-y-2">
                {walls.buyWalls.length > 0 ? (
                  walls.buyWalls.map((wall, index) => (
                    <div key={index} className="p-2 rounded bg-green-500/10 border border-green-500/30">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-mono text-green-400">{wall.price.toFixed(6)} BTC</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          wall.strength === 'strong' ? 'bg-green-500/20 text-green-300' :
                          wall.strength === 'moderate' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {wall.strength}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-[#2a2a3e] rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, (wall.volume / 50) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{wall.volume} items</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Estimated buy support levels</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support/Resistance & Market Making */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-[#0d0d1a] border-[#1a1a2e]">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              Key Price Levels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Resistance Levels</p>
                <div className="space-y-1">
                  {supportResistance.resistanceLevels.slice(0, 3).map((level, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">R{index + 1}</span>
                      <span className="font-mono text-red-400">{level.toFixed(6)} BTC</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#2a2a3e]">
                <p className="text-xs text-muted-foreground mb-2">Support Levels</p>
                <div className="space-y-1">
                  {supportResistance.supportLevels.slice(0, 3).map((level, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">S{index + 1}</span>
                      <span className="font-mono text-green-400">{level.toFixed(6)} BTC</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0d0d1a] border-[#1a1a2e]">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              Market Making Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Market Makers Detected</p>
                <div className="flex items-center gap-3">
                  <p className="text-3xl font-mono text-white">{marketMaking.marketMakerCount}</p>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    marketMaking.hasMarketMakers ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {marketMaking.hasMarketMakers ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Spread Tightness</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#2a2a3e] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        marketMaking.spreadTightness === 'tight' ? 'bg-green-500' :
                        marketMaking.spreadTightness === 'moderate' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{
                        width: marketMaking.spreadTightness === 'tight' ? '80%' :
                               marketMaking.spreadTightness === 'moderate' ? '50%' : '30%'
                      }}
                    />
                  </div>
                  <span className="text-xs capitalize text-white">{marketMaking.spreadTightness}</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Activity Score</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#2a2a3e] rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${marketMaking.marketMakerActivity}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-white">{marketMaking.marketMakerActivity.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
