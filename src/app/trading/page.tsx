'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SmcChart } from '@/components/charts/SmcChart'
import type { SmcCandle } from '@/components/charts/SmcChart'
import { SmcOverlayControls, DEFAULT_OVERLAYS } from '@/components/charts/SmcOverlayControls'
import type { OverlayConfig } from '@/components/charts/SmcOverlayControls'
import { useSmcAnalysis } from '@/hooks/useSmcAnalysis'
import { useDerivativesData } from '@/hooks/useDerivativesData'
import type { Candle } from '@/lib/smc/types'

// ── Types ──────────────────────────────────────────────────────────

interface OrderBookLevel { price: string; size: string }

const MARKETS = [
  { label: 'BTC-PERP', binance: 'BTCUSDT', hl: 'BTC', dydx: 'BTC-USD', name: 'Bitcoin' },
  { label: 'ETH-PERP', binance: 'ETHUSDT', hl: 'ETH', dydx: 'ETH-USD', name: 'Ethereum' },
  { label: 'SOL-PERP', binance: 'SOLUSDT', hl: 'SOL', dydx: 'SOL-USD', name: 'Solana' },
  { label: 'DOGE-PERP', binance: 'DOGEUSDT', hl: 'DOGE', dydx: 'DOGE-USD', name: 'Dogecoin' },
  { label: 'XRP-PERP', binance: 'XRPUSDT', hl: 'XRP', dydx: 'XRP-USD', name: 'XRP' },
] as const

const TIMEFRAMES = [
  { label: '5m', interval: '5m' },
  { label: '15m', interval: '15m' },
  { label: '1h', interval: '1h' },
  { label: '4h', interval: '4h' },
  { label: '1D', interval: '1d' },
] as const

// ── Helpers ────────────────────────────────────────────────────────

function fmt(n: number, d = 2): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toFixed(d)
}

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toFixed(6)
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50
  let avgGain = 0, avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) avgGain += diff; else avgLoss += Math.abs(diff)
  }
  avgGain /= period; avgLoss /= period
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    avgGain = (avgGain * (period - 1) + (diff >= 0 ? diff : 0)) / period
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period
  }
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

function calcEMA(data: number[], period: number): number[] {
  if (data.length === 0) return []
  const k = 2 / (period + 1), ema = [data[0]]
  for (let i = 1; i < data.length; i++) ema.push(data[i] * k + ema[i - 1] * (1 - k))
  return ema
}

// ── Component ──────────────────────────────────────────────────────

export default function TradingPage() {
  const [marketIdx, setMarketIdx] = useState(0)
  const [tfIdx, setTfIdx] = useState(2) // 1h default
  const [rawKlines, setRawKlines] = useState<any[][]>([])
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookLevel[]; asks: OrderBookLevel[] }>({ bids: [], asks: [] })
  const [loading, setLoading] = useState(true)
  const [lastPrice, setLastPrice] = useState(0)
  const [change24h, setChange24h] = useState(0)
  const [volume24h, setVolume24h] = useState(0)
  const [high24h, setHigh24h] = useState(0)
  const [low24h, setLow24h] = useState(0)
  const [fundingHL, setFundingHL] = useState('--')
  const [fundingDYDX, setFundingDYDX] = useState('--')
  const [overlays, setOverlays] = useState<OverlayConfig>(DEFAULT_OVERLAYS)

  const market = MARKETS[marketIdx]
  const timeframe = TIMEFRAMES[tfIdx]
  const derivatives = useDerivativesData(market.binance)

  const smcCandles = useMemo<SmcCandle[]>(() =>
    rawKlines.map((k) => ({
      time: Math.floor(k[0] / 1000), open: parseFloat(k[1]),
      high: parseFloat(k[2]), low: parseFloat(k[3]),
      close: parseFloat(k[4]), volume: parseFloat(k[5]),
    })), [rawKlines])

  const analyzerCandles = useMemo<Candle[]>(() =>
    rawKlines.map((k) => ({
      time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
      low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
    })), [rawKlines])

  const { analysis, signals } = useSmcAnalysis(analyzerCandles)

  // Derived metrics
  const closes = useMemo(() => analyzerCandles.map(c => c.close), [analyzerCandles])
  const rsi = useMemo(() => calcRSI(closes), [closes])
  const ema20 = useMemo(() => calcEMA(closes, 20), [closes])
  const ema50 = useMemo(() => calcEMA(closes, 50), [closes])
  const currentEma20 = ema20.length > 0 ? ema20[ema20.length - 1] : 0
  const currentEma50 = ema50.length > 0 ? ema50[ema50.length - 1] : 0
  const emaCross = currentEma20 > currentEma50 ? 'bullish' : currentEma20 < currentEma50 ? 'bearish' : 'neutral'

  // CVD
  const cvd = useMemo(() => {
    let val = 0
    for (const c of smcCandles) val += c.close > c.open ? c.volume : -c.volume
    return val
  }, [smcCandles])

  // Volatility (ATR-like)
  const volatility = useMemo(() => {
    if (smcCandles.length < 14) return 0
    const last14 = smcCandles.slice(-14)
    const ranges = last14.map(c => c.high - c.low)
    return ranges.reduce((a, b) => a + b, 0) / ranges.length
  }, [smcCandles])

  const volatilityPct = lastPrice > 0 ? (volatility / lastPrice) * 100 : 0

  // Fetch functions
  const fetchKlines = useCallback(async () => {
    try {
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${market.binance}&interval=${timeframe.interval}&limit=500`)
      if (!res.ok) throw new Error('err')
      const raw = await res.json()
      setRawKlines(raw)
      if (raw.length > 0) {
        const lastCandle = raw[raw.length - 1];
        if (lastCandle && lastCandle[4] !== undefined) {
          const price = parseFloat(lastCandle[4]);
          if (!isNaN(price)) setLastPrice(price);
        }
      }
    } catch (e) { console.error('[Trading] klines:', e) }
  }, [market.binance, timeframe.interval])

  const fetchTicker = useCallback(async () => {
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${market.binance}`)
      if (!res.ok) return
      const d = await res.json()
      setChange24h(parseFloat(d.priceChangePercent))
      setVolume24h(parseFloat(d.quoteVolume))
      setLastPrice(parseFloat(d.lastPrice))
      setHigh24h(parseFloat(d.highPrice))
      setLow24h(parseFloat(d.lowPrice))
    } catch (e) { console.error('[Trading] ticker:', e) }
  }, [market.binance])

  const fetchOrderBook = useCallback(async () => {
    try {
      const res = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'l2Book', coin: market.hl }),
      })
      if (!res.ok) return
      const data = await res.json()
      const levels = data?.levels || [[], []]
      setOrderBook({
        bids: (levels[0] || []).slice(0, 12).map((l: any) => ({ price: l.px, size: l.sz })),
        asks: (levels[1] || []).slice(0, 12).map((l: any) => ({ price: l.px, size: l.sz })),
      })
    } catch (e) { console.error('[Trading] orderbook:', e) }
  }, [market.hl])

  const fetchFunding = useCallback(async () => {
    try {
      const [hlRes, dydxRes] = await Promise.allSettled([
        fetch('https://api.hyperliquid.xyz/info', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
        }),
        fetch(`https://indexer.dydx.trade/v4/historicalFunding/${encodeURIComponent(market.dydx)}`),
      ])
      if (hlRes.status === 'fulfilled' && hlRes.value.ok) {
        const hlData = await hlRes.value.json()
        const meta = hlData?.[0]?.universe || [], ctxs = hlData?.[1] || []
        const idx = meta.findIndex((m: any) => m.name === market.hl)
        if (idx >= 0 && ctxs[idx]) setFundingHL((parseFloat(ctxs[idx].funding) * 100).toFixed(4) + '%')
      }
      if (dydxRes.status === 'fulfilled' && dydxRes.value.ok) {
        const dydxData = await dydxRes.value.json()
        const rates = dydxData?.historicalFunding || []
        if (rates.length > 0) setFundingDYDX((parseFloat(rates[0].rate) * 100).toFixed(4) + '%')
      }
    } catch (e) { console.error('[Trading] funding:', e) }
  }, [market.hl, market.dydx])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchKlines(), fetchTicker(), fetchOrderBook(), fetchFunding()]).finally(() => setLoading(false))
    const iv = setInterval(() => { fetchKlines(); fetchTicker(); fetchOrderBook(); fetchFunding() }, 15000)
    return () => clearInterval(iv)
  }, [fetchKlines, fetchTicker, fetchOrderBook, fetchFunding])

  // ── Institutional Analysis Engine ──
  const institutionalAnalysis = useMemo(() => {
    if (!analysis) return null

    const activeOBs = analysis.orderBlocks.filter(ob => !ob.mitigated)
    const bullOBs = activeOBs.filter(ob => ob.type === 'bullish')
    const bearOBs = activeOBs.filter(ob => ob.type === 'bearish')
    const activeFVGs = analysis.fairValueGaps.filter(f => !f.filled)
    const bullFVGs = activeFVGs.filter(f => f.type === 'bullish')
    const bearFVGs = activeFVGs.filter(f => f.type === 'bearish')

    // Confluence scoring (institutional grade)
    let score = 0
    const factors: { name: string; active: boolean; weight: number; detail: string }[] = []

    const trendClear = analysis.currentTrend !== 'neutral'
    factors.push({ name: 'Clear Market Structure', active: trendClear, weight: 20, detail: trendClear ? `${analysis.currentTrend.toUpperCase()} trend confirmed` : 'No clear directional bias' })
    if (trendClear) score += 20

    const hasBOS = analysis.breakOfStructure.length > 0
    factors.push({ name: 'Break of Structure', active: hasBOS, weight: 15, detail: hasBOS ? `${analysis.breakOfStructure.length} BOS events detected` : 'No structural breaks' })
    if (hasBOS) score += 15

    const hasChoCH = analysis.choch.length > 0
    factors.push({ name: 'Change of Character', active: hasChoCH, weight: 15, detail: hasChoCH ? `${analysis.choch.length} ChoCH reversals detected` : 'No character changes' })
    if (hasChoCH) score += 15

    const hasOB = activeOBs.length > 0
    factors.push({ name: 'Active Order Blocks', active: hasOB, weight: 15, detail: hasOB ? `${bullOBs.length} bullish, ${bearOBs.length} bearish blocks` : 'No active order blocks' })
    if (hasOB) score += 15

    const hasFVG = activeFVGs.length > 0
    factors.push({ name: 'Fair Value Gaps', active: hasFVG, weight: 10, detail: hasFVG ? `${bullFVGs.length} bullish, ${bearFVGs.length} bearish gaps` : 'No unfilled gaps' })
    if (hasFVG) score += 10

    const hasSweep = analysis.liquiditySweeps.length > 0
    factors.push({ name: 'Liquidity Sweeps', active: hasSweep, weight: 10, detail: hasSweep ? `${analysis.liquiditySweeps.length} sweeps - smart money accumulation` : 'No recent sweeps' })
    if (hasSweep) score += 10

    const hasOTE = !!analysis.oteZone
    factors.push({ name: 'Optimal Trade Entry', active: hasOTE, weight: 10, detail: hasOTE ? `OTE zone: $${analysis.oteZone!.zone.bottom.toFixed(0)} - $${analysis.oteZone!.zone.top.toFixed(0)}` : 'No OTE zone identified' })
    if (hasOTE) score += 10

    const rsiConf = rsi < 30 || rsi > 70
    factors.push({ name: 'RSI Extreme', active: rsiConf, weight: 5, detail: `RSI at ${rsi.toFixed(1)} — ${rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral range'}` })
    if (rsiConf) score += 5

    // Bias calculation
    let bullPoints = 0, bearPoints = 0
    if (analysis.currentTrend === 'bullish') bullPoints += 25; else if (analysis.currentTrend === 'bearish') bearPoints += 25
    bullPoints += bullOBs.length * 5; bearPoints += bearOBs.length * 5
    bullPoints += bullFVGs.length * 3; bearPoints += bearFVGs.length * 3
    if (emaCross === 'bullish') bullPoints += 10; else if (emaCross === 'bearish') bearPoints += 10
    if (rsi < 35) bullPoints += 10; else if (rsi > 65) bearPoints += 10
    if (cvd > 0) bullPoints += 5; else bearPoints += 5

    const totalPoints = bullPoints + bearPoints || 1
    const bullPct = Math.round((bullPoints / totalPoints) * 100)
    const bearPct = 100 - bullPct
    const bias = bullPct > 60 ? 'BULLISH' : bearPct > 60 ? 'BEARISH' : 'NEUTRAL'

    // Institutional verdict
    let verdict = ''
    let verdictColor = 'text-gray-400'
    if (score >= 80 && bias === 'BULLISH') {
      verdict = 'STRONG BUY — High confluence bullish setup. Institutional flow aligned with structure. Scale into longs on pullbacks to OB/FVG zones.'
      verdictColor = 'text-[#00ff88]'
    } else if (score >= 80 && bias === 'BEARISH') {
      verdict = 'STRONG SELL — High confluence bearish setup. Smart money distributing. Look for shorts at resistance OBs with tight stops above structure.'
      verdictColor = 'text-red-400'
    } else if (score >= 60 && bias === 'BULLISH') {
      verdict = 'BUY BIAS — Moderate confluence supports upside. Wait for price to sweep liquidity below and reclaim OB zones before entering. Risk management critical.'
      verdictColor = 'text-green-400'
    } else if (score >= 60 && bias === 'BEARISH') {
      verdict = 'SELL BIAS — Moderate confluence supports downside. Look for failed rallies into bearish OBs and FVGs for short entries. Protect capital.'
      verdictColor = 'text-orange-400'
    } else if (score >= 40) {
      verdict = 'NEUTRAL — Insufficient confluence for directional trades. Market in accumulation/distribution phase. Monitor for BOS or ChoCH to confirm next move.'
      verdictColor = 'text-yellow-400'
    } else {
      verdict = 'NO TRADE — Low confluence environment. Preserve capital. Wait for structure to develop with clear OB + FVG + BOS alignment before committing.'
      verdictColor = 'text-gray-500'
    }

    // Market regime
    let regime = 'RANGING'
    if (volatilityPct > 3) regime = 'HIGH VOLATILITY'
    else if (volatilityPct > 1.5) regime = 'TRENDING'
    else if (volatilityPct > 0.5) regime = 'LOW VOLATILITY'
    else regime = 'COMPRESSION'

    return {
      score, factors, bias, bullPct, bearPct, verdict, verdictColor,
      activeOBs, bullOBs, bearOBs, activeFVGs, bullFVGs, bearFVGs,
      regime,
    }
  }, [analysis, rsi, emaCross, cvd, volatilityPct])

  const tabClass = "rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono"

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-mono">
      <div className="max-w-[1800px] mx-auto px-4 py-4">
        {/* ═══ TOP BAR ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-[#F7931A] tracking-widest">CYPHER INSTITUTIONAL TERMINAL</h1>
              <p className="text-[10px] text-gray-600 tracking-wider">SMART MONEY CONCEPTS • REAL-TIME ANALYSIS</p>
            </div>
            <div className="flex gap-1">
              {MARKETS.map((m, i) => (
                <button key={m.label} onClick={() => setMarketIdx(i)}
                  className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${i === marketIdx ? 'bg-[#F7931A] text-black' : 'bg-[#111118] text-gray-400 hover:bg-[#1a1a2e]'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-600 text-xs">LAST </span>
              <span className="text-white font-bold text-lg">${fmtPrice(lastPrice)}</span>
            </div>
            <div>
              <span className="text-gray-600 text-xs">24H </span>
              <span className={`font-bold ${change24h >= 0 ? 'text-[#00ff88]' : 'text-red-400'}`}>
                {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-gray-600 text-xs">VOL </span>
              <span className="text-blue-400 font-bold">${fmt(volume24h)}</span>
            </div>
            {institutionalAnalysis && (
              <div className={`px-3 py-1 rounded text-xs font-bold ${
                institutionalAnalysis.bias === 'BULLISH' ? 'bg-green-900/40 text-[#00ff88]' :
                institutionalAnalysis.bias === 'BEARISH' ? 'bg-red-900/40 text-red-400' :
                'bg-gray-800 text-yellow-400'
              }`}>
                {institutionalAnalysis.bias} • {institutionalAnalysis.score}% CONFLUENCE
              </div>
            )}
          </div>
        </div>

        {/* ═══ METRICS BAR ═══ */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-4">
          {[
            { l: '24H HIGH', v: `$${fmtPrice(high24h)}`, c: 'text-[#00ff88]' },
            { l: '24H LOW', v: `$${fmtPrice(low24h)}`, c: 'text-red-400' },
            { l: 'RSI (14)', v: rsi.toFixed(1), c: rsi > 70 ? 'text-red-400' : rsi < 30 ? 'text-[#00ff88]' : 'text-yellow-400' },
            { l: 'EMA CROSS', v: emaCross.toUpperCase(), c: emaCross === 'bullish' ? 'text-[#00ff88]' : emaCross === 'bearish' ? 'text-red-400' : 'text-gray-400' },
            { l: 'HL FUNDING', v: fundingHL, c: 'text-green-400' },
            { l: 'DYDX FUNDING', v: fundingDYDX, c: 'text-purple-400' },
            { l: 'VOLATILITY', v: `${volatilityPct.toFixed(2)}%`, c: volatilityPct > 2 ? 'text-red-400' : 'text-yellow-400' },
            { l: 'CVD BIAS', v: cvd >= 0 ? 'BUYING' : 'SELLING', c: cvd >= 0 ? 'text-[#00ff88]' : 'text-red-400' },
          ].map((m) => (
            <div key={m.l} className="bg-[#0d0d1a] border border-[#1a1a2e] rounded px-2 py-1.5">
              <div className="text-[9px] text-gray-600 uppercase tracking-wider">{m.l}</div>
              <div className={`text-xs font-bold ${m.c}`}>{m.v}</div>
            </div>
          ))}
        </div>

        {/* ═══ TIMEFRAME + OVERLAYS ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex gap-0.5 bg-[#111118] rounded p-0.5">
            {TIMEFRAMES.map((tf, i) => (
              <button key={tf.label} onClick={() => setTfIdx(i)}
                className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${i === tfIdx ? 'bg-[#F7931A] text-black' : 'text-gray-500 hover:text-gray-300'}`}>
                {tf.label}
              </button>
            ))}
          </div>
          <SmcOverlayControls overlays={overlays} onChange={setOverlays} />
        </div>

        {/* ═══ TABS ═══ */}
        <Tabs defaultValue="chart" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-4">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="chart" className={tabClass}>Chart & Order Book</TabsTrigger>
              <TabsTrigger value="analysis" className={tabClass}>SMC Analysis</TabsTrigger>
              <TabsTrigger value="institutional" className={tabClass}>Institutional Insights</TabsTrigger>
              <TabsTrigger value="signals" className={tabClass}>Signals & Execution</TabsTrigger>
            </TabsList>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              TAB 1: CHART & ORDER BOOK
             ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="chart">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
              {/* Chart */}
              <div className="xl:col-span-3 space-y-3">
                <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded overflow-hidden">
                  {loading && smcCandles.length === 0 ? (
                    <div className="flex items-center justify-center h-[520px] text-gray-600 animate-pulse">
                      <div className="text-center">
                        <div className="text-[#F7931A] text-sm font-bold mb-1">LOADING CHART</div>
                        <div className="text-[10px] text-gray-700">Fetching {market.label} candles...</div>
                      </div>
                    </div>
                  ) : (
                    <SmcChart candles={smcCandles} smcResult={analysis} overlays={overlays} signals={signals} height={520} />
                  )}
                </div>

                {/* Active Trade Setup */}
                {signals.length > 0 && (
                  <div className={`bg-[#0d0d1a] border rounded-lg p-4 ${
                    signals[0].direction === 'long' ? 'border-green-800/50' : 'border-red-800/50'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold px-3 py-1 rounded ${
                          signals[0].direction === 'long' ? 'bg-green-900/60 text-[#00ff88]' : 'bg-red-900/60 text-[#ff3b5c]'
                        }`}>{signals[0].direction === 'long' ? 'LONG' : 'SHORT'} SETUP</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          signals[0].confidence === 'HIGH' ? 'bg-[#F7931A]/20 text-[#F7931A]' :
                          signals[0].confidence === 'MEDIUM' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-gray-800 text-gray-400'
                        }`}>{signals[0].confidence} CONFIDENCE</span>
                        <span className="text-xs text-cyan-400">Confluence: {signals[0].confluence.total}/100</span>
                      </div>
                      <span className="text-[10px] text-gray-600">BEST SIGNAL — {market.label} {timeframe.label}</span>
                    </div>
                    <div className="grid grid-cols-6 gap-3 text-center">
                      <div className="bg-[#111118] rounded p-2">
                        <div className="text-[9px] text-gray-600 uppercase">Entry</div>
                        <div className="text-sm font-bold text-[#F7931A]">${fmtPrice(signals[0].entry)}</div>
                      </div>
                      <div className="bg-[#111118] rounded p-2">
                        <div className="text-[9px] text-gray-600 uppercase">Stop Loss</div>
                        <div className="text-sm font-bold text-[#ff3b5c]">${fmtPrice(signals[0].stopLoss)}</div>
                      </div>
                      <div className="bg-[#111118] rounded p-2">
                        <div className="text-[9px] text-gray-600 uppercase">TP1 ({signals[0].riskReward.toFixed(1)}R)</div>
                        <div className="text-sm font-bold text-[#00ff88]">${fmtPrice(signals[0].takeProfit)}</div>
                      </div>
                      <div className="bg-[#111118] rounded p-2">
                        <div className="text-[9px] text-gray-600 uppercase">TP2</div>
                        <div className="text-sm font-bold text-[#00dc82]">${fmtPrice(signals[0].takeProfit2)}</div>
                      </div>
                      <div className="bg-[#111118] rounded p-2">
                        <div className="text-[9px] text-gray-600 uppercase">TP3</div>
                        <div className="text-sm font-bold text-[#00b86b]">${fmtPrice(signals[0].takeProfit3)}</div>
                      </div>
                      <div className="bg-[#111118] rounded p-2">
                        <div className="text-[9px] text-gray-600 uppercase">R:R</div>
                        <div className="text-sm font-bold text-[#F7931A]">{signals[0].riskReward.toFixed(1)}R</div>
                      </div>
                    </div>
                    {signals[0].reasons.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {signals[0].reasons.map((r, i) => (
                          <span key={i} className="text-[10px] text-gray-400 bg-[#111118] px-2 py-0.5 rounded border border-[#1a1a2e]">
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SMC Structure Badge */}
                {analysis && !signals.length && (
                  <div className="flex flex-wrap items-center gap-3 text-xs px-1">
                    <span className="text-gray-500">STRUCTURE:</span>
                    <span className={`font-bold uppercase px-2 py-0.5 rounded ${
                      analysis.currentTrend === 'bullish' ? 'bg-green-900/40 text-[#00ff88]' :
                      analysis.currentTrend === 'bearish' ? 'bg-red-900/40 text-red-400' : 'bg-gray-800 text-gray-400'
                    }`}>{analysis.currentTrend}</span>
                    <span className="text-gray-600">
                      OBs: {analysis.orderBlocks.filter(ob => !ob.mitigated).length} |
                      FVGs: {analysis.fairValueGaps.filter(f => !f.filled).length} |
                      BOS: {analysis.breakOfStructure.length} |
                      ChoCH: {analysis.choch.length} |
                      Sweeps: {analysis.liquiditySweeps.length}
                    </span>
                    {analysis.oteZone && (
                      <span className="text-teal-400">OTE: ${analysis.oteZone.zone.bottom.toFixed(0)} - ${analysis.oteZone.zone.top.toFixed(0)}</span>
                    )}
                    <span className="text-gray-700 text-[10px]">No active signals — waiting for confluence alignment</span>
                  </div>
                )}

                {/* Derivatives Bar */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded p-3">
                    <div className="text-[9px] text-gray-600 uppercase mb-1">Open Interest</div>
                    <div className="text-sm font-bold text-cyan-400">
                      {derivatives.openInterest ? `$${fmt(derivatives.openInterest * lastPrice)}` : '--'}
                    </div>
                  </div>
                  <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded p-3">
                    <div className="text-[9px] text-gray-600 uppercase mb-1">Long/Short Ratio</div>
                    <div className={`text-sm font-bold ${derivatives.longShortRatio && derivatives.longShortRatio > 1 ? 'text-[#00ff88]' : 'text-red-400'}`}>
                      {derivatives.longShortRatio?.toFixed(2) || '--'}
                    </div>
                    {derivatives.longShortRatio && (() => {
                      const r = derivatives.longShortRatio!
                      const longPct = Math.round((r / (r + 1)) * 100)
                      return (
                        <div className="mt-1">
                          <div className="flex justify-between text-[9px] mb-0.5">
                            <span className="text-[#00ff88]">L {longPct}%</span>
                            <span className="text-red-400">S {100 - longPct}%</span>
                          </div>
                          <div className="w-full bg-red-400/30 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-[#00ff88]/60" style={{ width: `${longPct}%` }} />
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded p-3">
                    <div className="text-[9px] text-gray-600 uppercase mb-1">Funding Rate</div>
                    <div className="text-sm font-bold text-[#F7931A]">
                      {derivatives.fundingRate != null ? `${(derivatives.fundingRate * 100).toFixed(4)}%` : '--'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Book */}
              <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Order Book • HyperLiquid</div>
                {loading && orderBook.asks.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-gray-600 text-sm">Loading...</div>
                ) : (
                  <div className="space-y-0.5 text-xs">
                    <div className="flex justify-between text-gray-600 mb-1 px-1">
                      <span>PRICE</span><span>SIZE</span>
                    </div>
                    {[...orderBook.asks].reverse().map((a, i) => {
                      const maxSize = Math.max(...orderBook.asks.map(x => parseFloat(x.size) || 0), 0.01)
                      const pct = (parseFloat(a.size) / maxSize) * 100
                      return (
                        <div key={`a-${i}`} className="relative flex justify-between px-1 py-0.5">
                          <div className="absolute inset-0 bg-red-900/20" style={{ width: `${pct}%`, right: 0, left: 'auto' }} />
                          <span className="relative text-red-400">${parseFloat(a.price).toLocaleString()}</span>
                          <span className="relative text-gray-400">{parseFloat(a.size).toFixed(4)}</span>
                        </div>
                      )
                    })}
                    <div className="border-t border-[#1a1a2e] my-1 text-center py-1.5">
                      <span className="text-white font-bold text-sm">${fmtPrice(lastPrice)}</span>
                      <span className="text-gray-600 text-[10px] ml-2">
                        Spread: ${orderBook.asks[0] && orderBook.bids[0]
                          ? (parseFloat(orderBook.asks[0].price) - parseFloat(orderBook.bids[0].price)).toFixed(2) : '--'}
                      </span>
                    </div>
                    {orderBook.bids.map((b, i) => {
                      const maxSize = Math.max(...orderBook.bids.map(x => parseFloat(x.size) || 0), 0.01)
                      const pct = (parseFloat(b.size) / maxSize) * 100
                      return (
                        <div key={`b-${i}`} className="relative flex justify-between px-1 py-0.5">
                          <div className="absolute inset-0 bg-green-900/20" style={{ width: `${pct}%`, right: 0, left: 'auto' }} />
                          <span className="relative text-[#00ff88]">${parseFloat(b.price).toLocaleString()}</span>
                          <span className="relative text-gray-400">{parseFloat(b.size).toFixed(4)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Quick Trade */}
                <div className="mt-4 pt-4 border-t border-[#1a1a2e]">
                  <div className="text-xs text-gray-500 uppercase mb-3">Quick Trade</div>
                  <div className="grid grid-cols-2 gap-2">
                    <a href={`https://app.hyperliquid.xyz/trade/${market.hl}`} target="_blank" rel="noopener noreferrer"
                      className="bg-[#00ff88]/20 hover:bg-[#00ff88]/30 border border-[#00ff88]/40 text-[#00ff88] text-xs font-bold py-2.5 rounded text-center transition-colors">
                      LONG
                    </a>
                    <a href={`https://app.hyperliquid.xyz/trade/${market.hl}`} target="_blank" rel="noopener noreferrer"
                      className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs font-bold py-2.5 rounded text-center transition-colors">
                      SHORT
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <a href={`https://app.hyperliquid.xyz/trade/${market.hl}`} target="_blank" rel="noopener noreferrer"
                      className="bg-green-700 hover:bg-green-600 text-white text-[10px] font-bold py-2 rounded text-center transition-colors">
                      HyperLiquid
                    </a>
                    <a href="https://trade.dydx.exchange" target="_blank" rel="noopener noreferrer"
                      className="bg-purple-700 hover:bg-purple-600 text-white text-[10px] font-bold py-2 rounded text-center transition-colors">
                      dYdX
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════
              TAB 2: SMC ANALYSIS
             ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="analysis">
            {!analysis ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="bg-[#0d0d1a] border border-[#1a1a2e] rounded p-6"><div className="h-40 bg-[#1a1a2e] rounded animate-pulse" /></div>)}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Market Structure */}
                <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-5">
                  <h3 className="text-sm text-[#F7931A] mb-4 tracking-wider">MARKET STRUCTURE ANALYSIS</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Current Trend</span>
                      <span className={`font-bold uppercase px-2 py-0.5 rounded ${
                        analysis.currentTrend === 'bullish' ? 'bg-green-900/30 text-[#00ff88]' :
                        analysis.currentTrend === 'bearish' ? 'bg-red-900/30 text-red-400' : 'bg-gray-800 text-yellow-400'
                      }`}>{analysis.currentTrend}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Break of Structure</span>
                      <span className={analysis.breakOfStructure.length > 0 ? 'text-[#00ff88] font-bold' : 'text-gray-600'}>{analysis.breakOfStructure.length > 0 ? `${analysis.breakOfStructure.length} confirmed` : 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Change of Character</span>
                      <span className={analysis.choch.length > 0 ? 'text-[#F7931A] font-bold' : 'text-gray-600'}>{analysis.choch.length > 0 ? `${analysis.choch.length} detected` : 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Liquidity Sweeps</span>
                      <span className="text-purple-400">{analysis.liquiditySweeps.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Market Regime</span>
                      <span className="text-cyan-400">{institutionalAnalysis?.regime || 'N/A'}</span>
                    </div>
                    {analysis.oteZone && (
                      <div className="mt-3 p-3 bg-teal-900/20 border border-teal-700/30 rounded">
                        <div className="text-[10px] text-teal-400 uppercase mb-1">Optimal Trade Entry Zone</div>
                        <div className="text-teal-300 font-bold">${analysis.oteZone.zone.bottom.toFixed(0)} — ${analysis.oteZone.zone.top.toFixed(0)}</div>
                        <div className="text-[10px] text-teal-600 mt-1">Fib 0.618: ${analysis.oteZone.fib618.toFixed(0)} | Fib 0.786: ${analysis.oteZone.fib786.toFixed(0)}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Blocks */}
                <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-5">
                  <h3 className="text-sm text-[#F7931A] mb-4 tracking-wider">ACTIVE ORDER BLOCKS</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {institutionalAnalysis?.activeOBs.length === 0 ? (
                      <p className="text-gray-600 text-xs">No active institutional order blocks detected. Smart money positions unclear.</p>
                    ) : (
                      institutionalAnalysis?.activeOBs.slice(0, 10).map((ob, i) => (
                        <div key={i} className="flex items-center justify-between bg-[#111118] rounded px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${ob.type === 'bullish' ? 'bg-[#00ff88]' : 'bg-red-400'}`} />
                            <span className="text-gray-300 text-xs">{ob.type.toUpperCase()} OB</span>
                            <span className="text-[10px] text-gray-600">Str: {ob.strength}</span>
                          </div>
                          <span className="text-gray-400 text-xs">${ob.high.toFixed(0)} — ${ob.low.toFixed(0)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Fair Value Gaps */}
                <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-5">
                  <h3 className="text-sm text-[#F7931A] mb-4 tracking-wider">FAIR VALUE GAPS (IMBALANCE)</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {institutionalAnalysis?.activeFVGs.length === 0 ? (
                      <p className="text-gray-600 text-xs">No unfilled fair value gaps. Market in equilibrium.</p>
                    ) : (
                      institutionalAnalysis?.activeFVGs.slice(0, 8).map((fvg, i) => (
                        <div key={i} className="flex items-center justify-between bg-[#111118] rounded px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${fvg.type === 'bullish' ? 'bg-[#8b5cf6]' : 'bg-[#f43f5e]'}`} />
                            <span className="text-gray-300 text-xs">{fvg.type.toUpperCase()} FVG</span>
                          </div>
                          <span className="text-gray-400 text-xs">${fvg.top.toFixed(0)} — ${fvg.bottom.toFixed(0)}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-3 text-[10px] text-gray-600">
                    Institutional traders use FVGs as areas of inefficiency where price is likely to return. Unfilled gaps act as magnets.
                  </div>
                </div>

                {/* Key Levels */}
                <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-5">
                  <h3 className="text-sm text-[#F7931A] mb-4 tracking-wider">KEY LEVELS & LIQUIDITY MAP</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-[10px] text-gray-600 uppercase mb-2">Resistance Levels</div>
                      {analysis.keyLevels.resistance.slice(-5).reverse().map((r, i) => (
                        <div key={i} className="flex justify-between text-xs py-1 border-b border-[#1a1a2e]/50">
                          <span className="text-red-400">R{i + 1}</span>
                          <span className="text-gray-300">${r.toFixed(0)}</span>
                          <span className="text-gray-600">{lastPrice > 0 ? `${((r - lastPrice) / lastPrice * 100).toFixed(2)}%` : '--'}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-center py-1 text-[#F7931A] font-bold text-sm">→ ${fmtPrice(lastPrice)} ←</div>
                    <div>
                      <div className="text-[10px] text-gray-600 uppercase mb-2">Support Levels</div>
                      {analysis.keyLevels.support.slice(-5).reverse().map((s, i) => (
                        <div key={i} className="flex justify-between text-xs py-1 border-b border-[#1a1a2e]/50">
                          <span className="text-[#00ff88]">S{i + 1}</span>
                          <span className="text-gray-300">${s.toFixed(0)}</span>
                          <span className="text-gray-600">{lastPrice > 0 ? `${((s - lastPrice) / lastPrice * 100).toFixed(2)}%` : '--'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════
              TAB 3: INSTITUTIONAL INSIGHTS
             ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="institutional">
            {!institutionalAnalysis ? (
              <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded p-8 text-center text-gray-600">Loading institutional analysis...</div>
            ) : (
              <div className="space-y-4">
                {/* Institutional Verdict */}
                <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm text-[#F7931A] tracking-wider">INSTITUTIONAL VERDICT — {market.name.toUpperCase()}</h3>
                    <span className={`text-xs font-bold px-3 py-1 rounded ${
                      institutionalAnalysis.bias === 'BULLISH' ? 'bg-green-900/40 text-[#00ff88]' :
                      institutionalAnalysis.bias === 'BEARISH' ? 'bg-red-900/40 text-red-400' : 'bg-yellow-900/40 text-yellow-400'
                    }`}>{institutionalAnalysis.bias}</span>
                  </div>
                  <p className={`text-sm leading-relaxed ${institutionalAnalysis.verdictColor}`}>
                    {institutionalAnalysis.verdict}
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-[#F7931A]">{institutionalAnalysis.score}%</div>
                      <div className="text-[10px] text-gray-600 uppercase">Confluence Score</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[#00ff88]">{institutionalAnalysis.bullPct}%</div>
                      <div className="text-[10px] text-gray-600 uppercase">Bull Probability</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-400">{institutionalAnalysis.bearPct}%</div>
                      <div className="text-[10px] text-gray-600 uppercase">Bear Probability</div>
                    </div>
                  </div>
                  {/* Bull/Bear bar */}
                  <div className="mt-3">
                    <div className="w-full bg-red-400/30 rounded-full h-3">
                      <div className="h-3 rounded-full bg-[#00ff88]/70 transition-all" style={{ width: `${institutionalAnalysis.bullPct}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] mt-1">
                      <span className="text-[#00ff88]">BULLS</span>
                      <span className="text-red-400">BEARS</span>
                    </div>
                  </div>
                </div>

                {/* Confluence Breakdown */}
                <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-6">
                  <h3 className="text-sm text-[#F7931A] mb-4 tracking-wider">CONFLUENCE SCORECARD</h3>
                  <div className="space-y-3">
                    {institutionalAnalysis.factors.map((f, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-300">{f.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 text-[10px]">+{f.weight}pts</span>
                            <span className={f.active ? 'text-[#00ff88] font-bold' : 'text-gray-700'}>
                              {f.active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-600">{f.detail}</div>
                        <div className="w-full bg-[#1a1a2e] rounded-full h-1">
                          <div className={`h-1 rounded-full transition-all ${f.active ? 'bg-[#F7931A]' : 'bg-gray-800'}`} style={{ width: f.active ? '100%' : '0%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#1a1a2e] text-center">
                    <div className="text-3xl font-bold text-[#F7931A]">{institutionalAnalysis.score}/100</div>
                    <div className="text-[10px] text-gray-600 mt-1">OVERALL CONFLUENCE SCORE</div>
                  </div>
                </div>

                {/* Market Opinion */}
                <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-6">
                  <h3 className="text-sm text-[#F7931A] mb-4 tracking-wider">SMART MONEY MARKET OPINION</h3>
                  <div className="space-y-4 text-sm leading-relaxed">
                    <div className="p-4 bg-[#111118] rounded border-l-2 border-[#F7931A]">
                      <p className="text-gray-300">
                        <span className="text-[#F7931A] font-bold">Macro View:</span>{' '}
                        {market.name} is currently in a <span className={analysis?.currentTrend === 'bullish' ? 'text-[#00ff88]' : analysis?.currentTrend === 'bearish' ? 'text-red-400' : 'text-yellow-400'}>
                        {analysis?.currentTrend || 'neutral'}</span> market structure on the {timeframe.label} timeframe.
                        {change24h >= 0
                          ? ` Price has appreciated ${change24h.toFixed(2)}% in the last 24 hours, showing continued buyer interest.`
                          : ` Price has declined ${Math.abs(change24h).toFixed(2)}% in the last 24 hours, indicating distribution pressure.`}
                        {' '}The current market regime is <span className="text-cyan-400">{institutionalAnalysis.regime}</span>.
                      </p>
                    </div>
                    <div className="p-4 bg-[#111118] rounded border-l-2 border-purple-500">
                      <p className="text-gray-300">
                        <span className="text-purple-400 font-bold">Institutional Flow:</span>{' '}
                        {derivatives.longShortRatio && derivatives.longShortRatio > 1.2
                          ? 'Long positions dominate the derivatives market, suggesting bullish sentiment among leveraged traders. However, extreme long bias can precede liquidation cascades — manage risk accordingly.'
                          : derivatives.longShortRatio && derivatives.longShortRatio < 0.8
                          ? 'Short positions dominate — the market is heavily bearish. Contrarian thesis: extreme short crowding often precedes violent short squeezes when price reclaims key structure.'
                          : 'Long/short positioning is balanced. No extreme crowding detected. Wait for positioning to skew before committing to directional trades.'}
                        {' '}Funding rate at {derivatives.fundingRate != null ? `${(derivatives.fundingRate * 100).toFixed(4)}%` : 'N/A'}
                        {derivatives.fundingRate != null && derivatives.fundingRate > 0.01 ? ' — elevated funding suggests overcrowded longs. Consider fading.' : ''}
                        {derivatives.fundingRate != null && derivatives.fundingRate < -0.01 ? ' — negative funding indicates shorts are paying, potential squeeze setup.' : ''}.
                      </p>
                    </div>
                    <div className="p-4 bg-[#111118] rounded border-l-2 border-teal-500">
                      <p className="text-gray-300">
                        <span className="text-teal-400 font-bold">SMC Analysis:</span>{' '}
                        {analysis ? (
                          <>
                            We have identified {analysis.orderBlocks.filter(ob => !ob.mitigated).length} active order blocks
                            {institutionalAnalysis.bullOBs.length > institutionalAnalysis.bearOBs.length
                              ? ' with bullish OBs dominating — institutions are building positions on dips.'
                              : institutionalAnalysis.bearOBs.length > institutionalAnalysis.bullOBs.length
                              ? ' with bearish OBs dominating — smart money is distributing at premium.'
                              : ' with equal bull/bear presence — market in decision zone.'}{' '}
                            {analysis.fairValueGaps.filter(f => !f.filled).length > 0
                              ? `There are ${analysis.fairValueGaps.filter(f => !f.filled).length} unfilled FVGs acting as price magnets for rebalancing.`
                              : 'All FVGs have been filled — market is in equilibrium.'}{' '}
                            {analysis.liquiditySweeps.length > 0
                              ? `${analysis.liquiditySweeps.length} recent liquidity sweeps detected — classic smart money accumulation pattern after stop hunts.`
                              : 'No recent liquidity sweeps detected.'}
                          </>
                        ) : 'Awaiting data for SMC analysis.'}
                      </p>
                    </div>
                    <div className="p-4 bg-[#111118] rounded border-l-2 border-yellow-500">
                      <p className="text-gray-300">
                        <span className="text-yellow-400 font-bold">Technical Confluence:</span>{' '}
                        RSI at <span className={rsi > 70 ? 'text-red-400' : rsi < 30 ? 'text-[#00ff88]' : 'text-yellow-400'}>{rsi.toFixed(1)}</span>
                        {rsi > 70 ? ' — overbought territory. Watch for bearish divergence before shorting.' : rsi < 30 ? ' — oversold territory. Prime area for institutional accumulation.' : ' — neutral momentum zone.'}{' '}
                        EMA 20/50 cross is <span className={emaCross === 'bullish' ? 'text-[#00ff88]' : emaCross === 'bearish' ? 'text-red-400' : 'text-yellow-400'}>{emaCross}</span>
                        {emaCross === 'bullish' ? ', confirming upward momentum.' : emaCross === 'bearish' ? ', confirming downward pressure.' : ', no clear directional signal.'}{' '}
                        CVD is <span className={cvd >= 0 ? 'text-[#00ff88]' : 'text-red-400'}>{cvd >= 0 ? 'positive (net buying)' : 'negative (net selling)'}</span>,
                        {cvd >= 0 ? ' indicating real demand behind price action.' : ' suggesting distribution despite any price bounces.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════
              TAB 4: SIGNALS & EXECUTION
             ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="signals">
            <div className="space-y-4">
              {/* Active Signals */}
              <div>
                <h3 className="text-sm text-[#F7931A] mb-3 tracking-wider">ACTIVE SMC SIGNALS</h3>
                {signals.length === 0 ? (
                  <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-8 text-center">
                    <p className="text-gray-500 text-sm">No active signals for {market.label}</p>
                    <p className="text-gray-600 text-xs mt-1">Signals are generated when SMC confluence aligns with OB + FVG + BOS structure</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {signals.map((sig, i) => (
                      <div key={i} className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-5">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-sm font-bold px-3 py-1 rounded ${
                            sig.direction === 'long' ? 'bg-green-900/40 text-[#00ff88]' : 'bg-red-900/40 text-red-400'
                          }`}>{sig.direction.toUpperCase()}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            sig.confidence === 'HIGH' ? 'bg-[#F7931A]/20 text-[#F7931A]' :
                            sig.confidence === 'MEDIUM' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-gray-800 text-gray-400'
                          }`}>{sig.confidence}</span>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Entry</span>
                            <span className="text-white font-bold">${sig.entry.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Stop Loss</span>
                            <span className="text-red-400 font-bold">${sig.stopLoss.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">TP1</span>
                            <span className="text-[#00ff88]">${sig.takeProfit.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">TP2</span>
                            <span className="text-[#00ff88]">${sig.takeProfit2.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">TP3</span>
                            <span className="text-[#00ff88]">${sig.takeProfit3.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Risk:Reward</span>
                            <span className="text-[#F7931A] font-bold">{sig.riskReward.toFixed(1)}R</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Confluence</span>
                            <span className="text-cyan-400">{sig.confluence.total}/100</span>
                          </div>
                        </div>
                        {sig.reasons.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[#1a1a2e]">
                            <div className="text-[10px] text-gray-600 uppercase mb-1">Reasons</div>
                            {sig.reasons.map((r, j) => (
                              <div key={j} className="text-[10px] text-gray-400 flex items-start gap-1 mt-0.5">
                                <span className="text-[#F7931A]">•</span> {r}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <a href={`https://app.hyperliquid.xyz/trade/${market.hl}`} target="_blank" rel="noopener noreferrer"
                            className={`text-[10px] font-bold py-2 rounded text-center transition-colors ${
                              sig.direction === 'long' ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-red-700 hover:bg-red-600 text-white'
                            }`}>Execute on HL</a>
                          <a href="https://trade.dydx.exchange" target="_blank" rel="noopener noreferrer"
                            className="bg-purple-700 hover:bg-purple-600 text-white text-[10px] font-bold py-2 rounded text-center transition-colors">
                            Execute on dYdX
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Risk Management */}
              <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-6">
                <h3 className="text-sm text-[#F7931A] mb-4 tracking-wider">RISK MANAGEMENT GUIDELINES</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-[#111118] rounded">
                    <div className="text-[#00ff88] font-bold mb-2">POSITION SIZING</div>
                    <p className="text-gray-400">Never risk more than 1-2% of portfolio per trade. Scale into positions — enter 50% at OB, add 30% at FVG, final 20% at OTE.</p>
                  </div>
                  <div className="p-3 bg-[#111118] rounded">
                    <div className="text-[#F7931A] font-bold mb-2">STOP PLACEMENT</div>
                    <p className="text-gray-400">Place stops beyond the order block zone, not at the edge. Smart money sweeps obvious stops before the move. Add 0.5-1% buffer.</p>
                  </div>
                  <div className="p-3 bg-[#111118] rounded">
                    <div className="text-purple-400 font-bold mb-2">TAKE PROFIT STRATEGY</div>
                    <p className="text-gray-400">TP1: 40% at nearest opposing OB. TP2: 40% at next key level. TP3: Trail remaining 20% with structure breaks as stops.</p>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-[#111118] border border-[#1a1a2e] rounded p-4">
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  DISCLAIMER: This analysis is for educational and informational purposes only. It does not constitute financial advice, investment recommendations, or solicitation to trade.
                  Past performance does not guarantee future results. Trading derivatives involves significant risk of loss. Always conduct your own research and consult with licensed financial advisors before making investment decisions.
                  Smart Money Concepts (SMC) analysis is based on price action interpretation and does not guarantee accuracy of market predictions.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
