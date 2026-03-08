'use client'

import { useLaserEyes } from '@omnisat/lasereyes'
import { useBilling } from '@/hooks/useBilling'

const PLANS = [
  {
    id: 'explorer' as const,
    name: 'CYPHER Explorer',
    price: '$29',
    features: ['Portfolio tracking', 'Cross-chain swaps', 'Ordinals & Runes viewer', 'AI analytics', 'Unlimited alerts', 'Paper trading'],
    highlight: false,
  },
  {
    id: 'trader' as const,
    name: 'CYPHER Trader',
    price: '$79',
    features: ['Everything in Explorer', 'Neural predictions', 'Smart Money Concepts', 'Whale tracking'],
    highlight: false,
  },
  {
    id: 'hacker_yields' as const,
    name: 'CYPHER Hacker Yields',
    price: '$149',
    features: ['Everything in Trader', 'AI Trading Agent', 'Multi-agent consensus', 'Auto-compound', 'MEV protection'],
    highlight: true,
  },
]

export function PricingPlans() {
  const { address } = useLaserEyes()
  const { subscribe, loading, error } = useBilling()

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">CYPHER Plans</h2>
        <p className="text-gray-400">Pay with Bitcoin on-chain or Lightning ⚡ — No KYC.</p>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {PLANS.map((plan) => (
          <div key={plan.id} className={`rounded-2xl p-6 flex flex-col gap-4 border ${
            plan.highlight ? 'bg-orange-950/30 border-orange-500/50' : 'bg-gray-900/50 border-gray-700/50'
          }`}>
            {plan.highlight && (
              <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Best Value</span>
            )}
            <div>
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <span className="text-3xl font-bold text-white">{plan.price}</span>
              <span className="text-gray-400 text-sm">/mo</span>
            </div>
            <ul className="flex flex-col gap-2 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-green-400">&#10003;</span>{f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => subscribe(plan.id, address || undefined)}
              disabled={loading || !address}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                plan.highlight ? 'bg-orange-500 hover:bg-orange-400 text-black' : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              {loading ? 'Processing...' : !address ? 'Connect Wallet to Subscribe' : '₿ Pay with Bitcoin (+ Lightning ⚡)'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
