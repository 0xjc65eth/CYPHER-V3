/**
 * CYPHER V3 - DEX Referral Codes Configuration
 *
 * Referral programs provide ADDITIONAL passive income on top of platform fees.
 * Each DEX has its own referral system with different commission rates.
 * These are free to use and require no smart contracts.
 */

export const REFERRAL_CODES = {
  /**
   * THORChain Affiliate
   * Revenue: 0.5% of swap output (configurable via affiliate_bps)
   * Registration: https://thorchain.net/affiliates
   * Fee collected natively by THORChain protocol
   */
  thorchain: {
    code: process.env.THORCHAIN_AFFILIATE_CODE || 'cy',
    address: process.env.THORCHAIN_AFFILIATE_ADDRESS || '358ecZEHxZQJGj6fvoy7bdTSvw64WWgGFb',
    defaultBps: 50, // 0.5%
  },

  /**
   * Jupiter (Solana)
   * Revenue: 0.1-0.35% via platformFeeBps
   * Docs: https://station.jup.ag/docs/apis/swap-api#platform-fee
   * Fee collected natively by Jupiter - sent to feeAccount ATA
   */
  jupiter: {
    platformFeeBps: 35, // 0.35%
    feeAccount: '4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH',
    referralAccount: process.env.JUPITER_REFERRAL_ACCOUNT || '',
  },

  /**
   * Hyperliquid
   * Revenue: Variable referral commission
   * Registration: https://app.hyperliquid.xyz/referral
   */
  hyperliquid: {
    code: process.env.HYPERLIQUID_REFERRAL_CODE || 'CYPHER',
  },

  /**
   * 1inch (EVM)
   * Revenue: 0.3% via referrer fee
   * Docs: https://docs.1inch.io/docs/aggregation-protocol/api/swap-params
   * Fee collected natively by 1inch aggregator
   */
  oneInch: {
    referrerAddress: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
    feePercent: 0.3, // 0.3%
  },

  /**
   * Paraswap (EVM)
   * Revenue: 0.3% via partner fee
   * Docs: https://developers.paraswap.network/api/get-rate
   */
  paraswap: {
    partner: 'cypher',
    partnerAddress: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
    partnerFeeBps: 30, // 0.3%
  },

  /**
   * GMX (Arbitrum/Avalanche)
   * Revenue: 5-15% of trading fees from referred users
   * Registration: https://app.gmx.io/#/referrals
   */
  gmx: {
    code: process.env.GMX_REFERRAL_CODE || 'cypher',
  },

  /**
   * Kwenta (Optimism)
   * Revenue: Variable referral commission
   * Registration: https://kwenta.eth.limo/referrals
   */
  kwenta: {
    code: process.env.KWENTA_REFERRAL_CODE || 'cypher',
  },
} as const;

/**
 * Get referral params for a specific protocol
 */
export function getReferralParams(protocol: string, isPremium: boolean = false) {
  if (isPremium) {
    return { enabled: false, reason: 'Premium users have 0% fees' };
  }

  switch (protocol.toLowerCase()) {
    case 'thorchain':
      return {
        enabled: true,
        affiliateCode: REFERRAL_CODES.thorchain.code,
        affiliateAddress: REFERRAL_CODES.thorchain.address,
        affiliateBps: REFERRAL_CODES.thorchain.defaultBps,
      };
    case 'jupiter':
      return {
        enabled: true,
        platformFeeBps: REFERRAL_CODES.jupiter.platformFeeBps,
        feeAccount: REFERRAL_CODES.jupiter.feeAccount,
      };
    case '1inch':
    case 'oneinch':
      return {
        enabled: true,
        referrerAddress: REFERRAL_CODES.oneInch.referrerAddress,
        fee: REFERRAL_CODES.oneInch.feePercent,
      };
    case 'paraswap':
      return {
        enabled: true,
        partner: REFERRAL_CODES.paraswap.partner,
        partnerAddress: REFERRAL_CODES.paraswap.partnerAddress,
        partnerFeeBps: REFERRAL_CODES.paraswap.partnerFeeBps,
      };
    case 'gmx':
      return {
        enabled: true,
        referralCode: REFERRAL_CODES.gmx.code,
      };
    default:
      return { enabled: false, reason: 'Protocol not supported for referrals' };
  }
}
