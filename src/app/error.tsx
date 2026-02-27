'use client'

import { useEffect } from 'react'
import { CypherLogo } from '@/components/ui/CypherLogo'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[CYPHER] Unhandled error:', error)

    // Auto-retry on chunk loading failures (code splitting errors)
    if (
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('ChunkLoadError') ||
      error?.message?.includes('Failed to fetch dynamically imported module')
    ) {
      window.location.reload()
    }
  }, [error])

  return (
    <main className="min-h-screen bg-cypher-surface-0 flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <CypherLogo size="lg" animated />

        <div className="space-y-2">
          <h1 className="font-mono text-lg font-bold text-red-400 uppercase tracking-wider">
            System Error
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
        </div>

        <button
          onClick={reset}
          className="terminal-button-primary font-mono text-xs uppercase tracking-widest px-6 py-3"
        >
          Retry
        </button>
      </div>
    </main>
  )
}
