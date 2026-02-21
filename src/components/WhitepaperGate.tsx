'use client'

import { useWhitepaper } from '@/contexts/WhitepaperContext'
import dynamic from 'next/dynamic'

const WhitepaperContent = dynamic(() => import('@/app/whitepaper/WhitepaperContent'), {
  loading: () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center font-mono">
        <div className="text-[#F7931A] text-2xl font-bold tracking-widest mb-4">CYPHER</div>
        <div className="w-12 h-12 border-2 border-[#F7931A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <div className="text-gray-500 text-xs tracking-wider">LOADING WHITEPAPER...</div>
      </div>
    </div>
  ),
})

export function WhitepaperGate({ children }: { children: React.ReactNode }) {
  const { hasAccepted, isLoading } = useWhitepaper()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center font-mono">
          <div className="text-[#F7931A] text-2xl font-bold tracking-widest mb-4">CYPHER</div>
          <div className="w-12 h-12 border-2 border-[#F7931A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-gray-500 text-xs tracking-wider">INITIALIZING PROTOCOL...</div>
        </div>
      </div>
    )
  }

  if (hasAccepted) {
    return <>{children}</>
  }

  return <WhitepaperContent />
}
