import { useQuery } from '@tanstack/react-query'

export function useTopRunes() {
  return useQuery({
    queryKey: ['top-runes'],
    queryFn: async () => {
      const res = await fetch('/api/runes-top/')
      if (!res.ok) {
        return []
      }
      const data = await res.json()
      // Handle both array and {error} responses
      if (Array.isArray(data)) return data
      if (data.error) {
        return []
      }
      return []
    },
    refetchInterval: 60000,
  })
}