import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/middleware/rate-limiter'

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60)
  if (rateLimitRes) return rateLimitRes

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
