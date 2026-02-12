'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardCard } from '@/components/dashboard-card'

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-2">NEWS</h1>
        <h2 className="text-lg text-muted-foreground mb-6">MARKET NEWS</h2>
        <Tabs defaultValue="latest" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="latest" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Latest
              </TabsTrigger>
              <TabsTrigger value="archive" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Archive
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="latest">
            <LatestNewsCard />
          </TabsContent>
          <TabsContent value="archive">
            <MarketSentimentCard />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
function LatestNewsCard() {
  return (
    <DashboardCard title="Latest News">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Bitcoin Surges Past $50,000</p>
          <p className="text-sm text-muted-foreground">2 hours ago</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">New SEC Regulations Proposed</p>
          <p className="text-sm text-muted-foreground">5 hours ago</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Ethereum 2.0 Update</p>
          <p className="text-sm text-muted-foreground">8 hours ago</p>
        </div>
      </div>
    </DashboardCard>
  )
}
function MarketSentimentCard() {
  return (
    <DashboardCard title="Market Sentiment">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Overall Sentiment</p>
          <p className="text-sm text-green-500">Bullish</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Fear & Greed Index</p>
          <p className="text-sm text-muted-foreground">65</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Social Media Activity</p>
          <p className="text-sm text-muted-foreground">High</p>
        </div>
      </div>
    </DashboardCard>
  )
}
