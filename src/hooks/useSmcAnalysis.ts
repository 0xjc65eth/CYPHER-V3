'use client'

import { useMemo } from 'react'
import { SMCAnalyzer } from '@/lib/smc/analyzer'
import type { Candle, SMCAnalysisResult, SMCSignal } from '@/lib/smc/types'

const analyzer = new SMCAnalyzer()

export function useSmcAnalysis(candles: Candle[]) {
  const analysis = useMemo<SMCAnalysisResult | null>(() => {
    if (candles.length < 20) return null
    return analyzer.analyze(candles)
  }, [candles])

  const signals = useMemo<SMCSignal[]>(() => {
    return analysis?.signals ?? []
  }, [analysis])

  return { analysis, signals, loading: false }
}
