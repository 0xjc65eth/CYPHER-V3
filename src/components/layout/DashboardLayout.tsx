'use client'

import React, { useState, useEffect } from 'react'
import { 
  Menu, X, Home, Bot, TrendingUp, Bitcoin, Crown, Gem, Search,
  BarChart3, Briefcase, Activity, ChevronRight, ChevronLeft,
  Zap, Shield, Settings, HelpCircle, Wifi, WifiOff, Diamond,
  Command, Terminal, Gauge, Database, Server, Users, Grid3X3
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
// Removed: NotificationBell and UserMenu components
import { BitcoinPriceDisplay } from '@/components/bitcoin/BitcoinPriceDisplay'
import { ClientOnlyWalletButton } from '@/components/wallet/ClientOnlyWalletButton'
import { cn } from '@/lib/utils'

// Professional navigation structure
const navigation = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: Grid3X3,
    badge: null
  },
  { 
    name: 'CYPHER AI', 
    href: '/cypher-ai', 
    icon: Bot,
    badge: 'AI',
    highlight: true
  },
  { 
    name: 'Trading', 
    href: '/trading', 
    icon: TrendingUp,
    badge: null
  },
  {
    name: 'Bitcoin',
    icon: Bitcoin,
    submenu: [
      { name: 'Ordinals', href: '/ordinals', icon: Crown },
      { name: 'Runes', href: '/runes', icon: Gem },
      { name: 'Rare Sats', href: '/rare-sats', icon: Diamond },
    ]
  },
  { 
    name: 'Analytics', 
    href: '/analytics', 
    icon: BarChart3,
    badge: null
  },
  { 
    name: 'Portfolio', 
    href: '/portfolio', 
    icon: Briefcase,
    badge: null
  },
  { 
    name: 'Arbitrage', 
    href: '/arbitrage', 
    icon: Activity,
    badge: 'HOT'
  },
]

const bottomNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/documentation', icon: HelpCircle },
]

// PWA Status Component
function PWAStatus() {
  const [isOnline, setIsOnline] = useState(true)
  
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <div className={cn(
      "flex items-center gap-1 text-xs",
      isOnline ? 'text-green-500' : 'text-red-500'
    )}>
      {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      <span>{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  )
}

// Workspace indicator
function WorkspaceIndicator() {
  return (
    <div className="flex items-center space-x-2 px-3 py-2 bg-gray-800 rounded-lg">
      <Users className="h-4 w-4 text-gray-400" />
      <select aria-label="Select workspace" className="bg-transparent text-sm text-white outline-none cursor-pointer">
        <option>Main Workspace</option>
        <option>Test Environment</option>
        <option>Paper Trading</option>
      </select>
    </div>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const pathname = usePathname()

  // Command palette shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleSubmenu = (menuName: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuName) 
        ? prev.filter(m => m !== menuName)
        : [...prev, menuName]
    )
  }

  const renderNavItem = (item: any, isNested = false) => {
    const Icon = item.icon
    const isActive = pathname === item.href
    const hasSubmenu = item.submenu && item.submenu.length > 0
    const isExpanded = expandedMenus.includes(item.name)

    if (hasSubmenu) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleSubmenu(item.name)}
            className={cn(
              "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-all duration-150",
              "text-gray-400 hover:bg-gray-800 hover:text-white group"
            )}
          >
            <div className="flex items-center">
              <Icon className="mr-3 h-4 w-4" />
              {sidebarOpen && item.name}
            </div>
            {sidebarOpen && (
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform duration-200",
                isExpanded && "rotate-90"
              )} />
            )}
          </button>
          {isExpanded && sidebarOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {item.submenu.map((subItem: any) => renderNavItem(subItem, true))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-150 group relative",
          isActive
            ? "bg-orange-500/10 text-orange-400"
            : "text-gray-400 hover:bg-gray-800 hover:text-white",
          isNested && "text-xs",
          item.highlight && !isActive && "hover:bg-purple-500/10 hover:text-purple-400"
        )}
      >
        <Icon className={cn(
          "mr-3 h-4 w-4",
          item.highlight && "text-purple-400"
        )} />
        {sidebarOpen && (
          <>
            <span className="flex-1">{item.name}</span>
            {item.badge && (
              <span className={cn(
                "ml-2 px-1.5 py-0.5 text-xs font-medium rounded",
                item.badge === 'AI' && "bg-purple-500/20 text-purple-400",
                item.badge === 'HOT' && "bg-red-500/20 text-red-400 animate-pulse"
              )}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-950">
      {/* Professional Sidebar */}
      <aside aria-label="Sidebar navigation" className={cn(
        "bg-gray-900 border-r border-gray-800 transition-all duration-200 flex flex-col",
        sidebarOpen ? "w-56" : "w-14"
      )}>
        {/* Logo Section */}
        <div className="h-12 px-3 flex items-center border-b border-gray-800">
          <div className="flex items-center justify-between w-full">
            {sidebarOpen ? (
              <div className="flex items-center space-x-2">
                <Terminal className="h-5 w-5 text-orange-500" />
                <span className="text-sm font-bold text-white">CYPHER</span>
              </div>
            ) : (
              <Terminal className="h-5 w-5 text-orange-500 mx-auto" />
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors"
            >
              {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Search/Command Bar */}
        {sidebarOpen && (
          <div className="px-3 py-2">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Open command palette (Cmd+K)"
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-750 rounded-md transition-colors text-gray-400 hover:text-white"
            >
              <div className="flex items-center space-x-2">
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="text-xs">Search...</span>
              </div>
              <kbd className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">⌘K</kbd>
            </button>
          </div>
        )}

        {/* Main Navigation */}
        <nav aria-label="Dashboard navigation" className="flex-1 px-3 py-2 overflow-y-auto">
          <div className="space-y-1">
            {navigation.map(item => renderNavItem(item))}
          </div>
        </nav>

        {/* System Status */}
        {sidebarOpen && (
          <div className="px-3 py-2 border-t border-gray-800">
            <div className="grid grid-cols-3 gap-2 text-center" role="status" aria-label="System status">
              <div>
                <Server className="h-3.5 w-3.5 mx-auto mb-1 text-green-500" aria-hidden="true" />
                <div className="text-xs text-gray-400">API</div>
              </div>
              <div>
                <Database className="h-3.5 w-3.5 mx-auto mb-1 text-green-500" aria-hidden="true" />
                <div className="text-xs text-gray-400">DB</div>
              </div>
              <div>
                <Gauge className="h-3.5 w-3.5 mx-auto mb-1 text-yellow-500" aria-hidden="true" />
                <div className="text-xs text-gray-400">42%</div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="px-3 py-2 border-t border-gray-800">
          <div className="space-y-1">
            {bottomNavigation.map(item => renderNavItem(item))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Professional Top bar */}
        <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
          <div className="flex items-center space-x-6">
            <WorkspaceIndicator />
            
            {/* Market Status */}
            <div className="flex items-center space-x-4">
              <BitcoinPriceDisplay />
              <div className="h-5 w-px bg-gray-800" />
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-400">Markets Open</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <PWAStatus />
            <div className="h-5 w-px bg-gray-800" />
            <ClientOnlyWalletButton />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-950">
          {children}
        </main>
      </div>

      {/* Command Palette Modal */}
      {commandPaletteOpen && (
        <div
          role="dialog"
          aria-label="Command palette"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setCommandPaletteOpen(false)}
        >
          <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-gray-900 rounded-lg shadow-2xl border border-gray-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center border-b border-gray-800 px-4 py-3">
              <Command className="h-5 w-5 text-gray-500 mr-3" aria-hidden="true" />
              <input
                type="text"
                placeholder="Type a command or search..."
                aria-label="Search commands"
                className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
                autoFocus
              />
              <kbd className="text-xs text-gray-400">ESC</kbd>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-400">Quick actions will appear here...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}