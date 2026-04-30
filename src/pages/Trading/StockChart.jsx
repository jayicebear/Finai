import { useRef, useEffect, useState } from 'react'
import { createChart, CrosshairMode, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts'
import { fetchChartData } from '../../data/api'
import styles from './StockChart.module.css'

const PERIODS = [
  { key: 'd', label: '일' },
  { key: 'w', label: '주' },
  { key: 'm', label: '월' },
  { key: 'y', label: '년' },
]

const MA_LIST = [
  { n: 5,   color: '#ef4444', label: '5' },
  { n: 20,  color: '#f97316', label: '20' },
  { n: 60,  color: '#3b82f6', label: '60' },
  { n: 120, color: '#a855f7', label: '120' },
]

const OVERLAY_LIST = [
  { key: 'bb',      label: 'BB',    color: '#8b5cf6' },
  { key: 'vwap',    label: 'VWAP',  color: '#06b6d4' },
  { key: 'ichimoku',label: 'Cloud', color: '#10b981' },
]

const CHART_OPTS = {
  layout: { background: { color: '#ffffff' }, textColor: '#aaaaaa', attributionLogo: false },
  grid: { vertLines: { color: '#f5f2ed' }, horzLines: { color: '#f5f2ed' } },
  crosshair: { mode: CrosshairMode.Normal },
  rightPriceScale: { borderColor: '#ece8e2' },
  timeScale: { borderColor: '#ece8e2', timeVisible: false },
  handleScroll: true,
  handleScale: true,
}

function calcBollinger(data, period = 20, mult = 2) {
  return data.map((d, i, arr) => {
    if (i < period - 1) return d
    const slice = arr.slice(i - period + 1, i + 1)
    const mean = slice.reduce((s, x) => s + x.close, 0) / period
    const std = Math.sqrt(slice.reduce((s, x) => s + (x.close - mean) ** 2, 0) / period)
    return { ...d, bbUpper: +(mean + mult * std).toFixed(2), bbMid: +mean.toFixed(2), bbLower: +(mean - mult * std).toFixed(2) }
  })
}

function calcVWAP(data) {
  let cumTPV = 0, cumVol = 0
  return data.map(d => {
    const tp = (d.high + d.low + d.close) / 3
    cumTPV += tp * (d.volume || 1)
    cumVol += d.volume || 1
    return { ...d, vwap: +(cumTPV / cumVol).toFixed(2) }
  })
}

class IchimokuCloudPrimitive {
  constructor() {
    this._spanA = []
    this._spanB = []
    this._visible = false
    this._chart = null
    this._series = null
  }
  attached({ chart, series }) { this._chart = chart; this._series = series }
  detached() {}
  updateAllViews() {}
  paneViews() {
    const self = this
    return [{
      renderer() {
        return {
          draw(target) {
            if (!self._visible || !self._chart || !self._series || self._spanA.length < 2) return
            target.useBitmapCoordinateSpace(({ context: ctx, horizontalPixelRatio: hpr, verticalPixelRatio: vpr }) => {
              const bMap = new Map(self._spanB.map(d => [d.time, d.value]))
              const pts = []
              for (const { time, value: vA } of self._spanA) {
                const vB = bMap.get(time)
                if (vB == null) continue
                const x  = self._chart.timeScale().timeToCoordinate(time)
                const yA = self._series.priceToCoordinate(vA)
                const yB = self._series.priceToCoordinate(vB)
                if (x == null || yA == null || yB == null) continue
                pts.push({ x: x * hpr, yA: yA * vpr, yB: yB * vpr })
              }
              if (pts.length < 2) return
              ctx.save()
              ctx.beginPath()
              pts.forEach(({ x, yA }, i) => i === 0 ? ctx.moveTo(x, yA) : ctx.lineTo(x, yA))
              for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].yB)
              ctx.closePath()
              ctx.fillStyle = 'rgba(16,185,129,0.22)'
              ctx.fill()
              ctx.restore()
            })
          }
        }
      }
    }]
  }
  setData(spanA, spanB) { this._spanA = spanA; this._spanB = spanB }
  setVisible(v) { this._visible = v }
}

function calcIchimoku(data) {
  const hi = (a, b) => Math.max(...data.slice(a, b + 1).map(d => d.high))
  const lo = (a, b) => Math.min(...data.slice(a, b + 1).map(d => d.low))
  const tenkan = [], kijun = [], spanA = [], spanB = []
  data.forEach((d, i) => {
    if (i >= 8)
      tenkan.push({ time: d.time, value: +((hi(i-8,i) + lo(i-8,i)) / 2).toFixed(2) })
    if (i >= 25)
      kijun.push({ time: d.time, value: +((hi(i-25,i) + lo(i-25,i)) / 2).toFixed(2) })
    if (i >= 25 && i + 26 < data.length) {
      const t = (hi(i-8,i) + lo(i-8,i)) / 2
      const k = (hi(i-25,i) + lo(i-25,i)) / 2
      spanA.push({ time: data[i+26].time, value: +((t + k) / 2).toFixed(2) })
    }
    if (i >= 51 && i + 26 < data.length)
      spanB.push({ time: data[i+26].time, value: +((hi(i-51,i) + lo(i-51,i)) / 2).toFixed(2) })
  })
  return { tenkan, kijun, spanA, spanB }
}


export default function StockChart({ stock, onPriceUpdate }) {
  const mainRef         = useRef(null)
  const chartRef        = useRef(null)
  const candleRef       = useRef(null)
  const volSeriesRef    = useRef(null)
  const maSeriesRefs    = useRef({})
  const overlayRefs     = useRef({})

  const [period, setPeriod]           = useState('d')
  const [activeMAs, setMAs]           = useState([5, 20])
  const [activeOverlays, setOverlays] = useState([])
  const [hovered, setHovered]         = useState(null)
  const [chartData, setChartData]     = useState([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)

  const isUp = stock.change >= 0

  useEffect(() => {
    if (!mainRef.current) return

    const chart = createChart(mainRef.current, {
      ...CHART_OPTS,
      width: mainRef.current.clientWidth,
      height: 380,
    })
    chartRef.current = chart

    // Ichimoku — primitive draws the cloud polygon, series draw the lines
    const ichiCommon = { priceScaleId: 'right', priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, visible: false }
    overlayRefs.current.ichi_spanA  = chart.addSeries(LineSeries, { color: '#10b981', lineWidth: 1, ...ichiCommon })
    overlayRefs.current.ichi_spanB  = chart.addSeries(LineSeries, { color: '#10b981', lineWidth: 1, lineStyle: 2, ...ichiCommon })
    overlayRefs.current.ichi_tenkan = chart.addSeries(LineSeries, { color: '#f43f5e', lineWidth: 1, ...ichiCommon })
    overlayRefs.current.ichi_kijun  = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1.5, ...ichiCommon })
    const cloudPrimitive = new IchimokuCloudPrimitive()
    overlayRefs.current.ichi_spanA.attachPrimitive(cloudPrimitive)
    overlayRefs.current.ichi_primitive = cloudPrimitive

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#dc2626', downColor: '#3b82f6',
      borderUpColor: '#dc2626', borderDownColor: '#3b82f6',
      wickUpColor: '#dc2626', wickDownColor: '#3b82f6',
      priceScaleId: 'right',
    })
    candleRef.current = candle

    chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.05, bottom: 0.25 } })

    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    })
    volSeriesRef.current = volSeries
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })

    chart.subscribeCrosshairMove(param => {
      if (param.time && param.seriesData.has(candle)) {
        setHovered(param.seriesData.get(candle))
      } else {
        setHovered(null)
      }
    })

    const ro = new ResizeObserver(() => {
      if (mainRef.current) chart.applyOptions({ width: mainRef.current.clientWidth })
    })
    ro.observe(mainRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      maSeriesRefs.current = {}
      overlayRefs.current  = {}
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchChartData(stock, period)
      .then(data => {
        if (!cancelled) {
          setChartData(data)
          if (onPriceUpdate && data.length >= 2) {
            const last = data[data.length - 1]
            const prev = data[data.length - 2]
            const change = last.close - prev.close
            onPriceUpdate(stock.id, last.close, change, (change / prev.close) * 100)
          }
        }
      })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [stock.id, period])

  useEffect(() => {
    if (!candleRef.current || !chartRef.current || !chartData.length) return

    candleRef.current.setData(
      chartData.map(d => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close }))
    )

    MA_LIST.forEach(({ n, color }) => {
      if (!maSeriesRefs.current[n]) {
        maSeriesRefs.current[n] = chartRef.current.addSeries(LineSeries, {
          color, lineWidth: 1.5,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        })
      }
      maSeriesRefs.current[n].setData(
        chartData.filter(d => d[`ma${n}`] != null).map(d => ({ time: d.time, value: d[`ma${n}`] }))
      )
      maSeriesRefs.current[n].applyOptions({ visible: activeMAs.includes(n) })
    })

    // Bollinger Bands
    const withBB = calcBollinger(chartData)
    ;['bbUpper', 'bbMid', 'bbLower'].forEach((key, i) => {
      const color = '#8b5cf6'
      const style = key === 'bbMid' ? 2 : 0
      if (!overlayRefs.current[key]) {
        overlayRefs.current[key] = chartRef.current.addSeries(LineSeries, {
          color, lineWidth: 1, lineStyle: style,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        })
      }
      overlayRefs.current[key].setData(
        withBB.filter(d => d[key] != null).map(d => ({ time: d.time, value: d[key] }))
      )
      overlayRefs.current[key].applyOptions({ visible: activeOverlays.includes('bb') })
    })

    // VWAP
    const withVWAP = calcVWAP(chartData)
    if (!overlayRefs.current.vwap) {
      overlayRefs.current.vwap = chartRef.current.addSeries(LineSeries, {
        color: '#06b6d4', lineWidth: 1.5,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      })
    }
    overlayRefs.current.vwap.setData(withVWAP.map(d => ({ time: d.time, value: d.vwap })))
    overlayRefs.current.vwap.applyOptions({ visible: activeOverlays.includes('vwap') })

    // Ichimoku Cloud (series pre-created in init effect)
    const ichi = calcIchimoku(chartData)
    const ichiVis = activeOverlays.includes('ichimoku')
    overlayRefs.current.ichi_spanA?.setData(ichi.spanA)
    overlayRefs.current.ichi_spanB?.setData(ichi.spanB)
    overlayRefs.current.ichi_tenkan?.setData(ichi.tenkan)
    overlayRefs.current.ichi_kijun?.setData(ichi.kijun)
    overlayRefs.current.ichi_primitive?.setData(ichi.spanA, ichi.spanB)
    overlayRefs.current.ichi_primitive?.setVisible(ichiVis)
    ;['ichi_spanA', 'ichi_spanB', 'ichi_tenkan', 'ichi_kijun'].forEach(k =>
      overlayRefs.current[k]?.applyOptions({ visible: ichiVis })
    )

    if (volSeriesRef.current) {
      volSeriesRef.current.setData(
        chartData.map(d => ({
          time: d.time,
          value: d.volume,
          color: d.close >= d.open ? 'rgba(220,38,38,0.5)' : 'rgba(59,130,246,0.5)',
        }))
      )
    }

    chartRef.current.timeScale().fitContent()
  }, [chartData])

  useEffect(() => {
    MA_LIST.forEach(({ n }) => {
      maSeriesRefs.current[n]?.applyOptions({ visible: activeMAs.includes(n) })
    })
  }, [activeMAs])

  useEffect(() => {
    ;['bbUpper', 'bbMid', 'bbLower'].forEach(k => {
      overlayRefs.current[k]?.applyOptions({ visible: activeOverlays.includes('bb') })
    })
    overlayRefs.current.vwap?.applyOptions({ visible: activeOverlays.includes('vwap') })
    const ichiOn = activeOverlays.includes('ichimoku')
    ;['ichi_tenkan', 'ichi_kijun', 'ichi_spanA', 'ichi_spanB'].forEach(k => {
      overlayRefs.current[k]?.applyOptions({ visible: ichiOn })
    })
    overlayRefs.current.ichi_primitive?.setVisible(ichiOn)
    overlayRefs.current.ichi_spanA?.applyOptions({}) // trigger re-render for primitive
  }, [activeOverlays])

  function toggleMA(n) {
    setMAs(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])
  }
  function toggleOverlay(key) {
    setOverlays(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])
  }

  const lastBar  = chartData[chartData.length - 1] || {}
  const prevBar  = chartData[chartData.length - 2] || {}
  const display  = hovered ?? lastBar
  const livePrice  = lastBar.close ?? stock.price
  const liveChange = prevBar.close ? livePrice - prevBar.close : stock.change
  const livePct    = prevBar.close ? (liveChange / prevBar.close) * 100 : stock.changePct
  const liveUp     = liveChange >= 0

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.left}>
          <span className={styles.tickerLabel}>{stock.id}</span>
          <span className={styles.nameLabel}>{stock.name}</span>
          <span className={`${styles.priceTag} ${liveUp ? styles.up : styles.down}`}>
            ${livePrice.toFixed(2)}
            <span className={styles.changePct}> {liveUp ? '+' : ''}{livePct.toFixed(2)}%</span>
          </span>
        </div>
        <div className={styles.controls}>
          <div className={styles.periodGroup}>
            {PERIODS.map(p => (
              <button key={p.key}
                className={`${styles.periodBtn} ${period === p.key ? styles.periodActive : ''}`}
                onClick={() => setPeriod(p.key)}
              >{p.label}</button>
            ))}
          </div>
          <div className={styles.maGroup}>
            <span className={styles.maLabel}>MA</span>
            {MA_LIST.map(({ n, color, label }) => (
              <button key={n}
                className={`${styles.maBtn} ${activeMAs.includes(n) ? styles.maActive : ''}`}
                style={activeMAs.includes(n) ? { color, borderColor: color, background: color + '18' } : {}}
                onClick={() => toggleMA(n)}
              >{label}</button>
            ))}
          </div>
          <div className={styles.maGroup}>
            {OVERLAY_LIST.map(({ key, label, color }) => (
              <button key={key}
                className={`${styles.maBtn} ${activeOverlays.includes(key) ? styles.maActive : ''}`}
                style={activeOverlays.includes(key) ? { color, borderColor: color, background: color + '18' } : {}}
                onClick={() => toggleOverlay(key)}
              >{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.ohlcBar}>
        <span className={styles.ohlcItem}>시작 <strong>{display.open ?? '-'}</strong></span>
        <span className={styles.ohlcItem}>고가 <strong style={{ color: '#16a34a' }}>{display.high ?? '-'}</strong></span>
        <span className={styles.ohlcItem}>저가 <strong style={{ color: '#dc2626' }}>{display.low ?? '-'}</strong></span>
        <span className={styles.ohlcItem}>종가 <strong>{display.close ?? '-'}</strong></span>
        {activeMAs.map(n => {
          const ma  = display[`ma${n}`]
          const cfg = MA_LIST.find(m => m.n === n)
          return ma ? (
            <span key={n} className={styles.ohlcItem}>
              MA{n} <strong style={{ color: cfg.color }}>{ma}</strong>
            </span>
          ) : null
        })}
      </div>

      <div style={{ position: 'relative' }}>
        <div ref={mainRef} />
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', fontSize: 14, color: '#888' }}>
            불러오는 중...
          </div>
        )}
        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.9)', fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
