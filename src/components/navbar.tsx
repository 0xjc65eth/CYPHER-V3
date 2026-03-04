'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { CardID } from "./card-id"
import { useAppSelector } from "@/store"
import {
  RiDashboardLine,
  RiBarChartLine,
  RiExchangeLine,
  RiPulseLine,
  RiSignalTowerLine,
  RiGroupLine,
  RiNotification3Line,
  RiWalletLine,
  RiSettings4Line,
  RiBrainLine,
  RiVipCrownLine,
} from 'react-icons/ri'

const navItems = [
  { name: "Dashboard", href: "/", icon: RiDashboardLine },
  { name: "Miners", href: "/miners", icon: RiBarChartLine },
  { name: "Network", href: "/network", icon: RiPulseLine },
  { name: "Ordinals", href: "/ordinals", icon: RiPulseLine },
  { name: "Runes", href: "/runes", icon: RiSignalTowerLine },
  { name: "Arbitrage", href: "/arbitrage", icon: RiExchangeLine },
  { name: "Social", href: "/social", icon: RiGroupLine },
  { name: "Neural Learning", href: "/neural-learning", icon: RiBrainLine },
  { name: "Alerts", href: "/alerts", icon: RiNotification3Line },
  { name: "Portfolio", href: "/portfolio", icon: RiWalletLine },
  { name: "Pricing", href: "/pricing", icon: RiVipCrownLine },
  { name: "Settings", href: "/settings", icon: RiSettings4Line },
]

export function Navbar() {
  const pathname = usePathname()
  const nftData = useAppSelector((state) => (state.user as any).nftData)

  return (
    <nav aria-label="Main navigation" className="sticky top-0 z-50 w-full bg-gradient-to-r from-[#1A1A1A] via-[#2D2D2D] to-[#1A1A1A] text-[#FFFFFF] px-6 py-4 flex justify-between items-center font-inter border-b border-[#3D3D3D] backdrop-blur-md">
      <div className="flex items-center space-x-2">
        <div className="text-xl font-bold font-montserrat bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#8B5CF6] text-transparent bg-clip-text">CYPHER ORDI FUTURE</div>
      </div>
      <div className="hidden lg:flex space-x-6">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-[#3D3D3D] hover:text-[#8B5CF6]",
                pathname === item.href ? "bg-[#3D3D3D] text-[#8B5CF6]" : "text-gray-300"
              )}
            >
              {Icon ? <Icon className="w-4 h-4" /> : null}
              <span>{item.name}</span>
            </Link>
          )
        })}
      </div>
      <div className="flex items-center gap-4">
        {nftData && <CardID />}
      </div>
    </nav>
  )
}

export default Navbar