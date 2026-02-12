'use client'

import React from 'react'
import { CypherLogo } from './CypherLogo'

// ---------------------------------------------------------------------------
// CypherLoadingState
// ---------------------------------------------------------------------------
interface CypherLoadingStateProps {
  message?: string
  className?: string
}

export function CypherLoadingState({
  message = 'Loading...',
  className = '',
}: CypherLoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
    >
      <CypherLogo size="lg" animated />
      <p className="font-mono text-sm text-cypher-accent/60 tracking-wider uppercase">
        {message}
      </p>
      <span className="sr-only">{message}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CypherErrorState
// ---------------------------------------------------------------------------
interface CypherErrorStateProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function CypherErrorState({
  message = 'An unexpected error occurred.',
  onRetry,
  className = '',
}: CypherErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-5 ${className}`}
    >
      <div className="w-16 h-16 rounded-full border-2 border-red-500/40 bg-red-500/10 flex items-center justify-center">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-red-400"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      <div className="text-center space-y-1">
        <h3 className="font-mono text-sm font-semibold text-red-400 uppercase tracking-wider">
          Error
        </h3>
        <p className="text-sm text-gray-400 max-w-sm">{message}</p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="terminal-button font-mono text-xs uppercase tracking-widest"
        >
          Retry
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CypherEmptyState
// ---------------------------------------------------------------------------
interface CypherEmptyStateProps {
  message?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function CypherEmptyState({
  message = 'No data available.',
  actionLabel,
  onAction,
  className = '',
}: CypherEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-12 ${className}`}>
      <div className="w-14 h-14 rounded-full border border-cypher-border bg-cypher-surface-2 flex items-center justify-center">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-cypher-accent/40"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="9" x2="15" y2="15" />
          <line x1="15" y1="9" x2="9" y2="15" />
        </svg>
      </div>

      <p className="font-mono text-sm text-gray-500 text-center max-w-xs">{message}</p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="terminal-button font-mono text-xs uppercase tracking-widest"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TableSkeleton
// ---------------------------------------------------------------------------
interface TableSkeletonProps {
  rows?: number
  cols?: number
  className?: string
}

export function TableSkeleton({ rows = 5, cols = 4, className = '' }: TableSkeletonProps) {
  return (
    <div className={`w-full space-y-0 ${className}`} role="status" aria-label="Loading table">
      {/* Header row */}
      <div className="flex gap-3 px-3 py-2 border-b border-cypher-border">
        {Array.from({ length: cols }).map((_, c) => (
          <div
            key={`h-${c}`}
            className="h-3 flex-1 rounded bg-cypher-surface-3 animate-pulse"
            style={{ maxWidth: c === 0 ? '30%' : '20%' }}
          />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex gap-3 px-3 py-3 border-b border-cypher-surface-2"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={`${r}-${c}`}
              className="h-3 flex-1 rounded bg-cypher-surface-3 animate-pulse"
              style={{
                maxWidth: c === 0 ? '30%' : '20%',
                animationDelay: `${(r * cols + c) * 60}ms`,
              }}
            />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading table data</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ChartSkeleton
// ---------------------------------------------------------------------------
interface ChartSkeletonProps {
  className?: string
}

export function ChartSkeleton({ className = '' }: ChartSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading chart"
      className={`relative w-full h-64 rounded bg-cypher-surface-1 border border-cypher-border overflow-hidden ${className}`}
    >
      {/* Y-axis labels */}
      <div className="absolute left-2 top-4 bottom-10 flex flex-col justify-between">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-2 w-8 rounded bg-cypher-surface-3 animate-pulse" />
        ))}
      </div>
      {/* Chart area */}
      <div className="absolute left-14 right-4 top-4 bottom-10">
        <svg className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chart-skeleton-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F7931A" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#F7931A" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,80 Q50,60 100,70 T200,50 T300,65 T400,40 T500,55 L500,120 L0,120 Z"
            fill="url(#chart-skeleton-grad)"
            className="animate-pulse"
          />
          <path
            d="M0,80 Q50,60 100,70 T200,50 T300,65 T400,40 T500,55"
            fill="none"
            stroke="#F7931A"
            strokeWidth="1.5"
            opacity="0.25"
            className="animate-pulse"
          />
        </svg>
      </div>
      {/* X-axis labels */}
      <div className="absolute left-14 right-4 bottom-2 flex justify-between">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-2 w-6 rounded bg-cypher-surface-3 animate-pulse" />
        ))}
      </div>
      <span className="sr-only">Loading chart data</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// OrderBookSkeleton
// ---------------------------------------------------------------------------
interface OrderBookSkeletonProps {
  rows?: number
  className?: string
}

export function OrderBookSkeleton({ rows = 8, className = '' }: OrderBookSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading order book"
      className={`w-full border border-cypher-border rounded bg-cypher-surface-1 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex border-b border-cypher-border">
        <div className="flex-1 px-3 py-2 text-center">
          <div className="h-2.5 w-12 rounded bg-green-900/40 animate-pulse mx-auto" />
        </div>
        <div className="flex-1 px-3 py-2 text-center">
          <div className="h-2.5 w-12 rounded bg-red-900/40 animate-pulse mx-auto" />
        </div>
      </div>
      {/* Rows */}
      <div className="flex">
        {/* Bid side */}
        <div className="flex-1 border-r border-cypher-surface-2 space-y-0">
          {Array.from({ length: rows }).map((_, i) => {
            const width = 40 + Math.random() * 50
            return (
              <div key={`bid-${i}`} className="relative flex items-center justify-between px-3 py-1.5">
                <div
                  className="absolute inset-y-0 right-0 bg-green-500/5 animate-pulse"
                  style={{ width: `${width}%`, animationDelay: `${i * 80}ms` }}
                />
                <div className="h-2.5 w-14 rounded bg-cypher-surface-3 animate-pulse relative z-10" style={{ animationDelay: `${i * 80}ms` }} />
                <div className="h-2.5 w-10 rounded bg-cypher-surface-3 animate-pulse relative z-10" style={{ animationDelay: `${i * 80 + 40}ms` }} />
              </div>
            )
          })}
        </div>
        {/* Ask side */}
        <div className="flex-1 space-y-0">
          {Array.from({ length: rows }).map((_, i) => {
            const width = 40 + Math.random() * 50
            return (
              <div key={`ask-${i}`} className="relative flex items-center justify-between px-3 py-1.5">
                <div
                  className="absolute inset-y-0 left-0 bg-red-500/5 animate-pulse"
                  style={{ width: `${width}%`, animationDelay: `${i * 80}ms` }}
                />
                <div className="h-2.5 w-10 rounded bg-cypher-surface-3 animate-pulse relative z-10" style={{ animationDelay: `${i * 80}ms` }} />
                <div className="h-2.5 w-14 rounded bg-cypher-surface-3 animate-pulse relative z-10" style={{ animationDelay: `${i * 80 + 40}ms` }} />
              </div>
            )
          })}
        </div>
      </div>
      <span className="sr-only">Loading order book data</span>
    </div>
  )
}
