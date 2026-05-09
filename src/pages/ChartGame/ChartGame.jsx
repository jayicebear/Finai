import { useState, useRef, useEffect } from 'react'
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, CrosshairMode } from 'lightweight-charts'
import { stocks } from '../../data/stocks'
import styles from './ChartGame.module.css'

const HISTORY_CANDLES = 150

const TURN_OPTIONS = [
  { label: '30턴', value: 30 },
  { label: '50턴', value: 50 },
  { label: '100턴', value: 100 },
  { label: '200턴', value: 200 },
]

const INITIAL_BALANCES = [
  { label: '100만원', value: 1_000_000 },
  { label: '500만원', value: 5_000_000 },
  { label: '1000만원', value: 10_000_000 },
  { label: '5000만원', value: 50_000_000 },
]

const MA_LIST = [
  { n: 5,   color: '#ef4444' },
  { n: 20,  color: '#f97316' },
  { n: 60,  color: '#3b82f6' },
  { n: 120, color: '#a855f7' },
]

const PCT_STEPS = [
  { label: '25%', pct: 0.25 },
  { label: '50%', pct: 0.50 },
  { label: '75%', pct: 0.75 },
  { label: 'MAX', pct: 1.00 },
]

function addMAs(data) {
  return data.map((d, i, arr) => {
    const row = { ...d }
    for (const { n } of MA_LIST) {
      if (i >= n - 1) {
        let sum = 0
        for (let j = i - n + 1; j <= i; j++) sum += arr[j].close
        row[`ma${n}`] = parseFloat((sum / n).toFixed(2))
      }
    }
    return row
  })
}

function generateGameData(stock, totalTurns) {
  const totalCandles = HISTORY_CANDLES + totalTurns
  let price = stock.price * (0.5 + Math.random() * 0.5)

  const dates = []
  const d = new Date()
  d.setDate(d.getDate() - Math.ceil(totalCandles * 1.5))
  while (dates.length < totalCandles) {
    if (d.getDay() !== 0 && d.getDay() !== 6) dates.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }

  const phases = stock.phases ?? [{ w: 1, drift: 0.47, vol: 1.0 }]
  let cumulative = 0
  const boundaries = phases.map(p => { cumulative += p.w; return cumulative })

  const data = []
  for (let i = 0; i < totalCandles; i++) {
    const progress = i / totalCandles
    const phaseIdx = boundaries.findIndex(b => progress <= b)
    const phase = phases[phaseIdx >= 0 ? phaseIdx : phases.length - 1]

    const open = parseFloat(price.toFixed(2))
    const move = (Math.random() - phase.drift) * (stock.price * 0.016 * phase.vol)
    price = Math.max(stock.price * 0.1, price + move)
    const close = parseFloat(price.toFixed(2))
    const volRange = stock.price * 0.007 * phase.vol
    const high = parseFloat((Math.max(open, close) + Math.random() * volRange).toFixed(2))
    const low  = parseFloat((Math.min(open, close) - Math.random() * volRange).toFixed(2))
    const volume = Math.floor(500_000 + Math.random() * 2_000_000)

    const date = dates[i]
    const time = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    data.push({ time, open, high, low, close, volume })
  }

  return addMAs(data)
}

const OVERLAY_LIST = [
  { key: 'bb',       label: 'BB',   color: '#8b5cf6' },
  { key: 'vwap',     label: 'VWAP', color: '#06b6d4' },
  { key: 'ichimoku', label: 'Cloud',color: '#10b981' },
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

class IchimokuCloudPrimitive {
  constructor() { this._spanA = []; this._spanB = []; this._visible = false; this._chart = null; this._series = null }
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
    if (i >= 8)  tenkan.push({ time: d.time, value: +((hi(i-8,i) + lo(i-8,i)) / 2).toFixed(2) })
    if (i >= 25) kijun.push({ time: d.time, value: +((hi(i-25,i) + lo(i-25,i)) / 2).toFixed(2) })
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

const CHART_OPTS = {
  layout: { background: { color: '#ffffff' }, textColor: '#aaaaaa', attributionLogo: false },
  grid: { vertLines: { color: '#f5f2ed' }, horzLines: { color: '#f5f2ed' } },
  crosshair: { mode: CrosshairMode.Normal },
  rightPriceScale: { borderColor: '#ece8e2' },
  timeScale: { borderColor: '#ece8e2', timeVisible: false },
  handleScroll: true,
  handleScale: true,
}

export default function ChartGame() {
  const [phase, setPhase] = useState('setup')
  const [totalTurns, setTotalTurns] = useState(50)
  const [initialBalance, setInitialBalance] = useState(10_000_000)
  const [balance, setBalance] = useState(0)
  const [shares, setShares] = useState(0)
  const [avgPrice, setAvgPrice] = useState(0)
  const [turn, setTurn] = useState(1)
  const [allData, setAllData] = useState([])
  const [selectedStock, setSelectedStock] = useState(null)
  const [trades, setTrades] = useState([])
  const [orderMode, setOrderMode] = useState('buy')
  const [qty, setQty] = useState(1)
  const [activeMAs, setActiveMAs] = useState([5, 20])
  const [activeOverlays, setActiveOverlays] = useState([])

  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const candleSeriesRef = useRef(null)
  const volSeriesRef = useRef(null)
  const maSeriesRefs = useRef({})
  const overlayRefs = useRef({})

  const visibleCount = HISTORY_CANDLES + turn
  const currentCandle = allData[visibleCount - 1] ?? null
  const currentPrice = currentCandle?.close ?? 0
  const stockValue = shares * currentPrice
  const totalAsset = balance + stockValue
  const returnPct = initialBalance > 0 ? ((totalAsset - initialBalance) / initialBalance) * 100 : 0
  const holdingPct = shares > 0 && avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : null

  const isBuy = orderMode === 'buy'
  const maxBuy = currentPrice > 0 ? Math.floor(balance / currentPrice) : 0
  const maxSell = shares
  const maxQty = isBuy ? maxBuy : maxSell
  const safeQty = Math.min(qty, Math.max(1, maxQty))
  const orderTotal = currentPrice * safeQty

  function applyQty(q) { setQty(Math.max(1, Math.min(q, maxQty || 1))) }
  function applyPct(pct) { applyQty(Math.max(1, Math.floor(maxQty * pct))) }

  // phase가 'playing'으로 바뀔 때 차트 생성 — div가 실제로 보이는 상태에서 init
  useEffect(() => {
    if (phase !== 'playing' || !chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      ...CHART_OPTS,
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 420,
    })
    chartRef.current = chart

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#dc2626', downColor: '#3b82f6',
      borderUpColor: '#dc2626', borderDownColor: '#3b82f6',
      wickUpColor: '#dc2626', wickDownColor: '#3b82f6',
    })
    candleSeriesRef.current = candle
    chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.05, bottom: 0.25 } })

    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    })
    volSeriesRef.current = vol
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })

    // 오버레이 시리즈 미리 생성
    const ichiCommon = { priceScaleId: 'right', priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, visible: false }
    overlayRefs.current.ichi_spanA  = chart.addSeries(LineSeries, { color: '#10b981', lineWidth: 1, ...ichiCommon })
    overlayRefs.current.ichi_spanB  = chart.addSeries(LineSeries, { color: '#10b981', lineWidth: 1, lineStyle: 2, ...ichiCommon })
    overlayRefs.current.ichi_tenkan = chart.addSeries(LineSeries, { color: '#f43f5e', lineWidth: 1, ...ichiCommon })
    overlayRefs.current.ichi_kijun  = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1.5, ...ichiCommon })
    const cloudPrimitive = new IchimokuCloudPrimitive()
    overlayRefs.current.ichi_spanA.attachPrimitive(cloudPrimitive)
    overlayRefs.current.ichi_primitive = cloudPrimitive

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    ro.observe(chartContainerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      maSeriesRefs.current = {}
      overlayRefs.current = {}
      candleSeriesRef.current = null
      volSeriesRef.current = null
    }
  }, [phase])

  useEffect(() => {
    if (!candleSeriesRef.current || !allData.length) return

    const visible = allData.slice(0, visibleCount)

    candleSeriesRef.current.setData(
      visible.map(d => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close }))
    )

    MA_LIST.forEach(({ n, color }) => {
      if (!maSeriesRefs.current[n] && chartRef.current) {
        maSeriesRefs.current[n] = chartRef.current.addSeries(LineSeries, {
          color, lineWidth: 1.5,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        })
      }
      maSeriesRefs.current[n]?.setData(
        visible.filter(d => d[`ma${n}`] != null).map(d => ({ time: d.time, value: d[`ma${n}`] }))
      )
      maSeriesRefs.current[n]?.applyOptions({ visible: activeMAs.includes(n) })
    })

    volSeriesRef.current?.setData(
      visible.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(220,38,38,0.5)' : 'rgba(59,130,246,0.5)',
      }))
    )

    // BB
    const withBB = calcBollinger(visible)
    ;['bbUpper', 'bbMid', 'bbLower'].forEach((key, i) => {
      if (!overlayRefs.current[key] && chartRef.current) {
        overlayRefs.current[key] = chartRef.current.addSeries(LineSeries, {
          color: '#8b5cf6', lineWidth: 1, lineStyle: i === 1 ? 2 : 0,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        })
      }
      overlayRefs.current[key]?.setData(withBB.filter(d => d[key] != null).map(d => ({ time: d.time, value: d[key] })))
      overlayRefs.current[key]?.applyOptions({ visible: activeOverlays.includes('bb') })
    })

    // VWAP
    const withVWAP = calcVWAP(visible)
    if (!overlayRefs.current.vwap && chartRef.current) {
      overlayRefs.current.vwap = chartRef.current.addSeries(LineSeries, {
        color: '#06b6d4', lineWidth: 1.5,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      })
    }
    overlayRefs.current.vwap?.setData(withVWAP.map(d => ({ time: d.time, value: d.vwap })))
    overlayRefs.current.vwap?.applyOptions({ visible: activeOverlays.includes('vwap') })

    // Ichimoku
    const ichi = calcIchimoku(visible)
    const ichiOn = activeOverlays.includes('ichimoku')
    overlayRefs.current.ichi_spanA?.setData(ichi.spanA)
    overlayRefs.current.ichi_spanB?.setData(ichi.spanB)
    overlayRefs.current.ichi_tenkan?.setData(ichi.tenkan)
    overlayRefs.current.ichi_kijun?.setData(ichi.kijun)
    overlayRefs.current.ichi_primitive?.setData(ichi.spanA, ichi.spanB)
    overlayRefs.current.ichi_primitive?.setVisible(ichiOn)
    ;['ichi_spanA', 'ichi_spanB', 'ichi_tenkan', 'ichi_kijun'].forEach(k =>
      overlayRefs.current[k]?.applyOptions({ visible: ichiOn })
    )

    requestAnimationFrame(() => {
      chartRef.current?.timeScale().fitContent()
    })
  }, [allData, visibleCount])

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
    ;['ichi_tenkan', 'ichi_kijun', 'ichi_spanA', 'ichi_spanB'].forEach(k =>
      overlayRefs.current[k]?.applyOptions({ visible: ichiOn })
    )
    overlayRefs.current.ichi_primitive?.setVisible(ichiOn)
    overlayRefs.current.ichi_spanA?.applyOptions({})
  }, [activeOverlays])

  // 키보드 단축키
  useEffect(() => {
    if (phase !== 'playing') return
    function onKey(e) {
      if (e.target.tagName === 'INPUT') return
      if (e.key === 'd' || e.key === 'D') nextTurn()
      if (e.key === 'a' || e.key === 'A') { setOrderMode('buy'); handleOrder('buy') }
      if (e.key === 's' || e.key === 'S') { setOrderMode('sell'); handleOrder('sell') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, turn, qty, balance, shares, currentPrice, orderMode])

  function startGame() {
    const stock = stocks[Math.floor(Math.random() * stocks.length)]
    const data = generateGameData(stock, totalTurns)
    setSelectedStock(stock)
    setAllData(data)
    setBalance(initialBalance)
    setShares(0)
    setAvgPrice(0)
    setTurn(1)
    setTrades([])
    setQty(1)
    setOrderMode('buy')
    setPhase('playing')
  }

  function nextTurn() {
    if (turn >= totalTurns) { setPhase('result'); return }
    setTurn(t => t + 1)
    setQty(1)
  }

  function handleOrder(forcedMode) {
    const mode = forcedMode ?? orderMode
    if (mode === 'buy') {
      if (safeQty <= 0 || balance < currentPrice) return
      const cost = safeQty * currentPrice
      setAvgPrice(prev => (prev * shares + cost) / (shares + safeQty))
      setShares(s => s + safeQty)
      setBalance(b => b - cost)
      setTrades(t => [...t, { turn, type: 'buy', qty: safeQty, price: currentPrice }])
    } else {
      if (safeQty <= 0 || shares <= 0) return
      setBalance(b => b + safeQty * currentPrice)
      setShares(s => {
        const next = s - safeQty
        if (next === 0) setAvgPrice(0)
        return next
      })
      setTrades(t => [...t, { turn, type: 'sell', qty: safeQty, price: currentPrice }])
    }
    setQty(1)
  }

  function toggleMA(n) {
    setActiveMAs(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])
  }

  function toggleOverlay(key) {
    setActiveOverlays(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])
  }

  function resetGame() {
    setPhase('setup')
    setAllData([])
    setTurn(1)
    setTrades([])
  }

  const isLastTurn = turn >= totalTurns
  const canOrder = isBuy ? safeQty >= 1 && balance >= currentPrice : safeQty >= 1 && shares >= 1

  return (
    <>
      {/* ── Setup ── */}
      {phase === 'setup' && (
        <div className={styles.setupPage}>
          <h1 className={styles.setupTitle}>차트 게임</h1>
          <p className={styles.setupDesc}>50턴 동안 차트를 보며 매매해보세요.<br />종목은 게임 종료 후 공개됩니다.</p>
          <div className={styles.setupSection}>
            <label className={styles.setupLabel}>턴 수 선택</label>
            <div className={styles.balanceGrid}>
              {TURN_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  className={`${styles.balanceBtn} ${totalTurns === value ? styles.balanceBtnActive : ''}`}
                  onClick={() => setTotalTurns(value)}
                >{label}</button>
              ))}
            </div>
          </div>
          <div className={styles.setupSection}>
            <label className={styles.setupLabel}>초기 자산 선택</label>
            <div className={styles.balanceGrid}>
              {INITIAL_BALANCES.map(({ label, value }) => (
                <button
                  key={value}
                  className={`${styles.balanceBtn} ${initialBalance === value ? styles.balanceBtnActive : ''}`}
                  onClick={() => setInitialBalance(value)}
                >{label}</button>
              ))}
            </div>
          </div>
          <button className={styles.startBtn} onClick={startGame}>게임 시작</button>
        </div>
      )}

      {/* ── Result ── */}
      {phase === 'result' && (
        <div className={styles.resultPage}>
          <h1 className={styles.resultTitle}>게임 종료</h1>
          <div className={styles.resultCard}>
            <div className={styles.resultStock}>공개 종목: {selectedStock?.name} ({selectedStock?.id})</div>
            <div className={`${styles.resultReturn} ${totalAsset >= initialBalance ? styles.up : styles.down}`}>
              {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
            </div>
            <div className={styles.resultRow}>
              <span>초기 자산</span><span>{initialBalance.toLocaleString()}원</span>
            </div>
            <div className={styles.resultRow}>
              <span>최종 자산</span>
              <span className={totalAsset >= initialBalance ? styles.up : styles.down}>
                {Math.round(totalAsset).toLocaleString()}원
              </span>
            </div>
            <div className={styles.resultRow}>
              <span>손익</span>
              <span className={totalAsset >= initialBalance ? styles.up : styles.down}>
                {totalAsset >= initialBalance ? '+' : ''}{Math.round(totalAsset - initialBalance).toLocaleString()}원
              </span>
            </div>
            <div className={styles.resultRow}>
              <span>매매 횟수</span><span>{trades.length}회</span>
            </div>
          </div>
          {trades.length > 0 && (
            <div className={styles.resultTrades}>
              <h3>매매 내역</h3>
              <table className={styles.tradeTable}>
                <thead><tr><th>턴</th><th>구분</th><th>수량</th><th>가격</th></tr></thead>
                <tbody>
                  {trades.map((t, i) => (
                    <tr key={i}>
                      <td>{t.turn}턴</td>
                      <td className={t.type === 'buy' ? styles.up : styles.down}>{t.type === 'buy' ? '매수' : '매도'}</td>
                      <td>{t.qty.toLocaleString()}</td>
                      <td>{t.price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button className={styles.retryBtn} onClick={resetGame}>다시 하기</button>
        </div>
      )}

      {/* ── Playing ── */}
      {phase === 'playing' && <div className={styles.page}>

        {/* 차트 영역 */}
        <div className={styles.chartArea}>
          <div className={styles.maControls}>
            <span className={styles.maLabel}>MA</span>
            {MA_LIST.map(({ n, color }) => (
              <button
                key={n}
                className={`${styles.maBtn} ${activeMAs.includes(n) ? styles.maActive : ''}`}
                style={activeMAs.includes(n) ? { color, borderColor: color, background: color + '18' } : {}}
                onClick={() => toggleMA(n)}
              >{n}</button>
            ))}
            <div className={styles.maDivider} />
            {OVERLAY_LIST.map(({ key, label, color }) => (
              <button
                key={key}
                className={`${styles.maBtn} ${activeOverlays.includes(key) ? styles.maActive : ''}`}
                style={activeOverlays.includes(key) ? { color, borderColor: color, background: color + '18' } : {}}
                onClick={() => toggleOverlay(key)}
              >{label}</button>
            ))}
          </div>
          <div className={styles.progressWrap}>
            <div className={styles.progressFill} style={{ width: `${(turn / totalTurns) * 100}%` }} />
            <span className={styles.progressLabel}>{turn} / {totalTurns}턴</span>
          </div>
          <div ref={chartContainerRef} className={styles.chart} />
        </div>

        {/* 사이드바 */}
        <div className={styles.sidebar}>

          {/* 턴 + 다음 버튼 */}
          <div className={styles.turnRow}>
            <div className={styles.turnBadge}>
              <span className={styles.turnNum}>{String(turn).padStart(2, '0')}</span>
              <span className={styles.turnSub}>/{totalTurns}턴 · 일</span>
            </div>
            <button className={styles.nextBtn} onClick={nextTurn}>
              {isLastTurn ? '결과보기' : '▶ 다음 (D)'}
            </button>
          </div>

          {/* 주문 패널 */}
          <div className={styles.orderPanel}>
            {/* 탭 */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${isBuy ? styles.tabBuyActive : ''}`}
                onClick={() => { setOrderMode('buy'); setQty(1) }}
              >매수</button>
              <button
                className={`${styles.tab} ${!isBuy ? styles.tabSellActive : ''}`}
                onClick={() => { setOrderMode('sell'); setQty(1) }}
              >매도</button>
            </div>

            {/* 현재가 + 가용 정보 */}
            <div className={styles.infoBox}>
              <div className={styles.infoRow}>
                <span className={styles.infoLbl}>현재가</span>
                <span className={styles.infoVal}>${currentPrice.toFixed(2)}</span>
              </div>
              {isBuy ? (
                <>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLbl}>가용 현금</span>
                    <span className={styles.infoVal}>{Math.round(balance).toLocaleString()}원</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLbl}>최대 구매</span>
                    <span className={styles.infoVal}>{maxBuy.toLocaleString()}주</span>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLbl}>보유 수량</span>
                    <span className={styles.infoVal}>{shares.toLocaleString()}주</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLbl}>평균단가</span>
                    <span className={styles.infoVal}>{avgPrice ? `$${avgPrice.toFixed(2)}` : '–'}</span>
                  </div>
                  {holdingPct !== null && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLbl}>평가수익률</span>
                      <span className={`${styles.infoVal} ${holdingPct >= 0 ? styles.up : styles.down}`}>
                        {holdingPct >= 0 ? '+' : ''}{holdingPct.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* % 빠른 선택 */}
            <div className={styles.pctRow}>
              {PCT_STEPS.map(({ label, pct }) => (
                <button
                  key={label}
                  className={`${styles.pctBtn} ${isBuy ? styles.pctBtnBuy : styles.pctBtnSell}`}
                  onClick={() => applyPct(pct)}
                  disabled={maxQty < 1}
                >{label}</button>
              ))}
            </div>

            {/* 수량 */}
            <div className={styles.qtyRow}>
              <button className={styles.qtyBtn} onClick={() => applyQty(safeQty - 1)}>−</button>
              <input
                type="number"
                className={styles.qtyInput}
                value={safeQty}
                min={1}
                max={maxQty}
                onChange={e => applyQty(parseInt(e.target.value) || 1)}
              />
              <button className={styles.qtyBtn} onClick={() => applyQty(safeQty + 1)}>+</button>
            </div>

            {/* 주문금액 */}
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>주문금액</span>
              <span className={styles.totalValue}>${orderTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {/* 주문 버튼 */}
            <button
              className={`${styles.orderBtn} ${isBuy ? styles.orderBtnBuy : styles.orderBtnSell}`}
              onClick={() => handleOrder()}
              disabled={!canOrder}
            >
              {isBuy ? '매수하기 (A)' : '매도하기 (S)'}
            </button>
          </div>

          {/* 게임 현황 */}
          <div className={styles.statusBox}>
            <div className={styles.statusHeader}>
              <span>게임현황</span>
              <span className={styles.initLabel}>초기 {initialBalance.toLocaleString()}원</span>
            </div>

            <div className={styles.assetRow}>
              <span className={styles.assetLabel}>총 평가자산</span>
              <div className={styles.assetRight}>
                <span className={styles.assetValue}>{Math.round(totalAsset).toLocaleString()}원</span>
                <span className={`${styles.assetPct} ${returnPct >= 0 ? styles.up : styles.down}`}>
                  {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className={styles.statusDivider} />

            <div className={styles.statusGrid}>
              <div className={styles.statusCell}>
                <span className={styles.statusLabel}>보유현금</span>
                <span className={styles.statusValue}>{Math.round(balance).toLocaleString()}</span>
              </div>
              <div className={styles.statusCell}>
                <span className={styles.statusLabel}>주식평가금</span>
                <span className={styles.statusValue}>{Math.round(stockValue).toLocaleString()}</span>
              </div>
              <div className={styles.statusCell}>
                <span className={styles.statusLabel}>보유주식</span>
                <span className={styles.statusValue}>{shares.toLocaleString()}주</span>
              </div>
              <div className={styles.statusCell}>
                <span className={styles.statusLabel}>평균단가</span>
                <span className={styles.statusValue}>{avgPrice ? `$${avgPrice.toFixed(2)}` : '–'}</span>
              </div>
            </div>
          </div>

          {/* 매매내역 */}
          <div className={styles.tradeHistory}>
            <div className={styles.tradeHistoryHeader}>
              매매내역
              <span className={styles.tradeCnt}>{trades.length}건</span>
            </div>
            {trades.length === 0 ? (
              <p className={styles.noTrades}>매매내역이 없습니다.</p>
            ) : (
              <div className={styles.tradeList}>
                {[...trades].reverse().map((t, i) => (
                  <div key={i} className={styles.tradeItem}>
                    <span className={t.type === 'buy' ? styles.buyTag : styles.sellTag}>
                      {t.type === 'buy' ? '매수' : '매도'}
                    </span>
                    <span className={styles.tradeQty}>{t.qty.toLocaleString()}주</span>
                    <span className={styles.tradePrice}>${t.price.toFixed(2)}</span>
                    <span className={styles.tradeTurn}>{t.turn}턴</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>}
    </>
  )
}
