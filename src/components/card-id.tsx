'use client'

import Image from 'next/image'
import { useAppSelector } from '@/store'

export function CardID() {
  const nftData = useAppSelector((state) => (state.user as any).nftData)
  
  if (!nftData) return null

  return (
    <div className="flex items-center gap-2 bg-[#2D2D2D] rounded-lg p-2 hover:bg-[#3D3D3D] transition-colors">
      <div className="relative w-8 h-8 rounded overflow-hidden">
        <Image
          src={nftData.image}
          alt={nftData.name}
          fill
          className="object-cover"
        />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-white">{nftData.name}</span>
        <span className="text-xs text-gray-400">{nftData.tier}</span>
      </div>
    </div>
  )
} 