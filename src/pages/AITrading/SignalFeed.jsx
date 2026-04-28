import { useState } from 'react'
import styles from './SignalFeed.module.css'

const TYPE_META = {
  BUY:  { label: '매수', color: '#dc2626', bg: '#fef2f2' },
  SELL: { label: '매도', color: '#3b82f6', bg: '#eff6ff' },
  HOLD: { label: '홀드', color: '#d97706', bg: '#fffbeb' },
}

function ConfidenceBar({ value }) {
  const color = value >= 80 ? '#16a34a' : value >= 65 ? '#d97706' : '#999'
  return (
    <div className={styles.barWrap}>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${value}%`, background: color }} />
      </div>
      <span className={styles.barLabel} style={{ color }}>{value}%</span>
    </div>
  )
}

function SignalFeed({ signals, running, autoMode, model, tradeLog }) {
  const [tab, setTab] = useState('signals')

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>AI 신호</h2>
          <div className={styles.status}>
            <span className={`${styles.dot} ${running ? styles.dotLive : styles.dotOff}`} />
            {running ? `${model.name} 실행 중` : '대기'}
            {running && autoMode && (
              <span className={styles.autoBadge} style={{ background: model.color }}>자동 매매 ON</span>
            )}
          </div>
        </div>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'signals' ? styles.tabActive : ''}`} onClick={() => setTab('signals')}>
            신호 ({signals.length})
          </button>
          <button className={`${styles.tab} ${tab === 'trades' ? styles.tabActive : ''}`} onClick={() => setTab('trades')}>
            체결 ({tradeLog.length})
          </button>
        </div>
      </div>

      {tab === 'signals' && (
        signals.length === 0 ? (
          <div className={styles.empty}>
            <p>왼쪽에서 모델과 전략을 선택하고</p>
            <p><strong>시작</strong> 버튼을 눌러보세요.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {signals.map(signal => {
              const meta = TYPE_META[signal.type]
              return (
                <li key={signal.id} className={styles.card} style={{ borderLeftColor: meta.color }}>
                  <div className={styles.cardTop}>
                    <div className={styles.stockInfo}>
                      <span className={styles.ticker}>{signal.stock.id}</span>
                      <span className={styles.stockName}>{signal.stock.name}</span>
                    </div>
                    <span className={styles.typeBadge} style={{ color: meta.color, background: meta.bg }}>
                      {meta.label}
                    </span>
                    <span className={styles.price}>${signal.stock.price.toFixed(2)}</span>
                    {signal.executed && (
                      <span className={styles.executedBadge}>체결 {signal.qty}주</span>
                    )}
                  </div>
                  <p className={styles.reason}>{signal.reason}</p>
                  <div className={styles.cardBottom}>
                    <div className={styles.confidence}>
                      <span className={styles.confidenceLabel}>신뢰도</span>
                      <ConfidenceBar value={signal.confidence} />
                    </div>
                    <span className={styles.time}>{signal.time}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )
      )}

      {tab === 'trades' && (
        tradeLog.length === 0 ? (
          <div className={styles.empty}>
            <p>자동 매매 ON 상태에서</p>
            <p>AI가 체결한 거래가 여기 표시됩니다.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {tradeLog.map(t => (
              <li key={t.id} className={`${styles.tradeCard} ${t.type === 'BUY' ? styles.tradeBuy : styles.tradeSell}`}>
                <div className={styles.tradeLeft}>
                  <span className={styles.tradeBadge} style={{ color: t.type === 'BUY' ? '#dc2626' : '#3b82f6' }}>
                    {t.type === 'BUY' ? '매수' : '매도'}
                  </span>
                  <span className={styles.tradeTicker}>{t.stock}</span>
                  <span className={styles.tradeModel}>{t.model}</span>
                </div>
                <div className={styles.tradeRight}>
                  <span className={styles.tradeDetail}>{t.qty}주 @ ${t.price.toFixed(2)}</span>
                  <span className={styles.tradeTotal}>${(t.qty * t.price).toFixed(2)}</span>
                  <span className={styles.tradeTime}>{t.time}</span>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}

export default SignalFeed
