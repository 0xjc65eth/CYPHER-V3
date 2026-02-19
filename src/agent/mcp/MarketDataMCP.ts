/**
 * ============================================================================
 *  CYPHER ORDi FUTURE V3 - MARKET DATA MCP SERVER
 *  Bloomberg Terminal Style | Real-Time Market Intelligence
 * ============================================================================
 *  Protocol:  JSON-RPC 2.0 over stdio
 *  Transport: stdin/stdout
 *  Tools:     get_price, get_orderbook, get_candles, get_trades,
 *             get_funding_rate, subscribe_price
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const API_KEY = process.env.COINGECKO_API_KEY ?? "";

const TOOLS: ToolDefinition[] = [
  {
    name: "get_price",
    description: "Fetch current price for one or more coins from CoinGecko",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "string", description: "Comma-separated CoinGecko coin ids (e.g. bitcoin,ethereum)" },
        vs_currencies: { type: "string", description: "Comma-separated fiat/crypto currencies (e.g. usd,btc)" },
      },
      required: ["ids"],
    },
  },
  {
    name: "get_orderbook",
    description: "Retrieve current order book depth for a trading pair",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Trading pair symbol (e.g. BTC/USDT)" },
        depth: { type: "number", description: "Number of levels (default 20)" },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_candles",
    description: "Fetch OHLCV candlestick data from CoinGecko market_chart endpoint",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "CoinGecko coin id (e.g. bitcoin)" },
        vs_currency: { type: "string", description: "Target currency (default usd)" },
        days: { type: "number", description: "Number of days of data (1, 7, 14, 30, 90, 180, 365, max)" },
      },
      required: ["id"],
    },
  },
  {
    name: "get_trades",
    description: "Retrieve recent trades for a trading pair",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Trading pair symbol (e.g. BTC/USDT)" },
        limit: { type: "number", description: "Number of trades to return (default 50)" },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_funding_rate",
    description: "Fetch current perpetual funding rate for a symbol",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Perpetual contract symbol (e.g. BTC/USDT)" },
      },
      required: ["symbol"],
    },
  },
  {
    name: "subscribe_price",
    description: "Set up a WebSocket price subscription for real-time updates",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "string", description: "Comma-separated CoinGecko coin ids" },
        vs_currencies: { type: "string", description: "Target currencies (default usd)" },
      },
      required: ["ids"],
    },
  },
];

// ---------------------------------------------------------------------------
// CoinGecko helpers
// ---------------------------------------------------------------------------

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (API_KEY) headers["x-cg-demo-api-key"] = API_KEY;
  return headers;
}

async function fetchCoinGecko(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const url = new URL(`${COINGECKO_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { headers: buildHeaders() });
  if (!res.ok) {
    throw new Error(`CoinGecko ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

async function handleGetPrice(args: Record<string, unknown>): Promise<ToolResult> {
  const ids = String(args.ids ?? "bitcoin");
  const vsCurrencies = String(args.vs_currencies ?? "usd");
  const data = await fetchCoinGecko("/simple/price", {
    ids,
    vs_currencies: vsCurrencies,
    include_24hr_change: "true",
    include_market_cap: "true",
    include_24hr_vol: "true",
  });
  return textResult(data);
}

async function handleGetOrderbook(args: Record<string, unknown>): Promise<ToolResult> {
  const symbol = String(args.symbol ?? "BTC/USDT");
  const depth = Number(args.depth ?? 20);

  // Try to get real order book from Hyperliquid connector
  try {
    const { getOrchestrator } = await import("../core/AgentOrchestrator");
    const orchestrator = getOrchestrator();
    const connector = orchestrator.getConnector("hyperliquid");
    if (connector && "getOrderBook" in connector) {
      const coin = symbol.replace("/USDT", "").replace("/USD", "").replace("-PERP", "");
      const book = await (connector as any).getOrderBook(coin + "-PERP");
      if (book && (book.bids?.length > 0 || book.asks?.length > 0)) {
        return textResult({
          symbol,
          bids: book.bids.slice(0, depth),
          asks: book.asks.slice(0, depth),
          source: "hyperliquid",
          timestamp: Date.now(),
        });
      }
    }
  } catch { /* fall through to stub */ }

  return textResult({
    symbol, depth, status: "no_data",
    message: "Order book not available - exchange connector not configured",
  });
}

async function handleGetCandles(args: Record<string, unknown>): Promise<ToolResult> {
  const id = String(args.id ?? "bitcoin");
  const vsCurrency = String(args.vs_currency ?? "usd");
  const days = String(args.days ?? "7");
  const data = await fetchCoinGecko(`/coins/${encodeURIComponent(id)}/market_chart`, {
    vs_currency: vsCurrency,
    days,
  });
  return textResult(data);
}

async function handleGetTrades(args: Record<string, unknown>): Promise<ToolResult> {
  const symbol = String(args.symbol ?? "BTC/USDT");
  const limit = Number(args.limit ?? 50);

  // Try to get recent trades from agent trade history
  try {
    const { getOrchestrator } = await import("../core/AgentOrchestrator");
    const orchestrator = getOrchestrator();
    const trades = orchestrator.getTradeHistory();
    const filtered = trades
      .filter(t => !symbol || t.pair.includes(symbol.replace("/USDT", "").replace("/USD", "")))
      .slice(0, limit);
    if (filtered.length > 0) {
      return textResult({
        symbol, trades: filtered, count: filtered.length, source: "agent_history",
      });
    }
  } catch { /* fall through */ }

  return textResult({
    symbol, limit, status: "no_data",
    message: "No recent trades available",
  });
}

async function handleGetFundingRate(args: Record<string, unknown>): Promise<ToolResult> {
  const symbol = String(args.symbol ?? "BTC/USDT");

  // Try to get real funding rate from Hyperliquid
  try {
    const { getOrchestrator } = await import("../core/AgentOrchestrator");
    const orchestrator = getOrchestrator();
    const connector = orchestrator.getConnector("hyperliquid");
    if (connector && "getFundingRate" in connector) {
      const pair = symbol.replace("/USDT", "").replace("/USD", "") + "-PERP";
      const rate = await (connector as any).getFundingRate(pair);
      if (typeof rate === "number") {
        return textResult({
          symbol, pair, funding_rate: rate,
          annualized: (rate * 3 * 365 * 100).toFixed(2) + "%",
          source: "hyperliquid", timestamp: Date.now(),
        });
      }
    }
  } catch { /* fall through */ }

  return textResult({
    symbol, status: "no_data", funding_rate: null,
    message: "Funding rate not available - derivatives connector not configured",
  });
}

async function handleSubscribePrice(args: Record<string, unknown>): Promise<ToolResult> {
  const ids = String(args.ids ?? "bitcoin");
  const vsCurrencies = String(args.vs_currencies ?? "usd");
  return textResult({
    ids: ids.split(","),
    vs_currencies: vsCurrencies.split(","),
    status: "subscription_info",
    message: "WebSocket subscription setup: connect to ws://localhost:8080 and send a subscribe frame.",
    protocol: {
      endpoint: "ws://localhost:8080",
      subscribe_frame: { action: "subscribe", channel: "price", ids: ids.split(","), vs_currencies: vsCurrencies.split(",") },
      unsubscribe_frame: { action: "unsubscribe", channel: "price", ids: ids.split(",") },
    },
  });
}

function textResult(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

const TOOL_HANDLERS: Record<string, (args: Record<string, unknown>) => Promise<ToolResult>> = {
  get_price: handleGetPrice,
  get_orderbook: handleGetOrderbook,
  get_candles: handleGetCandles,
  get_trades: handleGetTrades,
  get_funding_rate: handleGetFundingRate,
  subscribe_price: handleSubscribePrice,
};

// ---------------------------------------------------------------------------
// JSON-RPC dispatcher
// ---------------------------------------------------------------------------

async function dispatch(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  const { method, params, id } = req;

  if (method === "initialize") {
    return { jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "cypher-market-data", version: "0.1.0" } } };
  }

  if (method === "notifications/initialized") {
    // Client acknowledgement -- no response needed for notifications, but we return anyway if id present
    return { jsonrpc: "2.0", id, result: {} };
  }

  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  }

  if (method === "tools/call") {
    const toolName = String((params as Record<string, unknown>)?.name ?? "");
    const toolArgs = ((params as Record<string, unknown>)?.arguments ?? {}) as Record<string, unknown>;
    const handler = TOOL_HANDLERS[toolName];
    if (!handler) {
      return { jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool: ${toolName}` } };
    }
    try {
      const result = await handler(toolArgs);
      return { jsonrpc: "2.0", id, result };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: `Error: ${msg}` }], isError: true } };
    }
  }

  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

// ---------------------------------------------------------------------------
// stdio transport
// ---------------------------------------------------------------------------

function send(response: JsonRpcResponse): void {
  process.stdout.write(JSON.stringify(response) + "\n");
}

let buffer = "";

process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk: string) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const req = JSON.parse(trimmed) as JsonRpcRequest;
      dispatch(req).then(send).catch((err) => {
        send({ jsonrpc: "2.0", id: req.id ?? null, error: { code: -32603, message: String(err) } });
      });
    } catch {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    }
  }
});

process.stderr.write("[cypher-market-data] MCP server running on stdio\n");
