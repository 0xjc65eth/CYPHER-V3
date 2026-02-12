'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/primitives/Card';
import { FileText, ExternalLink, Clock, Hash, Search, Filter, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/primitives/Input';
import { Label } from '@/components/ui/primitives/Label';

interface Inscription {
  id: string;
  number: number;
  content_type: string;
  timestamp: number;
  genesis_block_height: number;
  genesis_fee: string;
  output_value: string;
  address?: string;
  sat_ordinal?: string;
  sat_rarity?: string;
}

type SortOption = 'newest' | 'oldest' | 'highest_fee';
type ContentTypeFilter = 'all' | 'image/*' | 'text/*' | 'application/json' | 'video/*' | 'audio/*';

export default function InscriptionsTab() {
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  // Filter states
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all');
  const [searchNumber, setSearchNumber] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [totalInscriptions, setTotalInscriptions] = useState(0);

  useEffect(() => {
    fetchInscriptions();
  }, [currentPage, sortBy]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchInscriptions();
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, currentPage, sortBy]);

  const fetchInscriptions = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;
      const response = await fetch(`/api/ordinals/inscriptions?limit=${itemsPerPage}&offset=${offset}`);

      if (!response.ok) throw new Error('Failed to fetch inscriptions');

      const data = await response.json();
      setInscriptions(data.results || []);
      setTotalInscriptions(data.total || 0);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inscriptions');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: string | number) => {
    const n = typeof num === 'string' ? parseInt(num) : num;
    return n.toLocaleString();
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatTimeElapsed = () => {
    const now = Date.now();
    const elapsed = Math.floor((now - lastUpdated) / 1000);
    if (elapsed < 60) return `${elapsed}s ago`;
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`;
    return `${Math.floor(elapsed / 3600)}h ago`;
  };

  const filteredAndSortedInscriptions = useMemo(() => {
    let filtered = [...inscriptions];

    if (contentTypeFilter !== 'all') {
      filtered = filtered.filter(ins => {
        if (contentTypeFilter === 'image/*') return ins.content_type.startsWith('image/');
        if (contentTypeFilter === 'text/*') return ins.content_type.startsWith('text/');
        if (contentTypeFilter === 'video/*') return ins.content_type.startsWith('video/');
        if (contentTypeFilter === 'audio/*') return ins.content_type.startsWith('audio/');
        return ins.content_type === contentTypeFilter;
      });
    }

    if (searchNumber.trim()) {
      const searchNum = parseInt(searchNumber);
      if (!isNaN(searchNum)) {
        filtered = filtered.filter(ins => ins.number === searchNum);
      }
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.timestamp - a.timestamp;
        case 'oldest':
          return a.timestamp - b.timestamp;
        case 'highest_fee':
          return parseInt(b.genesis_fee) - parseInt(a.genesis_fee);
        default:
          return 0;
      }
    });

    return filtered;
  }, [inscriptions, contentTypeFilter, searchNumber, sortBy]);

  const stats = useMemo(() => {
    const total = totalInscriptions || inscriptions.length;
    const latestBlock = inscriptions.length > 0 ? Math.max(...inscriptions.map(i => i.genesis_block_height)) : 0;
    const avgFee = inscriptions.length > 0
      ? inscriptions.reduce((sum, i) => sum + parseInt(i.genesis_fee), 0) / inscriptions.length
      : 0;
    return { total, latestBlock, avgFee };
  }, [inscriptions, totalInscriptions]);

  const totalPages = Math.ceil(totalInscriptions / itemsPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const getInscriptionImageUrl = (inscriptionId: string) => {
    return `https://ordinals.com/content/${inscriptionId}`;
  };

  if (loading && inscriptions.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
            <div className="h-48 bg-[#2a2a3e] rounded animate-pulse"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-red-500/50">
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-bold text-white mb-2">Error Loading Inscriptions</h3>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Total Inscriptions
            </div>
            <div className="text-3xl font-bold text-[#f59e0b]">
              {formatNumber(stats.total)}
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Latest Block
            </div>
            <div className="text-3xl font-bold text-[#f59e0b]">
              {formatNumber(stats.latestBlock)}
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Avg Fee
            </div>
            <div className="text-3xl font-bold text-[#f59e0b]">
              {formatNumber(Math.floor(stats.avgFee))}
            </div>
            <div className="text-xs text-gray-500">sats</div>
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className={`h-2 w-2 rounded-full ${
                    autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                  }`} />
                  {autoRefresh && (
                    <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping" />
                  )}
                </div>
                <span className="text-xs font-medium text-white">
                  {autoRefresh ? 'LIVE' : 'PAUSED'}
                </span>
              </div>
            </div>

            <div className="text-sm text-gray-400">
              Updated {formatTimeElapsed()}
            </div>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`w-full mt-2 px-3 py-2 text-xs font-semibold rounded transition-colors ${
                autoRefresh
                  ? 'bg-[#f59e0b] text-black hover:bg-[#f59e0b]/90'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              {autoRefresh ? 'PAUSE' : 'ENABLE'} AUTO-REFRESH
            </button>
          </div>
        </Card>
      </div>

      <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg">
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a3e]">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#f59e0b]" />
            <h3 className="text-sm font-semibold text-white">Filters & Search</h3>
          </div>
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <svg
              className={`w-5 h-5 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {filtersExpanded && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="content-type">Content Type</Label>
                <select
                  id="content-type"
                  value={contentTypeFilter}
                  onChange={(e) => setContentTypeFilter(e.target.value as ContentTypeFilter)}
                  className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-white text-sm focus:border-[#f59e0b] focus:outline-none font-mono"
                >
                  <option value="all">All Types</option>
                  <option value="image/*">Images</option>
                  <option value="text/*">Text</option>
                  <option value="application/json">JSON</option>
                  <option value="video/*">Video</option>
                  <option value="audio/*">Audio</option>
                </select>
              </div>

              <div>
                <Label htmlFor="search-number">Search by Number</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="search-number"
                    type="text"
                    placeholder="e.g., 123456"
                    value={searchNumber}
                    onChange={(e) => setSearchNumber(e.target.value)}
                    className="pl-10"
                    fullWidth
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sort-by">Sort By</Label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-white text-sm focus:border-[#f59e0b] focus:outline-none font-mono"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="highest_fee">Highest Fee</option>
                </select>
              </div>
            </div>

            {(contentTypeFilter !== 'all' || searchNumber || sortBy !== 'newest') && (
              <button
                onClick={() => {
                  setContentTypeFilter('all');
                  setSearchNumber('');
                  setSortBy('newest');
                }}
                className="text-xs text-gray-400 hover:text-[#f59e0b] transition-colors"
              >
                Reset all filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAndSortedInscriptions.map((inscription) => (
          <Card key={inscription.id} variant="bordered" padding="none" className="bg-[#1a1a2e] border-[#2a2a3e] hover:border-[#f59e0b]/50 transition-all overflow-hidden">
            {inscription.content_type.startsWith('image/') && (
              <div className="relative w-full h-48 bg-[#0a0a0f] flex items-center justify-center">
                <img
                  src={getInscriptionImageUrl(inscription.id)}
                  alt={`Inscription #${inscription.number}`}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="flex items-center justify-center w-full h-full text-gray-500"><svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                    }
                  }}
                />
              </div>
            )}

            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#f59e0b]" />
                  <span className="text-sm font-bold text-white">#{formatNumber(inscription.number)}</span>
                </div>
                <a
                  href={`https://ordinals.com/inscription/${inscription.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[#f59e0b] transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Hash className="w-3 h-3 text-gray-500" />
                <span className="text-gray-400">Type:</span>
                <span className="text-white font-mono text-xs truncate">{inscription.content_type}</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3 h-3 text-gray-500" />
                <span className="text-gray-400">Created:</span>
                <span className="text-white font-mono text-xs">{formatTimestamp(inscription.timestamp)}</span>
              </div>

              <div className="pt-2 border-t border-[#2a2a3e]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Block:</span>
                  <span className="text-white font-mono">{formatNumber(inscription.genesis_block_height)}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-500">Fee:</span>
                  <span className="text-[#f59e0b] font-mono">{formatNumber(inscription.genesis_fee)} sats</span>
                </div>
              </div>

              {inscription.address && (
                <div className="text-xs">
                  <span className="text-gray-500">Owner: </span>
                  <span className="text-white font-mono">{inscription.address.substring(0, 8)}...{inscription.address.substring(inscription.address.length - 8)}</span>
                </div>
              )}

              {inscription.sat_rarity && (
                <div className="text-xs">
                  <span className="text-gray-500">Rarity: </span>
                  <span className="text-[#f59e0b] font-semibold uppercase">{inscription.sat_rarity}</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Page {currentPage} of {totalPages} ({formatNumber(totalInscriptions)} total)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className={`flex items-center gap-2 px-4 py-2 rounded font-semibold transition-colors ${
                currentPage === 1
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : 'bg-[#2a2a3e] text-white hover:bg-[#f59e0b] hover:text-black'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 rounded font-semibold transition-colors ${
                      currentPage === pageNum
                        ? 'bg-[#f59e0b] text-black'
                        : 'bg-[#2a2a3e] text-white hover:bg-[#3a3a4e]'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={`flex items-center gap-2 px-4 py-2 rounded font-semibold transition-colors ${
                currentPage === totalPages
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : 'bg-[#2a2a3e] text-white hover:bg-[#f59e0b] hover:text-black'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {filteredAndSortedInscriptions.length === 0 && !loading && (
        <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <h3 className="text-lg font-bold text-white mb-2">No Inscriptions Found</h3>
            <p className="text-sm text-gray-400">Try adjusting your filters or search criteria</p>
          </div>
        </Card>
      )}
    </div>
  );
}
