'use client'

import { useState, useEffect } from 'react'
import { Card, Title, Text, Tab, TabGroup, TabList, TabPanel, TabPanels, AreaChart, BarChart, Flex, Metric, Badge, Color } from '@tremor/react'
import { RiCoinLine, RiRefreshLine, RiArrowUpSLine, RiArrowDownSLine, RiExternalLinkLine, RiFireLine, RiPriceTag3Line } from 'react-icons/ri'
import Link from 'next/link'

interface MarketItem {
  name: string
  symbol: string
  price: number
  change24h: number
  volume24h: number
  marketCap?: number
  floorPrice?: number
  holders?: number
  inscriptionCount?: number
  supply?: number
  link: string
}

export function OrdinalsRunesMarketCard() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Avoid hydration issues
  useEffect(() => {
    setMounted(true)
    setLastUpdated(new Date())
  }, [])

  // Simulated market data
  const ordinalsCollections: MarketItem[] = [
    {
      name: 'Bitcoin Puppets',
      symbol: 'BTCP',
      price: 0.185,
      change24h: 12.5,
      volume24h: 125000,
      floorPrice: 0.175,
      holders: 2850,
      inscriptionCount: 10000,
      link: 'https://gamma.io/ordinals/collections/bitcoin-puppets'
    },
    {
      name: 'Ordinal Punks',
      symbol: 'PUNKS',
      price: 2.45,
      change24h: -3.2,
      volume24h: 89500,
      floorPrice: 2.35,
      holders: 1250,
      inscriptionCount: 100,
      link: 'https://gamma.io/ordinals/collections/ordinal-punks'
    },
    {
      name: 'Bitcoin Frogs',
      symbol: 'FROGS',
      price: 0.095,
      change24h: 5.8,
      volume24h: 78500,
      floorPrice: 0.092,
      holders: 3450,
      inscriptionCount: 10000,
      link: 'https://gamma.io/ordinals/collections/bitcoin-frogs'
    },
    {
      name: 'Taproot Wizards',
      symbol: 'WIZARDS',
      price: 1.85,
      change24h: 8.2,
      volume24h: 156000,
      floorPrice: 1.78,
      holders: 1850,
      inscriptionCount: 2121,
      link: 'https://gamma.io/ordinals/collections/taproot-wizards'
    },
    {
      name: 'Ordinal Maxi Biz',
      symbol: 'MAXI',
      price: 0.325,
      change24h: -1.5,
      volume24h: 45000,
      floorPrice: 0.315,
      holders: 2250,
      inscriptionCount: 5000,
      link: 'https://gamma.io/ordinals/collections/ordinal-maxi-biz'
    },
  ]

  const runesTokens: MarketItem[] = [
    {
      name: 'PEPE',
      symbol: 'PEPE',
      price: 0.00000125,
      change24h: 25.8,
      volume24h: 345000,
      marketCap: 1250000,
      supply: 1000000000000,
      link: 'https://runealpha.xyz/rune/PEPE'
    },
    {
      name: 'MEME',
      symbol: 'MEME',
      price: 0.00000085,
      change24h: 15.2,
      volume24h: 285000,
      marketCap: 850000,
      supply: 1000000000000,
      link: 'https://runealpha.xyz/rune/MEME'
    },
    {
      name: 'ORDI',
      symbol: 'ORDI',
      price: 0.00000215,
      change24h: -5.3,
      volume24h: 425000,
      marketCap: 2150000,
      supply: 1000000000000,
      link: 'https://runealpha.xyz/rune/ORDI'
    },
    {
      name: 'SATS',
      symbol: 'SATS',
      price: 0.00000045,
      change24h: 8.7,
      volume24h: 185000,
      marketCap: 450000,
      supply: 1000000000000,
      link: 'https://runealpha.xyz/rune/SATS'
    },
    {
      name: 'WIZARD',
      symbol: 'WIZARD',
      price: 0.00000175,
      change24h: 12.4,
      volume24h: 265000,
      marketCap: 1750000,
      supply: 1000000000000,
      link: 'https://runealpha.xyz/rune/WIZARD'
    },
  ]

  // Historical volume data
  const ordinalsVolumeData = [
    { date: '2023-10-01', volume: 125000 },
    { date: '2023-11-01', volume: 185000 },
    { date: '2023-12-01', volume: 245000 },
    { date: '2024-01-01', volume: 325000 },
    { date: '2024-02-01', volume: 425000 },
    { date: '2024-03-01', volume: 485000 },
    { date: '2024-04-01', volume: 525000 },
  ]

  const runesVolumeData = [
    { date: '2023-10-01', volume: 85000 },
    { date: '2023-11-01', volume: 145000 },
    { date: '2023-12-01', volume: 225000 },
    { date: '2024-01-01', volume: 385000 },
    { date: '2024-02-01', volume: 625000 },
    { date: '2024-03-01', volume: 925000 },
    { date: '2024-04-01', volume: 1250000 },
  ]

  // Refresh data
  const refreshData = () => {
    setIsLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      setLastUpdated(new Date())
    }, 1000)
  }

  // Format large numbers
  const formatNumber = (num: number, decimals: number = 2) => {
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(decimals)}B`;
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(decimals)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(decimals)}K`;
    }
    return num.toFixed(decimals);
  };

  // Format price based on value
  const formatPrice = (price: number) => {
    if (price < 0.00001) {
      return price.toFixed(8);
    }
    if (price < 0.01) {
      return price.toFixed(6);
    }
    if (price < 1) {
      return price.toFixed(4);
    }
    if (price < 10) {
      return price.toFixed(3);
    }
    return price.toFixed(2);
  };

  // Return null during SSR to avoid hydration issues
  if (!mounted) return null

  return (
    <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3 border border-blue-500/30">
            <RiCoinLine className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <Title className="text-white text-xl">Ordinals & Runes Market</Title>
            <Text className="text-xs text-gray-400">
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
            </Text>
          </div>
        </div>
        <button 
          onClick={refreshData}
          className="p-2 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors border border-blue-500/30"
          disabled={isLoading}
        >
          <RiRefreshLine className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <TabGroup className="mb-6" onIndexChange={setActiveTab}>
        <TabList variant="solid" className="bg-blue-500/10">
          <Tab className="text-sm data-[selected]:bg-blue-500/30">Ordinals Collections</Tab>
          <Tab className="text-sm data-[selected]:bg-blue-500/30">Runes Tokens</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            {/* Ordinals Collections */}
            <div className="mt-4">
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20 mb-6">
                <Text className="text-white font-medium mb-3">Ordinals Trading Volume (BTC)</Text>
                <AreaChart
                  data={ordinalsVolumeData}
                  index="date"
                  categories={["volume"]}
                  colors={["purple"]}
                  valueFormatter={(value) => `${formatNumber(value)} BTC`}
                  showLegend={false}
                  className="h-64"
                />
              </div>

              <div className="space-y-4">
                {ordinalsCollections.map((collection, index) => (
                  <div key={index} className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center">
                          <Text className="text-white font-medium">{collection.name}</Text>
                          <Badge className="ml-2" color="purple" size="xs">{collection.symbol}</Badge>
                        </div>
                        <div className="flex items-center mt-1">
                          <Text className="text-gray-400 text-xs mr-2">Floor: {collection.floorPrice} BTC</Text>
                          <Badge 
                            color={collection.change24h >= 0 ? 'emerald' : 'rose'}
                            size="xs"
                          >
                            <div className="flex items-center">
                              {collection.change24h >= 0 ? (
                                <RiArrowUpSLine className="mr-0.5" />
                              ) : (
                                <RiArrowDownSLine className="mr-0.5" />
                              )}
                              {Math.abs(collection.change24h).toFixed(1)}%
                            </div>
                          </Badge>
                        </div>
                      </div>
                      <Link 
                        href={collection.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors flex items-center text-xs"
                      >
                        View <RiExternalLinkLine className="ml-1" />
                      </Link>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <Text className="text-gray-400 text-xs">24h Volume</Text>
                        <Text className="text-white">{formatNumber(collection.volume24h)} BTC</Text>
                      </div>
                      <div>
                        <Text className="text-gray-400 text-xs">Holders</Text>
                        <Text className="text-white">{formatNumber(collection.holders || 0, 0)}</Text>
                      </div>
                      <div>
                        <Text className="text-gray-400 text-xs">Supply</Text>
                        <Text className="text-white">{formatNumber(collection.inscriptionCount || 0, 0)}</Text>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabPanel>
          <TabPanel>
            {/* Runes Tokens */}
            <div className="mt-4">
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20 mb-6">
                <Text className="text-white font-medium mb-3">Runes Trading Volume (BTC)</Text>
                <AreaChart
                  data={runesVolumeData}
                  index="date"
                  categories={["volume"]}
                  colors={["amber"]}
                  valueFormatter={(value) => `${formatNumber(value)} BTC`}
                  showLegend={false}
                  className="h-64"
                />
              </div>

              <div className="space-y-4">
                {runesTokens.map((token, index) => (
                  <div key={index} className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center">
                          <Text className="text-white font-medium">{token.name}</Text>
                          <Badge className="ml-2" color="amber" size="xs">{token.symbol}</Badge>
                          {token.change24h > 15 && (
                            <Badge className="ml-2" color="rose" size="xs">
                              <div className="flex items-center">
                                <RiFireLine className="mr-0.5" />
                                Hot
                              </div>
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center mt-1">
                          <Text className="text-gray-400 text-xs mr-2">{formatPrice(token.price)} BTC</Text>
                          <Badge 
                            color={token.change24h >= 0 ? 'emerald' : 'rose'}
                            size="xs"
                          >
                            <div className="flex items-center">
                              {token.change24h >= 0 ? (
                                <RiArrowUpSLine className="mr-0.5" />
                              ) : (
                                <RiArrowDownSLine className="mr-0.5" />
                              )}
                              {Math.abs(token.change24h).toFixed(1)}%
                            </div>
                          </Badge>
                        </div>
                      </div>
                      <Link 
                        href={token.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors flex items-center text-xs"
                      >
                        View <RiExternalLinkLine className="ml-1" />
                      </Link>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <Text className="text-gray-400 text-xs">24h Volume</Text>
                        <Text className="text-white">{formatNumber(token.volume24h)} BTC</Text>
                      </div>
                      <div>
                        <Text className="text-gray-400 text-xs">Market Cap</Text>
                        <Text className="text-white">{formatNumber(token.marketCap || 0)} BTC</Text>
                      </div>
                      <div>
                        <Text className="text-gray-400 text-xs">Supply</Text>
                        <Text className="text-white">{formatNumber(token.supply || 0, 0)}</Text>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>

      {/* Market insights */}
      <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
        <div className="flex items-center mb-3">
          <RiPriceTag3Line className="w-4 h-4 text-blue-400 mr-2" />
          <Text className="text-white font-medium">Market Insights</Text>
        </div>
        <Text className="text-sm text-gray-300">
          {activeTab === 0 ? (
            <>
              Ordinals collections continue to see strong trading activity with a 24% increase in volume over the past month. 
              Bitcoin Puppets and Taproot Wizards are leading the market with significant price appreciation, 
              while new collections are being inscribed at a rate of approximately 15-20 per day.
            </>
          ) : (
            <>
              Runes tokens have experienced explosive growth with a 215% increase in trading volume since launch. 
              The PEPE rune is currently the most traded with over 345,000 BTC in 24-hour volume. 
              New runes are being created daily, with the ecosystem rapidly expanding.
            </>
          )}
        </Text>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
        <Text className="text-xs text-rose-300 font-bold">RISK DISCLAIMER:</Text>
        <Text className="text-xs text-gray-400 mt-1">
          Ordinals and Runes markets are highly volatile and experimental. Past performance is not indicative of future results.
          Always conduct your own research before making investment decisions. The data provided is for informational purposes only.
        </Text>
      </div>
    </Card>
  )
}

export default OrdinalsRunesMarketCard
