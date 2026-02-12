'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardCard } from '@/components/dashboard-card'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-2">TERMS</h1>
        <h2 className="text-lg text-muted-foreground mb-6">TERMS OF SERVICE</h2>
        <Tabs defaultValue="terms" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="terms" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Terms of Service
              </TabsTrigger>
              <TabsTrigger value="privacy" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Privacy Policy
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="terms">
            <TermsOfServiceCard />
          </TabsContent>
          <TabsContent value="privacy">
            <PrivacyPolicyCard />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
function TermsOfServiceCard() {
  return (
    <DashboardCard title="Terms of Service">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">1. Acceptance of Terms</p>
          <p className="text-sm text-muted-foreground">By accessing this platform, you agree to these terms.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">2. User Responsibilities</p>
          <p className="text-sm text-muted-foreground">Users must comply with all applicable laws and regulations.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">3. Trading Rules</p>
          <p className="text-sm text-muted-foreground">All trading activities must follow platform guidelines.</p>
        </div>
      </div>
    </DashboardCard>
  )
}
function PrivacyPolicyCard() {
  return (
    <DashboardCard title="Privacy Policy">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">1. Data Collection</p>
          <p className="text-sm text-muted-foreground">We collect necessary information for service provision.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">2. Data Protection</p>
          <p className="text-sm text-muted-foreground">Your data is protected using industry-standard security.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">3. Data Usage</p>
          <p className="text-sm text-muted-foreground">Data is used only for intended purposes.</p>
        </div>
      </div>
    </DashboardCard>
  )
}
