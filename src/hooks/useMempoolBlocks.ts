import { useQuery } from '@tanstack/react-query'

export function useMempoolBlocks() {
  return useQuery({
    queryKey: ['mempool-blocks'],
    queryFn: async () => {
      const res = await fetch('https://mempool.space/api/v1/blocks')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blocks = await res.json()
      // Normalize: page expects block.reward, block.poolName at top level
      // API puts them under block.extras
      return (Array.isArray(blocks) ? blocks : []).map((b: any) => {
        const reward = typeof b?.extras?.reward === 'number' ? b.extras.reward :
                       typeof b?.reward === 'number' ? b.reward : 0
        return {
          ...b,
          reward: reward > 0 ? reward : 0,
          poolName: b?.extras?.pool?.name ?? b?.poolName ?? 'Unknown',
          height: typeof b?.height === 'number' ? b.height : undefined,
          timestamp: typeof b?.timestamp === 'number' ? b.timestamp : undefined,
        }
      })
    },
    refetchInterval: 60000,
  })
} 