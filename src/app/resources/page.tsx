'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardCard } from '@/components/dashboard-card'

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-2">RESOURCES</h1>
        <h2 className="text-lg text-muted-foreground mb-6">LEARNING MATERIALS</h2>
        <Tabs defaultValue="guides" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="guides" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Guides
              </TabsTrigger>
              <TabsTrigger value="api" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                API Docs
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="guides">
            <EducationalResourcesCard />
          </TabsContent>
          <TabsContent value="api">
            <TradingResourcesCard />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
function EducationalResourcesCard() {
  return (
    <DashboardCard title="Educational Resources">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Trading Basics</p>
          <p className="text-sm text-muted-foreground">Learn the fundamentals of trading</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Technical Analysis</p>
          <p className="text-sm text-muted-foreground">Understanding charts and indicators</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Risk Management</p>
          <p className="text-sm text-muted-foreground">Essential risk management strategies</p>
        </div>
      </div>
    </DashboardCard>
  )
}
function TradingResourcesCard() {
  return (
    <DashboardCard title="Trading Resources">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Trading Tools</p>
          <p className="text-sm text-muted-foreground">Access to advanced trading tools</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Market Analysis</p>
          <p className="text-sm text-muted-foreground">Regular market analysis reports</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Trading Strategies</p>
          <p className="text-sm text-muted-foreground">Proven trading strategies guide</p>
        </div>
      </div>
    </DashboardCard>
  )
}
