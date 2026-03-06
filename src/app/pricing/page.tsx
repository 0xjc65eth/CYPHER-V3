'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Crown, Rocket, Loader2, AlertCircle } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import { TierBadge } from '@/components/subscription/TierBadge'
import { useBilling } from '@/hooks/useBilling'
import {
  type SubscriptionTier,
  SUBSCRIPTION_TIERS,
  tierHasAccess,
} from '@/lib/stripe/config'

const PAID_TIERS: Exclude<SubscriptionTier, 'free'>[] = ['pro', 'elite']

const TIER_ICONS: Record<string, React.ReactNode> = {
  pro: <Crown className="w-6 h-6" />,
  elite: <Rocket className="w-6 h-6" />,
}

const TIER_ACCENT: Record<string, string> = {
  pro: '#3B82F6',
  elite: '#F7931A',
}

function PricingPageContent() {
  const searchParams = useSearchParams()
  const { tier: currentTier, isActive } = useSubscription()
  const { subscribe, loading, error, clearError } = useBilling()
  const [checkoutCanceled, setCheckoutCanceled] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      setPaymentSuccess(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('payment')
      window.history.replaceState({}, '', url.toString())
    }
    if (searchParams.get('checkout') === 'canceled') {
      setCheckoutCanceled(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('checkout')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  return (
    <main className="min-h-screen bg-[#0d0d1a] text-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold font-mono mb-3">
            <span className="text-white">SUBSCRIPTION</span>{' '}
            <span className="text-[#F7931A]">PLANS</span>
          </h1>
          <p className="text-sm text-white/40 font-mono max-w-lg mx-auto">
            Unlock advanced trading tools, AI analytics, and autonomous strategies.
            Pay with Bitcoin — self-custodial, no KYC.
          </p>
          {isActive && currentTier !== 'free' && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-xs text-white/40 font-mono">Current plan:</span>
              <TierBadge tier={currentTier} size="md" />
            </div>
          )}
        </div>

        {/* Payment Success */}
        {paymentSuccess && (
          <div className="mb-8 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-green-400 font-mono font-medium">Payment confirmed!</p>
              <p className="text-xs text-green-400/60 font-mono mt-0.5">Your plan is now active.</p>
            </div>
            <button
              onClick={() => setPaymentSuccess(false)}
              className="px-4 py-1.5 bg-green-500/20 text-green-400 text-xs font-mono rounded hover:bg-green-500/30 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
            <p className="text-sm text-red-400 font-mono">{error}</p>
            <button
              onClick={clearError}
              className="mt-2 text-xs text-red-400/60 hover:text-red-400 font-mono underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          {PAID_TIERS.map((tierId) => {
            const tier = SUBSCRIPTION_TIERS[tierId]
            const accent = TIER_ACCENT[tierId]
            const isPopular = tierId === 'elite'
            const isCurrent = isActive && currentTier === tierId
            const isDowngrade = isActive && !tierHasAccess(tierId, currentTier)

            return (
              <div
                key={tierId}
                className={`relative flex flex-col bg-[#0a0a14] border rounded-xl p-6 transition-all ${
                  isPopular
                    ? 'border-[#F7931A]/40 shadow-[0_0_30px_rgba(247,147,26,0.1)]'
                    : 'border-[#1a1a2e] hover:border-white/10'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-[#F7931A] text-black text-[10px] font-mono font-bold uppercase tracking-wider rounded-full">
                      Best Value
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${accent}15`, color: accent }}
                  >
                    {TIER_ICONS[tierId]}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold font-mono text-white">{tier.name}</h2>
                    <p className="text-xs text-white/40 font-mono">{tier.description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold font-mono" style={{ color: accent }}>
                    ${tier.price}
                  </span>
                  <span className="text-sm text-white/40 font-mono">/mo</span>
                </div>

                <ul className="flex-1 space-y-2.5 mb-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accent }} />
                      <span className="text-white/70 font-mono text-xs">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  {isCurrent ? (
                    <div className="w-full py-2.5 text-center text-sm font-mono font-bold text-white/40 border border-white/10 rounded-lg">
                      Current Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => subscribe(tierId)}
                      disabled={loading || isDowngrade}
                      className="w-full py-2.5 text-sm font-mono font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: accent, color: '#000' }}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating Invoice...
                        </span>
                      ) : (
                        <span>&#8383; Pay with Bitcoin</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Checkout canceled banner */}
        {checkoutCanceled && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <p className="text-sm text-yellow-400 font-mono">Checkout was canceled</p>
            </div>
            <p className="text-xs text-yellow-400/60 font-mono">No payment was made. You can try again anytime.</p>
            <button
              onClick={() => setCheckoutCanceled(false)}
              className="mt-2 text-xs text-yellow-400/60 hover:text-yellow-400 font-mono underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-white/30 font-mono">
            All plans billed monthly. Payments via BTCPay Server — self-custodial Bitcoin, no KYC.
            <br />
            BTC goes directly to our wallet. BTCPay never touches your funds.
          </p>
        </div>
      </div>
    </main>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0d0d1a] text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4 text-center">
            <div className="h-8 w-56 bg-white/5 rounded mx-auto" />
            <div className="h-4 w-80 bg-white/5 rounded mx-auto" />
          </div>
        </div>
      </main>
    }>
      <PricingPageContent />
    </Suspense>
  )
}
