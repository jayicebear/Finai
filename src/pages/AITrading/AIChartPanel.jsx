import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  ComposedChart, Bar, Line, Cell,
  XAxis, YAxis, Tooltip, Brush, ResponsiveContainer,
} from 'recharts'
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

function initialBrush(len, period) {
  if (period === 'd') return { start: Math.max(0, len - 60),  end: len - 1 }
  if (period === 'w') return { start: Math.max(0, len - 52),  end: len - 1 }
  if (period === 'm') return { start: Math.max(0, len - 24),  end: len - 1 }
  return { start: 0, end: len - 1 }
}

const YAXIS_W = 64
const CHART_MARGIN = { top: 12, right: 20, left: 10, bottom: 0 }

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
  const isUp = selectedStock.change >= 0
  const recentTrades = tradeLog.slice(0, 6)

  const [period, setPeriod]   = useState('d')
  const [activeMAs, setMAs]   = useState([5, 20])
  const [hovered, setHovered] = useState(null)
  const wrapperRef = useRef(null)

  const baseData = useMemo(() => {
    if (period === 'w') return aggregateWeekly(markedData)
    if (period === 'm') return aggregateMonthly(markedData)
    if (period === 'y') return aggregateYearly(markedData)
    return markedData
  }, [period, markedData])

  const data = useMemo(() => addMAs(baseData), [baseData])

  const [brush, setBrush] = useState(() => initialBrush(data.length, period))

  useEffect(() => {
    setBrush(initialBrush(data.length, period))
  }, [selectedStock.id, period, data.length])

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
  const yMin = useMemo(() => visibleData.length ? Math.min(...visibleData.map(d => d.low  ?? d.price)) * 0.997 : 0, [visibleData])
  const yMax = useMemo(() => visibleData.length ? Math.max(...visibleData.map(d => d.high ?? d.price)) * 1.003 : 1, [visibleData])
  const vMax = useMemo(() => data.length ? Math.max(...data.map(d => d.volume ?? 0)) : 1, [data])

  function toggleMA(n) {
    setMAs(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])
  }

  function CandleBar({ x, width, payload, background }) {
    if (!background || !payload?.open) return null
    const { open, high, low, close, buyAt, sellAt } = payload
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
        {buyAt && period === 'd' && (
          <g>
            <circle cx={cx} cy={scale(buyAt)} r={10} fill="#16a34a" opacity={0.15} />
            <circle cx={cx} cy={scale(buyAt)} r={5}  fill="#16a34a" />
            <text x={cx} y={scale(buyAt) - 14} textAnchor="middle" fontSize={9} fill="#16a34a" fontWeight="700">BUY</text>
          </g>
        )}
        {sellAt && period === 'd' && (
          <g>
            <circle cx={cx} cy={scale(sellAt)} r={10} fill="#dc2626" opacity={0.15} />
            <circle cx={cx} cy={scale(sellAt)} r={5}  fill="#dc2626" />
            <text x={cx} y={scale(sellAt) + 18} textAnchor="middle" fontSize={9} fill="#dc2626" fontWeight="700">SELL</text>
          </g>
        )}
      </g>
    )
  }

  const display = hovered ?? (visibleData[visibleData.length - 1] || {})

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
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
          <span className={`${styles.change} ${isUp ? styles.up : styles.down}`}>
            {isUp ? '+' : ''}{selectedStock.change.toFixed(2)} ({isUp ? '+' : ''}{selectedStock.changePct.toFixed(2)}%)
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

      {/* 체결 배너 */}
      <ActionBanner action={lastAction} model={model} />

      {/* 메인 캔들 차트 */}
      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart
            data={visibleData}
            margin={CHART_MARGIN}
            onMouseMove={e => e?.activePayload && setHovered(e.activePayload[0]?.payload)}
            onMouseLeave={() => setHovered(null)}
          >
            <XAxis dataKey="date" hide />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: '#bbb', fontFamily: 'system-ui' }}
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
                <Line key={n} dataKey={`ma${n}`} stroke={color} strokeWidth={1.5}
                  dot={false} activeDot={false} isAnimationActive={false} connectNulls />
              ) : null
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* 거래량 */}
        <div className={styles.volumeLabel}>거래량</div>
        <ResponsiveContainer width="100%" height={80}>
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
                <Cell key={i} fill={d.close >= d.open ? '#16a34a' : '#dc2626'} fillOpacity={0.55} />
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
