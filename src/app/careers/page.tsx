'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardCard } from '@/components/dashboard-card'

export default function CareersPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-2">CAREERS</h1>
        <h2 className="text-lg text-muted-foreground mb-6">JOIN OUR TEAM</h2>
        <Tabs defaultValue="positions" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="positions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Open Positions
              </TabsTrigger>
              <TabsTrigger value="culture" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Culture
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="positions">
            <OpenPositionsCard />
          </TabsContent>
          <TabsContent value="culture">
            <CompanyCultureCard />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
function OpenPositionsCard() {
  return (
    <DashboardCard title="Open Positions">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Senior Developer</p>
          <p className="text-sm text-muted-foreground">Full-time • Remote</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Product Manager</p>
          <p className="text-sm text-muted-foreground">Full-time • Hybrid</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Security Engineer</p>
          <p className="text-sm text-muted-foreground">Full-time • On-site</p>
        </div>
      </div>
    </DashboardCard>
  )
}
function CompanyCultureCard() {
  return (
    <DashboardCard title="Company Culture">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Innovation</p>
          <p className="text-sm text-muted-foreground">We encourage creative thinking and new ideas.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Growth</p>
          <p className="text-sm text-muted-foreground">Continuous learning and development opportunities.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Work-Life Balance</p>
          <p className="text-sm text-muted-foreground">Flexible schedules and remote work options.</p>
        </div>
      </div>
    </DashboardCard>
  )
}
