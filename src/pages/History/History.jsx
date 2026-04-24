import { useState } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import styles from './History.module.css'

const SOURCE_LABELS = {
  manual: { label: '직접 거래', color: '#2563eb', bg: '#eff6ff' },
  ai:     { label: 'AI',        color: '#7c3aed', bg: '#f5f3ff' },
}

const MODEL_COLORS = {
  'GPT-4o':  '#10a37f',
  'Claude':  '#c9601a',
  'Grok':    '#1d1d1d',
  'Gemini':  '#4285f4',
}

function formatTime(date) {
  const d = new Date(date)
  return d.toLocaleString('ko-KR', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function History() {
  const { tradeHistory } = usePortfolio()
  const [filterSource, setFilterSource] = useState('all')
  const [filterType,   setFilterType]   = useState('all')
  const [filterStock,  setFilterStock]  = useState('all')

  const stockIds = [...new Set(tradeHistory.map(t => t.stockId))]

  const filtered = tradeHistory.filter(t => {
    if (filterSource !== 'all' && t.source !== filterSource) return false
    if (filterType   !== 'all' && t.type   !== filterType)   return false
    if (filterStock  !== 'all' && t.stockId !== filterStock)  return false
    return true
  })

  const totalBuy  = filtered.filter(t => t.type === 'BUY').reduce((s, t) => s + t.total, 0)
  const totalSell = filtered.filter(t => t.type === 'SELL').reduce((s, t) => s + t.total, 0)
  const manualCount = filtered.filter(t => t.source === 'manual').length
  const aiCount     = filtered.filter(t => t.source === 'ai').length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>History</h1>
        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>전체 거래</span>
            <span className={styles.cardValue}>{filtered.length}건</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>직접 거래</span>
            <span className={styles.cardValue} style={{ color: '#2563eb' }}>{manualCount}건</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>AI 거래</span>
            <span className={styles.cardValue} style={{ color: '#7c3aed' }}>{aiCount}건</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>총 매수금액</span>
            <span className={styles.cardValue}>${totalBuy.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>총 매도금액</span>
            <span className={styles.cardValue}>${totalSell.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>거래 주체</span>
          {['all', 'manual', 'ai'].map(v => (
            <button
              key={v}
              className={`${styles.filterBtn} ${filterSource === v ? styles.filterActive : ''}`}
              onClick={() => setFilterSource(v)}
            >
              {v === 'all' ? '전체' : v === 'manual' ? '직접' : 'AI'}
            </button>
          ))}
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>종류</span>
          {['all', 'BUY', 'SELL'].map(v => (
            <button
              key={v}
              className={`${styles.filterBtn} ${filterType === v ? styles.filterActive : ''}`}
              onClick={() => setFilterType(v)}
            >
              {v === 'all' ? '전체' : v === 'BUY' ? '매수' : '매도'}
            </button>
          ))}
        </div>
        {stockIds.length > 0 && (
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>종목</span>
            <button
              className={`${styles.filterBtn} ${filterStock === 'all' ? styles.filterActive : ''}`}
              onClick={() => setFilterStock('all')}
            >전체</button>
            {stockIds.map(id => (
              <button
                key={id}
                className={`${styles.filterBtn} ${filterStock === id ? styles.filterActive : ''}`}
                onClick={() => setFilterStock(id)}
              >{id}</button>
            ))}
          </div>
        )}
      </div>

      {/* 테이블 */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {tradeHistory.length === 0
            ? 'Trading 또는 AI Trading 페이지에서 거래하면 여기에 기록됩니다.'
            : '해당 조건의 거래 내역이 없습니다.'}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>시간</th>
                <th>거래 주체</th>
                <th>종목</th>
                <th>구분</th>
                <th>수량</th>
                <th>체결가</th>
                <th>거래금액</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const src = SOURCE_LABELS[t.source]
                const modelColor = t.modelName ? MODEL_COLORS[t.modelName] : null
                return (
                  <tr key={t.id}>
                    <td className={styles.timeCell}>{formatTime(t.time)}</td>
                    <td>
                      <div className={styles.sourceCell}>
                        <span className={styles.sourceBadge} style={{ color: src.color, background: src.bg }}>
                          {src.label}
                        </span>
                        {t.modelName && (
                          <span className={styles.modelBadge} style={{ color: modelColor || '#888' }}>
                            {t.modelName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.stockCell}>
                        <span className={styles.stockId}>{t.stockId}</span>
                        <span className={styles.stockName}>{t.stockName}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.typeBadge} ${t.type === 'BUY' ? styles.buy : styles.sell}`}>
                        {t.type === 'BUY' ? '매수' : '매도'}
                      </span>
                    </td>
                    <td className={styles.numCell}>{t.qty}주</td>
                    <td className={styles.numCell}>${t.price.toFixed(2)}</td>
                    <td className={styles.numCell}>
                      <span className={t.type === 'BUY' ? styles.buyAmt : styles.sellAmt}>
                        {t.type === 'BUY' ? '-' : '+'}${t.total.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default History
