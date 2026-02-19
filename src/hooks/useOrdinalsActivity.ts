import { useState, useEffect, useCallback } from 'react';

interface ActivityItem {
  id: string;
  type: 'sale' | 'listing' | 'transfer';
  title: string;
  description: string;
  timestamp: Date;
  value?: string;
}

function mapKind(kind: string): 'sale' | 'listing' | 'transfer' {
  switch (kind) {
    case 'sale':
    case 'buying_broadcasted':
    case 'offer_accepted_broadcasted':
      return 'sale';
    case 'listing':
    case 'list':
      return 'listing';
    default:
      return 'transfer';
  }
}

export function useOrdinalsActivity() {
  const [data, setData] = useState<{
    activity: ActivityItem[];
    loading: boolean;
    error: string | null;
  }>({
    activity: [],
    loading: true,
    error: null,
  });

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/ordinals/activity/?limit=20&kind=listing');
      if (!res.ok) {
        throw new Error(`Failed to fetch activity: ${res.status}`);
      }

      const json = await res.json();

      if (!json.success || !Array.isArray(json.data)) {
        throw new Error(json.error || 'Invalid activity response');
      }

      const items: ActivityItem[] = json.data.map(
        (item: Record<string, unknown>, index: number) => {
          const kind = mapKind(String(item.kind || 'listing'));
          const collection = item.collectionSymbol
            ? String(item.collectionSymbol)
            : '';
          const inscNum = item.inscriptionNumber
            ? `#${item.inscriptionNumber}`
            : '';
          const tokenId = item.tokenId
            ? String(item.tokenId).slice(0, 12)
            : '';

          let title = '';
          let description = '';

          if (kind === 'sale') {
            title = collection
              ? `${collection} ${inscNum} Sold`
              : `Inscription ${inscNum || tokenId} Sold`;
            description = 'Sold on marketplace';
          } else if (kind === 'listing') {
            title = collection
              ? `${collection} ${inscNum} Listed`
              : `Inscription ${inscNum || tokenId} Listed`;
            description = 'New listing on marketplace';
          } else {
            title = collection
              ? `${collection} ${inscNum} Transferred`
              : `Inscription ${inscNum || tokenId} Transferred`;
            description = 'Transfer detected';
          }

          const priceSats =
            typeof item.price === 'number' ? item.price : null;
          const valueBtc =
            priceSats !== null
              ? `${(priceSats / 1e8).toFixed(6)} BTC`
              : undefined;

          const ts = item.timestamp
            ? new Date(item.timestamp as string | number)
            : new Date();

          return {
            id: String(item.tokenId || item.txId || `activity-${index}`),
            type: kind,
            title,
            description,
            timestamp: ts,
            value: valueBtc,
          };
        }
      );

      setData({ activity: items, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useOrdinalsActivity] Error:', message);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
    }
  }, []);

  useEffect(() => {
    fetchActivity();

    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  return data;
}
