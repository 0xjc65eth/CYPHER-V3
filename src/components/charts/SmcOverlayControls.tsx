'use client'

import React from 'react'

export interface OverlayConfig {
  orderBlocks: boolean
  fvg: boolean
  bosChoch: boolean
  liquidity: boolean
  killZones: boolean
  ote: boolean
}

export const DEFAULT_OVERLAYS: OverlayConfig = {
  orderBlocks: true,
  fvg: true,
  bosChoch: true,
  liquidity: true,
  killZones: false,
  ote: true,
}

interface Props {
  overlays: OverlayConfig
  onChange: (overlays: OverlayConfig) => void
}

const OVERLAY_LABELS: { key: keyof OverlayConfig; label: string; color: string }[] = [
  { key: 'orderBlocks', label: 'Order Blocks', color: '#f97316' },
  { key: 'fvg', label: 'FVG', color: '#8b5cf6' },
  { key: 'bosChoch', label: 'BOS / ChoCH', color: '#3b82f6' },
  { key: 'liquidity', label: 'Liquidity', color: '#eab308' },
  { key: 'killZones', label: 'Kill Zones', color: '#6366f1' },
  { key: 'ote', label: 'OTE Zone', color: '#14b8a6' },
]

export function SmcOverlayControls({ overlays, onChange }: Props) {
  const toggle = (key: keyof OverlayConfig) => {
    onChange({ ...overlays, [key]: !overlays[key] })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {OVERLAY_LABELS.map(({ key, label, color }) => (
        <button
          key={key}
          onClick={() => toggle(key)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${
            overlays[key]
              ? 'border-gray-600 bg-gray-800/80 text-white'
              : 'border-gray-800 bg-transparent text-gray-600 hover:text-gray-400'
          }`}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: overlays[key] ? color : '#374151' }}
          />
          {label}
        </button>
      ))}
    </div>
  )
}
