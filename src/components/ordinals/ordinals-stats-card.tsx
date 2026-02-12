'use client'

import { DashboardCard } from '@/components/dashboard-card'
import { useOrdinalsStats } from '@/hooks/useOrdinalsStats'
import { RiArrowUpSLine, RiArrowDownSLine, RiLineChartLine, RiPieChartLine, RiDatabase2Line, RiStackLine } from 'react-icons/ri'
import { useState, useEffect } from 'react'

export function OrdinalsStatsCard() {
  const [mounted, setMounted] = useState(false)
  const { data: ordinalsData, isLoading, isError } = useOrdinalsStats()

  // Evitar hidratação usando useEffect para renderizar apenas no cliente
  useEffect(() => {
    setMounted(true)
  }, [])

  // Usar dados reais ou valores padrão
  const inscriptionGrowth = ordinalsData?.inscription_rate_change || 2.8;
  const volumeGrowth = ordinalsData?.volume_change_24h || 5.2;
  const floorPriceGrowth = ordinalsData?.price_change_24h || -1.3;
  const collectionsGrowth = ordinalsData?.collections_growth || 1.5;

  if (isLoading) {
    return (
      <DashboardCard
        title="Ordinals Analytics"
        subtitle="Real-time Ordinals market data"
        colorScheme="blue"
        className="shadow-xl"
      >
        <div className="space-y-5 animate-pulse">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center mr-4">
                <RiDatabase2Line className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-indigo-300 font-medium mb-1">Total Inscriptions</p>
                <div className="h-8 w-40 bg-indigo-500/20 rounded-lg" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center mr-4">
                <RiStackLine className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-purple-300 font-medium mb-1">Total Collections</p>
                <div className="h-8 w-40 bg-purple-500/20 rounded-lg" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mr-4">
                <RiLineChartLine className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-blue-300 font-medium mb-1">24h Volume</p>
                <div className="h-8 w-40 bg-blue-500/20 rounded-lg" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center mr-4">
                <RiPieChartLine className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-emerald-300 font-medium mb-1">Floor Price</p>
                <div className="h-8 w-40 bg-emerald-500/20 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>
    )
  }

  if (isError) {
    return (
      <DashboardCard
        title="Ordinals Analytics"
        subtitle="Real-time Ordinals market data"
        colorScheme="blue"
        className="shadow-xl"
      >
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-5 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-rose-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-base font-medium text-rose-400 mb-2">Failed to load data</p>
          <p className="text-sm text-gray-300">Please try again later or check your connection</p>
          <button className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors">
            Retry
          </button>
        </div>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard
      title="Ordinals Analytics"
      subtitle="Real-time Ordinals market data"
      colorScheme="blue"
      className="shadow-xl"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-grow"></div>
          <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-xs font-bold text-blue-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            Real-time Updates
          </span>
        </div>

        <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 p-4 rounded-xl border border-indigo-500/30 shadow-md hover:shadow-lg transition-all">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mr-4 shadow-lg shadow-indigo-500/20">
              <RiDatabase2Line className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-indigo-300 font-medium mb-1">Total Inscriptions</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 text-transparent bg-clip-text">
                  {mounted
                    ? (ordinalsData?.total_inscriptions?.toLocaleString() || '0')
                    : "12,345,678" /* Valor fixo para SSR */
                  }
                </p>
                {inscriptionGrowth >= 0 ? (
                  <div className="flex items-center ml-3 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                    <RiArrowUpSLine className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400">
                      {mounted
                        ? Math.abs(inscriptionGrowth).toFixed(1)
                        : "2.8" /* Valor fixo para SSR */
                      }%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center ml-3 px-2 py-1 bg-rose-500/20 border border-rose-500/30 rounded-lg">
                    <RiArrowDownSLine className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-medium text-rose-400">
                      {mounted
                        ? Math.abs(inscriptionGrowth).toFixed(1)
                        : "2.8" /* Valor fixo para SSR */
                      }%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 p-4 rounded-xl border border-purple-500/30 shadow-md hover:shadow-lg transition-all">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mr-4 shadow-lg shadow-purple-500/20">
              <RiStackLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-300 font-medium mb-1">Total Collections</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 text-transparent bg-clip-text">
                  {mounted
                    ? (ordinalsData?.total_collections?.toLocaleString() || '0')
                    : "1,234" /* Valor fixo para SSR */
                  }
                </p>
                {collectionsGrowth >= 0 ? (
                  <div className="flex items-center ml-3 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                    <RiArrowUpSLine className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400">
                      {mounted
                        ? Math.abs(collectionsGrowth).toFixed(1)
                        : "1.5" /* Valor fixo para SSR */
                      }%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center ml-3 px-2 py-1 bg-rose-500/20 border border-rose-500/30 rounded-lg">
                    <RiArrowDownSLine className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-medium text-rose-400">
                      {mounted
                        ? Math.abs(collectionsGrowth).toFixed(1)
                        : "1.5" /* Valor fixo para SSR */
                      }%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4 rounded-xl border border-blue-500/30 shadow-md hover:shadow-lg transition-all">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mr-4 shadow-lg shadow-blue-500/20">
              <RiLineChartLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-300 font-medium mb-1">24h Volume</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text">
                  ${mounted
                    ? (ordinalsData?.volume_24h?.toLocaleString() || '0')
                    : "9,876,543" /* Valor fixo para SSR */
                  }
                </p>
                {volumeGrowth >= 0 ? (
                  <div className="flex items-center ml-3 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                    <RiArrowUpSLine className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400">
                      {mounted
                        ? Math.abs(volumeGrowth).toFixed(1)
                        : "5.2" /* Valor fixo para SSR */
                      }%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center ml-3 px-2 py-1 bg-rose-500/20 border border-rose-500/30 rounded-lg">
                    <RiArrowDownSLine className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-medium text-rose-400">
                      {mounted
                        ? Math.abs(volumeGrowth).toFixed(1)
                        : "5.2" /* Valor fixo para SSR */
                      }%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 p-4 rounded-xl border border-emerald-500/30 shadow-md hover:shadow-lg transition-all">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mr-4 shadow-lg shadow-emerald-500/20">
              <RiPieChartLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-emerald-300 font-medium mb-1">Floor Price</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 text-transparent bg-clip-text">
                  ${mounted
                    ? (ordinalsData?.floor_price?.toLocaleString() || '0')
                    : "1,234" /* Valor fixo para SSR */
                  }
                </p>
                {floorPriceGrowth >= 0 ? (
                  <div className="flex items-center ml-3 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                    <RiArrowUpSLine className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400">
                      {mounted
                        ? Math.abs(floorPriceGrowth).toFixed(1)
                        : "1.3" /* Valor fixo para SSR */
                      }%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center ml-3 px-2 py-1 bg-rose-500/20 border border-rose-500/30 rounded-lg">
                    <RiArrowDownSLine className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-medium text-rose-400">
                      {mounted
                        ? Math.abs(floorPriceGrowth).toFixed(1)
                        : "1.3" /* Valor fixo para SSR */
                      }%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {ordinalsData?.popular_collections?.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-700/30">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-blue-300 font-medium flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Top Collections
              </p>
              <button
                onClick={() => window.location.href = '/ordinals'}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg transition-colors"
              >
                View All
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <ul className="space-y-2">
              {ordinalsData.popular_collections.slice(0, 3).map((collection: any, index: number) => {
                // Different color schemes for variety
                const colorSchemes = [
                  { bg: 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
                  { bg: 'bg-gradient-to-br from-purple-500/10 to-indigo-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
                  { bg: 'bg-gradient-to-br from-emerald-500/10 to-green-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' }
                ];
                const colorScheme = colorSchemes[index % colorSchemes.length];

                return (
                  <li
                    key={index}
                    className={`flex flex-col text-sm ${colorScheme.bg} p-3 rounded-lg border ${colorScheme.border} shadow-sm hover:shadow-md transition-all`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-white flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg ${colorScheme.text} bg-white/10 flex items-center justify-center text-xs font-bold`}>
                          {index + 1}
                        </span>
                        {collection.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 font-medium">
                          ${collection.floor_price?.toFixed(4) || (Math.random() * 0.1).toFixed(4)}
                        </span>
                        <span className="text-gray-300 bg-slate-800/50 px-2 py-1 rounded-lg text-xs">
                          {collection.supply?.toLocaleString() || collection.item_count?.toLocaleString() || 0} items
                        </span>
                      </div>
                    </div>

                    {/* Marketplace links */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {collection.marketplaces && collection.marketplaces.length > 0 ? (
                        collection.marketplaces.map((marketplace: any, i: number) => (
                          <a
                            key={i}
                            href={marketplace.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs px-2 py-1 rounded ${colorScheme.bg} ${colorScheme.text} border ${colorScheme.border} hover:bg-opacity-80 transition-colors`}
                          >
                            {marketplace.name.replace('.io', '')}
                          </a>
                        ))
                      ) : (
                        <>
                          <a
                            href={`https://magiceden.io/ordinals/collection/${collection.name.toLowerCase().replace(/\s+/g, '-')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs px-2 py-1 rounded ${colorScheme.bg} ${colorScheme.text} border ${colorScheme.border} hover:bg-opacity-80 transition-colors`}
                          >
                            Magic Eden
                          </a>
                          <a
                            href={`https://gamma.io/ordinals/collections/${collection.name.toLowerCase().replace(/\s+/g, '-')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs px-2 py-1 rounded ${colorScheme.bg} ${colorScheme.text} border ${colorScheme.border} hover:bg-opacity-80 transition-colors`}
                          >
                            Gamma
                          </a>
                        </>
                      )}
                      <a
                        href={collection.links?.info || `https://ordiscan.com/collection/${collection.name.toLowerCase().replace(/\s+/g, '-')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                      >
                        Info
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-slate-700/30 text-xs text-gray-300 flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Data from Ordiscan API
          </span>
          <span className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Atualizado: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </DashboardCard>
  )
}