import { useQuery } from '@tanstack/react-query';

// Fetcher function
const fetcher = (url: string) => fetch(url).then(res => res.json());

// Hook para dados de um Rune específico
export function useRuneInfo(runeName: string | null) {
  const { data, error, refetch } = useQuery({
    queryKey: ['rune-info', runeName],
    queryFn: () => fetcher(`/api/runes/${runeName}`),
    enabled: !!runeName,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5000,
    retry: 3,
    retryDelay: 2000,
  });

  return {
    data: data?.data || null,
    isLoading: !error && !data,
    isError: error,
    mutate: refetch,
  };
}

// Hook para lista de Runes
export function useRunesList() {
  const { data, error, refetch } = useQuery({
    queryKey: ['runes-list'],
    queryFn: () => fetcher('/api/runes/list'),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 10000,
  });

  return {
    runes: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    mutate: refetch,
  };
}

// Hook para dados de mercado em tempo real
export function useMarketData() {
  const { data, error, refetch } = useQuery({
    queryKey: ['market-overview'],
    queryFn: () => fetcher('/api/market/overview'),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 2000,
  });

  return {
    marketData: data?.data || null,
    isLoading: !error && !data,
    isError: error,
    mutate: refetch,
  };
}

// Hook para holders de um Rune
export function useRuneHolders(runeName: string | null, limit = 10) {
  const { data, error, refetch } = useQuery({
    queryKey: ['rune-holders', runeName, limit],
    queryFn: () => fetcher(`/api/runes/${runeName}/holders?limit=${limit}`),
    enabled: !!runeName,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
    staleTime: 15000,
  });

  return {
    holders: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    mutate: refetch,
  };
}

// Hook para atividade/transações de um Rune
export function useRuneActivity(runeName: string | null, limit = 20) {
  const { data, error, refetch } = useQuery({
    queryKey: ['rune-activity', runeName, limit],
    queryFn: () => fetcher(`/api/runes/${runeName}/activity?limit=${limit}`),
    enabled: !!runeName,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  return {
    activity: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    mutate: refetch,
  };
}

// Hook combinado para dashboard principal
export function useRunesDashboard(selectedRune?: string) {
  const runeInfo = useRuneInfo(selectedRune || null);
  const runesList = useRunesList();
  const marketData = useMarketData();
  const holders = useRuneHolders(selectedRune || null, 5);
  const activity = useRuneActivity(selectedRune || null, 10);

  return {
    selectedRune: runeInfo,
    allRunes: runesList,
    market: marketData,
    holders,
    activity,
    isLoading: runeInfo.isLoading || runesList.isLoading || marketData.isLoading,
    hasError: runeInfo.isError || runesList.isError || marketData.isError,
  };
}
