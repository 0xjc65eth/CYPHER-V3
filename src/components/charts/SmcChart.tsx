'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  createChart,
  createSeriesMarkers,
  ColorType,
  LineStyle,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
} from 'lightweight-charts'
import type { IChartApi, ISeriesApi, SeriesMarker, Time } from 'lightweight-charts'
import type { SMCAnalysisResult, SMCSignal } from '@/lib/smc/types'
import type { OverlayConfig } from './SmcOverlayControls'

export interface SmcCandle {
  time: number // UTC seconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface Props {
  candles: SmcCandle[]
  smcResult: SMCAnalysisResult | null
  overlays: OverlayConfig
  signals?: SMCSignal[]
  height?: number
}

function toChartTime(ts: number): Time {
  return ts as Time
}

function fmtVol(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toFixed(0)
}

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toFixed(6)
}

export function SmcChart({ candles, smcResult, overlays, signals = [], height = 500 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const markersRef = useRef<import('lightweight-charts').ISeriesMarkersPluginApi<Time> | null>(null)
  const candlesRef = useRef<SmcCandle[]>([])

  // Keep candles ref in sync for crosshair callback
  candlesRef.current = candles

  // Legend state for crosshair tracking
  const [legend, setLegend] = useState<{
    time: string; open: number; high: number; low: number; close: number; volume: number; change: number; changePct: number
  } | null>(null)

  // Update legend to last candle when data changes
  const updateLegendToLast = useCallback(() => {
    const c = candlesRef.current
    if (c.length > 0) {
      const last = c[c.length - 1]
      const change = last.close - last.open
      const changePct = last.open !== 0 ? (change / last.open) * 100 : 0
      const d = new Date(last.time * 1000)
      setLegend({
        time: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        open: last.open, high: last.high, low: last.low, close: last.close,
        volume: last.volume, change, changePct,
      })
    }
  }, [])

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#06060c' },
        textColor: '#555568',
        fontSize: 11,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: '#0e0e1a', style: LineStyle.Solid },
        horzLines: { color: '#0e0e1a', style: LineStyle.Solid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#F7931A30',
          style: LineStyle.Dashed,
          width: 1,
          labelBackgroundColor: '#F7931A',
        },
        horzLine: {
          color: '#F7931A30',
          style: LineStyle.Dashed,
          width: 1,
          labelBackgroundColor: '#F7931A',
        },
      },
      rightPriceScale: {
        borderColor: '#1a1a2e',
        scaleMargins: { top: 0.06, bottom: 0.20 },
        autoScale: true,
      },
      timeScale: {
        borderColor: '#1a1a2e',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 8,
        minBarSpacing: 2,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00dc82',
      downColor: '#ff3b5c',
      borderUpColor: '#00dc82',
      borderDownColor: '#ff3b5c',
      wickUpColor: '#00dc8280',
      wickDownColor: '#ff3b5c80',
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.84, bottom: 0 },
    })

    // Crosshair move handler — uses ref to avoid stale closure
    chart.subscribeCrosshairMove((param) => {
      try {
        if (!param || !param.time || !param.seriesData) {
          updateLegendToLast()
          return
        }

        const candleData = param.seriesData.get(candleSeries)
        const volData = param.seriesData.get(volumeSeries)

        if (candleData && 'open' in candleData) {
          const c = candleData as { open: number; high: number; low: number; close: number }
          const v = volData && 'value' in volData ? (volData as { value: number }).value : 0
          const change = c.close - c.open
          const changePct = c.open !== 0 ? (change / c.open) * 100 : 0
          const ts = typeof param.time === 'number' ? param.time : 0
          const d = new Date(ts * 1000)

          setLegend({
            time: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            open: c.open, high: c.high, low: c.low, close: c.close,
            volume: v, change, changePct,
          })
        }
      } catch {
        // Prevent crosshair errors from crashing the chart
      }
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (containerRef.current && chart) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      markersRef.current = null
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, [height, updateLegendToLast])

  // Update legend when candles change
  useEffect(() => { updateLegendToLast() }, [candles, updateLegendToLast])

  // Update candle + volume data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return

    const candleData = candles.map((c) => ({
      time: toChartTime(c.time),
      open: c.open, high: c.high, low: c.low, close: c.close,
    }))

    const volumeData = candles.map((c) => ({
      time: toChartTime(c.time),
      value: c.volume,
      color: c.close >= c.open ? '#00dc8218' : '#ff3b5c18',
    }))

    candleSeriesRef.current.setData(candleData)
    volumeSeriesRef.current.setData(volumeData)
  }, [candles])

  // ═══ SMC OVERLAYS (markers + price lines) ═══
  useEffect(() => {
    if (!candleSeriesRef.current || !smcResult || candles.length === 0) return

    const markers: SeriesMarker<Time>[] = []

    // ── BOS markers ──
    if (overlays.bosChoch) {
      for (const b of smcResult.breakOfStructure) {
        const ts = Math.floor(b.timestamp.getTime() / 1000)
        markers.push({
          time: toChartTime(ts),
          position: b.type === 'bullish' ? 'belowBar' : 'aboveBar',
          color: b.type === 'bullish' ? '#00b4d8' : '#ff6b6b',
          shape: b.type === 'bullish' ? 'arrowUp' : 'arrowDown',
          text: `BOS ${b.type === 'bullish' ? '▲' : '▼'}`,
        })
      }
      for (const c of smcResult.choch) {
        const ts = Math.floor(c.timestamp.getTime() / 1000)
        markers.push({
          time: toChartTime(ts),
          position: c.type === 'bullish' ? 'belowBar' : 'aboveBar',
          color: '#e040fb',
          shape: c.type === 'bullish' ? 'arrowUp' : 'arrowDown',
          text: `ChoCH ${c.type === 'bullish' ? '⇑' : '⇓'}`,
        })
      }
    }

    // ── Liquidity sweep markers ──
    if (overlays.liquidity) {
      for (const s of smcResult.liquiditySweeps) {
        const ts = Math.floor(s.timestamp.getTime() / 1000)
        markers.push({
          time: toChartTime(ts),
          position: s.type === 'bullish' ? 'belowBar' : 'aboveBar',
          color: '#ffd600',
          shape: 'circle',
          text: `$LIQ ${s.type === 'bullish' ? '↑' : '↓'}`,
        })
      }
    }

    // ── Trade signal entry markers ──
    if (signals.length > 0) {
      const lastCandle = candles[candles.length - 1]
      for (const sig of signals.slice(0, 3)) {
        markers.push({
          time: toChartTime(lastCandle.time),
          position: sig.direction === 'long' ? 'belowBar' : 'aboveBar',
          color: sig.direction === 'long' ? '#00ff88' : '#ff3b5c',
          shape: sig.direction === 'long' ? 'arrowUp' : 'arrowDown',
          text: `${sig.direction === 'long' ? 'LONG' : 'SHORT'} ${sig.confidence}`,
        })
      }
    }

    markers.sort((a, b) => (a.time as number) - (b.time as number))

    try {
      if (markersRef.current) {
        markersRef.current.setMarkers(markers)
      } else if (candleSeriesRef.current) {
        markersRef.current = createSeriesMarkers(candleSeriesRef.current, markers)
      }
    } catch {
      // Markers API can fail if series was destroyed
    }

    // ═══ PRICE LINES for SMC zones ═══
    const priceLines: ReturnType<typeof candleSeriesRef.current.createPriceLine>[] = []
    const cs = candleSeriesRef.current

    // ── Order Block zones (dual lines with titles) ──
    if (overlays.orderBlocks) {
      const activeOBs = smcResult.orderBlocks.filter((ob) => !ob.mitigated).slice(-12)
      for (const ob of activeOBs) {
        const isBull = ob.type === 'bullish'
        const color = isBull ? '#00dc82' : '#ff3b5c'
        const midPrice = (ob.high + ob.low) / 2
        const obLabel = `${isBull ? '▲' : '▼'} OB ${ob.strength}%`

        // Top boundary
        priceLines.push(cs.createPriceLine({
          price: ob.high, color: color + '90', lineWidth: 1, lineStyle: LineStyle.Dotted,
          axisLabelVisible: false, title: '',
        }))
        // Bottom boundary
        priceLines.push(cs.createPriceLine({
          price: ob.low, color: color + '90', lineWidth: 1, lineStyle: LineStyle.Dotted,
          axisLabelVisible: false, title: '',
        }))
        // Mid-level with label
        priceLines.push(cs.createPriceLine({
          price: midPrice, color: color + '50', lineWidth: 1, lineStyle: LineStyle.Solid,
          axisLabelVisible: true, title: obLabel,
        }))
      }
    }

    // ── FVG zones (imbalance) ──
    if (overlays.fvg) {
      const activeFVGs = smcResult.fairValueGaps.filter((f) => !f.filled).slice(-10)
      for (const fvg of activeFVGs) {
        const isBull = fvg.type === 'bullish'
        const color = isBull ? '#7c3aed' : '#f43f5e'
        const midPrice = (fvg.top + fvg.bottom) / 2

        priceLines.push(cs.createPriceLine({
          price: fvg.top, color: color + '70', lineWidth: 1, lineStyle: LineStyle.Dashed,
          axisLabelVisible: false, title: '',
        }))
        priceLines.push(cs.createPriceLine({
          price: fvg.bottom, color: color + '70', lineWidth: 1, lineStyle: LineStyle.Dashed,
          axisLabelVisible: false, title: '',
        }))
        priceLines.push(cs.createPriceLine({
          price: midPrice, color: color + '40', lineWidth: 1, lineStyle: LineStyle.Solid,
          axisLabelVisible: false, title: `FVG ${isBull ? '▲' : '▼'}`,
        }))
      }
    }

    // ── Support / Resistance levels ──
    if (overlays.liquidity) {
      for (const level of smcResult.keyLevels.support.slice(-4)) {
        priceLines.push(cs.createPriceLine({
          price: level, color: '#ffd60080', lineWidth: 1, lineStyle: LineStyle.LargeDashed,
          axisLabelVisible: true, title: 'SUPPORT',
        }))
      }
      for (const level of smcResult.keyLevels.resistance.slice(-4)) {
        priceLines.push(cs.createPriceLine({
          price: level, color: '#ff6b6b80', lineWidth: 1, lineStyle: LineStyle.LargeDashed,
          axisLabelVisible: true, title: 'RESISTANCE',
        }))
      }
    }

    // ── OTE Zone (Fibonacci) ──
    if (overlays.ote && smcResult.keyLevels.support.length > 0 && smcResult.keyLevels.resistance.length > 0) {
      const swingLow = Math.min(...smcResult.keyLevels.support)
      const swingHigh = Math.max(...smcResult.keyLevels.resistance)
      const range = swingHigh - swingLow
      if (range > 0) {
        const fib618 = swingHigh - range * 0.618
        const fib786 = swingHigh - range * 0.786
        const fib50 = swingHigh - range * 0.5
        priceLines.push(
          cs.createPriceLine({
            price: fib50, color: '#14b8a640', lineWidth: 1, lineStyle: LineStyle.Dashed,
            axisLabelVisible: true, title: 'FIB 0.5',
          }),
          cs.createPriceLine({
            price: fib618, color: '#14b8a680', lineWidth: 2, lineStyle: LineStyle.Dashed,
            axisLabelVisible: true, title: 'OTE 0.618',
          }),
          cs.createPriceLine({
            price: fib786, color: '#14b8a680', lineWidth: 2, lineStyle: LineStyle.Dashed,
            axisLabelVisible: true, title: 'OTE 0.786',
          })
        )
      }
    }

    // ── Trade Signal levels (Entry, SL, TP1-3) ──
    if (signals.length > 0) {
      const bestSignal = signals[0]
      priceLines.push(cs.createPriceLine({
        price: bestSignal.entry, color: '#F7931A', lineWidth: 2, lineStyle: LineStyle.Solid,
        axisLabelVisible: true, title: `${bestSignal.direction === 'long' ? '⬆ ENTRY' : '⬇ ENTRY'} (${bestSignal.confidence})`,
      }))
      priceLines.push(cs.createPriceLine({
        price: bestSignal.stopLoss, color: '#ff3b5c', lineWidth: 2, lineStyle: LineStyle.Solid,
        axisLabelVisible: true, title: 'STOP LOSS',
      }))
      priceLines.push(cs.createPriceLine({
        price: bestSignal.takeProfit, color: '#00ff88', lineWidth: 1, lineStyle: LineStyle.Dashed,
        axisLabelVisible: true, title: `TP1 (${bestSignal.riskReward.toFixed(1)}R)`,
      }))
      priceLines.push(cs.createPriceLine({
        price: bestSignal.takeProfit2, color: '#00dc82', lineWidth: 1, lineStyle: LineStyle.Dashed,
        axisLabelVisible: true, title: 'TP2',
      }))
      priceLines.push(cs.createPriceLine({
        price: bestSignal.takeProfit3, color: '#00b86b', lineWidth: 1, lineStyle: LineStyle.Dashed,
        axisLabelVisible: true, title: 'TP3',
      }))
    }

    return () => {
      if (candleSeriesRef.current) {
        for (const line of priceLines) {
          try { candleSeriesRef.current.removePriceLine(line) } catch { /* destroyed */ }
        }
      }
    }
  }, [smcResult, overlays, candles, signals])

  // Fit content when candles change significantly
  useEffect(() => {
    if (chartRef.current && candles.length > 0) {
      chartRef.current.timeScale().fitContent()
    }
  }, [candles.length])

  // Count active overlays for legend
  const activeOBs = smcResult?.orderBlocks.filter(ob => !ob.mitigated).length ?? 0
  const activeFVGs = smcResult?.fairValueGaps.filter(f => !f.filled).length ?? 0
  const bosCount = smcResult?.breakOfStructure.length ?? 0
  const chochCount = smcResult?.choch.length ?? 0
  const sweepCount = smcResult?.liquiditySweeps.length ?? 0
  const bestSignal = signals.length > 0 ? signals[0] : null

  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-[#06060c] border border-[#1a1a2e]" style={{ minHeight: height }}>

      {/* ═══ TOP LEGEND BAR ═══ */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 bg-gradient-to-b from-[#06060cee] via-[#06060caa] to-transparent">

          {/* OHLCV Legend */}
          {legend && (
            <>
              <span className="text-[11px] text-gray-600 font-mono">{legend.time}</span>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="text-gray-600">O <span className="text-gray-300">{fmtPrice(legend.open)}</span></span>
                <span className="text-gray-600">H <span className="text-[#00dc82]">{fmtPrice(legend.high)}</span></span>
                <span className="text-gray-600">L <span className="text-[#ff3b5c]">{fmtPrice(legend.low)}</span></span>
                <span className="text-gray-600">C <span className={legend.close >= legend.open ? 'text-[#00dc82]' : 'text-[#ff3b5c]'}>{fmtPrice(legend.close)}</span></span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className={`font-bold ${legend.change >= 0 ? 'text-[#00dc82]' : 'text-[#ff3b5c]'}`}>
                  {legend.change >= 0 ? '+' : ''}{fmtPrice(legend.change)} ({legend.changePct >= 0 ? '+' : ''}{legend.changePct.toFixed(2)}%)
                </span>
                <span className="text-gray-600">Vol <span className="text-blue-400">{fmtVol(legend.volume)}</span></span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ SIGNAL BADGE (top-right) ═══ */}
      {bestSignal && (
        <div className="absolute top-2 right-3 z-10 pointer-events-none">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-[11px] font-mono font-bold border ${
            bestSignal.direction === 'long'
              ? 'bg-green-950/80 border-green-700/50 text-[#00ff88]'
              : 'bg-red-950/80 border-red-700/50 text-[#ff3b5c]'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            {bestSignal.direction.toUpperCase()} • {bestSignal.confidence} • {bestSignal.riskReward.toFixed(1)}R
          </div>
        </div>
      )}

      {/* ═══ SMC OVERLAY LEGEND (bottom-left) ═══ */}
      {smcResult && (
        <div className="absolute bottom-2 left-3 z-10 pointer-events-none">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono bg-[#06060cdd] backdrop-blur-sm rounded-md px-3 py-2 border border-[#1a1a2e]/50">

            {/* Trend Badge */}
            <span className={`font-bold uppercase px-2 py-0.5 rounded-sm ${
              smcResult.currentTrend === 'bullish' ? 'bg-green-900/60 text-[#00dc82] border border-green-700/30' :
              smcResult.currentTrend === 'bearish' ? 'bg-red-900/60 text-[#ff3b5c] border border-red-700/30' :
              'bg-gray-800/60 text-gray-400 border border-gray-700/30'
            }`}>{smcResult.currentTrend}</span>

            {/* Overlay counts */}
            {overlays.orderBlocks && activeOBs > 0 && (
              <span className="flex items-center gap-1 text-gray-400">
                <span className="w-2 h-2 rounded-sm bg-[#f97316]" />
                OB: <span className="text-white">{activeOBs}</span>
              </span>
            )}
            {overlays.fvg && activeFVGs > 0 && (
              <span className="flex items-center gap-1 text-gray-400">
                <span className="w-2 h-2 rounded-sm bg-[#7c3aed]" />
                FVG: <span className="text-white">{activeFVGs}</span>
              </span>
            )}
            {overlays.bosChoch && bosCount > 0 && (
              <span className="flex items-center gap-1 text-gray-400">
                <span className="w-2 h-2 rounded-sm bg-[#00b4d8]" />
                BOS: <span className="text-white">{bosCount}</span>
              </span>
            )}
            {overlays.bosChoch && chochCount > 0 && (
              <span className="flex items-center gap-1 text-gray-400">
                <span className="w-2 h-2 rounded-sm bg-[#e040fb]" />
                ChoCH: <span className="text-white">{chochCount}</span>
              </span>
            )}
            {overlays.liquidity && sweepCount > 0 && (
              <span className="flex items-center gap-1 text-gray-400">
                <span className="w-2 h-2 rounded-sm bg-[#ffd600]" />
                Sweeps: <span className="text-white">{sweepCount}</span>
              </span>
            )}
            {overlays.ote && smcResult.oteZone && (
              <span className="flex items-center gap-1 text-teal-500">
                <span className="w-2 h-2 rounded-sm bg-[#14b8a6]" />
                OTE
              </span>
            )}
          </div>
        </div>
      )}

      {/* ═══ INTERACTION HINT (bottom-right) ═══ */}
      <div className="absolute bottom-2 right-3 z-10 pointer-events-none">
        <div className="text-[9px] font-mono text-gray-700 bg-[#06060ccc] rounded px-2 py-1">
          Scroll: zoom | Drag: pan | Click axis: reset
        </div>
      </div>

      {/* Chart container */}
      <div ref={containerRef} className="w-full" style={{ minHeight: height }} />
    </div>
  )
}
