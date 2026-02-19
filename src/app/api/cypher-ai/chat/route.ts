import { NextRequest, NextResponse } from 'next/server';
import { routeToAgent, agents } from '@/lib/agents/gemini-agents';
import { dataFetcherMap } from '@/lib/agents/agent-data-fetchers';

// Gemini configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
if (!GEMINI_API_KEY) {
}
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

interface ChatRequest {
  message: string;
  language?: string;
  agentHint?: string | null;
  marketContext?: {
    btcPrice?: string;
    volume?: string;
    hashRate?: string;
    difficulty?: string;
    mempoolSize?: string;
  };
}

/**
 * Call Gemini API directly via REST (no SDK dependency)
 */
async function callGemini(userMessage: string, systemPrompt: string): Promise<string> {
  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
    },
  };

  const res = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown');
    console.error(`Gemini API error ${res.status}: ${errText}`);
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty Gemini response');
  }
  return text;
}

// POST handler
export async function POST(request: NextRequest) {
  try {
    const { message, language, agentHint, marketContext }: ChatRequest = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Route to the best agent
    const agent = routeToAgent(message, agentHint);

    // Fetch agent-specific real-time data in parallel
    const dataSources: string[] = [];
    const fetchedParts = await Promise.all(
      agent.dataFetchers.map(async (name) => {
        const fn = dataFetcherMap[name];
        if (!fn) return '';
        try {
          dataSources.push(name);
          return await fn();
        } catch {
          return '';
        }
      })
    );
    const liveDataContext = fetchedParts.filter(Boolean).join('\n\n');

    // Build client market context if provided
    let clientContext = '';
    if (marketContext) {
      const parts: string[] = [];
      if (marketContext.btcPrice) parts.push(`BTC Price: $${marketContext.btcPrice}`);
      if (marketContext.volume) parts.push(`24h Volume: $${marketContext.volume}`);
      if (marketContext.hashRate) parts.push(`Hash Rate: ${marketContext.hashRate} EH/s`);
      if (marketContext.difficulty) parts.push(`Difficulty: ${marketContext.difficulty}T`);
      if (marketContext.mempoolSize) parts.push(`Mempool Size: ${marketContext.mempoolSize} txs`);
      if (parts.length > 0) {
        clientContext = `\n\n[Client Market Context]\n${parts.join('\n')}`;
      }
    }

    // Build the enhanced system prompt with live data
    const systemPrompt = [
      agent.systemPrompt,
      liveDataContext ? `\n\n[Live Data — use this in your response]\n${liveDataContext}` : '',
    ].join('');

    // Build the user message with optional context
    const languageHint = language && language !== 'auto'
      ? `\n\n[User language preference: ${language}]`
      : '';
    const enhancedMessage = `${message}${clientContext}${languageHint}`;

    // Call Gemini
    let response: string;
    let source = 'gemini-2.0-flash';

    try {
      response = await callGemini(enhancedMessage, systemPrompt);
    } catch (error) {
      console.error('Gemini call failed:', error);
      response = `**${agent.name}** is temporarily unavailable. The CYPHER Terminal AI system encountered an error connecting to the language model. Please try again in a moment.`;
      source = 'fallback';
    }

    return NextResponse.json({
      response,
      agent: {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        icon: agent.icon,
        color: agent.color,
        specialty: agent.role,
      },
      source,
      dataSources,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET handler — API status
export async function GET() {
  return NextResponse.json({
    status: 'CYPHER AI Multi-Agent Chat API Online',
    version: '4.0.0',
    model: GEMINI_MODEL,
    agentCount: agents.length,
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      icon: a.icon,
      color: a.color,
    })),
    features: [
      '8 specialized AI agents with keyword + hint routing',
      'Per-agent real-time data injection (Binance, Mempool, Fear&Greed, CryptoCompare, Derivatives)',
      'Deep Ordinals/Runes/BRC-20 knowledge (Quantum Cats, Puppets, NodeMonkes, etc.)',
      'Gemini 2.0 Flash via REST API',
      'Auto language detection',
      'Smart Money Concepts analysis',
    ],
    endpoints: {
      POST: '/api/cypher-ai/chat — Send {message, language?, agentHint?}',
      GET: '/api/cypher-ai/chat — API status',
    },
  });
}
