import styles from './AIPerformance.module.css'

function AIPerformance({ stats, model, tradeLog, portfolio, stocks }) {
  const winRate = stats.totalTrades > 0
    ? ((stats.wins / stats.totalTrades) * 100).toFixed(1)
    : null
  const pnlColor = stats.totalPnl >= 0 ? '#16a34a' : '#dc2626'

  // 포트폴리오에서 현재 보유 종목 계산
  const positions = Object.entries(portfolio).map(([id, data]) => {
    const live = stocks.find(s => s.id === id)
    const currentPrice = live?.price || data.avgPrice
    const value = currentPrice * data.qty
    const pnl = (currentPrice - data.avgPrice) * data.qty
    return { id, ...data, currentPrice, value, pnl }
  })

  return (
    <aside className={styles.panel}>
      {/* 모델 카드 */}
      <div className={styles.modelCard} style={{ borderColor: model.color }}>
        <span className={styles.modelMaker}>{model.maker}</span>
        <span className={styles.modelName} style={{ color: model.color }}>{model.name}</span>
        <span className={styles.modelStyle}>
          {{ balanced: '균형형', conservative: '보수형', aggressive: '공격형', analytical: '분석형' }[model.style]}
        </span>
      </div>

      {/* 성과 통계 */}
      <div className={styles.statGrid}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>거래</span>
          <span className={styles.statValue}>{stats.totalTrades > 0 ? stats.totalTrades : '-'}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>승률</span>
          <span className={styles.statValue}>{winRate ? `${winRate}%` : '-'}</span>
        </div>
      </div>

      <div className={styles.pnlCard}>
        <span className={styles.pnlLabel}>누적 손익</span>
        <span className={styles.pnlValue} style={{ color: stats.totalPnl !== 0 ? pnlColor : '#ccc' }}>
          {stats.totalPnl !== 0 ? `${stats.totalPnl >= 0 ? '+' : ''}$${stats.totalPnl.toFixed(2)}` : '-'}
        </span>
      </div>

      <div className={styles.divider} />

      {/* 보유 포지션 */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>보유 포지션 <span className={styles.badge}>{positions.length}</span></h4>
        {positions.length === 0 ? (
          <p className={styles.empty}>포지션 없음</p>
        ) : (
          <ul className={styles.positionList}>
            {positions.map(p => (
              <li key={p.id} className={styles.positionItem}>
                <div className={styles.posTop}>
                  <span className={styles.posTicker}>{p.id}</span>
                  <span className={`${styles.posPnl} ${p.pnl >= 0 ? styles.up : styles.down}`}>
                    {p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}
                  </span>
                </div>
                <div className={styles.posBottom}>
                  <span>{p.qty}주 · 평균 ${p.avgPrice.toFixed(2)}</span>
                  <span className={styles.posValue}>${p.value.toFixed(0)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.divider} />

      {/* 모델 특성 */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>모델 특성</h4>
        <div className={styles.infoRow}><span>기대 승률</span><span>{model.winRate}%</span></div>
        <div className={styles.infoRow}>
          <span>신호 속도</span>
          <span>{{ 2500: '빠름', 4000: '보통', 5000: '느림', 6000: '신중' }[model.interval]}</span>
        </div>
        <div className={styles.infoRow}>
          <span>매수 성향</span>
          <span>{model.buyBias >= 0.55 ? '공격적' : model.buyBias <= 0.47 ? '보수적' : '중립'}</span>
        </div>
      </div>
    </aside>
  )
}

export default AIPerformance
