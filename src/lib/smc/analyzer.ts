// SMC Analysis Engine — Enhanced Implementation

import {
  Candle,
  OrderBlock,
  FairValueGap,
  BreakOfStructure,
  ChoCH,
  LiquiditySweep,
  OTEZone,
  SMCSignal,
  SMCAnalysisResult,
  ConfluenceScore,
  ConfidenceLevel,
  KillZoneSession,
} from './types'
import { isInKillZone } from './kill-zones'

interface SwingPoint {
  index: number
  price: number
  type: 'high' | 'low'
  time: number
}

export class SMCAnalyzer {
  private lookback = 5

  // ---------- Swing Point Detection ----------

  private findSwingPoints(candles: Candle[], lookback = this.lookback): SwingPoint[] {
    const swings: SwingPoint[] = []
    if (candles.length < lookback * 2 + 1) return swings

    for (let i = lookback; i < candles.length - lookback; i++) {
      let isSwingHigh = true
      let isSwingLow = true

      for (let j = 1; j <= lookback; j++) {
        if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) {
          isSwingHigh = false
        }
        if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) {
          isSwingLow = false
        }
      }

      if (isSwingHigh) {
        swings.push({ index: i, price: candles[i].high, type: 'high', time: candles[i].time })
      }
      if (isSwingLow) {
        swings.push({ index: i, price: candles[i].low, type: 'low', time: candles[i].time })
      }
    }

    return swings
  }

  // ---------- Order Blocks (Enhanced: tied to BOS) ----------

  detectOrderBlocks(candles: Candle[]): OrderBlock[] {
    const blocks: OrderBlock[] = []
    if (candles.length < 3) return blocks

    const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length
    const swings = this.findSwingPoints(candles)
    const highs = swings.filter(s => s.type === 'high')
    const lows = swings.filter(s => s.type === 'low')

    // Find BOS events to anchor order blocks
    for (let i = 2; i < candles.length; i++) {
      const c = candles[i]

      // Bullish BOS: price breaks above a previous swing high
      for (const sh of highs) {
        if (sh.index >= i) continue
        if (c.close > sh.price && candles[i - 1].close <= sh.price) {
          // Find the last bearish candle before this break
          for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
            if (candles[j].close < candles[j].open) {
              const hasVolume = candles[j].volume > avgVolume * 1.0
              const moveSize = (c.close - sh.price) / sh.price
              const strength = Math.min(moveSize * 5000, 100) * (hasVolume ? 1.2 : 0.8)
              blocks.push({
                type: 'bullish',
                high: candles[j].high,
                low: candles[j].low,
                timestamp: new Date(candles[j].time),
                strength: Math.min(Math.round(strength), 100),
                tested: false,
                volume: candles[j].volume,
                mitigated: false,
              })
              break
            }
          }
          break
        }
      }

      // Bearish BOS: price breaks below a previous swing low
      for (const sl of lows) {
        if (sl.index >= i) continue
        if (c.close < sl.price && candles[i - 1].close >= sl.price) {
          // Find the last bullish candle before this break
          for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
            if (candles[j].close > candles[j].open) {
              const hasVolume = candles[j].volume > avgVolume * 1.0
              const moveSize = (sl.price - c.close) / sl.price
              const strength = Math.min(moveSize * 5000, 100) * (hasVolume ? 1.2 : 0.8)
              blocks.push({
                type: 'bearish',
                high: candles[j].high,
                low: candles[j].low,
                timestamp: new Date(candles[j].time),
                strength: Math.min(Math.round(strength), 100),
                tested: false,
                volume: candles[j].volume,
                mitigated: false,
              })
              break
            }
          }
          break
        }
      }
    }

    // Also detect simple OBs from momentum for broader coverage
    for (let i = 1; i < candles.length - 1; i++) {
      const curr = candles[i]
      const next = candles[i + 1]
      const moveSize = Math.abs(next.close - curr.close) / curr.close
      const hasVolume = curr.volume > avgVolume * 1.2
      if (moveSize < 0.005) continue

      if (curr.close < curr.open && next.close > next.open && next.close > curr.high) {
        const strength = Math.min(moveSize * 5000, 100) * (hasVolume ? 1.2 : 0.8)
        const exists = blocks.some(b =>
          b.type === 'bullish' &&
          Math.abs(b.high - curr.high) < curr.high * 0.001 &&
          Math.abs(b.low - curr.low) < curr.low * 0.001
        )
        if (!exists) {
          blocks.push({
            type: 'bullish',
            high: curr.high,
            low: curr.low,
            timestamp: new Date(curr.time),
            strength: Math.min(Math.round(strength), 100),
            tested: false,
            volume: curr.volume,
            mitigated: false,
          })
        }
      }

      if (curr.close > curr.open && next.close < next.open && next.close < curr.low) {
        const strength = Math.min(moveSize * 5000, 100) * (hasVolume ? 1.2 : 0.8)
        const exists = blocks.some(b =>
          b.type === 'bearish' &&
          Math.abs(b.high - curr.high) < curr.high * 0.001 &&
          Math.abs(b.low - curr.low) < curr.low * 0.001
        )
        if (!exists) {
          blocks.push({
            type: 'bearish',
            high: curr.high,
            low: curr.low,
            timestamp: new Date(curr.time),
            strength: Math.min(Math.round(strength), 100),
            tested: false,
            volume: curr.volume,
            mitigated: false,
          })
        }
      }
    }

    // Check mitigation — price has returned through the OB zone
    for (let i = 0; i < blocks.length; i++) {
      const ob = blocks[i]
      const obTime = ob.timestamp.getTime()
      for (let j = candles.length - 1; j >= 0; j--) {
        if (candles[j].time < obTime) break
        if (ob.type === 'bullish' && candles[j].close < ob.low) {
          ob.mitigated = true
          break
        }
        if (ob.type === 'bearish' && candles[j].close > ob.high) {
          ob.mitigated = true
          break
        }
      }
    }

    return blocks
  }

  // ---------- Fair Value Gaps ----------

  detectFairValueGaps(candles: Candle[]): FairValueGap[] {
    const gaps: FairValueGap[] = []
    if (candles.length < 3) return gaps

    for (let i = 2; i < candles.length; i++) {
      const first = candles[i - 2]
      const second = candles[i - 1]
      const third = candles[i]

      // Bullish FVG: candle 1 high < candle 3 low
      if (first.high < third.low) {
        gaps.push({
          type: 'bullish',
          top: third.low,
          bottom: first.high,
          timestamp: new Date(second.time),
          filled: false,
        })
      }

      // Bearish FVG: candle 1 low > candle 3 high
      if (first.low > third.high) {
        gaps.push({
          type: 'bearish',
          top: first.low,
          bottom: third.high,
          timestamp: new Date(second.time),
          filled: false,
        })
      }
    }

    // Check fill status
    const lastPrice = candles[candles.length - 1].close
    for (const fvg of gaps) {
      if (fvg.type === 'bullish' && lastPrice <= fvg.bottom) {
        fvg.filled = true
      }
      if (fvg.type === 'bearish' && lastPrice >= fvg.top) {
        fvg.filled = true
      }
    }

    return gaps
  }

  // ---------- BOS / ChoCH (Enhanced) ----------

  detectBOSChoCH(candles: Candle[]): { bos: BreakOfStructure[]; choch: ChoCH[] } {
    const bos: BreakOfStructure[] = []
    const choch: ChoCH[] = []
    const swings = this.findSwingPoints(candles)
    if (swings.length < 4) return { bos, choch }

    const highs = swings.filter((s) => s.type === 'high')
    const lows = swings.filter((s) => s.type === 'low')

    // Determine initial trend
    let currentTrend: 'bullish' | 'bearish' = 'neutral' as 'bullish' | 'bearish'
    if (highs.length >= 2 && lows.length >= 2) {
      const risingHighs = highs[highs.length - 1].price > highs[highs.length - 2].price
      const risingLows = lows[lows.length - 1].price > lows[lows.length - 2].price
      currentTrend = risingHighs && risingLows ? 'bullish' : 'bearish'
    }

    // BOS: price breaks above previous swing high (bullish) or below swing low (bearish)
    // ChoCH: first break against the prevailing trend direction
    for (let i = 1; i < swings.length; i++) {
      const prev = swings[i - 1]
      const curr = swings[i]

      // BOS continuation
      if (currentTrend === 'bullish' && curr.type === 'high' && prev.type === 'high' && curr.price > prev.price) {
        bos.push({
          type: 'bullish',
          level: prev.price,
          timestamp: new Date(curr.time),
          confirmed: true,
        })
      }
      if (currentTrend === 'bearish' && curr.type === 'low' && prev.type === 'low' && curr.price < prev.price) {
        bos.push({
          type: 'bearish',
          level: prev.price,
          timestamp: new Date(curr.time),
          confirmed: true,
        })
      }

      // ChoCH reversal
      if (currentTrend === 'bullish' && curr.type === 'low' && prev.type === 'low' && curr.price < prev.price) {
        choch.push({
          type: 'bearish',
          level: prev.price,
          timestamp: new Date(curr.time),
          fromTrend: 'bullish',
        })
        currentTrend = 'bearish'
      }
      if (currentTrend === 'bearish' && curr.type === 'high' && prev.type === 'high' && curr.price > prev.price) {
        choch.push({
          type: 'bullish',
          level: prev.price,
          timestamp: new Date(curr.time),
          fromTrend: 'bearish',
        })
        currentTrend = 'bullish'
      }
    }

    return { bos, choch }
  }

  // ---------- Liquidity Sweeps (Enhanced: equal highs/lows) ----------

  detectLiquiditySweeps(candles: Candle[]): LiquiditySweep[] {
    const sweeps: LiquiditySweep[] = []
    const swings = this.findSwingPoints(candles)
    if (swings.length < 2) return sweeps

    // Also look for equal highs/lows (liquidity pools)
    const equalHighs: number[] = []
    const equalLows: number[] = []
    const tolerance = candles[candles.length - 1].close * 0.001

    const swingHighs = swings.filter(s => s.type === 'high')
    const swingLows = swings.filter(s => s.type === 'low')

    for (let i = 0; i < swingHighs.length; i++) {
      for (let j = i + 1; j < swingHighs.length; j++) {
        if (Math.abs(swingHighs[i].price - swingHighs[j].price) < tolerance) {
          equalHighs.push(Math.max(swingHighs[i].price, swingHighs[j].price))
        }
      }
    }
    for (let i = 0; i < swingLows.length; i++) {
      for (let j = i + 1; j < swingLows.length; j++) {
        if (Math.abs(swingLows[i].price - swingLows[j].price) < tolerance) {
          equalLows.push(Math.min(swingLows[i].price, swingLows[j].price))
        }
      }
    }

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i]

      for (const swing of swings) {
        if (swing.index >= i) continue

        // Sweep of swing high: wick above then close below
        if (swing.type === 'high' && candle.high > swing.price && candle.close < swing.price) {
          const wickDepth = candle.high - swing.price
          sweeps.push({
            type: 'bearish',
            level: swing.price,
            timestamp: new Date(candle.time),
            wickDepth,
          })
        }

        // Sweep of swing low: wick below then close above
        if (swing.type === 'low' && candle.low < swing.price && candle.close > swing.price) {
          const wickDepth = swing.price - candle.low
          sweeps.push({
            type: 'bullish',
            level: swing.price,
            timestamp: new Date(candle.time),
            wickDepth,
          })
        }
      }

      // Check sweeps of equal highs/lows
      for (const eqHigh of equalHighs) {
        if (candle.high > eqHigh && candle.close < eqHigh) {
          const exists = sweeps.some(s =>
            s.type === 'bearish' &&
            Math.abs(s.level - eqHigh) < tolerance &&
            s.timestamp.getTime() === candle.time
          )
          if (!exists) {
            sweeps.push({
              type: 'bearish',
              level: eqHigh,
              timestamp: new Date(candle.time),
              wickDepth: candle.high - eqHigh,
            })
          }
        }
      }
      for (const eqLow of equalLows) {
        if (candle.low < eqLow && candle.close > eqLow) {
          const exists = sweeps.some(s =>
            s.type === 'bullish' &&
            Math.abs(s.level - eqLow) < tolerance &&
            s.timestamp.getTime() === candle.time
          )
          if (!exists) {
            sweeps.push({
              type: 'bullish',
              level: eqLow,
              timestamp: new Date(candle.time),
              wickDepth: eqLow - candle.low,
            })
          }
        }
      }
    }

    return sweeps
  }

  // ---------- Kill Zones ----------

  identifyKillZones(timestamp: Date): KillZoneSession | null {
    return isInKillZone(timestamp)
  }

  // ---------- OTE Zone ----------

  calculateOTEZone(swingHigh: number, swingLow: number): OTEZone {
    const range = swingHigh - swingLow
    const fib618 = swingHigh - range * 0.618
    const fib786 = swingHigh - range * 0.786

    return {
      high: swingHigh,
      low: swingLow,
      fib618,
      fib786,
      zone: {
        top: fib618,
        bottom: fib786,
      },
    }
  }

  // ---------- CVD Calculation ----------

  calculateCVD(candles: Candle[]): number {
    let cvd = 0
    candles.forEach(c => {
      cvd += c.close > c.open ? c.volume : -c.volume
    })
    return cvd
  }

  // ---------- Signal Generation (Enhanced with TP2, TP3, confidence) ----------

  generateSignals(candles: Candle[]): SMCSignal[] {
    if (candles.length < 20) return []

    const signals: SMCSignal[] = []
    const orderBlocks = this.detectOrderBlocks(candles)
    const fvgs = this.detectFairValueGaps(candles)
    const { bos, choch } = this.detectBOSChoCH(candles)
    const sweeps = this.detectLiquiditySweeps(candles)
    const swings = this.findSwingPoints(candles)

    const lastCandle = candles[candles.length - 1]
    const lastPrice = lastCandle.close
    const now = new Date(lastCandle.time)
    const killZone = this.identifyKillZones(now)

    // Find most recent swing high and low for OTE
    const recentHigh = swings.filter((s) => s.type === 'high').pop()
    const recentLow = swings.filter((s) => s.type === 'low').pop()

    let ote: OTEZone | null = null
    if (recentHigh && recentLow) {
      ote = this.calculateOTEZone(recentHigh.price, recentLow.price)
    }

    // Determine if price is in premium or discount zone
    const midpoint = recentHigh && recentLow ? (recentHigh.price + recentLow.price) / 2 : lastPrice
    const isPremium = lastPrice > midpoint
    const isDiscount = lastPrice < midpoint

    const activeOBs = orderBlocks.filter((ob) => !ob.mitigated)
    const proximityThreshold = lastPrice * 0.005
    const atr = this.estimateATR(candles, 14)

    for (const ob of activeOBs) {
      const confluenceList: string[] = []
      const components = { orderBlock: 0, fvg: 0, bos: 0, liquidity: 0, killZone: 0, ote: 0 }

      const nearOB =
        (ob.type === 'bullish' && lastPrice >= ob.low - proximityThreshold && lastPrice <= ob.high + proximityThreshold) ||
        (ob.type === 'bearish' && lastPrice >= ob.low - proximityThreshold && lastPrice <= ob.high + proximityThreshold)

      if (!nearOB) continue

      // Order block score
      components.orderBlock = Math.round(ob.strength * 0.3)
      confluenceList.push('OB')

      // FVG alignment
      const alignedFVG = fvgs.find(
        (f) =>
          !f.filled &&
          f.type === ob.type &&
          Math.abs(f.bottom - ob.low) < proximityThreshold
      )
      if (alignedFVG) {
        components.fvg = 20
        confluenceList.push('FVG')
      }

      // BOS/ChoCH confirmation
      const recentBOS = bos.filter((b) => b.type === ob.type).length > 0
      const recentChoCH = choch.filter((c) => c.type === ob.type).length > 0
      if (recentBOS) {
        components.bos = 15
        confluenceList.push('BOS')
      }
      if (recentChoCH) {
        components.bos = Math.max(components.bos, 20)
        confluenceList.push('ChoCH')
      }

      // Liquidity sweep
      const recentSweep = sweeps.find(
        (s) => s.type === ob.type && Math.abs(s.timestamp.getTime() - now.getTime()) < 86400000
      )
      if (recentSweep) {
        components.liquidity = 15
        confluenceList.push('Liquidity')
      }

      // Kill zone bonus
      if (killZone) {
        components.killZone = 10
        confluenceList.push('Kill Zone')
      }

      // OTE zone
      if (ote) {
        const inOTE = lastPrice >= ote.zone.bottom && lastPrice <= ote.zone.top
        if (inOTE) {
          components.ote = 15
          confluenceList.push('OTE')
        }
      }

      // Premium/Discount
      if (ob.type === 'bullish' && isDiscount) {
        confluenceList.push('Discount')
      } else if (ob.type === 'bearish' && isPremium) {
        confluenceList.push('Premium')
      }

      const total = Math.min(
        components.orderBlock + components.fvg + components.bos + components.liquidity + components.killZone + components.ote,
        100
      )

      if (total < 20) continue

      const direction: 'long' | 'short' = ob.type === 'bullish' ? 'long' : 'short'
      const entry = lastPrice
      const stopLoss = direction === 'long' ? ob.low - atr * 0.5 : ob.high + atr * 0.5
      const risk = Math.abs(entry - stopLoss)
      const takeProfit = direction === 'long' ? entry + risk * 2 : entry - risk * 2
      const takeProfit2 = direction === 'long' ? entry + risk * 3 : entry - risk * 3
      const takeProfit3 = direction === 'long' ? entry + risk * 5 : entry - risk * 5
      const riskReward = risk > 0 ? Math.abs(takeProfit - entry) / risk : 0

      // Confidence based on number of confluences
      let confidence: ConfidenceLevel = 'LOW'
      if (confluenceList.length >= 4) confidence = 'HIGH'
      else if (confluenceList.length >= 3) confidence = 'MEDIUM'

      signals.push({
        direction,
        entry,
        stopLoss,
        takeProfit,
        takeProfit2,
        takeProfit3,
        confluence: { total, components },
        timestamp: now,
        reasons: confluenceList.map(c => {
          if (c === 'OB') return `${ob.type} OB (str ${ob.strength})`
          if (c === 'Kill Zone') return `${killZone} session`
          return c
        }),
        confidence,
        riskReward,
        confluenceList,
      })
    }

    // Sort by confluence score descending
    signals.sort((a, b) => b.confluence.total - a.confluence.total)

    return signals
  }

  // ---------- Full Analysis ----------

  analyze(candles: Candle[]): SMCAnalysisResult {
    const orderBlocks = this.detectOrderBlocks(candles)
    const fairValueGaps = this.detectFairValueGaps(candles)
    const { bos, choch } = this.detectBOSChoCH(candles)
    const liquiditySweeps = this.detectLiquiditySweeps(candles)
    const signals = this.generateSignals(candles)
    const cvd = this.calculateCVD(candles)

    // OTE zone from last swing
    const swings = this.findSwingPoints(candles)
    const recentHigh = swings.filter(s => s.type === 'high').pop()
    const recentLow = swings.filter(s => s.type === 'low').pop()
    let oteZone: OTEZone | null = null
    if (recentHigh && recentLow) {
      oteZone = this.calculateOTEZone(recentHigh.price, recentLow.price)
    }

    // Determine trend
    let currentTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (candles.length >= 10) {
      const recent = candles.slice(-10)
      const startPrice = recent[0].close
      const endPrice = recent[recent.length - 1].close
      const change = (endPrice - startPrice) / startPrice
      if (change > 0.005) currentTrend = 'bullish'
      else if (change < -0.005) currentTrend = 'bearish'
    }

    return {
      orderBlocks,
      fairValueGaps,
      breakOfStructure: bos,
      choch,
      liquiditySweeps,
      signals,
      currentTrend,
      keyLevels: {
        support: orderBlocks.filter((b) => b.type === 'bullish').map((b) => b.low),
        resistance: orderBlocks.filter((b) => b.type === 'bearish').map((b) => b.high),
      },
      oteZone,
      cvd,
    }
  }

  // ---------- Helpers ----------

  private estimateATR(candles: Candle[], period: number): number {
    if (candles.length < period + 1) {
      return candles.length > 1
        ? candles.reduce((sum, c) => sum + (c.high - c.low), 0) / candles.length
        : 0
    }

    let atrSum = 0
    for (let i = candles.length - period; i < candles.length; i++) {
      const high = candles[i].high
      const low = candles[i].low
      const prevClose = candles[i - 1].close
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))
      atrSum += tr
    }

    return atrSum / period
  }
}

export const smcAnalyzer = new SMCAnalyzer()
