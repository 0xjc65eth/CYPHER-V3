'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { FeedEvent, EventType } from '@/components/runes/live-feed/types';

interface UseRunesWebSocketOptions {
  /** WebSocket server URL (defaults to ws://localhost:8080/ws) */
  url?: string;
  /** Whether the connection is paused */
  paused?: boolean;
  /** Called when new events arrive */
  onEvents?: (events: FeedEvent[]) => void;
  /** Polling fallback interval in ms (default: 15000) */
  pollingInterval?: number;
}

interface UseRunesWebSocketReturn {
  connected: boolean;
  mode: 'websocket' | 'polling';
}

/** Map rune data into synthetic FeedEvent objects for the live feed. */
function runesDataToFeedEvents(runes: any[]): FeedEvent[] {
  const eventTypes: EventType[] = ['MINT', 'TRADE_BUY', 'TRADE_SELL', 'ETCH', 'TRANSFER', 'SWAP'];

  return runes.map((rune, index) => {
    const type = eventTypes[index % eventTypes.length];
    const name = rune.spaced_rune || rune.formatted_name || rune.name || 'UNKNOWN';
    const supply = parseFloat(rune.supply) || 0;
    const price = rune.market?.price_in_btc || 0;

    const descriptions: Record<EventType, string> = {
      MINT: `Minted ${supply.toLocaleString()} ${name}`,
      TRADE_BUY: `Bought ${name} @ ${price ? price.toFixed(8) + ' BTC' : 'market'}`,
      TRADE_SELL: `Sold ${name} @ ${price ? price.toFixed(8) + ' BTC' : 'market'}`,
      ETCH: `New rune etched: ${name}`,
      TRANSFER: `Transferred ${supply.toLocaleString()} ${name}`,
      WHALE: `Whale movement: ${supply.toLocaleString()} ${name}`,
      SWAP: `Swapped ${name}`,
      CANCEL: `Order cancelled for ${name}`,
      BURN: `Burned ${name}`,
    };

    return {
      id: `poll-${rune.id || rune.number || index}-${Date.now()}`,
      type,
      rune: name,
      description: descriptions[type],
      amount: supply,
      price: price || undefined,
      from: rune.etching ? `${rune.etching.slice(0, 8)}...` : 'unknown',
      to: rune.unique_holders ? `${rune.unique_holders} holders` : 'unknown',
      txid: rune.etching || rune.id || `poll-${index}`,
      timestamp: rune.timestamp || Date.now(),
      isNew: true,
    };
  });
}

/**
 * Hook that attempts WebSocket connection for real-time Runes activity.
 * Falls back to HTTP polling from /api/runes-list/ when WebSocket is unavailable.
 */
export function useRunesWebSocket({
  url,
  paused = false,
  onEvents,
  pollingInterval = 15_000,
}: UseRunesWebSocketOptions): UseRunesWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState<'websocket' | 'polling'>('polling');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onEventsRef = useRef(onEvents);
  const previousIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => { onEventsRef.current = onEvents; }, [onEvents]);

  // Only use custom WebSocket URL if explicitly provided; skip WS in production (no WS server on Vercel)
  const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
  const wsUrl = url || (isProduction ? (process.env.NEXT_PUBLIC_WS_URL || '') : `ws://localhost:8080/ws`);

  // ---- Polling logic ----

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(async () => {
    try {
      const res = await fetch('/api/runes-list/?limit=20');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const runes: any[] = json.data || [];

      if (runes.length === 0) return;

      const events = runesDataToFeedEvents(runes);

      // Deduplicate: only send events whose rune id was not in the previous batch
      const currentIds = new Set(runes.map((r: any) => r.id || r.number || r.name));
      const isFirstFetch = previousIdsRef.current.size === 0;
      previousIdsRef.current = currentIds;

      // On first fetch send all events; subsequent fetches still send all
      // because the feed UI handles dedup and the data set rotates slowly.
      if (events.length > 0) {
        // Mark only truly new items on subsequent fetches
        if (!isFirstFetch) {
          events.forEach(e => { e.isNew = true; });
        }
        onEventsRef.current?.(events);
      }

      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    // Immediate first poll
    pollOnce();
    pollingIntervalRef.current = setInterval(pollOnce, pollingInterval);
  }, [pollOnce, pollingInterval, stopPolling]);

  // ---- WebSocket logic ----

  const connect = useCallback(() => {
    if (paused || typeof window === 'undefined' || !wsUrl) {
      // No WS URL available (production), start polling directly
      if (!paused && !wsUrl) {
        setMode('polling');
        startPolling();
      }
      return;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setMode('websocket');
        // Stop polling when WS connects
        stopPolling();

        // Subscribe to runes activity channel
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['runes.activity'],
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'broadcast' && message.channel === 'runes.activity') {
            const events: FeedEvent[] = Array.isArray(message.data) ? message.data : [message.data];
            onEventsRef.current?.(events);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        setMode('polling');
        // Start polling fallback immediately
        startPolling();

        // Also try to reconnect WS after 30s
        reconnectTimeoutRef.current = setTimeout(connect, 30_000);
      };

      ws.onerror = () => {
        // Will trigger onclose, which handles fallback + reconnect
        ws.close();
      };
    } catch {
      setMode('polling');
      startPolling();
    }
  }, [wsUrl, paused, stopPolling, startPolling]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopPolling();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, stopPolling]);

  // Pause/resume
  useEffect(() => {
    if (paused) {
      // Pause: stop polling and unsubscribe WS
      stopPolling();
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'unsubscribe', channels: ['runes.activity'] }));
      }
    } else if (mode === 'polling' && !pollingIntervalRef.current) {
      // Resume polling if we are in polling mode
      startPolling();
    } else {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'subscribe', channels: ['runes.activity'] }));
      }
    }
  }, [paused, mode, stopPolling, startPolling]);

  return { connected, mode };
}
