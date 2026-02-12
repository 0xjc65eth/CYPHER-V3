'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardCard } from '@/components/dashboard-card'

export default function SitemapPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-2">SITEMAP</h1>
        <h2 className="text-lg text-muted-foreground mb-6">SITE STRUCTURE</h2>
        <Tabs defaultValue="pages" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="pages" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Pages
              </TabsTrigger>
              <TabsTrigger value="routes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                API Routes
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="pages">
            <MainPagesCard />
          </TabsContent>
          <TabsContent value="routes">
            <SupportPagesCard />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
function MainPagesCard() {
  return (
    <DashboardCard title="Main Pages">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Home</p>
          <p className="text-sm text-muted-foreground">Main landing page</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Trading</p>
          <p className="text-sm text-muted-foreground">Trading platform and tools</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Market</p>
          <p className="text-sm text-muted-foreground">Market overview and analysis</p>
        </div>
      </div>
    </DashboardCard>
  )
}
function SupportPagesCard() {
  return (
    <DashboardCard title="Support Pages">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Help Center</p>
          <p className="text-sm text-muted-foreground">Support and documentation</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">FAQ</p>
          <p className="text-sm text-muted-foreground">Frequently asked questions</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Contact</p>
          <p className="text-sm text-muted-foreground">Get in touch with us</p>
        </div>
      </div>
    </DashboardCard>
  )
}
