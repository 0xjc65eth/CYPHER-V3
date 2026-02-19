/**
 * Trading Engine API - CYPHER AI v3.0
 * Endpoint to control the automated trading engine.
 * Redirects to the new agent system at /api/agent.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Forward to the real agent system
    const agentPayload = {
      action: 'start',
      config: {
        testnet: true,
        portfolioUSD: body.config?.maxPositions ? body.config.maxPositions * 1000 : 10000,
        maxRiskPercent: (body.config?.maxDrawdown || 0.15) * 100,
        enableTrading: false,
      },
    };

    const baseUrl = req.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/agent/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentPayload),
    });

    const data = await response.json();

    return NextResponse.json({
      status: data.success ? 'active' : 'error',
      message: data.message || 'Trading engine started via agent system',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to start trading:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to start trading engine',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const baseUrl = req.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/agent/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    });

    const data = await response.json();

    return NextResponse.json({
      status: data.success ? 'stopped' : 'error',
      message: data.message || 'Trading engine stopped',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to stop trading:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to stop trading engine',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const baseUrl = req.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/agent/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status' }),
    });

    const data = await response.json();

    return NextResponse.json({
      status: data.state?.status === 'running' ? 'active' : 'inactive',
      performance: data.performance || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to get trading status:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to get trading status',
      },
      { status: 500 }
    );
  }
}
