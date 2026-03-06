/**
 * Subscription Configuration
 * Defines tiers, pricing, features, and access control helpers.
 * Payment: BTCPay Server (Bitcoin-only, self-custodial)
 */

export type SubscriptionTier = 'free' | 'pro' | 'elite'

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
  pro: {
    id: 'pro',
    name: 'Pro',
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
  elite: {
    id: 'elite',
    name: 'Elite',
    price: 99,
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
  pro: 1,
  elite: 2,
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
  portfolio: 'pro',
  market_data: 'pro',
  swap: 'pro',
  ordinals_runes: 'pro',
  tax_reports: 'pro',
  arbitrage: 'pro',
  ai_analytics: 'pro',
  alerts_unlimited: 'pro',
  paper_trading: 'pro',
  cypher_ai: 'pro',
  neural_predictions: 'elite',
  smart_money: 'elite',
  ai_trading_agent: 'elite',
  multi_agent: 'elite',
  auto_compound: 'elite',
  mev_protection: 'elite',
  whale_tracking: 'elite',
}

/**
 * Check if a tier has access to a specific feature.
 */
export function tierHasFeature(userTier: SubscriptionTier, feature: string): boolean {
  const requiredTier = FEATURE_TIER_MAP[feature]
  if (!requiredTier) return true
  return tierHasAccess(userTier, requiredTier)
}
