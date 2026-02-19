/**
 * 🔒 Safe WebSocket Hook
 * Utility hook para gerenciar WebSockets com cleanup adequado
 * Previne memory leaks e race conditions
 */

import { useEffect, useRef, useCallback } from 'react';

interface UseWebSocketSafeOptions {
  url?: string;
  onOpen?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

interface WebSocketState {
  connect: () => void;
  disconnect: () => void;
  send: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void;
  isConnected: () => boolean;
  readyState: () => number;
}

export function useWebSocketSafe(options: UseWebSocketSafeOptions = {}): WebSocketState {
  const {
    url,
    onOpen,
    onMessage,
    onError,
    onClose,
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000
  } = options;

  // Refs para evitar race conditions
  const wsRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Marcar como desmontado
    isMountedRef.current = false;

    // Abortar operações pendentes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Limpar timeout de reconexão
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Fechar WebSocket
    if (wsRef.current) {
      // Remover listeners para evitar chamadas após cleanup
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;

      if (wsRef.current.readyState === WebSocket.OPEN || 
          wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    reconnectCountRef.current = 0;
  }, []);

  // Função para conectar WebSocket
  const connect = useCallback(() => {
    if (!url || !isMountedRef.current) return;

    // Fechar conexão existente
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Criar novo AbortController
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = (event) => {
        if (!isMountedRef.current || signal.aborted) {
          wsRef.current?.close();
          return;
        }

        reconnectCountRef.current = 0;
        onOpen?.(event);
      };

      wsRef.current.onmessage = (event) => {
        if (!isMountedRef.current || signal.aborted) return;
        onMessage?.(event);
      };

      wsRef.current.onerror = (event) => {
        if (!isMountedRef.current || signal.aborted) return;
        onError?.(event);
      };

      wsRef.current.onclose = (event) => {
        if (!isMountedRef.current || signal.aborted) return;

        onClose?.(event);

        // Tentar reconectar se não foi um fechamento intencional
        if (event.code !== 1000 && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && !signal.aborted) {
              connect();
            }
          }, reconnectInterval);
        }
      };
    } catch (error) {
      if (!signal.aborted && onError) {
        onError(error as Event);
      }
    }
  }, [url, onOpen, onMessage, onError, onClose, reconnectAttempts, reconnectInterval]);

  // Função para desconectar
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
    }

    reconnectCountRef.current = 0;
  }, []);

  // Função para enviar dados
  const send = useCallback((data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    } else {
    }
  }, []);

  // Função para verificar se está conectado
  const isConnected = useCallback(() => {
    return wsRef.current?.readyState === WebSocket.OPEN;
  }, []);

  // Função para obter readyState
  const readyState = useCallback(() => {
    return wsRef.current?.readyState ?? WebSocket.CLOSED;
  }, []);

  // Effect para auto-conectar
  useEffect(() => {
    if (autoConnect && url) {
      connect();
    }

    return cleanup;
  }, [autoConnect, url, connect, cleanup]);

  // Effect para cleanup final
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    connect,
    disconnect,
    send,
    isConnected,
    readyState
  };
}

/**
 * Hook para gerenciar múltiplas conexões WebSocket
 */
export function useMultipleWebSockets(connections: Record<string, UseWebSocketSafeOptions>) {
  const sockets = useRef<Record<string, WebSocketState>>({});
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Criar conexões para cada entrada
    Object.entries(connections).forEach(([key, options]) => {
      sockets.current[key] = useWebSocketSafe(options);
    });

    return () => {
      isMountedRef.current = false;
      
      // Desconectar todas as conexões
      Object.values(sockets.current).forEach(socket => {
        socket.disconnect();
      });
      
      sockets.current = {};
    };
  }, []);

  return sockets.current;
}

export default useWebSocketSafe;