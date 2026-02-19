import { useQuery } from '@tanstack/react-query'

export function useTopOrdinals() {
  return useQuery({
    queryKey: ['top-ordinals'],
    queryFn: async () => {
      const res = await fetch('/api/ordinals-top/')
      if (!res.ok) throw new Error('Erro ao buscar Ordinals')
      return res.json()
    },
    refetchInterval: 60000, // 1 minuto
  })
} 