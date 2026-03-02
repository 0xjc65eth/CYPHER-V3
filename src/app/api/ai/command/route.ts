import { NextRequest, NextResponse } from 'next/server';

interface AICommandRequest {
  command: string;
  context?: string;
  parameters?: Record<string, string | number | boolean>;
  userId?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface AICommandResponse {
  success: boolean;
  command: string;
  result?: Record<string, unknown>;
  executionTime: number;
  timestamp: string;
  error?: string;
  suggestions?: string[];
}

// Rate limit store (per-instance, but functional unlike the no-op before)
const commandRateLimit = new Map<string, { count: number; windowStart: number }>();
const COMMAND_RATE_LIMIT = 60; // 60 per minute
const COMMAND_RATE_WINDOW = 60_000;

function checkCommandRateLimit(userId?: string): { allowed: boolean; resetTime?: number } {
  const key = userId || 'anonymous';
  const now = Date.now();
  const entry = commandRateLimit.get(key);

  if (!entry || now - entry.windowStart > COMMAND_RATE_WINDOW) {
    commandRateLimit.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  entry.count++;
  if (entry.count > COMMAND_RATE_LIMIT) {
    const resetTime = Math.ceil((entry.windowStart + COMMAND_RATE_WINDOW - now) / 1000);
    return { allowed: false, resetTime };
  }

  return { allowed: true };
}

// Internal fetch helper - calls our own API routes for real data
async function fetchInternal(path: string): Promise<Record<string, unknown> | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4444';
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: AICommandRequest = await request.json();

    if (!body.command) {
      return NextResponse.json({
        success: false,
        error: 'Command is required'
      }, { status: 400 });
    }

    const sanitizedCommand = sanitizeCommand(body.command);
    if (!sanitizedCommand) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or unsafe command detected'
      }, { status: 400 });
    }

    const rateLimitCheck = checkCommandRateLimit(body.userId);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: `Rate limit exceeded. Try again in ${rateLimitCheck.resetTime} seconds`
      }, { status: 429 });
    }

    const commandResult = await executeAICommand(sanitizedCommand, body.parameters);
    const suggestions = generateCommandSuggestions(sanitizedCommand);

    const response: AICommandResponse = {
      success: true,
      command: sanitizedCommand,
      result: commandResult,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      suggestions
    };

    return NextResponse.json(response);

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('[AI Command API] Error:', error instanceof Error ? error.message : error);

    return NextResponse.json({
      success: false,
      command: '',
      executionTime,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Failed to process AI command'
    }, { status: 500 });
  }
}

async function executeAICommand(command: string, parameters?: Record<string, string | number | boolean>): Promise<Record<string, unknown>> {
  const commandLower = command.toLowerCase();

  if (commandLower.includes('analyze') && commandLower.includes('market')) {
    return await executeMarketAnalysis(command, parameters);
  }
  if (commandLower.includes('portfolio') || commandLower.includes('balance')) {
    return await executePortfolioCommand(command);
  }
  if (commandLower.includes('trade') || commandLower.includes('buy') || commandLower.includes('sell')) {
    return await executeTradingCommand(command);
  }
  if (commandLower.includes('price') || commandLower.includes('chart')) {
    return await executePriceCommand(command);
  }
  if (commandLower.includes('news') || commandLower.includes('sentiment')) {
    return await executeNewsCommand();
  }
  if (commandLower.includes('ordinals') || commandLower.includes('nft') || commandLower.includes('inscriptions')) {
    return await executeOrdinalsCommand();
  }
  if (commandLower.includes('runes') || commandLower.includes('rune')) {
    return await executeRunesCommand();
  }
  return await executeGeneralAIChat(command);
}

async function executeMarketAnalysis(command: string, parameters?: Record<string, string | number | boolean>): Promise<Record<string, unknown>> {
  const symbols = extractSymbolsFromCommand(command);
  const timeframe = extractTimeframeFromCommand(command) || '24h';

  // Fetch real BTC data from our internal API
  const btcData = await fetchInternal('/api/bitcoin-price/');

  // Fetch real technical analysis if available
  const symbol = symbols[0] || 'BTC';
  const taData = await fetchInternal(`/api/technical-analysis/?symbol=${symbol}`);

  const price = (btcData?.price as number) || 0;
  const change24h = (btcData?.change24h as number) || 0;
  const fearGreed = (btcData?.fearGreedIndex as number) || 0;

  // Derive trend from real data
  const trend = change24h > 2 ? 'strongly_bullish' : change24h > 0 ? 'bullish' : change24h > -2 ? 'bearish' : 'strongly_bearish';
  const confidence = Math.min(0.95, 0.5 + Math.abs(change24h) / 20);

  return {
    type: 'market_analysis',
    symbols: symbols.length > 0 ? symbols : ['BTC'],
    timeframe,
    source: 'real_data',
    analysis: {
      trend,
      confidence: parseFloat(confidence.toFixed(2)),
      current_price: price,
      change_24h: change24h,
      fear_greed_index: fearGreed,
      technical: taData?.data || null,
      key_levels: {
        support: parseFloat((price * 0.95).toFixed(0)),
        resistance: parseFloat((price * 1.05).toFixed(0)),
      },
    },
    recommendations: generateRecommendations(trend, fearGreed, change24h),
  };
}

function generateRecommendations(trend: string, fearGreed: number, change24h: number): string[] {
  const recs: string[] = [];
  if (fearGreed < 25) recs.push('Extreme fear - historically a buying opportunity');
  if (fearGreed > 75) recs.push('Extreme greed - consider taking profits');
  if (trend.includes('bullish')) recs.push('Momentum is positive - consider scaling in');
  if (trend.includes('bearish')) recs.push('Momentum is negative - wait for confirmation before buying');
  if (Math.abs(change24h) > 5) recs.push('High volatility detected - use smaller position sizes');
  if (recs.length === 0) recs.push('Market is neutral - consider dollar-cost averaging');
  return recs;
}

async function executePortfolioCommand(_command: string): Promise<Record<string, unknown>> {
  // Portfolio requires wallet connection - return guidance
  const btcData = await fetchInternal('/api/bitcoin-price/');
  const price = (btcData?.price as number) || 0;

  return {
    type: 'portfolio_info',
    source: 'real_data',
    message: 'Connect your wallet to see portfolio data. Current market prices:',
    market_prices: {
      BTC: price,
      timestamp: btcData?.timestamp || new Date().toISOString(),
      source: btcData?.source || 'unavailable',
    },
    actions: [
      'Connect wallet via the Portfolio page to track holdings',
      'Use /portfolio for detailed portfolio analytics',
      'Enable price alerts in Settings',
    ],
  };
}

async function executeTradingCommand(command: string): Promise<Record<string, unknown>> {
  const action = command.toLowerCase().includes('buy') ? 'buy' : 'sell';
  const symbols = extractSymbolsFromCommand(command);
  const amount = extractAmountFromCommand(command);
  const symbol = symbols[0] || 'BTC';

  // Fetch real price data
  const btcData = await fetchInternal('/api/bitcoin-price/');
  const price = (btcData?.price as number) || 0;
  const change24h = (btcData?.change24h as number) || 0;
  const fearGreed = (btcData?.fearGreedIndex as number) || 0;

  // Derive recommendation from real data
  let recommendation: string;
  if (action === 'buy') {
    recommendation = change24h < -3 ? 'favorable_dip' : change24h > 5 ? 'caution_fomo' : 'neutral';
  } else {
    recommendation = change24h > 5 ? 'favorable_profit_taking' : change24h < -5 ? 'caution_panic_selling' : 'neutral';
  }

  return {
    type: 'trading_analysis',
    source: 'real_data',
    action,
    symbol,
    amount: amount || 'not_specified',
    current_price: price,
    change_24h: change24h,
    fear_greed: fearGreed,
    analysis: {
      recommendation,
      risk_level: Math.abs(change24h) > 5 ? 'high' : Math.abs(change24h) > 2 ? 'medium' : 'low',
      key_factors: [
        `${symbol} is ${change24h >= 0 ? 'up' : 'down'} ${Math.abs(change24h).toFixed(1)}% in 24h`,
        `Fear & Greed Index: ${fearGreed} (${fearGreed < 25 ? 'Extreme Fear' : fearGreed < 45 ? 'Fear' : fearGreed < 55 ? 'Neutral' : fearGreed < 75 ? 'Greed' : 'Extreme Greed'})`,
        `Current price: $${price.toLocaleString()}`,
      ],
    },
    next_steps: [
      'Navigate to /hacker-yields to use the automated trading agent',
      'Set up risk parameters before executing trades',
      'Review position sizing based on your portfolio',
    ],
  };
}

async function executePriceCommand(command: string): Promise<Record<string, unknown>> {
  const symbols = extractSymbolsFromCommand(command);
  const timeframe = extractTimeframeFromCommand(command) || '24h';

  // Fetch real price data from CoinGecko proxy
  const ids = (symbols.length > 0 ? symbols : ['BTC']).map(s => {
    const map: Record<string, string> = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', MATIC: 'matic-network', AVAX: 'avalanche-2', BNB: 'binancecoin', ADA: 'cardano', DOT: 'polkadot', LINK: 'chainlink', UNI: 'uniswap' };
    return map[s] || s.toLowerCase();
  });

  const cgData = await fetchInternal(`/api/coingecko/simple/price/?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`);

  const priceData = ids.map((id, i) => {
    const sym = symbols[i] || id.toUpperCase();
    const d = cgData ? (cgData[id] as Record<string, number>) : null;
    return {
      symbol: sym,
      price: d?.usd || 0,
      change_24h: d?.usd_24h_change ? parseFloat(d.usd_24h_change.toFixed(2)) : 0,
      volume_24h: d?.usd_24h_vol || 0,
      market_cap: d?.usd_market_cap || 0,
    };
  });

  return {
    type: 'price_data',
    source: 'coingecko',
    symbols: symbols.length > 0 ? symbols : ['BTC'],
    timeframe,
    data: priceData,
  };
}

async function executeNewsCommand(): Promise<Record<string, unknown>> {
  const newsData = await fetchInternal('/api/news/?category=BTC&limit=5');

  if (newsData && Array.isArray(newsData.articles)) {
    return {
      type: 'news_sentiment',
      source: 'cryptocompare',
      sentiment: newsData.sentiment || {},
      news_count: newsData.count || 0,
      articles: (newsData.articles as Record<string, unknown>[]).slice(0, 5).map((a: Record<string, unknown>) => ({
        title: a.title,
        source: a.source,
        sentiment: a.sentiment,
        publishedAt: a.publishedAt,
      })),
    };
  }

  return {
    type: 'news_sentiment',
    source: 'unavailable',
    error: 'News API temporarily unavailable',
    suggestion: 'Check /api/news/ directly for the latest crypto news',
  };
}

async function executeOrdinalsCommand(): Promise<Record<string, unknown>> {
  const statsData = await fetchInternal('/api/ordinals-stats/');
  const topData = await fetchInternal('/api/ordinals-top/');

  return {
    type: 'ordinals_data',
    source: 'hiro',
    stats: statsData || { error: 'Stats temporarily unavailable' },
    top_collections: topData || { error: 'Collections temporarily unavailable' },
  };
}

async function executeRunesCommand(): Promise<Record<string, unknown>> {
  const statsData = await fetchInternal('/api/runes-stats/');
  const topData = await fetchInternal('/api/runes-top/');

  return {
    type: 'runes_data',
    source: 'hiro',
    stats: statsData || { error: 'Stats temporarily unavailable' },
    top_runes: topData || { error: 'Top runes temporarily unavailable' },
  };
}

async function executeGeneralAIChat(command: string): Promise<Record<string, unknown>> {
  // Attempt to get a real AI response via the Gemini chat endpoint
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4444';
    const res = await fetch(`${baseUrl}/api/cypher-ai/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: command }),
      signal: AbortSignal.timeout(20000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.response) {
        return {
          type: 'ai_chat_response',
          source: data.source || 'gemini',
          response: data.response,
          agent: data.agent || null,
        };
      }
    }
  } catch {
    // Fall through to static fallback
  }

  return {
    type: 'ai_response',
    response: `I understand you're asking about: "${command}". Here are some things I can help with using real-time data:`,
    capabilities: [
      'Market analysis (real BTC/ETH/SOL data from CoinGecko)',
      'Price queries (real-time via CoinGecko proxy)',
      'Trading analysis (real data + Fear & Greed Index)',
      'News & sentiment (CryptoCompare live feed)',
      'Ordinals data (Hiro API)',
      'Runes data (Hiro API)',
    ],
    examples: [
      'Try: "analyze BTC market"',
      'Try: "BTC price"',
      'Try: "latest news"',
      'Try: "show ordinals"',
      'Try: "runes data"',
    ],
  };
}

function sanitizeCommand(command: string): string | null {
  const sanitized = command.replace(/[<>]/g, '').trim();
  if (sanitized.length < 2 || sanitized.length > 500) return null;

  const dangerousPatterns = [/eval\s*\(/i, /exec\s*\(/i, /\bimport\s*\(/i];
  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) return null;
  }
  return sanitized;
}

function extractSymbolsFromCommand(command: string): string[] {
  const symbolPattern = /\b(BTC|ETH|SOL|MATIC|AVAX|BNB|ADA|DOT|LINK|UNI|USDC|USDT)\b/gi;
  const matches = command.match(symbolPattern);
  if (!matches) return [];
  return [...new Set(matches.map(s => s.toUpperCase()))];
}

function extractTimeframeFromCommand(command: string): string | null {
  const match = command.match(/\b(1h|4h|1d|1w|1m|24h|7d|30d)\b/i);
  return match ? match[0] : null;
}

function extractAmountFromCommand(command: string): string | null {
  const match = command.match(/\b(\d+(?:\.\d+)?)\s*(BTC|ETH|USD|USDT|USDC)?\b/i);
  return match ? match[0] : null;
}

function generateCommandSuggestions(command: string): string[] {
  const commandLower = command.toLowerCase();
  const suggestions: string[] = [];

  if (commandLower.includes('price')) {
    suggestions.push('Analyze BTC market trends', 'Compare ETH vs SOL prices', 'Show latest news sentiment');
  } else if (commandLower.includes('portfolio')) {
    suggestions.push('Show BTC price', 'Analyze market trends', 'Get trading signals');
  } else if (commandLower.includes('trade')) {
    suggestions.push('Analyze BTC market', 'Show current prices', 'Latest news sentiment');
  } else {
    suggestions.push('Analyze BTC market', 'Show my portfolio', 'Latest crypto news');
  }

  return suggestions.slice(0, 3);
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Command endpoint - POST only',
    supportedCommands: [
      'Market analysis (real data)',
      'Price queries (CoinGecko)',
      'Trading analysis',
      'News & sentiment (CryptoCompare)',
      'Ordinals data (Hiro)',
      'Runes data (Hiro)',
    ],
    examples: [
      'Analyze BTC market trends',
      'What is the current BTC price?',
      'Latest crypto news sentiment',
      'Show top Ordinals collections',
      'Runes trading volume today',
    ],
    rateLimit: '60 commands per minute',
  });
}
