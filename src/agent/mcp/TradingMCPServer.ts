/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  CYPHER ORDi Future V3 - Trading MCP Server                    ║
 * ║  Model Context Protocol interface for AI Trading Agent         ║
 * ║  Lightweight JSON-RPC 2.0 over stdio (no SDK dependency)       ║
 * ║  Now wired to real exchange connectors via orchestrator         ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  Run: npx tsx src/agent/mcp/TradingMCPServer.ts                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { getOrchestrator } from '../core/AgentOrchestrator';
import type { Position, LPPosition } from '../core/types';

// ─── JSON-RPC Types ──────────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
}

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS: ToolDefinition[] = [
  {
    name: 'place_order',
    description: 'Place a limit or market order on any connected exchange',
    inputSchema: {
      type: 'object',
      properties: {
        exchange:   { type: 'string', description: 'Exchange name (hyperliquid, jupiter, uniswap)' },
        pair:       { type: 'string', description: 'Trading pair, e.g. BTC-PERP, SOL/USDC, AAPL-PERP' },
        side:       { type: 'string', enum: ['buy', 'sell'] },
        type:       { type: 'string', enum: ['limit', 'market'] },
        price:      { type: 'number', description: 'Order price (required for limit)' },
        size:       { type: 'number', description: 'Order size in units' },
        reduceOnly: { type: 'boolean', description: 'Reduce-only flag' },
      },
      required: ['pair', 'side', 'type', 'size'],
    },
  },
  {
    name: 'cancel_order',
    description: 'Cancel a specific open order by pair and order ID',
    inputSchema: {
      type: 'object',
      properties: {
        exchange: { type: 'string', description: 'Exchange name' },
        pair:     { type: 'string', description: 'Trading pair' },
        orderId:  { type: 'string', description: 'Order ID to cancel' },
      },
      required: ['pair', 'orderId'],
    },
  },
  {
    name: 'cancel_all_orders',
    description: 'Cancel all open orders on a specific exchange or all exchanges',
    inputSchema: {
      type: 'object',
      properties: {
        exchange: { type: 'string', description: 'Exchange name (omit for all)' },
      },
    },
  },
  {
    name: 'get_positions',
    description: 'Retrieve all open positions across all connected exchanges',
    inputSchema: { type: 'object', properties: {
      exchange: { type: 'string', description: 'Filter by exchange (optional)' },
    }},
  },
  {
    name: 'get_balance',
    description: 'Get account balance and margin info from an exchange',
    inputSchema: {
      type: 'object',
      properties: {
        exchange: { type: 'string', description: 'Exchange name (default: hyperliquid)' },
      },
    },
  },
  {
    name: 'set_leverage',
    description: 'Set leverage for a trading pair',
    inputSchema: {
      type: 'object',
      properties: {
        exchange: { type: 'string', description: 'Exchange name' },
        pair:     { type: 'string', description: 'Trading pair' },
        leverage: { type: 'number', description: 'Leverage multiplier (1-50)' },
      },
      required: ['pair', 'leverage'],
    },
  },
  {
    name: 'create_lp_position',
    description: 'Create a concentrated liquidity position on Raydium or Uniswap',
    inputSchema: {
      type: 'object',
      properties: {
        pair:      { type: 'string', description: 'LP pair, e.g. SOL/USDC' },
        protocol:  { type: 'string', enum: ['raydium', 'uniswap', 'orca'] },
        tickLower: { type: 'number', description: 'Lower tick boundary' },
        tickUpper: { type: 'number', description: 'Upper tick boundary' },
        amountUSD: { type: 'number', description: 'Capital to deploy in USD' },
      },
      required: ['pair', 'protocol', 'tickLower', 'tickUpper', 'amountUSD'],
    },
  },
  {
    name: 'close_lp_position',
    description: 'Close an existing liquidity position and withdraw tokens',
    inputSchema: {
      type: 'object',
      properties: {
        positionId: { type: 'string', description: 'LP position ID' },
        exchange:   { type: 'string', description: 'Exchange/protocol name' },
      },
      required: ['positionId'],
    },
  },
  {
    name: 'collect_lp_fees',
    description: 'Collect unclaimed fees from a liquidity position',
    inputSchema: {
      type: 'object',
      properties: {
        positionId: { type: 'string', description: 'LP position ID' },
        exchange:   { type: 'string', description: 'Exchange/protocol name' },
      },
      required: ['positionId'],
    },
  },
  {
    name: 'get_agent_status',
    description: 'Get current agent status, performance, and config',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ─── Tool Handlers (wired to real connectors) ──────────────────────────────

function getConnector(exchange?: string) {
  const orchestrator = getOrchestrator();
  const conn = orchestrator.getConnector(exchange || 'hyperliquid');
  return conn;
}

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  const orchestrator = getOrchestrator();

  switch (name) {
    case 'place_order': {
      const conn = getConnector(args.exchange as string);
      if (!conn) return { status: 'error', message: `No connector for ${args.exchange || 'hyperliquid'}` };
      const result = await (conn as any).placeOrder({
        pair: args.pair,
        side: args.side,
        price: args.price || 0,
        size: args.size,
        type: args.type,
        reduceOnly: args.reduceOnly || false,
      });
      return { status: result.success ? 'ok' : 'error', ...result };
    }

    case 'cancel_order': {
      const conn = getConnector(args.exchange as string);
      if (!conn) return { status: 'error', message: 'No connector' };
      const success = await (conn as any).cancelOrder(args.pair, args.orderId);
      return { status: success ? 'ok' : 'error', pair: args.pair, orderId: args.orderId };
    }

    case 'cancel_all_orders': {
      const conn = getConnector(args.exchange as string);
      if (!conn) return { status: 'error', message: 'No connector' };
      const success = await (conn as any).cancelAllOrders();
      return { status: success ? 'ok' : 'error' };
    }

    case 'get_positions': {
      const state = orchestrator.getState();
      let positions = state.positions;
      if (args.exchange) {
        positions = positions.filter(p => p.exchange === args.exchange);
      }
      return { status: 'ok', positions, count: positions.length };
    }

    case 'get_balance': {
      const conn = getConnector(args.exchange as string);
      if (!conn) return { status: 'error', message: 'No connector' };
      const balances = await (conn as any).getBalances();
      return { status: 'ok', balances };
    }

    case 'set_leverage': {
      const conn = getConnector(args.exchange as string);
      if (!conn || !('setLeverage' in conn)) return { status: 'error', message: 'Leverage not supported' };
      const success = await (conn as any).setLeverage(args.pair, args.leverage);
      return { status: success ? 'ok' : 'error', pair: args.pair, leverage: args.leverage };
    }

    case 'create_lp_position': {
      const protocol = (args.protocol as string) || 'raydium';
      const conn = getConnector(protocol === 'raydium' ? 'jupiter' : protocol);
      if (!conn || !('createLPPosition' in conn)) {
        return { status: 'error', message: `LP not supported on ${protocol}` };
      }
      const result = await (conn as any).createLPPosition({
        pair: args.pair,
        amountA: (args.amountUSD as number) / 2,
        amountB: (args.amountUSD as number) / 2,
        priceLower: args.tickLower,
        priceUpper: args.tickUpper,
        feeTier: 0.003,
      });
      return { status: result.success ? 'ok' : 'error', ...result };
    }

    case 'close_lp_position': {
      const conn = getConnector(args.exchange as string || 'jupiter');
      if (!conn || !('closeLPPosition' in conn)) {
        return { status: 'error', message: 'LP close not supported' };
      }
      const result = await (conn as any).closeLPPosition(args.positionId);
      return { status: result.success ? 'ok' : 'error', ...result };
    }

    case 'collect_lp_fees': {
      const conn = getConnector(args.exchange as string || 'jupiter');
      if (!conn || !('collectLPFees' in conn)) {
        return { status: 'error', message: 'LP fee collection not supported' };
      }
      const result = await (conn as any).collectLPFees(args.positionId);
      return { status: result.success ? 'ok' : 'error', ...result };
    }

    case 'get_agent_status': {
      const state = orchestrator.getState();
      const perf = orchestrator.getPerformance();
      const config = orchestrator.getConfig();
      return {
        status: 'ok',
        agent: {
          status: state.status,
          uptime: state.uptime,
          positions: state.positions.length,
          lpPositions: state.lpPositions.length,
          performance: perf,
          mode: config.mode,
          markets: config.markets.filter(m => m.enabled).map(m => m.pair),
        },
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── JSON-RPC Dispatch ───────────────────────────────────────────────────────

async function dispatch(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  const { id, method, params } = req;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'cypher-trading-agent', version: '0.2.0' },
      },
    };
  }

  if (method === 'notifications/initialized') {
    return { jsonrpc: '2.0', id, result: {} };
  }

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
  }

  if (method === 'tools/call') {
    const toolName = params?.name as string;
    const toolArgs = (params?.arguments ?? {}) as Record<string, unknown>;

    if (!toolName) {
      return { jsonrpc: '2.0', id, error: { code: -32602, message: 'Missing tool name' } };
    }

    const tool = TOOLS.find(t => t.name === toolName);
    if (!tool) {
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${toolName}` } };
    }

    try {
      const result = await handleToolCall(toolName, toolArgs);
      return {
        jsonrpc: '2.0', id,
        result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Handler error';
      return {
        jsonrpc: '2.0', id,
        result: { content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: msg }) }], isError: true },
      };
    }
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

// ─── Stdio Transport ─────────────────────────────────────────────────────────

function send(response: JsonRpcResponse): void {
  const body = JSON.stringify(response);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
}

function startServer(): void {
  let buffer = '';

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;

    // Parse Content-Length framed messages
    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const header = buffer.slice(0, headerEnd);
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) { buffer = buffer.slice(headerEnd + 4); continue; }

      const contentLen = parseInt(match[1], 10);
      const bodyStart = headerEnd + 4;
      if (buffer.length < bodyStart + contentLen) break;

      const body = buffer.slice(bodyStart, bodyStart + contentLen);
      buffer = buffer.slice(bodyStart + contentLen);

      try {
        const req = JSON.parse(body) as JsonRpcRequest;
        dispatch(req).then(res => {
          if (req.id !== undefined) send(res);
        }).catch(err => {
          send({ jsonrpc: '2.0', id: req.id ?? null, error: { code: -32603, message: String(err) } });
        });
      } catch {
        send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
      }
    }
  });

  process.stderr.write('[CYPHER MCP] Trading server v0.2.0 started on stdio\n');
}

startServer();
