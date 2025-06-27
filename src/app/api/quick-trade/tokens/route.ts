import { NextRequest, NextResponse } from 'next/server'

// Mock token data - in production this would come from multiple sources
const TOKEN_REGISTRY = {
  // Ethereum tokens
  1: [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      logoUri: '/icons/ethereum.png',
      chainId: 1,
      isNative: true,
      price: 2350.45,
      priceChange24h: 2.45,
      volume24h: 8500000000,
      marketCap: 282000000000,
      verified: true,
      coingeckoId: 'ethereum'
    },
    {
      address: '0xA0b86a33E6F8b16dcE3d16b0e4f3b8De1A9e1C6C',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoUri: '/icons/usdc.png',
      chainId: 1,
      price: 1.0,
      priceChange24h: 0.01,
      volume24h: 2400000000,
      marketCap: 25000000000,
      verified: true,
      coingeckoId: 'usd-coin'
    },
    {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      logoUri: '/icons/usdt.png',
      chainId: 1,
      price: 1.0,
      priceChange24h: -0.02,
      volume24h: 1800000000,
      marketCap: 96000000000,
      verified: true,
      coingeckoId: 'tether'
    }
  ],
  // Arbitrum tokens
  42161: [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      logoUri: '/icons/ethereum.png',
      chainId: 42161,
      isNative: true,
      price: 2350.45,
      priceChange24h: 2.45,
      volume24h: 3200000000,
      verified: true,
      coingeckoId: 'ethereum'
    },
    {
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      symbol: 'USDC',
      name: 'USD Coin (Arbitrum)',
      decimals: 6,
      logoUri: '/icons/usdc.png',
      chainId: 42161,
      price: 1.0,
      priceChange24h: 0.0,
      volume24h: 580000000,
      verified: true,
      coingeckoId: 'usd-coin'
    }
  ],
  // Solana tokens
  101: [
    {
      address: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      name: 'Solana',
      decimals: 9,
      logoUri: '/icons/solana.png',
      chainId: 101,
      isNative: true,
      price: 98.76,
      priceChange24h: 5.23,
      volume24h: 1200000000,
      marketCap: 42000000000,
      verified: true,
      coingeckoId: 'solana'
    },
    {
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      name: 'USD Coin (Solana)',
      decimals: 6,
      logoUri: '/icons/usdc.png',
      chainId: 101,
      price: 1.0,
      priceChange24h: 0.0,
      volume24h: 580000000,
      verified: true,
      coingeckoId: 'usd-coin'
    }
  ],
  // Bitcoin/Runes (chainId 0)
  0: [
    {
      address: 'UNCOMMON•GOODS',
      symbol: 'GOODS',
      name: 'Uncommon Goods',
      decimals: 0,
      logoUri: '/icons/runes.png',
      chainId: 0,
      price: 0.0024,
      priceChange24h: 12.5,
      volume24h: 45000,
      verified: true,
      description: 'Popular Bitcoin Rune'
    },
    {
      address: 'DOG•GO•TO•THE•MOON',
      symbol: 'DOG',
      name: 'Dog Go To The Moon',
      decimals: 0,
      logoUri: '/icons/runes.png',
      chainId: 0,
      price: 0.0018,
      priceChange24h: -5.2,
      volume24h: 32000,
      verified: true,
      description: 'Meme Bitcoin Rune'
    }
  ]
}

// GET /api/quick-trade/tokens - Get tokens for a specific chain
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const chainId = searchParams.get('chainId')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const verified = searchParams.get('verified') === 'true'

    if (!chainId) {
      return NextResponse.json({ 
        error: 'chainId parameter is required' 
      }, { status: 400 })
    }

    const numericChainId = parseInt(chainId)
    let tokens = TOKEN_REGISTRY[numericChainId as keyof typeof TOKEN_REGISTRY] || []

    // Filter by search query
    if (search) {
      const query = search.toLowerCase()
      tokens = tokens.filter(token => 
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
      )
    }

    // Filter by verified status
    if (verified) {
      tokens = tokens.filter(token => token.verified)
    }

    // Limit results
    tokens = tokens.slice(0, limit)

    // Add additional metadata
    const enhancedTokens = tokens.map(token => ({
      ...token,
      // Add trending status based on volume and price change
      isTrending: (token.volume24h || 0) > 100000000 && (token.priceChange24h || 0) > 5,
      // Add popularity score
      popularityScore: calculatePopularityScore(token),
      // Add last updated timestamp
      lastUpdated: Date.now()
    }))

    // Sort by popularity
    enhancedTokens.sort((a, b) => b.popularityScore - a.popularityScore)

    return NextResponse.json({
      success: true,
      data: {
        tokens: enhancedTokens,
        total: enhancedTokens.length,
        chainId: numericChainId,
        timestamp: Date.now()
      }
    })

  } catch (error) {
    console.error('Token API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch tokens',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/quick-trade/tokens - Add custom token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, chainId, symbol, name, decimals, logoUri } = body

    // Validate required fields
    if (!address || !chainId || !symbol || !name || decimals === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: address, chainId, symbol, name, decimals' 
      }, { status: 400 })
    }

    // Validate address format
    if (!isValidAddress(address, chainId)) {
      return NextResponse.json({ 
        error: 'Invalid token address format' 
      }, { status: 400 })
    }

    // Create new token entry
    const newToken = {
      address,
      symbol: symbol.toUpperCase(),
      name,
      decimals: parseInt(decimals),
      logoUri: logoUri || '/icons/default-token.png',
      chainId: parseInt(chainId),
      verified: false, // Custom tokens start unverified
      price: 0,
      priceChange24h: 0,
      volume24h: 0,
      isCustom: true,
      addedAt: Date.now()
    }

    // In production, this would be saved to a database
    // For now, we'll just return the token data
    
    return NextResponse.json({
      success: true,
      data: {
        token: newToken,
        message: 'Token added successfully'
      }
    })

  } catch (error) {
    console.error('Add token error:', error)
    return NextResponse.json({ 
      error: 'Failed to add token',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Calculate popularity score based on various metrics
function calculatePopularityScore(token: any): number {
  let score = 0
  
  // Market cap weight (40%)
  if (token.marketCap) {
    score += Math.log10(token.marketCap) * 4
  }
  
  // Volume weight (30%)
  if (token.volume24h) {
    score += Math.log10(token.volume24h) * 3
  }
  
  // Price change weight (15%)
  if (token.priceChange24h > 0) {
    score += Math.min(token.priceChange24h, 20) * 0.75
  }
  
  // Verification bonus (10%)
  if (token.verified) {
    score += 10
  }
  
  // Native token bonus (5%)
  if (token.isNative) {
    score += 5
  }
  
  return score
}

// Validate address format for different chains
function isValidAddress(address: string, chainId: number): boolean {
  try {
    switch (chainId) {
      case 1: // Ethereum
      case 42161: // Arbitrum
      case 10: // Optimism
      case 137: // Polygon
      case 8453: // Base
        // EVM address validation
        return /^0x[a-fA-F0-9]{40}$/.test(address)
      
      case 101: // Solana
        // Solana address validation (base58, 32-44 characters)
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
      
      case 0: // Bitcoin/Runes
        // Rune name validation or Bitcoin address
        return /^[A-Z•]{1,28}$/.test(address) || /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address)
      
      default:
        return false
    }
  } catch {
    return false
  }
}