'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Component, type ReactNode } from 'react'
import { ThemeToggle } from './theme-toggle'
import { CardID } from './card-id'

// Dynamic import to prevent BigInt serialization crash from @omnisat/lasereyes-react
const WalletConnectButton = dynamic(
  () => import('./wallet-connect-button-new').then(mod => ({ default: mod.WalletConnectButton })),
  { ssr: false, loading: () => <div className="px-4 py-2 text-xs text-gray-500">Loading wallet...</div> }
)

// Error boundary to catch lasereyes BigInt crashes without taking down the page
class WalletErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: Error) {
    console.warn('[CYPHER] Wallet component error (BigInt):', error.message)
  }
  render() {
    if (this.state.hasError) {
      return <div className="px-4 py-2 text-xs text-gray-500">Wallet unavailable</div>
    }
    return this.props.children
  }
}

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Trading', href: '/trading' },
  { name: 'Market', href: '/market' },
  { name: 'Ordinals', href: '/ordinals' },
  { name: 'Runes', href: '/runes' },
  { name: 'Miners', href: '/miners' },
  { name: 'Social', href: '/social' },
  { name: 'Analytics', href: '/analytics' },
  { name: 'Neural Learning', href: '/neural-learning' },
  { name: 'Portfolio', href: '/portfolio' },
  { name: 'Settings', href: '/settings' },
  { name: 'Resources', href: '/resources' },
  { name: 'Status', href: '/status' },
  { name: 'Legal', href: '/legal' },
  { name: 'Sitemap', href: '/sitemap' },
]

interface HeaderProps {
  title?: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">
              CYPHER ORDI FUTURE
            </span>
          </Link>
          <nav aria-label="Main navigation" className="flex items-center space-x-6 text-sm font-medium">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors hover:text-foreground/80 ${
                  pathname === item.href ? 'text-foreground' : 'text-foreground/60'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <CardID />
          </div>
          <nav className="flex items-center space-x-4">
            <div className="mr-2">
              <WalletErrorBoundary>
                <WalletConnectButton />
              </WalletErrorBoundary>
            </div>
            <ThemeToggle />
          </nav>
        </div>
      </div>
      {(title || description) && (
        <div className="container py-4">
          {title && <h1 className="text-2xl font-bold">{title}</h1>}
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      )}
    </header>
  )
}