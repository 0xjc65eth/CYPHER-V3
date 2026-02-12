'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, Cpu, Zap, Bitcoin, Sparkles, LineChart, 
  Briefcase, TrendingUp, Menu, X, Bell, Settings,
  User, LogOut, Moon, Sun, Wallet
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { useMounted } from '@/hooks'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  color?: string
}

const navigation: NavItem[] = [
  { name: 'Home', href: '/', icon: Home, color: 'text-blue-500' },
  { name: 'CYPHER AI', href: '/cypher-ai', icon: Cpu, color: 'text-purple-500', badge: 'AI' },
  { name: 'Arbitrage', href: '/arbitrage', icon: Zap, color: 'text-orange-500', badge: 'HOT' },
  { name: 'Bitcoin', href: '/bitcoin', icon: Bitcoin, color: 'text-yellow-500' },
  { name: 'Ordinals', href: '/ordinals', icon: Sparkles, color: 'text-pink-500' },
  { name: 'Runes', href: '/runes', icon: Sparkles, color: 'text-green-500' },
  { name: 'Analytics', href: '/analytics', icon: LineChart, color: 'text-blue-500' },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase, color: 'text-indigo-500' },
  { name: 'Trading', href: '/trading', icon: TrendingUp, color: 'text-red-500' }
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const mounted = useMounted()
  
  const { isConnected, address, connect, disconnect } = useWalletSafe()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [notifications, setNotifications] = useState(3)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  if (!mounted) {
    return <LayoutSkeleton />
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top Navigation Bar */}
      <nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Mobile Menu */}
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label={sidebarOpen ? "Close menu" : "Open menu"}
                aria-expanded={sidebarOpen}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-white"
              >
                {sidebarOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
              </button>
              
              <Link href="/" className="flex items-center gap-2 ml-2 lg:ml-0">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <Bitcoin className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white hidden sm:block">
                  CYPHER ORDI
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                      isActive 
                        ? "bg-gray-800 text-white" 
                        : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", item.color)} />
                    {item.name}
                    {item.badge && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button
                aria-label={`Notifications${notifications > 0 ? ` (${notifications} unread)` : ''}`}
                className="relative p-2 text-gray-400 hover:text-white transition-colors"
              >
                <Bell className="w-5 h-5" aria-hidden="true" />
                {notifications > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center" aria-hidden="true">
                    {notifications}
                  </span>
                )}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                {darkMode ? <Sun className="w-5 h-5" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
              </button>

              {/* Wallet Connection */}
              {isConnected ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs text-gray-400">Balance</p>
                    <p className="text-sm font-medium text-white">0.4837 BTC</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnect}
                    className="gap-2"
                  >
                    <Wallet className="w-4 h-4" />
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => connect('xverse')}
                  className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  <Wallet className="w-4 h-4" />
                  Connect Wallet
                </Button>
              )}

              {/* User Menu */}
              <button aria-label="User menu" className="p-2 text-gray-400 hover:text-white transition-colors">
                <User className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div role="dialog" aria-label="Mobile navigation" aria-modal="true" className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-900">
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <nav aria-label="Mobile navigation" className="mt-5 px-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors",
                        isActive
                          ? "bg-gray-800 text-white"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      )}
                    >
                      <Icon className={cn("mr-4 w-6 h-6", item.color)} />
                      {item.name}
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 CYPHER ORDI FUTURE. All rights reserved.
            </p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <Link href="/terms" className="text-gray-400 hover:text-white text-sm">
                Terms
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white text-sm">
                Privacy
              </Link>
              <Link href="/docs" className="text-gray-400 hover:text-white text-sm">
                Docs
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Skeleton Loader
function LayoutSkeleton() {
  return (
    <div className="min-h-screen bg-gray-950">
      <div className="h-16 bg-gray-900 border-b border-gray-800" />
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-1/3 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export { MainLayout };