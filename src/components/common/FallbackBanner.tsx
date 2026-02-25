'use client';

import React from 'react';

interface FallbackBannerProps {
  /** Whether fallback/mock data is being shown */
  isFallback: boolean;
  /** Custom message to display */
  message?: string;
  /** Data source info */
  source?: string;
  /** Compact mode for small widgets */
  compact?: boolean;
}

/**
 * FallbackBanner - Exibe aviso visual quando dados são de fallback/cache
 *
 * Uso: Sempre que uma API retornar isFallback: true ou source contendo 'fallback',
 * este banner deve ser exibido para informar o usuário que os dados podem estar desatualizados.
 */
export function FallbackBanner({ isFallback, message, source, compact = false }: FallbackBannerProps) {
  if (!isFallback) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-900/30 border border-yellow-700/50 rounded text-[10px] text-yellow-500">
        <span className="animate-pulse">●</span>
        <span>Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 mb-2 bg-yellow-900/20 border border-yellow-700/40 rounded-md">
      <div className="flex-shrink-0">
        <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-yellow-500 truncate">
          {message || 'Dados de fallback - APIs temporariamente indisponíveis'}
        </p>
        {source && (
          <p className="text-[10px] text-yellow-600 truncate">
            Fonte: {source}
          </p>
        )}
      </div>
    </div>
  );
}

export default FallbackBanner;
