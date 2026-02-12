'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardCard } from '@/components/dashboard-card'

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-2">CONTACT</h1>
        <h2 className="text-lg text-muted-foreground mb-6">GET IN TOUCH</h2>
        <Tabs defaultValue="contact" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="contact" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Contact Us
              </TabsTrigger>
              <TabsTrigger value="offices" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                Office Locations
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="contact">
            <ContactInfoCard />
          </TabsContent>
          <TabsContent value="offices">
            <ContactFormCard />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
function ContactInfoCard() {
  return (
    <DashboardCard title="Contact Information">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Email</p>
          <p className="text-sm text-muted-foreground">contact@example.com</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Phone</p>
          <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Address</p>
          <p className="text-sm text-muted-foreground">123 Trading Street, Financial District</p>
        </div>
      </div>
    </DashboardCard>
  )
}
function ContactFormCard() {
  return (
    <DashboardCard title="Send Message">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Name</p>
          <input type="text" className="w-full p-2 border rounded" placeholder="Your name" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Email</p>
          <input type="email" className="w-full p-2 border rounded" placeholder="Your email" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Message</p>
          <textarea className="w-full p-2 border rounded" rows={4} placeholder="Your message"></textarea>
        </div>
        <button
          onClick={() => alert('Message sent successfully!')}
          className="w-full bg-primary text-primary-foreground p-2 rounded"
        >
          Send Message
        </button>
      </div>
    </DashboardCard>
  )
}
