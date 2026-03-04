'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Card, Title, Text, Badge, Button } from '@tremor/react'
import { 
  RiRefreshLine, 
  RiZoomInLine, 
  RiZoomOutLine,
  RiPlayLine,
  RiPauseLine,
  RiSettings3Line,
  RiFullscreenLine,
  RiRadarLine as RiNetworkLine
} from 'react-icons/ri'

interface NetworkNode {
  id: string
  group: number
  size: number
  label: string
  value: number
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

interface NetworkLink {
  source: string | NetworkNode
  target: string | NetworkNode
  value: number
  type: string
}

interface D3Selection extends d3.Selection<any, any, any, any> {}

export function NetworkVisualization() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAnimating, setIsAnimating] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [selectedVisualization, setSelectedVisualization] = useState<'bitcoin' | 'ordinals' | 'runes'>('bitcoin')
  
  // Mock data for different network types
  const generateNetworkData = (type: string) => {
    const nodes: NetworkNode[] = []
    const links: NetworkLink[] = []

    if (type === 'bitcoin') {
      // Bitcoin network visualization
      const nodeTypes = [
        { group: 1, label: 'Mining Pools', count: 8, baseSize: 20 },
        { group: 2, label: 'Exchanges', count: 12, baseSize: 15 },
        { group: 3, label: 'Wallets', count: 25, baseSize: 10 },
        { group: 4, label: 'Lightning Nodes', count: 20, baseSize: 8 }
      ]

      let nodeId = 0
      nodeTypes.forEach(type => {
        for (let i = 0; i < type.count; i++) {
          nodes.push({
            id: `node_${nodeId}`,
            group: type.group,
            size: type.baseSize + (i % 10),
            label: `${type.label} ${i + 1}`,
            value: (i + 1) * 100
          })
          nodeId++
        }
      })

      // Create deterministic links
      for (let i = 0; i < 80; i++) {
        const sourceIdx = i % nodes.length
        const targetIdx = (i * 3 + 7) % nodes.length

        if (sourceIdx !== targetIdx) {
          links.push({
            source: nodes[sourceIdx].id,
            target: nodes[targetIdx].id,
            value: (i % 10) + 1,
            type: 'transaction'
          })
        }
      }
    } else if (type === 'ordinals') {
      // Ordinals collection network
      const collections = [
        'Bitcoin Puppets', 'NodeMonkes', 'OCM Genesis', 'Quantum Cats',
        'Bitcoin Frogs', 'Runestones', 'OMB', 'Bitmap'
      ]

      collections.forEach((collection, i) => {
        nodes.push({
          id: `collection_${i}`,
          group: 1,
          size: 25 + (i % 3) * 5,
          label: collection,
          value: 1000 + i * 625
        })

        // Add individual ordinals
        for (let j = 0; j < 5; j++) {
          const ordinalId = `ordinal_${i}_${j}`
          nodes.push({
            id: ordinalId,
            group: 2,
            size: 8 + (j % 5),
            label: `${collection} #${j + 1}`,
            value: 10 + j * 20
          })

          links.push({
            source: `collection_${i}`,
            target: ordinalId,
            value: (j % 5) + 1,
            type: 'ownership'
          })
        }
      })
    } else if (type === 'runes') {
      // Runes ecosystem network
      const runeTypes = [
        { name: 'DOG•GO•TO•THE•MOON', holders: 15, volume: 1000 },
        { name: 'UNCOMMON•GOODS', holders: 12, volume: 800 },
        { name: 'RSIC•METAPROTOCOL', holders: 18, volume: 1200 },
        { name: 'BITCOIN•RUNES', holders: 10, volume: 600 }
      ]

      runeTypes.forEach((rune, i) => {
        nodes.push({
          id: `rune_${i}`,
          group: 1,
          size: 20 + (rune.volume / 100),
          label: rune.name,
          value: rune.volume
        })

        // Add holder nodes
        for (let j = 0; j < rune.holders; j++) {
          const holderId = `holder_${i}_${j}`
          nodes.push({
            id: holderId,
            group: 2,
            size: 5 + (j % 8),
            label: `Holder ${j + 1}`,
            value: (j + 1) * 10
          })

          links.push({
            source: `rune_${i}`,
            target: holderId,
            value: (j % 10) + 1,
            type: 'holding'
          })
        }
      })
    }

    return { nodes, links }
  }

  // Render network using simple circular layout (d3 removed)
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return

    const svgEl = svgRef.current
    const container = containerRef.current
    const width = container.clientWidth
    const height = 400

    // Clear previous content
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild)

    const { nodes, links } = generateNetworkData(selectedVisualization)

    const colorScheme = {
      bitcoin: ['#F7931A', '#3B82F6', '#10B981', '#8B5CF6'],
      ordinals: ['#8B5CF6', '#EC4899', '#F59E0B', '#EF4444'],
      runes: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']
    }
    const colors = colorScheme[selectedVisualization]

    // Position nodes in a circular layout
    const cx = width / 2
    const cy = height / 2
    const radius = Math.min(width, height) * 0.35
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length
      node.x = cx + radius * Math.cos(angle)
      node.y = cy + radius * Math.sin(angle)
    })

    const ns = 'http://www.w3.org/2000/svg'
    const g = document.createElementNS(ns, 'g')
    svgEl.appendChild(g)

    // Draw links
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    links.forEach(link => {
      const source = nodeMap.get(typeof link.source === 'string' ? link.source : (link.source as any).id)
      const target = nodeMap.get(typeof link.target === 'string' ? link.target : (link.target as any).id)
      if (!source || !target) return
      const line = document.createElementNS(ns, 'line')
      line.setAttribute('x1', String(source.x || 0))
      line.setAttribute('y1', String(source.y || 0))
      line.setAttribute('x2', String(target.x || 0))
      line.setAttribute('y2', String(target.y || 0))
      line.setAttribute('stroke', '#666')
      line.setAttribute('stroke-opacity', '0.4')
      line.setAttribute('stroke-width', String(Math.sqrt(link.value)))
      g.appendChild(line)
    })

    // Draw nodes
    nodes.forEach(node => {
      const circle = document.createElementNS(ns, 'circle')
      circle.setAttribute('cx', String(node.x || 0))
      circle.setAttribute('cy', String(node.y || 0))
      circle.setAttribute('r', String(node.size))
      circle.setAttribute('fill', colors[(node.group - 1) % colors.length])
      circle.setAttribute('stroke', '#fff')
      circle.setAttribute('stroke-width', '2')
      circle.style.cursor = 'pointer'
      g.appendChild(circle)

      // Label
      const text = document.createElementNS(ns, 'text')
      text.setAttribute('x', String((node.x || 0) + node.size + 4))
      text.setAttribute('y', String((node.y || 0) + 4))
      text.setAttribute('fill', '#fff')
      text.setAttribute('font-size', '11')
      text.textContent = node.label.length > 12 ? node.label.substring(0, 12) + '...' : node.label
      g.appendChild(text)
    })

    setZoomLevel(1)
  }, [selectedVisualization, isAnimating])

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 4))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev * 0.67, 0.1))
  }

  const handleReset = () => {
    setZoomLevel(1)
  }

  return (
    <Card className="bg-gradient-to-br from-[#1A1A3A]/90 to-[#2A2A5A]/90 border border-cyan-500/30 shadow-2xl backdrop-blur-xl">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
              <RiNetworkLine className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <Title className="text-white">Network Visualization</Title>
              <Text className="text-gray-300 text-sm capitalize">
                {selectedVisualization} Network
              </Text>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              Zoom: {zoomLevel.toFixed(1)}x
            </Badge>
            
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              className={`p-2 rounded-lg transition-colors ${
                isAnimating 
                  ? 'bg-emerald-600/50 text-emerald-300' 
                  : 'bg-gray-700/50 text-gray-400'
              }`}
            >
              {isAnimating ? <RiPauseLine className="w-4 h-4" /> : <RiPlayLine className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors"
            >
              <RiSettings3Line className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Network Type Selection */}
          <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1">
            {(['bitcoin', 'ordinals', 'runes'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedVisualization(type)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                  selectedVisualization === type
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1">
            <button
              onClick={handleZoomOut}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-md transition-colors"
            >
              <RiZoomOutLine className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-md transition-colors"
            >
              <RiRefreshLine className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-md transition-colors"
            >
              <RiZoomInLine className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 p-4 bg-black/30 rounded-xl border border-gray-600/30">
            <Text className="text-white text-sm font-medium mb-3">Visualization Settings</Text>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Text className="text-gray-400 text-xs mb-2">Node Size</Text>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2" 
                  step="0.1" 
                  defaultValue="1"
                  className="w-full"
                />
              </div>
              <div>
                <Text className="text-gray-400 text-xs mb-2">Link Strength</Text>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1" 
                  step="0.1" 
                  defaultValue="0.6"
                  className="w-full"
                />
              </div>
              <div>
                <Text className="text-gray-400 text-xs mb-2">Animation Speed</Text>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  step="1" 
                  defaultValue="5"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Network Visualization */}
        <div 
          ref={containerRef}
          className="bg-black/20 rounded-xl border border-gray-600/30 overflow-hidden"
          style={{ height: '400px' }}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ cursor: 'grab' }}
          />
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {selectedVisualization === 'bitcoin' && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#F7931A]"></div>
                <Text className="text-gray-300">Mining Pools</Text>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div>
                <Text className="text-gray-300">Exchanges</Text>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                <Text className="text-gray-300">Wallets</Text>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#8B5CF6]"></div>
                <Text className="text-gray-300">Lightning Nodes</Text>
              </div>
            </>
          )}
          
          {selectedVisualization === 'ordinals' && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#8B5CF6]"></div>
                <Text className="text-gray-300">Collections</Text>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#EC4899]"></div>
                <Text className="text-gray-300">Individual Ordinals</Text>
              </div>
            </>
          )}
          
          {selectedVisualization === 'runes' && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                <Text className="text-gray-300">Rune Tokens</Text>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div>
                <Text className="text-gray-300">Holders</Text>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}