import { MODEL_COLORS } from '../../data/investors'
import styles from './InvestorCard.module.css'

export default function InvestorCard({ investor: inv, rank, selected, followed, onFollow, onClick }) {
  const isAI       = inv.tradingStyle === 'ai'
  const modelColor = isAI ? MODEL_COLORS[inv.aiModel] : '#2563eb'
  const returnColor = inv.totalReturn >= 0 ? '#dc2626' : '#3b82f6'

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
          이번 달 <span style={{ color: inv.monthReturn >= 0 ? '#dc2626' : '#3b82f6' }}>
            {inv.monthReturn >= 0 ? '+' : ''}{inv.monthReturn}%
          </span>
        </div>
      </div>

      <div className={styles.stat}>
        <span className={styles.statVal}>{inv.winRate}%</span>
        <span className={styles.statLbl}>승률</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.statVal}>{inv.totalTrades}</span>
        <span className={styles.statLbl}>거래</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.statVal}>{inv.followers.toLocaleString()}</span>
        <span className={styles.statLbl}>팔로워</span>
      </div>
      <button
        className={`${styles.followBtn} ${followed ? styles.followActive : ''}`}
        onClick={e => { e.stopPropagation(); onFollow() }}
      >
        {followed ? '팔로잉' : '팔로우'}
      </button>

      {/* 보유 종목 태그 */}
      <div className={styles.holdings}>
        {inv.holdings.map(h => (
          <span key={h.id} className={styles.holdingTag}>{h.id}</span>
        ))}
      </div>


    </div>
  )
}
