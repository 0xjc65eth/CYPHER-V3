'use client'

import Link from 'next/link'

export function TestNavigation() {
  return (
    <div className="fixed top-0 left-0 z-[10000] bg-red-500 p-4 text-white">
      <h3>🧪 Test Navigation</h3>
      <div className="flex gap-2">
        <Link 
          href="/cypher-ai" 
          className="bg-blue-500 px-2 py-1 rounded"
          onClick={(e) => {
          }}
        >
          Test AI
        </Link>
        
        <Link 
          href="/arbitrage" 
          className="bg-green-500 px-2 py-1 rounded"
          onClick={(e) => {
          }}
        >
          Test Arbitrage
        </Link>
        
        <a 
          href="/market" 
          className="bg-yellow-500 px-2 py-1 rounded text-black"
          onClick={(e) => {
          }}
        >
          Regular Link
        </a>
      </div>
    </div>
  )
}