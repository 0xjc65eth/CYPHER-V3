'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardCard } from '@/components/dashboard-card'

export default function PressPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-2">PRESS</h1>
        <h2 className="text-lg text-muted-foreground mb-6">NEWS & MEDIA</h2>
        <Tabs defaultValue="releases" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="releases" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Press Releases
              </TabsTrigger>
              <TabsTrigger value="media" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Media Kit
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="releases">
            <PressReleasesCard />
          </TabsContent>
          <TabsContent value="media">
            <MediaKitCard />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
function PressReleasesCard() {
  return (
    <DashboardCard title="Press Releases">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Platform Launch Announcement</p>
          <p className="text-sm text-muted-foreground">March 15, 2024</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">New Trading Features Released</p>
          <p className="text-sm text-muted-foreground">March 10, 2024</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Security Update Announcement</p>
          <p className="text-sm text-muted-foreground">March 5, 2024</p>
        </div>
      </div>
    </DashboardCard>
  )
}
function MediaKitCard() {
  return (
    <DashboardCard title="Media Kit">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Company Logo</p>
          <p className="text-sm text-muted-foreground">High-resolution logo files</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Brand Guidelines</p>
          <p className="text-sm text-muted-foreground">Visual identity and usage rules</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Press Contact</p>
          <p className="text-sm text-muted-foreground">press@example.com</p>
        </div>
      </div>
    </DashboardCard>
  )
}
