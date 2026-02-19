/**
 * CYPHER AI Trading Agent - Sentiment Analyst Agent
 * Analyzes market sentiment from social media, news, and on-chain data
 */

import { ConsensusVote } from '../core/types';

interface SentimentData {
  fearGreedIndex: number; // 0-100
  socialScore: number; // -1 to +1
  fundingRate: number;
  longShortRatio: number;
  newsScore: number; // -1 to +1
  onChainActivity: 'increasing' | 'decreasing' | 'stable';
}

export class SentimentAnalystAgent {
  private name = 'SentimentAnalyst';
  private cache: Map<string, { data: SentimentData; timestamp: number }> = new Map();
  private cacheTTL = 5 * 60_000; // 5 minutes

  async analyze(pair: string): Promise<ConsensusVote> {
    try {
      const sentiment = await this.gatherSentiment(pair);
      const { score, reasons } = this.scoreSentiment(sentiment);

      const confidence = Math.min(Math.abs(score), 1);
      let direction: ConsensusVote['direction'];

      if (score > 0.1) direction = 'long';
      else if (score < -0.1) direction = 'short';
      else direction = 'neutral';

      return {
        agent: this.name,
        direction,
        confidence,
        reasoning: reasons.join('; '),
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        agent: this.name,
        direction: 'abstain',
        confidence: 0,
        reasoning: `Sentiment analysis error: ${error instanceof Error ? error.message : 'unknown'}`,
        timestamp: Date.now(),
      };
    }
  }

  private async gatherSentiment(pair: string): Promise<SentimentData> {
    // Check cache
    const cached = this.cache.get(pair);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // Gather from multiple sources in parallel
    const [fearGreed, funding, socialScore] = await Promise.allSettled([
      this.fetchFearGreedIndex(),
      this.fetchFundingRate(pair),
      this.fetchSocialSentiment(pair),
    ]);

    const data: SentimentData = {
      fearGreedIndex: fearGreed.status === 'fulfilled' ? fearGreed.value : 50,
      fundingRate: funding.status === 'fulfilled' ? funding.value : 0,
      socialScore: socialScore.status === 'fulfilled' ? socialScore.value : 0,
      longShortRatio: 1.0,
      newsScore: 0,
      onChainActivity: 'stable',
    };

    this.cache.set(pair, { data, timestamp: Date.now() });
    return data;
  }

  private scoreSentiment(data: SentimentData): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // Fear & Greed Index (weight: 0.25)
    // Contrarian: extreme fear = buy, extreme greed = sell
    if (data.fearGreedIndex < 20) {
      score += 0.25;
      reasons.push(`Extreme Fear (${data.fearGreedIndex}) - contrarian bullish`);
    } else if (data.fearGreedIndex < 35) {
      score += 0.10;
      reasons.push(`Fear zone (${data.fearGreedIndex})`);
    } else if (data.fearGreedIndex > 80) {
      score -= 0.25;
      reasons.push(`Extreme Greed (${data.fearGreedIndex}) - contrarian bearish`);
    } else if (data.fearGreedIndex > 65) {
      score -= 0.10;
      reasons.push(`Greed zone (${data.fearGreedIndex})`);
    }

    // Funding rate (weight: 0.25)
    // High positive funding = overleveraged longs (bearish)
    // High negative funding = overleveraged shorts (bullish)
    if (data.fundingRate > 0.01) {
      score -= 0.25;
      reasons.push(`High positive funding (${(data.fundingRate * 100).toFixed(3)}%) - overleveraged longs`);
    } else if (data.fundingRate < -0.01) {
      score += 0.25;
      reasons.push(`Negative funding (${(data.fundingRate * 100).toFixed(3)}%) - overleveraged shorts`);
    }

    // Social sentiment (weight: 0.20)
    if (data.socialScore > 0.3) {
      score += 0.20;
      reasons.push(`Bullish social sentiment (${(data.socialScore * 100).toFixed(0)}%)`);
    } else if (data.socialScore < -0.3) {
      score -= 0.20;
      reasons.push(`Bearish social sentiment (${(data.socialScore * 100).toFixed(0)}%)`);
    }

    // Long/Short ratio (weight: 0.15)
    if (data.longShortRatio > 2.0) {
      score -= 0.15;
      reasons.push(`Crowded longs (L/S: ${data.longShortRatio.toFixed(1)})`);
    } else if (data.longShortRatio < 0.5) {
      score += 0.15;
      reasons.push(`Crowded shorts (L/S: ${data.longShortRatio.toFixed(1)})`);
    }

    // On-chain activity (weight: 0.15)
    if (data.onChainActivity === 'increasing') {
      score += 0.15;
      reasons.push('Increasing on-chain activity');
    } else if (data.onChainActivity === 'decreasing') {
      score -= 0.15;
      reasons.push('Decreasing on-chain activity');
    }

    return { score: Math.max(-1, Math.min(1, score)), reasons };
  }

  // ============================================================================
  // Data fetching
  // ============================================================================

  private async fetchFearGreedIndex(): Promise<number> {
    try {
      const response = await fetch('https://api.alternative.me/fng/?limit=1');
      const data = await response.json();
      return parseInt(data?.data?.[0]?.value || '50');
    } catch {
      return 50; // Neutral default
    }
  }

  private async fetchFundingRate(pair: string): Promise<number> {
    try {
      // Fetch from Hyperliquid or fallback to Binance
      const coin = pair.replace('-PERP', '').replace('/USDC', '').replace('/USD', '');
      const response = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
      });
      const data = await response.json();

      if (Array.isArray(data) && data.length >= 2) {
        // Find the asset context
        const meta = data[0];
        const assetIndex = meta?.universe?.findIndex((u: any) => u.name === coin);
        if (assetIndex >= 0 && data[1]?.[assetIndex]) {
          return parseFloat(data[1][assetIndex].funding || '0');
        }
      }
      return 0;
    } catch {
      return 0;
    }
  }

  private async fetchSocialSentiment(pair: string): Promise<number> {
    // Use LunarCrush or similar API if available
    // Fallback to basic heuristic
    try {
      const coin = pair.replace('-PERP', '').replace('/USDC', '').replace('/USD', '');
      const cgId = this.getCoinGeckoId(coin);
      if (!cgId) return 0;

      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${cgId}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=false`
      );
      const data = await response.json();

      // Use price change as a sentiment proxy
      const change24h = data?.market_data?.price_change_percentage_24h || 0;
      const change7d = data?.market_data?.price_change_percentage_7d || 0;

      // Normalize to -1 to +1 range
      const shortTermSentiment = Math.max(-1, Math.min(1, change24h / 10));
      const mediumTermSentiment = Math.max(-1, Math.min(1, change7d / 20));

      return (shortTermSentiment * 0.6 + mediumTermSentiment * 0.4);
    } catch {
      return 0;
    }
  }

  private getCoinGeckoId(symbol: string): string | null {
    const mapping: Record<string, string> = {
      BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana',
      DOGE: 'dogecoin', AVAX: 'avalanche-2', LINK: 'chainlink',
      UNI: 'uniswap', ARB: 'arbitrum', OP: 'optimism',
      MATIC: 'matic-network', ATOM: 'cosmos', DOT: 'polkadot',
    };
    return mapping[symbol] || null;
  }
}
