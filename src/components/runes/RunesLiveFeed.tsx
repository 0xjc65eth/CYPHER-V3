'use client';

import { useState, useEffect, useRef, useCallback, type ElementType } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Radio,
  Hammer,
  ArrowUpDown,
  Sparkles,
  Send,
  Fish,
  Pause,
  Play,
  Search,
  Activity,
  Zap,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventType = 'MINT' | 'TRADE_BUY' | 'TRADE_SELL' | 'ETCH' | 'TRANSFER' | 'WHALE';

interface FeedEvent {
  id: string;
  type: EventType;
  rune: string;
  description: string;
  amount: number;
  price?: number;
  from: string;
  to: string;
  txid: string;
  timestamp: number;
  isNew?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_EVENTS = 100;

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randHex(len: number) {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * 16)];
  return out;
}

function makeBtcAddress() {
  return 'bc1p' + randHex(58);
}

function makeTxid() {
  return randHex(64);
}

function truncAddr(addr: string) {
  if (addr.length <= 14) return addr;
  return addr.slice(0, 8) + '...' + addr.slice(-6);
}

function truncTx(tx: string) {
  if (tx.length <= 16) return tx;
  return tx.slice(0, 8) + '...' + tx.slice(-6);
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

// ---------------------------------------------------------------------------
// Event generation
// ---------------------------------------------------------------------------

function generateEvent(runeNames: string[]): FeedEvent {
  const rune = runeNames[randInt(0, runeNames.length - 1)];
  const types: EventType[] = ['MINT', 'TRADE_BUY', 'TRADE_SELL', 'ETCH', 'TRANSFER', 'WHALE'];
  const weights = [30, 20, 20, 5, 20, 5];
  let roll = randInt(1, 100);
  let type: EventType = 'MINT';
  for (let i = 0; i < types.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { type = types[i]; break; }
  }

  const from = makeBtcAddress();
  const to = makeBtcAddress();
  const txid = makeTxid();
  const now = Date.now();
  let amount = 0;
  let price: number | undefined;
  let description = '';

  switch (type) {
    case 'MINT':
      amount = randInt(1000, 1_000_000);
      description = `MINTED ${formatNumber(amount)} ${rune}`;
      break;
    case 'TRADE_BUY':
      amount = randInt(100, 50_000);
      price = randInt(10, 5000);
      description = `BOUGHT ${formatNumber(amount)} ${rune} @ ${price.toLocaleString()} sats`;
      break;
    case 'TRADE_SELL':
      amount = randInt(100, 50_000);
      price = randInt(10, 5000);
      description = `SOLD ${formatNumber(amount)} ${rune} @ ${price.toLocaleString()} sats`;
      break;
    case 'ETCH':
      amount = randInt(1_000_000, 100_000_000);
      description = `NEW RUNE ETCHED: ${rune} — Supply: ${formatNumber(amount)}`;
      break;
    case 'TRANSFER':
      amount = randInt(500, 5_000_000);
      description = `TRANSFERRED ${formatNumber(amount)} ${rune}`;
      break;
    case 'WHALE':
      amount = randInt(1_000_000, 50_000_000);
      price = randInt(500, 10000);
      description = `WHALE MOVE: ${formatNumber(amount)} ${rune} (~$${formatNumber(amount * (price / 100_000_000) * 60000)})`;
      break;
  }

  return {
    id: `${now}-${randHex(8)}`,
    type,
    rune,
    description,
    amount,
    price,
    from,
    to,
    txid,
    timestamp: now,
    isNew: true,
  };
}

// ---------------------------------------------------------------------------
// Config per event type
// ---------------------------------------------------------------------------

const EVENT_CONFIG: Record<EventType, {
  label: string;
  icon: ElementType;
  badgeClass: string;
  borderClass: string;
}> = {
  MINT: {
    label: 'MINT',
    icon: Hammer,
    badgeClass: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
    borderClass: 'border-l-blue-500',
  },
  TRADE_BUY: {
    label: 'BUY',
    icon: ArrowUpDown,
    badgeClass: 'bg-green-600/20 text-green-400 border-green-500/30',
    borderClass: 'border-l-green-500',
  },
  TRADE_SELL: {
    label: 'SELL',
    icon: ArrowUpDown,
    badgeClass: 'bg-red-600/20 text-red-400 border-red-500/30',
    borderClass: 'border-l-red-500',
  },
  ETCH: {
    label: 'ETCH',
    icon: Sparkles,
    badgeClass: 'bg-purple-600/20 text-purple-400 border-purple-500/30',
    borderClass: 'border-l-purple-500',
  },
  TRANSFER: {
    label: 'TRANSFER',
    icon: Send,
    badgeClass: 'bg-gray-600/20 text-gray-400 border-gray-500/30',
    borderClass: 'border-l-gray-500',
  },
  WHALE: {
    label: 'WHALE',
    icon: Fish,
    badgeClass: 'bg-orange-600/20 text-orange-400 border-orange-500/30',
    borderClass: 'border-l-orange-500',
  },
};

type FilterKey = 'ALL' | 'MINT' | 'TRADE' | 'ETCH' | 'TRANSFER' | 'WHALE';

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'MINT', label: 'Mints' },
  { key: 'TRADE', label: 'Trades' },
  { key: 'ETCH', label: 'Etchings' },
  { key: 'TRANSFER', label: 'Transfers' },
  { key: 'WHALE', label: 'Whales' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LiveIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
      </span>
      LIVE
    </span>
  );
}

function StatsBar({
  eventsPerMin,
  activeRunes,
  volumeBtc,
  whaleAlerts,
  isPaused,
}: {
  eventsPerMin: number;
  activeRunes: number;
  volumeBtc: number;
  whaleAlerts: number;
  isPaused: boolean;
}) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-4 rounded-lg border border-gray-700 bg-gray-900/95 px-4 py-2.5 backdrop-blur-sm">
      {isPaused ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-400">
          <Pause className="h-3 w-3" /> PAUSED
        </span>
      ) : (
        <LiveIndicator />
      )}
      <div className="h-4 w-px bg-gray-700" />
      <StatItem icon={Activity} label="Events/min" value={eventsPerMin.toString()} />
      <StatItem icon={Radio} label="Active Runes" value={activeRunes.toString()} />
      <StatItem icon={Zap} label="Vol (1h)" value={`${volumeBtc.toFixed(2)} BTC`} />
      <StatItem
        icon={Fish}
        label="Whale Alerts"
        value={whaleAlerts.toString()}
        className={whaleAlerts > 0 ? 'text-orange-400' : undefined}
      />
    </div>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: ElementType;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className={`h-3.5 w-3.5 text-gray-500 ${className ?? ''}`} />
      <span className="text-gray-500">{label}:</span>
      <span className={`font-mono font-semibold ${className ?? 'text-gray-200'}`}>{value}</span>
    </div>
  );
}

function EventRow({ event }: { event: FeedEvent }) {
  const config = EVENT_CONFIG[event.type];
  const Icon = config.icon;
  const isWhale = event.type === 'WHALE';

  return (
    <div
      className={`
        flex items-start gap-3 rounded-md border-l-2 px-3 py-2.5 transition-colors duration-[2000ms]
        ${config.borderClass}
        ${isWhale ? 'border border-orange-500/30 bg-orange-950/10' : 'border border-transparent bg-gray-900/60'}
        ${event.isNew ? 'bg-gray-800' : ''}
      `}
    >
      {/* Left: icon + badge */}
      <div className="flex flex-shrink-0 items-center gap-2 pt-0.5">
        <Icon className="h-4 w-4 text-gray-400" />
        <Badge className={`text-[10px] font-bold ${config.badgeClass}`}>
          {config.label}
        </Badge>
      </div>

      {/* Center: description + addresses */}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-mono text-sm font-medium text-gray-100">
          {event.description}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
          <span>
            From: <span className="font-mono text-gray-400">{truncAddr(event.from)}</span>
          </span>
          <span>
            To: <span className="font-mono text-gray-400">{truncAddr(event.to)}</span>
          </span>
          <span>
            Tx: <span className="font-mono text-gray-400">{truncTx(event.txid)}</span>
          </span>
        </div>
      </div>

      {/* Right: timestamp */}
      <div className="flex-shrink-0 pt-0.5 text-right text-xs text-gray-500">
        {timeAgo(event.timestamp)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

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

  // Keep refs in sync
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { runeNamesRef.current = runeNames; }, [runeNames]);

  // -----------------------------------------------------------------------
  // Fetch rune names
  // -----------------------------------------------------------------------
  const fetchRuneNames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/runes/popular?limit=60&offset=0');
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
      // Fallback names so feed can still work
      setRuneNames([
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
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRuneNames(); }, [fetchRuneNames]);

  // -----------------------------------------------------------------------
  // Simulate live events
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (runeNames.length === 0) return;

    const interval = setInterval(() => {
      if (pausedRef.current) return;
      const names = runeNamesRef.current;
      if (names.length === 0) return;

      const newEvent = generateEvent(names);

      setEvents((prev) => {
        const updated = [newEvent, ...prev];
        if (updated.length > MAX_EVENTS) updated.length = MAX_EVENTS;
        return updated;
      });

      // Remove isNew highlight after 2s
      setTimeout(() => {
        setEvents((prev) =>
          prev.map((e) => (e.id === newEvent.id ? { ...e, isNew: false } : e))
        );
      }, 2000);

      // Scroll to top unless paused
      if (!pausedRef.current && feedRef.current) {
        feedRef.current.scrollTop = 0;
      }
    }, randInt(2000, 3000));

    return () => clearInterval(interval);
  }, [runeNames]);

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
    if (filter === 'MINT' && e.type !== 'MINT') return false;
    if (filter === 'ETCH' && e.type !== 'ETCH') return false;
    if (filter === 'TRANSFER' && e.type !== 'TRANSFER') return false;
    if (filter === 'WHALE' && e.type !== 'WHALE') return false;
    if (search && !e.rune.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <Card className="border-gray-700 bg-black">
        <CardContent className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
            <span className="text-sm text-gray-500">Loading live feed...</span>
          </div>
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
          </CardTitle>
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
            <div className="flex h-32 items-center justify-center text-sm text-gray-600">
              {events.length === 0 ? 'Waiting for events...' : 'No events match current filters.'}
            </div>
          ) : (
            filtered.map((event) => <EventRow key={event.id} event={event} />)
          )}
        </div>
      </CardContent>
    </Card>
  );
}
