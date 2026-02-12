// SMC Analysis Types

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OrderBlock {
  type: 'bullish' | 'bearish'
  high: number
  low: number
  timestamp: Date
  strength: number // 0-100
  tested: boolean
  volume: number
  mitigated: boolean
}

export interface FairValueGap {
  type: 'bullish' | 'bearish'
  top: number
  bottom: number
  timestamp: Date
  filled: boolean
}

export interface BreakOfStructure {
  type: 'bullish' | 'bearish'
  level: number
  timestamp: Date
  confirmed: boolean
}

export interface ChoCH {
  type: 'bullish' | 'bearish'
  level: number
  timestamp: Date
  fromTrend: 'bullish' | 'bearish'
}

export interface LiquidityLevel {
  type: 'high' | 'low'
  price: number
  timestamp: Date
  swept: boolean
  sweepTimestamp?: Date
}

export interface LiquiditySweep {
  type: 'bullish' | 'bearish'
  level: number
  timestamp: Date
  wickDepth: number
}

export type KillZoneSession = 'asia' | 'london' | 'new_york'

export interface KillZone {
  session: KillZoneSession
  startHourUTC: number
  endHourUTC: number
  active: boolean
}

export interface OTEZone {
  high: number
  low: number
  fib618: number
  fib786: number
  zone: { top: number; bottom: number }
}

export interface ConfluenceScore {
  total: number // 0-100
  components: {
    orderBlock: number
    fvg: number
    bos: number
    liquidity: number
    killZone: number
    ote: number
  }
}

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'

export interface SMCSignal {
  direction: 'long' | 'short'
  entry: number
  stopLoss: number
  takeProfit: number
  takeProfit2: number
  takeProfit3: number
  confluence: ConfluenceScore
  timestamp: Date
  reasons: string[]
  confidence: ConfidenceLevel
  riskReward: number
  confluenceList: string[]
}

export interface SMCAnalysisResult {
  orderBlocks: OrderBlock[]
  fairValueGaps: FairValueGap[]
  breakOfStructure: BreakOfStructure[]
  choch: ChoCH[]
  liquiditySweeps: LiquiditySweep[]
  signals: SMCSignal[]
  currentTrend: 'bullish' | 'bearish' | 'neutral'
  keyLevels: {
    support: number[]
    resistance: number[]
  }
  oteZone: OTEZone | null
  cvd: number
}
