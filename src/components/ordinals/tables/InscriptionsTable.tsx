'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Hash, FileType, Clock, ExternalLink, Copy, Check } from 'lucide-react'
import { ordinalsService } from '@/services/ordinals'
type OrdinalsInscription = any
import { useQuery } from '@tanstack/react-query'

interface Inscription {
  id: number
  txid: string
  contentType: string
  contentSize: number
  fee: number
  satNumber: number
  block: number
  timestamp: number
  address: string
  collection?: string
  rarity?: string
}

export function InscriptionsTable() {
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 })
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Use real Ordinals data
  const { data: inscriptionsData, isLoading } = useQuery({
    queryKey: ['ordinals-recent-inscriptions'],
    queryFn: async () => {
      const stats = await ordinalsService.getOrdinalsStats()
      return ((stats as any).recent_sales || []).map((sale: any) => ({
        id: sale.inscription_number,
        txid: sale.tx_id ? sale.tx_id.substring(0, 8) + '...' : 'unknown',
        contentType: sale.content_type || 'unknown',
        contentSize: sale.content_size || 0,
        fee: sale.fee || 0,
        satNumber: sale.inscription_number * 10000,
        block: sale.block_height || 0,
        timestamp: sale.timestamp,
        address: sale.to_address ? sale.to_address.substring(0, 12) + '...' : 'unknown',
        collection: sale.collection_name || undefined,
        rarity: sale.rarity || 'common'
      }))
    },
    refetchInterval: 60000,
    staleTime: 30000
  })

  // Use real data; show empty state if unavailable
  const allInscriptions = inscriptionsData || []
  const ROW_HEIGHT = 64

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    
    const scrollTop = containerRef.current.scrollTop
    const start = Math.floor(scrollTop / ROW_HEIGHT)
    const end = Math.ceil((scrollTop + containerRef.current.clientHeight) / ROW_HEIGHT)
    
    setVisibleRange({ start, end })
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getContentTypeColor = (type: string) => {
    if (type.startsWith('image/')) return 'bg-blue-500/20 text-blue-500 border-blue-500/50'
    if (type.startsWith('text/')) return 'bg-green-500/20 text-green-500 border-green-500/50'
    if (type.startsWith('application/')) return 'bg-purple-500/20 text-purple-500 border-purple-500/50'
    return 'bg-gray-500/20 text-gray-500 border-gray-500/50'
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatTimestamp = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const filteredInscriptions = allInscriptions.filter((inscription: any) =>
    inscription.id.toString().includes(searchQuery) ||
    inscription.txid.includes(searchQuery) ||
    inscription.address.includes(searchQuery) ||
    inscription.collection?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const visibleInscriptions = filteredInscriptions.slice(visibleRange.start, visibleRange.end)

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Recent Inscriptions
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{filteredInscriptions.length.toLocaleString()} total</Badge>
            {isLoading && <Badge className="bg-orange-500/20 text-orange-500">Loading...</Badge>}
            {!isLoading && inscriptionsData && <Badge className="bg-green-500/20 text-green-500">Live</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="mb-4">
          <Input
            placeholder="Search by ID, txid, address, or collection..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        <div 
          ref={containerRef}
          className="flex-1 overflow-auto"
          style={{ position: 'relative' }}
        >
          <div style={{ height: filteredInscriptions.length * ROW_HEIGHT, position: 'relative' }}>
            {visibleInscriptions.map((inscription: any, index: number) => (
              <div
                key={inscription.id}
                style={{
                  position: 'absolute',
                  top: (visibleRange.start + index) * ROW_HEIGHT,
                  left: 0,
                  right: 0,
                  height: ROW_HEIGHT,
                  padding: '8px'
                }}
              >
                <div className="border rounded-lg p-3 hover:bg-muted/50 transition-colors h-full flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">#{inscription.id}</span>
                        <Badge className={getContentTypeColor(inscription.contentType)} variant="outline">
                          {inscription.contentType.split('/')[1]}
                        </Badge>
                        {inscription.collection && (
                          <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/50">
                            {inscription.collection}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>{formatSize(inscription.contentSize)}</span>
                        <span>{inscription.fee} sats/vB</span>
                        <span>Block {inscription.block.toLocaleString()}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(inscription.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(inscription.txid.replace('...', ''), inscription.id.toString())}
                    >
                      {copiedId === inscription.id.toString() ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground text-center">
          Virtual scrolling enabled - Showing {visibleRange.end - visibleRange.start} of {filteredInscriptions.length} inscriptions
        </div>
      </CardContent>
    </Card>
  )
}