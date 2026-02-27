'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NavigationIcons } from '@/lib/icons/icon-system'
import { CypherLogo } from '@/components/ui/CypherLogo'
import { useEthWallet } from '@/hooks/useEthWallet'
import { useYHPVerification } from '@/hooks/useYHPVerification'
import { usePremium } from '@/contexts/PremiumContext'
import { hasPremiumAccess } from '@/config/vip-wallets'
import { RiWallet3Line, RiVipCrownLine } from 'react-icons/ri'
import WalletConnect from '@/components/wallet/WalletConnect'

interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ElementType
  description?: string
  badge?: string
  badgeType?: 'success' | 'warning' | 'info' | 'new'
  isNew?: boolean
  isPro?: boolean
  category?: string
}

const navigationItems: NavItem[] = [
  {
    id: 'home',
    label: 'Dashboard',
    href: '/',
    icon: NavigationIcons['/'].icon,
    description: 'Professional Trading Terminal',
    category: 'Core'
  },
  {
    id: 'market',
    label: 'Market',
    href: '/market',
    icon: NavigationIcons['/market'].icon,
    description: 'Live market data & analysis',
    category: 'Core'
  },
  {
    id: 'miners',
    label: 'Miners',
    href: '/miners',
    icon: NavigationIcons['/miners'].icon,
    description: 'Mining profitability & stats',
    category: 'Core'
  },
  {
    id: 'trading',
    label: 'Trading',
    href: '/trading',
    icon: NavigationIcons['/trading'].icon,
    description: 'Professional trading terminal',
    category: 'Core'
  },
  {
    id: 'ordinals',
    label: 'Ordinals',
    href: '/ordinals',
    icon: NavigationIcons['/ordinals'].icon,
    description: 'Advanced Ordinals & BRC-20 Analysis',
    badge: 'PRO',
    badgeType: 'info',
    isPro: true,
    category: 'Features'
  },
  {
    id: 'runes',
    label: 'Runes',
    href: '/runes',
    icon: NavigationIcons['/runes'].icon,
    description: 'Advanced Trading Terminal',
    badge: 'LIVE',
    badgeType: 'success',
    category: 'Features'
  },
  {
    id: 'cypher-ai',
    label: 'CYPHER AI',
    href: '/cypher-ai',
    icon: NavigationIcons['/cypher-ai'].icon,
    description: 'Advanced AI Trading Intelligence',
    badge: 'PRO',
    badgeType: 'info',
    isPro: true,
    category: 'Features'
  },
  {
    id: 'hacker-yields',
    label: 'Hacker Yields',
    href: '/hacker-yields',
    icon: NavigationIcons['/hacker-yields'].icon,
    description: 'AI Autonomous Trading Agent',
    badge: 'CYPHER',
    badgeType: 'info',
    category: 'Features'
  },
  {
    id: 'swap',
    label: 'Swap',
    href: '/swap',
    icon: NavigationIcons['/swap'].icon,
    description: 'Cross-chain swaps via THORChain',
    badge: 'EARN',
    badgeType: 'success',
    category: 'Features'
  },
  {
    id: 'arbitrage',
    label: 'Arbitrage',
    href: '/arbitrage',
    icon: NavigationIcons['/arbitrage'].icon,
    description: 'Cross-exchange opportunities',
    badge: 'LIVE',
    badgeType: 'success',
    category: 'Features'
  },
  {
    id: 'brc20',
    label: 'BRC-20',
    href: '/brc20',
    icon: NavigationIcons['/brc20'].icon,
    description: 'BRC-20 token analytics',
    category: 'Tools'
  },
  {
    id: 'rare-sats',
    label: 'Rare Sats',
    href: '/rare-sats',
    icon: NavigationIcons['/rare-sats'].icon,
    description: 'Rare satoshi hunting',
    category: 'Tools'
  },
  {
    id: 'pricing',
    label: 'Pricing',
    href: '/pricing',
    icon: NavigationIcons['/pricing'].icon,
    description: 'Subscription plans & pricing',
    badge: 'NEW',
    badgeType: 'new',
    category: 'Tools'
  },
  {
    id: 'bug-report',
    label: 'Report Bug',
    href: '/bug-report',
    icon: NavigationIcons['/bug-report'].icon,
    description: 'Report errors and bugs',
    badge: 'HELP',
    badgeType: 'warning',
    category: 'Tools'
  },
]

const mobileCategories = [
  { name: 'Core', label: 'CORE' },
  { name: 'Features', label: 'FEATURES' },
  { name: 'Tools', label: 'TOOLS' },
  { name: 'Labs', label: 'LABS' },
]

function BadgeLabel({ badge, badgeType }: { badge: string; badgeType?: string }) {
  const tooltipText = badge === 'NEW' ? 'New feature' : badge === 'LIVE' ? 'Live data' : badge === 'PRO' ? 'Professional tier' : badge === 'BETA' ? 'Beta feature' : badge
  return (
    <span title={tooltipText} aria-label={tooltipText} className={cn(
      "px-1.5 py-0.5 text-[10px] font-bold rounded-md",
      badgeType === 'success' && "bg-green-500/20 text-green-400",
      badgeType === 'warning' && "bg-yellow-500/20 text-yellow-400",
      badgeType === 'info' && "bg-blue-500/20 text-blue-400",
      badgeType === 'new' && "bg-purple-500/20 text-purple-400 animate-pulse"
    )}>
      {badge}
    </span>
  )
}

function PremiumBadge() {
  const { isPremium, accessTier } = usePremium()
  if (!isPremium && !hasPremiumAccess(accessTier)) return null

  const tier = accessTier
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold ${
      tier === 'super_admin' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
      tier === 'vip' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
      'bg-green-500/20 text-green-400 border border-green-500/30'
    }`}>
      <RiVipCrownLine className="w-3 h-3" />
      <span>{tier === 'super_admin' ? 'ADMIN' : tier === 'vip' ? 'VIP' : 'PREMIUM'}</span>
    </div>
  )
}

export function MainNavigation() {
  const pathname = usePathname()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { address: ethAddress, isConnected: ethConnected, connecting: ethConnecting, connectEth, disconnectEth } = useEthWallet()
  const { isHolder: isYHPHolder, loading: yhpLoading } = useYHPVerification(ethAddress)

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  // Close on route change
  useEffect(() => {
    closeMobileMenu()
  }, [pathname, closeMobileMenu])

  // Lock body scroll and handle Escape key when mobile menu is open
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileMenu()
    }
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen, closeMobileMenu])

  return (
    <nav className="bg-black border-b border-white/10 relative z-[9999] sticky top-0">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" aria-label="CYPHER home">
              <CypherLogo size="md" showWordmark animated />
            </Link>
          </div>

          {/* Desktop Navigation Items - hidden on mobile */}
          <div className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "relative px-3 py-2 rounded-lg transition-all duration-200",
                    "hover:bg-white/10 group flex-shrink-0",
                    isActive && "bg-white/10 text-orange-500"
                  )}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn(
                      "w-4 h-4 transition-colors",
                      isActive ? "text-orange-500" : "text-white/70 group-hover:text-white"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors",
                      isActive ? "text-orange-500" : "text-white/70 group-hover:text-white"
                    )}>
                      {item.label}
                    </span>

                    {item.badge && (
                      <BadgeLabel badge={item.badge} badgeType={item.badgeType} />
                    )}
                  </div>

                  {/* Tooltip */}
                  {hoveredItem === item.id && item.description && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-black/95 backdrop-blur-sm border border-white/10 rounded-lg text-xs text-white/70 whitespace-nowrap z-50 shadow-xl">
                      {item.description}
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/95 border-l border-t border-white/10 rotate-45" />
                    </div>
                  )}

                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full" />
                  )}
                </Link>
              )
            })}

          </div>

          {/* Wallet Buttons */}
          <div className="hidden md:flex items-center gap-2 ml-2">
            {/* Premium/VIP Badge */}
            <PremiumBadge />

            {/* BTC Wallet */}
            <WalletConnect />

            {/* ETH Wallet Button */}
            {ethConnected && ethAddress ? (
              isYHPHolder ? (
                <button
                  onClick={disconnectEth}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/40 rounded-lg text-green-400 text-xs font-bold hover:bg-green-500/30 transition-colors"
                  title={`YHP Holder: ${ethAddress}`}
                >
                  <RiWallet3Line className="w-3.5 h-3.5" />
                  <span>YHP HOLDER</span>
                </button>
              ) : (
                <button
                  onClick={disconnectEth}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/60 text-xs font-medium hover:bg-white/10 transition-colors"
                  title={ethAddress}
                >
                  <RiWallet3Line className="w-3.5 h-3.5" />
                  <span>{ethAddress.slice(0, 6)}...{ethAddress.slice(-4)}</span>
                </button>
              )
            ) : (
              <button
                onClick={async () => {
                  try {
                    await connectEth()
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Failed to connect MetaMask'
                    console.error('ETH connect error:', msg)
                    // Show error feedback
                    const errEl = document.getElementById('eth-connect-error')
                    if (errEl) {
                      errEl.textContent = msg
                      errEl.style.display = 'block'
                      setTimeout(() => { errEl.style.display = 'none' }, 5000)
                    }
                  }
                }}
                disabled={ethConnecting}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-orange-500/50 rounded-lg text-orange-400 text-xs font-medium hover:bg-orange-500/10 transition-colors disabled:opacity-50"
              >
                <RiWallet3Line className="w-3.5 h-3.5" />
                <span>{ethConnecting ? 'Connecting...' : 'Connect ETH'}</span>
              </button>
            )}
            <span id="eth-connect-error" className="absolute top-full right-0 mt-1 text-[10px] text-red-400 bg-black/90 border border-red-500/30 rounded px-2 py-1 whitespace-nowrap z-50" style={{ display: 'none' }} />
            {yhpLoading && (
              <span className="text-[10px] text-orange-400/60 animate-pulse">Verifying...</span>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            <div className="w-6 h-5 flex flex-col justify-between relative">
              <span className={cn(
                "w-full h-0.5 bg-white/70 rounded-full transition-all duration-300 origin-center",
                mobileMenuOpen && "rotate-45 translate-y-[9px]"
              )} />
              <span className={cn(
                "w-full h-0.5 bg-white/70 rounded-full transition-all duration-300",
                mobileMenuOpen && "opacity-0 scale-x-0"
              )} />
              <span className={cn(
                "w-full h-0.5 bg-white/70 rounded-full transition-all duration-300 origin-center",
                mobileMenuOpen && "-rotate-45 -translate-y-[9px]"
              )} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={cn(
          "fixed inset-0 top-16 z-[9998] bg-black/80 backdrop-blur-sm md:hidden transition-opacity duration-300",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      {/* Mobile Slide-Out Panel */}
      <div
        ref={menuRef}
        className={cn(
          "fixed top-16 right-0 bottom-0 w-[85vw] max-w-[320px] z-[9999] md:hidden",
          "bg-black border-l border-orange-500/30 overflow-y-auto",
          "transition-transform duration-300 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Terminal-style header */}
        <div className="border-b border-orange-500/30 px-4 py-3">
          <div className="text-[10px] text-orange-500/60 font-mono">CYPHER TERMINAL</div>
          <div className="text-xs text-orange-500 font-mono font-bold">NAVIGATION PANEL</div>
        </div>

        {/* Categorized Navigation */}
        <div className="py-2">
          {mobileCategories.map((category) => {
            const items = navigationItems.filter(item => item.category === category.name)
            if (items.length === 0) return null

            return (
              <div key={category.name} className="mb-2">
                <div className="px-4 py-2">
                  <span className="text-[10px] font-mono font-bold text-orange-500/60 tracking-wider">
                    {category.label}
                  </span>
                </div>
                {items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 min-h-[44px] transition-colors",
                        "active:bg-orange-500/10",
                        isActive
                          ? "bg-orange-500/10 border-r-2 border-orange-500"
                          : "hover:bg-white/5"
                      )}
                    >
                      <Icon className={cn(
                        "w-5 h-5 flex-shrink-0",
                        isActive ? "text-orange-500" : "text-white/60"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-medium",
                            isActive ? "text-orange-500" : "text-white/80"
                          )}>
                            {item.label}
                          </span>
                          {item.badge && (
                            <BadgeLabel badge={item.badge} badgeType={item.badgeType} />
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-white/40 mt-0.5 truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Terminal footer */}
        <div className="border-t border-orange-500/30 px-4 py-3 mt-2">
          <div className="text-[10px] text-orange-500/40 font-mono">
            CYPHER v3.1.0
          </div>
          <div className="text-[10px] text-green-400/60 font-mono mt-1">
            STATUS: OPERATIONAL
          </div>
        </div>
      </div>
    </nav>
  )
}
