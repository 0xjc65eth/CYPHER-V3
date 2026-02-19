import { useQuery } from '@tanstack/react-query'

export function useMempoolDifficulty() {
  return useQuery({
    queryKey: ['mempool-difficulty'],
    queryFn: async () => {
      const res = await fetch('https://mempool.space/api/v1/difficulty-adjustment')
      return res.json()
    },
    refetchInterval: 60000, // 1 minuto
  })
} 