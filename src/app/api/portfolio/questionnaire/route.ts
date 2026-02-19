import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { answers } = body

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Valid answers array is required' },
        { status: 400 }
      )
    }

    // Calculate investor profile based on answers

    // Calculate average score from all answers
    const totalScore = answers.reduce((sum, answer) => sum + answer.value, 0)
    const averageScore = totalScore / answers.length

    // Determine investor profile based on average score
    let profileType = 'Moderate'
    let riskTolerance = 50
    let timeHorizon = 50
    let diversity = 50
    let bitcoinAllocation = 50
    let ordinalsAllocation = 20
    let runesAllocation = 20
    let rareSatsAllocation = 10

    if (averageScore <= 1.5) {
      profileType = 'Conservative'
      riskTolerance = 25
      timeHorizon = 85
      diversity = 30
      bitcoinAllocation = 80
      ordinalsAllocation = 10
      runesAllocation = 5
      rareSatsAllocation = 5
    } else if (averageScore <= 2.5) {
      profileType = 'Moderate'
      riskTolerance = 50
      timeHorizon = 65
      diversity = 50
      bitcoinAllocation = 60
      ordinalsAllocation = 20
      runesAllocation = 15
      rareSatsAllocation = 5
    } else if (averageScore <= 3.5) {
      profileType = 'Growth'
      riskTolerance = 75
      timeHorizon = 50
      diversity = 70
      bitcoinAllocation = 40
      ordinalsAllocation = 30
      runesAllocation = 20
      rareSatsAllocation = 10
    } else {
      profileType = 'Aggressive'
      riskTolerance = 90
      timeHorizon = 30
      diversity = 85
      bitcoinAllocation = 25
      ordinalsAllocation = 35
      runesAllocation = 30
      rareSatsAllocation = 10
    }

    // Generate timestamp for analysis
    const analysisTimestamp = new Date().toISOString()

    // In a real implementation, this would save the profile to a database

    return NextResponse.json({
      success: true,
      message: 'Neural analysis of investor profile completed successfully',
      timestamp: analysisTimestamp,
      investorProfile: {
        profileType,
        riskTolerance,
        timeHorizon,
        diversity,
        score: parseFloat(averageScore.toFixed(2)),
        recommendedAllocation: {
          bitcoin: bitcoinAllocation,
          ordinals: ordinalsAllocation,
          runes: runesAllocation,
          rareSats: rareSatsAllocation
        },
        analysisDetails: {
          strengths: [
            profileType === 'Conservative' ? 'Strong focus on capital preservation' :
            profileType === 'Moderate' ? 'Balanced approach to risk and reward' :
            profileType === 'Growth' ? 'Good potential for long-term growth' :
            'High potential for maximum returns'
          ],
          considerations: [
            profileType === 'Conservative' ? 'May miss opportunities in emerging assets' :
            profileType === 'Moderate' ? 'Moderate exposure to market volatility' :
            profileType === 'Growth' ? 'Higher exposure to market volatility' :
            'Significant exposure to market volatility'
          ],
          timestamp: analysisTimestamp
        }
      }
    })
  } catch (error) {
    console.error('Error processing questionnaire:', error)
    return NextResponse.json(
      { error: 'Failed to process questionnaire' },
      { status: 500 }
    )
  }
}
