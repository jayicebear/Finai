import { MODEL_COLORS } from '../../data/investors'
import styles from './InvestorCard.module.css'

export default function InvestorCard({ investor: inv, rank, selected, onClick }) {
  const isAI     = inv.tradingStyle === 'ai'
  const modelColor = isAI ? MODEL_COLORS[inv.aiModel] : '#2563eb'
  const returnColor = inv.totalReturn >= 0 ? '#16a34a' : '#dc2626'

  return (
    <div className={`${styles.card} ${selected ? styles.selected : ''}`} onClick={onClick}>
      {/* 랭크 */}
      <div className={`${styles.rank} ${rank <= 3 ? styles.topRank : ''}`}>#{rank}</div>

      {/* 유저 */}
      <div className={styles.user}>
        <div className={styles.avatar}>{inv.initials}</div>
        <div className={styles.userInfo}>
          <span className={styles.name}>{inv.country} {inv.name}</span>
          <div className={styles.badges}>
            <span
              className={styles.styleBadge}
              style={{ color: modelColor, background: isAI ? `${modelColor}18` : '#eff6ff' }}
            >
              {isAI ? `AI · ${inv.aiModel}` : '직접 거래'}
            </span>
            <span className={styles.strategyBadge}>{inv.strategy}</span>
          </div>
        </div>
      </div>

      {/* 수익률 */}
      <div className={styles.returns}>
        <div className={styles.returnMain} style={{ color: returnColor }}>
          {inv.totalReturn >= 0 ? '+' : ''}{inv.totalReturn}%
        </div>
        <div className={styles.returnSub}>
          이번 달 <span style={{ color: inv.monthReturn >= 0 ? '#16a34a' : '#dc2626' }}>
            {inv.monthReturn >= 0 ? '+' : ''}{inv.monthReturn}%
          </span>
        </div>
      </div>

      {/* 통계 */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statVal}>{inv.winRate}%</span>
          <span className={styles.statLbl}>승률</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{inv.totalTrades}</span>
          <span className={styles.statLbl}>거래</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{inv.holdingPeriod.split(' ')[0]}</span>
          <span className={styles.statLbl}>보유기간</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{inv.followers.toLocaleString()}</span>
          <span className={styles.statLbl}>팔로워</span>
        </div>
      </div>

      {/* 보유 종목 미리보기 */}
      <div className={styles.holdingsBar}>
        {inv.holdings.map(h => (
          <div
            key={h.id}
            className={styles.holdingSegment}
            style={{ width: `${h.weight}%`, background: h.return >= 0 ? '#16a34a' : '#dc2626', opacity: 0.7 + h.weight / 200 }}
            title={`${h.id} ${h.weight}%`}
          />
        ))}
      </div>
      <div className={styles.holdingTickers}>
        {inv.holdings.map(h => (
          <span key={h.id} className={styles.ticker}>{h.id} <span style={{ color: h.return >= 0 ? '#16a34a' : '#dc2626' }}>{h.return >= 0 ? '+' : ''}{h.return}%</span></span>
        ))}
      </div>
    </div>
  )
}
