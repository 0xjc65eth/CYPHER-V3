'use client'

import { useState } from 'react'
import { Check, Zap, Crown, Rocket, Loader2 } from 'lucide-react'
import { useLaserEyes } from '@/providers/SimpleLaserEyesProvider'
import { useEthWallet } from '@/hooks/useEthWallet'
import { useSubscription } from '@/hooks/useSubscription'
import { TierBadge } from '@/components/subscription/TierBadge'
import {
  type SubscriptionTier,
  SUBSCRIPTION_TIERS,
  tierHasAccess,
} from '@/lib/stripe/config'

const TIER_ORDER: SubscriptionTier[] = ['explorer', 'trader', 'hacker_yields']

const TIER_ICONS: Record<string, React.ReactNode> = {
  explorer: <Zap className="w-6 h-6" />,
  trader: <Crown className="w-6 h-6" />,
  hacker_yields: <Rocket className="w-6 h-6" />,
}

const TIER_ACCENT: Record<string, string> = {
  explorer: '#3B82F6',
  trader: '#8B5CF6',
  hacker_yields: '#F7931A',
}

export default function PricingPage() {
  const { connected: btcConnected, address: btcAddress } = useLaserEyes()
  const { address: ethAddress, isConnected: ethConnected, connecting: ethConnecting, connectEth } = useEthWallet()
  const { tier: currentTier, isActive } = useSubscription()
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // User is "connected" if either BTC or ETH wallet is connected
  const isWalletConnected = btcConnected || ethConnected
  // Use whichever wallet address is available (prefer ETH for Stripe, fallback to BTC)
  const walletAddress = ethAddress || btcAddress || null

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!walletAddress) return

    setLoadingTier(tier)
    setCheckoutError(null)
    try {
      const res = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, tier }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        console.error('Checkout error:', data.error)
        setCheckoutError(data.error)
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setCheckoutError('Failed to start checkout. Please try again.')
    } finally {
      setLoadingTier(null)
    }
  }

  const handleConnectWallet = async () => {
    try {
      // Try ETH first (MetaMask) — most common for Stripe subscriptions
      await connectEth()
    } catch {
      // If MetaMask not available, dispatch event for BTC wallet modal
      window.dispatchEvent(new CustomEvent('openWalletConnect'))
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0d1a] text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold font-mono mb-3">
            <span className="text-white">SUBSCRIPTION</span>{' '}
            <span className="text-[#F7931A]">PLANS</span>
          </h1>
          <p className="text-sm text-white/40 font-mono max-w-lg mx-auto">
            Unlock advanced trading tools, AI analytics, and autonomous strategies.
            All plans include a 7-day free trial.
          </p>
          {isActive && currentTier !== 'free' && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-xs text-white/40 font-mono">Current plan:</span>
              <TierBadge tier={currentTier} size="md" />
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {TIER_ORDER.map((tierId) => {
            const tier = SUBSCRIPTION_TIERS[tierId]
            const accent = TIER_ACCENT[tierId]
            const isPopular = tierId === 'trader'
            const isCurrent = isActive && currentTier === tierId
            const isDowngrade = isActive && !tierHasAccess(tierId, currentTier)

            return (
              <div
                key={tierId}
                className={`relative flex flex-col bg-[#0a0a14] border rounded-xl p-6 transition-all ${
                  isPopular
                    ? 'border-[#8B5CF6]/40 shadow-[0_0_30px_rgba(139,92,246,0.1)]'
                    : 'border-[#1a1a2e] hover:border-white/10'
                }`}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-[#8B5CF6] text-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Icon & Name */}
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

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold font-mono" style={{ color: accent }}>
                    ${tier.price}
                  </span>
                  <span className="text-sm text-white/40 font-mono">/mo</span>
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-2.5 mb-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check
                        className="w-4 h-4 mt-0.5 flex-shrink-0"
                        style={{ color: accent }}
                      />
                      <span className="text-white/70 font-mono text-xs">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-auto">
                  {isCurrent ? (
                    <div className="w-full py-2.5 text-center text-sm font-mono font-bold text-white/40 border border-white/10 rounded-lg">
                      Current Plan
                    </div>
                  ) : !isWalletConnected ? (
                    <button
                      onClick={handleConnectWallet}
                      disabled={ethConnecting}
                      className="w-full py-2.5 text-sm font-mono font-bold rounded-lg transition-colors border disabled:opacity-50"
                      style={{
                        borderColor: `${accent}40`,
                        color: accent,
                        backgroundColor: `${accent}10`,
                      }}
                    >
                      {ethConnecting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Connecting...
                        </span>
                      ) : (
                        'Connect Wallet'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(tierId)}
                      disabled={loadingTier !== null || isDowngrade}
                      className="w-full py-2.5 text-sm font-mono font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: accent,
                        color: '#000',
                      }}
                    >
                      {loadingTier === tierId ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </span>
                      ) : isDowngrade ? (
                        'Downgrade via Settings'
                      ) : (
                        'Subscribe'
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Checkout error banner */}
        {checkoutError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
            <p className="text-sm text-red-400 font-mono">{checkoutError}</p>
            <button
              onClick={() => setCheckoutError(null)}
              className="mt-2 text-xs text-red-400/60 hover:text-red-400 font-mono underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Footer note */}
        <div className="text-center">
          <p className="text-xs text-white/30 font-mono">
            All plans are billed monthly. Cancel anytime from your settings.
            Payments processed securely by Stripe.
          </p>
        </div>
      </div>
    </main>
  )
}
