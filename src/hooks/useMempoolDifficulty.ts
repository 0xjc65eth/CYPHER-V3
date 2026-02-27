import { useQuery } from '@tanstack/react-query'

export function useMempoolDifficulty() {
  return useQuery({
    queryKey: ['mempool-difficulty'],
    queryFn: async () => {
      // /difficulty-adjustment returns {progressPercent, difficultyChange, ...} — no actual difficulty number
      // /mining/hashrate/1d returns {currentDifficulty} — the actual difficulty value
      const res = await fetch('https://mempool.space/api/v1/mining/hashrate/1d')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const difficulty = data?.currentDifficulty
      // Return null if difficulty is invalid, not 0 (0 will cause NaN when divided)
      return typeof difficulty === 'number' && difficulty > 0 ? difficulty : null
    },
    refetchInterval: 60000,
  })
} 