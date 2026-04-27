import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { MODEL_COLORS } from '../../data/investors'
import styles from './InvestorDetail.module.css'

const HOLDING_COLORS = ['#1a1a2e', '#4a4a7a', '#16a34a', '#2563eb', '#d97706', '#dc2626']

function radarData(inv) {
  return [
    { subject: '수익률',   value: Math.min(100, Math.abs(inv.totalReturn) * 1.5) },
    { subject: '승률',     value: inv.winRate },
    { subject: '거래빈도', value: Math.min(100, inv.totalTrades / 5) },
    { subject: '팔로워',   value: Math.min(100, inv.followers / 40) },
    { subject: '일관성',   value: 50 + inv.winRate / 5 },
  ]
}

export default function InvestorDetail({ investor: inv, onClose }) {
  const isAI       = inv.tradingStyle === 'ai'
  const modelColor = isAI ? MODEL_COLORS[inv.aiModel] : '#2563eb'
  const radar      = radarData(inv)

  return (
    <div className={styles.panel}>
      <button className={styles.close} onClick={onClose}>✕</button>

      {/* 프로필 */}
      <div className={styles.profile}>
        <div className={styles.avatar}>{inv.initials}</div>
        <div>
          <h2 className={styles.name}>{inv.country} {inv.name}</h2>
          <div className={styles.badges}>
            <span className={styles.styleBadge} style={{ color: modelColor, background: `${modelColor}18` }}>
              {isAI ? `AI · ${inv.aiModel}` : '직접 거래'}
            </span>
            <span className={styles.strategyBadge}>{inv.strategy}</span>
          </div>
          <p className={styles.bio}>{inv.bio}</p>
        </div>
      </div>

      <div className={styles.divider} />

      {/* 핵심 지표 */}
      <div className={styles.metricsGrid}>
        <div className={styles.metric}>
          <span className={styles.metricLbl}>총 수익률</span>
          <span className={styles.metricVal} style={{ color: inv.totalReturn >= 0 ? '#16a34a' : '#dc2626' }}>
            {inv.totalReturn >= 0 ? '+' : ''}{inv.totalReturn}%
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLbl}>이번 달</span>
          <span className={styles.metricVal} style={{ color: inv.monthReturn >= 0 ? '#16a34a' : '#dc2626' }}>
            {inv.monthReturn >= 0 ? '+' : ''}{inv.monthReturn}%
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLbl}>승률</span>
          <span className={styles.metricVal}>{inv.winRate}%</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLbl}>총 거래</span>
          <span className={styles.metricVal}>{inv.totalTrades}건</span>
        </div>
      </div>

      {/* 트레이딩 정보 */}
      <div className={styles.infoBox}>
        <div className={styles.infoRow}>
          <span className={styles.infoLbl}>거래 방식</span>
          <span className={styles.infoVal} style={{ color: modelColor }}>
            {isAI ? `AI 자동매매 (${inv.aiModel})` : '직접 수동 거래'}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLbl}>전략</span>
          <span className={styles.infoVal}>{inv.strategy}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLbl}>보유 기간</span>
          <span className={styles.infoVal}>{inv.holdingPeriod}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLbl}>팔로워</span>
          <span className={styles.infoVal}>{inv.followers.toLocaleString()}명</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* 레이더 + 파이 차트 */}
      <div className={styles.charts}>
        <div className={styles.chartBlock}>
          <h4 className={styles.chartTitle}>퍼포먼스 프로필</h4>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radar}>
              <PolarGrid stroke="#eee" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#aaa', fontFamily: 'system-ui' }} />
              <Radar dataKey="value" stroke={modelColor} fill={modelColor} fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartBlock}>
          <h4 className={styles.chartTitle}>포트폴리오 비중</h4>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={inv.holdings} dataKey="weight" nameKey="id" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                {inv.holdings.map((h, i) => (
                  <Cell key={h.id} fill={HOLDING_COLORS[i % HOLDING_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, name) => [`${v}%`, name]}
                contentStyle={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, color: '#1a1a2e', fontSize: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.divider} />

      {/* 보유 종목 상세 */}
      <h4 className={styles.sectionTitle}>보유 종목</h4>
      <ul className={styles.holdingList}>
        {inv.holdings.map((h, i) => (
          <li key={h.id} className={styles.holdingItem}>
            <span className={styles.holdingDot} style={{ background: HOLDING_COLORS[i % HOLDING_COLORS.length] }} />
            <span className={styles.holdingId}>{h.id}</span>
            <span className={styles.holdingName}>{h.name}</span>
            <div className={styles.holdingBar}>
              <div className={styles.holdingFill} style={{ width: `${h.weight}%`, background: HOLDING_COLORS[i % HOLDING_COLORS.length] }} />
            </div>
            <span className={styles.holdingWeight}>{h.weight}%</span>
            <span className={`${styles.holdingReturn} ${h.return >= 0 ? styles.up : styles.down}`}>
              {h.return >= 0 ? '+' : ''}{h.return}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
