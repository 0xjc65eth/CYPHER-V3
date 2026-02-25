'use client';
import React from 'react';
import { timeAgo } from './bloomberg-utils';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#2a2a3e] rounded ${className}`} />;
}

export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-4 w-40" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 p-4 text-sm font-mono text-[#ff3366]/80">
      <span className="text-lg">⚠️</span>
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="ml-auto text-xs text-[#00ff88] underline hover:no-underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function SectionHeader({ title, updated }: { title: string; updated?: number | null }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-bold text-[#e4e4e7]/60 tracking-widest uppercase font-mono">{title}</h2>
      {updated && (
        <span className="text-[10px] text-[#e4e4e7]/30 font-mono">Updated {timeAgo(updated)}</span>
      )}
    </div>
  );
}

export function MetricCard({ label, value, sub, subColor, progress }: {
  label: string; value: string; sub?: string; subColor?: string; progress?: number;
}) {
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
      <div className="text-[10px] text-[#e4e4e7]/40 mb-1">{(label || '').toUpperCase()}</div>
      <div className="text-lg font-bold" style={{ textShadow: '0 0 10px rgba(0,255,136,0.1)' }}>{value}</div>
      {sub && <div className={`text-[10px] mt-0.5 ${subColor || 'text-[#e4e4e7]/40'}`}>{sub}</div>}
      {progress != null && (
        <div className="w-full h-1 bg-[#2a2a3e] rounded mt-2">
          <div className="h-full bg-[#00ff88]/60 rounded transition-all" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
        </div>
      )}
    </div>
  );
}
