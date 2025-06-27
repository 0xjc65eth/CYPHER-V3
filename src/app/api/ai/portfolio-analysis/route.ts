import { NextRequest, NextResponse } from 'next/server';


interface PortfolioAnalysisRequest {
  address: string;
  portfolioData: any;
  riskProfile: 'safe' | 'moderate' | 'degen' | 'degen_lfg';
  currentBtcPrice: number;
}

interface InvestmentOpportunity {
  id: string;
  name: string;
  category: 'bitcoin' | 'ordinals' | 'runes' | 'defi' | 'lightning';
  riskLevel: 'safe' | 'moderate' | 'degen' | 'degen_lfg';
  expectedReturn: number;
  satoshiPotential: number;
  confidence: number;
  timeframe: string;
  reasoning: string;
  strategy: string;
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
}

// AI Analysis Engine - Generates investment insights
function generateAIAnalysis(data: PortfolioAnalysisRequest) {
  const { portfolioData, riskProfile, currentBtcPrice } = data;
  const portfolio = portfolioData?.portfolio;
  
  if (!portfolio) {
    throw new Error('Invalid portfolio data');
  }

  // Calculate portfolio metrics
  const totalValue = portfolio.totalValue || 0;
  const btcAmount = portfolio.bitcoin?.totalAmount || 0;
  const btcDominance = totalValue > 0 ? (portfolio.bitcoin?.currentValue || 0) / totalValue : 0;
  const pnlPercentage = portfolio.totalPNLPercentage || 0;

  // Generate risk score (0-100)
  const calculateRiskScore = () => {
    let score = 50; // Base neutral score
    
    // BTC dominance factor
    if (btcDominance > 0.8) score -= 10; // Less risky with high BTC
    if (btcDominance < 0.3) score += 15; // More risky with low BTC
    
    // Performance factor
    if (pnlPercentage > 20) score += 5; // Good performance = can take more risk
    if (pnlPercentage < -10) score -= 10; // Poor performance = be more careful
    
    // Portfolio size factor
    if (totalValue > 100000) score -= 5; // Larger portfolios are more stable
    if (totalValue < 1000) score += 10; // Smaller portfolios are riskier
    
    return Math.max(0, Math.min(100, score));
  };

  const riskScore = calculateRiskScore();

  // Generate opportunities based on risk profile
  const generateOpportunities = (): InvestmentOpportunity[] => {
    const baseOpportunities: InvestmentOpportunity[] = [
      {
        id: 'btc-dca',
        name: 'Bitcoin DCA Strategy',
        category: 'bitcoin',
        riskLevel: 'safe',
        expectedReturn: 15,
        satoshiPotential: Math.floor(0.1 * 100000000), // 0.1 BTC potential
        confidence: 85,
        timeframe: '12 months',
        reasoning: 'Bitcoin continues to show strong fundamentals with institutional adoption growing.',
        strategy: 'Set up weekly DCA purchases during market dips below $100K.',
        entryPrice: currentBtcPrice * 0.95,
        targetPrice: currentBtcPrice * 1.5,
        stopLoss: currentBtcPrice * 0.8
      },
      {
        id: 'ordinals-bluechip',
        name: 'Ordinals Blue Chips',
        category: 'ordinals',
        riskLevel: 'moderate',
        expectedReturn: 35,
        satoshiPotential: Math.floor(0.05 * 100000000),
        confidence: 70,
        timeframe: '6 months',
        reasoning: 'Blue chip Ordinals collections showing consistent floor price growth.',
        strategy: 'Focus on sub-1K inscriptions from established collections.',
        entryPrice: 0.01,
        targetPrice: 0.015,
        stopLoss: 0.008
      },
      {
        id: 'runes-alpha',
        name: 'Runes Alpha Opportunities',
        category: 'runes',
        riskLevel: 'degen',
        expectedReturn: 150,
        satoshiPotential: Math.floor(0.2 * 100000000),
        confidence: 45,
        timeframe: '3 months',
        reasoning: 'Runes protocol showing early adoption with high volatility opportunities.',
        strategy: 'Small positions in promising runes with strong community.',
        entryPrice: 1000,
        targetPrice: 5000,
        stopLoss: 500
      },
      {
        id: 'lightning-liquidity',
        name: 'Lightning Liquidity Mining',
        category: 'lightning',
        riskLevel: 'moderate',
        expectedReturn: 25,
        satoshiPotential: Math.floor(0.03 * 100000000),
        confidence: 75,
        timeframe: '9 months',
        reasoning: 'Lightning Network adoption increasing, liquidity providers earning consistent yields.',
        strategy: 'Provide liquidity on major LN channels for fee income.',
        entryPrice: currentBtcPrice,
        targetPrice: currentBtcPrice * 1.25,
        stopLoss: currentBtcPrice * 0.9
      }
    ];

    // Filter opportunities based on risk profile
    const riskLevels = {
      safe: ['safe'],
      moderate: ['safe', 'moderate'],
      degen: ['safe', 'moderate', 'degen'],
      degen_lfg: ['safe', 'moderate', 'degen', 'degen_lfg']
    };

    return baseOpportunities.filter(opp => 
      riskLevels[riskProfile].includes(opp.riskLevel)
    );
  };

  // Generate market insights
  const generateMarketInsights = () => {
    const insights = [];
    
    if (currentBtcPrice > 100000) {
      insights.push({
        type: 'bullish',
        title: 'Bitcoin Above $100K',
        description: 'Institutional adoption accelerating. Consider taking some profits.',
        confidence: 80
      });
    }
    
    if (btcDominance > 0.9) {
      insights.push({
        type: 'diversification',
        title: 'High BTC Concentration',
        description: 'Consider diversifying into Ordinals or Lightning opportunities.',
        confidence: 70
      });
    }
    
    if (pnlPercentage > 50) {
      insights.push({
        type: 'profit-taking',
        title: 'Strong Performance',
        description: 'Portfolio up significantly. Consider rebalancing.',
        confidence: 75
      });
    }

    return insights;
  };

  // Generate recommendations
  const generateRecommendations = () => {
    const recommendations = [];
    
    if (riskProfile === 'safe') {
      recommendations.push({
        action: 'DCA Bitcoin',
        reasoning: 'Consistent accumulation in small amounts reduces volatility',
        priority: 'high'
      });
    }
    
    if (riskProfile === 'degen' || riskProfile === 'degen_lfg') {
      recommendations.push({
        action: 'Ordinals Sniping',
        reasoning: 'Look for undervalued rare sats and unique inscriptions',
        priority: 'medium'
      });
    }
    
    if (totalValue > 10000) {
      recommendations.push({
        action: 'Lightning Channels',
        reasoning: 'Generate passive income through routing fees',
        priority: 'medium'
      });
    }

    return recommendations;
  };

  return {
    portfolioHealth: {
      score: riskScore,
      grade: riskScore > 80 ? 'A' : riskScore > 60 ? 'B' : riskScore > 40 ? 'C' : 'D',
      summary: riskScore > 70 ? 'Strong position' : riskScore > 50 ? 'Balanced approach needed' : 'High risk detected',
      strengths: [
        'Strong Bitcoin position providing stability',
        'Consistent performance tracking',
        'Active portfolio management',
        'Risk-aware investment approach'
      ],
      weaknesses: [
        'Limited diversification beyond Bitcoin',
        'Potential for higher volatility',
        'Market timing dependency',
        'Could benefit from DeFi exposure'
      ],
      recommendations: [
        'Consider gradual diversification into Ordinals',
        'Set up automated DCA for consistent accumulation',
        'Monitor Lightning Network opportunities',
        'Implement risk management stops'
      ]
    },
    opportunities: generateOpportunities(),
    marketInsights: generateMarketInsights(),
    recommendations: generateRecommendations(),
    riskMetrics: {
      volatility: riskScore,
      diversification: Math.round(btcDominance * 100),
      liquidityRisk: totalValue < 1000 ? 'High' : totalValue < 10000 ? 'Medium' : 'Low'
    },
    prediction: {
      nextMonth: pnlPercentage > 0 ? 'bullish' : 'bearish',
      confidence: Math.round(60 + (Math.abs(pnlPercentage) / 100) * 20),
      expectedReturn: Math.round(10 + (riskScore / 10))
    },
    neuralPredictions: {
      portfolioGrowthPotential: Math.round(15 + (riskScore / 5)),
      btcPrice7d: Math.round(currentBtcPrice * (1 + (Math.random() - 0.5) * 0.1)),
      btcPrice30d: Math.round(currentBtcPrice * (1 + (Math.random() - 0.3) * 0.3)),
      riskScore: riskScore / 10,
      confidenceLevel: 87.3
    },
    satoshiAccumulationPlan: {
      strategy: 'Optimize Bitcoin accumulation through strategic DCA and market timing for maximum satoshi growth',
      weeklyTarget: Math.round(totalValue * 0.1 / currentBtcPrice * 100000000),
      monthlyTarget: Math.round(totalValue * 0.4 / currentBtcPrice * 100000000),
      methods: [
        'Weekly DCA during market dips',
        'Lightning Network earning opportunities',
        'Ordinals trading profits reinvestment',
        'Runes protocol early adoption rewards'
      ]
    }
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: PortfolioAnalysisRequest = await request.json();
    
    if (!body.address) {
      return NextResponse.json({
        success: false,
        error: 'Wallet address is required'
      }, { status: 400 });
    }

    console.log('🤖 AI Analysis Request:', {
      address: body.address,
      riskProfile: body.riskProfile,
      portfolioValue: body.portfolioData?.portfolio?.totalValue
    });

    // Generate AI analysis
    const analysis = generateAIAnalysis(body);

    // Simulate processing time for AI feel
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('✅ AI Analysis Generated:', {
      score: analysis.portfolioHealth.score,
      opportunities: analysis.opportunities.length,
      insights: analysis.marketInsights.length
    });

    return NextResponse.json({
      success: true,
      data: {
        analysis,
        timestamp: new Date().toISOString(),
        riskProfile: body.riskProfile,
        processingTime: '1.5s'
      }
    });

  } catch (error) {
    console.error('❌ AI Analysis Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate AI analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}