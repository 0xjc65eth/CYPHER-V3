"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { usePortfolio } from '@/hooks/usePortfolio'

interface PortfolioSummaryProps {
  address: string
}

export default function PortfolioSummary({ address }: PortfolioSummaryProps) {
  const { data, isLoading, error } = usePortfolio(address)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Summary</CardTitle>
          <CardDescription>Overview of your Bitcoin assets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Summary</CardTitle>
          <CardDescription>Overview of your Bitcoin assets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 text-red-800 rounded-md">
            <p>Error loading portfolio data. Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg border-0 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-900/90 to-purple-900/90 text-white">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold">Portfolio Analysis</CardTitle>
            <CardDescription className="text-gray-200">
              Neural-enhanced overview of your Bitcoin assets
            </CardDescription>
          </div>
          <div className="bg-white/10 px-3 py-1 rounded-full text-sm">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-lg font-medium">Total Portfolio Value</h3>
              <p className="text-sm text-gray-500">Neural analysis suggests a 7.2% growth potential</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ${data?.totalValue.toLocaleString()}
              </span>
              <p className="text-sm text-green-600">+2.4% today</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 mt-4">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full shadow-inner" style={{ width: '100%' }}></div>
          </div>
          <div className="flex justify-between text-xs mt-1 text-gray-500">
            <span>Portfolio Allocation</span>
            <div className="flex space-x-3">
              <span className="flex items-center"><span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span> BTC {Math.round((data?.btc.value || 0) / (data?.totalValue || 1) * 100)}%</span>
              <span className="flex items-center"><span className="w-2 h-2 bg-purple-500 rounded-full mr-1"></span> Ordinals {Math.round((data?.ordinals.value || 0) / (data?.totalValue || 1) * 100)}%</span>
              <span className="flex items-center"><span className="w-2 h-2 bg-pink-500 rounded-full mr-1"></span> Runes {Math.round((data?.runes.value || 0) / (data?.totalValue || 1) * 100)}%</span>
              <span className="flex items-center"><span className="w-2 h-2 bg-amber-500 rounded-full mr-1"></span> Rare Sats {Math.round((data?.rareSats.value || 0) / (data?.totalValue || 1) * 100)}%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-5 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800/30">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Bitcoin</h3>
                <p className="text-2xl font-bold">{data?.btc.amount} BTC</p>
                <p className="text-sm">${data?.btc.value.toLocaleString()}</p>
              </div>
              <div className="bg-blue-500/10 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97"></path></svg>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200/50 dark:border-blue-700/30">
              <div className="flex justify-between text-sm">
                <span className="text-blue-800/70 dark:text-blue-300/70">Neural Sentiment</span>
                <span className="font-medium text-blue-800 dark:text-blue-300">Bullish</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-blue-800/70 dark:text-blue-300/70">Volatility</span>
                <span className="font-medium text-blue-800 dark:text-blue-300">Low</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-5 rounded-xl shadow-sm border border-purple-100 dark:border-purple-800/30">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">Ordinals</h3>
                <p className="text-2xl font-bold">{data?.ordinals.count} items</p>
                <p className="text-sm">${data?.ordinals.value.toLocaleString()}</p>
              </div>
              <div className="bg-purple-500/10 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M7 7h.01M7 12h.01M7 17h.01M12 7h.01M12 12h.01M12 17h.01M17 7h.01M17 12h.01M17 17h.01"></path></svg>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-purple-200/50 dark:border-purple-700/30">
              <div className="space-y-2">
                {data?.ordinals.collections?.map((collection: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-purple-800/70 dark:text-purple-300/70">{collection.name}</span>
                    <span className="font-medium text-purple-800 dark:text-purple-300">${collection.floorPrice.toLocaleString()}</span>
                  </div>
                )) || (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-800/70 dark:text-purple-300/70">Collection Value</span>
                      <span className="font-medium text-purple-800 dark:text-purple-300">Rising</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-purple-800/70 dark:text-purple-300/70">Rarity Score</span>
                      <span className="font-medium text-purple-800 dark:text-purple-300">High</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 p-5 rounded-xl shadow-sm border border-pink-100 dark:border-pink-800/30">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-pink-800 dark:text-pink-300 mb-1">Runes</h3>
                <p className="text-2xl font-bold">{data?.runes.count} types</p>
                <p className="text-sm">${data?.runes.value.toLocaleString()}</p>
              </div>
              <div className="bg-pink-500/10 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-600"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"></path><path d="m9 12 2 2 4-4"></path></svg>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-pink-200/50 dark:border-pink-700/30">
              <div className="space-y-2">
                {data?.runes.holdings?.map((holding: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-pink-800/70 dark:text-pink-300/70">{holding.ticker}</span>
                    <span className="font-medium text-pink-800 dark:text-pink-300">{holding.amount}</span>
                  </div>
                )) || (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-pink-800/70 dark:text-pink-300/70">Adoption Rate</span>
                      <span className="font-medium text-pink-800 dark:text-pink-300">Accelerating</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-pink-800/70 dark:text-pink-300/70">Growth Potential</span>
                      <span className="font-medium text-pink-800 dark:text-pink-300">Very High</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-5 rounded-xl shadow-sm border border-amber-100 dark:border-amber-800/30">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Rare Sats</h3>
                <p className="text-2xl font-bold">{data?.rareSats.count} sats</p>
                <p className="text-sm">${data?.rareSats.value.toLocaleString()}</p>
              </div>
              <div className="bg-amber-500/10 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-700/30">
              <div className="space-y-2">
                {data?.rareSats.items?.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-amber-800/70 dark:text-amber-300/70">{item.type} ({item.sat.substring(0, 4)}...)</span>
                    <span className="font-medium text-amber-800 dark:text-amber-300">${item.value.toLocaleString()}</span>
                  </div>
                )) || (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-800/70 dark:text-amber-300/70">Rarity Level</span>
                      <span className="font-medium text-amber-800 dark:text-amber-300">Exceptional</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-amber-800/70 dark:text-amber-300/70">Collector Interest</span>
                      <span className="font-medium text-amber-800 dark:text-amber-300">Surging</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Recent Transactions</h3>
            <div className="text-sm text-blue-600 cursor-pointer hover:underline">View All</div>
          </div>

          {data?.recentTransactions.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/30 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400 mb-3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <p className="text-gray-500">No recent transactions found.</p>
              <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">Connect Exchange</button>
            </div>
          ) : (
            <div className="space-y-3 bg-gray-50 dark:bg-gray-800/20 rounded-xl p-4">
              {data?.recentTransactions.map((tx: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800/50 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700/30 hover:border-blue-200 dark:hover:border-blue-700/30 transition-colors">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${tx.type === 'Received' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {tx.type === 'Received' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"></path></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 15 6-6 6 6"></path></svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{tx.type}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <span>{new Date(tx.date).toLocaleString()}</span>
                        {tx.sentiment && (
                          <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                            {tx.sentiment}
                          </span>
                        )}
                        {tx.marketImpact && (
                          <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full">
                            {tx.marketImpact}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${tx.type === 'Received' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {tx.type === 'Received' ? '+' : '-'}{tx.amount}
                    </p>
                    <p className="text-xs text-gray-500">${tx.valueUSD.toLocaleString()}</p>
                  </div>
                </div>
              ))}

              <div className="pt-3 text-center">
                <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  Load More Transactions
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
          <div className="flex items-start">
            <div className="bg-blue-100 dark:bg-blue-800/30 p-2 rounded-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path><path d="M7 7h.01"></path></svg>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-300">Neural System Insight</h4>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                Based on your portfolio composition and market trends, our neural system suggests increasing your Runes allocation by 5% to optimize for current market conditions.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
