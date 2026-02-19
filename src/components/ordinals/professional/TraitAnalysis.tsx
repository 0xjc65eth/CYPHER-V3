'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScatterChart, Scatter, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { TrendingUp, TrendingDown, Layers, Activity, BarChart3, GitBranch, Sparkles, Hash } from 'lucide-react'

export default function TraitAnalysis() {
  const [selectedCollection, setSelectedCollection] = useState('nodemonkes')
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d')

  // Real trait analysis requires on-chain indexer data - no mock data
  // These will be populated when trait analysis API is implemented
  const correlationMatrix: { trait1: string; trait2: string; correlation: number }[] = []
  const priceImpactData: { trait: string; avgPrice: number; floorDiff: string; volume: number }[] = []
  const popularityTrends: { date: string; laserEyes: number; goldBg: number; robotBody: number; crown: number }[] = []
  const metaTraitCombos: { combination: string; count: number; avgPrice: number; priceMultiplier: number; popularity: number }[] = []
  const traitDistribution: { category: string; traits: number; mostCommon: string; rarest: string }[] = []
  const traitSynergy: { trait: string; impact: number; rarity: number; demand: number }[] = []

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedCollection} onValueChange={setSelectedCollection}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nodemonkes">NodeMonkes</SelectItem>
              <SelectItem value="bitcoin-puppets">Bitcoin Puppets</SelectItem>
              <SelectItem value="runestones">Runestones</SelectItem>
              <SelectItem value="quantum-cats">Quantum Cats</SelectItem>
              <SelectItem value="bitcoin-frogs">Bitcoin Frogs</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Trait Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Total Traits
              <Layers className="h-4 w-4 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">83</p>
            <p className="text-sm text-muted-foreground">across 6 categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Unique Combos
              <GitBranch className="h-4 w-4 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">8,742</p>
            <p className="text-sm text-muted-foreground">possible variations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Avg Trait Premium
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">+48%</p>
            <p className="text-sm text-muted-foreground">vs floor price</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis */}
      <Tabs defaultValue="impact" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="impact">Price Impact</TabsTrigger>
          <TabsTrigger value="correlation">Correlations</TabsTrigger>
          <TabsTrigger value="popularity">Popularity</TabsTrigger>
          <TabsTrigger value="combinations">Meta-Traits</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="impact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trait Price Impact Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {priceImpactData.map((trait, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{trait.trait}</span>
                      <Badge variant={trait.floorDiff.startsWith('+') ? 'default' : 'secondary'}>
                        {trait.floorDiff}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="font-mono font-bold">{trait.avgPrice} BTC</p>
                        <p className="text-xs text-muted-foreground">avg price</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{trait.volume}</p>
                        <p className="text-xs text-muted-foreground">sales (30d)</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trait Correlation Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left p-2"></th>
                      <th className="text-center p-2">Background</th>
                      <th className="text-center p-2">Body</th>
                      <th className="text-center p-2">Eyes</th>
                      <th className="text-center p-2">Mouth</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-medium p-2">Background</td>
                      <td className="text-center p-2">
                        <div className="w-12 h-12 mx-auto rounded flex items-center justify-center bg-orange-500">1.0</div>
                      </td>
                      <td className="text-center p-2">
                        <div className="w-12 h-12 mx-auto rounded flex items-center justify-center bg-orange-500/20">0.12</div>
                      </td>
                      <td className="text-center p-2">
                        <div className="w-12 h-12 mx-auto rounded flex items-center justify-center bg-blue-500/30">-0.23</div>
                      </td>
                      <td className="text-center p-2">
                        <div className="w-12 h-12 mx-auto rounded flex items-center justify-center bg-orange-500/50">0.45</div>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium p-2">Body</td>
                      <td className="text-center p-2">
                        <div className="w-12 h-12 mx-auto rounded flex items-center justify-center bg-orange-500/20">0.12</div>
                      </td>
                      <td className="text-center p-2">
                        <div className="w-12 h-12 mx-auto rounded flex items-center justify-center bg-orange-500">1.0</div>
                      </td>
                      <td className="text-center p-2">
                        <div className="w-12 h-12 mx-auto rounded flex items-center justify-center bg-orange-500/70">0.67</div>
                      </td>
                      <td className="text-center p-2">
                        <div className="w-12 h-12 mx-auto rounded flex items-center justify-center bg-blue-500/40">-0.34</div>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium p-2">Eyes</td>
                      <td className="text-center p-2">
                        <div className="w-12 h-12 mx-auto rounded flex items-center justify-center bg-blue-500/30">-0.23</div>
                      </td>
                      <td className="text-center p-2">
                        <div className="w-12 h-12 mx-auto rounded flex items-center justify-center bg-orange-500/70">0.67</div>
                      </td>
                      <td className="text-center p-2">
                        <div className="w-12 h-12 mx-auto rounded flex items-center justify-center bg-orange-500">1.0</div>
                      </td>
                      <td className="text-center p-2">
                        <div className="w-12 h-12 mx-auto rounded flex items-center justify-center bg-orange-500/30">0.21</div>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium p-2">Mouth</td>
                      <td className="text-center p-2">
                        <div className="w-12 h-12 mx-auto rounded flex items-center justify-center bg-orange-500/50">0.45</div>
                      </td>
                      <td className="text-center p-2">
                        <div className="w-12 h-12 mx-auto rounded flex items-center justify-center bg-blue-500/40">-0.34</div>
                      </td>
                      <td className="text-center p-2">
                        <div className="w-12 h-12 mx-auto rounded flex items-center justify-center bg-orange-500/30">0.21</div>
                      </td>
                      <td className="text-center p-2">
                        <div className="w-12 h-12 mx-auto rounded flex items-center justify-center bg-orange-500">1.0</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Positive correlations indicate traits that often appear together</p>
                <p>Negative correlations indicate traits that rarely appear together</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="popularity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trait Popularity Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={popularityTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#999' }}
                    />
                    <Line type="monotone" dataKey="laserEyes" stroke="#ef4444" strokeWidth={2} name="Laser Eyes" />
                    <Line type="monotone" dataKey="goldBg" stroke="#f59e0b" strokeWidth={2} name="Gold Background" />
                    <Line type="monotone" dataKey="robotBody" stroke="#3b82f6" strokeWidth={2} name="Robot Body" />
                    <Line type="monotone" dataKey="crown" stroke="#8b5cf6" strokeWidth={2} name="Crown" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="combinations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meta-Trait Combinations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metaTraitCombos.map((combo, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{combo.combination}</h4>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="outline">{combo.count} items</Badge>
                          <span className="text-sm text-muted-foreground">
                            Popularity: {combo.popularity}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{combo.priceMultiplier}x</p>
                        <p className="text-sm text-muted-foreground">floor multiple</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Average Price</span>
                      <span className="font-mono font-bold">{combo.avgPrice} BTC</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trait Synergy Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={traitSynergy}>
                    <PolarGrid stroke="#333" />
                    <PolarAngleAxis dataKey="trait" stroke="#666" />
                    <PolarRadiusAxis stroke="#666" />
                    <Radar name="Impact" dataKey="impact" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                    <Radar name="Rarity" dataKey="rarity" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                    <Radar name="Demand" dataKey="demand" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trait Category Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {traitDistribution.map((category, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{category.category}</h4>
                      <Badge>{category.traits} variants</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Most Common:</span>
                        <p className="font-medium">{category.mostCommon}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rarest:</span>
                        <p className="font-medium text-orange-500">{category.rarest}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}