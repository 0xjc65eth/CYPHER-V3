'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/primitives/Card';
import { FileText, ExternalLink, Clock, Hash, Search, Filter, ChevronLeft, ChevronRight, Image as ImageIcon, Zap, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/primitives/Input';
import { Label } from '@/components/ui/primitives/Label';
import { useUniSat } from '@/hooks/ordinals/useUniSat';

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
  // UniSat hook for blockchain context (recommended fees, BTC price)
  const unisat = useUniSat();

  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  // Filter states
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(24);
  const [totalInscriptions, setTotalInscriptions] = useState(0);

  useEffect(() => {
    fetchInscriptions();
  }, [currentPage, sortBy, activeSearch, contentTypeFilter]);

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
  }, [autoRefresh, currentPage, sortBy, activeSearch, contentTypeFilter]);

  // Debounced search: trigger API call when user stops typing for 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== activeSearch) {
        setCurrentPage(1);
        setActiveSearch(searchQuery);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const detectSearchType = (query: string): { number?: string; address?: string; id?: string } => {
    const trimmed = query.trim();
    if (!trimmed) return {};

    // Inscription ID: 64-char hex + 'i' + digit(s)
    if (/^[a-f0-9]{64}i\d+$/i.test(trimmed)) {
      return { id: trimmed };
    }
    // Bitcoin address (bc1..., 1..., 3..., tb1...)
    if (/^(bc1|tb1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(trimmed)) {
      return { address: trimmed };
    }
    // Pure number = inscription number
    if (/^\d+$/.test(trimmed)) {
      return { number: trimmed };
    }
    // Fallback: try as number anyway
    return {};
  };

  const fetchInscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const offset = (currentPage - 1) * itemsPerPage;
      const order = sortBy === 'oldest' ? 'asc' : 'desc';

      const params = new URLSearchParams({
        limit: String(itemsPerPage),
        offset: String(offset),
        order,
        order_by: 'genesis_block_height',
      });

      // Apply search params to API query
      if (activeSearch.trim()) {
        const searchType = detectSearchType(activeSearch);
        if (searchType.number) params.set('number', searchType.number);
        if (searchType.address) params.set('address', searchType.address);
        if (searchType.id) params.set('id', searchType.id);
      }

      // Apply content type filter at API level via mime_type
      if (contentTypeFilter !== 'all') {
        // Hiro supports mime_type filtering like "image/png" but also prefix matching
        // We send the prefix (e.g. "image/") and Hiro will match
        const mimePrefix = contentTypeFilter.replace('/*', '/');
        params.set('mime_type', mimePrefix);
      }

      const response = await fetch(`/api/ordinals/inscriptions/?${params.toString()}`);

      if (!response.ok) throw new Error(`Failed to fetch inscriptions (HTTP ${response.status})`);

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'API returned an error');
      }

      setInscriptions(data.data || []);
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
    // Handle UNIX seconds vs milliseconds
    const ms = ts < 1e12 ? ts * 1000 : ts;
    const date = new Date(ms);
    const now = Date.now();
    const diffMs = now - ms;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let relative = '';
    if (diffMin < 1) relative = 'just now';
    else if (diffMin < 60) relative = `${diffMin}m ago`;
    else if (diffHr < 24) relative = `${diffHr}h ago`;
    else if (diffDays < 30) relative = `${diffDays}d ago`;
    else relative = date.toLocaleDateString();

    return `${relative} (${date.toLocaleDateString()} ${date.toLocaleTimeString()})`;
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

    // Content type and search filtering is now done server-side via API params.
    // Only apply client-side sort for highest_fee (API doesn't support fee sorting).
    if (sortBy === 'highest_fee') {
      filtered.sort((a, b) => parseInt(b.genesis_fee) - parseInt(a.genesis_fee));
    }

    return filtered;
  }, [inscriptions, sortBy]);

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
    // Use Hiro CDN as primary (more reliable), ordinals.com as concept
    return `https://ordinals.hiro.so/inscription/${inscriptionId}/content`;
  };

  if (loading && inscriptions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <div className="h-4 w-4 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
          Loading latest inscriptions from Hiro API...
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <Card key={i} variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
              <div className="h-32 bg-[#2a2a3e] rounded animate-pulse mb-3"></div>
              <div className="h-4 bg-[#2a2a3e] rounded animate-pulse w-3/4 mb-2"></div>
              <div className="h-3 bg-[#2a2a3e] rounded animate-pulse w-1/2"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error && inscriptions.length === 0) {
    return (
      <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-red-500/50">
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-bold text-white mb-2">Error Loading Inscriptions</h3>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => { setError(null); fetchInscriptions(); }}
            className="px-4 py-2 bg-[#f59e0b] text-black font-semibold rounded hover:bg-[#f59e0b]/90 transition-colors"
          >
            Retry
          </button>
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

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex-1 px-3 py-2 text-xs font-semibold rounded transition-colors ${
                  autoRefresh
                    ? 'bg-[#f59e0b] text-black hover:bg-[#f59e0b]/90'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {autoRefresh ? 'PAUSE' : 'ENABLE'} LIVE
              </button>
              <button
                onClick={fetchInscriptions}
                disabled={loading}
                className="px-3 py-2 text-xs font-semibold rounded bg-gray-700 text-white hover:bg-gray-600 transition-colors disabled:opacity-50"
                title="Refresh now"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Blockchain Context Bar - powered by UniSat */}
      {(unisat.recommendedFees.data || unisat.blockchainInfo.data) && (
        <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-3">
          <div className="flex items-center flex-wrap gap-4 text-xs font-mono">
            {unisat.blockchainInfo.data && (
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-[#f59e0b]" />
                <span className="text-gray-500">Block Height:</span>
                <span className="text-white font-bold">{(unisat.blockchainInfo.data.blocks || 0).toLocaleString()}</span>
              </div>
            )}
            {unisat.recommendedFees.data && (
              <>
                <span className="text-gray-600">|</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Fee:</span>
                  <span className="text-green-400">{unisat.recommendedFees.data.fastestFee} sat/vB</span>
                </div>
              </>
            )}
            {unisat.btcPrice.data && (
              <>
                <span className="text-gray-600">|</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">BTC:</span>
                  <span className="text-[#f59e0b]">${Number(unisat.btcPrice.data).toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
                <Label htmlFor="search-query">Search (Number, Address, or ID)</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="search-query"
                    type="text"
                    placeholder="e.g., 123456, bc1q..., or inscription ID"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    fullWidth
                  />
                </div>
                {activeSearch && (
                  <div className="mt-1 text-xs text-[#f59e0b]">
                    Searching: {detectSearchType(activeSearch).number ? `#${activeSearch}` :
                      detectSearchType(activeSearch).address ? `address ${activeSearch.substring(0, 12)}...` :
                      detectSearchType(activeSearch).id ? `ID ${activeSearch.substring(0, 12)}...` :
                      activeSearch}
                  </div>
                )}
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

            {(contentTypeFilter !== 'all' || searchQuery || sortBy !== 'newest') && (
              <button
                onClick={() => {
                  setContentTypeFilter('all');
                  setSearchQuery('');
                  setActiveSearch('');
                  setSortBy('newest');
                  setCurrentPage(1);
                }}
                className="text-xs text-gray-400 hover:text-[#f59e0b] transition-colors"
              >
                Reset all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inline refresh indicator when data is already loaded */}
      {loading && inscriptions.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="h-3 w-3 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
          Refreshing...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  <a href={`https://mempool.space/block/${inscription.genesis_block_height}`} target="_blank" rel="noopener noreferrer" className="text-white font-mono hover:text-blue-400 transition-colors">
                    {formatNumber(inscription.genesis_block_height)} <ExternalLink className="h-3 w-3 inline ml-0.5" />
                  </a>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-500">Fee:</span>
                  <span className="text-[#f59e0b] font-mono">{formatNumber(inscription.genesis_fee)} sats</span>
                </div>
              </div>

              {inscription.address && (
                <div className="text-xs">
                  <span className="text-gray-500">Owner: </span>
                  <a href={`https://mempool.space/address/${inscription.address}`} target="_blank" rel="noopener noreferrer" className="text-white font-mono hover:text-blue-400 transition-colors">
                    {inscription.address.substring(0, 8)}...{inscription.address.substring(inscription.address.length - 8)} <ExternalLink className="h-3 w-3 inline ml-0.5" />
                  </a>
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
