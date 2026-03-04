import { useQuery } from '@tanstack/react-query'

export function useMempoolDifficultyAdjustment() {
  return useQuery({
    queryKey: ['mempool-difficulty-adjustment'],
    queryFn: async () => {
      const res = await fetch('https://mempool.space/api/v1/difficulty-adjustment')
      return res.json()
    },
    staleTime: 300000, // 5min - difficulty adjustment changes slowly
    refetchInterval: 60000, // 1 minuto
  })
} 