import { useQuery } from '@tanstack/react-query'

export function useMempoolPools() {
  return useQuery({
    queryKey: ['mempool-pools'],
    queryFn: async () => {
      const res = await fetch('https://mempool.space/api/v1/mining/pools/1w')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      // API returns { pools: [{name, slug, blockCount, ...}], blockCount }
      // Page expects array with .share (percentage), .name, .blockCount
      const totalBlocks = typeof data?.blockCount === 'number' && data.blockCount > 0 ? data.blockCount : 1
      return (Array.isArray(data?.pools) ? data.pools : []).map((p: any) => {
        const blockCount = typeof p?.blockCount === 'number' ? p.blockCount : 0
        return {
          name: p?.name || 'Unknown',
          slug: p?.slug || '',
          blockCount: blockCount,
          share: blockCount > 0 ? (blockCount / totalBlocks) * 100 : 0,
        }
      })
    },
    refetchInterval: 60000,
  })
} 