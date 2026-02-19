/**
 * 🌊 HYPERLIQUID INTEGRATION
 * Integration layer for Hyperliquid DEX with fee redirection
 * Handles trade routing, referral tracking, and fee collection
 */

import { CYPHER_REDIRECTION_FEE_RATE } from '@/app/api/trade/route'

// Hyperliquid API configuration
const HYPERLIQUID_API_BASE = 'https://api.hyperliquid.xyz'
const HYPERLIQUID_TESTNET_API = 'https://api.hyperliquid-testnet.xyz'

// CYPHER referral configuration
const CYPHER_REFERRAL_CONFIG = {
  referralCode: 'CYPHER',
  integrationId: 'cypher-ordi-future-v3',
  feeSharePercentage: 0.35, // Our 0.35% fee
  hyperliquidBaseUrl: 'https://app.hyperliquid.xyz',
  trackingParams: {
    source: 'cypher',
    medium: 'trading_terminal',
    campaign: 'fee_redirection'
  }
}

interface HyperliquidTradeParams {
  tokenIn: string
  tokenOut: string
  amountIn: string
  userAddress: string
  slippageTolerance: number
  deadline?: number
  network?: string
}

interface HyperliquidQuote {
  amountOut: string
  priceImpact: number
  route: string[]
  gasEstimate: number
  executionTime: number
  hyperliquidFee: number
  cypherFee: number
  totalFees: number
  redirectUrl: string
  referralCode: string
}

interface HyperliquidTradeResult {
  success: boolean
  txHash?: string
  amountOut?: string
  cypherFeeCollected: number
  hyperliquidFeeShared: number
  referralTracking: {
    code: string
    timestamp: number
    userId?: string
    volume: number
  }
  error?: string
}

export class HyperliquidIntegration {
  private apiUrl: string
  private isTestnet: boolean

  constructor(testnet = false) {
    this.isTestnet = testnet
    this.apiUrl = testnet ? HYPERLIQUID_TESTNET_API : HYPERLIQUID_API_BASE
  }

  /**
   * Get trading quote from Hyperliquid with CYPHER fee integration
   */
  async getQuote(params: HyperliquidTradeParams): Promise<HyperliquidQuote> {
    try {
      // Calculate CYPHER fee
      const cypherFee = this.calculateCypherFee(params.amountIn, params.tokenIn)
      
      // Get Hyperliquid quote
      const hyperliquidQuote = await this.fetchHyperliquidQuote(params)
      
      // Calculate total fees including our redirection fee
      const totalFees = hyperliquidQuote.hyperliquidFee + cypherFee.amountUSD
      
      // Generate referral URL with tracking
      const redirectUrl = this.generateReferralUrl(params)
      
      return {
        amountOut: hyperliquidQuote.amountOut,
        priceImpact: hyperliquidQuote.priceImpact,
        route: hyperliquidQuote.route,
        gasEstimate: hyperliquidQuote.gasEstimate,
        executionTime: hyperliquidQuote.executionTime,
        hyperliquidFee: hyperliquidQuote.hyperliquidFee,
        cypherFee: cypherFee.amountUSD,
        totalFees,
        redirectUrl,
        referralCode: CYPHER_REFERRAL_CONFIG.referralCode
      }
    } catch (error) {
      console.error('Hyperliquid quote error:', error)
      throw new Error('Failed to get Hyperliquid quote')
    }
  }

  /**
   * Execute trade through Hyperliquid with fee redirection
   */
  async executeTrade(params: HyperliquidTradeParams): Promise<HyperliquidTradeResult> {
    try {
      // Pre-trade fee calculation and collection
      const cypherFee = this.calculateCypherFee(params.amountIn, params.tokenIn)
      
      // Collect CYPHER fee before trade execution
      const feeCollectionResult = await this.collectCypherFee(cypherFee, params)
      
      if (!feeCollectionResult.success) {
        throw new Error('Fee collection failed')
      }

      // Execute trade on Hyperliquid
      const tradeResult = await this.executeHyperliquidTrade(params)
      
      // Track referral and fee sharing
      const referralTracking = await this.trackReferral(params, tradeResult)
      
      // Calculate shared fees from Hyperliquid
      const hyperliquidFeeShared = this.calculateFeeSharing(tradeResult.volume)
      
      return {
        success: true,
        txHash: tradeResult.txHash,
        amountOut: tradeResult.amountOut,
        cypherFeeCollected: cypherFee.amountUSD,
        hyperliquidFeeShared,
        referralTracking
      }
    } catch (error) {
      console.error('Hyperliquid trade execution error:', error)
      return {
        success: false,
        cypherFeeCollected: 0,
        hyperliquidFeeShared: 0,
        referralTracking: {
          code: CYPHER_REFERRAL_CONFIG.referralCode,
          timestamp: Date.now(),
          volume: 0
        },
        error: error instanceof Error ? error.message : 'Trade execution failed'
      }
    }
  }

  /**
   * Calculate CYPHER redirection fee
   */
  private calculateCypherFee(amountIn: string, tokenIn: string) {
    const tokenPrices: Record<string, number> = {
      'ETH': 2850, 'WETH': 2850,
      'BTC': 45000, 'WBTC': 45000,
      'USDC': 1, 'USDT': 1, 'DAI': 1,
      'SOL': 95, 'WSOL': 95
    }
    
    const amount = parseFloat(amountIn)
    const tokenPrice = tokenPrices[tokenIn.toUpperCase()] || 1
    const amountUSD = amount * tokenPrice
    const feeAmountUSD = amountUSD * CYPHER_REDIRECTION_FEE_RATE
    const feeAmount = feeAmountUSD / tokenPrice
    
    return {
      amount: feeAmount.toString(),
      amountUSD: feeAmountUSD,
      token: tokenIn,
      percentage: CYPHER_REDIRECTION_FEE_RATE * 100
    }
  }

  /**
   * Fetch quote from Hyperliquid API
   */
  private async fetchHyperliquidQuote(params: HyperliquidTradeParams) {
    // Mock implementation - replace with actual Hyperliquid API calls
    const response = await fetch(`${this.apiUrl}/info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'quote',
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        slippage: params.slippageTolerance
      })
    })

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`)
    }

    // Mock response structure
    return {
      amountOut: (parseFloat(params.amountIn) * 0.998).toString(), // 0.2% slippage
      priceImpact: 0.15,
      route: [params.tokenIn, params.tokenOut],
      gasEstimate: 150000,
      executionTime: 2000,
      hyperliquidFee: parseFloat(params.amountIn) * 2850 * 0.001 // 0.1% Hyperliquid fee
    }
  }

  /**
   * Execute trade on Hyperliquid
   */
  private async executeHyperliquidTrade(params: HyperliquidTradeParams) {
    // Mock trade execution - replace with actual Hyperliquid integration
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const volume = parseFloat(params.amountIn) * 2850 // Convert to USD
    
    return {
      txHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      amountOut: (parseFloat(params.amountIn) * 0.998).toString(),
      volume,
      success: true
    }
  }

  /**
   * Collect CYPHER fee before trade execution
   */
  private async collectCypherFee(cypherFee: any, params: HyperliquidTradeParams) {
    try {
      // In production, this would interact with smart contracts or payment systems
      
      // Mock fee collection
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Log fee collection for analytics
      await this.logFeeCollection({
        amount: cypherFee.amount,
        amountUSD: cypherFee.amountUSD,
        token: cypherFee.token,
        userAddress: params.userAddress,
        timestamp: Date.now(),
        network: params.network || 'ethereum',
        source: 'hyperliquid_redirection'
      })
      
      return { success: true }
    } catch (error) {
      console.error('Fee collection error:', error)
      return { success: false, error }
    }
  }

  /**
   * Track referral for fee sharing
   */
  private async trackReferral(params: HyperliquidTradeParams, tradeResult: any) {
    const referralData = {
      code: CYPHER_REFERRAL_CONFIG.referralCode,
      timestamp: Date.now(),
      userId: params.userAddress,
      volume: tradeResult.volume,
      txHash: tradeResult.txHash,
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      amountOut: tradeResult.amountOut
    }
    
    // Send referral tracking to analytics
    try {
      await fetch('/api/analytics/referrals/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(referralData)
      })
    } catch (error) {
      console.error('Referral tracking error:', error)
    }
    
    return referralData
  }

  /**
   * Calculate fee sharing from Hyperliquid
   */
  private calculateFeeSharing(volume: number): number {
    // Hyperliquid typically shares 10-30% of their fees with referrers
    const hyperliquidFeeRate = 0.001 // 0.1% typical DEX fee
    const feeShareRate = 0.20 // 20% sharing rate
    
    return volume * hyperliquidFeeRate * feeShareRate
  }

  /**
   * Generate referral URL with tracking parameters
   */
  private generateReferralUrl(params: HyperliquidTradeParams): string {
    const baseUrl = CYPHER_REFERRAL_CONFIG.hyperliquidBaseUrl
    const referralCode = CYPHER_REFERRAL_CONFIG.referralCode
    const tracking = CYPHER_REFERRAL_CONFIG.trackingParams
    
    const urlParams = new URLSearchParams({
      ref: referralCode,
      from: params.tokenIn,
      to: params.tokenOut,
      amount: params.amountIn,
      utm_source: tracking.source,
      utm_medium: tracking.medium,
      utm_campaign: tracking.campaign,
      integration_id: CYPHER_REFERRAL_CONFIG.integrationId,
      timestamp: Date.now().toString()
    })
    
    return `${baseUrl}/trade?${urlParams.toString()}`
  }

  /**
   * Log fee collection for analytics and compliance
   */
  private async logFeeCollection(feeData: any) {
    try {
      await fetch('/api/fees/track-redirect/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feeData)
      })
    } catch (error) {
      console.error('Fee logging error:', error)
    }
  }

  /**
   * Get Hyperliquid market data
   */
  async getMarketData(symbol: string) {
    try {
      const response = await fetch(`${this.apiUrl}/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'meta'
        })
      })

      if (!response.ok) {
        throw new Error(`Market data error: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Market data error:', error)
      throw error
    }
  }

  /**
   * Get user's Hyperliquid portfolio
   */
  async getUserPortfolio(userAddress: string) {
    try {
      const response = await fetch(`${this.apiUrl}/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'clearinghouseState',
          user: userAddress
        })
      })

      if (!response.ok) {
        throw new Error(`Portfolio error: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Portfolio error:', error)
      throw error
    }
  }

  /**
   * Get referral statistics
   */
  async getReferralStats(referralCode: string = CYPHER_REFERRAL_CONFIG.referralCode) {
    try {
      // This would call Hyperliquid's referral API
      const response = await fetch(`${this.apiUrl}/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'referralStats',
          code: referralCode
        })
      })

      if (!response.ok) {
        throw new Error(`Referral stats error: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Referral stats error:', error)
      return {
        totalVolume: 0,
        totalReferrals: 0,
        feesEarned: 0,
        activeReferrals: 0
      }
    }
  }
}

// Export singleton instance
export const hyperliquidIntegration = new HyperliquidIntegration()

// Export utilities
export const HyperliquidUtils = {
  formatTradeUrl: (tokenIn: string, tokenOut: string, amount?: string) => {
    const params = new URLSearchParams({
      ref: CYPHER_REFERRAL_CONFIG.referralCode,
      from: tokenIn,
      to: tokenOut,
      ...(amount && { amount })
    })
    return `${CYPHER_REFERRAL_CONFIG.hyperliquidBaseUrl}/trade?${params.toString()}`
  },

  calculateFeeRedirection: (tradeVolume: number) => {
    return tradeVolume * CYPHER_REDIRECTION_FEE_RATE
  },

  validateTradeParams: (params: HyperliquidTradeParams) => {
    const errors: string[] = []
    
    if (!params.tokenIn) errors.push('Input token is required')
    if (!params.tokenOut) errors.push('Output token is required')
    if (!params.amountIn || parseFloat(params.amountIn) <= 0) errors.push('Valid amount is required')
    if (!params.userAddress) errors.push('User address is required')
    if (params.slippageTolerance < 0 || params.slippageTolerance > 50) {
      errors.push('Slippage tolerance must be between 0-50%')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

export default HyperliquidIntegration