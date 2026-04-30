import { useState, useMemo } from 'react'
import { SCREENER_STOCKS, SECTORS, COUNTRIES, FILTERS } from '../../data/screenerData'
import styles from './Screener.module.css'

const FILTER_DEFS = [
  { key: 'sector',    label: 'Sector',    type: 'select', options: SECTORS },
  { key: 'country',   label: 'Country',   type: 'select', options: COUNTRIES },
  { key: 'marketCap', label: 'Market Cap',type: 'preset', options: FILTERS.marketCap },
  { key: 'pe',        label: 'P/E',       type: 'preset', options: FILTERS.pe },
  { key: 'price',     label: 'Price',     type: 'preset', options: FILTERS.price },
  { key: 'change',    label: 'Change',    type: 'preset', options: FILTERS.change },
  { key: 'rsi',       label: 'RSI',       type: 'preset', options: FILTERS.rsi },
  { key: 'perf1M',    label: 'Perf 1M',   type: 'preset', options: FILTERS.perf1M },
  { key: 'volume',    label: 'Volume',    type: 'preset', options: FILTERS.volume },
]

const COLUMNS = [
  { key: 'id',            label: 'Ticker',    align: 'left'  },
  { key: 'sector',        label: 'Sector',    align: 'left'  },
  { key: 'marketCap',     label: 'Mkt Cap',   align: 'right', fmt: v => `${v}B` },
  { key: 'pe',            label: 'P/E',       align: 'right', fmt: v => v != null ? v.toFixed(1) : '—' },
  { key: 'price',         label: 'Price',     align: 'right', fmt: v => `$${v.toFixed(2)}` },
  { key: 'changePct',     label: 'Chg %',     align: 'right', colored: true, fmt: v => `${v > 0 ? '+' : ''}${v.toFixed(2)}%` },
  { key: 'volume',        label: 'Vol (M)',   align: 'right', fmt: v => v.toFixed(1) },
  { key: 'rsi',           label: 'RSI',       align: 'right', fmt: v => v.toFixed(1), rsiColor: true },
  { key: 'perf1M',        label: '1M %',      align: 'right', colored: true, fmt: v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%` },
  { key: 'perf3M',        label: '3M %',      align: 'right', colored: true, fmt: v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%` },
  { key: 'dividendYield', label: 'Div %',     align: 'right', fmt: v => v > 0 ? `${v.toFixed(1)}%` : '—' },
  { key: 'beta',          label: 'Beta',      align: 'right', fmt: v => v.toFixed(2) },
]

function rsiColor(v) {
  if (v > 70) return '#dc2626'
  if (v < 30) return '#2563eb'
  return '#1a1a2e'
}

export default function Screener() {
  const [active, setActive] = useState({})
  const [sort, setSort]     = useState({ key: 'marketCap', dir: -1 })
  const [search, setSearch] = useState('')

  function setFilter(key, val) {
    setActive(prev => ({ ...prev, [key]: val }))
  }

  function resetFilters() {
    setActive({})
    setSearch('')
  }

  const results = useMemo(() => {
    let list = SCREENER_STOCKS

    if (search.trim()) {
      const q = search.trim().toUpperCase()
      list = list.filter(s => s.id.includes(q) || s.name.toUpperCase().includes(q))
    }

    FILTER_DEFS.forEach(({ key, type, options }) => {
      const val = active[key]
      if (!val || val === 'Any' || val === 0) return
      if (type === 'select') {
        list = list.filter(s => s[key] === val)
      } else {
        const opt = options.find(o => o.label === val)
        if (opt) list = list.filter(opt.fn)
      }
    })

    return [...list].sort((a, b) => {
      const av = a[sort.key] ?? -Infinity
      const bv = b[sort.key] ?? -Infinity
      return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir
    })
  }, [active, sort, search])

  function toggleSort(key) {
    setSort(prev => prev.key === key ? { key, dir: -prev.dir } : { key, dir: -1 })
  }

  const activeCount = Object.values(active).filter(v => v && v !== 'Any' && v !== 0).length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Screener</h1>
          <p className={styles.subtitle}>조건에 맞는 종목을 필터링하세요</p>
        </div>
        <div className={styles.searchWrap}>
          <input
            className={styles.search}
            placeholder="티커 또는 종목명 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 필터 바 */}
      <div className={styles.filterBar}>
        {FILTER_DEFS.map(({ key, label, type, options }) => (
          <div key={key} className={styles.filterItem}>
            <label className={styles.filterLabel}>{label}</label>
            <select
              className={styles.filterSelect}
              value={active[key] || (type === 'select' ? 'Any' : 'Any')}
              onChange={e => setFilter(key, e.target.value)}
            >
              {type === 'select'
                ? options.map(o => <option key={o}>{o}</option>)
                : options.map(o => <option key={o.label}>{o.label}</option>)
              }
            </select>
          </div>
        ))}

        <button className={styles.resetBtn} onClick={resetFilters}>
          초기화 {activeCount > 0 && <span className={styles.resetBadge}>{activeCount}</span>}
        </button>
      </div>

      {/* 결과 요약 */}
      <div className={styles.resultSummary}>
        <span className={styles.resultCount}>{results.length}개 종목</span>
        <span className={styles.resultSub}>/ 전체 {SCREENER_STOCKS.length}개</span>
      </div>

      {/* 테이블 */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th} style={{ textAlign: 'center', width: 36 }}>#</th>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`${styles.th} ${sort.key === col.key ? styles.thSorted : ''}`}
                  style={{ textAlign: col.align }}
                  onClick={() => toggleSort(col.key)}
                >
                  {col.label}
                  {sort.key === col.key && (
                    <span className={styles.sortArrow}>{sort.dir === -1 ? ' ↓' : ' ↑'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((s, idx) => (
              <tr key={s.id} className={styles.tr}>
                <td className={styles.td} style={{ textAlign: 'center', color: '#ccc', fontSize: 11 }}>{idx + 1}</td>
                {COLUMNS.map(col => {
                  const raw = s[col.key]
                  const display = col.fmt ? col.fmt(raw) : raw

                  let color = undefined
                  if (col.colored) color = raw >= 0 ? '#16a34a' : '#dc2626'
                  if (col.rsiColor) color = rsiColor(raw)
                  if (col.key === 'id') return (
                    <td key={col.key} className={styles.td}>
                      <span className={styles.ticker}>{s.id}</span>
                      <span className={styles.company}>{s.name}</span>
                    </td>
                  )
                  return (
                    <td key={col.key} className={styles.td} style={{ textAlign: col.align, color }}>
                      {display}
                    </td>
                  )
                })}
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className={styles.empty}>
                  조건에 맞는 종목이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
