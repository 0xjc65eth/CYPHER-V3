import { useQuery } from '@tanstack/react-query'

export function useMempoolHashrate() {
  return useQuery({
    queryKey: ['mempool-hashrate'],
    queryFn: async () => {
      const res = await fetch('https://mempool.space/api/v1/mining/hashrate/3d')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      // API returns { hashrates: [{timestamp, avgHashrate}], currentHashrate, currentDifficulty }
      // Page expects an array of {avgHashrate}
      const hashrates = Array.isArray(data.hashrates) ? data.hashrates : []
      // Validate that we have valid avgHashrate values
      return hashrates.filter((h: any) => typeof h?.avgHashrate === 'number' && h.avgHashrate > 0)
    },
    staleTime: 300000, // 5min - hashrate changes slowly
    refetchInterval: 60000,
  })
} 