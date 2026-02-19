import { useQuery } from '@tanstack/react-query'

export function useOrdinalsCollections() {
  return useQuery({
    queryKey: ['ordinals-collections'],
    queryFn: async () => {
      const res = await fetch('/api/ordinals-collections/')
      if (!res.ok) throw new Error('Erro ao buscar coleções de Ordinals')
      return res.json()
    },
    refetchInterval: 600000, // 10 minutos
    staleTime: 300000, // 5 minutos
  })
}
