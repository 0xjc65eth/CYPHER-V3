/**
 * Stripe Subscription Configuration
 * Defines tiers, pricing, features, and access control helpers.
 */

export type SubscriptionTier = 'free' | 'explorer' | 'trader' | 'hacker_yields'

export interface TierConfig {
  id: SubscriptionTier
  name: string
  price: number
  stripePriceId: string
  description: string
  features: string[]
  limits: Record<string, number | boolean>
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    stripePriceId: '',
    description: 'Basic dashboard access',
    features: ['Dashboard (view only)'],
    limits: { maxAlerts: 0, paperTrading: false, aiAgent: false },
  },
  explorer: {
    id: 'explorer',
    name: 'Explorer',
    price: 29,
    stripePriceId: process.env.STRIPE_PRICE_EXPLORER || '',
    description: 'Essential tools for crypto tracking',
    features: [
      'Dashboard (view only)',
      'Portfolio tracking',
      'Market data real-time',
      'Swap',
      'Ordinals/Runes viewer',
      'Basic tax reports',
    ],
    limits: { maxAlerts: 5, paperTrading: false, aiAgent: false },
  },
  trader: {
    id: 'trader',
    name: 'Trader',
    price: 79,
    stripePriceId: process.env.STRIPE_PRICE_TRADER || '',
    description: 'Advanced analytics & trading tools',
    features: [
      'Dashboard (view only)',
      'Portfolio tracking',
      'Market data real-time',
      'Swap',
      'Ordinals/Runes viewer',
      'Basic tax reports',
      'Arbitrage scanner',
      'AI analytics (CYPHER AI)',
      'Neural predictions',
      'Smart Money Concepts',
      'Alerts (unlimited)',
      'Paper trading',
    ],
    limits: { maxAlerts: -1, paperTrading: true, aiAgent: false },
  },
  hacker_yields: {
    id: 'hacker_yields',
    name: 'Hacker Yields',
    price: 149,
    stripePriceId: process.env.STRIPE_PRICE_HACKER_YIELDS || '',
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
      'Neural predictions',
      'Smart Money Concepts',
      'Alerts (unlimited)',
      'Paper trading',
      'AI Trading Agent',
      'Multi-agent consensus',
      'Auto-compound',
      'MEV protection',
      'Whale tracking',
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
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier]
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
  arbitrage: 'trader',
  ai_analytics: 'trader',
  neural_predictions: 'trader',
  smart_money: 'trader',
  alerts_unlimited: 'trader',
  paper_trading: 'trader',
  ai_trading_agent: 'hacker_yields',
  multi_agent: 'hacker_yields',
  auto_compound: 'hacker_yields',
  mev_protection: 'hacker_yields',
  whale_tracking: 'hacker_yields',
}

/**
 * Check if a tier has access to a specific feature.
 */
export function tierHasFeature(userTier: SubscriptionTier, feature: string): boolean {
  const requiredTier = FEATURE_TIER_MAP[feature]
  if (!requiredTier) return true // Unknown features default to accessible
  return tierHasAccess(userTier, requiredTier)
}
