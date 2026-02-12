'use client'

import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-[#1A1A1A] text-[#FFFFFF] p-6 text-center font-inter border-t border-[#3B82F6]">
      <div className="max-w-4xl mx-auto">
        <p className="mb-4 text-sm">
          Thank you for being part of CYPHER ORDI FUTURE. Your security and trust are our priority. Holders of MULTIVERSE PASS, YIELD HACKERS, STACK SATS, SEIZE CTRL, NO ORDINARY KIND, BITCOIN PUPPETS, THE WIZARD OF LORD, OCM GENESIS, OCM KATOSHI CLASSIC, OCM KATOSHI PRIME receive unlimited access and future upgrades, encouraging Bitcoin network development through Ordinals and community!
        </p>
        
        <div className="flex justify-center space-x-6 my-4">
          <Link 
            href="/legal" 
            className="text-[#3B82F6] hover:text-[#10B981] transition-colors duration-200 font-medium"
          >
            LEGAL
          </Link>
          <Link 
            href="/site" 
            className="text-[#3B82F6] hover:text-[#10B981] transition-colors duration-200 font-medium"
          >
            SITE
          </Link>
          <Link 
            href="/status" 
            className="text-[#3B82F6] hover:text-[#10B981] transition-colors duration-200 font-medium"
          >
            STATUS
          </Link>
        </div>
        
        <div className="mt-4 p-3 bg-[#2D2D2D] rounded-md inline-block">
          <p className="font-mono text-sm">
            DONATION ADDRESS: bc1q3ghzvpp0l74q3ntu8actyt0qcvl2u273flg5rs
          </p>
        </div>
        
        <p className="mt-4 text-sm text-[#D1D5DB]">
          Donations are incentives that drive project evolution.
        </p>
        
        <p className="mt-4 text-xs text-[#9CA3AF]">
          © 2025 CYPHER ORDI FUTURE. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

export default Footer 