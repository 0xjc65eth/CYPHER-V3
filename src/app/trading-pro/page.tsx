'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { SmcChart } from '@/components/charts/SmcChart'
import type { SmcCandle } from '@/components/charts/SmcChart'
import { SmcOverlayControls, DEFAULT_OVERLAYS } from '@/components/charts/SmcOverlayControls'
import type { OverlayConfig } from '@/components/charts/SmcOverlayControls'
import { DerivativesBar } from '@/components/charts/DerivativesBar'
import { SignalPanel } from '@/components/charts/SignalPanel'
import { useSmcAnalysis } from '@/hooks/useSmcAnalysis'
import { useDerivativesData } from '@/hooks/useDerivativesData'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Candle } from '@/lib/smc/types'

// ── Types ──────────────────────────────────────────────────────────

interface FundingInfo {
  hlRate: string
  dydxRate: string
}

// ── Constants ──────────────────────────────────────────────────────

const MARKETS = [
  { label: 'BTC-PERP', binance: 'BTCUSDT', hl: 'BTC', dydx: 'BTC-USD' },
  { label: 'ETH-PERP', binance: 'ETHUSDT', hl: 'ETH', dydx: 'ETH-USD' },
  { label: 'SOL-PERP', binance: 'SOLUSDT', hl: 'SOL', dydx: 'SOL-USD' },
  { label: 'DOGE-PERP', binance: 'DOGEUSDT', hl: 'DOGE', dydx: 'DOGE-USD' },
  { label: 'XRP-PERP', binance: 'XRPUSDT', hl: 'XRP', dydx: 'XRP-USD' },
] as const

const TIMEFRAMES = [
  { label: '1m', interval: '1m' },
  { label: '5m', interval: '5m' },
  { label: '15m', interval: '15m' },
  { label: '1h', interval: '1h' },
  { label: '4h', interval: '4h' },
  { label: '1D', interval: '1d' },
  { label: '1W', interval: '1w' },
] as const

// ── Technical Indicators ───────────────────────────────────────────

function calculateRSI(closes: number[], period = 14): number[] {
  const rsi: number[] = []
  if (closes.length < period + 1) return rsi

  let avgGain = 0
  let avgLoss = 0

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) avgGain += diff
    else avgLoss += Math.abs(diff)
  }

  avgGain /= period
  avgLoss /= period

  for (let i = 0; i < period; i++) rsi.push(50)

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  rsi.push(100 - 100 / (1 + rs))

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    const gain = diff >= 0 ? diff : 0
    const loss = diff < 0 ? Math.abs(diff) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    const curRs = avgLoss === 0 ? 100 : avgGain / avgLoss
    rsi.push(100 - 100 / (1 + curRs))
  }

  return rsi
}

function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = []
  if (data.length === 0) return ema
  const k = 2 / (period + 1)
  ema.push(data[0])
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k))
  }
  return ema
}

function calculateMACD(closes: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const ema12 = calculateEMA(closes, 12)
  const ema26 = calculateEMA(closes, 26)
  const macdLine = ema12.map((v, i) => v - ema26[i])
  const signalLine = calculateEMA(macdLine, 9)
  const histogram = macdLine.map((v, i) => v - signalLine[i])
  return { macd: macdLine, signal: signalLine, histogram }
}

function formatNum(n: number, decimals = 2): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toFixed(decimals)
}

// ── Component ──────────────────────────────────────────────────────

export default function TradingProPage() {
  const [marketIdx, setMarketIdx] = useState(0)
  const [tfIdx, setTfIdx] = useState(3) // default 1h
  const [rawKlines, setRawKlines] = useState<any[][]>([])
  const [funding, setFunding] = useState<FundingInfo>({ hlRate: '--', dydxRate: '--' })
  const [loading, setLoading] = useState(true)
  const [lastPrice, setLastPrice] = useState(0)
  const [change24h, setChange24h] = useState(0)
  const [volume24h, setVolume24h] = useState(0)
  const [overlays, setOverlays] = useState<OverlayConfig>(DEFAULT_OVERLAYS)

  const market = MARKETS[marketIdx]
  const timeframe = TIMEFRAMES[tfIdx]
  const derivatives = useDerivativesData(market.binance)

  // Convert raw klines to SmcCandle format for chart (UTC seconds)
  const smcCandles = useMemo<SmcCandle[]>(() => {
    return rawKlines.map((k) => ({
      time: Math.floor(k[0] / 1000), // ms -> seconds
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }))
  }, [rawKlines])

  // Convert to SMC analyzer Candle format (time in ms for Date construction)
  const analyzerCandles = useMemo<Candle[]>(() => {
    return rawKlines.map((k) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }))
  }, [rawKlines])

  const { analysis, signals } = useSmcAnalysis(analyzerCandles)

  // CVD calculation
  const cvdData = useMemo(() => {
    const data: { time: number; cvd: number }[] = []
    let cvd = 0
    for (const c of smcCandles) {
      cvd += c.close > c.open ? c.volume : -c.volume
      data.push({ time: c.time, cvd })
    }
    return data
  }, [smcCandles])

  const currentCVD = cvdData.length > 0 ? cvdData[cvdData.length - 1].cvd : 0

  const fetchCandles = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${market.binance}&interval=${timeframe.interval}&limit=500`
      )
      if (!res.ok) throw new Error('Binance error')
      const raw = await res.json()
      setRawKlines(raw)
      if (raw.length > 0) setLastPrice(parseFloat(raw[raw.length - 1][4]))
    } catch (e) {
      console.error('[TradingPro] Candles error:', e)
    }
  }, [market.binance, timeframe.interval])

  const fetchTicker = useCallback(async () => {
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${market.binance}`)
      if (!res.ok) return
      const data = await res.json()
      setChange24h(parseFloat(data.priceChangePercent))
      setVolume24h(parseFloat(data.quoteVolume))
      setLastPrice(parseFloat(data.lastPrice))
    } catch (e) {
      console.error('[TradingPro] Ticker error:', e)
    }
  }, [market.binance])

  const fetchFunding = useCallback(async () => {
    try {
      const [hlRes, dydxRes] = await Promise.allSettled([
        fetch('https://api.hyperliquid.xyz/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
        }),
        fetch(`https://indexer.dydx.trade/v4/historicalFunding/${encodeURIComponent(market.dydx)}`),
      ])

      let hlRate = '--'
      if (hlRes.status === 'fulfilled' && hlRes.value.ok) {
        const hlData = await hlRes.value.json()
        const meta = hlData?.[0]?.universe || []
        const ctxs = hlData?.[1] || []
        const idx = meta.findIndex((m: any) => m.name === market.hl)
        if (idx >= 0 && ctxs[idx]) {
          hlRate = (parseFloat(ctxs[idx].funding) * 100).toFixed(4) + '%'
        }
      }

      let dydxRate = '--'
      if (dydxRes.status === 'fulfilled' && dydxRes.value.ok) {
        const dydxData = await dydxRes.value.json()
        const rates = dydxData?.historicalFunding || []
        if (rates.length > 0) {
          dydxRate = (parseFloat(rates[0].rate) * 100).toFixed(4) + '%'
        }
      }

      setFunding({ hlRate, dydxRate })
    } catch (e) {
      console.error('[TradingPro] Funding error:', e)
    }
  }, [market.hl, market.dydx])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchCandles(), fetchTicker(), fetchFunding()]).finally(() => setLoading(false))
    const interval = setInterval(() => {
      fetchCandles()
      fetchTicker()
      fetchFunding()
    }, 20000)
    return () => clearInterval(interval)
  }, [fetchCandles, fetchTicker, fetchFunding])

  // ── Derivatives detail data ──
  const [derivativesDetail, setDerivativesDetail] = useState<any>(null)
  const [derivativesLoading, setDerivativesLoading] = useState(false)

  const fetchDerivativesDetail = useCallback(async () => {
    setDerivativesLoading(true)
    try {
      const res = await fetch(`/api/market/derivatives?symbol=${market.binance}`)
      if (res.ok) setDerivativesDetail(await res.json())
    } catch (e) {
      console.error('[TradingPro] Derivatives detail error:', e)
    } finally {
      setDerivativesLoading(false)
    }
  }, [market.binance])

  // ── Signals data ──
  const [signalsData, setSignalsData] = useState<any>(null)
  const [signalsLoading, setSignalsLoading] = useState(false)

  const fetchSignals = useCallback(async () => {
    setSignalsLoading(true)
    try {
      const res = await fetch(`/api/market/signals?symbol=${market.binance}`)
      if (res.ok) setSignalsData(await res.json())
    } catch (e) {
      console.error('[TradingPro] Signals error:', e)
    } finally {
      setSignalsLoading(false)
    }
  }, [market.binance])

  useEffect(() => {
    fetchDerivativesDetail()
    fetchSignals()
  }, [fetchDerivativesDetail, fetchSignals])

  // Compute indicators
  const closes = useMemo(() => analyzerCandles.map((c) => c.close), [analyzerCandles])
  const rsiValues = useMemo(() => calculateRSI(closes), [closes])
  const macdData = useMemo(() => calculateMACD(closes), [closes])

  const currentRSI = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : 50
  const currentMACD = macdData.macd.length > 0 ? macdData.macd[macdData.macd.length - 1] : 0
  const currentSignal = macdData.signal.length > 0 ? macdData.signal[macdData.signal.length - 1] : 0
  const currentHist = macdData.histogram.length > 0 ? macdData.histogram[macdData.histogram.length - 1] : 0

  // RSI / MACD / CVD display arrays for mini charts
  const displayRSI = rsiValues.slice(-100)
  const displayMACD = macdData.histogram.slice(-100)
  const macdMax = displayMACD.length > 0 ? Math.max(...displayMACD.map(Math.abs), 0.01) : 1

  const displayCVD = cvdData.slice(-100)
  const cvdValues = displayCVD.map(d => d.cvd)
  const cvdMin = cvdValues.length > 0 ? Math.min(...cvdValues) : 0
  const cvdMax = cvdValues.length > 0 ? Math.max(...cvdValues) : 1
  const cvdRange = cvdMax - cvdMin || 1

  const smcAnalysis = analysis

  const tabTriggerClass = "rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono"

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white font-mono">
      <div className="max-w-[1800px] mx-auto px-4 py-4">
        {/* Top Bar - Always Visible */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-orange-500 tracking-widest">TRADING PRO</h1>
            <div className="flex gap-1">
              {MARKETS.map((m, i) => (
                <button
                  key={m.label}
                  onClick={() => setMarketIdx(i)}
                  className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                    i === marketIdx
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-gray-500">LAST </span>
              <span className="text-white font-bold">${lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-gray-500">24H </span>
              <span className={change24h >= 0 ? 'text-green-400' : 'text-red-400'}>
                {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-gray-500">VOL </span>
              <span className="text-blue-400">${formatNum(volume24h)}</span>
            </div>
          </div>
        </div>

        {/* Timeframe Selector - Always Visible */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5 bg-gray-900 rounded p-0.5">
              {TIMEFRAMES.map((tf, i) => (
                <button
                  key={tf.label}
                  onClick={() => setTfIdx(i)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${
                    i === tfIdx
                      ? 'bg-orange-600 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
          <SmcOverlayControls overlays={overlays} onChange={setOverlays} />
        </div>

        {/* ── Sub-Tabs ── */}
        <Tabs defaultValue="chart" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-4">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="chart" className={tabTriggerClass}>
                Chart PRO
              </TabsTrigger>
              <TabsTrigger value="smc" className={tabTriggerClass}>
                SMC Analysis
              </TabsTrigger>
              <TabsTrigger value="derivatives" className={tabTriggerClass}>
                Derivatives
              </TabsTrigger>
              <TabsTrigger value="signals" className={tabTriggerClass}>
                Signals &amp; Alerts
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              TAB 1: Chart PRO
             ════════════════════════════════════════════════════════════════ */}
          <TabsContent value="chart">
            {/* Derivatives Bar */}
            <div className="mb-3">
              <DerivativesBar
                fundingRate={derivatives.fundingRate}
                openInterest={derivatives.openInterest}
                longShortRatio={derivatives.longShortRatio}
                loading={derivatives.loading}
                lastPrice={lastPrice}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
              {/* Chart + Indicators Area (3 cols) */}
              <div className="xl:col-span-3 space-y-3">
                {/* SMC Candlestick Chart */}
                <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded overflow-hidden">
                  {loading && smcCandles.length === 0 ? (
                    <div className="flex items-center justify-center h-[500px] text-gray-600 font-mono">Loading chart...</div>
                  ) : (
                    <SmcChart
                      candles={smcCandles}
                      smcResult={analysis}
                      overlays={overlays}
                      height={500}
                    />
                  )}
                </div>

                {/* Trend Badge + OTE Info */}
                {analysis && (
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                    <span className="text-gray-500">SMC TREND:</span>
                    <span className={`font-bold uppercase px-2 py-0.5 rounded ${
                      analysis.currentTrend === 'bullish' ? 'bg-green-900/40 text-green-400' :
                      analysis.currentTrend === 'bearish' ? 'bg-red-900/40 text-red-400' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {analysis.currentTrend}
                    </span>
                    <span className="text-gray-600">
                      OBs: {analysis.orderBlocks.filter(ob => !ob.mitigated).length} |
                      FVGs: {analysis.fairValueGaps.filter(f => !f.filled).length} |
                      BOS: {analysis.breakOfStructure.length} |
                      ChoCH: {analysis.choch.length} |
                      Sweeps: {analysis.liquiditySweeps.length}
                    </span>
                    {analysis.oteZone && (
                      <span className="text-teal-400">
                        OTE: ${analysis.oteZone.zone.bottom.toFixed(0)} - ${analysis.oteZone.zone.top.toFixed(0)}
                      </span>
                    )}
                  </div>
                )}

                {/* CVD Mini Panel */}
                <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-mono">Cumulative Volume Delta (CVD)</span>
                    <span className={`text-sm font-bold font-mono ${currentCVD >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatNum(currentCVD)}
                    </span>
                  </div>
                  <div className="h-16 flex items-end gap-px relative">
                    {cvdMin < 0 && cvdMax > 0 && (
                      <div
                        className="absolute left-0 right-0 border-t border-gray-700 border-dashed"
                        style={{ bottom: `${((0 - cvdMin) / cvdRange) * 100}%` }}
                      />
                    )}
                    {displayCVD.map((d, i) => {
                      const pct = ((d.cvd - cvdMin) / cvdRange) * 100
                      return (
                        <div key={i} className="flex-1 relative h-full">
                          <div
                            className="absolute bottom-0 left-0 right-0 rounded-t-sm"
                            style={{
                              height: `${Math.max(pct, 1)}%`,
                              backgroundColor: d.cvd >= 0 ? '#22c55e50' : '#ef444450',
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-1 text-[9px] text-gray-600 font-mono">
                    <span>Selling pressure</span>
                    <span>Buying pressure</span>
                  </div>
                </div>

                {/* Indicators Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* RSI */}
                  <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 uppercase tracking-wider font-mono">RSI (14)</span>
                      <span className={`text-sm font-bold font-mono ${
                        currentRSI > 70 ? 'text-red-400' : currentRSI < 30 ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {currentRSI.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-20 flex items-end gap-px">
                      {displayRSI.map((r, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm"
                          style={{
                            height: `${r}%`,
                            backgroundColor: r > 70 ? '#ef444480' : r < 30 ? '#22c55e80' : '#eab30840',
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-gray-600 font-mono">
                      <span>Oversold (30)</span>
                      <span>Overbought (70)</span>
                    </div>
                  </div>

                  {/* MACD */}
                  <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 uppercase tracking-wider font-mono">MACD (12,26,9)</span>
                      <div className="flex gap-3 text-xs font-mono">
                        <span className="text-blue-400">M: {currentMACD.toFixed(2)}</span>
                        <span className="text-orange-400">S: {currentSignal.toFixed(2)}</span>
                        <span className={currentHist >= 0 ? 'text-green-400' : 'text-red-400'}>
                          H: {currentHist.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="h-20 flex items-center gap-px">
                      {displayMACD.map((h, i) => {
                        const pct = (Math.abs(h) / macdMax) * 50
                        return (
                          <div key={i} className="flex-1 relative h-full">
                            <div
                              className="absolute left-0 right-0 rounded-sm"
                              style={{
                                ...(h >= 0
                                  ? { bottom: '50%', height: `${pct}%` }
                                  : { top: '50%', height: `${pct}%` }),
                                backgroundColor: h >= 0 ? '#22c55e80' : '#ef444480',
                              }}
                            />
                          </div>
                        )
                      })}
                    </div>
                    <div className="border-t border-[#1a1a2e] mt-0.5" />
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-3">
                <SignalPanel signals={signals} />

                {/* Funding Rates */}
                <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-mono">Funding Rates</div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400 font-mono">HyperLiquid</span>
                      <span className="text-sm font-bold text-green-400 font-mono">{funding.hlRate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400 font-mono">dYdX</span>
                      <span className="text-sm font-bold text-purple-400 font-mono">{funding.dydxRate}</span>
                    </div>
                  </div>
                </div>

                {/* Technical Summary */}
                <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-mono">Technical Summary</div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">RSI Signal</span>
                      <span className={`font-bold ${
                        currentRSI > 70 ? 'text-red-400' : currentRSI < 30 ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {currentRSI > 70 ? 'OVERBOUGHT' : currentRSI < 30 ? 'OVERSOLD' : 'NEUTRAL'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">MACD Signal</span>
                      <span className={`font-bold ${currentHist >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {currentHist >= 0 ? 'BULLISH' : 'BEARISH'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">CVD Bias</span>
                      <span className={`font-bold ${currentCVD >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {currentCVD >= 0 ? 'BUYING' : 'SELLING'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Trend</span>
                      <span className={`font-bold ${change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {change24h >= 0 ? 'UP' : 'DOWN'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Entry */}
                <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-mono">Quick Trade</div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1 font-mono">SIZE (USD)</label>
                      <input
                        type="number"
                        placeholder="100"
                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1 font-mono">LEVERAGE</label>
                      <div className="flex gap-1">
                        {[1, 2, 5, 10, 20].map((lev) => (
                          <button
                            key={lev}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 py-1 rounded transition-colors font-mono"
                          >
                            {lev}x
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`https://app.hyperliquid.xyz/trade/${market.hl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded text-center transition-colors font-mono"
                      >
                        LONG on HL
                      </a>
                      <a
                        href={`https://app.hyperliquid.xyz/trade/${market.hl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded text-center transition-colors font-mono"
                      >
                        SHORT on HL
                      </a>
                    </div>
                  </div>
                </div>

                {/* DEX Links */}
                <div className="space-y-2">
                  <a
                    href={`https://app.hyperliquid.xyz/trade/${market.hl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-green-700 hover:bg-green-600 text-white text-sm font-bold py-3 rounded text-center transition-colors font-mono"
                  >
                    Trade on HyperLiquid
                  </a>
                  <a
                    href="https://trade.dydx.exchange"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-purple-700 hover:bg-purple-600 text-white text-sm font-bold py-3 rounded text-center transition-colors font-mono"
                  >
                    Trade on dYdX
                  </a>
                </div>

                {/* Market Info */}
                <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">Market Info</div>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Symbol</span>
                      <span className="text-white">{market.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Timeframe</span>
                      <span className="text-orange-400">{timeframe.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Price</span>
                      <span className="text-white">${lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">24h Change</span>
                      <span className={change24h >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">24h Volume</span>
                      <span className="text-blue-400">${formatNum(volume24h)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Candles</span>
                      <span className="text-gray-400">{smcCandles.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════════
              TAB 2: SMC Analysis
             ════════════════════════════════════════════════════════════════ */}
          <TabsContent value="smc">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Market Structure Panel */}
              <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
                <h3 className="text-sm font-mono text-[#F7931A] mb-3">MARKET STRUCTURE</h3>
                {!smcAnalysis ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-5 bg-[#1a1a2e] rounded animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Trend</span>
                      <span className={
                        smcAnalysis.currentTrend === 'bullish' ? 'text-[#00ff88]' :
                        smcAnalysis.currentTrend === 'bearish' ? 'text-red-400' :
                        'text-yellow-400'
                      }>
                        {smcAnalysis.currentTrend?.toUpperCase() || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Break of Structure</span>
                      <span className={smcAnalysis.breakOfStructure.length > 0 ? 'text-[#00ff88]' : 'text-gray-500'}>
                        {smcAnalysis.breakOfStructure.length > 0 ? `YES (${smcAnalysis.breakOfStructure.length})` : 'NO'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Change of Character</span>
                      <span className={smcAnalysis.choch.length > 0 ? 'text-[#F7931A]' : 'text-gray-500'}>
                        {smcAnalysis.choch.length > 0 ? `YES (${smcAnalysis.choch.length})` : 'NO'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Liquidity Sweeps</span>
                      <span className="text-purple-400">{smcAnalysis.liquiditySweeps.length}</span>
                    </div>
                    {smcAnalysis.oteZone && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">OTE Zone</span>
                        <span className="text-teal-400">
                          ${smcAnalysis.oteZone.zone.bottom.toFixed(0)} - ${smcAnalysis.oteZone.zone.top.toFixed(0)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order Blocks Panel */}
              <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
                <h3 className="text-sm font-mono text-[#F7931A] mb-3">ORDER BLOCKS</h3>
                {!smcAnalysis ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-5 bg-[#1a1a2e] rounded animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-2 text-sm font-mono max-h-[300px] overflow-y-auto">
                    {smcAnalysis.orderBlocks.filter(ob => !ob.mitigated).length === 0 ? (
                      <p className="text-gray-500 text-xs">No active order blocks detected</p>
                    ) : (
                      smcAnalysis.orderBlocks.filter(ob => !ob.mitigated).slice(0, 10).map((ob, i) => (
                        <div key={i} className="flex items-center justify-between bg-[#111118] rounded px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${ob.type === 'bullish' ? 'bg-[#00ff88]' : 'bg-red-400'}`} />
                            <span className="text-gray-300 text-xs">{ob.type.toUpperCase()}</span>
                          </div>
                          <span className="text-gray-400 text-xs">
                            ${ob.zone.top.toFixed(0)} - ${ob.zone.bottom.toFixed(0)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Liquidity Map */}
              <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
                <h3 className="text-sm font-mono text-[#F7931A] mb-3">LIQUIDITY MAP</h3>
                {!smcAnalysis ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-5 bg-[#1a1a2e] rounded animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fair Value Gaps (Active)</span>
                      <span className="text-cyan-400">{smcAnalysis.fairValueGaps.filter(f => !f.filled).length}</span>
                    </div>
                    {smcAnalysis.fairValueGaps.filter(f => !f.filled).slice(0, 5).map((fvg, i) => (
                      <div key={i} className="flex items-center justify-between bg-[#111118] rounded px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${fvg.type === 'bullish' ? 'bg-[#00ff88]' : 'bg-red-400'}`} />
                          <span className="text-gray-300 text-xs">FVG {fvg.type.toUpperCase()}</span>
                        </div>
                        <span className="text-gray-400 text-xs">
                          ${fvg.zone.top.toFixed(0)} - ${fvg.zone.bottom.toFixed(0)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between mt-2">
                      <span className="text-gray-400">Liquidity Sweeps</span>
                      <span className="text-purple-400">{smcAnalysis.liquiditySweeps.length}</span>
                    </div>
                    {smcAnalysis.liquiditySweeps.slice(0, 5).map((sweep, i) => (
                      <div key={i} className="flex items-center justify-between bg-[#111118] rounded px-3 py-2">
                        <span className="text-gray-300 text-xs">{sweep.type.toUpperCase()} SWEEP</span>
                        <span className="text-gray-400 text-xs">${sweep.level.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confluence Scorecard */}
              <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
                <h3 className="text-sm font-mono text-[#F7931A] mb-3">CONFLUENCE SCORE</h3>
                {!smcAnalysis ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-5 bg-[#1a1a2e] rounded animate-pulse" />)}
                  </div>
                ) : (() => {
                  let score = 0
                  const factors: { label: string; active: boolean }[] = []
                  const isBullish = smcAnalysis.currentTrend === 'bullish'
                  const hasBos = smcAnalysis.breakOfStructure.length > 0
                  const hasOB = smcAnalysis.orderBlocks.filter(ob => !ob.mitigated).length > 0
                  const hasFVG = smcAnalysis.fairValueGaps.filter(f => !f.filled).length > 0
                  const hasOTE = !!smcAnalysis.oteZone
                  const hasSweep = smcAnalysis.liquiditySweeps.length > 0

                  factors.push({ label: 'Clear Trend', active: isBullish || smcAnalysis.currentTrend === 'bearish' })
                  factors.push({ label: 'Break of Structure', active: hasBos })
                  factors.push({ label: 'Active Order Blocks', active: hasOB })
                  factors.push({ label: 'Fair Value Gaps', active: hasFVG })
                  factors.push({ label: 'OTE Zone Present', active: hasOTE })
                  factors.push({ label: 'Liquidity Sweep', active: hasSweep })

                  score = factors.filter(f => f.active).length

                  const pct = Math.round((score / factors.length) * 100)
                  const color = pct >= 80 ? 'text-[#00ff88]' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'

                  return (
                    <div className="space-y-3 font-mono">
                      <div className="text-center">
                        <span className={`text-4xl font-bold ${color}`}>{pct}%</span>
                        <p className="text-gray-500 text-xs mt-1">{score}/{factors.length} confluence factors</p>
                      </div>
                      <div className="w-full bg-[#1a1a2e] rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${pct >= 80 ? 'bg-[#00ff88]' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="space-y-1">
                        {factors.map((f, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-gray-400">{f.label}</span>
                            <span className={f.active ? 'text-[#00ff88]' : 'text-gray-600'}>{f.active ? 'ACTIVE' : 'INACTIVE'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════════
              TAB 3: Derivatives
             ════════════════════════════════════════════════════════════════ */}
          <TabsContent value="derivatives">
            {derivativesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
                    <div className="h-4 bg-[#1a1a2e] rounded animate-pulse mb-3 w-1/2" />
                    <div className="h-8 bg-[#1a1a2e] rounded animate-pulse mb-2" />
                    <div className="h-4 bg-[#1a1a2e] rounded animate-pulse w-3/4" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Top Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Funding Rate */}
                  <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
                    <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">FUNDING RATE</h3>
                    <div className="text-2xl font-bold font-mono text-[#F7931A]">
                      {derivativesDetail?.fundingRate != null
                        ? `${(derivativesDetail.fundingRate * 100).toFixed(4)}%`
                        : derivatives.fundingRate || '--'}
                    </div>
                    <div className="mt-2 space-y-1 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-400">HyperLiquid</span>
                        <span className="text-green-400">{funding.hlRate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">dYdX</span>
                        <span className="text-purple-400">{funding.dydxRate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Open Interest */}
                  <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
                    <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">OPEN INTEREST</h3>
                    <div className="text-2xl font-bold font-mono text-cyan-400">
                      {derivativesDetail?.openInterest
                        ? `$${formatNum(parseFloat(derivativesDetail.openInterest))}`
                        : derivatives.openInterest || '--'}
                    </div>
                    <p className="text-xs text-gray-500 font-mono mt-1">Total outstanding contracts</p>
                  </div>

                  {/* Long/Short Ratio */}
                  <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
                    <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">LONG/SHORT RATIO</h3>
                    <div className="text-2xl font-bold font-mono">
                      {derivativesDetail?.longShortRatio
                        ? (
                          <span className={parseFloat(derivativesDetail.longShortRatio) > 1 ? 'text-[#00ff88]' : 'text-red-400'}>
                            {parseFloat(derivativesDetail.longShortRatio).toFixed(2)}
                          </span>
                        )
                        : <span className="text-gray-400">{derivatives.longShortRatio || '--'}</span>}
                    </div>
                    {derivativesDetail?.longShortRatio && (() => {
                      const r = parseFloat(derivativesDetail.longShortRatio)
                      const longPct = Math.round((r / (r + 1)) * 100)
                      return (
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] font-mono mb-1">
                            <span className="text-[#00ff88]">LONG {longPct}%</span>
                            <span className="text-red-400">SHORT {100 - longPct}%</span>
                          </div>
                          <div className="w-full bg-red-400/30 rounded-full h-2">
                            <div className="h-2 rounded-full bg-[#00ff88]/60" style={{ width: `${longPct}%` }} />
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Liquidations */}
                  <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
                    <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">LIQUIDATION LEVELS</h3>
                    <div className="space-y-2 text-sm font-mono">
                      {derivativesDetail?.liquidations ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-400">24h Long Liqs</span>
                            <span className="text-red-400">${formatNum(derivativesDetail.liquidations.longLiqs || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">24h Short Liqs</span>
                            <span className="text-[#00ff88]">${formatNum(derivativesDetail.liquidations.shortLiqs || 0)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Nearest Long Liq</span>
                            <span className="text-red-400">${lastPrice > 0 ? formatNum(lastPrice * 0.95) : '--'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Nearest Short Liq</span>
                            <span className="text-[#00ff88]">${lastPrice > 0 ? formatNum(lastPrice * 1.05) : '--'}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Price</span>
                        <span className="text-white">${lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Derivatives Detail Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Funding Rate Comparison */}
                  <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
                    <h3 className="text-sm font-mono text-[#F7931A] mb-3">FUNDING RATE COMPARISON</h3>
                    <div className="space-y-3 font-mono">
                      {[
                        { label: 'Binance', rate: derivativesDetail?.fundingRate ? (derivativesDetail.fundingRate * 100).toFixed(4) + '%' : '--', color: 'text-yellow-400' },
                        { label: 'HyperLiquid', rate: funding.hlRate, color: 'text-green-400' },
                        { label: 'dYdX', rate: funding.dydxRate, color: 'text-purple-400' },
                      ].map((exch) => (
                        <div key={exch.label} className="flex items-center justify-between bg-[#111118] rounded px-3 py-2">
                          <span className="text-gray-300 text-sm">{exch.label}</span>
                          <span className={`text-sm font-bold ${exch.color}`}>{exch.rate}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Volume & OI Summary */}
                  <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
                    <h3 className="text-sm font-mono text-[#F7931A] mb-3">VOLUME & OPEN INTEREST</h3>
                    <div className="space-y-3 text-sm font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-400">24h Volume</span>
                        <span className="text-blue-400">${formatNum(volume24h)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Open Interest</span>
                        <span className="text-cyan-400">
                          {derivativesDetail?.openInterest
                            ? `$${formatNum(parseFloat(derivativesDetail.openInterest))}`
                            : derivatives.openInterest || '--'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">OI/Volume Ratio</span>
                        <span className="text-[#F7931A]">
                          {derivativesDetail?.openInterest && volume24h > 0
                            ? (parseFloat(derivativesDetail.openInterest) / volume24h).toFixed(2)
                            : '--'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">CVD Bias</span>
                        <span className={`font-bold ${currentCVD >= 0 ? 'text-[#00ff88]' : 'text-red-400'}`}>
                          {currentCVD >= 0 ? 'BUYING' : 'SELLING'} ({formatNum(currentCVD)})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════════
              TAB 4: Signals & Alerts
             ════════════════════════════════════════════════════════════════ */}
          <TabsContent value="signals">
            {signalsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
                    <div className="h-4 bg-[#1a1a2e] rounded animate-pulse mb-3 w-1/2" />
                    <div className="h-6 bg-[#1a1a2e] rounded animate-pulse mb-2" />
                    <div className="h-4 bg-[#1a1a2e] rounded animate-pulse w-3/4" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Win Rate Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4 text-center">
                    <h3 className="text-xs font-mono text-gray-500 uppercase mb-1">ACTIVE SIGNALS</h3>
                    <span className="text-2xl font-bold font-mono text-[#F7931A]">
                      {signalsData?.activeSignals?.length ?? signals.length}
                    </span>
                  </div>
                  <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4 text-center">
                    <h3 className="text-xs font-mono text-gray-500 uppercase mb-1">WIN RATE</h3>
                    <span className="text-2xl font-bold font-mono text-[#00ff88]">
                      {signalsData?.winRate ? `${signalsData.winRate}%` : '--'}
                    </span>
                  </div>
                  <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4 text-center">
                    <h3 className="text-xs font-mono text-gray-500 uppercase mb-1">AVG R:R</h3>
                    <span className="text-2xl font-bold font-mono text-cyan-400">
                      {signalsData?.avgRR ? `${signalsData.avgRR}` : '--'}
                    </span>
                  </div>
                  <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4 text-center">
                    <h3 className="text-xs font-mono text-gray-500 uppercase mb-1">TOTAL SIGNALS</h3>
                    <span className="text-2xl font-bold font-mono text-purple-400">
                      {signalsData?.totalSignals ?? signals.length}
                    </span>
                  </div>
                </div>

                {/* Active Signal Cards (from SMC analysis) */}
                <div>
                  <h3 className="text-sm font-mono text-[#F7931A] mb-3">ACTIVE SIGNALS</h3>
                  {signals.length === 0 && (!signalsData?.activeSignals || signalsData.activeSignals.length === 0) ? (
                    <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-8 text-center">
                      <p className="text-gray-500 font-mono text-sm">No active signals for {market.label}</p>
                      <p className="text-gray-600 font-mono text-xs mt-1">Signals are generated from SMC analysis when confluence is detected</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* SMC hook signals */}
                      {signals.map((sig, i) => (
                        <div key={`smc-${i}`} className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                              sig.direction === 'long' ? 'bg-green-900/40 text-[#00ff88]' : 'bg-red-900/40 text-red-400'
                            }`}>
                              {sig.direction.toUpperCase()}
                            </span>
                            <span className="text-[10px] font-mono text-gray-500">SMC</span>
                          </div>
                          <p className="text-sm font-mono text-gray-300 mb-2">{sig.reason}</p>
                          <div className="space-y-1 text-xs font-mono">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Entry</span>
                              <span className="text-white">${sig.entry?.toFixed(2) ?? '--'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Stop Loss</span>
                              <span className="text-red-400">${sig.stopLoss?.toFixed(2) ?? '--'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Take Profit</span>
                              <span className="text-[#00ff88]">${sig.takeProfit?.toFixed(2) ?? '--'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Confidence</span>
                              <span className="text-[#F7931A]">{sig.confidence ? `${Math.round(sig.confidence * 100)}%` : '--'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {/* API signals */}
                      {signalsData?.activeSignals?.map((sig: any, i: number) => (
                        <div key={`api-${i}`} className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                              sig.direction === 'long' ? 'bg-green-900/40 text-[#00ff88]' : 'bg-red-900/40 text-red-400'
                            }`}>
                              {sig.direction?.toUpperCase() || sig.type?.toUpperCase() || 'SIGNAL'}
                            </span>
                            <span className="text-[10px] font-mono text-gray-500">{sig.source || 'API'}</span>
                          </div>
                          <p className="text-sm font-mono text-gray-300 mb-2">{sig.message || sig.reason || 'Signal detected'}</p>
                          <div className="space-y-1 text-xs font-mono">
                            {sig.entry && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Entry</span>
                                <span className="text-white">${parseFloat(sig.entry).toFixed(2)}</span>
                              </div>
                            )}
                            {sig.target && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Target</span>
                                <span className="text-[#00ff88]">${parseFloat(sig.target).toFixed(2)}</span>
                              </div>
                            )}
                            {sig.confidence && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Confidence</span>
                                <span className="text-[#F7931A]">{sig.confidence}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Signal History Table */}
                <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
                  <h3 className="text-sm font-mono text-[#F7931A] mb-3">SIGNAL HISTORY</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="border-b border-[#1a1a2e]">
                          <th className="text-left text-gray-500 py-2 px-2">TYPE</th>
                          <th className="text-left text-gray-500 py-2 px-2">DIRECTION</th>
                          <th className="text-right text-gray-500 py-2 px-2">ENTRY</th>
                          <th className="text-right text-gray-500 py-2 px-2">TARGET</th>
                          <th className="text-right text-gray-500 py-2 px-2">CONFIDENCE</th>
                          <th className="text-right text-gray-500 py-2 px-2">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {signalsData?.history?.length > 0 ? (
                          signalsData.history.slice(0, 20).map((h: any, i: number) => (
                            <tr key={i} className="border-b border-[#1a1a2e]/50 hover:bg-[#111118]">
                              <td className="py-2 px-2 text-gray-300">{h.type || 'SMC'}</td>
                              <td className="py-2 px-2">
                                <span className={h.direction === 'long' ? 'text-[#00ff88]' : 'text-red-400'}>
                                  {h.direction?.toUpperCase() || '--'}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-right text-white">${h.entry?.toFixed(2) ?? '--'}</td>
                              <td className="py-2 px-2 text-right text-cyan-400">${h.target?.toFixed(2) ?? '--'}</td>
                              <td className="py-2 px-2 text-right text-[#F7931A]">{h.confidence ?? '--'}%</td>
                              <td className="py-2 px-2 text-right">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                  h.status === 'win' ? 'bg-green-900/40 text-[#00ff88]' :
                                  h.status === 'loss' ? 'bg-red-900/40 text-red-400' :
                                  'bg-gray-800 text-gray-400'
                                }`}>
                                  {h.status?.toUpperCase() || 'PENDING'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          signals.slice(0, 10).map((sig, i) => (
                            <tr key={i} className="border-b border-[#1a1a2e]/50 hover:bg-[#111118]">
                              <td className="py-2 px-2 text-gray-300">SMC</td>
                              <td className="py-2 px-2">
                                <span className={sig.direction === 'long' ? 'text-[#00ff88]' : 'text-red-400'}>
                                  {sig.direction.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-right text-white">${sig.entry?.toFixed(2) ?? '--'}</td>
                              <td className="py-2 px-2 text-right text-cyan-400">${sig.takeProfit?.toFixed(2) ?? '--'}</td>
                              <td className="py-2 px-2 text-right text-[#F7931A]">{sig.confidence ? `${Math.round(sig.confidence * 100)}` : '--'}%</td>
                              <td className="py-2 px-2 text-right">
                                <span className="bg-[#F7931A]/20 text-[#F7931A] px-1.5 py-0.5 rounded text-[10px]">ACTIVE</span>
                              </td>
                            </tr>
                          ))
                        )}
                        {signals.length === 0 && (!signalsData?.history || signalsData.history.length === 0) && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-500">No signal history available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AI Insight Summary */}
                <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
                  <h3 className="text-sm font-mono text-[#F7931A] mb-3">AI INSIGHT SUMMARY</h3>
                  <div className="space-y-3 text-sm font-mono">
                    {signalsData?.aiInsight ? (
                      <p className="text-gray-300 leading-relaxed">{signalsData.aiInsight}</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-gray-300">
                          {market.label} is currently {change24h >= 0 ? 'trending upward' : 'trending downward'} with a 24h change of{' '}
                          <span className={change24h >= 0 ? 'text-[#00ff88]' : 'text-red-400'}>
                            {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                          </span>.
                        </p>
                        <p className="text-gray-400">
                          SMC analysis shows a <span className={
                            smcAnalysis?.currentTrend === 'bullish' ? 'text-[#00ff88]' : smcAnalysis?.currentTrend === 'bearish' ? 'text-red-400' : 'text-yellow-400'
                          }>{smcAnalysis?.currentTrend || 'neutral'}</span> trend with{' '}
                          {smcAnalysis?.orderBlocks.filter(ob => !ob.mitigated).length || 0} active order blocks and{' '}
                          {smcAnalysis?.fairValueGaps.filter(f => !f.filled).length || 0} unfilled FVGs.
                        </p>
                        <p className="text-gray-400">
                          RSI at <span className={
                            currentRSI > 70 ? 'text-red-400' : currentRSI < 30 ? 'text-[#00ff88]' : 'text-yellow-400'
                          }>{currentRSI.toFixed(1)}</span> indicates{' '}
                          {currentRSI > 70 ? 'overbought conditions' : currentRSI < 30 ? 'oversold conditions' : 'neutral momentum'}.
                          MACD histogram is <span className={currentHist >= 0 ? 'text-[#00ff88]' : 'text-red-400'}>
                            {currentHist >= 0 ? 'positive (bullish momentum)' : 'negative (bearish momentum)'}
                          </span>.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
