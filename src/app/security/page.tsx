'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardCard } from '@/components/dashboard-card'

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-2">SECURITY</h1>
        <h2 className="text-lg text-muted-foreground mb-6">SECURITY MEASURES</h2>
        <Tabs defaultValue="overview" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Overview
              </TabsTrigger>
              <TabsTrigger value="practices" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Best Practices
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="overview">
            <SecurityFeaturesCard />
          </TabsContent>
          <TabsContent value="practices">
            <SecurityTipsCard />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
function SecurityFeaturesCard() {
  return (
    <DashboardCard title="Security Features">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Two-Factor Authentication</p>
          <p className="text-sm text-muted-foreground">Enhanced account security with 2FA.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Encryption</p>
          <p className="text-sm text-muted-foreground">End-to-end encryption for all transactions.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Cold Storage</p>
          <p className="text-sm text-muted-foreground">Majority of assets stored in cold wallets.</p>
        </div>
      </div>
    </DashboardCard>
  )
}
function SecurityTipsCard() {
  return (
    <DashboardCard title="Security Tips">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Strong Passwords</p>
          <p className="text-sm text-muted-foreground">Use unique, complex passwords for your account.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Device Security</p>
          <p className="text-sm text-muted-foreground">Keep your devices updated and secure.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Phishing Awareness</p>
          <p className="text-sm text-muted-foreground">Be cautious of suspicious emails and links.</p>
        </div>
      </div>
    </DashboardCard>
  )
}
