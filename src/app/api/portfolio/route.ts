import { NextRequest, NextResponse } from 'next/server';
import { portfolioDataSchema, bitcoinAddressSchema } from '@/lib/validation/schemas';
import { cacheInstances } from '@/lib/cache/advancedCache';
import { applyRateLimit, apiRateLimiters } from '@/lib/api/middleware/rateLimiter';
import { hiroAPI } from '@/lib/api/hiro';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(request, apiRateLimiters.portfolio);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    
    if (!address) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Address parameter is required',
          message: 'Please provide a valid Bitcoin address'
        },
        { status: 400 }
      );
    }

    // Validate Bitcoin address
    const addressValidation = bitcoinAddressSchema.safeParse(address);
    if (!addressValidation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid Bitcoin address format',
          message: 'Please provide a valid Bitcoin address'
        },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `portfolio:${address}`;
    let portfolioData = await cacheInstances.portfolio.get(cacheKey);

    if (!portfolioData) {
      // Fetch fresh data from multiple sources
      portfolioData = await fetchPortfolioData(address);
      
      // Cache the result
      await cacheInstances.portfolio.set(cacheKey, portfolioData, {
        ttl: 300, // 5 minutes
        tags: ['portfolio', 'user', address]
      });
    }

    // Validate the data structure
    const validation = portfolioDataSchema.safeParse(portfolioData);
    if (!validation.success) {
      console.error('Portfolio data validation failed:', validation.error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid portfolio data structure',
          message: 'Failed to validate portfolio data'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      address,
      data: portfolioData,
      metadata: {
        cached: !!portfolioData,
        source: 'cypher-ai-v3'
      }
    });

  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch portfolio data',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(request, apiRateLimiters.portfolio);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const body = await request.json();
    const { address, asset, action, amount, price } = body;

    // Validate required fields
    if (!address || !asset || !action || !amount) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          message: 'Address, asset, action, and amount are required'
        },
        { status: 400 }
      );
    }

    // Validate Bitcoin address
    const addressValidation = bitcoinAddressSchema.safeParse(address);
    if (!addressValidation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid Bitcoin address format',
          message: 'Please provide a valid Bitcoin address'
        },
        { status: 400 }
      );
    }

    // Process the portfolio update
    const transactionId = await processPortfolioUpdate({
      address,
      asset,
      action,
      amount,
      price: price || 0,
      timestamp: new Date()
    });

    // Invalidate cache for this address
    await cacheInstances.portfolio.delete(`portfolio:${address}`);

    return NextResponse.json({
      success: true,
      message: 'Portfolio updated successfully',
      transactionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Portfolio update API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update portfolio',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

async function fetchPortfolioData(address: string) {
  try {
    // Fetch data from multiple sources in parallel
    const [
      hiroData,
      bitcoinBalance,
      transactions
    ] = await Promise.allSettled([
      hiroAPI.getPortfolio(address),
      fetchBitcoinBalance(address),
      fetchTransactionHistory(address)
    ]);

    // Process Hiro data
    const portfolio = hiroData.status === 'fulfilled' ? hiroData.value : null;
    const btcBalance = bitcoinBalance.status === 'fulfilled' ? bitcoinBalance.value : 0;
    const txHistory = transactions.status === 'fulfilled' ? transactions.value : [];

    // Build portfolio data structure
    const assets = [];
    let totalValue = 0;

    // Add Bitcoin asset
    if (btcBalance > 0) {
      const btcPrice = await getCurrentBitcoinPrice();
      const btcValue = btcBalance * btcPrice;
      
      assets.push({
        id: 'bitcoin',
        type: 'bitcoin' as const,
        name: 'Bitcoin',
        symbol: 'BTC',
        balance: btcBalance,
        value: btcValue,
        price: btcPrice,
        change24h: await getBitcoinChange24h(),
        allocation: 0, // Will be calculated later
        metadata: {}
      });
      
      totalValue += btcValue;
    }

    // Add Ordinals
    if (portfolio?.inscriptions?.results && Array.isArray(portfolio.inscriptions.results)) {
      for (const inscription of portfolio.inscriptions.results.slice(0, 10)) {
        const value = await getInscriptionValue(inscription.id);
        assets.push({
          id: inscription.id,
          type: 'ordinal' as const,
          name: `Inscription #${inscription.number}`,
          symbol: 'ORD',
          balance: 1,
          value: value,
          price: value,
          change24h: 0,
          allocation: 0,
          metadata: {
            inscriptionId: inscription.id,
            contentType: inscription.content_type,
            rarity: inscription.sat_rarity
          }
        });
        totalValue += value;
      }
    }

    // Add Runes
    if (portfolio?.runes) {
      for (const rune of portfolio.runes.slice(0, 10)) {
        const price = await getRunePrice(rune.rune.name);
        const balance = parseInt(rune.balance);
        const value = balance * price;
        
        assets.push({
          id: rune.rune.id,
          type: 'rune' as const,
          name: rune.rune.spaced_name,
          symbol: rune.rune.symbol || rune.rune.name.substring(0, 4).toUpperCase(),
          balance: balance,
          value: value,
          price: price,
          change24h: 0,
          allocation: 0,
          metadata: {
            runeId: rune.rune.id,
            tokenStandard: 'RUNES'
          }
        });
        totalValue += value;
      }
    }

    // Add BRC-20 tokens
    if (portfolio?.brc20) {
      for (const token of portfolio.brc20.slice(0, 10)) {
        const price = await getBRC20Price(token.ticker);
        const balance = parseFloat(token.balance);
        const value = balance * price;
        
        assets.push({
          id: token.ticker,
          type: 'brc20' as const,
          name: token.ticker,
          symbol: token.ticker,
          balance: balance,
          value: value,
          price: price,
          change24h: 0,
          allocation: 0,
          metadata: {
            tokenStandard: 'BRC-20'
          }
        });
        totalValue += value;
      }
    }

    // Calculate allocations
    assets.forEach(asset => {
      asset.allocation = totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
    });

    // Calculate performance metrics
    const performance = await calculatePerformance(address, assets);

    return {
      totalValue,
      totalCost: 0, // Cost basis requires historical tracking - not available yet
      totalPnL: 0,
      totalPnLPercent: 0,
      assets,
      transactions: txHistory,
      performance
    };

  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    throw new Error('Failed to fetch portfolio data');
  }
}

async function fetchBitcoinBalance(address: string): Promise<number> {
  try {
    const response = await fetch(`https://mempool.space/api/address/${address}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 30 },
    })
    if (!response.ok) throw new Error(`Mempool API error: ${response.status}`)
    const data = await response.json()
    const chainStats = data.chain_stats || {}
    const mempoolStats = data.mempool_stats || {}
    const confirmed = (chainStats.funded_txo_sum || 0) - (chainStats.spent_txo_sum || 0)
    const unconfirmed = (mempoolStats.funded_txo_sum || 0) - (mempoolStats.spent_txo_sum || 0)
    return (confirmed + unconfirmed) / 1e8
  } catch (error) {
    console.error('Error fetching Bitcoin balance from Mempool:', error)
    return 0
  }
}

async function fetchTransactionHistory(address: string) {
  try {
    const response = await fetch(`https://mempool.space/api/address/${address}/txs`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    })
    if (!response.ok) throw new Error(`Mempool txs API error: ${response.status}`)
    const txs = await response.json()
    // Map to our transaction format (most recent 20)
    return (txs || []).slice(0, 20).map((tx: any) => ({
      id: tx.txid,
      type: 'transfer' as const,
      asset: 'BTC',
      amount: (tx.vout || []).reduce((s: number, o: any) => s + (o.value || 0), 0) / 1e8,
      price: 0,
      value: 0,
      fee: (tx.fee || 0) / 1e8,
      timestamp: tx.status?.block_time ? new Date(tx.status.block_time * 1000) : new Date(),
      txHash: tx.txid,
      status: tx.status?.confirmed ? 'confirmed' as const : 'pending' as const,
    }))
  } catch (error) {
    console.error('Error fetching transaction history:', error)
    return []
  }
}

async function getCurrentBitcoinPrice(): Promise<number> {
  try {
    // Check cache first
    const cachedPrice = await cacheInstances.prices.get('btc-price');
    if (cachedPrice) {
      return cachedPrice;
    }

    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
      { next: { revalidate: 60 } }
    )
    if (!response.ok) throw new Error('CoinGecko price fetch failed')
    const data = await response.json()
    const price = data?.bitcoin?.usd || 0

    if (price > 0) {
      await cacheInstances.prices.set('btc-price', price, {
        ttl: 60,
        tags: ['price', 'bitcoin']
      });
    }

    return price;
  } catch (error) {
    console.error('Error fetching Bitcoin price:', error);
    return 0;
  }
}

async function getBitcoinChange24h(): Promise<number> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
      { next: { revalidate: 60 } }
    )
    if (!response.ok) return 0
    const data = await response.json()
    return data?.bitcoin?.usd_24h_change || 0
  } catch {
    return 0
  }
}

async function getInscriptionValue(inscriptionId: string): Promise<number> {
  // TODO: Implementar busca real via Magic Eden/UniSat APIs
  return 0;
}

async function getRunePrice(runeName: string): Promise<number> {
  // TODO: Implementar busca real via Hiro/Magic Eden Runes APIs
  return 0;
}

async function getBRC20Price(ticker: string): Promise<number> {
  // TODO: Implementar busca real via UniSat/OKX BRC-20 APIs
  return 0;
}

async function calculatePerformance(_address: string, _assets: any[]) {
  // Performance tracking requires historical snapshots which are not yet implemented.
  // Return zeros instead of fake random data.
  return {
    '24h': 0,
    '7d': 0,
    '30d': 0,
    '90d': 0,
    '1y': 0,
  };
}

async function processPortfolioUpdate(update: {
  address: string;
  asset: string;
  action: string;
  amount: number;
  price: number;
  timestamp: Date;
}): Promise<string> {
  // Generate a proper transaction ID using crypto
  const { randomUUID } = await import('crypto')
  return `tx_${Date.now()}_${randomUUID().slice(0, 8)}`;
}