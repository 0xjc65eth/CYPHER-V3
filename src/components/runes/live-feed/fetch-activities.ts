import { formatNumber, isValidTxid } from '@/lib/utils/runes-formatters';
import type { EventType, FeedEvent } from './types';
import { MAX_EVENTS } from './config';

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

export function mapActivityType(apiType: string): EventType {
  switch (apiType?.toLowerCase()) {
    case 'buying': case 'buy': return 'TRADE_BUY';
    case 'listing': case 'sell': return 'TRADE_SELL';
    case 'mint': return 'MINT';
    case 'transfer': return 'TRANSFER';
    case 'etch': return 'ETCH';
    case 'swap': case 'exchange': return 'SWAP';
    case 'cancel': case 'delisting': case 'cancelled': return 'CANCEL';
    case 'burn': case 'burned': return 'BURN';
    default: return 'TRANSFER';
  }
}

function getOperationLabel(type: EventType): string {
  const labels: Record<EventType, string> = {
    MINT: 'MINTED',
    TRADE_BUY: 'BOUGHT',
    TRADE_SELL: 'SOLD',
    TRANSFER: 'TRANSFERRED',
    ETCH: 'ETCHED',
    WHALE: 'WHALE MOVE',
    SWAP: 'SWAPPED',
    CANCEL: 'CANCELLED',
    BURN: 'BURNED',
  };
  return labels[type] || type;
}

function buildDescription(type: EventType, amount: number, rune: string, price: number): string {
  switch (type) {
    case 'MINT':
      return `MINTED ${formatNumber(amount)} ${rune}`;
    case 'TRADE_BUY':
      return price > 0 ? `BOUGHT ${formatNumber(amount)} ${rune} @ ${price.toLocaleString()} sats` : `BOUGHT ${formatNumber(amount)} ${rune}`;
    case 'TRADE_SELL':
      return price > 0 ? `SOLD ${formatNumber(amount)} ${rune} @ ${price.toLocaleString()} sats` : `LISTED ${formatNumber(amount)} ${rune}`;
    case 'TRANSFER':
      return `TRANSFERRED ${formatNumber(amount)} ${rune}`;
    case 'SWAP':
      return price > 0 ? `SWAPPED ${formatNumber(amount)} ${rune} @ ${price.toLocaleString()} sats` : `SWAPPED ${formatNumber(amount)} ${rune}`;
    case 'CANCEL':
      return `CANCELLED ${formatNumber(amount)} ${rune} ORDER`;
    case 'BURN':
      return `BURNED ${formatNumber(amount)} ${rune}`;
    case 'WHALE':
      return `WHALE MOVE: ${formatNumber(amount)} ${rune} (~${price.toLocaleString()} sats)`;
    default:
      return `${type} ${formatNumber(amount)} ${rune}`;
  }
}

// ---------------------------------------------------------------------------
// Activity → FeedEvent converters
// ---------------------------------------------------------------------------

export function activityToEvent(activity: any, rune: string): FeedEvent | null {
  const txid = activity.txId || activity.txid || activity.tx;
  if (!txid) return null;

  const type = mapActivityType(activity.type || activity.kind);
  const amount = Number(activity.amount || activity.formattedAmount || activity.tokenCount || 0);
  const price = Number(activity.unitPrice?.value || activity.price || activity.totalPrice?.value || 0);
  const from = activity.from || activity.oldOwner || activity.seller || 'Unknown';
  const to = activity.to || activity.newOwner || activity.buyer || 'Unknown';
  const ts = activity.timestamp ? new Date(activity.timestamp).getTime()
    : activity.createdAt ? new Date(activity.createdAt).getTime()
    : Date.now();

  const isWhale = amount > 1_000_000 && price > 0;
  const finalType: EventType = isWhale ? 'WHALE' : type;
  const description = buildDescription(finalType, amount, rune, price);

  return {
    id: `${ts}-${txid.slice(0, 8)}`,
    type: finalType,
    rune,
    description,
    amount,
    price: price > 0 ? price : undefined,
    from,
    to,
    txid,
    timestamp: ts,
    isNew: true,
  };
}

// ---------------------------------------------------------------------------
// API fetchers
// ---------------------------------------------------------------------------

async function fetchHiroActivities(runeName: string): Promise<FeedEvent[]> {
  try {
    const encoded = encodeURIComponent(runeName);
    const res = await fetch(`/api/runes/activity/${encoded}/?limit=15&order=desc`);
    if (!res.ok) return [];

    const response = await res.json();
    if (!response.success || !response.data?.results) return [];

    return response.data.results
      .map((a: any) => {
        const txid = a.tx_id || a.txid;
        if (!txid || !isValidTxid(txid)) return null;

        const type = mapActivityType(a.operation || a.operation_type || 'transfer');
        const amount = Number(a.amount || 0);
        const from = a.from_address || a.sender || 'Unknown';
        const to = a.to_address || a.receiver || 'Unknown';
        const ts = a.timestamp ? new Date(a.timestamp).getTime() : Date.now();
        const description = `${getOperationLabel(type)} ${formatNumber(amount)} ${runeName}`;

        return {
          id: `hiro-${ts}-${txid.slice(0, 8)}`,
          type,
          rune: runeName,
          description,
          amount,
          from,
          to,
          txid,
          timestamp: ts,
          isNew: true,
        } as FeedEvent;
      })
      .filter((e: FeedEvent | null): e is FeedEvent => e !== null);
  } catch {
    return [];
  }
}

async function fetchMagicEdenActivities(runeName: string): Promise<FeedEvent[]> {
  try {
    const encoded = encodeURIComponent(runeName);
    const res = await fetch(`/api/magiceden/runes/activities/${encoded}/?limit=15`);
    if (!res.ok) return [];

    const data = await res.json();
    const activities = data.activities || data.data || (Array.isArray(data) ? data : []);

    return activities
      .map((a: any) => activityToEvent(a, runeName))
      .filter((e: FeedEvent | null): e is FeedEvent => e !== null)
      .filter((e: FeedEvent) => isValidTxid(e.txid));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Combined fetcher (Magic Eden + Hiro, deduplicated)
// ---------------------------------------------------------------------------

export async function fetchLiveActivities(runeNames: string[]): Promise<FeedEvent[]> {
  const runesToFetch = runeNames.slice(0, 8);

  const results = await Promise.allSettled(
    runesToFetch.flatMap((rune) => [
      fetchMagicEdenActivities(rune),
      fetchHiroActivities(rune),
    ])
  );

  const events: FeedEvent[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      events.push(...r.value);
    }
  }

  // Deduplicate by txid
  const uniqueEvents = new Map<string, FeedEvent>();
  for (const event of events) {
    if (!uniqueEvents.has(event.txid) || event.timestamp > uniqueEvents.get(event.txid)!.timestamp) {
      uniqueEvents.set(event.txid, event);
    }
  }

  return Array.from(uniqueEvents.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_EVENTS);
}
