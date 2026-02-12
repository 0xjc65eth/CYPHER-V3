'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardCard } from '@/components/dashboard-card'

export default function PartnersPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-2">PARTNERS</h1>
        <h2 className="text-lg text-muted-foreground mb-6">OUR PARTNERS</h2>
        <Tabs defaultValue="partners" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="partners" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Partners
              </TabsTrigger>
              <TabsTrigger value="become" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Become a Partner
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="partners">
            <PartnerProgramCard />
          </TabsContent>
          <TabsContent value="become">
            <CurrentPartnersCard />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
function PartnerProgramCard() {
  return (
    <DashboardCard title="Partner Program">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Affiliate Program</p>
          <p className="text-sm text-muted-foreground">Earn commissions by referring new users.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Institutional Partners</p>
          <p className="text-sm text-muted-foreground">Special programs for financial institutions.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Technology Partners</p>
          <p className="text-sm text-muted-foreground">Integration opportunities for tech companies.</p>
        </div>
      </div>
    </DashboardCard>
  )
}
function CurrentPartnersCard() {
  return (
    <DashboardCard title="Current Partners">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Payment Processors</p>
          <p className="text-sm text-muted-foreground">Leading payment solution providers.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Security Providers</p>
          <p className="text-sm text-muted-foreground">Top cybersecurity companies.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Data Providers</p>
          <p className="text-sm text-muted-foreground">Market data and analytics partners.</p>
        </div>
      </div>
    </DashboardCard>
  )
}
