// hooks/useRealTimeData.ts
import { useState, useEffect, useRef } from 'react';
import { wsManager } from '../lib/websocket-client';

export function useRealTimeData(channels: string[] = []) {
  const [data, setData] = useState<Record<string, any>>({});
  const [isConnected, setIsConnected] = useState(false);
  
  // Ref para evitar race conditions
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Limpar AbortController anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Criar novo AbortController
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    
    // Conectar WebSocket se não estiver conectado
    if (!wsManager.isConnected && !signal.aborted) {
      wsManager.connect();
    }

    // Subscribir aos canais especificados
    const unsubscribeFunctions: (() => void)[] = [];

    // Subscribir ao status de conexão
    const unsubscribeConnection = wsManager.subscribe('connection', (payload: any) => {
      if (!isMountedRef.current || signal.aborted) return;
      
      setIsConnected(payload.status === 'connected');
    });
    unsubscribeFunctions.push(unsubscribeConnection);

    // Subscribir aos canais de dados
    channels.forEach(channel => {
      const unsubscribe = wsManager.subscribe(channel, (payload: any) => {
        if (!isMountedRef.current || signal.aborted) return;
        
        setData(prevData => ({
          ...prevData,
          [channel]: payload
        }));
      });
      unsubscribeFunctions.push(unsubscribe);
    });

    // Cleanup
    return () => {
      isMountedRef.current = false;
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      unsubscribeFunctions.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
        }
      });
    };
  }, [channels.join(',')]);
  
  // Effect para cleanup final
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { data, isConnected };
}