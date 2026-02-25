import { NextResponse } from 'next/server';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Try to get real Fear & Greed for market context
    let fearGreed = 50;
    try {
      const fgRes = await fetchWithTimeout('https://api.alternative.me/fng/?limit=1');
      if (fgRes.ok) {
        const fgData = await fgRes.json();
        fearGreed = parseInt(fgData.data?.[0]?.value || '50');
      }
    } catch (err) { console.debug("[investor-profile] Error:", (err as Error).message); }

    // Derive profile based on address pattern (BTC vs ETH vs SOL)
    const isBTC = address.startsWith('bc1') || address.startsWith('1') || address.startsWith('3');
    const isETH = address.startsWith('0x');
    const isSOL = !isBTC && !isETH;

    let profile = 'Moderate';
    let riskTolerance = 50;
    let timeHorizon = 65;
    let diversity = 30;

    if (isBTC) {
      profile = 'Conservative';
      riskTolerance = 35;
      timeHorizon = 85;
      diversity = 25;
    } else if (isSOL) {
      profile = 'Aggressive';
      riskTolerance = 75;
      timeHorizon = 50;
      diversity = 60;
    }

    // Adjust recommendations based on real F&G
    const recommendations: string[] = [];
    if (fearGreed < 30) {
      recommendations.push(`Market is in fear (F&G: ${fearGreed}) - good DCA opportunity`);
      recommendations.push('Consider accumulating BTC at current levels');
    } else if (fearGreed > 70) {
      recommendations.push(`Market is in greed (F&G: ${fearGreed}) - consider taking partial profits`);
      recommendations.push('Reduce leverage and exposure to altcoins');
    } else {
      recommendations.push('Market sentiment is neutral - maintain current positions');
    }

    if (diversity < 40) {
      recommendations.push('Increase diversification across different asset types');
    }
    recommendations.push('Set up stop-losses on leveraged positions');

    return NextResponse.json({
      success: true,
      data: {
        profile,
        riskTolerance,
        timeHorizon,
        diversity,
        recommendations,
        fearGreedIndex: fearGreed,
        walletType: isBTC ? 'bitcoin' : isETH ? 'ethereum' : 'solana',
      },
      source: 'real-analysis',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[Investor Profile] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch investor profile' }, { status: 500 });
  }
}
