import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import styles from './AIChartPanel.module.css'

// Area의 dot prop으로 전달되는 커스텀 마커
function CustomDot(props) {
  const { cx, cy, payload } = props
  if (!cx || !cy) return null
  if (payload.buyAt) return (
    <g key={`buy-${cx}`}>
      <circle cx={cx} cy={cy} r={10} fill="#16a34a" opacity={0.15} />
      <circle cx={cx} cy={cy} r={5}  fill="#16a34a" />
      <text x={cx} y={cy - 14} textAnchor="middle" fontSize={9} fill="#16a34a" fontWeight="700">BUY</text>
    </g>
  )
  if (payload.sellAt) return (
    <g key={`sell-${cx}`}>
      <circle cx={cx} cy={cy} r={10} fill="#dc2626" opacity={0.15} />
      <circle cx={cx} cy={cy} r={5}  fill="#dc2626" />
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize={9} fill="#dc2626" fontWeight="700">SELL</text>
    </g>
  )
  return null
}

function ActionBanner({ action, model }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!action) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 4000)
    return () => clearTimeout(t)
  }, [action])

  if (!visible || !action) return null

  const isBuy = action.type === 'BUY'
  return (
    <div className={`${styles.banner} ${isBuy ? styles.bannerBuy : styles.bannerSell}`}>
      <span className={styles.bannerModel} style={{ color: model.color }}>{model.name}</span>
      <span className={styles.bannerText}>
        {isBuy ? '매수' : '매도'} 체결 —
        <strong> {action.stock?.id ?? action.stock} {action.qty}주</strong>
        @ ${action.price?.toFixed(2)}
      </span>
      <span className={styles.bannerReason}>{action.reason}</span>
    </div>
  )
}

function AIChartPanel({ stocks, selectedStock, onStockChange, chartData, thinking, lastAction, tradeLog, running, autoMode, model }) {
  const isUp = selectedStock.change >= 0
  const lineColor = isUp ? '#16a34a' : '#dc2626'
  const recentTrades = tradeLog.slice(0, 6)

  return (
    <div className={styles.wrapper}>
      {/* 종목 탭 */}
      <div className={styles.stockBar}>
        {stocks.map(s => (
          <button
            key={s.id}
            className={`${styles.stockBtn} ${selectedStock.id === s.id ? styles.stockActive : ''}`}
            onClick={() => onStockChange(s)}
          >
            <span className={styles.stockTicker}>{s.id}</span>
            <span className={`${styles.stockPct} ${s.change >= 0 ? styles.up : styles.down}`}>
              {s.change >= 0 ? '+' : ''}{s.changePct.toFixed(2)}%
            </span>
          </button>
        ))}
      </div>

      {/* 종목 정보 행 */}
      <div className={styles.infoRow}>
        <div>
          <span className={styles.ticker}>{selectedStock.id}</span>
          <span className={styles.name}>{selectedStock.name}</span>
        </div>
        <div className={styles.priceGroup}>
          <span className={styles.price}>${selectedStock.price.toFixed(2)}</span>
          <span className={`${styles.change} ${isUp ? styles.up : styles.down}`}>
            {isUp ? '+' : ''}{selectedStock.change.toFixed(2)} ({isUp ? '+' : ''}{selectedStock.changePct.toFixed(2)}%)
          </span>
        </div>
        <div className={styles.aiStatus}>
          {running ? (
            thinking ? (
              <div className={styles.thinking}>
                <span className={styles.thinkDot} />
                <span className={styles.thinkDot} />
                <span className={styles.thinkDot} />
                <span className={styles.thinkLabel}>{model.name} 분석 중</span>
              </div>
            ) : (
              <div className={styles.liveStatus}>
                <span className={styles.liveDot} />
                <span>{model.name} 실행 중</span>
                {autoMode && <span className={styles.autoBadge} style={{ background: model.color }}>자동매매</span>}
              </div>
            )
          ) : (
            <span className={styles.offLabel}>대기</span>
          )}
        </div>
      </div>

      {/* 체결 배너 */}
      <ActionBanner action={lastAction} model={model} />

      {/* 차트 */}
      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 20, right: 24, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="aiAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={lineColor} stopOpacity={0.12} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#bbb', fontFamily: 'system-ui' }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#bbb', fontFamily: 'system-ui' }}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              tickFormatter={v => `$${v}`}
              width={64}
            />
            <Tooltip
              contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, color: '#f0ede8', fontSize: 12 }}
              formatter={v => [`$${v}`, '가격']}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={lineColor}
              strokeWidth={2}
              fill="url(#aiAreaGrad)"
              dot={<CustomDot />}
              activeDot={{ r: 4, fill: lineColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 체결 내역 */}
      <div className={styles.logSection}>
        <h4 className={styles.logTitle}>체결 내역 <span className={styles.logCount}>{tradeLog.length}건</span></h4>
        {recentTrades.length === 0 ? (
          <p className={styles.logEmpty}>
            {running ? 'AI가 분석 중입니다...' : 'AI를 시작하면 체결 내역이 여기 표시됩니다.'}
          </p>
        ) : (
          <ul className={styles.logList}>
            {recentTrades.map(t => (
              <li key={t.id} className={styles.logItem}>
                <span className={`${styles.logType} ${t.type === 'BUY' ? styles.logBuy : styles.logSell}`}>
                  {t.type === 'BUY' ? '매수' : '매도'}
                </span>
                <span className={styles.logStock}>{t.stock}</span>
                <span className={styles.logDetail}>{t.qty}주 @ ${t.price.toFixed(2)}</span>
                <span className={styles.logReason}>{t.reason}</span>
                <span className={`${styles.logPnl} ${t.pnl >= 0 ? styles.up : styles.down}`}>
                  {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                </span>
                <span className={styles.logTime}>{t.time}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default AIChartPanel
