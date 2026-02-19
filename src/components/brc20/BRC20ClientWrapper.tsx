'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Enhanced BigInt fix for Math.pow
if (typeof window !== 'undefined') {
  const originalPow = Math.pow
  Math.pow = function(base: number, exponent: number) {
    try {
      // Handle BigInt conversion attempts
      if (typeof base === 'bigint' || typeof exponent === 'bigint') {
        const baseNum = typeof base === 'bigint' ? Number(base) : base
        const expNum = typeof exponent === 'bigint' ? Number(exponent) : exponent
        return originalPow.call(Math, baseNum, expNum)
      }
      return originalPow.call(Math, base, exponent)
    } catch (error) {
      return 0
    }
  }
}

// Dynamic import with BigInt protection
const BRC20Page = dynamic(
  () => import('@/app/brc20/page').then(mod => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    ),
  }
)

export default function BRC20ClientWrapper() {
  return <BRC20Page />
}