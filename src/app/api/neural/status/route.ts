import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      status: 'standby',
      models: [],
      metrics: [],
      recentInsights: [],
      trainingData: null,
      systemHealth: null,
      message: 'Neural models available when training data is provided. Configure the AI agent at /trading-agent to enable model training.'
    })
  } catch (error) {
    console.error('Error fetching neural system status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch neural system status' },
      { status: 500 }
    )
  }
}
