'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface MempoolBlock {
  height: number;
  hash: string;
  timestamp: number;
  tx_count: number;
  size: number;
}

interface UseMempoolWebSocketReturn {
  connected: boolean;
  latestBlock: MempoolBlock | null;
  newBlockCount: number;
}

/**
 * Connects to mempool.space WebSocket for real-time block notifications.
 * Triggers inscription re-fetches when new blocks are detected.
 */
export function useMempoolWebSocket(): UseMempoolWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [latestBlock, setLatestBlock] = useState<MempoolBlock | null>(null);
  const [newBlockCount, setNewBlockCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);
  const mountedRef = useRef(true);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (typeof WebSocket === 'undefined') return;

    // Stop reconnecting after max attempts - degrade gracefully
    if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[MempoolWS] Max reconnect attempts reached, disabling real-time blocks');
      return;
    }

    try {
      const ws = new WebSocket('wss://mempool.space/api/v1/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return; }
        setConnected(true);
        reconnectAttemptRef.current = 0;
        // Subscribe to new blocks
        ws.send(JSON.stringify({ action: 'want', data: ['blocks'] }));
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.block) {
            const block: MempoolBlock = {
              height: msg.block.height,
              hash: msg.block.id,
              timestamp: msg.block.timestamp,
              tx_count: msg.block.tx_count,
              size: msg.block.size,
            };
            setLatestBlock(block);
            setNewBlockCount(prev => prev + 1);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) return;
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
        reconnectAttemptRef.current++;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose will fire after onerror, which handles reconnection
      };
    } catch {
      // WebSocket unavailable (e.g. serverless environment) - degrade gracefully
      if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) return;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
      reconnectAttemptRef.current++;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { connected, latestBlock, newBlockCount };
}
