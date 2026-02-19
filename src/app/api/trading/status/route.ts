/**
 * Trading Status API
 * Returns status of the trading agent system.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Lazy require to avoid webpack chunk splitting issues
    const { getOrchestrator } = require('@/agent/core/AgentOrchestrator') as {
      getOrchestrator: () => any;
    };

    const orchestrator = getOrchestrator();
    const state = orchestrator.getState();
    const config = orchestrator.getConfig();
    const performance = orchestrator.getPerformance();

    return NextResponse.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      agent: {
        status: state.status,
        uptime: state.uptime,
        startedAt: state.startedAt,
      },
      performance,
      config: {
        markets: config.markets?.filter((m: any) => m.enabled).length || 0,
        capitalTotal: config.capitalAllocation?.total || 0,
        autoCompound: config.autoCompound?.enabled || false,
      },
      implementation: {
        modules: {
          orchestrator: true,
          consensus: true,
          persistence: true,
          connectors: true,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
