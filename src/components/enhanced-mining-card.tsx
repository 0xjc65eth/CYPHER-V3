'use client'

import { useState, useEffect } from 'react'
import { Card, Title, Text, ProgressBar, DonutChart, BarChart, LineChart, Grid, Col, Flex } from '@tremor/react'
import { RiDatabase2Line, RiTimeLine, RiShieldCheckLine, RiAlertLine, RiInformationLine, RiExternalLinkLine } from 'react-icons/ri'

// Interface para dados de pools de mineração
interface MiningPool {
  name: string;
  hashrate: number;
  share: number;
  blocks24h: number;
  blocks7d: number;
  isCentralized: boolean;
}

// Interface para dados de mineração
interface MiningData {
  totalHashrate: number;
  difficulty: number;
  nextDifficultyChange: string;
  nextDifficultyChangePercent: number;
  blockHeight: number;
  blockTime: number;
  pools: MiningPool[];
  centralizationRisk: number;
  soloMinersNeeded: number;
  lastUpdated: string;
}

export function EnhancedMiningCard() {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<MiningData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [timeAgo, setTimeAgo] = useState<string>('just now')

  // Função para gerar dados de fallback quando a API não estiver disponível
  const generateFallbackData = (): MiningData => {

    // Pools simulados
    const mockPools: MiningPool[] = [
      { name: 'Foundry USA', hashrate: 90, share: 28.5, blocks24h: 41, blocks7d: 287, isCentralized: true },
      { name: 'AntPool', hashrate: 35, share: 15.2, blocks24h: 22, blocks7d: 154, isCentralized: true },
      { name: 'F2Pool', hashrate: 30, share: 12.8, blocks24h: 18, blocks7d: 126, isCentralized: true },
      { name: 'Binance Pool', hashrate: 25, share: 10.5, blocks24h: 15, blocks7d: 105, isCentralized: true },
      { name: 'ViaBTC', hashrate: 20, share: 8.3, blocks24h: 12, blocks7d: 84, isCentralized: true },
      { name: 'Braiins Pool', hashrate: 15, share: 6.2, blocks24h: 9, blocks7d: 63, isCentralized: false },
      { name: 'SBI Crypto', hashrate: 12, share: 4.9, blocks24h: 7, blocks7d: 49, isCentralized: false },
      { name: 'Poolin', hashrate: 10, share: 4.1, blocks24h: 6, blocks7d: 42, isCentralized: false },
      { name: 'MARA Pool', hashrate: 8, share: 3.3, blocks24h: 5, blocks7d: 33, isCentralized: false },
      { name: 'Unknown', hashrate: 15, share: 6.2, blocks24h: 9, blocks7d: 63, isCentralized: false }
    ];

    // Calcular risco de centralização (% dos 4 maiores pools)
    const top4Share = mockPools.slice(0, 4).reduce((sum, pool) => sum + pool.share, 0);

    // Calcular quantos mineradores solo são necessários para descentralizar
    const totalHashrateEH = 320; // Estimativa atual do hashrate total da rede
    const soloHashratePH = 100; // 100 PH/s por minerador solo
    const soloHashrateEH = soloHashratePH / 1000; // Converter para EH/s
    const targetNetworkShare = 0.10; // 10% da rede
    const targetHashrate = totalHashrateEH * targetNetworkShare;
    const soloMinersNeeded = Math.ceil(targetHashrate / soloHashrateEH);

    // Data estimada do próximo ajuste de dificuldade (aproximadamente 2 semanas a partir de agora)
    const nextDiffDate = new Date();
    nextDiffDate.setDate(nextDiffDate.getDate() + 14);

    return {
      totalHashrate: totalHashrateEH,
      difficulty: 73.35e12,
      nextDifficultyChange: nextDiffDate.toISOString(),
      nextDifficultyChangePercent: 3.25,
      blockHeight: 842500,
      blockTime: 9.8,
      pools: mockPools,
      centralizationRisk: top4Share,
      soloMinersNeeded,
      lastUpdated: new Date().toISOString()
    };
  };

  // Função para buscar dados da API do Mempool
  const fetchMiningData = async () => {
    try {
      setIsLoading(true)

      // Try to fetch data from Mempool API directly or through a proxy
      let hashrateData, difficultyData, poolsData, diffAdjData, blockHeight;

      try {
        // First, try to use the API directly
        const hashrateRes = await fetch('https://mempool.space/api/v1/mining/hashrate/3d', {
          mode: 'cors',
          headers: { 'Accept': 'application/json' }
        })

        if (!hashrateRes.ok) throw new Error(`Error fetching hashrate: ${hashrateRes.status}`)
        hashrateData = await hashrateRes.json()

        const difficultyRes = await fetch('https://mempool.space/api/v1/mining/difficulty', {
          mode: 'cors',
          headers: { 'Accept': 'application/json' }
        })

        if (!difficultyRes.ok) throw new Error(`Error fetching difficulty: ${difficultyRes.status}`)
        difficultyData = await difficultyRes.json()

        const poolsRes = await fetch('https://mempool.space/api/v1/mining/pools/1w', {
          mode: 'cors',
          headers: { 'Accept': 'application/json' }
        })

        if (!poolsRes.ok) throw new Error(`Error fetching pools: ${poolsRes.status}`)
        poolsData = await poolsRes.json()

        const diffAdjRes = await fetch('https://mempool.space/api/v1/difficulty-adjustment', {
          mode: 'cors',
          headers: { 'Accept': 'application/json' }
        })

        if (!diffAdjRes.ok) throw new Error(`Error fetching difficulty adjustment: ${diffAdjRes.status}`)
        diffAdjData = await diffAdjRes.json()

        const blocksRes = await fetch('https://mempool.space/api/v1/blocks/tip/height', {
          mode: 'cors',
          headers: { 'Accept': 'application/json' }
        })

        if (!blocksRes.ok) throw new Error(`Error fetching block height: ${blocksRes.status}`)
        blockHeight = await blocksRes.json()

      } catch (apiError) {
        console.error('Error accessing Mempool API directly:', apiError)

        // If it fails, use fallback data
        const fallbackData = generateFallbackData()
        setData(fallbackData)
        setLastUpdated(new Date())
        setError(null)
        setIsLoading(false)
        return
      }

      // If we got here, we successfully obtained data from the API

      // Process pool data
      const pools: MiningPool[] = Object.entries(poolsData.pools || {})
        .map(([name, data]: [string, any]) => {
          const isCentralized = ['Foundry USA', 'AntPool', 'Binance Pool', 'F2Pool', 'ViaBTC'].includes(name)
          return {
            name,
            hashrate: data.estimatedHashrate || 0,
            share: data.share || 0,
            blocks24h: data.blocks24h || 0,
            blocks7d: data.blocks7d || 0,
            isCentralized
          }
        })
        .sort((a, b) => b.share - a.share)
        .slice(0, 10) // Top 10 pools

      // Calculate centralization risk (% of the 4 largest pools)
      const top4Share = pools.slice(0, 4).reduce((sum, pool) => sum + pool.share, 0)
      const centralizationRisk = top4Share

      // Calculate how many solo miners are needed for decentralization
      // Assuming each solo miner has an average of 100 PH/s
      const soloHashratePH = 100 // 100 PH/s per solo miner
      const soloHashrateEH = soloHashratePH / 1000 // Convert to EH/s
      const totalHashrateEH = hashrateData.currentHashrate || 320 // Fallback value if no data

      // How many solo miners would be needed to have 10% of the network
      const targetNetworkShare = 0.10 // 10% of the network
      const targetHashrate = totalHashrateEH * targetNetworkShare
      const soloMinersNeeded = Math.ceil(targetHashrate / soloHashrateEH)

      // Build data object
      const miningData: MiningData = {
        totalHashrate: totalHashrateEH,
        difficulty: difficultyData.difficulty || 73.35e12,
        nextDifficultyChange: diffAdjData?.estimatedRetargetDate
          ? new Date(diffAdjData.estimatedRetargetDate * 1000).toISOString()
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        nextDifficultyChangePercent: diffAdjData?.difficultyChange || 3.25,
        blockHeight: blockHeight || 842500,
        blockTime: (diffAdjData?.timeAvg || 588) / 60, // Convert from seconds to minutes
        pools,
        centralizationRisk,
        soloMinersNeeded,
        lastUpdated: new Date().toISOString()
      }

      setData(miningData)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      console.error('Error fetching mining data:', err)

      // Use fallback data in case of error
      const fallbackData = generateFallbackData()
      setData(fallbackData)
      setLastUpdated(new Date())
      setError('Using simulated data due to API connection issues')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch initial data
  useEffect(() => {
    // Set a timeout to use fallback data if the API takes too long
    const timeoutId = setTimeout(() => {
      if (isLoading && !data) {
        const fallbackData = generateFallbackData()
        setData(fallbackData)
        setLastUpdated(new Date())
        setError('Using simulated data due to API timeout')
        setIsLoading(false)
      }
    }, 5000) // 5 second timeout

    fetchMiningData()

    // Set up update every 5 minutes
    const intervalId = setInterval(fetchMiningData, 5 * 60 * 1000)

    return () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
    }
  }, [])

  // Update time since last update
  useEffect(() => {
    if (!lastUpdated) return

    const updateTimeAgo = () => {
      const now = new Date()
      const diff = now.getTime() - lastUpdated.getTime()

      if (diff < 60000) {
        setTimeAgo('just now')
      } else if (diff < 3600000) {
        setTimeAgo(`${Math.floor(diff / 60000)} min ago`)
      } else {
        setTimeAgo(`${Math.floor(diff / 3600000)} hours ago`)
      }
    }

    updateTimeAgo()
    const intervalId = setInterval(updateTimeAgo, 60000)

    return () => clearInterval(intervalId)
  }, [lastUpdated])

  // Avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Show loading state
  if (isLoading && !data) {
    return (
      <Card className="bg-gradient-to-br from-[#1D2D3D] to-[#2D3D4D] border-none shadow-xl p-6">
        <Title className="text-white text-xl mb-2">Bitcoin Mining Analytics</Title>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // Show error state
  if (error && !data) {
    return (
      <Card className="bg-gradient-to-br from-[#1D2D3D] to-[#2D3D4D] border-none shadow-xl p-6">
        <Title className="text-white text-xl mb-2">Bitcoin Mining Analytics</Title>
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg mb-4">
          <Text className="text-rose-400">{error}</Text>
          <Text className="text-gray-400 text-sm mt-2">
            Could not connect to the mempool.space API. This may be due to CORS issues,
            API rate limits, or network problems.
          </Text>
        </div>
        <button
          onClick={() => {
            setIsLoading(true);
            setError(null);
            fetchMiningData();
          }}
          className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-all"
        >
          Try again
        </button>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border-none shadow-2xl p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-xl bg-[#F7931A]/20 flex items-center justify-center mr-4 border border-[#F7931A]/30 shadow-lg">
            <RiDatabase2Line className="w-6 h-6 text-[#F7931A]" />
          </div>
          <div>
            <Title className="text-white text-2xl font-bold">Bitcoin Mining Analytics</Title>
            <Text className="text-sm text-gray-400">
              {lastUpdated ? `Last updated: ${timeAgo}` : 'Real-time data'}
            </Text>
          </div>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-[#F7931A] mr-2 animate-ping"></div>
          <span className="px-3 py-1.5 rounded-lg bg-[#F7931A]/20 text-xs font-bold text-[#F7931A] border border-[#F7931A]/30 shadow-md">
            {error ? 'Simulated Data' : 'mempool.space API'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl shadow-md">
          <Text className="text-sm text-amber-300">
            <span className="font-bold">Note:</span> {error}
          </Text>
          <div className="flex justify-end mt-3">
            <button
              onClick={() => {
                setIsLoading(true);
                setError(null);
                fetchMiningData();
              }}
              className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-all text-sm font-medium shadow-md"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <Grid numItems={1} numItemsSm={2} className="gap-6 mb-6">
        <Col>
          <div className="bg-gradient-to-br from-[#1A1F2E] to-[#2A3042] rounded-xl p-5 border border-[#F7931A]/20 shadow-lg">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#F7931A]/20 flex items-center justify-center mr-3 border border-[#F7931A]/30">
                <RiDatabase2Line className="w-4 h-4 text-[#F7931A]" />
              </div>
              <Text className="text-[#F7931A] font-bold">Network Hashrate</Text>
            </div>
            <div className="flex items-center justify-between mb-2">
              <Text className="text-3xl font-bold text-white">{data?.totalHashrate.toFixed(2)} EH/s</Text>
              <div className="px-3 py-1.5 rounded-lg bg-[#F7931A]/20 text-xs font-bold text-[#F7931A] border border-[#F7931A]/30 shadow-md">
                {data?.blockHeight.toLocaleString()} Blocks
              </div>
            </div>
            <div className="p-2 bg-gray-800/40 rounded-lg mt-3 border border-gray-700/30">
              <div className="flex justify-between items-center">
                <Text className="text-gray-400 text-sm">Average block time:</Text>
                <Text className="text-white font-medium">{data?.blockTime.toFixed(2)} minutes</Text>
              </div>
            </div>
            <div className="p-2 bg-gray-800/40 rounded-lg mt-2 border border-gray-700/30">
              <div className="flex justify-between items-center">
                <Text className="text-gray-400 text-sm">Blocks in last 24h:</Text>
                <Text className="text-white font-medium">{Math.round(1440 / (data?.blockTime ?? 10))}</Text>
              </div>
            </div>
          </div>
        </Col>
        <Col>
          <div className="bg-gradient-to-br from-[#1A1F2E] to-[#2A3042] rounded-xl p-5 border border-blue-500/20 shadow-lg">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center mr-3 border border-blue-500/30">
                <RiTimeLine className="w-4 h-4 text-blue-400" />
              </div>
              <Text className="text-blue-400 font-bold">Next Difficulty Adjustment</Text>
            </div>
            <div className="flex items-center justify-between mb-2">
              <Text className="text-3xl font-bold text-white">
                {data?.nextDifficultyChangePercent.toFixed(2)}%
              </Text>
              <div className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-xs font-bold text-blue-400 border border-blue-500/30 shadow-md">
                {new Date(data?.nextDifficultyChange || '').toLocaleDateString()}
              </div>
            </div>
            <ProgressBar value={Math.min(100, (data?.nextDifficultyChangePercent || 0) + 10)} color="blue" className="mt-3 h-2 rounded-full" />
            <div className="p-2 bg-gray-800/40 rounded-lg mt-3 border border-gray-700/30">
              <div className="flex justify-between items-center">
                <Text className="text-gray-400 text-sm">Current difficulty:</Text>
                <Text className="text-white font-medium">{((data?.difficulty ?? 0) / 1e12).toFixed(2)} T</Text>
              </div>
            </div>
            <div className="p-2 bg-gray-800/40 rounded-lg mt-2 border border-gray-700/30">
              <div className="flex justify-between items-center">
                <Text className="text-gray-400 text-sm">Blocks until adjustment:</Text>
                <Text className="text-white font-medium">~{Math.round((2016 - ((data?.blockHeight ?? 0) % 2016)) || 0)}</Text>
              </div>
            </div>
          </div>
        </Col>
      </Grid>

      <div className="bg-gradient-to-br from-[#1A1F2E] to-[#2A3042] rounded-xl p-5 border border-emerald-500/20 mb-6 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center mr-3 border border-emerald-500/30">
              <RiShieldCheckLine className="w-4 h-4 text-emerald-400" />
            </div>
            <Text className="text-emerald-400 font-bold">Mining Pool Distribution</Text>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-400 border border-emerald-500/30 shadow-md">
            Top 10 Pools
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30 shadow-inner">
            <DonutChart
              className="h-64"
              data={data?.pools.map(pool => ({ name: pool.name, value: pool.share })) || []}
              category="value"
              index="name"
              colors={["emerald", "violet", "amber", "rose", "cyan", "blue", "indigo", "pink", "green", "orange"]}
              showAnimation
              showTooltip
              valueFormatter={(value) => `${value.toFixed(2)}%`}
            />
          </div>
          <div className="space-y-2">
            {data?.pools.slice(0, 5).map((pool, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/40 border border-gray-700/30 shadow-md hover:bg-gray-800/60 transition-all">
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full ${pool.isCentralized ? 'bg-rose-500' : 'bg-emerald-500'} mr-3`}></div>
                  <div>
                    <Text className="text-white font-medium">{pool.name}</Text>
                    <Text className="text-xs text-gray-400">Hashrate: ~{pool.hashrate.toFixed(1)} EH/s</Text>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <Text className="text-lg font-bold text-white">{pool.share.toFixed(2)}%</Text>
                  <Text className="text-xs text-gray-400">{pool.blocks24h} blocos/24h</Text>
                </div>
              </div>
            ))}
            <div className="mt-3 p-3 rounded-lg bg-gray-800/40 border border-amber-500/30 shadow-md">
              <div className="flex justify-between items-center">
                <Text className="text-amber-400 font-medium">Outros pools combinados:</Text>
                <Text className="text-lg font-bold text-white">{(100 - (data?.pools.slice(0, 5).reduce((sum: number, pool: MiningPool) => sum + pool.share, 0) ?? 0)).toFixed(2)}%</Text>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#1A1F2E] to-[#2A3042] rounded-xl p-5 border border-rose-500/20 mb-6 shadow-lg">
        <div className="flex items-center mb-5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center mr-3 border border-rose-500/30">
            <RiAlertLine className="w-4 h-4 text-rose-400" />
          </div>
          <Text className="text-rose-400 font-bold">Risco de Centralização</Text>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30 shadow-inner">
            <Text className="text-white font-medium mb-3">Concentração dos 4 maiores pools</Text>
            <div className="flex items-center justify-between mb-3">
              <Text className="text-3xl font-bold text-white">{data?.centralizationRisk.toFixed(2)}%</Text>
              <div className={`px-3 py-1.5 rounded-lg text-sm font-bold shadow-md ${
                (data?.centralizationRisk || 0) > 70
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : (data?.centralizationRisk || 0) > 50
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {(data?.centralizationRisk || 0) > 70
                  ? 'Alto Risco'
                  : (data?.centralizationRisk || 0) > 50
                    ? 'Risco Moderado'
                    : 'Baixo Risco'}
              </div>
            </div>
            <ProgressBar
              value={data?.centralizationRisk || 0}
              color={(data?.centralizationRisk || 0) > 70
                ? 'rose'
                : (data?.centralizationRisk || 0) > 50
                  ? 'amber'
                  : 'emerald'}
              className="mt-3 h-2 rounded-full"
            />
            <div className="mt-4 p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
              <Text className="text-gray-300 text-sm">
                Um valor acima de 51% representa risco de ataque de 51% à rede Bitcoin, permitindo que um grupo controle o consenso.
              </Text>
            </div>
            <div className="mt-3 p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
              <Text className="text-rose-300 text-sm font-medium">
                Atualmente, os 4 maiores pools controlam {data?.centralizationRisk.toFixed(2)}% do hashrate total da rede.
              </Text>
            </div>
          </div>
          <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30 shadow-inner">
            <Text className="text-white font-medium mb-3">Mineradores solo necessários para descentralizar</Text>
            <div className="flex items-center justify-between mb-3">
              <Text className="text-3xl font-bold text-white">{data?.soloMinersNeeded.toLocaleString()}</Text>
              <div className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-sm font-bold text-blue-400 border border-blue-500/30 shadow-md">
                Para atingir 10% da rede
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
              <Text className="text-gray-300 text-sm">
                Estimativa baseada em mineradores com 100 PH/s cada (aproximadamente 3-4 ASICs S19 XP).
              </Text>
            </div>
            <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Text className="text-blue-300 text-sm font-medium">
                Quanto mais mineradores solo, mais descentralizada e segura é a rede Bitcoin. Cada minerador individual contribui para a resistência a censura.
              </Text>
            </div>
            <div className="mt-3 flex items-center justify-between p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
              <Text className="text-gray-400 text-sm">Custo estimado por minerador:</Text>
              <Text className="text-white font-medium">~$20,000 USD</Text>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#F7931A]/10 to-[#F9A826]/10 rounded-lg p-6 border border-[#F7931A]/30 mb-6 shadow-lg">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 rounded-full bg-[#F7931A]/20 flex items-center justify-center mr-3 border border-[#F7931A]/30">
            <RiInformationLine className="w-5 h-5 text-[#F7931A]" />
          </div>
          <Text className="text-[#F7931A] font-bold text-lg">Mineração com OMB Pool</Text>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/40 p-5 rounded-xl border border-[#F7931A]/20 shadow-inner">
            <Text className="text-white font-bold mb-4 text-center">Configurações de Conexão</Text>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-2 bg-gray-800/60 rounded-lg border border-gray-700/50">
                <Text className="text-gray-300">Stratum Host:</Text>
                <Text className="text-[#F7931A] font-medium bg-gray-900/50 px-3 py-1 rounded-md">ombpool.com</Text>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-800/60 rounded-lg border border-gray-700/50">
                <Text className="text-gray-300">Stratum Port:</Text>
                <Text className="text-[#F7931A] font-medium bg-gray-900/50 px-3 py-1 rounded-md">2018</Text>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-800/60 rounded-lg border border-gray-700/50">
                <Text className="text-gray-300">Stratum User:</Text>
                <Text className="text-[#F7931A] font-medium bg-gray-900/50 px-3 py-1 rounded-md">SEU_ENDEREÇO_BTC</Text>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-800/60 rounded-lg border border-gray-700/50">
                <Text className="text-gray-300">Stratum Password:</Text>
                <Text className="text-[#F7931A] font-medium bg-gray-900/50 px-3 py-1 rounded-md">X</Text>
              </div>
            </div>
            <div className="mt-4">
              <a
                href="https://ombpool.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center px-4 py-3 bg-[#F7931A]/20 text-[#F7931A] rounded-lg border border-[#F7931A]/30 hover:bg-[#F7931A]/30 transition-all text-sm w-full font-bold"
              >
                Visitar OMB Pool <RiExternalLinkLine className="ml-2 w-5 h-5" />
              </a>
            </div>
          </div>
          <div className="bg-gray-800/40 p-5 rounded-xl border border-[#F7931A]/20 shadow-inner">
            <Text className="text-white font-bold mb-4">Por que minerar com uma pool menor?</Text>
            <Text className="text-gray-300 text-sm leading-relaxed">
              Ao minerar com pools menores como a OMB Pool, você ajuda a descentralizar a rede Bitcoin, tornando-a mais segura e resistente a ataques de 51%.
            </Text>
            <Text className="text-gray-300 text-sm mt-3 leading-relaxed">
              No campo "Stratum User", você deve colocar seu próprio endereço Bitcoin para receber os pagamentos diretamente na sua carteira.
            </Text>
            <div className="mt-4 p-3 bg-[#F7931A]/10 rounded-lg border border-[#F7931A]/20">
              <Text className="text-[#F7931A] text-sm font-medium">
                Cada minerador solo ou pool menor contribui para a descentralização da rede Bitcoin. Juntos, podemos tornar o Bitcoin mais forte e resistente!
              </Text>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-800/60 rounded-lg border border-gray-700/50 mt-4">
              <Text className="text-gray-300 text-sm">Payments:</Text>
              <Text className="text-emerald-400 font-medium">Every 24 hours</Text>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#2A2A3A] to-[#3A3A4A] rounded-lg p-4 border border-gray-700/30">
        <div className="flex items-center mb-4">
          <RiInformationLine className="w-4 h-4 text-violet-400 mr-2" />
          <Text className="text-violet-300 font-medium">Maiores Mineradoras Hoje</Text>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="space-y-2">
              <div className="p-2 rounded-lg bg-gray-800/30 border border-violet-500/20">
                <Text className="text-white font-medium">Foundry USA</Text>
                <Text className="text-gray-400 text-sm">Maior pool de mineração dos EUA, operado pela Digital Currency Group.</Text>
                <div className="flex justify-between mt-1">
                  <Text className="text-xs text-gray-500">Hashrate estimado:</Text>
                  <Text className="text-xs text-violet-300">~90 EH/s</Text>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-gray-800/30 border border-violet-500/20">
                <Text className="text-white font-medium">AntPool</Text>
                <Text className="text-gray-400 text-sm">Operado pela Bitmain, um dos maiores fabricantes de ASICs.</Text>
                <div className="flex justify-between mt-1">
                  <Text className="text-xs text-gray-500">Hashrate estimado:</Text>
                  <Text className="text-xs text-violet-300">~35 EH/s</Text>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-gray-800/30 border border-violet-500/20">
                <Text className="text-white font-medium">F2Pool</Text>
                <Text className="text-gray-400 text-sm">Uma das pools mais antigas, fundada em 2013 na China.</Text>
                <div className="flex justify-between mt-1">
                  <Text className="text-xs text-gray-500">Hashrate estimado:</Text>
                  <Text className="text-xs text-violet-300">~30 EH/s</Text>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="p-4 rounded-lg bg-gray-800/30 border border-violet-500/20 h-full">
              <Text className="text-white font-medium mb-2">Impacto na Descentralização</Text>
              <Text className="text-gray-300 text-sm">
                As 4 maiores mineradoras controlam aproximadamente {data?.centralizationRisk.toFixed(2)}% do hashrate total da rede Bitcoin.
              </Text>
              <Text className="text-gray-300 text-sm mt-2">
                Para uma rede verdadeiramente descentralizada, nenhuma entidade deveria controlar mais de 10% do hashrate total.
              </Text>
              <div className="mt-3 p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
                <Text className="text-violet-300 text-xs">
                  A centralização da mineração representa um dos maiores riscos para o Bitcoin. Apoiar pools menores e mineração solo é crucial para a saúde da rede.
                </Text>
              </div>
              <div className="mt-3">
                <a
                  href="https://mempool.space/mining"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center px-3 py-2 bg-violet-500/20 text-violet-300 rounded-lg border border-violet-500/30 hover:bg-violet-500/30 transition-all text-sm w-full"
                >
                  Ver estatísticas em tempo real <RiExternalLinkLine className="ml-1" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg">
        <Text className="text-xs text-gray-400">
          Dados fornecidos pela API do mempool.space • Última atualização: {lastUpdated?.toLocaleString() || 'Carregando...'}
        </Text>
      </div>
    </Card>
  )
}
