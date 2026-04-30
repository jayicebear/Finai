import { useState, useMemo, useRef, useCallback } from 'react'
import styles from './Graph.module.css'

const SECTOR_COLORS = {
  Technology:  '#6366f1',
  Finance:     '#f59e0b',
  Healthcare:  '#10b981',
  Energy:      '#ef4444',
  Consumer:    '#3b82f6',
  Industrial:  '#8b5cf6',
}

const SECTOR_ANGLES = {
  Technology:  -60,
  Finance:      0,
  Healthcare:   60,
  Energy:      120,
  Consumer:    180,
  Industrial:  240,
}

const STOCKS = [
  { id: 'AAPL',  name: 'Apple',             sector: 'Technology', mcap: 3000 },
  { id: 'MSFT',  name: 'Microsoft',          sector: 'Technology', mcap: 2800 },
  { id: 'NVDA',  name: 'NVIDIA',             sector: 'Technology', mcap: 2100 },
  { id: 'GOOGL', name: 'Alphabet',           sector: 'Technology', mcap: 1900 },
  { id: 'META',  name: 'Meta',               sector: 'Technology', mcap: 1300 },
  { id: 'TSLA',  name: 'Tesla',              sector: 'Technology', mcap:  650 },
  { id: 'JPM',   name: 'JPMorgan',           sector: 'Finance',    mcap:  550 },
  { id: 'V',     name: 'Visa',               sector: 'Finance',    mcap:  520 },
  { id: 'BAC',   name: 'Bank of America',    sector: 'Finance',    mcap:  310 },
  { id: 'GS',    name: 'Goldman Sachs',      sector: 'Finance',    mcap:  140 },
  { id: 'UNH',   name: 'UnitedHealth',       sector: 'Healthcare', mcap:  440 },
  { id: 'JNJ',   name: 'Johnson & Johnson',  sector: 'Healthcare', mcap:  400 },
  { id: 'ABBV',  name: 'AbbVie',             sector: 'Healthcare', mcap:  310 },
  { id: 'PFE',   name: 'Pfizer',             sector: 'Healthcare', mcap:  160 },
  { id: 'XOM',   name: 'ExxonMobil',         sector: 'Energy',     mcap:  480 },
  { id: 'CVX',   name: 'Chevron',            sector: 'Energy',     mcap:  290 },
  { id: 'AMZN',  name: 'Amazon',             sector: 'Consumer',   mcap: 1900 },
  { id: 'WMT',   name: 'Walmart',            sector: 'Consumer',   mcap:  420 },
  { id: 'NFLX',  name: 'Netflix',            sector: 'Consumer',   mcap:  270 },
  { id: 'NKE',   name: 'Nike',               sector: 'Consumer',   mcap:  150 },
  { id: 'CAT',   name: 'Caterpillar',        sector: 'Industrial', mcap:  165 },
  { id: 'HON',   name: 'Honeywell',          sector: 'Industrial', mcap:  130 },
  { id: 'BA',    name: 'Boeing',             sector: 'Industrial', mcap:  130 },
]

const EDGES = [
  { s: 'AAPL',  t: 'MSFT',  r: 0.82 },
  { s: 'AAPL',  t: 'GOOGL', r: 0.79 },
  { s: 'AAPL',  t: 'NVDA',  r: 0.75 },
  { s: 'MSFT',  t: 'GOOGL', r: 0.85 },
  { s: 'MSFT',  t: 'NVDA',  r: 0.71 },
  { s: 'GOOGL', t: 'META',  r: 0.73 },
  { s: 'NVDA',  t: 'META',  r: 0.68 },
  { s: 'TSLA',  t: 'NVDA',  r: 0.62 },
  { s: 'AMZN',  t: 'MSFT',  r: 0.70 },
  { s: 'AMZN',  t: 'AAPL',  r: 0.64 },
  { s: 'NFLX',  t: 'META',  r: 0.66 },
  { s: 'JPM',   t: 'BAC',   r: 0.88 },
  { s: 'JPM',   t: 'GS',    r: 0.76 },
  { s: 'BAC',   t: 'GS',    r: 0.71 },
  { s: 'V',     t: 'JPM',   r: 0.65 },
  { s: 'V',     t: 'MSFT',  r: 0.63 },
  { s: 'V',     t: 'AAPL',  r: 0.61 },
  { s: 'UNH',   t: 'JNJ',   r: 0.58 },
  { s: 'ABBV',  t: 'JNJ',   r: 0.67 },
  { s: 'ABBV',  t: 'PFE',   r: 0.62 },
  { s: 'XOM',   t: 'CVX',   r: 0.91 },
  { s: 'XOM',   t: 'CAT',   r: 0.59 },
  { s: 'CAT',   t: 'BA',    r: 0.69 },
  { s: 'HON',   t: 'CAT',   r: 0.72 },
  { s: 'HON',   t: 'BA',    r: 0.64 },
  { s: 'TSLA',  t: 'AMZN',  r: 0.58 },
  { s: 'WMT',   t: 'AMZN',  r: 0.55 },
  { s: 'NKE',   t: 'AAPL',  r: 0.57 },
]

const W = 900
const H = 580

function nodeRadius(mcap) {
  return Math.round(8 + Math.log10(mcap) * 4.2)
}

function computePositions(stocks) {
  const cx = W / 2
  const cy = H / 2
  const sectorR = 195

  const groups = {}
  stocks.forEach(s => {
    if (!groups[s.sector]) groups[s.sector] = []
    groups[s.sector].push(s)
  })

  const pos = {}
  stocks.forEach(stock => {
    const deg = SECTOR_ANGLES[stock.sector] ?? 0
    const rad = (deg * Math.PI) / 180
    const scx = cx + sectorR * Math.cos(rad)
    const scy = cy + sectorR * Math.sin(rad)

    const group = groups[stock.sector]
    const n = group.length
    const i = group.indexOf(stock)

    if (n === 1) {
      pos[stock.id] = { x: scx, y: scy }
    } else {
      const subR = n <= 3 ? 44 : n <= 5 ? 58 : 72
      const subAngle = (i / n) * 2 * Math.PI - Math.PI / 2
      pos[stock.id] = {
        x: Math.round(scx + subR * Math.cos(subAngle)),
        y: Math.round(scy + subR * Math.sin(subAngle)),
      }
    }
  })
  return pos
}

function edgeColor(r) {
  if (r >= 0.8) return '#10b981'
  if (r >= 0.65) return '#f59e0b'
  return '#94a3b8'
}

export default function Graph() {
  const [selected, setSelected]       = useState(null)
  const [hovered, setHovered]         = useState(null)
  const [sectorFilter, setSectorFilter] = useState(null)
  const [minCorr, setMinCorr]         = useState(0.55)
  const svgRef = useRef(null)

  const positions = useMemo(() => computePositions(STOCKS), [])

  const visibleStocks = useMemo(() =>
    sectorFilter ? STOCKS.filter(s => s.sector === sectorFilter) : STOCKS
  , [sectorFilter])

  const visibleIds = useMemo(() => new Set(visibleStocks.map(s => s.id)), [visibleStocks])

  const visibleEdges = useMemo(() =>
    EDGES.filter(e => e.r >= minCorr && visibleIds.has(e.s) && visibleIds.has(e.t))
  , [visibleIds, minCorr])

  const selectedEdges = useMemo(() => {
    if (!selected) return new Set()
    return new Set(
      visibleEdges
        .filter(e => e.s === selected || e.t === selected)
        .flatMap(e => [e.s, e.t])
    )
  }, [selected, visibleEdges])

  const hoveredEdges = useMemo(() => {
    if (!hovered || selected) return new Set()
    return new Set(
      visibleEdges
        .filter(e => e.s === hovered || e.t === hovered)
        .flatMap(e => [e.s, e.t])
    )
  }, [hovered, selected, visibleEdges])

  const focusSet = selected ? selectedEdges : hoveredEdges

  const selectedStock = useMemo(() =>
    selected ? STOCKS.find(s => s.id === selected) : null
  , [selected])

  const selectedConnections = useMemo(() => {
    if (!selected) return []
    return visibleEdges
      .filter(e => e.s === selected || e.t === selected)
      .map(e => {
        const peerId = e.s === selected ? e.t : e.s
        return { stock: STOCKS.find(s => s.id === peerId), corr: e.r }
      })
      .sort((a, b) => b.corr - a.corr)
  }, [selected, visibleEdges])

  const handleBackground = useCallback(() => setSelected(null), [])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Stock Network</h1>
          <p className={styles.subtitle}>주식 간 상관관계 네트워크 — 클릭하면 연결 강조</p>
        </div>
        <div className={styles.controls}>
          <div className={styles.controlItem}>
            <span className={styles.controlLabel}>최소 상관계수</span>
            <div className={styles.sliderRow}>
              <input type="range" min="0.5" max="0.9" step="0.05"
                value={minCorr} onChange={e => setMinCorr(+e.target.value)}
                className={styles.slider} />
              <span className={styles.sliderVal}>{minCorr.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {/* 섹터 필터 */}
        <div className={styles.sectorBar}>
          <button
            className={`${styles.sectorBtn} ${!sectorFilter ? styles.sectorBtnAll : ''}`}
            onClick={() => setSectorFilter(null)}
          >전체</button>
          {Object.entries(SECTOR_COLORS).map(([sec, col]) => (
            <button key={sec}
              className={`${styles.sectorBtn} ${sectorFilter === sec ? styles.sectorBtnActive : ''}`}
              style={sectorFilter === sec ? { background: col, borderColor: col } : { '--sec-col': col }}
              onClick={() => setSectorFilter(s => s === sec ? null : sec)}
            >
              <span className={styles.sectorDot} style={{ background: col }} />
              {sec}
            </button>
          ))}
        </div>

        <div className={styles.canvasWrap}>
          {/* Graph SVG */}
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className={styles.svg}
            onClick={handleBackground}
          >
            {/* Sector halos */}
            {Object.entries(SECTOR_ANGLES).map(([sec, deg]) => {
              if (sectorFilter && sectorFilter !== sec) return null
              const rad = (deg * Math.PI) / 180
              const scx = W/2 + 195 * Math.cos(rad)
              const scy = H/2 + 195 * Math.sin(rad)
              return (
                <g key={sec}>
                  <circle cx={scx} cy={scy} r={88}
                    fill={SECTOR_COLORS[sec]}
                    opacity={sectorFilter === sec ? 0.10 : 0.055}
                    stroke={SECTOR_COLORS[sec]}
                    strokeWidth={1}
                    strokeOpacity={sectorFilter === sec ? 0.3 : 0.12}
                  />
                  <text x={scx} y={scy - 96}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={700}
                    fill={SECTOR_COLORS[sec]}
                    opacity={0.75}
                    letterSpacing={0.5}
                  >{sec.toUpperCase()}</text>
                </g>
              )
            })}

            {/* Edges */}
            {visibleEdges.map((e, i) => {
              const p1 = positions[e.s]
              const p2 = positions[e.t]
              if (!p1 || !p2) return null
              const isHighlighted = focusSet.size > 0 && focusSet.has(e.s) && focusSet.has(e.t)
              const isDimmed = focusSet.size > 0 && !isHighlighted
              return (
                <line key={i}
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke={edgeColor(e.r)}
                  strokeWidth={isHighlighted ? 2.2 : 1}
                  strokeOpacity={isDimmed ? 0.04 : isHighlighted ? 0.9 : 0.28}
                />
              )
            })}

            {/* Nodes */}
            {visibleStocks.map(stock => {
              const p = positions[stock.id]
              if (!p) return null
              const r = nodeRadius(stock.mcap)
              const col = SECTOR_COLORS[stock.sector]
              const isSelected = selected === stock.id
              const isHovered  = hovered === stock.id
              const isConnected = focusSet.has(stock.id)
              const isDimmed = focusSet.size > 0 && !isConnected && !isSelected

              return (
                <g key={stock.id}
                  style={{ cursor: 'pointer' }}
                  onClick={ev => { ev.stopPropagation(); setSelected(s => s === stock.id ? null : stock.id) }}
                  onMouseEnter={() => setHovered(stock.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* glow ring */}
                  {(isSelected || isHovered) && (
                    <circle cx={p.x} cy={p.y} r={r + 6}
                      fill={col} opacity={0.18}
                    />
                  )}
                  <circle cx={p.x} cy={p.y} r={r}
                    fill={col}
                    opacity={isDimmed ? 0.18 : isSelected ? 1 : 0.85}
                    stroke={isSelected ? '#fff' : col}
                    strokeWidth={isSelected ? 2.5 : 0}
                  />
                  <text
                    x={p.x} y={p.y + 1}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={r >= 18 ? 10 : 9}
                    fontWeight={700}
                    fill="#fff"
                    opacity={isDimmed ? 0.25 : 1}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >{stock.id}</text>
                </g>
              )
            })}
          </svg>

          {/* Legend */}
          <div className={styles.legend}>
            <div className={styles.legendTitle}>엣지 강도</div>
            <div className={styles.legendRow}>
              <span className={styles.legendLine} style={{ background: '#10b981' }} />
              <span className={styles.legendLbl}>강함 ≥ 0.80</span>
            </div>
            <div className={styles.legendRow}>
              <span className={styles.legendLine} style={{ background: '#f59e0b' }} />
              <span className={styles.legendLbl}>보통 ≥ 0.65</span>
            </div>
            <div className={styles.legendRow}>
              <span className={styles.legendLine} style={{ background: '#94a3b8' }} />
              <span className={styles.legendLbl}>약함</span>
            </div>
          </div>
        </div>

        {/* 상세 패널 */}
        {selectedStock ? (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTicker}
                style={{ color: SECTOR_COLORS[selectedStock.sector] }}>
                {selectedStock.id}
              </span>
              <span className={styles.panelName}>{selectedStock.name}</span>
              <span className={styles.panelSector}
                style={{ background: SECTOR_COLORS[selectedStock.sector] + '22',
                         color: SECTOR_COLORS[selectedStock.sector] }}>
                {selectedStock.sector}
              </span>
            </div>
            <div className={styles.panelMcap}>
              시총 <strong>${selectedStock.mcap.toLocaleString()}B</strong>
            </div>
            <div className={styles.panelConnTitle}>
              연결 종목 ({selectedConnections.length})
            </div>
            <div className={styles.panelConnList}>
              {selectedConnections.length === 0 && (
                <p className={styles.panelEmpty}>현재 필터 조건에서 연결 없음</p>
              )}
              {selectedConnections.map(({ stock, corr }) => (
                <div key={stock.id} className={styles.panelConnItem}
                  onClick={() => setSelected(stock.id)}>
                  <div className={styles.panelConnLeft}>
                    <span className={styles.panelConnDot}
                      style={{ background: SECTOR_COLORS[stock.sector] }} />
                    <div>
                      <span className={styles.panelConnTicker}>{stock.id}</span>
                      <span className={styles.panelConnName}>{stock.name}</span>
                    </div>
                  </div>
                  <div className={styles.panelCorrWrap}>
                    <div className={styles.panelCorrBar}
                      style={{
                        width: `${(corr - 0.5) * 200}%`,
                        background: edgeColor(corr),
                      }} />
                    <span className={styles.panelCorrVal}>{corr.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.panelEmpty2}>
            <div className={styles.panelEmptyIcon}>⬡</div>
            <p>종목을 클릭하면<br />연결 정보를 볼 수 있어요</p>
          </div>
        )}
      </div>
    </div>
  )
}
