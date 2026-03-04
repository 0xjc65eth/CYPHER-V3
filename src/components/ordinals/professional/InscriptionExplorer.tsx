'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Search, Filter, Activity, Clock, Hash, FileType, Layers, AlertCircle, TrendingUp, Download } from 'lucide-react'
import { useInscriptionData, useCollectionInscriptions } from '@/hooks/ordinals/useInscriptionData'
import { useOrdinals } from '@/contexts/OrdinalsContext'

interface InscriptionExplorerProps {
  searchQuery?: string
}

export default function InscriptionExplorer({ searchQuery = '' }: InscriptionExplorerProps) {
  // Use shared context
  const { selectedCollection } = useOrdinals()
  
  const [filters, setFilters] = useState({
    contentType: 'all',
    inscriptionRange: [0, 100000000] as [number, number],
    satRarity: 'all',
    feeRate: [0, 1000] as [number, number],
    status: 'confirmed' as 'confirmed'
  })

  // Use collection-specific inscriptions when a collection is selected
  const { data: collectionInscriptions, isLoading: isLoadingCollection } = useCollectionInscriptions(selectedCollection, 50, 0)
  const { data: allInscriptions, isLoading: isLoadingAll } = useInscriptionData(filters)
  
  // Determine which data to use
  const inscriptions = selectedCollection ? collectionInscriptions : allInscriptions
  const isLoading = selectedCollection ? isLoadingCollection : isLoadingAll

  // Mempool data would come from mempool.space API - no mock data
  const mempoolInscriptions: { id: string; content: string; size: number; fee: number; sat: number; time: string }[] = []

  // Fee market data would come from mempool.space API - no mock data
  const feeMarketData = {
    current: 0,
    next: 0,
    fastest: 0,
    economical: 0,
    estimates: [] as { blocks: number; fee: number }[]
  }

  // Process real inscription data
  const processedInscriptions = (inscriptions || [])
    .filter(inscription => {
      if (!searchQuery) return true
      
      // Filter by search query - check inscription ID, content type, address
      const searchLower = searchQuery.toLowerCase()
      return (
        inscription.id.toString().includes(searchQuery) ||
        inscription.contentType.toLowerCase().includes(searchLower) ||
        inscription.address.toLowerCase().includes(searchLower) ||
        (inscription.collection?.name && inscription.collection.name.toLowerCase().includes(searchLower))
      )
    })
    .slice(0, 10) // Show top 10 results
    
  const recentInscriptions = processedInscriptions.map(inscription => ({
    id: inscription.id,
    content: inscription.contentType,
    size: inscription.contentSize,
    fee: inscription.feeRate,
    sat: inscription.satNumber,
    block: inscription.block || 0,
    address: inscription.address.substring(0, 10) + '...',
    rarity: inscription.satRarity || 'common',
    collection: inscription.collection?.name || null
  }))

  const satRarityTypes = [
    { value: 'all', label: 'All Rarities' },
    { value: 'common', label: 'Common' },
    { value: 'uncommon', label: 'Uncommon' },
    { value: 'rare', label: 'Rare' },
    { value: 'epic', label: 'Epic' },
    { value: 'legendary', label: 'Legendary' },
    { value: 'mythic', label: 'Mythic' },
  ]

  const contentTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'image/png', label: 'PNG Images' },
    { value: 'image/jpeg', label: 'JPEG Images' },
    { value: 'image/webp', label: 'WebP Images' },
    { value: 'image/svg+xml', label: 'SVG Images' },
    { value: 'text/plain', label: 'Text' },
    { value: 'text/html', label: 'HTML' },
    { value: 'application/json', label: 'JSON' },
    { value: 'audio/mpeg', label: 'Audio' },
    { value: 'video/mp4', label: 'Video' },
  ]

  return (
    <div className="space-y-6">
      {/* Advanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Content Type</label>
              <Select value={filters.contentType} onValueChange={(value) => setFilters({...filters, contentType: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sat Rarity</label>
              <Select value={filters.satRarity} onValueChange={(value) => setFilters({...filters, satRarity: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {satRarityTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Inscription Range</label>
              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  placeholder="From" 
                  value={filters.inscriptionRange[0]}
                  onChange={(e) => setFilters({...filters, inscriptionRange: [parseInt(e.target.value), filters.inscriptionRange[1]]})}
                />
                <span>-</span>
                <Input 
                  type="number" 
                  placeholder="To" 
                  value={filters.inscriptionRange[1]}
                  onChange={(e) => setFilters({...filters, inscriptionRange: [filters.inscriptionRange[0], parseInt(e.target.value)]})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fee Rate (sats/vB)</label>
              <div className="px-3">
                <Slider 
                  value={filters.feeRate}
                  onValueChange={(value: number[]) => setFilters({...filters, feeRate: value as [number, number]})}
                  max={1000}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{filters.feeRate[0]}</span>
                  <span>{filters.feeRate[1]}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <Button variant="outline" onClick={() => setFilters({
              contentType: 'all',
              inscriptionRange: [0, 100000000],
              satRarity: 'all',
              feeRate: [0, 1000],
              status: 'confirmed'
            })}>
              Reset Filters
            </Button>
            <Button>
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="explorer" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="explorer">Explorer</TabsTrigger>
          <TabsTrigger value="mempool">Mempool Monitor</TabsTrigger>
          <TabsTrigger value="fees">Fee Market</TabsTrigger>
          <TabsTrigger value="provenance">Provenance</TabsTrigger>
        </TabsList>

        <TabsContent value="explorer" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Inscriptions</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentInscriptions.map((inscription) => (
                  <div key={inscription.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-lg">#{inscription.id}</span>
                          <Badge variant="outline">{inscription.content}</Badge>
                          <Badge variant={inscription.rarity === 'rare' ? 'default' : 'secondary'}>
                            {inscription.rarity}
                          </Badge>
                          {inscription.collection && (
                            <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/50">
                              {inscription.collection}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-8 text-sm">
                          <div>
                            <span className="text-muted-foreground">Size:</span>
                            <span className="ml-2 font-mono">{(inscription.size ? (inscription.size / 1024).toFixed(2) : '0.00')} KB</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Fee:</span>
                            <span className="ml-2 font-mono">{inscription.fee} sats/vB</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Block:</span>
                            <span className="ml-2 font-mono">{inscription.block.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Address:</span>
                            <span className="ml-2 font-mono">{inscription.address}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mempool" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pending Inscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">23</p>
                <p className="text-sm text-muted-foreground">in mempool</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Wait Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">12 min</p>
                <p className="text-sm text-muted-foreground">next block</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Fees</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">0.0234 BTC</p>
                <p className="text-sm text-muted-foreground">pending</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Mempool Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mempoolInscriptions.map((inscription) => (
                  <div key={inscription.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                      </div>
                      <div>
                        <p className="font-mono text-sm">{inscription.id}</p>
                        <p className="text-xs text-muted-foreground">{inscription.content} • {(inscription.size ? (inscription.size / 1024).toFixed(2) : '0.00')} KB</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{inscription.fee} sats/vB</p>
                      <p className="text-xs text-muted-foreground">{inscription.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card className="border-green-500/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Economical</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-500">{feeMarketData.economical}</p>
                <p className="text-sm text-muted-foreground">sats/vB</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Current</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{feeMarketData.current}</p>
                <p className="text-sm text-muted-foreground">sats/vB</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Next Block</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{feeMarketData.next}</p>
                <p className="text-sm text-muted-foreground">sats/vB</p>
              </CardContent>
            </Card>

            <Card className="border-red-500/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Fastest</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-500">{feeMarketData.fastest}</p>
                <p className="text-sm text-muted-foreground">sats/vB</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fee Estimates by Block Target</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {feeMarketData.estimates.map((estimate) => (
                  <div key={estimate.blocks} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">{estimate.blocks} blocks</span>
                      <span className="text-sm text-muted-foreground">
                        ~{estimate.blocks * 10} minutes
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full"
                          style={{ width: `${(estimate.fee / feeMarketData.fastest) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm w-20 text-right">{estimate.fee} sats/vB</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="provenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inscription Provenance Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Input 
                    placeholder="Enter inscription ID or address..." 
                    className="flex-1"
                  />
                  <Button>
                    <Search className="h-4 w-4 mr-2" />
                    Track
                  </Button>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-4">Provenance Chain</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        <div className="absolute top-3 left-1.5 w-0.5 h-16 bg-muted" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Current Owner</p>
                        <p className="text-sm font-mono text-muted-foreground">bc1q...current</p>
                        <p className="text-xs text-muted-foreground">Since block 823,456</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div className="w-3 h-3 bg-muted-foreground rounded-full" />
                        <div className="absolute top-3 left-1.5 w-0.5 h-16 bg-muted" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Previous Owner</p>
                        <p className="text-sm font-mono text-muted-foreground">bc1q...previous</p>
                        <p className="text-xs text-muted-foreground">Block 820,123 - 823,455</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div className="w-3 h-3 bg-orange-500 rounded-full" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Original Inscriber</p>
                        <p className="text-sm font-mono text-muted-foreground">bc1q...original</p>
                        <p className="text-xs text-muted-foreground">Inscribed at block 810,000</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}