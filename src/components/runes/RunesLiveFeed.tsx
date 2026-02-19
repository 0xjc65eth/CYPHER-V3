'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableSkeleton } from '@/components/ui/professional';
import { Radio, Pause, Play, Search, AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { ExportButton } from '@/components/common/ExportButton';
import { useRunesWebSocket } from '@/hooks/runes/useRunesWebSocket';

import type { FeedEvent, FilterKey } from './live-feed/types';
import { MAX_EVENTS, FILTER_OPTIONS } from './live-feed/config';
import { fetchLiveActivities } from './live-feed/fetch-activities';
import { EventRow } from './live-feed/EventRow';
import { StatsBar } from './live-feed/StatsBar';

// Default rune names if API fails
const FALLBACK_RUNE_NAMES = [
  'UNCOMMON\u2022GOODS',
  'DOG\u2022GO\u2022TO\u2022THE\u2022MOON',
  'RSIC\u2022GENESIS\u2022RUNE',
  'RUNESTONE',
  'SATOSHI\u2022NAKAMOTO',
  'THE\u2022RUNE\u2022STONE',
  'WANKO\u2022MANKO',
  'BILLION\u2022DOLLAR\u2022CAT',
  'MEME\u2022ECONOMICS',
  'Z\u2022Z\u2022Z\u2022Z\u2022Z\u2022FEHU',
];

export default function RunesLiveFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [runeNames, setRuneNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [search, setSearch] = useState('');

  const pausedRef = useRef(paused);
  const runeNamesRef = useRef(runeNames);
  const feedRef = useRef<HTMLDivElement>(null);
  const lastFetchedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { runeNamesRef.current = runeNames; }, [runeNames]);

  // -----------------------------------------------------------------------
  // WebSocket connection (falls back to polling automatically)
  // -----------------------------------------------------------------------
  const handleWsEvents = useCallback((wsEvents: FeedEvent[]) => {
    if (pausedRef.current) return;
    const prevIds = lastFetchedIdsRef.current;
    const fresh = wsEvents.filter((e) => !prevIds.has(e.id));
    if (fresh.length === 0) return;

    const newIds = new Set(prevIds);
    fresh.forEach((e) => newIds.add(e.id));
    lastFetchedIdsRef.current = newIds;

    setEvents((prev) => {
      const merged = [...fresh.map(e => ({ ...e, isNew: true })), ...prev];
      if (merged.length > MAX_EVENTS) merged.length = MAX_EVENTS;
      return merged;
    });

    setTimeout(() => {
      setEvents((prev) =>
        prev.map((e) => (fresh.some(f => f.id === e.id) ? { ...e, isNew: false } : e))
      );
    }, 2000);

    if (!pausedRef.current && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, []);

  const { connected: wsConnected, mode: connectionMode } = useRunesWebSocket({
    paused,
    onEvents: handleWsEvents,
  });

  // -----------------------------------------------------------------------
  // Fetch rune names
  // -----------------------------------------------------------------------
  const fetchRuneNames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/runes/popular/?limit=60&offset=0');
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const json = await res.json();
      const names: string[] = (json.results ?? json.data ?? [])
        .map((r: Record<string, unknown>) => (r.name ?? r.spaced_name ?? r.rune_name) as string)
        .filter(Boolean);
      if (names.length === 0) throw new Error('No rune names returned');
      setRuneNames(names);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch rune names';
      setError(msg);
      setRuneNames(FALLBACK_RUNE_NAMES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRuneNames(); }, [fetchRuneNames]);

  // -----------------------------------------------------------------------
  // Fetch live events
  // -----------------------------------------------------------------------
  const fetchLiveEvents = useCallback(async () => {
    if (pausedRef.current) return;
    const names = runeNamesRef.current;
    if (names.length === 0) return;

    try {
      const newEvents = await fetchLiveActivities(names);
      const prevIds = lastFetchedIdsRef.current;
      const fresh = newEvents.filter((e) => !prevIds.has(e.id));

      if (fresh.length > 0) {
        const newIds = new Set(prevIds);
        newEvents.forEach((e) => newIds.add(e.id));
        lastFetchedIdsRef.current = newIds;

        setEvents((prev) => {
          const merged = [...fresh.map(e => ({ ...e, isNew: true })), ...prev];
          if (merged.length > MAX_EVENTS) merged.length = MAX_EVENTS;
          return merged;
        });

        setTimeout(() => {
          setEvents((prev) =>
            prev.map((e) => (fresh.some(f => f.id === e.id) ? { ...e, isNew: false } : e))
          );
        }, 2000);

        if (!pausedRef.current && feedRef.current) {
          feedRef.current.scrollTop = 0;
        }
      }
    } catch {
      // Live events fetch failed - will retry on next interval
    }
  }, []);

  // Only use polling when WebSocket is not connected
  useEffect(() => {
    if (runeNames.length === 0) return;

    // Always do an initial fetch for data
    fetchLiveEvents();

    // Only start polling interval if in polling mode (WS not connected)
    if (connectionMode === 'polling') {
      const interval = setInterval(fetchLiveEvents, 15_000);
      return () => clearInterval(interval);
    }
  }, [runeNames, fetchLiveEvents, connectionMode]);

  // -----------------------------------------------------------------------
  // Derived stats
  // -----------------------------------------------------------------------
  const oneMinAgo = Date.now() - 60_000;
  const eventsPerMin = events.filter((e) => e.timestamp > oneMinAgo).length;
  const activeRunes = new Set(events.map((e) => e.rune)).size;
  const volumeBtc = events
    .filter((e) => e.timestamp > Date.now() - 3_600_000 && e.price)
    .reduce((sum, e) => sum + ((e.amount * (e.price ?? 0)) / 100_000_000), 0);
  const whaleAlerts = events.filter((e) => e.type === 'WHALE').length;

  // -----------------------------------------------------------------------
  // Filtered events
  // -----------------------------------------------------------------------
  const filtered = events.filter((e) => {
    if (filter === 'TRADE' && e.type !== 'TRADE_BUY' && e.type !== 'TRADE_SELL') return false;
    if (filter !== 'ALL' && filter !== 'TRADE' && e.type !== filter) return false;
    if (search && !e.rune.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <Card className="border-gray-700 bg-black">
        <CardHeader className="border-b border-gray-800 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-200">
            <Radio className="h-4 w-4 text-green-400" />
            Live Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <TableSkeleton rows={10} columns={4} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-700 bg-black">
      <CardHeader className="border-b border-gray-800 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-200">
            <Radio className="h-4 w-4 text-green-400" />
            Live Activity Feed
            {/* Connection mode indicator */}
            <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
              connectionMode === 'websocket'
                ? 'bg-green-900/30 text-green-400 border border-green-700/30'
                : 'bg-gray-800 text-gray-500 border border-gray-700/30'
            }`}>
              {connectionMode === 'websocket' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {connectionMode === 'websocket' ? 'WS' : 'POLL 15s'}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <ExportButton
              type="custom"
              data={filtered}
              columns={[
                { key: 'type', label: 'Type' },
                { key: 'rune', label: 'Rune' },
                { key: 'description', label: 'Description' },
                { key: 'amount', label: 'Amount' },
                { key: 'price', label: 'Price' },
                { key: 'from', label: 'From' },
                { key: 'to', label: 'To' },
                { key: 'txid', label: 'TXID' },
                { key: 'timestamp', label: 'Timestamp' },
              ]}
              title="Runes Live Activity"
              filename="runes-live-activity"
              size="sm"
              variant="outline"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaused((p) => !p)}
              className="h-7 gap-1.5 border-gray-700 bg-gray-900 text-xs text-gray-300 hover:bg-gray-800"
            >
              {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {paused ? 'Resume' : 'Pause'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-3">
        {/* Stats bar */}
        <StatsBar
          eventsPerMin={eventsPerMin}
          activeRunes={activeRunes}
          volumeBtc={volumeBtc}
          whaleAlerts={whaleAlerts}
          isPaused={paused}
        />

        {/* Error notice */}
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-yellow-600/30 bg-yellow-900/10 px-3 py-2 text-xs text-yellow-400">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            {error} — using fallback rune names.
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchRuneNames}
              className="ml-auto h-6 px-2 text-[10px] text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* Filters + search */}
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              variant="outline"
              size="sm"
              onClick={() => setFilter(opt.key)}
              className={`h-7 border-gray-700 text-[11px] ${
                filter === opt.key
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {opt.label}
            </Button>
          ))}
          <div className="relative ml-auto">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search rune..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-44 border-gray-700 bg-gray-900 pl-7 text-xs text-gray-200 placeholder:text-gray-600"
            />
          </div>
        </div>

        {/* Event list */}
        <div ref={feedRef} className="max-h-[600px] space-y-1.5 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <span className="text-sm text-gray-600">
                {events.length === 0 ? 'Waiting for events from Magic Eden & Hiro APIs...' : 'No events match current filters.'}
              </span>
              {events.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLiveEvents}
                  className="h-7 border-gray-700 text-xs text-gray-400 hover:bg-gray-800"
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Retry
                </Button>
              )}
            </div>
          ) : (
            filtered.map((event) => <EventRow key={event.id} event={event} />)
          )}
        </div>
      </CardContent>
    </Card>
  );
}
