import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import {
  ComposedChart, Bar, Line, Cell,
  XAxis, YAxis, Tooltip, Brush, ResponsiveContainer,
} from 'recharts'
import { aggregateWeekly, aggregateMonthly, aggregateYearly } from '../../data/stocks'
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

function addMAs(data) {
  return data.map((d, i, arr) => {
    const row = { ...d }
    for (const { n, label } of MA_LIST) {
      if (i >= n - 1) {
        const avg = arr.slice(i - n + 1, i + 1).reduce((s, x) => s + x.close, 0) / n
        row[`ma${n}`] = parseFloat(avg.toFixed(2))
      }
    }
    return row
  })
}

function initialBrush(len, period) {
  if (period === 'd') return { start: Math.max(0, len - 60),  end: len - 1 }  // 최근 60일
  if (period === 'w') return { start: Math.max(0, len - 52),  end: len - 1 }  // 최근 52주 (1년)
  if (period === 'm') return { start: Math.max(0, len - 24),  end: len - 1 }  // 최근 24개월 (2년)
  return { start: 0, end: len - 1 }                                            // 년: 전체
}

const YAXIS_W = 64
const CHART_MARGIN = { top: 12, right: 20, left: 0, bottom: 0 }

export default function StockChart({ stock, data: rawData }) {
  const isUp = stock.change >= 0
  const [period, setPeriod]   = useState('d')
  const [activeMAs, setMAs]   = useState([5, 20])
  const [hovered, setHovered] = useState(null)
  const wrapperRef = useRef(null)

  const baseData = useMemo(() => {
    if (period === 'w') return aggregateWeekly(rawData)
    if (period === 'm') return aggregateMonthly(rawData)
    if (period === 'y') return aggregateYearly(rawData)
    return rawData
  }, [period, rawData])

  const data = useMemo(() => addMAs(baseData), [baseData])

  const [brush, setBrush] = useState(() => initialBrush(data.length, period))

  useEffect(() => {
    setBrush(initialBrush(data.length, period))
  }, [stock.id, period, data.length])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    setBrush(({ start, end }) => {
      const visible    = end - start + 1
      const factor     = e.deltaY > 0 ? 1.15 : 0.87
      const newVisible = Math.round(Math.max(5, Math.min(data.length, visible * factor)))
      const center     = Math.round((start + end) / 2)
      const newStart   = Math.max(0, center - Math.round(newVisible / 2))
      const newEnd     = Math.min(data.length - 1, newStart + newVisible - 1)
      return { start: newStart, end: newEnd }
    })
  }, [data.length])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const visibleData = useMemo(
    () => data.slice(brush.start, brush.end + 1),
    [data, brush.start, brush.end]
  )
  const yMin = useMemo(() => visibleData.length ? Math.min(...visibleData.map(d => d.low))  * 0.997 : 0, [visibleData])
  const yMax = useMemo(() => visibleData.length ? Math.max(...visibleData.map(d => d.high)) * 1.003 : 1, [visibleData])
  const vMax = useMemo(() => data.length ? Math.max(...data.map(d => d.volume)) : 1, [data])

  function toggleMA(n) {
    setMAs(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])
  }

  function CandleBar({ x, width, payload, background }) {
    if (!background || !payload?.open) return null
    const { open, high, low, close } = payload
    const bull  = close >= open
    const color = bull ? '#16a34a' : '#dc2626'
    const cx    = x + width / 2
    const bw    = Math.max(2, width - 3)
    const scale = p => background.y + background.height - ((p - yMin) / (yMax - yMin)) * background.height
    const bodyTop = scale(Math.max(open, close))
    const bodyH   = Math.max(1, scale(Math.min(open, close)) - bodyTop)
    return (
      <g>
        <line x1={cx} y1={scale(high)} x2={cx} y2={scale(low)} stroke={color} strokeWidth={1.5} />
        <rect x={cx - bw / 2} y={bodyTop} width={bw} height={bodyH} fill={color} rx={1} />
      </g>
    )
  }

  const display = hovered ?? (visibleData[visibleData.length - 1] || {})

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.left}>
          <span className={styles.tickerLabel}>{stock.id}</span>
          <span className={styles.nameLabel}>{stock.name}</span>
          <span className={`${styles.priceTag} ${isUp ? styles.up : styles.down}`}>
            ${stock.price.toFixed(2)}
            <span className={styles.changePct}> {isUp ? '+' : ''}{stock.changePct.toFixed(2)}%</span>
          </span>
        </div>
        <div className={styles.controls}>
          <div className={styles.periodGroup}>
            {PERIODS.map(p => (
              <button
                key={p.key}
                className={`${styles.periodBtn} ${period === p.key ? styles.periodActive : ''}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
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
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* OHLC 정보 바 */}
      <div className={styles.ohlcBar}>
        <span className={styles.ohlcItem}>시작 <strong>{display.open ?? '-'}</strong></span>
        <span className={styles.ohlcItem}>고가 <strong style={{ color: '#16a34a' }}>{display.high ?? '-'}</strong></span>
        <span className={styles.ohlcItem}>저가 <strong style={{ color: '#dc2626' }}>{display.low ?? '-'}</strong></span>
        <span className={styles.ohlcItem}>종가 <strong>{display.close ?? '-'}</strong></span>
        {activeMAs.map(n => {
          const ma = display[`ma${n}`]
          const cfg = MA_LIST.find(m => m.n === n)
          return ma ? (
            <span key={n} className={styles.ohlcItem}>
              MA{n} <strong style={{ color: cfg.color }}>{ma}</strong>
            </span>
          ) : null
        })}
      </div>

      {/* 메인 캔들 차트 — visibleData만 렌더링 */}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart
          data={visibleData}
          margin={CHART_MARGIN}
          onMouseMove={e => e?.activePayload && setHovered(e.activePayload[0]?.payload)}
          onMouseLeave={() => setHovered(null)}
        >
          <XAxis dataKey="date" hide />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 11, fill: '#aaa', fontFamily: 'system-ui' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `$${v.toFixed(0)}`}
            width={YAXIS_W}
            orientation="right"
          />
          <Tooltip content={() => null} />
          <Bar dataKey="close" shape={<CandleBar />} isAnimationActive={false} />
          {MA_LIST.map(({ n, color }) =>
            activeMAs.includes(n) ? (
              <Line
                key={n}
                dataKey={`ma${n}`}
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                connectNulls
              />
            ) : null
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* 거래량 차트 */}
      <div className={styles.volumeLabel}>거래량</div>
      <ResponsiveContainer width="100%" height={90}>
        <ComposedChart data={data} margin={CHART_MARGIN}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#bbb', fontFamily: 'system-ui' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, vMax]}
            tick={{ fontSize: 10, fill: '#bbb', fontFamily: 'system-ui' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1e3).toFixed(0)}K`}
            width={YAXIS_W}
            orientation="right"
          />
          <Bar dataKey="volume" isAnimationActive={false} maxBarSize={12}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.close >= d.open ? '#16a34a' : '#dc2626'}
                fillOpacity={0.55}
              />
            ))}
          </Bar>
          <Brush
            dataKey="date"
            startIndex={brush.start}
            endIndex={brush.end}
            onChange={({ startIndex, endIndex }) =>
              setBrush({ start: startIndex, end: endIndex })
            }
            height={28}
            travellerWidth={6}
            stroke="#ddd"
            fill="#f5f2ed"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
