'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

// Use the same navigation items as in the navbar
const navItems = [
  { name: 'Dashboard', href: '/' },
  { name: 'Miners', href: '/miners' },
  { name: 'Ordinals', href: '/ordinals' },
  { name: 'Runes', href: '/runes' },
  { name: 'Signals', href: '/signals' },
  { name: 'Social', href: '/social' },
  { name: 'Alerts', href: '/alerts' },
  { name: 'Backtesting', href: '/backtesting' },
  { name: 'Portfolio', href: '/portfolio' },
  { name: 'Settings', href: '/settings' },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-[#1A1A1A] border-r border-gray-800 transform transition-transform duration-300 ease-in-out lg:hidden shadow-xl',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold font-montserrat text-[#8B5CF6]">CYPHER ORDI FUTURE</h2>
            <p className="text-xs text-gray-400 mt-1">Fort Knox Edition v8.0</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  pathname === item.href
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
                onClick={onClose}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800">
            <p className="text-xs text-gray-400">© 2025 CYPHER ORDI FUTURE</p>
          </div>
        </div>
      </div>
    </>
  )
} 