'use client';

import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  count = 1
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-800/50';

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-md'
  };

  const skeletonClass = `${baseClasses} ${variantClasses[variant]} ${className}`;

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (count === 1) {
    return <div className={skeletonClass} style={style} />;
  }

  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i} className={skeletonClass} style={style} />
      ))}
    </>
  );
}

export function TableSkeleton({ rows = 8, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-terminal border border-gray-800">
      <div className="animate-pulse">
        {/* Header */}
        <div className="border-b border-gray-800 bg-gray-900/60 px-4 py-3">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {[...Array(columns)].map((_, i) => (
              <Skeleton key={i} variant="text" />
            ))}
          </div>
        </div>
        {/* Rows */}
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="border-b border-gray-800/50 px-4 py-3">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {[...Array(columns)].map((_, j) => (
                <Skeleton key={j} variant="text" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-gray-900/40 border border-gray-800 rounded-terminal p-4">
          <div className="animate-pulse space-y-3">
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="80%" height={32} />
            <Skeleton variant="text" width="40%" />
          </div>
        </div>
      ))}
    </>
  );
}

export function ChartSkeleton({ height = 400 }: { height?: number }) {
  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-terminal p-4">
      <div className="animate-pulse space-y-4">
        <div className="flex justify-between">
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="text" width="20%" />
        </div>
        <Skeleton variant="rounded" width="100%" height={height} />
        <div className="flex gap-2 justify-center">
          <Skeleton variant="rounded" width={60} height={24} />
          <Skeleton variant="rounded" width={60} height={24} />
          <Skeleton variant="rounded" width={60} height={24} />
        </div>
      </div>
    </div>
  );
}
