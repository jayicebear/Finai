import { useState, useEffect, useRef, useMemo } from 'react'
import { createChart, CrosshairMode, CandlestickSeries, LineSeries, HistogramSeries, createSeriesMarkers } from 'lightweight-charts'
import { aggregateWeekly, aggregateMonthly, aggregateYearly } from '../../data/stocks'
import styles from './AIChartPanel.module.css'

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
  { key: 'bb',       label: 'BB',    color: '#8b5cf6' },
  { key: 'vwap',     label: 'VWAP',  color: '#06b6d4' },
  { key: 'ichimoku', label: 'Cloud', color: '#10b981' },
]

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

function calcIchimoku(data) {
  const hi = (a, b) => Math.max(...data.slice(a, b + 1).map(d => d.high))
  const lo = (a, b) => Math.min(...data.slice(a, b + 1).map(d => d.low))
  const tenkan = [], kijun = [], spanA = [], spanB = []
  data.forEach((d, i) => {
    if (i >= 8)  tenkan.push({ time: d.time, value: +((hi(i-8,i)  + lo(i-8,i))  / 2).toFixed(2) })
    if (i >= 25) kijun.push ({  time: d.time, value: +((hi(i-25,i) + lo(i-25,i)) / 2).toFixed(2) })
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

class IchimokuCloudPrimitive {
  constructor() { this._spanA = []; this._spanB = []; this._visible = false; this._chart = null; this._series = null }
  attached({ chart, series }) { this._chart = chart; this._series = series }
  detached() {}
  updateAllViews() {}
  paneViews() {
    const self = this
    return [{ renderer() { return { draw(target) {
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
    }}}}]
  }
  setData(spanA, spanB) { this._spanA = spanA; this._spanB = spanB }
  setVisible(v) { this._visible = v }
}

function addMAs(data) {
  return data.map((d, i, arr) => {
    const row = { ...d }
    for (const { n } of MA_LIST) {
      if (i >= n - 1) {
        const avg = arr.slice(i - n + 1, i + 1).reduce((s, x) => s + x.close, 0) / n
        row[`ma${n}`] = parseFloat(avg.toFixed(2))
      }
    }
    return row
  })
}

const CHART_OPTS = {
  layout: { background: { color: '#ffffff' }, textColor: '#aaaaaa', attributionLogo: false },
  grid: { vertLines: { color: '#f5f2ed' }, horzLines: { color: '#f5f2ed' } },
  crosshair: { mode: CrosshairMode.Normal },
  rightPriceScale: { borderColor: '#ece8e2' },
  timeScale: { borderColor: '#ece8e2', timeVisible: false },
}

function ActionBanner({ action, model }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!action) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 4000)
    return () => clearTimeout(t)
  }, [action])
  if (!visible || !action) return null
  const isBuy = action.type === 'BUY'
  return (
    <div className={`${styles.banner} ${isBuy ? styles.bannerBuy : styles.bannerSell}`}>
      <span className={styles.bannerModel} style={{ color: model.color }}>{model.name}</span>
      <span className={styles.bannerText}>
        {isBuy ? '매수' : '매도'} 체결 —
        <strong> {action.stock?.id ?? action.stock} {action.qty}주</strong>
        @ ${action.price?.toFixed(2)}
      </span>
      <span className={styles.bannerReason}>{action.reason}</span>
    </div>
  )
}

function AIChartPanel({ stocks, selectedStock, onStockChange, chartData: markedData, thinking, lastAction, tradeLog, running, autoMode, model }) {
  const isUp = stock => stock.change >= 0
  const recentTrades = tradeLog.slice(0, 6)

  const mainRef      = useRef(null)
  const chartRef     = useRef(null)
  const candleRef    = useRef(null)
  const volSeriesRef = useRef(null)
  const maSeriesRefs  = useRef({})
  const markersRef    = useRef(null)

  const [period, setPeriod] = useState('d')
  const [activeMAs, setMAs] = useState([5, 20])
  const [activeOverlays, setOverlays] = useState([])
  const [hovered, setHovered] = useState(null)
  const overlayRefs = useRef({})

  const baseData = useMemo(() => {
    if (period === 'w') return aggregateWeekly(markedData)
    if (period === 'm') return aggregateMonthly(markedData)
    if (period === 'y') return aggregateYearly(markedData)
    return markedData
  }, [period, markedData])

  const data = useMemo(() => addMAs(baseData), [baseData])

  // 차트 초기화
  useEffect(() => {
    if (!mainRef.current) return

    const chart = createChart(mainRef.current, {
      ...CHART_OPTS,
      width: mainRef.current.clientWidth,
      height: 320,
    })
    chartRef.current = chart

    // Ichimoku cloud (added first — renders behind candlesticks)
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
    markersRef.current = createSeriesMarkers(candle, [])

    chart.priceScale('right').applyOptions({
      scaleMargins: { top: 0.05, bottom: 0.25 },
    })

    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    })
    volSeriesRef.current = volSeries

    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })

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

  // 데이터 + 마커 업데이트
  useEffect(() => {
    if (!candleRef.current || !chartRef.current) return

    candleRef.current.setData(
      data.map(d => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close }))
    )

    // BUY/SELL 마커 (일봉만)
    if (markersRef.current) {
      if (period === 'd') {
        const markers = data
          .filter(d => d.buyAt || d.sellAt)
          .map(d => d.buyAt ? {
            time: d.time,
            position: 'belowBar',
            color: '#16a34a',
            shape: 'arrowUp',
            text: 'BUY',
          } : {
            time: d.time,
            position: 'aboveBar',
            color: '#dc2626',
            shape: 'arrowDown',
            text: 'SELL',
          })
        markersRef.current.setMarkers(markers)
      } else {
        markersRef.current.setMarkers([])
      }
    }

    MA_LIST.forEach(({ n, color }) => {
      if (!maSeriesRefs.current[n]) {
        maSeriesRefs.current[n] = chartRef.current.addSeries(LineSeries, {
          color, lineWidth: 1.5,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        })
      }
      maSeriesRefs.current[n].setData(
        data.filter(d => d[`ma${n}`] != null).map(d => ({ time: d.time, value: d[`ma${n}`] }))
      )
      maSeriesRefs.current[n].applyOptions({ visible: activeMAs.includes(n) })
    })

    if (volSeriesRef.current) {
      volSeriesRef.current.setData(
        data.map(d => ({
          time: d.time,
          value: d.volume ?? 0,
          color: d.close >= d.open ? 'rgba(220,38,38,0.5)' : 'rgba(59,130,246,0.5)',
        }))
      )
    }

    // Bollinger Bands
    const withBB = calcBollinger(data)
    ;['bbUpper', 'bbMid', 'bbLower'].forEach((key) => {
      const style = key === 'bbMid' ? 2 : 0
      if (!overlayRefs.current[key]) {
        overlayRefs.current[key] = chartRef.current.addSeries(LineSeries, {
          color: '#8b5cf6', lineWidth: 1, lineStyle: style,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        })
      }
      overlayRefs.current[key].setData(withBB.filter(d => d[key] != null).map(d => ({ time: d.time, value: d[key] })))
      overlayRefs.current[key].applyOptions({ visible: activeOverlays.includes('bb') })
    })

    // VWAP
    const withVWAP = calcVWAP(data)
    if (!overlayRefs.current.vwap) {
      overlayRefs.current.vwap = chartRef.current.addSeries(LineSeries, {
        color: '#06b6d4', lineWidth: 1.5,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      })
    }
    overlayRefs.current.vwap.setData(withVWAP.map(d => ({ time: d.time, value: d.vwap })))
    overlayRefs.current.vwap.applyOptions({ visible: activeOverlays.includes('vwap') })

    // Ichimoku
    const ichi = calcIchimoku(data)
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

    chartRef.current.timeScale().fitContent()
  }, [data, period])

  // MA 표시/숨김
  useEffect(() => {
    MA_LIST.forEach(({ n }) => {
      maSeriesRefs.current[n]?.applyOptions({ visible: activeMAs.includes(n) })
    })
  }, [activeMAs])

  useEffect(() => {
    ;['bbUpper', 'bbMid', 'bbLower'].forEach(k =>
      overlayRefs.current[k]?.applyOptions({ visible: activeOverlays.includes('bb') })
    )
    overlayRefs.current.vwap?.applyOptions({ visible: activeOverlays.includes('vwap') })
    const ichiOn = activeOverlays.includes('ichimoku')
    ;['ichi_spanA', 'ichi_spanB', 'ichi_tenkan', 'ichi_kijun'].forEach(k =>
      overlayRefs.current[k]?.applyOptions({ visible: ichiOn })
    )
    overlayRefs.current.ichi_primitive?.setVisible(ichiOn)
    overlayRefs.current.ichi_spanA?.applyOptions({})
  }, [activeOverlays])

  function toggleMA(n) {
    setMAs(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])
  }
  function toggleOverlay(key) {
    setOverlays(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])
  }

  const lastBar = data[data.length - 1] || {}
  const display = hovered ?? lastBar

  return (
    <div className={styles.wrapper}>
      {/* 종목 탭 */}
      <div className={styles.stockBar}>
        {stocks.map(s => (
          <button
            key={s.id}
            className={`${styles.stockBtn} ${selectedStock.id === s.id ? styles.stockActive : ''}`}
            onClick={() => onStockChange(s)}
          >
            <span className={styles.stockTicker}>{s.id}</span>
            <span className={`${styles.stockPct} ${s.change >= 0 ? styles.up : styles.down}`}>
              {s.change >= 0 ? '+' : ''}{s.changePct.toFixed(2)}%
            </span>
          </button>
        ))}
      </div>

      {/* 종목 정보 + AI 상태 */}
      <div className={styles.infoRow}>
        <div>
          <span className={styles.ticker}>{selectedStock.id}</span>
          <span className={styles.name}>{selectedStock.name}</span>
        </div>
        <div className={styles.priceGroup}>
          <span className={styles.price}>${selectedStock.price.toFixed(2)}</span>
          <span className={`${styles.change} ${isUp(selectedStock) ? styles.up : styles.down}`}>
            {isUp(selectedStock) ? '+' : ''}{selectedStock.change.toFixed(2)} ({isUp(selectedStock) ? '+' : ''}{selectedStock.changePct.toFixed(2)}%)
          </span>
        </div>
        <div className={styles.aiStatus}>
          {running ? (
            thinking ? (
              <div className={styles.thinking}>
                <span className={styles.thinkDot} /><span className={styles.thinkDot} /><span className={styles.thinkDot} />
                <span className={styles.thinkLabel}>{model.name} 분석 중</span>
              </div>
            ) : (
              <div className={styles.liveStatus}>
                <span className={styles.liveDot} />
                <span>{model.name} 실행 중</span>
                {autoMode && <span className={styles.autoBadge} style={{ background: model.color }}>자동매매</span>}
              </div>
            )
          ) : (
            <span className={styles.offLabel}>대기</span>
          )}
        </div>
      </div>

      {/* 기간 + MA 컨트롤 */}
      <div className={styles.chartControls}>
        <div className={styles.periodGroup}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              className={`${styles.periodBtn} ${period === p.key ? styles.periodActive : ''}`}
              onClick={() => setPeriod(p.key)}
            >{p.label}</button>
          ))}
        </div>
        <div className={styles.maGroup}>
          <span className={styles.maLabel}>MA</span>
          {MA_LIST.map(({ n, color, label }) => (
            <button
              key={n}
              className={`${styles.maBtn} ${activeMAs.includes(n) ? styles.maActive : ''}`}
              style={activeMAs.includes(n) ? { color, borderColor: color, background: color + '18' } : {}}
              onClick={() => toggleMA(n)}
            >{label}</button>
          ))}
        </div>
        <div className={styles.maGroup}>
          {OVERLAY_LIST.map(({ key, label, color }) => (
            <button
              key={key}
              className={`${styles.maBtn} ${activeOverlays.includes(key) ? styles.maActive : ''}`}
              style={activeOverlays.includes(key) ? { color, borderColor: color, background: color + '18' } : {}}
              onClick={() => toggleOverlay(key)}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* OHLC */}
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

      <ActionBanner action={lastAction} model={model} />

      {/* 차트 (캔들 + 거래량 통합) */}
      <div className={styles.chartWrap}>
        <div ref={mainRef} />
      </div>

      {/* 체결 내역 */}
      <div className={styles.logSection}>
        <h4 className={styles.logTitle}>체결 내역 <span className={styles.logCount}>{tradeLog.length}건</span></h4>
        {recentTrades.length === 0 ? (
          <p className={styles.logEmpty}>
            {running ? 'AI가 분석 중입니다...' : 'AI를 시작하면 체결 내역이 여기 표시됩니다.'}
          </p>
        ) : (
          <ul className={styles.logList}>
            {recentTrades.map(t => (
              <li key={t.id} className={styles.logItem}>
                <span className={`${styles.logType} ${t.type === 'BUY' ? styles.logBuy : styles.logSell}`}>
                  {t.type === 'BUY' ? '매수' : '매도'}
                </span>
                <span className={styles.logStock}>{t.stock}</span>
                <span className={styles.logDetail}>{t.qty}주 @ ${t.price.toFixed(2)}</span>
                <span className={styles.logReason}>{t.reason}</span>
                <span className={`${styles.logPnl} ${t.pnl >= 0 ? styles.up : styles.down}`}>
                  {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                </span>
                <span className={styles.logTime}>{t.time}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default AIChartPanel
