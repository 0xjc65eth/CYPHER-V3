"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

interface PortfolioSettingsProps {
  address: string
}

export default function PortfolioSettings({ address }: PortfolioSettingsProps) {
  const { toast } = useToast()
  const [settings, setSettings] = useState({
    notifications: {
      priceAlerts: true,
      newOpportunities: true,
      portfolioUpdates: false,
      securityAlerts: true
    },
    display: {
      currency: 'USD',
      theme: 'system',
      showPercentages: true,
      showFiatValues: true
    },
    security: {
      requireConfirmation: true,
      autoLockTimeout: '15'
    },
    advanced: {
      autoRefreshInterval: '30',
      includeTestnetAssets: false,
      showExperimentalFeatures: false
    }
  })
  
  const [isSaving, setIsSaving] = useState(false)
  
  const handleSaveSettings = async () => {
    setIsSaving(true)
    
    try {
      const response = await fetch('/api/portfolio/settings/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, settings }),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      toast({
        title: "Settings saved",
        description: "Your portfolio settings have been updated successfully.",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>Configure how you want to be notified about your portfolio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="price-alerts">Price Alerts</Label>
              <p className="text-sm text-gray-500">Receive notifications about significant price changes</p>
            </div>
            <Switch 
              id="price-alerts" 
              checked={settings.notifications.priceAlerts}
              onCheckedChange={(checked) => 
                setSettings(prev => ({
                  ...prev,
                  notifications: {
                    ...prev.notifications,
                    priceAlerts: checked
                  }
                }))
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="new-opportunities">New Opportunities</Label>
              <p className="text-sm text-gray-500">Get notified about new investment opportunities</p>
            </div>
            <Switch 
              id="new-opportunities" 
              checked={settings.notifications.newOpportunities}
              onCheckedChange={(checked) => 
                setSettings(prev => ({
                  ...prev,
                  notifications: {
                    ...prev.notifications,
                    newOpportunities: checked
                  }
                }))
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="portfolio-updates">Portfolio Updates</Label>
              <p className="text-sm text-gray-500">Receive daily or weekly portfolio performance updates</p>
            </div>
            <Switch 
              id="portfolio-updates" 
              checked={settings.notifications.portfolioUpdates}
              onCheckedChange={(checked) => 
                setSettings(prev => ({
                  ...prev,
                  notifications: {
                    ...prev.notifications,
                    portfolioUpdates: checked
                  }
                }))
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="security-alerts">Security Alerts</Label>
              <p className="text-sm text-gray-500">Get notified about suspicious activities or security issues</p>
            </div>
            <Switch 
              id="security-alerts" 
              checked={settings.notifications.securityAlerts}
              onCheckedChange={(checked) => 
                setSettings(prev => ({
                  ...prev,
                  notifications: {
                    ...prev.notifications,
                    securityAlerts: checked
                  }
                }))
              }
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
          <CardDescription>Customize how your portfolio information is displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select 
                value={settings.display.currency}
                onValueChange={(value) => 
                  setSettings(prev => ({
                    ...prev,
                    display: {
                      ...prev.display,
                      currency: value
                    }
                  }))
                }
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                  <SelectItem value="BTC">BTC (₿)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select 
                value={settings.display.theme}
                onValueChange={(value) => 
                  setSettings(prev => ({
                    ...prev,
                    display: {
                      ...prev.display,
                      theme: value
                    }
                  }))
                }
              >
                <SelectTrigger id="theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-percentages">Show Percentages</Label>
              <p className="text-sm text-gray-500">Display percentage changes for assets</p>
            </div>
            <Switch 
              id="show-percentages" 
              checked={settings.display.showPercentages}
              onCheckedChange={(checked) => 
                setSettings(prev => ({
                  ...prev,
                  display: {
                    ...prev.display,
                    showPercentages: checked
                  }
                }))
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-fiat-values">Show Fiat Values</Label>
              <p className="text-sm text-gray-500">Display fiat currency equivalent for all assets</p>
            </div>
            <Switch 
              id="show-fiat-values" 
              checked={settings.display.showFiatValues}
              onCheckedChange={(checked) => 
                setSettings(prev => ({
                  ...prev,
                  display: {
                    ...prev.display,
                    showFiatValues: checked
                  }
                }))
              }
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Configure security options for your portfolio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require-confirmation">Require Confirmation</Label>
              <p className="text-sm text-gray-500">Always require wallet confirmation for transactions</p>
            </div>
            <Switch 
              id="require-confirmation" 
              checked={settings.security.requireConfirmation}
              onCheckedChange={(checked) => 
                setSettings(prev => ({
                  ...prev,
                  security: {
                    ...prev.security,
                    requireConfirmation: checked
                  }
                }))
              }
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="auto-lock-timeout">Auto-lock Timeout (minutes)</Label>
            <Input 
              id="auto-lock-timeout" 
              type="number" 
              value={settings.security.autoLockTimeout}
              onChange={(e) => 
                setSettings(prev => ({
                  ...prev,
                  security: {
                    ...prev.security,
                    autoLockTimeout: e.target.value
                  }
                }))
              }
              min="1"
              max="60"
            />
            <p className="text-sm text-gray-500">Automatically disconnect wallet after inactivity</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>Configure advanced options for your portfolio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auto-refresh-interval">Auto-refresh Interval (seconds)</Label>
            <Input 
              id="auto-refresh-interval" 
              type="number" 
              value={settings.advanced.autoRefreshInterval}
              onChange={(e) => 
                setSettings(prev => ({
                  ...prev,
                  advanced: {
                    ...prev.advanced,
                    autoRefreshInterval: e.target.value
                  }
                }))
              }
              min="5"
              max="300"
            />
            <p className="text-sm text-gray-500">How often to refresh portfolio data automatically</p>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="include-testnet-assets">Include Testnet Assets</Label>
              <p className="text-sm text-gray-500">Show assets from Bitcoin testnet in your portfolio</p>
            </div>
            <Switch 
              id="include-testnet-assets" 
              checked={settings.advanced.includeTestnetAssets}
              onCheckedChange={(checked) => 
                setSettings(prev => ({
                  ...prev,
                  advanced: {
                    ...prev.advanced,
                    includeTestnetAssets: checked
                  }
                }))
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-experimental-features">Show Experimental Features</Label>
              <p className="text-sm text-gray-500">Enable experimental portfolio features (may be unstable)</p>
            </div>
            <Switch 
              id="show-experimental-features" 
              checked={settings.advanced.showExperimentalFeatures}
              onCheckedChange={(checked) => 
                setSettings(prev => ({
                  ...prev,
                  advanced: {
                    ...prev.advanced,
                    showExperimentalFeatures: checked
                  }
                }))
              }
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="ml-auto"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
