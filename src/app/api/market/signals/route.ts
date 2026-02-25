import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: [],
      message: 'Connect trading agent to receive signals. Start the AI agent at /trading-agent to enable real-time signal generation.',
      timestamp: Date.now()
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch signals' },
      { status: 500 }
    );
  }
}
