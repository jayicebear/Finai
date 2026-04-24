import { useState } from 'react'
import { INVESTORS, MODEL_COLORS } from '../../data/investors'
import InvestorCard from './InvestorCard'
import InvestorDetail from './InvestorDetail'
import styles from './Investors.module.css'

const SORT_OPTIONS = [
  { value: 'totalReturn', label: '총 수익률' },
  { value: 'monthReturn', label: '월 수익률' },
  { value: 'winRate',     label: '승률' },
  { value: 'followers',  label: '팔로워' },
  { value: 'totalTrades',label: '거래 수' },
]

export default function Investors() {
  const [selected, setSelected]     = useState(null)
  const [filterStyle, setFilterStyle] = useState('all')
  const [sortBy, setSortBy]         = useState('totalReturn')

  const filtered = INVESTORS
    .filter(inv => filterStyle === 'all' || inv.tradingStyle === filterStyle)
    .sort((a, b) => b[sortBy] - a[sortBy])

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <h1 className={styles.title}>Investors</h1>
        <p className={styles.subtitle}>트레이더들의 전략, 수익률, 포트폴리오를 확인하세요.</p>
      </div>

      {/* 필터 + 정렬 */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          {[
            { value: 'all',    label: '전체' },
            { value: 'manual', label: '직접 거래' },
            { value: 'ai',     label: 'AI 거래' },
          ].map(f => (
            <button
              key={f.value}
              className={`${styles.filterBtn} ${filterStyle === f.value ? styles.filterActive : ''}`}
              onClick={() => setFilterStyle(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className={styles.sortGroup}>
          <span className={styles.sortLabel}>정렬</span>
          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.body}>
        {/* 카드 리스트 */}
        <div className={styles.list}>
          {filtered.map((inv, idx) => (
            <InvestorCard
              key={inv.id}
              investor={inv}
              rank={INVESTORS.slice().sort((a,b) => b.totalReturn - a.totalReturn).findIndex(i => i.id === inv.id) + 1}
              selected={selected?.id === inv.id}
              onClick={() => setSelected(selected?.id === inv.id ? null : inv)}
            />
          ))}
        </div>

        {/* 상세 패널 */}
        {selected && (
          <div className={styles.detail}>
            <InvestorDetail investor={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  )
}
