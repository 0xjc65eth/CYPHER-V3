'use client'

import CollectionCard, { type CollectionCardProps } from './CollectionCard'

interface GridViewProps {
  collections: CollectionCardProps[]
  loading?: boolean
  onCollectionClick?: (collection: CollectionCardProps) => void
}

function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg overflow-hidden">
          {/* Image skeleton */}
          <div className="aspect-square bg-[#2a2a3e]/50 animate-pulse"></div>

          {/* Content skeleton */}
          <div className="p-4 space-y-3">
            <div className="h-4 bg-[#2a2a3e] animate-pulse rounded"></div>
            <div className="space-y-2">
              <div className="h-3 bg-[#2a2a3e]/70 animate-pulse rounded"></div>
              <div className="h-3 bg-[#2a2a3e]/70 animate-pulse rounded"></div>
              <div className="h-3 bg-[#2a2a3e]/70 animate-pulse rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function GridView({ collections, loading, onCollectionClick }: GridViewProps) {
  if (loading) {
    return <GridSkeleton count={12} />
  }

  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-[#2a2a3e] flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">No collections available</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {collections.map((collection, i) => (
        <CollectionCard
          key={collection.slug || i}
          {...collection}
          onClick={() => onCollectionClick?.(collection)}
        />
      ))}
    </div>
  )
}
