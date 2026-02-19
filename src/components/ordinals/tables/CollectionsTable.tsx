'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Download, 
  TrendingUp, 
  TrendingDown,
  ExternalLink,
  Filter,
  MoreVertical,
  Star,
  StarOff
} from 'lucide-react'
import { ordinalsService, type OrdinalsCollection } from '@/services/ordinals'
import { useQuery } from '@tanstack/react-query'

interface Collection {
  id: string
  name: string
  slug: string
  imageUrl: string
  floorPrice: number
  floorChange24h: number
  volume24h: number
  volumeChange24h: number
  holders: number
  totalSupply: number
  listedCount: number
  listedPercent: number
  verified: boolean
  trending: boolean
  favorite?: boolean
}

export function CollectionsTable() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'volume' | 'floor' | 'holders' | 'listed'>('volume')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterBy, setFilterBy] = useState<'all' | 'verified' | 'trending'>('all')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  
  // Use real Ordinals data
  const { data: collectionsData, isLoading } = useQuery({
    queryKey: ['ordinals-collections'],
    queryFn: () => ordinalsService.getTopCollections(50),
    refetchInterval: 30000,
    staleTime: 20000
  })

  // Transform real data to component format
  const collections: Collection[] = collectionsData?.map(collection => ({
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    imageUrl: collection.image_url,
    floorPrice: collection.floor_price,
    floorChange24h: collection.floor_change_24h,
    volume24h: collection.volume_24h,
    volumeChange24h: collection.volume_change_24h,
    holders: collection.holders_count,
    totalSupply: collection.total_supply,
    listedCount: collection.listed_count,
    listedPercent: collection.listed_percentage,
    verified: collection.verified,
    trending: collection.trending
  })) || []

  // No mock fallback - show empty state when no real data available

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const toggleFavorite = (collectionId: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(collectionId)) {
      newFavorites.delete(collectionId)
    } else {
      newFavorites.add(collectionId)
    }
    setFavorites(newFavorites)
  }

  const filteredCollections = (collections)
    .filter(collection => {
      const matchesSearch = collection.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = filterBy === 'all' || 
        (filterBy === 'verified' && collection.verified) ||
        (filterBy === 'trending' && collection.trending)
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      let aValue, bValue
      switch (sortBy) {
        case 'volume':
          aValue = a.volume24h
          bValue = b.volume24h
          break
        case 'floor':
          aValue = a.floorPrice
          bValue = b.floorPrice
          break
        case 'holders':
          aValue = a.holders
          bValue = b.holders
          break
        case 'listed':
          aValue = a.listedPercent
          bValue = b.listedPercent
          break
      }
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })

  const exportToCSV = () => {
    const headers = ['Name', 'Floor Price', '24h Change', 'Volume 24h', 'Holders', 'Listed', 'Verified']
    const rows = filteredCollections.map(c => [
      c.name,
      c.floorPrice,
      c.floorChange24h,
      c.volume24h,
      c.holders,
      c.listedPercent,
      c.verified
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ordinals-collections.csv'
    a.click()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Collections Market Overview</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search collections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Collections</SelectItem>
              <SelectItem value="verified">Verified Only</SelectItem>
              <SelectItem value="trending">Trending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                  >
                    Collection
                  </Button>
                </th>
                <th className="text-right p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort('floor')}
                  >
                    Floor Price
                    {sortBy === 'floor' && (
                      sortOrder === 'desc' ? <ArrowDown className="ml-1 h-3 w-3 inline" /> : <ArrowUp className="ml-1 h-3 w-3 inline" />
                    )}
                  </Button>
                </th>
                <th className="text-right p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort('volume')}
                  >
                    Volume 24h
                    {sortBy === 'volume' && (
                      sortOrder === 'desc' ? <ArrowDown className="ml-1 h-3 w-3 inline" /> : <ArrowUp className="ml-1 h-3 w-3 inline" />
                    )}
                  </Button>
                </th>
                <th className="text-right p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort('holders')}
                  >
                    Holders
                    {sortBy === 'holders' && (
                      sortOrder === 'desc' ? <ArrowDown className="ml-1 h-3 w-3 inline" /> : <ArrowUp className="ml-1 h-3 w-3 inline" />
                    )}
                  </Button>
                </th>
                <th className="text-right p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort('listed')}
                  >
                    Listed
                    {sortBy === 'listed' && (
                      sortOrder === 'desc' ? <ArrowDown className="ml-1 h-3 w-3 inline" /> : <ArrowUp className="ml-1 h-3 w-3 inline" />
                    )}
                  </Button>
                </th>
                <th className="text-center p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCollections.map((collection) => (
                <tr key={collection.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => toggleFavorite(collection.id)}
                      >
                        {favorites.has(collection.id) ? (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <StarOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <div className="w-10 h-10 bg-muted rounded-lg" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{collection.name}</span>
                          {collection.verified && (
                            <Badge variant="secondary" className="text-xs">Verified</Badge>
                          )}
                          {collection.trending && (
                            <Badge className="text-xs bg-orange-500/20 text-orange-500 border-orange-500/50">
                              Trending
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{collection.totalSupply.toLocaleString()} items</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div>
                      <p className="font-mono font-medium">{collection.floorPrice} BTC</p>
                      <p className={`text-xs flex items-center justify-end gap-1 ${
                        collection.floorChange24h >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {collection.floorChange24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(collection.floorChange24h)}%
                      </p>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div>
                      <p className="font-mono font-medium">{collection.volume24h.toFixed(2)} BTC</p>
                      <p className={`text-xs flex items-center justify-end gap-1 ${
                        collection.volumeChange24h >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {collection.volumeChange24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(collection.volumeChange24h)}%
                      </p>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <p className="font-medium">{collection.holders.toLocaleString()}</p>
                  </td>
                  <td className="p-3 text-right">
                    <div>
                      <p className="font-medium">{collection.listedCount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{collection.listedPercent}%</p>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredCollections.length} of {collections.length} collections
            {isLoading && <span className="ml-2 text-orange-500">• Loading real data...</span>}
            {!isLoading && collections.length > 0 && <span className="ml-2 text-green-500">• Real-time data</span>}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}