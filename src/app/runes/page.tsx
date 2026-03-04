'use client'

import RunesTabSystem from '@/components/runes/RunesTabSystem'
import { ErrorBoundary } from '@/components/error-boundaries/ErrorBoundary'

export default function RunesPage() {
  return (
    <ErrorBoundary level="page" name="Runes">
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <RunesTabSystem />
      </div>
    </ErrorBoundary>
  )
}
