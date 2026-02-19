import { useState, useEffect, useCallback, useRef } from 'react';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

interface Trade {
  id: string;
  timestamp: Date;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
}

interface MarketData {
  orderBook: {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
  };
  recentTrades: Trade[];
  volume24h: number;
  high24h: number;
  low24h: number;
}

async function fetchOrderBook(): Promise<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }> {
  const res = await fetch('/api/binance/orderbook/');
  if (!res.ok) throw new Error('Failed to fetch orderbook');
  const json = await res.json();
  const data = json.data || json;

  const mapEntries = (entries: [string, string][]): OrderBookEntry[] =>
    entries.map(([price, qty]: [string, string]) => {
      const p = parseFloat(price);
      const a = parseFloat(qty);
      return { price: p, amount: a, total: p * a };
    });

  return {
    bids: mapEntries(data.bids || []),
    asks: mapEntries(data.asks || []),
  };
}

async function fetchRecentTrades(): Promise<Trade[]> {
  const res = await fetch('/api/binance/orderbook/?type=trades');
  if (!res.ok) throw new Error('Failed to fetch trades');
  const json = await res.json();
  const data = json.data || json;

  return (data as any[]).map((t: any) => ({
    id: String(t.id),
    timestamp: new Date(t.time),
    price: parseFloat(t.price),
    amount: parseFloat(t.qty),
    side: t.isBuyerMaker ? 'sell' : 'buy' as 'buy' | 'sell',
  }));
}

async function fetch24hStats(): Promise<{ volume24h: number; high24h: number; low24h: number }> {
  const res = await fetch(
    '/api/coingecko/?endpoint=/coins/markets&params=' +
      encodeURIComponent('vs_currency=usd&ids=bitcoin&per_page=1&page=1')
  );
  if (!res.ok) throw new Error('Failed to fetch 24h stats');
  const data = await res.json();
  const btc = Array.isArray(data) ? data[0] : null;
  if (!btc) throw new Error('No BTC data');

  return {
    volume24h: btc.total_volume || 0,
    high24h: btc.high_24h || 0,
    low24h: btc.low_24h || 0,
  };
}

export function useMarketData() {
  const [data, setData] = useState<MarketData>({
    orderBook: { bids: [], asks: [] },
    recentTrades: [],
    volume24h: 0,
    high24h: 0,
    low24h: 0,
  });

  const mountedRef = useRef(true);

  const fetchAll = useCallback(async () => {
    try {
      const [orderBook, recentTrades, stats] = await Promise.allSettled([
        fetchOrderBook(),
        fetchRecentTrades(),
        fetch24hStats(),
      ]);

      if (!mountedRef.current) return;

      setData(prev => ({
        orderBook: orderBook.status === 'fulfilled' ? orderBook.value : prev.orderBook,
        recentTrades: recentTrades.status === 'fulfilled' ? recentTrades.value : prev.recentTrades,
        volume24h: stats.status === 'fulfilled' ? stats.value.volume24h : prev.volume24h,
        high24h: stats.status === 'fulfilled' ? stats.value.high24h : prev.high24h,
        low24h: stats.status === 'fulfilled' ? stats.value.low24h : prev.low24h,
      }));
    } catch (err) {
      console.error('useMarketData fetch error:', err);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();

    // Refresh orderbook and trades every 5 seconds, 24h stats every 60 seconds
    const fastInterval = setInterval(async () => {
      if (!mountedRef.current) return;
      try {
        const [orderBook, recentTrades] = await Promise.allSettled([
          fetchOrderBook(),
          fetchRecentTrades(),
        ]);
        if (!mountedRef.current) return;
        setData(prev => ({
          ...prev,
          orderBook: orderBook.status === 'fulfilled' ? orderBook.value : prev.orderBook,
          recentTrades: recentTrades.status === 'fulfilled' ? recentTrades.value : prev.recentTrades,
        }));
      } catch { /* ignore */ }
    }, 5000);

    const slowInterval = setInterval(async () => {
      if (!mountedRef.current) return;
      try {
        const stats = await fetch24hStats();
        if (!mountedRef.current) return;
        setData(prev => ({ ...prev, ...stats }));
      } catch { /* ignore */ }
    }, 60000);

    return () => {
      mountedRef.current = false;
      clearInterval(fastInterval);
      clearInterval(slowInterval);
    };
  }, [fetchAll]);

  return data;
}
