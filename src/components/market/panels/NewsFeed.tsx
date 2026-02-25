'use client';

import React from 'react';
import { Newspaper, ExternalLink } from 'lucide-react';

export interface NewsArticle {
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  category?: string;
}

interface NewsFeedProps {
  articles: NewsArticle[] | null;
  loading: boolean;
  error?: string | null;
}

const SOURCE_COLORS: Record<string, string> = {
  Reuters: 'bg-[#F7931A]/20 text-[#F7931A]',
  Bloomberg: 'bg-blue-500/20 text-blue-400',
  CoinDesk: 'bg-purple-500/20 text-purple-400',
  CoinTelegraph: 'bg-emerald-500/20 text-emerald-400',
  CNBC: 'bg-yellow-500/20 text-yellow-400',
  'The Block': 'bg-cyan-500/20 text-cyan-400',
  WSJ: 'bg-rose-500/20 text-rose-400',
};

const CATEGORY_COLORS: Record<string, string> = {
  CRYPTO: 'text-[#F7931A]',
  FOREX: 'text-blue-400',
  ECONOMY: 'text-emerald-400',
  STOCKS: 'text-purple-400',
  COMMODITIES: 'text-yellow-400',
  REGULATION: 'text-rose-400',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SkeletonRow() {
  return (
    <div className="px-3 py-2.5 space-y-1.5 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-4 w-14 bg-[#2a2a3e]/60 rounded" />
        <div className="h-3 w-10 bg-[#2a2a3e]/40 rounded" />
      </div>
      <div className="h-3 w-full bg-[#2a2a3e]/50 rounded" />
      <div className="h-3 w-3/4 bg-[#2a2a3e]/30 rounded" />
    </div>
  );
}

export function NewsFeed({ articles, loading, error }: NewsFeedProps) {
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2a2a3e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-3.5 h-3.5 text-[#F7931A]" />
          <span className="text-[11px] font-bold text-[#e4e4e7] font-mono tracking-wider uppercase">
            Financial News
          </span>
        </div>
        {articles && articles.length > 0 && (
          <span className="text-[9px] font-mono bg-[#F7931A]/15 text-[#F7931A] px-1.5 py-0.5 rounded">
            {articles.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#2a2a3e] scrollbar-track-transparent">
        {loading ? (
          <div className="divide-y divide-[#2a2a3e]/40">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-[10px] text-[#ff3366] font-mono">
            {error}
          </div>
        ) : !articles || articles.length === 0 ? (
          <div className="px-4 py-8 text-center text-[10px] text-[#e4e4e7]/30 font-mono">
            No news available
          </div>
        ) : (
          <div className="divide-y divide-[#2a2a3e]/40">
            {articles.map((article, idx) => {
              const sourceColor =
                SOURCE_COLORS[article.source] || 'bg-[#2a2a3e] text-[#e4e4e7]/60';
              const catColor = article.category
                ? CATEGORY_COLORS[(article.category || '').toUpperCase()] || 'text-[#e4e4e7]/40'
                : null;

              return (
                <a
                  key={idx}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2.5 hover:bg-[#2a2a3e]/20 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded ${sourceColor}`}
                    >
                      {article.source}
                    </span>
                    {article.category && catColor && (
                      <span className={`text-[8px] font-mono font-medium ${catColor}`}>
                        {(article.category || '').toUpperCase()}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-[#e4e4e7]/30 font-mono whitespace-nowrap">
                      {timeAgo(article.publishedAt)}
                    </span>
                    <ExternalLink className="w-2.5 h-2.5 text-[#e4e4e7]/0 group-hover:text-[#e4e4e7]/30 transition-colors flex-shrink-0" />
                  </div>
                  <p className="text-xs font-medium text-[#e4e4e7]/80 line-clamp-2 leading-snug group-hover:text-[#e4e4e7] transition-colors">
                    {article.title}
                  </p>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
