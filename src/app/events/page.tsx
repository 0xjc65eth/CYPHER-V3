'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardCard } from '@/components/dashboard-card'

export default function EventsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-2">EVENTS</h1>
        <h2 className="text-lg text-muted-foreground mb-6">UPCOMING EVENTS</h2>
        <Tabs defaultValue="upcoming" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="upcoming" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Upcoming
              </TabsTrigger>
              <TabsTrigger value="past" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Past Events
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="upcoming">
            <UpcomingEventsCard />
          </TabsContent>
          <TabsContent value="past">
            <PastEventsCard />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
function UpcomingEventsCard() {
  return (
    <DashboardCard title="Upcoming Events">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Trading Workshop</p>
          <p className="text-sm text-muted-foreground">April 15, 2024 • Virtual</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Crypto Conference</p>
          <p className="text-sm text-muted-foreground">May 20, 2024 • New York</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Community Meetup</p>
          <p className="text-sm text-muted-foreground">June 5, 2024 • London</p>
        </div>
      </div>
    </DashboardCard>
  )
}
function PastEventsCard() {
  return (
    <DashboardCard title="Past Events">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Platform Launch Event</p>
          <p className="text-sm text-muted-foreground">March 1, 2024 • Virtual</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Security Summit</p>
          <p className="text-sm text-muted-foreground">February 15, 2024 • Singapore</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Developer Conference</p>
          <p className="text-sm text-muted-foreground">January 20, 2024 • Berlin</p>
        </div>
      </div>
    </DashboardCard>
  )
}
