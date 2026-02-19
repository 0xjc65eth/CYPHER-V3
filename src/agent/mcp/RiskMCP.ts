/**
 * ============================================================================
 *  CYPHER ORDi Future V3 - Risk Management MCP Server
 *  Bloomberg Terminal Style | JSON-RPC 2.0 over stdio
 * ----------------------------------------------------------------------------
 *  Exposes risk management controls as MCP tools:
 *    check_risk_limits | set_risk_limits | emergency_close_all
 *    get_liquidation_distances | get_exposure_report
 * ============================================================================
 */

import { RiskLimits, Position, DEFAULT_AGENT_CONFIG } from '../core/types';
import { LiquidationGuard } from '../risk/LiquidationGuard';
import { MaxDrawdownProtection } from '../risk/MaxDrawdownProtection';

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------
let riskLimits: RiskLimits = { ...DEFAULT_AGENT_CONFIG.riskLimits };
let positions: Position[] = [];
const liquidationGuard = new LiquidationGuard();
const drawdownProtection = new MaxDrawdownProtection(DEFAULT_AGENT_CONFIG.capitalAllocation.total);

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------
const TOOLS = [
  {
    name: 'check_risk_limits',
    description: 'Check current positions against configured risk limits and drawdown thresholds',
    inputSchema: {
      type: 'object' as const,
      properties: {
        capitalUSD: { type: 'number', description: 'Current total capital in USD' },
      },
    },
  },
  {
    name: 'set_risk_limits',
    description: 'Update the in-memory risk limits configuration',
    inputSchema: {
      type: 'object' as const,
      properties: {
        maxPositionSize: { type: 'number' },
        maxLeverage: { type: 'number' },
        maxDailyDrawdown: { type: 'number' },
        maxTotalDrawdown: { type: 'number' },
        emergencyStopLoss: { type: 'number' },
        pauseOnDrawdown: { type: 'number' },
        closeAllOnDrawdown: { type: 'number' },
        shutdownOnDrawdown: { type: 'number' },
      },
    },
  },
  {
    name: 'emergency_close_all',
    description: 'Generate an emergency close-all action plan for all open positions (does not execute trades)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        reason: { type: 'string', description: 'Reason for emergency close' },
      },
      required: ['reason'],
    },
  },
  {
    name: 'get_liquidation_distances',
    description: 'Use LiquidationGuard to check distance to liquidation for all open positions',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_exposure_report',
    description: 'Summarize total exposure, per-pair breakdown, and leverage across all positions',
    inputSchema: { type: 'object' as const, properties: {} },
  },
];

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------
async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'check_risk_limits': {
      const capital = (args.capitalUSD as number) || DEFAULT_AGENT_CONFIG.capitalAllocation.total;
      const totalPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
      const drawdownCheck = liquidationGuard.checkDrawdown(totalPnl, capital, riskLimits);
      const oversizedPositions = positions.filter(p => p.size * p.currentPrice > riskLimits.maxPositionSize);
      const overLeveraged = positions.filter(p => p.leverage > riskLimits.maxLeverage);
      drawdownProtection.updateEquity(capital + totalPnl);

      return {
        timestamp: new Date().toISOString(),
        drawdown: drawdownCheck,
        currentEquity: capital + totalPnl,
        peakEquity: drawdownProtection.getPeakEquity(),
        maxDrawdownSeen: drawdownProtection.getMaxDrawdown(),
        dailyPnl: drawdownProtection.getDailyPnL(),
        violations: {
          oversizedPositions: oversizedPositions.map(p => ({ id: p.id, pair: p.pair, notional: p.size * p.currentPrice })),
          overLeveraged: overLeveraged.map(p => ({ id: p.id, pair: p.pair, leverage: p.leverage })),
        },
        limits: riskLimits,
        positionCount: positions.length,
      };
    }

    case 'set_risk_limits': {
      const prev = { ...riskLimits };
      const fields: (keyof RiskLimits)[] = [
        'maxPositionSize', 'maxLeverage', 'maxDailyDrawdown', 'maxTotalDrawdown',
        'emergencyStopLoss', 'pauseOnDrawdown', 'closeAllOnDrawdown', 'shutdownOnDrawdown',
      ];
      for (const field of fields) {
        if (args[field] !== undefined && typeof args[field] === 'number') {
          (riskLimits as Record<string, number>)[field] = args[field] as number;
        }
      }
      return { updated: true, previous: prev, current: riskLimits };
    }

    case 'emergency_close_all': {
      const reason = (args.reason as string) || 'No reason provided';
      const plan = positions.map(pos => ({
        action: 'CLOSE',
        positionId: pos.id,
        pair: pos.pair,
        direction: pos.direction,
        size: pos.size,
        currentPrice: pos.currentPrice,
        unrealizedPnl: pos.unrealizedPnl,
        orderType: 'market' as const,
      }));
      const totalUnrealizedPnl = positions.reduce((s, p) => s + p.unrealizedPnl, 0);

      console.error(`[RISK-MCP] EMERGENCY CLOSE ALL triggered: ${reason}`);
      return {
        emergency: true,
        reason,
        timestamp: new Date().toISOString(),
        positionsToClose: plan.length,
        totalUnrealizedPnl,
        actionPlan: plan,
        note: 'This is an action plan only. No trades have been executed.',
      };
    }

    case 'get_liquidation_distances': {
      const results = await liquidationGuard.checkPositions(positions);
      return {
        timestamp: new Date().toISOString(),
        positionCount: positions.length,
        results: results.map(r => ({
          positionId: r.position.id,
          pair: r.position.pair,
          direction: r.position.direction,
          leverage: r.position.leverage,
          distanceToLiquidation: (r.distanceToLiquidation * 100).toFixed(2) + '%',
          action: r.action,
          message: r.message,
        })),
      };
    }

    case 'get_exposure_report': {
      const perPair: Record<string, { long: number; short: number; net: number; leverage: number }> = {};
      let totalExposure = 0;

      for (const pos of positions) {
        const notional = pos.size * pos.currentPrice;
        totalExposure += notional;
        if (!perPair[pos.pair]) perPair[pos.pair] = { long: 0, short: 0, net: 0, leverage: 0 };
        const entry = perPair[pos.pair];
        if (pos.direction === 'long') { entry.long += notional; } else { entry.short += notional; }
        entry.net = entry.long - entry.short;
        entry.leverage = Math.max(entry.leverage, pos.leverage);
      }

      const totalMargin = positions.reduce((s, p) => s + p.marginUsed, 0);
      const avgLeverage = totalMargin > 0 ? totalExposure / totalMargin : 0;

      return {
        timestamp: new Date().toISOString(),
        totalExposureUSD: totalExposure,
        totalMarginUsed: totalMargin,
        averageLeverage: Number(avgLeverage.toFixed(2)),
        positionCount: positions.length,
        perPair,
        unrealizedPnl: positions.reduce((s, p) => s + p.unrealizedPnl, 0),
        realizedPnl: positions.reduce((s, p) => s + p.realizedPnl, 0),
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 request handler
// ---------------------------------------------------------------------------
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

function makeResponse(id: number | string, result: unknown) {
  return JSON.stringify({ jsonrpc: '2.0', id, result });
}

function makeError(id: number | string | null, code: number, message: string) {
  return JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
}

async function handleRequest(req: JsonRpcRequest): Promise<string> {
  const { id, method, params } = req;

  if (method === 'initialize') {
    return makeResponse(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'cypher-risk-mcp', version: '0.1.0' },
    });
  }

  if (method === 'tools/list') {
    return makeResponse(id, { tools: TOOLS });
  }

  if (method === 'tools/call') {
    const toolName = params?.name as string;
    const toolArgs = (params?.arguments as Record<string, unknown>) || {};
    try {
      const result = await handleToolCall(toolName, toolArgs);
      return makeResponse(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return makeResponse(id, { content: [{ type: 'text', text: JSON.stringify({ error: msg }) }], isError: true });
    }
  }

  return makeError(id, -32601, `Method not found: ${method}`);
}

// ---------------------------------------------------------------------------
// stdio transport: read newline-delimited JSON from stdin, write to stdout
// ---------------------------------------------------------------------------
function main(): void {
  let buffer = '';

  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', async (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const req: JsonRpcRequest = JSON.parse(trimmed);
        const response = await handleRequest(req);
        process.stdout.write(response + '\n');
      } catch {
        process.stdout.write(makeError(null, -32700, 'Parse error') + '\n');
      }
    }
  });

  process.stdin.on('end', () => process.exit(0));
  console.error('[RISK-MCP] CYPHER Risk Management MCP server started on stdio');
}

main();
