import { usePortfolio } from '../../context/PortfolioContext'
import { stocks } from '../../data/stocks'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import styles from './Portfolio.module.css'

const COLORS = ['#1a1a2e', '#4a4a7a', '#7a4a9a', '#16a34a', '#2563eb', '#d97706', '#dc2626', '#0891b2']

function Portfolio() {
  const { balance, portfolio } = usePortfolio()

  const holdings = Object.entries(portfolio).map(([id, data]) => {
    const liveStock = stocks.find(s => s.id === id)
    const currentPrice = liveStock?.price || data.avgPrice
    const currentValue = currentPrice * data.qty
    const invested = data.avgPrice * data.qty
    const pnl = currentValue - invested
    const pnlPct = (pnl / invested) * 100
    return { id, ...data, currentPrice, currentValue, invested, pnl, pnlPct }
  })

  const totalInvested = holdings.reduce((sum, h) => sum + h.currentValue, 0)
  const totalAsset = totalInvested + balance
  const totalPnl = holdings.reduce((sum, h) => sum + h.pnl, 0)

  const donutData = [
    ...holdings.map(h => ({ name: h.id, value: parseFloat(h.currentValue.toFixed(2)) })),
    { name: '현금', value: parseFloat(balance.toFixed(2)) },
  ]

  const isEmpty = holdings.length === 0

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Portfolio</h1>
        <div className={styles.summary}>
          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>총 자산</span>
            <span className={styles.cardValue}>${totalAsset.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>투자 중</span>
            <span className={styles.cardValue}>${totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>현금</span>
            <span className={styles.cardValue}>${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>평가손익</span>
            <span className={`${styles.cardValue} ${totalPnl >= 0 ? styles.up : styles.down}`}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.chartSection}>
          <h2 className={styles.sectionTitle}>자산 구성</h2>
          {isEmpty ? (
            <div className={styles.empty}>보유 종목이 없습니다.</div>
          ) : (
            <div className={styles.donutWrapper}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`$${value.toLocaleString()}`, '']}
                    contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, color: '#f0ede8', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className={styles.legend}>
                {donutData.map((entry, index) => (
                  <li key={entry.name} className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: COLORS[index % COLORS.length] }} />
                    <span className={styles.legendName}>{entry.name}</span>
                    <span className={styles.legendPct}>
                      {((entry.value / totalAsset) * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>보유 종목</h2>
          {isEmpty ? (
            <div className={styles.empty}>Trading 페이지에서 종목을 매수해보세요.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>종목</th>
                  <th>수량</th>
                  <th>평균단가</th>
                  <th>현재가</th>
                  <th>평가금액</th>
                  <th>손익</th>
                  <th>수익률</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map(h => (
                  <tr key={h.id}>
                    <td>
                      <div className={styles.stockCell}>
                        <span className={styles.ticker}>{h.id}</span>
                        <span className={styles.stockName}>{h.name}</span>
                      </div>
                    </td>
                    <td>{h.qty}주</td>
                    <td>${h.avgPrice.toFixed(2)}</td>
                    <td>${h.currentPrice.toFixed(2)}</td>
                    <td>${h.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className={h.pnl >= 0 ? styles.up : styles.down}>
                      {h.pnl >= 0 ? '+' : ''}${h.pnl.toFixed(2)}
                    </td>
                    <td className={h.pnlPct >= 0 ? styles.up : styles.down}>
                      {h.pnlPct >= 0 ? '+' : ''}{h.pnlPct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default Portfolio
