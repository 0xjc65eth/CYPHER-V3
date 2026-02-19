'use client';

import { useQuery } from '@tanstack/react-query';
import { useClientPrice } from './useClientValue';
import { useState, useEffect } from 'react';

interface PriceData {
  price: number;
  change24h: number;
  lastUpdate: number;
}

export function useSafePrice(symbol: string) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['price', symbol],
    queryFn: async (): Promise<PriceData> => {
      const response = await fetch(`/api/bitcoin/?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error('Failed to fetch price');
      }
      return response.json();
    },
    enabled: hydrated, // Só executa após hidratação
    refetchInterval: 30000, // Atualiza a cada 30s
    staleTime: 10000, // Considera stale após 10s
  });

  // Hook seguro para formatação de preço
  const formattedPrice = useClientPrice(
    () => data?.price || 0,
    "Loading..."
  );

  const formattedChange = useClientPrice(
    () => data?.change24h || 0,
    "..."
  );

  return {
    price: data?.price || 0,
    formattedPrice: hydrated ? formattedPrice : "Loading...",
    change24h: data?.change24h || 0,
    formattedChange: hydrated ? formattedChange : "...",
    lastUpdate: data?.lastUpdate || 0,
    isLoading: isLoading || !hydrated,
    error,
    hydrated
  };
}

export function useSafeCryptoPrice(symbol: string) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['crypto-price', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/binance/klines/?symbol=${symbol}&interval=1m&limit=1`
      );
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      return result.data?.[0] || null;
    },
    enabled: mounted,
    refetchInterval: 5000, // Update every 5s for crypto
    staleTime: 2000,
  });

  // Formatação segura
  const formatPrice = (price: number) => {
    if (!mounted || !price) return "...";
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: price >= 1 ? 2 : 6,
      maximumFractionDigits: price >= 1 ? 2 : 6,
    }).format(price);
  };

  return {
    rawData: data,
    price: data?.close || 0,
    formattedPrice: formatPrice(data?.close),
    high24h: data?.high || 0,
    low24h: data?.low || 0,
    volume: data?.volume || 0,
    isLoading: isLoading || !mounted,
    error,
    mounted
  };
}