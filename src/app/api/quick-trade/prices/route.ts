import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for prices
const priceCache = new Map<string, { data: any; timestamp: number }>();
const PRICE_CACHE_TTL = 15000; // 15 seconds

// Common token addresses mapped to CoinGecko IDs
const TOKEN_COINGECKO_MAP: Record<string, string> = {
  // Ethereum
  '0x0000000000000000000000000000000000000000': 'ethereum',
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 'ethereum', // WETH
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 'usd-coin', // USDC
  '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'tether', // USDT
  // Solana
  'So11111111111111111111111111111111111111112': 'solana', // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'usd-coin', // USDC on Solana
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function getTokenPrices(tokenAddresses: string[]): Promise<Record<string, any>> {
  const prices: Record<string, any> = {};

  // Collect unique CoinGecko IDs
  const cgIds = new Set<string>();
  const addressToId: Record<string, string> = {};

  for (const addr of tokenAddresses) {
    const id = TOKEN_COINGECKO_MAP[addr];
    if (id) {
      cgIds.add(id);
      addressToId[addr] = id;
    }
  }

  if (cgIds.size === 0) return prices;

  // Check cache first
  const cacheKey = Array.from(cgIds).sort().join(',');
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
    for (const addr of tokenAddresses) {
      const id = addressToId[addr];
      if (id && cached.data[id]) {
        prices[addr] = cached.data[id];
      }
    }
    return prices;
  }

  try {
    const idsStr = Array.from(cgIds).join(',');
    const res = await fetchWithTimeout(
      `https://api.coingecko.com/api/v3/simple/price?ids=${idsStr}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
    );

    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = await res.json();

    // Build formatted results
    const formattedData: Record<string, any> = {};
    for (const [id, info] of Object.entries(data) as [string, any][]) {
      formattedData[id] = {
        price: info.usd || 0,
        priceChange24h: info.usd_24h_change || 0,
        volume24h: info.usd_24h_vol || 0,
        marketCap: info.usd_market_cap || 0,
        high24h: (info.usd || 0) * 1.02,
        low24h: (info.usd || 0) * 0.98,
        lastUpdated: Date.now(),
      };
    }

    // Update cache
    priceCache.set(cacheKey, { data: formattedData, timestamp: Date.now() });

    // Map back to addresses
    for (const addr of tokenAddresses) {
      const id = addressToId[addr];
      if (id && formattedData[id]) {
        prices[addr] = formattedData[id];
      }
    }
  } catch (err) {
    console.error('[QuickTrade] Price fetch failed:', err);
  }

  return prices;
}

// GET /api/quick-trade/prices - Get real-time prices
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tokens = searchParams.get('tokens')?.split(',') || [];
    const currency = searchParams.get('currency') || 'usd';

    if (tokens.length === 0) {
      return NextResponse.json({ error: 'tokens parameter is required' }, { status: 400 });
    }

    const prices = await getTokenPrices(tokens);

    return NextResponse.json({
      success: true,
      data: {
        prices,
        currency,
        timestamp: Date.now(),
        source: 'coingecko',
      },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' },
    });
  } catch (error) {
    console.error('[QuickTrade] Price API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch prices',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// POST /api/quick-trade/prices - Get quote for token pair
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenIn, tokenOut, amountIn, chainId, slippageTolerance = 1.0 } = body;

    if (!tokenIn || !tokenOut || !amountIn) {
      return NextResponse.json({ error: 'tokenIn, tokenOut, and amountIn are required' }, { status: 400 });
    }

    let quotes: any[] = [];

    // Try Jupiter for Solana (chainId 101)
    if (chainId === 101) {
      try {
        const jupRes = await fetchWithTimeout(
          `https://quote-api.jup.ag/v6/quote?inputMint=${tokenIn}&outputMint=${tokenOut}&amount=${Math.round(parseFloat(amountIn) * 1e9)}&slippageBps=${Math.round(slippageTolerance * 100)}`
        );
        if (jupRes.ok) {
          const jupData = await jupRes.json();
          quotes.push({
            dex: 'jupiter',
            inputAmount: amountIn,
            outputAmount: (parseInt(jupData.outAmount || '0') / 1e6).toString(),
            priceImpact: parseFloat(jupData.priceImpactPct || '0'),
            estimatedGas: '5000', // Solana tx fee in lamports
            route: jupData.routePlan?.map((r: any) => ({
              dex: r.swapInfo?.label || 'jupiter',
              tokenIn,
              tokenOut,
              amountIn,
              amountOut: (parseInt(jupData.outAmount || '0') / 1e6).toString(),
              fee: 0,
              priceImpact: parseFloat(jupData.priceImpactPct || '0'),
            })) || [],
            fee: '0',
            slippage: slippageTolerance,
            executionTime: 3,
            confidence: 95,
            timestamp: Date.now(),
            source: 'jupiter',
          });
        }
      } catch (err) {
        // Jupiter quote failed
      }
    }

    // Binance price-based estimation fallback
    try {
      const prices = await getTokenPrices([tokenIn, tokenOut]);
      const inPrice = prices[tokenIn]?.price || 0;
      const outPrice = prices[tokenOut]?.price || 0;

      if (inPrice > 0 && outPrice > 0) {
        const rate = inPrice / outPrice;
        const outputAmount = (parseFloat(amountIn) * rate * 0.997).toString(); // 0.3% fee
        quotes.push({
          dex: 'market_rate',
          inputAmount: amountIn,
          outputAmount,
          priceImpact: 0.1,
          estimatedGas: '150000',
          route: [{
            dex: 'market_rate',
            tokenIn,
            tokenOut,
            amountIn,
            amountOut: outputAmount,
            fee: 30, // 0.3% in bps
            priceImpact: 0.1,
          }],
          fee: '30',
          slippage: slippageTolerance,
          executionTime: 15,
          confidence: 85,
          timestamp: Date.now(),
          source: 'coingecko_estimate',
        });
      }
    } catch (err) {
      // Binance estimation failed
    }

    if (quotes.length === 0) {
      return NextResponse.json({ error: 'No quotes available for this pair' }, { status: 404 });
    }

    // Sort by output amount
    quotes.sort((a, b) => parseFloat(b.outputAmount) - parseFloat(a.outputAmount));

    const bestQuote = quotes[0];
    const worstQuote = quotes[quotes.length - 1];

    const savings = quotes.length > 1 ? {
      amount: (parseFloat(bestQuote.outputAmount) - parseFloat(worstQuote.outputAmount)).toString(),
      percentage: ((parseFloat(bestQuote.outputAmount) - parseFloat(worstQuote.outputAmount)) / parseFloat(worstQuote.outputAmount)) * 100,
      vsWorstQuote: true,
    } : { amount: '0', percentage: 0, vsWorstQuote: false };

    const priceImpact = bestQuote.priceImpact;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let reason = 'Good execution conditions';
    if (priceImpact > 2) { riskLevel = 'high'; reason = 'High price impact. Consider reducing trade size.'; }
    else if (priceImpact > 1) { riskLevel = 'medium'; reason = 'Moderate price impact.'; }

    return NextResponse.json({
      success: true,
      data: {
        quotes,
        bestQuote,
        priceImpact,
        savings,
        recommendation: { dex: bestQuote.dex, reason, riskLevel },
        timestamp: Date.now(),
        validUntil: Date.now() + 30000,
      },
    });
  } catch (error) {
    console.error('[QuickTrade] Quote API error:', error);
    return NextResponse.json({
      error: 'Failed to generate quote',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
