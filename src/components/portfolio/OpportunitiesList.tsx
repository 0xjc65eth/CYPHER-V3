"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpportunities } from '@/hooks/useOpportunities'
import { useToast } from "@/components/ui/use-toast"

interface OpportunitiesListProps {
  address: string
}

export default function OpportunitiesList({ address }: OpportunitiesListProps) {
  const { data, isLoading, error } = useOpportunities(address)
  const { toast } = useToast()
  const [executingId, setExecutingId] = useState<string | null>(null)

  const handleExecute = async (opportunityId: string) => {
    setExecutingId(opportunityId)

    try {
      const response = await fetch('/api/portfolio/execute-transaction/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ opportunityId, address }),
      })

      if (!response.ok) {
        throw new Error('Failed to execute transaction')
      }

      toast({
        title: "Transaction initiated",
        description: "Check your wallet to confirm the transaction.",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Transaction failed",
        description: "Failed to execute transaction. Please try again.",
        variant: "destructive",
      })
    } finally {
      setExecutingId(null)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investment Opportunities</CardTitle>
          <CardDescription>Personalized opportunities based on your portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investment Opportunities</CardTitle>
          <CardDescription>Personalized opportunities based on your portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 text-red-800 rounded-md">
            <p>Error loading opportunities. Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Helper function to get success probability color
  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    if (probability >= 60) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    if (probability >= 40) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investment Opportunities</CardTitle>
        <CardDescription>Personalized opportunities based on your portfolio</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="arbitrage">Arbitrage</TabsTrigger>
            <TabsTrigger value="trade">Trade</TabsTrigger>
            <TabsTrigger value="mint">Mint</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {data?.opportunities.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No opportunities found at this time.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data?.opportunities.map((opportunity) => (
                  <div key={opportunity.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/80 p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <h3 className="font-bold text-lg">{opportunity.title ?? '—'}</h3>
                            <div className={`ml-3 px-2 py-0.5 text-xs rounded-full ${
                              opportunity.type === 'Arbitrage'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                : opportunity.type === 'Trade'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}>
                              {opportunity.type}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{opportunity.description ?? '—'}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <Badge className={getProbabilityColor(opportunity.successProbability)}>
                            {opportunity.successProbability}% Success
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">
                            Neural Confidence: {opportunity.neuralConfidence}%
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Potential Return</p>
                          <p className="font-bold text-green-600 dark:text-green-400 text-lg">+{opportunity.potentialReturn}%</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Risk Level</p>
                          <p className="font-bold text-lg">{opportunity.riskLevel}</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Time Frame</p>
                          <p className="font-bold text-lg">{opportunity.timeFrame}</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Market Sentiment</p>
                          <p className="font-bold text-lg">{opportunity.marketData.socialSentiment || 'Neutral'}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <details className="group">
                          <summary className="flex justify-between items-center cursor-pointer list-none">
                            <h4 className="font-medium text-blue-700 dark:text-blue-400">Neural Analysis</h4>
                            <span className="transition group-open:rotate-180">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </span>
                          </summary>
                          <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg">
                            {opportunity.detailedAnalysis}
                          </div>
                        </details>
                      </div>

                      <div className="mb-4">
                        <details className="group">
                          <summary className="flex justify-between items-center cursor-pointer list-none">
                            <h4 className="font-medium text-purple-700 dark:text-purple-400">Action Steps</h4>
                            <span className="transition group-open:rotate-180">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </span>
                          </summary>
                          <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg">
                            <ul className="space-y-2">
                              {opportunity.actionSteps.map((step, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </details>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Resources</h4>
                        <div className="flex flex-wrap gap-2">
                          {opportunity.links.map((link, index) => (
                            <a
                              key={index}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                              {link.title}
                            </a>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500">
                          <span>Updated: </span>
                          {new Date(opportunity.updatedAt).toLocaleString()}
                          {opportunity.marketData.volume24h && (
                            <span className="ml-3">
                              Volume: ${(opportunity.marketData.volume24h / 1000000).toFixed(1)}M
                            </span>
                          )}
                          {opportunity.marketData.priceChange24h && (
                            <span className={`ml-3 ${opportunity.marketData.priceChange24h > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              24h: {opportunity.marketData.priceChange24h > 0 ? '+' : ''}{opportunity.marketData.priceChange24h}%
                            </span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleExecute(opportunity.id)}
                          disabled={executingId === opportunity.id}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                          {executingId === opportunity.id ? 'Processing...' : 'Execute Strategy'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="arbitrage" className="mt-4">
            {data?.opportunities.filter(o => o.type === 'Arbitrage').length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No arbitrage opportunities found at this time.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data?.opportunities
                  .filter(o => o.type === 'Arbitrage')
                  .map((opportunity) => (
                    <div key={opportunity.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{opportunity.title}</h3>
                          <p className="text-sm text-gray-500">{opportunity.description}</p>
                        </div>
                        <Badge className={getProbabilityColor(opportunity.successProbability)}>
                          {opportunity.successProbability}% Success
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-gray-500">Type</p>
                          <p>{opportunity.type}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Potential Return</p>
                          <p className="font-medium text-green-600">+{opportunity.potentialReturn}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Risk Level</p>
                          <p>{opportunity.riskLevel}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Time Frame</p>
                          <p>{opportunity.timeFrame}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <span className="text-gray-500">Updated: </span>
                          {new Date(opportunity.updatedAt).toLocaleString()}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleExecute(opportunity.id)}
                          disabled={executingId === opportunity.id}
                        >
                          {executingId === opportunity.id ? 'Processing...' : 'Execute'}
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="trade" className="mt-4">
            {data?.opportunities.filter(o => o.type === 'Trade').length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No trading opportunities found at this time.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data?.opportunities
                  .filter(o => o.type === 'Trade')
                  .map((opportunity) => (
                    <div key={opportunity.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{opportunity.title}</h3>
                          <p className="text-sm text-gray-500">{opportunity.description}</p>
                        </div>
                        <Badge className={getProbabilityColor(opportunity.successProbability)}>
                          {opportunity.successProbability}% Success
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-gray-500">Type</p>
                          <p>{opportunity.type}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Potential Return</p>
                          <p className="font-medium text-green-600">+{opportunity.potentialReturn}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Risk Level</p>
                          <p>{opportunity.riskLevel}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Time Frame</p>
                          <p>{opportunity.timeFrame}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <span className="text-gray-500">Updated: </span>
                          {new Date(opportunity.updatedAt).toLocaleString()}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleExecute(opportunity.id)}
                          disabled={executingId === opportunity.id}
                        >
                          {executingId === opportunity.id ? 'Processing...' : 'Execute'}
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mint" className="mt-4">
            {data?.opportunities.filter(o => o.type === 'Mint').length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No minting opportunities found at this time.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data?.opportunities
                  .filter(o => o.type === 'Mint')
                  .map((opportunity) => (
                    <div key={opportunity.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{opportunity.title}</h3>
                          <p className="text-sm text-gray-500">{opportunity.description}</p>
                        </div>
                        <Badge className={getProbabilityColor(opportunity.successProbability)}>
                          {opportunity.successProbability}% Success
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-gray-500">Type</p>
                          <p>{opportunity.type}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Potential Return</p>
                          <p className="font-medium text-green-600">+{opportunity.potentialReturn}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Risk Level</p>
                          <p>{opportunity.riskLevel}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Time Frame</p>
                          <p>{opportunity.timeFrame}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <span className="text-gray-500">Updated: </span>
                          {new Date(opportunity.updatedAt).toLocaleString()}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleExecute(opportunity.id)}
                          disabled={executingId === opportunity.id}
                        >
                          {executingId === opportunity.id ? 'Processing...' : 'Execute'}
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
