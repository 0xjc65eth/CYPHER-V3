/**
 * Subscription Configuration
 * Defines tiers, pricing, features, and access control helpers.
 * Payment: Stripe (Card) + BTCPay Server (Bitcoin + Lightning)
 */

export type SubscriptionTier = 'free' | 'explorer' | 'trader' | 'hacker_yields'

/**
 * Map legacy tier names (pro, elite) to current tiers.
 * Needed because database/localStorage may still contain old values.
 */
const LEGACY_TIER_MAP: Record<string, SubscriptionTier> = {
  pro: 'explorer',
  elite: 'hacker_yields',
}

/**
 * Normalize a tier string, mapping legacy names to current ones.
 */
export function normalizeTier(tier: string | null | undefined): SubscriptionTier {
  if (!tier) return 'free'
  if (tier in LEGACY_TIER_MAP) return LEGACY_TIER_MAP[tier]
  if (tier === 'free' || tier === 'explorer' || tier === 'trader' || tier === 'hacker_yields') {
    return tier
  }
  return 'free'
}

export interface TierConfig {
  id: SubscriptionTier
  name: string
  price: number
  description: string
  features: string[]
  limits: Record<string, number | boolean>
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Basic dashboard access',
    features: ['Dashboard (view only)'],
    limits: { maxAlerts: 0, paperTrading: false, aiAgent: false },
  },
  explorer: {
    id: 'explorer',
    name: 'Explorer',
    price: 29,
    description: 'Essential tools for Bitcoin traders',
    features: [
      'Dashboard (view only)',
      'Portfolio tracking',
      'Market data real-time',
      'Swap',
      'Ordinals/Runes viewer',
      'Basic tax reports',
      'Arbitrage scanner',
      'AI analytics (CYPHER AI)',
      'Alerts (unlimited)',
      'Paper trading',
    ],
    limits: { maxAlerts: -1, paperTrading: true, aiAgent: false },
  },
  trader: {
    id: 'trader',
    name: 'Trader',
    price: 79,
    description: 'Advanced tools for serious traders',
    features: [
      'Dashboard (view only)',
      'Portfolio tracking',
      'Market data real-time',
      'Swap',
      'Ordinals/Runes viewer',
      'Basic tax reports',
      'Arbitrage scanner',
      'AI analytics (CYPHER AI)',
      'Alerts (unlimited)',
      'Paper trading',
      'Neural predictions',
      'Smart Money Concepts',
      'Whale tracking',
    ],
    limits: { maxAlerts: -1, paperTrading: true, aiAgent: false },
  },
  hacker_yields: {
    id: 'hacker_yields',
    name: 'Hacker Yields',
    price: 149,
    description: 'Full autonomous trading suite',
    features: [
      'Dashboard (view only)',
      'Portfolio tracking',
      'Market data real-time',
      'Swap',
      'Ordinals/Runes viewer',
      'Basic tax reports',
      'Arbitrage scanner',
      'AI analytics (CYPHER AI)',
      'Alerts (unlimited)',
      'Paper trading',
      'Neural predictions',
      'Smart Money Concepts',
      'Whale tracking',
      'AI Trading Agent',
      'Multi-agent consensus',
      'Auto-compound',
      'MEV protection',
    ],
    limits: { maxAlerts: -1, paperTrading: true, aiAgent: true },
  },
}

export const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  free: 0,
  explorer: 1,
  trader: 2,
  hacker_yields: 3,
}

/**
 * Check if a user's tier grants access to a required tier level.
 */
export function tierHasAccess(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  return (TIER_HIERARCHY[userTier] ?? 0) >= (TIER_HIERARCHY[requiredTier] ?? 0)
}

/**
 * Feature-to-minimum-tier mapping for granular access control.
 */
export const FEATURE_TIER_MAP: Record<string, SubscriptionTier> = {
  dashboard: 'free',
  portfolio: 'explorer',
  market_data: 'explorer',
  swap: 'explorer',
  ordinals_runes: 'explorer',
  tax_reports: 'explorer',
  arbitrage: 'explorer',
  ai_analytics: 'explorer',
  alerts_unlimited: 'explorer',
  paper_trading: 'explorer',
  cypher_ai: 'explorer',
  neural_predictions: 'trader',
  smart_money: 'trader',
  whale_tracking: 'trader',
  ai_trading_agent: 'hacker_yields',
  multi_agent: 'hacker_yields',
  auto_compound: 'hacker_yields',
  mev_protection: 'hacker_yields',
}

/**
 * Check if a tier has access to a specific feature.
 */
export function tierHasFeature(userTier: SubscriptionTier, feature: string): boolean {
  const requiredTier = FEATURE_TIER_MAP[feature]
  if (!requiredTier) return true
  return tierHasAccess(userTier, requiredTier)
}
